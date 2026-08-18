'use client';

import { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { useCurrency } from '@/components/CurrencyProvider';
import { 
  Building2, 
  CreditCard, 
  Clock, 
  Search, 
  Filter, 
  LogIn, 
  CheckCircle, 
  AlertTriangle,
  XCircle, 
  ChevronRight, 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  Plus, 
  X, 
  RefreshCw, 
  Zap, 
  ArrowUpRight,
  ShieldAlert,
  Loader2,
  FileText
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import AdminLoader from '@/components/AdminLoader';
import AdminPagination from '@/components/AdminPagination';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function SuperadminBillingPage() {
  const { formatBDT } = useCurrency();
  const [data, setData] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'subscriptions' | 'payments'>('subscriptions');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'trialing' | 'expiring' | 'expired'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);

  const [subPage, setSubPage] = useState(1);
  const [subPageSize, setSubPageSize] = useState(10);
  const [payPage, setPayPage] = useState(1);
  const [payPageSize, setPayPageSize] = useState(10);

  const fetchOverview = async () => {
    try {
      const token = Cookies.get('access_token');
      const [overviewRes, paymentsRes] = await Promise.all([
        fetch(`${API}/billing/admin/overview`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/billing/payments`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (overviewRes.ok) {
        const overviewData = await overviewRes.json();
        setData(overviewData);
      }
      if (paymentsRes.ok) {
        const paymentsData = await paymentsRes.json();
        setPayments(paymentsData);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load billing overview data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const handleImpersonate = async (tenantId: string, tenantName: string, role: string = 'owner') => {
    try {
      setImpersonatingId(tenantId);
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/tenants/${tenantId}/impersonate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to impersonate tenant');
      }

      const resData = await res.json();
      if (resData.access_token) {
        toast.success(`Opening ${tenantName} workspace...`);
        const userRole = resData.user?.role || role || 'owner';
        const encTenant = encodeURIComponent(tenantName);
        window.open(`/sp@dmin/impersonate?token=${resData.access_token}&role=${userRole}&tenant=${encTenant}`, '_blank');
      } else {
        throw new Error('No impersonation token returned');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Could not enter tenant workspace');
    } finally {
      setImpersonatingId(null);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-zinc-500 animate-pulse">Loading billing & subscription ledger...</div>;
  }

  const subscriptions: any[] = data?.subscriptions || [];
  const stats = data?.stats || {};

  // Date threshold for Expiring Soon (7 days)
  const now = new Date();
  const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Filter Subscriptions
  const filteredSubscriptions = subscriptions.filter((sub) => {
    const tenantName = sub.tenant?.businessName || '';
    const ownerName = sub.tenant?.users?.[0]?.name || '';
    const ownerEmail = sub.tenant?.users?.[0]?.email || '';
    const planName = sub.plan?.name || '';
    const query = searchQuery.toLowerCase();

    const matchesSearch =
      tenantName.toLowerCase().includes(query) ||
      ownerName.toLowerCase().includes(query) ||
      ownerEmail.toLowerCase().includes(query) ||
      planName.toLowerCase().includes(query);

    if (!matchesSearch) return false;

    const endDate = new Date(sub.currentPeriodEnd);
    const isExpiringSoon = sub.status === 'active' && endDate >= now && endDate <= next7Days;

    if (statusFilter === 'active') {
      return sub.status === 'active' && Number(sub.plan?.priceMonthlyBdt || 0) > 0;
    }
    if (statusFilter === 'trialing') {
      return sub.status === 'trialing' || Number(sub.plan?.priceMonthlyBdt || 0) === 0;
    }
    if (statusFilter === 'expiring') {
      return isExpiringSoon;
    }
    if (statusFilter === 'expired') {
      return sub.status === 'expired' || sub.status === 'suspended' || endDate < now;
    }
    return true;
  });

  // Filter Payments
  const filteredPayments = payments.filter((p) => {
    const tenantName = p.tenant?.businessName || '';
    const trxId = p.trxId || '';
    const query = searchQuery.toLowerCase();
    return tenantName.toLowerCase().includes(query) || trxId.toLowerCase().includes(query);
  });

  if (loading) {
    return <AdminLoader message="Loading financial metrics & subscription ledgers..." />;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4 animate-in fade-in duration-500 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> Billing & Revenue Operations
          </h1>
          <p className="text-xs text-slate-600 dark:text-zinc-400 mt-0.5">Financial metrics, subscription renewal ledger & payment histories</p>
        </div>

        {/* View Toggle Tabs */}
        <div className="flex items-center bg-white dark:bg-surface border border-slate-200 dark:border-surface-hover p-1 rounded-xl shrink-0 shadow-sm">
          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'subscriptions'
                ? 'bg-primary text-white shadow-md'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Subscriptions ({subscriptions.length})
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'payments'
                ? 'bg-primary text-white shadow-md'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Payment History ({payments.length})
          </button>
        </div>
      </div>

      {/* Financial KPI Summary Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {/* MRR Card */}
        <div className="bg-white dark:bg-surface border border-slate-200/80 dark:border-surface-hover rounded-2xl p-4 shadow-sm dark:shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400 uppercase tracking-wider">Monthly Revenue (MRR)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2 font-mono">
            {formatBDT(stats.mrrBdt || 0)} <span className="text-xs font-normal text-slate-500 dark:text-zinc-500">/mo</span>
          </p>
          <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1 font-medium">From {stats.activeSubscriptionsCount || 0} active paid subscriptions</p>
        </div>

        {/* Total Collected Card */}
        <div className="bg-white dark:bg-surface border border-slate-200/80 dark:border-surface-hover rounded-2xl p-4 shadow-sm dark:shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400 uppercase tracking-wider">Total Collected</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-extrabold text-blue-600 dark:text-blue-400 mt-2 font-mono">
            {formatBDT(stats.totalCollectedBdt || 0)}
          </p>
          <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1 font-medium">Lifetime successful manual payments</p>
        </div>

        {/* Pending Collections Card */}
        <div className="bg-white dark:bg-surface border border-slate-200/80 dark:border-surface-hover rounded-2xl p-4 shadow-sm dark:shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400 uppercase tracking-wider">Pending Approval</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-extrabold text-amber-600 dark:text-amber-400 mt-2 font-mono">
            {formatBDT(stats.pendingAmountBdt || 0)}
          </p>
          <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1 font-medium">{stats.pendingPaymentsCount || 0} manual payment claim(s)</p>
        </div>

        {/* Expiring Soon Card */}
        <div className="bg-white dark:bg-surface border border-slate-200/80 dark:border-surface-hover rounded-2xl p-4 shadow-sm dark:shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400 uppercase tracking-wider">Expiring Soon (7d)</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-extrabold text-purple-600 dark:text-purple-400 mt-2 font-mono">
            {stats.expiringSoonCount || 0} <span className="text-xs font-normal text-slate-500 dark:text-zinc-500">tenants</span>
          </p>
          <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1 font-medium">Require renewal in next 7 days</p>
        </div>
      </div>

      {/* Main Ledger Content */}
      {activeTab === 'subscriptions' ? (
        <div className="space-y-3">
          {/* Controls Bar: Filters & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-surface border border-slate-200/80 dark:border-surface-hover p-2.5 rounded-2xl shadow-sm">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-xs text-slate-400 dark:text-zinc-500 font-medium px-2 flex items-center gap-1">
                <Filter className="w-3 h-3" /> Filter:
              </span>
              {(['all', 'active', 'trialing', 'expiring', 'expired'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => {
                    setStatusFilter(st);
                    setSubPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer whitespace-nowrap ${
                    statusFilter === st
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-surface-hover hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {st === 'expiring' ? 'Expiring Soon' : st}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSubPage(1);
                }}
                placeholder="Search tenant or owner email..."
                className="w-full bg-slate-50 dark:bg-background border border-slate-300 dark:border-surface-hover rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-primary"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Subscriptions Table */}
          <div className="bg-white dark:bg-surface border border-slate-200/80 dark:border-surface-hover rounded-2xl overflow-hidden shadow-sm dark:shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[850px]">
                <thead className="bg-slate-100/90 dark:bg-surface-hover/50 text-slate-700 dark:text-zinc-300 font-semibold border-b border-slate-200 dark:border-surface-hover">
                  <tr>
                    <th className="px-4 py-3">Tenant & Owner</th>
                    <th className="px-4 py-3">Plan & Price</th>
                    <th className="px-4 py-3">Cycle</th>
                    <th className="px-4 py-3">Carried Bonus</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Next Renewal</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-surface-hover/50 text-slate-900 dark:text-zinc-200">
                  {filteredSubscriptions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500 dark:text-zinc-500">
                        No subscriptions match the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredSubscriptions.slice((subPage - 1) * subPageSize, subPage * subPageSize).map((sub) => {
                      const owner = sub.tenant?.users?.[0] || {};
                      const endDate = new Date(sub.currentPeriodEnd);
                      const isExpiringSoon = sub.status === 'active' && endDate >= now && endDate <= next7Days;
                      const isExpired = endDate < now;
                      const priceBdt = Number(sub.plan?.priceMonthlyBdt || 0);

                      return (
                        <tr key={sub.id} className="hover:bg-slate-50/80 dark:hover:bg-surface-hover/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-900 dark:text-white text-xs">{sub.tenant?.businessName || 'Unknown Tenant'}</div>
                            <div className="text-[11px] text-slate-600 dark:text-zinc-400 flex items-center gap-1.5 mt-0.5">
                              <span>{owner.name || 'Owner'}</span>
                              <span>•</span>
                              <span className="text-slate-500 dark:text-zinc-500 truncate max-w-[150px]">{owner.email || 'N/A'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-secondary">{sub.tenant?.customPlanName || sub.plan?.name || 'Custom Plan'}</div>
                            <div className="font-mono text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold mt-0.5">
                              {priceBdt > 0 ? formatBDT(priceBdt) : 'Free Trial'}
                            </div>
                          </td>
                          <td className="px-4 py-3 capitalize text-slate-600 dark:text-zinc-400">
                            {sub.billingCycle || 'monthly'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-[11px] text-amber-700 dark:text-amber-400 font-mono font-medium">
                              +{(sub.carriedForwardAiQuota || 0).toLocaleString()} AI
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-zinc-500 font-mono">
                              +{(sub.carriedForwardMessageQuota || 0).toLocaleString()} Msgs
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {isExpiringSoon ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                                EXPIRING SOON
                              </span>
                            ) : sub.status === 'active' ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                                ACTIVE
                              </span>
                            ) : sub.status === 'trialing' ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
                                TRIALING
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20">
                                {sub.status.toUpperCase()}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className={`font-mono text-xs ${isExpiringSoon ? 'text-amber-700 dark:text-amber-400 font-bold' : isExpired ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-zinc-300'}`}>
                              {endDate.toLocaleDateString()}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-zinc-500">
                              {isExpired ? 'Expired' : `${Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 3600 * 24))} days remaining`}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Link
                                href={`/sp@dmin/tenants/${sub.tenantId}`}
                                className="p-1.5 hover:bg-slate-100 dark:hover:bg-surface-hover text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors"
                                title="View Tenant Billing & Activity Report"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </Link>
                              <button
                                onClick={() => handleImpersonate(sub.tenantId, sub.tenant?.businessName || 'Tenant', owner.role)}
                                disabled={impersonatingId === sub.tenantId}
                                className="p-1.5 hover:bg-slate-100 dark:hover:bg-surface-hover text-slate-600 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg transition-colors cursor-pointer"
                                title="Enter Tenant Workspace (Impersonate)"
                              >
                                {impersonatingId === sub.tenantId ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600 dark:text-emerald-400" />
                                ) : (
                                  <LogIn className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <AdminPagination
              currentPage={subPage}
              totalItems={filteredSubscriptions.length}
              pageSize={subPageSize}
              onPageChange={setSubPage}
              onPageSizeChange={setSubPageSize}
            />
          </div>
        </div>
      ) : (
        /* Payments Ledger Tab */
        <div className="bg-white dark:bg-surface border border-slate-200/80 dark:border-surface-hover rounded-2xl overflow-hidden shadow-sm dark:shadow-xl space-y-3 p-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-surface-hover pb-3">
            <h2 className="text-xs font-bold text-slate-900 dark:text-zinc-200 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Complete Transaction History Ledger
            </h2>
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPayPage(1);
                }}
                placeholder="Search TrxID or Tenant..."
                className="w-full bg-slate-50 dark:bg-background border border-slate-300 dark:border-surface-hover rounded-xl pl-9 pr-3 py-1 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-slate-100/90 dark:bg-surface-hover/50 text-slate-700 dark:text-zinc-300 font-semibold border-b border-slate-200 dark:border-surface-hover">
                <tr>
                  <th className="px-3 py-2.5">Date & Time</th>
                  <th className="px-3 py-2.5">Tenant</th>
                  <th className="px-3 py-2.5">TrxID / Reference</th>
                  <th className="px-3 py-2.5">Provider</th>
                  <th className="px-3 py-2.5 text-right">Amount (BDT)</th>
                  <th className="px-3 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-surface-hover/50 text-slate-900 dark:text-zinc-200">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-slate-500 dark:text-zinc-500">
                      No transaction history found.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.slice((payPage - 1) * payPageSize, payPage * payPageSize).map((payment) => (
                    <tr key={payment.id} className="hover:bg-slate-50/80 dark:hover:bg-surface-hover/30 transition-colors">
                      <td className="px-3 py-2.5 text-slate-600 dark:text-zinc-400">{new Date(payment.createdAt).toLocaleString()}</td>
                      <td className="px-3 py-2.5 font-bold text-slate-900 dark:text-white">{payment.tenant?.businessName || 'Unknown'}</td>
                      <td className="px-3 py-2.5 font-mono text-slate-800 dark:text-zinc-300 select-all">{payment.trxId || 'N/A'}</td>
                      <td className="px-3 py-2.5 capitalize text-slate-600 dark:text-zinc-400">{payment.provider || 'manual'}</td>
                      <td className="px-3 py-2.5 font-mono font-bold text-emerald-600 dark:text-emerald-400 text-right">
                        {formatBDT(payment.amountBdt || 0)}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            payment.status === 'success'
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                              : payment.status === 'failed'
                              ? 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20'
                              : 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20'
                          }`}
                        >
                          {(payment.status || 'SUCCESS').toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <AdminPagination
            currentPage={payPage}
            totalItems={filteredPayments.length}
            pageSize={payPageSize}
            onPageChange={setPayPage}
            onPageSizeChange={setPayPageSize}
          />
        </div>
      )}
    </div>
  );
}
