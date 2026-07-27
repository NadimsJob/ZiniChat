'use client';

import { useState } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import { PhoneCall, MessageCircle, Camera, Webhook, ChevronRight, CheckCircle2, ArrowLeft, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

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

  const [loading, setLoading] = useState(false);

  const channels = [
    { id: 'whatsapp', name: 'WhatsApp', icon: PhoneCall, color: 'text-emerald-500', desc: 'Support customers on WhatsApp' },
    { id: 'messenger', name: 'Messenger', icon: MessageCircle, color: 'text-blue-500', desc: 'Connect your Facebook page' },
    { id: 'instagram', name: 'Instagram', icon: Camera, color: 'text-pink-500', desc: 'Connect Instagram DMs' },
    { id: 'api', name: 'API', icon: Webhook, color: 'text-slate-600', desc: 'Custom channel via API' }
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
      
      setStep(4); // Success step
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
      
      setStep(4); // Success step
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
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </button>
        <h2 className="text-lg font-bold text-slate-900 mb-6">Inboxes</h2>
        <div className="space-y-6">
          <div className="flex gap-4">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${step >= 1 ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'}`}>
              {step > 1 ? <CheckCircle2 className="w-4 h-4" /> : '1'}
            </div>
            <div>
              <h3 className={`text-sm font-semibold ${step >= 1 ? 'text-slate-900' : 'text-slate-500'}`}>Choose Channel</h3>
              <p className="text-xs text-slate-500 mt-1">Select the provider you want to integrate.</p>
            </div>
          </div>
          
          <div className="flex gap-4 relative">
            <div className="absolute left-[11px] top-[-30px] w-px h-8 bg-slate-200" />
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${step >= 2 ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'}`}>
              {step > 2 ? <CheckCircle2 className="w-4 h-4" /> : '2'}
            </div>
            <div>
              <h3 className={`text-sm font-semibold ${step >= 2 ? 'text-slate-900' : 'text-slate-500'}`}>Create Inbox</h3>
              <p className="text-xs text-slate-500 mt-1">Authenticate your account and configure.</p>
            </div>
          </div>

          <div className="flex gap-4 relative">
            <div className="absolute left-[11px] top-[-30px] w-px h-8 bg-slate-200" />
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${step >= 4 ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'}`}>
              4
            </div>
            <div>
              <h3 className={`text-sm font-semibold ${step >= 4 ? 'text-slate-900' : 'text-slate-500'}`}>Voila!</h3>
              <p className="text-xs text-slate-500 mt-1">You are all set to go!</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 md:p-10 max-w-4xl">
        
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Select a Channel</h1>
            <p className="text-sm text-slate-500 mb-8">Choose the platform you want to connect to receive messages.</p>
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
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Select your Provider</h1>
            <p className="text-sm text-slate-500 mb-8">Choose how you want to connect WhatsApp.</p>
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
                  <p className="text-xs text-slate-500 mt-1">Official Meta API for high volume.</p>
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
                  <p className="text-xs text-slate-500 mt-1">Connect via QR scan for small businesses.</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Form Step for WhatsApp */}
        {step === 3 && selectedChannel === 'whatsapp' && (
          <div className="animate-in fade-in slide-in-from-right-8 duration-500 max-w-xl bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <h1 className="text-2xl font-bold text-slate-900 mb-6">Configure WhatsApp {provider === 'cloud' ? 'Cloud' : 'Web'}</h1>
            {provider === 'cloud' ? (
              <form onSubmit={handleConnectWhatsApp} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Inbox Name</label>
                  <input required value={waData.displayName} onChange={e => setWaData({...waData, displayName: e.target.value})} placeholder="e.g. Sales Support" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
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
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Inbox'}
                </button>
              </form>
            ) : (
              <div className="text-center py-10">
                <div className="bg-amber-50 text-amber-700 p-4 rounded-xl text-sm mb-6 flex gap-3 text-left">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p>QR Code scanning for Baileys is currently managed in the legacy dashboard. Please use the main Inboxes list to access it, or click Connect to initialize.</p>
                </div>
                <button onClick={() => setStep(4)} className="bg-primary text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary/90">Initialize Connection</button>
              </div>
            )}
          </div>
        )}

        {/* Form Step for Messenger */}
        {(step === 2 || step === 3) && selectedChannel === 'messenger' && (
          <div className="animate-in fade-in slide-in-from-right-8 duration-500 max-w-xl bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <h1 className="text-2xl font-bold text-slate-900 mb-6">Configure Messenger</h1>
            <form onSubmit={handleConnectMessenger} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Page Name / Inbox Name</label>
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
              <button disabled={loading} type="submit" className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center mt-6 disabled:opacity-50">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Connect Messenger'}
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
            <h1 className="text-3xl font-bold text-slate-900 mb-4">You are all set!</h1>
            <p className="text-slate-500 mb-8 leading-relaxed">
              Your new inbox has been configured and is ready to receive messages. 
              The AI Assistant is turned on by default.
            </p>
            <button 
              onClick={() => router.push('/dashboard/settings/inboxes')}
              className="bg-primary text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg hover:shadow-primary/30 transition-all hover:-translate-y-0.5"
            >
              Take me to Inboxes
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
