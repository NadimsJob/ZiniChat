'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import Link from 'next/link';
import Script from 'next/script';
import { Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '@/components/LanguageProvider';

export default function LoginPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
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
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/auth/google/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Google authentication failed');
      }

      const data = await res.json();
      const expires = rememberMe ? 30 : 1;
      Cookies.set('access_token', data.access_token, { expires, secure: true, sameSite: 'strict' });
      Cookies.set('user_role', data.user.role, { expires, secure: true, sameSite: 'strict' });

      if (data.user.role === 'superadmin') {
        Cookies.remove('access_token');
        Cookies.remove('user_role');
        throw new Error('Superadmin must login from the dedicated admin portal');
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

        const container = document.getElementById('google-signin-div');
        const availableWidth = container?.offsetWidth || 320;
        const containerWidth = Math.max(200, Math.min(availableWidth, 380));

        (window as any).google.accounts.id.renderButton(
          container,
          { theme: 'outline', size: 'large', width: containerWidth, text: 'signin_with', alignment: 'center' }
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
    setLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        let errMsg = errorData.message || 'Invalid email or password';
        if (errMsg === 'Account suspended') {
          errMsg = language === 'en'
            ? 'Your account has been suspended. Please contact support.'
            : 'আপনার অ্যাকাউন্টটি স্থগিত (suspended) করা হয়েছে। দয়া করে সাপোর্টের সাথে যোগাযোগ করুন।';
        } else if (errMsg === 'Invalid email or password') {
          errMsg = language === 'en' ? 'Invalid email or password' : 'ভুল ইমেল বা পাসওয়ার্ড';
        }
        throw new Error(errMsg);
      }

      const data = await res.json();

      if (data.requiresOtp) {
        router.push(`/signup?email=${encodeURIComponent(data.email)}&step=otp`);
        return;
      }
      // But typically, a tenant user (owner/agent) goes to /dashboard
      const expires = rememberMe ? 30 : 1;
      Cookies.set('access_token', data.access_token, { expires, secure: true, sameSite: 'strict' });
      Cookies.set('user_role', data.user.role, { expires, secure: true, sameSite: 'strict' });

      if (data.user.role === 'superadmin') {
        Cookies.remove('access_token');
        Cookies.remove('user_role');
        throw new Error('Superadmin must login from the dedicated admin portal');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const isBn = language === 'bn';

  return (
    <div>
      <h2 className="text-xl font-bold mb-4 text-center">
        {isBn ? 'স্বাগতম' : 'Welcome back'}
      </h2>
      
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-2.5 rounded-lg mb-4 text-sm text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium mb-1 text-zinc-400">
            {isBn ? 'ইমেইল ঠিকানা' : 'Email Address'}
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-background border border-surface-hover rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1 text-zinc-400">
            {isBn ? 'পাসওয়ার্ড' : 'Password'}
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-background border border-surface-hover rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-200"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-zinc-700 text-primary focus:ring-primary focus:ring-offset-background bg-background"
            />
            <span className="text-xs text-zinc-400">
              {isBn ? 'মনে রাখুন' : 'Remember me'}
            </span>
          </label>
          <Link href="/forgot-password" className="text-xs text-primary hover:underline font-medium">
            {isBn ? 'পাসওয়ার্ড ভুলে গেছেন?' : 'Forgot Password?'}
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2 text-sm rounded-lg transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 mt-4 shadow-lg shadow-primary/20"
        >
          {loading ? (isBn ? 'সাইন ইন হচ্ছে...' : 'Signing in...') : (isBn ? 'সাইন ইন করুন' : 'Sign In')}
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
            <div id="google-signin-div" className="w-full flex justify-center items-center text-center [&>div]:mx-auto [&>iframe]:mx-auto"></div>
          </div>
          <Script 
            src="https://accounts.google.com/gsi/client" 
            onLoad={initGoogleSignIn}
            strategy="afterInteractive"
          />
        </>
      )}

      <div className="mt-4 text-center text-xs text-zinc-400">
        {isBn ? 'অ্যাকাউন্ট নেই?' : "Don't have an account?"}{' '}
        <Link href="/signup" className="text-primary hover:underline font-medium">
          {isBn ? 'এখনই তৈরি করুন' : 'Create one now'}
        </Link>
      </div>
    </div>
  );
}
