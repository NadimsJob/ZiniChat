'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { useLanguage } from '@/components/LanguageProvider';
import { Loader2, Building, User, MapPin, Phone, Users, Briefcase } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function OnboardingPage() {
  const router = useRouter();
  const { language } = useLanguage();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const [businessNatures, setBusinessNatures] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    brandName: '',
    address: '',
    phoneNo: '',
    ownerName: '',
    employeeCount: '1-10',
    businessNature: ''
  });

  useEffect(() => {
    const init = async () => {
      try {
        const token = Cookies.get('access_token');
        if (!token) {
          router.push('/login');
          return;
        }

        // Fetch user to pre-fill owner name and check if already onboarded
        const userRes = await fetch(`${API}/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (userRes.ok) {
          const userData = await userRes.json();
          if (userData.tenant?.isOnboarded) {
            router.push('/dashboard');
            return;
          }
          setFormData(prev => ({ ...prev, ownerName: userData.name || '' }));
        }

        // Fetch business natures
        const bnRes = await fetch(`${API}/business-natures`);
        if (bnRes.ok) {
          const natures = await bnRes.json();
          const activeNatures = natures.filter((n: any) => n.isActive);
          setBusinessNatures(activeNatures);
          if (activeNatures.length > 0) {
            setFormData(prev => ({ ...prev, businessNature: activeNatures[0].name }));
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/auth/onboarding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        // Force reload to update layout state and unread badges
        window.location.href = '/dashboard';
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to complete onboarding');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto my-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
          {language === 'en' ? 'Welcome to ZiniChat!' : 'জিনিচ্যাটে স্বাগতম!'}
        </h1>
        <p className="text-slate-500 dark:text-zinc-400">
          {language === 'en' 
            ? 'Let\'s complete your business profile to get started.'
            : 'শুরু করার জন্য আপনার বিজনেস প্রোফাইল সম্পূর্ণ করুন।'}
        </p>
      </div>

      <div className="bg-white dark:bg-[#0f0f11] rounded-3xl p-6 md:p-8 shadow-xl shadow-primary/5 border border-slate-200 dark:border-zinc-800 relative overflow-hidden">
        
        {/* Decorative background element */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Owner Name */}
            <div>
              <label className="block text-sm font-semibold mb-1.5 text-slate-700 dark:text-zinc-300">
                {language === 'en' ? 'Owner Name' : 'মালিকের নাম'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="w-4 h-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  required
                  value={formData.ownerName}
                  onChange={e => setFormData({ ...formData, ownerName: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 transition-all text-slate-900 dark:text-white"
                  placeholder="John Doe"
                />
              </div>
            </div>

            {/* Brand Name */}
            <div>
              <label className="block text-sm font-semibold mb-1.5 text-slate-700 dark:text-zinc-300">
                {language === 'en' ? 'Brand Name' : 'ব্র্যান্ডের নাম'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Building className="w-4 h-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  required
                  value={formData.brandName}
                  onChange={e => setFormData({ ...formData, brandName: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 transition-all text-slate-900 dark:text-white"
                  placeholder="Acme Clothing"
                />
              </div>
            </div>

            {/* Phone No */}
            <div>
              <label className="block text-sm font-semibold mb-1.5 text-slate-700 dark:text-zinc-300">
                {language === 'en' ? 'Phone Number' : 'ফোন নম্বর'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="w-4 h-4 text-slate-400" />
                </div>
                <input
                  type="tel"
                  required
                  value={formData.phoneNo}
                  onChange={e => setFormData({ ...formData, phoneNo: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 transition-all text-slate-900 dark:text-white"
                  placeholder="+8801XXXXXXXXX"
                />
              </div>
            </div>

            {/* Employee Count */}
            <div>
              <label className="block text-sm font-semibold mb-1.5 text-slate-700 dark:text-zinc-300">
                {language === 'en' ? 'No. of Employees' : 'কর্মীর সংখ্যা'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Users className="w-4 h-4 text-slate-400" />
                </div>
                <select
                  value={formData.employeeCount}
                  onChange={e => setFormData({ ...formData, employeeCount: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 transition-all text-slate-900 dark:text-white appearance-none"
                >
                  <option value="1-10">1 - 10</option>
                  <option value="11-50">11 - 50</option>
                  <option value="51-200">51 - 200</option>
                  <option value="200+">200+</option>
                </select>
              </div>
            </div>

            {/* Business Nature */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold mb-1.5 text-slate-700 dark:text-zinc-300">
                {language === 'en' ? 'Business Nature' : 'ব্যবসার ধরন'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Briefcase className="w-4 h-4 text-slate-400" />
                </div>
                <select
                  required
                  value={formData.businessNature}
                  onChange={e => setFormData({ ...formData, businessNature: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 transition-all text-slate-900 dark:text-white appearance-none"
                >
                  <option value="" disabled>Select your business nature</option>
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
              <label className="block text-sm font-semibold mb-1.5 text-slate-700 dark:text-zinc-300">
                {language === 'en' ? 'Business Address' : 'ব্যবসার ঠিকানা'}
              </label>
              <div className="relative">
                <div className="absolute top-3 left-3 pointer-events-none">
                  <MapPin className="w-4 h-4 text-slate-400" />
                </div>
                <textarea
                  required
                  rows={2}
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 transition-all text-slate-900 dark:text-white resize-none"
                  placeholder="Road 1, Block A, Dhaka"
                />
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              {language === 'en' ? 'Complete Profile & Continue' : 'প্রোফাইল সম্পন্ন করুন এবং চালিয়ে যান'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
