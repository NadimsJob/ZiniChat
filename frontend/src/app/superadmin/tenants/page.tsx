'use client';

import { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { Settings2, X } from 'lucide-react';
import toast from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function TenantsPage() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [aiConfigs, setAiConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTenant, setEditingTenant] = useState<any>(null);
  const [customData, setCustomData] = useState({
    customPlanName: '',
    customPriceUsd: '',
    customMessageQuota: '',
    customAiQuota: '',
    customStorageLimitMb: '',
    billingCycleStart: ''
  });
  const [saving, setSaving] = useState(false);

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

  const openCustomizeModal = (tenant: any) => {
    setEditingTenant(tenant);
    setCustomData({
      customPlanName: tenant.customPlanName || '',
      customPriceUsd: tenant.customPriceUsd || '',
      customMessageQuota: tenant.customMessageQuota || '',
      customAiQuota: tenant.customAiQuota || '',
      customStorageLimitMb: tenant.customStorageLimitMb || '',
      billingCycleStart: tenant.trialEndsAt ? new Date(tenant.trialEndsAt).toISOString().split('T')[0] : ''
    });
  };

  const handleSaveCustomPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant) return;
    setSaving(true);
    
    // Clean up empty strings to undefined/null for API
    const payload: any = {};
    if (customData.customPlanName) payload.customPlanName = customData.customPlanName;
    if (customData.customPriceUsd) payload.customPriceUsd = parseFloat(customData.customPriceUsd);
    if (customData.customMessageQuota) payload.customMessageQuota = parseInt(customData.customMessageQuota);
    if (customData.customAiQuota) payload.customAiQuota = parseInt(customData.customAiQuota);
    if (customData.customStorageLimitMb) payload.customStorageLimitMb = parseInt(customData.customStorageLimitMb);
    if (customData.billingCycleStart) payload.billingCycleStart = customData.billingCycleStart;

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
        toast.success('Custom plan saved successfully');
        setEditingTenant(null);
        fetchTenantsAndConfigs();
      } else {
        toast.error('Failed to save custom plan');
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
        <table className="w-full text-left">
          <thead className="bg-surface-hover/50 text-zinc-400 text-[12px]">
            <tr>
              <th className="px-3 py-2 font-medium">Business Name</th>
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium">Created At</th>
              <th className="px-3 py-2 font-medium">AI Responses</th>
              <th className="px-3 py-2 font-medium">AI Model</th>
              <th className="px-3 py-2 font-medium">BYOK</th>
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
                  <td className="px-3 py-2 text-zinc-400">{new Date(tenant.createdAt).toLocaleDateString()}</td>
                  <td className="px-3 py-2 text-zinc-300">
                    {tenant.aiQuota ? (
                      <span className="text-xs">
                        <strong className="text-zinc-100">{tenant.aiQuota.used}</strong> / {tenant.aiQuota.limit}
                      </span>
                    ) : 'N/A'}
                  </td>
                  <td className="px-3 py-2">
                    <select 
                      value={tenant.customAiConfigId || 'default'} 
                      onChange={(e) => handleAiConfigChange(tenant.id, e.target.value)}
                      className="bg-[#09090b] border border-zinc-800 rounded px-2 py-1 text-[11px] text-white focus:outline-none focus:border-emerald-500 max-w-[130px] truncate"
                    >
                      <option value="default">Platform Default</option>
                      {aiConfigs.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    {tenant.hasByok ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">YES</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-zinc-500 border border-zinc-700">NO</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      tenant.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                    }`}>
                      {tenant.status.charAt(0).toUpperCase() + tenant.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end items-center gap-2">
                      <button 
                        onClick={() => openCustomizeModal(tenant)}
                        className="text-xs px-3 py-1.5 rounded-lg font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors flex items-center gap-1.5"
                      >
                        <Settings2 className="w-3.5 h-3.5" />
                        Customize
                      </button>
                      <button 
                        onClick={() => handleStatusChange(tenant.id, tenant.status)}
                        className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
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

      {editingTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#121214] border border-zinc-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white">Customize Plan</h3>
              <button onClick={() => setEditingTenant(null)} className="text-zinc-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-zinc-400 mb-6">Override default plan limits for <strong>{editingTenant.name}</strong>. Leave blank to use their subscribed plan defaults.</p>
            
            <form onSubmit={handleSaveCustomPlan} className="space-y-4">
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-400">Monthly Price ($)</label>
                  <input
                    type="number"
                    value={customData.customPriceUsd}
                    onChange={e => setCustomData({...customData, customPriceUsd: e.target.value})}
                    className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. 50"
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
                  <label className="text-xs font-medium text-zinc-400">Message Quota</label>
                  <input
                    type="number"
                    value={customData.customMessageQuota}
                    onChange={e => setCustomData({...customData, customMessageQuota: e.target.value})}
                    className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. 10000"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-400">AI Quota</label>
                  <input
                    type="number"
                    value={customData.customAiQuota}
                    onChange={e => setCustomData({...customData, customAiQuota: e.target.value})}
                    className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. 5000"
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-xs font-medium text-zinc-400">Storage Limit (MB)</label>
                  <input
                    type="number"
                    value={customData.customStorageLimitMb}
                    onChange={e => setCustomData({...customData, customStorageLimitMb: e.target.value})}
                    className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. 1024"
                  />
                </div>
              </div>
              
              <div className="pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingTenant(null)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-500 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Custom Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
