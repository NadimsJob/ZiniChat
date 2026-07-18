'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (!res.ok) {
        throw new Error('Failed to request password reset');
      }

      const data = await res.json();
      setMessage(data.message || 'Reset link sent successfully');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <Link href="/login" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-primary transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to login
        </Link>
        <h2 className="text-xl font-bold mb-2">Forgot Password?</h2>
        <p className="text-sm text-zinc-500">
          Enter your email address and we'll send you a link to reset your password.
        </p>
      </div>
      
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-2.5 rounded-lg mb-4 text-sm text-center">
          {error}
        </div>
      )}

      {message && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-500 p-2.5 rounded-lg mb-4 text-sm text-center">
          {message}
        </div>
      )}

      {!message && (
        <form onSubmit={handleSubmit} className="space-y-4">
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

          <button
            type="submit"
            disabled={loading || !email}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2 text-sm rounded-lg transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 shadow-lg shadow-primary/20 mt-2"
          >
            {loading ? 'Sending link...' : 'Send Reset Link'}
          </button>
        </form>
      )}
    </div>
  );
}
