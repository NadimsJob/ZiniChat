'use client';

import { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { useCurrency } from '@/components/CurrencyProvider';
import { ArrowLeft, Building2, Mail, User, Calendar, CreditCard, Activity, Database, CheckCircle2, AlertTriangle, MessageSquare, Zap, PackageOpen, ExternalLink, Headphones, Users, Bot, ShieldCheck, Layers } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import AdminLoader from '@/components/AdminLoader';
import AdminPagination from '@/components/AdminPagination';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function TenantReportPage() {
  const { id } = useParams();
  const { formatBDT } = useCurrency();
  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [payPage, setPayPage] = useState(1);
  const [payPageSize, setPayPageSize] = useState(10);

  useEffect(() => {
    const fetchTenantData = async () => {
      try {
        const token = Cookies.get('access_token');
        const res = await fetch(`${API}/tenants/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          setTenant(await res.json());
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchTenantData();
  }, [id]);

  if (loading) {
    return <AdminLoader message="Loading tenant report & financial overview..." />;
  }

  if (!tenant) {
    return <div className="p-8 text-center text-red-500">Tenant not found or error loading data.</div>;
  }

  const owner = tenant.users?.[0] || {};
  const activeSub = tenant.subscriptions?.[0] || null;
  const plan = activeSub?.plan || {};
  
  // Usage calculations
  const messageLimit = tenant.customMessageQuota || plan.messageQuota || 1000;
  const messagesUsed = tenant.usage?.messagesUsed || 0;
  const messagePercent = Math.min(100, (messagesUsed / messageLimit) * 100);

  const aiLimit = tenant.customAiQuota || plan.aiQuota || 500;
  const aiUsed = tenant.usage?.aiUsed || 0;
  const aiPercent = Math.min(100, (aiUsed / aiLimit) * 100);

  const storageLimitMb = tenant.customStorageLimitMb || plan.storageLimitMb || 500;
  const storageUsedMb = (tenant.usage?.storageUsedBytes || 0) / (1024 * 1024);
  const storagePercent = Math.min(100, (storageUsedMb / storageLimitMb) * 100);

  return (
    <div className="max-w-6xl mx-auto space-y-4 animate-in fade-in duration-500 pb-10">
      <div className="flex items-center gap-3 mb-2">
        <Link href="/sp@dmin/tenants" className="p-2 hover:bg-slate-100 dark:hover:bg-surface-hover rounded-xl text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            {tenant.businessName} 
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${tenant.status === 'active' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20'}`}>
              {tenant.status.toUpperCase()}
            </span>
          </h1>
          <p className="text-xs text-slate-600 dark:text-zinc-400 mt-0.5">Tenant Details & Billing Report</p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {/* Profile Card */}
        <div className="bg-white dark:bg-surface border border-slate-200/80 dark:border-surface-hover rounded-2xl p-4 shadow-sm dark:shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Business Profile</h2>
          </div>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-surface-hover/50">
              <span className="text-slate-500 dark:text-zinc-400 flex items-center gap-1.5"><User className="w-3.5 h-3.5"/> Owner</span>
              <span className="font-medium text-slate-800 dark:text-zinc-200">{owner.name || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-surface-hover/50">
              <span className="text-slate-500 dark:text-zinc-400 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5"/> Email</span>
              <span className="font-medium text-slate-800 dark:text-zinc-200">{owner.email || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-surface-hover/50">
              <span className="text-slate-500 dark:text-zinc-400 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5"/> Joined</span>
              <span className="font-medium text-slate-800 dark:text-zinc-200">{new Date(tenant.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500 dark:text-zinc-400 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5"/> Total Activity</span>
              <span className="font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                {tenant._count?.conversations || 0} Chats / {tenant._count?.orders || 0} Orders
              </span>
            </div>
          </div>
        </div>

        {/* Subscription Card */}
        <div className="bg-white dark:bg-surface border border-slate-200/80 dark:border-surface-hover rounded-2xl p-4 shadow-sm dark:shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <PackageOpen className="w-4 h-4 text-secondary" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Subscription Status</h2>
          </div>
          {activeSub ? (
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-surface-hover/50">
                <span className="text-slate-500 dark:text-zinc-400">Active Plan</span>
                <span className="font-bold text-secondary">{tenant.customPlanName || plan.name}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-surface-hover/50">
                <span className="text-slate-500 dark:text-zinc-400">Billing Cycle</span>
                <span className="font-medium text-slate-800 dark:text-zinc-200 capitalize">{activeSub.billingCycle}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-surface-hover/50">
                <span className="text-slate-500 dark:text-zinc-400">Status</span>
                <span className={`font-bold ${activeSub.status === 'active' ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-600 dark:text-orange-400'}`}>
                  {activeSub.status.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 dark:text-zinc-400">Next Renewal</span>
                <span className="font-medium text-slate-800 dark:text-zinc-200">{new Date(activeSub.currentPeriodEnd).toLocaleDateString()}</span>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-slate-500 dark:text-zinc-500 text-xs">
              <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-orange-500/50" />
              No active subscription found.
            </div>
          )}
        </div>

        {/* Usage Card */}
        <div className="bg-white dark:bg-surface border border-slate-200/80 dark:border-surface-hover rounded-2xl p-4 shadow-sm dark:shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Current Usage (Monthly)</h2>
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-600 dark:text-zinc-400 flex items-center gap-1"><MessageSquare className="w-3 h-3"/> Messages</span>
                <span className="font-medium"><span className="text-emerald-600 dark:text-emerald-400">{messagesUsed}</span> / {messageLimit}</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-zinc-800/50 rounded-full h-1.5 overflow-hidden">
                <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${messagePercent}%` }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-600 dark:text-zinc-400 flex items-center gap-1"><Zap className="w-3 h-3"/> AI Response</span>
                <span className="font-medium"><span className="text-secondary">{aiUsed}</span> / {aiLimit}</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-zinc-800/50 rounded-full h-1.5 overflow-hidden">
                <div className="bg-secondary h-1.5 rounded-full" style={{ width: `${aiPercent}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-600 dark:text-zinc-400 flex items-center gap-1"><Database className="w-3 h-3"/> Storage</span>
                <span className="font-medium"><span className="text-primary">{storageUsedMb.toFixed(1)}</span> / {storageLimitMb} MB</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-zinc-800/50 rounded-full h-1.5 overflow-hidden">
                <div className="bg-primary h-1.5 rounded-full" style={{ width: `${storagePercent}%` }}></div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-surface-hover/50 flex justify-between items-center text-[11px]">
              <span className="text-slate-600 dark:text-zinc-400 flex items-center gap-1">🧠 AI Tokens Used</span>
              <span className="font-bold text-amber-700 dark:text-amber-400">
                {(tenant.usage?.tokensUsed || 0).toLocaleString()} <span className="text-[10px] text-slate-500 dark:text-zinc-500 font-normal">({(tenant.usage?.totalTokensUsed || 0).toLocaleString()} all-time)</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Ecosystem & Resource Summary Grid */}
      <div className="mt-4">
        <h3 className="text-xs font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-primary" /> Workspace Resources & Support Reports
        </h3>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {/* 1. Support Tickets (Relevant Superadmin Page) */}
          <Link 
            href="/sp@dmin/tickets"
            className="bg-white dark:bg-surface border border-slate-200/80 dark:border-surface-hover hover:border-blue-500/50 rounded-xl p-3 text-center transition-all hover:scale-[1.02] hover:shadow-lg group shadow-sm"
            title="Open Support Tickets Management"
          >
            <div className="flex items-center justify-center gap-1 text-[10px] text-slate-600 dark:text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-blue-400">
              <Headphones className="w-3 h-3 text-blue-600 dark:text-blue-400" /> Tickets
              <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-base font-bold text-blue-600 dark:text-blue-400 mt-0.5">{tenant._count?.Ticket || 0}</p>
          </Link>

          {/* 2. ZiniChat AI Support Widget Chats (Relevant Superadmin Page) */}
          <Link 
            href="/sp@dmin/support-chats"
            className="bg-white dark:bg-surface border border-slate-200/80 dark:border-surface-hover hover:border-emerald-500/50 rounded-xl p-3 text-center transition-all hover:scale-[1.02] hover:shadow-lg group shadow-sm"
            title="Open Support AI Chat Logs"
          >
            <div className="flex items-center justify-center gap-1 text-[10px] text-slate-600 dark:text-zinc-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
              <Bot className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Support AI
              <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{tenant._count?.supportConversations || 0}</p>
          </Link>

          {/* 3. Team Members (Stat Card) */}
          <div className="bg-white dark:bg-surface border border-slate-200/80 dark:border-surface-hover rounded-xl p-3 text-center shadow-sm">
            <div className="flex items-center justify-center gap-1 text-[10px] text-slate-600 dark:text-zinc-400">
              <Users className="w-3 h-3 text-amber-600 dark:text-amber-400" /> Team Seats
            </div>
            <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5">{tenant._count?.users || 1}</p>
          </div>

          {/* 4. Connected Channels (Stat Card) */}
          <div className="bg-white dark:bg-surface border border-slate-200/80 dark:border-surface-hover rounded-xl p-3 text-center shadow-sm">
            <div className="flex items-center justify-center gap-1 text-[10px] text-slate-600 dark:text-zinc-400">
              <Zap className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Channels
            </div>
            <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{tenant._count?.channelConns || 0}</p>
          </div>

          {/* 5. Products Catalog (Stat Card) */}
          <div className="bg-white dark:bg-surface border border-slate-200/80 dark:border-surface-hover rounded-xl p-3 text-center shadow-sm">
            <div className="flex items-center justify-center gap-1 text-[10px] text-slate-600 dark:text-zinc-400">
              <PackageOpen className="w-3 h-3 text-purple-600 dark:text-purple-400" /> Products
            </div>
            <p className="text-base font-bold text-purple-600 dark:text-purple-400 mt-0.5">{tenant._count?.products || 0}</p>
          </div>

          {/* 6. CRM Leads (Stat Card) */}
          <div className="bg-white dark:bg-surface border border-slate-200/80 dark:border-surface-hover rounded-xl p-3 text-center shadow-sm">
            <div className="flex items-center justify-center gap-1 text-[10px] text-slate-600 dark:text-zinc-400">
              <User className="w-3 h-3 text-orange-600 dark:text-orange-400" /> Leads
            </div>
            <p className="text-base font-bold text-orange-600 dark:text-orange-400 mt-0.5">{tenant._count?.contacts || 0}</p>
          </div>

          {/* 7. AI Training Assets (Stat Card) */}
          <div className="bg-white dark:bg-surface border border-slate-200/80 dark:border-surface-hover rounded-xl p-3 text-center shadow-sm">
            <div className="flex items-center justify-center gap-1 text-[10px] text-slate-600 dark:text-zinc-400">
              <Bot className="w-3 h-3 text-cyan-600 dark:text-cyan-400" /> FAQs / Docs
            </div>
            <p className="text-base font-bold text-cyan-600 dark:text-cyan-400 mt-0.5">{(tenant._count?.qnaItems || 0)} / {(tenant._count?.knowledgeDocs || 0)}</p>
          </div>

          {/* 8. Audit & Security Logs (Relevant Superadmin Page) */}
          <Link 
            href="/sp@dmin/audit-logs"
            className="bg-white dark:bg-surface border border-slate-200/80 dark:border-surface-hover hover:border-rose-500/50 rounded-xl p-3 text-center transition-all hover:scale-[1.02] hover:shadow-lg group shadow-sm"
            title="Open Platform Audit Logs"
          >
            <div className="flex items-center justify-center gap-1 text-[10px] text-slate-600 dark:text-zinc-400 group-hover:text-rose-600 dark:group-hover:text-rose-400">
              <ShieldCheck className="w-3 h-3 text-rose-600 dark:text-rose-400" /> Audit Logs
              <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 mt-1">View Logs →</p>
          </Link>
        </div>
      </div>

      {/* Payment History Table */}
      <div className="bg-white dark:bg-surface border border-slate-200/80 dark:border-surface-hover rounded-2xl overflow-hidden shadow-sm dark:shadow-xl mt-4">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-surface-hover flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-slate-500 dark:text-zinc-400" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Payment History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[600px]">
            <thead className="bg-slate-100/90 dark:bg-surface-hover/30 text-slate-700 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-2.5 font-medium">Date</th>
                <th className="px-4 py-2.5 font-medium">TrxID / Ref</th>
                <th className="px-4 py-2.5 font-medium">Provider</th>
                <th className="px-4 py-2.5 font-medium text-right">Amount</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-surface-hover/50 text-slate-900 dark:text-zinc-300">
              {!tenant.payments || tenant.payments.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-500 dark:text-zinc-500">No payment history found for this tenant.</td></tr>
              ) : (
                tenant.payments.slice((payPage - 1) * payPageSize, payPage * payPageSize).map((payment: any) => (
                  <tr key={payment.id} className="hover:bg-slate-50 dark:hover:bg-surface-hover/20 transition-colors">
                    <td className="px-4 py-2.5 text-slate-700 dark:text-zinc-300">{new Date(payment.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-2.5 font-mono text-slate-600 dark:text-zinc-400">{payment.trxId || 'N/A'}</td>
                    <td className="px-4 py-2.5 capitalize text-slate-700 dark:text-zinc-300">{payment.provider}</td>
                    <td className="px-4 py-2.5 font-bold text-slate-900 dark:text-white text-right">{formatBDT(payment.amountBdt)}</td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        payment.status === 'success' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' :
                        payment.status === 'failed' ? 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20' :
                        'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20'
                      }`}>
                        {payment.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {tenant.payments && tenant.payments.length > 0 && (
          <AdminPagination
            currentPage={payPage}
            totalItems={tenant.payments.length}
            pageSize={payPageSize}
            onPageChange={setPayPage}
            onPageSizeChange={setPayPageSize}
          />
        )}
      </div>
    </div>
  );
}
