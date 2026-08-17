'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'bn';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  isBdGeo: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'bn',
  setLanguage: () => {},
  isBdGeo: true,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('bn');
  const [isBdGeo, setIsBdGeo] = useState<boolean>(true);

  useEffect(() => {
    const savedLang = localStorage.getItem('app-lang') as Language;

    // Detect Timezone (fast client-side check)
    const timeZone = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : '';
    const isDhakaTz = timeZone === 'Asia/Dhaka';

    if (savedLang) {
      setLanguage(savedLang);
      setIsBdGeo(isDhakaTz);
    } else if (!isDhakaTz && timeZone) {
      setLanguage('en');
      setIsBdGeo(false);
    } else {
      setLanguage('bn');
      setIsBdGeo(true);
    }

    // Verify via Geo IP API for 100% precision
    fetch('https://ipapi.co/json/')
      .then(res => res.json())
      .then(data => {
        if (data && data.country_code) {
          const isBD = data.country_code === 'BD';
          setIsBdGeo(isBD);
          if (!savedLang) {
            setLanguage(isBD ? 'bn' : 'en');
          }
        }
      })
      .catch(() => {
        fetch('https://ip-api.com/json/?fields=countryCode')
          .then(res => res.json())
          .then(data => {
            if (data && data.countryCode) {
              const isBD = data.countryCode === 'BD';
              setIsBdGeo(isBD);
              if (!savedLang) {
                setLanguage(isBD ? 'bn' : 'en');
              }
            }
          })
          .catch(() => {});
      });
  }, []);

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('app-lang', lang);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, isBdGeo }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
