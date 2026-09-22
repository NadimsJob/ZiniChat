'use client';

import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { useLanguage } from '@/components/LanguageProvider';
import { Layers, Globe2, ToggleLeft, ToggleRight, Search, ShieldCheck, ChevronRight, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

const KNOWN_FEATURES = [
  { key: 'capi_hub', name: 'CAPI Hub', desc: 'Server-side tracking for Meta Pixel' },
  { key: 'meta_ads_account_connect', name: 'Meta Ad Account', desc: 'OAuth connection for Meta Ads' },
  { key: 'meta_ads_agent', name: 'Ads Copilot', desc: 'AI agent for Meta Ads creation' },
  { key: 'ads_auto_scaling', name: 'Auto-Scaling', desc: 'AI auto-scaling engine for campaigns' },
];

export default function FeatureRolloutPage() {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [rollouts, setRollouts] = useState<any[]>([]);
  
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const [tenantSearch, setTenantSearch] = useState('');
  const [tenantRollouts, setTenantRollouts] = useState<any[]>([]);
  const [tenantsLoading, setTenantsLoading] = useState(false);

  useEffect(() => {
    fetchRollouts();
  }, []);

  const fetchRollouts = async () => {
    try {
      const token = Cookies.get('access_token');
      const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${API}/feature-rollout`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRollouts(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTenantRollouts = async (key: string) => {
    setTenantsLoading(true);
    try {
      const token = Cookies.get('access_token');
      const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${API}/feature-rollout/${key}/tenants`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTenantRollouts(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTenantsLoading(false);
    }
  };

  const toggleGlobal = async (key: string, currentStatus: boolean) => {
    try {
      const token = Cookies.get('access_token');
      const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${API}/feature-rollout/${key}/global`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isGlobal: !currentStatus })
      });
      if (res.ok) {
        toast.success(language === 'en' ? 'Global status updated' : 'গ্লোবাল স্ট্যাটাস আপডেট হয়েছে');
        fetchRollouts();
      }
    } catch (err) {
      console.error(err);
      toast.error(language === 'en' ? 'Failed to update' : 'আপডেট ব্যর্থ হয়েছে');
    }
  };

  const toggleTenant = async (key: string, tenantId: string, currentStatus: boolean) => {
    try {
      const token = Cookies.get('access_token');
      const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${API}/feature-rollout/${key}/tenants/${tenantId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isEnabled: !currentStatus })
      });
      if (res.ok) {
        toast.success('Tenant status updated');
        fetchTenantRollouts(key);
        fetchRollouts();
      }
    } catch (err) {
      console.error(err);
      toast.error('Update failed');
    }
  };

  const handleSelectFeature = (key: string) => {
    if (selectedFeature === key) {
      setSelectedFeature(null);
    } else {
      setSelectedFeature(key);
      fetchTenantRollouts(key);
    }
  };

  const getDbRollout = (key: string) => rollouts.find(r => r.featureKey === key);

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-[#f8fafc] dark:bg-[#09090b] custom-scrollbar">
      {/* Header */}
      <div className="shrink-0 px-6 py-6 border-b border-border bg-white dark:bg-[#0f0f11] shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10 shadow-sm">
              <Layers className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                {language === 'en' ? 'Feature Rollout' : 'ফিচার রোলআউট'}
              </h1>
              <p className="text-xs text-muted-foreground mt-1">
                {language === 'en' ? 'Manage global access and tenant-specific overrides for new features.' : 'নতুন ফিচারের গ্লোবাল এক্সেস এবং নির্দিষ্ট টেন্যান্টের জন্য ওভাররাইড ম্যানেজ করুন।'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-5xl mx-auto w-full space-y-6">
        
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {KNOWN_FEATURES.map((feature) => {
              const dbRollout = getDbRollout(feature.key);
              const isGlobal = dbRollout?.isGlobal || false;
              const tenantCount = dbRollout?._count?.tenants || 0;
              const isSelected = selectedFeature === feature.key;

              return (
                <div key={feature.key} className="bg-white dark:bg-[#0f0f11] rounded-2xl border border-border shadow-sm overflow-hidden transition-all duration-200">
                  <div className="p-5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-zinc-800/30 transition-colors">
                    <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => handleSelectFeature(feature.key)}>
                      <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <Globe2 className="w-5 h-5 text-blue-500" />
                      </div>
                      <div>
                        <h3 className="text-[14px] font-bold text-foreground">{feature.name}</h3>
                        <p className="text-[12px] text-muted-foreground mt-0.5 font-mono">{feature.key}</p>
                        <p className="text-[11px] text-muted-foreground mt-1">{feature.desc}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Tenant Overrides</p>
                        <p className="text-[14px] font-bold text-foreground mt-0.5">{tenantCount} active</p>
                      </div>

                      <div className="w-px h-10 bg-border"></div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Global Status</p>
                          <p className={`text-[12px] font-bold mt-0.5 ${isGlobal ? 'text-primary' : 'text-orange-500'}`}>
                            {isGlobal ? 'ENABLED' : 'DISABLED'}
                          </p>
                        </div>
                        <button 
                          onClick={() => toggleGlobal(feature.key, isGlobal)}
                          className="hover:opacity-80 transition-opacity"
                        >
                          {isGlobal ? (
                            <ToggleRight className="w-9 h-9 text-primary" />
                          ) : (
                            <ToggleLeft className="w-9 h-9 text-slate-300 dark:text-zinc-700" />
                          )}
                        </button>
                      </div>
                      
                      <button 
                        onClick={() => handleSelectFeature(feature.key)}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                      >
                        <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${isSelected ? 'rotate-90' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Tenant Override Section */}
                  {isSelected && (
                    <div className="border-t border-border bg-slate-50 dark:bg-zinc-900/50 p-5 animate-in slide-in-from-top-2 duration-200">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-[13px] font-bold text-foreground flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-primary" />
                          Tenant Specific Overrides
                        </h4>
                        
                        {/* 
                          Note: In a real app we'd have an autocomplete to select ANY tenant to add an override.
                          Here we're just listing existing overrides. To add a new override, we'd need a tenant search input.
                        */}
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input 
                            type="text"
                            placeholder="Enter Tenant ID to override..."
                            className="w-64 pl-8 pr-3 py-1.5 text-[12px] bg-white dark:bg-[#0f0f11] border border-border rounded-lg outline-none focus:border-primary/50 transition-colors"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const val = (e.target as HTMLInputElement).value;
                                if (val) {
                                  toggleTenant(feature.key, val, false);
                                  (e.target as HTMLInputElement).value = '';
                                }
                              }
                            }}
                          />
                        </div>
                      </div>

                      {tenantsLoading ? (
                        <div className="text-[12px] text-muted-foreground py-4 text-center">Loading overrides...</div>
                      ) : tenantRollouts.length === 0 ? (
                        <div className="text-[12px] text-muted-foreground py-4 text-center bg-white dark:bg-[#0f0f11] rounded-lg border border-border border-dashed">
                          No tenant overrides configured for this feature.
                        </div>
                      ) : (
                        <div className="bg-white dark:bg-[#0f0f11] rounded-lg border border-border overflow-hidden">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-border bg-slate-50 dark:bg-zinc-900/50">
                                <th className="py-2.5 px-4 text-[11px] font-bold text-muted-foreground uppercase">Tenant</th>
                                <th className="py-2.5 px-4 text-[11px] font-bold text-muted-foreground uppercase">Plan</th>
                                <th className="py-2.5 px-4 text-[11px] font-bold text-muted-foreground uppercase">Status</th>
                                <th className="py-2.5 px-4 text-[11px] font-bold text-muted-foreground uppercase text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {tenantRollouts.map((tr) => (
                                <tr key={tr.id} className="border-b border-border last:border-0 hover:bg-slate-50 dark:hover:bg-zinc-800/30">
                                  <td className="py-2.5 px-4">
                                    <p className="text-[13px] font-medium text-foreground">{tr.tenant?.businessName || 'Unknown'}</p>
                                    <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{tr.tenantId}</p>
                                  </td>
                                  <td className="py-2.5 px-4">
                                    <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-[11px] font-medium text-foreground">
                                      {tr.tenant?.plan?.name || 'No Plan'}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-4">
                                    {tr.isEnabled ? (
                                      <span className="inline-flex items-center gap-1.5 text-primary text-[12px] font-bold">
                                        <CheckCircle2 className="w-3.5 h-3.5" /> Enabled
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1.5 text-red-500 text-[12px] font-bold">
                                        <XCircle className="w-3.5 h-3.5" /> Disabled
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-4 text-right">
                                    <button 
                                      onClick={() => toggleTenant(feature.key, tr.tenantId, tr.isEnabled)}
                                      className="hover:opacity-80 transition-opacity"
                                    >
                                      {tr.isEnabled ? (
                                        <ToggleRight className="w-8 h-8 text-primary" />
                                      ) : (
                                        <ToggleLeft className="w-8 h-8 text-slate-300 dark:text-zinc-700" />
                                      )}
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
