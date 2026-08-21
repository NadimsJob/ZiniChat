'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import Link from 'next/link';
import Script from 'next/script';
import { Eye, EyeOff, Building, User, Mail, Phone, Lock, Briefcase, MapPin, Users } from 'lucide-react';
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
    brandName: '',
    employeeCount: '1-10',
    businessNature: '',
    address: '',
  });

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
    'w-full bg-background border border-surface-hover rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm';

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-center">Create your account</h2>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-xl mb-6 text-sm text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Business Name */}
        <div>
          <label className="block text-sm font-medium mb-1.5 text-zinc-400">Business Name</label>
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

        {/* Full Name */}
        <div>
          <label className="block text-sm font-medium mb-1.5 text-zinc-400">Your Full Name</label>
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

        {/* Email */}
        <div>
          <label className="block text-sm font-medium mb-1.5 text-zinc-400">Email Address</label>
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

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium mb-1.5 text-zinc-400">
            Phone Number (with Country Code)
          </label>
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

        {/* Brand Name */}
        <div>
          <label className="block text-sm font-medium mb-1.5 text-zinc-400">Brand Name</label>
          <div className="relative">
            <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
            <input
              type="text"
              value={formData.brandName}
              onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
              className={inputClass}
              placeholder="Acme Clothing (optional)"
              autoComplete="off"
            />
          </div>
        </div>

        {/* Employee Count + Business Nature — 2 columns on md+ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5 text-zinc-400">No. of Employees</label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
              <select
                value={formData.employeeCount}
                onChange={(e) => setFormData({ ...formData, employeeCount: e.target.value })}
                className="w-full bg-background border border-surface-hover rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm appearance-none"
              >
                <option value="1-10">1 – 10</option>
                <option value="11-50">11 – 50</option>
                <option value="51-200">51 – 200</option>
                <option value="200+">200+</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-zinc-400">Business Nature</label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
              <select
                value={formData.businessNature}
                onChange={(e) => setFormData({ ...formData, businessNature: e.target.value })}
                className="w-full bg-background border border-surface-hover rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm appearance-none"
              >
                <option value="">Select type</option>
                {businessNatures.map((bn) => (
                  <option key={bn.id} value={bn.name}>
                    {bn.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Business Address */}
        <div>
          <label className="block text-sm font-medium mb-1.5 text-zinc-400">Business Address</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 w-4 h-4 text-zinc-500 pointer-events-none" />
            <textarea
              rows={2}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full bg-background border border-surface-hover rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm resize-none"
              placeholder="Road 1, Block A, Dhaka (optional)"
              autoComplete="off"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-medium mb-1.5 text-zinc-400">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              minLength={6}
              className="w-full bg-background border border-surface-hover rounded-xl pl-10 pr-11 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
              placeholder="••••••••"
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

        {/* Confirm Password */}
        <div>
          <label className="block text-sm font-medium mb-1.5 text-zinc-400">Confirm Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              required
              minLength={6}
              className="w-full bg-background border border-surface-hover rounded-xl pl-10 pr-11 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
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

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 rounded-xl transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 mt-2 shadow-lg shadow-primary/20"
        >
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      {googleConfig.isEnabled && (
        <>
          <div className="relative my-6">
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

      <div className="mt-6 text-center text-sm text-zinc-400">
        Already have an account?{' '}
        <Link href="/login" className="text-primary hover:underline font-medium">
          Sign in instead
        </Link>
      </div>
    </div>
  );
}
