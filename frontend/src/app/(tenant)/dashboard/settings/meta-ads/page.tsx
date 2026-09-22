'use client';

import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { useLanguage } from '@/components/LanguageProvider';
import { AlertCircle, CheckCircle, Trash2, ShieldCheck, Play } from 'lucide-react';
import { FacebookBadgeIcon as Facebook } from '@/components/BrandIcons';
import { useRouter } from 'next/navigation';

export default function TenantMetaAdsSettingsPage() {
  const { language } = useLanguage();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Note: we should check feature rollout flag, assuming it's available via an API or context
  // For now, we'll assume it's checked or fetch it if needed.

  useEffect(() => {
    fetchAccounts();

    // Check if we just returned from OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code) {
      handleOAuthCallback(code);
    }
  }, []);

  const fetchAccounts = async () => {
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/meta-ads-account/accounts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAccounts(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthCallback = async (code: string) => {
    setConnecting(true);
    setStatus(null);
    try {
      const token = Cookies.get('access_token');
      // Clean up URL
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/meta-ads-account/oauth/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ code, redirectUri: cleanUrl })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to connect');
      }

      setStatus({ type: 'success', message: 'Meta Ad Account connected successfully.' });
      fetchAccounts();
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message || 'An error occurred during connection.' });
    } finally {
      setConnecting(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const token = Cookies.get('access_token');
      const redirectUri = window.location.origin + window.location.pathname;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/meta-ads-account/oauth/url?redirectUri=${encodeURIComponent(redirectUri)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to initiate connection');
      }
      
      const data = await res.json();
      window.location.href = data.url;
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message || 'Could not connect at this time.' });
      setConnecting(false);
    }
  };

  const handleDisconnect = async (id: string) => {
    if (!confirm(language === 'en' ? 'Are you sure you want to disconnect this account?' : 'আপনি কি নিশ্চিত যে এই অ্যাকাউন্টটি ডিসকানেক্ট করতে চান?')) return;
    
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/meta-ads-account/accounts/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        setAccounts(accounts.filter(a => a.id !== id));
        setStatus({ type: 'success', message: 'Account disconnected.' });
      } else {
        throw new Error('Failed to disconnect');
      }
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message || 'Error disconnecting account.' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-brand-green border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
          <Facebook className="w-6 h-6 text-brand-green" />
          {language === 'en' ? 'Meta Ads Account' : 'মেটা অ্যাডস অ্যাকাউন্ট'}
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          {language === 'en' 
            ? 'Connect your Facebook Ad Account to enable the AI Ads Copilot.' 
            : 'আপনার ফেসবুক অ্যাড অ্যাকাউন্ট কানেক্ট করুন এআই অ্যাডস কোপাইলট চালু করতে।'}
        </p>
      </div>

      {status && (
        <div className={`p-4 rounded-xl text-sm flex flex-col gap-2 ${status.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
          <div className="flex items-center gap-2">
            {status.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {status.message}
          </div>
          {status.type === 'error' && status.message.includes('Facebook Page') && (
            <div className="pl-7">
              <button onClick={() => router.push('/dashboard/settings/inboxes')} className="text-brand-orange underline text-xs">
                {language === 'en' ? 'Go to Channel Integration' : 'চ্যানেল ইন্টিগ্রেশনে যান'}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="bg-surface/70 backdrop-blur-xl border border-white/10 rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-medium text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-brand-orange" />
              {language === 'en' ? 'Connected Accounts' : 'সংযুক্ত অ্যাকাউন্টসমূহ'}
            </h2>
          </div>
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="px-4 py-2 bg-[#1877F2] hover:bg-[#1877F2]/90 text-white rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Facebook className="w-4 h-4" />
            {connecting 
              ? (language === 'en' ? 'Connecting...' : 'সংযোগ করা হচ্ছে...') 
              : (language === 'en' ? 'Connect Meta Account' : 'মেটা অ্যাকাউন্ট কানেক্ট করুন')}
          </button>
        </div>

        {accounts.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-xl">
            <Facebook className="w-12 h-12 text-text-secondary/50 mx-auto mb-3" />
            <p className="text-sm text-text-secondary max-w-md mx-auto">
              {language === 'en' 
                ? 'No Meta Ad accounts connected yet. Connect an account to start creating AI-powered ads directly from ZiniChat.' 
                : 'এখনো কোনো মেটা অ্যাড অ্যাকাউন্ট কানেক্ট করা হয়নি। ZiniChat থেকে সরাসরি এআই দিয়ে অ্যাড বানাতে অ্যাকাউন্ট কানেক্ট করুন।'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.map(account => (
              <div key={account.id} className="flex items-center justify-between p-4 bg-surface-light border border-white/10 rounded-lg group hover:border-white/20 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#1877F2]/10 flex items-center justify-center">
                    <Facebook className="w-5 h-5 text-[#1877F2]" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">{account.adAccountName || 'Ad Account'}</h3>
                    <div className="flex items-center gap-3 text-xs text-text-secondary mt-1">
                      <span className="font-mono bg-surface px-1.5 py-0.5 rounded text-[10px]">{account.adAccountId}</span>
                      {account.currency && <span>Currency: {account.currency}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-green-500/20 text-green-400 flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    Active
                  </span>
                  <button
                    onClick={() => handleDisconnect(account.id)}
                    className="p-2 text-text-secondary hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                    title={language === 'en' ? 'Disconnect' : 'ডিসকানেক্ট'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {accounts.length > 0 && (
        <div className="bg-gradient-to-r from-brand-green/20 to-brand-orange/20 border border-brand-green/30 rounded-xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Play className="w-24 h-24" />
          </div>
          <div className="relative z-10">
            <h3 className="text-lg font-medium text-white mb-2">
              {language === 'en' ? 'Ready for AI Ads Copilot' : 'এআই অ্যাডস কোপাইলট ব্যবহারের জন্য প্রস্তুত'}
            </h3>
            <p className="text-sm text-white/80 max-w-lg mb-4">
              {language === 'en' 
                ? 'Your Meta Ad Account is now connected. You can start creating and managing campaigns directly from the Copilot interface.'
                : 'আপনার মেটা অ্যাড অ্যাকাউন্ট সফলভাবে কানেক্ট হয়েছে। এখন আপনি সরাসরি কোপাইলট ইন্টারফেস থেকে ক্যাম্পেইন তৈরি ও পরিচালনা করতে পারবেন।'}
            </p>
            <button
              onClick={() => router.push('/dashboard/ai-ads-copilot')}
              className="px-4 py-2 bg-white text-black rounded-lg font-medium text-sm transition-colors hover:bg-white/90"
            >
              {language === 'en' ? 'Go to Ads Copilot' : 'অ্যাডস কোপাইলটে যান'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
