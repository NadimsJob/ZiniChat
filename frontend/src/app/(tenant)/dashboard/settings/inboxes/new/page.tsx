'use client';

import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import {
  PhoneCall, MessageCircle, Camera, ChevronRight, CheckCircle2, ArrowLeft,
  Loader2, Sparkles, AlertCircle, Lock, TrendingUp, Crown, QrCode as QrIcon, Smartphone, RefreshCw
} from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';
import QRCode from 'react-qr-code';
import { io, Socket } from 'socket.io-client';
import ConnectFacebookPageButton from '@/components/messenger/ConnectFacebookPageButton';
import ConnectFacebookInstagramButton from '@/components/instagram/ConnectFacebookInstagramButton';
import ConnectWhatsAppButton from '@/components/whatsapp/ConnectWhatsAppButton';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function NewInboxStepper() {
  const { language } = useLanguage();
  const router = useRouter();
  
  const [step, setStep] = useState(1);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [provider, setProvider] = useState<'cloud' | 'web'>('cloud');

  // Quota state
  const [quotas, setQuotas] = useState<any>(null);
  const [quotasLoading, setQuotasLoading] = useState(true);
  
  // WhatsApp Cloud Form Data
  const [waData, setWaData] = useState({
    phoneNumberId: '',
    wabaId: '',
    accessToken: '',
    phoneNumber: '',
    displayName: ''
  });

  // WhatsApp Web State
  const [webAuthMethod, setWebAuthMethod] = useState<'qr' | 'pairing'>('qr');
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [pairingPhone, setPairingPhone] = useState('');
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [pairingLoading, setPairingLoading] = useState(false);
  const socketRef = useRef<Socket | null>(null);

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

  useEffect(() => {
    const fetchQuotas = async () => {
      try {
        const token = Cookies.get('access_token');
        const res = await fetch(`${API}/billing/quotas`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) setQuotas(await res.json());
      } catch (err) {
        console.error('Failed to load quotas', err);
      } finally {
        setQuotasLoading(false);
      }
    };
    fetchQuotas();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const handleConnectedSuccess = () => {
    toast.success(language === 'en' ? 'WhatsApp Web connected successfully! 🎉' : 'হোয়াটসঅ্যাপ ওয়েব সফলভাবে কানেক্ট হয়েছে! 🎉');
    setStep(4);
    setTimeout(() => {
      router.push('/dashboard/settings/inboxes');
    }, 1800);
  };

  // Polling fallback while waiting for QR scan / pairing
  useEffect(() => {
    if (step !== 3 || selectedChannel !== 'whatsapp' || provider !== 'web') return;

    const interval = setInterval(async () => {
      try {
        const token = Cookies.get('access_token');
        const res = await fetch(`${API}/inbox/channels`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const channels = await res.json();
          const webConn = channels.find((c: any) => c.provider === 'WEB_QR' && (c.isConnected || c.status === 'active'));
          if (webConn) {
            clearInterval(interval);
            handleConnectedSuccess();
          }
        }
      } catch (e) {}
    }, 2500);

    return () => clearInterval(interval);
  }, [step, selectedChannel, provider]);

  const channelDefs = [
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: PhoneCall,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      borderActive: 'border-emerald-500',
      desc: language === 'en' ? 'Support customers on WhatsApp (Cloud API or QR Web)' : 'হোয়াটসঅ্যাপে কাস্টমার সাপোর্ট দিন (Cloud API বা QR ওয়েব)',
      limit: quotas?.whatsappLimit ?? 1,
      current: quotas?.currentWhatsapp ?? 0,
    },
    {
      id: 'messenger',
      name: 'Messenger',
      icon: MessageCircle,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      borderActive: 'border-blue-500',
      desc: language === 'en' ? 'Connect your Facebook Page inbox' : 'আপনার ফেসবুক পেজ কানেক্ট করুন',
      limit: quotas?.messengerLimit ?? 1,
      current: quotas?.currentMessenger ?? 0,
    },
    {
      id: 'instagram',
      name: 'Instagram',
      icon: Camera,
      color: 'text-pink-500',
      bgColor: 'bg-pink-500/10',
      borderActive: 'border-pink-500',
      desc: language === 'en' ? 'Connect Instagram DMs to your inbox' : 'ইন্সটাগ্রাম ডিএম কানেক্ট করুন',
      limit: quotas?.instagramLimit ?? 1,
      current: quotas?.currentInstagram ?? 0,
    },
  ];

  const handleChannelSelect = (ch: typeof channelDefs[0]) => {
    if (ch.current >= ch.limit) {
      toast.error(
        language === 'en'
          ? `Your plan allows ${ch.limit} ${ch.name} connection${ch.limit > 1 ? 's' : ''}. Upgrade your plan to add more.`
          : `আপনার প্ল্যানে ${ch.limit}টি ${ch.name} কানেকশন অনুমোদিত। আরো যোগ করতে প্ল্যান আপগ্রেড করুন।`,
        { duration: 4000, icon: '🔒' }
      );
      return;
    }
    setSelectedChannel(ch.id);
    setStep(ch.id === 'whatsapp' ? 2 : 3);
  };

  // Setup WebSocket connection for WhatsApp Web QR updates
  const initWebSocket = () => {
    if (socketRef.current?.connected) return;
    
    const token = Cookies.get('access_token');
    const wsUrl = API.replace(/^http/, 'ws');
    
    const socket = io(`${wsUrl}/inbox`, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    socket.on('whatsapp_qr_code', (data: { qr: string }) => {
      setQrCodeData(data.qr);
      setQrLoading(false);
    });

    // Listen to both event names for maximum reliability
    socket.on('whatsapp_qr_connected', handleConnectedSuccess);
    socket.on('whatsapp_connected', handleConnectedSuccess);

    socketRef.current = socket;
  };

  // WhatsApp Web QR Code Initializer
  const handleStartQr = async () => {
    setQrLoading(true);
    setQrCodeData(null);
    initWebSocket();

    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/whatsapp-web/start-qr`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to start QR session');
      }
      toast.success(language === 'en' ? 'Generating QR Code...' : 'কিউআর কোড তৈরি করা হচ্ছে...');
    } catch (err: any) {
      toast.error(err.message);
      setQrLoading(false);
    }
  };

  // WhatsApp Web Pairing Code Generator
  const handleStartPairing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pairingPhone) {
      toast.error(language === 'en' ? 'Please enter a phone number' : 'ফোন নম্বর দিন');
      return;
    }
    setPairingLoading(true);
    setPairingCode(null);
    initWebSocket();

    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/whatsapp-web/start-pairing`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ phoneNumber: pairingPhone })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to get pairing code');
      }
      setPairingCode(data.pairingCode);
      toast.success(language === 'en' ? 'Pairing Code Generated!' : 'পেয়ারিং কোড তৈরি হয়েছে!');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setPairingLoading(false);
    }
  };

  const handleConnectWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/channels/whatsapp/connect/manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...waData, provider })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to connect');
      handleConnectedSuccess();
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
      const res = await fetch(`${API}/channels/messenger/connect/manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(fbData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to connect');
      handleConnectedSuccess();
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
      const res = await fetch(`${API}/channels/instagram/connect/manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(igData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to connect');
      handleConnectedSuccess();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Sidebar step item
  const SidebarStep = ({ num, title, desc, active, done }: any) => (
    <div className="flex gap-3 relative">
      {num > 1 && <div className="absolute left-[11px] top-[-28px] w-px h-7 bg-surface-hover" />}
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 transition-all ${
        done ? 'bg-primary text-primary-foreground' : active ? 'bg-primary/20 text-primary border-2 border-primary' : 'bg-surface-hover text-zinc-400'
      }`}>
        {done ? <CheckCircle2 className="w-4 h-4" /> : num}
      </div>
      <div>
        <h3 className={`text-[13px] font-semibold ${active || done ? 'text-foreground' : 'text-zinc-500'}`}>{title}</h3>
        <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">{desc}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-full flex bg-background">
      <Toaster position="top-right" />
      
      {/* Sidebar Stepper */}
      <div className="w-64 shrink-0 bg-surface/70 backdrop-blur-xl border-r border-surface-hover p-6 hidden md:flex flex-col">
        <button
          onClick={() => router.push('/dashboard/settings/inboxes')}
          className="flex items-center text-[12px] font-medium text-zinc-400 hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          {language === 'en' ? 'Back to Inboxes' : 'ইনবক্সে ফিরুন'}
        </button>
        <h2 className="text-[15px] font-bold text-foreground mb-6">
          {language === 'en' ? 'Setup Wizard' : 'সেটআপ উইজার্ড'}
        </h2>
        <div className="space-y-6">
          <SidebarStep num={1} title={language === 'en' ? 'Choose Channel' : 'চ্যানেল বাছাই'} desc={language === 'en' ? 'Select the platform to integrate.' : 'ইন্টিগ্রেট করার প্ল্যাটফর্ম বেছে নিন।'} active={step === 1} done={step > 1} />
          <SidebarStep num={2} title={language === 'en' ? 'Select Provider' : 'প্রোভাইডার বাছাই'} desc={language === 'en' ? 'Cloud API or WhatsApp Web.' : 'Cloud API বা WhatsApp Web।'} active={step === 2} done={step > 2} />
          <SidebarStep num={3} title={language === 'en' ? 'Configure Inbox' : 'ইনবক্স কনফিগার'} desc={language === 'en' ? 'Authenticate your account.' : 'আপনার অ্যাকাউন্ট কানেক্ট করুন।'} active={step === 3} done={step > 3} />
          <SidebarStep num={4} title={language === 'en' ? 'Done!' : 'সম্পন্ন!'} desc={language === 'en' ? 'You are all set to go!' : 'আপনার সেটআপ সম্পন্ন!'} active={step === 4} done={false} />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-5 md:p-10 max-w-4xl overflow-y-auto">

        {/* Step 1: Channel Selection with quota */}
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-400">
            <h1 className="text-2xl font-black text-foreground mb-1">
              {language === 'en' ? 'Select a Channel' : 'চ্যানেল সিলেক্ট করুন'}
            </h1>
            <p className="text-[13px] text-zinc-400 mb-8">
              {language === 'en'
                ? 'Choose a platform to connect. Locked channels have reached your plan\'s limit.'
                : 'কানেক্ট করার প্ল্যাটফর্ম নির্বাচন করুন। লক থাকা চ্যানেলগুলো আপনার প্ল্যানের সীমায় পৌঁছে গেছে।'}
            </p>

            {quotasLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => <div key={i} className="h-40 bg-surface-hover/50 rounded-2xl animate-pulse" />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {channelDefs.map(ch => {
                  const isLocked = ch.current >= ch.limit;
                  const usagePercent = ch.limit > 0 ? Math.min((ch.current / ch.limit) * 100, 100) : 100;

                  return (
                    <button
                      key={ch.id}
                      onClick={() => handleChannelSelect(ch)}
                      className={`relative text-left p-5 rounded-2xl border transition-all group ${
                        isLocked
                          ? 'bg-surface/30 border-surface-hover cursor-not-allowed opacity-70'
                          : 'bg-surface/70 backdrop-blur-sm border-surface-hover hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 active:scale-[0.98]'
                      }`}>

                      {/* Lock badge */}
                      {isLocked && (
                        <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 bg-orange-500/15 text-orange-400 rounded-full text-[10px] font-bold border border-orange-500/20">
                          <Lock className="w-2.5 h-2.5" />
                          {language === 'en' ? 'Limit Reached' : 'সীমা পূর্ণ'}
                        </div>
                      )}

                      {/* Icon */}
                      <div className={`w-11 h-11 rounded-xl ${ch.bgColor} flex items-center justify-center mb-4 ${!isLocked ? 'group-hover:scale-110 transition-transform duration-300' : ''}`}>
                        {isLocked
                          ? <Lock className={`w-5 h-5 ${ch.color}`} />
                          : <ch.icon className={`w-5 h-5 ${ch.color}`} />
                        }
                      </div>

                      <h3 className="font-bold text-[14px] text-foreground mb-1">{ch.name}</h3>
                      <p className="text-[11px] text-zinc-400 leading-relaxed mb-4">{ch.desc}</p>

                      {/* Quota bar */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] text-zinc-400">
                          <span>{language === 'en' ? 'Connections' : 'কানেকশন'}</span>
                          <span className={`font-bold ${isLocked ? 'text-orange-400' : 'text-foreground'}`}>
                            {ch.current} / {ch.limit}
                          </span>
                        </div>
                        <div className="h-1 bg-surface-hover rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isLocked ? 'bg-orange-400' : usagePercent > 75 ? 'bg-yellow-500' : 'bg-primary'
                            }`}
                            style={{ width: `${usagePercent}%` }}
                          />
                        </div>
                      </div>

                      {/* Upgrade CTA for locked */}
                      {isLocked && (
                        <div
                          onClick={(e) => { e.stopPropagation(); router.push('/dashboard/settings/subscription'); }}
                          className="mt-3 flex items-center gap-1.5 text-[11px] text-primary font-bold hover:underline cursor-pointer">
                          <Crown className="w-3 h-3" />
                          {language === 'en' ? 'Upgrade Plan →' : 'প্ল্যান আপগ্রেড করুন →'}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Plan quota overview note */}
            {!quotasLoading && quotas && (
              <div className="mt-6 flex items-start gap-2.5 p-3.5 bg-blue-500/5 border border-blue-500/15 rounded-xl">
                <TrendingUp className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                <p className="text-[12px] text-zinc-400 leading-relaxed">
                  {language === 'en'
                    ? `Your current plan allows: WhatsApp ×${quotas.whatsappLimit}, Messenger ×${quotas.messengerLimit}, Instagram ×${quotas.instagramLimit}.`
                    : `আপনার বর্তমান প্ল্যানে: WhatsApp ×${quotas.whatsappLimit}, Messenger ×${quotas.messengerLimit}, Instagram ×${quotas.instagramLimit} কানেক্ট করতে পারবেন।`}
                  {' '}<button onClick={() => router.push('/dashboard/settings/subscription')} className="text-primary font-bold hover:underline">
                    {language === 'en' ? 'Upgrade Plan' : 'আপগ্রেড করুন'}
                  </button>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 2: WhatsApp Provider Selection */}
        {step === 2 && selectedChannel === 'whatsapp' && (
          <div className="animate-in fade-in slide-in-from-right-8 duration-400">
            <button onClick={() => setStep(1)} className="flex items-center text-[12px] text-zinc-400 hover:text-foreground mb-6 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> {language === 'en' ? 'Back' : 'পেছনে'}
            </button>
            <h1 className="text-2xl font-black text-foreground mb-1">
              {language === 'en' ? 'Choose Provider' : 'প্রোভাইডার বেছে নিন'}
            </h1>
            <p className="text-[13px] text-zinc-400 mb-8">
              {language === 'en' ? 'How do you want to connect WhatsApp?' : 'কিভাবে WhatsApp কানেক্ট করবেন?'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
              <button
                onClick={() => { setProvider('cloud'); setStep(3); }}
                className="bg-surface/70 backdrop-blur-sm p-6 rounded-2xl border border-surface-hover hover:border-emerald-500/50 hover:shadow-lg transition-all text-left group">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <PhoneCall className="w-5 h-5 text-emerald-500" />
                </div>
                <h3 className="font-bold text-[14px] text-foreground mb-1">WhatsApp Cloud API</h3>
                <p className="text-[12px] text-zinc-400 leading-relaxed">
                  {language === 'en' ? 'Official Meta API. Best for high-volume messaging.' : 'অফিশিয়াল মেটা API। বেশি মেসেজের জন্য সর্বোত্তম।'}
                </p>
                <div className="mt-3 flex items-center gap-1 text-emerald-500 text-[11px] font-bold">
                  {language === 'en' ? 'Recommended' : 'প্রস্তাবিত'} <ChevronRight className="w-3 h-3" />
                </div>
              </button>

              <button
                onClick={() => { setProvider('web'); setStep(3); }}
                className="bg-surface/70 backdrop-blur-sm p-6 rounded-2xl border border-surface-hover hover:border-primary/50 hover:shadow-lg transition-all text-left group">
                <div className="w-11 h-11 rounded-xl bg-surface-hover flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <PhoneCall className="w-5 h-5 text-zinc-400" />
                </div>
                <h3 className="font-bold text-[14px] text-foreground mb-1">WhatsApp Web (Baileys)</h3>
                <p className="text-[12px] text-zinc-400 leading-relaxed">
                  {language === 'en' ? 'Connect via QR scan or Pairing Code. Suitable for small businesses.' : 'QR স্ক্যান বা পেয়ারিং কোড দিয়ে কানেক্ট করুন। ছোট ব্যবসার জন্য।'}
                </p>
              </button>
            </div>
          </div>
        )}

        {/* Step 3: WhatsApp Configuration */}
        {step === 3 && selectedChannel === 'whatsapp' && (
          <div className="animate-in fade-in slide-in-from-right-8 duration-400 max-w-xl">
            <button onClick={() => setStep(2)} className="flex items-center text-[12px] text-zinc-400 hover:text-foreground mb-6 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> {language === 'en' ? 'Back' : 'পেছনে'}
            </button>
            <h1 className="text-2xl font-black text-foreground mb-6">
              {language === 'en' ? 'Configure WhatsApp' : 'WhatsApp কনফিগার করুন'} {provider === 'cloud' ? 'Cloud' : 'Web'}
            </h1>

            {provider === 'cloud' ? (
              <div className="bg-surface/70 backdrop-blur-xl border border-surface-hover rounded-2xl p-6">
                <div className="mb-6">
                  <ConnectWhatsAppButton onConnected={handleConnectedSuccess} />
                </div>
                <div className="relative flex items-center py-4">
                  <div className="flex-grow border-t border-surface-hover" />
                  <span className="flex-shrink-0 mx-4 text-zinc-500 text-[11px] font-medium uppercase tracking-wider">
                    {language === 'en' ? 'Or Manual Setup' : 'অথবা ম্যানুয়াল সেটআপ'}
                  </span>
                  <div className="flex-grow border-t border-surface-hover" />
                </div>
                <form onSubmit={handleConnectWhatsApp} className="space-y-4">
                  {[
                    { label: language === 'en' ? 'Inbox Name' : 'ইনবক্সের নাম', value: waData.displayName, key: 'displayName', placeholder: 'e.g. Sales Support', type: 'text' },
                    { label: language === 'en' ? 'Phone Number' : 'ফোন নম্বর', value: waData.phoneNumber, key: 'phoneNumber', placeholder: '+8801700000000', type: 'text' },
                    { label: 'Phone Number ID', value: waData.phoneNumberId, key: 'phoneNumberId', placeholder: 'From Meta Dashboard', type: 'text' },
                    { label: 'Business Account ID (WABA)', value: waData.wabaId, key: 'wabaId', placeholder: 'Optional', type: 'text' },
                    { label: 'Permanent Access Token', value: waData.accessToken, key: 'accessToken', placeholder: 'EAA...', type: 'password' },
                  ].map(field => (
                    <div key={field.key}>
                      <label className="block text-[12px] font-bold text-zinc-400 mb-1">{field.label}</label>
                      <input
                        required={field.key !== 'wabaId'}
                        type={field.type}
                        value={field.value}
                        onChange={e => setWaData({ ...waData, [field.key]: e.target.value })}
                        placeholder={field.placeholder}
                        className="w-full bg-background border border-surface-hover rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-primary transition-colors"
                      />
                    </div>
                  ))}
                  <button disabled={loading} type="submit" className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl font-bold hover:bg-primary/90 flex items-center justify-center mt-4 disabled:opacity-50 transition-all">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (language === 'en' ? 'Create Inbox' : 'ইনবক্স তৈরি করুন')}
                  </button>
                </form>
              </div>
            ) : (
              /* FULL INTERACTIVE WHATSAPP WEB (BAILEYS) AUTHENTICATION FLOW */
              <div className="bg-surface/70 backdrop-blur-xl border border-surface-hover rounded-2xl p-6 space-y-6">
                
                {/* Method selector tabs */}
                <div className="flex bg-background border border-surface-hover p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setWebAuthMethod('qr')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      webAuthMethod === 'qr' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-zinc-400 hover:text-foreground'
                    }`}
                  >
                    <QrIcon className="w-3.5 h-3.5" />
                    <span>{language === 'en' ? 'Scan QR Code' : 'QR কোড স্ক্যান'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setWebAuthMethod('pairing')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      webAuthMethod === 'pairing' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-zinc-400 hover:text-foreground'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>{language === 'en' ? 'Pairing Code' : 'পেয়ারিং কোড'}</span>
                  </button>
                </div>

                {/* QR Code Tab View */}
                {webAuthMethod === 'qr' && (
                  <div className="text-center space-y-5">
                    {!qrCodeData ? (
                      <div className="py-6 space-y-4">
                        <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto border border-emerald-500/20">
                          <QrIcon className="w-8 h-8 text-emerald-500" />
                        </div>
                        <h3 className="text-sm font-bold text-foreground">
                          {language === 'en' ? 'Generate WhatsApp Web QR' : 'WhatsApp Web QR তৈরি করুন'}
                        </h3>
                        <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                          {language === 'en' 
                            ? 'Click Initialize Connection to generate a live QR code, then scan it using WhatsApp on your phone.' 
                            : 'কানেকশন শুরু করতে নিচের বাটনে ক্লিক করুন। আপনার ফোনের হোয়াটসঅ্যাপ অ্যাপ দিয়ে QR কোডটি স্ক্যান করুন।'}
                        </p>
                        <button
                          onClick={handleStartQr}
                          disabled={qrLoading}
                          className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 mx-auto disabled:opacity-50 transition-all cursor-pointer"
                        >
                          {qrLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                          <span>{qrLoading ? (language === 'en' ? 'Initializing...' : 'তৈরি করা হচ্ছে...') : (language === 'en' ? 'Initialize Connection' : 'কানেকশন শুরু করুন')}</span>
                        </button>
                      </div>
                    ) : (
                      <div className="py-4 space-y-4 animate-in fade-in duration-300">
                        <div className="bg-white p-4 rounded-2xl inline-block shadow-md border border-slate-200">
                          <QRCode value={qrCodeData} size={200} />
                        </div>
                        <div className="text-xs text-zinc-400 space-y-1">
                          <p className="font-bold text-foreground">{language === 'en' ? 'Scan with WhatsApp' : 'WhatsApp দিয়ে স্ক্যান করুন'}</p>
                          <p>{language === 'en' ? 'Open WhatsApp → Settings → Linked Devices → Link a Device' : 'WhatsApp খুলুন → Settings → Linked Devices → Link a Device'}</p>
                        </div>
                        <button
                          onClick={handleStartQr}
                          className="px-3 py-1.5 bg-surface-hover text-zinc-300 hover:text-foreground rounded-lg text-[11px] font-bold inline-flex items-center gap-1 transition-colors"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>{language === 'en' ? 'Refresh QR Code' : 'QR রিফ্রেশ করুন'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Pairing Code Tab View */}
                {webAuthMethod === 'pairing' && (
                  <div className="space-y-4">
                    <form onSubmit={handleStartPairing} className="space-y-3">
                      <div>
                        <label className="block text-[12px] font-bold text-zinc-400 mb-1">
                          {language === 'en' ? 'WhatsApp Phone Number' : 'হোয়াটসঅ্যাপ ফোন নম্বর'}
                        </label>
                        <input
                          type="text"
                          required
                          value={pairingPhone}
                          onChange={e => setPairingPhone(e.target.value)}
                          placeholder="+8801700000000"
                          className="w-full bg-background border border-surface-hover rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-primary text-foreground"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={pairingLoading}
                        className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl font-bold hover:bg-primary/90 flex items-center justify-center gap-2 disabled:opacity-50 text-xs transition-all cursor-pointer"
                      >
                        {pairingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
                        <span>{language === 'en' ? 'Get Pairing Code' : 'পেয়ারিং কোড পান'}</span>
                      </button>
                    </form>

                    {pairingCode && (
                      <div className="bg-surface/80 border border-primary/30 p-5 rounded-2xl text-center space-y-2 animate-in zoom-in-95 duration-300">
                        <div className="text-xs text-zinc-400 font-bold uppercase tracking-wider">
                          {language === 'en' ? 'Your WhatsApp Pairing Code' : 'আপনার পেয়ারিং কোড'}
                        </div>
                        <div className="text-3xl font-mono font-black text-emerald-400 tracking-widest py-1 bg-background rounded-xl border border-surface-hover">
                          {pairingCode}
                        </div>
                        <p className="text-[11px] text-zinc-400">
                          {language === 'en' 
                            ? 'Open WhatsApp → Linked Devices → Link with phone number instead → Enter Code' 
                            : 'WhatsApp খুলুন → Linked Devices → Link with phone number instead → কোডটি দিন'}
                        </p>
                      </div>
                    )}
                  </div>
                )}

              </div>
            )}
          </div>
        )}

        {/* Step 3: Messenger */}
        {(step === 2 || step === 3) && selectedChannel === 'messenger' && (
          <div className="animate-in fade-in slide-in-from-right-8 duration-400 max-w-xl">
            <button onClick={() => setStep(1)} className="flex items-center text-[12px] text-zinc-400 hover:text-foreground mb-6 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> {language === 'en' ? 'Back' : 'পেছনে'}
            </button>
            <h1 className="text-2xl font-black text-foreground mb-6">
              {language === 'en' ? 'Configure Messenger' : 'Messenger কনফিগার করুন'}
            </h1>
            <div className="bg-surface/70 backdrop-blur-xl border border-surface-hover rounded-2xl p-6 space-y-5">
              <div>
                <ConnectFacebookPageButton onConnected={handleConnectedSuccess} />
              </div>
              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-surface-hover" />
                <span className="flex-shrink-0 mx-4 text-zinc-500 text-[11px] font-medium uppercase tracking-wider">
                  {language === 'en' ? 'Or Manual Setup' : 'অথবা ম্যানুয়াল সেটআপ'}
                </span>
                <div className="flex-grow border-t border-surface-hover" />
              </div>
              <form onSubmit={handleConnectMessenger} className="space-y-4">
                {[
                  { label: language === 'en' ? 'Page Name / Inbox Name' : 'পেজের নাম / ইনবক্সের নাম', value: fbData.pageName, key: 'pageName', placeholder: 'My Business Page', type: 'text' },
                  { label: 'Facebook Page ID', value: fbData.pageId, key: 'pageId', placeholder: 'e.g. 104561239845', type: 'text' },
                  { label: 'Page Access Token', value: fbData.accessToken, key: 'accessToken', placeholder: 'EAA...', type: 'password' },
                ].map(field => (
                  <div key={field.key}>
                    <label className="block text-[12px] font-bold text-zinc-400 mb-1">{field.label}</label>
                    <input required type={field.type} value={field.value} onChange={e => setFbData({ ...fbData, [field.key]: e.target.value })} placeholder={field.placeholder} className="w-full bg-background border border-surface-hover rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-primary transition-colors text-foreground" />
                  </div>
                ))}
                <button disabled={loading} type="submit" className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-bold hover:bg-blue-700 flex items-center justify-center disabled:opacity-50 transition-all">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (language === 'en' ? 'Connect Manually' : 'ম্যানুয়ালি কানেক্ট করুন')}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Step 3: Instagram */}
        {(step === 2 || step === 3) && selectedChannel === 'instagram' && (
          <div className="animate-in fade-in slide-in-from-right-8 duration-400 max-w-xl">
            <button onClick={() => setStep(1)} className="flex items-center text-[12px] text-zinc-400 hover:text-foreground mb-6 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> {language === 'en' ? 'Back' : 'পেছনে'}
            </button>
            <h1 className="text-2xl font-black text-foreground mb-6">
              {language === 'en' ? 'Configure Instagram' : 'Instagram কনফিগার করুন'}
            </h1>
            <div className="bg-surface/70 backdrop-blur-xl border border-surface-hover rounded-2xl p-6 space-y-5">
              <div>
                <ConnectFacebookInstagramButton onConnected={handleConnectedSuccess} />
              </div>
              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-surface-hover" />
                <span className="flex-shrink-0 mx-4 text-zinc-500 text-[11px] font-medium uppercase tracking-wider">
                  {language === 'en' ? 'Or Manual Setup' : 'অথবা ম্যানুয়াল সেটআপ'}
                </span>
                <div className="flex-grow border-t border-surface-hover" />
              </div>
              <form onSubmit={handleConnectInstagram} className="space-y-4">
                {[
                  { label: language === 'en' ? 'Account / Inbox Name' : 'অ্যাকাউন্টের নাম', value: igData.pageName, key: 'pageName', placeholder: 'My IG Page', type: 'text' },
                  { label: 'Instagram Account ID', value: igData.instagramId, key: 'instagramId', placeholder: 'e.g. 1784140000000', type: 'text' },
                  { label: 'Access Token', value: igData.accessToken, key: 'accessToken', placeholder: 'EAA...', type: 'password' },
                ].map(field => (
                  <div key={field.key}>
                    <label className="block text-[12px] font-bold text-zinc-400 mb-1">{field.label}</label>
                    <input required type={field.type} value={field.value} onChange={e => setIgData({ ...igData, [field.key]: e.target.value })} placeholder={field.placeholder} className="w-full bg-background border border-surface-hover rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-primary transition-colors text-foreground" />
                  </div>
                ))}
                <button disabled={loading} type="submit" className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2.5 rounded-xl font-bold flex items-center justify-center disabled:opacity-50 transition-all hover:opacity-90">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (language === 'en' ? 'Connect Manually' : 'ম্যানুয়ালি কানেক্ট করুন')}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 4 && (
          <div className="animate-in zoom-in-95 duration-500 max-w-md mx-auto text-center py-12">
            <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-primary/20">
              <Sparkles className="w-10 h-10" />
            </div>
            <h1 className="text-3xl font-black text-foreground mb-3">
              {language === 'en' ? 'You are all set! 🎉' : 'সেটআপ সম্পন্ন! 🎉'}
            </h1>
            <p className="text-[13px] text-zinc-400 mb-8 leading-relaxed">
              {language === 'en'
                ? 'Your new inbox has been connected and you are being redirected to your inboxes list...'
                : 'আপনার ইনবক্সটি সংযুক্ত হয়েছে এবং ইনবক্স তালিকায় নিয়ে যাওয়া হচ্ছে...'}
            </p>
            <button
              onClick={() => router.push('/dashboard/settings/inboxes')}
              className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5">
              {language === 'en' ? 'Go to Inboxes Now' : 'ইনবক্সে যান'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
