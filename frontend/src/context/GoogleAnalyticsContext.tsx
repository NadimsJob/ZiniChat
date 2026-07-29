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

export const GoogleAnalyticsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [gaConfig, setGaConfig] = useState<GoogleAnalyticsConfigState | null>(null);
  const [isReady, setIsReady] = useState(false);

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
  }, []);

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
      // 1. Client-side gtag dispatch
      if (typeof window !== 'undefined' && (window as any).gtag && gaConfig?.isActive) {
        (window as any).gtag('event', eventName, eventParams);
      }

      // 2. Server-side Measurement Protocol dispatch via internal proxy route
      await fetch('/api/ga/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventName,
          eventParams,
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
