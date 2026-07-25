'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import Cookies from 'js-cookie';
import { HardDrive, AlertCircle, Trash2, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function StorageSettingsPage() {
 const { language } = useLanguage();
 const [loading, setLoading] = useState(true);
 const [profile, setProfile] = useState<any>(null);
 const [storageLimitMb, setStorageLimitMb] = useState(500);
 const [storageUsedBytes, setStorageUsedBytes] = useState(0);
 const [clearing, setClearing] = useState(false);

 const fetchProfile = async () => {
 try {
 const token = Cookies.get('access_token');
 const res = await fetch(`${API}/auth/me`, {
 headers: { Authorization: `Bearer ${token}` }
 });
 if (res.ok) {
 const data = await res.json();
 setProfile(data);
 if (data.tenant) {
 setStorageUsedBytes(Number(data.tenant.storageUsedBytes) || 0);
 
 // Get the limit from active plan or custom override
 const activePlan = data.tenant.subscriptions?.[0]?.plan;
 setStorageLimitMb(data.tenant.customStorageLimitMb ?? activePlan?.storageLimitMb ?? 500);
 }
 }
 } catch (err) {
 console.error(err);
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 fetchProfile();
 }, []);

  const handleClearStorage = async () => {
    if (!confirm(language === 'en' ? 'Are you sure you want to delete ALL uploaded files? This action cannot be undone.' : 'আপনি কি নিশ্চিত যে আপনি সমস্ত আপলোড করা ফাইল ডিলিট করতে চান? এই একশনটি বাতিল করা যাবে না।')) {
      return;
    }

    setClearing(true);
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/storage/clear-all`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        }
      });

      if (res.ok) {
        toast.success(language === 'en' ? 'All files deleted successfully!' : 'সমস্ত ফাইল ডিলিট করা হয়েছে!');
        fetchProfile(); // Refresh stats
      } else {
        const err = await res.json();
        toast.error(err.message || 'Failed to clean storage');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setClearing(false);
    }
  };

 if (loading) {
 return <div className="p-6 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
 }

 const limitBytes = storageLimitMb * 1024 * 1024;
 const usagePercentage = Math.min(100, Math.max(0, (storageUsedBytes / limitBytes) * 100));
 const isNearLimit = usagePercentage > 80;

 const formatBytes = (bytes: number) => {
 if (bytes === 0) return '0 B';
 const k = 1024;
 const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
 const i = Math.floor(Math.log(bytes) / Math.log(k));
 return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
 };

 return (
 <div className="max-w-4xl mx-auto space-y-6">
 <div>
 <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
 <HardDrive className="w-6 h-6 text-primary" />
 {language === 'en' ? 'Storage Management' : 'স্টোরেজ ম্যানেজমেন্ট'}
 </h1>
 <p className="text-slate-500 mt-1">
 {language === 'en' 
 ? 'Monitor and clean up your storage usage to avoid hitting limits.' 
 : 'আপনার স্টোরেজ লিমিট চেক করুন এবং স্পেস ক্লিয়ার করুন।'}
 </p>
 </div>

 <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
 <h2 className="text-lg font-bold text-slate-900 mb-4">
 {language === 'en' ? 'Current Usage' : 'বর্তমান ব্যবহার'}
 </h2>

 <div className="flex justify-between text-sm font-medium mb-2">
 <span className="text-slate-600 ">
 {formatBytes(storageUsedBytes)} {language === 'en' ? 'used' : 'ব্যবহৃত'}
 </span>
 <span className="text-slate-600 ">
 {storageLimitMb} MB {language === 'en' ? 'total' : 'মোট'}
 </span>
 </div>

 <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
 <div 
 className={`h-4 transition-all duration-500 ${isNearLimit ? 'bg-red-500' : 'bg-primary'}`}
 style={{ width: `${usagePercentage}%` }}
 />
 </div>

 {isNearLimit && (
 <div className="mt-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-xl border border-red-100 ">
 <AlertCircle className="w-4 h-4" />
 {language === 'en' 
 ? 'You are running out of storage. Please delete some old files or upgrade your plan.' 
 : 'আপনার স্টোরেজ প্রায় শেষের দিকে। কিছু পুরোনো ফাইল ডিলিট করুন অথবা আপগ্রেড করুন।'}
 </div>
 )}
 </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-red-500" />
          {language === 'en' ? 'Clean Up Storage' : 'স্টোরেজ খালি করুন'}
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          {language === 'en' 
            ? 'Click the button below to permanently delete all uploaded files (images, documents, etc.) and free up your storage space.' 
            : 'নিচের বাটনে ক্লিক করে সমস্ত আপলোড করা ফাইল ডিলিট করুন এবং আপনার স্টোরেজ স্পেস খালি করুন।'}
        </p>

        <div className="flex justify-start">
          <button
            onClick={handleClearStorage}
            disabled={clearing}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-600 border border-red-500/20 rounded-xl font-medium hover:bg-red-500 hover:text-white transition-all disabled:opacity-50"
          >
            {clearing ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            {language === 'en' ? 'Clear All Uploaded Files' : 'সমস্ত আপলোডেড ফাইল ডিলিট করুন'}
          </button>
        </div>
      </div>
 </div>
 );
}
