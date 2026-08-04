'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface GoogleAnalyticsConfigState {
  measurementId: string | null;
  isActive: boolean;
  trackPageView: boolean;
  trackSignup: boolean;
  trackCompleteReg: boolean;
  trackLogin: boolean;
}

interface GoogleAnalyticsContextType {
  gaConfig: GoogleAnalyticsConfigState | null;
  isReady: boolean;
  trackEvent: (eventName: string, eventParams?: Record<string, any>) => Promise<void>;
}

const GoogleAnalyticsContext = createContext<GoogleAnalyticsContextType>({
  gaConfig: null,
  isReady: false,
  trackEvent: async () => {},
});

/**
 * Reads or generates a persistent GA client_id.
 * Priority: _ga cookie (set by gtag.js) → localStorage → new UUID
 * Consistent client_id is required for GA4 to correctly track sessions.
 */
function getOrCreateClientId(): string {
  if (typeof window === 'undefined') return 'zinichat_ssr';

  // 1. Try reading _ga cookie (format: GA1.1.{client_id_part}.{timestamp})
  const gaCookie = document.cookie
    .split(';')
    .map(c => c.trim())
    .find(c => c.startsWith('_ga='));

  if (gaCookie) {
    const parts = gaCookie.replace('_ga=', '').split('.');
    if (parts.length >= 4) {
      // GA client_id is the 3rd and 4th parts joined
      return `${parts[2]}.${parts[3]}`;
    }
  }

  // 2. Fallback: use/create from localStorage for consistency across sessions
  try {
    const stored = localStorage.getItem('_ga_client_id');
    if (stored) return stored;

    const newClientId = `${Math.floor(Math.random() * 2147483647)}.${Math.floor(Date.now() / 1000)}`;
    localStorage.setItem('_ga_client_id', newClientId);
    return newClientId;
  } catch {
    return `zinichat_anon_${Math.floor(Date.now() / 1000)}`;
  }
}

export const GoogleAnalyticsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [gaConfig, setGaConfig] = useState<GoogleAnalyticsConfigState | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [clientId, setClientId] = useState<string>('');

  useEffect(() => {
    const fetchGaConfig = async () => {
      try {
        const res = await fetch('/api/ga/config', { method: 'GET' });
        if (!res.ok) return;
        const data = await res.json();
        if (data.config) {
          setGaConfig(data.config);

          if (data.config.isActive && data.config.measurementId && typeof window !== 'undefined') {
            initGaScript(data.config.measurementId);
            setIsReady(true);
          }
        }
      } catch (err) {
        console.error('Failed to fetch Google Analytics config:', err);
      }
    };

    fetchGaConfig();

    // Set persistent client_id after mount
    setClientId(getOrCreateClientId());
  }, []);

  // After gtag.js loads and sets _ga cookie, re-read for the freshest client_id
  useEffect(() => {
    if (!isReady) return;
    const timer = setTimeout(() => {
      setClientId(getOrCreateClientId());
    }, 2000);
    return () => clearTimeout(timer);
  }, [isReady]);

  const initGaScript = (measurementId: string) => {
    if ((window as any).gtag) return;

    // Create script tag for Google Analytics
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    document.head.appendChild(script);

    // Initialize dataLayer and gtag function
    (window as any).dataLayer = (window as any).dataLayer || [];
    function gtag(..._args: any[]) {
      (window as any).dataLayer.push(arguments);
    }
    (window as any).gtag = gtag;

    (window as any).gtag('js', new Date());
    (window as any).gtag('config', measurementId, {
      send_page_view: false, // We trigger page_view explicitly
    });
  };

  const trackEvent = async (eventName: string, eventParams: Record<string, any> = {}) => {
    try {
      // 1. Client-side gtag dispatch (browser-side tracking)
      if (typeof window !== 'undefined' && (window as any).gtag && gaConfig?.isActive) {
        (window as any).gtag('event', eventName, eventParams);
      }

      // 2. Server-side Measurement Protocol dispatch via internal proxy route
      // Always read freshest client_id before sending
      const activeClientId = getOrCreateClientId() || clientId;

      await fetch('/api/ga/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventName,
          eventParams,
          clientId: activeClientId,                                    // Consistent session tracking
          tenantEmail: eventParams?.email || eventParams?.tenantEmail || undefined,
          tenantId: eventParams?.tenantId || undefined,
        }),
      });
    } catch (err) {
      console.error(`Error tracking Google Analytics event '${eventName}':`, err);
    }
  };

  return (
    <GoogleAnalyticsContext.Provider value={{ gaConfig, isReady, trackEvent }}>
      {children}
    </GoogleAnalyticsContext.Provider>
  );
};

export const useGoogleAnalytics = () => useContext(GoogleAnalyticsContext);
