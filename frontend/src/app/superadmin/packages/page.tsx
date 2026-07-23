'use client';

import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { useLanguage } from '@/components/LanguageProvider';
import { useCurrency } from '@/components/CurrencyProvider';
import { Plus, Trash2, Edit, Save, X, Check, Package, Puzzle, CheckCircle } from 'lucide-react';

export default function PackagesPage() {
  const { language } = useLanguage();
  const { toCurrency, formatBDT, formatPrice } = useCurrency();
  const [activeTab, setActiveTab] = useState<'plans' | 'addons'>('plans');
  
  const [plans, setPlans] = useState<any[]>([]);
  const [addons, setAddons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Plan form
  const [planForm, setPlanForm] = useState({
    name: '', nameBn: '', description: '', descriptionBn: '',
    priceMonthlyBdt: 0, priceYearlyBdt: 0,
    promoPriceMonthlyBdt: 0, promoMonths: 0, yearlyDiscountPercent: 0,
    messageQuota: 1000, aiQuota: 500, seatLimit: 1, trialDays: 0,
    allowByok: false,
    features: [] as string[],
    featuresJson: [] as { en: string, bn: string }[],
    isActive: true, isPopular: false
  });

  // Addon form
  const [addonForm, setAddonForm] = useState({
    name: '', nameBn: '', description: '', descriptionBn: '',
    priceBdt: 0, type: 'ai_tokens', value: 1000, isActive: true
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = Cookies.get('access_token');
      const headers = { 'Authorization': `Bearer ${token}` };
      const [plansRes, addonsRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/packages/admin/plans`, { headers }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/packages/admin/addons`, { headers })
      ]);
      if (plansRes.ok) setPlans(await plansRes.json());
      if (addonsRes.ok) setAddons(await addonsRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSavePlan = async () => {
    const token = Cookies.get('access_token');
    const url = editingId 
      ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/packages/admin/plans/${editingId}`
      : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/packages/admin/plans`;
    const method = editingId ? 'PATCH' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(planForm)
      });
      if (res.ok) {
        setIsEditing(false);
        setEditingId(null);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveAddon = async () => {
    const token = Cookies.get('access_token');
    const url = editingId 
      ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/packages/admin/addons/${editingId}`
      : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/packages/admin/addons`;
    const method = editingId ? 'PATCH' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(addonForm)
      });
      if (res.ok) {
        setIsEditing(false);
        setEditingId(null);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (type: 'plans' | 'addons', id: string) => {
    if (!confirm('Are you sure you want to delete this?')) return;
    const token = Cookies.get('access_token');
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/packages/admin/${type}/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSetDefault = async (id: string) => {
    if (!confirm('Are you sure you want to set this plan as the default for new signups?')) return;
    const token = Cookies.get('access_token');
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/packages/admin/plans/${id}/default`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const openPlanForm = (plan?: any) => {
    if (plan) {
      setPlanForm({
        name: plan.name, nameBn: plan.nameBn || '', description: plan.description || '', descriptionBn: plan.descriptionBn || '',
        priceMonthlyBdt: Number(plan.priceMonthlyBdt) || 0, 
        priceYearlyBdt: Number(plan.priceYearlyBdt) || 0,
        promoPriceMonthlyBdt: Number(plan.promoPriceMonthlyBdt) || 0, 
        promoMonths: Number(plan.promoMonths) || 0, 
        yearlyDiscountPercent: Number(plan.yearlyDiscountPercent) || 0,
        messageQuota: plan.messageQuota, aiQuota: plan.aiQuota, seatLimit: plan.seatLimit, trialDays: plan.trialDays || 0,
        allowByok: plan.allowByok || false,
        features: Array.isArray(plan.features) ? plan.features : [],
        featuresJson: Array.isArray(plan.featuresJson) ? plan.featuresJson : (typeof plan.featuresJson === 'string' ? (()=>{ try { const parsed = JSON.parse(plan.featuresJson); return Array.isArray(parsed) ? parsed : []; } catch { return []; } })() : []),
        isActive: plan.isActive, isPopular: plan.isPopular
      });
      setEditingId(plan.id);
    } else {
      setPlanForm({
        name: '', nameBn: '', description: '', descriptionBn: '', 
        priceMonthlyBdt: 0, priceYearlyBdt: 0,
        promoPriceMonthlyBdt: 0, promoMonths: 0, yearlyDiscountPercent: 0,
        messageQuota: 1000, aiQuota: 500, seatLimit: 1, trialDays: 0, allowByok: false,
        features: [],
        featuresJson: [], 
        isActive: true, isPopular: false
      });
      setEditingId(null);
    }
    setIsEditing(true);
  };

  const openAddonForm = (addon?: any) => {
    if (addon) {
      setAddonForm({
        name: addon.name, nameBn: addon.nameBn || '', description: addon.description || '', descriptionBn: addon.descriptionBn || '',
        priceBdt: Number(addon.priceBdt), type: addon.type, value: addon.value, isActive: addon.isActive
      });
      setEditingId(addon.id);
    } else {
      setAddonForm({
        name: '', nameBn: '', description: '', descriptionBn: '', priceBdt: 0, type: 'ai_tokens', value: 1000, isActive: true
      });
      setEditingId(null);
    }
    setIsEditing(true);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-2 animate-in fade-in duration-500 pb-3">
      <div>
        <h1 className="text-[15px] font-bold tracking-tight">Packages & Plans</h1>
        <p className="text-zinc-400 mt-2">Manage subscription plans and add-ons dynamically.</p>
      </div>

      <div className="flex border-b border-surface-hover mb-3">
        <button 
          onClick={() => { setActiveTab('plans'); setIsEditing(false); }}
          className={`flex items-center gap-2 px-3 py-3 border-b-2 transition-colors font-medium ${activeTab === 'plans' ? 'border-primary text-primary' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
        >
          <Package className="w-4 h-4" /> Subscription Plans
        </button>
        <button 
          onClick={() => { setActiveTab('addons'); setIsEditing(false); }}
          className={`flex items-center gap-2 px-3 py-3 border-b-2 transition-colors font-medium ${activeTab === 'addons' ? 'border-primary text-primary' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
        >
          <Puzzle className="w-4 h-4" /> Add-ons
        </button>
      </div>

      {!isEditing && activeTab === 'plans' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => openPlanForm()} className="flex items-center gap-2 px-2.5 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium shadow-lg shadow-primary/20">
              <Plus className="w-4 h-4" /> Create New Plan
            </button>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {plans.map(plan => (
              <div key={plan.id} className="bg-surface border border-surface-hover rounded-xl p-3 relative group">
                {!plan.isActive && <div className="absolute top-2.5 right-4 text-xs font-bold bg-red-500/10 text-red-500 px-2 py-1 rounded">Inactive</div>}
                {plan.isPopular && <div className="absolute top-2.5 right-4 text-xs font-bold bg-primary/10 text-primary px-2 py-1 rounded">Popular</div>}
                {plan.isDefault && <div className="absolute -top-3 -right-3 text-[10px] font-black bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-1 rounded-full shadow-lg border-2 border-surface animate-bounce">🌟 DEFAULT</div>}
                
                <h3 className="text-[15px] font-bold">{plan.name}</h3>
                <div className="text-[13px] font-black mt-2 text-primary">{formatPrice(plan.priceMonthlyBdt)}<span className="text-[12px] text-zinc-500 font-normal"> / monthly</span></div>
                
                <div className="mt-2 space-y-2 text-[12px] text-zinc-400">
                  <div className="flex justify-between"><span>Team Members:</span> <span className="font-medium text-zinc-200">{plan.seatLimit}</span></div>
                  <div className="flex justify-between"><span>Messages:</span> <span className="font-medium text-zinc-200">{plan.messageQuota}</span></div>
                  <div className="flex justify-between"><span>AI Responses:</span> <span className="font-medium text-zinc-200">{plan.aiQuota}</span></div>
                  <div className="flex justify-between"><span>Features:</span> <span className="font-medium text-zinc-200">{plan.featuresJson?.length || 0} items</span></div>
                </div>

                <div className="flex items-center gap-2 mt-3 pt-4 border-t border-surface-hover">
                  <button onClick={() => openPlanForm(plan)} className="flex-1 flex justify-center items-center gap-2 px-3 py-2 bg-secondary/10 text-secondary rounded-lg hover:bg-secondary/20 transition-colors text-[12px] font-medium">
                    <Edit className="w-4 h-4" /> Edit
                  </button>
                  <button onClick={() => handleSetDefault(plan.id)} className="flex-1 flex justify-center items-center gap-2 px-3 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-[12px] font-medium" title="Set as Default for new Signups">
                    <CheckCircle className="w-4 h-4" /> Set Default
                  </button>
                  <button onClick={() => handleDelete('plans', plan.id)} className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {plans.length === 0 && !loading && (
              <div className="col-span-full py-12 text-center text-zinc-500">No plans created yet.</div>
            )}
          </div>
        </div>
      )}

      {isEditing && activeTab === 'plans' && (
        <div className="bg-surface border border-surface-hover rounded-xl p-3 animate-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center mb-3 pb-4 border-b border-surface-hover">
            <h2 className="text-[15px] font-bold">{editingId ? 'Edit Plan' : 'Create New Plan'}</h2>
            <button onClick={() => setIsEditing(false)} className="p-2 text-zinc-400 hover:text-zinc-200"><X className="w-4 h-4" /></button>
          </div>
          
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <div>
                <label className="block text-[12px] font-medium mb-1 text-zinc-400">Plan Name (EN)</label>
                <input type="text" value={planForm.name} onChange={e => setPlanForm({...planForm, name: e.target.value})} className="w-full bg-background border border-surface-hover rounded-lg px-2.5 py-2 focus:border-primary focus:outline-none" />
              </div>
              <div>
                <label className="block text-[12px] font-medium mb-1 text-zinc-400">Plan Name (BN)</label>
                <input type="text" value={planForm.nameBn} onChange={e => setPlanForm({...planForm, nameBn: e.target.value})} className="w-full bg-background border border-surface-hover rounded-lg px-2.5 py-2 focus:border-primary focus:outline-none" />
              </div>
              <div>
                <label className="block text-[12px] font-medium mb-1 text-zinc-400">Description (EN)</label>
                <textarea rows={2} value={planForm.description} onChange={e => setPlanForm({...planForm, description: e.target.value})} className="w-full bg-background border border-surface-hover rounded-lg px-2.5 py-2 focus:border-primary focus:outline-none" />
              </div>
              <div>
                <label className="block text-[12px] font-medium mb-1 text-zinc-400">Description (BN)</label>
                <textarea rows={2} value={planForm.descriptionBn} onChange={e => setPlanForm({...planForm, descriptionBn: e.target.value})} className="w-full bg-background border border-surface-hover rounded-lg px-2.5 py-2 focus:border-primary focus:outline-none" />
              </div>
              
              <div className="flex items-center gap-2.5 mt-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={planForm.isActive} onChange={e => setPlanForm({...planForm, isActive: e.target.checked})} className="w-4 h-4 rounded border-zinc-700 text-primary focus:ring-primary focus:ring-offset-background bg-background" />
                  <span className="text-[12px] font-medium">Active Plan</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={planForm.isPopular} onChange={e => setPlanForm({...planForm, isPopular: e.target.checked})} className="w-4 h-4 rounded border-zinc-700 text-primary focus:ring-primary focus:ring-offset-background bg-background" />
                  <span className="text-[12px] font-medium text-primary">Mark as Popular</span>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[12px] font-medium mb-1 text-zinc-400">Monthly Price (BDT)</label>
                  <input type="number" step="1" value={planForm.priceMonthlyBdt} onChange={e => setPlanForm({...planForm, priceMonthlyBdt: Number(e.target.value)})} className="w-full bg-background border border-surface-hover rounded-lg px-2.5 py-2 focus:border-primary focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[12px] font-medium mb-1 text-zinc-400">Yearly Price (BDT)</label>
                  <input type="number" step="1" value={planForm.priceYearlyBdt} onChange={e => setPlanForm({...planForm, priceYearlyBdt: Number(e.target.value)})} className="w-full bg-background border border-surface-hover rounded-lg px-2.5 py-2 focus:border-primary focus:outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5 bg-primary/5 p-3 rounded-xl border border-primary/20 mt-3">
                <div className="col-span-3 mb-1">
                  <h4 className="text-[13px] font-bold text-primary">Promotional Discounts</h4>
                </div>
                <div>
                  <label className="block text-[12px] font-medium mb-1 text-zinc-400">Promo Price (BDT/mo)</label>
                  <input type="number" step="1" value={planForm.promoPriceMonthlyBdt} onChange={e => setPlanForm({...planForm, promoPriceMonthlyBdt: Number(e.target.value)})} className="w-full bg-background border border-primary/20 rounded-lg px-2.5 py-2 focus:border-primary focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[12px] font-medium mb-1 text-zinc-400">Promo Duration (Months)</label>
                  <input type="number" step="1" value={planForm.promoMonths} onChange={e => setPlanForm({...planForm, promoMonths: Number(e.target.value)})} className="w-full bg-background border border-primary/20 rounded-lg px-2.5 py-2 focus:border-primary focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[12px] font-medium mb-1 text-zinc-400">Yearly Discount (%)</label>
                  <input type="number" step="0.1" value={planForm.yearlyDiscountPercent} onChange={e => setPlanForm({...planForm, yearlyDiscountPercent: Number(e.target.value)})} className="w-full bg-background border border-primary/20 rounded-lg px-2.5 py-2 focus:border-primary focus:outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-[12px] font-medium mb-1 text-zinc-400">Team Member Limit</label>
                  <input type="number" value={planForm.seatLimit} onChange={e => setPlanForm({...planForm, seatLimit: Number(e.target.value)})} className="w-full bg-background border border-surface-hover rounded-lg px-2.5 py-2 focus:border-primary focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[12px] font-medium mb-1 text-zinc-400">Trial Period (Days)</label>
                  <input type="number" value={planForm.trialDays} onChange={e => setPlanForm({...planForm, trialDays: Number(e.target.value)})} className="w-full bg-background border border-surface-hover rounded-lg px-2.5 py-2 focus:border-primary focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[12px] font-medium mb-1 text-zinc-400">Msgs/mo</label>
                  <input type="number" value={planForm.messageQuota} onChange={e => setPlanForm({...planForm, messageQuota: Number(e.target.value)})} className="w-full bg-background border border-surface-hover rounded-lg px-2.5 py-2 focus:border-primary focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[12px] font-medium mb-1 text-zinc-400">AI Responses/mo</label>
                  <input type="number" value={planForm.aiQuota} onChange={e => setPlanForm({...planForm, aiQuota: Number(e.target.value)})} className="w-full bg-background border border-surface-hover rounded-lg px-2.5 py-2 focus:border-primary focus:outline-none" />
                </div>
              </div>

              <div className="mt-3 border-t border-surface-hover pt-3">
                <label className="block text-[12px] font-medium mb-3 text-zinc-400">System Features (Access Control)</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <label className="flex items-center gap-2 cursor-pointer bg-background border border-surface-hover p-3 rounded-xl hover:border-primary/50 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={planForm.allowByok}
                      onChange={(e) => setPlanForm({ ...planForm, allowByok: e.target.checked })}
                      className="w-4 h-4 rounded border-zinc-700 text-primary focus:ring-primary focus:ring-offset-background bg-background" 
                    />
                    <span className="text-[12px] font-medium">Bring Your Own Key (BYOK)</span>
                  </label>
                  {[
                    { id: 'ai_assistant', label: 'AI Assistant' },
                    { id: 'platform_support_ai', label: 'Platform Support AI (Widget)' },
                    { id: 'messenger', label: 'Messenger Integration' },
                    { id: 'whatsapp', label: 'WhatsApp API (Official)' },
                    { id: 'whatsapp_qr', label: 'WhatsApp Web (Unofficial QR)' },
                    { id: 'whatsapp_widget', label: 'WhatsApp Website Widget' },
                    { id: 'instagram_dm', label: 'Instagram DM Integration' },
                    { id: 'lead_manage', label: 'Leads CRM' },
                    { id: 'commerce', label: 'Products & Orders' },
                    { id: 'broadcast', label: 'Broadcast Campaigns' },
                    { id: 'team_management', label: 'Team Members & Roles' },
                    { id: 'contact_labels', label: 'Custom Contact Labels' }
                  ].map(feature => (
                    <label key={feature.id} className="flex items-center gap-2 cursor-pointer bg-background border border-surface-hover p-3 rounded-xl hover:border-primary/50 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={planForm.features.includes(feature.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setPlanForm({ ...planForm, features: [...planForm.features, feature.id] });
                          } else {
                            setPlanForm({ ...planForm, features: planForm.features.filter(f => f !== feature.id) });
                          }
                        }}
                        className="w-4 h-4 rounded border-zinc-700 text-primary focus:ring-primary focus:ring-offset-background bg-background" 
                      />
                      <span className="text-[12px] font-medium">{feature.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mt-3 border-t border-surface-hover pt-3">
                <label className="block text-[12px] font-medium mb-2 text-zinc-400 flex justify-between items-center">
                  Display Features List (Landing Page)
                  <button type="button" onClick={() => {
                    const current = Array.isArray(planForm.featuresJson) ? planForm.featuresJson : [];
                    setPlanForm({...planForm, featuresJson: [...current, { en: '', bn: '' }]});
                  }} className="text-xs text-secondary hover:underline">+ Add Feature</button>
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                  {Array.isArray(planForm.featuresJson) && planForm.featuresJson.map((f, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <div className="flex-1 space-y-2">
                        <input type="text" placeholder="EN" value={f.en} onChange={e => { const newF = [...planForm.featuresJson]; newF[i] = { ...newF[i], en: e.target.value }; setPlanForm({...planForm, featuresJson: newF}); }} className="w-full bg-background border border-surface-hover rounded px-3 py-1.5 text-[12px] focus:border-primary focus:outline-none" />
                        <input type="text" placeholder="BN" value={f.bn} onChange={e => { const newF = [...planForm.featuresJson]; newF[i] = { ...newF[i], bn: e.target.value }; setPlanForm({...planForm, featuresJson: newF}); }} className="w-full bg-background border border-surface-hover rounded px-3 py-1.5 text-[12px] focus:border-primary focus:outline-none" />
                      </div>
                      <button type="button" onClick={() => { const newF = [...planForm.featuresJson]; newF.splice(i, 1); setPlanForm({...planForm, featuresJson: newF}); }} className="p-1.5 text-zinc-500 hover:text-red-500 mt-1"><X className="w-4 h-4" /></button>
                    </div>
                  ))}
                  {(!Array.isArray(planForm.featuresJson) || planForm.featuresJson.length === 0) && <p className="text-xs text-zinc-500 italic">No features added.</p>}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-2 flex justify-end gap-3">
            <button onClick={() => setIsEditing(false)} className="px-2.5 py-2 rounded-lg font-medium text-zinc-400 hover:text-zinc-200 transition-colors">Cancel</button>
            <button onClick={handleSavePlan} className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium shadow-lg shadow-primary/20">
              <Save className="w-4 h-4" /> Save Plan
            </button>
          </div>
        </div>
      )}

      {!isEditing && activeTab === 'addons' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => openAddonForm()} className="flex items-center gap-2 px-2.5 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors font-medium shadow-lg shadow-secondary/20">
              <Plus className="w-4 h-4" /> Create New Add-on
            </button>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
            {addons.map(addon => (
              <div key={addon.id} className="bg-surface border border-surface-hover rounded-xl p-3 relative group">
                {!addon.isActive && <div className="absolute top-2.5 right-4 text-xs font-bold bg-red-500/10 text-red-500 px-2 py-1 rounded">Inactive</div>}
                <div className="w-7 h-7 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary mb-2">
                  <Puzzle className="w-4 h-4" />
                </div>
                <h3 className="text-[13px] font-bold">{addon.name}</h3>
                <p className="text-[12px] text-zinc-400 mt-1 line-clamp-2">{addon.description}</p>
                <div className="text-[15px] font-black mt-2 text-primary">{formatBDT(addon.priceBdt)}</div>
                <div className="text-xs text-zinc-500 mt-1 uppercase tracking-wide font-bold">{addon.value} {addon.type.replace('_', ' ')}</div>
                
                <div className="flex items-center gap-2 mt-3 pt-4 border-t border-surface-hover">
                  <button onClick={() => openAddonForm(addon)} className="flex-1 flex justify-center items-center gap-2 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-xs font-medium">
                    <Edit className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button onClick={() => handleDelete('addons', addon.id)} className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {addons.length === 0 && !loading && (
              <div className="col-span-full py-12 text-center text-zinc-500">No add-ons created yet.</div>
            )}
          </div>
        </div>
      )}

      {isEditing && activeTab === 'addons' && (
        <div className="bg-surface border border-surface-hover rounded-xl p-3 max-w-2xl mx-auto animate-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center mb-3 pb-4 border-b border-surface-hover">
            <h2 className="text-[15px] font-bold">{editingId ? 'Edit Add-on' : 'Create New Add-on'}</h2>
            <button onClick={() => setIsEditing(false)} className="p-2 text-zinc-400 hover:text-zinc-200"><X className="w-4 h-4" /></button>
          </div>
          
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[12px] font-medium mb-1 text-zinc-400">Name (EN)</label>
                <input type="text" value={addonForm.name} onChange={e => setAddonForm({...addonForm, name: e.target.value})} className="w-full bg-background border border-surface-hover rounded-lg px-2.5 py-2 focus:border-secondary focus:outline-none" />
              </div>
              <div>
                <label className="block text-[12px] font-medium mb-1 text-zinc-400">Name (BN)</label>
                <input type="text" value={addonForm.nameBn} onChange={e => setAddonForm({...addonForm, nameBn: e.target.value})} className="w-full bg-background border border-surface-hover rounded-lg px-2.5 py-2 focus:border-secondary focus:outline-none" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[12px] font-medium mb-1 text-zinc-400">Description (EN)</label>
                <textarea rows={2} value={addonForm.description} onChange={e => setAddonForm({...addonForm, description: e.target.value})} className="w-full bg-background border border-surface-hover rounded-lg px-2.5 py-2 focus:border-secondary focus:outline-none" />
              </div>
              <div>
                <label className="block text-[12px] font-medium mb-1 text-zinc-400">Description (BN)</label>
                <textarea rows={2} value={addonForm.descriptionBn} onChange={e => setAddonForm({...addonForm, descriptionBn: e.target.value})} className="w-full bg-background border border-surface-hover rounded-lg px-2.5 py-2 focus:border-secondary focus:outline-none" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[12px] font-medium mb-1 text-zinc-400">Type</label>
                <select value={addonForm.type} onChange={e => setAddonForm({...addonForm, type: e.target.value})} className="w-full bg-background border border-surface-hover rounded-lg px-2.5 py-2 focus:border-secondary focus:outline-none">
                  <option value="ai_tokens">AI Responses</option>
                  <option value="messages">Messages</option>
                  <option value="seats">Team Members</option>
                  <option value="storage">Storage (MB)</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-medium mb-1 text-zinc-400">Quantity Provided</label>
                <input type="number" value={addonForm.value} onChange={e => setAddonForm({...addonForm, value: Number(e.target.value)})} className="w-full bg-background border border-surface-hover rounded-lg px-2.5 py-2 focus:border-secondary focus:outline-none" />
              </div>
              <div>
                <label className="block text-[12px] font-medium mb-1 text-zinc-400">Price (BDT)</label>
                <input type="number" step="1" value={addonForm.priceBdt} onChange={e => setAddonForm({...addonForm, priceBdt: Number(e.target.value)})} className="w-full bg-background border border-surface-hover rounded-lg px-2.5 py-2 focus:border-secondary focus:outline-none" />
              </div>
            </div>

            <div className="mt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={addonForm.isActive} onChange={e => setAddonForm({...addonForm, isActive: e.target.checked})} className="w-4 h-4 rounded border-zinc-700 text-secondary focus:ring-secondary focus:ring-offset-background bg-background" />
                <span className="text-[12px] font-medium">Active Add-on</span>
              </label>
            </div>
          </div>

          <div className="mt-2 flex justify-end gap-3">
            <button onClick={() => setIsEditing(false)} className="px-2.5 py-2 rounded-lg font-medium text-zinc-400 hover:text-zinc-200 transition-colors">Cancel</button>
            <button onClick={handleSaveAddon} className="flex items-center gap-2 px-3 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors font-medium shadow-lg shadow-secondary/20">
              <Save className="w-4 h-4" /> Save Add-on
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
