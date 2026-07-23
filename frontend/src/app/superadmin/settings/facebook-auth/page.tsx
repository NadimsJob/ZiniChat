'use client';

import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { useLanguage } from '@/components/LanguageProvider';
import { ShieldCheck, ToggleLeft, ToggleRight, Save, Key, AlertCircle, CheckCircle, Globe2 } from 'lucide-react';

export default function FacebookAuthSettingsPage() {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const [form, setForm] = useState({
    appId: '',
    appSecret: '',
    isEnabled: false
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const token = Cookies.get('access_token');
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/auth/facebook/settings`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setForm({
            appId: data.appId || '',
            appSecret: data.appSecret || '',
            isEnabled: data.isEnabled || false
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/auth/facebook/settings`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(form)
      });

      if (res.ok) {
        setStatus({
          type: 'success',
          message: language === 'en' ? 'Facebook Auth settings saved successfully!' : 'ফেসবুক অথেন্টিকেশন সেটিংস সফলভাবে সংরক্ষিত হয়েছে!'
        });
      } else {
        setStatus({
          type: 'error',
          message: language === 'en' ? 'Failed to save settings.' : 'সেটিংস সংরক্ষণ করতে ব্যর্থ হয়েছে।'
        });
      }
    } catch (err) {
      console.error(err);
      setStatus({
        type: 'error',
        message: 'An error occurred while saving.'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-2.5 text-center text-zinc-500">Loading settings...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-2 animate-in fade-in duration-500 pb-20">
      <div>
        <h1 className="text-[15px] font-bold tracking-tight flex items-center gap-3">
          <Globe2 className="w-4 h-4 text-blue-500" />
          {language === 'en' ? 'Facebook App Setup' : 'ফেসবুক অ্যাপ সেটআপ'}
        </h1>
        <p className="text-zinc-400 mt-2">
          {language === 'en' ? 'Configure Facebook App credentials to allow tenants to connect their WhatsApp Business APIs via Facebook Login.' : 'টেন্যান্টদের ফেসবুক লগইনের মাধ্যমে হোয়াটসঅ্যাপ কানেক্ট করার সুবিধা দিতে ফেসবুক অ্যাপ ক্রেডেনশিয়াল কনফিগার করুন।'}
        </p>
      </div>

      <form onSubmit={handleSave} className="bg-surface border border-surface-hover p-2.5 rounded-xl space-y-3">
        <div className="flex items-center justify-between p-2.5 bg-surface-hover/20 border border-surface-hover rounded-xl">
          <div>
            <h3 className="font-bold text-zinc-100">{language === 'en' ? 'Enable Facebook Integration' : 'ফেসবুক ইন্টিগ্রেশন সক্রিয় করুন'}</h3>
            <p className="text-xs text-zinc-400 mt-1">
              {language === 'en' ? 'Turn on to allow tenants to connect WhatsApp automatically via Facebook Embedded Signup.' : 'টেন্যান্টদের ফেসবুক এমবেডেড সাইনআপের মাধ্যমে হোয়াটসঅ্যাপ কানেক্ট করার সুযোগ দিতে এটি অন করুন।'}
            </p>
          </div>
          <button 
            type="button"
            onClick={() => setForm({ ...form, isEnabled: !form.isEnabled })}
            className="text-primary hover:scale-105 transition-transform"
          >
            {form.isEnabled ? (
              <ToggleRight className="w-14 h-10 text-primary" />
            ) : (
              <ToggleLeft className="w-14 h-10 text-zinc-600" />
            )}
          </button>
        </div>

        <div className="space-y-2">
          <div>
            <label className="block text-[12px] font-medium mb-1.5 text-zinc-400">{language === 'en' ? 'Facebook App ID' : 'ফেসবুক অ্যাপ আইডি'}</label>
            <input 
              required={form.isEnabled}
              type="text" 
              value={form.appId} 
              onChange={e => setForm({ ...form, appId: e.target.value })} 
              className="w-full bg-background border border-surface-hover rounded-xl px-2.5 py-3 focus:border-primary focus:outline-none font-mono text-[12px]" 
              placeholder="e.g. 123456789012345" 
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium mb-1.5 text-zinc-400">{language === 'en' ? 'Facebook App Secret' : 'ফেসবুক অ্যাপ সিক্রেট'}</label>
            <input 
              type="password" 
              value={form.appSecret} 
              onChange={e => setForm({ ...form, appSecret: e.target.value })} 
              className="w-full bg-background border border-surface-hover rounded-xl px-2.5 py-3 focus:border-primary focus:outline-none font-mono text-[12px]" 
              placeholder="••••••••••••••••••••••••••••••••" 
            />
          </div>
        </div>

        {status && (
          <div className={`p-2.5 rounded-xl flex items-start gap-3 border ${status.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
            {status.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
            <span className="text-[12px] font-medium">{status.message}</span>
          </div>
        )}

        <div className="pt-4 border-t border-surface-hover flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-3 py-3 bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-xl transition-all shadow-lg shadow-primary/20 text-[12px]"
          >
            <Save className="w-4 h-4" />
            {saving ? (language === 'en' ? 'Saving...' : 'সংরক্ষণ করা হচ্ছে...') : (language === 'en' ? 'Save Settings' : 'সেটিংস সংরক্ষণ করুন')}
          </button>
        </div>
      </form>

      {/* Comprehensive Meta App Config & Step-by-Step Guide */}
      <div className="bg-surface-hover/10 border border-surface-hover p-4 rounded-xl space-y-4">
        <div className="flex items-center justify-between border-b border-surface-hover pb-3">
          <h3 className="font-bold text-[14px] text-zinc-100 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-500" />
            {language === 'en' ? 'Meta Developer App Configuration & Setup Guide' : 'মেটা ডেভেলপার অ্যাপ কনফিগারেশন ও সেটআপ গাইড'}
          </h3>
          <a
            href="https://developers.facebook.com/apps"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium"
          >
            {language === 'en' ? 'Meta App Dashboard' : 'মেটা অ্যাপ ড্যাশবোর্ড'}
            <Globe2 className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* 1. OAuth Redirect URIs */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            1. {language === 'en' ? 'Valid OAuth Redirect URIs (Facebook Login -> Settings)' : 'OAuth রিডাইরেক্ট ইউআরআই (মেটা ড্যাশবোর্ডে হোয়াইটলিস্ট করুন)'}
          </h4>
          <p className="text-[11px] text-zinc-400">
            {language === 'en' 
              ? 'Add both URIs under Facebook Login for Business -> Settings -> Valid OAuth Redirect URIs to allow WhatsApp, Instagram, and Messenger connections:' 
              : 'হোয়াটসঅ্যাপ, ইনস্টাগ্রাম এবং মেসেনঞ্জার চ্যানেল যুক্ত করতে মেটা অ্যাপের Facebook Login -> Settings এ নিচের দুটি ইউআরআই হোয়াইটলিস্ট করুন:'}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
            <div className="bg-background border border-surface-hover p-2.5 rounded-lg space-y-1">
              <span className="text-[10px] text-blue-400 font-bold uppercase block">WhatsApp Cloud API Signup</span>
              <div className="flex items-center justify-between">
                <code className="text-[11px] font-mono text-zinc-200 select-all truncate">
                  {typeof window !== 'undefined' ? `${window.location.origin}/dashboard/settings/whatsapp` : 'https://zinichat.com/dashboard/settings/whatsapp'}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    const url = typeof window !== 'undefined' ? `${window.location.origin}/dashboard/settings/whatsapp` : 'https://zinichat.com/dashboard/settings/whatsapp';
                    navigator.clipboard.writeText(url);
                    alert(language === 'en' ? 'Copied WhatsApp Redirect URI!' : 'হোয়াটসঅ্যাপ রিডাইরেক্ট ইউআরআই কপি করা হয়েছে!');
                  }}
                  className="p-1 hover:bg-surface-hover rounded text-zinc-400 hover:text-primary transition-colors shrink-0 ml-2"
                  title="Copy URL"
                >
                  <Save className="w-3.5 h-3.5 hidden" />
                  📋
                </button>
              </div>
            </div>

            <div className="bg-background border border-surface-hover p-2.5 rounded-lg space-y-1">
              <span className="text-[10px] text-pink-400 font-bold uppercase block">Instagram DM & Messenger Connection</span>
              <div className="flex items-center justify-between">
                <code className="text-[11px] font-mono text-zinc-200 select-all truncate">
                  {typeof window !== 'undefined' ? `${window.location.origin}/dashboard/settings/instagram` : 'https://zinichat.com/dashboard/settings/instagram'}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    const url = typeof window !== 'undefined' ? `${window.location.origin}/dashboard/settings/instagram` : 'https://zinichat.com/dashboard/settings/instagram';
                    navigator.clipboard.writeText(url);
                    alert(language === 'en' ? 'Copied Instagram/Messenger Redirect URI!' : 'ইনস্টাগ্রাম রিডাইরেক্ট ইউআরআই কপি করা হয়েছে!');
                  }}
                  className="p-1 hover:bg-surface-hover rounded text-zinc-400 hover:text-primary transition-colors shrink-0 ml-2"
                  title="Copy URL"
                >
                  📋
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Webhook Endpoints */}
        <div className="space-y-2 pt-2 border-t border-surface-hover/50">
          <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            2. {language === 'en' ? 'Meta Webhook Callback URLs (Real-time Sync)' : 'মেটা ওয়েবহুক কলব্যাক ইউআরআই (রিয়েল-টাইম মেসেজ গ্রহণের জন্য)'}
          </h4>
          <p className="text-[11px] text-zinc-400">
            {language === 'en' 
              ? 'Configure these Backend API Webhook URLs in your Meta Developer App products:' 
              : 'রিয়েল-টাইমে ইনকামিং মেসেজ রিসিভ করতে মেটা প্রোডাক্টস এর অ্যান্ডপয়েন্টে নিচের ওয়েবহুক ইউআরআইগুলো বসান:'}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
            <div className="bg-background border border-surface-hover p-2.5 rounded-lg space-y-1">
              <span className="text-[10px] text-emerald-400 font-bold uppercase block">WhatsApp Webhook Callback</span>
              <div className="flex items-center justify-between">
                <code className="text-[11px] font-mono text-zinc-200 select-all truncate">
                  {`${process.env.NEXT_PUBLIC_API_URL || 'https://api.zinichat.com'}/webhooks/whatsapp`}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`${process.env.NEXT_PUBLIC_API_URL || 'https://api.zinichat.com'}/webhooks/whatsapp`);
                    alert(language === 'en' ? 'Copied WhatsApp Webhook URL!' : 'হোয়াটসঅ্যাপ ওয়েবহুক ইউআরআই কপি করা হয়েছে!');
                  }}
                  className="p-1 hover:bg-surface-hover rounded text-zinc-400 hover:text-primary transition-colors shrink-0 ml-2"
                >
                  📋
                </button>
              </div>
            </div>

            <div className="bg-background border border-surface-hover p-2.5 rounded-lg space-y-1">
              <span className="text-[10px] text-purple-400 font-bold uppercase block">Messenger & Instagram Webhook Callback</span>
              <div className="flex items-center justify-between">
                <code className="text-[11px] font-mono text-zinc-200 select-all truncate">
                  {`${process.env.NEXT_PUBLIC_API_URL || 'https://api.zinichat.com'}/webhooks/messenger`}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`${process.env.NEXT_PUBLIC_API_URL || 'https://api.zinichat.com'}/webhooks/messenger`);
                    alert(language === 'en' ? 'Copied Messenger/Instagram Webhook URL!' : 'মেসেনঞ্জার ওয়েবহুক ইউআরআই কপি করা হয়েছে!');
                  }}
                  className="p-1 hover:bg-surface-hover rounded text-zinc-400 hover:text-primary transition-colors shrink-0 ml-2"
                >
                  📋
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Step-by-Step Setup Guide */}
        <div className="space-y-2 pt-2 border-t border-surface-hover/50 text-[11px] text-zinc-300">
          <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            3. {language === 'en' ? 'Step-by-Step Meta Developer Setup' : 'মেটা ড্যাশবোর্ডে অ্যাপ কনফিগারেশনের ধাপসমূহ:'}
          </h4>
          <ol className="list-decimal list-inside space-y-1 text-zinc-400 bg-background/60 p-3 rounded-lg border border-surface-hover">
            <li>
              {language === 'en' 
                ? 'Go to Meta Developer Portal -> Create App -> Choose App Type: Business.' 
                : 'Meta Developer Portal-এ গিয়ে নতুন অ্যাপ তৈরি করুন এবং App Type সিলেক্ট করুন Business।'}
            </li>
            <li>
              {language === 'en' 
                ? 'Add Products: Add WhatsApp, Facebook Login for Business, Instagram Graph API, and Messenger.' 
                : 'প্রোডাক্টস সেকশন থেকে WhatsApp, Facebook Login for Business, Instagram Graph API এবং Messenger সার্ভিসগুলো যুক্ত করুন।'}
            </li>
            <li>
              {language === 'en' 
                ? 'Go to App Settings -> Basic, copy the App ID & App Secret, and paste them into the input fields above.' 
                : 'App Settings -> Basic অপশনে গিয়ে App ID ও App Secret কপি করে উপরের ফর্মে পেস্ট করুন।'}
            </li>
            <li>
              {language === 'en' 
                ? 'Go to Facebook Login for Business -> Settings -> Valid OAuth Redirect URIs, and add both redirect links listed above.' 
                : 'Facebook Login for Business -> Settings এ গিয়ে উপরে দেওয়া দুটি OAuth Redirect URIs লিংকই হোয়াইটলিস্ট করুন।'}
            </li>
            <li>
              {language === 'en' 
                ? 'Under Webhooks, subscribe to messages, messaging_postbacks, and instagram_manage_messages fields.' 
                : 'ওয়েবহুক সেটিংসে messages, messaging_postbacks এবং instagram_manage_messages ফিল্ডগুলো সাবস্ক্রাইব করুন।'}
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
