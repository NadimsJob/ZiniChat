'use client';

import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { useLanguage } from '@/components/LanguageProvider';
import { AlertCircle, Instagram, CheckCircle2, Info, Plus } from 'lucide-react';

export default function InstagramSettingsPage() {
  const { language } = useLanguage();
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualForm, setManualForm] = useState({ accountId: '', accessToken: '', displayName: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/channels/instagram`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        if (res.status === 403) {
          setError('Your plan does not support Instagram DM Integration. Please upgrade your plan.');
          return;
        }
        throw new Error('Failed to fetch');
      }
      setConnections(await res.json());
    } catch (err) {
      console.error(err);
      setError('Failed to load Instagram connections');
    } finally {
      setLoading(false);
    }
  };

  const handleManualConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/channels/instagram/manual`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(manualForm)
      });
      
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || 'Failed to connect Instagram');
        return;
      }
      
      setShowManualForm(false);
      setManualForm({ accountId: '', accessToken: '', displayName: '' });
      fetchConnections();
    } catch (err) {
      console.error(err);
      alert('An error occurred during connection');
    } finally {
      setSaving(false);
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4 animate-in fade-in zoom-in duration-500">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl font-bold">{error}</h2>
          <p className="text-zinc-400 mt-2">Access to this feature is restricted by your subscription plan.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4 animate-in fade-in duration-500">
      <div>
        <h1 className="text-lg font-bold flex items-center gap-2 text-pink-500">
          <Instagram className="w-5 h-5" /> 
          {language === 'en' ? 'Instagram Configuration' : 'ইনস্টাগ্রাম কনফিগারেশন'}
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          {language === 'en' ? 'Connect your Instagram Business Account to reply to DMs.' : 'ডিএম রিপ্লাই করার জন্য আপনার ইনস্টাগ্রাম বিজনেস অ্যাকাউন্ট যুক্ত করুন।'}
        </p>
      </div>

      <div className="bg-surface/70 backdrop-blur-xl border border-surface-hover rounded-2xl p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-[14px] font-bold">{language === 'en' ? 'Connected Accounts' : 'যুক্ত অ্যাকাউন্টসমূহ'}</h2>
          <button 
            onClick={() => setShowManualForm(!showManualForm)}
            className="flex items-center gap-2 px-3 py-1.5 bg-pink-500/10 text-pink-500 hover:bg-pink-500/20 rounded-lg text-xs font-bold transition-colors"
          >
            <Plus className="w-4 h-4" /> 
            {language === 'en' ? 'Add Account' : 'অ্যাকাউন্ট যোগ করুন'}
          </button>
        </div>

        {showManualForm && (
          <form onSubmit={handleManualConnect} className="mb-6 p-4 bg-background border border-surface-hover rounded-xl space-y-3 animate-in fade-in duration-300">
            <h3 className="text-[13px] font-bold border-b border-surface-hover pb-2">Manual Connection (Graph API)</h3>
            <div className="space-y-2">
              <input 
                type="text" required placeholder="Instagram Business Account ID"
                value={manualForm.accountId} onChange={e => setManualForm({...manualForm, accountId: e.target.value})}
                className="w-full bg-surface border border-surface-hover rounded-lg px-3 py-2 text-[13px] focus:border-pink-500 focus:outline-none"
              />
              <input 
                type="text" required placeholder="Page Access Token"
                value={manualForm.accessToken} onChange={e => setManualForm({...manualForm, accessToken: e.target.value})}
                className="w-full bg-surface border border-surface-hover rounded-lg px-3 py-2 text-[13px] focus:border-pink-500 focus:outline-none"
              />
              <input 
                type="text" placeholder="Display Name (Optional)"
                value={manualForm.displayName} onChange={e => setManualForm({...manualForm, displayName: e.target.value})}
                className="w-full bg-surface border border-surface-hover rounded-lg px-3 py-2 text-[13px] focus:border-pink-500 focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowManualForm(false)} className="px-3 py-1.5 text-[12px] font-medium text-zinc-400 hover:text-zinc-200">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-1.5 bg-pink-500 text-white rounded-lg text-[12px] font-bold hover:bg-pink-600 disabled:opacity-50">
                {saving ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-16 bg-surface-hover/50 rounded-xl"></div>
          </div>
        ) : connections.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 text-[13px]">
            {language === 'en' ? 'No Instagram accounts connected yet.' : 'এখনো কোনো ইনস্টাগ্রাম অ্যাকাউন্ট যুক্ত করা হয়নি।'}
          </div>
        ) : (
          <div className="space-y-3">
            {connections.map((conn) => (
              <div key={conn.id} className="flex justify-between items-center p-4 bg-background/50 border border-surface-hover rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-pink-500/10 rounded-xl flex items-center justify-center text-pink-500">
                    <Instagram className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-bold">{conn.displayName || 'Instagram Account'}</h3>
                    <p className="text-[12px] text-zinc-400">ID: {conn.externalAccountId}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 px-2.5 py-1 bg-green-500/10 text-green-500 rounded-lg text-[11px] font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Active
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
