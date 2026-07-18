'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import Link from 'next/link';
import Script from 'next/script';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
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

        (window as any).google.accounts.id.renderButton(
          document.getElementById('google-signin-div'),
          { theme: 'outline', size: 'large', width: '100%' }
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
        throw new Error('Invalid email or password');
      }

      const data = await res.json();
      
      // We check if the user is a superadmin, and direct them accordingly.
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

  return (
    <div>
      <h2 className="text-xl font-bold mb-4 text-center">Welcome back</h2>
      
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-2.5 rounded-lg mb-4 text-sm text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium mb-1 text-zinc-400">Email Address</label>
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
          <label className="block text-xs font-medium mb-1 text-zinc-400">Password</label>
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
            <span className="text-xs text-zinc-400">Remember me</span>
          </label>
          <Link href="/forgot-password" className="text-xs text-primary hover:underline font-medium">
            Forgot Password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2 text-sm rounded-lg transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 mt-4 shadow-lg shadow-primary/20"
        >
          {loading ? 'Signing in...' : 'Sign In'}
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
            <div id="google-signin-div" className="w-full"></div>
          </div>
          <Script 
            src="https://accounts.google.com/gsi/client" 
            onLoad={initGoogleSignIn}
            strategy="afterInteractive"
          />
        </>
      )}

      <div className="mt-4 text-center text-xs text-zinc-400">
        Don't have an account?{' '}
        <Link href="/signup" className="text-primary hover:underline font-medium">
          Create one now
        </Link>
      </div>
    </div>
  );
}
