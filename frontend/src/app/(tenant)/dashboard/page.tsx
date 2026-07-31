'use client';

import { useState, useEffect, useMemo } from 'react';
import Cookies from 'js-cookie';
import Link from 'next/link';
import { useLanguage } from '@/components/LanguageProvider';
import { useCurrency } from '@/components/CurrencyProvider';
import SetupJourneyWidget from '@/components/SetupJourneyWidget';
import toast from 'react-hot-toast';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import {
  MessageSquare, Bot, Users, ShoppingCart, Crown, Package, Activity,
  TrendingUp, RefreshCw, Zap, ShieldCheck,
  DollarSign, Search, Sparkles, Filter,
  PhoneCall, ArrowUpRight, ArrowDownRight, Target,
  Globe, Check, CheckCheck, Clock, AlertCircle, Calendar, Headphones
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const DONUT_COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4'];

export default function ExecutiveDashboardPage() {
  const { language } = useLanguage();
  const { formatNumber } = useCurrency();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [chartData, setChartData] = useState<any>(null);
  const [setupStatus, setSetupStatus] = useState<any>(null);

  // Dynamic user & tenant profile state
  const [user, setUser] = useState<any>(null);
  const [companyName, setCompanyName] = useState<string>('ZiniChat Business');

  // Filters: YouTube Analytics style
  const [range, setRange] = useState<string>('30d');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [customOpen, setCustomOpen] = useState(false);

  // Table search
  const [recentConvs, setRecentConvs] = useState<any[]>([]);
  const [recentLeads, setRecentLeads] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [convSearch, setConvSearch] = useState('');
  const [leadSearch, setLeadSearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');

  // Fetch logged in user profile dynamically
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = Cookies.get('access_token');
        if (!token) return;
        const res = await fetch(`${API}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
          if (userData.name) Cookies.set('user_name', userData.name);
          if (userData.tenant?.name || userData.tenant?.businessName) {
            const comp = userData.tenant.name || userData.tenant.businessName;
            setCompanyName(comp);
            Cookies.set('company_name', comp);
          }
        }
      } catch (e) {
        console.error('Failed to fetch user profile', e);
      }
    };
    fetchUser();
  }, []);

  // Fetch all dashboard data dynamically
  const fetchAllData = async (selectedRange = range, sDate = startDate, eDate = endDate) => {
    setLoading(true);
    try {
      const token = Cookies.get('access_token');
      const headers = { Authorization: `Bearer ${token}` };

      let queryStr = `range=${selectedRange}`;
      if (selectedRange === 'custom' && sDate && eDate) {
        queryStr += `&startDate=${sDate}&endDate=${eDate}`;
      }

      const [overviewRes, chartRes, setupRes, convsRes, leadsRes, ordersRes] = await Promise.all([
        fetch(`${API}/stats/tenant/dashboard?${queryStr}`, { headers }),
        fetch(`${API}/stats/tenant/charts?${queryStr}`, { headers }),
        fetch(`${API}/auth/setup-status`, { headers }),
        fetch(`${API}/stats/tenant/conversations/recent?page=1&limit=6`, { headers }),
        fetch(`${API}/stats/tenant/leads/recent?page=1&limit=6`, { headers }),
        fetch(`${API}/stats/tenant/orders/recent?page=1&limit=6`, { headers }),
      ]);

      if (overviewRes.ok) setData(await overviewRes.json());
      if (chartRes.ok) setChartData(await chartRes.json());
      if (setupRes.ok) setSetupStatus(await setupRes.json());
      if (convsRes.ok) { const res = await convsRes.json(); setRecentConvs(res.data || []); }
      if (leadsRes.ok) { const res = await leadsRes.json(); setRecentLeads(res.data || []); }
      if (ordersRes.ok) { const res = await ordersRes.json(); setRecentOrders(res.data || []); }

    } catch (err) {
      console.error('Failed to load executive dashboard', err);
      toast.error('Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleRangeChange = (newRange: string) => {
    setRange(newRange);
    if (newRange !== 'custom') {
      setCustomOpen(false);
      fetchAllData(newRange, '', '');
    } else {
      setCustomOpen(true);
    }
  };

  const handleCustomApply = () => {
    if (!startDate || !endDate) {
      toast.error('Please select both Start and End dates');
      return;
    }
    setCustomOpen(false);
    fetchAllData('custom', startDate, endDate);
  };

  // Filtered tables
  const filteredConvs = useMemo(() => {
    if (!convSearch) return recentConvs;
    return recentConvs.filter(c => c.contactName?.toLowerCase().includes(convSearch.toLowerCase()) || c.lastMessage?.toLowerCase().includes(convSearch.toLowerCase()));
  }, [recentConvs, convSearch]);

  const filteredOrders = useMemo(() => {
    if (!orderSearch) return recentOrders;
    return recentOrders.filter(o => o.customerName?.toLowerCase().includes(orderSearch.toLowerCase()) || o.productName?.toLowerCase().includes(orderSearch.toLowerCase()));
  }, [recentOrders, orderSearch]);

  const userName = user?.name || Cookies.get('user_name') || (language === 'en' ? 'User' : 'ব্যবহারকারী');
  const compName = companyName || Cookies.get('company_name') || 'ZiniChat Business';

  const hasAnyChannel = data?.features?.some((f: string) => ['whatsapp', 'messenger', 'instagram_dm', 'whatsapp_qr'].includes(f));
  const isSetupPending = setupStatus && (!setupStatus.hasBusinessProfile || (hasAnyChannel && !setupStatus.hasConnectedChannel));

  if (loading && !data) {
    return (
      <div className="max-w-[1600px] mx-auto p-4 space-y-6 animate-pulse">
        <div className="h-16 bg-surface-hover/50 rounded-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-36 bg-surface-hover/40 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const sub = data?.subscriptionHealth || {};
  const health = data?.healthScore || {};
  const crm = data?.crm || {};
  const orders = data?.orders || {};
  const openConvs = kpis.conversations?.open || 0;
  const unreadConvs = kpis.conversations?.unread || 0;


  // Construct Bilingual AI Executive Summary (Strictly for TODAY, independent of date filter)
  const aiSummaryText = language === 'bn'
    ? (data?.todaySummaryBn || [
        `আজ এআই ${formatNumber(kpis.ai?.today ? Math.round((kpis.ai.today / Math.max(1, kpis.messages?.today || 1)) * 100) : 0)}% মেসেজ স্বয়ংক্রিয়ভাবে উত্তর দিয়েছে।`,
        `আজ মোট ${formatNumber(kpis.messages?.today || 0)}টি মেসেজ আদান-প্রদান হয়েছে।`,
        openConvs > 0
          ? `${formatNumber(openConvs)}টি ইনবক্স কনভারসেশন ওপেন আছে (${unreadConvs > 0 ? `${formatNumber(unreadConvs)}টি অপঠিত 🔴` : 'সব পঠিত 🟢'})।`
          : 'কোনো ওপেন ইনবক্স মেসেজ পেন্ডিং নেই 🟢'
      ].filter(Boolean).join(' '))
    : (data?.todaySummaryEn || [
        `AI handled ${kpis.ai?.today ? Math.round((kpis.ai.today / Math.max(1, kpis.messages?.today || 1)) * 100) : 0}% of messages today automatically.`,
        openConvs > 0
          ? `${openConvs} conversations currently open (${unreadConvs > 0 ? `${unreadConvs} unread 🔴` : 'all read 🟢'}).`
          : 'All inbox messages are resolved 🟢'
      ].filter(Boolean).join(' '));


  return (
    <div className="max-w-[1600px] mx-auto space-y-6 p-2 sm:p-4 pb-16 animate-in fade-in duration-500 text-foreground">

      {/* INLINE GAMIFIED SETUP CHECKLIST BANNER */}
      <SetupJourneyWidget initialStatus={setupStatus} />

      {/* TOP HEADER: EXECUTIVE CONTROL BAR */}
      <div className="bg-surface/90 backdrop-blur-xl border border-surface-hover rounded-2xl p-4 sm:p-5 shadow-lg shadow-black/5 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        
        {/* Left Welcome Info (Fully Dynamic Name) */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-primary-foreground font-black text-xl shadow-lg shadow-primary/20 shrink-0">
            {compName.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-foreground">
                {language === 'en' ? 'Welcome back, ' : 'স্বাগতম, '}<span className="text-primary">{userName}</span>
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-primary/15 text-primary border border-primary/20 flex items-center gap-1">
                <Crown className="w-3 h-3 text-yellow-500" />
                {sub.planName || 'Pro Plan'}
              </span>
            </div>
            <p className="text-[12px] text-zinc-400 mt-0.5 flex items-center gap-2 flex-wrap">
              <span>{compName}</span>
              <span>•</span>
              <span className="text-zinc-400 font-medium">
                {new Date().toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </p>
          </div>
        </div>

        {/* Right Controls & Filter */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          
          {/* YouTube-Style Analytics Date Filter */}
          <div className="relative">
            <div className="bg-surface-hover/60 border border-surface-hover rounded-xl p-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-zinc-400 ml-2" />
              <select
                value={range}
                onChange={e => handleRangeChange(e.target.value)}
                className="bg-transparent text-[12px] font-bold text-foreground outline-none pr-3 py-1 cursor-pointer">
                <option value="today" className="bg-background">{language === 'en' ? 'Today' : 'আজ'}</option>
                <option value="7d" className="bg-background">{language === 'en' ? 'Last 7 Days' : 'গত ৭ দিন'}</option>
                <option value="15d" className="bg-background">{language === 'en' ? 'Last 15 Days' : 'গত ১৫ দিন'}</option>
                <option value="30d" className="bg-background">{language === 'en' ? 'Last 30 Days' : 'গত ৩০ দিন'}</option>
                <option value="90d" className="bg-background">{language === 'en' ? 'Last 90 Days' : 'গত ৯০ দিন'}</option>
                <option value="this_month" className="bg-background">{language === 'en' ? 'This Month' : 'চলতি মাস'}</option>
                <option value="last_month" className="bg-background">{language === 'en' ? 'Last Month' : 'গত মাস'}</option>
                <option value="custom" className="bg-background">{language === 'en' ? 'Custom Range...' : 'কাস্টম ডেট...'}</option>
              </select>
            </div>

            {/* Custom Date Dropdown */}
            {customOpen && (
              <div className="absolute right-0 top-12 z-50 bg-surface/90 backdrop-blur-xl border border-surface-hover rounded-2xl p-4 shadow-2xl space-y-3 w-72">
                <div className="text-[12px] font-bold text-foreground">{language === 'en' ? 'Select Custom Date Range' : 'তারিখ সীমানা সিলেক্ট করুন'}</div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 block mb-1">Start Date</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-background border border-surface-hover rounded-lg px-2.5 py-1.5 text-xs" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 block mb-1">End Date</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-background border border-surface-hover rounded-lg px-2.5 py-1.5 text-xs" />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setCustomOpen(false)} className="px-3 py-1 rounded-lg text-xs text-zinc-400 hover:text-foreground">Cancel</button>
                  <button onClick={handleCustomApply} className="px-4 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-lg shadow-sm">Apply</button>
                </div>
              </div>
            )}
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => fetchAllData()}
            className="p-2 bg-surface-hover/60 border border-surface-hover hover:border-primary/40 rounded-xl text-zinc-400 hover:text-foreground transition-all">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Upgrade Button */}
          <Link
            href="/dashboard/settings/subscription"
            className="px-4 py-2 bg-gradient-to-r from-primary to-secondary text-primary-foreground text-xs font-bold rounded-xl shadow-lg shadow-primary/20 hover:opacity-95 transition-all flex items-center gap-1.5">
            <Crown className="w-3.5 h-3.5 text-yellow-300" />
            {language === 'en' ? 'Upgrade Plan' : 'আপগ্রেড করুন'}
          </Link>
        </div>
      </div>

      {/* AI EXECUTIVE SUMMARY BANNER (BILINGUAL SUPPORT) */}
      <div className="bg-gradient-to-r from-primary/15 via-purple-500/10 to-secondary/15 border border-primary/30 backdrop-blur-xl rounded-2xl p-4 sm:p-5 flex items-start gap-4 relative overflow-hidden shadow-sm">
        <div className="w-10 h-10 rounded-2xl bg-primary/20 text-primary flex items-center justify-center shrink-0 shadow-md">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-primary">
              {language === 'bn' ? 'আজকের এআই সামারি' : "Today's AI Executive Summary"}
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <p className="text-[13px] font-semibold text-foreground/90 leading-relaxed">
            {aiSummaryText}
          </p>
        </div>
      </div>

      {/* ROW 1: 6 EXECUTIVE KPI CARDS (RICH TINTED BACKGROUNDS) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        
        {/* KPI 1: Messages */}
        <div className="bg-emerald-500/5 backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-4 flex flex-col justify-between hover:border-emerald-500/40 hover:bg-emerald-500/10 transition-all shadow-md shadow-black/5 hover:shadow-lg">
          <div>
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">{language === 'en' ? 'Messages Sent' : 'মেসেজ সেন্ড'}</span>
              <MessageSquare className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-foreground">{formatNumber(kpis.messages?.month || 0)}</div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`text-[11px] font-bold flex items-center ${kpis.messages?.growth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {kpis.messages?.growth >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {formatNumber(Math.abs(kpis.messages?.growth || 0))}%
              </span>
              <span className="text-[10px] text-zinc-400">{language === 'en' ? 'vs prev' : 'পূর্ববর্তী'}</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-emerald-500/20 flex justify-between text-[11px] text-zinc-400">
            <span>{language === 'en' ? 'Today:' : 'আজ:'} <strong className="text-foreground">{formatNumber(kpis.messages?.today || 0)}</strong></span>
            <span>{language === 'en' ? 'Used:' : 'ব্যবহৃত:'} <strong className="text-emerald-400">{formatNumber(kpis.messages?.pct || 0)}%</strong></span>
          </div>
        </div>

        {/* KPI 2: AI Responses */}
        <div className="bg-purple-500/5 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-4 flex flex-col justify-between hover:border-purple-500/40 hover:bg-purple-500/10 transition-all shadow-md shadow-black/5 hover:shadow-lg">
          <div>
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400">{language === 'en' ? 'AI Replies' : 'এআই রিপ্লাই'}</span>
              <Bot className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-purple-400">{formatNumber(kpis.ai?.month || 0)}</div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[11px] font-bold text-purple-400 bg-purple-500/15 px-2 py-0.5 rounded-full border border-purple-500/20">
                {formatNumber(kpis.ai?.automationRate || 0)}% {language === 'en' ? 'Automated' : 'অটোমেটেড'}
              </span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-purple-500/20 flex justify-between text-[11px] text-zinc-400">
            <span>{language === 'en' ? 'Today:' : 'আজ:'} <strong className="text-foreground">{formatNumber(kpis.ai?.today || 0)}</strong></span>
            <span>Tokens: <strong className="text-foreground">{formatNumber(kpis.ai?.avgTokens || 0)}</strong></span>
          </div>
        </div>

        {/* KPI 3: Human Responses */}
        <div className="bg-blue-500/5 backdrop-blur-xl border border-blue-500/20 rounded-2xl p-4 flex flex-col justify-between hover:border-blue-500/40 hover:bg-blue-500/10 transition-all shadow-md shadow-black/5 hover:shadow-lg">
          <div>
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">{language === 'en' ? 'Human Replies' : 'হিউম্যান রিপ্লাই'}</span>
              <Users className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-blue-400">{formatNumber(kpis.human?.month || 0)}</div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-zinc-400">
              <span>{formatNumber(kpis.human?.humanVsAiPct || 0)}% {language === 'en' ? 'Manual Split' : 'ম্যানুয়াল রিপ্লাই'}</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-blue-500/20 flex justify-between text-[11px] text-zinc-400">
            <span>{language === 'en' ? 'Today:' : 'আজ:'} <strong className="text-foreground">{formatNumber(kpis.human?.today || 0)}</strong></span>
            <span className="text-blue-400 font-bold">{language === 'en' ? 'Agent' : 'এজেন্ট'}</span>
          </div>
        </div>

        {/* KPI 4: AI Cost */}
        <div className="bg-emerald-500/5 backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-4 flex flex-col justify-between hover:border-emerald-500/40 hover:bg-emerald-500/10 transition-all shadow-md shadow-black/5 hover:shadow-lg">
          <div>
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">{language === 'en' ? 'AI Spend' : 'এআই খরচ'}</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400">${(kpis.ai?.costMonth || 0).toFixed(3)}</div>
            <div className="text-[11px] text-zinc-400 mt-1">
              Proj: <strong className="text-foreground">${(kpis.ai?.projectedCost || 0).toFixed(2)}/mo</strong>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-emerald-500/20 flex justify-between text-[11px] text-zinc-400">
            <span>{language === 'en' ? 'Today:' : 'আজ:'} <strong className="text-foreground">${(kpis.ai?.costToday || 0).toFixed(3)}</strong></span>
          </div>
        </div>

        {/* KPI 5: Open Conversations */}
        <div className="bg-amber-500/5 backdrop-blur-xl border border-amber-500/20 rounded-2xl p-4 flex flex-col justify-between hover:border-amber-500/40 hover:bg-amber-500/10 transition-all shadow-md shadow-black/5 hover:shadow-lg">
          <div>
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">{language === 'en' ? 'Open Inbox' : 'ওপেন ইনবক্স'}</span>
              <Activity className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-400">
              {formatNumber(kpis.conversations?.open || 0)}
            </div>
            <div className="text-[11px] mt-1 flex items-center gap-1.5">
              {unreadConvs > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/20 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                  {formatNumber(unreadConvs)} {language === 'en' ? 'Unread' : 'অপঠিত'}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {language === 'en' ? 'All Read 🟢' : 'সব পঠিত 🟢'}
                </span>
              )}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-amber-500/20 flex justify-between text-[11px] text-zinc-400">
            <span>{language === 'en' ? 'Resolved:' : 'সমাধান:'} <strong className="text-foreground">{formatNumber(kpis.conversations?.resolvedToday || 0)}</strong></span>
          </div>
        </div>

        {/* KPI 6: Subscription Usage */}
        <div className="bg-primary/5 backdrop-blur-xl border border-primary/20 rounded-2xl p-4 flex flex-col justify-between hover:border-primary/40 hover:bg-primary/10 transition-all shadow-md shadow-black/5 hover:shadow-lg">
          <div>
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-primary">{language === 'en' ? 'Plan Quota' : 'প্ল্যান কোটা'}</span>
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-foreground">
              {formatNumber(kpis.messages?.used || 0)} <span className="text-xs font-medium text-zinc-400">/ {formatNumber(kpis.messages?.limit || 0)}</span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-1 font-medium">
              {formatNumber(kpis.messages?.remaining || 0)} {language === 'en' ? 'Messages Available' : 'মেসেজ অবশিষ্ট'}
            </div>
            <div className="w-full bg-surface-hover rounded-full h-1.5 mt-2 overflow-hidden">
              <div className="bg-gradient-to-r from-primary to-secondary h-full rounded-full transition-all" style={{ width: `${kpis.messages?.pct || 0}%` }} />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-primary/20 flex justify-between text-[11px]">
            <span className="text-zinc-400">{kpis.messages?.pct || 0}% {language === 'en' ? 'Used' : 'ব্যবহৃত'}</span>
            <Link href="/dashboard/settings/subscription" className="text-primary font-bold hover:underline">{language === 'en' ? 'Upgrade' : 'আপগ্রেড'}</Link>
          </div>
        </div>
      </div>


      {/* ROW 2: SUBSCRIPTION HEALTH | CHANNELS | TEAM */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Subscription Health Card */}
        <div className="bg-surface/90 backdrop-blur-xl border border-surface-hover/80 rounded-2xl p-5 flex flex-col justify-between shadow-lg shadow-black/5 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[14px] font-bold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              {language === 'en' ? 'Subscription Quota Breakdown' : 'সাবস্ক্রিপশন কোটা হেলথ'}
            </h3>
            <span className="text-[11px] font-bold text-zinc-400">{sub.planName}</span>
          </div>

          <div className="space-y-3">
            {[
              { label: language === 'en' ? 'Messages Usage' : 'মেসেজ কোটা', used: sub.messages?.used, limit: sub.messages?.limit, pct: sub.messages?.pct, icon: MessageSquare },
              { label: language === 'en' ? 'AI Response Usage' : 'এআই রেসপন্স কোটা', used: sub.ai?.used, limit: sub.ai?.limit, pct: sub.ai?.pct, icon: Bot },
              { label: language === 'en' ? 'Team Seats' : 'টিম সিট', used: sub.seats?.used, limit: sub.seats?.limit, pct: sub.seats?.pct, icon: Users },
              { label: language === 'en' ? 'Contacts' : 'কন্টাক্টস', used: sub.contacts?.used, limit: sub.contacts?.limit, pct: sub.contacts?.pct, icon: Users },
              { label: language === 'en' ? 'Products Catalog' : 'প্রোডাক্ট ক্যাটালগ', used: sub.products?.used, limit: sub.products?.limit, pct: sub.products?.pct, icon: Package },
            ].filter(item => item.limit !== null && item.limit !== undefined).map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-zinc-400 flex items-center gap-1.5">
                    <item.icon className="w-3.5 h-3.5 text-zinc-400" />
                    {item.label}
                  </span>
                  <span className="font-bold text-foreground">{formatNumber(item.used || 0)} / {formatNumber(item.limit || 0)} ({formatNumber(item.pct || 0)}%)</span>
                </div>
                <div className="w-full bg-surface-hover rounded-full h-1.5 overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${item.pct > 90 ? 'bg-red-500' : 'bg-primary'}`} style={{ width: `${item.pct || 0}%` }} />
                </div>
              </div>
            ))}
          </div>

          <Link href="/dashboard/settings/subscription" className="mt-4 w-full py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-[12px] font-bold text-center transition-all">
            {language === 'en' ? 'Manage Subscription →' : 'সাবস্ক্রিপশন ম্যানেজ করুন →'}
          </Link>
        </div>

        {/* Connected Channels Card */}
        <div className="bg-surface/90 backdrop-blur-xl border border-surface-hover/80 rounded-2xl p-5 flex flex-col justify-between shadow-lg shadow-black/5 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[14px] font-bold flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-emerald-400" />
              {language === 'en' ? 'Connected Channels' : 'সংযুক্ত চ্যানেলসমূহ'}
            </h3>
            <Link href="/dashboard/settings/inboxes" className="text-[11px] font-bold text-primary hover:underline">{language === 'en' ? 'View All' : 'সব দেখুন'}</Link>
          </div>

          <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[220px] pr-1">
            {(data?.channels || []).length === 0 ? (
              <div className="text-center py-8 text-zinc-400 text-xs">{language === 'en' ? 'No active channels connected' : 'কোনো চ্যানেল কানেক্ট করা নেই'}</div>
            ) : (
              (data?.channels || []).map((ch: any) => {
                const isWebsite = ch.channelType === 'website' || ch.channelType === 'web_widget';
                return (
                  <div key={ch.id} className="flex items-center justify-between p-2.5 bg-surface-hover/40 border border-surface-hover rounded-xl">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg bg-surface-hover">
                        {isWebsite ? (
                          <Globe className="w-4 h-4 text-cyan-400" />
                        ) : ch.channelType?.includes('whatsapp') ? (
                          <PhoneCall className="w-4 h-4 text-emerald-400" />
                        ) : ch.channelType?.includes('messenger') ? (
                          <MessageSquare className="w-4 h-4 text-blue-400" />
                        ) : (
                          <Sparkles className="w-4 h-4 text-purple-400" />
                        )}
                      </div>
                      <div className="truncate">
                        <div className="text-[12px] font-bold truncate text-foreground">{ch.displayName || ch.phoneNumber || ch.channelType}</div>
                        <div className="text-[10px] text-zinc-400 capitalize">{isWebsite ? 'Website Live Chat' : ch.channelType} • {ch.provider || 'Active'}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[12px] font-bold text-foreground">{formatNumber(ch.messagesToday || 0)}</div>
                      <div className="text-[9px] text-zinc-400">{language === 'en' ? 'msges' : 'মেসেজ'}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <Link href="/dashboard/settings/inboxes/new" className="mt-3 w-full py-2 bg-surface-hover hover:bg-surface-hover/80 text-foreground border border-surface-hover rounded-xl text-[12px] font-bold text-center transition-all">
            + {language === 'en' ? 'Add New Channel' : 'নতুন চ্যানেল যোগ করুন'}
          </Link>
        </div>

        {/* Team Overview Card */}
        <div className="bg-surface/90 backdrop-blur-xl border border-surface-hover/80 rounded-2xl p-5 flex flex-col justify-between shadow-lg shadow-black/5 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[14px] font-bold flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              {language === 'en' ? 'Team Performance' : 'টিম পারফরম্যান্স'}
            </h3>
            <Link href="/dashboard/team" className="text-[11px] font-bold text-blue-400 hover:underline">{language === 'en' ? 'Manage Team' : 'টিম ম্যানেজ'}</Link>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-surface-hover/40 border border-surface-hover p-3 rounded-xl text-center">
              <div className="text-2xl font-black text-foreground">{formatNumber(data?.team?.total || 0)}</div>
              <div className="text-[10px] text-zinc-400 uppercase font-bold">{language === 'en' ? 'Total Members' : 'মোট মেম্বার'}</div>
            </div>
            <div className="bg-surface-hover/40 border border-surface-hover p-3 rounded-xl text-center">
              <div className="text-2xl font-black text-blue-400">{formatNumber(data?.team?.agents || 0)}</div>
              <div className="text-[10px] text-zinc-400 uppercase font-bold">{language === 'en' ? 'Active Agents' : 'সক্রিয় এজেন্ট'}</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs text-zinc-400">
              <span>{language === 'en' ? 'Admins:' : 'এডমিন:'} <strong className="text-foreground">{formatNumber(data?.team?.admins || 0)}</strong></span>
              <span>{language === 'en' ? 'Agents:' : 'এজেন্ট:'} <strong className="text-foreground">{formatNumber(data?.team?.agents || 0)}</strong></span>
            </div>
            <div className="flex justify-between text-xs text-zinc-400">
              <span>{language === 'en' ? 'Avg Response Time:' : 'গড় রেসপন্স টাইম:'}</span>
              <strong className="text-emerald-400">&lt; 2 {language === 'en' ? 'mins' : 'মিনিট'}</strong>
            </div>
          </div>

          <Link href="/dashboard/team" className="mt-4 w-full py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-xl text-[12px] font-bold text-center transition-all">
            {language === 'en' ? 'Invite Team Member →' : 'টিম মেম্বার আমন্ত্রণ জানান →'}
          </Link>
        </div>
      </div>

      {/* ROW 3: CONVERSATION ANALYTICS (RECHARTS AREA & DONUT) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Large Time-series Area Chart */}
        <div className="lg:col-span-2 bg-surface/90 backdrop-blur-xl border border-surface-hover/80 rounded-2xl p-5 shadow-lg shadow-black/5 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[15px] font-bold text-foreground">{language === 'en' ? 'Conversation Volume Trend' : 'মেসেজিং ভলিউম ট্রেন্ড'}</h3>
              <p className="text-[11px] text-zinc-400">{language === 'en' ? 'Messages vs AI Replies over selected time range' : 'মেসেজ বনাম এআই রিপ্লাই এর তুলনামূলক চিত্র'}</p>
            </div>
            <span className="px-2.5 py-1 bg-surface-hover text-zinc-400 rounded-lg text-xs font-bold capitalize">{range}</span>
          </div>

          <div className="h-64 sm:h-72 w-full">
            {chartData?.timeSeries ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData.timeSeries}>
                  <defs>
                    <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorAi" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis dataKey="date" stroke="#888888" fontSize={10} tickLine={false} />
                  <YAxis stroke="#888888" fontSize={10} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="messages" stroke="#10B981" fillOpacity={1} fill="url(#colorMessages)" name="Total Messages" />
                  <Area type="monotone" dataKey="aiReplies" stroke="#8B5CF6" fillOpacity={1} fill="url(#colorAi)" name="AI Replies" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-400 text-xs">Loading trend...</div>
            )}
          </div>
        </div>

        {/* Conversation Channel / Label Distribution */}
        <div className="bg-surface/90 backdrop-blur-xl border border-surface-hover/80 rounded-2xl p-5 flex flex-col justify-between shadow-lg shadow-black/5 hover:shadow-xl transition-all">
          <h3 className="text-[15px] font-bold text-foreground mb-2">{language === 'en' ? 'Channel Distribution' : 'চ্যানেল ডিস্ট্রিবিউশন'}</h3>
          
          <div className="h-52 w-full">
            {chartData?.channelDistribution?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.channelDistribution}
                    dataKey="count"
                    nameKey="channel"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={4}
                  >
                    {chartData.channelDistribution.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-400 text-xs">{language === 'en' ? 'No channel data in range' : 'কোনো তথ্য নেই'}</div>
            )}
          </div>

          <div className="space-y-1.5 mt-2">
            {(chartData?.channelDistribution || []).map((item: any, idx: number) => (
              <div key={item.channel} className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2 capitalize">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: DONUT_COLORS[idx % DONUT_COLORS.length] }} />
                  {item.channel}
                </div>
                <span className="font-bold text-foreground">{formatNumber(item.count)} convs</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ROW 4: CRM DASHBOARD & REVENUE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* CRM Overview */}
        <div className="bg-surface/90 backdrop-blur-xl border border-surface-hover/80 rounded-2xl p-5 shadow-lg shadow-black/5 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15px] font-bold flex items-center gap-2">
              <Target className="w-4 h-4 text-secondary" />
              {language === 'en' ? 'CRM Leads & Pipeline' : 'সিআরএম লিডস ও পাইপলাইন'}
            </h3>
            <Link href="/dashboard/leads" className="text-[11px] font-bold text-secondary hover:underline">{language === 'en' ? 'Manage Leads' : 'লিডস ম্যানেজ'}</Link>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-secondary/10 border border-secondary/20 p-3 rounded-xl">
              <div className="text-xs text-zinc-400 font-bold uppercase">{language === 'en' ? 'Total Contacts' : 'মোট কন্টাক্টস'}</div>
              <div className="text-2xl font-black text-foreground mt-1">{formatNumber(crm.total || 0)}</div>
            </div>
            <div className="bg-primary/10 border border-primary/20 p-3 rounded-xl">
              <div className="text-xs text-zinc-400 font-bold uppercase">{language === 'en' ? 'New Leads' : 'নতুন লিডস'}</div>
              <div className="text-2xl font-black text-primary mt-1">{formatNumber(crm.new || 0)}</div>
            </div>
          </div>

          <div className="space-y-2">
            {[
              { label: language === 'en' ? 'Follow-ups Due Today' : 'আজকের ফলো-আপ', val: crm.followUpDue, color: 'text-amber-400' },
              { label: language === 'en' ? 'Overdue Follow-ups' : 'বকেয়া ফলো-আপ', val: crm.overdue, color: 'text-red-400' },
              { label: language === 'en' ? 'Conversion Rate' : 'কনভার্সন রেট', val: `${formatNumber(crm.conversionRate || 0)}%`, color: 'text-emerald-400' },
            ].map(item => (
              <div key={item.label} className="flex justify-between text-xs py-1 border-b border-surface-hover/40">
                <span className="text-zinc-400">{item.label}</span>
                <strong className={item.color}>{formatNumber(item.val || 0)}</strong>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue Analytics Chart */}
        <div className="lg:col-span-2 bg-surface/90 backdrop-blur-xl border border-surface-hover/80 rounded-2xl p-5 shadow-lg shadow-black/5 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[15px] font-bold text-foreground">{language === 'en' ? 'E-Commerce & Orders Revenue' : 'ই-কমার্স রেভিনিউ'}</h3>
              <p className="text-[11px] text-zinc-400">{language === 'en' ? 'Total delivered revenue:' : 'মোট ডেলিভার্ড আয়:'} ৳{formatNumber(orders.revenue || 0)}</p>
            </div>
            <div className="text-right">
              <div className="text-lg font-black text-emerald-400">৳{formatNumber(orders.revenue || 0)}</div>
              <div className="text-[10px] text-zinc-400">AOV: ৳{formatNumber(Math.round(orders.avgOrderValue || 0))}</div>
            </div>
          </div>

          <div className="h-56 w-full">
            {chartData?.timeSeries ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.timeSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis dataKey="date" stroke="#888888" fontSize={10} />
                  <YAxis stroke="#888888" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px', fontSize: '12px' }} />
                  <Bar dataKey="revenue" fill="#10B981" radius={[4, 4, 0, 0]} name="Revenue (BDT)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-400 text-xs">Loading chart...</div>
            )}
          </div>
        </div>
      </div>

      {/* ROW 5: RECENT TABLES & BUSINESS HEALTH SCORE */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Recent Activity & Tables */}
        <div className="xl:col-span-2 space-y-6">

          {/* Recent Conversations Table */}
          <div className="bg-surface/90 backdrop-blur-xl border border-surface-hover/80 rounded-2xl p-5 shadow-lg shadow-black/5 hover:shadow-xl transition-all">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h3 className="text-[15px] font-bold text-foreground flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                {language === 'en' ? 'Recent Conversations' : 'সাম্প্রতিক কনভারসেশন'}
              </h3>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    placeholder={language === 'en' ? 'Search convs...' : 'খুঁজুন...'}
                    value={convSearch}
                    onChange={e => setConvSearch(e.target.value)}
                    className="bg-background border border-surface-hover rounded-xl pl-8 pr-3 py-1 text-xs outline-none focus:border-primary"
                  />
                </div>
                <Link href="/dashboard/inbox" className="text-xs font-bold text-primary hover:underline">{language === 'en' ? 'Inbox →' : 'ইনবক্স →'}</Link>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-surface-hover text-zinc-400 uppercase text-[10px] tracking-wider">
                    <th className="py-2 px-3">{language === 'en' ? 'Customer' : 'কাস্টমার'}</th>
                    <th className="py-2 px-3">{language === 'en' ? 'Channel' : 'চ্যানেল'}</th>
                    <th className="py-2 px-3">{language === 'en' ? 'Mode' : 'মোড'}</th>
                    <th className="py-2 px-3">{language === 'en' ? 'Last Message' : 'শেষ মেসেজ'}</th>
                    <th className="py-2 px-3 text-right">{language === 'en' ? 'Action' : 'অ্যাকশন'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-hover/50">
                  {filteredConvs.length === 0 ? (
                    <tr><td colSpan={5} className="py-6 text-center text-zinc-400">{language === 'en' ? 'No recent conversations' : 'কোনো মেসেজ নেই'}</td></tr>
                  ) : (
                    filteredConvs.map(c => {
                      const isWebsite = c.channel === 'website' || c.channel === 'web_widget';
                      const isWa = c.channel?.includes('whatsapp');
                      const isMs = c.channel?.includes('messenger');
                      return (
                        <tr key={c.id} className="hover:bg-surface-hover/30 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-foreground truncate max-w-[130px]">{c.contactName}</td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              isWebsite ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20' :
                              isWa ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' :
                              isMs ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20' :
                              'bg-purple-500/15 text-purple-400 border border-purple-500/20'
                            }`}>
                              {isWebsite ? <Globe className="w-3 h-3" /> : isWa ? <PhoneCall className="w-3 h-3" /> : isMs ? <MessageSquare className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
                              {isWebsite ? 'Widget' : c.channel}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${c.isAiEnabled ? 'bg-purple-500/15 text-purple-400' : 'bg-blue-500/15 text-blue-400'}`}>
                              {c.isAiEnabled ? 'AI Auto' : 'Human'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-zinc-400 truncate max-w-[220px]">
                            {c.direction === 'outbound' && (
                              c.messageStatus === 'read' || c.messageStatus === 'seen' ? (
                                <CheckCheck className="w-3.5 h-3.5 text-sky-400 inline shrink-0 mr-1" />
                              ) : c.messageStatus === 'delivered' ? (
                                <CheckCheck className="w-3.5 h-3.5 text-zinc-400 inline shrink-0 mr-1" />
                              ) : c.messageStatus === 'pending' ? (
                                <Clock className="w-3.5 h-3.5 text-amber-400 inline shrink-0 mr-1" />
                              ) : c.messageStatus === 'failed' ? (
                                <AlertCircle className="w-3.5 h-3.5 text-red-400 inline shrink-0 mr-1" />
                              ) : (
                                <Check className="w-3.5 h-3.5 text-zinc-400 inline shrink-0 mr-1" />
                              )
                            )}
                            {c.lastMessage}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <Link href={`/dashboard/inbox?id=${c.id}`} className="text-primary hover:underline font-bold text-[11px]">{language === 'en' ? 'Reply' : 'উত্তর দিন'}</Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Orders Table */}
          <div className="bg-surface/90 backdrop-blur-xl border border-surface-hover/80 rounded-2xl p-5 shadow-lg shadow-black/5 hover:shadow-xl transition-all">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h3 className="text-[15px] font-bold text-foreground flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-amber-400" />
                {language === 'en' ? 'Recent Orders' : 'সাম্প্রতিক অর্ডারসমূহ'}
              </h3>
              <Link href="/dashboard/orders" className="text-xs font-bold text-amber-400 hover:underline">{language === 'en' ? 'Manage Orders →' : 'অর্ডার ম্যানেজ →'}</Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-surface-hover text-zinc-400 uppercase text-[10px] tracking-wider">
                    <th className="py-2 px-3">{language === 'en' ? 'Customer' : 'কাস্টমার'}</th>
                    <th className="py-2 px-3">{language === 'en' ? 'Product' : 'প্রোডাক্ট'}</th>
                    <th className="py-2 px-3">{language === 'en' ? 'Amount' : 'পরিমাণ'}</th>
                    <th className="py-2 px-3">{language === 'en' ? 'Status' : 'স্ট্যাটাস'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-hover/50">
                  {filteredOrders.length === 0 ? (
                    <tr><td colSpan={4} className="py-6 text-center text-zinc-400">{language === 'en' ? 'No recent orders' : 'কোনো অর্ডার পাওয়া যায়নি'}</td></tr>
                  ) : (
                    filteredOrders.map(o => (
                      <tr key={o.id} className="hover:bg-surface-hover/30 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-foreground">{o.customerName}</td>
                        <td className="py-2.5 px-3 text-zinc-400 truncate max-w-[150px]">{o.productName}</td>
                        <td className="py-2.5 px-3 font-bold text-emerald-400">৳{formatNumber(o.amount)}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                            o.status === 'delivered' ? 'bg-emerald-500/15 text-emerald-400' :
                            o.status === 'pending' ? 'bg-amber-500/15 text-amber-400' : 'bg-zinc-500/15 text-zinc-400'
                          }`}>
                            {o.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Right 1 Col: Business Health Score Sidebar (REAL UNBIASED DATA) */}
        <div className="space-y-6">

          {/* Business Health Card */}
          <div className="bg-surface/90 backdrop-blur-xl border border-surface-hover/80 rounded-2xl p-5 text-center shadow-lg shadow-black/5 hover:shadow-xl transition-all">
            <h3 className="text-[14px] font-bold uppercase tracking-wider text-zinc-400 mb-4">{language === 'en' ? 'Business Health Score' : 'বিজনেস হেলথ স্কোর'}</h3>
            
            <div className="relative w-36 h-36 mx-auto flex items-center justify-center my-2">
              <div className="text-4xl font-black text-foreground">{formatNumber(health.overall || 0)}</div>
              <div className="text-xs text-zinc-400 font-bold uppercase absolute bottom-4">/ 100</div>
            </div>

            <p className="text-[12px] text-zinc-400 mb-4">
              {language === 'en'
                ? 'Real-time performance score based on actual sales, AI activity, and CRM lead stages.'
                : 'বাস্তব বিক্রয়, এআই অ্যাক্টিভিটি এবং সিআরএম লিড ডাটার ওপর ভিত্তি করে প্রাপ্ত স্কোর।'}
            </p>

            <div className="space-y-2.5 text-left">
              {[
                { label: language === 'en' ? 'AI Performance' : 'এআই পারফরম্যান্স', score: health.aiPerformance },
                { label: language === 'en' ? 'CRM Health' : 'সিআরএম হেলথ', score: health.crmHealth },
                { label: language === 'en' ? 'Sales Growth' : 'সেলস গ্রোথ', score: health.salesPerformance },
                { label: language === 'en' ? 'Subscription Health' : 'সাবস্ক্রিপশন হেলথ', score: health.subscriptionHealth },
              ].map(item => (
                <div key={item.label} className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-zinc-400">{item.label}</span>
                    <span className={`font-bold ${item.score > 0 ? 'text-foreground' : 'text-zinc-500'}`}>
                      {formatNumber(item.score || 0)}/100 {item.score === 0 ? `(${language === 'en' ? 'No Data' : 'তথ্য নেই'})` : ''}
                    </span>
                  </div>
                  <div className="w-full bg-surface-hover rounded-full h-1 overflow-hidden">
                    <div className={`h-full rounded-full ${item.score > 0 ? 'bg-primary' : 'bg-zinc-600'}`} style={{ width: `${item.score || 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
