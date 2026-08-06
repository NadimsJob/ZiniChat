'use client';

import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { Loader2, Plus, Edit, Trash2, Save, X, ShoppingCart, Building2, Hotel, Cpu, Briefcase, Stethoscope, GraduationCap, Factory, Truck } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function BusinessNaturePage() {
  const [natures, setNatures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({ name: '', nameBn: '', isActive: true, isPropertyMode: false, isHospitalityMode: false, isTechSoftwareMode: false, isFinancialServiceMode: false, isHealthcareMode: false, isEducationMode: false, isManufacturingMode: false, isLogisticsMode: false });
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchNatures();
  }, []);

  const fetchNatures = async () => {
    try {
      const res = await fetch(`${API}/business-natures`);
      if (res.ok) setNatures(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    const token = Cookies.get('access_token');
    const method = editingId ? 'PATCH' : 'POST';
    const url = editingId ? `${API}/business-natures/${editingId}` : `${API}/business-natures`;

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        await fetchNatures();
        setIsAdding(false);
        setEditingId(null);
        setFormData({ name: '', nameBn: '', isActive: true, isPropertyMode: false, isHospitalityMode: false, isTechSoftwareMode: false, isFinancialServiceMode: false, isHealthcareMode: false, isEducationMode: false, isManufacturingMode: false, isLogisticsMode: false });
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to save');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this?')) return;
    const token = Cookies.get('access_token');
    try {
      const res = await fetch(`${API}/business-natures/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchNatures();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const startEdit = (nature: any) => {
    setEditingId(nature.id);
    setIsAdding(true);
    setFormData({
      name: nature.name,
      nameBn: nature.nameBn || '',
      isActive: nature.isActive,
      isPropertyMode: nature.isPropertyMode || false,
      isHospitalityMode: nature.isHospitalityMode || false,
      isTechSoftwareMode: nature.isTechSoftwareMode || false,
      isFinancialServiceMode: nature.isFinancialServiceMode || false,
      isHealthcareMode: nature.isHealthcareMode || false,
      isEducationMode: nature.isEducationMode || false,
      isManufacturingMode: nature.isManufacturingMode || false,
      isLogisticsMode: nature.isLogisticsMode || false,
    });
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Business Nature</h1>
          <p className="text-slate-500 text-sm mt-1">Manage the master list of business categories for tenant onboarding.</p>
        </div>
        {!isAdding && (
          <button 
            onClick={() => {
              setIsAdding(true);
              setEditingId(null);
              setFormData({ name: '', nameBn: '', isActive: true, isPropertyMode: false, isHospitalityMode: false, isTechSoftwareMode: false, isFinancialServiceMode: false, isHealthcareMode: false, isEducationMode: false, isManufacturingMode: false, isLogisticsMode: false });
            }}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
          >
            <Plus className="w-4 h-4" />
            Add New
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-200">
          {error}
        </div>
      )}

      {isAdding && (
        <div className="bg-white dark:bg-[#121214] p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm space-y-4 animate-in slide-in-from-top-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-zinc-300">Name (English)</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20"
                placeholder="e.g. Real Estate"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-zinc-300">Name (Bengali)</label>
              <input
                type="text"
                value={formData.nameBn}
                onChange={e => setFormData({ ...formData, nameBn: e.target.value })}
                className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20"
                placeholder="e.g. রিয়েল এস্টেট"
              />
            </div>
            <div className="md:col-span-2 flex flex-col gap-3">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-slate-300 text-primary focus:ring-primary"
                  id="isActive"
                />
                <span className="text-sm font-medium text-slate-700 dark:text-zinc-300">Active (Visible in dropdown)</span>
              </label>

              {/* Property Listing Mode checkbox */}
              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/50 cursor-pointer hover:border-primary/50 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.isPropertyMode}
                  onChange={e => setFormData({ ...formData, isPropertyMode: e.target.checked })}
                  className="rounded border-slate-300 text-primary focus:ring-primary mt-0.5"
                  id="isPropertyMode"
                />
                <div>
                  <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
                    <Building2 className="w-4 h-4 text-primary" />
                    Property Listing Mode
                  </div>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    Enables property gallery, area/bedroom fields, and inquiry-based AI flow (no orders).
                  </p>
                </div>
              </label>

              {/* Hospitality & Hotel Mode checkbox */}
              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/50 cursor-pointer hover:border-amber-500/50 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.isHospitalityMode}
                  onChange={e => setFormData({ ...formData, isHospitalityMode: e.target.checked })}
                  className="rounded border-slate-300 text-amber-500 focus:ring-amber-500 mt-0.5"
                  id="isHospitalityMode"
                />
                <div>
                  <div className="flex items-center gap-1.5 text-sm font-medium text-amber-600 dark:text-amber-400">
                    <Hotel className="w-4 h-4 text-amber-500" />
                    Hospitality & Hotel Booking Mode
                  </div>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    Enables room gallery, capacity/amenities fields, nightly rates, and room reservation AI flow (no orders).
                  </p>
                </div>
              </label>

              {/* Technology & Software Mode checkbox */}
              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/50 cursor-pointer hover:border-indigo-500/50 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.isTechSoftwareMode}
                  onChange={e => setFormData({ ...formData, isTechSoftwareMode: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-500 focus:ring-indigo-500 mt-0.5"
                  id="isTechSoftwareMode"
                />
                <div>
                  <div className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400">
                    <Cpu className="w-4 h-4 text-indigo-500" />
                    Technology & Software Mode
                  </div>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    Enables software plans, pricing tiers, feature lists, live demo link, and demo request AI flow (no orders).
                  </p>
                </div>
              </label>

              {/* Financial & Consulting Mode checkbox */}
              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/50 cursor-pointer hover:border-emerald-500/50 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.isFinancialServiceMode}
                  onChange={e => setFormData({ ...formData, isFinancialServiceMode: e.target.checked })}
                  className="rounded border-slate-300 text-emerald-500 focus:ring-emerald-500 mt-0.5"
                  id="isFinancialServiceMode"
                />
                <div>
                  <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    <Briefcase className="w-4 h-4 text-emerald-500" />
                    Financial & Consulting Mode
                  </div>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    Enables service packages, consultation fees, scope of work, document checklists, and consultation AI flow (no orders).
                  </p>
                </div>
              </label>

              {/* Healthcare & Clinic Mode checkbox */}
              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/50 cursor-pointer hover:border-teal-500/50 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.isHealthcareMode}
                  onChange={e => setFormData({ ...formData, isHealthcareMode: e.target.checked })}
                  className="rounded border-slate-300 text-teal-500 focus:ring-teal-500 mt-0.5"
                  id="isHealthcareMode"
                />
                <div>
                  <div className="flex items-center gap-1.5 text-sm font-medium text-teal-600 dark:text-teal-400">
                    <Stethoscope className="w-4 h-4 text-teal-500" />
                    Healthcare & Clinic Mode
                  </div>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    Enables doctor profiles, visiting hours, specializations, consultation fees, and appointment booking AI flow (no orders).
                  </p>
                </div>
              </label>

              {/* Education & Course Mode checkbox */}
              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/50 cursor-pointer hover:border-purple-500/50 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.isEducationMode}
                  onChange={e => setFormData({ ...formData, isEducationMode: e.target.checked })}
                  className="rounded border-slate-300 text-purple-500 focus:ring-purple-500 mt-0.5"
                  id="isEducationMode"
                />
                <div>
                  <div className="flex items-center gap-1.5 text-sm font-medium text-purple-600 dark:text-purple-400">
                    <GraduationCap className="w-4 h-4 text-purple-500" />
                    Education & Course Mode
                  </div>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    Enables courses, batch schedules, fees, syllabus overview, and admission inquiry AI flow (no orders).
                  </p>
                </div>
              </label>

              {/* Manufacturing & Industrial Mode checkbox */}
              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/50 cursor-pointer hover:border-amber-500/50 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.isManufacturingMode}
                  onChange={e => setFormData({ ...formData, isManufacturingMode: e.target.checked })}
                  className="rounded border-slate-300 text-amber-500 focus:ring-amber-500 mt-0.5"
                  id="isManufacturingMode"
                />
                <div>
                  <div className="flex items-center gap-1.5 text-sm font-medium text-amber-600 dark:text-amber-400">
                    <Factory className="w-4 h-4 text-amber-500" />
                    Manufacturing & Industrial Mode
                  </div>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    Enables wholesale products, MOQ limits, spec sheets, tiered bulk pricing, and RFQ quote request AI flow (no orders).
                  </p>
                </div>
              </label>

              {/* Truck Shipping & Logistics Mode checkbox */}
              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/50 cursor-pointer hover:border-sky-500/50 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.isLogisticsMode}
                  onChange={e => setFormData({ ...formData, isLogisticsMode: e.target.checked })}
                  className="rounded border-slate-300 text-sky-500 focus:ring-sky-500 mt-0.5"
                  id="isLogisticsMode"
                />
                <div>
                  <div className="flex items-center gap-1.5 text-sm font-medium text-sky-600 dark:text-sky-400">
                    <Truck className="w-4 h-4 text-sky-500" />
                    Truck Shipping & Logistics Mode
                  </div>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    Enables freight routes, vehicle capacity (Tons/CBM), freight rates, tracking info, and shipment quote AI flow (no orders).
                  </p>
                </div>
              </label>
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button 
              onClick={() => setIsAdding(false)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" /> Cancel
            </button>
            <button 
              onClick={handleSave}
              disabled={saving || !formData.name}
              className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-[#121214] rounded-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-zinc-800/50 border-b border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3 font-medium">Name (EN)</th>
              <th className="px-4 py-3 font-medium">Name (BN)</th>
              <th className="px-4 py-3 font-medium">Mode</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/50">
            {natures.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">No records found.</td>
              </tr>
            ) : (
              natures.map((nature) => (
                <tr key={nature.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{nature.name}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-zinc-300">{nature.nameBn || '-'}</td>
                  <td className="px-4 py-3">
                    {nature.isPropertyMode ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-medium border border-blue-200 dark:border-blue-500/20">
                        <Building2 className="w-3 h-3" /> Property
                      </span>
                    ) : nature.isHospitalityMode ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-medium border border-amber-200 dark:border-amber-500/20">
                        <Hotel className="w-3 h-3" /> Room Booking
                      </span>
                    ) : nature.isTechSoftwareMode ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-medium border border-indigo-200 dark:border-indigo-500/20">
                        <Cpu className="w-3 h-3" /> Software & Tech
                      </span>
                    ) : nature.isFinancialServiceMode ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium border border-emerald-200 dark:border-emerald-500/20">
                        <Briefcase className="w-3 h-3" /> Financial & Consulting
                      </span>
                    ) : nature.isHealthcareMode ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 text-xs font-medium border border-teal-200 dark:border-teal-500/20">
                        <Stethoscope className="w-3 h-3" /> Healthcare & Clinic
                      </span>
                    ) : nature.isEducationMode ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-medium border border-purple-200 dark:border-purple-500/20">
                        <GraduationCap className="w-3 h-3" /> Education & Course
                      </span>
                    ) : nature.isManufacturingMode ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-medium border border-amber-200 dark:border-amber-500/20">
                        <Factory className="w-3 h-3" /> Factory & B2B Wholesale
                      </span>
                    ) : nature.isLogisticsMode ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 text-xs font-medium border border-sky-200 dark:border-sky-500/20">
                        <Truck className="w-3 h-3" /> Shipping & Logistics
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs font-medium border border-orange-200 dark:border-orange-500/20">
                        <ShoppingCart className="w-3 h-3" /> Products
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {nature.isActive ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium border border-emerald-200 dark:border-emerald-500/20">Active</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 text-xs font-medium border border-slate-200 dark:border-zinc-700">Inactive</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => startEdit(nature)}
                        className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(nature.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
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
  );
}
