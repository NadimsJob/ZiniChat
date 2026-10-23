'use client';

import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { useLanguage } from '@/components/LanguageProvider';
import { FacebookBadgeIcon as Facebook } from '@/components/BrandIcons';
import { 
  DollarSign, TrendingUp, BarChart3, Eye, MousePointer, 
  RefreshCw, Play, Pause, Edit2, Edit, Check, X, ChevronDown, ChevronUp,
  Sliders, Calendar, Share2, ThumbsUp, Trash2, ExternalLink, 
  ShieldCheck, AlertCircle, CheckCircle2, Sparkles, Filter, 
  ArrowUpRight, ArrowDownRight, Layers, Users, Zap, Bot,
  Target, PlusCircle, CheckCircle, HelpCircle, Loader2, Activity,
  Image as ImageIcon, FileText, ArrowRight, Lightbulb, SlidersHorizontal,
  Search, Copy, MessageSquare, ShoppingBag
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface AiAnalysisResult {
  campaignId: string;
  campaignName: string;
  status: string;
  effectiveStatus?: string;
  currentDailyBudget: number;
  currency: string;
  telemetry: {
    impressions: number;
    clicks: number;
    spend: number;
    ctr: number;
    cpc: number;
    reach?: number;
    messagesStarted?: number;
    leads?: number;
    purchases?: number;
    postEngagement?: number;
    linkClicks?: number;
    period: string;
  };
  aiDiagnosis: {
    healthScore: number;
    diagnosis: string;
    diagnosisBn: string;
    recommendedAction: string;
    suggestedScalingPercent: number;
    suggestedTargeting?: any;
    suggestedNewBudget: number;
    rationale: string;
    rationaleBn: string;
    aiResponseQuotaCost: number;
    targetingOptimization?: {
      evaluation: string;
      evaluationBn: string;
      suggestedCountries: string[];
      suggestedAgeMin: number;
      suggestedAgeMax: number;
      suggestedGenders: number[];
      suggestedInterests: string[];
      rationale: string;
      rationaleBn: string;
    };
    creativeOptimization?: {
      evaluation: string;
      evaluationBn: string;
      suggestedHeadlines: string[];
      suggestedPrimaryTexts: string[];
      suggestedCta: string;
      rationale: string;
      rationaleBn: string;
    };
    placementOptimization?: {
      recommendedType: string;
      advice: string;
      adviceBn: string;
    };
    actionableRecommendations?: Array<{
      id: string;
      type: 'SCALE_BUDGET' | 'UPDATE_TARGETING' | 'TOGGLE_STATUS';
      title: string;
      titleBn: string;
      description: string;
      descriptionBn: string;
      payload: any;
    }>;
  };
}

interface AdAccount {
  id: string;
  adAccountId: string;
  adAccountName: string;
  currency: string;
  status: string;
  connectedAt: string;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  effectiveStatus: string;
  objective: string;
  dailyBudget: number | null;
  lifetimeBudget: number | null;
  startTime: string;
  stopTime: string;
  events?: {
    impressions: number;
    clicks: number;
    spend: number;
    cpc: number;
    ctr: number;
    messagesStarted: number;
    leads: number;
    purchases: number;
    postEngagement: number;
    linkClicks: number;
  };
}

interface PagePost {
  id: string;
  message: string;
  createdTime: string;
  fullPicture: string | null;
  permalinkUrl: string | null;
  reactionsCount: number;
  sharesCount: number;
}

interface Insights {
  impressions: number;
  clicks: number;
  spend: number;
  cpc: number;
  ctr: number;
  reach: number;
  purchases: number;
  leads: number;
}

export default function MetaAdsManagerPage() {
  const { language } = useLanguage();
  const router = useRouter();

  // Navigation Tabs: 'campaigns' | 'create' | 'boost' | 'accounts'
  const [activeTab, setActiveTab] = useState<'campaigns' | 'create' | 'boost' | 'accounts'>('campaigns');

  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [balance, setBalance] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [pagePosts, setPagePosts] = useState<PagePost[]>([]);
  const [pageName, setPageName] = useState<string>('');
  const [pageId, setPageId] = useState<string>('');

  // Subscription Plan & AI Quota Synchronization State
  const [quotaData, setQuotaData] = useState<{
    isSubscriptionActive?: boolean;
    aiQuota?: number;
    aiUsed?: number;
    allowByok?: boolean;
  } | null>(null);

  const isPlanActive = quotaData ? quotaData.isSubscriptionActive !== false : true;
  const isAiQuotaExhausted = Boolean(
    quotaData &&
    !quotaData.allowByok &&
    quotaData.aiQuota !== undefined &&
    quotaData.aiQuota > 0 &&
    quotaData.aiUsed !== undefined &&
    quotaData.aiUsed >= quotaData.aiQuota
  );

  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Campaign Filter & Search State
  const [campaignStatusFilter, setCampaignStatusFilter] = useState<'all' | 'active' | 'paused'>('all');
  const [campaignSearchQuery, setCampaignSearchQuery] = useState<string>('');

  // Inline Budget Edit State
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [editBudgetValue, setEditBudgetValue] = useState<string>('');

  // Full Campaign Edit Modal State
  const [editCampaignModalOpen, setEditCampaignModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [editCampName, setEditCampName] = useState('');
  const [editCampStatus, setEditCampStatus] = useState<'ACTIVE' | 'PAUSED'>('ACTIVE');
  const [editCampBudget, setEditCampBudget] = useState<number>(5);
  const [editCampCountries, setEditCampCountries] = useState('BD');
  const [editCampAgeMin, setEditCampAgeMin] = useState<number>(18);
  const [editCampAgeMax, setEditCampAgeMax] = useState<number>(65);
  const [editCampGender, setEditCampGender] = useState<'all' | 'men' | 'women'>('all');
  const [editCampInterests, setEditCampInterests] = useState('');
  const [savingCampaignEdit, setSavingCampaignEdit] = useState(false);

  // AI Audience Re-Targeting Assistant Modal State (Costs 1 AI Credit)
  const [retargetModalOpen, setRetargetModalOpen] = useState(false);
  const [retargetingCampaign, setRetargetingCampaign] = useState<Campaign | null>(null);
  const [retargetProblemDesc, setRetargetProblemDesc] = useState('');
  const [retargetBuyerPersona, setRetargetBuyerPersona] = useState('');
  const [loadingRetargetAi, setLoadingRetargetAi] = useState(false);
  const [retargetAiResult, setRetargetAiResult] = useState<any | null>(null);

  // Audience Targeting Modal State
  const [targetingModalOpen, setTargetingModalOpen] = useState(false);
  const [selectedCampaignForTargeting, setSelectedCampaignForTargeting] = useState<Campaign | null>(null);
  const [targetCountries, setTargetCountries] = useState<string>('BD');
  const [targetAgeMin, setTargetAgeMin] = useState<number>(18);
  const [targetAgeMax, setTargetAgeMax] = useState<number>(65);
  const [targetGender, setTargetGender] = useState<'all' | 'men' | 'women'>('all');

  // AI Diagnostic & Scaling Confirmation State
  const [analyzingAiCampaignId, setAnalyzingAiCampaignId] = useState<string | null>(null);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<AiAnalysisResult | null>(null);
  const [aiAnalysisModalOpen, setAiAnalysisModalOpen] = useState(false);
  const [confirmModalData, setConfirmModalData] = useState<{
    type?: 'SCALE_BUDGET' | 'AI_RECOMMENDATION';
    campaignId: string;
    campaignName: string;
    actionType: string;
    percentage?: number;
    currentBudget?: number;
    targetBudget?: number;
    scalingPercentage?: number;
    newDailyBudget?: number;
    targeting?: any;
    suggestedTargeting?: any;
    status?: 'ACTIVE' | 'PAUSED';
    summaryEn?: string;
    summaryBn?: string;
    quotaCost?: number;
  } | null>(null);
  const [applyingAiAction, setApplyingAiAction] = useState(false);

  // Advanced Custom Campaign Launch State (Ads Manager Full Pipeline)
  const [launchingCustom, setLaunchingCustom] = useState(false);
  const [customCampForm, setCustomCampForm] = useState({
    name: '',
    objective: 'OUTCOME_ENGAGEMENT',
    specialAdCategory: 'NONE',
    advantageBudget: false,
    adSetName: '',
    optimizationGoal: 'POST_ENGAGEMENT',
    dailyBudget: 5,
    durationDays: 7,
    countries: 'BD',
    ageMin: 18,
    ageMax: 65,
    gender: 'all' as 'all' | 'men' | 'women',
    interests: '',
    placementType: 'advantage_plus' as 'advantage_plus' | 'manual',
    placements: ['fb_feed', 'ig_feed', 'fb_stories', 'ig_stories', 'msg_inbox'] as string[],

    // Creative Setup
    creativeSource: 'upload' as 'upload' | 'existing_post',
    selectedPagePostId: '',
    selectedPagePostIds: [] as string[],
    headlines: [''] as string[],
    primaryTexts: [''] as string[],
    headline: '',
    bodyText: '',
    description: '',
    callToAction: 'LEARN_MORE',
    linkUrl: 'https://zinichat.com',
    imageUrl: '',
    trackPixel: false,
    selectedPixelId: '',
  });

  // Discovered Pixels for campaign conversion tracking
  const [discoveredPixels, setDiscoveredPixels] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingPixels, setLoadingPixels] = useState(false);

  // Pre-flight AI Review State (Deducts 1 AI credit under Rule 4)
  const [reviewingWithAi, setReviewingWithAi] = useState(false);
  const [aiReviewResult, setAiReviewResult] = useState<{
    overallScore: number;
    hookScore: number;
    clarityScore: number;
    policyRisk: 'LOW' | 'MEDIUM' | 'HIGH';
    policyFeedback: string;
    policyFeedbackBn: string;
    strengths: string[];
    strengthsBn: string[];
    weaknesses: string[];
    weaknessesBn: string[];
    suggestedVariations: Array<{
      hookType: string;
      headline: string;
      primaryText: string;
      rationale: string;
      rationaleBn: string;
    }>;
    aiResponseQuotaDeducted?: number;
  } | null>(null);
  const [aiReviewModalOpen, setAiReviewModalOpen] = useState(false);

  // Helpers for Multiple Primary Texts and Headlines
  const handleAddPrimaryText = () => {
    if (customCampForm.primaryTexts.length >= 5) {
      toast.error(language === 'en' ? 'Maximum 5 Primary Text options allowed by Meta.' : 'মেটা সর্বোচ্চ ৫টি প্রাইমারি টেক্সট অপশন সমর্থন করে।');
      return;
    }
    setCustomCampForm(prev => ({ ...prev, primaryTexts: [...prev.primaryTexts, ''] }));
  };

  const handleRemovePrimaryText = (index: number) => {
    if (customCampForm.primaryTexts.length <= 1) return;
    setCustomCampForm(prev => ({
      ...prev,
      primaryTexts: prev.primaryTexts.filter((_, i) => i !== index),
    }));
  };

  const handleUpdatePrimaryText = (index: number, val: string) => {
    setCustomCampForm(prev => {
      const updated = [...prev.primaryTexts];
      updated[index] = val;
      return { ...prev, primaryTexts: updated, bodyText: updated[0] || '' };
    });
  };

  const handleAddHeadline = () => {
    if (customCampForm.headlines.length >= 3) {
      toast.error(language === 'en' ? 'Maximum 3 Headline options allowed.' : 'সর্বোচ্চ ৩টি হেডলাইন অপশন দেওয়া যাবে।');
      return;
    }
    setCustomCampForm(prev => ({ ...prev, headlines: [...prev.headlines, ''] }));
  };

  const handleRemoveHeadline = (index: number) => {
    if (customCampForm.headlines.length <= 1) return;
    setCustomCampForm(prev => ({
      ...prev,
      headlines: prev.headlines.filter((_, i) => i !== index),
    }));
  };

  const handleUpdateHeadline = (index: number, val: string) => {
    setCustomCampForm(prev => {
      const updated = [...prev.headlines];
      updated[index] = val;
      return { ...prev, headlines: updated, headline: updated[0] || '' };
    });
  };

  const fetchPixelsForTracking = async (accId?: string) => {
    const targetAccId = accId || selectedAccountId;
    try {
      setLoadingPixels(true);
      const token = Cookies.get('access_token');
      const res = await fetch(`${API_URL}/meta-ads/pixels${targetAccId ? `?adAccountId=${targetAccId}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.pixels) {
          setDiscoveredPixels(data.pixels);
          if (data.pixels.length > 0) {
            setCustomCampForm(prev => {
              if (prev.selectedPixelId) return prev;
              return { ...prev, selectedPixelId: data.pixels[0].id };
            });
          }
        }
      }
    } catch (err) {
      console.warn('Failed to fetch pixels for tracking:', err);
    } finally {
      setLoadingPixels(false);
    }
  };

  const handleReviewWithAi = async () => {
    if (!isPlanActive) {
      toast.error(
        language === 'en'
          ? 'Subscription plan expired. Please renew your plan to review ads with AI.'
          : 'সাবস্ক্রিপশন প্ল্যানের মেয়াদ শেষ। এআই দিয়ে বিজ্ঞাপন বিশ্লেষণ করতে প্ল্যান রিনিউ করুন।'
      );
      return;
    }
    if (isAiQuotaExhausted) {
      toast.error(
        language === 'en'
          ? 'AI Response Quota exhausted. Please upgrade your quota to review ads with AI.'
          : 'এআই রেসপন্স কোটা শেষ হয়েছে। বিজ্ঞাপন বিশ্লেষণ করতে কোটা বৃদ্ধি করুন।'
      );
      return;
    }

    const primaryTexts = customCampForm.primaryTexts.filter(t => t.trim().length > 0);
    const headlines = customCampForm.headlines.filter(h => h.trim().length > 0);

    if (customCampForm.creativeSource === 'upload' && primaryTexts.length === 0) {
      toast.error(language === 'en' ? 'Please enter at least one primary text to analyze' : 'অনুগ্রহ করে বিশ্লেষণের জন্য অন্তত একটি প্রাইমারি টেক্সট লিখুন');
      return;
    }

    setReviewingWithAi(true);
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API_URL}/meta-ads/ai-review-ad`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          adAccountId: selectedAccountId,
          campaignName: customCampForm.name || 'Ad Campaign',
          objective: customCampForm.objective,
          headlines,
          primaryTexts,
          callToAction: customCampForm.callToAction,
          targetAudience: {
            countries: customCampForm.countries,
            ageMin: customCampForm.ageMin,
            ageMax: customCampForm.ageMax,
            gender: customCampForm.gender,
          },
          dailyBudget: customCampForm.dailyBudget,
          destinationUrl: customCampForm.linkUrl,
          creativeSource: customCampForm.creativeSource,
          pagePostId: customCampForm.selectedPagePostId,
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'AI Review failed');
      }

      const data = await res.json();
      setAiReviewResult(data);
      setAiReviewModalOpen(true);
      toast.success(
        language === 'en'
          ? 'AI Ad Analysis complete! (1 AI Credit deducted)'
          : 'বিজ্ঞাপনের এআই বিশ্লেষণ সম্পন্ন হয়েছে! (১টি এআই ক্রেডিট কর্তন করা হয়েছে)'
      );
    } catch (err: any) {
      toast.error(err.message || 'Failed to review ad with AI');
    } finally {
      setReviewingWithAi(false);
    }
  };

  const handleApplyAiVariation = (variation: { headline: string; primaryText: string }) => {
    setCustomCampForm(prev => ({
      ...prev,
      headlines: [variation.headline, ...(prev.headlines.slice(1))],
      primaryTexts: [variation.primaryText, ...(prev.primaryTexts.slice(1))],
      headline: variation.headline,
      bodyText: variation.primaryText,
    }));
    setAiReviewModalOpen(false);
    toast.success(language === 'en' ? 'AI Optimized Copy applied to Primary Text!' : 'এআই অপ্টিমাইজড কপি সফলভাবে প্রাইমারি টেক্সটে যুক্ত হয়েছে!');
  };

  // Boost Post Drawer/Modal State
  const [boostModalOpen, setBoostModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<PagePost | null>(null);
  const [boostBudget, setBoostBudget] = useState<number>(500);
  const [boostDuration, setBoostDuration] = useState<number>(7);
  const [boostCountries, setBoostCountries] = useState<string>('BD');
  const [boostAgeMin, setBoostAgeMin] = useState<number>(18);
  const [boostAgeMax, setBoostAgeMax] = useState<number>(65);
  const [boostGender, setBoostGender] = useState<'all' | 'men' | 'women'>('all');
  const [launchingBoost, setLaunchingBoost] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  useEffect(() => {
    fetchAccounts();

    // Handle OAuth Callback
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code) {
      handleOAuthCallback(code);
    }
  }, []);

  useEffect(() => {
    if (selectedAccountId) {
      fetchAccountData(selectedAccountId);
      if (activeTab === 'boost' || activeTab === 'create') {
        fetchPagePosts(selectedAccountId);
      }
      if (activeTab === 'create') {
        fetchPixelsForTracking(selectedAccountId);
      }
    }
  }, [selectedAccountId, activeTab]);

  const fetchAccounts = async () => {
    try {
      const token = Cookies.get('access_token');
      const headers = { Authorization: `Bearer ${token}` };

      const [accRes, quotasRes] = await Promise.all([
        fetch(`${API_URL}/meta-ads-account/accounts`, { headers }),
        fetch(`${API_URL}/billing/quotas`, { headers }).catch(() => null),
      ]);

      if (quotasRes && quotasRes.ok) {
        const qData = await quotasRes.json();
        setQuotaData({
          isSubscriptionActive: qData.isSubscriptionActive,
          aiQuota: qData.aiQuota,
          aiUsed: qData.aiUsed,
          allowByok: qData.allowByok,
        });
      }

      if (accRes && accRes.ok) {
        const data = await accRes.json();
        setAccounts(data);
        if (data.length > 0 && !selectedAccountId) {
          setSelectedAccountId(data[0].adAccountId);
        }
      }
    } catch (err) {
      console.error('Error fetching accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccountData = async (accId: string) => {
    setLoadingCampaigns(true);
    const token = Cookies.get('access_token');
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const [balRes, campRes, insRes] = await Promise.all([
        fetch(`${API_URL}/meta-ads/balance/${accId}`, { headers }),
        fetch(`${API_URL}/meta-ads/campaigns/${accId}`, { headers }),
        fetch(`${API_URL}/meta-ads/insights/${accId}?datePreset=last_30d`, { headers }),
      ]);

      if (campRes.status === 403 || balRes.status === 403) {
        const errData = await campRes.clone().json().catch(() => ({}));
        if (errData?.message?.toLowerCase()?.includes('subscription') || errData?.message?.toLowerCase()?.includes('expired')) {
          setQuotaData(prev => ({ ...prev, isSubscriptionActive: false }));
        }
      }

      if (balRes.ok) setBalance(await balRes.json());
      if (campRes.ok) setCampaigns(await campRes.json());
      if (insRes.ok) setInsights(await insRes.json());
    } catch (err) {
      console.error('Error fetching account data:', err);
    } finally {
      setLoadingCampaigns(false);
    }
  };

  const fetchPagePosts = async (accId: string) => {
    setLoadingPosts(true);
    const token = Cookies.get('access_token');
    try {
      const res = await fetch(`${API_URL}/meta-ads/page-posts?adAccountId=${accId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPagePosts(data.posts || []);
        setPageName(data.pageName || '');
        setPageId(data.pageId || '');
      } else {
        const errData = await res.json();
        setStatusMsg({ type: 'error', message: errData.message || 'Failed to fetch page posts' });
      }
    } catch (err) {
      console.error('Error fetching page posts:', err);
    } finally {
      setLoadingPosts(false);
    }
  };

  const handleOAuthCallback = async (code: string) => {
    setConnecting(true);
    setStatusMsg(null);
    try {
      const token = Cookies.get('access_token');
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);

      const res = await fetch(`${API_URL}/meta-ads-account/oauth/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ code, redirectUri: cleanUrl })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to connect');
      }

      setStatusMsg({
        type: 'success',
        message: language === 'en' ? 'Meta Ad Account connected successfully.' : 'মেটা অ্যাড অ্যাকাউন্ট সফলভাবে সংযুক্ত হয়েছে।'
      });
      fetchAccounts();
    } catch (err: any) {
      setStatusMsg({ type: 'error', message: err.message || 'Connection failed' });
    } finally {
      setConnecting(false);
    }
  };

  const handleConnect = async () => {
    if (!isPlanActive) {
      toast.error(
        language === 'en'
          ? 'Subscription plan expired. Please renew your plan to connect Meta Ad Accounts.'
          : 'সাবস্ক্রিপশন প্ল্যানের মেয়াদ শেষ। মেটা অ্যাড অ্যাকাউন্ট যুক্ত করতে প্ল্যান রিনিউ করুন।'
      );
      return;
    }

    setConnecting(true);
    try {
      const token = Cookies.get('access_token');
      const redirectUri = window.location.origin + window.location.pathname;
      const res = await fetch(`${API_URL}/meta-ads-account/oauth/url?redirectUri=${encodeURIComponent(redirectUri)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to initiate connection');
      }

      const data = await res.json();
      window.location.href = data.url;
    } catch (err: any) {
      setStatusMsg({ type: 'error', message: err.message || 'Could not connect at this time.' });
      setConnecting(false);
    }
  };

  const handleDisconnect = async (id: string) => {
    if (!confirm(language === 'en' ? 'Are you sure you want to disconnect this account?' : 'আপনি কি এই অ্যাকাউন্টটি ডিসকানেক্ট করতে চান?')) return;
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API_URL}/meta-ads-account/accounts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setAccounts(accounts.filter(a => a.id !== id));
        setStatusMsg({
          type: 'success',
          message: language === 'en' ? 'Account disconnected.' : 'অ্যাকাউন্ট ডিসকানেক্ট করা হয়েছে।'
        });
        if (selectedAccountId === id) {
          const remaining = accounts.filter(a => a.id !== id);
          setSelectedAccountId(remaining[0]?.adAccountId || '');
        }
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', message: err.message || 'Error disconnecting account.' });
    }
  };

  // Determine if a campaign is effectively active based on effectiveStatus or status
  const isCampaignActive = (camp: Campaign) => {
    if (camp.effectiveStatus) {
      return camp.effectiveStatus === 'ACTIVE';
    }
    return camp.status === 'ACTIVE';
  };

  // Toggle Campaign Status (ACTIVE / PAUSED)
  const toggleCampaignStatus = async (campaignId: string, currentStatus: string) => {
    if (!isPlanActive) {
      toast.error(
        language === 'en'
          ? 'Subscription plan expired. Please renew your plan to toggle campaign status.'
          : 'সাবস্ক্রিপশন প্ল্যানের মেয়াদ শেষ। ক্যাম্পেইন স্ট্যাটাস পরিবর্তন করতে প্ল্যান রিনিউ করুন।'
      );
      return;
    }

    const nextStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    setActionLoading(`status-${campaignId}`);
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API_URL}/meta-ads/objects/${campaignId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ adAccountId: selectedAccountId, status: nextStatus })
      });

      if (res.ok) {
        setCampaigns(prev => prev.map(c => c.id === campaignId ? { ...c, status: nextStatus, effectiveStatus: nextStatus } : c));
        setStatusMsg({
          type: 'success',
          message: language === 'en' ? `Campaign set to ${nextStatus}` : `ক্যাম্পেইন ${nextStatus === 'ACTIVE' ? 'সক্রিয়' : 'পজ'} করা হয়েছে`
        });
      } else {
        const err = await res.json();
        throw new Error(err.message || 'Failed to update status');
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', message: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  // Full Campaign Edit Modal Handlers
  const handleOpenEditModal = async (camp: Campaign) => {
    setEditingCampaign(camp);
    setEditCampName(camp.name);
    setEditCampStatus(isCampaignActive(camp) ? 'ACTIVE' : 'PAUSED');
    setEditCampBudget(camp.dailyBudget || 5);
    setEditCampCountries('BD');
    setEditCampAgeMin(18);
    setEditCampAgeMax(65);
    setEditCampGender('all');
    setEditCampInterests('');
    setEditCampaignModalOpen(true);

    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API_URL}/meta-ads/campaigns/${camp.id}/adsets`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const adsets = await res.json();
        if (adsets.length > 0 && adsets[0].targeting) {
          const t = adsets[0].targeting;
          if (t.geo_locations?.countries?.length) {
            setEditCampCountries(t.geo_locations.countries.join(', '));
          }
          if (t.age_min) setEditCampAgeMin(t.age_min);
          if (t.age_max) setEditCampAgeMax(t.age_max);
          if (t.genders?.length === 1) {
            setEditCampGender(t.genders[0] === 1 ? 'men' : 'women');
          } else {
            setEditCampGender('all');
          }
          if (t.flexible_spec?.[0]?.interests) {
            setEditCampInterests(t.flexible_spec[0].interests.map((i: any) => i.name).join(', '));
          }
        }
      }
    } catch {
      // ignore
    }
  };

  const handleSaveCampaignEdit = async () => {
    if (!editingCampaign) return;
    if (!isPlanActive) {
      toast.error(
        language === 'en'
          ? 'Subscription plan expired. Please renew your plan to edit campaigns.'
          : 'সাবস্ক্রিপশন প্ল্যানের মেয়াদ শেষ। ক্যাম্পেইন আপডেট করতে প্ল্যান রিনিউ করুন।'
      );
      return;
    }
    setSavingCampaignEdit(true);
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API_URL}/meta-ads/campaigns/${editingCampaign.id}/edit`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          adAccountId: selectedAccountId,
          name: editCampName,
          status: editCampStatus,
          dailyBudget: editCampBudget,
          targeting: {
            countries: editCampCountries.split(',').map(c => c.trim().toUpperCase()).filter(Boolean),
            ageMin: editCampAgeMin,
            ageMax: editCampAgeMax,
            genders: editCampGender === 'men' ? [1] : editCampGender === 'women' ? [2] : [1, 2],
            interests: editCampInterests.split(',').map(s => s.trim()).filter(Boolean),
          }
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to update campaign');
      }

      toast.success(language === 'en' ? 'Campaign updated successfully on Meta!' : 'মেটায় ক্যাম্পেইন সফলভাবে আপডেট হয়েছে!');
      setEditCampaignModalOpen(false);
      if (selectedAccountId) fetchAccountData(selectedAccountId);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save changes');
    } finally {
      setSavingCampaignEdit(false);
    }
  };

  // AI Audience Re-Targeting Assistant Handlers (Costs 1 AI Credit)
  const handleOpenRetargetModal = (camp: Campaign) => {
    setRetargetingCampaign(camp);
    setRetargetProblemDesc('');
    setRetargetBuyerPersona('');
    setRetargetAiResult(null);
    setRetargetModalOpen(true);
  };

  const handleRunRetargetAi = async () => {
    if (!retargetingCampaign) return;
    if (!isPlanActive) {
      toast.error(
        language === 'en'
          ? 'Subscription plan expired. Please renew your plan to use AI audience retargeting.'
          : 'সাবস্ক্রিপশন প্ল্যানের মেয়াদ শেষ। এআই রিটার্গেটিং ব্যবহার করতে প্ল্যান রিনিউ করুন।'
      );
      return;
    }
    if (isAiQuotaExhausted) {
      toast.error(
        language === 'en'
          ? 'AI Response Quota exhausted. Please upgrade your quota to use AI retargeting.'
          : 'এআই রেসপন্স কোটা শেষ হয়েছে। এআই রিটার্গেটিং ব্যবহার করতে কোটা বৃদ্ধি করুন।'
      );
      return;
    }
    if (!retargetProblemDesc.trim()) {
      toast.error(language === 'en' ? 'Please describe who is messaging vs your target audience.' : 'মেসেজ প্রেরকদের সমস্যা ও আপনার সঠিক ক্রেতাদের বর্ণনা লিখুন।');
      return;
    }
    setLoadingRetargetAi(true);
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API_URL}/meta-ads/campaigns/${retargetingCampaign.id}/ai-retarget`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          adAccountId: selectedAccountId,
          problemDescription: retargetProblemDesc,
          targetBuyerPersona: retargetBuyerPersona || undefined,
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'AI audience re-targeting failed');
      }

      const data = await res.json();
      setRetargetAiResult(data);
      toast.success(language === 'en' ? 'AI Audience Re-targeting generated! 1 AI Response Credit consumed.' : 'এআই নতুন অডিয়েন্স প্রস্তুত করেছে! ১টি এআই ক্রেডিট কর্তন করা হয়েছে।');
    } catch (err: any) {
      toast.error(err.message || 'Error running AI Re-target');
    } finally {
      setLoadingRetargetAi(false);
    }
  };

  const handleApplyRetargetingToCampaign = () => {
    if (!retargetAiResult || !retargetingCampaign) return;
    const t = retargetAiResult.suggestedTargeting;
    setRetargetModalOpen(false);
    setConfirmModalData({
      type: 'AI_RECOMMENDATION',
      campaignId: retargetingCampaign.id,
      campaignName: retargetingCampaign.name,
      actionType: 'UPDATE_TARGETING',
      targeting: {
        countries: t.countries,
        ageMin: t.ageMin,
        ageMax: t.ageMax,
        genders: t.genders,
        interests: t.interests,
      },
      suggestedTargeting: {
        geo_locations: { countries: t.countries },
        age_min: t.ageMin,
        age_max: t.ageMax,
        interests: t.interests,
      },
      quotaCost: 2,
      summaryEn: `Apply AI-Refined Targeting (Age ${t.ageMin}-${t.ageMax}, Interests: ${t.interests?.join(', ') || 'Online shopping'}) to eliminate unqualified messaging traffic?`,
      summaryBn: `অপ্রয়োজনীয় অডিয়েন্স বাদ দিয়ে এআই প্রস্তাবিত নতুন টার্গেটিং (বয়সসীমা ${t.ageMin}-${t.ageMax}) ক্যাম্পেইনে সরাসরি প্রয়োগ করবেন?`
    });
  };

  // Save Inline Daily Budget
  const handleSaveBudget = async (campaignId: string) => {
    if (!isPlanActive) {
      toast.error(
        language === 'en'
          ? 'Subscription plan expired. Please renew your plan to update budgets.'
          : 'সাবস্ক্রিপশন প্ল্যানের মেয়াদ শেষ। বাজেট পরিবর্তন করতে প্ল্যান রিনিউ করুন।'
      );
      return;
    }

    const num = parseFloat(editBudgetValue);
    if (isNaN(num) || num <= 0) return;

    setActionLoading(`budget-${campaignId}`);
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API_URL}/meta-ads/objects/${campaignId}/budget`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ adAccountId: selectedAccountId, newDailyBudget: num })
      });

      if (res.ok) {
        setCampaigns(prev => prev.map(c => c.id === campaignId ? { ...c, dailyBudget: num } : c));
        setEditingBudgetId(null);
        setStatusMsg({
          type: 'success',
          message: language === 'en' ? `Daily budget updated to ${num}` : `দৈনিক বাজেট ${num} এ আপডেট করা হয়েছে`
        });
      } else {
        const err = await res.json();
        throw new Error(err.message || 'Failed to update budget');
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', message: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  // Trigger AI Campaign Telemetry & Optimization Diagnosis (Costs 1 AI Response Quota)
  const handleAnalyzeCampaignWithAi = async (campaignId: string) => {
    if (!isPlanActive) {
      toast.error(
        language === 'en'
          ? 'Subscription plan expired. Please renew your plan to run AI diagnostics.'
          : 'সাবস্ক্রিপশন প্ল্যানের মেয়াদ শেষ। এআই ডায়াগনস্টিক চালাতে প্ল্যান রিনিউ করুন।'
      );
      return;
    }
    if (isAiQuotaExhausted) {
      toast.error(
        language === 'en'
          ? 'AI Response Quota exhausted. Please upgrade your quota to run AI diagnostics.'
          : 'এআই রেসপন্স কোটা শেষ হয়েছে। ডায়াগনস্টিক চালাতে কোটা বৃদ্ধি করুন।'
      );
      return;
    }

    setAnalyzingAiCampaignId(campaignId);
    setStatusMsg(null);
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API_URL}/meta-ads/campaigns/${campaignId}/analyze-ai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ adAccountId: selectedAccountId })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'AI Campaign Analysis failed');
      }

      const data: AiAnalysisResult = await res.json();
      setAiAnalysisResult(data);
      setAiAnalysisModalOpen(true);
      setStatusMsg({
        type: 'success',
        message: language === 'en'
          ? 'AI Diagnostics completed! 1 AI Response Quota consumed.'
          : 'এআই অ্যানালাইসিস সম্পন্ন হয়েছে! ১টি এআই রেসপন্স কোটা ব্যবহৃত হয়েছে।'
      });
    } catch (err: any) {
      setStatusMsg({ type: 'error', message: err.message });
    } finally {
      setAnalyzingAiCampaignId(null);
    }
  };

  // Open 2-Step Confirmation Modal Before Applying Scaling / Target Adjustments
  const promptConfirmScale = (campaign: Campaign, percentage: number) => {
    if (!isPlanActive) {
      toast.error(
        language === 'en'
          ? 'Subscription plan expired. Please renew your plan to scale ad budgets.'
          : 'সাবস্ক্রিপশন প্ল্যানের মেয়াদ শেষ। বাজেট স্কেল করতে প্ল্যান রিনিউ করুন।'
      );
      return;
    }

    const isUp = percentage > 0;
    const current = campaign.dailyBudget || 0;
    const target = current > 0 ? Math.round(current * (1 + percentage / 100)) : 10;
    setConfirmModalData({
      type: 'SCALE_BUDGET',
      campaignId: campaign.id,
      campaignName: campaign.name,
      actionType: 'SCALE_BUDGET',
      percentage,
      scalingPercentage: percentage,
      currentBudget: current,
      targetBudget: target,
      newDailyBudget: target,
      quotaCost: 2,
      summaryEn: `Are you sure you want to scale the daily budget by ${isUp ? '+' : ''}${percentage}%? This will recalculate delivery bidding and cost 2 AI Response Quota credits to execute optimization.`,
      summaryBn: `আপনি কি নিশ্চিত যে দৈনিক বাজেট ${isUp ? '+' : ''}${percentage}% পরিবর্তন করতে চান? মেটাতে এটি অটোমেটিকভাবে অ্যাডজাস্ট হবে এবং এই অ্যাকশনে ২টা AI Response কোটা কর্তন করা হবে।`
    });
  };

  // Confirm & Apply AI-Recommended or Scaled Action (Costs 2 AI Response Quota)
  const handleApplyConfirmedAction = async () => {
    if (!confirmModalData) return;
    if (!isPlanActive) {
      toast.error(
        language === 'en'
          ? 'Subscription plan expired. Please renew your plan to apply changes.'
          : 'সাবস্ক্রিপশন প্ল্যানের মেয়াদ শেষ। পরিবর্তন প্রয়োগ করতে প্ল্যান রিনিউ করুন।'
      );
      return;
    }
    if (isAiQuotaExhausted) {
      toast.error(
        language === 'en'
          ? 'AI Response Quota exhausted. Please upgrade your quota to apply AI recommendations.'
          : 'এআই রেসপন্স কোটা শেষ হয়েছে। এআই সুপারিশ প্রয়োগ করতে কোটা বৃদ্ধি করুন।'
      );
      return;
    }

    setApplyingAiAction(true);
    try {
      const token = Cookies.get('access_token');
      let actionType = confirmModalData.actionType;
      if (actionType === 'SCALE_BUDGET_UP' || actionType === 'SCALE_BUDGET_DOWN') {
        actionType = 'SCALE_BUDGET';
      } else if (actionType === 'EXPAND_AUDIENCE') {
        actionType = 'UPDATE_TARGETING';
      } else if (actionType === 'PAUSE_UNDERPERFORMING') {
        actionType = 'TOGGLE_STATUS';
      }

      const res = await fetch(`${API_URL}/meta-ads/campaigns/apply-ai-recommendation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          adAccountId: selectedAccountId,
          campaignId: confirmModalData.campaignId,
          actionType,
          percentage: confirmModalData.percentage || confirmModalData.scalingPercentage,
          newDailyBudget: confirmModalData.newDailyBudget || confirmModalData.targetBudget,
          targeting: confirmModalData.targeting || confirmModalData.suggestedTargeting,
          status: confirmModalData.status || (confirmModalData.actionType === 'PAUSE_UNDERPERFORMING' ? 'PAUSED' : undefined),
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to apply recommendation');
      }

      setConfirmModalData(null);
      setAiAnalysisModalOpen(false);
      setStatusMsg({
        type: 'success',
        message: language === 'en'
          ? 'AI Optimization applied successfully to Meta! 2 AI Response credits used.'
          : 'এআই অপ্টিমাইজেশন সফলভাবে মেটাতে অ্যাপ্লাই করা হয়েছে! ২টা AI Response কোটা ব্যবহৃত হয়েছে।'
      });
      fetchAccountData(selectedAccountId);
    } catch (err: any) {
      setStatusMsg({ type: 'error', message: err.message });
    } finally {
      setApplyingAiAction(false);
    }
  };

  // Advanced Custom Campaign Launch Handler (Ads Manager Full Pipeline)
  const handleLaunchCustomCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPlanActive) {
      toast.error(
        language === 'en'
          ? 'Subscription plan expired. Please renew your plan to launch campaigns.'
          : 'সাবস্ক্রিপশন প্ল্যানের মেয়াদ শেষ। ক্যাম্পেইন তৈরি করতে প্ল্যান রিনিউ করুন।'
      );
      return;
    }

    setLaunchingCustom(true);
    setStatusMsg(null);

    const genders = customCampForm.gender === 'men' ? [1] : customCampForm.gender === 'women' ? [2] : [1, 2];
    const countries = customCampForm.countries.split(',').map(c => c.trim().toUpperCase()).filter(Boolean);
    const validHeadlines = customCampForm.headlines.filter(h => h.trim().length > 0);
    const validPrimaryTexts = customCampForm.primaryTexts.filter(t => t.trim().length > 0);

    const selectedPosts = customCampForm.selectedPagePostIds.length > 0
      ? customCampForm.selectedPagePostIds
      : (customCampForm.selectedPagePostId ? [customCampForm.selectedPagePostId] : []);

    if (customCampForm.creativeSource === 'existing_post' && selectedPosts.length === 0) {
      toast.error(language === 'en' ? 'Please select at least one Facebook Page post to boost.' : 'অনুগ্রহ করে বুস্ট করতে অন্তত একটি ফেসবুক পেইজ পোস্ট নির্বাচন করুন।');
      setLaunchingCustom(false);
      return;
    }

    if (customCampForm.creativeSource === 'upload' && validPrimaryTexts.length === 0) {
      toast.error(language === 'en' ? 'Primary text (ad copy) is required.' : 'বিজ্ঞাপনের মূল বিবরণ (প্রাইমারি টেক্সট) আবশ্যক।');
      setLaunchingCustom(false);
      return;
    }

    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API_URL}/meta-ads/launch-custom-campaign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          adAccountId: selectedAccountId,
          facebookPageId: pageId,
          name: customCampForm.name,
          objective: customCampForm.objective,
          dailyBudget: Number(customCampForm.dailyBudget),
          durationDays: Number(customCampForm.durationDays),
          headline: validHeadlines[0] || customCampForm.name,
          headlines: validHeadlines,
          bodyText: validPrimaryTexts[0] || '',
          primaryTexts: validPrimaryTexts,
          description: customCampForm.description || undefined,
          callToAction: customCampForm.callToAction,
          linkUrl: customCampForm.linkUrl,
          imageUrl: customCampForm.imageUrl || undefined,
          creativeSource: customCampForm.creativeSource,
          pagePostId: selectedPosts[0] || undefined,
          pagePostIds: selectedPosts,
          targeting: {
            countries,
            ageMin: Number(customCampForm.ageMin),
            ageMax: Number(customCampForm.ageMax),
            genders,
            interests: customCampForm.interests ? customCampForm.interests.split(',').map(s => s.trim()).filter(Boolean) : undefined,
          },
          placements: customCampForm.placementType === 'manual' ? customCampForm.placements : undefined,
          pixelId: customCampForm.trackPixel ? customCampForm.selectedPixelId : undefined,
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to launch custom campaign');
      }

      toast.success(
        language === 'en'
          ? 'Campaign successfully launched to Meta Ads Manager!'
          : 'কাস্টম ক্যাম্পেইন সফলভাবে মেটা অ্যাড ম্যানেজারে চালু করা হয়েছে!'
      );
      setStatusMsg({
        type: 'success',
        message: language === 'en'
          ? 'Campaign successfully launched to Meta Ads Manager!'
          : 'কাস্টম ক্যাম্পেইন সফলভাবে মেটা অ্যাড ম্যানেজারে চালু করা হয়েছে!'
      });
      setActiveTab('campaigns');
      fetchAccountData(selectedAccountId);
    } catch (err: any) {
      toast.error(err.message);
      setStatusMsg({ type: 'error', message: err.message });
    } finally {
      setLaunchingCustom(false);
    }
  };

  // Open Boost Modal for a Post
  const handleOpenBoostModal = (post: PagePost) => {
    setSelectedPost(post);
    setBoostBudget(balance?.currency === 'BDT' ? 500 : 5);
    setBoostDuration(7);
    setBoostCountries('BD');
    setBoostAgeMin(18);
    setBoostAgeMax(65);
    setBoostGender('all');
    setBoostModalOpen(true);
  };

  // Launch Boost Ad for Page Post
  const handleLaunchBoost = async () => {
    if (!selectedPost) return;
    if (!isPlanActive) {
      toast.error(
        language === 'en'
          ? 'Subscription plan expired. Please renew your plan to boost posts.'
          : 'সাবস্ক্রিপশন প্ল্যানের মেয়াদ শেষ। পোস্ট বুস্ট করতে প্ল্যান রিনিউ করুন।'
      );
      return;
    }

    setLaunchingBoost(true);
    setStatusMsg(null);

    const genders = boostGender === 'men' ? [1] : boostGender === 'women' ? [2] : [1, 2];
    const countries = boostCountries.split(',').map(c => c.trim().toUpperCase()).filter(Boolean);

    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API_URL}/meta-ads/boost-post`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          adAccountId: selectedAccountId,
          pagePostId: selectedPost.id,
          pageId: pageId,
          dailyBudget: boostBudget,
          durationDays: boostDuration,
          campaignName: `Boost: ${selectedPost.message.slice(0, 30) || 'Post'}`,
          targeting: {
            countries,
            ageMin: boostAgeMin,
            ageMax: boostAgeMax,
            genders,
          }
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to launch ad');
      }

      setBoostModalOpen(false);
      setStatusMsg({
        type: 'success',
        message: language === 'en'
          ? 'Post boosted successfully! The ad is now active on Facebook.'
          : 'পোস্টটি সফলভাবে বুস্ট করা হয়েছে! বিজ্ঞাপনটি এখন ফেসবুকে সক্রিয়।'
      });
      setActiveTab('campaigns');
      fetchAccountData(selectedAccountId);
    } catch (err: any) {
      setStatusMsg({ type: 'error', message: err.message });
    } finally {
      setLaunchingBoost(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[450px]">
        <div className="w-8 h-8 border-2 border-brand-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currencySymbol = balance?.currency === 'BDT' ? '৳' : balance?.currency === 'USD' ? '$' : balance?.currency || '';

  const filteredCampaigns = campaigns.filter(c => {
    const q = campaignSearchQuery.trim().toLowerCase();
    const matchesSearch = !q || 
      (c.name && c.name.toLowerCase().includes(q)) || 
      (c.id && c.id.toLowerCase().includes(q));
    const active = isCampaignActive(c);
    if (campaignStatusFilter === 'active') return matchesSearch && active;
    if (campaignStatusFilter === 'paused') return matchesSearch && !active;
    return matchesSearch;
  });

  return (
    <div className="space-y-6 pb-24">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Facebook className="w-6 h-6 text-brand-green" />
            {language === 'en' ? 'Meta Ads Manager' : 'মেটা অ্যাডস ম্যানেজার'}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {language === 'en'
              ? 'Scale live campaigns, update daily pricing, and boost Facebook Page posts in 1 click.'
              : 'চলমান ক্যাম্পেইন স্কেল করুন, দৈনিক বাজেট পরিবর্তন করুন এবং ফেসবুক পেজের পোস্ট ১-ক্লিকে বুস্ট করুন।'}
          </p>
        </div>

        {/* Top Controls: Account Selector & Connect CTA */}
        <div className="flex flex-wrap items-center gap-2.5">
          {accounts.length > 0 && (
            <div className="relative">
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="bg-white dark:bg-surface/80 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white text-xs rounded-xl px-3 py-2 pr-8 focus:outline-none focus:border-brand-green appearance-none cursor-pointer shadow-xs"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.adAccountId} className="bg-white dark:bg-slate-900 text-zinc-900 dark:text-white">
                    {acc.adAccountName || 'Ad Account'} ({acc.adAccountId})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}

          <button
            onClick={() => {
              if (selectedAccountId) fetchAccountData(selectedAccountId);
              if (activeTab === 'boost' && selectedAccountId) fetchPagePosts(selectedAccountId);
            }}
            disabled={loadingCampaigns || loadingPosts}
            className="p-2 bg-white dark:bg-surface/80 hover:bg-zinc-100 dark:hover:bg-surface border border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-xs"
            title={language === 'en' ? 'Refresh Telemetry' : 'রিফ্রেশ করুন'}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingCampaigns || loadingPosts ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleConnect}
            disabled={connecting}
            className="px-3.5 py-2 bg-[#1877F2] hover:bg-[#1877F2]/90 text-white rounded-xl font-medium text-xs transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            <Facebook className="w-3.5 h-3.5" />
            {connecting
              ? (language === 'en' ? 'Connecting...' : 'কানেক্ট হচ্ছে...')
              : (language === 'en' ? 'Connect Account' : 'অ্যাকাউন্ট কানেক্ট')}
          </button>
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
                {language === 'en' ? '⚠️ Subscription Plan Expired — Meta Ads Locked' : '⚠️ সাবস্ক্রিপশন প্ল্যানের মেয়াদ শেষ — মেটা অ্যাডস লকড'}
              </h3>
              <p className="text-xs text-rose-300/80 mt-1 max-w-2xl leading-relaxed">
                {language === 'en'
                  ? 'Your subscription plan has expired. Real-time telemetry sync, budget changes, status toggles, AI diagnostics, and ad creation are locked. Renew or reactivate your subscription to unlock all Meta Ads controls.'
                  : 'আপনার সাবস্ক্রিপশন প্ল্যানের মেয়াদ শেষ হয়ে গেছে। রিয়েল-টাইম টেলিমেট্রি সিঙ্ক, বাজেট পরিবর্তন, স্ট্যাটাস পরিবর্তন, এআই ডায়াগনস্টিক এবং নতুন বিজ্ঞাপন তৈরি লক করা হয়েছে। মেটা অ্যাডসের সকল সুবিধা পেতে এখনই প্ল্যান রিনিউ করুন।'}
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

      {/* AI Quota Exhausted Warning Banner */}
      {isPlanActive && isAiQuotaExhausted && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 sm:p-5 backdrop-blur-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg shadow-amber-950/20">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl mt-0.5 border border-amber-500/30 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-amber-200 flex items-center gap-2">
                {language === 'en' ? '⚡ AI Response Quota Exhausted' : '⚡ এআই রেসপন্স কোটা শেষ'}
              </h3>
              <p className="text-xs text-amber-300/80 mt-1 max-w-2xl leading-relaxed">
                {language === 'en'
                  ? 'You have consumed 100% of your AI response units for this billing period. AI Diagnostics, Copy Optimization, and Audience Retargeting are temporarily paused until your next cycle or add-on upgrade.'
                  : 'আপনার চলতি বিলিং সাইকেলের এআই রেসপন্স কোটা সম্পূর্ণ শেষ হয়েছে। পরবর্তী সাইকেল বা অ্যাড-অন বৃদ্ধির আগ পর্যন্ত এআই ডায়াগনস্টিক, কপি অপ্টিমাইজেশন ও অডিয়েন্স রিটার্গেটিং সাময়িকভাবে স্থগিত থাকবে।'}
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push('/dashboard/settings/subscription')}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white rounded-xl text-xs font-semibold transition-all shadow-lg shadow-amber-900/40 flex items-center gap-2 shrink-0 active:scale-95"
          >
            <Sparkles className="w-4 h-4 fill-white" />
            {language === 'en' ? 'Upgrade AI Quota' : 'এআই কোটা বৃদ্ধি করুন'}
          </button>
        </div>
      )}

      {/* Status Alert Banner */}
      {statusMsg && (
        <div className={`p-3.5 rounded-xl text-xs flex items-center justify-between gap-3 ${
          statusMsg.type === 'success' 
            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' 
            : 'bg-red-500/10 border border-red-500/20 text-red-400'
        }`}>
          <div className="flex items-center gap-2">
            {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{statusMsg.message}</span>
          </div>
          <button onClick={() => setStatusMsg(null)} className="opacity-70 hover:opacity-100 p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Account Balance & Telemetry Summary Cards */}
      {selectedAccountId && balance && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white dark:bg-surface/70 backdrop-blur-xl border border-zinc-200 dark:border-white/10 rounded-xl p-3.5 sm:p-4 shadow-sm">
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mb-1">
              {language === 'en' ? 'Account Balance' : 'অ্যাকাউন্ট ব্যালেন্স'}
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white">
                {currencySymbol} {balance.balance?.toFixed(2) || '0.00'}
              </span>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase">{balance.currency}</span>
            </div>
          </div>

          <div className="bg-white dark:bg-surface/70 backdrop-blur-xl border border-zinc-200 dark:border-white/10 rounded-xl p-3.5 sm:p-4 shadow-sm">
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mb-1">
              {language === 'en' ? 'Total Spent (30d)' : 'গত ৩০ দিনের খরচ'}
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg sm:text-xl font-bold text-brand-orange">
                {currencySymbol} {insights?.spend?.toFixed(2) || '0.00'}
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-surface/70 backdrop-blur-xl border border-zinc-200 dark:border-white/10 rounded-xl p-3.5 sm:p-4 shadow-sm">
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mb-1">
              {language === 'en' ? 'Clicks / CTR' : 'ক্লিক / CTR'}
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg sm:text-xl font-bold text-brand-green">
                {insights?.clicks?.toLocaleString() || 0}
              </span>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400">({insights?.ctr?.toFixed(2) || '0.00'}%)</span>
            </div>
          </div>

          <div className="bg-white dark:bg-surface/70 backdrop-blur-xl border border-zinc-200 dark:border-white/10 rounded-xl p-3.5 sm:p-4 shadow-sm">
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mb-1">
              {language === 'en' ? 'Total Impressions' : 'মোট ইমপ্রেশন'}
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white">
                {insights?.impressions?.toLocaleString() || 0}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation Pill Bar */}
      <div 
        className="flex items-center gap-2.5 border-b border-zinc-200 dark:border-white/10 pb-3 overflow-x-auto no-scrollbar touch-pan-x"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('campaigns')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 shrink-0 whitespace-nowrap cursor-pointer ${
            activeTab === 'campaigns'
              ? 'bg-brand-green text-white shadow-lg shadow-brand-green/30 border-2 border-emerald-400/50 ring-2 ring-brand-green/20 scale-[1.02]'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>{language === 'en' ? 'Active Campaigns & Scale Hub' : 'ক্যাম্পেইন ও স্কেলিং হাব'}</span>
          {activeTab === 'campaigns' && (
            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
          )}
          {campaigns.length > 0 && (
            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
              activeTab === 'campaigns' ? 'bg-white/25 text-white' : 'bg-zinc-200 dark:bg-white/10 text-zinc-700 dark:text-zinc-300'
            }`}>
              {campaigns.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('create')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 shrink-0 whitespace-nowrap cursor-pointer ${
            activeTab === 'create'
              ? 'bg-brand-green text-white shadow-lg shadow-brand-green/30 border-2 border-emerald-400/50 ring-2 ring-brand-green/20 scale-[1.02]'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10'
          }`}
        >
          <PlusCircle className={`w-4 h-4 ${activeTab === 'create' ? 'text-white' : 'text-emerald-500'}`} />
          <span>{language === 'en' ? 'Create Campaign (Ads Manager)' : 'নতুন ক্যাম্পেইন (অ্যাড ম্যানেজার)'}</span>
          {activeTab === 'create' && (
            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('boost')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 shrink-0 whitespace-nowrap cursor-pointer ${
            activeTab === 'boost'
              ? 'bg-brand-green text-white shadow-lg shadow-brand-green/30 border-2 border-emerald-400/50 ring-2 ring-brand-green/20 scale-[1.02]'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10'
          }`}
        >
          <Sparkles className={`w-4 h-4 ${activeTab === 'boost' ? 'text-white' : 'text-brand-orange'}`} />
          <span>{language === 'en' ? 'Boost Page Post' : 'পেইজ পোস্ট বুস্টিং'}</span>
          {activeTab === 'boost' && (
            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('accounts')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 shrink-0 whitespace-nowrap cursor-pointer ${
            activeTab === 'accounts'
              ? 'bg-brand-green text-white shadow-lg shadow-brand-green/30 border-2 border-emerald-400/50 ring-2 ring-brand-green/20 scale-[1.02]'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>{language === 'en' ? 'Connected Accounts' : 'সংযুক্ত অ্যাকাউন্টস'}</span>
          {activeTab === 'accounts' && (
            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ACTIVE CAMPAIGNS & SCALE HUB */}
      {/* ========================================================================= */}
      {activeTab === 'campaigns' && (
        <div className="space-y-4">
          {/* Toolbar: Search, Status Filter Pills & Sync Meta Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-surface/70 backdrop-blur-xl border border-zinc-200 dark:border-white/10 p-3.5 rounded-2xl shadow-sm">
            <div className="flex items-center gap-2.5 flex-1 flex-wrap">
              {/* Search Bar */}
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={campaignSearchQuery}
                  onChange={(e) => setCampaignSearchQuery(e.target.value)}
                  placeholder={language === 'en' ? 'Search campaigns by name or ID...' : 'নাম বা আইডি দিয়ে খুঁজুন...'}
                  className="w-full pl-9 pr-7 py-1.5 bg-zinc-50 dark:bg-surface border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white text-xs rounded-xl focus:outline-none focus:border-brand-green placeholder:text-zinc-400"
                />
                {campaignSearchQuery && (
                  <button
                    onClick={() => setCampaignSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-white p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center gap-1 bg-zinc-100 dark:bg-white/5 p-1 rounded-xl border border-zinc-200 dark:border-white/10">
                {(['all', 'active', 'paused'] as const).map((filterKey) => {
                  const count = filterKey === 'all' 
                    ? campaigns.length 
                    : filterKey === 'active' 
                    ? campaigns.filter(isCampaignActive).length 
                    : campaigns.filter(c => !isCampaignActive(c)).length;

                  return (
                    <button
                      key={filterKey}
                      onClick={() => setCampaignStatusFilter(filterKey)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all flex items-center gap-1.5 ${
                        campaignStatusFilter === filterKey
                          ? 'bg-brand-green text-white shadow-sm'
                          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                      }`}
                    >
                      <span>
                        {filterKey === 'all' 
                          ? (language === 'en' ? 'All' : 'সব')
                          : filterKey === 'active'
                          ? (language === 'en' ? 'Active' : 'সক্রিয়')
                          : (language === 'en' ? 'Paused' : 'বন্ধ')}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        campaignStatusFilter === filterKey ? 'bg-white/20 text-white' : 'bg-zinc-200 dark:bg-white/10 text-zinc-600 dark:text-zinc-400'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sync Meta Live Status Refresh Button */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                onClick={() => {
                  if (selectedAccountId) fetchAccountData(selectedAccountId);
                }}
                disabled={loadingCampaigns}
                className="px-3.5 py-1.5 bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 border border-zinc-200 dark:border-white/10 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50"
                title={language === 'en' ? 'Sync status directly from Meta Ads Manager' : 'মেটা অ্যাড ম্যানেজার থেকে স্ট্যাটাস রিফ্রেশ করুন'}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingCampaigns ? 'animate-spin text-brand-green' : ''}`} />
                <span>{language === 'en' ? 'Sync Meta Status' : 'মেটা স্ট্যাটাস সিঙ্ক'}</span>
              </button>
            </div>
          </div>

          {campaigns.length === 0 ? (
            <div className="bg-white dark:bg-surface/70 backdrop-blur-xl border border-zinc-200 dark:border-white/10 rounded-2xl p-8 text-center py-16 shadow-sm">
              <Layers className="w-12 h-12 text-zinc-400 dark:text-zinc-400/40 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-zinc-900 dark:text-white mb-1">
                {language === 'en' ? 'No Campaigns Found' : 'কোনো ক্যাম্পেইন পাওয়া যায়নি'}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto mb-5">
                {language === 'en'
                  ? 'There are no active or draft campaigns in this ad account yet. Boost a Facebook Page post to launch your first ad.'
                  : 'এই অ্যাড অ্যাকাউন্টে এখনো কোনো ক্যাম্পেইন নেই। প্রথম বিজ্ঞাপন চালাতে পেইজ পোস্ট বুস্ট করুন।'}
              </p>
              <button
                onClick={() => setActiveTab('boost')}
                className="px-4 py-2 bg-brand-green hover:bg-brand-green/90 text-white rounded-xl text-xs font-semibold transition-colors inline-flex items-center gap-2 shadow-md shadow-brand-green/20"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {language === 'en' ? 'Boost a Page Post Now' : 'এখনই একটি পোস্ট বুস্ট করুন'}
              </button>
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="bg-white dark:bg-surface/70 backdrop-blur-xl border border-zinc-200 dark:border-white/10 rounded-2xl p-8 text-center py-12 shadow-sm">
              <Filter className="w-10 h-10 text-zinc-400 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-1">
                {language === 'en' ? 'No matching campaigns' : 'ফিল্টারের সাথে মেলে এমন কোনো ক্যাম্পেইন নেই'}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
                {language === 'en' ? 'Try adjusting your search query or status filter.' : 'সার্চ কিওয়ার্ড অথবা স্ট্যাটাস ফিল্টার পরিবর্তন করে দেখুন।'}
              </p>
              <button
                onClick={() => {
                  setCampaignSearchQuery('');
                  setCampaignStatusFilter('all');
                }}
                className="px-3 py-1.5 bg-zinc-100 dark:bg-white/10 hover:bg-zinc-200 dark:hover:bg-white/20 text-zinc-800 dark:text-white rounded-xl text-xs font-medium transition-colors"
              >
                {language === 'en' ? 'Reset Filters' : 'ফিল্টার রিসেট করুন'}
              </button>
            </div>
          ) : (
            <div className="bg-white dark:bg-surface/70 backdrop-blur-xl border border-zinc-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-xl">
              {/* Desktop View Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 dark:bg-white/5 border-b border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4">{language === 'en' ? 'Live Status' : 'লাইভ স্ট্যাটাস'}</th>
                      <th className="py-3 px-4">{language === 'en' ? 'Campaign Details' : 'ক্যাম্পেইনের বিবরণ'}</th>
                      <th className="py-3 px-4">{language === 'en' ? '7-Day Results & Events' : '৭ দিনের ফলাফল ও কনভার্সন'}</th>
                      <th className="py-3 px-4">{language === 'en' ? 'Daily Budget' : 'দৈনিক বাজেট'}</th>
                      <th className="py-3 px-4 text-center">{language === 'en' ? 'Actions & Scale' : 'অ্যাকশন ও স্কেলিং'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-white/5 text-zinc-900 dark:text-white">
                    {filteredCampaigns.map((camp) => {
                      const isActive = isCampaignActive(camp);
                      const isStatusLoading = actionLoading === `status-${camp.id}`;
                      const isBudgetLoading = actionLoading === `budget-${camp.id}`;
                      const isAiAnalyzing = analyzingAiCampaignId === camp.id;

                      return (
                        <tr key={camp.id} className="hover:bg-zinc-50/80 dark:hover:bg-white/[0.02] transition-colors">
                          {/* Tactile Status Toggle Switch with Clear Active/Paused Badge */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2.5">
                              <button
                                type="button"
                                role="switch"
                                aria-checked={isActive}
                                onClick={() => toggleCampaignStatus(camp.id, camp.status)}
                                disabled={isStatusLoading}
                                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                  isActive 
                                    ? 'bg-emerald-600 dark:bg-emerald-500 shadow-md shadow-emerald-500/30 ring-2 ring-emerald-400/20' 
                                    : 'bg-zinc-300 dark:bg-zinc-700 ring-1 ring-zinc-400 dark:ring-zinc-600'
                                } ${isStatusLoading ? 'opacity-50 cursor-wait' : ''}`}
                                title={language === 'en' ? `Click to ${isActive ? 'pause' : 'activate'} campaign on Meta` : `মেটাতে ক্যাম্পেইন ${isActive ? 'বন্ধ' : 'চালু'} করতে ক্লিক করুন`}
                              >
                                <span
                                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                    isActive ? 'translate-x-5' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${
                                isActive 
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' 
                                  : 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border border-zinc-500/30'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500 dark:bg-emerald-400 animate-pulse' : 'bg-zinc-400'}`} />
                                {isActive ? (language === 'en' ? 'Active' : 'সক্রিয়') : (language === 'en' ? 'Paused' : 'বন্ধ')}
                              </span>
                            </div>
                          </td>

                          {/* Campaign Name, ID & Objective */}
                          <td className="py-3 px-4">
                            <div className="font-semibold text-zinc-900 dark:text-white max-w-[240px] truncate" title={camp.name}>
                              {camp.name}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                {camp.objective || 'OUTCOME_ENGAGEMENT'}
                              </span>
                              <div className="flex items-center gap-1 text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                                <span>ID: {camp.id}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(camp.id);
                                    toast.success(language === 'en' ? 'Campaign ID copied!' : 'ক্যাম্পেইন আইডি কপি হয়েছে!');
                                  }}
                                  className="p-0.5 hover:text-zinc-900 dark:hover:text-white rounded"
                                  title="Copy Campaign ID"
                                >
                                  <Copy className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            </div>
                          </td>

                          {/* 7-Day Live Conversion Events & Telemetry */}
                          <td className="py-3 px-4">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {camp.events?.messagesStarted ? (
                                  <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-[10px] font-medium flex items-center gap-1" title="Messages Started">
                                    <MessageSquare className="w-3 h-3" /> {camp.events.messagesStarted} {language === 'en' ? 'msgs' : 'মেসেজ'}
                                  </span>
                                ) : null}
                                {camp.events?.leads ? (
                                  <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 text-[10px] font-medium flex items-center gap-1" title="Leads Generated">
                                    <Users className="w-3 h-3" /> {camp.events.leads} {language === 'en' ? 'leads' : 'লিড'}
                                  </span>
                                ) : null}
                                {camp.events?.purchases ? (
                                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-medium flex items-center gap-1" title="Purchases">
                                    <ShoppingBag className="w-3 h-3" /> {camp.events.purchases} {language === 'en' ? 'sales' : 'বিক্রি'}
                                  </span>
                                ) : null}
                                {camp.events?.linkClicks ? (
                                  <span className="px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 text-[10px] font-medium flex items-center gap-1" title="Link Clicks">
                                    <ExternalLink className="w-3 h-3" /> {camp.events.linkClicks} {language === 'en' ? 'clicks' : 'ক্লিক'}
                                  </span>
                                ) : null}
                              </div>
                              <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                                {camp.events?.spend ? `${language === 'en' ? 'Spend' : 'খরচ'}: ${currencySymbol} ${camp.events.spend}` : null}
                                {camp.events?.impressions ? ` • ${camp.events.impressions.toLocaleString()} imp` : null}
                                {!camp.events?.messagesStarted && !camp.events?.leads && !camp.events?.purchases && !camp.events?.linkClicks && !camp.events?.spend && (
                                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 italic">
                                    {language === 'en' ? 'No recent events' : 'সাম্প্রতিক কোনো ইভেন্ট নেই'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Daily Budget (Inline Editable) */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            {editingBudgetId === camp.id ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-zinc-500 dark:text-zinc-400 text-[11px]">{currencySymbol}</span>
                                <input
                                  type="number"
                                  value={editBudgetValue}
                                  onChange={(e) => setEditBudgetValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveBudget(camp.id);
                                    if (e.key === 'Escape') setEditingBudgetId(null);
                                  }}
                                  className="w-20 px-2 py-1 bg-white dark:bg-surface border border-brand-green text-zinc-900 dark:text-white text-xs rounded-lg focus:outline-none"
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleSaveBudget(camp.id)}
                                  disabled={isBudgetLoading}
                                  className="p-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 rounded"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setEditingBudgetId(null)}
                                  className="p-1 text-zinc-400 hover:bg-zinc-500/10 rounded"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 group">
                                <span className="font-bold text-zinc-900 dark:text-white font-mono">
                                  {camp.dailyBudget ? `${currencySymbol} ${camp.dailyBudget}` : '—'}
                                </span>
                                {camp.dailyBudget && (
                                  <button
                                    onClick={() => {
                                      setEditingBudgetId(camp.id);
                                      setEditBudgetValue(String(camp.dailyBudget));
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-opacity"
                                    title={language === 'en' ? 'Quick edit daily budget' : 'বাজেট পরিবর্তন করুন'}
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Actions: Edit, AI Re-target, AI Diagnose & Scale */}
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              {/* Edit Campaign Button */}
                              <button
                                onClick={() => handleOpenEditModal(camp)}
                                className="px-2.5 py-1 rounded-xl text-[10px] font-semibold bg-zinc-100 dark:bg-white/10 hover:bg-zinc-200 dark:hover:bg-white/15 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-white/10 transition-all flex items-center gap-1"
                                title={language === 'en' ? 'Edit campaign name, budget and audience targeting' : 'ক্যাম্পেইনের নাম, বাজেট ও অডিয়েন্স এডিট করুন'}
                              >
                                <Edit className="w-3 h-3 text-brand-green" />
                                <span>{language === 'en' ? 'Edit' : 'এডিট'}</span>
                              </button>

                              {/* AI Audience Re-targeting Button */}
                              <button
                                onClick={() => handleOpenRetargetModal(camp)}
                                className="px-2.5 py-1 rounded-xl text-[10px] font-semibold bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 transition-all flex items-center gap-1"
                                title={language === 'en' ? 'Fix unqualified leads with AI Re-targeting (Costs 1 AI Credit)' : 'অপ্রয়োজনীয় মেসেজ বন্ধ করতে এআই রি-টার্গেটিং (১টি এআই ক্রেডিট)'}
                              >
                                <Users className="w-3 h-3 text-blue-500" />
                                <span>{language === 'en' ? 'AI Re-target' : 'এআই রি-টার্গেট'}</span>
                                <span className="text-[9px] px-1 py-0.2 bg-blue-500/20 text-blue-600 dark:text-blue-300 rounded font-mono">1 AI</span>
                              </button>

                              {/* AI Telemetry Diagnosis Button */}
                              <button
                                onClick={() => handleAnalyzeCampaignWithAi(camp.id)}
                                disabled={isAiAnalyzing}
                                className="px-2.5 py-1 rounded-xl text-[10px] font-semibold bg-gradient-to-r from-brand-green/20 to-brand-orange/20 hover:from-brand-green/30 hover:to-brand-orange/30 text-zinc-900 dark:text-white border border-brand-green/40 transition-all flex items-center gap-1 shadow-sm disabled:opacity-50"
                                title={language === 'en' ? 'Run AI Analysis & Diagnostics across all dimensions (Costs 1 AI Credit)' : 'এআই দিয়ে সার্বিক ক্যাম্পেইন বিশ্লেষণ (১টি এআই ক্রেডিট)'}
                              >
                                {isAiAnalyzing ? (
                                  <Loader2 className="w-3 h-3 animate-spin text-brand-orange" />
                                ) : (
                                  <Bot className="w-3 h-3 text-brand-orange" />
                                )}
                                <span>{language === 'en' ? 'AI Diagnose' : 'এআই ডায়াগনোস'}</span>
                                <span className="text-[9px] px-1 py-0.2 bg-brand-green/40 text-emerald-700 dark:text-emerald-200 rounded font-mono">1 AI</span>
                              </button>

                              {/* Controlled Scaling Quick Buttons with Confirmation Modal */}
                              {camp.dailyBudget ? (
                                <div className="flex items-center gap-0.5 border-l border-zinc-200 dark:border-white/10 pl-1.5">
                                  <button
                                    onClick={() => promptConfirmScale(camp, 20)}
                                    disabled={actionLoading?.startsWith(`scale-${camp.id}`)}
                                    className="px-1.5 py-1 rounded-lg text-[10px] font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 transition-all flex items-center"
                                    title={language === 'en' ? 'Scale up +20% (Confirmation popup)' : '+২০% স্কেল করুন (পপ-আপ কনফার্মেশন)'}
                                  >
                                    +20%
                                  </button>
                                  <button
                                    onClick={() => promptConfirmScale(camp, 50)}
                                    disabled={actionLoading?.startsWith(`scale-${camp.id}`)}
                                    className="px-1.5 py-1 rounded-lg text-[10px] font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 transition-all flex items-center"
                                    title={language === 'en' ? 'Scale up +50% (Confirmation popup)' : '+৫০% স্কেল করুন (পপ-আপ কনফার্মেশন)'}
                                  >
                                    +50%
                                  </button>
                                  <button
                                    onClick={() => promptConfirmScale(camp, -10)}
                                    disabled={actionLoading?.startsWith(`scale-${camp.id}`)}
                                    className="px-1.5 py-1 rounded-lg text-[10px] font-semibold bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/20 transition-all flex items-center"
                                    title={language === 'en' ? 'Scale down -10% (Confirmation popup)' : '-১০% স্কেল করুন (পপ-আপ কনফার্মেশন)'}
                                  >
                                    -10%
                                  </button>
                                  <button
                                    onClick={() => promptConfirmScale(camp, -20)}
                                    disabled={actionLoading?.startsWith(`scale-${camp.id}`)}
                                    className="px-1.5 py-1 rounded-lg text-[10px] font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 transition-all flex items-center"
                                    title={language === 'en' ? 'Scale down -20% (Confirmation popup)' : '-২০% স্কেল করুন (পপ-আপ কনফার্মেশন)'}
                                  >
                                    -20%
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Native Card View (< 1024px) */}
              <div className="lg:hidden divide-y divide-zinc-200 dark:divide-white/5 p-3 space-y-3">
                {filteredCampaigns.map((camp) => {
                  const isActive = isCampaignActive(camp);
                  const isStatusLoading = actionLoading === `status-${camp.id}`;
                  const isAiAnalyzing = analyzingAiCampaignId === camp.id;

                  return (
                    <div key={camp.id} className="p-3.5 bg-white dark:bg-surface rounded-xl space-y-3 border border-zinc-200 dark:border-white/10 shadow-sm">
                      {/* Top Row: Name, Copy ID & Tactile Switch */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-semibold text-zinc-900 dark:text-white text-xs truncate">{camp.name}</h4>
                          <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-500 dark:text-zinc-400 mt-0.5">
                            <span>ID: {camp.id}</span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(camp.id);
                                toast.success(language === 'en' ? 'ID copied!' : 'আইডি কপি হয়েছে!');
                              }}
                              className="p-0.5 hover:text-zinc-900 dark:hover:text-white"
                            >
                              <Copy className="w-2.5 h-2.5" />
                            </button>
                            <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                              {camp.objective || 'OUTCOME_ENGAGEMENT'}
                            </span>
                          </div>
                        </div>

                        {/* Switch */}
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={isActive}
                            onClick={() => toggleCampaignStatus(camp.id, camp.status)}
                            disabled={isStatusLoading}
                            className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${
                              isActive 
                                ? 'bg-emerald-600 dark:bg-emerald-500 shadow-md shadow-emerald-500/30' 
                                : 'bg-zinc-300 dark:bg-zinc-700'
                            }`}
                          >
                            <span
                              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                                isActive ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                            isActive ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-zinc-500/20 text-zinc-500 dark:text-zinc-400'
                          }`}>
                            {isActive ? (language === 'en' ? '● Active' : '● সক্রিয়') : (language === 'en' ? '⏸ Paused' : '⏸ বন্ধ')}
                          </span>
                        </div>
                      </div>

                      {/* Conversions telemetry chips */}
                      <div className="flex items-center gap-1.5 flex-wrap text-[10px] pt-1 border-t border-zinc-200 dark:border-white/5">
                        {camp.events?.messagesStarted ? (
                          <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1">
                            <MessageSquare className="w-2.5 h-2.5" /> {camp.events.messagesStarted} msgs
                          </span>
                        ) : null}
                        {camp.events?.leads ? (
                          <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 font-medium flex items-center gap-1">
                            <Users className="w-2.5 h-2.5" /> {camp.events.leads} leads
                          </span>
                        ) : null}
                        {camp.events?.purchases ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                            <ShoppingBag className="w-2.5 h-2.5" /> {camp.events.purchases} sales
                          </span>
                        ) : null}
                        {camp.events?.spend ? (
                          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono font-medium">
                            {currencySymbol} {camp.events.spend}
                          </span>
                        ) : null}
                      </div>

                      {/* Daily Budget */}
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-200 dark:border-white/5">
                        <span className="text-zinc-500 dark:text-zinc-400">{language === 'en' ? 'Daily Budget:' : 'দৈনিক বাজেট:'}</span>
                        <span className="font-bold text-zinc-900 dark:text-white font-mono">
                          {camp.dailyBudget ? `${currencySymbol} ${camp.dailyBudget}` : '—'}
                        </span>
                      </div>

                      {/* Actions: Edit & AI Re-target Row */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          onClick={() => handleOpenEditModal(camp)}
                          className="py-1.5 px-2 rounded-xl text-xs font-semibold bg-zinc-100 dark:bg-white/10 hover:bg-zinc-200 dark:hover:bg-white/15 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-white/10 transition-all flex items-center justify-center gap-1"
                        >
                          <Edit className="w-3 h-3 text-brand-green" />
                          <span>{language === 'en' ? 'Edit Campaign' : 'এডিট করুন'}</span>
                        </button>

                        <button
                          onClick={() => handleOpenRetargetModal(camp)}
                          className="py-1.5 px-2 rounded-xl text-xs font-semibold bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 transition-all flex items-center justify-center gap-1"
                        >
                          <Users className="w-3 h-3" />
                          <span>{language === 'en' ? 'AI Re-target' : 'এআই রি-টার্গেট'}</span>
                          <span className="text-[9px] px-1 py-0.2 bg-blue-500/20 rounded font-mono">1 AI</span>
                        </button>
                      </div>

                      {/* AI Diagnostics CTA for Mobile */}
                      <button
                        onClick={() => handleAnalyzeCampaignWithAi(camp.id)}
                        disabled={isAiAnalyzing}
                        className="w-full py-2 px-3 rounded-xl text-xs font-semibold bg-gradient-to-r from-brand-green/20 to-brand-orange/20 hover:from-brand-green/30 text-zinc-900 dark:text-white border border-brand-green/30 transition-all flex items-center justify-center gap-2 shadow-sm"
                      >
                        {isAiAnalyzing ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-orange" />
                        ) : (
                          <Bot className="w-3.5 h-3.5 text-brand-orange" />
                        )}
                        <span>{language === 'en' ? 'AI Comprehensive Diagnosis' : 'এআই ডায়াগনোসিস ও টেলিমেট্রি'}</span>
                        <span className="text-[9px] px-1.5 py-0.5 bg-brand-green/40 text-emerald-800 dark:text-emerald-200 rounded font-mono">1 AI Quota</span>
                      </button>

                      {/* Controlled Scaling for Mobile */}
                      {camp.dailyBudget && (
                        <div className="flex items-center justify-between gap-1 pt-1">
                          <button
                            onClick={() => promptConfirmScale(camp, 20)}
                            className="flex-1 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/20 text-center"
                          >
                            +20%
                          </button>
                          <button
                            onClick={() => promptConfirmScale(camp, 50)}
                            className="flex-1 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/20 text-center"
                          >
                            +50%
                          </button>
                          <button
                            onClick={() => promptConfirmScale(camp, -10)}
                            className="flex-1 py-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 text-[10px] font-bold border border-orange-500/20 text-center"
                          >
                            -10%
                          </button>
                          <button
                            onClick={() => promptConfirmScale(camp, -20)}
                            className="flex-1 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-[10px] font-bold border border-red-500/20 text-center"
                          >
                            -20%
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CREATE CAMPAIGN (ADS MANAGER STYLE) */}
      {/* ========================================================================= */}
      {activeTab === 'create' && (
        <div className="space-y-6 max-w-4xl">
          {/* Header Card */}
          <div className="bg-gradient-to-r from-brand-green/15 via-white dark:via-surface/80 to-brand-orange/15 border border-brand-green/30 rounded-2xl p-5 sm:p-6 backdrop-blur-xl shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-emerald-400" />
                  {language === 'en' ? 'Create Custom Campaign (Native Ads Manager Flow)' : 'অ্যাডভান্সড ক্যাম্পেইন তৈরি করুন (মেটা অ্যাড ম্যানেজার ফ্লো)'}
                </h3>
                <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                  {language === 'en'
                    ? 'Deploy a complete 3-tier Meta advertising structure (Campaign, AdSet with detailed targeting, and Ad Creative with dynamic multi-text options or existing page post) directly to Meta Graph API.'
                    : 'সরাসরি মেটাতে অ্যাডভান্সড ৩-লেভেল ক্যাম্পেইন (ক্যাম্পেইন, টার্গেটেড অ্যাডসেট এবং একাধিক কপি অপশন বা পেইজ পোস্টযুক্ত ক্রিয়েটিভ) চালু করুন।'}
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleLaunchCustomCampaign} className="space-y-6">
            {/* LEVEL 1: CAMPAIGN OBJECTIVE & IDENTITY */}
            <div className="bg-white dark:bg-surface/70 backdrop-blur-xl border border-zinc-200 dark:border-white/10 rounded-2xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Target className="w-4 h-4 text-brand-green" />
                  {language === 'en' ? 'Level 1: Campaign Objective & Identity' : 'লেভেল ১: ক্যাম্পেইনের উদ্দেশ্য ও নাম'}
                </h4>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Meta Campaign Level
                </span>
              </div>

              {/* Objectives Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {[
                  { id: 'OUTCOME_ENGAGEMENT', title: language === 'en' ? 'Engagement' : 'এনগেজমেন্ট', desc: language === 'en' ? 'Messages & post interaction' : 'মেসেজ ও পোস্ট রিয়্যাকশন' },
                  { id: 'OUTCOME_TRAFFIC', title: language === 'en' ? 'Traffic' : 'ট্রাফিক', desc: language === 'en' ? 'Clicks to website or WhatsApp' : 'ওয়েবসাইট বা হোয়াটসঅ্যাপে ভিজিটর' },
                  { id: 'OUTCOME_LEADS', title: language === 'en' ? 'Leads' : 'লিডস', desc: language === 'en' ? 'Instant forms / inbox leads' : 'ইনস্ট্যান্ট ফর্ম বা ইনবক্সে লিড' },
                  { id: 'OUTCOME_SALES', title: language === 'en' ? 'Sales / Purchases' : 'সেলস / কনভার্সন', desc: language === 'en' ? 'High-intent conversions' : 'পণ্য কেনার মতো আগ্রহী গ্রাহক' },
                  { id: 'OUTCOME_AWARENESS', title: language === 'en' ? 'Awareness' : 'অ্যাওয়ারনেস', desc: language === 'en' ? 'Maximum brand reach' : 'সর্বোচ্চ মানুষের কাছে পৌঁছানো' },
                ].map((obj) => (
                  <button
                    key={obj.id}
                    type="button"
                    onClick={() => setCustomCampForm(f => ({ ...f, objective: obj.id }))}
                    className={`p-3 rounded-xl text-left border transition-all ${
                      customCampForm.objective === obj.id
                        ? 'bg-brand-green/20 border-brand-green text-white shadow-md shadow-brand-green/20'
                        : 'bg-zinc-50 dark:bg-surface border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400 hover:border-brand-green/40 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                  >
                    <span className="text-xs font-bold block text-zinc-900 dark:text-white">{obj.title}</span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 block leading-tight">{obj.desc}</span>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Campaign Name */}
                <div>
                  <label className="text-xs text-zinc-500 dark:text-zinc-400 block mb-1 font-medium">
                    {language === 'en' ? 'Campaign Name *' : 'ক্যাম্পেইনের নাম *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={customCampForm.name}
                    onChange={(e) => setCustomCampForm(f => ({ ...f, name: e.target.value }))}
                    placeholder={language === 'en' ? 'e.g. Eid Mega Sale Campaign 2026' : 'যেমন: ঈদ মেগা সেল ক্যাম্পেইন ২০২৬'}
                    className="w-full bg-zinc-50 dark:bg-surface border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-brand-green placeholder:text-zinc-400 shadow-xs"
                  />
                </div>

                {/* Special Ad Category */}
                <div>
                  <label className="text-xs text-zinc-500 dark:text-zinc-400 block mb-1 font-medium">
                    {language === 'en' ? 'Special Ad Category' : 'বিশেষ বিজ্ঞাপন ক্যাটাগরি'}
                  </label>
                  <select
                    value={customCampForm.specialAdCategory}
                    onChange={(e) => setCustomCampForm(f => ({ ...f, specialAdCategory: e.target.value }))}
                    className="w-full bg-zinc-50 dark:bg-surface border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-brand-green placeholder:text-zinc-400 shadow-xs"
                  >
                    <option value="NONE">{language === 'en' ? 'None (Standard E-commerce / Retail)' : 'কোনোটিই নয় (সাধারণ ই-কমার্স / রিটেইল)'}</option>
                    <option value="HOUSING">{language === 'en' ? 'Housing / Real Estate' : 'রিয়েল এস্টেট / আবাসন'}</option>
                    <option value="EMPLOYMENT">{language === 'en' ? 'Employment / Job Offers' : 'চাকরি / নিয়োগ'}</option>
                    <option value="CREDIT">{language === 'en' ? 'Credit / Financial Services' : 'ঋণ / আর্থিক সেবা'}</option>
                  </select>
                </div>
              </div>
            </div>

            {/* LEVEL 2: AD SET (BUDGET, SCHEDULE, TARGETING & PLACEMENTS) */}
            <div className="bg-white dark:bg-surface/70 backdrop-blur-xl border border-zinc-200 dark:border-white/10 rounded-2xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-brand-orange" />
                  {language === 'en' ? 'Level 2: AdSet (Budget, Schedule, Targeting & Placements)' : 'লেভেল ২: অ্যাডসেট (বাজেট, মেয়াদ, অডিয়েন্স ও প্লেসমেন্ট)'}
                </h4>
                <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  Meta AdSet Level
                </span>
              </div>

              {/* Budget & Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-500 dark:text-zinc-400 block mb-1 font-medium">
                    {language === 'en' ? `Daily Budget (${currencySymbol}) *` : `দৈনিক বাজেট (${currencySymbol}) *`}
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={customCampForm.dailyBudget}
                    onChange={(e) => setCustomCampForm(f => ({ ...f, dailyBudget: Number(e.target.value) }))}
                    className="w-full bg-zinc-50 dark:bg-surface border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-brand-green placeholder:text-zinc-400 shadow-xs"
                  />
                  <div className="flex gap-1.5 mt-2">
                    {[5, 10, 25, 50, 100].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setCustomCampForm(f => ({ ...f, dailyBudget: amt }))}
                        className="px-2.5 py-1 rounded-lg text-[10px] bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-white/10 font-mono transition-colors"
                      >
                        {currencySymbol} {amt}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                      {language === 'en' ? 'Campaign Duration:' : 'বিজ্ঞাপনের মেয়াদ:'}
                    </label>
                    <span className="text-xs font-bold text-zinc-900 dark:text-white font-mono">{customCampForm.durationDays} Days</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={60}
                    value={customCampForm.durationDays}
                    onChange={(e) => setCustomCampForm(f => ({ ...f, durationDays: Number(e.target.value) }))}
                    className="w-full accent-brand-green cursor-pointer mt-2"
                  />
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 flex justify-between mt-1">
                    <span>1 Day</span>
                    <span>Total Est: ~{currencySymbol} {(customCampForm.dailyBudget * customCampForm.durationDays).toLocaleString()}</span>
                    <span>60 Days</span>
                  </div>
                </div>
              </div>

              {/* Target Audience: Country, Age, Gender */}
              <div className="pt-3 border-t border-zinc-200 dark:border-white/10 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-zinc-500 dark:text-zinc-400 block mb-1">
                      {language === 'en' ? 'Target Countries (comma separated)' : 'টার্গেট দেশ (কমা দিয়ে লিখুন)'}
                    </label>
                    <input
                      type="text"
                      value={customCampForm.countries}
                      onChange={(e) => setCustomCampForm(f => ({ ...f, countries: e.target.value }))}
                      placeholder="BD, US, CA"
                      className="w-full bg-zinc-50 dark:bg-surface border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white text-xs rounded-xl px-3 py-2 uppercase font-mono focus:outline-none focus:border-brand-green placeholder:text-zinc-400 shadow-xs"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-zinc-500 dark:text-zinc-400 block mb-1">
                      {language === 'en' ? 'Min Age' : 'সর্বনিম্ন বয়স'}
                    </label>
                    <input
                      type="number"
                      min={18}
                      max={65}
                      value={customCampForm.ageMin}
                      onChange={(e) => setCustomCampForm(f => ({ ...f, ageMin: Number(e.target.value) }))}
                      className="w-full bg-zinc-50 dark:bg-surface border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-brand-green placeholder:text-zinc-400 shadow-xs"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-zinc-500 dark:text-zinc-400 block mb-1">
                      {language === 'en' ? 'Max Age' : 'সর্বোচ্চ বয়স'}
                    </label>
                    <input
                      type="number"
                      min={18}
                      max={65}
                      value={customCampForm.ageMax}
                      onChange={(e) => setCustomCampForm(f => ({ ...f, ageMax: Number(e.target.value) }))}
                      className="w-full bg-zinc-50 dark:bg-surface border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-brand-green placeholder:text-zinc-400 shadow-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-500 dark:text-zinc-400 block mb-1.5">
                      {language === 'en' ? 'Target Gender' : 'টার্গেট জেন্ডার'}
                    </label>
                    <div className="flex items-center gap-2">
                      {(['all', 'men', 'women'] as const).map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setCustomCampForm(f => ({ ...f, gender: g }))}
                          className={`flex-1 py-1.5 rounded-xl text-xs capitalize transition-colors ${
                            customCampForm.gender === g
                              ? 'bg-brand-green text-white font-bold'
                              : 'bg-zinc-100 dark:bg-white/5 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-white/10'
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-zinc-500 dark:text-zinc-400 block mb-1 font-medium">
                      {language === 'en' ? 'Detailed Targeting / Interests (Optional)' : 'আগ্রহ ও বিষয়ভিত্তিক টার্গেটিং (ঐচ্ছিক)'}
                    </label>
                    <input
                      type="text"
                      value={customCampForm.interests}
                      onChange={(e) => setCustomCampForm(f => ({ ...f, interests: e.target.value }))}
                      placeholder={language === 'en' ? 'e.g. Online shopping, Fashion, Electronics' : 'যেমন: অনলাইন কেনাকাটা, ফ্যাশন, গ্যাজেট'}
                      className="w-full bg-zinc-50 dark:bg-surface border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-brand-green placeholder:text-zinc-400 shadow-xs"
                    />
                  </div>
                </div>

                {/* Placements Toggle & Manual Setup */}
                <div className="pt-2 border-t border-zinc-200 dark:border-white/10 space-y-3">
                  <label className="text-xs text-zinc-500 dark:text-zinc-400 block font-medium">
                    {language === 'en' ? 'Placements & Device Delivery' : 'বিজ্ঞাপন প্রদর্শনের মাধ্যম (প্লেসমেন্ট)'}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCustomCampForm(f => ({ ...f, placementType: 'advantage_plus' }))}
                      className={`p-3 rounded-xl text-left border transition-all ${
                        customCampForm.placementType === 'advantage_plus'
                          ? 'bg-brand-green/20 border-brand-green text-white'
                          : 'bg-zinc-50 dark:bg-surface border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400 hover:border-brand-green/40'
                      }`}
                    >
                      <span className="text-xs font-bold block text-white flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-brand-orange" />
                        {language === 'en' ? 'Advantage+ Placements (Recommended)' : 'Advantage+ স্বয়ংক্রিয় প্লেসমেন্ট (সুপারিশকৃত)'}
                      </span>
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block mt-1">
                        {language === 'en' ? 'Maximizes budget across Facebook Feeds, Stories, Reels & Audience Network.' : 'ফেসবুক ফিড, রিলস, স্টোরি সব মাধ্যমে মেটার এলগরিদম স্বয়ংক্রিয়ভাবে দেখাবে।'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCustomCampForm(f => ({ 
                        ...f, 
                        placementType: 'manual',
                        placements: f.placements && f.placements.length > 0 ? f.placements : ['fb_feed', 'ig_feed', 'fb_reels', 'ig_reels', 'fb_story', 'ig_story', 'messenger_home']
                      }))}
                      className={`p-3 rounded-xl text-left border transition-all ${
                        customCampForm.placementType === 'manual'
                          ? 'bg-brand-green/20 border-brand-green text-white'
                          : 'bg-zinc-50 dark:bg-surface border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400 hover:border-brand-green/40'
                      }`}
                    >
                      <span className="text-xs font-bold block text-white flex items-center gap-1.5">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
                        {language === 'en' ? 'Manual Placements' : 'ম্যানুয়াল প্লেসমেন্ট'}
                      </span>
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block mt-1">
                        {language === 'en' ? 'Select specific platforms, feeds, stories and reels.' : 'নির্দিষ্ট কিছু ফিড বা প্ল্যাটফর্ম বেছে নিন।'}
                      </span>
                    </button>
                  </div>

                  {/* Manual Placements Detailed Checkbox Hub */}
                  {customCampForm.placementType === 'manual' && (
                    <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-surface/50 border border-zinc-200 dark:border-white/10 space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-xs font-semibold text-zinc-900 dark:text-white">
                          {language === 'en' ? 'Choose Specific Placement Channels:' : 'নির্দিষ্ট প্লেসমেন্ট চ্যানেল বেছে নিন:'}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <button
                            type="button"
                            onClick={() => setCustomCampForm(f => ({
                              ...f,
                              placements: ['fb_feed', 'ig_feed', 'fb_marketplace', 'fb_video_feed', 'fb_story', 'ig_story', 'fb_reels', 'ig_reels', 'ig_explore', 'messenger_home', 'audience_network']
                            }))}
                            className="px-2 py-0.5 rounded bg-zinc-200 dark:bg-white/10 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-white/20 font-medium"
                          >
                            {language === 'en' ? 'Select All' : 'সবগুলো'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setCustomCampForm(f => ({
                              ...f,
                              placements: ['fb_feed', 'ig_feed']
                            }))}
                            className="px-2 py-0.5 rounded bg-zinc-200 dark:bg-white/10 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-white/20 font-medium"
                          >
                            {language === 'en' ? 'Feeds Only' : 'শুধু ফিড'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setCustomCampForm(f => ({
                              ...f,
                              placements: ['fb_reels', 'ig_reels', 'fb_story', 'ig_story']
                            }))}
                            className="px-2 py-0.5 rounded bg-zinc-200 dark:bg-white/10 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-white/20 font-medium"
                          >
                            {language === 'en' ? 'Stories & Reels' : 'স্টোরিজ ও রিলস'}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {[
                          { id: 'fb_feed', label: 'Facebook Feed' },
                          { id: 'ig_feed', label: 'Instagram Feed' },
                          { id: 'fb_marketplace', label: 'FB Marketplace' },
                          { id: 'fb_video_feed', label: 'FB Video Feeds' },
                          { id: 'fb_story', label: 'Facebook Stories' },
                          { id: 'ig_story', label: 'Instagram Stories' },
                          { id: 'fb_reels', label: 'Facebook Reels' },
                          { id: 'ig_reels', label: 'Instagram Reels' },
                          { id: 'ig_explore', label: 'Instagram Explore' },
                          { id: 'messenger_home', label: 'Messenger Inbox' },
                          { id: 'audience_network', label: 'Audience Network' },
                        ].map((pl) => {
                          const isChecked = customCampForm.placements?.includes(pl.id);
                          return (
                            <label
                              key={pl.id}
                              className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                                isChecked
                                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-300 font-semibold'
                                  : 'bg-white dark:bg-surface border-zinc-200 dark:border-white/5 text-zinc-600 dark:text-zinc-400'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  const list = customCampForm.placements || [];
                                  const updated = e.target.checked
                                    ? [...list, pl.id]
                                    : list.filter(id => id !== pl.id);
                                  setCustomCampForm(f => ({ ...f, placements: updated }));
                                }}
                                className="rounded accent-brand-green w-3.5 h-3.5"
                              />
                              <span className="truncate">{pl.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* LEVEL 3: AD CREATIVE SETUP (MULTI-FORMAT & DYNAMIC COPY) */}
            <div className="bg-white dark:bg-surface/70 backdrop-blur-xl border border-zinc-200 dark:border-white/10 rounded-2xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  {language === 'en' ? 'Level 3: Ad Creative & Content Setup' : 'লেভেল ৩: বিজ্ঞাপন কনটেন্ট ও ক্রিয়েটিভ'}
                </h4>
                <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                  Meta Ad Level
                </span>
              </div>

              {/* Creative Source Selector: Upload Image vs Existing Page Post */}
              <div>
                <label className="text-xs text-zinc-500 dark:text-zinc-400 block mb-1.5 font-medium">
                  {language === 'en' ? 'Creative Setup Method' : 'বিজ্ঞাপন ক্রিয়েটিভের ধরন'}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCustomCampForm(f => ({ ...f, creativeSource: 'upload' }))}
                    className={`p-3 rounded-xl text-left border transition-all flex items-start gap-2.5 ${
                      customCampForm.creativeSource === 'upload'
                        ? 'bg-brand-green/15 border-brand-green text-emerald-800 dark:text-white shadow-md shadow-brand-green/15'
                        : 'bg-zinc-50 dark:bg-surface border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400 hover:border-brand-green/40 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                  >
                    <ImageIcon className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-bold block text-zinc-900 dark:text-white">
                        {language === 'en' ? 'Create New Ad / Image' : 'নতুন ব্যানার / ছবি দিয়ে তৈরি'}
                      </span>
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block mt-0.5">
                        {language === 'en' ? 'Enter multiple primary texts and headline variations.' : 'একাধিক প্রাইমারি টেক্সট ও হেডলাইন দিয়ে নতুন বিজ্ঞাপন।'}
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCustomCampForm(f => ({ ...f, creativeSource: 'existing_post' }))}
                    className={`p-3 rounded-xl text-left border transition-all flex items-start gap-2.5 ${
                      customCampForm.creativeSource === 'existing_post'
                        ? 'bg-brand-green/15 border-brand-green text-emerald-800 dark:text-white shadow-md shadow-brand-green/15'
                        : 'bg-zinc-50 dark:bg-surface border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400 hover:border-brand-green/40 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                  >
                    <FileText className="w-4 h-4 text-brand-orange shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-bold block text-zinc-900 dark:text-white">
                        {language === 'en' ? 'Use Existing Page Post' : 'পেইজের পূর্বের পোস্ট বেছে নিন'}
                      </span>
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block mt-0.5">
                        {language === 'en' ? 'Preserves all organic likes, comments & shares.' : 'পোস্টের আগের সব লাইক, কমেন্ট ও শেয়ার হুবহু অক্ষত থাকবে।'}
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              {/* OPTION A: EXISTING PAGE POST PICKER (MULTI-SELECT SUPPORTED) */}
              {customCampForm.creativeSource === 'existing_post' && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <span className="text-xs font-semibold text-zinc-900 dark:text-white block">
                        {language === 'en' ? 'Select Facebook Page Posts as Creatives:' : 'বিজ্ঞাপনের ক্রিয়েটিভ হিসেবে পোস্ট নির্বাচন করুন:'}
                      </span>
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                        {language === 'en' 
                          ? 'Select 1 or multiple posts. Each selected post creates an ad creative under the ad set.' 
                          : '১টি বা একাধিক পোস্ট নির্বাচন করতে পারেন। প্রতিটি পোস্ট দিয়ে আলাদা অ্যাড ক্রিয়েটিভ তৈরি হবে।'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => fetchPagePosts(selectedAccountId)}
                      disabled={loadingPosts}
                      className="px-2.5 py-1 text-[11px] bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 text-emerald-600 dark:text-emerald-400 rounded-lg border border-zinc-200 dark:border-white/10 flex items-center gap-1 transition-colors"
                    >
                      <RefreshCw className={`w-3 h-3 ${loadingPosts ? 'animate-spin' : ''}`} />
                      {language === 'en' ? 'Refresh Posts' : 'পোস্ট রিফ্রেশ'}
                    </button>
                  </div>

                  {/* Multi-Selection Counter & Clear Banner */}
                  {(customCampForm.selectedPagePostIds?.length || 0) > 0 && (
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400">
                      <span className="font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        {customCampForm.selectedPagePostIds.length} {language === 'en' ? 'posts selected' : 'টি পোস্ট নির্বাচিত'} 
                        <span className="font-normal text-zinc-600 dark:text-zinc-300">
                          ({language === 'en' ? `Will deploy ${customCampForm.selectedPagePostIds.length} ads in this AdSet` : `এই অ্যাডসেটের অধীনে ${customCampForm.selectedPagePostIds.length}টি স্বতন্ত্র বিজ্ঞাপন তৈরি হবে`})
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setCustomCampForm(f => ({ ...f, selectedPagePostIds: [], selectedPagePostId: '' }))}
                        className="text-[11px] underline hover:text-emerald-700 dark:hover:text-emerald-300 font-medium"
                      >
                        {language === 'en' ? 'Clear all' : 'সব মুছুন'}
                      </button>
                    </div>
                  )}

                  {loadingPosts ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-pulse">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="h-36 bg-zinc-50 dark:bg-surface/50 border border-zinc-200 dark:border-white/10 rounded-xl" />
                      ))}
                    </div>
                  ) : pagePosts.length === 0 ? (
                    <div className="p-4 bg-zinc-50 dark:bg-background/50 rounded-xl border border-zinc-200 dark:border-white/10 text-center">
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {language === 'en' ? 'No page posts found. Click Refresh or publish on Facebook first.' : 'কোনো পোস্ট পাওয়া যায়নি। ফেসবুক পেজে পোস্ট করে রিফ্রেশ করুন।'}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-72 overflow-y-auto pr-1">
                      {pagePosts.map((post) => {
                        const isSelected = customCampForm.selectedPagePostIds?.includes(post.id) || customCampForm.selectedPagePostId === post.id;
                        const selectionIndex = customCampForm.selectedPagePostIds?.indexOf(post.id) ?? -1;

                        const handleTogglePost = () => {
                          setCustomCampForm(f => {
                            const list = f.selectedPagePostIds || [];
                            const exists = list.includes(post.id);
                            const updated = exists ? list.filter(id => id !== post.id) : [...list, post.id];
                            return {
                              ...f,
                              selectedPagePostIds: updated,
                              selectedPagePostId: updated[0] || '',
                            };
                          });
                        };

                        return (
                          <div
                            key={post.id}
                            onClick={handleTogglePost}
                            className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                              isSelected
                                ? 'bg-brand-green/15 border-brand-green shadow-md shadow-brand-green/20 ring-1 ring-brand-green/40'
                                : 'bg-white dark:bg-surface border-zinc-200 dark:border-white/5 hover:border-zinc-300 dark:hover:border-white/20'
                            }`}
                          >
                            <div>
                              {post.fullPicture && (
                                <img
                                  src={post.fullPicture}
                                  alt="Post thumbnail"
                                  className="w-full h-24 object-cover rounded-lg mb-2"
                                />
                              )}
                              <p className="text-[11px] text-zinc-800 dark:text-white/90 line-clamp-2 leading-relaxed">
                                {post.message || '[Image Post without caption]'}
                              </p>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-zinc-500 dark:text-zinc-400 pt-2 mt-2 border-t border-zinc-100 dark:border-white/5">
                              <span>👍 {post.reactionsCount} reactions</span>
                              {isSelected ? (
                                <span className="text-white bg-brand-green px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 shadow-sm">
                                  <Check className="w-3 h-3" /> Creative #{selectionIndex >= 0 ? selectionIndex + 1 : 1}
                                </span>
                              ) : (
                                <span className="text-zinc-500 dark:text-zinc-400 hover:text-brand-green font-medium">
                                  + {language === 'en' ? 'Add Creative' : 'যোগ করুন'}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* OPTION B: UPLOAD NEW CREATIVE WITH MULTIPLE PRIMARY TEXTS & HEADLINES */}
              {customCampForm.creativeSource === 'upload' && (
                <div className="space-y-4 pt-2">
                  {/* MULTIPLE PRIMARY TEXTS (Dynamic Copy) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-zinc-500 dark:text-zinc-400 font-medium flex items-center gap-1.5">
                        {language === 'en' ? 'Primary Text (Ad Copy Options)' : 'বিজ্ঞাপনের মূল বিবরণ (প্রাইমারি টেক্সট)'}
                        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                          {customCampForm.primaryTexts.length}/5 Options
                        </span>
                      </label>
                      {customCampForm.primaryTexts.length < 5 && (
                        <button
                          type="button"
                          onClick={handleAddPrimaryText}
                          className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          {language === 'en' ? '+ Add Text Option' : '+ আরও টেক্সট অপশন যোগ করুন'}
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      {language === 'en'
                        ? 'Meta will automatically test these primary text variations and deliver the highest-converting copy to each shopper.'
                        : 'মেটার এলগরিদম এই ভিন্ন ভিন্ন টেক্সট অপশনগুলো পরীক্ষা করে প্রতিটি কাস্টমারকে সবচেয়ে কার্যকর কপিটি দেখাবে।'}
                    </p>

                    <div className="space-y-2.5">
                      {customCampForm.primaryTexts.map((text, idx) => (
                        <div key={idx} className="relative bg-zinc-50/60 dark:bg-surface/50 border border-zinc-200 dark:border-white/10 rounded-xl p-2.5 focus-within:border-brand-green transition-all">
                          <div className="flex items-center justify-between mb-1 text-[10px] text-zinc-500 dark:text-zinc-400">
                            <span className="font-semibold text-emerald-400">
                              {language === 'en' ? `Primary Text Option #${idx + 1}` : `প্রাইমারি টেক্সট অপশন #${idx + 1}`}
                            </span>
                            {customCampForm.primaryTexts.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemovePrimaryText(idx)}
                                className="text-red-400 hover:text-red-300 p-0.5"
                                title="Remove"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          <textarea
                            rows={3}
                            value={text}
                            onChange={(e) => handleUpdatePrimaryText(idx, e.target.value)}
                            placeholder={language === 'en' ? `Write persuasive copy variation #${idx + 1}...` : `বিজ্ঞাপনের আকর্ষণীয় বিবরণ #${idx + 1} লিখুন...`}
                            className="w-full bg-transparent text-zinc-900 dark:text-white text-xs focus:outline-none resize-none leading-relaxed"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* MULTIPLE HEADLINES */}
                  <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-white/10">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-zinc-500 dark:text-zinc-400 font-medium flex items-center gap-1.5">
                        {language === 'en' ? 'Headlines (Up to 3 variations)' : 'বিজ্ঞাপনের হেডলাইন (সর্বোচ্চ ৩টি অপশন)'}
                        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                          {customCampForm.headlines.length}/3
                        </span>
                      </label>
                      {customCampForm.headlines.length < 3 && (
                        <button
                          type="button"
                          onClick={handleAddHeadline}
                          className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          {language === 'en' ? '+ Add Headline' : '+ হেডলাইন যোগ করুন'}
                        </button>
                      )}
                    </div>

                    <div className="space-y-2">
                      {customCampForm.headlines.map((hl, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={hl}
                            onChange={(e) => handleUpdateHeadline(idx, e.target.value)}
                            placeholder={language === 'en' ? `Headline #${idx + 1} (e.g. 30% Off Today Only!)` : `হেডলাইন #${idx + 1} (যেমন: ৩০% বিশেষ ছাড় আজকের জন্য)`}
                            className="flex-1 bg-zinc-50 dark:bg-surface border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-brand-green placeholder:text-zinc-400 shadow-xs"
                          />
                          {customCampForm.headlines.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveHeadline(idx)}
                              className="p-2 text-red-400 hover:text-red-300 rounded-lg hover:bg-red-500/10"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Feed Description & Call To Action */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-zinc-200 dark:border-white/10">
                    <div>
                      <label className="text-xs text-zinc-500 dark:text-zinc-400 block mb-1 font-medium">
                        {language === 'en' ? 'Feed Description (Optional)' : 'ফিড ডেসক্রিপশন (ঐচ্ছিক)'}
                      </label>
                      <input
                        type="text"
                        value={customCampForm.description}
                        onChange={(e) => setCustomCampForm(f => ({ ...f, description: e.target.value }))}
                        placeholder={language === 'en' ? 'e.g. Free Delivery across Bangladesh' : 'যেমন: সারা দেশে ফ্রি ডেলিভারি'}
                        className="w-full bg-zinc-50 dark:bg-surface border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-brand-green placeholder:text-zinc-400 shadow-xs"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-zinc-500 dark:text-zinc-400 block mb-1 font-medium">
                        {language === 'en' ? 'Call to Action Button' : 'কল-টু-অ্যাকশন বাটন'}
                      </label>
                      <select
                        value={customCampForm.callToAction}
                        onChange={(e) => setCustomCampForm(f => ({ ...f, callToAction: e.target.value }))}
                        className="w-full bg-zinc-50 dark:bg-surface border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-brand-green placeholder:text-zinc-400 shadow-xs"
                      >
                        <option value="LEARN_MORE">Learn More (আরও জানুন)</option>
                        <option value="SHOP_NOW">Shop Now (এখনই কিনুন)</option>
                        <option value="ORDER_NOW">Order Now (অর্ডার করুন)</option>
                        <option value="SIGN_UP">Sign Up (সাইন আপ করুন)</option>
                        <option value="SEND_MESSAGE">Send Message (মেসেজ পাঠান)</option>
                        <option value="WHATSAPP_MESSAGE">Send WhatsApp Message (হোয়াটসঅ্যাপে মেসেজ)</option>
                        <option value="CONTACT_US">Contact Us (যোগাযোগ করুন)</option>
                        <option value="GET_OFFER">Get Offer (অফার পান)</option>
                      </select>
                    </div>
                  </div>

                  {/* Destination URL & Image URL */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-zinc-500 dark:text-zinc-400 block mb-1 font-medium">
                        {language === 'en' ? 'Website / Destination URL' : 'ওয়েবসাইট বা ল্যান্ডিং পেইজ লিংক'}
                      </label>
                      <input
                        type="url"
                        value={customCampForm.linkUrl}
                        onChange={(e) => setCustomCampForm(f => ({ ...f, linkUrl: e.target.value }))}
                        placeholder="https://yourwebsite.com/product"
                        className="w-full bg-zinc-50 dark:bg-surface border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-brand-green placeholder:text-zinc-400 shadow-xs"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-zinc-500 dark:text-zinc-400 block mb-1 font-medium">
                        {language === 'en' ? 'Image URL (High-Res Banner)' : 'ছবির লিংক (ব্যানার ইমেজ URL)'}
                      </label>
                      <input
                        type="url"
                        value={customCampForm.imageUrl}
                        onChange={(e) => setCustomCampForm(f => ({ ...f, imageUrl: e.target.value }))}
                        placeholder="https://images.unsplash.com/..."
                        className="w-full bg-zinc-50 dark:bg-surface border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-brand-green placeholder:text-zinc-400 shadow-xs"
                      />
                    </div>
                  </div>

                  {customCampForm.imageUrl && (
                    <div className="p-2 border border-zinc-200 dark:border-white/10 rounded-xl bg-zinc-50/50 dark:bg-surface/50 max-w-xs">
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block mb-1">Image Preview:</span>
                      <img
                        src={customCampForm.imageUrl}
                        alt="Ad Preview"
                        className="w-full h-32 object-cover rounded-lg"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* CONVERSION TRACKING: META PIXEL INTEGRATION */}
              <div className="pt-3 border-t border-zinc-200 dark:border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-zinc-900 dark:text-white">
                    <input
                      type="checkbox"
                      checked={customCampForm.trackPixel}
                      onChange={(e) => setCustomCampForm(f => ({ ...f, trackPixel: e.target.checked }))}
                      className="rounded accent-brand-green w-4 h-4 cursor-pointer"
                    />
                    <span>{language === 'en' ? 'Track Website Conversions with Meta Pixel' : 'মেটা পিক্সেল দিয়ে কনভার্সন ট্র্যাক করুন'}</span>
                  </label>
                  {customCampForm.trackPixel && discoveredPixels.length === 0 && (
                    <button
                      type="button"
                      onClick={() => fetchPixelsForTracking()}
                      disabled={loadingPixels}
                      className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <RefreshCw className={`w-3 h-3 ${loadingPixels ? 'animate-spin' : ''}`} />
                      {language === 'en' ? 'Fetch Pixels' : 'পিক্সেল খুঁজুন'}
                    </button>
                  )}
                </div>

                {customCampForm.trackPixel && (
                  <div className="p-3 bg-zinc-50/60 dark:bg-surface/50 border border-zinc-200 dark:border-white/10 rounded-xl space-y-2 animate-in fade-in">
                    <label className="text-[11px] text-zinc-500 dark:text-zinc-400 block">
                      {language === 'en' ? 'Select Connected Meta Pixel:' : 'কানেক্টেড মেটা পিক্সেল নির্বাচন করুন:'}
                    </label>
                    {discoveredPixels.length > 0 ? (
                      <select
                        value={customCampForm.selectedPixelId}
                        onChange={(e) => setCustomCampForm(f => ({ ...f, selectedPixelId: e.target.value }))}
                        className="w-full bg-zinc-50 dark:bg-surface border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-brand-green font-mono placeholder:text-zinc-400 shadow-xs"
                      >
                        {discoveredPixels.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} (ID: {p.id})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        {language === 'en' ? 'No pixels discovered on this ad account yet.' : 'এই অ্যাড অ্যাকাউন্টে এখনো কোনো পিক্সেল পাওয়া যায়নি।'}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* AI PRE-FLIGHT ANALYSIS BAR (Deducts 1 AI Credit under Rule 4) */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-surface/80 to-amber-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 backdrop-blur-xl">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-brand-green text-white shadow-md shadow-brand-green/30">
                  <Sparkles className="w-4 h-4 text-brand-orange animate-pulse" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                    {language === 'en' ? 'AI Pre-Flight Ad & Copy Analyzer' : 'এআই প্রি-ফ্লাইট কপি ও কনভার্সন অ্যানালাইসিস'}
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      1 AI Credit
                    </span>
                  </h5>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {language === 'en'
                      ? 'Critique your hooks, estimate CTR strength, check Meta policy risk, and generate 3 high-converting copy variations.'
                      : 'বিজ্ঞাপন চালুর পূর্বে হুক স্কোর, মেটা পলিসি কমপ্লায়েন্স চেক এবং ৩টি আকর্ষণীয় কপি অপশন পান।'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleReviewWithAi}
                disabled={reviewingWithAi}
                className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-emerald-600 to-brand-green hover:opacity-95 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50"
              >
                {reviewingWithAi ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>{language === 'en' ? 'Analyzing with AI...' : 'এআই বিশ্লেষণ চলছে...'}</span>
                  </>
                ) : (
                  <>
                    <Lightbulb className="w-3.5 h-3.5 text-amber-300" />
                    <span>{language === 'en' ? 'Analyze Ad with AI' : 'এআই দিয়ে বিজ্ঞাপন বিশ্লেষণ করুন'}</span>
                  </>
                )}
              </button>
            </div>

            {/* Submit Action */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('campaigns')}
                className="px-4 py-2.5 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
              >
                {language === 'en' ? 'Cancel' : 'বাতিল'}
              </button>
              <button
                type="submit"
                disabled={launchingCustom}
                className="px-6 py-2.5 bg-gradient-to-r from-brand-green to-emerald-600 hover:opacity-95 text-white font-semibold text-xs rounded-xl transition-all shadow-lg shadow-brand-green/20 flex items-center gap-2 disabled:opacity-50"
              >
                {launchingCustom ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>{language === 'en' ? 'Deploying to Meta Ads Manager...' : 'মেটা অ্যাড ম্যানেজারে সাবমিট হচ্ছে...'}</span>
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4 text-white" />
                    <span>{language === 'en' ? 'Launch Campaign on Meta Now' : 'এখনই মেটাতে ক্যাম্পেইন চালু করুন'}</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* AI PRE-FLIGHT REVIEW MODAL */}
          {aiReviewModalOpen && aiReviewResult && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 border border-zinc-200 dark:border-white/15 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl space-y-4 text-zinc-900 dark:text-white">
                <div className="flex items-center justify-between border-b border-zinc-200 dark:border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white">
                      {language === 'en' ? 'AI Pre-Flight Campaign & Copy Analysis' : 'এআই প্রি-ফ্লাইট বিজ্ঞাপন বিশ্লেষণ'}
                    </h3>
                  </div>
                  <button
                    onClick={() => setAiReviewModalOpen(false)}
                    className="p-1 text-slate-400 hover:text-white rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Scores Bar */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-zinc-50 dark:bg-surface/60 border border-zinc-200 dark:border-white/10 text-center">
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block mb-1">
                      {language === 'en' ? 'Overall Score' : 'সার্বিক স্কোর'}
                    </span>
                    <span className="text-xl font-extrabold text-emerald-400 font-mono">
                      {aiReviewResult.overallScore}/100
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-zinc-50 dark:bg-surface/60 border border-zinc-200 dark:border-white/10 text-center">
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block mb-1">
                      {language === 'en' ? 'Hook Strength' : 'হুক পাওয়ার'}
                    </span>
                    <span className="text-xl font-extrabold text-amber-400 font-mono">
                      {aiReviewResult.hookScore}/100
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-zinc-50 dark:bg-surface/60 border border-zinc-200 dark:border-white/10 text-center">
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block mb-1">
                      {language === 'en' ? 'Clarity & CTA' : 'স্পষ্টতা ও অফার'}
                    </span>
                    <span className="text-xl font-extrabold text-blue-400 font-mono">
                      {aiReviewResult.clarityScore}/100
                    </span>
                  </div>
                </div>

                {/* Policy Compliance */}
                <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-900 dark:text-white flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      {language === 'en' ? 'Meta Policy Compliance' : 'মেটা বিজ্ঞাপন নীতিমালা যাচাই'}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      aiReviewResult.policyRisk === 'LOW'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {aiReviewResult.policyRisk === 'LOW' ? 'Low Risk (Safe)' : 'Medium Attention'}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed pt-1">
                    {language === 'en' ? aiReviewResult.policyFeedback : aiReviewResult.policyFeedbackBn}
                  </p>
                </div>

                {/* Strengths & Weaknesses */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                  <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-1">
                    <span className="font-bold text-emerald-400 flex items-center gap-1 mb-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {language === 'en' ? 'Strengths' : 'ইতিবাচক দিকসমূহ'}
                    </span>
                    {(language === 'en' ? aiReviewResult.strengths : aiReviewResult.strengthsBn).map((s, idx) => (
                      <p key={idx} className="text-emerald-200/90 leading-tight">• {s}</p>
                    ))}
                  </div>

                  <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-1">
                    <span className="font-bold text-amber-400 flex items-center gap-1 mb-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {language === 'en' ? 'Areas to Optimize' : 'উন্নতির সুযোগ'}
                    </span>
                    {(language === 'en' ? aiReviewResult.weaknesses : aiReviewResult.weaknessesBn).map((w, idx) => (
                      <p key={idx} className="text-amber-200/90 leading-tight">• {w}</p>
                    ))}
                  </div>
                </div>

                {/* Suggested High-Converting Copy Variations */}
                <div className="space-y-2.5 pt-2 border-t border-zinc-200 dark:border-white/10">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-brand-orange" />
                    {language === 'en' ? 'AI Optimized Copy Variations (1-Click Apply)' : 'এআই প্রস্তাবিত হাই-কনভার্টিং কপি (১-ক্লিকে ব্যবহার করুন)'}
                  </h4>

                  <div className="space-y-2.5">
                    {aiReviewResult.suggestedVariations.map((v, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-zinc-50 dark:bg-surface/70 border border-zinc-200 dark:border-white/10 hover:border-emerald-500/40 transition-all space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {v.hookType}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleApplyAiVariation(v)}
                            className="px-2.5 py-1 bg-brand-green hover:bg-brand-green/90 text-white rounded-lg text-[10px] font-bold transition-all flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" />
                            {language === 'en' ? 'Apply to Form' : 'ফর্মে ব্যবহার করুন'}
                          </button>
                        </div>

                        <div>
                          <p className="text-xs font-bold text-zinc-900 dark:text-white">{v.headline}</p>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 whitespace-pre-line leading-relaxed">
                            {v.primaryText}
                          </p>
                        </div>

                        <p className="text-[10px] text-amber-600 dark:text-amber-300/80 italic border-t border-zinc-200 dark:border-white/10 pt-1.5">
                          💡 {language === 'en' ? v.rationale : v.rationaleBn}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-zinc-500 dark:text-zinc-400 pt-3 border-t border-zinc-200 dark:border-white/10">
                  <span className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-emerald-400" />
                    {language === 'en' ? '1 AI Credit deducted from independent pool' : 'স্বাধীন কোটা থেকে ১ ক্রেডিট কর্তন করা হয়েছে'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setAiReviewModalOpen(false)}
                    className="px-3.5 py-1.5 bg-zinc-100 dark:bg-white/10 hover:bg-zinc-200 dark:hover:bg-white/20 text-zinc-800 dark:text-white border border-zinc-200 dark:border-white/10 rounded-xl font-medium transition-colors"
                  >
                    {language === 'en' ? 'Close' : 'বন্ধ করুন'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: BOOST PAGE POST */}
      {/* ========================================================================= */}
      {activeTab === 'boost' && (
        <div className="space-y-4">
          {/* Header notice */}
          <div className="bg-gradient-to-r from-brand-green/10 to-brand-orange/10 border border-brand-green/20 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-orange" />
                {pageName ? `${pageName} — ${language === 'en' ? 'Facebook Posts' : 'ফেসবুক পোস্টসমূহ'}` : (language === 'en' ? 'Facebook Page Posts' : 'ফেসবুক পেইজ পোস্টসমূহ')}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {language === 'en'
                  ? 'Select any existing Facebook Page post to boost. All organic likes, comments, and shares will be preserved.'
                  : 'বুস্ট করতে যেকোনো পোস্ট নির্বাচন করুন। পোস্টের পূর্বের সব লাইক, কমেন্ট ও শেয়ার হুবহু অক্ষত থাকবে।'}
              </p>
            </div>
            <button
              onClick={() => fetchPagePosts(selectedAccountId)}
              disabled={loadingPosts}
              className="px-3.5 py-1.5 bg-white dark:bg-surface hover:bg-zinc-100 dark:hover:bg-surface-hover border border-zinc-200 dark:border-white/10 text-zinc-800 dark:text-white rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 self-start sm:self-auto shrink-0 shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingPosts ? 'animate-spin' : ''}`} />
              {language === 'en' ? 'Fetch Latest Posts' : 'নতুন পোস্ট খুঁজুন'}
            </button>
          </div>

          {/* Zero Storage Quota Reassurance Callout */}
          <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-300 text-xs flex items-center gap-3">
            <HelpCircle className="w-4 h-4 shrink-0 text-blue-500" />
            <p className="leading-relaxed">
              <strong className="font-semibold text-zinc-900 dark:text-white">
                {language === 'en' ? 'Zero ZiniChat Storage Consumed: ' : 'কোনো স্টোরেজ খরচ নেই: '}
              </strong>
              {language === 'en'
                ? 'Facebook Page posts and their media assets are streamed directly from Meta’s high-speed CDN and boost operations use native object_story_id. They consume 0 MB of your ZiniChat storage quota.'
                : 'ফেসবুক পেজের পোস্ট ও মিডিয়া সরাসরি মেটার নিজস্ব হাই-স্পিড সিডিএন (Meta CDN) থেকে সার্ভ হয় এবং বুস্টের ক্ষেত্রে নেটিভ অবজেক্ট আইডি ব্যবহৃত হয়। এতে আপনার জিনিচ্যাট টেন্যান্ট স্টোরেজের কোনো কোটা খরচ হবে না।'}
            </p>
          </div>

          {/* Posts Grid */}
          {loadingPosts ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bg-zinc-50 dark:bg-surface/50 border border-zinc-200 dark:border-white/10 rounded-2xl h-64 animate-pulse" />
              ))}
            </div>
          ) : pagePosts.length === 0 ? (
            <div className="bg-white dark:bg-surface/70 backdrop-blur-xl border border-zinc-200 dark:border-white/10 rounded-2xl p-8 text-center py-16 shadow-sm">
              <Facebook className="w-12 h-12 text-zinc-500 dark:text-zinc-400/40 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-zinc-900 dark:text-white mb-1">
                {language === 'en' ? 'No Posts Found on Connected Page' : 'কানেক্টেড পেইজে কোনো পোস্ট পাওয়া যায়নি'}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto mb-4">
                {language === 'en'
                  ? 'Publish a post or photo on your Facebook Page, then click "Fetch Latest Posts" to boost it here.'
                  : 'আপনার ফেসবুক পেজে কোনো ছবি বা লেখা পোস্ট করুন, তারপর এখানে রিফ্রেশ করে ১-ক্লিকে বুস্ট করুন।'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {pagePosts.map((post) => (
                <div
                  key={post.id}
                  className="bg-white dark:bg-surface/70 backdrop-blur-xl border border-zinc-200 dark:border-white/10 hover:border-brand-green/50 rounded-2xl overflow-hidden flex flex-col transition-all duration-200 group shadow-sm hover:shadow-md"
                >
                  {/* Post Image Thumbnail */}
                  <div className="h-44 bg-slate-900/50 relative overflow-hidden flex items-center justify-center">
                    {post.fullPicture ? (
                      <img
                        src={post.fullPicture}
                        alt="Post media"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="text-center p-4">
                        <Facebook className="w-8 h-8 text-zinc-500 dark:text-zinc-400/40 mx-auto mb-1" />
                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">Text Status Post</span>
                      </div>
                    )}
                    {post.permalinkUrl && (
                      <a
                        href={post.permalinkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-lg backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"
                        title="View on Facebook"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>

                  {/* Post Text & Metrics */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono block mb-1">
                        {new Date(post.createdTime).toLocaleDateString(language === 'en' ? 'en-US' : 'bn-BD', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                      <p className="text-xs text-zinc-800 dark:text-white/90 line-clamp-3 leading-relaxed">
                        {post.message || (language === 'en' ? '[Photo Post without caption]' : '[ক্যাপশন ছাড়া ছবি পোস্ট]')}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-zinc-200 dark:border-white/10 space-y-2.5">
                      <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="w-3 h-3 text-blue-400" />
                          {post.reactionsCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <Share2 className="w-3 h-3 text-emerald-400" />
                          {post.sharesCount}
                        </span>
                      </div>

                      <button
                        onClick={() => handleOpenBoostModal(post)}
                        className="w-full py-2 bg-brand-green hover:bg-brand-green/90 text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-brand-green/20"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-brand-orange" />
                        {language === 'en' ? 'Boost This Post' : 'এই পোস্টটি বুস্ট করুন'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CONNECTED ACCOUNTS & BALANCES */}
      {/* ========================================================================= */}
      {activeTab === 'accounts' && (
        <div className="bg-white dark:bg-surface/70 backdrop-blur-xl border border-zinc-200 dark:border-white/10 rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-brand-orange" />
              {language === 'en' ? 'Connected Meta Ad Accounts' : 'সংযুক্ত মেটা অ্যাড অ্যাকাউন্টসমূহ'}
            </h2>
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="px-3 py-1.5 bg-[#1877F2] hover:bg-[#1877F2]/90 text-white rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <Facebook className="w-3.5 h-3.5" />
              {language === 'en' ? 'Connect Another Account' : 'অন্য অ্যাকাউন্ট কানেক্ট করুন'}
            </button>
          </div>

          {accounts.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-zinc-200 dark:border-white/10 rounded-2xl">
              <Facebook className="w-10 h-10 text-zinc-500 dark:text-zinc-400/40 mx-auto mb-2" />
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
                {language === 'en' ? 'No Meta Ad account connected yet.' : 'এখনো কোনো মেটা অ্যাড অ্যাকাউন্ট যুক্ত করা হয়নি।'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  className={`p-4 rounded-xl border transition-all ${
                    acc.adAccountId === selectedAccountId
                      ? 'bg-brand-green/10 border-brand-green/40 shadow-lg shadow-brand-green/10'
                      : 'bg-zinc-50 dark:bg-surface border-zinc-200 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/20 shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#1877F2]/10 flex items-center justify-center text-[#1877F2]">
                        <Facebook className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-zinc-900 dark:text-white text-xs">{acc.adAccountName || 'Ad Account'}</h4>
                        <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400">act_{acc.adAccountId}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDisconnect(acc.id)}
                      className="p-1.5 text-zinc-500 dark:text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title={language === 'en' ? 'Disconnect' : 'ডিসকানেক্ট'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 pt-3 mt-3 border-t border-zinc-200 dark:border-white/10">
                    <span>Currency: <strong className="text-zinc-900 dark:text-white uppercase">{acc.currency || 'USD'}</strong></span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 font-medium">
                      Active
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1-CLICK BOOST POST MODAL / DRAWER */}
      {/* ========================================================================= */}
      {boostModalOpen && selectedPost && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-zinc-200 dark:border-white/15 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl space-y-4 text-zinc-900 dark:text-white">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-white/10 pb-3">
              <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-orange" />
                {language === 'en' ? 'Boost Existing Page Post' : 'পেইজ পোস্ট বুস্টিং সেটআপ'}
              </h3>
              <button
                onClick={() => setBoostModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-white rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Selected Post Preview Snippet */}
            <div className="bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl p-3 flex gap-3 items-center">
              {selectedPost.fullPicture && (
                <img
                  src={selectedPost.fullPicture}
                  alt="Post preview"
                  className="w-14 h-14 object-cover rounded-lg shrink-0"
                />
              )}
              <div className="min-w-0 flex-1">
                <span className="text-[10px] text-emerald-400 font-mono block">
                  {language === 'en' ? '✓ Native Post (Likes/Shares Preserved)' : '✓ বিদ্যমান পোস্ট (লাইক/শেয়ার অক্ষত থাকবে)'}
                </span>
                <p className="text-xs text-zinc-800 dark:text-white line-clamp-2 mt-0.5">{selectedPost.message || 'Post without text'}</p>
              </div>
            </div>

            {/* Daily Budget Selector */}
            <div className="space-y-2">
              <label className="text-xs text-zinc-500 dark:text-zinc-400 font-medium block">
                {language === 'en' ? 'Daily Budget:' : 'দৈনিক বাজেট:'}
              </label>
              <div className="flex items-center gap-2">
                <span className="text-zinc-900 dark:text-white text-sm font-bold">{currencySymbol}</span>
                <input
                  type="number"
                  value={boostBudget}
                  onChange={(e) => setBoostBudget(Math.max(1, Number(e.target.value)))}
                  className="flex-1 bg-zinc-50 dark:bg-surface border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-brand-green placeholder:text-zinc-400 shadow-xs"
                />
              </div>

              {/* Quick Preset Chips */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {(balance?.currency === 'BDT' ? [300, 500, 1000, 2000, 5000] : [5, 10, 25, 50, 100]).map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setBoostBudget(amt)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-colors ${
                      boostBudget === amt
                        ? 'bg-brand-green text-white font-bold'
                        : 'bg-zinc-100 dark:bg-white/5 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-white/10'
                    }`}
                  >
                    {currencySymbol} {amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500 dark:text-zinc-400">{language === 'en' ? 'Duration:' : 'বিজ্ঞাপনের মেয়াদ:'}</span>
                <span className="text-zinc-900 dark:text-white font-bold">{boostDuration} {language === 'en' ? 'Days' : 'দিন'}</span>
              </div>
              <input
                type="range"
                min={1}
                max={30}
                value={boostDuration}
                onChange={(e) => setBoostDuration(Number(e.target.value))}
                className="w-full accent-brand-green cursor-pointer"
              />
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 flex justify-between">
                <span>1 Day</span>
                <span>Total: ~{currencySymbol} {(boostBudget * boostDuration).toLocaleString()}</span>
                <span>30 Days</span>
              </div>
            </div>

            {/* Audience Targeting */}
            <div className="space-y-3 pt-2 border-t border-zinc-200 dark:border-white/10">
              <span className="text-xs font-semibold text-zinc-900 dark:text-white flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-brand-green" />
                {language === 'en' ? 'Target Audience' : 'টার্গেট অডিয়েন্স'}
              </span>

              {/* Country */}
              <div>
                <label className="text-[11px] text-zinc-500 dark:text-zinc-400 block mb-1">
                  {language === 'en' ? 'Country (e.g. BD, US, IN):' : 'টার্গেট দেশ:'}
                </label>
                <input
                  type="text"
                  value={boostCountries}
                  onChange={(e) => setBoostCountries(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-surface border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white text-xs rounded-xl px-3 py-1.5 uppercase font-mono focus:outline-none focus:border-brand-green placeholder:text-zinc-400 shadow-xs"
                  placeholder="BD"
                />
              </div>

              {/* Age Range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-zinc-500 dark:text-zinc-400 block mb-1">Min Age:</label>
                  <input
                    type="number"
                    min={18}
                    max={65}
                    value={boostAgeMin}
                    onChange={(e) => setBoostAgeMin(Number(e.target.value))}
                    className="w-full bg-zinc-50 dark:bg-surface border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-brand-green placeholder:text-zinc-400 shadow-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-500 dark:text-zinc-400 block mb-1">Max Age:</label>
                  <input
                    type="number"
                    min={18}
                    max={65}
                    value={boostAgeMax}
                    onChange={(e) => setBoostAgeMax(Number(e.target.value))}
                    className="w-full bg-zinc-50 dark:bg-surface border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-brand-green placeholder:text-zinc-400 shadow-xs"
                  />
                </div>
              </div>

              {/* Gender */}
              <div>
                <label className="text-[11px] text-zinc-500 dark:text-zinc-400 block mb-1.5">Gender:</label>
                <div className="flex items-center gap-2">
                  {(['all', 'men', 'women'] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setBoostGender(g)}
                      className={`flex-1 py-1.5 rounded-xl text-xs capitalize transition-colors ${
                        boostGender === g
                          ? 'bg-brand-green text-white font-bold'
                          : 'bg-zinc-100 dark:bg-white/5 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-white/10'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Launch CTA */}
            <div className="pt-3 border-t border-zinc-200 dark:border-white/10 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setBoostModalOpen(false)}
                className="px-4 py-2 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
              >
                {language === 'en' ? 'Cancel' : 'বাতিল'}
              </button>
              <button
                type="button"
                onClick={handleLaunchBoost}
                disabled={launchingBoost}
                className="px-5 py-2.5 bg-brand-green hover:bg-brand-green/90 text-white font-semibold text-xs rounded-xl transition-all shadow-lg shadow-brand-green/20 flex items-center gap-2 disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 text-brand-orange" />
                {launchingBoost
                  ? (language === 'en' ? 'Launching Ad on Meta...' : 'মেটাতে বিজ্ঞাপন লাইভ হচ্ছে...')
                  : (language === 'en' ? 'Launch Ad on Meta Now' : 'এখনই মেটাতে বিজ্ঞাপন লাইভ করুন')}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* MODAL 1: COMPREHENSIVE AI CAMPAIGN TELEMETRY & DIAGNOSIS MODAL */}
      {/* ========================================================================= */}
      {aiAnalysisModalOpen && aiAnalysisResult && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-zinc-200 dark:border-white/15 rounded-2xl max-w-2xl w-full p-5 sm:p-6 space-y-5 shadow-2xl relative my-8 max-h-[90vh] overflow-y-auto text-zinc-900 dark:text-white">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-zinc-200 dark:border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-brand-green/20 text-emerald-600 dark:text-emerald-400">
                    <Bot className="w-5 h-5 text-brand-orange" />
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white">
                    {language === 'en' ? 'AI Campaign Telemetry & Full Diagnosis' : 'এআই ক্যাম্পেইন টেলিমেট্রি ও সার্বিক ডায়াগনোসিস'}
                  </h3>
                </div>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 font-semibold">
                    {language === 'en' ? '✓ 1 AI Response Credit Deducted' : '✓ ১টি এআই রেসপন্স ক্রেডিট ব্যবহার হয়েছে'}
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-[240px] font-mono">
                    {aiAnalysisResult.campaignName}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setAiAnalysisModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Health Score & Performance Bar */}
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-surface/90 border border-zinc-200 dark:border-white/10 flex items-center justify-between gap-4">
              <div>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 block">
                  {language === 'en' ? 'Campaign Health Score' : 'ক্যাম্পেইন হেলথ স্কোর'}
                </span>
                <span className="text-xs font-semibold text-zinc-900 dark:text-white mt-0.5 block">
                  {aiAnalysisResult.aiDiagnosis.healthScore >= 75
                    ? (language === 'en' ? '🌟 High Efficiency' : '🌟 দারুণ পারফরম্যান্স')
                    : aiAnalysisResult.aiDiagnosis.healthScore >= 50
                    ? (language === 'en' ? '⚡ Moderate / Optimization Opportunity' : '⚡ মধ্যম / অপটিমাইজেশন প্রয়োজন')
                    : (language === 'en' ? '⚠️ Underperforming / High CPC' : '⚠️ আশঙ্কাজনক / অতিরিক্ত খরচ')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-2xl sm:text-3xl font-extrabold font-mono ${
                  aiAnalysisResult.aiDiagnosis.healthScore >= 75 ? 'text-emerald-600 dark:text-emerald-400' : aiAnalysisResult.aiDiagnosis.healthScore >= 50 ? 'text-brand-orange' : 'text-red-500'
                }`}>
                  {aiAnalysisResult.aiDiagnosis.healthScore}
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">/ 100</span>
              </div>
            </div>

            {/* 7-Day Live Telemetry Grid */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-zinc-900 dark:text-white flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-brand-green" />
                {language === 'en' ? '7-Day Live Meta Telemetry & Events' : 'বিগত ৭ দিনের মেটা টেলিমেট্রি ও ফলাফল'}
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-surface border border-zinc-200 dark:border-white/5 text-center">
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block">Impressions</span>
                  <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white font-mono">
                    {aiAnalysisResult.telemetry.impressions.toLocaleString()}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-surface border border-zinc-200 dark:border-white/5 text-center">
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block">Clicks</span>
                  <span className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    {aiAnalysisResult.telemetry.clicks.toLocaleString()}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-surface border border-zinc-200 dark:border-white/5 text-center">
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block">CTR / CPC</span>
                  <span className="text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400 font-mono">
                    {aiAnalysisResult.telemetry.ctr}% / ${aiAnalysisResult.telemetry.cpc}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-surface border border-zinc-200 dark:border-white/5 text-center">
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block">Spend</span>
                  <span className="text-xs sm:text-sm font-bold text-brand-orange font-mono">
                    {currencySymbol} {aiAnalysisResult.telemetry.spend}
                  </span>
                </div>
              </div>

              {/* Conversion Events Highlights */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 block font-medium">💬 Messages</span>
                  <span className="text-xs font-bold text-blue-700 dark:text-blue-300 font-mono">
                    {aiAnalysisResult.telemetry.messagesStarted || 0}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-center">
                  <span className="text-[10px] text-purple-600 dark:text-purple-400 block font-medium">🎯 Leads</span>
                  <span className="text-xs font-bold text-purple-700 dark:text-purple-300 font-mono">
                    {aiAnalysisResult.telemetry.leads || 0}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-medium">🛍️ Purchases</span>
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 font-mono">
                    {aiAnalysisResult.telemetry.purchases || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* AI Diagnosis Summary */}
            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-surface border border-zinc-200 dark:border-white/5 space-y-1.5">
              <span className="text-xs font-semibold text-zinc-900 dark:text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-brand-orange" />
                {language === 'en' ? 'AI Diagnostic Evaluation' : 'এআই ডায়াগনস্টিক রিপোর্ট'}
              </span>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                {language === 'en' ? aiAnalysisResult.aiDiagnosis.diagnosis : aiAnalysisResult.aiDiagnosis.diagnosisBn}
              </p>
            </div>

            {/* MULTI-SECTION OPTIMIZATION CARDS */}
            <div className="space-y-3">
              {/* SECTION A: AUDIENCE & TARGETING OPTIMIZATION */}
              {aiAnalysisResult.aiDiagnosis.targetingOptimization && (
                <div className="p-3.5 rounded-xl bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-blue-500" />
                      {language === 'en' ? 'Audience & Targeting Optimization' : 'অডিয়েন্স ও টার্গেটিং অপটিমাইজেশন'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const t = aiAnalysisResult.aiDiagnosis.targetingOptimization!;
                        setAiAnalysisModalOpen(false);
                        setConfirmModalData({
                          type: 'AI_RECOMMENDATION',
                          campaignId: aiAnalysisResult.campaignId,
                          campaignName: aiAnalysisResult.campaignName,
                          actionType: 'UPDATE_TARGETING',
                          targeting: {
                            countries: t.suggestedCountries,
                            ageMin: t.suggestedAgeMin,
                            ageMax: t.suggestedAgeMax,
                            genders: t.suggestedGenders,
                            interests: t.suggestedInterests,
                          },
                          suggestedTargeting: {
                            geo_locations: { countries: t.suggestedCountries },
                            age_min: t.suggestedAgeMin,
                            age_max: t.suggestedAgeMax,
                            interests: t.suggestedInterests,
                          },
                          quotaCost: 2,
                          summaryEn: `Apply refined audience targeting: Age ${t.suggestedAgeMin}-${t.suggestedAgeMax}, Countries: ${t.suggestedCountries?.join(', ')}.`,
                          summaryBn: `এআই প্রস্তাবিত নতুন অডিয়েন্স অ্যাপ্লাই করুন: বয়স ${t.suggestedAgeMin}-${t.suggestedAgeMax}, দেশ: ${t.suggestedCountries?.join(', ')}।`,
                        });
                      }}
                      className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold transition-colors shadow-sm flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" />
                      {language === 'en' ? 'Apply Audience Targeting' : 'অডিয়েন্স অ্যাপ্লাই করুন'}
                    </button>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                    {language === 'en' ? aiAnalysisResult.aiDiagnosis.targetingOptimization.evaluation : aiAnalysisResult.aiDiagnosis.targetingOptimization.evaluationBn}
                  </p>
                  <div className="flex flex-wrap gap-1.5 text-[10px] font-mono pt-1">
                    <span className="px-2 py-0.5 rounded bg-white dark:bg-black/30 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                      Countries: {aiAnalysisResult.aiDiagnosis.targetingOptimization.suggestedCountries?.join(', ') || 'BD'}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-white dark:bg-black/30 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                      Age: {aiAnalysisResult.aiDiagnosis.targetingOptimization.suggestedAgeMin}-{aiAnalysisResult.aiDiagnosis.targetingOptimization.suggestedAgeMax}
                    </span>
                    {aiAnalysisResult.aiDiagnosis.targetingOptimization.suggestedInterests?.length > 0 && (
                      <span className="px-2 py-0.5 rounded bg-white dark:bg-black/30 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                        Interests: {aiAnalysisResult.aiDiagnosis.targetingOptimization.suggestedInterests.join(', ')}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* SECTION B: CREATIVE & COPY OPTIMIZATION */}
              {aiAnalysisResult.aiDiagnosis.creativeOptimization && (
                <div className="p-3.5 rounded-xl bg-purple-500/5 dark:bg-purple-500/10 border border-purple-500/20 space-y-2">
                  <span className="text-xs font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                    {language === 'en' ? 'Creative & Ad Copy Recommendations' : 'ক্রিয়েটিভ ও কপি অপটিমাইজেশন'}
                  </span>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                    {language === 'en' ? aiAnalysisResult.aiDiagnosis.creativeOptimization.evaluation : aiAnalysisResult.aiDiagnosis.creativeOptimization.evaluationBn}
                  </p>
                  {aiAnalysisResult.aiDiagnosis.creativeOptimization.suggestedHeadlines?.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wide block">
                        {language === 'en' ? 'Suggested Hooks / Headlines:' : 'প্রস্তাবিত হেডলাইনসমূহ:'}
                      </span>
                      {aiAnalysisResult.aiDiagnosis.creativeOptimization.suggestedHeadlines.map((hl, i) => (
                        <p key={i} className="text-xs text-zinc-700 dark:text-zinc-200 pl-2 border-l-2 border-purple-400 font-medium">
                          • {hl}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* SECTION C: BUDGET SCALING & OPTIMIZATION */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-brand-green/10 via-surface to-brand-orange/10 border border-brand-green/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-emerald-500" />
                    {language === 'en' ? 'Recommended Budget Action' : 'প্রস্তাবিত বাজেট পরিবর্তন'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-brand-green/20 text-emerald-700 dark:text-emerald-300 border border-brand-green/30">
                    {aiAnalysisResult.aiDiagnosis.recommendedAction.replace(/_/g, ' ')}
                  </span>
                </div>

                {aiAnalysisResult.aiDiagnosis.suggestedScalingPercent && (
                  <div className="text-xs text-zinc-900 dark:text-white">
                    <span className="text-zinc-500 dark:text-zinc-400">{language === 'en' ? 'Suggested Budget Scaling: ' : 'প্রস্তাবিত বাজেট স্কেলিং: '}</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      {aiAnalysisResult.aiDiagnosis.suggestedScalingPercent > 0 ? `+${aiAnalysisResult.aiDiagnosis.suggestedScalingPercent}%` : `${aiAnalysisResult.aiDiagnosis.suggestedScalingPercent}%`}
                    </span>
                    {aiAnalysisResult.aiDiagnosis.suggestedNewBudget > 0 && (
                      <span className="ml-2 text-zinc-500 dark:text-zinc-400 font-mono">
                        (➔ {currencySymbol} {aiAnalysisResult.aiDiagnosis.suggestedNewBudget}/day)
                      </span>
                    )}
                  </div>
                )}

                <p className="text-xs text-zinc-600 dark:text-zinc-400 italic pt-1">
                  {language === 'en' ? aiAnalysisResult.aiDiagnosis.rationale : aiAnalysisResult.aiDiagnosis.rationaleBn}
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-3 border-t border-zinc-200 dark:border-white/10">
              <button
                type="button"
                onClick={() => setAiAnalysisModalOpen(false)}
                className="w-full sm:w-auto px-4 py-2 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-900 dark:hover:text-white transition-colors"
              >
                {language === 'en' ? 'Close' : 'বন্ধ করুন'}
              </button>

              {aiAnalysisResult.aiDiagnosis.recommendedAction && (
                <button
                  type="button"
                  onClick={() => {
                    const res = aiAnalysisResult;
                    setAiAnalysisModalOpen(false);
                    setConfirmModalData({
                      type: 'AI_RECOMMENDATION',
                      campaignId: res.campaignId,
                      campaignName: res.campaignName,
                      actionType: res.aiDiagnosis.recommendedAction,
                      scalingPercentage: res.aiDiagnosis.suggestedScalingPercent,
                      percentage: res.aiDiagnosis.suggestedScalingPercent,
                      currentBudget: res.currentDailyBudget,
                      targetBudget: res.aiDiagnosis.suggestedNewBudget,
                      newDailyBudget: res.aiDiagnosis.suggestedNewBudget,
                      targeting: res.aiDiagnosis.suggestedTargeting,
                      suggestedTargeting: res.aiDiagnosis.suggestedTargeting,
                      quotaCost: 2
                    });
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-brand-green to-emerald-600 hover:opacity-95 text-white font-semibold text-xs rounded-xl transition-all shadow-lg shadow-brand-green/20 flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-brand-orange" />
                  <span>{language === 'en' ? 'Apply AI Budget Optimization' : 'এআই বাজেট অপটিমাইজেশন অ্যাপ্লাই'}</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-black/30 rounded font-mono text-emerald-200">
                    2 AI Credits
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT CAMPAIGN MODAL (NAME, STATUS, BUDGET, TARGETING) */}
      {/* ========================================================================= */}
      {editCampaignModalOpen && editingCampaign && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-zinc-200 dark:border-white/15 rounded-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl relative my-8 max-h-[90vh] overflow-y-auto text-zinc-900 dark:text-white">
            <div className="flex items-start justify-between gap-3 border-b border-zinc-200 dark:border-white/10 pb-3">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Edit className="w-4 h-4 text-brand-green" />
                  {language === 'en' ? 'Edit Campaign Details' : 'ক্যাম্পেইনের তথ্য পরিবর্তন করুন'}
                </h3>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                  ID: {editingCampaign.id}
                </span>
              </div>
              <button
                onClick={() => setEditCampaignModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Campaign Name */}
              <div>
                <label className="text-zinc-600 dark:text-zinc-400 font-semibold block mb-1">
                  {language === 'en' ? 'Campaign Name' : 'ক্যাম্পেইনের নাম'}
                </label>
                <input
                  type="text"
                  value={editCampName}
                  onChange={(e) => setEditCampName(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-surface border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-brand-green"
                />
              </div>

              {/* Status & Daily Budget */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-600 dark:text-zinc-400 font-semibold block mb-1">
                    {language === 'en' ? 'Status' : 'স্ট্যাটাস'}
                  </label>
                  <select
                    value={editCampStatus}
                    onChange={(e) => setEditCampStatus(e.target.value as any)}
                    className="w-full bg-zinc-50 dark:bg-surface border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-brand-green"
                  >
                    <option value="ACTIVE">{language === 'en' ? 'Active' : 'সক্রিয়'}</option>
                    <option value="PAUSED">{language === 'en' ? 'Paused' : 'বন্ধ'}</option>
                  </select>
                </div>

                <div>
                  <label className="text-zinc-600 dark:text-zinc-400 font-semibold block mb-1">
                    {language === 'en' ? `Daily Budget (${currencySymbol})` : `দৈনিক বাজেট (${currencySymbol})`}
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={editCampBudget}
                    onChange={(e) => setEditCampBudget(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-zinc-50 dark:bg-surface border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white text-xs rounded-xl px-3 py-2 font-mono focus:outline-none focus:border-brand-green"
                  />
                </div>
              </div>

              {/* Audience Targeting */}
              <div className="pt-2 border-t border-zinc-200 dark:border-white/10 space-y-3">
                <span className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-brand-green" />
                  {language === 'en' ? 'Audience Targeting' : 'টার্গেট অডিয়েন্স'}
                </span>

                <div>
                  <label className="text-[11px] text-zinc-600 dark:text-zinc-400 block mb-1">
                    {language === 'en' ? 'Countries (e.g. BD, US):' : 'টার্গেট দেশ:'}
                  </label>
                  <input
                    type="text"
                    value={editCampCountries}
                    onChange={(e) => setEditCampCountries(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-surface border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white text-xs rounded-xl px-3 py-1.5 uppercase font-mono focus:outline-none focus:border-brand-green"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-zinc-600 dark:text-zinc-400 block mb-1">Min Age:</label>
                    <input
                      type="number"
                      min={18}
                      max={65}
                      value={editCampAgeMin}
                      onChange={(e) => setEditCampAgeMin(Number(e.target.value))}
                      className="w-full bg-zinc-50 dark:bg-surface border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-brand-green"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-600 dark:text-zinc-400 block mb-1">Max Age:</label>
                    <input
                      type="number"
                      min={18}
                      max={65}
                      value={editCampAgeMax}
                      onChange={(e) => setEditCampAgeMax(Number(e.target.value))}
                      className="w-full bg-zinc-50 dark:bg-surface border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-brand-green"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-zinc-600 dark:text-zinc-400 block mb-1">Gender:</label>
                  <div className="flex items-center gap-2">
                    {(['all', 'men', 'women'] as const).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setEditCampGender(g)}
                        className={`flex-1 py-1.5 rounded-xl text-xs capitalize transition-colors ${
                          editCampGender === g
                            ? 'bg-brand-green text-white font-bold'
                            : 'bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-400'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-zinc-600 dark:text-zinc-400 block mb-1">
                    {language === 'en' ? 'Detailed Interests (comma separated):' : 'আগ্রহ ও বিষয়ভিত্তিক টার্গেটিং:'}
                  </label>
                  <input
                    type="text"
                    value={editCampInterests}
                    onChange={(e) => setEditCampInterests(e.target.value)}
                    placeholder="e.g. Online shopping, Fashion"
                    className="w-full bg-zinc-50 dark:bg-surface border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-brand-green"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-200 dark:border-white/10 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setEditCampaignModalOpen(false)}
                className="px-4 py-2 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-900 dark:hover:text-white transition-colors"
              >
                {language === 'en' ? 'Cancel' : 'বাতিল'}
              </button>
              <button
                type="button"
                onClick={handleSaveCampaignEdit}
                disabled={savingCampaignEdit}
                className="px-5 py-2.5 bg-brand-green hover:bg-brand-green/90 text-white font-semibold text-xs rounded-xl transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
              >
                {savingCampaignEdit ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                    <span>{language === 'en' ? 'Saving to Meta...' : 'মেটাতে সেভ হচ্ছে...'}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    <span>{language === 'en' ? 'Save Changes to Meta' : 'পরিবর্তনগুলো মেটাতে সেভ করুন'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: AI AUDIENCE RE-TARGETING ASSISTANT MODAL (1 AI CREDIT) */}
      {/* ========================================================================= */}
      {retargetModalOpen && retargetingCampaign && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-zinc-200 dark:border-white/15 rounded-2xl max-w-xl w-full p-5 sm:p-6 space-y-4 shadow-2xl relative my-8 max-h-[90vh] overflow-y-auto text-zinc-900 dark:text-white">
            <div className="flex items-start justify-between gap-3 border-b border-zinc-200 dark:border-white/10 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-blue-500/20 text-blue-600 dark:text-blue-400">
                    <Users className="w-4 h-4" />
                  </span>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                    {language === 'en' ? 'AI Audience Re-Targeting Assistant' : 'এআই অডিয়েন্স রি-টার্গেটিং অ্যাসিস্ট্যান্ট'}
                  </h3>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/25 font-semibold">
                    {language === 'en' ? 'Costs 1 AI Response Credit' : '১টি এআই রেসপন্স ক্রেডিট কর্তন হবে'}
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono truncate max-w-[200px]">
                    {retargetingCampaign.name}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setRetargetModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Explanatory Info Card */}
            <div className="p-3.5 rounded-xl bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 text-xs text-blue-700 dark:text-blue-300">
              <p className="leading-relaxed">
                {language === 'en'
                  ? 'If your ads are attracting casual viewers, students, or unqualified leads who don’t convert, describe the problem below. Our AI will formulate high-intent targeting parameters tailored to genuine buyers.'
                  : 'বিজ্ঞাপনে যদি অপ্রয়োজনীয় মেসেজ, বয়সে ছোট বা কেনাকাটায় অনাগ্রহী মানুষদের মেসেজ আসে, তবে নিচের ঘরে সমস্যাটি লিখুন। এআই প্রকৃত ক্রেতাদের খুঁজে পেতে সঠিক টার্গেটিং সাজিয়ে দেবে।'}
              </p>
            </div>

            {/* Inputs */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-zinc-700 dark:text-zinc-300 font-semibold block mb-1">
                  {language === 'en' ? 'Describe the Current Problem *' : 'বর্তমান সমস্যাটি বিস্তারিত লিখুন *'}
                </label>
                <textarea
                  rows={3}
                  value={retargetProblemDesc}
                  onChange={(e) => setRetargetProblemDesc(e.target.value)}
                  placeholder={language === 'en'
                    ? 'e.g. Too many college students are messaging asking for free samples or extreme discounts. We want professional working women aged 26-45 who can afford premium jewelry.'
                    : 'যেমন: প্রচুর অপ্রয়োজনীয় মেসেজ আসছে যারা শুধু দাম জিজ্ঞেস করে চলে যায়। আমরা ২৫-৪৫ বছর বয়সী চাকরিজীবী ও ব্যবসায়ী ক্রেতাদের টার্গেট করতে চাই।'
                  }
                  className="w-full bg-zinc-50 dark:bg-surface border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white text-xs rounded-xl p-3 focus:outline-none focus:border-brand-green resize-none leading-relaxed"
                />
              </div>

              <div>
                <label className="text-zinc-700 dark:text-zinc-300 font-semibold block mb-1">
                  {language === 'en' ? 'Target Buyer Persona (Optional)' : 'আদর্শ ক্রেতার পরিচয় (ঐচ্ছিক)'}
                </label>
                <input
                  type="text"
                  value={retargetBuyerPersona}
                  onChange={(e) => setRetargetBuyerPersona(e.target.value)}
                  placeholder={language === 'en' ? 'e.g. High income professionals in Dhaka & Chittagong' : 'যেমন: ঢাকা ও চট্টগ্রামের উচ্চ মধ্যবিত্ত পেশাজীবী'}
                  className="w-full bg-zinc-50 dark:bg-surface border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-brand-green"
                />
              </div>

              <button
                type="button"
                onClick={handleRunRetargetAi}
                disabled={loadingRetargetAi || !retargetProblemDesc.trim()}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
              >
                {loadingRetargetAi ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>{language === 'en' ? 'Analyzing Audience with AI (1 Credit)...' : 'এআই বিশ্লেষণ চলছে (১টি ক্রেডিট)...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>{language === 'en' ? 'Formulate Refined Targeting (Costs 1 AI Credit)' : 'এআই দিয়ে নতুন টার্গেটিং তৈরি করুন (১টি ক্রেডিট)'}</span>
                  </>
                )}
              </button>
            </div>

            {/* Retarget AI Results Card */}
            {retargetAiResult && (
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-surface/80 border border-zinc-200 dark:border-white/10 space-y-3 animate-in fade-in text-xs">
                <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  {language === 'en' ? 'AI Proposed Refined Targeting:' : 'এআই প্রস্তাবিত নতুন টার্গেটিং:'}
                </span>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="p-2 rounded bg-white dark:bg-black/30 border border-zinc-200 dark:border-white/5">
                    <span className="text-zinc-500 dark:text-zinc-400 block">Age Range:</span>
                    <strong className="text-zinc-900 dark:text-white">
                      {retargetAiResult.suggestedTargeting?.ageMin} - {retargetAiResult.suggestedTargeting?.ageMax} Years
                    </strong>
                  </div>
                  <div className="p-2 rounded bg-white dark:bg-black/30 border border-zinc-200 dark:border-white/5">
                    <span className="text-zinc-500 dark:text-zinc-400 block">Countries:</span>
                    <strong className="text-zinc-900 dark:text-white">
                      {retargetAiResult.suggestedTargeting?.countries?.join(', ') || 'BD'}
                    </strong>
                  </div>
                </div>

                {retargetAiResult.suggestedTargeting?.interests?.length > 0 && (
                  <div className="text-[11px]">
                    <span className="text-zinc-500 dark:text-zinc-400 font-semibold block mb-1">
                      {language === 'en' ? 'High-Intent Interests:' : 'উচ্চ আগ্রহের কিওয়ার্ড:'}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {retargetAiResult.suggestedTargeting.interests.map((it: string, idx: number) => (
                        <span key={idx} className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-mono text-[10px] border border-emerald-500/20">
                          {it}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed italic border-t border-zinc-200 dark:border-white/10 pt-2">
                  💡 {language === 'en' ? retargetAiResult.rationale : retargetAiResult.rationaleBn}
                </p>

                <button
                  type="button"
                  onClick={handleApplyRetargetingToCampaign}
                  className="w-full py-2.5 px-4 bg-brand-green hover:bg-brand-green/90 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>{language === 'en' ? 'Apply This Targeting to Live Campaign' : 'লাইভ ক্যাম্পেইনে এই টার্গেটিং যুক্ত করুন'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: 2-STEP CONFIRMATION POPUP (NO BLIND IMMEDIATE SCALING) */}
      {/* ========================================================================= */}
      {confirmModalData && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-zinc-200 dark:border-white/15 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl relative animate-in fade-in zoom-in duration-150 text-zinc-900 dark:text-white">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-zinc-200 dark:border-white/10 pb-4">
              <span className="p-2 rounded-xl bg-brand-orange/20 text-brand-orange">
                <AlertCircle className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  {language === 'en' ? 'Confirm Action on Meta' : 'মেটাতে অ্যাকশন নিশ্চিত করুন'}
                </h3>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {confirmModalData.campaignName}
                </span>
              </div>
            </div>

            {/* Action Details */}
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-slate-800/60 border border-zinc-200 dark:border-white/10 space-y-2.5 text-xs">
              {confirmModalData.type === 'SCALE_BUDGET' ? (
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400 block mb-1">
                    {language === 'en' ? 'Budget Adjustment:' : 'বাজেট পরিবর্তন:'}
                  </span>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-zinc-900 dark:text-white font-bold">{currencySymbol} {confirmModalData.currentBudget}</span>
                    <span className="text-zinc-500 dark:text-zinc-400">➔</span>
                    <span className={`font-bold ${
                      (confirmModalData.scalingPercentage || 0) > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
                    }`}>
                      {currencySymbol} {confirmModalData.targetBudget} ({(confirmModalData.scalingPercentage || 0) > 0 ? `+${confirmModalData.scalingPercentage}%` : `${confirmModalData.scalingPercentage}%`})
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <span className="text-zinc-500 dark:text-zinc-400 block">
                    {language === 'en' ? 'AI Optimization Action:' : 'এআই অপটিমাইজেশন পদক্ষেপ:'}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-brand-green/20 text-emerald-700 dark:text-emerald-300 border border-brand-green/30 inline-block">
                    {confirmModalData.actionType?.replace(/_/g, ' ')}
                  </span>
                  {confirmModalData.scalingPercentage && (
                    <div className="text-zinc-500 dark:text-zinc-400 text-[11px] pt-1">
                      Scaling Daily Budget by <span className="font-bold text-zinc-900 dark:text-white font-mono">{confirmModalData.scalingPercentage > 0 ? `+${confirmModalData.scalingPercentage}%` : `${confirmModalData.scalingPercentage}%`}</span>
                    </div>
                  )}
                  {confirmModalData.targeting && (
                    <div className="text-zinc-500 dark:text-zinc-400 text-[11px] pt-1 font-mono">
                      Targeting: Age {confirmModalData.targeting.ageMin}-{confirmModalData.targeting.ageMax}, Countries: {confirmModalData.targeting.countries?.join(', ')}
                    </div>
                  )}
                </div>
              )}

              {/* Quota Notice Banner */}
              {confirmModalData.quotaCost ? (
                <div className="p-2.5 rounded-lg bg-brand-orange/15 border border-brand-orange/30 text-amber-700 dark:text-brand-orange text-[11px] flex items-center gap-2 mt-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-brand-orange" />
                  <span>
                    {language === 'en'
                      ? `⚠️ Executing this optimization will deduct ${confirmModalData.quotaCost} AI Response Credits from your quota.`
                      : `⚠️ এই অপটিমাইজেশনটি সম্পন্ন করতে আপনার কোটা থেকে ${confirmModalData.quotaCost}টি এআই রেসপন্স ক্রেডিট কাটা হবে।`}
                  </span>
                </div>
              ) : (
                <div className="p-2.5 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-700 dark:text-blue-300 text-[11px] flex items-center gap-2 mt-2">
                  <HelpCircle className="w-4 h-4 shrink-0" />
                  <span>
                    {language === 'en'
                      ? 'This will immediately update the live adset budget on Meta Graph API.'
                      : 'এটি অবিলম্বে মেটা গ্রাফ এপিআইতে লাইভ অ্যাডসেট বাজেট আপডেট করবে।'}
                  </span>
                </div>
              )}
            </div>

            {/* CTAs */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModalData(null)}
                disabled={applyingAiAction}
                className="px-4 py-2 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-900 dark:hover:text-white transition-colors disabled:opacity-50"
              >
                {language === 'en' ? 'Cancel' : 'বাতিল'}
              </button>
              <button
                type="button"
                onClick={handleApplyConfirmedAction}
                disabled={applyingAiAction}
                className="px-5 py-2.5 bg-brand-green hover:bg-brand-green/90 text-white font-semibold text-xs rounded-xl transition-all shadow-lg shadow-brand-green/20 flex items-center gap-2 disabled:opacity-50"
              >
                {applyingAiAction ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                    <span>{language === 'en' ? 'Applying to Meta...' : 'মেটাতে আপডেট হচ্ছে...'}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    <span>{language === 'en' ? 'Confirm & Apply on Meta' : 'নিশ্চিত করুন ও মেটাতে অ্যাপ্লাই করুন'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
