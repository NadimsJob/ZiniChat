'use client';

import { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { useCurrency } from '@/components/CurrencyProvider';
import { ArrowLeft, Building2, Mail, User, Calendar, CreditCard, Activity, Database, CheckCircle2, AlertTriangle, MessageSquare, Zap, PackageOpen } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function TenantReportPage() {
  const { id } = useParams();
  const { formatBDT } = useCurrency();
  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
    return <div className="p-8 text-center text-zinc-500 animate-pulse">Loading report data...</div>;
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
        <Link href="/superadmin/tenants" className="p-2 hover:bg-surface-hover rounded-xl text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
            {tenant.businessName} 
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${tenant.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
              {tenant.status.toUpperCase()}
            </span>
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">Tenant Details & Billing Report</p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Profile Card */}
        <div className="bg-surface border border-surface-hover rounded-2xl p-4 shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-white">Business Profile</h2>
          </div>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center py-1 border-b border-surface-hover/50">
              <span className="text-zinc-500 flex items-center gap-1.5"><User className="w-3.5 h-3.5"/> Owner</span>
              <span className="font-medium text-zinc-200">{owner.name || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-surface-hover/50">
              <span className="text-zinc-500 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5"/> Email</span>
              <span className="font-medium text-zinc-200">{owner.email || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-surface-hover/50">
              <span className="text-zinc-500 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5"/> Joined</span>
              <span className="font-medium text-zinc-200">{new Date(tenant.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-zinc-500 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5"/> Total Activity</span>
              <span className="font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                {tenant._count?.conversations || 0} Chats / {tenant._count?.orders || 0} Orders
              </span>
            </div>
          </div>
        </div>

        {/* Subscription Card */}
        <div className="bg-surface border border-surface-hover rounded-2xl p-4 shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <PackageOpen className="w-4 h-4 text-secondary" />
            <h2 className="text-sm font-bold text-white">Subscription Status</h2>
          </div>
          {activeSub ? (
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-surface-hover/50">
                <span className="text-zinc-500">Active Plan</span>
                <span className="font-bold text-secondary">{tenant.customPlanName || plan.name}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-surface-hover/50">
                <span className="text-zinc-500">Billing Cycle</span>
                <span className="font-medium text-zinc-200 capitalize">{activeSub.billingCycle}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-surface-hover/50">
                <span className="text-zinc-500">Status</span>
                <span className={`font-bold ${activeSub.status === 'active' ? 'text-emerald-400' : 'text-orange-400'}`}>
                  {activeSub.status.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-zinc-500">Next Renewal</span>
                <span className="font-medium text-zinc-200">{new Date(activeSub.currentPeriodEnd).toLocaleDateString()}</span>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-zinc-500 text-xs">
              <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-orange-500/50" />
              No active subscription found.
            </div>
          )}
        </div>

        {/* Usage Card */}
        <div className="bg-surface border border-surface-hover rounded-2xl p-4 shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-emerald-500" />
            <h2 className="text-sm font-bold text-white">Current Usage (Monthly)</h2>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-zinc-400 flex items-center gap-1"><MessageSquare className="w-3 h-3"/> Messages</span>
                <span className="font-medium"><span className="text-emerald-400">{messagesUsed}</span> / {messageLimit}</span>
              </div>
              <div className="w-full bg-zinc-800/50 rounded-full h-1.5 overflow-hidden">
                <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${messagePercent}%` }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-zinc-400 flex items-center gap-1"><Zap className="w-3 h-3"/> AI Tokens</span>
                <span className="font-medium"><span className="text-secondary">{aiUsed}</span> / {aiLimit}</span>
              </div>
              <div className="w-full bg-zinc-800/50 rounded-full h-1.5 overflow-hidden">
                <div className="bg-secondary h-1.5 rounded-full" style={{ width: `${aiPercent}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-zinc-400 flex items-center gap-1"><Database className="w-3 h-3"/> Storage</span>
                <span className="font-medium"><span className="text-primary">{storageUsedMb.toFixed(1)}</span> / {storageLimitMb} MB</span>
              </div>
              <div className="w-full bg-zinc-800/50 rounded-full h-1.5 overflow-hidden">
                <div className="bg-primary h-1.5 rounded-full" style={{ width: `${storagePercent}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment History Table */}
      <div className="bg-surface border border-surface-hover rounded-2xl overflow-hidden shadow-xl mt-4">
        <div className="px-4 py-3 border-b border-surface-hover flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-zinc-400" />
          <h2 className="text-sm font-bold text-white">Payment History</h2>
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-surface-hover/30 text-zinc-400">
            <tr>
              <th className="px-4 py-2.5 font-medium">Date</th>
              <th className="px-4 py-2.5 font-medium">TrxID / Ref</th>
              <th className="px-4 py-2.5 font-medium">Provider</th>
              <th className="px-4 py-2.5 font-medium text-right">Amount</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-hover/50 text-zinc-300">
            {!tenant.payments || tenant.payments.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-zinc-500">No payment history found for this tenant.</td></tr>
            ) : (
              tenant.payments.map((payment: any) => (
                <tr key={payment.id} className="hover:bg-surface-hover/20 transition-colors">
                  <td className="px-4 py-2.5">{new Date(payment.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-2.5 font-mono text-zinc-400">{payment.trxId || 'N/A'}</td>
                  <td className="px-4 py-2.5 capitalize">{payment.provider}</td>
                  <td className="px-4 py-2.5 font-bold text-white text-right">{formatBDT(payment.amountBdt)}</td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      payment.status === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      payment.status === 'failed' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                      'bg-orange-500/10 text-orange-400 border-orange-500/20'
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
    </div>
  );
}
