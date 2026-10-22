'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { useLanguage } from '@/components/LanguageProvider';
import { 
  Server, 
  ShieldCheck, 
  Copy, 
  Check, 
  Save, 
  Globe, 
  Info, 
  RefreshCw, 
  Zap, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  SlidersHorizontal, 
  X, 
  Sparkles,
  Bot,
  ShoppingCart,
  UserCheck,
  LayoutGrid,
  Filter,
  Activity,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useRolloutFlag } from '@/hooks/useRolloutFlag';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const STANDARD_EVENT_PRESETS = [
  { name: 'Purchase', desc: 'Order confirmed or placed by customer', bnDesc: 'গ্রাহকের অর্ডার কনফার্ম বা প্লেস হলে' },
  { name: 'Lead', desc: 'New customer lead captured with phone/email', bnDesc: 'ফোন/ইমেইলসহ নতুন লিড তৈরি হলে' },
  { name: 'Contact', desc: 'Customer contacted via Inbox AI or WhatsApp', bnDesc: 'ইনবক্স বা হোয়াটসঅ্যাপে যোগাযোগ করলে' },
  { name: 'InitiateCheckout', desc: 'Checkout initiated in widget or chat', bnDesc: 'চেকআউট শুরু হলে' },
  { name: 'AddToCart', desc: 'Product added to cart or selected in chat', bnDesc: 'কার্টে পণ্য যুক্ত করলে' },
  { name: 'ViewContent', desc: 'Customer viewed product details or catalog', bnDesc: 'পণ্যের বিবরণ বা ক্যাটালগ দেখলে' },
  { name: 'CompleteRegistration', desc: 'Customer registered or profile completed', bnDesc: 'কাস্টমার রেজিস্ট্রেশন সম্পন্ন হলে' },
  { name: 'Search', desc: 'Customer searched for product in catalog', bnDesc: 'পণ্য সার্চ করলে' },
];

