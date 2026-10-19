'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Mail, CheckCircle2, AlertTriangle, ShieldCheck, ArrowRight, RefreshCw } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function PublicUnsubscribeContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [unsubscribed, setUnsubscribed] = useState(false);
  const [prospect, setProspect] = useState<any>(null);

  const [reason, setReason] = useState('not_relevant');
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    const fetchProspect = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`${API}/api/public/outreach/prospect-info?token=${token}`);
        if (res.ok) {
          const data = await res.json();
          setProspect(data);
        }
      } catch (err) {
        console.error('Failed to load prospect info', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProspect();
  }, [token]);

  const handleUnsubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    try {
      setSubmitting(true);
      const res = await fetch(`${API}/api/public/outreach/unsubscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          reason,
          feedback: feedback.trim() || undefined,
        }),
      });

      if (res.ok) {
        setUnsubscribed(true);
      }
    } catch (err) {
      console.error('Error submitting unsubscribe request', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-surface/80 backdrop-blur-xl border border-surface-hover rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Brand Icon */}
        <div className="flex items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-[#1F824A]/10 border border-[#1F824A]/20 flex items-center justify-center text-[#1F824A]">
            <Mail className="w-7 h-7" />
          </div>
        </div>

        {unsubscribed ? (
          <div className="text-center space-y-3 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-foreground">
              Unsubscribed Successfully
            </h2>
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              Your email has been added to our suppression blacklist. You will not receive any further cold outreach emails from this sender.
            </p>
            <div className="pt-2 text-[11px] text-muted-foreground/60">
              CAN-SPAM & GDPR Compliant • Powered by ZiniChat
            </div>
          </div>
        ) : (
          <form onSubmit={handleUnsubscribe} className="space-y-4">
            <div className="text-center space-y-1">
              <h1 className="text-xl font-bold text-foreground">
                Email Preferences
              </h1>
              <p className="text-[12px] text-muted-foreground">
                {prospect?.email ? (
                  <>Managing subscription for <span className="font-semibold text-foreground">{prospect.email}</span></>
                ) : (
                  'Please tell us why you wish to opt out.'
                )}
              </p>
            </div>

            <div className="space-y-3 text-[12px]">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">
                  Reason for Unsubscribing:
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-surface border border-surface-hover text-foreground focus:outline-none focus:border-[#1F824A]"
                >
                  <option value="not_relevant">The content is not relevant to my business</option>
                  <option value="too_frequent">Too many emails received</option>
                  <option value="never_signed_up">I never opted in to receive these emails</option>
                  <option value="other">Other reason</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">
                  Additional Feedback (Optional):
                </label>
                <textarea
                  rows={3}
                  placeholder="Tell us how we can improve..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-surface border border-surface-hover text-foreground focus:outline-none focus:border-[#1F824A] resize-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !token}
              className="w-full py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-[13px] shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Confirm Unsubscribe'
              )}
            </button>

            <div className="text-center text-[11px] text-muted-foreground/60 pt-2 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Instant Unsubscribe Guarantee • No Login Required</span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function PublicUnsubscribePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-background">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      }
    >
      <PublicUnsubscribeContent />
    </Suspense>
  );
}
