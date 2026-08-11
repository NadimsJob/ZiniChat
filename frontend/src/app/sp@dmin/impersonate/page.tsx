'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Cookies from 'js-cookie';
import { ShieldAlert, Loader2 } from 'lucide-react';

function ImpersonateContent() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setError('Invalid or missing impersonation token.');
      return;
    }

    try {
      // Set access token cookie for 2 hours (1/12 day)
      Cookies.set('access_token', token, { expires: 1 / 12, path: '/' });
      
      // Perform full page redirect to load clean tenant state and sockets
      window.location.href = '/dashboard';
    } catch (err: any) {
      console.error('Impersonation error:', err);
      setError('Failed to initiate impersonation session.');
    }
  }, [searchParams]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#09090b] text-white flex flex-col items-center justify-center p-4">
        <div className="bg-surface/70 border border-red-500/30 rounded-2xl p-6 max-w-md w-full text-center space-y-4 shadow-xl backdrop-blur-xl">
          <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold">Impersonation Error</h2>
          <p className="text-sm text-zinc-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center space-y-4 text-center">
        <div className="relative">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center animate-pulse">
            <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
          </div>
        </div>
        <div className="space-y-1">
          <h2 className="text-sm font-semibold tracking-wide text-zinc-200">Connecting to Tenant Workspace...</h2>
          <p className="text-xs text-zinc-500">Securing environment & establishing session</p>
        </div>
      </div>
    </div>
  );
}

export default function ImpersonatePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#09090b] text-white flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
      </div>
    }>
      <ImpersonateContent />
    </Suspense>
  );
}