export default function CapiHubPage() {
  const { language } = useLanguage();
  const router = useRouter();
  const { enabled: isFeatureEnabled, loading: isFeatureLoading } = useRolloutFlag('capi_hub');
  
  const [integration, setIntegration] = useState<any>(null);
  const [eventConfigs, setEventConfigs] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingPing, setTestingPing] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; data?: any } | null>(null);
  const [refreshingLogs, setRefreshingLogs] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Subscription Plan Synchronization
  const [quotaData, setQuotaData] = useState<{ isSubscriptionActive?: boolean } | null>(null);
  const isPlanActive = quotaData ? quotaData.isSubscriptionActive !== false : true;
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEventName, setNewEventName] = useState('CompleteRegistration');
  const [customEventInput, setCustomEventInput] = useState('');
  const [activeConfigModal, setActiveConfigModal] = useState<any | null>(null);
  
  const [formData, setFormData] = useState({
    pixelId: '',
    datasetId: '',
    accessToken: '',
    testEventCode: ''
  });

  // Auto-discovered Pixels from connected Meta accounts
  const [discoveredData, setDiscoveredData] = useState<{
    isMetaConnected: boolean;
    connectedAccounts: Array<{ adAccountId: string; name: string }>;
    hasFacebookPage?: boolean;
    facebookPageName?: string;
    pixels: Array<{
      id: string;
      name: string;
      isUnavailable?: boolean;
      creationTime?: string;
      lastFiredTime?: string;
      adAccountId?: string;
      adAccountName?: string;
    }>;
    message?: string;
  } | null>(null);
  const [loadingDiscovered, setLoadingDiscovered] = useState(false);
  const [selectedDiscoveredPixelId, setSelectedDiscoveredPixelId] = useState<string>('');
  const [connectingDiscovered, setConnectingDiscovered] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);

  const fetchDiscoveredPixels = async () => {
    try {
      setLoadingDiscovered(true);
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/capi-hub/discovered-pixels`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDiscoveredData(data);
        if (data.pixels && data.pixels.length > 0) {
          setSelectedDiscoveredPixelId((prev) => {
            if (prev) return prev;
            return data.pixels[0].id;
          });
        }
      }
    } catch {
      console.warn('Failed to load discovered pixels');
    } finally {
      setLoadingDiscovered(false);
    }
  };

  const handleConnectDiscoveredPixel = async (targetPixelId?: string) => {
    if (!isPlanActive) {
      toast.error(
        language === 'en'
          ? 'Subscription plan expired. Please renew your plan to connect Meta Pixels.'
          : 'সাবস্ক্রিপশন প্ল্যানের মেয়াদ শেষ। মেটা পিক্সেল যুক্ত করতে প্ল্যান রিনিউ করুন।'
      );
      return;
    }

    const pixelId = targetPixelId || selectedDiscoveredPixelId;
    if (!pixelId) {
      toast.error(language === 'en' ? 'Please select a Meta Pixel first' : 'অনুগ্রহ করে প্রথমে একটি মেটা পিক্সেল নির্বাচন করুন');
      return;
    }

    setConnectingDiscovered(true);
    setTestResult(null);
    try {
      const token = Cookies.get('access_token');
      const matchedPixel = discoveredData?.pixels?.find(p => p.id === pixelId);
      const res = await fetch(`${API}/capi-hub/connect-discovered-pixel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pixelId,
          adAccountId: matchedPixel?.adAccountId,
          testEventCode: formData.testEventCode ? formData.testEventCode.trim() : undefined
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to connect pixel');
      }

      toast.success(
        language === 'en'
          ? `Meta Pixel (${pixelId}) connected with zero-hassle token!`
          : `পিক্সেল (${pixelId}) সফলভাবে সংযুক্ত হয়েছে! আলাদা টোকেন দেওয়ার প্রয়োজন নেই।`
      );
      await fetchData();
      await fetchDiscoveredPixels();
    } catch (err: any) {
      toast.error(err.message || 'Error connecting discovered pixel');
    } finally {
      setConnectingDiscovered(false);
    }
  };

  const fetchData = async () => {
    try {
      const token = Cookies.get('access_token');
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const [intRes, configsRes, logsRes, quotasRes] = await Promise.all([
        fetch(`${API}/capi-hub/integration`, { headers }),
        fetch(`${API}/capi-hub/event-configs`, { headers }),
        fetch(`${API}/capi-hub/logs`, { headers }),
        fetch(`${API}/billing/quotas`, { headers }).catch(() => null),
        fetchDiscoveredPixels()
      ]);

      if (quotasRes && quotasRes.ok) {
        const qData = await quotasRes.json();
        setQuotaData({ isSubscriptionActive: qData.isSubscriptionActive });
      }

      if (intRes && intRes.ok) {
        const data = await intRes.json();
        setIntegration(data);
        if (data) {
          setFormData({
            pixelId: data.pixelId || '',
            datasetId: data.datasetId || '',
            accessToken: data.accessToken ? '********' : '',
            testEventCode: data.testEventCode || ''
          });
          if (data.pixelId) {
            setSelectedDiscoveredPixelId(data.pixelId);
          }
        }
      } else if (intRes && intRes.status === 403) {
        const errData = await intRes.clone().json().catch(() => ({}));
        if (errData?.message?.toLowerCase()?.includes('subscription') || errData?.message?.toLowerCase()?.includes('expired')) {
          setQuotaData({ isSubscriptionActive: false });
        }
      }
      
      if (configsRes && configsRes.ok) {
        setEventConfigs(await configsRes.json());
      }
      
      if (logsRes && logsRes.ok) {
        setLogs(await logsRes.json());
      }
    } catch {
      toast.error(language === 'en' ? 'Failed to load CAPI Hub data' : 'CAPI হাব ডেটা লোড করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
      setRefreshingLogs(false);
    }
  };

  useEffect(() => {
    if (isFeatureLoading || !isFeatureEnabled) {
      if (!isFeatureLoading) setLoading(false);
      return;
    }
    fetchData();
  }, [isFeatureEnabled, isFeatureLoading]);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success(language === 'en' ? 'Copied to clipboard!' : 'ক্লিপবোর্ডে কপি হয়েছে!');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSaveIntegration = async () => {
    if (!isPlanActive) {
      toast.error(
        language === 'en'
          ? 'Subscription plan expired. Please renew your plan to configure CAPI tracking.'
          : 'সাবস্ক্রিপশন প্ল্যানের মেয়াদ শেষ। CAPI সেটিংস সংরক্ষণ করতে প্ল্যান রিনিউ করুন।'
      );
      return;
    }

    if (!formData.pixelId || !formData.accessToken) {
      toast.error(language === 'en' ? 'Pixel ID and Access Token are required' : 'Pixel ID এবং Access Token আবশ্যক');
      return;
    }

    setSaving(true);
    setTestResult(null);
    try {
      const token = Cookies.get('access_token');
      const payload: any = {
        pixelId: formData.pixelId.trim(),
        testEventCode: formData.testEventCode.trim()
      };
      
      if (formData.datasetId) payload.datasetId = formData.datasetId.trim();
      if (formData.accessToken !== '********') payload.accessToken = formData.accessToken.trim();

      const res = await fetch(`${API}/capi-hub/integration`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        setIntegration(data);
        toast.success(
          language === 'en' 
            ? 'Connected! Server-side tracking is now active with standard events.' 
            : 'কানেক্টেড! স্ট্যান্ডার্ড ইভেন্টসহ সার্ভার-সাইড ট্র্যাকিং স্বয়ংক্রিয়ভাবে চালু হয়েছে।'
        );
        // Refresh configs and logs to show initialized default events
        fetchData();
      } else {
        const err = await res.json();
        throw new Error(err.message || 'Failed to save');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error saving integration');
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestEvent = async () => {
    if (!isPlanActive) {
      toast.error(
        language === 'en'
          ? 'Subscription plan expired. Server-side test pings are suspended.'
          : 'সাবস্ক্রিপশন প্ল্যানের মেয়াদ শেষ। সার্ভার-সাইড টেস্ট ইভেন্ট পাঠানো স্থগিত।'
      );
      return;
    }

    setTestingPing(true);
    setTestResult(null);
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/capi-hub/test-ping`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          testEventCode: formData.testEventCode.trim() || undefined
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: language === 'en'
            ? `Meta Graph API 200 OK — Test event acknowledged! (Events received: ${data.data?.events_received ?? 1})`
            : `মেটা গ্রাফ API ২০০ ওকে — টেস্ট ইভেন্ট সফলভাবে পৌঁছেছে! (Events received: ${data.data?.events_received ?? 1})`,
          data: data.data
        });
        toast.success(language === 'en' ? 'Meta acknowledged test event!' : 'মেটা টেস্ট ইভেন্ট সফলভাবে গ্রহণ করেছে!');
        // Refresh logs to show the test event log
        fetchData();
      } else {
        setTestResult({
          success: false,
          message: data.message || 'Meta API returned an error. Check your Pixel ID and Access Token.'
        });
        toast.error(language === 'en' ? 'Meta test event failed' : 'মেটা টেস্ট ইভেন্ট ব্যর্থ হয়েছে');
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Network error connecting to Meta'
      });
      toast.error(language === 'en' ? 'Failed to test event' : 'টেস্ট পাঠাতে ব্যর্থ হয়েছে');
    } finally {
      setTestingPing(false);
    }
  };

  const handleToggleEventConfig = async (eventName: string, field: string, value: boolean) => {
    if (!isPlanActive) {
      toast.error(
        language === 'en'
          ? 'Subscription plan expired. Please renew your plan to update event tracking.'
          : 'সাবস্ক্রিপশন প্ল্যানের মেয়াদ শেষ। ইভেন্ট ট্র্যাকিং পরিবর্তন করতে প্ল্যান রিনিউ করুন।'
      );
      return;
    }

    // Optimistic UI update
    setEventConfigs(prev => prev.map(c => c.eventName === eventName ? { ...c, [field]: value } : c));
    if (activeConfigModal?.eventName === eventName) {
      setActiveConfigModal((prev: any) => ({ ...prev, [field]: value }));
    }

    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/capi-hub/event-configs/${eventName}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ [field]: value })
      });

      if (res.ok) {
        const updated = await res.json();
        setEventConfigs(prev => prev.map(c => c.eventName === eventName ? updated : c));
        if (activeConfigModal?.eventName === eventName) {
          setActiveConfigModal(updated);
        }
      } else {
        fetchData(); // Rollback on failure
        toast.error('Failed to update event config');
      }
    } catch {
      fetchData();
      toast.error('Error updating config');
    }
  };

  const handleAddEvent = async () => {
    if (!isPlanActive) {
      toast.error(
        language === 'en'
          ? 'Subscription plan expired. Please renew your plan to add new events.'
          : 'সাবস্ক্রিপশন প্ল্যানের মেয়াদ শেষ। নতুন ইভেন্ট যুক্ত করতে প্ল্যান রিনিউ করুন।'
      );
      return;
    }

    const finalEventName = newEventName === 'Custom' ? customEventInput.trim() : newEventName;
    if (!finalEventName) {
      toast.error(language === 'en' ? 'Event name is required' : 'ইভেন্টের নাম আবশ্যক');
      return;
    }

    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/capi-hub/event-configs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          eventName: finalEventName,
          isEnabled: true,
          sourceOrderCompleted: true,
          sourceInboxAiIntent: true,
          sourceLeadCreated: true,
          sourceWidgetForm: true,
          sourceExternalWebhook: true,
          includeUserData: true,
          includeValue: true,
          includeCurrency: true,
          includeOrderId: true,
          includeContentIds: true
        })
      });

      if (res.ok) {
        toast.success(language === 'en' ? `Added event "${finalEventName}"` : `ইভেন্ট "${finalEventName}" যুক্ত হয়েছে`);
        setShowAddModal(false);
        setCustomEventInput('');
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.message || 'Failed to add event');
      }
    } catch {
      toast.error('Error adding event');
    }
  };

  if (isFeatureLoading || loading) {
    return (
      <div className="max-w-6xl mx-auto p-3 sm:p-6 space-y-4 animate-pulse">
        <div className="h-28 bg-surface/50 border border-white/5 rounded-2xl" />
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="h-64 bg-surface/50 border border-white/5 rounded-2xl" />
          <div className="lg:col-span-2 h-96 bg-surface/50 border border-white/5 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!isFeatureEnabled) {
    return (
      <div className="max-w-6xl mx-auto p-4 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-16 h-16 bg-surface/70 border border-white/10 rounded-2xl flex items-center justify-center mb-5 text-muted-foreground shadow-lg">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold mb-2 text-foreground">
          {language === 'en' ? 'CAPI Hub Feature Locked' : 'CAPI হাব ফিচারটি লক করা'}
        </h2>
        <p className="text-muted-foreground text-center max-w-md text-[13px] mb-6">
          {language === 'en' 
            ? 'Server-Side Conversions API Hub is not included in your active package plan. Upgrade to unlock direct Facebook & Meta server tracking.'
            : 'আপনার সক্রিয় প্যাকেজে CAPI হাব অন্তর্ভুক্ত নেই। মেটা কনভার্সন API পেতে প্ল্যান আপগ্রেড করুন।'}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-2 sm:p-6 pb-24 text-[13px]">
      
      {/* Page Header Banner */}
      <div className="bg-surface/70 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-6 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500 border border-emerald-500/20">
                <Server className="w-5 h-5" />
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-foreground">
                {language === 'en' ? 'Meta Conversions API (CAPI Hub)' : 'মেটা কনভার্সন এপিআই (CAPI হাব)'}
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Server-Side
              </span>
            </div>
            <p className="text-[12px] sm:text-[13px] text-muted-foreground max-w-2xl mt-1 leading-relaxed">
              {language === 'en' 
                ? 'Zero-hassle server-side tracking. Enter your Pixel ID & Access Token — ZiniChat handles all event firing, deduplication, E.164 phone standardization, and SHA-256 data hashing automatically.'
                : 'কোনো হেসেল ছাড়া সার্ভার-সাইড ট্র্যাকিং। শুধু পিক্সেল আইডি এবং অ্যাক্সেস টোকেন দিন — সমস্ত ইভেন্ট, ডিডুপ্লিকেশন, E.164 ফোন স্ট্যান্ডার্ডাইজেশন এবং ডেটা হ্যাশিং অটোমেটিক্যালি হবে।'}
            </p>
          </div>

          {integration?.isActive && (
            <div className="flex items-center gap-2 shrink-0">
              {isPlanActive ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {language === 'en' ? 'Active & Tracking' : 'সক্রিয় ও ট্র্যাকিং চালু'}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  {language === 'en' ? 'Tracking Paused (Plan Expired)' : 'ট্র্যাকিং স্থগিত (মেয়াদ শেষ)'}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Plan Expired Warning Banner */}
      {!isPlanActive && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 sm:p-5 backdrop-blur-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg shadow-rose-950/20">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-rose-500/20 text-rose-400 rounded-xl mt-0.5 border border-rose-500/30 shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-rose-200 flex items-center gap-2">
                {language === 'en' ? '⚠️ Subscription Plan Expired — Server-Side Tracking Suspended' : '⚠️ সাবস্ক্রিপশন প্ল্যানের মেয়াদ শেষ — সার্ভার-সাইড ট্র্যাকিং স্থগিত'}
              </h3>
              <p className="text-xs text-rose-300/80 mt-1 max-w-2xl leading-relaxed">
                {language === 'en'
                  ? 'Your subscription plan has expired. Meta Conversions API (CAPI) real-time event forwarding, deduplication sync, test pings, and webhook triggers are paused. Renew your subscription to restore real-time ROAS tracking.'
                  : 'আপনার সাবস্ক্রিপশন প্ল্যানের মেয়াদ শেষ হয়ে গেছে। মেটা কনভার্শনস এপিআই (CAPI) রিয়েল-টাইম ইভেন্ট ফরোয়ার্ডিং, টেস্ট পিং এবং ওয়েবহুক সিঙ্ক স্থগিত করা হয়েছে। নির্ভুল ROAS ট্র্যাকিং সচল রাখতে প্ল্যান রিনিউ করুন।'}
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push('/dashboard/settings/subscription')}
            className="px-4 py-2.5 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white rounded-xl text-xs font-semibold transition-all shadow-lg shadow-rose-900/40 flex items-center gap-2 shrink-0 active:scale-95"
          >
            <Zap className="w-4 h-4 fill-white" />
            {language === 'en' ? 'Renew Plan Now' : 'প্ল্যান রিনিউ করুন'}
          </button>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Pixel Setup & Webhook (4 cols on desktop) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Pixel Setup Card */}
          <div className="bg-surface/70 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[14px] font-bold flex items-center gap-2 text-foreground">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                {language === 'en' ? 'Meta Pixel & Token' : 'মেটা পিক্সেল ও টোকেন'}
              </h2>
              <span className="text-[11px] text-muted-foreground">
                {language === 'en' ? 'Step 1' : 'ধাপ ১'}
              </span>
            </div>

            <div className="space-y-4">
              {/* 1. AUTO-DISCOVERED PIXELS SECTION */}
              {discoveredData?.isMetaConnected ? (
                <div className="p-3.5 rounded-xl bg-gradient-to-br from-emerald-500/15 via-surface/60 to-brand-green/10 border border-emerald-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      {language === 'en' ? 'Connected Meta Pixels' : 'কানেক্টেড মেটা পিক্সেলসমূহ'}
                    </span>
                    <button
                      type="button"
                      onClick={fetchDiscoveredPixels}
                      disabled={loadingDiscovered}
                      className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                      title={language === 'en' ? 'Refresh Pixels' : 'রিফ্রেশ করুন'}
                    >
                      <RefreshCw className={`w-3 h-3 ${loadingDiscovered ? 'animate-spin' : ''}`} />
                      {language === 'en' ? 'Refresh' : 'রিফ্রেশ'}
                    </button>
                  </div>

                  {loadingDiscovered ? (
                    <div className="py-4 text-center">
                      <RefreshCw className="w-4 h-4 animate-spin text-emerald-400 mx-auto mb-1" />
                      <span className="text-[10px] text-muted-foreground">{language === 'en' ? 'Detecting pixels...' : 'পিক্সেল খোঁজা হচ্ছে...'}</span>
                    </div>
                  ) : discoveredData.pixels.length > 0 ? (
                    <div className="space-y-2.5">
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        {language === 'en'
                          ? 'Select your Pixel to start tracking. ZiniChat automatically uses your connected Facebook OAuth token — zero manual copy-pasting!'
                          : 'আপনার পিক্সেল নির্বাচন করুন। কোনো ম্যানুয়াল টোকেন কপি-পেস্ট ছাড়াই স্বয়ংক্রিয়ভাবে ট্র্যাকিং চালু হয়ে যাবে!'}
                      </p>

                      <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                        {discoveredData.pixels.map((p) => {
                          const isCurrentActive = integration?.pixelId === p.id && integration?.isActive;
                          const isSelected = selectedDiscoveredPixelId === p.id;
                          return (
                            <div
                              key={p.id}
                              onClick={() => setSelectedDiscoveredPixelId(p.id)}
                              className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-emerald-500/20 border-emerald-500 shadow-md shadow-emerald-950/20'
                                  : 'bg-background/60 border-white/5 hover:border-white/20'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                    isSelected ? 'border-emerald-400 bg-emerald-500' : 'border-white/30'
                                  }`}>
                                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-[11px] font-bold text-white truncate">{p.name}</p>
                                    <p className="text-[10px] font-mono text-muted-foreground">ID: {p.id}</p>
                                  </div>
                                </div>
                                {isCurrentActive && (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                                    {language === 'en' ? 'Active' : 'চালু'}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleConnectDiscoveredPixel()}
                        disabled={connectingDiscovered || !selectedDiscoveredPixelId}
                        className="w-full mt-2 py-2.5 bg-brand-green hover:bg-brand-green/90 text-white rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 shadow-md shadow-brand-green/20 disabled:opacity-50"
                      >
                        {connectingDiscovered ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                        )}
                        {language === 'en' ? 'Connect Selected Pixel (1-Click Setup)' : 'নির্বাচিত পিক্সেলটি চালু করুন (১-ক্লিক সংযোগ)'}
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 bg-background/50 rounded-xl border border-white/5 text-center">
                      <p className="text-[11px] text-muted-foreground">
                        {language === 'en'
                          ? 'No Pixels found under your Meta ad accounts. Create a Pixel in Meta Events Manager or enter manually below.'
                          : 'আপনার মেটা অ্যাকাউন্টে কোনো পিক্সেল পাওয়া যায়নি। মেটা ইভেন্টস ম্যানেজার থেকে পিক্সেল তৈরি করুন অথবা নিচে ম্যানুয়ালি লিখুন।'}
                      </p>
                    </div>
                  )}
                </div>
              ) : discoveredData && !discoveredData.isMetaConnected ? (
                <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/30">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-white">
                        {language === 'en' ? 'Meta Account Not Connected' : 'মেটা অ্যাকাউন্ট যুক্ত নেই'}
                      </p>
                      <p className="text-[11px] text-blue-200/80 mt-1 leading-relaxed">
                        {language === 'en'
                          ? 'Connect your Facebook Page or Meta Ad Account to auto-discover your Pixels with 1 click without manual tokens.'
                          : 'পিক্সেল স্বয়ংক্রিয়ভাবে পেতে এবং টোকেনের ঝামেলা ছাড়া ট্র্যাক করতে মেটা অ্যাড অ্যাকাউন্ট বা ফেসবুক পেজ কানেক্ট করুন।'}
                      </p>
                      <a
                        href="/dashboard/settings/meta-ads"
                        className="inline-flex items-center gap-1 mt-2.5 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold transition-colors"
                      >
                        {language === 'en' ? 'Connect Meta Account ↗' : 'মেটা অ্যাকাউন্ট কানেক্ট করুন ↗'}
                      </a>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* 2. ADVANCED / MANUAL SETUP TOGGLE */}
              <div className="border-t border-white/10 pt-3">
                <button
                  type="button"
                  onClick={() => setShowManualForm(!showManualForm)}
                  className="w-full flex items-center justify-between text-[11px] font-semibold text-muted-foreground hover:text-white transition-colors py-1"
                >
                  <span className="flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-brand-orange" />
                    {language === 'en' ? 'Advanced / Manual Token Setup' : 'ঐচ্ছিক ম্যানুয়াল টোকেন ও পিক্সেল সেটআপ'}
                  </span>
                  {showManualForm ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {showManualForm && (
                  <div className="space-y-3 pt-3 animate-in fade-in">
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                        Meta Pixel ID / Dataset ID <span className="text-red-400">*</span>
                      </label>
                      <input 
                        type="text" 
                        value={formData.pixelId}
                        onChange={e => setFormData({ ...formData, pixelId: e.target.value })}
                        className="w-full bg-background/80 border border-white/10 rounded-xl px-3 py-2.5 text-[12px] text-foreground focus:outline-none focus:border-emerald-500/50 transition-colors font-mono"
                        placeholder="e.g. 102938475610293"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                          Conversions API Access Token <span className="text-red-400">*</span>
                        </label>
                        <a 
                          href="https://business.facebook.com/events_manager2" 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-[10px] text-emerald-400 hover:underline flex items-center gap-0.5"
                        >
                          Events Manager ↗
                        </a>
                      </div>
                      <input 
                        type="password" 
                        value={formData.accessToken}
                        onChange={e => setFormData({ ...formData, accessToken: e.target.value })}
                        className="w-full bg-background/80 border border-white/10 rounded-xl px-3 py-2.5 text-[12px] text-foreground focus:outline-none focus:border-emerald-500/50 transition-colors font-mono"
                        placeholder="EAA..."
                      />
                    </div>

                    <button 
                      type="button"
                      onClick={handleSaveIntegration}
                      disabled={saving}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[11px] font-bold transition-all flex justify-center items-center gap-1.5 shadow-md disabled:opacity-50"
                    >
                      {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      {language === 'en' ? 'Save Manual Credentials' : 'ম্যানুয়াল তথ্য সংরক্ষণ করুন'}
                    </button>
                  </div>
                )}
              </div>

              {/* 3. TEST EVENT CODE (Optional) & TEST PING */}
              <div className="pt-2 border-t border-white/10 space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                    Test Event Code <span className="text-[10px] text-muted-foreground font-normal">({language === 'en' ? 'Optional' : 'ঐচ্ছিক'})</span>
                  </label>
                  <input 
                    type="text" 
                    value={formData.testEventCode}
                    onChange={e => setFormData({ ...formData, testEventCode: e.target.value })}
                    className="w-full bg-background/80 border border-white/10 rounded-xl px-3 py-2 text-[12px] text-foreground focus:outline-none focus:border-emerald-500/50 transition-colors font-mono uppercase"
                    placeholder="e.g. TEST12345"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {language === 'en'
                      ? 'Found in Events Manager > Test Events tab to view server hits live in Meta.'
                      : 'মেটাতে সরাসরি রিয়েলটাইম দেখতে Events Manager > Test Events ট্যাব থেকে দিন।'}
                  </p>
                </div>

                {integration && (
                  <button 
                    type="button"
                    onClick={handleSendTestEvent}
                    disabled={testingPing}
                    className="w-full py-2 bg-white/5 hover:bg-white/10 text-foreground border border-white/10 rounded-xl text-[12px] font-semibold transition-all flex justify-center items-center gap-2 disabled:opacity-50"
                  >
                    {testingPing ? <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" /> : <Zap className="w-4 h-4 text-emerald-400" />}
                    {language === 'en' ? 'Send 1-Click Test Ping to Meta' : 'মেটাতে ১-ক্লিক টেস্ট ইভেন্ট পাঠান'}
                  </button>
                )}
              </div>

              {/* Real-time Test Ping Feedback Alert */}
              {testResult && (
                <div className={`p-3 rounded-xl border text-[11px] transition-all animate-in fade-in ${
                  testResult.success 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                    : 'bg-red-500/10 border-red-500/30 text-red-300'
                }`}>
                  <div className="flex items-start gap-2">
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="font-semibold">{testResult.message}</p>
                      {testResult.data?.fbtrace_id && (
                        <p className="text-[10px] opacity-75 font-mono mt-1">FBTrace: {testResult.data.fbtrace_id}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* External Webhook Card */}
          {integration && (
            <div className="bg-surface/70 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3.5">
              <div className="flex items-center justify-between">
                <h2 className="text-[14px] font-bold flex items-center gap-2 text-foreground">
                  <Globe className="w-4 h-4 text-amber-500" />
                  {language === 'en' ? 'Custom Webhook API' : 'কাস্টম ওয়েবহুক এপিআই'}
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                  External
                </span>
              </div>
              
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {language === 'en' 
                  ? 'Send custom events from your website or funnel into ZiniChat CAPI Hub via HTTP POST.'
                  : 'আপনার ওয়েবসাইট বা কাস্টম ফানেল থেকে সরাসরি HTTP POST দিয়ে ইভেন্ট পাঠাতে এই URL ব্যবহার করুন।'}
              </p>

              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase">Webhook Endpoint URL</span>
                    <button 
                      onClick={() => handleCopy(`${API}/capi-hub/webhook/${integration.webhookToken}`, 'webhook')}
                      className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold"
                    >
                      {copiedField === 'webhook' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copiedField === 'webhook' ? (language === 'en' ? 'Copied' : 'কপি হয়েছে') : (language === 'en' ? 'Copy URL' : 'কপি করুন')}
                    </button>
                  </div>
                  <div className="bg-background/90 border border-white/10 rounded-xl p-2.5 text-[11px] break-all font-mono text-emerald-400 select-all">
                    {`${API}/capi-hub/webhook/${integration.webhookToken}`}
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase">Header: x-zinichat-secret</span>
                    {integration.unhashedWebhookSecret && (
                      <button 
                        onClick={() => handleCopy(integration.unhashedWebhookSecret, 'secret')}
                        className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold"
                      >
                        {copiedField === 'secret' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        {copiedField === 'secret' ? (language === 'en' ? 'Copied' : 'কপি হয়েছে') : (language === 'en' ? 'Copy Secret' : 'কপি করুন')}
                      </button>
                    )}
                  </div>
                  <div className="bg-background/90 border border-white/10 rounded-xl p-2.5 text-[11px] break-all font-mono text-muted-foreground">
                    {integration.unhashedWebhookSecret || '•••••••••••••••••••••••• (Securely Stored in DB)'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* EMQ Optimizer Info Card */}
          <div className="bg-surface/50 border border-white/5 rounded-2xl p-4 text-[11px] text-muted-foreground space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>{language === 'en' ? 'High Event Match Quality (EMQ)' : 'উচ্চ ইভেন্ট ম্যাচ কোয়ালিটি (EMQ)'}</span>
            </div>
            <p className="leading-relaxed">
              {language === 'en'
                ? 'ZiniChat automatically standardizes Bangladeshi customer phone numbers to E.164 (+8801...) and applies SHA-256 cryptographic hashing to emails and names before transmitting to Meta, maximizing your ad attribution ROI.'
                : 'ZiniChat প্রতিটি বাংলাদেশি ফোন নম্বর স্বয়ংক্রিয়ভাবে E.164 ফরম্যাটে (+8801...) রূপান্তর করে এবং ইমেইল ও নাম SHA-256 এনক্রিপ্ট করে মেটাতে পাঠায়, যা আপনার মেটা অ্যাডের রিটার্ন ও ম্যাচ কোয়ালিটি সর্বোচ্চ করে।'}
            </p>
          </div>

        </div>

        {/* Right Column: Event Configurations & Event Logs (8 cols on desktop) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Event Configurations Section */}
          <div className="bg-surface/70 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 sm:p-5 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 bg-white/[0.02]">
              <div>
                <h2 className="text-[14px] font-bold flex items-center gap-2 text-foreground">
                  <SlidersHorizontal className="w-4 h-4 text-emerald-500" />
                  {language === 'en' ? 'Active Tracking Events' : 'অ্যাক্টিভ ট্র্যাকিং ইভেন্টসমূহ'}
                </h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {language === 'en' 
                    ? 'Automated triggers: Toggle which sources forward each event to Meta Conversions API.'
                    : 'স্বয়ংক্রিয় ট্রিগার: কোন সোর্স থেকে মেটা CAPI-তে ইভেন্ট যাবে তা নির্ধারণ করুন।'}
                </p>
              </div>

              <button 
                onClick={() => setShowAddModal(true)}
                className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                {language === 'en' ? 'Add Event' : 'ইভেন্ট যোগ করুন'}
              </button>
            </div>

            {/* Desktop Table View (lg and above) */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-[12px]">
                <thead className="bg-white/[0.03] text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                  <tr>
                    <th className="p-3.5 pl-5">Event</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-center">Order</th>
                    <th className="p-3.5 text-center">Inbox AI</th>
                    <th className="p-3.5 text-center">Lead</th>
                    <th className="p-3.5 text-center">Widget</th>
                    <th className="p-3.5 text-center">Webhook</th>
                    <th className="p-3.5 text-center pr-5">Payload</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {eventConfigs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-muted-foreground text-[12px]">
                        {language === 'en' 
                          ? 'No events configured yet. Save your Pixel ID to auto-initialize default standard events.' 
                          : 'কোনো ইভেন্ট নেই। পিক্সেল আইডি সেভ করলেই স্বয়ংক্রিয়ভাবে প্রয়োজনীয় ইভেন্টগুলো যুক্ত হয়ে যাবে।'}
                      </td>
                    </tr>
                  ) : eventConfigs.map(config => (
                    <tr key={config.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-3.5 pl-5 font-bold text-foreground">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          <span>{config.eventName}</span>
                        </div>
                      </td>
                      
                      {/* Master Active Toggle */}
                      <td className="p-3.5 text-center">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={config.isEnabled} 
                            onChange={(e) => handleToggleEventConfig(config.eventName, 'isEnabled', e.target.checked)} 
                          />
                          <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                      </td>

                      {/* Source: Order */}
                      <td className="p-3.5 text-center">
                        <input 
                          type="checkbox" 
                          checked={config.sourceOrderCompleted} 
                          onChange={(e) => handleToggleEventConfig(config.eventName, 'sourceOrderCompleted', e.target.checked)} 
                          className="rounded border-white/20 bg-background/80 text-emerald-500 focus:ring-emerald-500/20 cursor-pointer w-4 h-4" 
                        />
                      </td>

                      {/* Source: Inbox AI */}
                      <td className="p-3.5 text-center">
                        <input 
                          type="checkbox" 
                          checked={config.sourceInboxAiIntent} 
                          onChange={(e) => handleToggleEventConfig(config.eventName, 'sourceInboxAiIntent', e.target.checked)} 
                          className="rounded border-white/20 bg-background/80 text-emerald-500 focus:ring-emerald-500/20 cursor-pointer w-4 h-4" 
                        />
                      </td>

                      {/* Source: Lead */}
                      <td className="p-3.5 text-center">
                        <input 
                          type="checkbox" 
                          checked={config.sourceLeadCreated} 
                          onChange={(e) => handleToggleEventConfig(config.eventName, 'sourceLeadCreated', e.target.checked)} 
                          className="rounded border-white/20 bg-background/80 text-emerald-500 focus:ring-emerald-500/20 cursor-pointer w-4 h-4" 
                        />
                      </td>

                      {/* Source: Widget */}
                      <td className="p-3.5 text-center">
                        <input 
                          type="checkbox" 
                          checked={config.sourceWidgetForm} 
                          onChange={(e) => handleToggleEventConfig(config.eventName, 'sourceWidgetForm', e.target.checked)} 
                          className="rounded border-white/20 bg-background/80 text-emerald-500 focus:ring-emerald-500/20 cursor-pointer w-4 h-4" 
                        />
                      </td>

                      {/* Source: Webhook */}
                      <td className="p-3.5 text-center">
                        <input 
                          type="checkbox" 
                          checked={config.sourceExternalWebhook} 
                          onChange={(e) => handleToggleEventConfig(config.eventName, 'sourceExternalWebhook', e.target.checked)} 
                          className="rounded border-white/20 bg-background/80 text-emerald-500 focus:ring-emerald-500/20 cursor-pointer w-4 h-4" 
                        />
                      </td>

                      {/* Payload fields customize button */}
                      <td className="p-3.5 text-center pr-5">
                        <button 
                          onClick={() => setActiveConfigModal(config)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all"
                          title="Configure forwarded data fields"
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile & Tablet Card View (< lg screens) */}
            <div className="lg:hidden p-3 space-y-3">
              {eventConfigs.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-[12px]">
                  {language === 'en' 
                    ? 'No events configured yet. Save your Pixel ID to auto-initialize default standard events.' 
                    : 'কোনো ইভেন্ট নেই। পিক্সেল আইডি সেভ করলেই স্বয়ংক্রিয়ভাবে প্রয়োজনীয় ইভেন্টগুলো যুক্ত হয়ে যাবে।'}
                </div>
              ) : eventConfigs.map(config => (
                <div 
                  key={config.id} 
                  className={`p-3.5 rounded-xl border transition-all ${
                    config.isEnabled 
                      ? 'bg-surface/90 border-white/10 shadow-sm' 
                      : 'bg-white/[0.01] border-white/5 opacity-70'
                  }`}
                >
                  {/* Card Header: Event name & Master Toggle */}
                  <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${config.isEnabled ? 'bg-emerald-400' : 'bg-muted-foreground'}`} />
                      <span className="font-bold text-[13px] text-foreground">{config.eventName}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setActiveConfigModal(config)}
                        className="p-1.5 rounded-lg bg-white/5 text-muted-foreground hover:text-foreground"
                        title="Payload fields"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>

                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={config.isEnabled} 
                          onChange={(e) => handleToggleEventConfig(config.eventName, 'isEnabled', e.target.checked)} 
                        />
                        <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                      </label>
                    </div>
                  </div>

                  {/* Trigger Sources Pill Chips for Touch */}
                  <div className="pt-2.5">
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase mb-1.5">
                      {language === 'en' ? 'Trigger Sources' : 'ট্রিগার সোর্সসমূহ'}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      
                      {/* Order Source Pill */}
                      <button
                        onClick={() => handleToggleEventConfig(config.eventName, 'sourceOrderCompleted', !config.sourceOrderCompleted)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border flex items-center gap-1 transition-all ${
                          config.sourceOrderCompleted 
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' 
                            : 'bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10'
                        }`}
                      >
                        <ShoppingCart className="w-3 h-3" />
                        <span>Order</span>
                      </button>

                      {/* Inbox AI Source Pill */}
                      <button
                        onClick={() => handleToggleEventConfig(config.eventName, 'sourceInboxAiIntent', !config.sourceInboxAiIntent)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border flex items-center gap-1 transition-all ${
                          config.sourceInboxAiIntent 
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' 
                            : 'bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10'
                        }`}
                      >
                        <Bot className="w-3 h-3" />
                        <span>Inbox AI</span>
                      </button>

                      {/* Lead Source Pill */}
                      <button
                        onClick={() => handleToggleEventConfig(config.eventName, 'sourceLeadCreated', !config.sourceLeadCreated)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border flex items-center gap-1 transition-all ${
                          config.sourceLeadCreated 
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' 
                            : 'bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10'
                        }`}
                      >
                        <UserCheck className="w-3 h-3" />
                        <span>Lead</span>
                      </button>

                      {/* Widget Source Pill */}
                      <button
                        onClick={() => handleToggleEventConfig(config.eventName, 'sourceWidgetForm', !config.sourceWidgetForm)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border flex items-center gap-1 transition-all ${
                          config.sourceWidgetForm 
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' 
                            : 'bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10'
                        }`}
                      >
                        <LayoutGrid className="w-3 h-3" />
                        <span>Widget</span>
                      </button>

                      {/* Webhook Source Pill */}
                      <button
                        onClick={() => handleToggleEventConfig(config.eventName, 'sourceExternalWebhook', !config.sourceExternalWebhook)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border flex items-center gap-1 transition-all ${
                          config.sourceExternalWebhook 
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' 
                            : 'bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10'
                        }`}
                      >
                        <Globe className="w-3 h-3" />
                        <span>Webhook</span>
                      </button>

                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>

          {/* Recent Event Logs Section */}
          <div className="bg-surface/70 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div>
                <h2 className="text-[14px] font-bold flex items-center gap-2 text-foreground">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  {language === 'en' ? 'Recent Conversions Logs' : 'রিয়েলটাইম কনভার্সন লগসমূহ'}
                </h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {language === 'en' ? 'Live server activity dispatched to Meta Graph API' : 'মেটা এপিআই-তে প্রেরিত লাইভ ইভেন্ট অ্যাক্টিভিটি'}
                </p>
              </div>

              <button 
                onClick={() => { setRefreshingLogs(true); fetchData(); }}
                disabled={refreshingLogs}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all flex items-center gap-1 text-[11px] disabled:opacity-50"
                title="Refresh logs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshingLogs ? 'animate-spin text-emerald-400' : ''}`} />
                <span className="hidden sm:inline">{language === 'en' ? 'Refresh' : 'রিফ্রেশ'}</span>
              </button>
            </div>
            
            {/* Desktop Table for Logs (lg and above) */}
            <div className="hidden lg:block overflow-x-auto max-h-[380px]">
              <table className="w-full text-left text-[12px]">
                <thead className="bg-white/[0.03] text-[10px] text-muted-foreground uppercase sticky top-0 z-10 font-bold backdrop-blur-md">
                  <tr>
                    <th className="p-3 pl-5">Timestamp</th>
                    <th className="p-3">Event</th>
                    <th className="p-3">Source</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 pr-5">Meta Response</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground text-[12px]">
                        {language === 'en' ? 'No conversion events fired yet' : 'এখনো কোনো কনভার্সন ইভেন্ট লগ নেই'}
                      </td>
                    </tr>
                  ) : logs.map(log => (
                    <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-3 pl-5 text-muted-foreground whitespace-nowrap text-[11px]">
                        {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        <span className="block text-[10px] opacity-60">
                          {new Date(log.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-foreground">
                        {log.eventName}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-white/5 border border-white/5 text-muted-foreground font-mono">
                          {log.source}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          log.status === 'sent' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          log.status === 'suppressed_duplicate' 
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          log.status === 'pending'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                            'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {log.status === 'sent' ? '200 SENT' : log.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-3 pr-5 text-muted-foreground text-[11px] font-mono max-w-[200px] truncate" title={log.errorMessage || `Code ${log.responseCode}`}>
                        {log.responseCode ? `HTTP ${log.responseCode}` : log.errorMessage || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards for Logs (< lg screens) */}
            <div className="lg:hidden p-3 space-y-2.5 max-h-[420px] overflow-y-auto">
              {logs.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-[12px]">
                  {language === 'en' ? 'No conversion events fired yet' : 'এখনো কোনো কনভার্সন ইভেন্ট লগ নেই'}
                </div>
              ) : logs.map(log => (
                <div key={log.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-[12px] text-foreground">{log.eventName}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      log.status === 'sent' 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      log.status === 'suppressed_duplicate' 
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                      {log.status === 'sent' ? 'SENT' : log.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/5">
                      {log.source}
                    </span>
                    <span className="text-[10px]">
                      {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(log.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  {(log.responseCode || log.errorMessage) && (
                    <div className="pt-1 text-[10px] font-mono text-muted-foreground/80 truncate">
                      {log.responseCode ? `Meta HTTP ${log.responseCode}` : ''} {log.errorMessage ? `(${log.errorMessage})` : ''}
                    </div>
                  )}
                </div>
              ))}
            </div>

          </div>

        </div>

      </div>

      {/* Modal: Add Event */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-surface border border-white/15 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-[15px] flex items-center gap-2 text-foreground">
                <Plus className="w-4 h-4 text-emerald-400" />
                {language === 'en' ? 'Add Meta Standard Event' : 'মেটা স্ট্যান্ডার্ড ইভেন্ট যোগ করুন'}
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                  {language === 'en' ? 'Select Standard Event' : 'স্ট্যান্ডার্ড ইভেন্ট নির্বাচন করুন'}
                </label>
                <select
                  value={newEventName}
                  onChange={e => setNewEventName(e.target.value)}
                  className="w-full bg-background border border-white/15 rounded-xl px-3 py-2 text-[12px] text-foreground focus:outline-none focus:border-emerald-500/50"
                >
                  {STANDARD_EVENT_PRESETS.map(preset => (
                    <option key={preset.name} value={preset.name}>
                      {preset.name} ({language === 'en' ? preset.desc : preset.bnDesc})
                    </option>
                  ))}
                  <option value="Custom">{language === 'en' ? '+ Custom Event Name' : '+ কাস্টম ইভেন্টের নাম'}</option>
                </select>
              </div>

              {newEventName === 'Custom' && (
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                    {language === 'en' ? 'Custom Event Name' : 'কাস্টম ইভেন্টের নাম'}
                  </label>
                  <input 
                    type="text"
                    value={customEventInput}
                    onChange={e => setCustomEventInput(e.target.value)}
                    placeholder="e.g. ScheduleAppointment"
                    className="w-full bg-background border border-white/15 rounded-xl px-3 py-2 text-[12px] text-foreground focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button 
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground rounded-xl text-[12px] font-medium"
              >
                {language === 'en' ? 'Cancel' : 'বাতিল'}
              </button>
              <button 
                onClick={handleAddEvent}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[12px] font-bold shadow-md shadow-emerald-950/20"
              >
                {language === 'en' ? 'Add & Activate' : 'যুক্ত করুন'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Configure Payload Fields */}
      {activeConfigModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-surface border border-white/15 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="font-bold text-[15px] text-foreground flex items-center gap-2">
                  <Info className="w-4 h-4 text-emerald-400" />
                  {activeConfigModal.eventName} — {language === 'en' ? 'Data Payload' : 'ডেটা পেলোড'}
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  {language === 'en' ? 'Configure parameters forwarded to Meta' : 'মেটাতে প্রেরিত প্যারামিটারসমূহ নির্ধারণ করুন'}
                </p>
              </div>
              <button 
                onClick={() => setActiveConfigModal(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 divide-y divide-white/5 text-[12px]">
              
              <div className="flex items-center justify-between pt-2">
                <div>
                  <p className="font-semibold text-foreground">Hashed User Data (Email / Phone)</p>
                  <p className="text-[10px] text-muted-foreground">Auto-hashed with SHA-256 for privacy & matching</p>
                </div>
                <input 
                  type="checkbox"
                  checked={activeConfigModal.includeUserData}
                  onChange={e => handleToggleEventConfig(activeConfigModal.eventName, 'includeUserData', e.target.checked)}
                  className="rounded border-white/20 bg-background text-emerald-500 w-4 h-4 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <p className="font-semibold text-foreground">Order Value / Amount</p>
                  <p className="text-[10px] text-muted-foreground">Pass transaction monetary total</p>
                </div>
                <input 
                  type="checkbox"
                  checked={activeConfigModal.includeValue}
                  onChange={e => handleToggleEventConfig(activeConfigModal.eventName, 'includeValue', e.target.checked)}
                  className="rounded border-white/20 bg-background text-emerald-500 w-4 h-4 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <p className="font-semibold text-foreground">Currency Code (BDT/USD)</p>
                  <p className="text-[10px] text-muted-foreground">ISO Currency standard</p>
                </div>
                <input 
                  type="checkbox"
                  checked={activeConfigModal.includeCurrency}
                  onChange={e => handleToggleEventConfig(activeConfigModal.eventName, 'includeCurrency', e.target.checked)}
                  className="rounded border-white/20 bg-background text-emerald-500 w-4 h-4 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <p className="font-semibold text-foreground">Order ID (Deduplication)</p>
                  <p className="text-[10px] text-muted-foreground">Prevents double-counting with browser pixel</p>
                </div>
                <input 
                  type="checkbox"
                  checked={activeConfigModal.includeOrderId}
                  onChange={e => handleToggleEventConfig(activeConfigModal.eventName, 'includeOrderId', e.target.checked)}
                  className="rounded border-white/20 bg-background text-emerald-500 w-4 h-4 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <p className="font-semibold text-foreground">Product Content IDs</p>
                  <p className="text-[10px] text-muted-foreground">Enables dynamic product retargeting (DPA)</p>
                </div>
                <input 
                  type="checkbox"
                  checked={activeConfigModal.includeContentIds}
                  onChange={e => handleToggleEventConfig(activeConfigModal.eventName, 'includeContentIds', e.target.checked)}
                  className="rounded border-white/20 bg-background text-emerald-500 w-4 h-4 cursor-pointer"
                />
              </div>

            </div>

            <div className="flex justify-end pt-2 border-t border-white/10">
              <button 
                onClick={() => setActiveConfigModal(null)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[12px] font-bold"
              >
                {language === 'en' ? 'Done' : 'সম্পন্ন'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
