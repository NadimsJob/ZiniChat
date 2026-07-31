'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import Cookies from 'js-cookie';
import { 
  HardDrive, AlertCircle, Trash2, CheckCircle2, MessageSquare, 
  FileText, ShoppingBag, Ticket as TicketIcon, RefreshCw, Calendar, 
  CheckSquare, Square, Search, X, Sparkles, ChevronRight, Filter, Layers 
} from 'lucide-react';
import toast from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type CategoryKey = 'chatMedia' | 'aiDocuments' | 'products' | 'tickets';

interface CategoryStats {
  bytes: number;
  count: number;
}

interface StorageStatsResponse {
  categories: Record<CategoryKey, CategoryStats>;
  totalUsedBytes: number;
  storageLimitMb: number;
  storageLimitBytes: number;
}

interface StorageFileItem {
  id: string;
  url: string;
  name: string;
  sizeBytes: number;
  createdAt: string;
  category: CategoryKey;
}

export default function StorageSettingsPage() {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StorageStatsResponse | null>(null);
  
  // Active Management state
  const [activeCategory, setActiveCategory] = useState<CategoryKey | null>(null);
  const [files, setFiles] = useState<StorageFileItem[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/storage/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      } else {
        toast.error('Failed to load storage statistics');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error fetching storage stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchCategoryFiles = async (category: CategoryKey, olderThanDays?: number) => {
    setLoadingFiles(true);
    try {
      const token = Cookies.get('access_token');
      const url = new URL(`${API}/storage/files`);
      url.searchParams.append('category', category);
      if (olderThanDays) url.searchParams.append('olderThanDays', String(olderThanDays));

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const fileList = await res.json();
        setFiles(fileList);
        setSelectedUrls(new Set());
      } else {
        toast.error('Failed to load category files');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error loading files');
    } finally {
      setLoadingFiles(false);
    }
  };

  const openCategoryManager = (category: CategoryKey) => {
    setActiveCategory(category);
    fetchCategoryFiles(category);
  };

  const handleQuickDeleteOlderThan = async (days: number) => {
    if (!activeCategory) return;

    const categoryName = getCategoryTitle(activeCategory);
    const confirmMsg = language === 'en'
      ? `Are you sure you want to delete all ${categoryName} files older than ${days} days?`
      : `আপনি কি নিশ্চিত যে আপনি ${days} দিনের পুরোনো সমস্ত ${categoryName} ফাইল মুছে ফেলতে চান?`;

    if (!confirm(confirmMsg)) return;

    setActionLoading(true);
    try {
      const token = Cookies.get('access_token');
      // 1. Fetch target files older than X days
      const fetchUrl = `${API}/storage/files?category=${activeCategory}&olderThanDays=${days}`;
      const filesRes = await fetch(fetchUrl, { headers: { Authorization: `Bearer ${token}` } });
      
      if (!filesRes.ok) throw new Error('Failed to query files');
      const targetFiles: StorageFileItem[] = await filesRes.json();

      if (targetFiles.length === 0) {
        toast.success(language === 'en' ? `No files found older than ${days} days` : `${days} দিনের পুরোনো কোনো ফাইল পাওয়া যায়নি`);
        return;
      }

      const targetUrls = targetFiles.map(f => f.url);

      // 2. Post to cleanup endpoint
      const cleanupRes = await fetch(`${API}/storage/cleanup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ urls: targetUrls })
      });

      if (cleanupRes.ok) {
        const result = await cleanupRes.json();
        toast.success(
          language === 'en'
            ? `Successfully deleted ${result.deletedCount} files!`
            : `সফলভাবে ${result.deletedCount}টি ফাইল ডিলিট করা হয়েছে!`
        );
        fetchStats();
        fetchCategoryFiles(activeCategory);
      } else {
        const err = await cleanupRes.json();
        toast.error(err.message || 'Failed to cleanup files');
      }
    } catch (err) {
      toast.error('An error occurred during deletion');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedUrls.size === 0) return;

    const confirmMsg = language === 'en'
      ? `Are you sure you want to delete ${selectedUrls.size} selected files?`
      : `আপনি কি নিশ্চিত যে আপনি নির্বাচিত ${selectedUrls.size}টি ফাইল ডিলিট করতে চান?`;

    if (!confirm(confirmMsg)) return;

    setActionLoading(true);
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/storage/cleanup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ urls: Array.from(selectedUrls) })
      });

      if (res.ok) {
        const result = await res.json();
        toast.success(
          language === 'en'
            ? `Deleted ${result.deletedCount} selected files`
            : `নির্বাচিত ${result.deletedCount}টি ফাইল ডিলিট করা হয়েছে`
        );
        setSelectedUrls(new Set());
        setIsModalOpen(false);
        fetchStats();
        if (activeCategory) fetchCategoryFiles(activeCategory);
      } else {
        const err = await res.json();
        toast.error(err.message || 'Failed to delete selected files');
      }
    } catch (err) {
      toast.error('Error deleting selected files');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSingleDelete = async (url: string) => {
    const confirmMsg = language === 'en'
      ? 'Are you sure you want to delete this file?'
      : 'আপনি কি নিশ্চিত যে আপনি এই ফাইলটি ডিলিট করতে চান?';

    if (!confirm(confirmMsg)) return;

    setActionLoading(true);
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/storage/cleanup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ urls: [url] })
      });

      if (res.ok) {
        toast.success(language === 'en' ? 'File deleted successfully' : 'ফাইল ডিলিট করা হয়েছে');
        
        if (selectedUrls.has(url)) {
          const next = new Set(selectedUrls);
          next.delete(url);
          setSelectedUrls(next);
        }
        
        fetchStats();
        if (activeCategory) fetchCategoryFiles(activeCategory);
      } else {
        const err = await res.json();
        toast.error(err.message || 'Failed to delete file');
      }
    } catch (err) {
      toast.error('Error deleting file');
    } finally {
      setActionLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getCategoryTitle = (key: CategoryKey) => {
    switch (key) {
      case 'chatMedia': return language === 'en' ? 'Chat Media' : 'চ্যাট মিডিয়া';
      case 'aiDocuments': return language === 'en' ? 'AI Documents' : 'এআই ডকুমেন্টস';
      case 'products': return language === 'en' ? 'Product Photos' : 'প্রোডাক্ট ছবি';
      case 'tickets': return language === 'en' ? 'Support Attachments' : 'সাপোর্ট অ্যাটাচমেন্ট';
    }
  };

  const getCategoryColor = (key: CategoryKey) => {
    switch (key) {
      case 'chatMedia': return 'bg-purple-500 border-purple-500 text-purple-500';
      case 'aiDocuments': return 'bg-emerald-500 border-emerald-500 text-emerald-500';
      case 'products': return 'bg-amber-500 border-amber-500 text-amber-500';
      case 'tickets': return 'bg-pink-500 border-pink-500 text-pink-500';
    }
  };

  const getCategoryIcon = (key: CategoryKey) => {
    switch (key) {
      case 'chatMedia': return MessageSquare;
      case 'aiDocuments': return FileText;
      case 'products': return ShoppingBag;
      case 'tickets': return TicketIcon;
    }
  };

  if (loading) {
    return (
      <div className="p-10 flex flex-col justify-center items-center gap-3">
        <RefreshCw className="animate-spin h-8 w-8 text-primary" />
        <p className="text-sm text-muted-foreground">{language === 'en' ? 'Loading Storage Analytics...' : 'স্টোরেজ অ্যানালিটিক্স লোড হচ্ছে...'}</p>
      </div>
    );
  }

  const limitBytes = stats?.storageLimitBytes || 524288000; // 500MB default
  const usedBytes = stats?.totalUsedBytes || 0;
  const usagePercentage = Math.min(100, Math.max(0, (usedBytes / limitBytes) * 100));
  const isNearLimit = usagePercentage > 80;

  const categoriesList: CategoryKey[] = ['chatMedia', 'aiDocuments', 'products', 'tickets'];

  // Filtered files inside selection modal
  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()) || f.url.toLowerCase().includes(searchQuery.toLowerCase()));

  const selectedBytes = Array.from(selectedUrls).reduce((sum, url) => {
    const file = files.find(f => f.url === url);
    return sum + (file?.sizeBytes || 0);
  }, 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6 text-foreground pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <HardDrive className="w-6 h-6 text-primary" />
          {language === 'en' ? 'Smart Storage Manager' : 'স্মার্ট স্টোরেজ ম্যানেজার'}
        </h1>
        <p className="text-sm text-muted-foreground mt-1 font-sans">
          {language === 'en' 
            ? 'Monitor categorized disk usage, perform quick age cleanup, and permanently free up server storage.' 
            : 'ক্যাটাগরি-ভিত্তিক স্টোরেজ ব্যবহার দেখুন, পুরোনো ফাইল ক্লিনআপ করুন এবং সার্ভার স্পেস খালি করুন।'}
        </p>
      </div>

      {/* Google Drive Style Visual Usage Dashboard */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-foreground">
              {language === 'en' ? 'Overall Storage Breakdown' : 'সামগ্রিক স্টোরেজ বিবরণ'}
            </h2>
            <p className="text-xs text-muted-foreground font-sans">
              {formatBytes(usedBytes)} {language === 'en' ? 'used of' : 'ব্যবহৃত / মোট'} {stats?.storageLimitMb || 500} MB ({usagePercentage.toFixed(1)}%)
            </p>
          </div>

          {isNearLimit && (
            <div className="flex items-center gap-1.5 text-xs text-red-500 bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{language === 'en' ? 'Running out of storage!' : 'স্টোরেজ ফুল হয়ে যাচ্ছে!'}</span>
            </div>
          )}
        </div>

        {/* Google Drive Segmented Usage Bar */}
        <div className="w-full bg-muted/60 rounded-full h-4 overflow-hidden flex shadow-inner border border-border/50">
          {categoriesList.map(cat => {
            const catBytes = stats?.categories[cat]?.bytes || 0;
            const catPercent = (catBytes / limitBytes) * 100;
            if (catPercent <= 0) return null;

            return (
              <div 
                key={cat}
                className={`h-full ${getCategoryColor(cat).split(' ')[0]} transition-all duration-500`}
                style={{ width: `${catPercent}%` }}
                title={`${getCategoryTitle(cat)}: ${formatBytes(catBytes)} (${catPercent.toFixed(1)}%)`}
              />
            );
          })}
        </div>

        {/* Legend Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
          {categoriesList.map(cat => {
            const catStats = stats?.categories[cat] || { bytes: 0, count: 0 };
            const catPercent = limitBytes > 0 ? (catStats.bytes / limitBytes) * 100 : 0;
            const Icon = getCategoryIcon(cat);

            return (
              <div key={cat} className="flex items-start gap-2.5 p-2.5 bg-muted/30 rounded-xl border border-border/40">
                <div className={`p-2 rounded-lg bg-card shadow-xs border border-border/50`}>
                  <Icon className={`w-4 h-4 ${getCategoryColor(cat).split(' ')[2]}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-foreground truncate">{getCategoryTitle(cat)}</p>
                  <p className="text-[11px] font-bold text-foreground mt-0.5">{formatBytes(catStats.bytes)}</p>
                  <p className="text-[9.5px] text-muted-foreground font-sans">
                    {catStats.count} {language === 'en' ? 'files' : 'ফাইল'} ({catPercent.toFixed(1)}%)
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Granular Storage Categories Grid */}
      <div>
        <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" />
          {language === 'en' ? 'Categorized Storage Cleanup' : 'ক্যাটাগরি অনুযায়ী স্টোরেজ ক্লিনআপ'}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categoriesList.map(cat => {
            const catStats = stats?.categories[cat] || { bytes: 0, count: 0 };
            const Icon = getCategoryIcon(cat);
            const isSelected = activeCategory === cat;

            return (
              <div 
                key={cat}
                className={`bg-card border rounded-2xl p-5 shadow-xs transition-all ${
                  isSelected ? 'border-primary ring-1 ring-primary/30' : 'border-border hover:border-border/80'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl bg-muted/50 border border-border`}>
                      <Icon className={`w-5 h-5 ${getCategoryColor(cat).split(' ')[2]}`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground text-sm">{getCategoryTitle(cat)}</h3>
                      <p className="text-xs text-muted-foreground font-sans">
                        {catStats.count} {language === 'en' ? 'files stored' : 'ফাইল সংরক্ষিত'} • {formatBytes(catStats.bytes)}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => openCategoryManager(cat)}
                    className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl border transition-colors flex items-center gap-1 cursor-pointer ${
                      isSelected 
                        ? 'bg-primary text-primary-foreground border-primary' 
                        : 'bg-muted/50 hover:bg-muted text-foreground border-border'
                    }`}
                  >
                    <span>{language === 'en' ? 'Manage' : 'ম্যানেজ করুন'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Granular Management Drawer */}
                {isSelected && (
                  <div className="mt-4 pt-4 border-t border-border space-y-3 animate-in fade-in slide-in-from-top-2">
                    <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      {language === 'en' ? 'Quick Cleanup Actions' : 'কুইক ক্লিনআপ একশন'}
                    </p>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleQuickDeleteOlderThan(30)}
                        disabled={actionLoading || catStats.count === 0}
                        className="px-3 py-1.5 text-xs font-medium bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {language === 'en' ? 'Delete files > 30 days old' : '৩০ দিনের পুরোনো ফাইল মুছুন'}
                      </button>

                      <button
                        onClick={() => handleQuickDeleteOlderThan(90)}
                        disabled={actionLoading || catStats.count === 0}
                        className="px-3 py-1.5 text-xs font-medium bg-orange-500/10 text-orange-500 hover:bg-orange-500 hover:text-white border border-orange-500/20 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {language === 'en' ? 'Delete files > 90 days old' : '৯০ দিনের পুরোনো ফাইল মুছুন'}
                      </button>

                      <button
                        onClick={() => setIsModalOpen(true)}
                        disabled={actionLoading || catStats.count === 0}
                        className="px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground border border-primary/20 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
                      >
                        <Filter className="w-3.5 h-3.5" />
                        {language === 'en' ? 'Select specific files...' : 'নির্দিষ্ট ফাইল পছন্দ করুন...'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Granular Specific File Selection Modal */}
      {isModalOpen && activeCategory && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-foreground text-base">
                  {language === 'en' ? `Select Files - ${getCategoryTitle(activeCategory)}` : `ফাইল নির্বাচন করুন - ${getCategoryTitle(activeCategory)}`}
                </h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Subheader Controls */}
            <div className="p-4 bg-muted/20 border-b border-border flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Search input */}
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                <input 
                  type="text"
                  placeholder={language === 'en' ? 'Search by filename...' : 'ফাইল নাম দিয়ে খুঁজুন...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-card border border-border rounded-xl text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Select all & Count */}
              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                <button
                  onClick={() => {
                    if (selectedUrls.size === filteredFiles.length) {
                      setSelectedUrls(new Set());
                    } else {
                      setSelectedUrls(new Set(filteredFiles.map(f => f.url)));
                    }
                  }}
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                >
                  {selectedUrls.size === filteredFiles.length ? (
                    <>
                      <CheckSquare className="w-4 h-4" />
                      {language === 'en' ? 'Deselect All' : 'সব আনচেক করুন'}
                    </>
                  ) : (
                    <>
                      <Square className="w-4 h-4" />
                      {language === 'en' ? 'Select All' : 'সব সিলেক্ট করুন'}
                    </>
                  )}
                </button>

                <span className="text-xs text-muted-foreground font-sans">
                  {selectedUrls.size} {language === 'en' ? 'selected' : 'টি নির্বাচিত'} ({formatBytes(selectedBytes)})
                </span>
              </div>
            </div>

            {/* File List Table */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-[250px] max-h-[450px]">
              {loadingFiles ? (
                <div className="p-8 flex justify-center items-center">
                  <RefreshCw className="animate-spin h-6 w-6 text-primary" />
                </div>
              ) : filteredFiles.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground text-xs">
                  {language === 'en' ? 'No files match your filter.' : 'কোনো ফাইল পাওয়া যায়নি।'}
                </div>
              ) : (
                filteredFiles.map((file) => {
                  const isChecked = selectedUrls.has(file.url);
                  return (
                    <div 
                      key={file.id}
                      onClick={() => {
                        const next = new Set(selectedUrls);
                        if (isChecked) next.delete(file.url);
                        else next.add(file.url);
                        setSelectedUrls(next);
                      }}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-colors cursor-pointer ${
                        isChecked ? 'bg-primary/10 border-primary/40' : 'bg-card border-border hover:bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-primary shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-muted-foreground shrink-0" />
                        )}

                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate max-w-sm" title={file.name}>
                            {file.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-sans flex items-center gap-2 mt-0.5">
                            <span>Uploaded: {new Date(file.createdAt).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>{formatBytes(file.sizeBytes)}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center shrink-0 ml-2 gap-3">
                        <a 
                          href={file.url} 
                          target="_blank" 
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-[11px] text-primary hover:underline font-medium"
                        >
                          {language === 'en' ? 'View' : 'দেখুন'}
                        </a>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSingleDelete(file.url);
                          }}
                          disabled={actionLoading}
                          className="text-red-500 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors disabled:opacity-50"
                          title={language === 'en' ? 'Delete File' : 'ফাইল ডিলিট করুন'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border flex items-center justify-between bg-muted/10">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/80 rounded-xl cursor-pointer"
              >
                {language === 'en' ? 'Cancel' : 'বাতিল'}
              </button>

              <button
                onClick={handleDeleteSelected}
                disabled={selectedUrls.size === 0 || actionLoading}
                className="px-5 py-2 text-xs font-bold bg-red-500 hover:bg-red-600 text-white rounded-xl shadow-xs transition-colors flex items-center gap-2 disabled:opacity-40 cursor-pointer"
              >
                {actionLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                {language === 'en'
                  ? `Delete ${selectedUrls.size} Selected (${formatBytes(selectedBytes)})`
                  : `ডিলিট করুন (${selectedUrls.size}টি - ${formatBytes(selectedBytes)})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
