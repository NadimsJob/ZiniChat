'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import Cookies from 'js-cookie';

interface MetaPixelConfigState {
  pixelId: string | null;
  isActive: boolean;
  isCapiEnabled: boolean;
  setupCompletedAt?: string;
}

interface MetaPixelContextType {
  pixelConfig: MetaPixelConfigState | null;
  fbp: string | null;
  fbc: string | null;
  trackEvent: (eventName: string, data?: any) => Promise<void>;
}

const MetaPixelContext = createContext<MetaPixelContextType>({
  pixelConfig: null,
  fbp: null,
  fbc: null,
  trackEvent: async () => {},
});

export const MetaPixelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pixelConfig, setPixelConfig] = useState<MetaPixelConfigState | null>(null);
  const [fbp, setFbp] = useState<string | null>(null);
  const [fbc, setFbc] = useState<string | null>(null);

  useEffect(() => {
    // 1. Extract _fbp cookie (set automatically by Meta Pixel browser SDK on fbq init)
    const existingFbp = Cookies.get('_fbp') || null;
    setFbp(existingFbp);

    // 2. Handle fbclid from URL — Meta best practice:
    //    DO NOT manually set _fbc cookie. Let Meta Pixel SDK set it via fbq('init').
    //    We only store the raw fbclid in sessionStorage as a backup reference.
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlFbclid = urlParams.get('fbclid');

      if (urlFbclid) {
        // Save raw fbclid to sessionStorage so we can reference it later if SDK cookie is missing
        // Note: Meta SDK will create _fbc cookie automatically when fbq('init') is called
        try {
          sessionStorage.setItem('_fbclid_session', urlFbclid);
        } catch {
          // sessionStorage not available (e.g. private browsing edge cases)
        }
      }

      // Read _fbc from cookie — this will be set by Meta Pixel SDK after fbq('init')
      // It's also pre-populated by the SDK if fbclid was in the URL
      const existingFbc = Cookies.get('_fbc') || null;
      setFbc(existingFbc);
    }

    // 3. Fetch Pixel public config from API
    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/acquisition/track', { method: 'GET' });
        if (!res.ok) return;
        const data = await res.json();
        if (data.config) {
          setPixelConfig(data.config);

          // 4. Initialize Meta Pixel Script dynamically if active
          if (data.config.isActive && data.config.pixelId && typeof window !== 'undefined') {
            initMetaPixelScript(data.config.pixelId);
          }
        }
      } catch (err) {
        console.error('Failed to fetch Meta Pixel config:', err);
      }
    };

    fetchConfig();
  }, []);

  // After Meta Pixel SDK loads, it sets _fbc/_fbp cookies automatically.
  // Re-sync state after a short delay so CAPI calls have the freshest values.
  useEffect(() => {
    const syncMetaCookies = () => {
      const latestFbp = Cookies.get('_fbp');
      const latestFbc = Cookies.get('_fbc');

      if (latestFbp && latestFbp !== fbp) setFbp(latestFbp);
      if (latestFbc && latestFbc !== fbc) {
        setFbc(latestFbc);
      } else if (!latestFbc && !fbc) {
        // Fallback: if SDK didn't set _fbc but we have a raw fbclid in session, build fbc manually
        // Format: fb.1.{timestamp}.{fbclid} — only used as last resort
        try {
          const rawFbclid = sessionStorage.getItem('_fbclid_session');
          if (rawFbclid) {
            setFbc(`fb.1.${Date.now()}.${rawFbclid}`);
          }
        } catch {
          // sessionStorage not available
        }
      }
    };

    // Give Meta Pixel SDK 2 seconds to run fbq('init') and set cookies
    const timer = setTimeout(syncMetaCookies, 2000);
    return () => clearTimeout(timer);
  }, [fbp, fbc]);

  const initMetaPixelScript = (pixelId: string) => {
    if ((window as any).fbq) return;

    (function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = !0;
      n.version = '2.0';
      n.queue = [];
      t = b.createElement(e);
      t.async = !0;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

    // fbq('init') will automatically read fbclid from the URL and create _fbc cookie
    (window as any).fbq('init', pixelId);
    (window as any).fbq('track', 'PageView');
  };

  const trackEvent = async (eventName: string, data: any = {}) => {
    try {
      // 1. Browser Meta Pixel track if available
      if (typeof window !== 'undefined' && (window as any).fbq && pixelConfig?.isActive) {
        (window as any).fbq('track', eventName, data);
      }

      // 2. Dual dispatch via internal CAPI proxy route
      // Always read latest from cookies — Meta SDK may have updated them
      const activeFbc = Cookies.get('_fbc') || fbc || undefined;
      const activeFbp = Cookies.get('_fbp') || fbp || undefined;

      await fetch('/api/acquisition/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventName,
          tenantEmail: data?.email || data?.tenantEmail || undefined,
          tenantId: data?.tenantId || undefined,
          fbClickId: activeFbc,  // _fbc cookie value (set by Meta Pixel SDK, not us)
          fbPageId: activeFbp,   // _fbp cookie value (set by Meta Pixel SDK)
          customData: data,
        }),
      });
    } catch (err) {
      console.error(`Error tracking Meta acquisition event '${eventName}':`, err);
    }
  };

  return (
    <MetaPixelContext.Provider value={{ pixelConfig, fbp, fbc, trackEvent }}>
      {children}
    </MetaPixelContext.Provider>
  );
};

export const useMetaPixel = () => useContext(MetaPixelContext);
