'use client';

import { useState, useEffect, useRef } from 'react';
import Cookies from 'js-cookie';
import { useLanguage } from '@/components/LanguageProvider';
import { ShoppingCart, Plus, Edit2, Trash2, X, Image as ImageIcon, Save, RefreshCw, ChevronLeft } from 'lucide-react';

export default function ProductsPage() {
  const { language } = useLanguage();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState<any>({
    id: '',
    name: '',
    description: '',
    price: '',
    sku: '',
    trackInventory: false,
    stockCount: 0,
    isActive: true,
    attributes: {}
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dynamic attributes builder state
  const [attrKey, setAttrKey] = useState('');
  const [attrValue, setAttrValue] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/products`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setProducts(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openEditor = (product: any = null) => {
    if (product) {
      setFormData({
        id: product.id,
        name: product.name,
        description: product.description || '',
        price: product.price,
        sku: product.sku || '',
        trackInventory: product.trackInventory,
        stockCount: product.stockCount,
        isActive: product.isActive,
        attributes: product.attributes || {}
      });
      setImagePreview(product.imageUrl ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${product.imageUrl}` : null);
    } else {
      setFormData({
        id: '',
        name: '',
        description: '',
        price: '',
        sku: '',
        trackInventory: false,
        stockCount: 0,
        isActive: true,
        attributes: {}
      });
      setImagePreview(null);
    }
    setImageFile(null);
    setAttrKey('');
    setAttrValue('');
    setIsEditing(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (x) => setImagePreview(x.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleAddAttribute = () => {
    if (!attrKey.trim() || !attrValue.trim()) return;
    setFormData((prev: any) => ({
      ...prev,
      attributes: {
        ...prev.attributes,
        [attrKey.trim()]: attrValue.trim()
      }
    }));
    setAttrKey('');
    setAttrValue('');
  };

  const handleRemoveAttribute = (key: string) => {
    setFormData((prev: any) => {
      const newAttr = { ...prev.attributes };
      delete newAttr[key];
      return { ...prev, attributes: newAttr };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = Cookies.get('access_token');
      const method = formData.id ? 'PATCH' : 'POST';
      const url = formData.id 
        ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/products/${formData.id}`
        : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/products`;

      // Save Product Details
      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          price: parseFloat(formData.price),
          sku: formData.sku,
          trackInventory: formData.trackInventory,
          stockCount: parseInt(formData.stockCount),
          isActive: formData.isActive,
          attributes: formData.attributes
        })
      });

      if (!res.ok) throw new Error('Failed to save product');
      const savedProduct = await res.json();

      // Upload Image if selected
      if (imageFile) {
        const imgData = new FormData();
        imgData.append('file', imageFile);
        await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/products/${savedProduct.id}/image`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: imgData
        });
      }

      setIsEditing(false);
      fetchProducts();
    } catch (err) {
      console.error(err);
      alert('Error saving product');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(language === 'en' ? 'Are you sure you want to delete this product?' : 'আপনি কি নিশ্চিত যে এই প্রডাক্টটি ডিলিট করবেন?')) return;
    try {
      const token = Cookies.get('access_token');
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (formData.id === id) setIsEditing(false);
      fetchProducts();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex h-[calc(100vh-130px)] bg-white/70 dark:bg-[#0f0f11]/80 backdrop-blur-xl border border-white/50 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] relative text-[13px]">
      
      {/* Left Pane: Product List */}
      <div className={`w-full ${isEditing ? 'hidden md:flex md:w-1/2 lg:w-[45%]' : 'flex'} flex-col border-r border-slate-200/60 dark:border-zinc-800 bg-slate-50/50 dark:bg-[#09090b]/50 shrink-0`}>
        <div className="p-1.5 border-b border-surface-hover shrink-0 flex items-center justify-between bg-background z-10">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <ShoppingCart className="w-6 h-6 text-primary" />
              {language === 'en' ? 'Products' : 'প্রডাক্টস'}
            </h1>
            <p className="text-[11px] text-zinc-500 mt-1">
              {products.length} {language === 'en' ? 'items found' : 'টি প্রডাক্ট আছে'}
            </p>
          </div>
          <button 
            onClick={() => openEditor()}
            className="bg-primary text-primary-foreground px-1.5 py-2 text-[13px] rounded-xl flex items-center gap-2 font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{language === 'en' ? 'Add' : 'নতুন'}</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-1.5 md:p-1.5 bg-zinc-50/50 dark:bg-zinc-900/20">
          {loading ? (
            <div className="flex justify-center p-6 text-zinc-400">
              <RefreshCw className="w-6 h-6 animate-spin" />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center p-4 text-zinc-500 flex flex-col items-center">
              <ShoppingCart className="w-9 h-9 mb-3 opacity-20" />
              <p>{language === 'en' ? 'No products found. Add one to get started!' : 'কোনো প্রডাক্ট পাওয়া যায়নি।'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {products.map(product => (
                <div 
                  key={product.id} 
                  onClick={() => openEditor(product)}
                  className={`bg-white dark:bg-[#18181b] border rounded-2xl overflow-hidden hover:shadow-md transition-all cursor-pointer group flex flex-col ${
                    formData.id === product.id && isEditing ? 'border-primary ring-1 ring-primary/20' : 'border-surface-hover'
                  }`}
                >
                  <div className="aspect-[4/3] bg-zinc-100 dark:bg-zinc-800 relative shrink-0">
                    {product.imageUrl ? (
                      <img src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${product.imageUrl}`} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400">
                        <ImageIcon className="w-8 h-8 mb-1 opacity-50" />
                      </div>
                    )}
                    <button 
                      onClick={(e) => handleDelete(product.id, e)} 
                      className="absolute top-2 right-2 p-1.5 bg-white/90 dark:bg-zinc-900/90 text-red-600 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 transition-all shadow-sm"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    {!product.isActive && (
                      <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-zinc-900/80 text-white text-[9px] font-bold rounded backdrop-blur">
                        INACTIVE
                      </div>
                    )}
                  </div>
                  <div className="p-1.5 flex-1 flex flex-col">
                    <h3 className="font-bold text-[13px] text-zinc-900 dark:text-zinc-100 line-clamp-1 mb-1">{product.name}</h3>
                    <div className="font-bold text-primary text-[13px] mb-2">
                      {product.currency} {parseFloat(product.price).toLocaleString()}
                    </div>
                    {product.trackInventory && (
                      <div className="mt-auto text-[10px] text-zinc-500 flex justify-between">
                        <span>Stock:</span>
                        <span className={`font-bold ${product.stockCount > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {product.stockCount}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Pane: Editor */}
      <div className={`w-full ${!isEditing ? 'hidden md:flex items-center justify-center' : 'flex'} flex-col bg-background relative md:w-1/2 lg:w-[55%] h-full`}>
        
        {!isEditing ? (
          <div className="text-center text-zinc-500 flex flex-col items-center p-4">
            <div className="w-16 h-16 bg-surface border border-surface-hover rounded-full flex items-center justify-center mb-3 shadow-sm">
              <ShoppingCart className="w-8 h-8 text-zinc-400" />
            </div>
            <h3 className="text-[13px] font-bold text-zinc-700 dark:text-zinc-300 mb-2">
              {language === 'en' ? 'Select a product' : 'একটি প্রডাক্ট সিলেক্ট করুন'}
            </h3>
            <p className="text-[13px] max-w-xs">
              {language === 'en' ? 'Click on a product from the list to view or edit its details.' : 'বিস্তারিত দেখতে বা এডিট করতে লিস্ট থেকে একটি প্রডাক্টে ক্লিক করুন।'}
            </p>
          </div>
        ) : (
          <>
            <div className="h-14 px-1.5 border-b border-surface-hover flex items-center justify-between bg-surface shrink-0 sticky top-0 z-10 shadow-sm">
              <div className="flex items-center gap-2">
                <button onClick={() => setIsEditing(false)} className="md:hidden p-2 -ml-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h2 className="font-bold text-zinc-800 dark:text-zinc-200">
                  {formData.id ? (language === 'en' ? 'Edit Product' : 'প্রডাক্ট এডিট') : (language === 'en' ? 'Add Product' : 'নতুন প্রডাক্ট')}
                </h2>
              </div>
              <button onClick={() => setIsEditing(false)} className="p-1.5 hover:bg-surface-hover rounded-lg transition-colors text-zinc-500 hidden md:block">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-1.5 md:p-1.5 pb-32">
              <form id="productForm" onSubmit={handleSubmit} className="space-y-3 max-w-2xl mx-auto">
                
                {/* Image Upload */}
                <div className="bg-surface p-1.5 border border-primary/10 shadow-xl shadow-primary/5 hover:border-primary/20 hover:shadow-primary/10 transition-all rounded-2xl">
                  <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-3">
                    {language === 'en' ? 'Product Image' : 'প্রডাক্ট ছবি'}
                  </label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="h-24 bg-background border-2 border-dashed border-surface-hover hover:border-primary/50 transition-colors rounded-xl flex flex-col items-center justify-center cursor-pointer relative overflow-hidden group"
                  >
                    {imagePreview ? (
                      <>
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-contain bg-zinc-900" />
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white font-medium text-[13px] backdrop-blur-sm">
                          Change Image
                        </div>
                      </>
                    ) : (
                      <div className="text-center text-zinc-400 group-hover:text-primary transition-colors flex flex-col items-center">
                        <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                        <span className="text-[11px] font-bold uppercase tracking-wider">Click to upload</span>
                      </div>
                    )}
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
                </div>

                {/* Basic Info */}
                <div className="bg-surface p-1.5 border border-primary/10 shadow-xl shadow-primary/5 hover:border-primary/20 hover:shadow-primary/10 transition-all rounded-2xl space-y-4">
                  <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
                    {language === 'en' ? 'Basic Info' : 'প্রাথমিক তথ্য'}
                  </label>
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-500 mb-1">Name / Title *</label>
                    <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-background border border-surface-hover rounded-lg px-1.5 py-2 text-[13px] focus:border-primary focus:outline-none transition-colors" placeholder="e.g. Premium Cotton T-Shirt" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-1.5">
                    <div>
                      <label className="block text-[11px] font-medium text-zinc-500 mb-1">Price *</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-[13px]">৳</span>
                        <input type="number" step="0.01" required value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full bg-background border border-surface-hover rounded-lg pl-7 pr-3 py-2 text-[13px] focus:border-primary focus:outline-none transition-colors" placeholder="0.00" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-zinc-500 mb-1">SKU (Optional)</label>
                      <input type="text" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="w-full bg-background border border-surface-hover rounded-lg px-1.5 py-2 text-[13px] focus:border-primary focus:outline-none transition-colors" placeholder="e.g. SHIRT-001" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-500 mb-1">Description</label>
                    <textarea rows={4} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-background border border-surface-hover rounded-lg px-1.5 py-2 text-[13px] focus:border-primary focus:outline-none resize-none custom-scrollbar transition-colors" placeholder="Write a short description..." />
                  </div>
                  
                  <label className="flex items-center gap-1.5 p-1.5 bg-background border border-surface-hover rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                    <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} className="w-3.5 h-3.5 text-primary rounded border-zinc-600 focus:ring-primary focus:ring-offset-0 bg-background" />
                    <span className="text-[13px] font-medium">{language === 'en' ? 'Product is Active' : 'প্রডাক্ট অ্যাক্টিভ (Customers can see this)'}</span>
                  </label>
                </div>

                {/* Inventory Tracking */}
                <div className="bg-surface p-1.5 border border-primary/10 shadow-xl shadow-primary/5 hover:border-primary/20 hover:shadow-primary/10 transition-all rounded-2xl">
                  <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-3">
                    {language === 'en' ? 'Inventory' : 'ইনভেন্টরি'}
                  </label>
                  <div className="flex flex-col gap-1.5">
                    <label className="flex items-center gap-1.5 p-1.5 bg-background border border-surface-hover rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                      <input type="checkbox" checked={formData.trackInventory} onChange={e => setFormData({...formData, trackInventory: e.target.checked})} className="w-3.5 h-3.5 text-primary rounded border-zinc-600 focus:ring-primary focus:ring-offset-0 bg-background" />
                      <div>
                        <div className="text-[13px] font-medium">{language === 'en' ? 'Track Stock' : 'স্টক ট্র্যাক করুন'}</div>
                        <div className="text-[10px] text-zinc-500">Automatically reduce stock on sale</div>
                      </div>
                    </label>
                    {formData.trackInventory && (
                      <div className="animate-in slide-in-from-top-2 fade-in duration-200">
                        <label className="block text-[11px] font-medium text-zinc-500 mb-1">Available Stock Count</label>
                        <input type="number" value={formData.stockCount} onChange={e => setFormData({...formData, stockCount: e.target.value})} className="w-full md:w-1/2 bg-background border border-surface-hover rounded-lg px-1.5 py-2 text-[13px] focus:border-primary focus:outline-none transition-colors" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Custom Attributes */}
                <div className="bg-surface p-1.5 border border-primary/10 shadow-xl shadow-primary/5 hover:border-primary/20 hover:shadow-primary/10 transition-all rounded-2xl">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                      {language === 'en' ? 'Custom Properties' : 'কাস্টম প্রপার্টি'}
                    </label>
                    <span className="px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-bold rounded-full uppercase tracking-widest">Dynamic</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mb-3">
                    Add flexible fields based on your industry. E.g. <b>Size: XL</b>, <b>Area: 1200 sqft</b>.
                  </p>
                  
                  <div className="flex items-center gap-2 mb-4">
                    <input type="text" placeholder="Key (e.g. Size)" value={attrKey} onChange={e => setAttrKey(e.target.value)} className="w-1/3 bg-background border border-surface-hover rounded-lg px-1.5 py-2 text-[13px] focus:border-primary focus:outline-none transition-colors" />
                    <input type="text" placeholder="Value (e.g. XL)" value={attrValue} onChange={e => setAttrValue(e.target.value)} className="flex-1 bg-background border border-surface-hover rounded-lg px-1.5 py-2 text-[13px] focus:border-primary focus:outline-none transition-colors" onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddAttribute())} />
                    <button type="button" onClick={handleAddAttribute} className="p-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors shrink-0">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {Object.keys(formData.attributes || {}).length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {Object.entries(formData.attributes).map(([k, v]: any) => (
                        <div key={k} className="flex items-center justify-between p-2.5 bg-background border border-surface-hover rounded-lg text-[13px] group">
                          <div className="truncate pr-2">
                            <span className="text-zinc-500">{k}:</span> <span className="font-bold text-zinc-800 dark:text-zinc-200">{v}</span>
                          </div>
                          <button type="button" onClick={() => handleRemoveAttribute(k)} className="text-zinc-400 hover:text-red-500 p-1 rounded transition-colors opacity-0 group-hover:opacity-100">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </form>
            </div>

            {/* Sticky Bottom Actions */}
            <div className="absolute bottom-0 left-0 right-0 p-1.5 border-t border-surface-hover bg-surface/80 backdrop-blur-md flex justify-end gap-1.5 z-20">
              <button type="button" onClick={() => setIsEditing(false)} className="px-5 py-2 rounded-xl text-[13px] font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors">
                {language === 'en' ? 'Cancel' : 'বাতিল'}
              </button>
              <button type="submit" form="productForm" disabled={saving} className="bg-primary text-primary-foreground px-5 py-2 rounded-xl text-[13px] font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 flex items-center gap-2 disabled:opacity-50">
                {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {language === 'en' ? 'Save Changes' : 'সেভ করুন'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
