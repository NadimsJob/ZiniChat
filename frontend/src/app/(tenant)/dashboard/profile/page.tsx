'use client';

import { useState, useEffect, useRef } from 'react';
import Cookies from 'js-cookie';
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
  Briefcase
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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

  // Business Profile
  const [businessProfile, setBusinessProfile] = useState({
    brandName: '',
    address: '',
    phoneNo: '',
    employeeCount: '1-10',
    businessNature: ''
  });
  const [businessNatures, setBusinessNatures] = useState<any[]>([]);
  const [savingBusiness, setSavingBusiness] = useState(false);

  // Feedback
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const t = (en: string, bn: string) => language === 'en' ? en : bn;

  useEffect(() => {
    fetchProfile();
  }, []);

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
            brandName: data.tenant.brandName || '',
            address: data.tenant.address || '',
            phoneNo: data.tenant.phoneNo || '',
            employeeCount: data.tenant.employeeCount || '1-10',
            businessNature: data.tenant.businessNature || ''
          });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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
        setSuccess(t('Business profile updated successfully!', 'বিজনেস প্রোফাইল সফলভাবে আপডেট হয়েছে!'));
      } else {
        const data = await res.json();
        setError(data.message || t('Failed to update business profile', 'বিজনেস প্রোফাইল আপডেট ব্যর্থ'));
      }
    } catch {
      setError(t('An error occurred', 'একটি ত্রুটি ঘটেছে'));
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
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {t('My Profile', 'আমার প্রোফাইল')}
        </h1>
        <p className="text-slate-500 dark:text-zinc-400 text-[13px] mt-1">
          {t('Manage your account settings, profile picture and password.', 'আপনার অ্যাকাউন্ট সেটিংস, প্রোফাইল ছবি এবং পাসওয়ার্ড পরিচালনা করুন।')}
        </p>
      </div>

      {/* Feedback Toasts */}
      {success && (
        <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[13px] font-medium animate-in fade-in slide-in-from-top-2 duration-300">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 text-[13px] font-medium animate-in fade-in slide-in-from-top-2 duration-300">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-white dark:bg-[#0f0f11] rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        
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
              className="w-28 h-28 rounded-2xl border-4 border-white dark:border-[#0f0f11] shadow-lg overflow-hidden bg-primary/10 flex items-center justify-center relative transition-transform hover:scale-105"
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
                    className="text-xl font-bold bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-1.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white"
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
                    className="px-1.5 py-1.5 text-[13px] font-medium text-slate-500 hover:text-slate-700 dark:hover:text-zinc-300 transition-colors"
                  >
                    {t('Cancel', 'বাতিল')}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">{profile.name}</h2>
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
              <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-zinc-400">
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
      <div className="bg-white dark:bg-[#0f0f11] rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm p-1.5">
        <div className="flex items-center gap-1.5 mb-6">
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-[13px]">
              {t('Change Password', 'পাসওয়ার্ড পরিবর্তন')}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">
              {t('Update your password to keep your account secure.', 'আপনার অ্যাকাউন্ট সুরক্ষিত রাখতে পাসওয়ার্ড আপডেট করুন।')}
            </p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-5">
          {/* Current Password */}
          <div>
            <label className="block text-[13px] font-semibold mb-2 text-slate-700 dark:text-zinc-300">
              {t('Current Password', 'বর্তমান পাসওয়ার্ড')}
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                placeholder={t('Enter current password', 'বর্তমান পাসওয়ার্ড লিখুন')}
                className="w-full bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-xl px-1.5 py-1 pr-12 text-[13px] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 transition-colors"
              >
                {showCurrentPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* New Password Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <label className="block text-[13px] font-semibold mb-2 text-slate-700 dark:text-zinc-300">
                {t('New Password', 'নতুন পাসওয়ার্ড')}
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder={t('Enter new password', 'নতুন পাসওয়ার্ড লিখুন')}
                  className="w-full bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-xl px-1.5 py-1 pr-12 text-[13px] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 transition-colors"
                >
                  {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-[13px] font-semibold mb-2 text-slate-700 dark:text-zinc-300">
                {t('Confirm New Password', 'নতুন পাসওয়ার্ড নিশ্চিত করুন')}
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder={t('Confirm new password', 'নতুন পাসওয়ার্ড নিশ্চিত করুন')}
                  className="w-full bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-xl px-1.5 py-1 pr-12 text-[13px] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 transition-colors"
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
                        : 'bg-slate-200 dark:bg-zinc-700'
                    }`}
                  />
                ))}
              </div>
              <span className="text-slate-500 dark:text-zinc-400">
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

      {/* Business Profile Section */}
      <div className="bg-white dark:bg-[#0f0f11] rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm p-4">
        <div className="flex items-center gap-1.5 mb-6">
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-[13px]">
              {t('Business Profile', 'বিজনেস প্রোফাইল')}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">
              {t('Update your business information and nature.', 'আপনার ব্যবসার তথ্য আপডেট করুন।')}
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveBusiness} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Brand Name */}
            <div>
              <label className="block text-[13px] font-semibold mb-1.5 text-slate-700 dark:text-zinc-300">
                {t('Brand Name', 'ব্র্যান্ডের নাম')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                  <Building className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <input
                  type="text"
                  value={businessProfile.brandName}
                  onChange={e => setBusinessProfile({ ...businessProfile, brandName: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-xl pl-8 pr-3 py-1.5 text-[13px] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Phone No */}
            <div>
              <label className="block text-[13px] font-semibold mb-1.5 text-slate-700 dark:text-zinc-300">
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
                  className="w-full bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-xl pl-8 pr-3 py-1.5 text-[13px] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Employee Count */}
            <div>
              <label className="block text-[13px] font-semibold mb-1.5 text-slate-700 dark:text-zinc-300">
                {t('Employee Count', 'কর্মীর সংখ্যা')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <select
                  value={businessProfile.employeeCount}
                  onChange={e => setBusinessProfile({ ...businessProfile, employeeCount: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-xl pl-8 pr-3 py-1.5 text-[13px] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-white appearance-none"
                >
                  <option value="1-10">1 - 10</option>
                  <option value="11-50">11 - 50</option>
                  <option value="51-200">51 - 200</option>
                  <option value="200+">200+</option>
                </select>
              </div>
            </div>

            {/* Business Nature */}
            <div>
              <label className="block text-[13px] font-semibold mb-1.5 text-slate-700 dark:text-zinc-300">
                {t('Business Nature', 'ব্যবসার ধরন')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <select
                  value={businessProfile.businessNature}
                  onChange={e => setBusinessProfile({ ...businessProfile, businessNature: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-xl pl-8 pr-3 py-1.5 text-[13px] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-white appearance-none"
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
              <label className="block text-[13px] font-semibold mb-1.5 text-slate-700 dark:text-zinc-300">
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
                  className="w-full bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-xl pl-8 pr-3 py-1.5 text-[13px] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-white resize-none"
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
