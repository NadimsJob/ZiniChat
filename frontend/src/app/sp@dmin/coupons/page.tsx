'use client';

import { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { Gift, Plus, Search, CheckCircle2, XCircle, Building2, Calendar } from 'lucide-react';
import { useLanguage } from '@/components/LanguageProvider';

export default function CouponsPage() {
  const { language } = useLanguage();
  const [coupons, setCoupons] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    discountType: 'percentage',
    discountAmount: '',
    maxUses: '',
    tenantId: '',
    validUntil: '',
  });

  useEffect(() => {
    fetchCoupons();
    fetchTenants();
  }, []);

  const fetchCoupons = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/coupons`, {
        headers: { 'Authorization': `Bearer ${Cookies.get('access_token')}` }
      });
      if (res.ok) setCoupons(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTenants = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/tenants`, {
        headers: { 'Authorization': `Bearer ${Cookies.get('access_token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTenants(Array.isArray(data) ? data : data.tenants || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/coupons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Cookies.get('access_token')}`
        },
        body: JSON.stringify({
          code: formData.code,
          discountType: formData.discountType,
          discountAmount: Number(formData.discountAmount),
          maxUses: formData.maxUses ? Number(formData.maxUses) : null,
          tenantId: formData.tenantId || null,
          validUntil: formData.validUntil ? new Date(formData.validUntil).toISOString() : null,
        })
      });
      if (res.ok) {
        setIsModalOpen(false);
        setFormData({ code: '', discountType: 'percentage', discountAmount: '', maxUses: '', tenantId: '', validUntil: '' });
        fetchCoupons();
      } else {
        const errData = await res.json();
        alert(errData.message || 'Failed to create coupon');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleCouponStatus = async (id: string) => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/coupons/${id}/toggle`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${Cookies.get('access_token')}` }
      });
      fetchCoupons();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="p-8 text-zinc-500">Loading coupons...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Gift className="w-6 h-6 text-primary" />
            {language === 'en' ? 'Discount Coupons' : 'ডিসকাউন্ট কুপন'}
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            {language === 'en' ? 'Manage global and tenant-specific discount codes' : 'গ্লোবাল এবং টেন্যান্ট-নির্দিষ্ট ডিসকাউন্ট কোড পরিচালনা করুন'}
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          {language === 'en' ? 'Create Coupon' : 'কুপন তৈরি করুন'}
        </button>
      </div>

      <div className="bg-surface/70 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-zinc-100/50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 font-medium">
              <tr>
                <th className="px-4 py-3">{language === 'en' ? 'Code' : 'কোড'}</th>
                <th className="px-4 py-3">{language === 'en' ? 'Scope / Tenant' : 'স্কোপ / টেন্যান্ট'}</th>
                <th className="px-4 py-3">{language === 'en' ? 'Discount' : 'ডিসকাউন্ট'}</th>
                <th className="px-4 py-3">{language === 'en' ? 'Uses' : 'ব্যবহার'}</th>
                <th className="px-4 py-3">{language === 'en' ? 'Valid Until' : 'মেয়াদ'}</th>
                <th className="px-4 py-3">{language === 'en' ? 'Status' : 'স্ট্যাটাস'}</th>
                <th className="px-4 py-3 text-right">{language === 'en' ? 'Actions' : 'অ্যাকশন'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {coupons.map((coupon) => (
                <tr key={coupon.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-primary">{coupon.code}</td>
                  <td className="px-4 py-3">
                    {coupon.tenant ? (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium border border-blue-500/20">
                        <Building2 className="w-3 h-3" />
                        {coupon.tenant.businessName || coupon.tenant.brandName || coupon.tenant.ownerName || 'Tenant'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 font-medium">
                        Global (All)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {coupon.discountAmount} {coupon.discountType === 'percentage' ? '%' : 'BDT'}
                  </td>
                  <td className="px-4 py-3">
                    {coupon.usedCount} / {coupon.maxUses || '∞'}
                  </td>
                  <td className="px-4 py-3 text-zinc-500 text-[12px]">
                    {coupon.validUntil ? new Date(coupon.validUntil).toLocaleDateString() : 'Lifetime'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                      coupon.isActive 
                        ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400'
                    }`}>
                      {coupon.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button 
                      onClick={() => toggleCouponStatus(coupon.id)}
                      className="text-primary hover:underline font-medium"
                    >
                      {coupon.isActive ? 'Disable' : 'Enable'}
                    </button>
                  </td>
                </tr>
              ))}
              {coupons.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                    {language === 'en' ? 'No coupons found' : 'কোন কুপন পাওয়া যায়নি'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center sticky top-0 bg-surface z-10">
              <h2 className="text-lg font-bold">{language === 'en' ? 'Create Coupon' : 'কুপন তৈরি করুন'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-foreground">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateCoupon} className="p-6 space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-zinc-500 mb-1">
                  {language === 'en' ? 'Coupon Code' : 'কুপন কোড'}
                </label>
                <input 
                  type="text" 
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                  className="w-full bg-background border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-[13px] focus:border-primary outline-none"
                  placeholder="e.g. SUMMER50"
                  required 
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-zinc-500 mb-1">
                  {language === 'en' ? 'Target Tenant Scope (Optional)' : 'টার্গেট টেন্যান্ট স্কোপ (ঐচ্ছিক)'}
                </label>
                <select
                  value={formData.tenantId}
                  onChange={(e) => setFormData({...formData, tenantId: e.target.value})}
                  className="w-full bg-background border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-[13px] focus:border-primary outline-none"
                >
                  <option value="">{language === 'en' ? 'Global (All Tenants)' : 'গ্লোবাল (সব টেন্যান্ট)'}</option>
                  {tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.businessName || tenant.brandName || tenant.ownerName || 'Tenant'} ({tenant.id.slice(0, 8)})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-zinc-500 mt-1">
                  {language === 'en' 
                    ? 'Leave empty for global code, or restrict coupon usage to a specific tenant.' 
                    : 'গ্লোবাল কোডের জন্য খালি রাখুন, অথবা নির্দিষ্ট টেন্যান্টের জন্য সীমাবদ্ধ করুন।'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-zinc-500 mb-1">
                    {language === 'en' ? 'Type' : 'টাইপ'}
                  </label>
                  <select
                    value={formData.discountType}
                    onChange={(e) => setFormData({...formData, discountType: e.target.value})}
                    className="w-full bg-background border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-[13px] focus:border-primary outline-none"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed (BDT)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-zinc-500 mb-1">
                    {language === 'en' ? 'Amount' : 'পরিমাণ'}
                  </label>
                  <input 
                    type="number" 
                    value={formData.discountAmount}
                    onChange={(e) => setFormData({...formData, discountAmount: e.target.value})}
                    className="w-full bg-background border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-[13px] focus:border-primary outline-none"
                    placeholder="e.g. 50"
                    required 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-zinc-500 mb-1">
                    {language === 'en' ? 'Max Uses (Optional)' : 'সর্বোচ্চ ব্যবহার (ঐচ্ছিক)'}
                  </label>
                  <input 
                    type="number" 
                    value={formData.maxUses}
                    onChange={(e) => setFormData({...formData, maxUses: e.target.value})}
                    className="w-full bg-background border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-[13px] focus:border-primary outline-none"
                    placeholder="e.g. 100"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-zinc-500 mb-1">
                    {language === 'en' ? 'Expiration Date' : 'মেয়াদের তারিখ'}
                  </label>
                  <input 
                    type="date" 
                    value={formData.validUntil}
                    onChange={(e) => setFormData({...formData, validUntil: e.target.value})}
                    className="w-full bg-background border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-[13px] focus:border-primary outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-zinc-200 dark:border-zinc-800">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-[13px] font-medium text-zinc-500 hover:text-foreground">
                  {language === 'en' ? 'Cancel' : 'বাতিল'}
                </button>
                <button type="submit" className="px-4 py-2 text-[13px] font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 shadow-lg shadow-primary/20">
                  {language === 'en' ? 'Create Coupon' : 'কুপন তৈরি করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

