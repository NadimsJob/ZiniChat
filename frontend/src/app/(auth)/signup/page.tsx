'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import Link from 'next/link';
import Script from 'next/script';
import { Eye, EyeOff, Building, User, Mail, Phone, Lock, Briefcase, MapPin, Users, ChevronDown, Check, KeyRound, ArrowLeft, RefreshCw, Globe } from 'lucide-react';
import { useMetaPixel } from '@/context/MetaPixelContext';
import { useGoogleAnalytics } from '@/context/GoogleAnalyticsContext';
import { useLanguage } from '@/components/LanguageProvider';
import { COUNTRIES, DEFAULT_COUNTRY, CountryInfo, findCountryByNameOrCode } from '@/lib/countryData';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function SignupPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const { trackEvent } = useMetaPixel();
  const { trackEvent: trackGaEvent } = useGoogleAnalytics();

  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const [selectedCountry, setSelectedCountry] = useState<CountryInfo | null>(null);
  const [countryOpen, setCountryOpen] = useState(false);
  const countryRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    businessName: '',
    fullName: '',
    email: '',
    country: '',
    phoneNo: '',
    password: '',
    confirmPassword: '',
    employeeCount: '1-10',
    businessNature: '', // Defaults to blank so user must select
    address: '',
  });

  const [bnOpen, setBnOpen] = useState(false);
  const bnRef = useRef<HTMLDivElement>(null);
  const [ecOpen, setEcOpen] = useState(false);
  const ecRef = useRef<HTMLDivElement>(null);

  const employeeOptions = ['1-10', '11-50', '51-200', '200+'];

  // Handle Country Selection & Auto Phone Prefix update
  const handleCountrySelect = (country: CountryInfo) => {
    setSelectedCountry(country);
    setCountryOpen(false);
    setFormData((prev) => {
      let currentPhone = prev.phoneNo.trim();
      const oldCountry = COUNTRIES.find((c) => currentPhone.startsWith(c.dialCode));
      let restOfPhone = '';
      if (oldCountry) {
        restOfPhone = currentPhone.slice(oldCountry.dialCode.length);
      } else {
        restOfPhone = currentPhone.replace(/^\+\d+/, '');
      }
      return {
        ...prev,
        country: country.name,
        phoneNo: `${country.dialCode}${restOfPhone}`,
      };
    });
  };

  // Resend OTP Countdown Timer
  useEffect(() => {
    if (resendTimer > 0) {
      const interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [resendTimer]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bnRef.current && !bnRef.current.contains(e.target as Node)) setBnOpen(false);
      if (ecRef.current && !ecRef.current.contains(e.target as Node)) setEcOpen(false);
      if (countryRef.current && !countryRef.current.contains(e.target as Node)) setCountryOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [businessNatures, setBusinessNatures] = useState<any[]>([]);

  const [googleConfig, setGoogleConfig] = useState<{ isEnabled: boolean; clientId: string }>({
    isEnabled: false,
    clientId: '',
  });

  // Fetch Google config and Business Natures on mount
  useEffect(() => {
    const fetchGoogleConfig = async () => {
      try {
        const res = await fetch(`${API}/auth/google/config`);
        if (res.ok) {
          const data = await res.json();
          setGoogleConfig(data);
        }
      } catch (err) {
        console.error('Failed to load Google Auth configuration:', err);
      }
    };

    const fetchBusinessNatures = async () => {
      try {
        const res = await fetch(`${API}/business-natures`);
        if (res.ok) {
          const natures = await res.json();
          const active = natures.filter((n: any) => n.isActive);
          const normal = active.filter(
            (n: any) => !n.name?.toLowerCase().includes('other') && !n.nameBn?.toLowerCase().includes('অন্যান্য')
          );
          const others = active.filter(
            (n: any) => n.name?.toLowerCase().includes('other') || n.nameBn?.toLowerCase().includes('অন্যান্য')
          );
          setBusinessNatures([...normal, ...others]);
        }
      } catch (err) {
        console.error('Failed to load business natures:', err);
      }
    };

    fetchGoogleConfig();
    fetchBusinessNatures();

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlEmail = params.get('email');
      const urlStep = params.get('step');
      if (urlEmail) {
        setFormData((prev) => ({ ...prev, email: urlEmail }));
      }
      if (urlStep === 'otp') {
        setStep('otp');
        setResendTimer(60);
      }
    }
  }, []);

  const handleGoogleCallback = async (response: any) => {
    setError('');
    setLoading(true);
    let planId = '';
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      planId = params.get('planId') || '';
    }
    try {
      const res = await fetch(`${API}/auth/google/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential, planId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Google authentication failed');
      }
      const data = await res.json();
      Cookies.set('access_token', data.access_token, { expires: 7 });
      Cookies.set('user_role', data.user.role, { expires: 7 });
      if (planId) {
        router.push(`/dashboard/billing/pay-mfs?planId=${planId}`);
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Google Auth failed');
    } finally {
      setLoading(false);
    }
  };

  const initGoogleSignIn = () => {
    if (typeof window !== 'undefined' && (window as any).google && googleConfig.isEnabled && googleConfig.clientId) {
      try {
        (window as any).google.accounts.id.initialize({
          client_id: googleConfig.clientId,
          callback: handleGoogleCallback,
          ux_mode: 'popup',
        });
        const container = document.getElementById('google-signup-div');
        const availableWidth = container?.offsetWidth || 320;
        // Keep within 200px - 380px range to perfectly fit mobile & desktop without overflowing
        const containerWidth = Math.max(200, Math.min(availableWidth, 380));

        (window as any).google.accounts.id.renderButton(container, {
          theme: 'outline',
          size: 'large',
          width: containerWidth,
          text: 'signup_with',
          alignment: 'center',
        });
      } catch (err) {
        console.error('Error rendering Google button:', err);
      }
    }
  };

  useEffect(() => {
    if (googleConfig.isEnabled && googleConfig.clientId && step === 'form') {
      initGoogleSignIn();
    }
  }, [googleConfig, step]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCountry || !formData.country) {
      setError(isBn ? 'অনুগ্রহ করে দেশ নির্বাচন করুন' : 'Please select your Country');
      return;
    }

    if (!formData.businessNature) {
      setError(isBn ? 'অনুগ্রহ করে ব্যবসার ধরন নির্বাচন করুন' : 'Please select your Business Nature');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError(isBn ? 'পাসওয়ার্ড মিলছে না' : 'Passwords do not match');
      return;
    }

    setLoading(true);

    // Track analytics events
    trackEvent('Lead', { email: formData.email });
    trackGaEvent('sign_up', { method: 'email', email: formData.email });

    let planId = '';
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      planId = params.get('planId') || '';
    }

    // Build clean payload
    const { confirmPassword, ...rest } = formData;
    const payload = { ...rest, planId };

    try {
      const res = await fetch(`${API}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        const msg = Array.isArray(errorData.message)
          ? errorData.message.join(', ')
          : errorData.message || 'Signup failed';
        throw new Error(msg);
      }

      const data = await res.json();

      if (data.requiresOtp) {
        setStep('otp');
        setResendTimer(60);
      }
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!otp || otp.trim().length !== 6) {
      setError('Please enter the 6-digit OTP code / ৬-ডিজিটের কোড দিন');
      return;
    }

    setOtpLoading(true);

    let planId = '';
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      planId = params.get('planId') || '';
    }

    try {
      const res = await fetch(`${API}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, otp: otp.trim() }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Verification failed');
      }

      const data = await res.json();

      // Track conversion
      trackEvent('SignUp', { email: formData.email, tenantId: data?.user?.tenantId });

      Cookies.set('access_token', data.access_token, { expires: 7 });
      Cookies.set('user_role', data.user.role, { expires: 7 });

      if (planId) {
        router.push(`/dashboard/billing/pay-mfs?planId=${planId}`);
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setError('');
    setOtpLoading(true);
    try {
      const res = await fetch(`${API}/auth/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to resend code');
      }

      setResendTimer(60);
    } catch (err: any) {
      setError(err.message || 'Failed to resend code');
    } finally {
      setOtpLoading(false);
    }
  };

  const inputClass =
    'w-full bg-background border border-surface-hover rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm';

  const Req = () => <span className="text-red-500 ml-0.5">*</span>;

  if (step === 'otp') {
    return (
      <div>
        <button
          type="button"
          onClick={() => {
            setStep('form');
            setError('');
          }}
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> {isBn ? 'ব্যাকে যান' : 'Back to Signup'}
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-3 text-primary">
            <KeyRound className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-1">
            {isBn ? 'ইমেইল ভেরিফিকেশন' : 'Verify Your Email'}
          </h2>
          <p className="text-xs text-zinc-400">
            {isBn ? (
              <>আমরা <span className="text-primary font-semibold">{formData.email}</span> ঠিকানায় ৬-ডিজিটের ভেরিফিকেশন কোড পাঠিয়েছি (মেয়াদ ১৫ মিনিট)।</>
            ) : (
              <>We sent a 6-digit verification code to <span className="text-primary font-semibold">{formData.email}</span> (valid for 15 mins).</>
            )}
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-xl mb-4 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1 text-center text-zinc-400">
              {isBn ? '৬-ডিজিটের ভেরিফিকেশন কোড' : '6-Digit OTP Code'}<Req />
            </label>
            <input
              type="text"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              required
              className="w-full bg-background border border-surface-hover rounded-xl text-center py-3 text-2xl font-mono tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              placeholder="000000"
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={otpLoading || otp.length !== 6}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 rounded-xl transition-all hover:scale-[1.01] disabled:opacity-50 disabled:hover:scale-100 shadow-lg shadow-primary/20 text-sm flex items-center justify-center gap-2"
          >
            {otpLoading ? (isBn ? 'ভেরিফাই হচ্ছে...' : 'Verifying...') : (isBn ? 'ভেরিফাই ও সাবমিট' : 'Verify & Continue')}
          </button>
        </form>

        <div className="mt-5 text-center text-xs text-zinc-400">
          {isBn ? 'কোড পাননি?' : "Didn't receive code?"}{' '}
          <button
            type="button"
            onClick={handleResendOtp}
            disabled={resendTimer > 0 || otpLoading}
            className="text-primary hover:underline font-semibold disabled:opacity-50 disabled:no-underline inline-flex items-center gap-1 ml-1"
          >
            <RefreshCw className={`w-3 h-3 ${otpLoading ? 'animate-spin' : ''}`} />
            {resendTimer > 0 
              ? (isBn ? `${resendTimer}s পর পুনরায় কোড পাঠানো যাবে` : `Resend available in ${resendTimer}s`) 
              : (isBn ? 'পুনরায় কোড পাঠান' : 'Resend Code')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4 text-center">
        {isBn ? 'আপনার অ্যাকাউন্ট তৈরি করুন' : 'Create your account'}
      </h2>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-xl mb-4 text-sm text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Business Name */}
        <div>
          <label className="block text-xs font-semibold mb-1 text-zinc-400">
            {isBn ? 'ব্যবসার নাম' : 'Business Name'}<Req />
          </label>
          <div className="relative">
            <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
            <input
              type="text"
              value={formData.businessName}
              onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
              required
              className={inputClass}
              placeholder={isBn ? 'আপনার ব্যবসার নাম' : 'Acme Corp'}
              autoComplete="off"
            />
          </div>
        </div>

        {/* Country & Phone — side by side */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Country Selection Dropdown */}
          <div>
            <label className="block text-xs font-semibold mb-1 text-zinc-400">
              {isBn ? 'দেশ' : 'Country'}<Req />
            </label>
            <div className="relative" ref={countryRef}>
              <button
                type="button"
                onClick={() => setCountryOpen((v) => !v)}
                className={`w-full flex items-center gap-2 bg-background border ${
                  countryOpen ? 'border-primary/50 ring-2 ring-primary/30' : 'border-surface-hover'
                } rounded-xl px-3 py-2.5 text-sm transition-all text-left`}
              >
                <span className="text-base shrink-0">{selectedCountry ? selectedCountry.flag : '🌐'}</span>
                <span className={`flex-1 truncate ${selectedCountry ? 'text-foreground font-medium' : 'text-zinc-500'}`}>
                  {selectedCountry 
                    ? `${isBn ? selectedCountry.nameBn : selectedCountry.name} (${selectedCountry.dialCode})` 
                    : (isBn ? 'দেশ নির্বাচন করুন' : 'Select Country')}
                </span>
                <ChevronDown className={`w-4 h-4 text-zinc-500 shrink-0 transition-transform ${countryOpen ? 'rotate-180' : ''}`} />
              </button>

              {countryOpen && (
                <div className="absolute z-50 top-full mt-1 w-full bg-surface border border-surface-hover rounded-xl shadow-xl overflow-hidden max-h-64 overflow-y-auto">
                  {COUNTRIES.map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => handleCountrySelect(c)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-primary/10 transition-colors text-left ${
                        selectedCountry?.code === c.code ? 'text-primary font-semibold' : 'text-foreground'
                      }`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <span className="text-base shrink-0">{c.flag}</span>
                        <span className="truncate">{isBn ? c.nameBn : c.name}</span>
                      </span>
                      <span className="text-zinc-500 font-mono shrink-0 ml-1">{c.dialCode}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Phone No */}
          <div>
            <label className="block text-xs font-semibold mb-1 text-zinc-400">
              {isBn ? 'ফোন নম্বর' : 'Phone No.'}<Req />
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
              <input
                type="tel"
                value={formData.phoneNo}
                onChange={(e) => setFormData({ ...formData, phoneNo: e.target.value })}
                required
                className={inputClass}
                placeholder={selectedCountry ? `${selectedCountry.dialCode}1700000000` : (isBn ? 'ফোন নম্বর লিখুন' : 'Enter phone number')}
                autoComplete="tel"
              />
            </div>
          </div>
        </div>

        {/* Full Name + Email — side by side */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold mb-1 text-zinc-400">
              {isBn ? 'আপনার নাম' : 'Your Full Name'}<Req />
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
                className={inputClass}
                placeholder={isBn ? 'আপনার পুরো নাম' : 'John Doe'}
                autoComplete="name"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1 text-zinc-400">
              {isBn ? 'ইমেইল ঠিকানা' : 'Email Address'}<Req />
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className={inputClass}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
          </div>
        </div>

        {/* Employee Count + Business Nature — side by side */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Employee Count */}
          <div>
            <label className="block text-xs font-semibold mb-1 text-zinc-400">
              {isBn ? 'কর্মচারী সংখ্যা' : 'No. of Employees'}
            </label>
            <div className="relative" ref={ecRef}>
              <button
                type="button"
                onClick={() => setEcOpen((v) => !v)}
                className={`w-full flex items-center gap-2 bg-background border ${
                  ecOpen ? 'border-primary/50 ring-2 ring-primary/30' : 'border-surface-hover'
                } rounded-xl px-3 py-2.5 text-sm transition-all text-left`}
              >
                <Users className="w-4 h-4 text-zinc-500 shrink-0" />
                <span className="flex-1 text-foreground">{formData.employeeCount}</span>
                <ChevronDown className={`w-4 h-4 text-zinc-500 shrink-0 transition-transform ${ecOpen ? 'rotate-180' : ''}`} />
              </button>

              {ecOpen && (
                <div className="absolute z-50 top-full mt-1 w-full bg-surface border border-surface-hover rounded-xl shadow-xl overflow-hidden">
                  {employeeOptions.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, employeeCount: opt });
                        setEcOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-primary/10 transition-colors text-left ${
                        formData.employeeCount === opt ? 'text-primary font-semibold' : 'text-foreground'
                      }`}
                    >
                      <span>{opt}</span>
                      {formData.employeeCount === opt && <Check className="w-3.5 h-3.5 text-primary" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Business Nature — custom dropdown */}
          <div>
            <label className="block text-xs font-semibold mb-1 text-zinc-400">
              {isBn ? 'ব্যবসার ধরন' : 'Business Nature'}<Req />
            </label>
            <div className="relative" ref={bnRef}>
              <button
                type="button"
                onClick={() => setBnOpen((v) => !v)}
                className={`w-full flex items-center gap-2 bg-background border ${
                  bnOpen ? 'border-primary/50 ring-2 ring-primary/30' : 'border-surface-hover'
                } rounded-xl px-3 py-2.5 text-sm transition-all text-left`}
              >
                <Briefcase className="w-4 h-4 text-zinc-500 shrink-0" />
                <span className={`flex-1 truncate ${formData.businessNature ? 'text-foreground font-medium' : 'text-zinc-500'}`}>
                  {formData.businessNature || (isBn ? 'ব্যবসার ধরন নির্বাচন করুন' : 'Select Business Nature')}
                </span>
                <ChevronDown className={`w-4 h-4 text-zinc-500 shrink-0 transition-transform ${bnOpen ? 'rotate-180' : ''}`} />
              </button>

              {bnOpen && businessNatures.length > 0 && (
                <div className="absolute z-50 top-full mt-1 w-full bg-surface border border-surface-hover rounded-xl shadow-xl overflow-hidden max-h-72 overflow-y-auto">
                  {businessNatures.map((bn) => (
                    <button
                      key={bn.id}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, businessNature: bn.name });
                        setBnOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-primary/10 transition-colors text-left ${
                        formData.businessNature === bn.name ? 'text-primary font-semibold' : 'text-foreground'
                      }`}
                    >
                      <span>{bn.name}</span>
                      {formData.businessNature === bn.name && <Check className="w-3.5 h-3.5 text-primary" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Business Address */}
        <div>
          <label className="block text-xs font-semibold mb-1 text-zinc-400">
            {isBn ? 'ব্যবসার ঠিকানা' : 'Business Address'} <span className="text-zinc-600 font-normal">({isBn ? 'ঐচ্ছিক' : 'optional'})</span>
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 w-4 h-4 text-zinc-500 pointer-events-none" />
            <textarea
              rows={2}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full bg-background border border-surface-hover rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm resize-none"
              placeholder={isBn ? 'রোড ১, ব্লক এ, ঢাকা' : 'Road 1, Block A, Dhaka'}
              autoComplete="off"
            />
          </div>
        </div>

        {/* Password + Confirm Password — side by side on sm+ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold mb-1 text-zinc-400">
              {isBn ? 'পাসওয়ার্ড' : 'Password'}<Req />
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={6}
                className="w-full bg-background border border-surface-hover rounded-xl pl-10 pr-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
                placeholder=""
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1 text-zinc-400">
              {isBn ? 'পাসওয়ার্ড নিশ্চিত করুন' : 'Confirm Password'}<Req />
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                minLength={6}
                className="w-full bg-background border border-surface-hover rounded-xl pl-10 pr-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
                placeholder=""
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                tabIndex={-1}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2.5 rounded-xl transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 mt-1 shadow-lg shadow-primary/20 text-sm"
        >
          {loading ? (isBn ? 'অ্যাকাউন্ট তৈরি হচ্ছে...' : 'Creating account...') : (isBn ? 'অ্যাকাউন্ট তৈরি করুন' : 'Create Account')}
        </button>
      </form>

      {googleConfig.isEnabled && (
        <>
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-surface-hover"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-surface px-2 text-zinc-400">
                {isBn ? 'অথবা কন্টিনিউ করুন' : 'Or continue with'}
              </span>
            </div>
          </div>

          <div className="w-full flex justify-center items-center text-center overflow-hidden" style={{ minHeight: '44px' }}>
            <div id="google-signup-div" className="w-full flex justify-center items-center text-center [&>div]:mx-auto [&>iframe]:mx-auto"></div>
          </div>
          <Script
            src="https://accounts.google.com/gsi/client"
            onLoad={initGoogleSignIn}
            strategy="afterInteractive"
          />
        </>
      )}

      <div className="mt-4 text-center text-sm text-zinc-400">
        {isBn ? 'ইতিমধ্যে অ্যাকাউন্ট আছে?' : 'Already have an account?'}{' '}
        <Link href="/login" className="text-primary hover:underline font-medium">
          {isBn ? 'সাইন ইন করুন' : 'Sign in instead'}
        </Link>
      </div>
    </div>
  );
}
