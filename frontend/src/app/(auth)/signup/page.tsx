'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import Link from 'next/link';
import Script from 'next/script';
import { Eye, EyeOff, Building, User, Mail, Phone, Lock, Briefcase, MapPin, Users, ChevronDown, Check } from 'lucide-react';
import { useMetaPixel } from '@/context/MetaPixelContext';
import { useGoogleAnalytics } from '@/context/GoogleAnalyticsContext';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function SignupPage() {
  const router = useRouter();
  const { trackEvent } = useMetaPixel();
  const { trackEvent: trackGaEvent } = useGoogleAnalytics();

  const [formData, setFormData] = useState({
    businessName: '',
    fullName: '',
    email: '',
    phoneNo: '+880',
    password: '',
    confirmPassword: '',
    employeeCount: '1-10',
    businessNature: '',
    address: '',
  });

  const [bnOpen, setBnOpen] = useState(false);
  const bnRef = useRef<HTMLDivElement>(null);
  const [ecOpen, setEcOpen] = useState(false);
  const ecRef = useRef<HTMLDivElement>(null);

  const employeeOptions = ['1-10', '11-50', '51-200', '200+'];

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bnRef.current && !bnRef.current.contains(e.target as Node)) setBnOpen(false);
      if (ecRef.current && !ecRef.current.contains(e.target as Node)) setEcOpen(false);
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
          setBusinessNatures(active);
          if (active.length > 0) {
            setFormData((prev) => ({ ...prev, businessNature: active[0].name }));
          }
        }
      } catch (err) {
        console.error('Failed to load business natures:', err);
      }
    };

    fetchGoogleConfig();
    fetchBusinessNatures();
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
        const containerWidth = container?.offsetWidth
          ? container.offsetWidth > 400
            ? 400
            : container.offsetWidth
          : 320;
        (window as any).google.accounts.id.renderButton(container, {
          theme: 'outline',
          size: 'large',
          width: containerWidth,
          text: 'signup_with',
        });
      } catch (err) {
        console.error('Error rendering Google button:', err);
      }
    }
  };

  useEffect(() => {
    if (googleConfig.isEnabled && googleConfig.clientId) {
      initGoogleSignIn();
    }
  }, [googleConfig]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match / পাসওয়ার্ড মিলছে না');
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

    // Build clean payload — exclude confirmPassword (frontend-only field)
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
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full bg-background border border-surface-hover rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm';

  // Helper: required star
  const Req = () => <span className="text-red-500 ml-0.5">*</span>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-4 text-center">Create your account</h2>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-xl mb-4 text-sm text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">

        {/* Business Name */}
        <div>
          <label className="block text-xs font-semibold mb-1 text-zinc-400">Business Name<Req /></label>
          <div className="relative">
            <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
            <input
              type="text"
              value={formData.businessName}
              onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
              required
              className={inputClass}
              placeholder="Acme Corp"
              autoComplete="off"
            />
          </div>
        </div>

        {/* Full Name + Phone — side by side on sm+ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold mb-1 text-zinc-400">Your Full Name<Req /></label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
                className={inputClass}
                placeholder="John Doe"
                autoComplete="name"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1 text-zinc-400">Phone No.<Req /></label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
              <input
                type="tel"
                value={formData.phoneNo}
                onChange={(e) => setFormData({ ...formData, phoneNo: e.target.value })}
                required
                className={inputClass}
                placeholder="+8801700000000"
                autoComplete="tel"
              />
            </div>
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs font-semibold mb-1 text-zinc-400">Email Address<Req /></label>
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

        {/* Employee Count + Business Nature — side by side */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Employee Count — custom dropdown */}
          <div>
            <label className="block text-xs font-semibold mb-1 text-zinc-400">No. of Employees</label>
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
            <label className="block text-xs font-semibold mb-1 text-zinc-400">Business Nature<Req /></label>
            <div className="relative" ref={bnRef}>
              <button
                type="button"
                onClick={() => setBnOpen((v) => !v)}
                className={`w-full flex items-center gap-2 bg-background border ${
                  bnOpen ? 'border-primary/50 ring-2 ring-primary/30' : 'border-surface-hover'
                } rounded-xl px-3 py-2.5 text-sm transition-all text-left`}
              >
                <Briefcase className="w-4 h-4 text-zinc-500 shrink-0" />
                <span className={`flex-1 truncate ${formData.businessNature ? 'text-foreground' : 'text-zinc-500'}`}>
                  {formData.businessNature || 'Select type'}
                </span>
                <ChevronDown className={`w-4 h-4 text-zinc-500 shrink-0 transition-transform ${bnOpen ? 'rotate-180' : ''}`} />
              </button>

              {bnOpen && businessNatures.length > 0 && (
                <div className="absolute z-50 top-full mt-1 w-full bg-surface border border-surface-hover rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
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
          <label className="block text-xs font-semibold mb-1 text-zinc-400">Business Address <span className="text-zinc-600 font-normal">(optional)</span></label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 w-4 h-4 text-zinc-500 pointer-events-none" />
            <textarea
              rows={2}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full bg-background border border-surface-hover rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm resize-none"
              placeholder="Road 1, Block A, Dhaka"
              autoComplete="off"
            />
          </div>
        </div>

        {/* Password + Confirm Password — side by side on sm+ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold mb-1 text-zinc-400">Password<Req /></label>
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
            <label className="block text-xs font-semibold mb-1 text-zinc-400">Confirm Password<Req /></label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                minLength={6}
                className="w-full bg-background border border-surface-hover rounded-xl pl-10 pr-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
                placeholder="••••••••"
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
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      {googleConfig.isEnabled && (
        <>
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-surface-hover"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-surface px-2 text-zinc-400">Or continue with</span>
            </div>
          </div>

          <div className="w-full flex justify-center" style={{ minHeight: '40px' }}>
            <div id="google-signup-div" className="w-full"></div>
          </div>
          <Script
            src="https://accounts.google.com/gsi/client"
            onLoad={initGoogleSignIn}
            strategy="afterInteractive"
          />
        </>
      )}

      <div className="mt-4 text-center text-sm text-zinc-400">
        Already have an account?{' '}
        <Link href="/login" className="text-primary hover:underline font-medium">
          Sign in instead
        </Link>
      </div>
    </div>
  );
}
