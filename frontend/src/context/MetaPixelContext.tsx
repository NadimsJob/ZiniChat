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
  fbclid: string | null;
  trackEvent: (eventName: string, data?: any) => Promise<void>;
}

const MetaPixelContext = createContext<MetaPixelContextType>({
  pixelConfig: null,
  fbp: null,
  fbclid: null,
  trackEvent: async () => {},
});

export const MetaPixelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pixelConfig, setPixelConfig] = useState<MetaPixelConfigState | null>(null);
  const [fbp, setFbp] = useState<string | null>(null);
  const [fbclid, setFbclid] = useState<string | null>(null);

  useEffect(() => {
    // 1. Extract fbp cookie
    const existingFbp = Cookies.get('_fbp') || null;
    setFbp(existingFbp);

    // 2. Extract fbclid from URL
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlFbclid = urlParams.get('fbclid');
      if (urlFbclid) {
        setFbclid(urlFbclid);
        // Persist fbclid in session cookie for conversion matching
        Cookies.set('_fbclid', urlFbclid, { expires: 7 });
      } else {
        const storedFbclid = Cookies.get('_fbclid');
        if (storedFbclid) setFbclid(storedFbclid);
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
      const activeFbclid = fbclid || Cookies.get('_fbclid') || undefined;
      const activeFbp = fbp || Cookies.get('_fbp') || undefined;

      await fetch('/api/acquisition/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventName,
          tenantEmail: data?.email || data?.tenantEmail || undefined,
          tenantId: data?.tenantId || undefined,
          fbClickId: activeFbclid,
          fbPageId: activeFbp,
          customData: data,
        }),
      });
    } catch (err) {
      console.error(`Error tracking Meta acquisition event '${eventName}':`, err);
    }
  };

  return (
    <MetaPixelContext.Provider value={{ pixelConfig, fbp, fbclid, trackEvent }}>
      {children}
    </MetaPixelContext.Provider>
  );
};

export const useMetaPixel = () => useContext(MetaPixelContext);
