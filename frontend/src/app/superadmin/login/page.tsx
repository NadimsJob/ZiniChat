'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

export default function SuperadminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        throw new Error('Invalid credentials');
      }

      const data = await res.json();
      
      if (data.user.role !== 'superadmin') {
        throw new Error('Unauthorized: Superadmin access required');
      }

      // Store token in cookies for middleware
      Cookies.set('access_token', data.access_token, { expires: 7 }); // 7 days
      Cookies.set('user_role', data.user.role, { expires: 7 });

      router.push('/superadmin');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-2.5">
      <div className="w-full max-w-md p-2.5 bg-surface border border-surface-hover rounded-xl shadow-2xl">
        <div className="text-center mb-2">
          <div className="flex justify-center mb-3">
            <img src="/logo.png" alt="ZiniChat Logo" className="h-20 w-auto object-contain" />
          </div>
          <h1 className="text-[13px] font-bold">Superadmin Portal</h1>
          <p className="text-zinc-400 text-[12px] mt-2">Sign in to manage the platform.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-2">
          <div>
            <label className="block text-[12px] font-medium text-zinc-300 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-2.5 py-2 bg-background border border-surface-hover rounded-lg focus:outline-none focus:border-primary text-white"
              placeholder="admin@platform.com"
            />
          </div>
          
          <div>
            <label className="block text-[12px] font-medium text-zinc-300 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-2.5 py-2 bg-background border border-surface-hover rounded-lg focus:outline-none focus:border-primary text-white"
              placeholder="••••••••"
            />
          </div>

          {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-[12px]">{error}</div>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
