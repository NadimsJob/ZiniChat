'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import Cookies from 'js-cookie';
import WhatsappWebConnectModal from '@/components/WhatsappWebConnectModal';
import WidgetSettings from './WidgetSettings';
import { 
  PhoneCall,
  Smartphone,
  Globe2,
  CheckCircle2,
  AlertCircle,
  Trash2,
  RefreshCw,
  Copy,
  ChevronDown,
  ChevronUp,
  Link as LinkIcon,
  Plus,
  QrCode,
  Code
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function WhatsAppSettingsPage() {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'embedded' | 'official' | 'unofficial' | 'widget'>('embedded');
  const [showInstructions, setShowInstructions] = useState(false);
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    phoneNumberId: '',
    wabaId: '',
    accessToken: '',
    phoneNumber: '',
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
        headers: {
          'Authorization': `Bearer ${Cookies.get('access_token')}`
        }
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
      const res = await fetch(`${API}/channels/whatsapp/connections`, {
        headers: {
          'Authorization': `Bearer ${Cookies.get('access_token')}`
        }
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

  const isLimitReached = quotas && connections.length >= quotas.whatsappLimit;

  const handleToggleAiReply = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`${API}/channels/whatsapp/connections/${id}/ai-reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Cookies.get('access_token')}`
        },
        body: JSON.stringify({ isEnabled: !currentStatus })
      });
      if (res.ok) {
        setConnections(connections.map(c => c.id === id ? { ...c, isAiAutoReplyEnabled: !currentStatus } : c));
      }
    } catch (err) {
      console.error('Failed to toggle AI reply:', err);
    }
  };

  const handleManualConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnecting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`${API}/channels/whatsapp/connect/manual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Cookies.get('access_token')}`
        },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to connect');
      }

      setSuccessMessage(language === 'en' ? 'WhatsApp number connected successfully!' : 'হোয়াটসঅ্যাপ নম্বর সফলভাবে কানেক্ট হয়েছে!');
      setFormData({ phoneNumberId: '', wabaId: '', accessToken: '', phoneNumber: '', displayName: '', verifyToken: '' });
      fetchConnections();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setConnecting(false);
    }
  };

  const handleFacebookConnect = async () => {
    // Note: Since this is an MVP without real FB SDK loaded yet, we'll simulate the OAuth redirect and callback
    setConnecting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // MOCK: Sending a fake OAuth code to our backend to simulate success
      const res = await fetch(`${API}/channels/whatsapp/connect/facebook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Cookies.get('access_token')}`
        },
        body: JSON.stringify({ code: `mock_fb_code_${Date.now()}` })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to connect');
      }

      setSuccessMessage(language === 'en' ? 'Facebook OAuth connected successfully!' : 'ফেসবুক ওঅথ সফলভাবে কানেক্ট হয়েছে!');
      fetchConnections();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setConnecting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(language === 'en' ? 'Are you sure you want to disconnect this number?' : 'আপনি কি নিশ্চিত যে এই নম্বরটি ডিসকানেক্ট করতে চান?')) return;
    
    try {
      await fetch(`${API}/channels/whatsapp/connections/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${Cookies.get('access_token')}` }
      });
      fetchConnections();
    } catch (err) {
      console.error(err);
    }
  };

  const handleTest = async (id: string) => {
    try {
      const res = await fetch(`${API}/channels/whatsapp/connections/${id}/test`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${Cookies.get('access_token')}` }
      });
      const data = await res.json();
      if (res.ok) {
        alert(language === 'en' ? 'Test successful: ' + data.message : 'টেস্ট সফল: ' + data.message);
      } else {
        alert(language === 'en' ? 'Test failed: ' + data.error : 'টেস্ট ব্যর্থ: ' + data.error);
      }
      fetchConnections();
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
      
      <WhatsappWebConnectModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={() => {
          setIsModalOpen(false);
          setSuccessMessage(language === 'en' ? 'Linked successfully via Pairing Code!' : 'পিয়ারিং কোডের মাধ্যমে সফলভাবে কানেক্ট হয়েছে!');
          fetchConnections();
        }}
      />
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-zinc-400">
            {language === 'en' ? 'WhatsApp Settings' : 'হোয়াটসঅ্যাপ সেটিংস'}
          </h1>
          <p className="text-slate-500 dark:text-zinc-400 mt-1">
            {language === 'en' ? 'Connect and manage your WhatsApp Business API numbers.' : 'আপনার হোয়াটসঅ্যাপ বিজনেস এপিআই নম্বর কানেক্ট ও পরিচালনা করুন।'}
          </p>
        </div>
        
        {/* Quota Badge */}
        {quotas && (
          <div className={`px-1.5 py-2 rounded-full border text-[13px] font-medium flex items-center gap-2 ${
            isLimitReached 
              ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20' 
              : 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
          }`}>
            <Smartphone className="w-3.5 h-3.5" />
            {language === 'en' ? `Channels: ${connections.length} / ${quotas.whatsappLimit}` : `চ্যানেল: ${connections.length} / ${quotas.whatsappLimit}`}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Left Column: Connections */}
        <div className="lg:col-span-2 space-y-3">
          <div className="bg-white dark:bg-[#121214] rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            <div className="p-1.5 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center">
              <h2 className="text-[13px] font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <PhoneCall className="w-5 h-5 text-green-500" />
                {language === 'en' ? 'Connected Numbers' : 'কানেক্টেড নম্বরসমূহ'}
              </h2>
              <button onClick={fetchConnections} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-slate-500 transition-colors">
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-zinc-800/50">
              {loading ? (
                <div className="p-12 flex justify-center">
                  <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : connections.length === 0 ? (
                <div className="p-12 text-center text-slate-500 dark:text-zinc-500">
                  <PhoneCall className="w-9 h-9 mx-auto mb-3 opacity-20" />
                  <p>{language === 'en' ? 'No WhatsApp numbers connected yet.' : 'এখনো কোনো হোয়াটসঅ্যাপ নম্বর কানেক্ট করা হয়নি।'}</p>
                </div>
              ) : (
                connections.map(conn => (
                  <div key={conn.id} className="p-1.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/50 dark:hover:bg-zinc-900/50 transition-colors">
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        {conn.displayName || 'WhatsApp'}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          conn.status === 'active' 
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' 
                            : 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400'
                        }`}>
                          {conn.status}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-[10px] font-medium text-slate-600 dark:text-zinc-300">
                          {conn.connectionMethod === 'manual' ? 'API' : conn.connectionMethod === 'unofficial' ? 'Web' : 'OAuth'}
                        </span>
                      </h3>
                      <div className="flex flex-col gap-1 mt-2 text-[13px] text-slate-500 dark:text-zinc-400">
                        <span className="flex items-center gap-1.5"><span className="w-16 font-medium text-slate-400">Number:</span> {conn.phoneNumber || 'N/A'}</span>
                        <span className="flex items-center gap-1.5"><span className="w-16 font-medium text-slate-400">ID:</span> {conn.phoneNumberId}</span>
                        {conn.wabaId && <span className="flex items-center gap-1.5"><span className="w-16 font-medium text-slate-400">WABA:</span> {conn.wabaId}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">AI Auto-Reply</span>
                        <button
                          onClick={() => handleToggleAiReply(conn.id, conn.isAiAutoReplyEnabled)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                            conn.isAiAutoReplyEnabled ? 'bg-green-500' : 'bg-slate-300 dark:bg-zinc-700'
                          }`}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                              conn.isAiAutoReplyEnabled ? 'translate-x-4.5' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row items-center gap-1">
                        <button
                          onClick={() => copyToClipboard(`https://api.yourplatform.com/webhooks/whatsapp`)}
                          title="Copy Webhook URL"
                          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleTest(conn.id)}
                          title="Test Connection"
                          className="p-1.5 text-blue-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(conn.id)}
                          title="Delete Connection"
                          className="p-1.5 text-red-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
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
              <Plus className="w-5 h-5 text-green-500" />
              {language === 'en' ? 'Add New Connection' : 'নতুন সংযোগ যোগ করুন'}
            </h2>

            {/* Connection Method Tabs */}
            <div className="flex flex-wrap bg-slate-100 dark:bg-zinc-800/50 p-1 rounded-xl mb-3 gap-1">
              <button
                onClick={() => setActiveTab('embedded')}
                className={`flex-1 min-w-[70px] py-1.5 text-[11px] font-medium rounded-lg transition-colors ${
                  activeTab === 'embedded'
                    ? 'bg-white dark:bg-zinc-700 shadow-sm text-blue-600 dark:text-blue-400'
                    : 'text-slate-500 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400'
                }`}
              >
                FB Login
              </button>
              <button
                onClick={() => setActiveTab('official')}
                className={`flex-1 min-w-[70px] py-1.5 text-[11px] font-medium rounded-lg transition-colors ${
                  activeTab === 'official'
                    ? 'bg-white dark:bg-zinc-700 shadow-sm text-slate-900 dark:text-white'
                    : 'text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                Manual
              </button>
              <button
                onClick={() => setActiveTab('unofficial')}
                className={`flex-1 min-w-[70px] py-1.5 text-[11px] font-medium rounded-lg transition-colors ${
                  activeTab === 'unofficial'
                    ? 'bg-white dark:bg-zinc-700 shadow-sm text-green-600 dark:text-green-400'
                    : 'text-slate-500 hover:text-green-600 dark:text-zinc-400 dark:hover:text-green-400'
                }`}
              >
                Web (QR)
              </button>
              <button
                onClick={() => setActiveTab('widget')}
                className={`flex-1 min-w-[70px] py-1.5 text-[11px] font-medium rounded-lg transition-colors ${
                  activeTab === 'widget'
                    ? 'bg-white dark:bg-zinc-700 shadow-sm text-purple-600 dark:text-purple-400'
                    : 'text-slate-500 hover:text-purple-600 dark:text-zinc-400 dark:hover:text-purple-400'
                }`}
              >
                Widget
              </button>
            </div>
            
            {isLimitReached && activeTab !== 'widget' ? (
              <div className="p-1.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl">
                <div className="flex items-start gap-1.5">
                  <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-[13px] font-semibold text-amber-800 dark:text-amber-300">
                      {language === 'en' ? 'Channel Limit Reached' : 'চ্যানেল লিমিট শেষ'}
                    </h4>
                    <p className="text-[13px] text-amber-700 dark:text-amber-400/90 mt-1">
                      {language === 'en' 
                        ? 'You have reached the maximum number of channels allowed on your current plan. Please upgrade your plan to connect more.' 
                        : 'আপনার বর্তমান প্ল্যানের চ্যানেল লিমিট শেষ হয়ে গেছে। আরও কানেক্ট করতে প্ল্যান আপগ্রেড করুন।'}
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

                {activeTab === 'embedded' ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center space-y-4 bg-slate-50 dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800">
                    <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-2xl flex items-center justify-center mb-2">
                      <Globe2 className="w-8 h-8" />
                    </div>
                    <h3 className="text-[14px] font-bold text-slate-900 dark:text-white">
                      {language === 'en' ? 'Connect via Facebook' : 'ফেসবুক দিয়ে কানেক্ট করুন'}
                    </h3>
                    <p className="text-[12px] text-slate-500 dark:text-zinc-400 max-w-[250px] mx-auto">
                      {language === 'en' 
                        ? 'The easiest and officially recommended way. Connect your WhatsApp Business instantly without messing with tokens.' 
                        : 'সবচেয়ে সহজ এবং প্রস্তাবিত পদ্ধতি। কোনো টোকেন কপি না করেই সরাসরি হোয়াটসঅ্যাপ বিজনেস কানেক্ট করুন।'}
                    </p>
                    <button
                      onClick={handleFacebookConnect}
                      disabled={connecting}
                      className="mt-2 px-6 py-2.5 rounded-xl bg-[#1877F2] hover:bg-[#1864cc] text-white font-medium transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm shadow-blue-500/20 disabled:cursor-not-allowed text-[13px]"
                    >
                      {connecting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Globe2 className="w-4 h-4" />}
                      {language === 'en' ? 'Continue with Facebook' : 'ফেসবুক দিয়ে চালিয়ে যান'}
                    </button>
                  </div>
                ) : activeTab === 'official' ? (
                  <form onSubmit={handleManualConnect} className="space-y-2">
                    <div className="space-y-1">
                      <label className="text-[13px] font-medium text-slate-700 dark:text-zinc-300">Display Name</label>
                      <input 
                        type="text" 
                        value={formData.displayName}
                        onChange={e => setFormData({...formData, displayName: e.target.value})}
                        placeholder="e.g. Sales Team WA"
                        className="w-full px-1.5 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all dark:text-white text-[13px]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[13px] font-medium text-slate-700 dark:text-zinc-300">Phone Number ID <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        value={formData.phoneNumberId}
                        onChange={e => setFormData({...formData, phoneNumberId: e.target.value})}
                        required
                        className="w-full px-1.5 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all dark:text-white text-[13px] font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[13px] font-medium text-slate-700 dark:text-zinc-300">WABA ID <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        value={formData.wabaId}
                        onChange={e => setFormData({...formData, wabaId: e.target.value})}
                        required
                        className="w-full px-1.5 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all dark:text-white text-[13px] font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[13px] font-medium text-slate-700 dark:text-zinc-300">System User Access Token <span className="text-red-500">*</span></label>
                      <input 
                        type="password" 
                        value={formData.accessToken}
                        onChange={e => setFormData({...formData, accessToken: e.target.value})}
                        required
                        className="w-full px-1.5 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all dark:text-white text-[13px] font-mono"
                      />
                    </div>

                    <button 
                      type="submit" 
                      disabled={connecting}
                      className="w-full flex justify-center items-center gap-2 bg-primary hover:bg-primary/90 text-white py-2 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20 mt-4 text-[13px]"
                    >
                      {connecting ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <LinkIcon className="w-4 h-4" />
                      )}
                      {language === 'en' ? 'Connect via Tokens' : 'টোকেন দিয়ে কানেক্ট করুন'}
                    </button>
                  </form>
                ) : activeTab === 'unofficial' ? (
                  !quotas?.features?.includes('whatsapp_qr') ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center space-y-3 bg-slate-50 dark:bg-zinc-900 rounded-xl border border-dashed border-slate-300 dark:border-zinc-700">
                      <div className="w-12 h-12 bg-slate-200 dark:bg-zinc-800 text-slate-400 rounded-2xl flex items-center justify-center mb-1">
                        <AlertCircle className="w-6 h-6" />
                      </div>
                      <h3 className="text-[14px] font-bold text-slate-900 dark:text-white">
                        {language === 'en' ? 'Feature Locked' : 'ফিচারটি লক করা আছে'}
                      </h3>
                      <p className="text-[12px] text-slate-500 dark:text-zinc-400 max-w-[250px] mx-auto">
                        {language === 'en' 
                          ? 'Unofficial WhatsApp Web (QR) connection is not included in your current plan.' 
                          : 'আপনার বর্তমান প্ল্যানে আনঅফিসিয়াল হোয়াটসঅ্যাপ ওয়েব (QR) কানেকশনটি নেই।'}
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center space-y-4 bg-slate-50 dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800">
                      <div className="w-16 h-16 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-2xl flex items-center justify-center mb-2">
                        <Smartphone className="w-8 h-8" />
                      </div>
                      <h3 className="text-[14px] font-bold text-slate-900 dark:text-white">
                        {language === 'en' ? 'Connect without API Access' : 'এপিআই এক্সেস ছাড়াই কানেক্ট করুন'}
                      </h3>
                      <p className="text-[12px] text-slate-500 dark:text-zinc-400 max-w-[250px] mx-auto">
                        {language === 'en' 
                          ? 'Link your existing WhatsApp app to the platform by entering an 8-digit pairing code on your phone.' 
                          : 'আপনার ফোন থেকে ৮-ডিজিটের পিয়ারিং কোড দিয়ে আপনার হোয়াটসঅ্যাপ কানেক্ট করুন।'}
                      </p>
                      <button
                        onClick={() => setIsModalOpen(true)}
                        className="mt-2 px-6 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-medium transition-colors flex items-center gap-2 shadow-sm shadow-green-500/20 text-[13px]"
                      >
                        <QrCode className="w-4 h-4" />
                        {language === 'en' ? 'Connect Device' : 'ডিভাইস কানেক্ট করুন'}
                      </button>
                    </div>
                  )
                ) : (
                  <WidgetSettings connections={connections} />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
