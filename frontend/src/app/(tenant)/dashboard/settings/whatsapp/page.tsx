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

  const isLimitReached = quotas && connections.length >= quotas.channelLimit;

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
    <div className="bg-white/70 dark:bg-[#0f0f11]/80 backdrop-blur-xl border border-white/50 dark:border-zinc-800/80 rounded-2xl p-1.5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] max-w-4xl mx-auto space-y-4">
      
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <PhoneCall className="w-6 h-6 text-green-500" />
            {language === 'en' ? 'WhatsApp Numbers' : 'হোয়াটসঅ্যাপ নম্বর'}
          </h1>
          <p className="text-[13px] text-slate-500 dark:text-zinc-400 mt-1">
            {language === 'en' ? 'Connect and manage your WhatsApp Business API numbers.' : 'আপনার হোয়াটসঅ্যাপ বিজনেস এপিআই নম্বর কানেক্ট ও পরিচালনা করুন।'}
          </p>
        </div>
        
        {/* Quota Badge */}
        <div className={`flex flex-col items-end gap-1 ${isLimitReached ? 'text-red-500' : 'text-slate-700 dark:text-zinc-300'}`}>
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-zinc-800/50 px-1.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-700/50">
            <Smartphone className="w-3.5 h-3.5" />
            <span className="text-[13px] font-medium">
              {language === 'en' ? 'Channels Used:' : 'ব্যবহৃত চ্যানেল:'} {connections.length} / {quotas?.channelLimit || '?'}
            </span>
          </div>
          {isLimitReached && (
            <span className="text-[11px] font-medium">
              {language === 'en' ? 'Limit reached. Upgrade plan to connect more.' : 'লিমিট শেষ। আরও কানেক্ট করতে প্ল্যান আপগ্রেড করুন।'}
            </span>
          )}
        </div>
      </div>

      {/* Connected Numbers Table */}
      <div className="bg-white dark:bg-[#121214] border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-1.5 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
          <h2 className="text-[13px] font-bold text-slate-900 dark:text-white">
            {language === 'en' ? 'Connected Numbers' : 'কানেক্টেড নম্বরসমূহ'}
          </h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-slate-50 dark:bg-zinc-900/50 text-slate-500 dark:text-zinc-400 border-b border-slate-200 dark:border-zinc-800">
              <tr>
                <th className="px-1.5 py-2 font-medium">WhatsApp Account</th>
                <th className="px-1.5 py-2 font-medium">Phone ID / WABA</th>
                <th className="px-1.5 py-2 font-medium">Method</th>
                <th className="px-1.5 py-2 font-medium">Status</th>
                <th className="px-1.5 py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-1.5 py-4 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-primary" />
                  </td>
                </tr>
              ) : connections.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-1.5 py-4 text-center text-slate-500 dark:text-zinc-500">
                    {language === 'en' ? 'No WhatsApp numbers connected yet.' : 'এখনো কোনো হোয়াটসঅ্যাপ নম্বর কানেক্ট করা হয়নি।'}
                  </td>
                </tr>
              ) : (
                connections.map((conn) => (
                  <tr key={conn.id} className="hover:bg-slate-50 dark:hover:bg-zinc-900/30 transition-colors">
                    <td className="px-1.5 py-1.5">
                      <div className="font-medium text-slate-900 dark:text-white">{conn.displayName || 'WhatsApp'}</div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">{conn.phoneNumber || 'No number specified'}</div>
                    </td>
                    <td className="px-1.5 py-1.5">
                      <div className="text-[11px] font-mono text-slate-600 dark:text-zinc-400">ID: {conn.phoneNumberId}</div>
                      <div className="text-[11px] font-mono text-slate-500 mt-0.5">WABA: {conn.wabaId}</div>
                    </td>
                    <td className="px-1.5 py-1.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-[11px] font-medium text-slate-600 dark:text-zinc-300">
                        {conn.connectionMethod === 'manual' ? 'API (Manual)' : 'Facebook OAuth'}
                      </span>
                    </td>
                    <td className="px-1.5 py-1.5">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                        conn.status === 'active' 
                          ? 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400'
                          : 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${conn.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        {conn.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-1.5 py-1.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => copyToClipboard(`https://api.yourplatform.com/webhooks/whatsapp`)}
                          title="Copy Webhook URL"
                          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleTest(conn.id)}
                          title="Test Connection"
                          className="p-1 text-blue-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(conn.id)}
                          title="Delete Connection"
                          className="p-1 text-red-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Connection Tabs */}
      <div className="bg-white dark:bg-[#121214] border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
        
        {/* Tab Headers */}
        <div className="flex border-b border-slate-200 dark:border-zinc-800 overflow-x-auto whitespace-nowrap scrollbar-hide">
          <button
            onClick={() => setActiveTab('embedded')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-[13px] font-medium transition-colors min-w-[150px] ${
              activeTab === 'embedded' 
                ? 'bg-slate-50 dark:bg-zinc-900/50 text-blue-600 dark:text-blue-500 border-b-2 border-blue-600 dark:border-blue-500' 
                : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800/30'
            }`}
          >
            <Globe2 className="w-3.5 h-3.5" />
            {language === 'en' ? 'Embedded Signup' : 'ফেসবুক সাইনআপ'}
          </button>
          <button
            onClick={() => setActiveTab('official')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-[13px] font-medium transition-colors min-w-[150px] ${
              activeTab === 'official' 
                ? 'bg-slate-50 dark:bg-zinc-900/50 text-primary border-b-2 border-primary' 
                : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800/30'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {language === 'en' ? 'Manual Tokens' : 'ম্যানুয়াল টোকেন'}
          </button>
          <button
            onClick={() => setActiveTab('unofficial')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-[13px] font-medium transition-colors min-w-[150px] ${
              activeTab === 'unofficial' 
                ? 'bg-slate-50 dark:bg-zinc-900/50 text-green-600 dark:text-green-500 border-b-2 border-green-600 dark:border-green-500' 
                : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800/30'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            {language === 'en' ? 'WhatsApp Web (QR)' : 'হোয়াটসঅ্যাপ ওয়েব'}
          </button>
          <button
            onClick={() => setActiveTab('widget')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-[13px] font-medium transition-colors min-w-[150px] ${
              activeTab === 'widget' 
                ? 'bg-slate-50 dark:bg-zinc-900/50 text-purple-600 dark:text-purple-500 border-b-2 border-purple-600 dark:border-purple-500' 
                : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800/30'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            {language === 'en' ? 'Website Widget' : 'ওয়েবসাইট উইজেট'}
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-1.5">
          
          {/* Instructions Accordion */}
          <div className="mb-8 border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-gradient-to-br from-slate-50 to-white dark:from-zinc-900/30 dark:to-[#121214]">
            <button 
              onClick={() => setShowInstructions(!showInstructions)}
              className="w-full flex items-center justify-between p-1.5 hover:bg-slate-100/50 dark:hover:bg-zinc-800/30 transition-colors"
            >
              <div className="flex items-center gap-2 text-slate-800 dark:text-zinc-200 font-medium">
                <AlertCircle className="w-5 h-5 text-blue-500" />
                {language === 'en' ? 'How to Connect' : 'কিভাবে কানেক্ট করবেন'}
              </div>
              {showInstructions ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </button>
            
            {showInstructions && (
              <div className="p-1.5 pt-0 text-[13px] text-slate-600 dark:text-zinc-400">
                {activeTab === 'embedded' ? (
                  <ol className="space-y-3 list-decimal list-inside ml-2">
                    <li>
                      <strong>{language === 'en' ? 'Click Connect:' : 'কানেক্ট ক্লিক করুন:'}</strong>{' '}
                      {language === 'en' ? 'Click the Continue with Facebook button below.' : 'নিচের ফেসবুক বাটনে ক্লিক করুন।'}
                    </li>
                    <li>
                      <strong>{language === 'en' ? 'Log in to Facebook:' : 'ফেসবুকে লগইন করুন:'}</strong>{' '}
                      {language === 'en' ? 'Log in with the Facebook account that manages your business.' : 'আপনার বিজনেসের ফেসবুক অ্যাকাউন্টে লগইন করুন।'}
                    </li>
                    <li>
                      <strong>{language === 'en' ? 'Select Business Profile:' : 'বিজনেস প্রোফাইল সিলেক্ট করুন:'}</strong>{' '}
                      {language === 'en' ? 'Choose the WhatsApp Business profile you want to connect.' : 'যে হোয়াটসঅ্যাপ অ্যাকাউন্টটি কানেক্ট করতে চান সেটি বেছে নিন।'}
                    </li>
                  </ol>
                ) : activeTab === 'official' ? (
                  <ol className="space-y-4 list-decimal list-inside ml-2">
                    <li>
                      <strong>{language === 'en' ? 'Create a Meta Developer Account:' : 'মেটা ডেভেলপার অ্যাকাউন্ট তৈরি করুন:'}</strong>{' '}
                      {language === 'en' ? 'Go to' : ''} <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="text-primary hover:underline">developers.facebook.com</a> {language === 'en' ? 'and create a business app.' : 'এ যান এবং একটি বিজনেস অ্যাপ তৈরি করুন।'}
                    </li>
                    <li>
                      <strong>{language === 'en' ? 'Add WhatsApp Product:' : 'হোয়াটসঅ্যাপ প্রোডাক্ট যোগ করুন:'}</strong>{' '}
                      {language === 'en' ? 'In your app dashboard, add the "WhatsApp" product.' : 'আপনার অ্যাপ ড্যাশবোর্ডে "WhatsApp" প্রোডাক্ট যোগ করুন।'}
                    </li>
                    <li>
                      <strong>{language === 'en' ? 'Find Credentials:' : 'ক্রেডেনশিয়াল খুঁজুন:'}</strong>{' '}
                      {language === 'en' ? 'Go to WhatsApp > API Setup. Copy the Phone Number ID, WABA ID, and generate a temporary access token (or a permanent system user token).' : 'WhatsApp > API Setup এ যান। Phone Number ID, WABA ID এবং Access Token কপি করুন।'}
                    </li>
                    <li>
                      <strong>{language === 'en' ? 'Paste Below:' : 'নিচে পেস্ট করুন:'}</strong>{' '}
                      {language === 'en' ? 'Enter the copied values into the form below and click Connect.' : 'কপি করা মানগুলো নিচের ফর্মে পেস্ট করে কানেক্ট এ ক্লিক করুন।'}
                    </li>
                  </ol>
                ) : (
                  <div className="space-y-4 ml-2">
                    <div className="p-3 bg-orange-50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-400 border border-orange-200 dark:border-orange-900/50 rounded-xl">
                      <strong>{language === 'en' ? 'Warning:' : 'সতর্কতা:'}</strong> {language === 'en' 
                        ? "Unofficial connections are subject to WhatsApp's anti-spam rules. We limit sending to 10 messages per minute to protect your number from being banned." 
                        : "আনঅফিসিয়াল কানেকশনগুলো হোয়াটসঅ্যাপের অ্যান্টি-স্প্যাম রুলসের আওতাভুক্ত। আপনার নম্বর ব্যান হওয়া থেকে রক্ষা করতে আমরা প্রতি মিনিটে সর্বোচ্চ ১০টি মেসেজ পাঠানোর লিমিট সেট করেছি।"}
                    </div>
                    <ol className="space-y-4 list-decimal list-inside">
                      <li>
                        <strong>{language === 'en' ? 'Click Connect:' : 'কানেক্ট ক্লিক করুন:'}</strong>{' '}
                        {language === 'en' ? 'Click the Link with Phone Number button below.' : 'নিচের লিংক উইথ ফোন নম্বর বাটনে ক্লিক করুন।'}
                      </li>
                      <li>
                        <strong>{language === 'en' ? 'Enter Phone Number:' : 'ফোন নম্বর দিন:'}</strong>{' '}
                        {language === 'en' ? 'Enter your WhatsApp number to get an 8-digit pairing code.' : 'আপনার হোয়াটসঅ্যাপ নম্বর দিয়ে ৮-ডিজিটের কোড পান।'}
                      </li>
                      <li>
                        <strong>{language === 'en' ? 'Link Device:' : 'লিংক করুন:'}</strong>{' '}
                        {language === 'en' ? 'Open WhatsApp on your phone, go to Linked Devices, choose "Link with phone number instead", and enter the code.' : 'মোবাইল থেকে কোডটি এন্টার করুন।'}
                      </li>
                    </ol>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Error / Success Messages */}
          {error && (
            <div className="mb-6 p-1.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-[13px] border border-red-200 dark:border-red-900/30 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              {error}
            </div>
          )}
          {successMessage && (
            <div className="mb-6 p-1.5 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-[13px] border border-green-200 dark:border-green-900/30 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              {successMessage}
            </div>
          )}

          {/* Connection Forms */}
          {activeTab === 'embedded' ? (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
              <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-2xl flex items-center justify-center mb-2">
                <Globe2 className="w-8 h-8" />
              </div>
              <h3 className="text-[14px] font-bold text-slate-900 dark:text-white">
                {language === 'en' ? 'Connect via Facebook' : 'ফেসবুক দিয়ে কানেক্ট করুন'}
              </h3>
              <p className="text-[12px] text-slate-500 dark:text-zinc-400 max-w-sm mx-auto">
                {language === 'en' 
                  ? 'The easiest and officially recommended way. Connect your WhatsApp Business instantly without messing with tokens.' 
                  : 'সবচেয়ে সহজ এবং প্রস্তাবিত পদ্ধতি। কোনো টোকেন কপি না করেই সরাসরি হোয়াটসঅ্যাপ বিজনেস কানেক্ট করুন।'}
              </p>
              <button
                onClick={handleFacebookConnect}
                disabled={connecting || isLimitReached}
                className="mt-2 px-6 py-2.5 rounded-xl bg-[#1877F2] hover:bg-[#1864cc] text-white font-medium transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm shadow-blue-500/20 disabled:cursor-not-allowed text-[13px]"
              >
                {connecting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Globe2 className="w-4 h-4" />}
                {language === 'en' ? 'Continue with Facebook' : 'ফেসবুক দিয়ে চালিয়ে যান'}
              </button>
            </div>
          ) : activeTab === 'official' ? (
            <div className="space-y-4">
              <form onSubmit={handleManualConnect} className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 border border-slate-200 dark:border-zinc-800 rounded-xl bg-slate-50/50 dark:bg-zinc-900/30">
                <div className="md:col-span-2 pb-1">
                  <h3 className="text-[13px] font-bold text-slate-900 dark:text-white">
                    {language === 'en' ? 'Connect via Manual Tokens' : 'ম্যানুয়াল টোকেন দিয়ে কানেক্ট করুন'}
                  </h3>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-slate-700 dark:text-zinc-300">
                    {language === 'en' ? 'Display Name (Optional)' : 'ডিসপ্লে নাম (ঐচ্ছিক)'}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sales Team WA"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    className="w-full px-1.5 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-[12px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-slate-700 dark:text-zinc-300">
                    {language === 'en' ? 'Phone Number (Optional)' : 'ফোন নম্বর (ঐচ্ছিক)'}
                  </label>
                  <input
                    type="text"
                    placeholder="+8801700000000"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className="w-full px-1.5 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-[12px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-slate-700 dark:text-zinc-300">
                    Phone Number ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.phoneNumberId}
                    onChange={(e) => setFormData({ ...formData, phoneNumberId: e.target.value })}
                    className="w-full px-1.5 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-mono text-[12px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-slate-700 dark:text-zinc-300">
                    WhatsApp Business Account ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.wabaId}
                    onChange={(e) => setFormData({ ...formData, wabaId: e.target.value })}
                    className="w-full px-1.5 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-mono text-[12px]"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[13px] font-medium text-slate-700 dark:text-zinc-300">
                    System User Access Token <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={formData.accessToken}
                    onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                    className="w-full px-1.5 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-mono text-[12px]"
                  />
                </div>
                <div className="md:col-span-2 pt-1">
                  <button
                    type="submit"
                    disabled={connecting || isLimitReached}
                    className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white font-medium transition-colors disabled:opacity-50 flex items-center gap-2 disabled:cursor-not-allowed text-[12px]"
                  >
                    {connecting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <LinkIcon className="w-4 h-4" />}
                    {language === 'en' ? 'Connect via Tokens' : 'টোকেন দিয়ে কানেক্ট করুন'}
                  </button>
                </div>
              </form>
            </div>
          ) : activeTab === 'unofficial' ? (
            !quotas?.features?.includes('whatsapp_qr') ? (
              <div className="flex flex-col items-center justify-center py-6 text-center space-y-3 border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl">
                <div className="w-12 h-12 bg-slate-100 dark:bg-zinc-800 text-slate-400 rounded-2xl flex items-center justify-center mb-1">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="text-[14px] font-bold text-slate-900 dark:text-white">
                  {language === 'en' ? 'Feature Locked' : 'ফিচারটি লক করা আছে'}
                </h3>
                <p className="text-[12px] text-slate-500 dark:text-zinc-400 max-w-sm mx-auto">
                  {language === 'en' 
                    ? 'Unofficial WhatsApp Web (QR) connection is not included in your current plan. Please upgrade your package to unlock this feature.' 
                    : 'আপনার বর্তমান প্ল্যানে আনঅফিসিয়াল হোয়াটসঅ্যাপ ওয়েব (QR) কানেকশনটি অন্তর্ভুক্ত নেই। এই ফিচারটি আনলক করতে আপনার প্যাকেজ আপগ্রেড করুন।'}
                </p>
                <a href="/dashboard/settings/subscription" className="mt-1 px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white font-medium transition-colors text-[12px]">
                  {language === 'en' ? 'Upgrade Plan' : 'প্ল্যান আপগ্রেড করুন'}
                </a>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
                <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-2xl flex items-center justify-center mb-1">
                  <Smartphone className="w-6 h-6" />
                </div>
                <h3 className="text-[13px] font-bold text-slate-900 dark:text-white">
                  {language === 'en' ? 'Connect without API Access' : 'এপিআই এক্সেস ছাড়াই কানেক্ট করুন'}
                </h3>
                <p className="text-[12px] text-slate-500 dark:text-zinc-400 max-w-sm mx-auto">
                  {language === 'en' 
                    ? 'Link your existing WhatsApp app to the platform by entering an 8-digit pairing code on your phone.' 
                    : 'আপনার ফোন থেকে ৮-ডিজিটের পিয়ারিং কোড দিয়ে আপনার হোয়াটসঅ্যাপ কানেক্ট করুন।'}
                </p>
                <button
                  onClick={() => setIsModalOpen(true)}
                  disabled={isLimitReached}
                  className="mt-2 px-5 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white font-medium transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm shadow-green-500/20 disabled:cursor-not-allowed text-[12px]"
                >
                  <QrCode className="w-4 h-4" />
                  {language === 'en' ? 'Connect Device (QR / Phone)' : 'ডিভাইস কানেক্ট করুন (QR / Phone)'}
                </button>
              </div>
            )
          ) : null}
          {activeTab === 'widget' && (
            <div className="mt-4">
              <WidgetSettings connections={connections} />
            </div>
          )}
        </div>
      </div>

      
    </div>
  );
}
