'use client';

import { useState } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import { PhoneCall, MessageCircle, Camera, Webhook, ChevronRight, CheckCircle2, ArrowLeft, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import ConnectFacebookPageButton from '@/components/messenger/ConnectFacebookPageButton';
import ConnectFacebookInstagramButton from '@/components/instagram/ConnectFacebookInstagramButton';

export default function NewInboxStepper() {
  const { language } = useLanguage();
  const router = useRouter();
  
  const [step, setStep] = useState(1);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [provider, setProvider] = useState<'cloud' | 'web'>('cloud');
  
  // WhatsApp Cloud / Web Form Data
  const [waData, setWaData] = useState({
    phoneNumberId: '',
    wabaId: '',
    accessToken: '',
    phoneNumber: '',
    displayName: ''
  });

  // Messenger Form Data
  const [fbData, setFbData] = useState({
    pageId: '',
    accessToken: '',
    pageName: ''
  });

  // Instagram Form Data
  const [igData, setIgData] = useState({
    instagramId: '',
    accessToken: '',
    pageName: ''
  });

  const [loading, setLoading] = useState(false);

  const channels = [
    { id: 'whatsapp', name: 'WhatsApp', icon: PhoneCall, color: 'text-emerald-500', desc: language === 'en' ? 'Support customers on WhatsApp' : 'হোয়াটসঅ্যাপে কাস্টমার সাপোর্ট দিন' },
    { id: 'messenger', name: 'Messenger', icon: MessageCircle, color: 'text-blue-500', desc: language === 'en' ? 'Connect your Facebook page' : 'আপনার ফেসবুক পেজ কানেক্ট করুন' },
    { id: 'instagram', name: 'Instagram', icon: Camera, color: 'text-pink-500', desc: language === 'en' ? 'Connect Instagram DMs' : 'ইন্সটাগ্রাম ডিএম (DM) কানেক্ট করুন' },
  ];

  const handleConnectWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/channels/whatsapp/connect/manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...waData, provider })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to connect');
      
      setStep(4);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectMessenger = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/channels/messenger/connect/manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(fbData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to connect');
      
      setStep(4);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectInstagram = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/channels/instagram/connect/manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(igData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to connect');
      
      setStep(4);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full bg-slate-50/50 flex">
      {/* Sidebar Stepper */}
      <div className="w-64 shrink-0 bg-white border-r border-slate-200 p-6 hidden md:block">
        <button onClick={() => router.push('/dashboard/settings/inboxes')} className="flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> {language === 'en' ? 'Back' : 'পেছনে'}
        </button>
        <h2 className="text-lg font-bold text-slate-900 mb-6">{language === 'en' ? 'Inboxes' : 'ইনবক্স'}</h2>
        <div className="space-y-6">
          <div className="flex gap-4">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${step >= 1 ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'}`}>
              {step > 1 ? <CheckCircle2 className="w-4 h-4" /> : '1'}
            </div>
            <div>
              <h3 className={`text-sm font-semibold ${step >= 1 ? 'text-slate-900' : 'text-slate-500'}`}>{language === 'en' ? 'Choose Channel' : 'চ্যানেল বাছাই'}</h3>
              <p className="text-xs text-slate-500 mt-1">{language === 'en' ? 'Select the provider you want to integrate.' : 'যে প্রোভাইডার কানেক্ট করতে চান সেটি বেছে নিন।'}</p>
            </div>
          </div>
          
          <div className="flex gap-4 relative">
            <div className="absolute left-[11px] top-[-30px] w-px h-8 bg-slate-200" />
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${step >= 2 ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'}`}>
              {step > 2 ? <CheckCircle2 className="w-4 h-4" /> : '2'}
            </div>
            <div>
              <h3 className={`text-sm font-semibold ${step >= 2 ? 'text-slate-900' : 'text-slate-500'}`}>{language === 'en' ? 'Create Inbox' : 'ইনবক্স তৈরি'}</h3>
              <p className="text-xs text-slate-500 mt-1">{language === 'en' ? 'Authenticate your account and configure.' : 'আপনার অ্যাকাউন্ট কানেক্ট করুন।'}</p>
            </div>
          </div>

          <div className="flex gap-4 relative">
            <div className="absolute left-[11px] top-[-30px] w-px h-8 bg-slate-200" />
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${step >= 4 ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'}`}>
              4
            </div>
            <div>
              <h3 className={`text-sm font-semibold ${step >= 4 ? 'text-slate-900' : 'text-slate-500'}`}>{language === 'en' ? 'Voila!' : 'সম্পন্ন!'}</h3>
              <p className="text-xs text-slate-500 mt-1">{language === 'en' ? 'You are all set to go!' : 'আপনার সেটআপ সম্পন্ন হয়েছে!'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 md:p-10 max-w-4xl">
        
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">{language === 'en' ? 'Select a Channel' : 'চ্যানেল সিলেক্ট করুন'}</h1>
            <p className="text-sm text-slate-500 mb-8">{language === 'en' ? 'Choose the platform you want to connect to receive messages.' : 'যে প্ল্যাটফর্ম থেকে মেসেজ পেতে চান সেটি নির্বাচন করুন।'}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {channels.map(ch => (
                <button
                  key={ch.id}
                  onClick={() => { setSelectedChannel(ch.id); setStep(2); }}
                  className="bg-white p-6 rounded-xl border border-slate-200 hover:border-primary/50 hover:shadow-lg transition-all text-left group"
                >
                  <ch.icon className={`w-8 h-8 mb-4 ${ch.color} group-hover:scale-110 transition-transform duration-300`} />
                  <h3 className="font-bold text-slate-900 mb-1">{ch.name}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{ch.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && selectedChannel === 'whatsapp' && (
          <div className="animate-in fade-in slide-in-from-right-8 duration-500">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">{language === 'en' ? 'Select your Provider' : 'প্রোভাইডার সিলেক্ট করুন'}</h1>
            <p className="text-sm text-slate-500 mb-8">{language === 'en' ? 'Choose how you want to connect WhatsApp.' : 'কিভাবে হোয়াটসঅ্যাপ কানেক্ট করবেন তা ঠিক করুন।'}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
              <button
                onClick={() => { setProvider('cloud'); setStep(3); }}
                className="bg-white p-6 rounded-xl border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all text-left flex gap-4"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <PhoneCall className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">WhatsApp Cloud</h3>
                  <p className="text-xs text-slate-500 mt-1">{language === 'en' ? 'Official Meta API for high volume.' : 'বেশি মেসেজের জন্য অফিশিয়াল মেটা API।'}</p>
                </div>
              </button>
              <button
                onClick={() => { setProvider('web'); setStep(3); }}
                className="bg-white p-6 rounded-xl border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all text-left flex gap-4"
              >
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                  <PhoneCall className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">WhatsApp Web (Baileys)</h3>
                  <p className="text-xs text-slate-500 mt-1">{language === 'en' ? 'Connect via QR scan for small businesses.' : 'ছোট ব্যবসার জন্য QR স্ক্যান করে কানেক্ট করুন।'}</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Form Step for WhatsApp */}
        {step === 3 && selectedChannel === 'whatsapp' && (
          <div className="animate-in fade-in slide-in-from-right-8 duration-500 max-w-xl bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <h1 className="text-2xl font-bold text-slate-900 mb-6">{language === 'en' ? 'Configure WhatsApp' : 'হোয়াটসঅ্যাপ কনফিগার করুন'} {provider === 'cloud' ? 'Cloud' : 'Web'}</h1>
            {provider === 'cloud' ? (
              <form onSubmit={handleConnectWhatsApp} className="space-y-4">
                <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm mb-4">
                  <p className="font-semibold mb-1">{language === 'en' ? 'Instructions:' : 'নির্দেশনা:'}</p>
                  <ul className="list-disc pl-4 space-y-1 text-xs">
                    <li>{language === 'en' ? 'Go to developers.facebook.com > My Apps.' : 'developers.facebook.com > My Apps-এ যান।'}</li>
                    <li>{language === 'en' ? 'Click on your WhatsApp App > WhatsApp Setup.' : 'আপনার হোয়াটসঅ্যাপ অ্যাপে ঢুকে WhatsApp Setup-এ ক্লিক করুন।'}</li>
                    <li>{language === 'en' ? 'Copy the Phone Number ID, WABA ID and Token from there.' : 'সেখান থেকে Phone Number ID, WABA ID এবং Access Token কপি করে এখানে পেস্ট করুন।'}</li>
                  </ul>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{language === 'en' ? 'Inbox Name' : 'ইনবক্সের নাম'}</label>
                  <input required value={waData.displayName} onChange={e => setWaData({...waData, displayName: e.target.value})} placeholder="e.g. Sales Support" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{language === 'en' ? 'Phone Number' : 'ফোন নাম্বার'}</label>
                  <input required value={waData.phoneNumber} onChange={e => setWaData({...waData, phoneNumber: e.target.value})} placeholder="+8801700000000" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number ID</label>
                  <input required value={waData.phoneNumberId} onChange={e => setWaData({...waData, phoneNumberId: e.target.value})} placeholder="From Meta Dashboard" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Business Account ID (WABA)</label>
                  <input value={waData.wabaId} onChange={e => setWaData({...waData, wabaId: e.target.value})} placeholder="Optional" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Permanent Access Token</label>
                  <input required type="password" value={waData.accessToken} onChange={e => setWaData({...waData, accessToken: e.target.value})} placeholder="EAA..." className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
                </div>
                <button disabled={loading} type="submit" className="w-full bg-primary text-white py-2.5 rounded-lg font-medium hover:bg-primary/90 flex items-center justify-center mt-6 disabled:opacity-50">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (language === 'en' ? 'Create Inbox' : 'ইনবক্স তৈরি করুন')}
                </button>
              </form>
            ) : (
              <div className="text-center py-10">
                <div className="bg-amber-50 text-amber-700 p-4 rounded-xl text-sm mb-6 flex gap-3 text-left">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p>{language === 'en' ? 'QR Code scanning for Baileys is currently managed in the legacy dashboard. Please use the main Inboxes list to access it, or click Connect to initialize.' : 'Baileys এর জন্য QR স্ক্যান আপাতত আগের ড্যাশবোর্ড থেকে করতে হবে। কানেক্ট করার জন্য নিচের বাটনে ক্লিক করুন।'}</p>
                </div>
                <button onClick={() => setStep(4)} className="bg-primary text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary/90">{language === 'en' ? 'Initialize Connection' : 'কানেক্ট করুন'}</button>
              </div>
            )}
          </div>
        )}

        {/* Form Step for Messenger */}
        {(step === 2 || step === 3) && selectedChannel === 'messenger' && (
          <div className="animate-in fade-in slide-in-from-right-8 duration-500 max-w-xl bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <h1 className="text-2xl font-bold text-slate-900 mb-6">{language === 'en' ? 'Configure Messenger' : 'ম্যাসেঞ্জার কনফিগার করুন'}</h1>
            
            <div className="mb-8">
              <ConnectFacebookPageButton onConnected={() => setStep(4)} />
            </div>

            <div className="relative flex items-center py-5">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-medium uppercase">{language === 'en' ? 'Or Manual Setup' : 'অথবা ম্যানুয়াল সেটআপ'}</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            <form onSubmit={handleConnectMessenger} className="space-y-4">
              <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm mb-4">
                <p className="font-semibold mb-1">{language === 'en' ? 'Instructions:' : 'নির্দেশনা:'}</p>
                <ul className="list-disc pl-4 space-y-1 text-xs">
                  <li>{language === 'en' ? 'Go to your Facebook Page > About > Page Transparency to find Page ID.' : 'আপনার ফেসবুক পেজ > About > Page Transparency-তে গিয়ে Page ID টি কপি করুন।'}</li>
                  <li>{language === 'en' ? 'Generate a Page Access Token from Meta Developer Dashboard.' : 'মেটা ডেভেলপার ড্যাশবোর্ড থেকে একটি Page Access Token জেনারেট করে আনুন।'}</li>
                </ul>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{language === 'en' ? 'Page Name / Inbox Name' : 'পেজের নাম / ইনবক্সের নাম'}</label>
                <input required value={fbData.pageName} onChange={e => setFbData({...fbData, pageName: e.target.value})} placeholder="My Business Page" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Facebook Page ID</label>
                <input required value={fbData.pageId} onChange={e => setFbData({...fbData, pageId: e.target.value})} placeholder="e.g. 104561239845" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Page Access Token</label>
                <input required type="password" value={fbData.accessToken} onChange={e => setFbData({...fbData, accessToken: e.target.value})} placeholder="EAA..." className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
              </div>
              <button disabled={loading} type="submit" className="w-full bg-slate-800 text-white py-2.5 rounded-lg font-medium hover:bg-slate-900 flex items-center justify-center mt-6 disabled:opacity-50">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (language === 'en' ? 'Connect Manually' : 'ম্যানুয়ালি কানেক্ট করুন')}
              </button>
            </form>
          </div>
        )}

        {/* Form Step for Instagram */}
        {(step === 2 || step === 3) && selectedChannel === 'instagram' && (
          <div className="animate-in fade-in slide-in-from-right-8 duration-500 max-w-xl bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <h1 className="text-2xl font-bold text-slate-900 mb-6">{language === 'en' ? 'Configure Instagram' : 'ইন্সটাগ্রাম কনফিগার করুন'}</h1>
            
            <div className="mb-8">
              <ConnectFacebookInstagramButton onConnected={() => setStep(4)} />
            </div>

            <div className="relative flex items-center py-5">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-medium uppercase">{language === 'en' ? 'Or Manual Setup' : 'অথবা ম্যানুয়াল সেটআপ'}</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            <form onSubmit={handleConnectInstagram} className="space-y-4">
              <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm mb-4">
                <p className="font-semibold mb-1">{language === 'en' ? 'Instructions:' : 'নির্দেশনা:'}</p>
                <ul className="list-disc pl-4 space-y-1 text-xs">
                  <li>{language === 'en' ? 'Your Instagram Business account must be linked to a Facebook Page.' : 'আপনার ইন্সটাগ্রাম বিজনেস অ্যাকাউন্টটি একটি ফেসবুক পেজের সাথে লিংক করা থাকতে হবে।'}</li>
                  <li>{language === 'en' ? 'Go to Meta Graph API Explorer to find your Instagram Account ID.' : 'মেটা গ্রাফ API এক্সপ্লোরার থেকে Instagram Account ID খুঁজে বের করুন।'}</li>
                  <li>{language === 'en' ? 'Generate a Page Access Token with Instagram permissions.' : 'ইন্সটাগ্রাম পারমিশন সহ একটি Page Access Token জেনারেট করে এখানে দিন।'}</li>
                </ul>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{language === 'en' ? 'Account Name / Inbox Name' : 'অ্যাকাউন্টের নাম / ইনবক্সের নাম'}</label>
                <input required value={igData.pageName} onChange={e => setIgData({...igData, pageName: e.target.value})} placeholder="My IG Page" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Instagram Account ID</label>
                <input required value={igData.instagramId} onChange={e => setIgData({...igData, instagramId: e.target.value})} placeholder="e.g. 1784140000000" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Access Token</label>
                <input required type="password" value={igData.accessToken} onChange={e => setIgData({...igData, accessToken: e.target.value})} placeholder="EAA..." className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
              </div>
              <button disabled={loading} type="submit" className="w-full bg-slate-800 text-white py-2.5 rounded-lg font-medium hover:bg-slate-900 flex items-center justify-center mt-6 disabled:opacity-50">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (language === 'en' ? 'Connect Manually' : 'ম্যানুয়ালি কানেক্ট করুন')}
              </button>
            </form>
          </div>
        )}
        
        {/* Step 4: Success */}
        {step === 4 && (
          <div className="animate-in zoom-in-95 duration-500 max-w-md mx-auto text-center py-12">
            <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-500/20">
              <Sparkles className="w-10 h-10" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-4">{language === 'en' ? 'You are all set!' : 'আপনার সেটআপ সম্পন্ন হয়েছে!'}</h1>
            <p className="text-slate-500 mb-8 leading-relaxed">
              {language === 'en' 
                ? 'Your new inbox has been configured and is ready to receive messages. The AI Assistant is turned on by default.' 
                : 'আপনার ইনবক্সটি এখন মেসেজ গ্রহণ করার জন্য প্রস্তুত। এআই অ্যাসিস্ট্যান্ট ডিফল্টভাবে অন করা আছে।'}
            </p>
            <button 
              onClick={() => router.push('/dashboard/settings/inboxes')}
              className="bg-primary text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg hover:shadow-primary/30 transition-all hover:-translate-y-0.5"
            >
              {language === 'en' ? 'Take me to Inboxes' : 'ইনবক্সে ফিরে যান'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
