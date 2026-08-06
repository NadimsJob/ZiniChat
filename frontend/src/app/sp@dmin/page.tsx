'use client';

import { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { useCurrency } from '@/components/CurrencyProvider';
import { useLanguage } from '@/components/LanguageProvider';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  Users, MessageSquare, Bot, TrendingUp, DollarSign,
  Ticket, Wifi, ShoppingBag, Zap, Activity, Globe,
  ArrowUpRight, ArrowDownRight, Building2, UserCheck,
  LayoutGrid, Radio
} from 'lucide-react';

const BRAND_GREEN = '#1F824A';
const BRAND_ORANGE = '#EE8D27';
const COLORS = ['#1F824A', '#EE8D27', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'];

function StatCard({ icon: Icon, label, value, sub, trend, color = 'text-foreground' }: any) {
  return (
    <div className="bg-surface/70 backdrop-blur-xl border border-surface-hover rounded-xl p-4 flex flex-col gap-2 shadow-lg hover:border-primary/40 transition-all duration-300 group">
      <div className="flex items-center justify-between">
        <div className={`p-2 rounded-lg bg-background/60`}>
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
        {trend !== undefined && (
          <span className={`text-[10px] font-bold flex items-center gap-0.5 ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div>
        <p className="text-[11px] text-zinc-400 font-medium">{label}</p>
        <p className={`text-[22px] font-bold tracking-tight ${color}`}>{value}</p>
        {sub && <p className="text-[10px] text-zinc-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-1 h-4 rounded-full bg-gradient-to-b from-primary to-secondary" />
      <h2 className="text-[13px] font-bold text-foreground">{children}</h2>
    </div>
  );
}

function ChartCard({ title, children, className = '' }: any) {
  return (
    <div className={`bg-surface/70 backdrop-blur-xl border border-surface-hover rounded-xl p-4 shadow-lg ${className}`}>
      <p className="text-[12px] font-bold text-zinc-300 mb-3">{title}</p>
      {children}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background/95 border border-surface-hover rounded-lg px-3 py-2 text-[11px] shadow-xl">
        <p className="font-bold text-zinc-300 mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }}>{p.name}: <span className="font-bold">{p.value?.toLocaleString()}</span></p>
        ))}
      </div>
    );
  }
  return null;
};

export default function SuperadminPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toCurrency, formatBDT } = useCurrency();
  const { language } = useLanguage();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = Cookies.get('access_token');
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/stats/overview`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) setStats(await res.json());
      } catch (err) {
        console.error('Failed to fetch stats', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const shimmer = 'animate-pulse bg-surface-hover rounded-lg';

  if (loading) return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <div className={`h-6 w-48 ${shimmer}`} />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[...Array(6)].map((_, i) => <div key={i} className={`h-28 ${shimmer}`} />)}
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className={`h-56 ${shimmer}`} />)}
      </div>
    </div>
  );

  const revenueGrowthNum = stats?.revenueGrowth ? parseFloat(stats.revenueGrowth) : null;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[16px] font-bold tracking-tight text-foreground">
            {language === 'en' ? 'Platform Overview' : 'প্ল্যাটফর্ম ওভারভিউ'}
          </h1>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            {language === 'en' ? 'Real-time insights across all platform dimensions' : 'সকল প্ল্যাটফর্ম মেট্রিক্সের রিয়েল-টাইম বিশ্লেষণ'}
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-bold text-emerald-400">
            {language === 'en' ? 'Live Data' : 'লাইভ ডেটা'}
          </span>
        </div>
      </div>

      {/* ── SECTION 1: KPI HERO ROW ── */}
      <div>
        <SectionTitle>{language === 'en' ? '📊 Key Performance Indicators' : '📊 মূল পারফরম্যান্স সূচক'}</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard
            icon={DollarSign}
            label={language === 'en' ? `MRR (${toCurrency})` : `মাসিক রেভিনিউ (${toCurrency})`}
            value={formatBDT(stats?.monthRevenue || 0)}
            sub={language === 'en' ? `Total: ${formatBDT(stats?.totalRevenue || 0)}` : `মোট: ${formatBDT(stats?.totalRevenue || 0)}`}
            trend={revenueGrowthNum}
            color="text-emerald-400"
          />
          <StatCard
            icon={Building2}
            label={language === 'en' ? 'Total Tenants' : 'মোট টেনান্ট'}
            value={stats?.totalTenants || 0}
            sub={language === 'en' ? `+${stats?.newTenantsThisMonth || 0} this month` : `+${stats?.newTenantsThisMonth || 0} এই মাসে`}
            color="text-blue-400"
          />
          <StatCard
            icon={MessageSquare}
            label={language === 'en' ? 'Total Messages' : 'মোট মেসেজ'}
            value={(stats?.totalMessages || 0).toLocaleString()}
            sub={language === 'en' ? `${stats?.openConversations || 0} open convs` : `${stats?.openConversations || 0} টি খোলা কথোপকথন`}
            color="text-purple-400"
          />
          <StatCard
            icon={Bot}
            label={language === 'en' ? 'AI Tokens (Month)' : 'এআই টোকেন (মাসে)'}
            value={(stats?.monthAiTokens || 0).toLocaleString()}
            sub={language === 'en' ? `Total: ${(stats?.totalAiTokens || 0).toLocaleString()}` : `মোট: ${(stats?.totalAiTokens || 0).toLocaleString()}`}
            color="text-orange-400"
          />
          <StatCard
            icon={Ticket}
            label={language === 'en' ? 'Open Tickets' : 'খোলা টিকেট'}
            value={stats?.openTickets || 0}
            sub={language === 'en' ? `${stats?.resolvedTickets || 0} resolved` : `${stats?.resolvedTickets || 0} সমাধান হয়েছে`}
            color={stats?.openTickets > 10 ? 'text-red-400' : 'text-amber-400'}
          />
          <StatCard
            icon={UserCheck}
            label={language === 'en' ? 'Active Subs' : 'সক্রিয় সাবস্ক্রিপশন'}
            value={stats?.activeSubscriptions || 0}
            sub={language === 'en' ? `${stats?.trialSubscriptions || 0} on trial` : `${stats?.trialSubscriptions || 0} ট্রায়ালে`}
            color="text-primary"
          />
        </div>
      </div>

      {/* ── SECTION 2: REVENUE & SUBSCRIPTIONS ── */}
      <div>
        <SectionTitle>{language === 'en' ? '💰 Revenue & Subscriptions' : '💰 রেভিনিউ ও সাবস্ক্রিপশন'}</SectionTitle>
        <div className="grid md:grid-cols-5 gap-4">
          <ChartCard title={language === 'en' ? '6-Month Revenue Trend (BDT)' : '৬ মাসের রেভিনিউ ট্রেন্ড'} className="col-span-3">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats?.revenueTrend || []} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#71717a' }} />
                <YAxis tick={{ fontSize: 10, fill: '#71717a' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="revenue" name="Revenue (BDT)" fill={BRAND_GREEN} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title={language === 'en' ? 'Subscriptions by Plan' : 'প্ল্যান অনুযায়ী সাবস্ক্রিপশন'} className="col-span-2">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={stats?.subscriptionsByPlan?.filter((p: any) => p.count > 0) || [{ name: 'No Data', count: 1 }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="count"
                  nameKey="name"
                >
                  {(stats?.subscriptionsByPlan || []).map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>

      {/* ── SECTION 3: ACTIVITY TRENDS ── */}
      <div>
        <SectionTitle>{language === 'en' ? '📈 Platform Activity (7 Days)' : '📈 প্ল্যাটফর্ম কার্যক্রম (৭ দিন)'}</SectionTitle>
        <div className="grid md:grid-cols-2 gap-4">
          <ChartCard title={language === 'en' ? 'Messages & Conversations' : 'মেসেজ ও কথোপকথন'}>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={stats?.messageTrend || []} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="msgGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="convGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={BRAND_GREEN} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={BRAND_GREEN} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#71717a' }} />
                <YAxis tick={{ fontSize: 10, fill: '#71717a' }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                <Area type="monotone" dataKey="messages" name="Messages" stroke="#8b5cf6" fill="url(#msgGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="conversations" name="Conversations" stroke={BRAND_GREEN} fill="url(#convGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title={language === 'en' ? 'AI Token Usage' : 'এআই টোকেন ব্যবহার'}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={stats?.aiTrend || []} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#71717a' }} />
                <YAxis tick={{ fontSize: 10, fill: '#71717a' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="tokens" name="Tokens" fill={BRAND_ORANGE} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>

      {/* ── SECTION 4: TENANT INTELLIGENCE & CHANNELS ── */}
      <div>
        <SectionTitle>{language === 'en' ? '🏢 Tenant Intelligence & Channels' : '🏢 টেনান্ট বিশ্লেষণ ও চ্যানেল'}</SectionTitle>
        <div className="grid lg:grid-cols-3 md:grid-cols-2 gap-4">
          <ChartCard title={language === 'en' ? 'Top Tenants by Messages' : 'মেসেজ অনুযায়ী শীর্ষ টেনান্ট'}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={(stats?.topTenantsByMessages || []).map((t: any) => ({
                  name: t.brandName || t.businessName || 'Tenant',
                  messages: t.messageCount,
                }))}
                layout="vertical"
                margin={{ top: 0, right: 20, left: 60, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#71717a' }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#a1a1aa' }} width={60} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="messages" name="Messages" fill={BRAND_GREEN} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title={language === 'en' ? 'Channel Distribution' : 'চ্যানেল বিতরণ'}>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={stats?.channelDistribution?.length > 0 ? stats.channelDistribution : [{ name: 'No channels', count: 1 }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="count"
                  nameKey="name"
                >
                  {(stats?.channelDistribution || []).map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 flex justify-around text-center">
              <div>
                <p className="text-[18px] font-bold text-primary">{stats?.activeChannels || 0}</p>
                <p className="text-[9px] text-zinc-500">{language === 'en' ? 'Active' : 'সক্রিয়'}</p>
              </div>
              <div>
                <p className="text-[18px] font-bold text-zinc-400">{(stats?.totalChannels || 0) - (stats?.activeChannels || 0)}</p>
                <p className="text-[9px] text-zinc-500">{language === 'en' ? 'Inactive' : 'নিষ্ক্রিয়'}</p>
              </div>
            </div>
          </ChartCard>

          <ChartCard title={language === 'en' ? 'Tenants by Business Nature' : 'ব্যবসার ধরন অনুযায়ী টেনান্ট'}>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={stats?.tenantsByBusinessNature?.length > 0 ? stats.tenantsByBusinessNature : [{ name: 'No data', count: 1 }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="count"
                  nameKey="name"
                >
                  {(stats?.tenantsByBusinessNature || []).map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>

      {/* ── SECTION 5: OPERATIONAL OVERVIEW ── */}
      <div>
        <SectionTitle>{language === 'en' ? '⚙️ Operational Overview' : '⚙️ অপারেশনাল ওভারভিউ'}</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

          {/* Ticket Status */}
          <div className="bg-surface/70 backdrop-blur-xl border border-surface-hover rounded-xl p-4 shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <Ticket className="w-4 h-4 text-amber-400" />
              <p className="text-[11px] font-bold text-zinc-300">{language === 'en' ? 'Support Tickets' : 'সাপোর্ট টিকেট'}</p>
            </div>
            <div className="space-y-2">
              {[
                { label: language === 'en' ? 'Open' : 'খোলা', value: stats?.openTickets || 0, color: 'bg-red-500' },
                { label: language === 'en' ? 'Pending' : 'অপেক্ষমান', value: stats?.pendingTickets || 0, color: 'bg-amber-500' },
                { label: language === 'en' ? 'Resolved' : 'সমাধান', value: stats?.resolvedTickets || 0, color: 'bg-emerald-500' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${item.color}`} />
                    <span className="text-[10px] text-zinc-400">{item.label}</span>
                  </div>
                  <span className="text-[12px] font-bold text-foreground">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Team */}
          <div className="bg-surface/70 backdrop-blur-xl border border-surface-hover rounded-xl p-4 shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-blue-400" />
              <p className="text-[11px] font-bold text-zinc-300">{language === 'en' ? 'Team Stats' : 'টিম পরিসংখ্যান'}</p>
            </div>
            <div className="space-y-2">
              {[
                { label: language === 'en' ? 'Total Users' : 'মোট ইউজার', value: stats?.totalUsers || 0 },
                { label: language === 'en' ? 'Agents' : 'এজেন্ট', value: stats?.totalAgents || 0 },
                { label: language === 'en' ? 'Onboarded' : 'অনবোর্ডেড', value: stats?.onboardedTenants || 0 },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-400">{item.label}</span>
                  <span className="text-[12px] font-bold text-foreground">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Commerce */}
          <div className="bg-surface/70 backdrop-blur-xl border border-surface-hover rounded-xl p-4 shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <ShoppingBag className="w-4 h-4 text-purple-400" />
              <p className="text-[11px] font-bold text-zinc-300">{language === 'en' ? 'Commerce' : 'কমার্স'}</p>
            </div>
            <div className="space-y-2">
              {[
                { label: language === 'en' ? 'Products' : 'পণ্য', value: stats?.totalProducts || 0 },
                { label: language === 'en' ? 'Orders' : 'অর্ডার', value: stats?.totalOrders || 0 },
                { label: language === 'en' ? 'Order Revenue' : 'অর্ডার রেভিনিউ', value: formatBDT(stats?.orderRevenue || 0) },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-400">{item.label}</span>
                  <span className="text-[12px] font-bold text-foreground">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Engagement */}
          <div className="bg-surface/70 backdrop-blur-xl border border-surface-hover rounded-xl p-4 shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-yellow-400" />
              <p className="text-[11px] font-bold text-zinc-300">{language === 'en' ? 'Engagement' : 'এনগেজমেন্ট'}</p>
            </div>
            <div className="space-y-2">
              {[
                { label: language === 'en' ? 'Contacts' : 'কন্টাক্ট', value: (stats?.totalContacts || 0).toLocaleString() },
                { label: language === 'en' ? 'Automations' : 'অটোমেশন', value: stats?.totalAutomations || 0 },
                { label: language === 'en' ? 'Broadcasts' : 'ব্রডকাস্ট', value: stats?.totalBroadcasts || 0 },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-400">{item.label}</span>
                  <span className="text-[12px] font-bold text-foreground">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 6: TENANT SIGNUPS TREND ── */}
      <div>
        <SectionTitle>{language === 'en' ? '🆕 New Tenant Signups (7 Days)' : '🆕 নতুন টেনান্ট সাইনআপ (৭ দিন)'}</SectionTitle>
        <ChartCard title="">
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={stats?.newTenantsTrend || []} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="tenantGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#71717a' }} />
              <YAxis tick={{ fontSize: 10, fill: '#71717a' }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="tenants" name="New Tenants" stroke="#3b82f6" fill="url(#tenantGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── SECTION 7: RECENT AUDIT FEED ── */}
      <div>
        <SectionTitle>{language === 'en' ? '📋 Recent Platform Activity' : '📋 সাম্প্রতিক প্ল্যাটফর্ম কার্যক্রম'}</SectionTitle>
        <div className="bg-surface/70 backdrop-blur-xl border border-surface-hover rounded-xl overflow-hidden shadow-lg">
          {(stats?.recentAuditLogs || []).length === 0 ? (
            <div className="p-6 text-center text-[12px] text-zinc-500">
              {language === 'en' ? 'No recent activity' : 'কোনো সাম্প্রতিক কার্যক্রম নেই'}
            </div>
          ) : (
            <div className="divide-y divide-surface-hover">
              {(stats?.recentAuditLogs || []).map((log: any) => (
                <div key={log.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-surface-hover/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <Activity className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-foreground">{log.action}</p>
                      <p className="text-[10px] text-zinc-500">
                        {log.actorUser?.name || 'Unknown'} • {log.targetTenant?.businessName || 'Platform'}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] text-zinc-500 shrink-0">
                    {new Date(log.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
