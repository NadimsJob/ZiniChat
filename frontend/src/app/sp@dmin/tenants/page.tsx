'use client';

import { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { Settings2, X, Eye, LogIn, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const parseFeaturesArray = (features: any): string[] => {
  if (Array.isArray(features)) return features;
  if (typeof features === 'string') {
    try {
      const parsed = JSON.parse(features);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {}
  }
  return [];
};

export default function TenantsPage() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [aiConfigs, setAiConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTenant, setEditingTenant] = useState<any>(null);
  const [customData, setCustomData] = useState({
    businessName: '',
    logoUrl: '',
    customPlanName: '',
    customPriceUsd: '',
    customMessageQuota: '',
    customAiQuota: '',
    customStorageLimitMb: '',
    customSeatLimit: '',
    customWhatsappLimit: '',
    customMessengerLimit: '',
    customInstagramLimit: '',
    customWebsiteWidgetLimit: '',
    customProductCatalogLimit: '',
    customContactsLimit: '',
    billingCycleStart: '',
    customAllowByok: false,
    customFeatures: [] as string[],
    hasFeaturesOverride: false, // Flag to know if they want to override features
  });

  const [saving, setSaving] = useState(false);
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);

  const handleImpersonate = async (tenantId: string, tenantName: string) => {
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

      const data = await res.json();
      if (data.access_token) {
        toast.success(`Opening ${tenantName} workspace...`);
        window.open(`/sp@dmin/impersonate?token=${data.access_token}`, '_blank');
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

  const fetchTenantsAndConfigs = async () => {
    try {
      const token = Cookies.get('access_token');
      
      const [tenantsRes, configsRes] = await Promise.all([
        fetch(`${API}/tenants`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/ai-config`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (tenantsRes.ok) {
        const data = await tenantsRes.json();
        setTenants(data);
      }
      
      if (configsRes.ok) {
        const data = await configsRes.json();
        setAiConfigs(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenantsAndConfigs();
  }, []);

  const handleStatusChange = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/tenants/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        toast.success(`Tenant ${newStatus} successfully`);
        fetchTenantsAndConfigs();
      }
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleAiConfigChange = async (id: string, configId: string) => {
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/tenants/${id}/ai-config`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ customAiConfigId: configId === 'default' ? null : configId })
      });
      
      if (res.ok) {
        toast.success('AI Model updated successfully');
        fetchTenantsAndConfigs();
      } else {
        toast.error('Failed to update AI Model');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const [modalUsage, setModalUsage] = useState<any>(null);
  const [modalLoading, setModalLoading] = useState(false);

  const openCustomizeModal = async (tenant: any) => {
    setEditingTenant(tenant);
    setModalLoading(true);

    const activeFeatures = tenant.customFeatures !== null 
      ? parseFeaturesArray(tenant.customFeatures) 
      : parseFeaturesArray(tenant.basePlan?.features);

    setCustomData({
      businessName: tenant.name || '',
      logoUrl: tenant.logoUrl || '',
      customPlanName: tenant.customPlanName || '',
      customPriceUsd: tenant.customPriceUsd !== null && tenant.customPriceUsd !== undefined ? String(tenant.customPriceUsd) : (tenant.basePlan?.priceMonthlyBdt !== undefined ? String(tenant.basePlan.priceMonthlyBdt) : (tenant.basePlan?.priceMonthlyUsd !== undefined ? String(tenant.basePlan.priceMonthlyUsd) : '')),
      customMessageQuota: tenant.customMessageQuota !== null && tenant.customMessageQuota !== undefined ? String(tenant.customMessageQuota) : (tenant.basePlan?.messageQuota !== undefined ? String(tenant.basePlan.messageQuota) : ''),
      customAiQuota: tenant.customAiQuota !== null && tenant.customAiQuota !== undefined ? String(tenant.customAiQuota) : (tenant.basePlan?.aiQuota !== undefined ? String(tenant.basePlan.aiQuota) : ''),
      customStorageLimitMb: tenant.customStorageLimitMb !== null && tenant.customStorageLimitMb !== undefined ? String(tenant.customStorageLimitMb) : (tenant.basePlan?.storageLimitMb !== undefined ? String(tenant.basePlan.storageLimitMb) : ''),
      customSeatLimit: tenant.customSeatLimit !== null && tenant.customSeatLimit !== undefined ? String(tenant.customSeatLimit) : (tenant.basePlan?.seatLimit !== undefined ? String(tenant.basePlan.seatLimit) : ''),
      customWhatsappLimit: tenant.customWhatsappLimit !== null && tenant.customWhatsappLimit !== undefined ? String(tenant.customWhatsappLimit) : (tenant.basePlan?.whatsappLimit !== undefined ? String(tenant.basePlan.whatsappLimit) : ''),
      customMessengerLimit: tenant.customMessengerLimit !== null && tenant.customMessengerLimit !== undefined ? String(tenant.customMessengerLimit) : (tenant.basePlan?.messengerLimit !== undefined ? String(tenant.basePlan.messengerLimit) : ''),
      customInstagramLimit: tenant.customInstagramLimit !== null && tenant.customInstagramLimit !== undefined ? String(tenant.customInstagramLimit) : (tenant.basePlan?.instagramLimit !== undefined ? String(tenant.basePlan.instagramLimit) : ''),
      customWebsiteWidgetLimit: tenant.customWebsiteWidgetLimit !== null && tenant.customWebsiteWidgetLimit !== undefined ? String(tenant.customWebsiteWidgetLimit) : (tenant.basePlan?.websiteWidgetLimit !== undefined ? String(tenant.basePlan.websiteWidgetLimit) : ''),
      customProductCatalogLimit: tenant.customProductCatalogLimit !== null && tenant.customProductCatalogLimit !== undefined ? String(tenant.customProductCatalogLimit) : (tenant.basePlan?.productCatalogLimit !== undefined ? String(tenant.basePlan.productCatalogLimit) : ''),
      customContactsLimit: tenant.customContactsLimit !== null && tenant.customContactsLimit !== undefined ? String(tenant.customContactsLimit) : (tenant.basePlan?.contactsLimit !== undefined && tenant.basePlan?.contactsLimit !== null ? String(tenant.basePlan.contactsLimit) : ''),
      billingCycleStart: tenant.trialEndsAt ? new Date(tenant.trialEndsAt).toISOString().split('T')[0] : '',
      customAllowByok: tenant.customAllowByok ?? (tenant.basePlan?.allowByok ?? false),
      customFeatures: activeFeatures,
      hasFeaturesOverride: tenant.customFeatures !== null,
    });

    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/tenants/${tenant.id}/customization`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setModalUsage(data.currentUsage);
        if (data.tenant) {
          const t = data.tenant;
          setCustomData(prev => ({
            ...prev,
            customWebsiteWidgetLimit: t.customWebsiteWidgetLimit !== null && t.customWebsiteWidgetLimit !== undefined 
              ? String(t.customWebsiteWidgetLimit) 
              : prev.customWebsiteWidgetLimit,
            customWhatsappLimit: t.customWhatsappLimit !== null && t.customWhatsappLimit !== undefined 
              ? String(t.customWhatsappLimit) 
              : prev.customWhatsappLimit,
            customMessengerLimit: t.customMessengerLimit !== null && t.customMessengerLimit !== undefined 
              ? String(t.customMessengerLimit) 
              : prev.customMessengerLimit,
            customInstagramLimit: t.customInstagramLimit !== null && t.customInstagramLimit !== undefined 
              ? String(t.customInstagramLimit) 
              : prev.customInstagramLimit,
            customProductCatalogLimit: t.customProductCatalogLimit !== null && t.customProductCatalogLimit !== undefined 
              ? String(t.customProductCatalogLimit) 
              : prev.customProductCatalogLimit,
            customContactsLimit: t.customContactsLimit !== null && t.customContactsLimit !== undefined 
              ? String(t.customContactsLimit) 
              : prev.customContactsLimit,
          }));
        }
      }
    } catch (e) {
      console.error('Failed to load customization details:', e);
    } finally {
      setModalLoading(false);
    }
  };

  const handleResetCustomPlan = async () => {
    if (!editingTenant || !confirm('Are you sure you want to reset this tenant to default plan limits?')) return;
    setSaving(true);
    
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/tenants/${editingTenant.id}/reset-customizations`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (res.ok) {
        toast.success('Reset to default plan limits successfully');
        setEditingTenant(null);
        fetchTenantsAndConfigs();
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.message || 'Failed to reset custom plan');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCustomPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant) return;
    setSaving(true);
    
    const payload: any = {
      logoUrl: customData.logoUrl || null,
    };
    if (customData.customPlanName) payload.customPlanName = customData.customPlanName;
    if (customData.customPriceUsd) payload.customPriceUsd = parseFloat(customData.customPriceUsd);
    if (customData.customMessageQuota) payload.customMessageQuota = parseInt(customData.customMessageQuota);
    if (customData.customAiQuota) payload.customAiQuota = parseInt(customData.customAiQuota);
    if (customData.customStorageLimitMb) payload.customStorageLimitMb = parseInt(customData.customStorageLimitMb);
    if (customData.customSeatLimit) payload.customSeatLimit = parseInt(customData.customSeatLimit);
    if (customData.customWhatsappLimit) payload.customWhatsappLimit = parseInt(customData.customWhatsappLimit);
    if (customData.customMessengerLimit) payload.customMessengerLimit = parseInt(customData.customMessengerLimit);
    if (customData.customInstagramLimit) payload.customInstagramLimit = parseInt(customData.customInstagramLimit);
    if (customData.customWebsiteWidgetLimit !== undefined && customData.customWebsiteWidgetLimit !== '') {
      payload.customWebsiteWidgetLimit = parseInt(customData.customWebsiteWidgetLimit);
    } else if (customData.customWebsiteWidgetLimit === '') {
      payload.customWebsiteWidgetLimit = null;
    }
    if (customData.customProductCatalogLimit) payload.customProductCatalogLimit = parseInt(customData.customProductCatalogLimit);
    if (customData.customContactsLimit !== undefined && customData.customContactsLimit !== '') {
      payload.customContactsLimit = parseInt(customData.customContactsLimit);
    } else if (customData.customContactsLimit === '') {
      payload.customContactsLimit = null;
    }
    if (customData.billingCycleStart) payload.billingCycleStart = customData.billingCycleStart;
    
    payload.customFeatures = customData.hasFeaturesOverride ? customData.customFeatures : null;
    payload.customAllowByok = customData.hasFeaturesOverride ? customData.customAllowByok : null;

    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/tenants/${editingTenant.id}/customize`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        toast.success('Custom plan saved & notification sent to owner');
        setEditingTenant(null);
        fetchTenantsAndConfigs();
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.message || 'Failed to save custom plan');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-[15px] font-bold tracking-tight">Tenants</h1>
        <p className="text-zinc-400 mt-2">Manage all registered businesses and their platform access.</p>
      </div>

      <div className="bg-surface border border-surface-hover rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[850px]">
            <thead className="bg-surface-hover/50 text-zinc-400 text-[12px]">
              <tr>
                <th className="px-3 py-2 font-medium">Business Name</th>
                <th className="px-3 py-2 font-medium">Email</th>
                <th className="px-3 py-2 font-medium">Sub. Status</th>
                <th className="px-3 py-2 font-medium">Renewal</th>
                <th className="px-3 py-2 font-medium">AI Responses</th>
                <th className="px-3 py-2 font-medium">AI Model</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-hover text-[12px]">
              {loading ? (
                <tr><td colSpan={8} className="px-3 py-2 text-center text-zinc-500">Loading...</td></tr>
              ) : tenants.length === 0 ? (
                <tr><td colSpan={8} className="px-3 py-2 text-center text-zinc-500">No tenants found.</td></tr>
              ) : (
                tenants.map(tenant => (
                  <tr key={tenant.id} className="hover:bg-surface-hover/30 transition-colors">
                    <td className="px-3 py-2 font-medium text-foreground">{tenant.name}</td>
                    <td className="px-3 py-2 text-zinc-300">{tenant.email}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            tenant.subscriptionStatus === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                            tenant.subscriptionStatus === 'past_due' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 
                            'bg-zinc-800 text-zinc-500 border-zinc-700'
                          }`}>
                            {tenant.subscriptionStatus ? tenant.subscriptionStatus.toUpperCase() : 'NONE'}
                          </span>
                          {(tenant.customFeatures !== null || tenant.customPriceUsd !== null || tenant.customMessageQuota !== null || tenant.customPlanName !== null || tenant.customSeatLimit !== null) && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              Customized
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-zinc-400 font-medium truncate max-w-[120px]">
                          {tenant.customPlanName || tenant.planName}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-zinc-400">
                      {tenant.currentPeriodEnd ? new Date(tenant.currentPeriodEnd).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-3 py-2 text-zinc-300">
                      {tenant.aiQuota ? (
                        <span className="text-xs">
                          <strong className="text-zinc-100">{tenant.aiQuota.used}</strong> / {tenant.aiQuota.limit}
                        </span>
                      ) : 'N/A'}
                    </td>
                    <td className="px-3 py-2">
                      <select 
                        value={tenant.customAiConfigId || (aiConfigs.find(c => c.isDefault)?.id || aiConfigs[0]?.id || '')} 
                        onChange={(e) => handleAiConfigChange(tenant.id, e.target.value)}
                        className="bg-[#09090b] border border-zinc-800 rounded px-2 py-1 text-[11px] text-white focus:outline-none focus:border-emerald-500 max-w-[130px] truncate"
                      >
                        {aiConfigs.map(c => (
                          <option key={c.id} value={c.id}>{c.name}{c.isDefault ? ' (Default)' : ''}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        tenant.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {tenant.status.charAt(0).toUpperCase() + tenant.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex flex-wrap justify-end items-center gap-1.5 sm:gap-2">
                        <button
                          onClick={() => handleImpersonate(tenant.id, tenant.name)}
                          disabled={impersonatingId === tenant.id}
                          title="Enter Tenant Panel (Impersonate)"
                          className="text-xs px-2.5 py-1.5 rounded-lg font-medium bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {impersonatingId === tenant.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <LogIn className="w-3.5 h-3.5" />
                          )}
                          <span className="hidden sm:inline">Enter Panel</span>
                          <span className="sm:hidden">Enter</span>
                        </button>
                        <Link
                          href={`/sp@dmin/tenants/${tenant.id}`}
                          className="text-xs px-2.5 py-1.5 rounded-lg font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Report</span>
                        </Link>
                        <button 
                          onClick={() => openCustomizeModal(tenant)}
                          className="text-xs px-2.5 py-1.5 rounded-lg font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors flex items-center gap-1.5"
                        >
                          <Settings2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Customize</span>
                        </button>
                        <button 
                          onClick={() => handleStatusChange(tenant.id, tenant.status)}
                          className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                            tenant.status === 'active' 
                              ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' 
                              : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                          }`}
                        >
                          {tenant.status === 'active' ? 'Suspend' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#121214] border border-zinc-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white">Customize Plan</h3>
              <button onClick={() => setEditingTenant(null)} className="text-zinc-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-zinc-400 mb-6">Override default plan limits for <strong>{editingTenant.name}</strong>. Leave blank to use their subscribed plan defaults.</p>
            
            <form onSubmit={handleSaveCustomPlan} className="space-y-4">
              <div className="p-3 bg-[#09090b] border border-zinc-800 rounded-xl space-y-2">
                <label className="text-xs font-semibold text-zinc-300 block">Tenant Logo URL (Displayed on Landing Page Marquee)</label>
                <div className="flex items-center gap-3">
                  {customData.logoUrl ? (
                    <div className="w-10 h-10 rounded-lg border border-zinc-700 bg-zinc-900 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                      <img src={customData.logoUrl.startsWith('http') ? customData.logoUrl : `${API}${customData.logoUrl}`} alt="Logo" className="w-full h-full object-contain" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-lg border border-dashed border-zinc-800 bg-zinc-900 flex items-center justify-center text-zinc-500 text-[9px] font-bold shrink-0">
                      No Logo
                    </div>
                  )}
                  <input
                    type="text"
                    value={customData.logoUrl}
                    onChange={e => setCustomData({...customData, logoUrl: e.target.value})}
                    className="flex-1 bg-[#121214] border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    placeholder="https://example.com/logo.png or /uploads/logos/..."
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-400">Custom Plan Name (optional)</label>
                <input
                  type="text"
                  value={customData.customPlanName}
                  onChange={e => setCustomData({...customData, customPlanName: e.target.value})}
                  className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. VIP Enterprise"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-400">Monthly Price ($)</label>
                  <input
                    type="number"
                    value={customData.customPriceUsd}
                    onChange={e => setCustomData({...customData, customPriceUsd: e.target.value})}
                    className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    placeholder={`e.g. ${editingTenant.basePlan?.priceMonthlyUsd || '50'}`}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-400">Billing Start Date</label>
                  <input
                    type="date"
                    value={customData.billingCycleStart}
                    onChange={e => setCustomData({...customData, billingCycleStart: e.target.value})}
                    className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-medium text-zinc-400">Message Quota /mo</label>
                    {modalUsage && <span className="text-[10px] text-emerald-400">Used: {modalUsage.messagesUsed}</span>}
                  </div>
                  <input
                    type="number"
                    value={customData.customMessageQuota}
                    onChange={e => setCustomData({...customData, customMessageQuota: e.target.value})}
                    className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    placeholder={`e.g. ${editingTenant.basePlan?.messageQuota || '10000'}`}
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-medium text-zinc-400">AI Quota /mo</label>
                    {modalUsage && <span className="text-[10px] text-emerald-400">Used: {modalUsage.aiUsed}</span>}
                  </div>
                  <input
                    type="number"
                    value={customData.customAiQuota}
                    onChange={e => setCustomData({...customData, customAiQuota: e.target.value})}
                    className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    placeholder={`e.g. ${editingTenant.basePlan?.aiQuota || '5000'}`}
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-medium text-zinc-400">Team Members</label>
                    {modalUsage && <span className="text-[10px] text-emerald-400">Active: {modalUsage.seatsUsed}</span>}
                  </div>
                  <input
                    type="number"
                    value={customData.customSeatLimit}
                    onChange={e => setCustomData({...customData, customSeatLimit: e.target.value})}
                    className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    placeholder={`e.g. ${editingTenant.basePlan?.seatLimit || '1'}`}
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-medium text-zinc-400">WhatsApp Limit</label>
                    {modalUsage && <span className="text-[10px] text-emerald-400">Active: {modalUsage.currentWhatsapp}</span>}
                  </div>
                  <input
                    type="number"
                    value={customData.customWhatsappLimit}
                    onChange={e => setCustomData({...customData, customWhatsappLimit: e.target.value})}
                    className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    placeholder={`e.g. ${editingTenant.basePlan?.whatsappLimit || '1'}`}
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-medium text-zinc-400">Messenger Limit</label>
                    {modalUsage && <span className="text-[10px] text-emerald-400">Active: {modalUsage.currentMessenger}</span>}
                  </div>
                  <input
                    type="number"
                    value={customData.customMessengerLimit}
                    onChange={e => setCustomData({...customData, customMessengerLimit: e.target.value})}
                    className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    placeholder={`e.g. ${editingTenant.basePlan?.messengerLimit || '1'}`}
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-medium text-zinc-400">Instagram Limit</label>
                    {modalUsage && <span className="text-[10px] text-emerald-400">Active: {modalUsage.currentInstagram}</span>}
                  </div>
                  <input
                    type="number"
                    value={customData.customInstagramLimit}
                    onChange={e => setCustomData({...customData, customInstagramLimit: e.target.value})}
                    className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    placeholder={`e.g. ${editingTenant.basePlan?.instagramLimit || '1'}`}
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-medium text-zinc-400">Website Widget Limit</label>
                    {modalUsage && <span className="text-[10px] text-emerald-400">Active: {modalUsage.currentWebsiteWidget || 0}</span>}
                  </div>
                  <input
                    type="number"
                    value={customData.customWebsiteWidgetLimit}
                    onChange={e => setCustomData({...customData, customWebsiteWidgetLimit: e.target.value})}
                    className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    placeholder={`e.g. ${editingTenant.basePlan?.websiteWidgetLimit || '1'}`}
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-medium text-zinc-400">Products Limit</label>
                    {modalUsage && <span className="text-[10px] text-emerald-400 font-mono">Count: {modalUsage.productsCount}</span>}
                  </div>
                  <input
                    type="number"
                    value={customData.customProductCatalogLimit}
                    onChange={e => setCustomData({...customData, customProductCatalogLimit: e.target.value})}
                    className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    placeholder={`e.g. ${editingTenant.basePlan?.productCatalogLimit || '50'}`}
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-medium text-zinc-400">Contacts Limit</label>
                    {modalUsage && <span className="text-[10px] text-emerald-400 font-mono">Saved: {modalUsage.contactsCount}</span>}
                  </div>
                  <input
                    type="number"
                    value={customData.customContactsLimit}
                    onChange={e => setCustomData({...customData, customContactsLimit: e.target.value})}
                    className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    placeholder="Unlimited"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-medium text-zinc-400">Storage Limit (MB)</label>
                    {modalUsage && <span className="text-[10px] text-emerald-400">Used: {modalUsage.storageUsedMb} MB</span>}
                  </div>
                  <input
                    type="number"
                    value={customData.customStorageLimitMb}
                    onChange={e => setCustomData({...customData, customStorageLimitMb: e.target.value})}
                    className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    placeholder={`e.g. ${editingTenant.basePlan?.storageLimitMb || '1024'}`}
                  />
                </div>
              </div>

              <div className="mt-4 border-t border-zinc-800 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-medium text-zinc-400">Override System Features (Access Control)</label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={customData.hasFeaturesOverride}
                      onChange={(e) => setCustomData({ ...customData, hasFeaturesOverride: e.target.checked })}
                      className="w-3.5 h-3.5 rounded border-zinc-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-background bg-background" 
                    />
                    <span className="text-[11px] font-medium text-emerald-400">Enable Feature Override</span>
                  </label>
                </div>
                
                {customData.hasFeaturesOverride && (
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <label className="flex items-center gap-2 cursor-pointer bg-zinc-900 border border-zinc-800 p-2.5 rounded-xl hover:border-emerald-500/50 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={customData.customAllowByok}
                        onChange={(e) => setCustomData({ ...customData, customAllowByok: e.target.checked })}
                        className="w-4 h-4 rounded border-zinc-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-background bg-zinc-900" 
                      />
                      <span className="text-[11px] font-medium text-zinc-200">Bring Your Own Key (BYOK)</span>
                    </label>
                    {[
                      { id: 'ai_assistant', label: 'AI Assistant' },
                      { id: 'platform_support_ai', label: 'Platform Support AI (Widget)' },
                      { id: 'messenger', label: 'Messenger Integration' },
                      { id: 'whatsapp', label: 'WhatsApp API (Official)' },
                      { id: 'whatsapp_qr', label: 'WhatsApp Web (Unofficial QR)' },
                      { id: 'whatsapp_widget', label: 'WhatsApp Website Widget' },
                      { id: 'website_widget', label: 'Website Live Chat Widget' },
                      { id: 'instagram_dm', label: 'Instagram DM Integration' },
                      { id: 'lead_manage', label: 'Leads CRM' },
                      { id: 'commerce', label: 'Products & Orders' },
                      { id: 'broadcast', label: 'Broadcast Campaigns' },
                      { id: 'team_management', label: 'Team Members & Roles' },
                      { id: 'contact_labels', label: 'Custom Contact Labels' },
                      { id: 'inbox_smart_tabs', label: 'Smart Inbox Tabs' },
                      { id: 'inbox_notes', label: 'Inbox Contact Notes' },
                      { id: 'inbox_ai_summary', label: 'AI Conversation Summary' },
                      { id: 'inbox_activity_timeline', label: 'Activity Timeline' },
                      { id: 'inbox_shared_files', label: 'Shared Files Gallery' },
                      { id: 'inbox_multi_agent_collaborators', label: 'Multi-Agent Collaborators' },
                      { id: 'inbox_multi_ai_assistant_picker', label: 'Multiple AI Assistant Picker' },
                      { id: 'agent_presence', label: 'Agent Presence Status' },
                      { id: 'facebook_comment_automation', label: 'Facebook Comment Automation' },
                      { id: 'ai_tool_order_placement', label: 'AI Tool: Auto Order Placement' },
                      { id: 'ai_tool_image_reading', label: 'AI Tool: Image Reading' },
                      { id: 'ai_tool_support_detection', label: 'AI Tool: Support Detection' },
                      { id: 'ai_tool_product_matching', label: 'AI Tool: Product Photo Matching' }
                    ].map(feature => (
                      <label key={feature.id} className="flex items-center gap-2 cursor-pointer bg-zinc-900 border border-zinc-800 p-2.5 rounded-xl hover:border-emerald-500/50 transition-colors">
                        <input 
                          type="checkbox" 
                          checked={customData.customFeatures.includes(feature.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCustomData({ ...customData, customFeatures: [...customData.customFeatures, feature.id] });
                            } else {
                              setCustomData({ ...customData, customFeatures: customData.customFeatures.filter((f: string) => f !== feature.id) });
                            }
                          }}
                          className="w-4 h-4 rounded border-zinc-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-background bg-zinc-900" 
                        />
                        <span className="text-[11px] font-medium text-zinc-200 leading-tight">{feature.label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={handleResetCustomPlan}
                  disabled={saving}
                  className="px-3 py-2 rounded-xl text-xs font-medium text-amber-400 border border-amber-500/30 hover:bg-amber-500/10 transition-colors disabled:opacity-50 text-center"
                >
                  Reset Defaults
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingTenant(null)}
                    className="flex-1 sm:flex-initial px-4 py-2 rounded-xl text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition-colors text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 sm:flex-initial px-4 py-2 rounded-xl text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-500 transition-colors disabled:opacity-50 text-center"
                  >
                    {saving ? 'Saving...' : 'Save Custom Plan'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
