'use client';

import { useEffect } from 'react';
import Cookies from 'js-cookie';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export default function ServiceWorkerRegistry() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const setupPushNotifications = async (reg: ServiceWorkerRegistration) => {
      try {
        const token = Cookies.get('access_token');
        if (!token) return; // User not logged in yet

        if (!('PushManager' in window) || !('Notification' in window)) return;

        // Auto-request notification permission if default
        let permission = Notification.permission;
        if (permission === 'default') {
          permission = await Notification.requestPermission();
        }

        if (permission !== 'granted') return;

        // Check active subscription
        let subscription = await reg.pushManager.getSubscription();

        // Fetch VAPID key
        const keyRes = await fetch(`${API}/notifications/vapid-public-key`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!keyRes.ok) return;
        const { publicKey } = await keyRes.json();
        if (!publicKey) return;

        // If no subscription exists, subscribe now
        if (!subscription) {
          subscription = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey)
          });
        }

        const p256dhBuffer = subscription.getKey('p256dh');
        const authBuffer = subscription.getKey('auth');
        if (!p256dhBuffer || !authBuffer) return;

        // Register subscription endpoint on server
        await fetch(`${API}/notifications/push-subscribe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            endpoint: subscription.endpoint,
            keys: {
              p256dh: arrayBufferToBase64(p256dhBuffer),
              auth: arrayBufferToBase64(authBuffer)
            },
            userAgent: navigator.userAgent
          })
        });
      } catch (err) {
        console.error('Auto Push Subscription setup failed:', err);
      }
    };

    const registerAndSetup = () => {
      navigator.serviceWorker.register('/sw.js').then(
        (registration) => {
          console.log('ServiceWorker registered with scope:', registration.scope);
          setupPushNotifications(registration);
        },
        (err) => {
          console.error('ServiceWorker registration failed:', err);
        }
      );
    };

    if (document.readyState === 'complete') {
      registerAndSetup();
    } else {
      window.addEventListener('load', registerAndSetup);
      return () => window.removeEventListener('load', registerAndSetup);
    }
  }, []);

  return null;
}
