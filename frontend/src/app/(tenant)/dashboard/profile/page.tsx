'use client';

import { useState, useEffect, useRef } from 'react';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';
import { useLanguage } from '@/components/LanguageProvider';
import { 
 Camera, 
 User, 
 Mail, 
 Shield, 
 Lock, 
 Eye, 
 EyeOff, 
 CheckCircle2, 
 AlertCircle,
 Loader2,
 Building,
 Phone,
 Users,
 MapPin,
 Briefcase,
 Bell,
  Globe
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export default function TenantProfilePage() {

 const { language } = useLanguage();
 const fileInputRef = useRef<HTMLInputElement>(null);

 const [profile, setProfile] = useState<any>(null);
 const [loading, setLoading] = useState(true);

 // Edit name
 const [editingName, setEditingName] = useState(false);
 const [nameValue, setNameValue] = useState('');
 const [savingName, setSavingName] = useState(false);

 // Avatar upload
 const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
 const [uploadingAvatar, setUploadingAvatar] = useState(false);

 // Password change
 const [currentPassword, setCurrentPassword] = useState('');
 const [newPassword, setNewPassword] = useState('');
 const [confirmPassword, setConfirmPassword] = useState('');
 const [showCurrentPassword, setShowCurrentPassword] = useState(false);
 const [showNewPassword, setShowNewPassword] = useState(false);
 const [showConfirmPassword, setShowConfirmPassword] = useState(false);
 const [changingPassword, setChangingPassword] = useState(false);

 // Push Notifications States
 const [pushSupported, setPushSupported] = useState(false);
 const [pushSubscribed, setPushSubscribed] = useState(false);
 const [pushLoading, setPushLoading] = useState(false);

 // Logo upload
 const [uploadingLogo, setUploadingLogo] = useState(false);
 const [logoPreview, setLogoPreview] = useState<string | null>(null);

 // Business Profile
 const [businessProfile, setBusinessProfile] = useState({
 businessName: '',
 brandName: '',
 address: '',
 country: '',
 phoneNo: '',
 employeeCount: '1-10',
 businessNature: '',
 logoUrl: ''
 });
 const [businessNatures, setBusinessNatures] = useState<any[]>([]);
 const [savingBusiness, setSavingBusiness] = useState(false);

 // Feedback
 const [error, setError] = useState('');
 const [success, setSuccess] = useState('');

 const t = (en: string, bn: string) => language === 'en' ? en : bn;

  useEffect(() => {
    fetchProfile();
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      setPushSupported(true);
      checkPushSubscription();
    }
  }, []);

  const checkPushSubscription = async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setPushSubscribed(!!sub);
    } catch (err) {
      console.error('Error checking push subscription:', err);
    }
  };

  const handlePushToggle = async () => {
    if (!pushSupported) return;
    setPushLoading(true);
    setError('');
    setSuccess('');

    try {
      const reg = await navigator.serviceWorker.ready;
      
      if (pushSubscribed) {
        // Unsubscribe
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
          const token = Cookies.get('access_token');
          await fetch(`${API}/notifications/push-unsubscribe`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ endpoint: sub.endpoint })
          });
        }
        setPushSubscribed(false);
        setSuccess(t('Push notifications disabled successfully.', 'পুশ নোটিফিকেশন সফলভাবে বন্ধ করা হয়েছে।'));
      } else {
        // Request Permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          setError(t('Notification permission denied.', 'নোটিফিকেশন পারমিশন দেওয়া হয়নি।'));
          setPushLoading(false);
          return;
        }

        // Fetch public key
        const token = Cookies.get('access_token');
        const keyRes = await fetch(`${API}/notifications/vapid-public-key`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!keyRes.ok) throw new Error('Failed to fetch VAPID key');
        const { publicKey } = await keyRes.json();

        // Subscribe
        const subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey)
        });

        const p256dhBuffer = subscription.getKey('p256dh');
        const authBuffer = subscription.getKey('auth');
        if (!p256dhBuffer || !authBuffer) throw new Error('Failed to retrieve encryption keys');

        // Send to backend
        const subRes = await fetch(`${API}/notifications/push-subscribe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            endpoint: subscription.endpoint,
            keys: {
              p256dh: arrayBufferToBase64(p256dhBuffer),
              auth: arrayBufferToBase64(authBuffer)
            },
            userAgent: navigator.userAgent
          })
        });

        if (!subRes.ok) throw new Error('Failed to save subscription on server');

        setPushSubscribed(true);
        setSuccess(t('Push notifications enabled successfully!', 'পুশ নোটিফিকেশন সফলভাবে চালু করা হয়েছে!'));
      }
    } catch (err: any) {
      console.error(err);
      setError(t(`Error configuring notifications: ${err.message}`, `নোটিফিকেশন কনফিগার করতে ত্রুটি: ${err.message}`));
    } finally {
      setPushLoading(false);
    }
  };


 const fetchProfile = async () => {
 try {
 const token = Cookies.get('access_token');
 const [res, bnRes] = await Promise.all([
 fetch(`${API}/auth/me`, { headers: { 'Authorization': `Bearer ${token}` } }),
 fetch(`${API}/business-natures`)
 ]);
 
 if (bnRes.ok) {
 const natures = await bnRes.json();
 setBusinessNatures(natures.filter((n: any) => n.isActive));
 }

 if (res.ok) {
 const data = await res.json();
 setProfile(data);
 setNameValue(data.name || '');
 if (data.tenant) {
 setBusinessProfile({
 businessName: data.tenant.businessName || '',
 brandName: data.tenant.brandName || '',
 address: data.tenant.address || '',
 country: data.tenant.country || '',
 phoneNo: data.tenant.phoneNo || '',
 employeeCount: data.tenant.employeeCount || '1-10',
 businessNature: data.tenant.businessNature || '',
 logoUrl: data.tenant.logoUrl || ''
 });
 }
 }
 } catch (err) {
 console.error(err);
 } finally {
 setLoading(false);
 }
 };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);

    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);

      const res = await fetch(`${API}/auth/tenant-logo`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${Cookies.get('access_token')}` },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setBusinessProfile(prev => ({ ...prev, logoUrl: data.logoUrl }));
        const msg = t('Business logo uploaded successfully!', 'বিজনেস লোগো সফলভাবে আপলোড হয়েছে!');
        setSuccess(msg);
        toast.success(msg);
      } else {
        const msg = t('Logo upload failed', 'লোগো আপলোড ব্যর্থ');
        setError(msg);
        toast.error(msg);
      }
    } catch (err) {
      const msg = t('Logo upload failed', 'লোগো আপলোড ব্যর্থ');
      setError(msg);
      toast.error(msg);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSaveBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBusiness(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${API}/auth/onboarding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Cookies.get('access_token')}`,
        },
        body: JSON.stringify(businessProfile),
      });

      if (res.ok) {
        const msg = t('Business profile updated successfully! Reloading...', 'বিজনেস প্রোফাইল সফলভাবে আপডেট করা হয়েছে! পৃষ্ঠাটি রিফ্রেশ হচ্ছে...');
        setSuccess(msg);
        toast.success(msg);
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        const data = await res.json();
        const errMsg = data.message || t('Failed to update business profile', 'বিজনেস প্রোফাইল আপডেট ব্যর্থ');
        setError(errMsg);
        toast.error(errMsg);
      }
    } catch {
      const errMsg = t('An error occurred', 'একটি ত্রুটি ঘটেছে');
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setSavingBusiness(false);
    }
  };

 const handleAvatarClick = () => {
 fileInputRef.current?.click();
 };

 const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file) return;

 // Preview
 const reader = new FileReader();
 reader.onload = () => setAvatarPreview(reader.result as string);
 reader.readAsDataURL(file);

 // Upload
 setUploadingAvatar(true);
 setError('');
 setSuccess('');
 try {
 const formData = new FormData();
 formData.append('avatar', file);

 const res = await fetch(`${API}/auth/profile`, {
 method: 'PATCH',
 headers: { 'Authorization': `Bearer ${Cookies.get('access_token')}` },
 body: formData,
 });

 if (res.ok) {
 const data = await res.json();
 setProfile(data);
 setAvatarPreview(null);
 setSuccess(t('Profile picture updated!', 'প্রোফাইল ছবি আপডেট হয়েছে!'));
 } else {
 const data = await res.json();
 setError(data.message || t('Failed to upload image', 'ছবি আপলোড ব্যর্থ'));
 }
 } catch {
 setError(t('Upload failed', 'আপলোড ব্যর্থ'));
 } finally {
 setUploadingAvatar(false);
 }
 };

 const handleSaveName = async () => {
 if (!nameValue.trim()) return;
 setSavingName(true);
 setError('');
 setSuccess('');
 try {
 const formData = new FormData();
 formData.append('name', nameValue.trim());

 const res = await fetch(`${API}/auth/profile`, {
 method: 'PATCH',
 headers: { 'Authorization': `Bearer ${Cookies.get('access_token')}` },
 body: formData,
 });

 if (res.ok) {
 const data = await res.json();
 setProfile(data);
 setEditingName(false);
 setSuccess(t('Name updated!', 'নাম আপডেট হয়েছে!'));
 } else {
 setError(t('Failed to update name', 'নাম আপডেট ব্যর্থ'));
 }
 } catch {
 setError(t('Update failed', 'আপডেট ব্যর্থ'));
 } finally {
 setSavingName(false);
 }
 };

 const handleChangePassword = async (e: React.FormEvent) => {
 e.preventDefault();
 setError('');
 setSuccess('');

 if (newPassword !== confirmPassword) {
 setError(t('New passwords do not match', 'নতুন পাসওয়ার্ড মিলছে না'));
 return;
 }
 if (newPassword.length < 6) {
 setError(t('Password must be at least 6 characters', 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে'));
 return;
 }

 setChangingPassword(true);
 try {
 const res = await fetch(`${API}/auth/change-password`, {
 method: 'PATCH',
 headers: {
 'Content-Type': 'application/json',
 'Authorization': `Bearer ${Cookies.get('access_token')}`,
 },
 body: JSON.stringify({ currentPassword, newPassword }),
 });

 const data = await res.json();
 if (res.ok) {
 setSuccess(t('Password updated successfully!', 'পাসওয়ার্ড সফলভাবে আপডেট হয়েছে!'));
 setCurrentPassword('');
 setNewPassword('');
 setConfirmPassword('');
 } else {
 setError(data.message || t('Failed to update password', 'পাসওয়ার্ড আপডেট ব্যর্থ'));
 }
 } catch {
 setError(t('An error occurred', 'একটি ত্রুটি ঘটেছে'));
 } finally {
 setChangingPassword(false);
 }
 };

 // Auto-hide feedback
 useEffect(() => {
 if (success || error) {
 const timer = setTimeout(() => { setSuccess(''); setError(''); }, 5000);
 return () => clearTimeout(timer);
 }
 }, [success, error]);

 if (loading) {
 return (
 <div className="flex items-center justify-center h-64">
 <Loader2 className="w-8 h-8 animate-spin text-primary" />
 </div>
 );
 }

 if (!profile) {
 return (
 <div className="flex items-center justify-center h-64 text-red-500">
 {t('Failed to load profile', 'প্রোফাইল লোড ব্যর্থ')}
 </div>
 );
 }

 const avatarUrl = avatarPreview || (profile.profilePicUrl ? `${API}${profile.profilePicUrl}` : null);

 return (
 <div className="max-w-3xl mx-auto space-y-4 px-1.5 py-2.5 animate-in fade-in slide-in-from-bottom-4 duration-500">

 {/* Page Header */}
 <div>
 <h1 className="text-2xl font-bold tracking-tight text-foreground ">
 {t('My Profile', 'আমার প্রোফাইল')}
 </h1>
 <p className="text-slate-500 text-[13px] mt-1">
 {t('Manage your account settings, profile picture and password.', 'আপনার অ্যাকাউন্ট সেটিংস, প্রোফাইল ছবি এবং পাসওয়ার্ড পরিচালনা করুন।')}
 </p>
 </div>

 {/* Feedback Toasts */}
 {success && (
 <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-[13px] font-medium animate-in fade-in slide-in-from-top-2 duration-300">
 <CheckCircle2 className="w-5 h-5 shrink-0" />
 {success}
 </div>
 )}
 {error && (
 <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px] font-medium animate-in fade-in slide-in-from-top-2 duration-300">
 <AlertCircle className="w-5 h-5 shrink-0" />
 {error}
 </div>
 )}

 {/* Profile Card */}
 <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
 
 {/* Banner Gradient */}
 <div className="h-28 bg-gradient-to-r from-primary via-primary/80 to-secondary relative">
 <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIi8+PC9zdmc+')] opacity-50" />
 </div>

 {/* Profile Info */}
 <div className="px-1.5 pb-6 -mt-14">
 {/* Avatar */}
 <div className="relative inline-block group">
 <button
 onClick={handleAvatarClick}
 className="w-28 h-28 rounded-2xl border-4 border-white shadow-lg overflow-hidden bg-primary/10 flex items-center justify-center relative transition-transform hover:scale-105"
 disabled={uploadingAvatar}
 >
 {uploadingAvatar ? (
 <Loader2 className="w-8 h-8 animate-spin text-primary" />
 ) : avatarUrl ? (
 <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
 ) : (
 <span className="text-4xl font-bold text-primary uppercase">
 {profile.name?.charAt(0) || 'U'}
 </span>
 )}
 {/* Hover Overlay */}
 <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl">
 <Camera className="w-6 h-6 text-white" />
 </div>
 </button>
 <input
 ref={fileInputRef}
 type="file"
 accept="image/png,image/jpeg,image/gif,image/webp"
 onChange={handleAvatarChange}
 className="hidden"
 />
 <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center shadow-lg cursor-pointer hover:bg-primary/90 transition-colors" onClick={handleAvatarClick}>
 <Camera className="w-3.5 h-3.5" />
 </div>
 </div>

 {/* Name + Info */}
 <div className="mt-4 space-y-3">
 {/* Editable Name */}
 <div className="flex items-center gap-1.5">
 {editingName ? (
 <div className="flex items-center gap-2">
 <input
 type="text"
 value={nameValue}
 onChange={(e) => setNameValue(e.target.value)}
 className="text-xl font-bold bg-muted/30 border border-border rounded-lg px-1.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground "
 autoFocus
 />
 <button
 onClick={handleSaveName}
 disabled={savingName}
 className="px-1.5 py-1.5 text-[13px] font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
 >
 {savingName ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : t('Save', 'সেভ')}
 </button>
 <button
 onClick={() => { setEditingName(false); setNameValue(profile.name); }}
 className="px-1.5 py-1.5 text-[13px] font-medium text-slate-500 hover:text-slate-700 :text-zinc-300 transition-colors"
 >
 {t('Cancel', 'বাতিল')}
 </button>
 </div>
 ) : (
 <div className="flex items-center gap-2">
 <h2 className="text-xl font-bold text-foreground ">{profile.name}</h2>
 <button
 onClick={() => setEditingName(true)}
 className="text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
 >
 {t('Edit', 'সম্পাদনা')}
 </button>
 </div>
 )}
 </div>

 {/* Info Tags */}
 <div className="flex flex-wrap items-center gap-1.5">
 <div className="flex items-center gap-2 text-[13px] text-slate-500 ">
 <Mail className="w-3.5 h-3.5" />
 {profile.email}
 </div>
 <span className="px-1.5 py-1 text-[11px] rounded-full bg-primary/10 text-primary border border-primary/20 font-bold uppercase tracking-wider flex items-center gap-1.5">
 <Shield className="w-3 h-3" />
 {profile.role}
 </span>
 </div>
 </div>
 </div>
 </div>

 {/* Change Password Section */}
 <div className="bg-card rounded-2xl border border-border shadow-sm p-1.5">
 <div className="flex items-center gap-1.5 mb-6">
 <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
 <Lock className="w-5 h-5" />
 </div>
 <div>
 <h3 className="font-bold text-foreground text-[13px]">
 {t('Change Password', 'পাসওয়ার্ড পরিবর্তন')}
 </h3>
 <p className="text-[11px] text-slate-500 ">
 {t('Update your password to keep your account secure.', 'আপনার অ্যাকাউন্ট সুরক্ষিত রাখতে পাসওয়ার্ড আপডেট করুন।')}
 </p>
 </div>
 </div>

 <form onSubmit={handleChangePassword} className="space-y-5">
 {profile?.hasPassword && (
 <div>
 <label className="block text-[13px] font-semibold mb-2 text-slate-700 ">
 {t('Current Password', 'বর্তমান পাসওয়ার্ড')}
 </label>
 <div className="relative">
 <input
 type={showCurrentPassword ? 'text' : 'password'}
 value={currentPassword}
 onChange={(e) => setCurrentPassword(e.target.value)}
 required
 placeholder={t('Enter current password', 'বর্তমান পাসওয়ার্ড লিখুন')}
 className="w-full bg-muted/30 border border-border rounded-xl px-1.5 py-1 pr-12 text-[13px] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-foreground placeholder:text-slate-400 :text-zinc-500"
 />
 <button
 type="button"
 onClick={() => setShowCurrentPassword(!showCurrentPassword)}
 className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 :text-zinc-300 transition-colors"
 >
 {showCurrentPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
 </button>
 </div>
 </div>
 )}

 {/* New Password Fields */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
 <div>
 <label className="block text-[13px] font-semibold mb-2 text-slate-700 ">
 {t('New Password', 'নতুন পাসওয়ার্ড')}
 </label>
 <div className="relative">
 <input
 type={showNewPassword ? 'text' : 'password'}
 value={newPassword}
 onChange={(e) => setNewPassword(e.target.value)}
 required
 placeholder={t('Enter new password', 'নতুন পাসওয়ার্ড লিখুন')}
 className="w-full bg-muted/30 border border-border rounded-xl px-1.5 py-1 pr-12 text-[13px] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-foreground placeholder:text-slate-400 :text-zinc-500"
 />
 <button
 type="button"
 onClick={() => setShowNewPassword(!showNewPassword)}
 className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 :text-zinc-300 transition-colors"
 >
 {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
 </button>
 </div>
 </div>
 <div>
 <label className="block text-[13px] font-semibold mb-2 text-slate-700 ">
 {t('Confirm New Password', 'নতুন পাসওয়ার্ড নিশ্চিত করুন')}
 </label>
 <div className="relative">
 <input
 type={showConfirmPassword ? 'text' : 'password'}
 value={confirmPassword}
 onChange={(e) => setConfirmPassword(e.target.value)}
 required
 placeholder={t('Confirm new password', 'নতুন পাসওয়ার্ড নিশ্চিত করুন')}
 className="w-full bg-muted/30 border border-border rounded-xl px-1.5 py-1 pr-12 text-[13px] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-foreground placeholder:text-slate-400 :text-zinc-500"
 />
 <button
 type="button"
 onClick={() => setShowConfirmPassword(!showConfirmPassword)}
 className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 :text-zinc-300 transition-colors"
 >
 {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
 </button>
 </div>
 </div>
 </div>

 {/* Password Strength Hint */}
 {newPassword && (
 <div className="flex items-center gap-2 text-[11px]">
 <div className="flex gap-1 flex-1">
 {[1, 2, 3, 4].map((level) => (
 <div
 key={level}
 className={`h-1.5 flex-1 rounded-full transition-colors ${
 newPassword.length >= level * 3
 ? level <= 1 ? 'bg-red-400' : level <= 2 ? 'bg-orange-400' : level <= 3 ? 'bg-yellow-400' : 'bg-emerald-400'
 : 'bg-slate-200 '
 }`}
 />
 ))}
 </div>
 <span className="text-slate-500 ">
 {newPassword.length < 6 ? t('Too short', 'খুব ছোট') : newPassword.length < 9 ? t('Fair', 'মোটামুটি') : newPassword.length < 12 ? t('Good', 'ভালো') : t('Strong', 'শক্তিশালী')}
 </span>
 </div>
 )}

 <div className="pt-2">
 <button
 type="submit"
 disabled={changingPassword}
 className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold py-1 px-1.5 rounded-xl shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 text-[13px]"
 >
 {changingPassword ? (
 <>
 <Loader2 className="w-3.5 h-3.5 animate-spin" />
 {t('Updating...', 'আপডেট হচ্ছে...')}
 </>
 ) : (
 <>
 <Lock className="w-3.5 h-3.5" />
 {t('Update Password', 'পাসওয়ার্ড আপডেট করুন')}
 </>
 )}
 </button>
 </div>
 </form>
 </div>

  {/* Push Notification Settings Section */}
  <div className="bg-card rounded-2xl border border-border shadow-sm p-4">
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          <Bell className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-foreground text-[13px]">
            {t('Push Notifications', 'পুশ নোটিফিকেশন')}
          </h3>
          <p className="text-[11px] text-slate-500">
            {t('Receive real-time alerts on your lock screen with sound.', 'সাউন্ডসহ আপনার লক স্ক্রিনে রিয়েল-টাইম অ্যালার্ট পান।')}
          </p>
        </div>
      </div>
      
      <div>
        {pushSupported ? (
          <button
            onClick={handlePushToggle}
            disabled={pushLoading}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold text-[12px] transition-all duration-300 ${
              pushSubscribed
                ? 'bg-rose-500/20 text-rose-500 hover:bg-rose-500/30'
                : 'bg-primary/20 text-primary hover:bg-primary/30'
            } disabled:opacity-50`}
          >
            {pushLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : pushSubscribed ? (
              t('Disable', 'বন্ধ করুন')
            ) : (
              t('Enable', 'চালু করুন')
            )}
          </button>
        ) : (
          <span className="text-[11px] text-rose-500 font-medium">
            {t('Not supported on this device', 'এই ডিভাইসে সাপোর্ট করে না')}
          </span>
        )}
      </div>
    </div>
  </div>

 {/* Business Profile Section */}
 <div className="bg-card rounded-2xl border border-border shadow-sm p-4">
 <div className="flex items-center gap-1.5 mb-6">
 <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
 <Building className="w-5 h-5" />
 </div>
 <div>
 <h3 className="font-bold text-foreground text-[13px]">
 {t('Business Profile', 'বিজনেস প্রোফাইল')}
 </h3>
 <p className="text-[11px] text-slate-500 ">
 {t('Update your business information and nature.', 'আপনার ব্যবসার তথ্য আপডেট করুন।')}
 </p>
 </div>
 </div>

 <form onSubmit={handleSaveBusiness} className="space-y-4">
    {/* Business Logo Upload */}
    <div className="p-3.5 bg-muted/30 border border-border/80 rounded-xl space-y-2">
      <label className="block text-[12px] font-bold text-foreground">
        {t('Business Logo (Displayed on Landing Page Marquee)', 'ব্যবসার লোগো (ল্যান্ডিং পেজ স্লাইডারে প্রদর্শন হবে)')}
      </label>
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {logoPreview || businessProfile.logoUrl ? (
          <div className="w-16 h-16 rounded-xl border border-slate-300 bg-card p-1 shadow-sm shrink-0 flex items-center justify-center overflow-hidden">
            <img src={logoPreview || (businessProfile.logoUrl.startsWith('http') ? businessProfile.logoUrl : `${API}${businessProfile.logoUrl}`)} alt="Business Logo" className="w-full h-full object-contain" />
          </div>
        ) : (
          <div className="w-16 h-16 rounded-xl border border-dashed border-slate-300 bg-card flex items-center justify-center text-slate-400 text-[10px] font-bold shrink-0">
            No Logo
          </div>
        )}
        <div className="flex-1 w-full space-y-2">
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleLogoUpload}
            className="hidden"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingLogo}
              className="px-3 py-1.5 bg-primary text-white font-bold rounded-lg text-xs hover:bg-primary/90 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
            >
              {uploadingLogo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
              <span>{t('Upload Logo Image', 'লোগো ছবি আপলোড করুন')}</span>
            </button>
          </div>
          <input
            type="text"
            value={businessProfile.logoUrl}
            onChange={(e) => setBusinessProfile({ ...businessProfile, logoUrl: e.target.value })}
            placeholder="https://example.com/logo.png or uploaded path"
            className="w-full bg-card border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
          />
        </div>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {/* Business Name */}
 <div>
 <label className="block text-[13px] font-semibold mb-1.5 text-slate-700 ">
 {t('Business Name', 'ব্যবসার নাম')}
 </label>
 <div className="relative">
 <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
 <Briefcase className="w-3.5 h-3.5 text-slate-400" />
 </div>
 <input
 type="text"
 value={businessProfile.businessName}
 readOnly
 disabled
 className="w-full bg-slate-100 border border-border rounded-xl pl-8 pr-3 py-1.5 text-[13px] text-slate-500 cursor-not-allowed focus:outline-none"
 title={language === 'en' ? 'Contact support to change business name' : 'ব্যবসার নাম পরিবর্তন করতে সাপোর্টে যোগাযোগ করুন'}
 />
 </div>
 </div>

 {/* Brand Name */}
 <div>
 <label className="block text-[13px] font-semibold mb-1.5 text-slate-700 ">
 {t('Brand Name', 'ব্র্যান্ডের নাম')}
 </label>
 <div className="relative">
 <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
 <Building className="w-3.5 h-3.5 text-slate-400" />
 </div>
 <input
 type="text"
 value={businessProfile.brandName}
 readOnly
 disabled
 className="w-full bg-slate-100 border border-border rounded-xl pl-8 pr-3 py-1.5 text-[13px] text-slate-500 cursor-not-allowed focus:outline-none"
 title={language === 'en' ? 'Contact support to change brand name' : 'ব্র্যান্ডের নাম পরিবর্তন করতে সাপোর্টে যোগাযোগ করুন'}
 />
 </div>
 </div>

 {/* Phone No */}
 <div>
 <label className="block text-[13px] font-semibold mb-1.5 text-slate-700 ">
 {t('Phone Number', 'ফোন নম্বর')}
 </label>
 <div className="relative">
 <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
 <Phone className="w-3.5 h-3.5 text-slate-400" />
 </div>
 <input
 type="tel"
 value={businessProfile.phoneNo}
 onChange={e => setBusinessProfile({ ...businessProfile, phoneNo: e.target.value })}
 className="w-full bg-muted/30 border border-border rounded-xl pl-8 pr-3 py-1.5 text-[13px] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-foreground "
 />
 </div>
 </div>

 {/* Employee Count */}
 <div>
 <label className="block text-[13px] font-semibold mb-1.5 text-slate-700 ">
 {t('Employee Count', 'কর্মীর সংখ্যা')}
 </label>
 <div className="relative">
 <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
 <Users className="w-3.5 h-3.5 text-slate-400" />
 </div>
 <select
 value={businessProfile.employeeCount}
 onChange={e => setBusinessProfile({ ...businessProfile, employeeCount: e.target.value })}
 className="w-full bg-muted/30 border border-border rounded-xl pl-8 pr-3 py-1.5 text-[13px] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-foreground appearance-none"
 >
 <option value="1-10">1 - 10</option>
 <option value="11-50">11 - 50</option>
 <option value="51-200">51 - 200</option>
 <option value="200+">200+</option>
 </select>
 </div>
 </div>

   {/* Country (Locked for Tenant, Editable only by Superadmin) */}
  <div>
    <label className="block text-[13px] font-semibold mb-1.5 text-slate-700 flex items-center justify-between">
      <span>{t('Country', 'দেশ')}</span>
      <span className="text-[10px] text-amber-500 font-bold flex items-center gap-1">
        <Lock className="w-3 h-3" /> {t('Superadmin Only', 'সুপার এডমিন পরিমার্জিত')}
      </span>
    </label>
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
        <Globe className="w-3.5 h-3.5 text-slate-400" />
      </div>
      <input
        type="text"
        value={businessProfile.country || 'Bangladesh'}
        readOnly
        disabled
        className="w-full bg-slate-100 dark:bg-zinc-800/50 border border-border rounded-xl pl-8 pr-3 py-1.5 text-[13px] text-slate-500 dark:text-zinc-400 cursor-not-allowed focus:outline-none"
        title={language === 'en' ? 'Country is locked and can only be modified by Superadmin' : 'কান্ট্রি শুধুমাত্র সুপার এডমিন পরিবর্তন করতে পারবেন'}
      />
    </div>
  </div>

{/* Business Nature */}
 <div>
 <label className="block text-[13px] font-semibold mb-1.5 text-slate-700 ">
 {t('Business Nature', 'ব্যবসার ধরন')}
 </label>
 <div className="relative">
 <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
 <Briefcase className="w-3.5 h-3.5 text-slate-400" />
 </div>
 <select
 value={businessProfile.businessNature}
 onChange={e => setBusinessProfile({ ...businessProfile, businessNature: e.target.value })}
 className="w-full bg-muted/30 border border-border rounded-xl pl-8 pr-3 py-1.5 text-[13px] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-foreground appearance-none"
 >
 <option value="" disabled>Select</option>
 {businessNatures.map((bn) => (
 <option key={bn.id} value={bn.name}>
 {language === 'en' ? bn.name : (bn.nameBn || bn.name)}
 </option>
 ))}
 </select>
 </div>
 </div>
 
 {/* Address */}
 <div className="md:col-span-2">
 <label className="block text-[13px] font-semibold mb-1.5 text-slate-700 ">
 {t('Business Address', 'ব্যবসার ঠিকানা')}
 </label>
 <div className="relative">
 <div className="absolute top-2 left-2.5 pointer-events-none">
 <MapPin className="w-3.5 h-3.5 text-slate-400" />
 </div>
 <textarea
 rows={2}
 value={businessProfile.address}
 onChange={e => setBusinessProfile({ ...businessProfile, address: e.target.value })}
 className="w-full bg-muted/30 border border-border rounded-xl pl-8 pr-3 py-1.5 text-[13px] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-foreground resize-none"
 />
 </div>
 </div>
 </div>
 
 <div className="pt-2">
 <button
 type="submit"
 disabled={savingBusiness}
 className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold py-1.5 px-3 rounded-xl shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 text-[13px]"
 >
 {savingBusiness ? (
 <>
 <Loader2 className="w-3.5 h-3.5 animate-spin" />
 {t('Saving...', 'সেভ হচ্ছে...')}
 </>
 ) : (
 <>
 <Building className="w-3.5 h-3.5" />
 {t('Save Business Profile', 'বিজনেস প্রোফাইল সেভ করুন')}
 </>
 )}
 </button>
 </div>
 </form>
 </div>
 </div>
 );
}
