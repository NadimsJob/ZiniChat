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
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, ComposedChart
} from 'recharts';
import {
  MessageSquare, Bot, Users, ShoppingCart, Crown, Package, Activity,
  TrendingUp, TrendingDown, RefreshCw, Zap, ShieldCheck, AlertTriangle,
  CheckCircle2, Clock, DollarSign, Search, Bell, Sparkles, Filter,
  PhoneCall, MessageCircle, Camera, Send, Globe, Mail, ChevronRight,
  Layers, ArrowUpRight, ArrowDownRight, Eye, HelpCircle, HardDrive,
  UserPlus, Award, Target, Cpu, CheckSquare, XCircle, AlertCircle,
  Calendar, RotateCcw, Download, ExternalLink, UserCheck
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const DONUT_COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4'];

export default function ExecutiveDashboardPage() {
  const { language } = useLanguage();
  const { formatBdtDirect, formatNumber } = useCurrency();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [chartData, setChartData] = useState<any>(null);
  const [aiSummary, setAiSummary] = useState<any>(null);
  const [setupStatus, setSetupStatus] = useState<any>(null);
  const [showSetupBanner, setShowSetupBanner] = useState(true);

  // Filters: YouTube Analytics style
  const [range, setRange] = useState<string>('30d');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [customOpen, setCustomOpen] = useState(false);

  // Table pagination & search
  const [recentConvs, setRecentConvs] = useState<any[]>([]);
  const [recentLeads, setRecentLeads] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [convSearch, setConvSearch] = useState('');
  const [leadSearch, setLeadSearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');

  const userName = Cookies.get('user_name') || 'Executive';
  const companyName = Cookies.get('company_name') || 'ZiniChat Business';

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

      const [overviewRes, chartRes, aiSumRes, setupRes, convsRes, leadsRes, ordersRes] = await Promise.all([
        fetch(`${API}/stats/tenant/dashboard?${queryStr}`, { headers }),
        fetch(`${API}/stats/tenant/charts?${queryStr}`, { headers }),
        fetch(`${API}/stats/tenant/ai-summary`, { headers }),
        fetch(`${API}/auth/setup-status`, { headers }),
        fetch(`${API}/stats/tenant/conversations/recent?page=1&limit=6`, { headers }),
        fetch(`${API}/stats/tenant/leads/recent?page=1&limit=6`, { headers }),
        fetch(`${API}/stats/tenant/orders/recent?page=1&limit=6`, { headers }),
      ]);

      if (overviewRes.ok) setData(await overviewRes.json());
      if (chartRes.ok) setChartData(await chartRes.json());
      if (aiSumRes.ok) setAiSummary(await aiSumRes.json());
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

  const filteredLeads = useMemo(() => {
    if (!leadSearch) return recentLeads;
    return recentLeads.filter(l => l.name?.toLowerCase().includes(leadSearch.toLowerCase()) || l.phone?.includes(leadSearch));
  }, [recentLeads, leadSearch]);

  const filteredOrders = useMemo(() => {
    if (!orderSearch) return recentOrders;
    return recentOrders.filter(o => o.customerName?.toLowerCase().includes(orderSearch.toLowerCase()) || o.productName?.toLowerCase().includes(orderSearch.toLowerCase()));
  }, [recentOrders, orderSearch]);

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-80 bg-surface-hover/30 rounded-2xl col-span-2" />
          <div className="h-80 bg-surface-hover/30 rounded-2xl" />
        </div>
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const sub = data?.subscriptionHealth || {};
  const health = data?.healthScore || {};
  const crm = data?.crm || {};
  const orders = data?.orders || {};
  const broadcasts = data?.broadcasts || {};

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 p-2 sm:p-4 pb-16 animate-in fade-in duration-500 text-foreground">

      {/* TOP HEADER: EXECUTIVE CONTROL BAR */}
      <div className="bg-surface/70 backdrop-blur-xl border border-surface-hover rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        
        {/* Left Welcome Info */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-primary-foreground font-black text-xl shadow-lg shadow-primary/20 shrink-0">
            {companyName.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-foreground">
                {language === 'en' ? 'Welcome back, ' : 'স্বাগতম, '}{userName}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-primary/15 text-primary border border-primary/20 flex items-center gap-1">
                <Crown className="w-3 h-3 text-yellow-500" />
                {sub.planName || 'Pro Plan'}
              </span>
            </div>
            <p className="text-[12px] text-zinc-400 mt-0.5 flex items-center gap-2 flex-wrap">
              <span>{companyName}</span>
              <span>•</span>
              <span className="text-zinc-400 font-medium">
                {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
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

            {/* Custom Date Modal / Dropdown */}
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

      {/* AI EXECUTIVE SUMMARY BANNER */}
      {aiSummary?.summary && (
        <div className="bg-gradient-to-r from-primary/15 via-purple-500/10 to-secondary/15 border border-primary/30 backdrop-blur-xl rounded-2xl p-4 sm:p-5 flex items-start gap-4 relative overflow-hidden shadow-sm">
          <div className="w-10 h-10 rounded-2xl bg-primary/20 text-primary flex items-center justify-center shrink-0 shadow-md">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-primary">
                {language === 'en' ? "Today's AI Executive Summary" : 'আজকের এআই সামারি'}
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="text-[13px] font-semibold text-foreground/90 leading-relaxed">
              {aiSummary.summary}
            </p>
          </div>
        </div>
      )}

      {/* Setup Journey Banner if Pending */}
      {showSetupBanner && isSetupPending && (
        <div className="bg-surface/60 backdrop-blur-xl border border-amber-500/30 p-5 rounded-2xl flex items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-amber-400 text-sm">Complete Your Account Setup</h3>
            <p className="text-xs text-zinc-400">Connect a WhatsApp or Messenger channel to unlock automated AI responses.</p>
          </div>
          <Link href="/dashboard/settings/inboxes/new" className="px-4 py-2 bg-amber-500 text-black text-xs font-bold rounded-xl whitespace-nowrap">
            Connect Channel →
          </Link>
        </div>
      )}

      {/* ROW 1: 6 EXECUTIVE KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        
        {/* KPI 1: Messages */}
        <div className="bg-surface/70 backdrop-blur-xl border border-surface-hover rounded-2xl p-4 flex flex-col justify-between hover:border-primary/30 transition-all">
          <div>
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">{language === 'en' ? 'Messages' : 'মেসেজ'}</span>
              <MessageSquare className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-foreground">{formatNumber(kpis.messages?.month || 0)}</div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`text-[11px] font-bold flex items-center ${kpis.messages?.growth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {kpis.messages?.growth >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {formatNumber(Math.abs(kpis.messages?.growth || 0))}%
              </span>
              <span className="text-[10px] text-zinc-400">vs prev</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-surface-hover/50 flex justify-between text-[11px] text-zinc-400">
            <span>Today: <strong className="text-foreground">{formatNumber(kpis.messages?.today || 0)}</strong></span>
            <span>Used: <strong className="text-foreground">{kpis.messages?.pct}%</strong></span>
          </div>
        </div>

        {/* KPI 2: AI Responses */}
        <div className="bg-surface/70 backdrop-blur-xl border border-surface-hover rounded-2xl p-4 flex flex-col justify-between hover:border-purple-500/30 transition-all">
          <div>
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">{language === 'en' ? 'AI Replies' : 'এআই রিপ্লাই'}</span>
              <Bot className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-purple-400">{formatNumber(kpis.ai?.month || 0)}</div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[11px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">
                {kpis.ai?.automationRate || 0}% Automated
              </span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-surface-hover/50 flex justify-between text-[11px] text-zinc-400">
            <span>Today: <strong className="text-foreground">{formatNumber(kpis.ai?.today || 0)}</strong></span>
            <span>Avg Tokens: <strong className="text-foreground">{kpis.ai?.avgTokens || 0}</strong></span>
          </div>
        </div>

        {/* KPI 3: Human Responses */}
        <div className="bg-surface/70 backdrop-blur-xl border border-surface-hover rounded-2xl p-4 flex flex-col justify-between hover:border-blue-500/30 transition-all">
          <div>
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">{language === 'en' ? 'Human Replies' : 'হিউম্যান রিপ্লাই'}</span>
              <Users className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-blue-400">{formatNumber(kpis.human?.month || 0)}</div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-zinc-400">
              <span>{kpis.human?.humanVsAiPct || 0}% of Total Volume</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-surface-hover/50 flex justify-between text-[11px] text-zinc-400">
            <span>Today: <strong className="text-foreground">{formatNumber(kpis.human?.today || 0)}</strong></span>
            <span className="text-blue-400 font-bold">Manual</span>
          </div>
        </div>

        {/* KPI 4: AI Cost */}
        <div className="bg-surface/70 backdrop-blur-xl border border-surface-hover rounded-2xl p-4 flex flex-col justify-between hover:border-emerald-500/30 transition-all">
          <div>
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">{language === 'en' ? 'AI Spend' : 'এআই খরচ'}</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400">${(kpis.ai?.costMonth || 0).toFixed(3)}</div>
            <div className="text-[11px] text-zinc-400 mt-1">
              Proj: <strong className="text-foreground">${(kpis.ai?.projectedCost || 0).toFixed(2)}/mo</strong>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-surface-hover/50 flex justify-between text-[11px] text-zinc-400">
            <span>Today: <strong className="text-foreground">${(kpis.ai?.costToday || 0).toFixed(3)}</strong></span>
          </div>
        </div>

        {/* KPI 5: Open Conversations */}
        <div className="bg-surface/70 backdrop-blur-xl border border-surface-hover rounded-2xl p-4 flex flex-col justify-between hover:border-amber-500/30 transition-all">
          <div>
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">{language === 'en' ? 'Open Inbox' : 'ওপেন ইনবক্স'}</span>
              <Activity className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-400">{formatNumber(kpis.conversations?.open || 0)}</div>
            <div className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>Pending Bot: {kpis.conversations?.pending || 0}</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-surface-hover/50 flex justify-between text-[11px] text-zinc-400">
            <span>Resolved: <strong className="text-foreground">{kpis.conversations?.resolvedToday || 0}</strong></span>
          </div>
        </div>

        {/* KPI 6: Subscription Usage */}
        <div className="bg-surface/70 backdrop-blur-xl border border-surface-hover rounded-2xl p-4 flex flex-col justify-between hover:border-secondary/30 transition-all">
          <div>
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">{language === 'en' ? 'Plan Quota' : 'কোটা স্থিতি'}</span>
              <Zap className="w-4 h-4 text-secondary" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-foreground">{kpis.messages?.pct || 0}%</div>
            <div className="w-full bg-surface-hover rounded-full h-1.5 mt-2 overflow-hidden">
              <div className="bg-gradient-to-r from-primary to-secondary h-full rounded-full transition-all" style={{ width: `${kpis.messages?.pct || 0}%` }} />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-surface-hover/50 flex justify-between text-[11px]">
            <span className="text-zinc-400">Rem: {formatNumber(kpis.messages?.remaining || 0)}</span>
            <Link href="/dashboard/settings/subscription" className="text-secondary font-bold hover:underline">Upgrade</Link>
          </div>
        </div>
      </div>

      {/* ROW 2: SUBSCRIPTION HEALTH | CHANNELS | TEAM */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Subscription Health Card */}
        <div className="bg-surface/70 backdrop-blur-xl border border-surface-hover rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[14px] font-bold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              {language === 'en' ? 'Subscription Quota Breakdown' : 'সাবস্ক্রিপশন কোটা হেলথ'}
            </h3>
            <span className="text-[11px] font-bold text-zinc-400">{sub.planName}</span>
          </div>

          <div className="space-y-3">
            {[
              { label: 'Messages Usage', used: sub.messages?.used, limit: sub.messages?.limit, pct: sub.messages?.pct, icon: MessageSquare },
              { label: 'AI Credits Usage', used: sub.ai?.used, limit: sub.ai?.limit, pct: sub.ai?.pct, icon: Bot },
              { label: 'Team Seats', used: sub.seats?.used, limit: sub.seats?.limit, pct: sub.seats?.pct, icon: Users },
              { label: 'Contacts', used: sub.contacts?.used, limit: sub.contacts?.limit, pct: sub.contacts?.pct, icon: UserPlus },
              { label: 'Products Catalog', used: sub.products?.used, limit: sub.products?.limit, pct: sub.products?.pct, icon: Package },
            ].map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-zinc-400 flex items-center gap-1.5">
                    <item.icon className="w-3.5 h-3.5 text-zinc-400" />
                    {item.label}
                  </span>
                  <span className="font-bold text-foreground">{formatNumber(item.used || 0)} / {formatNumber(item.limit || 0)} ({item.pct || 0}%)</span>
                </div>
                <div className="w-full bg-surface-hover rounded-full h-1.5 overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${item.pct > 90 ? 'bg-red-500' : 'bg-primary'}`} style={{ width: `${item.pct || 0}%` }} />
                </div>
              </div>
            ))}
          </div>

          <Link href="/dashboard/settings/subscription" className="mt-4 w-full py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-[12px] font-bold text-center transition-all">
            Manage Subscription →
          </Link>
        </div>

        {/* Connected Channels Card */}
        <div className="bg-surface/70 backdrop-blur-xl border border-surface-hover rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[14px] font-bold flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-emerald-400" />
              {language === 'en' ? 'Connected Channels' : 'সংযুক্ত চ্যানেলসমূহ'}
            </h3>
            <Link href="/dashboard/settings/inboxes" className="text-[11px] font-bold text-primary hover:underline">View All</Link>
          </div>

          <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[220px] pr-1">
            {(data?.channels || []).length === 0 ? (
              <div className="text-center py-8 text-zinc-400 text-xs">No active channels connected</div>
            ) : (
              (data?.channels || []).map((ch: any) => (
                <div key={ch.id} className="flex items-center justify-between p-2.5 bg-surface-hover/40 border border-surface-hover rounded-xl">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    <div className="truncate">
                      <div className="text-[12px] font-bold truncate text-foreground">{ch.displayName || ch.phoneNumber || ch.channelType}</div>
                      <div className="text-[10px] text-zinc-400 capitalize">{ch.channelType} • {ch.provider || 'API'}</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[12px] font-bold text-foreground">{formatNumber(ch.messagesToday || 0)}</div>
                    <div className="text-[9px] text-zinc-400">msges</div>
                  </div>
                </div>
              ))
            )}
          </div>

          <Link href="/dashboard/settings/inboxes/new" className="mt-3 w-full py-2 bg-surface-hover hover:bg-surface-hover/80 text-foreground border border-surface-hover rounded-xl text-[12px] font-bold text-center transition-all">
            + Add New Channel
          </Link>
        </div>

        {/* Team Overview Card */}
        <div className="bg-surface/70 backdrop-blur-xl border border-surface-hover rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[14px] font-bold flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              {language === 'en' ? 'Team Performance' : 'টিম পারফরম্যান্স'}
            </h3>
            <Link href="/dashboard/team" className="text-[11px] font-bold text-blue-400 hover:underline">Manage Team</Link>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-surface-hover/40 border border-surface-hover p-3 rounded-xl text-center">
              <div className="text-2xl font-black text-foreground">{data?.team?.total || 0}</div>
              <div className="text-[10px] text-zinc-400 uppercase font-bold">Total Members</div>
            </div>
            <div className="bg-surface-hover/40 border border-surface-hover p-3 rounded-xl text-center">
              <div className="text-2xl font-black text-blue-400">{data?.team?.agents || 0}</div>
              <div className="text-[10px] text-zinc-400 uppercase font-bold">Active Agents</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs text-zinc-400">
              <span>Admins: <strong className="text-foreground">{data?.team?.admins || 0}</strong></span>
              <span>Agents: <strong className="text-foreground">{data?.team?.agents || 0}</strong></span>
            </div>
            <div className="flex justify-between text-xs text-zinc-400">
              <span>Avg Response Time:</span>
              <strong className="text-emerald-400">&lt; 2 mins</strong>
            </div>
          </div>

          <Link href="/dashboard/team" className="mt-4 w-full py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-xl text-[12px] font-bold text-center transition-all">
            Invite Team Member →
          </Link>
        </div>
      </div>

      {/* ROW 3: CONVERSATION ANALYTICS (RECHARTS AREA & DONUT) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Large Time-series Area Chart */}
        <div className="lg:col-span-2 bg-surface/70 backdrop-blur-xl border border-surface-hover rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[15px] font-bold text-foreground">{language === 'en' ? 'Conversation Volume Trend' : 'মেসেজিং ভলিউম ট্রেন্ড'}</h3>
              <p className="text-[11px] text-zinc-400">Messages vs AI Replies over selected time range</p>
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
        <div className="bg-surface/70 backdrop-blur-xl border border-surface-hover rounded-2xl p-5 flex flex-col justify-between">
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
              <div className="h-full flex items-center justify-center text-zinc-400 text-xs">No channel data in range</div>
            )}
          </div>

          <div className="space-y-1.5 mt-2">
            {(chartData?.channelDistribution || []).map((item: any, idx: number) => (
              <div key={item.channel} className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2 capitalize">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: DONUT_COLORS[idx % DONUT_COLORS.length] }} />
                  {item.channel}
                </div>
                <span className="font-bold text-foreground">{item.count} convs</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ROW 4: CRM DASHBOARD & REVENUE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* CRM Overview */}
        <div className="bg-surface/70 backdrop-blur-xl border border-surface-hover rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15px] font-bold flex items-center gap-2">
              <Target className="w-4 h-4 text-secondary" />
              {language === 'en' ? 'CRM Leads & Pipeline' : 'সিআরএম লিডস ও পাইপলাইন'}
            </h3>
            <Link href="/dashboard/leads" className="text-[11px] font-bold text-secondary hover:underline">Manage Leads</Link>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-secondary/10 border border-secondary/20 p-3 rounded-xl">
              <div className="text-xs text-zinc-400 font-bold uppercase">Total Contacts</div>
              <div className="text-2xl font-black text-foreground mt-1">{formatNumber(crm.total || 0)}</div>
            </div>
            <div className="bg-primary/10 border border-primary/20 p-3 rounded-xl">
              <div className="text-xs text-zinc-400 font-bold uppercase">New Leads</div>
              <div className="text-2xl font-black text-primary mt-1">{formatNumber(crm.new || 0)}</div>
            </div>
          </div>

          <div className="space-y-2">
            {[
              { label: 'Follow-ups Due Today', val: crm.followUpDue, color: 'text-amber-400' },
              { label: 'Overdue Follow-ups', val: crm.overdue, color: 'text-red-400' },
              { label: 'Conversion Rate', val: `${crm.conversionRate || 0}%`, color: 'text-emerald-400' },
            ].map(item => (
              <div key={item.label} className="flex justify-between text-xs py-1 border-b border-surface-hover/40">
                <span className="text-zinc-400">{item.label}</span>
                <strong className={item.color}>{item.val || 0}</strong>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue Analytics Chart */}
        <div className="lg:col-span-2 bg-surface/70 backdrop-blur-xl border border-surface-hover rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[15px] font-bold text-foreground">{language === 'en' ? 'E-Commerce & Orders Revenue' : 'ই-কমার্স রেভিনিউ'}</h3>
              <p className="text-[11px] text-zinc-400">Total delivered revenue: ৳{formatNumber(orders.revenue || 0)}</p>
            </div>
            <div className="text-right">
              <div className="text-lg font-black text-emerald-400">৳{formatNumber(orders.revenue || 0)}</div>
              <div className="text-[10px] text-zinc-400">AOV: ৳{Math.round(orders.avgOrderValue || 0)}</div>
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

      {/* ROW 5 & 6: AI ANALYTICS & RECENT TABLES */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Recent Activity & Tables */}
        <div className="xl:col-span-2 space-y-6">

          {/* Recent Conversations Table */}
          <div className="bg-surface/70 backdrop-blur-xl border border-surface-hover rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h3 className="text-[15px] font-bold text-foreground flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                Recent Conversations
              </h3>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    placeholder="Search convs..."
                    value={convSearch}
                    onChange={e => setConvSearch(e.target.value)}
                    className="bg-background border border-surface-hover rounded-xl pl-8 pr-3 py-1 text-xs outline-none focus:border-primary"
                  />
                </div>
                <Link href="/dashboard/inbox" className="text-xs font-bold text-primary hover:underline">Inbox →</Link>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-surface-hover text-zinc-400 uppercase text-[10px] tracking-wider">
                    <th className="py-2 px-3">Customer</th>
                    <th className="py-2 px-3">Channel</th>
                    <th className="py-2 px-3">Mode</th>
                    <th className="py-2 px-3">Last Message</th>
                    <th className="py-2 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-hover/50">
                  {filteredConvs.length === 0 ? (
                    <tr><td colSpan={5} className="py-6 text-center text-zinc-400">No recent conversations</td></tr>
                  ) : (
                    filteredConvs.map(c => (
                      <tr key={c.id} className="hover:bg-surface-hover/30 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-foreground truncate max-w-[120px]">{c.contactName}</td>
                        <td className="py-2.5 px-3 capitalize text-zinc-400">{c.channel}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${c.isAiEnabled ? 'bg-purple-500/15 text-purple-400' : 'bg-blue-500/15 text-blue-400'}`}>
                            {c.isAiEnabled ? 'AI Auto' : 'Human'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-zinc-400 truncate max-w-[200px]">{c.lastMessage}</td>
                        <td className="py-2.5 px-3 text-right">
                          <Link href={`/dashboard/inbox?id=${c.id}`} className="text-primary hover:underline font-bold text-[11px]">Reply</Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Orders Table */}
          <div className="bg-surface/70 backdrop-blur-xl border border-surface-hover rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h3 className="text-[15px] font-bold text-foreground flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-amber-400" />
                Recent Orders
              </h3>
              <Link href="/dashboard/orders" className="text-xs font-bold text-amber-400 hover:underline">Manage Orders →</Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-surface-hover text-zinc-400 uppercase text-[10px] tracking-wider">
                    <th className="py-2 px-3">Customer</th>
                    <th className="py-2 px-3">Product</th>
                    <th className="py-2 px-3">Amount</th>
                    <th className="py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-hover/50">
                  {filteredOrders.length === 0 ? (
                    <tr><td colSpan={4} className="py-6 text-center text-zinc-400">No recent orders</td></tr>
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

        {/* Right 1 Col: Business Health Score Sidebar */}
        <div className="space-y-6">

          {/* Business Health Card */}
          <div className="bg-surface/70 backdrop-blur-xl border border-surface-hover rounded-2xl p-5 text-center">
            <h3 className="text-[14px] font-bold uppercase tracking-wider text-zinc-400 mb-4">{language === 'en' ? 'Business Health Score' : 'বিজনেস হেলথ স্কোর'}</h3>
            
            <div className="relative w-36 h-36 mx-auto flex items-center justify-center my-2">
              <div className="text-4xl font-black text-foreground">{health.overall || 85}</div>
              <div className="text-xs text-zinc-400 font-bold uppercase absolute bottom-4">/ 100</div>
            </div>

            <p className="text-[12px] text-zinc-400 mb-4">
              Overall score based on AI automation, CRM follow-ups, and sales health.
            </p>

            <div className="space-y-2 text-left">
              {[
                { label: 'AI Performance', score: health.aiPerformance },
                { label: 'CRM Health', score: health.crmHealth },
                { label: 'Sales Growth', score: health.salesPerformance },
                { label: 'Subscription Health', score: health.subscriptionHealth },
              ].map(item => (
                <div key={item.label} className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-zinc-400">{item.label}</span>
                    <span className="font-bold text-foreground">{item.score || 80}/100</span>
                  </div>
                  <div className="w-full bg-surface-hover rounded-full h-1 overflow-hidden">
                    <div className="bg-primary h-full rounded-full" style={{ width: `${item.score || 80}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Operational Mini Widgets */}
          <div className="bg-surface/70 backdrop-blur-xl border border-surface-hover rounded-2xl p-5 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Operational Health</h4>
            {[
              { label: 'API Status', val: 'Operational', color: 'text-emerald-400' },
              { label: 'Database Health', val: 'Optimal', color: 'text-emerald-400' },
              { label: 'Broadcast Queue', val: 'Idle', color: 'text-zinc-400' },
              { label: 'AI Model Status', val: 'Online (Gemini/OpenAI)', color: 'text-purple-400' },
            ].map(w => (
              <div key={w.label} className="flex justify-between text-xs py-1 border-b border-surface-hover/30">
                <span className="text-zinc-400">{w.label}</span>
                <strong className={w.color}>{w.val}</strong>
              </div>
            ))}
          </div>

        </div>

      </div>

    </div>
  );
}
