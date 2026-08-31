'use client';

import { useState, useEffect, useRef } from 'react';
import Cookies from 'js-cookie';
import { useLanguage } from '@/components/LanguageProvider';
import {
  ShoppingCart, Building2, Hotel, Cpu, Briefcase, Stethoscope, GraduationCap, Factory, PackageCheck, FileText, BookOpen, Clock, Calendar, Plus, Edit2, Trash2, X, Image as ImageIcon,
  Save, RefreshCw, ChevronLeft, ChevronRight, MapPin, Home, BedDouble,
  Bath, Layers, Compass, Sofa, Users, Wifi, Tv, Coffee, Sparkles, Truck, Navigation, Weight
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
  const [isTechSoftwareMode, setIsTechSoftwareMode] = useState(false);
  const [isFinancialServiceMode, setIsFinancialServiceMode] = useState(false);
  const [isHealthcareMode, setIsHealthcareMode] = useState(false);
  const [isEducationMode, setIsEducationMode] = useState(false);
  const [isManufacturingMode, setIsManufacturingMode] = useState(false);
  const [isLogisticsMode, setIsLogisticsMode] = useState(false);

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
  const [attrType, setAttrType] = useState<'text' | 'textarea' | 'dropdown' | 'date' | 'number' | 'checkbox'>('text');
  const [attrDropdownOptions, setAttrDropdownOptions] = useState('');
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
        setIsTechSoftwareMode(matchedNature?.isTechSoftwareMode ?? false);
        setIsFinancialServiceMode(matchedNature?.isFinancialServiceMode ?? false);
        setIsHealthcareMode(matchedNature?.isHealthcareMode ?? false);
        setIsEducationMode(matchedNature?.isEducationMode ?? false);
        setIsManufacturingMode(matchedNature?.isManufacturingMode ?? false);
        setIsLogisticsMode(matchedNature?.isLogisticsMode ?? false);
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
    if (!attrKey.trim()) return;
    const key = attrKey.trim();
    let valToSave = attrValue.trim();
    if (attrType === 'checkbox' && !valToSave) valToSave = 'Yes';
    setFormData((prev: any) => ({
      ...prev,
      attributes: { ...prev.attributes, [key]: valToSave }
    }));
    setAttrKey('');
    setAttrValue('');
    setAttrDropdownOptions('');
    setAttrType('text');
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
        price: (formData.price !== '' && formData.price !== null && formData.price !== undefined && !isNaN(parseFloat(formData.price))) ? parseFloat(formData.price) : 0,
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
    : isTechSoftwareMode
    ? (language === 'en' ? 'Software Plans & Pricing' : 'সফটওয়্যার ও প্রাইসিং প্ল্যান')
    : isFinancialServiceMode
    ? (language === 'en' ? 'Service Packages' : 'সার্ভিস প্যাকেজ')
    : isHealthcareMode
    ? (language === 'en' ? 'Doctors & Care Services' : 'ডাক্তার ও ক্লিনিক সার্ভিস')
    : isEducationMode
    ? (language === 'en' ? 'Courses & Academic Programs' : 'কোর্স ও ব্যাচসমূহ')
    : isManufacturingMode
    ? (language === 'en' ? 'Wholesale Products & Factory Catalog' : 'হোলসেল প্রডাক্ট ক্যাটালগ')
    : isLogisticsMode
    ? (language === 'en' ? 'Freight Routes & Fleet Vehicles' : 'ফ্রেট রুট ও যানবাহন')
    : (language === 'en' ? 'Products' : 'প্রডাক্টস');

  const addBtnLabel = isPropertyMode || isHospitalityMode || isTechSoftwareMode || isFinancialServiceMode || isHealthcareMode || isEducationMode || isManufacturingMode || isLogisticsMode
    ? (language === 'en' ? 'Add' : 'নতুন')
    : (language === 'en' ? 'Add' : 'নতুন');

  const editTitle = isPropertyMode
    ? (formData.id ? (language === 'en' ? 'Edit Property' : 'প্রপার্টি এডিট') : (language === 'en' ? 'Add Property' : 'নতুন প্রপার্টি'))
    : isHospitalityMode
    ? (formData.id ? (language === 'en' ? 'Edit Room' : 'রুম এডিট') : (language === 'en' ? 'Add Room/Suite' : 'নতুন রুম যোগ'))
    : isTechSoftwareMode
    ? (formData.id ? (language === 'en' ? 'Edit Plan' : 'প্ল্যান এডিট') : (language === 'en' ? 'Add Software Plan' : 'নতুন সফটওয়্যার প্ল্যান'))
    : isFinancialServiceMode
    ? (formData.id ? (language === 'en' ? 'Edit Service' : 'সার্ভিস এডিট') : (language === 'en' ? 'Add Service Package' : 'নতুন সার্ভিস যোগ'))
    : isHealthcareMode
    ? (formData.id ? (language === 'en' ? 'Edit Doctor' : 'ডাক্তার এডিট') : (language === 'en' ? 'Add Doctor Profile' : 'নতুন ডাক্তার যোগ'))
    : isEducationMode
    ? (formData.id ? (language === 'en' ? 'Edit Course' : 'কোর্স এডিট') : (language === 'en' ? 'Add Course / Batch' : 'নতুন কোর্স যোগ'))
    : isManufacturingMode
    ? (formData.id ? (language === 'en' ? 'Edit Wholesale Product' : 'প্রডাক্ট এডিট') : (language === 'en' ? 'Add Wholesale Product' : 'নতুন প্রডাক্ট যোগ'))
    : isLogisticsMode
    ? (formData.id ? (language === 'en' ? 'Edit Freight Route/Vehicle' : 'ফ্রেট রুট এডিট') : (language === 'en' ? 'Add Freight Route / Fleet Vehicle' : 'নতুন ফ্রেট রুট/যানবাহন যোগ'))
    : (formData.id ? (language === 'en' ? 'Edit Product' : 'প্রডাক্ট এডিট') : (language === 'en' ? 'Add Product' : 'নতুন প্রডাক্ট'));

  return (
    <div className="flex h-[calc(100vh-130px)] bg-surface/70 backdrop-blur-xl border border-zinc-300 dark:border-zinc-700/80 rounded-2xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)] relative text-[13px]">

      {/* Left Pane: List */}
      <div className={`w-full ${isEditing ? 'hidden md:flex md:w-1/2 lg:w-[45%]' : 'flex'} flex-col border-r border-zinc-300 dark:border-zinc-700/80 bg-muted/20 shrink-0`}>
        <div className="p-1.5 border-b border-zinc-300 dark:border-zinc-700/80 shrink-0 flex items-center justify-between bg-background z-10">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              {isPropertyMode ? <Building2 className="w-6 h-6 text-primary" /> : isHospitalityMode ? <Hotel className="w-6 h-6 text-amber-500" /> : isTechSoftwareMode ? <Cpu className="w-6 h-6 text-indigo-500" /> : isFinancialServiceMode ? <Briefcase className="w-6 h-6 text-emerald-500" /> : isHealthcareMode ? <Stethoscope className="w-6 h-6 text-teal-500" /> : isEducationMode ? <GraduationCap className="w-6 h-6 text-purple-500" /> : isManufacturingMode ? <Factory className="w-6 h-6 text-amber-500" /> : isLogisticsMode ? <Truck className="w-6 h-6 text-sky-500" /> : <ShoppingCart className="w-6 h-6 text-primary" />}
              {pageTitle}
            </h1>
            <p className="text-[11px] text-muted-foreground mt-1">
              {products.length} {isPropertyMode ? (language === 'en' ? 'listings' : 'টি লিস্টিং') : isHospitalityMode ? (language === 'en' ? 'rooms & suites' : 'টি রুম আছে') : isTechSoftwareMode ? (language === 'en' ? 'software plans' : 'টি প্ল্যান আছে') : isFinancialServiceMode ? (language === 'en' ? 'service packages' : 'টি সার্ভিস প্যাকেজ আছে') : isHealthcareMode ? (language === 'en' ? 'doctors & services' : 'টি ডাক্তার ও সার্ভিস আছে') : isEducationMode ? (language === 'en' ? 'courses & academic programs' : 'টি কোর্স ও ব্যাচ আছে') : isManufacturingMode ? (language === 'en' ? 'wholesale & factory products' : 'টি হোলসেল প্রডাক্ট আছে') : (language === 'en' ? 'items found' : 'টি প্রডাক্ট আছে')}
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
          {/* Dynamic List Column Header Bar */}
          {!loading && products.length > 0 && (
            <div className="px-3 py-2 bg-muted/70 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700/80 rounded-xl text-[11px] font-bold text-muted-foreground flex items-center justify-between uppercase tracking-wider mb-2 shadow-xs">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span>
                  {isPropertyMode ? (language === 'en' ? 'Property Name & Location' : 'প্রপার্টি নাম ও লোকেশন') :
                   isHospitalityMode ? (language === 'en' ? 'Room / Suite Name' : 'রুম / স্যুট নাম') :
                   isTechSoftwareMode ? (language === 'en' ? 'Plan / Software Name' : 'সফটওয়্যার ও প্রাইসিং প্ল্যান') :
                   isFinancialServiceMode ? (language === 'en' ? 'Service Package' : 'সার্ভিস প্যাকেজ') :
                   isHealthcareMode ? (language === 'en' ? 'Doctor / Specialty' : 'ডাক্তার ও সার্ভিস') :
                   isEducationMode ? (language === 'en' ? 'Course / Batch' : 'কোর্স ও ব্যাচ') :
                   isManufacturingMode ? (language === 'en' ? 'Wholesale Product' : 'পাইকারি প্রডাক্ট নাম') :
                   isLogisticsMode ? (language === 'en' ? 'Route / Vehicle' : 'ফ্রেট রুট ও যানবাহন') :
                   (language === 'en' ? 'Product Name & SKU' : 'প্রডাক্ট নাম ও আইডি')}
                </span>
              </div>
              <div className="text-right shrink-0 pr-6">
                {isPropertyMode ? (language === 'en' ? 'Price / Rent' : 'মূল্য / ভাড়া') :
                 isHospitalityMode ? (language === 'en' ? 'Rate / Night' : 'ভাড়া / রাত') :
                 isTechSoftwareMode ? (language === 'en' ? 'Monthly Price' : 'মাসিক মূল্য') :
                 isFinancialServiceMode ? (language === 'en' ? 'Service Fee' : 'সার্ভিস ফি') :
                 isHealthcareMode ? (language === 'en' ? 'Visit Fee' : 'ভিজিট ফি') :
                 isEducationMode ? (language === 'en' ? 'Course Fee' : 'কোর্স ফি') :
                 isManufacturingMode ? (language === 'en' ? 'Unit Price' : 'একক মূল্য') :
                 isLogisticsMode ? (language === 'en' ? 'Freight Rate' : 'ভাড়া / রেট') :
                 (language === 'en' ? 'Price' : 'মূল্য')}
              </div>
            </div>
          )}

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
            <div className="flex flex-col gap-1">
              {products.map(product => {
                const imgs: string[] = Array.isArray(product.images) ? product.images : [];
                const attrs = (product.attributes as any) || {};
                const propertyStatus = attrs.propertyStatus || 'available';
                const isSelected = formData.id === product.id && isEditing;

                const priceDisplay = (!product.price || parseFloat(product.price) <= 0)
                  ? <span className="italic text-muted-foreground text-[11px]">{language === 'en' ? 'Price on Call' : 'আলোচনা সাপেক্ষে'}</span>
                  : <span className="font-bold text-[12px]">
                      {isHospitalityMode ? `৳${parseFloat(product.price).toLocaleString()}/n` :
                       isTechSoftwareMode ? `৳${parseFloat(product.price).toLocaleString()}/mo` :
                       isHealthcareMode ? `৳${parseFloat(product.price).toLocaleString()}/visit` :
                       isEducationMode ? `৳${parseFloat(product.price).toLocaleString()}` :
                       isManufacturingMode ? `৳${parseFloat(product.price).toLocaleString()}/u` :
                       isLogisticsMode ? `৳${parseFloat(product.price).toLocaleString()}` :
                       isFinancialServiceMode ? `৳${parseFloat(product.price).toLocaleString()}` :
                       `৳${parseFloat(product.price).toLocaleString()}`}
                    </span>;

                return (
                  <div
                    key={product.id}
                    onClick={() => openEditor(product)}
                    className={`group flex items-center gap-2 px-2.5 py-2 rounded-xl border cursor-pointer transition-all hover:shadow-sm
                      ${isSelected ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border bg-card hover:border-border/80 hover:bg-muted/30'}`}
                  >
                    {/* Thumbnail — only Property & Hospitality if image exists */}
                    {(isPropertyMode || isHospitalityMode) && (imgs.length > 0 || product.imageUrl) ? (
                      <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-border">
                        <img
                          src={`${API}${imgs[0] || product.imageUrl}`}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      /* Icon avatar instead of image for non-image categories */
                      <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-white text-[10px] font-bold
                        ${isHospitalityMode ? 'bg-amber-500/20 border border-amber-500/30' :
                          isTechSoftwareMode ? 'bg-indigo-500/15 border border-indigo-500/30' :
                          isFinancialServiceMode ? 'bg-emerald-500/15 border border-emerald-500/30' :
                          isHealthcareMode ? 'bg-teal-500/15 border border-teal-500/30' :
                          isEducationMode ? 'bg-purple-500/15 border border-purple-500/30' :
                          isManufacturingMode ? 'bg-amber-500/15 border border-amber-500/30' :
                          isLogisticsMode ? 'bg-sky-500/15 border border-sky-500/30' :
                          isPropertyMode ? 'bg-primary/15 border border-primary/30' :
                          'bg-primary/10 border border-primary/20'}`}
                      >
                        {isHospitalityMode ? <Hotel className="w-4 h-4 text-amber-500" /> :
                         isTechSoftwareMode ? <Cpu className="w-4 h-4 text-indigo-500" /> :
                         isFinancialServiceMode ? <Briefcase className="w-4 h-4 text-emerald-500" /> :
                         isHealthcareMode ? <Stethoscope className="w-4 h-4 text-teal-500" /> :
                         isEducationMode ? <GraduationCap className="w-4 h-4 text-purple-500" /> :
                         isManufacturingMode ? <Factory className="w-4 h-4 text-amber-500" /> :
                         isLogisticsMode ? <Truck className="w-4 h-4 text-sky-500" /> :
                         isPropertyMode ? <Building2 className="w-4 h-4 text-primary" /> :
                         <ShoppingCart className="w-4 h-4 text-primary" />}
                      </div>
                    )}

                    {/* Name + Key Attributes */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-[13px] text-foreground truncate max-w-[160px]">{product.name}</span>

                        {/* Category-specific badge/tag */}
                        {isPropertyMode && product.listingType && (
                          <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded border ${getListingBadge(product.listingType)}`}>
                            {product.listingType.toUpperCase()}
                          </span>
                        )}
                        {isHospitalityMode && attrs.roomType && (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold rounded border bg-amber-500/10 text-amber-500 border-amber-500/20">
                            {String(attrs.roomType).toUpperCase()}
                          </span>
                        )}
                        {isTechSoftwareMode && attrs.tier && (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-indigo-500/10 text-indigo-500">
                            {String(attrs.tier).toUpperCase()}
                          </span>
                        )}
                        {!product.isActive && !isPropertyMode && (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-muted text-muted-foreground">INACTIVE</span>
                        )}
                      </div>

                      {/* Key fields row */}
                      <div className="flex items-center gap-2 flex-wrap mt-0.5 text-[10px] text-muted-foreground">
                        {isPropertyMode && (
                          <>
                            {product.location && <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{product.location}</span>}
                            {attrs.area && <span className="flex items-center gap-0.5"><Layers className="w-2.5 h-2.5" />{attrs.area} sqft</span>}
                            {attrs.bedrooms && <span className="flex items-center gap-0.5"><BedDouble className="w-2.5 h-2.5" />{attrs.bedrooms} BR</span>}
                            {attrs.bathrooms && <span>{attrs.bathrooms} Ba</span>}
                            <span className={`font-medium ${getStatusColor(propertyStatus)}`}>● {propertyStatus}</span>
                          </>
                        )}
                        {isHospitalityMode && (
                          <>
                            {attrs.capacity && <span className="flex items-center gap-0.5"><Users className="w-2.5 h-2.5 text-amber-500" />Max {attrs.capacity}</span>}
                            {attrs.bedType && <span className="flex items-center gap-0.5"><BedDouble className="w-2.5 h-2.5 text-amber-500" />{attrs.bedType}</span>}
                            {attrs.amenities && <span className="truncate max-w-[100px]">{typeof attrs.amenities === 'string' ? attrs.amenities.split(',').slice(0,2).join(', ') : ''}</span>}
                          </>
                        )}
                        {isTechSoftwareMode && (
                          <>
                            {attrs.features && <span className="truncate max-w-[140px]">{Array.isArray(attrs.features) ? attrs.features.slice(0,2).join(', ') : String(attrs.features).substring(0, 40)}</span>}
                            {attrs.maxUsers && <span className="flex items-center gap-0.5"><Users className="w-2.5 h-2.5" />Max {attrs.maxUsers}</span>}
                          </>
                        )}
                        {isFinancialServiceMode && (
                          <>
                            {attrs.scope && <span className="truncate max-w-[140px] flex items-center gap-0.5"><Briefcase className="w-2.5 h-2.5 text-emerald-500 shrink-0" />{String(attrs.scope)}</span>}
                            {attrs.duration && <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{attrs.duration}</span>}
                          </>
                        )}
                        {isHealthcareMode && (
                          <>
                            {(attrs.specialty || attrs.specialization) && <span className="flex items-center gap-0.5"><Stethoscope className="w-2.5 h-2.5 text-teal-500" />{String(attrs.specialty || attrs.specialization)}</span>}
                            {attrs.visitingHours && <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{attrs.visitingHours}</span>}
                          </>
                        )}
                        {isEducationMode && (
                          <>
                            {(attrs.duration || attrs.courseDuration) && <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5 text-purple-500" />{String(attrs.duration || attrs.courseDuration)}</span>}
                            {attrs.batchSchedule && <span className="flex items-center gap-0.5"><Calendar className="w-2.5 h-2.5" />{attrs.batchSchedule}</span>}
                            {attrs.instructor && <span>{attrs.instructor}</span>}
                          </>
                        )}
                        {isManufacturingMode && (
                          <>
                            {(attrs.moq || attrs.minimumOrderQty) && <span className="flex items-center gap-0.5"><PackageCheck className="w-2.5 h-2.5 text-amber-500" />MOQ: {String(attrs.moq || attrs.minimumOrderQty)}</span>}
                            {attrs.material && <span>{attrs.material}</span>}
                            {attrs.leadTime && <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{attrs.leadTime}</span>}
                          </>
                        )}
                        {isLogisticsMode && (
                          <>
                            {(attrs.route || attrs.originDestination) && <span className="flex items-center gap-0.5"><Navigation className="w-2.5 h-2.5 text-sky-500 shrink-0" />{String(attrs.route || attrs.originDestination)}</span>}
                            {(attrs.capacity || attrs.vehicleType) && <span className="flex items-center gap-0.5"><Truck className="w-2.5 h-2.5 text-sky-500 shrink-0" />{String(attrs.capacity || attrs.vehicleType)}</span>}
                          </>
                        )}
                        {/* Default retail */}
                        {!isPropertyMode && !isHospitalityMode && !isTechSoftwareMode && !isFinancialServiceMode && !isHealthcareMode && !isEducationMode && !isManufacturingMode && !isLogisticsMode && (
                          <>
                            {product.sku && <span>SKU: {product.sku}</span>}
                            {product.trackInventory && (
                              <span className={`font-medium ${product.stockCount > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                Stock: {product.stockCount}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Price + Delete */}
                    <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                      <div className={`text-right
                        ${isHospitalityMode ? 'text-amber-500' :
                          isTechSoftwareMode ? 'text-indigo-500' :
                          isFinancialServiceMode ? 'text-emerald-500' :
                          isHealthcareMode ? 'text-teal-500' :
                          isEducationMode ? 'text-purple-500' :
                          isManufacturingMode ? 'text-amber-500' :
                          isLogisticsMode ? 'text-sky-500' :
                          'text-primary'}`}
                      >
                        {priceDisplay}
                      </div>
                      <button
                        onClick={(e) => handleDelete(product.id, e)}
                        className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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
                        <label className="block text-[11px] font-medium text-muted-foreground mb-1">{language === 'en' ? 'Price / Rent Amount (Optional)' : 'মূল্য / ভাড়া (ঐচ্ছিক)'}</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[13px]">৳</span>
                          <input type="number" step="0.01" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} className="w-full bg-background border border-border rounded-lg pl-7 pr-3 py-2 text-[13px] focus:border-primary focus:outline-none transition-colors text-foreground" placeholder="0.00" />
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
                ) : isHospitalityMode ? (
                  /* ── HOSPITALITY MODE FORM ───────────────────────────── */
                  <>
                    {/* Room Image */}
                    <div className="bg-surface p-1.5 border border-border shadow-md rounded-2xl">
                      <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
                        {language === 'en' ? 'Room Photo' : 'রুমের ছবি'}
                      </label>
                      <div onClick={() => fileInputRef.current?.click()} className="h-24 bg-background border-2 border-dashed border-border hover:border-amber-500/50 transition-colors rounded-xl flex flex-col items-center justify-center cursor-pointer relative overflow-hidden group">
                        {imagePreview ? (
                          <><img src={imagePreview} alt="Preview" className="w-full h-full object-contain bg-black" /><div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white font-medium text-[13px] backdrop-blur-sm">Change Photo</div></>
                        ) : (
                          <div className="text-center text-muted-foreground flex flex-col items-center"><Hotel className="w-8 h-8 mb-2 opacity-40 text-amber-500" /><span className="text-[11px] font-bold uppercase tracking-wider">Click to upload</span></div>
                        )}
                      </div>
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
                    </div>
                    {/* Room Details */}
                    <div className="bg-surface p-1.5 border border-border shadow-md rounded-2xl space-y-3">
                      <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">{language === 'en' ? 'Room Details' : 'রুমের বিবরণ'}</label>
                      <div>
                        <label className="block text-[11px] font-medium text-muted-foreground mb-1">{language === 'en' ? 'Room / Suite Name *' : 'রুম / স্যুটের নাম *'}</label>
                        <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-background border border-border rounded-lg px-1.5 py-2 text-[13px] focus:border-amber-500 focus:outline-none transition-colors text-foreground" placeholder={language === 'en' ? 'e.g. Deluxe Sea View Suite' : 'যেমন: ডিলাক্স সি ভিউ স্যুট'} />
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <div>
                          <label className="block text-[11px] font-medium text-muted-foreground mb-1">{language === 'en' ? 'Price / Night (Optional)' : 'প্রতি রাত মূল্য (ঐচ্ছিক)'}</label>
                          <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[13px]">৳</span><input type="number" step="0.01" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} className="w-full bg-background border border-border rounded-lg pl-7 pr-3 py-2 text-[13px] focus:border-amber-500 focus:outline-none transition-colors text-foreground" placeholder="0.00" /></div>
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-muted-foreground mb-1">{language === 'en' ? 'Room Type' : 'রুমের ধরন'}</label>
                          <input type="text" value={formData.attributes?.roomType || ''} onChange={e => setFormData((prev: any) => ({ ...prev, attributes: { ...prev.attributes, roomType: e.target.value } }))} className="w-full bg-background border border-border rounded-lg px-1.5 py-2 text-[13px] focus:border-amber-500 focus:outline-none transition-colors text-foreground" placeholder="e.g. Standard, Deluxe" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <div><label className="block text-[11px] font-medium text-muted-foreground mb-1 flex items-center gap-1"><Users className="w-3 h-3" />{language === 'en' ? 'Max Guests' : 'সর্বোচ্চ অতিথি'}</label><input type="text" value={formData.attributes?.maxGuests || ''} onChange={e => setFormData((prev: any) => ({ ...prev, attributes: { ...prev.attributes, maxGuests: e.target.value } }))} className="w-full bg-background border border-border rounded-lg px-2 py-2 text-[13px] focus:border-amber-500 focus:outline-none transition-colors text-foreground" placeholder="2" /></div>
                        <div><label className="block text-[11px] font-medium text-muted-foreground mb-1 flex items-center gap-1"><BedDouble className="w-3 h-3" />{language === 'en' ? 'Bed Type' : 'বেড ধরন'}</label><input type="text" value={formData.attributes?.bedType || ''} onChange={e => setFormData((prev: any) => ({ ...prev, attributes: { ...prev.attributes, bedType: e.target.value } }))} className="w-full bg-background border border-border rounded-lg px-2 py-2 text-[13px] focus:border-amber-500 focus:outline-none transition-colors text-foreground" placeholder="King, Twin" /></div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-muted-foreground mb-2 flex items-center gap-1"><Wifi className="w-3 h-3" />{language === 'en' ? 'Amenities (check all)' : 'সুবিধাসমূহ'}</label>
                        <div className="flex flex-wrap gap-1.5">
                          {['WiFi', 'AC', 'TV', 'Balcony', 'Mini Bar', 'Pool Access', 'Gym', 'Breakfast Included'].map(a => {
                            const amenities: string[] = (formData.attributes?.amenities || '').split(',').map((x: string) => x.trim()).filter(Boolean);
                            const checked = amenities.includes(a);
                            return (
                              <button key={a} type="button" onClick={() => {
                                const updated = checked ? amenities.filter(x => x !== a) : [...amenities, a];
                                setFormData((prev: any) => ({ ...prev, attributes: { ...prev.attributes, amenities: updated.join(', ') } }));
                              }} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all cursor-pointer ${checked ? 'bg-amber-500 text-white border-amber-500' : 'bg-background text-muted-foreground border-border hover:border-amber-500/50'}`}>{a}</button>
                            );
                          })}
                        </div>
                      </div>
                      <div><label className="block text-[11px] font-medium text-muted-foreground mb-1">{language === 'en' ? 'Description' : 'বিবরণ'}</label><textarea rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full bg-background border border-border rounded-lg px-1.5 py-2 text-[13px] focus:border-amber-500 focus:outline-none resize-none custom-scrollbar transition-colors text-foreground" placeholder={language === 'en' ? 'Describe the room...' : 'রুমের বিবরণ দিন...'} /></div>
                    </div>
                  </>

                ) : isTechSoftwareMode ? (
                  /* ── TECH / SOFTWARE MODE FORM ───────────────────────── */
                  <>
                    <div className="bg-surface p-1.5 border border-border shadow-md rounded-2xl space-y-3">
                      <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2"><Cpu className="w-3.5 h-3.5 inline mr-1 text-indigo-400" />{language === 'en' ? 'Software Plan Details' : 'সফটওয়্যার প্ল্যান বিবরণ'}</label>
                      <div>
                        <label className="block text-[11px] font-medium text-muted-foreground mb-1">{language === 'en' ? 'Plan Name *' : 'প্ল্যানের নাম *'}</label>
                        <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-background border border-border rounded-lg px-1.5 py-2 text-[13px] focus:border-indigo-500 focus:outline-none transition-colors text-foreground" placeholder={language === 'en' ? 'e.g. Business Pro Plan' : 'যেমন: বিজনেস প্রো প্ল্যান'} />
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <div>
                          <label className="block text-[11px] font-medium text-muted-foreground mb-1">{language === 'en' ? 'Monthly Price (Optional)' : 'মাসিক মূল্য (ঐচ্ছিক)'}</label>
                          <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[13px]">৳</span><input type="number" step="0.01" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} className="w-full bg-background border border-border rounded-lg pl-7 pr-3 py-2 text-[13px] focus:border-indigo-500 focus:outline-none transition-colors text-foreground" placeholder="0.00" /></div>
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-muted-foreground mb-1">{language === 'en' ? 'License Type' : 'লাইসেন্স ধরন'}</label>
                          <input type="text" value={formData.attributes?.licenseType || ''} onChange={e => setFormData((prev: any) => ({ ...prev, attributes: { ...prev.attributes, licenseType: e.target.value } }))} className="w-full bg-background border border-border rounded-lg px-1.5 py-2 text-[13px] focus:border-indigo-500 focus:outline-none transition-colors text-foreground" placeholder="SaaS / Perpetual" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <div><label className="block text-[11px] font-medium text-muted-foreground mb-1">{language === 'en' ? 'Max Users' : 'সর্বোচ্চ ব্যবহারকারী'}</label><input type="text" value={formData.attributes?.maxUsers || ''} onChange={e => setFormData((prev: any) => ({ ...prev, attributes: { ...prev.attributes, maxUsers: e.target.value } }))} className="w-full bg-background border border-border rounded-lg px-2 py-2 text-[13px] focus:border-indigo-500 focus:outline-none transition-colors text-foreground" placeholder="50" /></div>
                        <div><label className="block text-[11px] font-medium text-muted-foreground mb-1">{language === 'en' ? 'SLA / Uptime' : 'এসএলএ / আপটাইম'}</label><input type="text" value={formData.attributes?.sla || ''} onChange={e => setFormData((prev: any) => ({ ...prev, attributes: { ...prev.attributes, sla: e.target.value } }))} className="w-full bg-background border border-border rounded-lg px-2 py-2 text-[13px] focus:border-indigo-500 focus:outline-none transition-colors text-foreground" placeholder="99.9%" /></div>
                      </div>
                      <div><label className="block text-[11px] font-medium text-muted-foreground mb-1">{language === 'en' ? 'Demo / Trial URL' : 'ডেমো লিংক'}</label><input type="text" value={formData.attributes?.demoUrl || ''} onChange={e => setFormData((prev: any) => ({ ...prev, attributes: { ...prev.attributes, demoUrl: e.target.value } }))} className="w-full bg-background border border-border rounded-lg px-1.5 py-2 text-[13px] focus:border-indigo-500 focus:outline-none transition-colors text-foreground" placeholder="https://demo.yourapp.com" /></div>
                      <div><label className="block text-[11px] font-medium text-muted-foreground mb-1">{language === 'en' ? 'Features / Description' : 'ফিচার সমূহ'}</label><textarea rows={4} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full bg-background border border-border rounded-lg px-1.5 py-2 text-[13px] focus:border-indigo-500 focus:outline-none resize-none custom-scrollbar transition-colors text-foreground" placeholder={language === 'en' ? 'List key features, e.g. Unlimited contacts, AI chatbot, API access...' : 'ফিচারগুলো লিখুন...'} /></div>
                      <label className="flex items-center gap-1.5 p-1.5 bg-background border border-border rounded-lg cursor-pointer hover:border-indigo-500/50 transition-colors"><input type="checkbox" checked={formData.isActive} onChange={e => setFormData({ ...formData, isActive: e.target.checked })} className="w-3.5 h-3.5 text-primary rounded border-border" /><span className="text-[13px] font-medium text-foreground">{language === 'en' ? 'Plan is Active' : 'প্ল্যান অ্যাক্টিভ'}</span></label>
                    </div>
                  </>

                ) : isFinancialServiceMode ? (
                  /* ── FINANCIAL / CONSULTING MODE FORM ───────────────── */
                  <>
                    <div className="bg-surface p-1.5 border border-border shadow-md rounded-2xl space-y-3">
                      <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2"><Briefcase className="w-3.5 h-3.5 inline mr-1 text-emerald-400" />{language === 'en' ? 'Service Package Details' : 'সার্ভিস প্যাকেজ বিবরণ'}</label>
                      <div><label className="block text-[11px] font-medium text-muted-foreground mb-1">{language === 'en' ? 'Service / Package Name *' : 'সার্ভিসের নাম *'}</label><input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-background border border-border rounded-lg px-1.5 py-2 text-[13px] focus:border-emerald-500 focus:outline-none transition-colors text-foreground" placeholder={language === 'en' ? 'e.g. Tax Filing & Audit Package' : 'যেমন: ট্যাক্স ফাইলিং প্যাকেজ'} /></div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <div><label className="block text-[11px] font-medium text-muted-foreground mb-1">{language === 'en' ? 'Service Fee (Optional)' : 'সার্ভিস ফি (ঐচ্ছিক)'}</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[13px]">৳</span><input type="number" step="0.01" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} className="w-full bg-background border border-border rounded-lg pl-7 pr-3 py-2 text-[13px] focus:border-emerald-500 focus:outline-none transition-colors text-foreground" placeholder="0.00" /></div></div>
                        <div><label className="block text-[11px] font-medium text-muted-foreground mb-1">{language === 'en' ? 'Engagement Duration' : 'সার্ভিস মেয়াদ'}</label><input type="text" value={formData.attributes?.duration || ''} onChange={e => setFormData((prev: any) => ({ ...prev, attributes: { ...prev.attributes, duration: e.target.value } }))} className="w-full bg-background border border-border rounded-lg px-1.5 py-2 text-[13px] focus:border-emerald-500 focus:outline-none transition-colors text-foreground" placeholder="e.g. 1 Month, 3 Sessions" /></div>
                      </div>
                      <div><label className="block text-[11px] font-medium text-muted-foreground mb-1">{language === 'en' ? 'Lead Consultant' : 'প্রধান কনসালটেন্ট'}</label><input type="text" value={formData.attributes?.consultant || ''} onChange={e => setFormData((prev: any) => ({ ...prev, attributes: { ...prev.attributes, consultant: e.target.value } }))} className="w-full bg-background border border-border rounded-lg px-1.5 py-2 text-[13px] focus:border-emerald-500 focus:outline-none transition-colors text-foreground" placeholder="e.g. Mr. Karim (CA, ACCA)" /></div>
                      <div><label className="block text-[11px] font-medium text-muted-foreground mb-1">{language === 'en' ? 'Deliverables / Scope of Work' : 'কাজের পরিধি'}</label><textarea rows={4} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full bg-background border border-border rounded-lg px-1.5 py-2 text-[13px] focus:border-emerald-500 focus:outline-none resize-none custom-scrollbar transition-colors text-foreground" placeholder={language === 'en' ? 'Describe deliverables, e.g. Monthly balance sheet, Tax return, Advisory sessions...' : 'কাজের বিবরণ লিখুন...'} /></div>
                      <label className="flex items-center gap-1.5 p-1.5 bg-background border border-border rounded-lg cursor-pointer"><input type="checkbox" checked={formData.isActive} onChange={e => setFormData({ ...formData, isActive: e.target.checked })} className="w-3.5 h-3.5 text-primary rounded border-border" /><span className="text-[13px] font-medium text-foreground">{language === 'en' ? 'Package is Active' : 'প্যাকেজ অ্যাক্টিভ'}</span></label>
                    </div>
                  </>

                ) : isHealthcareMode ? (
                  /* ── HEALTHCARE MODE FORM ────────────────────────────── */
                  <>
                    <div className="bg-surface p-1.5 border border-border shadow-md rounded-2xl space-y-3">
                      <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2"><Stethoscope className="w-3.5 h-3.5 inline mr-1 text-teal-400" />{language === 'en' ? 'Doctor / Service Details' : 'ডাক্তার / সার্ভিস বিবরণ'}</label>
                      <div><label className="block text-[11px] font-medium text-muted-foreground mb-1">{language === 'en' ? 'Doctor Name / Service Title *' : 'ডাক্তারের নাম / সার্ভিস *'}</label><input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-background border border-border rounded-lg px-1.5 py-2 text-[13px] focus:border-teal-500 focus:outline-none transition-colors text-foreground" placeholder={language === 'en' ? 'e.g. Dr. Rahman (Cardiologist)' : 'যেমন: ডা. রহমান (হৃদরোগ বিশেষজ্ঞ)'} /></div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <div><label className="block text-[11px] font-medium text-muted-foreground mb-1">{language === 'en' ? 'Consultation Fee (Optional)' : 'পরামর্শ ফি (ঐচ্ছিক)'}</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[13px]">৳</span><input type="number" step="0.01" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} className="w-full bg-background border border-border rounded-lg pl-7 pr-3 py-2 text-[13px] focus:border-teal-500 focus:outline-none transition-colors text-foreground" placeholder="0.00" /></div></div>
                        <div><label className="block text-[11px] font-medium text-muted-foreground mb-1">{language === 'en' ? 'Specialty' : 'বিশেষত্ব'}</label><input type="text" value={formData.attributes?.specialty || ''} onChange={e => setFormData((prev: any) => ({ ...prev, attributes: { ...prev.attributes, specialty: e.target.value } }))} className="w-full bg-background border border-border rounded-lg px-1.5 py-2 text-[13px] focus:border-teal-500 focus:outline-none transition-colors text-foreground" placeholder="Cardiologist, GP" /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <div><label className="block text-[11px] font-medium text-muted-foreground mb-1">{language === 'en' ? 'Visiting Hours' : 'ভিজিটিং সময়'}</label><input type="text" value={formData.attributes?.visitingHours || ''} onChange={e => setFormData((prev: any) => ({ ...prev, attributes: { ...prev.attributes, visitingHours: e.target.value } }))} className="w-full bg-background border border-border rounded-lg px-2 py-2 text-[13px] focus:border-teal-500 focus:outline-none transition-colors text-foreground" placeholder="Sat-Thu 9AM–1PM" /></div>
                        <div><label className="block text-[11px] font-medium text-muted-foreground mb-1">{language === 'en' ? 'Chamber / Room' : 'চেম্বার'}</label><input type="text" value={formData.attributes?.clinicRoom || ''} onChange={e => setFormData((prev: any) => ({ ...prev, attributes: { ...prev.attributes, clinicRoom: e.target.value } }))} className="w-full bg-background border border-border rounded-lg px-2 py-2 text-[13px] focus:border-teal-500 focus:outline-none transition-colors text-foreground" placeholder="Room 4, 2nd Floor" /></div>
                      </div>
                      <div><label className="block text-[11px] font-medium text-muted-foreground mb-1">{language === 'en' ? 'Profile / Description' : 'বিবরণ'}</label><textarea rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full bg-background border border-border rounded-lg px-1.5 py-2 text-[13px] focus:border-teal-500 focus:outline-none resize-none custom-scrollbar transition-colors text-foreground" placeholder={language === 'en' ? 'MBBS, MD, 15 years experience...' : 'যোগ্যতা ও অভিজ্ঞতা লিখুন...'} /></div>
                    </div>
                  </>

                ) : isEducationMode ? (
                  /* ── EDUCATION MODE FORM ─────────────────────────────── */
                  <>
                    <div className="bg-surface p-1.5 border border-border shadow-md rounded-2xl space-y-3">
                      <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2"><GraduationCap className="w-3.5 h-3.5 inline mr-1 text-purple-400" />{language === 'en' ? 'Course / Batch Details' : 'কোর্স / ব্যাচ বিবরণ'}</label>
                      <div><label className="block text-[11px] font-medium text-muted-foreground mb-1">{language === 'en' ? 'Course / Batch Name *' : 'কোর্সের নাম *'}</label><input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-background border border-border rounded-lg px-1.5 py-2 text-[13px] focus:border-purple-500 focus:outline-none transition-colors text-foreground" placeholder={language === 'en' ? 'e.g. Full-Stack Web Dev Batch 12' : 'যেমন: ফুল-স্ট্যাক ওয়েব ডেভ ব্যাচ ১২'} /></div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <div><label className="block text-[11px] font-medium text-muted-foreground mb-1">{language === 'en' ? 'Course Fee (Optional)' : 'কোর্স ফি (ঐচ্ছিক)'}</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[13px]">৳</span><input type="number" step="0.01" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} className="w-full bg-background border border-border rounded-lg pl-7 pr-3 py-2 text-[13px] focus:border-purple-500 focus:outline-none transition-colors text-foreground" placeholder="0.00" /></div></div>
                        <div><label className="block text-[11px] font-medium text-muted-foreground mb-1">{language === 'en' ? 'Duration' : 'মেয়াদ'}</label><input type="text" value={formData.attributes?.duration || ''} onChange={e => setFormData((prev: any) => ({ ...prev, attributes: { ...prev.attributes, duration: e.target.value } }))} className="w-full bg-background border border-border rounded-lg px-1.5 py-2 text-[13px] focus:border-purple-500 focus:outline-none transition-colors text-foreground" placeholder="3 Months" /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <div><label className="block text-[11px] font-medium text-muted-foreground mb-1"><Calendar className="w-3 h-3 inline" /> {language === 'en' ? 'Batch Schedule' : 'ব্যাচ শিডিউল'}</label><input type="text" value={formData.attributes?.batchSchedule || ''} onChange={e => setFormData((prev: any) => ({ ...prev, attributes: { ...prev.attributes, batchSchedule: e.target.value } }))} className="w-full bg-background border border-border rounded-lg px-2 py-2 text-[13px] focus:border-purple-500 focus:outline-none transition-colors text-foreground" placeholder="Fri-Sat 6–9 PM" /></div>
                        <div><label className="block text-[11px] font-medium text-muted-foreground mb-1">{language === 'en' ? 'Instructor' : 'প্রশিক্ষক'}</label><input type="text" value={formData.attributes?.instructor || ''} onChange={e => setFormData((prev: any) => ({ ...prev, attributes: { ...prev.attributes, instructor: e.target.value } }))} className="w-full bg-background border border-border rounded-lg px-2 py-2 text-[13px] focus:border-purple-500 focus:outline-none transition-colors text-foreground" placeholder="Tanvir Hossain" /></div>
                      </div>
                      <div><label className="block text-[11px] font-medium text-muted-foreground mb-1">{language === 'en' ? 'Certificate / Description' : 'সার্টিফিকেট ও বিবরণ'}</label><textarea rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full bg-background border border-border rounded-lg px-1.5 py-2 text-[13px] focus:border-purple-500 focus:outline-none resize-none custom-scrollbar transition-colors text-foreground" placeholder={language === 'en' ? 'Course overview, certification, requirements...' : 'কোর্সের বিবরণ, সার্টিফিকেট, শর্তাবলি লিখুন...'} /></div>
                    </div>
                  </>

                ) : isManufacturingMode ? (
                  /* ── MANUFACTURING / WHOLESALE MODE FORM ─────────────── */
                  <>
                    <div className="bg-surface p-1.5 border border-border shadow-md rounded-2xl space-y-3">
                      <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2"><Factory className="w-3.5 h-3.5 inline mr-1 text-amber-400" />{language === 'en' ? 'Wholesale Product Details' : 'হোলসেল প্রডাক্ট বিবরণ'}</label>
                      <div><label className="block text-[11px] font-medium text-muted-foreground mb-1">{language === 'en' ? 'Product / Item Name *' : 'পণ্যের নাম *'}</label><input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-background border border-border rounded-lg px-1.5 py-2 text-[13px] focus:border-amber-500 focus:outline-none transition-colors text-foreground" placeholder={language === 'en' ? 'e.g. Industrial Cotton Fabric Roll (100m)' : 'যেমন: ইন্ডাস্ট্রিয়াল কটন ফেব্রিক রোল'} /></div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <div><label className="block text-[11px] font-medium text-muted-foreground mb-1">{language === 'en' ? 'Unit Price (Optional)' : 'একক মূল্য (ঐচ্ছিক)'}</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[13px]">৳</span><input type="number" step="0.01" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} className="w-full bg-background border border-border rounded-lg pl-7 pr-3 py-2 text-[13px] focus:border-amber-500 focus:outline-none transition-colors text-foreground" placeholder="0.00" /></div></div>
                        <div><label className="block text-[11px] font-medium text-muted-foreground mb-1">{language === 'en' ? 'Minimum Order Qty (MOQ)' : 'সর্বনিম্ন অর্ডার (MOQ)'}</label><input type="text" value={formData.attributes?.moq || ''} onChange={e => setFormData((prev: any) => ({ ...prev, attributes: { ...prev.attributes, moq: e.target.value } }))} className="w-full bg-background border border-border rounded-lg px-1.5 py-2 text-[13px] focus:border-amber-500 focus:outline-none transition-colors text-foreground" placeholder="500 pcs" /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <div><label className="block text-[11px] font-medium text-muted-foreground mb-1">{language === 'en' ? 'Material / Grade' : 'উপাদান / গ্রেড'}</label><input type="text" value={formData.attributes?.material || ''} onChange={e => setFormData((prev: any) => ({ ...prev, attributes: { ...prev.attributes, material: e.target.value } }))} className="w-full bg-background border border-border rounded-lg px-2 py-2 text-[13px] focus:border-amber-500 focus:outline-none transition-colors text-foreground" placeholder="100% Cotton, Grade A" /></div>
                        <div><label className="block text-[11px] font-medium text-muted-foreground mb-1">{language === 'en' ? 'Lead Time' : 'উৎপাদন সময়'}</label><input type="text" value={formData.attributes?.leadTime || ''} onChange={e => setFormData((prev: any) => ({ ...prev, attributes: { ...prev.attributes, leadTime: e.target.value } }))} className="w-full bg-background border border-border rounded-lg px-2 py-2 text-[13px] focus:border-amber-500 focus:outline-none transition-colors text-foreground" placeholder="7–14 days" /></div>
                      </div>
                      <div><label className="block text-[11px] font-medium text-muted-foreground mb-1">{language === 'en' ? 'Specifications / Description' : 'বিস্তারিত বিবরণ'}</label><textarea rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full bg-background border border-border rounded-lg px-1.5 py-2 text-[13px] focus:border-amber-500 focus:outline-none resize-none custom-scrollbar transition-colors text-foreground" placeholder={language === 'en' ? 'Technical specs, certifications, packing details...' : 'টেকনিক্যাল স্পেসিফিকেশন লিখুন...'} /></div>
                      <div>
                        <label className="block text-[11px] font-medium text-muted-foreground mb-1">{language === 'en' ? 'Stock Count' : 'স্টক পরিমাণ'}</label>
                        <input type="number" value={formData.stockCount} onChange={e => setFormData({ ...formData, stockCount: parseInt(e.target.value) || 0, trackInventory: true })} className="w-full bg-background border border-border rounded-lg px-1.5 py-2 text-[13px] focus:border-amber-500 focus:outline-none transition-colors text-foreground" placeholder="0" />
                      </div>
                    </div>
                  </>

                ) : isLogisticsMode ? (
                  /* ── LOGISTICS MODE FORM ─────────────────────────────── */
                  <>
                    <div className="bg-surface p-1.5 border border-border shadow-md rounded-2xl space-y-3">
                      <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2"><Truck className="w-3.5 h-3.5 inline mr-1 text-sky-400" />{language === 'en' ? 'Freight Route / Fleet Details' : 'ফ্রেট রুট / যানবাহন বিবরণ'}</label>
                      <div><label className="block text-[11px] font-medium text-muted-foreground mb-1"><Navigation className="w-3 h-3 inline mr-1" />{language === 'en' ? 'Route / Vehicle Name *' : 'রুট / যানবাহন নাম *'}</label><input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-background border border-border rounded-lg px-1.5 py-2 text-[13px] focus:border-sky-500 focus:outline-none transition-colors text-foreground" placeholder={language === 'en' ? 'e.g. Dhaka → Chittagong (Covered Van)' : 'যেমন: ঢাকা → চট্টগ্রাম (কভার্ড ভ্যান)'} /></div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <div><label className="block text-[11px] font-medium text-muted-foreground mb-1">{language === 'en' ? 'Base Freight Rate (Optional)' : 'বেস ভাড়া (ঐচ্ছিক)'}</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[13px]">৳</span><input type="number" step="0.01" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} className="w-full bg-background border border-border rounded-lg pl-7 pr-3 py-2 text-[13px] focus:border-sky-500 focus:outline-none transition-colors text-foreground" placeholder="0.00" /></div></div>
                        <div><label className="block text-[11px] font-medium text-muted-foreground mb-1"><Weight className="w-3 h-3 inline mr-1" />{language === 'en' ? 'Max Capacity (Ton)' : 'সর্বোচ্চ ধারণক্ষমতা'}</label><input type="text" value={formData.attributes?.capacity || ''} onChange={e => setFormData((prev: any) => ({ ...prev, attributes: { ...prev.attributes, capacity: e.target.value } }))} className="w-full bg-background border border-border rounded-lg px-1.5 py-2 text-[13px] focus:border-sky-500 focus:outline-none transition-colors text-foreground" placeholder="5 Ton" /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <div><label className="block text-[11px] font-medium text-muted-foreground mb-1"><Clock className="w-3 h-3 inline mr-1" />{language === 'en' ? 'Transit Time' : 'ডেলিভারি সময়'}</label><input type="text" value={formData.attributes?.transitTime || ''} onChange={e => setFormData((prev: any) => ({ ...prev, attributes: { ...prev.attributes, transitTime: e.target.value } }))} className="w-full bg-background border border-border rounded-lg px-2 py-2 text-[13px] focus:border-sky-500 focus:outline-none transition-colors text-foreground" placeholder="24–48 hrs" /></div>
                        <div><label className="block text-[11px] font-medium text-muted-foreground mb-1">{language === 'en' ? 'Vehicle Type' : 'যানবাহন ধরন'}</label><input type="text" value={formData.attributes?.vehicleType || ''} onChange={e => setFormData((prev: any) => ({ ...prev, attributes: { ...prev.attributes, vehicleType: e.target.value } }))} className="w-full bg-background border border-border rounded-lg px-2 py-2 text-[13px] focus:border-sky-500 focus:outline-none transition-colors text-foreground" placeholder="Covered Van, Flatbed" /></div>
                      </div>
                      <div><label className="block text-[11px] font-medium text-muted-foreground mb-1">{language === 'en' ? 'Description / Notes' : 'বিবরণ'}</label><textarea rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full bg-background border border-border rounded-lg px-1.5 py-2 text-[13px] focus:border-sky-500 focus:outline-none resize-none custom-scrollbar transition-colors text-foreground" placeholder={language === 'en' ? 'Route details, special cargo types, terms...' : 'রুটের বিবরণ, কার্গো টাইপ, শর্তাবলি লিখুন...'} /></div>
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
                          <label className="block text-[11px] font-medium text-muted-foreground mb-1">{language === 'en' ? 'Price (Optional)' : 'মূল্য (ঐচ্ছিক)'}</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[13px]">৳</span>
                            <input type="number" step="0.01" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} className="w-full bg-background border border-border rounded-lg pl-7 pr-3 py-2 text-[13px] focus:border-primary focus:outline-none transition-colors text-foreground" placeholder="0.00" />
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

                  </>
                )}

                {/* Custom Attributes Builder (Rendered for ALL business categories) */}
                <div className="bg-surface p-2.5 border border-border shadow-md rounded-2xl space-y-3 mt-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      {language === 'en' ? 'Custom Attributes & Dynamic Fields' : 'কাস্টম এট্রিবিউট ও ডাইনামিক ফিল্ডস'}
                    </label>
                    <span className="px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-bold rounded-full uppercase tracking-widest">AI Readable</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {language === 'en'
                      ? 'Add custom fields (Dropdown, Text, Textarea, Date, Number, Checkbox). AI will automatically read these fields to answer customer inquiries.'
                      : 'যেকোনো কাস্টম ফিল্ড (ড্রপডাউন, টেক্সট, টেক্সট-এরিয়া, ডেট, নম্বর, চেকপয়েন্ট) যুক্ত করুন। এআই অটোমেটিক ডাটা রিড করে উত্তর দেবে।'}
                  </p>

                  {/* Quick Presets */}
                  <div className="flex flex-wrap gap-1">
                    {(isPropertyMode ? ['area', 'bedrooms', 'bathrooms', 'floor', 'facing']
                      : isHospitalityMode ? ['maxGuests', 'bedType', 'amenities', 'view', 'roomSize']
                      : isTechSoftwareMode ? ['warranty', 'licenseType', 'demoUrl', 'sla', 'maxUsers']
                      : isFinancialServiceMode ? ['duration', 'deliverables', 'consultant', 'pricingTier']
                      : isHealthcareMode ? ['doctorName', 'specialty', 'visitingHours', 'clinicRoom']
                      : isEducationMode ? ['duration', 'batchSchedule', 'instructor', 'certificate']
                      : isManufacturingMode ? ['moq', 'material', 'specifications', 'leadTime']
                      : isLogisticsMode ? ['route', 'capacity', 'freightRate', 'transitTime']
                      : ['Size', 'Color', 'Brand', 'Weight', 'Warranty', 'Expiry Date']
                    ).map(key => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => { setAttrKey(key); }}
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all cursor-pointer ${
                          attrKey === key
                            ? 'bg-primary text-white border-primary'
                            : 'bg-background text-muted-foreground border-border hover:border-primary/50'
                        }`}
                      >
                        + {key}
                      </button>
                    ))}
                  </div>

                  {/* Attribute Builder Form Box */}
                  <div className="bg-background p-3 border border-border rounded-xl space-y-2.5 shadow-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                          {language === 'en' ? 'Field Name / Title *' : 'ফিল্ডের নাম / টাইটেল *'}
                        </label>
                        <input 
                          type="text" 
                          placeholder="e.g. Color, Expiry Date, Warranty" 
                          value={attrKey} 
                          onChange={e => setAttrKey(e.target.value)} 
                          className="w-full bg-surface border border-border rounded-lg px-2.5 py-1.5 text-[12px] focus:border-primary focus:outline-none text-foreground" 
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                          {language === 'en' ? 'Field Type' : 'ফিল্ডের ধরন'}
                        </label>
                        <select 
                          value={attrType} 
                          onChange={(e: any) => {
                            const t = e.target.value;
                            setAttrType(t);
                            if (t === 'checkbox') setAttrValue('Yes');
                            else setAttrValue('');
                          }} 
                          className="w-full bg-surface border border-border rounded-lg px-2.5 py-1.5 text-[12px] focus:border-primary focus:outline-none text-foreground"
                        >
                          <option value="text">📝 Text Box (Short)</option>
                          <option value="textarea">📄 Text Area (Long)</option>
                          <option value="dropdown">🔽 Dropdown (Options)</option>
                          <option value="date">📅 Date Picker</option>
                          <option value="number">🔢 Number</option>
                          <option value="checkbox">☑️ Checkbox (Yes/No)</option>
                        </select>
                      </div>
                    </div>

                    {/* Dropdown Options Input */}
                    {attrType === 'dropdown' && (
                      <div>
                        <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                          {language === 'en' ? 'Dropdown Options (comma separated)' : 'ড্রপডাউন অপশনসমূহ (কমা দিয়ে লিখুন)'}
                        </label>
                        <input 
                          type="text" 
                          placeholder="e.g. Red, Blue, Green, Yellow" 
                          value={attrDropdownOptions} 
                          onChange={e => {
                            setAttrDropdownOptions(e.target.value);
                            const opts = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                            if (opts.length > 0 && !opts.includes(attrValue)) {
                              setAttrValue(opts[0]);
                            }
                          }} 
                          className="w-full bg-surface border border-border rounded-lg px-2.5 py-1.5 text-[12px] focus:border-primary focus:outline-none text-foreground mb-1.5" 
                        />
                      </div>
                    )}

                    {/* Value Input depending on attrType */}
                    <div>
                      <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                        {language === 'en' ? 'Selected / Entered Value' : 'ইনপুট ভ্যালু'}
                      </label>
                      {attrType === 'dropdown' ? (
                        <select 
                          value={attrValue} 
                          onChange={e => setAttrValue(e.target.value)} 
                          className="w-full bg-surface border border-border rounded-lg px-2.5 py-1.5 text-[12px] focus:border-primary focus:outline-none text-foreground"
                        >
                          <option value="">Select Value...</option>
                          {attrDropdownOptions.split(',').map(s => s.trim()).filter(Boolean).map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : attrType === 'textarea' ? (
                        <textarea 
                          rows={2} 
                          placeholder="Enter details..." 
                          value={attrValue} 
                          onChange={e => setAttrValue(e.target.value)} 
                          className="w-full bg-surface border border-border rounded-lg px-2.5 py-1.5 text-[12px] focus:border-primary focus:outline-none resize-none text-foreground" 
                        />
                      ) : attrType === 'date' ? (
                        <input 
                          type="date" 
                          value={attrValue} 
                          onChange={e => setAttrValue(e.target.value)} 
                          className="w-full bg-surface border border-border rounded-lg px-2.5 py-1.5 text-[12px] focus:border-primary focus:outline-none text-foreground" 
                        />
                      ) : attrType === 'number' ? (
                        <input 
                          type="number" 
                          placeholder="0" 
                          value={attrValue} 
                          onChange={e => setAttrValue(e.target.value)} 
                          className="w-full bg-surface border border-border rounded-lg px-2.5 py-1.5 text-[12px] focus:border-primary focus:outline-none text-foreground" 
                        />
                      ) : attrType === 'checkbox' ? (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={attrValue === 'Yes'} 
                            onChange={e => setAttrValue(e.target.checked ? 'Yes' : 'No')} 
                            className="w-4 h-4 text-primary rounded border-border" 
                          />
                          <span className="text-[12px] font-semibold text-foreground">{attrValue === 'Yes' ? 'Yes (Active)' : 'No (Inactive)'}</span>
                        </label>
                      ) : (
                        <input 
                          type="text" 
                          placeholder="Enter value..." 
                          value={attrValue} 
                          onChange={e => setAttrValue(e.target.value)} 
                          className="w-full bg-surface border border-border rounded-lg px-2.5 py-1.5 text-[12px] focus:border-primary focus:outline-none text-foreground" 
                          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddAttribute())} 
                        />
                      )}
                    </div>

                    <button 
                      type="button" 
                      onClick={handleAddAttribute} 
                      className="w-full py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {language === 'en' ? 'Add Custom Attribute' : 'এট্রিবিউট যুক্ত করুন'}
                    </button>
                  </div>

                  {/* Display Saved Custom Attributes */}
                  {Object.keys(formData.attributes || {}).length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                      {Object.entries(formData.attributes).map(([k, v]: any) => (
                        <div key={k} className="flex items-center justify-between p-2.5 bg-background border border-border rounded-lg text-[12px] group shadow-sm">
                          <div className="truncate pr-2">
                            <span className="text-muted-foreground font-semibold">{k}:</span> <span className="font-bold text-foreground">{String(v)}</span>
                          </div>
                          <button type="button" onClick={() => handleRemoveAttribute(k)} className="text-muted-foreground hover:text-red-500 p-1 rounded transition-colors shrink-0 cursor-pointer">
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
