'use client';

import { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { useCurrency } from '@/components/CurrencyProvider';
import { ArrowLeft, Building2, Mail, User, Calendar, CreditCard, Activity, Database, CheckCircle2, AlertTriangle, MessageSquare, Zap, PackageOpen, ExternalLink, Headphones, Users, Bot, ShieldCheck, Layers, Globe, Edit2, Loader2, X, Phone, KeyRound } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import AdminLoader from '@/components/AdminLoader';
import AdminPagination from '@/components/AdminPagination';
import { COUNTRIES } from '@/lib/countryData';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function TenantReportPage() {
  const { id } = useParams();
  const { formatBDT } = useCurrency();
  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [payPage, setPayPage] = useState(1);
  const [payPageSize, setPayPageSize] = useState(10);
  const [countryModalOpen, setCountryModalOpen] = useState(false);
  const [editCountry, setEditCountry] = useState('Bangladesh');
  const [savingCountry, setSavingCountry] = useState(false);

  // Edit Profile Modal State
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editProfile, setEditProfile] = useState({
    businessName: '',
    brandName: '',
    ownerName: '',
    address: '',
    phoneNo: '',
    country: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');

  // Password Reset Modal State
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Detailed Storage State
  const [detailedStorage, setDetailedStorage] = useState<any>(null);
  const [fetchingStorage, setFetchingStorage] = useState(false);

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

  const handleSaveCountry = async () => {
    setSavingCountry(true);
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/tenants/${id}/country`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ country: editCountry }),
      });
      if (res.ok) {
        setTenant((prev: any) => ({ ...prev, country: editCountry }));
        setCountryModalOpen(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingCountry(false);
    }
  };

  const openEditProfileModal = () => {
    const ownerUser = tenant.users?.[0] || {};
    setEditProfile({
      businessName: tenant.businessName || '',
      brandName: tenant.brandName || '',
      ownerName: ownerUser.name || '',
      address: tenant.address || '',
      phoneNo: tenant.phoneNo || '',
      country: tenant.country || 'Bangladesh',
    });
    setProfileError('');
    setEditProfileOpen(true);
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setProfileError('');
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/tenants/${id}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(editProfile),
      });
      if (res.ok) {
        setTenant((prev: any) => ({
          ...prev,
          businessName: editProfile.businessName,
          brandName: editProfile.brandName,
          address: editProfile.address,
          phoneNo: editProfile.phoneNo,
          country: editProfile.country,
          users: prev.users?.length
            ? [{ ...prev.users[0], name: editProfile.ownerName }, ...prev.users.slice(1)]
            : [{ name: editProfile.ownerName }],
        }));
        setEditProfileOpen(false);
      } else {
        const errData = await res.json();
        setProfileError(errData.message || 'Failed to update profile');
      }
    } catch (err: any) {
      setProfileError(err.message || 'Error updating profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleResetPassword = async () => {
    setPasswordError('');
    setPasswordSuccess('');
    if (!newPassword || newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setSavingPassword(true);
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/tenants/${id}/reset-password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ newPassword }),
      });
      if (res.ok) {
        setPasswordSuccess('Password reset successfully!');
        setTimeout(() => {
          setResetPasswordOpen(false);
          setNewPassword('');
          setConfirmPassword('');
          setPasswordSuccess('');
        }, 1200);
      } else {
        const errData = await res.json();
        setPasswordError(errData.message || 'Failed to reset password');
      }
    } catch (err: any) {
      setPasswordError(err.message || 'Error resetting password');
    } finally {
      setSavingPassword(false);
    }
  };

  const fetchDetailedStorage = async () => {
    setFetchingStorage(true);
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/storage/admin/recalculate/${id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDetailedStorage(data);
        // Also update the main tenant object's usage so the progress bar reflects the recalculated value
        setTenant((prev: any) => ({
          ...prev,
          usage: {
            ...prev.usage,
            storageUsedBytes: data.totalUsedBytes
          }
        }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFetchingStorage(false);
    }
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-3">
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
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openEditProfileModal}
            className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border border-primary/20"
          >
            <Edit2 className="w-3.5 h-3.5" /> Edit Profile
          </button>
          <button
            type="button"
            onClick={() => {
              setNewPassword('');
              setConfirmPassword('');
              setPasswordError('');
              setPasswordSuccess('');
              setResetPasswordOpen(true);
            }}
            className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border border-amber-500/20"
          >
            <KeyRound className="w-3.5 h-3.5" /> Reset Password
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <span className="text-slate-500 dark:text-zinc-400 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5"/> Phone</span>
              <span className="font-medium text-slate-800 dark:text-zinc-200">{tenant.phoneNo || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-surface-hover/50">
              <span className="text-slate-500 dark:text-zinc-400 flex items-center gap-1.5"><Globe className="w-3.5 h-3.5"/> Country</span>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-primary">{tenant.country || 'Bangladesh'}</span>
                <button
                  type="button"
                  onClick={() => { setEditCountry(tenant.country || 'Bangladesh'); setCountryModalOpen(true); }}
                  className="px-1.5 py-0.5 bg-primary/10 hover:bg-primary/20 text-primary rounded text-[10px] font-bold transition-colors"
                >
                  Edit
                </button>
              </div>
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
                <span className="font-medium text-emerald-500 capitalize">{activeSub.status}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 dark:text-zinc-400">Renews / Ends</span>
                <span className="font-medium text-slate-800 dark:text-zinc-200">{new Date(activeSub.currentPeriodEnd).toLocaleDateString()}</span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 dark:text-zinc-400 py-4 text-center">
              No active subscription found. (Free / Trial Mode)
            </div>
          )}
        </div>

        {/* Quotas & Usage Progress Card */}
        <div className="bg-white dark:bg-surface border border-slate-200/80 dark:border-surface-hover rounded-2xl p-4 shadow-sm dark:shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Resource Usage</h2>
          </div>
          <div className="space-y-3 text-xs">
            {/* Messages Progress */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-500 dark:text-zinc-400">Messages</span>
                <span className="font-mono text-[11px] text-slate-800 dark:text-zinc-200">{messagesUsed} / {messageLimit}</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${messagePercent}%` }} />
              </div>
            </div>

            {/* AI Calls Progress */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-500 dark:text-zinc-400">AI Responses</span>
                <span className="font-mono text-[11px] text-slate-800 dark:text-zinc-200">{aiUsed} / {aiLimit}</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                <div className="bg-secondary h-full rounded-full transition-all" style={{ width: `${aiPercent}%` }} />
              </div>
            </div>

            {/* Storage Progress */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-500 dark:text-zinc-400">Storage</span>
                <span className="font-mono text-[11px] text-slate-800 dark:text-zinc-200">{storageUsedMb.toFixed(1)} MB / {storageLimitMb} MB</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${storagePercent}%` }} />
              </div>
              
              {!detailedStorage ? (
                <button 
                  onClick={fetchDetailedStorage}
                  disabled={fetchingStorage}
                  className="mt-2 w-full py-1.5 rounded-lg border border-slate-200 dark:border-surface-hover text-[10px] font-semibold hover:bg-slate-50 dark:hover:bg-surface-hover transition-colors disabled:opacity-50"
                >
                  {fetchingStorage ? 'Loading...' : 'Recalculate & View Details'}
                </button>
              ) : (
                <div className="mt-3 space-y-1.5 p-2 bg-slate-50 dark:bg-surface-hover/50 rounded-xl border border-slate-100 dark:border-surface-hover">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-500">Real Disk Usage</span>
                    <span className="font-bold">{(detailedStorage.totalUsedBytes / (1024 * 1024)).toFixed(1)} MB</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-500">Chat Media</span>
                    <span>{(detailedStorage.categories?.chatMedia?.bytes / (1024 * 1024)).toFixed(1)} MB</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-500">Products</span>
                    <span>{(detailedStorage.categories?.products?.bytes / (1024 * 1024)).toFixed(1)} MB</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-500">AI Docs</span>
                    <span>{(detailedStorage.categories?.aiDocuments?.bytes / (1024 * 1024)).toFixed(1)} MB</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-500">Tickets</span>
                    <span>{(detailedStorage.categories?.tickets?.bytes / (1024 * 1024)).toFixed(1)} MB</span>
                  </div>
                  <button 
                    onClick={fetchDetailedStorage}
                    className="mt-1 w-full py-1 text-[9px] text-primary hover:underline"
                  >
                    Refresh Sync
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CAPI Hub Card */}
        <div className="bg-white dark:bg-surface border border-slate-200/80 dark:border-surface-hover rounded-2xl p-4 shadow-sm dark:shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-4 h-4 text-emerald-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">CAPI Hub</h2>
          </div>
          {tenant.capiIntegration ? (
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-surface-hover/50">
                <span className="text-slate-500 dark:text-zinc-400">Status</span>
                <span className={`font-bold ${tenant.capiIntegration.isActive ? 'text-emerald-500' : 'text-slate-500'}`}>
                  {tenant.capiIntegration.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-surface-hover/50">
                <span className="text-slate-500 dark:text-zinc-400">Pixel ID</span>
                <span className="font-medium text-slate-800 dark:text-zinc-200">{tenant.capiIntegration.pixelId}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-surface-hover/50">
                <span className="text-slate-500 dark:text-zinc-400">Events (Month)</span>
                <span className="font-medium text-slate-800 dark:text-zinc-200">{tenant.capiStats?.totalEventsMonth || 0}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 dark:text-zinc-400">Success Rate</span>
                <span className="font-medium text-emerald-500">{tenant.capiStats?.successRate || 0}%</span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 dark:text-zinc-400 py-4 text-center">
              CAPI not connected by tenant yet.
            </div>
          )}
        </div>
      </div>

      {/* Payment History Table */}
      <div className="bg-white dark:bg-surface border border-slate-200/80 dark:border-surface-hover rounded-2xl p-4 shadow-sm dark:shadow-xl mt-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-500" /> Payment & Transaction History
          </h2>
          <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
            Total {tenant.payments?.length || 0} Transactions
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
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

      {/* Edit Country Modal */}
      {countryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-surface border border-slate-200 dark:border-surface-hover rounded-2xl p-5 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" /> Update Tenant Country
              </h3>
              <button onClick={() => setCountryModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-zinc-400 mb-1">Select Country</label>
                <select
                  value={editCountry}
                  onChange={(e) => setEditCountry(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-surface-hover rounded-xl p-2.5 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.name}>
                      {c.flag} {c.name} ({c.dialCode})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCountryModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-surface-hover text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-surface-hover"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveCountry}
                  disabled={savingCountry}
                  className="px-4 py-1.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1.5 shadow-md shadow-primary/20"
                >
                  {savingCountry ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {editProfileOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-surface border border-slate-200 dark:border-surface-hover rounded-2xl p-5 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-primary" /> Edit Tenant Profile
              </h3>
              <button onClick={() => setEditProfileOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            {profileError && (
              <div className="mb-3 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium">
                {profileError}
              </div>
            )}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-zinc-400 font-medium mb-1">Business Name</label>
                <input
                  type="text"
                  value={editProfile.businessName}
                  onChange={(e) => setEditProfile({ ...editProfile, businessName: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-surface-hover rounded-xl p-2.5 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="e.g. Acme Ltd"
                />
              </div>
              <div>
                <label className="block text-slate-600 dark:text-zinc-400 font-medium mb-1">Brand Name</label>
                <input
                  type="text"
                  value={editProfile.brandName}
                  onChange={(e) => setEditProfile({ ...editProfile, brandName: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-surface-hover rounded-xl p-2.5 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="e.g. Acme Store"
                />
              </div>
              <div>
                <label className="block text-slate-600 dark:text-zinc-400 font-medium mb-1">Owner Name</label>
                <input
                  type="text"
                  value={editProfile.ownerName}
                  onChange={(e) => setEditProfile({ ...editProfile, ownerName: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-surface-hover rounded-xl p-2.5 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="e.g. John Doe"
                />
              </div>
              <div>
                <label className="block text-slate-600 dark:text-zinc-400 font-medium mb-1">Mobile Number</label>
                <input
                  type="text"
                  value={editProfile.phoneNo}
                  onChange={(e) => setEditProfile({ ...editProfile, phoneNo: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-surface-hover rounded-xl p-2.5 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="e.g. +8801700000000"
                />
              </div>
              <div>
                <label className="block text-slate-600 dark:text-zinc-400 font-medium mb-1">Address</label>
                <input
                  type="text"
                  value={editProfile.address}
                  onChange={(e) => setEditProfile({ ...editProfile, address: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-surface-hover rounded-xl p-2.5 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="e.g. Dhaka, Bangladesh"
                />
              </div>
              <div>
                <label className="block text-slate-600 dark:text-zinc-400 font-medium mb-1">Country</label>
                <select
                  value={editProfile.country}
                  onChange={(e) => setEditProfile({ ...editProfile, country: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-surface-hover rounded-xl p-2.5 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.name}>
                      {c.flag} {c.name} ({c.dialCode})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditProfileOpen(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-surface-hover text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-surface-hover"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className="px-4 py-1.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1.5 shadow-md shadow-primary/20"
                >
                  {savingProfile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Direct Password Reset Modal */}
      {resetPasswordOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-surface border border-slate-200 dark:border-surface-hover rounded-2xl p-5 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-500" /> Direct Password Reset
              </h3>
              <button onClick={() => setResetPasswordOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            {passwordError && (
              <div className="mb-3 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium">
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="mb-3 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> {passwordSuccess}
              </div>
            )}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-zinc-400 font-medium mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-surface-hover rounded-xl p-2.5 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  placeholder="At least 6 characters"
                />
              </div>
              <div>
                <label className="block text-slate-600 dark:text-zinc-400 font-medium mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-surface-hover rounded-xl p-2.5 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  placeholder="Re-type new password"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setResetPasswordOpen(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-surface-hover text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-surface-hover"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleResetPassword}
                  disabled={savingPassword}
                  className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold disabled:opacity-50 flex items-center gap-1.5 shadow-md shadow-amber-500/20"
                >
                  {savingPassword ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} Set Password
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
