'use client';

import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { useLanguage } from '@/components/LanguageProvider';
import {
  DollarSign,
  Plus,
  Calendar,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  ArrowRightLeft,
  Shield
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function CurrencySettingsPage() {
  const { language } = useLanguage();
  const t = (en: string, bn: string) => language === 'en' ? en : bn;

  const [rates, setRates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Form
  const [newRate, setNewRate] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Feedback
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Current active rate
  const [currentRate, setCurrentRate] = useState<any>(null);

  useEffect(() => {
    fetchRates();
    fetchCurrentRate();
  }, []);

  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => { setSuccess(''); setError(''); }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  const fetchRates = async () => {
    try {
      const res = await fetch(`${API}/currency/rates`, {
        headers: { 'Authorization': `Bearer ${Cookies.get('access_token')}` }
      });
      if (res.ok) setRates(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentRate = async () => {
    try {
      const res = await fetch(`${API}/currency/rates/current`);
      if (res.ok) setCurrentRate(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newRate || !effectiveDate) {
      setError(t('Please fill in all fields', 'সব ফিল্ড পূরণ করুন'));
      return;
    }

    const rateNum = parseFloat(newRate);
    if (isNaN(rateNum) || rateNum <= 0) {
      setError(t('Please enter a valid rate', 'একটি সঠিক রেট লিখুন'));
      return;
    }

    setCreating(true);
    try {
      const res = await fetch(`${API}/currency/rates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Cookies.get('access_token')}`,
        },
        body: JSON.stringify({ rate: rateNum, effectiveDate }),
      });

      if (res.ok) {
        setSuccess(t('Exchange rate created successfully!', 'এক্সচেঞ্জ রেট সফলভাবে তৈরি হয়েছে!'));
        setNewRate('');
        setEffectiveDate('');
        setShowForm(false);
        fetchRates();
        fetchCurrentRate();
      } else {
        const data = await res.json();
        setError(data.message || t('Failed to create rate', 'রেট তৈরি ব্যর্থ'));
      }
    } catch {
      setError(t('An error occurred', 'একটি ত্রুটি ঘটেছে'));
    } finally {
      setCreating(false);
    }
  };

  const isActiveRate = (rate: any) => {
    if (!currentRate || currentRate.isFallback) return false;
    return rate.id === currentRate.id;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const isFutureDate = (dateStr: string) => {
    return new Date(dateStr) > new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-4 h-4 animate-spin text-secondary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <h1 className="text-[13px] font-bold tracking-tight text-slate-900 dark:text-white">
            {t('Currency Settings', 'কারেন্সি সেটিংস')}
          </h1>
          <p className="text-slate-500 dark:text-zinc-400 text-[12px] mt-1">
            {t('Manage USD to BDT exchange rates. Rates are immutable once created.', 'USD থেকে BDT এক্সচেঞ্জ রেট পরিচালনা করুন। তৈরির পর রেট পরিবর্তনযোগ্য নয়।')}
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-5 py-2.5 bg-secondary hover:bg-secondary/90 text-white text-[12px] font-bold rounded-xl shadow-lg shadow-secondary/20 transition-all hover:-translate-y-0.5"
        >
          <Plus className="w-4 h-4" />
          {t('New Rate', 'নতুন রেট')}
        </button>
      </div>

      {/* Feedback */}
      {success && (
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[12px] font-medium animate-in fade-in slide-in-from-top-2 duration-300">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 text-[12px] font-medium animate-in fade-in slide-in-from-top-2 duration-300">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Current Active Rate Card */}
      <div className="bg-gradient-to-r from-secondary/10 via-secondary/5 to-transparent border border-secondary/20 rounded-xl p-3 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-secondary/10 rounded-full blur-3xl -z-10" />
        <div className="flex items-center gap-2.5">
          <div className="w-14 h-14 rounded-xl bg-secondary/20 text-secondary flex items-center justify-center">
            <ArrowRightLeft className="w-7 h-7" />
          </div>
          <div>
            <p className="text-[12px] font-medium text-slate-500 dark:text-zinc-400">
              {t('Currently Active Rate', 'বর্তমানে সক্রিয় রেট')}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-[15px] font-extrabold text-slate-900 dark:text-white">
                1 USD = ৳{currentRate ? Number(currentRate.rate).toFixed(2) : '121.00'}
              </span>
              {currentRate?.isFallback && (
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full">
                  {t('Default', 'ডিফল্ট')}
                </span>
              )}
            </div>
            {currentRate && !currentRate.isFallback && (
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                {t('Effective since', 'কার্যকর তারিখ')}: {formatDate(currentRate.effectiveDate)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Add New Rate Form */}
      {showForm && (
        <div className="bg-white dark:bg-[#0f0f11] rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm p-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <h3 className="font-bold text-slate-900 dark:text-white text-base mb-2 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-secondary" />
            {t('Add New Exchange Rate', 'নতুন এক্সচেঞ্জ রেট যোগ করুন')}
          </h3>
          <form onSubmit={handleCreate} className="flex flex-col sm:flex-row items-end gap-2.5">
            <div className="flex-1 w-full">
              <label className="block text-[12px] font-semibold mb-2 text-slate-700 dark:text-zinc-300">
                {t('USD to BDT Rate', 'USD থেকে BDT রেট')}
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="number"
                  step="0.0001"
                  value={newRate}
                  onChange={(e) => setNewRate(e.target.value)}
                  placeholder="e.g. 121.5000"
                  className="w-full bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-xl pl-10 pr-4 py-3 text-[12px] focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all text-slate-900 dark:text-white placeholder:text-slate-400"
                />
              </div>
            </div>
            <div className="flex-1 w-full">
              <label className="block text-[12px] font-semibold mb-2 text-slate-700 dark:text-zinc-300">
                {t('Effective Date', 'কার্যকর তারিখ')}
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-xl pl-10 pr-4 py-3 text-[12px] focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all text-slate-900 dark:text-white"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={creating}
              className="flex items-center gap-2 px-3 py-3 bg-secondary hover:bg-secondary/90 text-white text-[12px] font-bold rounded-xl shadow-lg shadow-secondary/20 transition-all hover:-translate-y-0.5 disabled:opacity-50 whitespace-nowrap"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {creating ? t('Creating...', 'তৈরি হচ্ছে...') : t('Create Rate', 'রেট তৈরি করুন')}
            </button>
          </form>
          <div className="mt-3 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
            <Shield className="w-3.5 h-3.5" />
            {t('Rates cannot be edited or deleted after creation.', 'তৈরির পর রেট সম্পাদনা বা মুছে ফেলা যাবে না।')}
          </div>
        </div>
      )}

      {/* Rates History Table */}
      <div className="bg-white dark:bg-[#0f0f11] rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="px-3 py-2 border-b border-slate-200 dark:border-zinc-800">
          <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            {t('Rate History', 'রেট ইতিহাস')}
          </h3>
        </div>

        {rates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center mb-2">
              <DollarSign className="w-4 h-4 text-slate-300 dark:text-zinc-600" />
            </div>
            <p className="text-[12px] font-medium text-slate-500 dark:text-zinc-400">
              {t('No exchange rates set yet', 'এখনো কোন এক্সচেঞ্জ রেট সেট করা হয়নি')}
            </p>
            <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">
              {t('Using default rate: 1 USD = ৳121.00', 'ডিফল্ট রেট ব্যবহৃত হচ্ছে: 1 USD = ৳121.00')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 dark:border-zinc-800">
                  <th className="text-left px-3 py-3 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                    {t('Status', 'স্ট্যাটাস')}
                  </th>
                  <th className="text-left px-3 py-3 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                    {t('Exchange Rate', 'এক্সচেঞ্জ রেট')}
                  </th>
                  <th className="text-left px-3 py-3 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                    {t('Effective Date', 'কার্যকর তারিখ')}
                  </th>
                  <th className="text-left px-3 py-3 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                    {t('Created At', 'তৈরির তারিখ')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rates.map((rate) => (
                  <tr
                    key={rate.id}
                    className={`border-b border-slate-50 dark:border-zinc-800/50 transition-colors ${
                      isActiveRate(rate) ? 'bg-emerald-50/50 dark:bg-emerald-500/5' : 'hover:bg-slate-50/50 dark:hover:bg-zinc-800/30'
                    }`}
                  >
                    <td className="px-3 py-2">
                      {isActiveRate(rate) ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          {t('Active', 'সক্রিয়')}
                        </span>
                      ) : isFutureDate(rate.effectiveDate) ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30">
                          <Clock className="w-3 h-3" />
                          {t('Scheduled', 'নির্ধারিত')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400">
                          {t('Expired', 'মেয়াদোত্তীর্ণ')}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-[12px] font-bold text-slate-900 dark:text-white">
                        1 USD = ৳{Number(rate.rate).toFixed(4)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[12px] text-slate-600 dark:text-zinc-300">
                      {formatDate(rate.effectiveDate)}
                    </td>
                    <td className="px-3 py-2 text-[12px] text-slate-500 dark:text-zinc-400">
                      {formatDate(rate.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
