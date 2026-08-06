'use client';

import { useState, useEffect, useRef } from 'react';
import Cookies from 'js-cookie';
import { useLanguage } from '@/components/LanguageProvider';
import {
  ShoppingCart, Building2, Hotel, Plus, Edit2, Trash2, X, Image as ImageIcon,
  Save, RefreshCw, ChevronLeft, ChevronRight, MapPin, Home, BedDouble,
  Bath, Layers, Compass, Sofa, Users, Wifi, Tv, Coffee, Sparkles
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const LISTING_TYPES = [
  { value: 'sale', labelEn: 'For Sale', labelBn: 'বিক্রয়' },
  { value: 'rent', labelEn: 'For Rent', labelBn: 'ভাড়া' },
  { value: 'lease', labelEn: 'Lease', labelBn: 'লিজ' },
];

const PROPERTY_STATUS = [
  { value: 'available', labelEn: 'Available', labelBn: 'উপলব্ধ' },
  { value: 'sold', labelEn: 'Sold', labelBn: 'বিক্রিত' },
  { value: 'rented', labelEn: 'Rented', labelBn: 'ভাড়া দেওয়া' },
];

function emptyForm(isPropertyMode: boolean) {
  return {
    id: '',
    name: '',
    description: '',
    price: '',
    sku: '',
    trackInventory: false,
    stockCount: 0,
    isActive: true,
    attributes: {} as Record<string, string>,
    // Property fields
    listingType: 'rent',
    location: '',
    propertyStatus: 'available',
  };
}

export default function ProductsPage() {
  const { language } = useLanguage();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isPropertyMode, setIsPropertyMode] = useState(false);
  const [isHospitalityMode, setIsHospitalityMode] = useState(false);

  const [formData, setFormData] = useState<any>(emptyForm(false));
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Gallery state (property mode)
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [gallerySlide, setGallerySlide] = useState(0);

  // Dynamic attributes builder
  const [attrKey, setAttrKey] = useState('');
  const [attrValue, setAttrValue] = useState('');

  useEffect(() => {
    fetchModeAndProducts();
  }, []);

  const fetchModeAndProducts = async () => {
    try {
      const token = Cookies.get('access_token');
      const [meRes, bnRes, prodRes] = await Promise.all([
        fetch(`${API}/auth/me`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API}/business-natures`),
        fetch(`${API}/products`, { headers: { 'Authorization': `Bearer ${token}` } }),
      ]);

      if (bnRes.ok && meRes.ok) {
        const meData = await meRes.json();
        const natures: any[] = await bnRes.json();
        const tenantNature = meData?.tenant?.businessNature || '';
        const matchedNature = natures.find((n: any) => n.name === tenantNature);
        setIsPropertyMode(matchedNature?.isPropertyMode ?? false);
        setIsHospitalityMode(matchedNature?.isHospitalityMode ?? false);
      }

      if (prodRes.ok) {
        setProducts(await prodRes.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/products`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setProducts(await res.json());
    } catch (err) {
      console.error(err);
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
        attributes: product.attributes || {},
        listingType: product.listingType || 'rent',
        location: product.location || '',
        propertyStatus: (product.attributes as any)?.propertyStatus || 'available',
      });
      setImagePreview(product.imageUrl ? `${API}${product.imageUrl}` : null);
      const imgs: string[] = Array.isArray(product.images) ? product.images : [];
      setGalleryImages(imgs);
      setGallerySlide(0);
    } else {
      setFormData(emptyForm(isPropertyMode));
      setImagePreview(null);
      setGalleryImages([]);
      setGallerySlide(0);
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
      attributes: { ...prev.attributes, [attrKey.trim()]: attrValue.trim() }
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
      const url = formData.id ? `${API}/products/${formData.id}` : `${API}/products`;

      // For property mode, store propertyStatus in attributes
      const attributesWithStatus = isPropertyMode
        ? { ...formData.attributes, propertyStatus: formData.propertyStatus }
        : formData.attributes;

      const body: any = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        attributes: attributesWithStatus,
        isActive: formData.isActive,
      };

      if (isPropertyMode) {
        body.listingType = formData.listingType;
        body.location = formData.location;
      } else {
        body.sku = formData.sku;
        body.trackInventory = formData.trackInventory;
        body.stockCount = parseInt(formData.stockCount);
      }

      const res = await fetch(url, {
        method,
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) throw new Error('Failed to save');
      const savedProduct = await res.json();

      // Upload main image if selected (both modes)
      if (imageFile) {
        const imgData = new FormData();
        imgData.append('file', imageFile);
        await fetch(`${API}/products/${savedProduct.id}/image`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: imgData
        });
      }

      setIsEditing(false);
      fetchProducts();
    } catch (err) {
      console.error(err);
      alert('Error saving');
    } finally {
      setSaving(false);
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!formData.id || !e.target.files?.length) return;
    const file = e.target.files[0];
    const token = Cookies.get('access_token');
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`${API}/products/${formData.id}/gallery`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: fd
    });
    if (res.ok) {
      const updated = await res.json();
      const imgs: string[] = Array.isArray(updated.images) ? updated.images : [];
      setGalleryImages(imgs);
      setGallerySlide(imgs.length - 1);
      fetchProducts();
    }
  };

  const handleGalleryRemove = async (index: number) => {
    if (!formData.id) return;
    const token = Cookies.get('access_token');
    const res = await fetch(`${API}/products/${formData.id}/gallery/${index}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const updated = await res.json();
      const imgs: string[] = Array.isArray(updated.images) ? updated.images : [];
      setGalleryImages(imgs);
      setGallerySlide(Math.max(0, gallerySlide - 1));
      fetchProducts();
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const msg = isPropertyMode
      ? (language === 'en' ? 'Delete this property?' : 'এই প্রপার্টি মুছবেন?')
      : (language === 'en' ? 'Delete this product?' : 'এই প্রডাক্ট মুছবেন?');
    if (!confirm(msg)) return;
    try {
      const token = Cookies.get('access_token');
      await fetch(`${API}/products/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      if (formData.id === id) setIsEditing(false);
      fetchProducts();
    } catch (err) {
      console.error(err);
    }
  };

  const getListingBadge = (type: string) => {
    if (type === 'sale') return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    if (type === 'rent') return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
  };

  const getStatusColor = (status: string) => {
    if (status === 'available') return 'text-emerald-400';
    if (status === 'rented') return 'text-orange-400';
    return 'text-red-400';
  };

  const pageTitle = isPropertyMode
    ? (language === 'en' ? 'Properties' : 'প্রপার্টি')
    : isHospitalityMode
    ? (language === 'en' ? 'Rooms & Suites' : 'রুম ও স্যুট')
    : (language === 'en' ? 'Products' : 'প্রডাক্টস');

  const addBtnLabel = isPropertyMode || isHospitalityMode
    ? (language === 'en' ? 'Add' : 'নতুন')
    : (language === 'en' ? 'Add' : 'নতুন');

  const editTitle = isPropertyMode
    ? (formData.id ? (language === 'en' ? 'Edit Property' : 'প্রপার্টি এডিট') : (language === 'en' ? 'Add Property' : 'নতুন প্রপার্টি'))
    : isHospitalityMode
    ? (formData.id ? (language === 'en' ? 'Edit Room' : 'রুম এডিট') : (language === 'en' ? 'Add Room/Suite' : 'নতুন রুম যোগ'))
    : (formData.id ? (language === 'en' ? 'Edit Product' : 'প্রডাক্ট এডিট') : (language === 'en' ? 'Add Product' : 'নতুন প্রডাক্ট'));

  return (
    <div className="flex h-[calc(100vh-130px)] bg-surface/70 backdrop-blur-xl border border-border rounded-2xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)] relative text-[13px]">

      {/* Left Pane: List */}
      <div className={`w-full ${isEditing ? 'hidden md:flex md:w-1/2 lg:w-[45%]' : 'flex'} flex-col border-r border-border bg-muted/20 shrink-0`}>
        <div className="p-1.5 border-b border-border shrink-0 flex items-center justify-between bg-background z-10">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              {isPropertyMode ? <Building2 className="w-6 h-6 text-primary" /> : isHospitalityMode ? <Hotel className="w-6 h-6 text-amber-500" /> : <ShoppingCart className="w-6 h-6 text-primary" />}
              {pageTitle}
            </h1>
            <p className="text-[11px] text-muted-foreground mt-1">
              {products.length} {isPropertyMode ? (language === 'en' ? 'listings' : 'টি লিস্টিং') : isHospitalityMode ? (language === 'en' ? 'rooms & suites' : 'টি রুম আছে') : (language === 'en' ? 'items found' : 'টি প্রডাক্ট আছে')}
            </p>
          </div>
          <button
            onClick={() => openEditor()}
            className="bg-primary text-primary-foreground px-1.5 py-2 text-[13px] rounded-xl flex items-center gap-2 font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{addBtnLabel}</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-1.5 bg-muted/10">
          {loading ? (
            <div className="flex justify-center p-6 text-muted-foreground">
              <RefreshCw className="w-6 h-6 animate-spin" />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center p-4 text-muted-foreground flex flex-col items-center">
              {isPropertyMode ? <Building2 className="w-9 h-9 mb-3 opacity-20" /> : isHospitalityMode ? <Hotel className="w-9 h-9 mb-3 text-amber-500 opacity-30" /> : <ShoppingCart className="w-9 h-9 mb-3 opacity-20" />}
              <p>{isPropertyMode ? (language === 'en' ? 'No properties yet. Add one!' : 'কোনো প্রপার্টি নেই।') : isHospitalityMode ? (language === 'en' ? 'No rooms or suites added yet.' : 'কোনো রুম বা স্যুট যোগ করা হয়নি।') : (language === 'en' ? 'No products found.' : 'কোনো প্রডাক্ট নেই।')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {products.map(product => {
                const imgs: string[] = Array.isArray(product.images) ? product.images : [];
                const attrs = (product.attributes as any) || {};
                const propertyStatus = attrs.propertyStatus || 'available';

                return (
                  <div
                    key={product.id}
                    onClick={() => openEditor(product)}
                    className={`bg-card border rounded-2xl overflow-hidden hover:shadow-md transition-all cursor-pointer group flex flex-col ${formData.id === product.id && isEditing ? 'border-primary ring-1 ring-primary/20' : 'border-border'}`}
                  >
                    {/* Image / Gallery */}
                    <div className="aspect-[4/3] bg-muted relative shrink-0">
                      {(isPropertyMode || isHospitalityMode) && imgs.length > 0 ? (
                        <img src={`${API}${imgs[0]}`} alt={product.name} className="w-full h-full object-cover" />
                      ) : product.imageUrl ? (
                        <img src={`${API}${product.imageUrl}`} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                          {isPropertyMode ? <Building2 className="w-8 h-8 mb-1 opacity-30" /> : isHospitalityMode ? <Hotel className="w-8 h-8 mb-1 text-amber-500 opacity-40" /> : <ImageIcon className="w-8 h-8 mb-1 opacity-50" />}
                        </div>
                      )}
                      <button
                        onClick={(e) => handleDelete(product.id, e)}
                        className="absolute top-2 right-2 p-1.5 bg-background/90 text-red-500 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/10 transition-all shadow-sm"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      {isPropertyMode && product.listingType && (
                        <div className={`absolute top-2 left-2 px-2 py-0.5 text-[9px] font-bold rounded border backdrop-blur ${getListingBadge(product.listingType)}`}>
                          {product.listingType.toUpperCase()}
                        </div>
                      )}
                      {isHospitalityMode && attrs.roomType && (
                        <div className="absolute top-2 left-2 px-2 py-0.5 text-[9px] font-bold rounded border backdrop-blur bg-amber-500/20 text-amber-400 border-amber-500/30">
                          {String(attrs.roomType).toUpperCase()}
                        </div>
                      )}
                      {!isPropertyMode && !isHospitalityMode && !product.isActive && (
                        <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/80 text-white text-[9px] font-bold rounded backdrop-blur">INACTIVE</div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-1.5 flex-1 flex flex-col">
                      <h3 className="font-bold text-[13px] text-foreground line-clamp-1 mb-0.5">{product.name}</h3>

                      {isPropertyMode ? (
                        <>
                          {product.location && (
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
                              <MapPin className="w-3 h-3" />{product.location}
                            </div>
                          )}
                          <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground mb-1">
                            {attrs.area && <span className="flex items-center gap-0.5"><Layers className="w-3 h-3" />{attrs.area} sqft</span>}
                            {attrs.bedrooms && <span className="flex items-center gap-0.5"><BedDouble className="w-3 h-3" />{attrs.bedrooms} BR</span>}
                            {attrs.bathrooms && <span className="flex items-center gap-0.5"><Bath className="w-3 h-3" />{attrs.bathrooms} Ba</span>}
                          </div>
                          <div className="font-bold text-primary text-[13px]">৳ {parseFloat(product.price).toLocaleString()}</div>
                          <div className={`text-[10px] font-medium mt-0.5 ${getStatusColor(propertyStatus)}`}>
                            ● {propertyStatus.charAt(0).toUpperCase() + propertyStatus.slice(1)}
                          </div>
                        </>
                      ) : isHospitalityMode ? (
                        <>
                          <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground mb-1">
                            {attrs.capacity && <span className="flex items-center gap-0.5"><Users className="w-3 h-3 text-amber-500" />Max {attrs.capacity} Guests</span>}
                            {attrs.bedType && <span className="flex items-center gap-0.5"><BedDouble className="w-3 h-3 text-amber-500" />{attrs.bedType}</span>}
                          </div>
                          <div className="font-bold text-amber-500 text-[13px]">৳ {parseFloat(product.price).toLocaleString()} <span className="text-[10px] font-normal text-muted-foreground">/ night</span></div>
                        </>
                      ) : (
                        <>
                          <div className="font-bold text-primary text-[13px] mb-2">
                            {product.currency} {parseFloat(product.price).toLocaleString()}
                          </div>
                          {product.trackInventory && (
                            <div className="mt-auto text-[10px] text-muted-foreground flex justify-between">
                              <span>Stock:</span>
                              <span className={`font-bold ${product.stockCount > 0 ? 'text-emerald-600' : 'text-red-500'}`}>{product.stockCount}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Pane: Editor */}
      <div className={`w-full ${!isEditing ? 'hidden md:flex items-center justify-center' : 'flex'} flex-col bg-background relative md:w-1/2 lg:w-[55%] h-full`}>
        {!isEditing ? (
          <div className="text-center text-muted-foreground flex flex-col items-center p-4">
            <div className="w-16 h-16 bg-surface border border-border rounded-full flex items-center justify-center mb-3 shadow-sm">
              {isPropertyMode ? <Building2 className="w-8 h-8 text-muted-foreground/60" /> : <ShoppingCart className="w-8 h-8 text-muted-foreground/60" />}
            </div>
            <h3 className="text-[13px] font-bold text-foreground mb-2">
              {isPropertyMode ? (language === 'en' ? 'Select a property' : 'একটি প্রপার্টি বেছে নিন') : (language === 'en' ? 'Select a product' : 'একটি প্রডাক্ট সিলেক্ট করুন')}
            </h3>
            <p className="text-[13px] max-w-xs">
              {language === 'en' ? 'Click on an item from the list to view or edit.' : 'দেখতে বা এডিট করতে লিস্ট থেকে ক্লিক করুন।'}
            </p>
          </div>
        ) : (
          <>
            {/* Editor Header */}
            <div className="h-14 px-1.5 border-b border-border flex items-center justify-between bg-surface shrink-0 sticky top-0 z-10 shadow-sm">
              <div className="flex items-center gap-2">
                <button onClick={() => setIsEditing(false)} className="md:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h2 className="font-bold text-foreground">{editTitle}</h2>
              </div>
              <button onClick={() => setIsEditing(false)} className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hidden md:block">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-1.5 pb-32">
              <form id="productForm" onSubmit={handleSubmit} className="space-y-3 max-w-2xl mx-auto">

                {/* ── PROPERTY MODE FORM ──────────────────────────────── */}
                {isPropertyMode ? (
                  <>
                    {/* Listing Type */}
                    <div className="bg-surface p-1.5 border border-border shadow-md rounded-2xl">
                      <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
                        {language === 'en' ? 'Listing Type' : 'লিস্টিং টাইপ'}
                      </label>
                      <div className="flex gap-2">
                        {LISTING_TYPES.map(lt => (
                          <button
                            key={lt.value}
                            type="button"
                            onClick={() => setFormData({ ...formData, listingType: lt.value })}
                            className={`flex-1 py-2 rounded-xl text-[12px] font-bold border transition-all ${formData.listingType === lt.value ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:border-primary/50'}`}
                          >
                            {language === 'en' ? lt.labelEn : lt.labelBn}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Property Gallery */}
                    <div className="bg-surface p-1.5 border border-border shadow-md rounded-2xl">
                      <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
                        {language === 'en' ? 'Property Photos' : 'প্রপার্টি ছবি'} ({galleryImages.length}/6)
                      </label>

                      {galleryImages.length > 0 && (
                        <div className="relative mb-3 rounded-xl overflow-hidden aspect-[16/9] bg-muted">
                          <img src={`${API}${galleryImages[gallerySlide]}`} alt="Gallery" className="w-full h-full object-cover" />
                          {galleryImages.length > 1 && (
                            <>
                              <button type="button" onClick={() => setGallerySlide(Math.max(0, gallerySlide - 1))} className="absolute left-2 top-1/2 -translate-y-1/2 p-1 bg-black/50 rounded-full text-white">
                                <ChevronLeft className="w-4 h-4" />
                              </button>
                              <button type="button" onClick={() => setGallerySlide(Math.min(galleryImages.length - 1, gallerySlide + 1))} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 bg-black/50 rounded-full text-white">
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button type="button" onClick={() => handleGalleryRemove(gallerySlide)} className="absolute top-2 right-2 p-1.5 bg-red-500/80 text-white rounded-lg text-[11px]">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                            {galleryImages.map((_, i) => <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === gallerySlide ? 'bg-white' : 'bg-white/40'}`} />)}
                          </div>
                        </div>
                      )}

                      {galleryImages.length < 6 && formData.id && (
                        <button
                          type="button"
                          onClick={() => galleryInputRef.current?.click()}
                          className="w-full py-3 border-2 border-dashed border-border hover:border-primary/50 rounded-xl text-[12px] text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-2"
                        >
                          <Plus className="w-4 h-4" /> {language === 'en' ? 'Add Photo' : 'ছবি যোগ করুন'}
                        </button>
                      )}
                      {!formData.id && (
                        <p className="text-[11px] text-muted-foreground text-center py-2">
                          {language === 'en' ? 'Save property first, then add gallery photos.' : 'প্রথমে সেভ করুন, তারপর গ্যালারি যোগ করুন।'}
                        </p>
                      )}
                      <input type="file" ref={galleryInputRef} className="hidden" accept="image/*" onChange={handleGalleryUpload} />
                    </div>

                    {/* Basic Info (Property) */}
                    <div className="bg-surface p-1.5 border border-border shadow-md rounded-2xl space-y-3">
                      <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                        {language === 'en' ? 'Property Details' : 'প্রপার্টির বিবরণ'}
                      </label>
                      <div>
                        <label className="block text-[11px] font-medium text-muted-foreground mb-1">{language === 'en' ? 'Property Title *' : 'প্রপার্টির নাম *'}</label>
                        <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-background border border-border rounded-lg px-1.5 py-2 text-[13px] focus:border-primary focus:outline-none transition-colors text-foreground" placeholder={language === 'en' ? 'e.g. 3 BHK Flat in Gulshan' : 'যেমন: গুলশান-এ ৩ রুমের ফ্ল্যাট'} />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-muted-foreground mb-1"><MapPin className="w-3 h-3 inline mr-1" />{language === 'en' ? 'Location / Area' : 'অবস্থান'}</label>
                        <input type="text" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} className="w-full bg-background border border-border rounded-lg px-1.5 py-2 text-[13px] focus:border-primary focus:outline-none transition-colors text-foreground" placeholder="e.g. Gulshan-2, Dhaka" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-muted-foreground mb-1">{language === 'en' ? 'Price / Rent Amount *' : 'মূল্য / ভাড়া *'}</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[13px]">৳</span>
                          <input type="number" step="0.01" required value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} className="w-full bg-background border border-border rounded-lg pl-7 pr-3 py-2 text-[13px] focus:border-primary focus:outline-none transition-colors text-foreground" placeholder="0.00" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-muted-foreground mb-1">{language === 'en' ? 'Description' : 'বিবরণ'}</label>
                        <textarea rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full bg-background border border-border rounded-lg px-1.5 py-2 text-[13px] focus:border-primary focus:outline-none resize-none custom-scrollbar transition-colors text-foreground" placeholder={language === 'en' ? 'Describe the property...' : 'প্রপার্টির বিবরণ দিন...'} />
                      </div>
                    </div>

                    {/* Quick Property Attributes */}
                    <div className="bg-surface p-1.5 border border-border shadow-md rounded-2xl space-y-3">
                      <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                        {language === 'en' ? 'Property Specs' : 'প্রপার্টির বৈশিষ্ট্য'}
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { key: 'area', icon: Layers, label: language === 'en' ? 'Area (sqft)' : 'আয়তন (sqft)', placeholder: '1200' },
                          { key: 'bedrooms', icon: BedDouble, label: language === 'en' ? 'Bedrooms' : 'বেডরুম', placeholder: '3' },
                          { key: 'bathrooms', icon: Bath, label: language === 'en' ? 'Bathrooms' : 'বাথরুম', placeholder: '2' },
                          { key: 'floor', icon: Layers, label: language === 'en' ? 'Floor' : 'তলা', placeholder: '5th' },
                          { key: 'facing', icon: Compass, label: language === 'en' ? 'Facing' : 'দিক', placeholder: 'South' },
                          { key: 'furnished', icon: Sofa, label: language === 'en' ? 'Furnished' : 'আসবাবপত্র', placeholder: 'Semi' },
                        ].map(({ key, icon: Icon, label, placeholder }) => (
                          <div key={key}>
                            <label className="block text-[11px] font-medium text-muted-foreground mb-1 flex items-center gap-1">
                              <Icon className="w-3 h-3" />{label}
                            </label>
                            <input
                              type="text"
                              value={formData.attributes?.[key] || ''}
                              onChange={e => setFormData((prev: any) => ({ ...prev, attributes: { ...prev.attributes, [key]: e.target.value } }))}
                              className="w-full bg-background border border-border rounded-lg px-2 py-2 text-[13px] focus:border-primary focus:outline-none transition-colors text-foreground"
                              placeholder={placeholder}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Property Status */}
                    <div className="bg-surface p-1.5 border border-border shadow-md rounded-2xl">
                      <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
                        {language === 'en' ? 'Status' : 'অবস্থা'}
                      </label>
                      <div className="flex gap-2">
                        {PROPERTY_STATUS.map(s => (
                          <button
                            key={s.value}
                            type="button"
                            onClick={() => setFormData({ ...formData, propertyStatus: s.value })}
                            className={`flex-1 py-2 rounded-xl text-[12px] font-bold border transition-all ${formData.propertyStatus === s.value ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:border-primary/50'}`}
                          >
                            {language === 'en' ? s.labelEn : s.labelBn}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  /* ── eCOMMERCE MODE FORM (original) ───────────────── */
                  <>
                    {/* Image Upload */}
                    <div className="bg-surface p-1.5 border border-border shadow-md rounded-2xl">
                      <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
                        {language === 'en' ? 'Product Image' : 'প্রডাক্ট ছবি'}
                      </label>
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="h-24 bg-background border-2 border-dashed border-border hover:border-primary/50 transition-colors rounded-xl flex flex-col items-center justify-center cursor-pointer relative overflow-hidden group"
                      >
                        {imagePreview ? (
                          <>
                            <img src={imagePreview} alt="Preview" className="w-full h-full object-contain bg-black" />
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white font-medium text-[13px] backdrop-blur-sm">Change Image</div>
                          </>
                        ) : (
                          <div className="text-center text-muted-foreground group-hover:text-primary transition-colors flex flex-col items-center">
                            <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                            <span className="text-[11px] font-bold uppercase tracking-wider">Click to upload</span>
                          </div>
                        )}
                      </div>
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
                    </div>

                    {/* Basic Info */}
                    <div className="bg-surface p-1.5 border border-border shadow-md rounded-2xl space-y-4">
                      <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                        {language === 'en' ? 'Basic Info' : 'প্রাথমিক তথ্য'}
                      </label>
                      <div>
                        <label className="block text-[11px] font-medium text-muted-foreground mb-1">Name / Title *</label>
                        <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-background border border-border rounded-lg px-1.5 py-2 text-[13px] focus:border-primary focus:outline-none transition-colors text-foreground" placeholder="e.g. Premium Cotton T-Shirt" />
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <div>
                          <label className="block text-[11px] font-medium text-muted-foreground mb-1">Price *</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[13px]">৳</span>
                            <input type="number" step="0.01" required value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} className="w-full bg-background border border-border rounded-lg pl-7 pr-3 py-2 text-[13px] focus:border-primary focus:outline-none transition-colors text-foreground" placeholder="0.00" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-muted-foreground mb-1">SKU (Optional)</label>
                          <input type="text" value={formData.sku} onChange={e => setFormData({ ...formData, sku: e.target.value })} className="w-full bg-background border border-border rounded-lg px-1.5 py-2 text-[13px] focus:border-primary focus:outline-none transition-colors text-foreground" placeholder="SHIRT-001" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-muted-foreground mb-1">Description</label>
                        <textarea rows={4} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full bg-background border border-border rounded-lg px-1.5 py-2 text-[13px] focus:border-primary focus:outline-none resize-none custom-scrollbar transition-colors text-foreground" placeholder="Write a short description..." />
                      </div>
                      <label className="flex items-center gap-1.5 p-1.5 bg-background border border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                        <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({ ...formData, isActive: e.target.checked })} className="w-3.5 h-3.5 text-primary rounded border-border focus:ring-primary focus:ring-offset-0 bg-background" />
                        <span className="text-[13px] font-medium text-foreground">{language === 'en' ? 'Product is Active' : 'প্রডাক্ট অ্যাক্টিভ'}</span>
                      </label>
                    </div>

                    {/* Inventory */}
                    <div className="bg-surface p-1.5 border border-border shadow-md rounded-2xl">
                      <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
                        {language === 'en' ? 'Inventory' : 'ইনভেন্টরি'}
                      </label>
                      <div className="flex flex-col gap-1.5">
                        <label className="flex items-center gap-1.5 p-1.5 bg-background border border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                          <input type="checkbox" checked={formData.trackInventory} onChange={e => setFormData({ ...formData, trackInventory: e.target.checked })} className="w-3.5 h-3.5 text-primary rounded border-border focus:ring-primary focus:ring-offset-0 bg-background" />
                          <div>
                            <div className="text-[13px] font-medium text-foreground">{language === 'en' ? 'Track Stock' : 'স্টক ট্র্যাক করুন'}</div>
                            <div className="text-[10px] text-muted-foreground">Automatically reduce stock on sale</div>
                          </div>
                        </label>
                        {formData.trackInventory && (
                          <div className="animate-in slide-in-from-top-2 fade-in duration-200">
                            <label className="block text-[11px] font-medium text-muted-foreground mb-1">Available Stock Count</label>
                            <input type="number" value={formData.stockCount} onChange={e => setFormData({ ...formData, stockCount: e.target.value })} className="w-full md:w-1/2 bg-background border border-border rounded-lg px-1.5 py-2 text-[13px] focus:border-primary focus:outline-none transition-colors text-foreground" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Custom Attributes */}
                    <div className="bg-surface p-1.5 border border-border shadow-md rounded-2xl">
                      <div className="flex items-center justify-between mb-3">
                        <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                          {language === 'en' ? 'Custom Properties' : 'কাস্টম প্রপার্টি'}
                        </label>
                        <span className="px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-bold rounded-full uppercase tracking-widest">Dynamic</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mb-3">
                        Add flexible fields. E.g. <b>Size: XL</b>, <b>Color: Red</b>.
                      </p>
                      <div className="flex items-center gap-2 mb-4">
                        <input type="text" placeholder="Key (e.g. Size)" value={attrKey} onChange={e => setAttrKey(e.target.value)} className="w-1/3 bg-background border border-border rounded-lg px-1.5 py-2 text-[13px] focus:border-primary focus:outline-none transition-colors text-foreground" />
                        <input type="text" placeholder="Value (e.g. XL)" value={attrValue} onChange={e => setAttrValue(e.target.value)} className="flex-1 bg-background border border-border rounded-lg px-1.5 py-2 text-[13px] focus:border-primary focus:outline-none transition-colors text-foreground" onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddAttribute())} />
                        <button type="button" onClick={handleAddAttribute} className="p-2 bg-muted text-muted-foreground hover:bg-muted/80 rounded-lg transition-colors shrink-0 cursor-pointer">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {Object.keys(formData.attributes || {}).length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {Object.entries(formData.attributes).map(([k, v]: any) => (
                            <div key={k} className="flex items-center justify-between p-2.5 bg-background border border-border rounded-lg text-[13px] group">
                              <div className="truncate pr-2"><span className="text-muted-foreground">{k}:</span> <span className="font-bold text-foreground">{v}</span></div>
                              <button type="button" onClick={() => handleRemoveAttribute(k)} className="text-muted-foreground hover:text-red-500 p-1 rounded transition-colors opacity-0 group-hover:opacity-100 cursor-pointer">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </form>
            </div>

            {/* Sticky Bottom Actions */}
            <div className="absolute bottom-0 left-0 right-0 p-1.5 border-t border-border bg-surface/80 backdrop-blur-md flex justify-end gap-1.5 z-20">
              <button type="button" onClick={() => setIsEditing(false)} className="px-5 py-2 rounded-xl text-[13px] font-medium text-muted-foreground hover:bg-muted transition-colors">
                {language === 'en' ? 'Cancel' : 'বাতিল'}
              </button>
              <button type="submit" form="productForm" disabled={saving} className="bg-primary text-primary-foreground px-5 py-2 rounded-xl text-[13px] font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 flex items-center gap-2 disabled:opacity-50 cursor-pointer">
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
