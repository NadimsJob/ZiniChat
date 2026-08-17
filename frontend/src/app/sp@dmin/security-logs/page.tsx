'use client';

import { useEffect, useState, useCallback } from 'react';
import Cookies from 'js-cookie';
import { useLanguage } from '@/components/LanguageProvider';
import {
  ShieldAlert, Search, Filter, RefreshCw, Download,
  CheckCircle2, XCircle, AlertCircle, Monitor, Smartphone,
  Tablet, Bot, Globe2, ChevronLeft, ChevronRight,
  Clock, User, MapPin, Laptop
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface LoginLog {
  id: string;
  email: string;
  userId: string | null;
  ipAddress: string;
  browser: string | null;
  os: string | null;
  deviceType: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  status: 'SUCCESS' | 'FAILED' | 'LOCKED_OUT';
  failReason: string | null;
  authMethod: string;
  createdAt: string;
}

interface LogsResponse {
  data: LoginLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface Stats {
  last24h: { total: number; success: number; failed: number };
  last7d: { total: number; failed: number };
  topFailedIps: { ip: string; count: number }[];
}

const STATUS_CONFIG = {
  SUCCESS: { label: 'Success', labelBn: 'সফল', color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/30', Icon: CheckCircle2 },
  FAILED: { label: 'Failed', labelBn: 'ব্যর্থ', color: 'text-red-500', bg: 'bg-red-500/10 border-red-500/30', Icon: XCircle },
  LOCKED_OUT: { label: 'Locked Out', labelBn: 'লক আউট', color: 'text-orange-500', bg: 'bg-orange-500/10 border-orange-500/30', Icon: AlertCircle },
};

const DEVICE_ICON: Record<string, React.ElementType> = {
  Desktop: Monitor,
  Mobile: Smartphone,
  Tablet: Tablet,
  Bot: Bot,
  Unknown: Laptop,
};

const AUTH_METHOD_LABEL: Record<string, string> = {
  password: 'Password',
  google_oauth: 'Google OAuth',
  google_sso: 'Google SSO',
};

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function SecurityLogsPage() {
  const { language } = useLanguage();
  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [emailFilter, setEmailFilter] = useState('');
  const [ipFilter, setIpFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const limit = 20;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const token = Cookies.get('access_token');
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (statusFilter) params.set('status', statusFilter);
      if (emailFilter) params.set('email', emailFilter);
      if (ipFilter) params.set('ipAddress', ipFilter);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);

      const res = await fetch(`${API}/login-logs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data: LogsResponse = await res.json();
        setLogs(data.data);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      }
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, emailFilter, ipFilter, dateFrom, dateTo]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/login-logs/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setStats(await res.json());
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setEmailFilter(searchInput);
    setPage(1);
  };

  const handleReset = () => {
    setStatusFilter('');
    setEmailFilter('');
    setIpFilter('');
    setDateFrom('');
    setDateTo('');
    setSearchInput('');
    setPage(1);
  };

  const handleExportCsv = () => {
    if (!logs.length) return;
    const headers = ['Email', 'Status', 'Auth Method', 'IP Address', 'Browser', 'OS', 'Device', 'Country', 'City', 'Fail Reason', 'Timestamp'];
    const rows = logs.map(l => [
      l.email, l.status, l.authMethod, l.ipAddress,
      l.browser || '', l.os || '', l.deviceType || '',
      l.country || '', l.city || '', l.failReason || '',
      new Date(l.createdAt).toISOString()
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `login_logs_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-full p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">
              {language === 'en' ? 'Security Login Logs' : 'সিকিউরিটি লগইন লগস'}
            </h1>
            <p className="text-xs text-muted-foreground">
              {language === 'en'
                ? 'Immutable audit trail of all login attempts. 90-day auto-retention.'
                : 'সকল লগইন প্রচেষ্টার অপরিবর্তনীয় অডিট ট্রেইল। ৯০ দিন অটো-রিটেনশন।'}
            </p>
          </div>
        </div>
        <button
          onClick={handleExportCsv}
          className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-border bg-card text-foreground hover:bg-muted transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          {language === 'en' ? 'Export CSV' : 'CSV ডাউনলোড'}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label={language === 'en' ? 'Total (24h)' : 'মোট (২৪ঘ)'}
          value={statsLoading ? '—' : String(stats?.last24h.total ?? 0)}
          sub={language === 'en' ? 'all attempts' : 'সব প্রচেষ্টা'}
          color="text-foreground"
          bg="bg-card border-border"
        />
        <StatCard
          label={language === 'en' ? 'Success (24h)' : 'সফল (২৪ঘ)'}
          value={statsLoading ? '—' : String(stats?.last24h.success ?? 0)}
          sub={language === 'en' ? 'valid logins' : 'বৈধ লগইন'}
          color="text-emerald-500"
          bg="bg-emerald-500/5 border-emerald-500/20"
        />
        <StatCard
          label={language === 'en' ? 'Failed (24h)' : 'ব্যর্থ (২৪ঘ)'}
          value={statsLoading ? '—' : String(stats?.last24h.failed ?? 0)}
          sub={language === 'en' ? 'failed attempts' : 'ব্যর্থ প্রচেষ্টা'}
          color="text-red-500"
          bg="bg-red-500/5 border-red-500/20"
        />
        <StatCard
          label={language === 'en' ? 'Failed (7d)' : 'ব্যর্থ (৭দ)'}
          value={statsLoading ? '—' : String(stats?.last7d.failed ?? 0)}
          sub={language === 'en' ? 'last 7 days' : 'শেষ ৭ দিন'}
          color="text-orange-500"
          bg="bg-orange-500/5 border-orange-500/20"
        />
      </div>

      {/* Top Suspicious IPs */}
      {stats?.topFailedIps && stats.topFailedIps.length > 0 && (
        <div className="bg-card border border-red-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <h3 className="text-sm font-semibold text-foreground">
              {language === 'en' ? 'Top IPs with Failed Attempts (24h)' : 'শীর্ষ সন্দেহজনক আইপি (২৪ঘ)'}
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {stats.topFailedIps.map((ip) => (
              <div
                key={ip.ip}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-xs font-mono"
              >
                <span className="text-red-400 font-bold">{ip.ip}</span>
                <span className="text-muted-foreground">({ip.count} fails)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">
            {language === 'en' ? 'Filters' : 'ফিল্টার'}
          </span>
        </div>
        <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Email Search */}
          <div className="relative sm:col-span-2 md:col-span-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={language === 'en' ? 'Search email...' : 'ইমেইল খুঁজুন...'}
              className="w-full pl-8 pr-3 py-2 text-xs bg-muted border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
          {/* IP Filter */}
          <input
            type="text"
            value={ipFilter}
            onChange={(e) => { setIpFilter(e.target.value); setPage(1); }}
            placeholder={language === 'en' ? 'IP Address' : 'আইপি ঠিকানা'}
            className="w-full px-3 py-2 text-xs bg-muted border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="w-full px-3 py-2 text-xs bg-muted border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/50"
          >
            <option value="">{language === 'en' ? 'All Status' : 'সব স্ট্যাটাস'}</option>
            <option value="SUCCESS">{language === 'en' ? 'Success' : 'সফল'}</option>
            <option value="FAILED">{language === 'en' ? 'Failed' : 'ব্যর্থ'}</option>
            <option value="LOCKED_OUT">{language === 'en' ? 'Locked Out' : 'লক আউট'}</option>
          </select>
          {/* Date Range */}
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="w-full px-3 py-2 text-xs bg-muted border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="w-full px-3 py-2 text-xs bg-muted border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </form>
        <div className="flex gap-2">
          <button
            onClick={() => { setEmailFilter(searchInput); setPage(1); }}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
          >
            {language === 'en' ? 'Apply' : 'প্রয়োগ করুন'}
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            {language === 'en' ? 'Reset' : 'রিসেট'}
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground">
            {language === 'en' ? `${total} records found` : `${total}টি রেকর্ড পাওয়া গেছে`}
          </span>
          <button
            onClick={() => { fetchLogs(); fetchStats(); }}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border border-border bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            {language === 'en' ? 'Refresh' : 'রিফ্রেশ'}
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <ShieldAlert className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">{language === 'en' ? 'No login logs found' : 'কোনো লগইন লগ পাওয়া যায়নি'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground whitespace-nowrap">
                    {language === 'en' ? 'Status' : 'স্ট্যাটাস'}
                  </th>
                  <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground whitespace-nowrap">
                    {language === 'en' ? 'Email' : 'ইমেইল'}
                  </th>
                  <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground whitespace-nowrap">
                    {language === 'en' ? 'IP Address' : 'আইপি ঠিকানা'}
                  </th>
                  <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground whitespace-nowrap">
                    {language === 'en' ? 'Device' : 'ডিভাইস'}
                  </th>
                  <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground whitespace-nowrap">
                    {language === 'en' ? 'Location' : 'লোকেশন'}
                  </th>
                  <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground whitespace-nowrap">
                    {language === 'en' ? 'Method' : 'পদ্ধতি'}
                  </th>
                  <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground whitespace-nowrap">
                    {language === 'en' ? 'Time' : 'সময়'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map((log) => {
                  const sc = STATUS_CONFIG[log.status] || STATUS_CONFIG.FAILED;
                  const DevIcon = DEVICE_ICON[log.deviceType || 'Unknown'] || Laptop;
                  return (
                    <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${sc.bg} ${sc.color}`}>
                          <sc.Icon className="w-3 h-3" />
                          {language === 'en' ? sc.label : sc.labelBn}
                        </span>
                        {log.failReason && (
                          <div className="mt-0.5 text-[10px] text-muted-foreground">
                            {log.failReason.replace(/_/g, ' ')}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3 h-3 text-muted-foreground shrink-0" />
                          <span className="text-foreground font-medium truncate max-w-[180px]">{log.email}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-muted-foreground">{log.ipAddress}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <DevIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <div>
                            <div className="text-foreground">{log.browser || 'Unknown'}</div>
                            <div className="text-[10px] text-muted-foreground">{log.os || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {log.country ? (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                            <span className="text-foreground">
                              {[log.city, log.country].filter(Boolean).join(', ')}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-medium border border-border">
                          {AUTH_METHOD_LABEL[log.authMethod] || log.authMethod}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-muted-foreground whitespace-nowrap">
                          <Clock className="w-3 h-3 shrink-0" />
                          <span title={new Date(log.createdAt).toLocaleString()}>
                            {formatRelativeTime(log.createdAt)}
                          </span>
                        </div>
                        <div className="text-[10px] text-muted-foreground/60 mt-0.5">
                          {new Date(log.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-border flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {language === 'en'
                ? `Page ${page} of ${totalPages}`
                : `পেজ ${page} / ${totalPages}`}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-border bg-muted text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-border bg-muted text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Security Notice */}
      <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-xs text-amber-700 dark:text-amber-400">
        <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          {language === 'en'
            ? 'These logs are read-only and immutable. Passwords, tokens, and OTP codes are never stored. Records older than 90 days are automatically purged.'
            : 'এই লগগুলো শুধুমাত্র পড়ার যোগ্য এবং অপরিবর্তনীয়। পাসওয়ার্ড, টোকেন বা OTP কোড কখনো সংরক্ষণ করা হয় না। ৯০ দিনের পুরানো রেকর্ড স্বয়ংক্রিয়ভাবে মুছে ফেলা হয়।'}
        </p>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color, bg }: {
  label: string; value: string; sub: string; color: string; bg: string;
}) {
  return (
    <div className={`rounded-xl border p-3.5 ${bg}`}>
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
    </div>
  );
}
