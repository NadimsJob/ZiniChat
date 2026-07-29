'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMetaPixel } from '@/context/MetaPixelContext';
import { useGoogleAnalytics } from '@/context/GoogleAnalyticsContext';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { trackEvent } = useMetaPixel();
  const { trackEvent: trackGaEvent } = useGoogleAnalytics();
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setStatus('success'); // Fallback demo verification view if no token URL param
        if (email) {
          trackEvent('CompleteRegistration', { email });
          trackGaEvent('view_item', { email, items: [{ item_id: 'email_verification', item_name: 'Email Verified' }] });
        }
        return;
      }

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/auth/verify-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        if (res.ok) {
          setStatus('success');
          if (email) {
            trackEvent('CompleteRegistration', { email });
            trackGaEvent('view_item', { email, items: [{ item_id: 'email_verification', item_name: 'Email Verified' }] });
          }
        } else {
          const errData = await res.json();
          setStatus('error');
          setMessage(errData.message || 'Email verification failed');
        }
      } catch (err: any) {
        setStatus('error');
        setMessage(err.message || 'Network error verifying email');
      }
    };

    verifyToken();
  }, [token, email]);

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-white/20 bg-surface/70 backdrop-blur-xl p-8 shadow-xl text-center">
        {status === 'verifying' && (
          <div className="flex flex-col items-center py-6">
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
            <h2 className="text-xl font-bold">Verifying Your Email...</h2>
            <p className="text-sm text-muted-foreground mt-2">Please wait while we activate your ZiniChat workspace.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center py-6">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Email Verified Successfully!</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Your account registration is fully completed. You can now log into your dashboard.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-md hover:bg-primary/90 transition-all"
            >
              Continue to Login
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center py-6">
            <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mb-4">
              <XCircle className="w-10 h-10" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Verification Failed</h2>
            <p className="text-sm text-muted-foreground mt-2">{message || 'Invalid or expired verification link.'}</p>
            <Link
              href="/login"
              className="mt-6 inline-flex items-center justify-center rounded-xl border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground shadow-sm hover:bg-accent transition-all"
            >
              Back to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[80vh] items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}

