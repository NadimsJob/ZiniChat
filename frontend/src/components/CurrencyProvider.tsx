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
  }, []);

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
    const formatted = num.toLocaleString(displayCurrency === 'USD' ? 'en-US' : 'en-IN');
    if (language === 'bn' && displayCurrency !== 'USD') {
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
        setDisplayCurrency,
        formatPrice,
        formatBDT,
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
