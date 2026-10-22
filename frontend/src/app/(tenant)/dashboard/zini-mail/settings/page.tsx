'use client';

import React, { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { toast, Toaster } from 'react-hot-toast';
import { useLanguage } from '@/components/LanguageProvider';
import { useRolloutFlag } from '@/hooks/useRolloutFlag';
import Link from 'next/link';
import {
  Mail,
  ShieldCheck,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ExternalLink,
  Trash2,
  Send,
  Lock,
  ArrowLeft,
  Server,
  Zap,
  Info
} from 'lucide-react';
import SmtpSetupGuide, { SmtpGuideTab } from '@/components/outreach/SmtpSetupGuideModal';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type ProviderKey = 'gmail' | 'outlook' | 'custom';

export default function TenantSmtpSettingsPage() {
  const { language } = useLanguage();
  const { enabled: isFeatureEnabled, loading: isFeatureLoading } = useRolloutFlag('ai_email_outreach');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [guideTab, setGuideTab] = useState<SmtpGuideTab>('gmail');
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [testRecipient, setTestRecipient] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<ProviderKey>('gmail');

  const [smtpData, setSmtpData] = useState<any>(null);
  const [form, setForm] = useState({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    username: '',
    password: '',
    fromName: '',
    fromEmail: '',
    replyToEmail: '',
  });

  const fetchSmtpSetting = async () => {
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/tenant/smtp`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setSmtpData(data);
        if (data && data.host) {
          setForm({
            host: data.host || '',
            port: data.port || 465,
            secure: data.secure ?? true,
            username: data.username || '',
            password: '', // Kept empty for security
            fromName: data.fromName || '',
            fromEmail: data.fromEmail || '',
            replyToEmail: data.replyToEmail || '',
          });
          setTestRecipient(data.fromEmail || '');

          const hostLower = (data.host || '').toLowerCase();
          if (hostLower.includes('gmail.com')) {
            setSelectedProvider('gmail');
            setGuideTab('gmail');
          } else if (hostLower.includes('office365.com') || hostLower.includes('outlook.com')) {
            setSelectedProvider('outlook');
            setGuideTab('outlook');
          } else {
            setSelectedProvider('custom');
            setGuideTab('cpanel');
          }
        } else {
          // Restore user's last chosen provider preference if no DB record yet
          const saved = typeof window !== 'undefined' ? (localStorage.getItem('zinimail_smtp_provider') as ProviderKey) : null;
          if (saved === 'outlook') {
            setSelectedProvider('outlook');
            setGuideTab('outlook');
            setForm((prev) => ({ ...prev, host: 'smtp.office365.com', port: 587, secure: false }));
          } else if (saved === 'custom') {
            setSelectedProvider('custom');
            setGuideTab('cpanel');
            setForm((prev) => ({ ...prev, host: '', port: 465, secure: true }));
          } else {
            setSelectedProvider('gmail');
            setGuideTab('gmail');
            setForm((prev) => ({ ...prev, host: 'smtp.gmail.com', port: 465, secure: true }));
          }
        }
      }
    } catch (err: any) {
      console.error('Failed to load tenant SMTP setting', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSmtpSetting();
  }, []);

  const handleSelectProvider = (provider: ProviderKey) => {
    setSelectedProvider(provider);
    try {
      localStorage.setItem('zinimail_smtp_provider', provider);
    } catch {}

    if (provider === 'gmail') {
      setGuideTab('gmail');
      setForm((prev) => ({
        ...prev,
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
      }));
      toast.success(
        language === 'en'
          ? 'Google Workspace / Gmail selected (Port 465 SSL)'
          : 'গুগল ওয়ার্কস্পেস / জিমেইল সিলেক্ট করা হয়েছে (পোর্ট ৪৬৫ SSL)'
      );
    } else if (provider === 'outlook') {
      setGuideTab('outlook');
      setForm((prev) => ({
        ...prev,
        host: 'smtp.office365.com',
        port: 587,
        secure: false,
      }));
      toast.success(
        language === 'en'
          ? 'Microsoft 365 / Outlook selected (Port 587 STARTTLS)'
          : 'মাইক্রোসফট ৩৬৫ / আউটলুক সিলেক্ট করা হয়েছে (পোর্ট ৫৮৭ STARTTLS)'
      );
    } else if (provider === 'custom') {
      setGuideTab('cpanel');
      setForm((prev) => ({
        ...prev,
        port: 465,
        secure: true,
        host:
          prev.host && !prev.host.includes('gmail.com') && !prev.host.includes('office365.com')
            ? prev.host
            : prev.fromEmail.includes('@')
            ? `mail.${prev.fromEmail.split('@')[1]}`
            : '',
      }));
      toast.success(
        language === 'en'
          ? 'Custom / cPanel Webmail selected'
          : 'কাস্টম / সিপ্যানেল ওয়েবমেইল সিলেক্ট করা হয়েছে'
      );
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = Cookies.get('access_token');
      const payload: any = {
        host: form.host.trim(),
        port: Number(form.port),
        secure: Boolean(form.secure),
        username: form.username.trim(),
        fromName: form.fromName.trim(),
        fromEmail: form.fromEmail.trim(),
        replyToEmail: form.replyToEmail.trim() || undefined,
      };

      if (form.password.trim()) {
        payload.password = form.password.trim();
      }

      const res = await fetch(`${API}/tenant/smtp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to save SMTP configuration');
      }

      const saved = await res.json();
      setSmtpData(saved);
      setForm((prev) => ({ ...prev, password: '' }));
      toast.success(
        language === 'en'
          ? 'SMTP credentials saved! Please verify the connection.'
          : 'এসএমটিপি সফলভাবে সংরক্ষিত হয়েছে! অনুগ্রহ করে কানেকশন ভেরিফাই করুন।'
      );
    } catch (err: any) {
      toast.error(err.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/tenant/smtp/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          testRecipientEmail: testRecipient.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'SMTP verification failed');
      }

      toast.success(
        language === 'en'
          ? 'Connection verified and test email dispatched successfully!'
          : 'কানেকশন সফলভাবে ভেরিফাই হয়েছে এবং টেস্ট ইমেইল পাঠানো হয়েছে!'
      );
      setShowVerifyModal(false);
      fetchSmtpSetting();
    } catch (err: any) {
      toast.error(err.message || 'Verification probe failed', { duration: 6000 });
    } finally {
      setVerifying(false);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        language === 'en'
          ? 'Are you sure you want to remove your connected SMTP settings?'
          : 'আপনি কি নিশ্চিত যে আপনার এসএমটিপি সেটিংস মুছে ফেলতে চান?'
      )
    ) {
      return;
    }

    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/tenant/smtp`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to delete SMTP settings');

      setSmtpData(null);
      setForm({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        username: '',
        password: '',
        fromName: '',
        fromEmail: '',
        replyToEmail: '',
      });
      setSelectedProvider('gmail');
      setGuideTab('gmail');
      toast.success(language === 'en' ? 'SMTP settings removed' : 'এসএমটিপি সেটিংস মুছে ফেলা হয়েছে');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  if (!isFeatureLoading && !isFeatureEnabled) {
    return (
      <div className="p-6 md:p-12 max-w-4xl mx-auto space-y-6">
        <div className="bg-card border border-border p-8 rounded-2xl shadow-xl text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-foreground">
            {language === 'en' ? 'Zini-Mail Outreach Feature Locked' : 'জিনি-মেইল আউটরিচ ফিচারটি লক করা'}
          </h2>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            {language === 'en'
              ? 'Autonomous AI cold email outreach is not included in your current subscription plan. Please upgrade your package or contact support.'
              : 'স্বয়ংক্রিয় এআই কোল্ড ইমেইল আউটরিচ আপনার বর্তমান সাবস্ক্রিপশন প্ল্যানে অন্তর্ভুক্ত নয়। প্ল্যান আপগ্রেড করুন বা সাপোর্টে যোগাযোগ করুন।'}
          </p>
          <Link
            href="/dashboard/settings/subscription"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-md transition-all"
          >
            {language === 'en' ? 'View Upgrade Options' : 'আপগ্রেড অপশন দেখুন'}
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto animate-pulse">
        <div className="bg-surface/70 border border-border p-6 rounded-2xl h-24 space-y-3">
          <div className="h-4 w-32 bg-surface-hover/80 rounded" />
          <div className="h-6 w-56 bg-surface-hover/80 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-surface/70 border border-border rounded-xl" />
          ))}
        </div>
        <div className="bg-surface/70 border border-border p-6 rounded-2xl h-96 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-10 bg-surface-hover/60 rounded-xl" />
            <div className="h-10 bg-surface-hover/60 rounded-xl" />
            <div className="h-10 bg-surface-hover/60 rounded-xl" />
            <div className="h-10 bg-surface-hover/60 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-5xl mx-auto">
      <Toaster position="top-right" />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface/70 backdrop-blur-xl border border-border p-6 rounded-2xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/zini-mail"
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors mr-1"
              title={language === 'en' ? 'Back to Campaigns' : 'ক্যাম্পেইনে ফিরে যান'}
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shadow-inner">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                {language === 'en' ? 'Zini-Mail SMTP Settings' : 'জিনি-মেইল এসএমটিপি সেটিংস'}
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  BYO-SMTP
                </span>
              </h1>
              <p className="text-xs text-muted-foreground">
                {language === 'en'
                  ? 'Connect your personal Gmail, Google Workspace, or Custom Business Webmail to dispatch AI cold emails.'
                  : 'আপনার নিজস্ব জিমেইল, গুগল ওয়ার্কস্পেস বা কাস্টম বিজনেস ডোমেইন ইমেইল কানেক্ট করুন।'}
              </p>
            </div>
          </div>
        </div>

        {/* Verification Status Pill */}
        <div className="flex items-center gap-2">
          {smtpData?.isVerified ? (
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-1.5 rounded-xl text-emerald-500">
              <ShieldCheck className="w-4 h-4" />
              <div className="text-left">
                <span className="text-[11px] font-bold block">{language === 'en' ? 'Verified & Active' : 'ভেরিফাইড ও সক্রিয়'}</span>
                <span className="text-[9px] text-muted-foreground block">
                  {smtpData.lastVerifiedAt ? new Date(smtpData.lastVerifiedAt).toLocaleDateString() : 'Active'}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3.5 py-1.5 rounded-xl text-amber-500">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-[11px] font-bold">
                {smtpData ? (language === 'en' ? 'Verification Needed' : 'ভেরিফিকেশন প্রয়োজন') : (language === 'en' ? 'Not Connected' : 'কানেক্ট করা হয়নি')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Provider Selector Cards (Persistent & User-Friendly) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-emerald-500" />
            {language === 'en' ? 'Select Email Service Provider' : 'ইমেইল সার্ভিস প্রোভাইডার নির্বাচন করুন'}
          </label>
          <span className="text-[10px] text-muted-foreground font-medium">
            {language === 'en' ? 'Choose your provider below' : 'পছন্দের প্রোভাইডারে ক্লিক করুন'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Google Workspace / Gmail */}
          <button
            type="button"
            onClick={() => handleSelectProvider('gmail')}
            className={`relative p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
              selectedProvider === 'gmail'
                ? 'bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-500/10'
                : 'bg-surface/70 backdrop-blur-xl border-border/80 hover:border-emerald-500/40 hover:bg-surface-hover/80 opacity-80 hover:opacity-100'
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    selectedProvider === 'gmail' ? 'bg-red-500/20 text-red-500' : 'bg-red-500/10 text-red-400'
                  }`}
                >
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-foreground">
                    Google Workspace / Gmail
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {language === 'en' ? 'Workspace & Personal Gmail' : 'গুগল ওয়ার্কস্পেস ও জিমেইল'}
                  </div>
                </div>
              </div>

              {/* Selection Badge */}
              <div className="flex items-center gap-1.5 shrink-0">
                {selectedProvider === 'gmail' ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-bold flex items-center gap-1 shadow-sm">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    {language === 'en' ? 'Selected' : 'সিলেক্টেড'}
                  </span>
                ) : (
                  <span className="w-4 h-4 rounded-full border border-muted-foreground/40 shrink-0" />
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-border/50 text-[10px] text-muted-foreground flex items-center justify-between">
              <span className="font-mono">smtp.gmail.com:465</span>
              <span className="text-emerald-500 font-semibold">SSL / App Password</span>
            </div>
          </button>

          {/* Microsoft 365 / Outlook */}
          <button
            type="button"
            onClick={() => handleSelectProvider('outlook')}
            className={`relative p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
              selectedProvider === 'outlook'
                ? 'bg-blue-500/10 border-blue-500 ring-2 ring-blue-500/30 shadow-lg shadow-blue-500/10'
                : 'bg-surface/70 backdrop-blur-xl border-border/80 hover:border-blue-500/40 hover:bg-surface-hover/80 opacity-80 hover:opacity-100'
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    selectedProvider === 'outlook' ? 'bg-blue-500/20 text-blue-500' : 'bg-blue-500/10 text-blue-400'
                  }`}
                >
                  <Server className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-foreground">
                    Microsoft 365 / Outlook
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {language === 'en' ? 'Office 365 & Outlook Mail' : 'মাইক্রোসফট ৩৬৫ ও আউটলুক'}
                  </div>
                </div>
              </div>

              {/* Selection Badge */}
              <div className="flex items-center gap-1.5 shrink-0">
                {selectedProvider === 'outlook' ? (
                  <span className="px-2 py-0.5 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center gap-1 shadow-sm">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    {language === 'en' ? 'Selected' : 'সিলেক্টেড'}
                  </span>
                ) : (
                  <span className="w-4 h-4 rounded-full border border-muted-foreground/40 shrink-0" />
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-border/50 text-[10px] text-muted-foreground flex items-center justify-between">
              <span className="font-mono">smtp.office365.com:587</span>
              <span className="text-blue-500 font-semibold">STARTTLS</span>
            </div>
          </button>

          {/* Custom SMTP / cPanel Webmail */}
          <button
            type="button"
            onClick={() => handleSelectProvider('custom')}
            className={`relative p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
              selectedProvider === 'custom'
                ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/30 shadow-lg shadow-amber-500/10'
                : 'bg-surface/70 backdrop-blur-xl border-border/80 hover:border-amber-500/40 hover:bg-surface-hover/80 opacity-80 hover:opacity-100'
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    selectedProvider === 'custom' ? 'bg-amber-500/20 text-amber-500' : 'bg-amber-500/10 text-amber-400'
                  }`}
                >
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-foreground">
                    Custom / cPanel Webmail
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {language === 'en' ? 'Business Domain & Hosting SMTP' : 'কাস্টম ডোমেইন ও হোস্টিং এসএমটিপি'}
                  </div>
                </div>
              </div>

              {/* Selection Badge */}
              <div className="flex items-center gap-1.5 shrink-0">
                {selectedProvider === 'custom' ? (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center gap-1 shadow-sm">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    {language === 'en' ? 'Selected' : 'সিলেক্টেড'}
                  </span>
                ) : (
                  <span className="w-4 h-4 rounded-full border border-muted-foreground/40 shrink-0" />
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-border/50 text-[10px] text-muted-foreground flex items-center justify-between">
              <span className="font-mono">mail.yourdomain.com</span>
              <span className="text-amber-500 font-semibold">Custom Port</span>
            </div>
          </button>
        </div>
      </div>

      {/* Main Configuration Form */}
      <form onSubmit={handleSave} className="bg-surface/70 backdrop-blur-xl border border-border p-6 rounded-2xl shadow-xl space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-emerald-500" />
            <h2 className="text-sm font-bold text-foreground">
              {language === 'en' ? 'Connection Credentials' : 'কানেকশন ক্রেডেনশিয়াল'}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setShowGuideModal(true)}
            className="text-[11px] text-emerald-500 hover:text-emerald-400 font-semibold flex items-center gap-1.5 transition-colors px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 shadow-sm"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            {language === 'en' ? 'Where to find credentials? (Setup Guide)' : 'পাসওয়ার্ড ও হোস্ট কোথায় পাবেন? (গাইড)'}
          </button>
        </div>

        {/* Dynamic Provider Guidance Note */}
        {selectedProvider === 'gmail' && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-foreground space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-red-500 dark:text-red-400 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                {language === 'en' ? 'Google 16-Character App Password Required' : 'গুগল ১৬-অক্ষরের অ্যাপ পাসওয়ার্ড প্রয়োজন'}
              </span>
              <a
                href="https://myaccount.google.com/apppasswords"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-bold text-red-500 hover:underline flex items-center gap-1"
              >
                {language === 'en' ? 'Generate App Password' : 'অ্যাপ পাসওয়ার্ড তৈরি করুন'}
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {language === 'en'
                ? 'Do not use your regular Gmail password. Generate a 16-character App Password from Google Account > Security > 2-Step Verification > App passwords.'
                : 'আপনার সাধারণ জিমেইল পাসওয়ার্ড কাজ করবে না। গুগল অ্যাকাউন্ট > সিকিউরিটি > ২-স্টেপ ভেরিফিকেশন থেকে ১৬ অক্ষরের অ্যাপ পাসওয়ার্ড তৈরি করে এখানে দিন।'}
            </p>
          </div>
        )}

        {selectedProvider === 'outlook' && (
          <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-foreground space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-blue-500 dark:text-blue-400 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                {language === 'en' ? 'Microsoft 365 Authenticated SMTP' : 'মাইক্রোসফট ৩৬৫ অথেনটিকেটেড এসএমটিপি'}
              </span>
              <a
                href="https://admin.microsoft.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-bold text-blue-500 hover:underline flex items-center gap-1"
              >
                {language === 'en' ? 'M365 Admin Portal' : 'অ্যাডমিন পোর্টাল'}
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {language === 'en'
                ? 'Ensure "Authenticated SMTP" is enabled for your user mailbox under Microsoft 365 Admin Center > Users > Active users > Mail.'
                : 'মাইক্রোসফট ৩৬৫ অ্যাডমিন সেন্টার থেকে আপনার ইমেইল ইউজার অ্যাকাউন্টে "Authenticated SMTP" অপশনটি সক্রিয় থাকতে হবে।'}
            </p>
          </div>
        )}

        {selectedProvider === 'custom' && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-foreground space-y-1.5">
            <span className="font-bold text-amber-500 dark:text-amber-400 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" />
              {language === 'en' ? 'Custom Domain / cPanel Webmail Configuration' : 'কাস্টম ডোমেইন / সিপ্যানেল কনফিগারেশন'}
            </span>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {language === 'en'
                ? 'Enter your custom mail server host (usually mail.yourdomain.com), full email address, and cPanel/Webmail password. Port 465 (SSL) is recommended.'
                : 'আপনার হোস্টিংয়ের আউটগোয়িং এসএমটিপি সার্ভার (সাধারণত mail.yourdomain.com), পূর্ণ ইমেইল ও পাসওয়ার্ড দিন। পোর্ট ৪৬৫ (SSL) ব্যবহার করা উত্তম।'}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">
              {language === 'en' ? 'SMTP Host' : 'এসএমটিপি হোস্ট'} *
            </label>
            <input
              type="text"
              required
              value={form.host}
              onChange={(e) => setForm({ ...form, host: e.target.value })}
              placeholder={
                selectedProvider === 'gmail'
                  ? 'smtp.gmail.com'
                  : selectedProvider === 'outlook'
                  ? 'smtp.office365.com'
                  : 'mail.yourdomain.com'
              }
              className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-emerald-500 outline-none font-mono"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">
              {language === 'en' ? 'Port & Encryption' : 'পোর্ট ও এনক্রিপশন'} *
            </label>
            <div className="flex items-center gap-2">
              <select
                value={form.port}
                onChange={(e) => {
                  const portNum = parseInt(e.target.value, 10);
                  setForm({ ...form, port: portNum, secure: portNum === 465 });
                }}
                className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-emerald-500 outline-none font-mono"
              >
                <option value={465}>465 (SSL / TLS)</option>
                <option value={587}>587 (STARTTLS)</option>
                <option value={25}>25 (Standard Unsecured)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">
              {selectedProvider === 'gmail'
                ? language === 'en'
                  ? 'Gmail / Google Workspace Address'
                  : 'জিমেইল / গুগল ওয়ার্কস্পেস ইমেইল'
                : selectedProvider === 'outlook'
                ? language === 'en'
                  ? 'Microsoft 365 Email'
                  : 'মাইক্রোসফট ৩৬৫ ইমেইল'
                : language === 'en'
                ? 'SMTP Username / Login Email'
                : 'এসএমটিপি ইউজারনেম / লগইন ইমেইল'}{' '}
              *
            </label>
            <input
              type="text"
              required
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder={
                selectedProvider === 'gmail'
                  ? 'yourbrand@gmail.com'
                  : selectedProvider === 'outlook'
                  ? 'sales@mybrand.com'
                  : 'contact@mybrand.com'
              }
              className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-emerald-500 outline-none font-mono"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">
              {selectedProvider === 'gmail'
                ? language === 'en'
                  ? '16-Character Google App Password'
                  : '১৬-অক্ষরের গুগল অ্যাপ পাসওয়ার্ড'
                : language === 'en'
                ? 'Password / App Password'
                : 'পাসওয়ার্ড / অ্যাপ পাসওয়ার্ড'}{' '}
              *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={
                  smtpData?.hasPassword
                    ? '•••••••••••••••• (Leave blank to keep saved password)'
                    : selectedProvider === 'gmail'
                    ? '16-character App Password (e.g. abcd efgh ijkl mnop)'
                    : 'Mailbox Password'
                }
                className="w-full bg-surface border border-border rounded-xl pl-3 pr-10 py-2 text-xs text-foreground focus:ring-1 focus:ring-emerald-500 outline-none font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Sender Identity Section */}
        <div className="pt-2 border-t border-border/50 space-y-4">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-emerald-500" />
            <h2 className="text-sm font-bold text-foreground">
              {language === 'en' ? 'Sender Envelope & Identity' : 'সেন্ডার আইডেন্টিটি ও এনভেলাপ'}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                {language === 'en' ? 'From Name' : 'প্রেরকের নাম'} *
              </label>
              <input
                type="text"
                required
                value={form.fromName}
                onChange={(e) => setForm({ ...form, fromName: e.target.value })}
                placeholder="e.g. Acme Honey Corner"
                className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                {language === 'en' ? 'From Email Address' : 'প্রেরকের ইমেইল'} *
              </label>
              <input
                type="email"
                required
                value={form.fromEmail}
                onChange={(e) => {
                  const val = e.target.value;
                  setForm((prev) => ({
                    ...prev,
                    fromEmail: val,
                    username: prev.username ? prev.username : val,
                  }));
                }}
                placeholder="e.g. sales@mybrand.com"
                className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-emerald-500 outline-none font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                {language === 'en' ? 'Reply-To Email (Optional)' : 'রিপ্লাই-টু ইমেইল (ঐচ্ছিক)'}
              </label>
              <input
                type="email"
                value={form.replyToEmail}
                onChange={(e) => setForm({ ...form, replyToEmail: e.target.value })}
                placeholder="e.g. support@mybrand.com"
                className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-emerald-500 outline-none font-mono"
              />
              <span className="text-[10px] text-muted-foreground mt-0.5 block">
                {language === 'en' ? 'Customer replies land here' : 'কাস্টমারদের রিপ্লাই এখানে আসবে'}
              </span>
            </div>
          </div>
        </div>

        {/* Buttons / Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-border/50">
          <div>
            {smtpData && (
              <button
                type="button"
                onClick={handleDelete}
                className="text-xs text-red-500 hover:text-red-400 flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {language === 'en' ? 'Disconnect SMTP' : 'এসএমটিপি সংযোগ বিচ্ছিন্ন করুন'}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {smtpData?.hasPassword && (
              <button
                type="button"
                onClick={() => setShowVerifyModal(true)}
                className="px-4 py-2 border border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                {language === 'en' ? 'Send Test Verification' : 'টেস্ট ভেরিফিকেশন পাঠান'}
              </button>
            )}

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {language === 'en' ? 'Save Credentials' : 'তথ্য সংরক্ষণ করুন'}
            </button>
          </div>
        </div>
      </form>

      {/* Inline Step-by-Step Instructions Card */}
      <SmtpSetupGuide
        mode="inline"
        activeTab={guideTab}
        onTabChange={(tab) => {
          setGuideTab(tab);
          if (tab === 'gmail') setSelectedProvider('gmail');
          else if (tab === 'outlook') setSelectedProvider('outlook');
          else setSelectedProvider('custom');
        }}
      />

      {/* Verification Modal */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card text-card-foreground border border-border max-w-md w-full rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  {language === 'en' ? 'Verify SMTP Connection' : 'এসএমটিপি সংযোগ যাচাই করুন'}
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  {language === 'en'
                    ? 'Executes a TLS handshake and dispatches a test verification email.'
                    : 'টিএলএস হ্যান্ডশেক সম্পন্ন করে একটি পরীক্ষামূলক ইমেইল পাঠানো হবে।'}
                </p>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                {language === 'en' ? 'Test Email Recipient' : 'টেস্ট ইমেইল প্রাপক'}
              </label>
              <input
                type="email"
                required
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
                placeholder="your-email@gmail.com"
                className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-emerald-500 outline-none font-mono"
              />
              <span className="text-[10px] text-muted-foreground mt-1 block">
                {language === 'en' ? 'Test email will be sent to this address' : 'এই ঠিকানায় টেস্ট মেইল পাঠানো হবে'}
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowVerifyModal(false)}
                className="px-4 py-2 border border-border rounded-xl text-xs text-muted-foreground hover:bg-muted transition-colors"
              >
                {language === 'en' ? 'Cancel' : 'বাতিল'}
              </button>
              <button
                type="button"
                onClick={handleVerify}
                disabled={verifying || !testRecipient.trim()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-md transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {verifying && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                {language === 'en' ? 'Start Probe & Send' : 'যাচাই ও সেন্ড করুন'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reusable Tabbed SMTP Guide Modal */}
      <SmtpSetupGuide
        mode="modal"
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
        activeTab={guideTab}
        onTabChange={(tab) => {
          setGuideTab(tab);
          if (tab === 'gmail') setSelectedProvider('gmail');
          else if (tab === 'outlook') setSelectedProvider('outlook');
          else setSelectedProvider('custom');
        }}
      />
    </div>
  );
}
