'use client';

import React, { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { toast } from 'react-hot-toast';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  RefreshCw, 
  Award, 
  Search, 
  Upload, 
  Loader2, 
  AlertCircle,
  Image as ImageIcon
} from 'lucide-react';
import { useLanguage } from '@/components/LanguageProvider';
import AdminLoader from '@/components/AdminLoader';
import AdminPagination from '@/components/AdminPagination';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function ClientBrandsSettingsPage() {
  const { language } = useLanguage();
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState<any>(null);

  // Form fields
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [order, setOrder] = useState('0');
  const [isActive, setIsActive] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    setLoading(true);
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/client-brands/admin`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBrands(data || []);
      } else {
        toast.error('Failed to fetch client brands');
      }
    } catch (err) {
      console.error(err);
      toast.error('API connection error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingBrand(null);
    setName('');
    setLogoUrl('');
    setOrder('0');
    setIsActive(true);
    setShowModal(true);
  };

  const handleOpenEditModal = (brand: any) => {
    setEditingBrand(brand);
    setName(brand.name);
    setLogoUrl(brand.logoUrl || '');
    setOrder(String(brand.order || 0));
    setIsActive(brand.isActive ?? true);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingBrand(null);
    setName('');
    setLogoUrl('');
    setOrder('0');
    setIsActive(true);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const token = Cookies.get('access_token');
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API}/client-brands/admin/upload-logo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        setLogoUrl(data.logoUrl);
        toast.success(language === 'en' ? 'Logo uploaded!' : 'লোগো সফলভাবে আপলোড হয়েছে!');
      } else {
        toast.error('Failed to upload logo image');
      }
    } catch (err) {
      console.error(err);
      toast.error('Upload error');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(language === 'en' ? 'Brand name is required' : 'ব্র্যান্ডের নাম প্রয়োজন');
      return;
    }

    setSubmitting(true);
    try {
      const token = Cookies.get('access_token');
      const payload = {
        name: name.trim(),
        logoUrl: logoUrl.trim() || null,
        order: parseInt(order, 10) || 0,
        isActive
      };

      const url = editingBrand 
        ? `${API}/client-brands/admin/${editingBrand.id}` 
        : `${API}/client-brands/admin`;

      const method = editingBrand ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success(editingBrand 
          ? (language === 'en' ? 'Brand updated successfully!' : 'ব্র্যান্ড তথ্য আপডেট হয়েছে!') 
          : (language === 'en' ? 'Brand added successfully!' : 'নতুন ব্র্যান্ড যুক্ত হয়েছে!'));
        handleCloseModal();
        fetchBrands();
      } else {
        const err = await res.json();
        toast.error(err.message || 'Action failed');
      }
    } catch (err) {
      console.error(err);
      toast.error('API Error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (brand: any) => {
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/client-brands/admin/${brand.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: !brand.isActive })
      });

      if (res.ok) {
        toast.success(brand.isActive 
          ? (language === 'en' ? 'Brand deactivated' : 'ব্র্যান্ড ডিঅ্যাক্টিভ করা হয়েছে') 
          : (language === 'en' ? 'Brand activated' : 'ব্র্যান্ড অ্যাক্টিভ করা হয়েছে'));
        fetchBrands();
      }
    } catch (err) {
      toast.error('Failed to toggle status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(language === 'en' ? 'Are you sure you want to delete this brand?' : 'আপনি কি নিশ্চিত যে এই ব্র্যান্ডটি ডিলিট করতে চান?')) return;

    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/client-brands/admin/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        toast.success(language === 'en' ? 'Brand deleted' : 'ব্র্যান্ড ডিলিট করা হয়েছে');
        fetchBrands();
      }
    } catch (err) {
      toast.error('Failed to delete brand');
    }
  };

  const filteredBrands = brands.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-surface-hover pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Award className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {language === 'en' ? 'Client Logos & Brands' : 'ক্লায়েন্ট লোগো ও ব্র্যান্ডস'}
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 font-medium">
            {language === 'en' 
              ? 'Manage official client logos & brand names displayed in the public homepage marquee.' 
              : 'পাবলিক হোমপেজ স্লাইডিং ব্র্যান্ড মার্কিতে প্রদর্শিত অফিশিয়াল ক্লায়েন্ট লোগো ও নাম পরিচালনা করুন।'}
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={fetchBrands}
            className="p-2 bg-slate-100 dark:bg-surface-hover hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-xl text-slate-600 dark:text-zinc-300 transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleOpenAddModal}
            className="flex-1 sm:flex-initial px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-primary/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {language === 'en' ? 'Add Client Brand' : 'নতুন ব্র্যান্ড যুক্ত করুন'}
          </button>
        </div>
      </div>

      {/* Main Ledger Content */}
      {loading ? (
        <AdminLoader message="Loading client brands ledger..." />
      ) : (
        <div className="space-y-4">
          {/* Controls Bar: Search */}
          <div className="flex items-center justify-between gap-3 bg-white dark:bg-surface border border-slate-200 dark:border-surface-hover p-2.5 rounded-2xl shadow-sm">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
              <input
                type="text"
                placeholder={language === 'en' ? 'Search brand name...' : 'ব্র্যান্ডের নাম দিয়ে খুঁজুন...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-background border border-slate-200 dark:border-surface-hover text-slate-900 dark:text-white rounded-xl pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:border-primary"
              />
            </div>
            <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium px-2 hidden sm:inline">
              Total: {filteredBrands.length} brands
            </span>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-surface border border-slate-200 dark:border-surface-hover rounded-2xl overflow-hidden shadow-sm dark:shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead className="bg-slate-100/90 dark:bg-surface-hover/50 text-slate-700 dark:text-zinc-300 font-semibold border-b border-slate-200 dark:border-surface-hover">
                  <tr>
                    <th className="px-4 py-3">Logo</th>
                    <th className="px-4 py-3">Brand Name</th>
                    <th className="px-4 py-3">Display Order</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Added Date</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-surface-hover/50 text-slate-900 dark:text-zinc-200">
                  {filteredBrands.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500 dark:text-zinc-500">
                        <AlertCircle className="w-7 h-7 mx-auto mb-2 opacity-40" />
                        {language === 'en' ? 'No client brands configured yet.' : 'কোনো ক্লায়েন্ট ব্র্যান্ড যোগ করা হয়নি।'}
                      </td>
                    </tr>
                  ) : (
                    filteredBrands.slice((page - 1) * pageSize, page * pageSize).map((brand) => (
                      <tr key={brand.id} className="hover:bg-slate-50/80 dark:hover:bg-surface-hover/30 transition-colors">
                        <td className="px-4 py-3">
                          {brand.logoUrl ? (
                            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 dark:border-surface-hover p-1 flex items-center justify-center">
                              <img 
                                src={brand.logoUrl.startsWith('http') ? brand.logoUrl : `${API}${brand.logoUrl}`} 
                                alt={brand.name} 
                                className="max-w-full max-h-full object-contain"
                              />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                              {brand.name.charAt(0)}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                          {brand.name}
                        </td>
                        <td className="px-4 py-3 font-mono font-medium text-slate-600 dark:text-zinc-400">
                          #{brand.order || 0}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleToggleActive(brand)}
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                              brand.isActive 
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' 
                                : 'bg-slate-200 dark:bg-zinc-800 text-slate-500 border-slate-300 dark:border-zinc-700'
                            }`}
                          >
                            {brand.isActive ? 'Active' : 'Disabled'}
                          </button>
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-500 dark:text-zinc-500">
                          {new Date(brand.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEditModal(brand)}
                              className="p-1.5 hover:bg-slate-100 dark:hover:bg-surface-hover text-slate-600 dark:text-zinc-400 hover:text-primary rounded-lg transition-colors cursor-pointer"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(brand.id)}
                              className="p-1.5 hover:bg-rose-500/10 text-slate-600 dark:text-zinc-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <AdminPagination
              currentPage={page}
              totalItems={filteredBrands.length}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-surface border border-slate-200 dark:border-surface-hover rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-surface-hover pb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-primary" />
                {editingBrand 
                  ? (language === 'en' ? 'Edit Client Brand' : 'ব্র্যান্ড এডিট করুন') 
                  : (language === 'en' ? 'Add Client Brand' : 'নতুন ব্র্যান্ড যুক্ত করুন')}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Brand Name (ব্র্যান্ডের নাম) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Star Tech / Evaluation BD"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-background border border-slate-200 dark:border-surface-hover rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Brand Logo Image (লোগো ছবি)
                </label>
                <div className="space-y-2">
                  {logoUrl && (
                    <div className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-background rounded-xl border border-slate-200 dark:border-surface-hover">
                      <div className="w-12 h-12 bg-white border rounded-lg p-1 flex items-center justify-center shrink-0">
                        <img 
                          src={logoUrl.startsWith('http') ? logoUrl : `${API}${logoUrl}`} 
                          alt="Logo preview" 
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                      <span className="text-[11px] font-mono text-slate-500 dark:text-zinc-400 truncate flex-1">{logoUrl}</span>
                      <button
                        type="button"
                        onClick={() => setLogoUrl('')}
                        className="text-rose-500 hover:bg-rose-500/10 p-1 rounded transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <label className="flex-1 flex items-center justify-center gap-2 bg-slate-100 dark:bg-surface-hover hover:bg-slate-200 dark:hover:bg-zinc-800 border border-dashed border-slate-300 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-xs text-slate-700 dark:text-zinc-300 font-medium cursor-pointer transition-colors">
                      {uploading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      ) : (
                        <Upload className="w-4 h-4 text-primary" />
                      )}
                      <span>{uploading ? 'Uploading...' : 'Upload Logo Image'}</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleLogoUpload} 
                        className="hidden" 
                        disabled={uploading}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Display Order (ক্রম)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={order}
                    onChange={(e) => setOrder(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-background border border-slate-200 dark:border-surface-hover rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-primary font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Status (অবস্থা)
                  </label>
                  <select
                    value={isActive ? 'true' : 'false'}
                    onChange={(e) => setIsActive(e.target.value === 'true')}
                    className="w-full bg-slate-50 dark:bg-background border border-slate-200 dark:border-surface-hover rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="true">Active (পাবলিক)</option>
                    <option value="false">Disabled (বন্ধ)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-surface-hover">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-surface-hover rounded-xl transition-colors cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={submitting || uploading}
                  className="px-4 py-2 text-xs font-bold text-white bg-primary hover:bg-primary/90 rounded-xl shadow-md shadow-primary/20 flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      সংরক্ষণ হচ্ছে...
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      সংরক্ষণ করুন
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
