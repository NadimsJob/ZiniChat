'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import Cookies from 'js-cookie';
import { 
  MessageCircle,
  Globe2,
  CheckCircle2,
  AlertCircle,
  Trash2,
  RefreshCw,
  Copy,
  ChevronDown,
  ChevronUp,
  Link as LinkIcon,
  Plus
} from 'lucide-react';
import ConnectFacebookPageButton from '@/components/messenger/ConnectFacebookPageButton';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function MessengerSettingsPage() {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'manual' | 'facebook'>('manual');
  const [showInstructions, setShowInstructions] = useState(true);
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    pageId: '',
    accessToken: '',
    displayName: '',
    verifyToken: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [quotas, setQuotas] = useState<any>(null);

  useEffect(() => {
    fetchConnections();
    fetchQuotas();
  }, []);

  const fetchQuotas = async () => {
    try {
      const res = await fetch(`${API}/billing/quotas`, {
        headers: { 'Authorization': `Bearer ${Cookies.get('access_token')}` }
      });
      if (res.ok) {
        setQuotas(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch quotas:', err);
    }
  };

  const fetchConnections = async () => {
    try {
      const res = await fetch(`${API}/channels/messenger/connections`, {
        headers: { 'Authorization': `Bearer ${Cookies.get('access_token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setConnections(data);
      }
    } catch (err) {
      console.error('Failed to fetch connections:', err);
    } finally {
      setLoading(false);
    }
  };

  const isLimitReached = quotas && connections.length >= quotas.channelLimit;

  const handleManualConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnecting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`${API}/channels/messenger/connect/manual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Cookies.get('access_token')}`
        },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Failed to connect');
      }

      setSuccessMessage(language === 'en' ? 'Messenger Page connected successfully!' : 'মেসেঞ্জার পেইজ সফলভাবে সংযুক্ত হয়েছে!');
      setFormData({ pageId: '', accessToken: '', displayName: '', verifyToken: '' });
      fetchConnections();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setConnecting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(language === 'en' ? 'Are you sure you want to disconnect this page?' : 'আপনি কি নিশ্চিত যে এই পেইজটি সংযোগ বিচ্ছিন্ন করতে চান?')) return;
    
    try {
      const res = await fetch(`${API}/channels/messenger/connections/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${Cookies.get('access_token')}` }
      });
      if (res.ok) {
        fetchConnections();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert(language === 'en' ? 'Copied to clipboard!' : 'ক্লিপবোর্ডে কপি করা হয়েছে!');
  };

  return (
    <div className="bg-white/70 dark:bg-[#0f0f11]/80 backdrop-blur-xl border border-white/50 dark:border-zinc-800/80 rounded-2xl p-1.5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] max-w-6xl mx-auto space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-zinc-400">
            {language === 'en' ? 'Messenger Settings' : 'মেসেঞ্জার সেটিংস'}
          </h1>
          <p className="text-slate-500 dark:text-zinc-400 mt-1">
            {language === 'en' ? 'Connect and manage your Facebook Pages for Messenger' : 'আপনার মেসেঞ্জারের জন্য ফেসবুক পেইজগুলো সংযুক্ত করুন'}
          </p>
        </div>
        {quotas && (
          <div className={`px-1.5 py-2 rounded-full border text-[13px] font-medium flex items-center gap-2 ${
            isLimitReached 
              ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20' 
              : 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
          }`}>
            <Globe2 className="w-3.5 h-3.5" />
            {language === 'en' ? `Channels: ${connections.length} / ${quotas.channelLimit}` : `চ্যানেল: ${connections.length} / ${quotas.channelLimit}`}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Left Column: Connections */}
        <div className="lg:col-span-2 space-y-3">
          <div className="bg-white dark:bg-[#121214] rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            <div className="p-1.5 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center">
              <h2 className="text-[13px] font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-blue-500" />
                {language === 'en' ? 'Connected Pages' : 'সংযুক্ত পেইজসমূহ'}
              </h2>
              <button onClick={fetchConnections} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-slate-500 transition-colors">
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-zinc-800/50">
              {connections.length === 0 ? (
                <div className="p-12 text-center text-slate-500 dark:text-zinc-500">
                  <MessageCircle className="w-9 h-9 mx-auto mb-3 opacity-20" />
                  <p>{language === 'en' ? 'No pages connected yet.' : 'এখনও কোন পেইজ সংযুক্ত করা হয়নি।'}</p>
                </div>
              ) : (
                connections.map(conn => (
                  <div key={conn.id} className="p-1.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/50 dark:hover:bg-zinc-900/50 transition-colors">
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        {conn.displayName}
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                          {conn.status}
                        </span>
                      </h3>
                      <div className="flex flex-col gap-1 mt-2 text-[13px] text-slate-500 dark:text-zinc-400">
                        <span className="flex items-center gap-1.5"><span className="w-16 font-medium text-slate-400">Page ID:</span> {conn.externalAccountId}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDelete(conn.id)}
                      className="flex items-center justify-center gap-2 px-1.5 py-2 text-[13px] text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-200 dark:hover:border-red-500/20"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {language === 'en' ? 'Disconnect' : 'সংযোগ বিচ্ছিন্ন করুন'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Add New Connection */}
        <div className="space-y-3">
          <div className="bg-white dark:bg-[#121214] rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm p-1.5">
            <h2 className="text-[13px] font-semibold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              {language === 'en' ? 'Add New Connection' : 'নতুন সংযোগ যোগ করুন'}
            </h2>

            {/* Connection Method Tabs */}
            <div className="flex bg-slate-100 dark:bg-zinc-800/50 p-1 rounded-xl mb-3">
              <button
                onClick={() => setActiveTab('manual')}
                className={`flex-1 py-2 text-[13px] font-medium rounded-lg transition-colors ${
                  activeTab === 'manual'
                    ? 'bg-white dark:bg-zinc-700 shadow-sm text-slate-900 dark:text-white'
                    : 'text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                Manual Setup
              </button>
              <button
                onClick={() => setActiveTab('facebook')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-[13px] font-medium rounded-lg transition-colors ${
                  activeTab === 'facebook'
                    ? 'bg-white dark:bg-zinc-700 shadow-sm text-blue-600 dark:text-blue-400'
                    : 'text-slate-500 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400'
                }`}
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Facebook Login
              </button>
            </div>
            
            {isLimitReached ? (
              <div className="p-1.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl">
                <div className="flex items-start gap-1.5">
                  <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-[13px] font-semibold text-amber-800 dark:text-amber-300">
                      {language === 'en' ? 'Channel Limit Reached' : 'চ্যানেল লিমিট শেষ'}
                    </h4>
                    <p className="text-[13px] text-amber-700 dark:text-amber-400/90 mt-1">
                      {language === 'en' 
                        ? 'You have reached the maximum number of channels allowed on your current plan. Please upgrade your plan to connect more pages.' 
                        : 'আপনার বর্তমান প্ল্যানের চ্যানেল লিমিট শেষ হয়ে গেছে। আরও পেইজ কানেক্ট করতে প্ল্যান আপগ্রেড করুন।'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {error && (
                  <div className="p-1.5 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-[13px] rounded-xl border border-red-200 dark:border-red-500/20 flex items-start gap-1.5">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p>{error}</p>
                  </div>
                )}
                {successMessage && (
                  <div className="p-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[13px] rounded-xl border border-emerald-200 dark:border-emerald-500/20 flex items-start gap-1.5">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                    <p>{successMessage}</p>
                  </div>
                )}

                {activeTab === 'facebook' ? (
                  <ConnectFacebookPageButton onConnected={fetchConnections} />
                ) : (
                  <form onSubmit={handleManualConnect} className="space-y-2">
                    <div className="space-y-1">
                      <label className="text-[13px] font-medium text-slate-700 dark:text-zinc-300">Page ID</label>
                      <input 
                        type="text" 
                        value={formData.pageId}
                        onChange={e => setFormData({...formData, pageId: e.target.value})}
                        required
                        placeholder="e.g. 1039485739"
                        className="w-full px-1.5 py-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all dark:text-white"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-[13px] font-medium text-slate-700 dark:text-zinc-300">Page Access Token</label>
                      <input 
                        type="text" 
                        value={formData.accessToken}
                        onChange={e => setFormData({...formData, accessToken: e.target.value})}
                        required
                        placeholder="EAAG..."
                        className="w-full px-1.5 py-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all dark:text-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[13px] font-medium text-slate-700 dark:text-zinc-300">Verify Token (Optional)</label>
                      <input 
                        type="text" 
                        value={formData.verifyToken}
                        onChange={e => setFormData({...formData, verifyToken: e.target.value})}
                        placeholder="Custom verify token"
                        className="w-full px-1.5 py-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all dark:text-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[13px] font-medium text-slate-700 dark:text-zinc-300">Display Name</label>
                      <input 
                        type="text" 
                        value={formData.displayName}
                        onChange={e => setFormData({...formData, displayName: e.target.value})}
                        required
                        placeholder="e.g. My Business Page"
                        className="w-full px-1.5 py-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all dark:text-white"
                      />
                    </div>

                    <button 
                      type="submit" 
                      disabled={connecting}
                      className="w-full flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-1 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20 mt-6"
                    >
                      {connecting ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      ) : (
                        <LinkIcon className="w-5 h-5" />
                      )}
                      {language === 'en' ? 'Connect Page' : 'পেইজ সংযুক্ত করুন'}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
