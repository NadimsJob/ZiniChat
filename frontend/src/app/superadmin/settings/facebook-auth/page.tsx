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

      <div className="bg-surface-hover/10 border border-surface-hover p-3 rounded-xl space-y-3">
        <h3 className="font-bold text-[12px] text-zinc-200 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-500" />
          {language === 'en' ? 'Meta App Config' : 'মেটা অ্যাপ কনফিগ'}
        </h3>
        <p className="text-xs text-zinc-400">
          {language === 'en' ? 'Ensure you whitelist the following OAuth redirect URI in your Meta App Dashboard under Facebook Login products:' : 'আপনার মেটা অ্যাপ ড্যাশবোর্ডে ফেসবুক লগইন প্রোডাক্টের অধীনে নিচের OAuth রিডাইরেক্ট ইউআরআই-টি হোয়াইটলিস্ট করা নিশ্চিত করুন:'}
        </p>
        <div className="bg-background border border-surface-hover p-3 rounded-lg font-mono text-xs text-zinc-300 select-all">
          {typeof window !== 'undefined' ? `${window.location.origin}/dashboard/settings/whatsapp` : 'http://localhost:3000/dashboard/settings/whatsapp'}
        </div>
      </div>
    </div>
  );
}
