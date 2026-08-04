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

/**
 * Formats a raw fbclid into Meta's required fbc format:
 * fb.1.{unix_timestamp_ms}.{fbclid}
 * See: https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/fbp-and-fbc
 */
function formatFbc(fbclid: string): string {
  return `fb.1.${Date.now()}.${fbclid}`;
}

export const MetaPixelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pixelConfig, setPixelConfig] = useState<MetaPixelConfigState | null>(null);
  const [fbp, setFbp] = useState<string | null>(null);
  const [fbc, setFbc] = useState<string | null>(null);

  useEffect(() => {
    // 1. Extract _fbp cookie (set automatically by Meta Pixel browser SDK)
    const existingFbp = Cookies.get('_fbp') || null;
    setFbp(existingFbp);

    // 2. Extract and properly format fbc from fbclid URL param or _fbc cookie
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlFbclid = urlParams.get('fbclid');

      if (urlFbclid) {
        // Fresh fbclid from ad click URL — format and store as _fbc cookie (Meta spec: 90 days)
        const formattedFbc = formatFbc(urlFbclid);
        setFbc(formattedFbc);
        Cookies.set('_fbc', formattedFbc, { expires: 90 });
        Cookies.set('_fbclid_raw', urlFbclid, { expires: 90 }); // keep raw for reference
      } else {
        // Check if Meta Pixel SDK already set _fbc cookie
        const existingFbc = Cookies.get('_fbc') || null;
        if (existingFbc) {
          setFbc(existingFbc);
        } else {
          // Fallback: reconstruct fbc from stored raw fbclid if available
          const storedRawFbclid = Cookies.get('_fbclid_raw');
          if (storedRawFbclid) {
            const reconstructedFbc = `fb.1.${Date.now()}.${storedRawFbclid}`;
            setFbc(reconstructedFbc);
          }
        }
      }
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
  // Re-sync state after a short delay to always use the freshest values.
  useEffect(() => {
    const syncMetaCookies = () => {
      const latestFbp = Cookies.get('_fbp');
      const latestFbc = Cookies.get('_fbc');
      if (latestFbp && !fbp) setFbp(latestFbp);
      if (latestFbc && !fbc) setFbc(latestFbc);
    };
    const timer = setTimeout(syncMetaCookies, 2000); // give pixel SDK time to set cookies
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
      // Always read latest from cookies to ensure freshest fbc/fbp values
      const activeFbc = fbc || Cookies.get('_fbc') || undefined;
      const activeFbp = fbp || Cookies.get('_fbp') || undefined;

      await fetch('/api/acquisition/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventName,
          tenantEmail: data?.email || data?.tenantEmail || undefined,
          tenantId: data?.tenantId || undefined,
          fbClickId: activeFbc,   // Properly formatted fbc: fb.1.{timestamp}.{fbclid}
          fbPageId: activeFbp,    // Meta's _fbp browser cookie value
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
