'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import Link from 'next/link';
import Script from 'next/script';
import { useMetaPixel } from '@/context/MetaPixelContext';
import { useGoogleAnalytics } from '@/context/GoogleAnalyticsContext';

export default function SignupPage() {
  const router = useRouter();
  const { trackEvent } = useMetaPixel();
  const { trackEvent: trackGaEvent } = useGoogleAnalytics();
  const [formData, setFormData] = useState({
    businessName: '',
    name: '',
    email: '',
    phoneNo: '+880',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [googleConfig, setGoogleConfig] = useState<{ isEnabled: boolean, clientId: string }>({
    isEnabled: false,
    clientId: ''
  });

  useEffect(() => {
    const fetchGoogleConfig = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/auth/google/config`);
        if (res.ok) {
          const data = await res.json();
          setGoogleConfig(data);
        }
      } catch (err) {
        console.error('Failed to load Google Auth configuration:', err);
      }
    };
    fetchGoogleConfig();
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/auth/google/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential, planId })
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
          ux_mode: 'popup'
        });

        const container = document.getElementById('google-signup-div');
        const containerWidth = container?.offsetWidth ? (container.offsetWidth > 400 ? 400 : container.offsetWidth) : 320;

        (window as any).google.accounts.id.renderButton(
          container,
          { theme: 'outline', size: 'large', width: containerWidth, text: 'signup_with' }
        );
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
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    // Track Lead & SignUp events on submit
    trackEvent('Lead', { email: formData.email });
    trackGaEvent('sign_up', { method: 'email', email: formData.email });

    let planId = '';
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      planId = params.get('planId') || '';
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, planId })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Signup failed');
      }

      const data = await res.json();

      // Track SignUp conversion event
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

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-center">Create your account</h2>
      
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-xl mb-6 text-sm text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5 text-zinc-400">Business Name</label>
          <input
            type="text"
            value={formData.businessName}
            onChange={(e) => setFormData({...formData, businessName: e.target.value})}
            required
            className="w-full bg-background border border-surface-hover rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            placeholder="Acme Corp"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5 text-zinc-400">Your Full Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            required
            className="w-full bg-background border border-surface-hover rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            placeholder="John Doe"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5 text-zinc-400">Email Address</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            required
            className="w-full bg-background border border-surface-hover rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5 text-zinc-400">Phone Number (with Country Code)</label>
          <input
            type="tel"
            value={formData.phoneNo}
            onChange={(e) => setFormData({...formData, phoneNo: e.target.value})}
            required
            className="w-full bg-background border border-surface-hover rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            placeholder="+8801700000000"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5 text-zinc-400">Password</label>
          <input
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            required
            minLength={6}
            className="w-full bg-background border border-surface-hover rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            placeholder="••••••••"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5 text-zinc-400">Confirm Password</label>
          <input
            type="password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
            required
            minLength={6}
            className="w-full bg-background border border-surface-hover rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            placeholder="••••••••"
          />
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
