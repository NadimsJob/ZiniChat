'use client';

import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useLanguage } from '@/components/LanguageProvider';
import {
  Activity,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Sliders,
  ShieldCheck,
  Zap,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  ExternalLink,
  Layers,
  X,
  FileText,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface GAConfig {
  id?: string;
  measurementId: string;
  apiSecret: string;
  isActive: boolean;
  trackPageView: boolean;
  trackSignup: boolean;
  trackCompleteReg: boolean;
  trackLogin: boolean;
  setupCompletedAt?: string;
  lastTestedAt?: string;
  testResult?: string;
  hasApiSecret?: boolean;
  maskedApiSecret?: string;
}

interface Stats24h {
  total: number;
  sent: number;
  failed: number;
  breakdown: {
    pageViews: number;
    signups: number;
    completeRegs: number;
    purchases: number;
  };
}

interface GAEventLog {
  id: string;
  tenantId?: string;
  tenantEmail?: string;
  eventName: string;
  eventParams: any;
  status: string;
  sentToGA: boolean;
  responseStatus?: number;
  errorMessage?: string;
  createdAt: string;
}

export default function GoogleAnalyticsSettingsPage() {
  const { language } = useLanguage();
  const token = Cookies.get('access_token');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [showApiSecret, setShowApiSecret] = useState(false);

  const [config, setConfig] = useState<GAConfig>({
    measurementId: '',
    apiSecret: '',
    isActive: false,
    trackPageView: true,
    trackSignup: true,
    trackCompleteReg: true,
    trackLogin: true,
  });

  const [stats, setStats] = useState<Stats24h>({
    total: 0,
    sent: 0,
    failed: 0,
    breakdown: {
      pageViews: 0,
      signups: 0,
      completeRegs: 0,
      purchases: 0,
    },
  });

  // Modal State
  const [logsModalOpen, setLogsModalOpen] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logs, setLogs] = useState<GAEventLog[]>([]);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotalPages, setLogsTotalPages] = useState(1);

  const fetchConfigAndStats = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [configRes, statsRes] = await Promise.all([
        fetch(`${API}/google-analytics/config`, { headers }),
        fetch(`${API}/google-analytics/stats`, { headers }),
      ]);

      if (configRes.ok) {
        const data = await configRes.json();
        setConfig({
          measurementId: data.measurementId || '',
          apiSecret: '', // Secret is write-only for security
          isActive: data.isActive ?? false,
          trackPageView: data.trackPageView ?? true,
          trackSignup: data.trackSignup ?? true,
          trackCompleteReg: data.trackCompleteReg ?? true,
          trackLogin: data.trackLogin ?? true,
          setupCompletedAt: data.setupCompletedAt,
          lastTestedAt: data.lastTestedAt,
          testResult: data.testResult,
          hasApiSecret: data.hasApiSecret,
          maskedApiSecret: data.maskedApiSecret,
        });
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (err) {
      toast.error(language === 'en' ? 'Failed to load Google Analytics settings' : 'গুগল অ্যানালিটিক্স সেটিংস লোড করতে ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchConfigAndStats();
  }, [token]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();

    if (config.measurementId && !/^G-[A-Z0-9]+$/i.test(config.measurementId)) {
      toast.error(language === 'en' ? 'Invalid Measurement ID format (must be G-XXXXXXXXXX)' : 'অকার্যকর মেজারমেন্ট আইডি ফরম্যাট (G-XXXXXXXXXX হতে হবে)');
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        measurementId: config.measurementId,
        isActive: config.isActive,
        trackPageView: config.trackPageView,
        trackSignup: config.trackSignup,
        trackCompleteReg: config.trackCompleteReg,
        trackLogin: config.trackLogin,
      };

      if (config.apiSecret) {
        payload.apiSecret = config.apiSecret;
      }

      const res = await fetch(`${API}/google-analytics/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to save settings');

      toast.success(language === 'en' ? 'Google Analytics settings saved!' : 'গুগল অ্যানালিটিক্স সেটিংস সংরক্ষিত হয়েছে!');
      setConfig(prev => ({ ...prev, apiSecret: '' }));
      fetchConfigAndStats();
    } catch (err: any) {
      toast.error(err.message || 'Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    try {
      const res = await fetch(`${API}/google-analytics/test-connection`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
      fetchConfigAndStats();
    } catch (err: any) {
      toast.error('Connection test failed');
    } finally {
      setTestingConnection(false);
    }
  };

  const fetchLogs = async (page = 1) => {
    setLogsLoading(true);
    try {
      const res = await fetch(`${API}/google-analytics/events?page=${page}&limit=15`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.events || []);
        setLogsPage(data.page || 1);
        setLogsTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      toast.error('Failed to fetch event logs');
    } finally {
      setLogsLoading(false);
    }
  };

  const openLogsModal = () => {
    setLogsModalOpen(true);
    fetchLogs(1);
  };

  const handleResetConfig = async () => {
    if (!confirm(language === 'en' ? 'Are you sure you want to reset Google Analytics configuration?' : 'আপনি কি নিশ্চিত যে গুগল অ্যানালিটিক্স কনফিগারেশন রিকমেট করতে চান?')) {
      return;
    }
    try {
      const res = await fetch(`${API}/google-analytics/config`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success('Google Analytics configuration reset.');
        fetchConfigAndStats();
      }
    } catch (err) {
      toast.error('Failed to reset config.');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-500">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {language === 'en' ? 'Google Analytics (GA4) Integration' : 'গুগল অ্যানালিটিক্স (GA4) ইন্টিগ্রেশন'}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {language === 'en'
                  ? 'Centralized acquisition funnel tracking via Google Analytics Measurement Protocol v2'
                  : 'গুগল অ্যানালিটিক্স মেজারমেন্ট প্রোটোকলের মাধ্যমে সেন্ট্রালাইজড একুইজিশন ট্র্যাকিং'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/superadmin/settings/meta-pixel"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium border border-border bg-card hover:bg-accent transition-all text-foreground"
          >
            <Layers className="w-4 h-4 text-blue-500" />
            {language === 'en' ? 'Meta Pixel Settings' : 'মেটা পিক্সেল সেটিংস'}
          </Link>
          <a
            href="https://analytics.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-orange-500 text-white shadow-md hover:bg-orange-600 transition-all"
          >
            <ExternalLink className="w-4 h-4" />
            {language === 'en' ? 'Go to GA Dashboard' : 'GA ড্যাশবোর্ডে যান'}
          </a>
        </div>
      </div>

      {/* 24h Stats Dashboard Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-white/10 bg-surface/70 backdrop-blur-xl p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">{language === 'en' ? 'Total 24h Events' : '২৪ ঘণ্টার মোট ইভেন্ট'}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{stats.total}</p>
          <div className="mt-2 flex items-center gap-2 text-[11px]">
            <span className="text-emerald-500 font-semibold">{stats.sent} Sent</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-red-400 font-semibold">{stats.failed} Failed</span>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-surface/70 backdrop-blur-xl p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">Page Views (page_view)</p>
          <p className="text-2xl font-bold text-blue-500 mt-1">{stats.breakdown?.pageViews || 0}</p>
          <p className="text-[11px] text-muted-foreground mt-2">Landing page hits</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-surface/70 backdrop-blur-xl p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">Signups (sign_up)</p>
          <p className="text-2xl font-bold text-amber-500 mt-1">{stats.breakdown?.signups || 0}</p>
          <p className="text-[11px] text-muted-foreground mt-2">Form submissions</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-surface/70 backdrop-blur-xl p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">Purchases (purchase)</p>
          <p className="text-2xl font-bold text-emerald-500 mt-1">{stats.breakdown?.purchases || 0}</p>
          <p className="text-[11px] text-muted-foreground mt-2">First login conversions</p>
        </div>
      </div>

      <form onSubmit={handleSaveConfig} className="space-y-6">
        {/* Section 1: GA Configuration */}
        <div className="rounded-2xl border border-white/20 bg-surface/70 backdrop-blur-xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-border/40 pb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">
                {language === 'en' ? '📌 SECTION 1: GA Configuration' : '📌 সেকশন ১: গুগল অ্যানালিটিক্স কনফিগারেশন'}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-muted-foreground">
                {config.isActive ? (language === 'en' ? 'Active' : 'সক্রিয়') : (language === 'en' ? 'Inactive' : 'নিষ্ক্রিয়')}
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.isActive}
                  onChange={e => setConfig({ ...config, isActive: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Measurement ID */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Measurement ID (G-XXXXXXXXXX) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="G-XXXXXXXXXX"
                value={config.measurementId}
                onChange={e => setConfig({ ...config, measurementId: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Google Analytics 4 Data Stream Measurement ID.
              </p>
            </div>

            {/* API Secret */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                API Secret (Measurement Protocol) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showApiSecret ? 'text' : 'password'}
                  placeholder={config.hasApiSecret ? `Masked: ${config.maskedApiSecret}` : 'Enter GA API Secret'}
                  value={config.apiSecret}
                  onChange={e => setConfig({ ...config, apiSecret: e.target.value })}
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-border bg-card text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowApiSecret(!showApiSecret)}
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  {showApiSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Generated in GA Admin &gt; Data Streams &gt; Measurement Protocol API secrets.
              </p>
            </div>
          </div>

          {/* Test Button & Status */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/40">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testingConnection || !config.measurementId}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-all disabled:opacity-50"
              >
                {testingConnection ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                {language === 'en' ? 'Test GA Connection' : 'GA কানেকশন টেস্ট করুন'}
              </button>

              <button
                type="button"
                onClick={openLogsModal}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border border-border bg-card hover:bg-accent text-foreground transition-all"
              >
                <FileText className="w-4 h-4 text-amber-500" />
                {language === 'en' ? 'View GA Event Logs' : 'GA ইভেন্ট লগ দেখুন'}
              </button>
            </div>

            {config.lastTestedAt && (
              <div className="text-right text-xs">
                <span className="text-muted-foreground">Last Tested: </span>
                <span className="font-semibold text-foreground">
                  {new Date(config.lastTestedAt).toLocaleString()}
                </span>
                {config.testResult && (
                  <span
                    className={`ml-2 font-bold ${
                      config.testResult === 'success' ? 'text-emerald-500' : 'text-red-500'
                    }`}
                  >
                    ({config.testResult})
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Event Tracking Preferences */}
        <div className="rounded-2xl border border-white/20 bg-surface/70 backdrop-blur-xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-border/40 pb-4">
            <Sliders className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">
              {language === 'en' ? '📌 SECTION 2: Event Tracking Preferences' : '📌 সেকশন ২: ইভেন্ট ট্র্যাকিং প্রেফারেন্স'}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <label className="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-card/50 cursor-pointer hover:bg-accent transition-all">
              <input
                type="checkbox"
                checked={config.trackPageView}
                onChange={e => setConfig({ ...config, trackPageView: e.target.checked })}
                className="w-4 h-4 rounded text-primary border-border focus:ring-primary/20"
              />
              <div>
                <p className="text-xs font-semibold text-foreground">Page Views (page_view)</p>
                <p className="text-[10px] text-muted-foreground">Landing Page visits</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-card/50 cursor-pointer hover:bg-accent transition-all">
              <input
                type="checkbox"
                checked={config.trackSignup}
                onChange={e => setConfig({ ...config, trackSignup: e.target.checked })}
                className="w-4 h-4 rounded text-primary border-border focus:ring-primary/20"
              />
              <div>
                <p className="text-xs font-semibold text-foreground">Signups (sign_up)</p>
                <p className="text-[10px] text-muted-foreground">Registration forms</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-card/50 cursor-pointer hover:bg-accent transition-all">
              <input
                type="checkbox"
                checked={config.trackCompleteReg}
                onChange={e => setConfig({ ...config, trackCompleteReg: e.target.checked })}
                className="w-4 h-4 rounded text-primary border-border focus:ring-primary/20"
              />
              <div>
                <p className="text-xs font-semibold text-foreground">Email Verification (view_item)</p>
                <p className="text-[10px] text-muted-foreground">Verification complete</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-card/50 cursor-pointer hover:bg-accent transition-all">
              <input
                type="checkbox"
                checked={config.trackLogin}
                onChange={e => setConfig({ ...config, trackLogin: e.target.checked })}
                className="w-4 h-4 rounded text-primary border-border focus:ring-primary/20"
              />
              <div>
                <p className="text-xs font-semibold text-foreground">First Login (purchase)</p>
                <p className="text-[10px] text-muted-foreground">Workspace activation</p>
              </div>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleResetConfig}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-all"
          >
            {language === 'en' ? 'Reset Config' : 'কনফিগ রিসেট করুন'}
          </button>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {language === 'en' ? 'Save Changes' : 'পরিবর্তনগুলো সংরক্ষণ করুন'}
          </button>
        </div>
      </form>

      {/* GA Event Audit Logs Modal */}
      {logsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-4xl max-h-[85vh] flex flex-col rounded-2xl border border-white/20 bg-surface/90 backdrop-blur-2xl shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/40">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-500" />
                <h3 className="text-base font-bold text-foreground">
                  {language === 'en' ? 'Google Analytics Dispatched Event Logs' : 'গুগল অ্যানালিটিক্স প্রেরিত ইভেন্ট লগ'}
                </h3>
              </div>
              <button
                onClick={() => setLogsModalOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {logsLoading ? (
                <div className="flex justify-center py-12">
                  <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  {language === 'en' ? 'No GA events logged yet.' : 'এখনও কোনো ইভেন্ট পাওয়া যায়নি।'}
                </div>
              ) : (
                <div className="border border-border/40 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/50 text-muted-foreground border-b border-border/40">
                      <tr>
                        <th className="p-3 font-semibold">Time</th>
                        <th className="p-3 font-semibold">Event Name</th>
                        <th className="p-3 font-semibold">Tenant Email</th>
                        <th className="p-3 font-semibold">Status</th>
                        <th className="p-3 font-semibold">HTTP Code</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {logs.map(log => (
                        <tr key={log.id} className="hover:bg-accent/40">
                          <td className="p-3 whitespace-nowrap text-muted-foreground">
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                          <td className="p-3 font-semibold text-foreground">
                            <span className="px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-500 font-mono">
                              {log.eventName}
                            </span>
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {log.tenantEmail || 'Anonymous'}
                          </td>
                          <td className="p-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                log.status === 'sent'
                                  ? 'bg-emerald-500/10 text-emerald-500'
                                  : 'bg-red-500/10 text-red-500'
                              }`}
                            >
                              {log.status === 'sent' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                              {log.status}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-muted-foreground">
                            {log.responseStatus || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-3 border-t border-border/40 bg-muted/20">
              <p className="text-xs text-muted-foreground">
                Page {logsPage} of {logsTotalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchLogs(logsPage - 1)}
                  disabled={logsPage <= 1 || logsLoading}
                  className="p-1.5 rounded-lg border border-border bg-card text-foreground disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => fetchLogs(logsPage + 1)}
                  disabled={logsPage >= logsTotalPages || logsLoading}
                  className="p-1.5 rounded-lg border border-border bg-card text-foreground disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
