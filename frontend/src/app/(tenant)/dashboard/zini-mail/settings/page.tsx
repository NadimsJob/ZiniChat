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
  ShieldAlert,
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
  Info,
  Key
} from 'lucide-react';
import SmtpSetupGuide, { SmtpGuideTab } from '@/components/outreach/SmtpSetupGuideModal';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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

  const [smtpData, setSmtpData] = useState<any>(null);
  const [form, setForm] = useState({
    host: '',
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
        if (data) {
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

  const handleApplyPreset = (preset: 'gmail' | 'outlook' | 'cpanel') => {
    if (preset === 'gmail') {
      setGuideTab('gmail');
      setForm((prev) => ({
        ...prev,
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
      }));
      toast.success(
        language === 'en'
          ? 'Gmail preset applied (Port 465 SSL). Use a 16-character Google App Password!'
          : 'জিমেইল প্রিসেট প্রয়োগ করা হয়েছে (পোর্ট ৪৬৫ SSL)। ১৬ অক্ষরের গুগল অ্যাপ পাসওয়ার্ড দিন!'
      );
    } else if (preset === 'outlook') {
      setGuideTab('outlook');
      setForm((prev) => ({
        ...prev,
        host: 'smtp.office365.com',
        port: 587,
        secure: false,
      }));
      toast.success(
        language === 'en'
          ? 'Microsoft 365 preset applied (Port 587 STARTTLS)'
          : 'মাইক্রোসফট ৩৬৫ প্রিসেট প্রয়োগ করা হয়েছে (পোর্ট ৫৮৭ STARTTLS)'
      );
    } else if (preset === 'cpanel') {
      setGuideTab('cpanel');
      setForm((prev) => ({
        ...prev,
        port: 465,
        secure: true,
        host: prev.host || (prev.fromEmail.includes('@') ? `mail.${prev.fromEmail.split('@')[1]}` : 'mail.yourdomain.com'),
      }));
      toast.success(
        language === 'en'
          ? 'cPanel / Webmail preset applied (Port 465 SSL)'
          : 'সিপ্যানেল / ওয়েবমেইল প্রিসেট প্রয়োগ করা হয়েছে (পোর্ট ৪৬৫ SSL)'
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
        host: '',
        port: 465,
        secure: true,
        username: '',
        password: '',
        fromName: '',
        fromEmail: '',
        replyToEmail: '',
      });
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

      {/* Preset Fast Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => handleApplyPreset('gmail')}
          className="p-3.5 rounded-xl bg-surface/70 backdrop-blur-xl border border-border hover:border-emerald-500/50 hover:bg-emerald-500/5 text-left transition-all group flex items-start gap-3"
        >
          <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
            <Mail className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-foreground group-hover:text-emerald-500 transition-colors">
              Google Workspace / Gmail
            </div>
            <div className="text-[10px] text-muted-foreground">Port 465 (SSL) with App Password</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleApplyPreset('outlook')}
          className="p-3.5 rounded-xl bg-surface/70 backdrop-blur-xl border border-border hover:border-emerald-500/50 hover:bg-emerald-500/5 text-left transition-all group flex items-start gap-3"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
            <Server className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-foreground group-hover:text-emerald-500 transition-colors">
              Microsoft 365 / Outlook
            </div>
            <div className="text-[10px] text-muted-foreground">Port 587 (STARTTLS)</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleApplyPreset('cpanel')}
          className="p-3.5 rounded-xl bg-surface/70 backdrop-blur-xl border border-border hover:border-emerald-500/50 hover:bg-emerald-500/5 text-left transition-all group flex items-start gap-3"
        >
          <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-foreground group-hover:text-emerald-500 transition-colors">
              Custom / cPanel Webmail
            </div>
            <div className="text-[10px] text-muted-foreground">mail.yourdomain.com (Port 465)</div>
          </div>
        </button>
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
              placeholder="e.g. smtp.gmail.com or mail.mybrand.com"
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
              {language === 'en' ? 'SMTP Username / Login Email' : 'এসএমটিপি ইউজারনেম / লগইন ইমেইল'} *
            </label>
            <input
              type="text"
              required
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="e.g. contact@mybrand.com"
              className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-emerald-500 outline-none font-mono"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">
              {language === 'en' ? 'Password / App Password' : 'পাসওয়ার্ড / অ্যাপ পাসওয়ার্ড'} *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={
                  smtpData?.hasPassword
                    ? '•••••••••••••••• (Leave blank to keep saved password)'
                    : '16-character App Password or Mail Password'
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
                onChange={(e) => setForm({ ...form, fromEmail: e.target.value })}
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
              <span className="text-[10px] text-muted-foreground mt-0.5 block">Customer replies land here</span>
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
        onTabChange={setGuideTab}
      />

      {/* Verification Modal */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
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
        onTabChange={setGuideTab}
      />
    </div>
  );
}
