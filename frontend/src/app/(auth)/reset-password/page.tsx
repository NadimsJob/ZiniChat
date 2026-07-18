'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to reset password');
      }

      const data = await res.json();
      setMessage(data.message || 'Password reset successfully');
      
      setTimeout(() => {
        router.push('/login');
      }, 3000);
      
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-2">Reset Password</h2>
        <p className="text-sm text-zinc-500">
          Please enter your new password below.
        </p>
      </div>
      
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-2.5 rounded-lg mb-4 text-sm text-center">
          {error}
        </div>
      )}

      {message && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-500 p-2.5 rounded-lg mb-4 text-sm text-center">
          {message} <br/><span className="text-xs">Redirecting to login...</span>
        </div>
      )}

      {!message && token && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1 text-zinc-400">New Password</label>
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

          <div>
            <label className="block text-xs font-medium mb-1 text-zinc-400">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full bg-background border border-surface-hover rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !password || !confirmPassword}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2 text-sm rounded-lg transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 shadow-lg shadow-primary/20 mt-2"
          >
            {loading ? 'Saving...' : 'Save New Password'}
          </button>
        </form>
      )}

      {(!token && !error) && (
        <div className="text-center mt-4">
          <Link href="/login" className="text-primary hover:underline text-sm font-medium">
            Go back to login
          </Link>
        </div>
      )}
    </div>
  );
}
