'use client';

import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';
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
  Search,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Database,
  BarChart3,
  Server,
  Layers,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface MetaPixelConfig {
  id?: string;
  pixelId: string;
  pixelAccessToken: string;
  isActive: boolean;
  isCapiEnabled: boolean;
  capiAccessToken: string;
  datasetId: string;
  trackPageView: boolean;
  trackSignup: boolean;
  trackCompleteReg: boolean;
  trackLogin: boolean;
  setupCompletedAt?: string;
  lastTestedAt?: string;
  hasPixelToken?: boolean;
  hasCapiToken?: boolean;
}

interface Stats24h {
  pageViews: number;
  signups: number;
  registrations: number;
  logins: number;
  conversionRate: number;
}

interface AcquisitionEvent {
  id: string;
  tenantId?: string;
  tenantEmail?: string;
  eventName: string;
  eventData: any;
  status: string;
  sentToMeta: boolean;
  metaEventId?: string;
  fbClickId?: string;
  fbPageId?: string;
  createdAt: string;
}

export default function MetaPixelSettingsPage() {
  const { language } = useLanguage();
  const token = Cookies.get('access_token');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingPixel, setTestingPixel] = useState(false);
  const [testingCapi, setTestingCapi] = useState(false);

  const [showPixelToken, setShowPixelToken] = useState(false);
  const [showCapiToken, setShowCapiToken] = useState(false);

  const [config, setConfig] = useState<MetaPixelConfig>({
    pixelId: '',
    pixelAccessToken: '',
    isActive: false,
    isCapiEnabled: false,
    capiAccessToken: '',
    datasetId: '',
    trackPageView: true,
    trackSignup: true,
    trackCompleteReg: true,
    trackLogin: true,
  });

  const [stats, setStats] = useState<Stats24h>({
    pageViews: 0,
    signups: 0,
    registrations: 0,
    logins: 0,
    conversionRate: 0,
  });

  // Modal State
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);

  const fetchConfigAndStats = async () => {
    setLoading(true);
    try {
      const [configRes, statsRes] = await Promise.all([
        fetch(`${API}/meta-pixel/config`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API}/meta-pixel/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (configRes.ok) {
        const configData = await configRes.json();
        setConfig((prev) => ({
          ...prev,
          ...configData,
          pixelId: configData.pixelId || '',
          datasetId: configData.datasetId || '',
        }));
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (err: any) {
      toast.error(language === 'en' ? 'Failed to load Meta Pixel settings' : 'মেটা পিক্সেল সেটিংস লোড করতে ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigAndStats();
  }, []);

  const handleSave = async () => {
    if (config.pixelId && !/^\d{6,20}$/.test(config.pixelId.trim())) {
      toast.error(language === 'en' ? 'Pixel ID must be a valid 6-20 digit number' : 'পিক্সেল আইডি অবশ্যই ৬-২০ ডিজিটের সংখ্যা হতে হবে');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API}/meta-pixel/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(config),
      });

      if (res.ok) {
        toast.success(language === 'en' ? 'Meta Pixel settings saved successfully!' : 'মেটা পিক্সেল সেটিংস সফলভাবে সংরক্ষিত হয়েছে!');
        fetchConfigAndStats();
      } else {
        const err = await res.json();
        toast.error(err.message || 'Failed to save settings');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestPixel = async () => {
    setTestingPixel(true);
    try {
      const res = await fetch(`${API}/meta-pixel/test-connection`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        fetchConfigAndStats();
      } else {
        toast.error(data.message || 'Pixel connection test failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error testing Pixel connection');
    } finally {
      setTestingPixel(false);
    }
  };

  const handleTestCapi = async () => {
    setTestingCapi(true);
    try {
      const res = await fetch(`${API}/meta-pixel/test-capi`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        fetchConfigAndStats();
      } else {
        toast.error(data.message || 'CAPI test failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error testing CAPI connection');
    } finally {
      setTestingCapi(false);
    }
  };

  const handleReset = async () => {
    if (!confirm(language === 'en' ? 'Are you sure you want to reset Meta Pixel configuration?' : 'আপনি কি নিশ্চিত যে মেটা পিক্সেল কনফিগারেশন রিসেট করতে চান?')) {
      return;
    }

    try {
      const res = await fetch(`${API}/meta-pixel/config`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success(language === 'en' ? 'Configuration reset successfully' : 'কনফিগারেশন রিসেট করা হয়েছে');
        setConfig({
          pixelId: '',
          pixelAccessToken: '',
          isActive: false,
          isCapiEnabled: false,
          capiAccessToken: '',
          datasetId: '',
          trackPageView: true,
          trackSignup: true,
          trackCompleteReg: true,
          trackLogin: true,
        });
        fetchConfigAndStats();
      }
    } catch (err: any) {
      toast.error(err.message || 'Error resetting configuration');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface/70 backdrop-blur-xl p-6 rounded-2xl border border-white/20 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-primary/10 text-primary uppercase tracking-wider">
              {language === 'en' ? 'ZiniChat Growth System' : 'জিনিচ্যাট গ্রোথ সিস্টেম'}
            </span>
            <span className={`px-2.5 py-1 text-[11px] font-bold rounded-md ${config.isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
              {config.isActive ? '✅ Active Tracking' : '⚠️ Inactive'}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mt-2">
            {language === 'en' ? 'Meta Pixel & Conversions API (CAPI)' : 'মেটা পিক্সেল এবং কনভার্সন এপিআই (CAPI)'}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {language === 'en'
              ? 'Track tenant acquisition campaign performance from Facebook Ad click to paid registration.'
              : 'ফেসবুক এড থেকে নতুন কাস্টমার সাইনআপ ও রেজিস্ট্রেশন ট্র্যাকিং করার প্ল্যাটফর্ম ওয়াইড ইঞ্জিন।'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-all"
          >
            {language === 'en' ? 'Reset Config' : 'রিসেট করুন'}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground shadow-md hover:bg-primary/90 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            {language === 'en' ? 'Save Changes' : 'পরিবর্তন সংরক্ষণ করুন'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Config Sections */}
        <div className="lg:col-span-8 space-y-6">
          {/* SECTION 1: Meta Pixel Configuration */}
          <div className="bg-surface/70 backdrop-blur-xl p-6 rounded-2xl border border-white/20 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                  <Sliders className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base text-foreground">
                  📌 SECTION 1: {language === 'en' ? 'Meta Pixel Configuration' : 'মেটা পিক্সেল কনফিগারেশন'}
                </h3>
              </div>

              {/* Master Active Toggle */}
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.isActive}
                  onChange={(e) => setConfig({ ...config, isActive: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                <span className="ml-2 text-xs font-semibold text-foreground">
                  {config.isActive ? (language === 'en' ? 'Active' : 'সক্রিয়') : (language === 'en' ? 'Disabled' : 'বন্ধ')}
                </span>
              </label>
            </div>

            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Meta Pixel ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={config.pixelId}
                  onChange={(e) => setConfig({ ...config, pixelId: e.target.value })}
                  placeholder="e.g. 1234567890123456"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background/50 focus:outline-none focus:border-primary text-foreground"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Pixel Access Token {config.hasPixelToken && <span className="text-emerald-500 font-normal">(Encrypted token saved)</span>}
                </label>
                <div className="relative">
                  <input
                    type={showPixelToken ? 'text' : 'password'}
                    value={config.pixelAccessToken}
                    onChange={(e) => setConfig({ ...config, pixelAccessToken: e.target.value })}
                    placeholder={config.hasPixelToken ? '•••••••••••••••••••• (Leave blank to keep existing token)' : 'Enter Meta Graph API Access Token'}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background/50 focus:outline-none focus:border-primary text-foreground pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPixelToken(!showPixelToken)}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    {showPixelToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleTestPixel}
                  disabled={testingPixel || !config.pixelId}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/30 hover:bg-blue-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {testingPixel ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                  {language === 'en' ? 'Test Pixel Connection' : 'পিক্সেল কানেকশন টেস্ট করুন'}
                </button>
              </div>
            </div>
          </div>

          {/* SECTION 2: Event Tracking Preferences */}
          <div className="bg-surface/70 backdrop-blur-xl p-6 rounded-2xl border border-white/20 shadow-xl space-y-4">
            <div className="flex items-center gap-2 border-b border-border/50 pb-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-base text-foreground">
                📌 SECTION 2: {language === 'en' ? 'Event Tracking Preferences' : 'ইভেন্ট ট্র্যাকিং প্রিফারেন্স'}
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <label className="flex items-start gap-3 p-3 rounded-xl border border-border/60 bg-background/30 hover:border-primary/40 cursor-pointer transition-all">
                <input
                  type="checkbox"
                  checked={config.trackPageView}
                  onChange={(e) => setConfig({ ...config, trackPageView: e.target.checked })}
                  className="mt-0.5 rounded text-primary focus:ring-primary"
                />
                <div>
                  <span className="text-xs font-bold text-foreground block">Track Page Views (PageView)</span>
                  <span className="text-[11px] text-muted-foreground">Fires on main marketing landing page loads.</span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-border/60 bg-background/30 hover:border-primary/40 cursor-pointer transition-all">
                <input
                  type="checkbox"
                  checked={config.trackSignup}
                  onChange={(e) => setConfig({ ...config, trackSignup: e.target.checked })}
                  className="mt-0.5 rounded text-primary focus:ring-primary"
                />
                <div>
                  <span className="text-xs font-bold text-foreground block">Track Signups (Lead / SignUp)</span>
                  <span className="text-[11px] text-muted-foreground">Fires when a new user registers a business tenant account.</span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-border/60 bg-background/30 hover:border-primary/40 cursor-pointer transition-all">
                <input
                  type="checkbox"
                  checked={config.trackCompleteReg}
                  onChange={(e) => setConfig({ ...config, trackCompleteReg: e.target.checked })}
                  className="mt-0.5 rounded text-primary focus:ring-primary"
                />
                <div>
                  <span className="text-xs font-bold text-foreground block">Track Verification (CompleteRegistration)</span>
                  <span className="text-[11px] text-muted-foreground">Fires upon successful email verification token confirmation.</span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-border/60 bg-background/30 hover:border-primary/40 cursor-pointer transition-all">
                <input
                  type="checkbox"
                  checked={config.trackLogin}
                  onChange={(e) => setConfig({ ...config, trackLogin: e.target.checked })}
                  className="mt-0.5 rounded text-primary focus:ring-primary"
                />
                <div>
                  <span className="text-xs font-bold text-foreground block">Track First Login (Purchase / Conversion)</span>
                  <span className="text-[11px] text-muted-foreground">Fires once when the tenant owner logs in for the very first time.</span>
                </div>
              </label>
            </div>
          </div>

          {/* SECTION 3: Conversions API (CAPI) */}
          <div className="bg-surface/70 backdrop-blur-xl p-6 rounded-2xl border border-white/20 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
                  <Server className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base text-foreground">
                  📌 SECTION 3: {language === 'en' ? 'Conversions API (CAPI)' : 'কনভার্সন এপিআই (CAPI)'}
                </h3>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.isCapiEnabled}
                  onChange={(e) => setConfig({ ...config, isCapiEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                <span className="ml-2 text-xs font-semibold text-foreground">
                  {config.isCapiEnabled ? (language === 'en' ? 'CAPI Enabled' : 'CAPI সচল') : (language === 'en' ? 'Disabled' : 'বন্ধ')}
                </span>
              </label>
            </div>

            <div className={`space-y-4 pt-2 ${!config.isCapiEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Dataset ID (Optional - Defaults to Pixel ID)</label>
                <input
                  type="text"
                  value={config.datasetId}
                  onChange={(e) => setConfig({ ...config, datasetId: e.target.value })}
                  placeholder="e.g. 9876543210"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background/50 focus:outline-none focus:border-primary text-foreground"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  CAPI Access Token {config.hasCapiToken && <span className="text-emerald-500 font-normal">(Encrypted token saved)</span>}
                </label>
                <div className="relative">
                  <input
                    type={showCapiToken ? 'text' : 'password'}
                    value={config.capiAccessToken}
                    onChange={(e) => setConfig({ ...config, capiAccessToken: e.target.value })}
                    placeholder={config.hasCapiToken ? '•••••••••••••••••••• (Leave blank to keep existing token)' : 'Enter CAPI Access Token'}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background/50 focus:outline-none focus:border-primary text-foreground pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCapiToken(!showCapiToken)}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    {showCapiToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleTestCapi}
                  disabled={testingCapi || !config.isCapiEnabled}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/30 hover:bg-purple-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {testingCapi ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Server className="w-3.5 h-3.5" />}
                  {language === 'en' ? 'Test CAPI Integration' : 'CAPI কানেকশন টেস্ট করুন'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: SECTION 4 - Stats & Debug */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-surface/70 backdrop-blur-xl p-6 rounded-2xl border border-white/20 shadow-xl space-y-4 sticky top-6">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base text-foreground">
                  📌 {language === 'en' ? 'Last 24h Stats' : 'গত ২৪ ঘণ্টার পরিসংখ্যান'}
                </h3>
              </div>

              <button
                onClick={fetchConfigAndStats}
                className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
                title="Refresh stats"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-xl border border-border/60 bg-background/40">
                <span className="text-[10px] font-semibold text-muted-foreground block uppercase">Page Views</span>
                <span className="text-xl font-bold text-foreground mt-1 block">{stats.pageViews}</span>
              </div>

              <div className="p-3 rounded-xl border border-border/60 bg-background/40">
                <span className="text-[10px] font-semibold text-muted-foreground block uppercase">Signups</span>
                <span className="text-xl font-bold text-blue-500 mt-1 block">{stats.signups}</span>
              </div>

              <div className="p-3 rounded-xl border border-border/60 bg-background/40">
                <span className="text-[10px] font-semibold text-muted-foreground block uppercase">Registrations</span>
                <span className="text-xl font-bold text-purple-500 mt-1 block">{stats.registrations}</span>
              </div>

              <div className="p-3 rounded-xl border border-border/60 bg-background/40">
                <span className="text-[10px] font-semibold text-muted-foreground block uppercase">First Logins</span>
                <span className="text-xl font-bold text-emerald-500 mt-1 block">{stats.logins}</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 text-center">
              <span className="text-xs font-semibold text-muted-foreground block uppercase tracking-wider">Funnel Conversion Rate</span>
              <span className="text-3xl font-extrabold text-primary mt-1 block">{stats.conversionRate}%</span>
              <span className="text-[10px] text-muted-foreground mt-1 block">(First Logins / PageViews * 100)</span>
            </div>

            <div className="pt-2 border-t border-border/50 space-y-2">
              <button
                onClick={() => setIsLogsModalOpen(true)}
                className="w-full py-2.5 px-4 rounded-xl bg-accent hover:bg-accent/80 text-foreground font-semibold text-xs transition-all flex items-center justify-center gap-2 border border-border"
              >
                <Database className="w-3.5 h-3.5 text-primary" />
                {language === 'en' ? 'View Event Audit Logs' : 'ইভেন্ট অডিট লগ দেখুন'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* EVENT LOGS MODAL */}
      {isLogsModalOpen && (
        <EventLogsModal
          onClose={() => setIsLogsModalOpen(false)}
          token={token}
          language={language}
        />
      )}
    </div>
  );
}

function EventLogsModal({
  onClose,
  token,
  language,
}: {
  onClose: () => void;
  token?: string;
  language: string;
}) {
  const [events, setEvents] = useState<AcquisitionEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [eventNameFilter, setEventNameFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const limit = 20;

  const fetchLogs = async () => {
    setLoading(true);
    const offset = (page - 1) * limit;
    try {
      const url = new URL(`${API}/meta-pixel/events`);
      url.searchParams.append('limit', limit.toString());
      url.searchParams.append('offset', offset.toString());
      if (eventNameFilter) url.searchParams.append('eventName', eventNameFilter);
      if (searchQuery) url.searchParams.append('search', searchQuery);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
        setTotal(data.total || 0);
      }
    } catch (err: any) {
      toast.error('Failed to load event logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, eventNameFilter]);

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface/95 border border-white/20 backdrop-blur-2xl rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-background/50">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-base text-foreground">
              {language === 'en' ? 'Meta Acquisition Event Audit Logs' : 'মেটা একুইজিশন ইভেন্ট অডিট লগ'}
            </h3>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-primary/10 text-primary">
              {total} Total Events
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Filter Bar */}
        <div className="p-4 border-b border-border/40 bg-background/30 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by email or Meta Event ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-border bg-background focus:outline-none focus:border-primary text-foreground"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={eventNameFilter}
              onChange={(e) => {
                setEventNameFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-none"
            >
              <option value="">All Event Types</option>
              <option value="PageView">PageView</option>
              <option value="Lead">Lead</option>
              <option value="SignUp">SignUp</option>
              <option value="CompleteRegistration">CompleteRegistration</option>
              <option value="Purchase">Purchase (First Login)</option>
            </select>

            <button
              onClick={fetchLogs}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Filter
            </button>
          </div>
        </div>

        {/* Table Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-xs">
              No acquisition events logged yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border text-muted-foreground uppercase text-[10px] font-bold">
                    <th className="py-2.5 px-3">Event Name</th>
                    <th className="py-2.5 px-3">Tenant Email</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Sent to Meta</th>
                    <th className="py-2.5 px-3">Date & Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {events.map((ev) => (
                    <tr key={ev.id} className="hover:bg-background/40 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-foreground">
                        <span className="px-2 py-0.5 rounded-md bg-accent border border-border text-[11px]">
                          {ev.eventName}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-foreground/80 font-mono text-[11px]">
                        {ev.tenantEmail || '—'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            ev.status === 'sent'
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : ev.status === 'pending'
                              ? 'bg-amber-500/10 text-amber-500'
                              : 'bg-red-500/10 text-red-500'
                          }`}
                        >
                          {ev.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        {ev.sentToMeta ? (
                          <span className="text-emerald-500 flex items-center gap-1 font-semibold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Yes
                          </span>
                        ) : (
                          <span className="text-muted-foreground flex items-center gap-1 font-semibold text-[11px]">
                            <XCircle className="w-3.5 h-3.5" /> No
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground text-[11px]">
                        {new Date(ev.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Pagination Footer */}
        <div className="px-6 py-3 border-t border-border/50 bg-background/50 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            Page {page} of {totalPages} ({total} entries)
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-border hover:bg-accent disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-border hover:bg-accent disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
