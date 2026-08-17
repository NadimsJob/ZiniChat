'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLanguage } from './LanguageProvider';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface CurrencyContextType {
  rate: number;
  fromCurrency: string;
  toCurrency: string;
  effectiveDate: string | null;
  isFallback: boolean;
  loading: boolean;
  displayCurrency: 'BDT' | 'USD';
  setDisplayCurrency: (currency: 'BDT' | 'USD') => void;
  formatPrice: (bdtAmount: number) => string;
  formatBDT: (usdAmount: number) => string;
  formatBdtDirect: (bdtAmount: number) => string;
  convertToBDT: (usdAmount: number) => number;
  formatNumber: (num: number) => string;
  refresh: () => void;
}

const CurrencyContext = createContext<CurrencyContextType>({
  rate: 121.0,
  fromCurrency: 'USD',
  toCurrency: 'BDT',
  effectiveDate: null,
  isFallback: true,
  loading: true,
  displayCurrency: 'BDT',
  setDisplayCurrency: () => {},
  formatPrice: () => '৳0',
  formatBDT: () => '৳0',
  formatBdtDirect: () => '৳0',
  convertToBDT: () => 0,
  formatNumber: (num) => String(num),
  refresh: () => {},
});

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [rate, setRate] = useState(121.0);
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('BDT');
  const [effectiveDate, setEffectiveDate] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState(true);
  const [loading, setLoading] = useState(true);
  const [displayCurrency, setDisplayCurrency] = useState<'BDT' | 'USD'>('BDT');

  const fetchCurrentRate = async () => {
    try {
      const res = await fetch(`${API}/currency/rates/current`);
      if (res.ok) {
        const data = await res.json();
        setRate(Number(data.rate));
        setFromCurrency(data.fromCurrency || 'USD');
        setToCurrency(data.toCurrency || 'BDT');
        setEffectiveDate(data.effectiveDate || null);
        setIsFallback(data.isFallback || false);
      }
    } catch (err) {
      // Silently handle fetch failures so it doesn't crash the UI when backend is restarting
      console.warn('Currency API not reachable, using fallback rate.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentRate();

    const savedCurrency = localStorage.getItem('app-currency') as 'BDT' | 'USD';
    
    // Fast Timezone check
    const timeZone = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : '';
    const isDhakaTz = timeZone === 'Asia/Dhaka';

    if (savedCurrency) {
      setDisplayCurrency(savedCurrency);
    } else if (!isDhakaTz && timeZone) {
      setDisplayCurrency('USD');
    } else {
      setDisplayCurrency('BDT');
    }

    // Verify via Geo IP API
    fetch('https://ipapi.co/json/')
      .then(res => res.json())
      .then(data => {
        if (data && data.country_code) {
          const isBD = data.country_code === 'BD';
          if (!savedCurrency) {
            setDisplayCurrency(isBD ? 'BDT' : 'USD');
          }
        }
      })
      .catch(() => {
        fetch('https://ip-api.com/json/?fields=countryCode')
          .then(res => res.json())
          .then(data => {
            if (data && data.countryCode) {
              const isBD = data.countryCode === 'BD';
              if (!savedCurrency) {
                setDisplayCurrency(isBD ? 'BDT' : 'USD');
              }
            }
          })
          .catch(() => {});
      });
  }, []);

  const handleSetDisplayCurrency = (currency: 'BDT' | 'USD') => {
    setDisplayCurrency(currency);
    localStorage.setItem('app-currency', currency);
  };

  const { language } = useLanguage();

  const toBengaliNumerals = (numStr: string): string => {
    const englishToBengaliMap: Record<string, string> = {
      '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
      '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯'
    };
    return numStr.replace(/[0-9]/g, (match) => englishToBengaliMap[match]);
  };

  const convertToBDT = (usdAmount: number): number => {
    return Math.round(usdAmount * rate * 100) / 100;
  };

  const formatBDT = (usdAmount: number): string => {
    const bdtAmount = convertToBDT(usdAmount);
    const formattedNum = bdtAmount.toLocaleString('en-IN');
    
    if (language === 'bn') {
      return `৳${toBengaliNumerals(formattedNum)}`;
    }
    return `৳${formattedNum}`;
  };

  const formatBdtDirect = (bdtAmount: number): string => {
    const num = Number(bdtAmount) || 0;
    const formattedNum = (num % 1 === 0 ? num : (Math.round(num * 100) / 100)).toLocaleString('en-IN');
    if (language === 'bn') {
      return `৳${toBengaliNumerals(formattedNum)}`;
    }
    return `৳${formattedNum}`;
  };

  const formatPrice = (bdtAmount: number): string => {
    if (displayCurrency === 'USD') {
      const usdAmount = bdtAmount / rate;
      const formattedUsd = usdAmount % 1 === 0 ? usdAmount.toLocaleString('en-US') : usdAmount.toFixed(2);
      return `$${formattedUsd}`;
    }
    const formattedNum = bdtAmount.toLocaleString('en-IN');
    return language === 'bn' ? `৳${toBengaliNumerals(formattedNum)}` : `৳${formattedNum}`;
  };

  const formatNumber = (num: number): string => {
    if (typeof num !== 'number' || isNaN(num)) return '0';
    if (displayCurrency === 'USD') {
      const formatted = num % 1 === 0 ? num.toLocaleString('en-US') : (Math.round(num * 100) / 100).toFixed(2);
      return formatted;
    }
    const rounded = Math.round(num);
    const formatted = rounded.toLocaleString('en-IN');
    if (language === 'bn') {
      return toBengaliNumerals(formatted);
    }
    return formatted;
  };

  return (
    <CurrencyContext.Provider
      value={{
        rate,
        fromCurrency,
        toCurrency,
        effectiveDate,
        isFallback,
        loading,
        displayCurrency,
        setDisplayCurrency: handleSetDisplayCurrency,
        formatPrice,
        formatBDT,
        formatBdtDirect,
        convertToBDT,
        formatNumber,
        refresh: fetchCurrentRate,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
