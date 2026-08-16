'use client';

import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import {
  PhoneCall, MessageCircle, Camera, ChevronRight, CheckCircle2, ArrowLeft,
  Loader2, Sparkles, AlertCircle, Lock, TrendingUp, Crown, QrCode as QrIcon, Smartphone, RefreshCw,
  Globe, Copy, Check, Zap, ExternalLink, ShieldCheck, HelpCircle
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

  // Website Widget state
  const [websiteSubType, setWebsiteSubType] = useState<'LIVE_CHAT' | 'WHATSAPP' | null>(null);
  const [waInboxes, setWaInboxes] = useState<any[]>([]);
  const [waInboxesLoading, setWaInboxesLoading] = useState(false);
  const [selectedWaInbox, setSelectedWaInbox] = useState<any | null>(null);
  const [generatedWidget, setGeneratedWidget] = useState<any | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [widgetForm, setWidgetForm] = useState({
    name: '',
    domain: '',
    primaryColor: '#1F824A',
    heading: 'Chat with us',
    tagline: 'We are here to help you.',
    greetingEnabled: false,
  });

  const [showWaInstructions, setShowWaInstructions] = useState(false);
  const [showFbInstructions, setShowFbInstructions] = useState(false);
  const [showIgInstructions, setShowIgInstructions] = useState(false);

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

  const getChannelDisplayName = () => {
    switch (selectedChannel) {
      case 'whatsapp': return language === 'en' ? 'WhatsApp' : 'হোয়াটসঅ্যাপ';
      case 'messenger': return language === 'en' ? 'Messenger' : 'মেসেঞ্জার';
      case 'instagram': return language === 'en' ? 'Instagram' : 'ইনস্টাগ্রাম';
      case 'website': return language === 'en' ? 'Website Widget' : 'ওয়েবসাইট উইজেট';
      default: return 'Channel';
    }
  };

  const handleConnectedSuccess = () => {
    const channelName = getChannelDisplayName();
    toast.success(language === 'en' ? `${channelName} connected successfully! 🎉` : `${channelName} সফলভাবে কানেক্ট হয়েছে! 🎉`);
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
    {
      id: 'website',
      name: language === 'en' ? 'Website' : 'ওয়েবসাইট',
      icon: Globe,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      borderActive: 'border-purple-500',
      desc: language === 'en' ? 'Add live chat or WhatsApp widget to your website' : 'আপনার ওয়েবসাইটে লাইভ চ্যাট বা হোয়াটসঅ্যাপ বাটন যোগ করুন',
      limit: quotas?.websiteWidgetLimit ?? 0,
      current: quotas?.currentWebsiteWidget ?? 0,
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
    if (ch.id === 'whatsapp') setStep(2);
    else if (ch.id === 'website') { setWebsiteSubType(null); setStep(2); }
    else setStep(3);
  };

  // Website: fetch connected WhatsApp inboxes
  const fetchWaInboxes = async () => {
    setWaInboxesLoading(true);
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/inbox/channels`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const channels = await res.json();
        setWaInboxes(channels.filter((c: any) => c.channelType === 'whatsapp' && (c.status === 'active' || c.isConnected)));
      }
    } catch (e) { console.error(e); }
    finally { setWaInboxesLoading(false); }
  };

  // Website: create live chat widget
  const handleCreateLiveChatWidget = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/website-widget`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type: 'LIVE_CHAT', ...widgetForm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create widget');
      setGeneratedWidget(data);
      setStep(4);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Website: create WhatsApp widget
  const handleCreateWaWidget = async () => {
    if (!selectedWaInbox) return;
    setLoading(true);
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/website-widget`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type: 'WHATSAPP', name: `WA Widget – ${selectedWaInbox.displayName}`, whatsappInboxId: selectedWaInbox.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create widget');
      setGeneratedWidget(data);
      setStep(4);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getEmbedCode = (widget: any) => {
    if (widget.type === 'WHATSAPP') {
      const phone = selectedWaInbox?.phoneNumber?.replace(/\D/g, '') || '';
      return `<!-- ZiniChat WhatsApp Widget -->
<script>
(function(){
  var w=document.createElement('div');
  w.id='zc-wa-widget';
  document.body.appendChild(w);
  var s=document.createElement('script');
  s.src='${API}/widget.js';
  s.setAttribute('data-token','${widget.widgetToken}');
  s.setAttribute('data-phone','${phone}');
  s.setAttribute('data-color','${widget.primaryColor}');
  document.head.appendChild(s);
})();
</script>`;
    }
    return `<!-- ZiniChat Live Chat Widget -->
<script>
(function(){
  var s=document.createElement('script');
  s.src='${API}/widget.js';
  s.setAttribute('data-token','${widget.widgetToken}');
  s.setAttribute('data-color','${widget.primaryColor}');
  s.setAttribute('data-heading','${widget.heading}');
  document.head.appendChild(s);
})();
</script>`;
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
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
        done ? 'bg-primary text-primary-foreground' : active ? 'bg-primary/20 text-primary border-2 border-primary' : 'bg-surface-hover text-muted-foreground'
      }`}>
        {done ? <CheckCircle2 className="w-4 h-4" /> : num}
      </div>
      <div>
        <h3 className={`text-[13px] font-semibold ${active || done ? 'text-foreground' : 'text-muted-foreground'}`}>{title}</h3>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-full flex flex-col md:flex-row bg-background">
      
      {/* Sidebar Stepper */}
      <div className="w-64 shrink-0 bg-surface/70 backdrop-blur-xl border-r border-surface-hover p-6 hidden md:flex flex-col">
        <button
          onClick={() => router.push('/dashboard/settings/inboxes')}
          className="flex items-center text-[12px] font-medium text-muted-foreground hover:text-foreground mb-8 transition-colors">
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
      <div className="flex-1 p-5 md:p-8 max-w-5xl">

        {/* Step 1: Channel Selection with quota */}
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-400">
            <h1 className="text-2xl font-black text-foreground mb-1">
              {language === 'en' ? 'Select a Channel' : 'চ্যানেল সিলেক্ট করুন'}
            </h1>
            <p className="text-[13px] text-muted-foreground mb-8">
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
                      <p className="text-[11px] text-muted-foreground leading-relaxed mb-4">{ch.desc}</p>

                      {/* Quota bar */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] text-muted-foreground">
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

                      {/* Upgrade CTA / View Inboxes for locked */}
                      {isLocked && (
                        <div className="mt-3 flex items-center justify-between gap-2 text-[11px]">
                          <div
                            onClick={(e) => { e.stopPropagation(); router.push('/dashboard/settings/inboxes'); }}
                            className="text-indigo-400 font-bold hover:underline cursor-pointer flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            {language === 'en' ? 'View Inboxes →' : 'ইনবক্স তালিকা দেখুন →'}
                          </div>
                          <div
                            onClick={(e) => { e.stopPropagation(); router.push('/dashboard/settings/subscription'); }}
                            className="text-primary font-bold hover:underline cursor-pointer flex items-center gap-1">
                            <Crown className="w-3 h-3" />
                            {language === 'en' ? 'Upgrade →' : 'আপগ্রেড →'}
                          </div>
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
                <p className="text-[12px] text-muted-foreground leading-relaxed">
                  {language === 'en'
                    ? `Your current plan allows: WhatsApp ×${quotas.whatsappLimit}, Messenger ×${quotas.messengerLimit}, Instagram ×${quotas.instagramLimit}, Website Widget ×${quotas.websiteWidgetLimit}.`
                    : `আপনার বর্তমান প্ল্যানে: WhatsApp ×${quotas.whatsappLimit}, Messenger ×${quotas.messengerLimit}, Instagram ×${quotas.instagramLimit}, ওয়েবসাইট উইজেট ×${quotas.websiteWidgetLimit} কানেক্ট করতে পারবেন।`}
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
            <button onClick={() => setStep(1)} className="flex items-center text-[12px] text-muted-foreground hover:text-foreground mb-6 transition-colors">
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
                className="bg-surface/70 backdrop-blur-sm p-6 rounded-2xl border border-surface-hover hover:border-amber-500/50 hover:shadow-lg transition-all text-left group relative">
                <div className="absolute top-3 right-3 px-2 py-0.5 bg-amber-500/15 text-amber-400 rounded-full text-[10px] font-bold border border-amber-500/20">
                  {language === 'en' ? 'Unofficial (QR)' : 'আনঅফিশিয়াল (QR)'}
                </div>
                <div className="w-11 h-11 rounded-xl bg-amber-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <PhoneCall className="w-5 h-5 text-amber-400" />
                </div>
                <h3 className="font-bold text-[14px] text-foreground mb-1">WhatsApp Web</h3>
                <p className="text-[12px] text-zinc-400 leading-relaxed mb-3">
                  {language === 'en' ? 'Connect via QR scan or Pairing Code. Rate limited (10 msgs/min) for account protection.' : 'QR স্ক্যান বা পেয়ারিং কোড দিয়ে কানেক্ট করুন। নাম্বার সুরক্ষায় রেট লিমিটেড (১০ মেসেজ/মিনিট)।'}
                </p>
                <div className="flex items-center gap-1.5 text-amber-400 text-[11px] font-bold">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{language === 'en' ? 'Rate Limit: 10 msgs/min' : 'রেট লিমিট: ১০ মেসেজ/মিনিট'}</span>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Step 3: WhatsApp Configuration */}
        {step === 3 && selectedChannel === 'whatsapp' && (
          <div className="animate-in fade-in slide-in-from-right-8 duration-400 max-w-5xl">
            <button onClick={() => setStep(2)} className="flex items-center text-[12px] text-zinc-400 hover:text-foreground mb-6 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> {language === 'en' ? 'Back' : 'পেছনে'}
            </button>
            <h1 className="text-2xl font-black text-foreground mb-6">
              {language === 'en' ? 'Configure WhatsApp' : 'WhatsApp কনফিগার করুন'} {provider === 'cloud' ? 'Cloud' : 'Web'}
            </h1>

            {provider === 'cloud' ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Left Column: Actions & Form */}
                <div className="lg:col-span-7 space-y-4">
                  {/* Instruction Banner for Cloud API */}
                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                      <ShieldCheck className="w-4 h-4" />
                      <span>{language === 'en' ? 'Official Meta API (100% Safe & Zero Ban Risk)' : 'অফিশিয়াল Meta API (১০০% নিরাপদ ও অ্যাকাউন্ট সুরক্ষার নিশ্চয়তা)'}</span>
                    </div>
                    <ul className="text-[11px] text-zinc-300 space-y-1 pl-5 list-disc leading-relaxed">
                      <li>{language === 'en' ? 'Supports unlimited high-volume messaging and Broadcast Campaigns.' : 'আনলিমিটেড হাই-ভলিউম মেসেজিং ও ব্রডকাস্ট ক্যাম্পেইন সাপোর্ট করে।'}</li>
                      <li>{language === 'en' ? 'Get credentials from developers.facebook.com → WhatsApp → API Setup.' : 'মেটা ডেভেলপার ড্যাশবোর্ড থেকে Phone Number ID & Permanent Token সংগ্রহ করুন।'}</li>
                      <li>{language === 'en' ? 'Or use "Connect WhatsApp" button below to log in directly via Meta.' : 'অথবা নিচে "Connect WhatsApp" বাটনে ক্লিক করে সরাসরি মেটা লগইন সম্পন্ন করুন।'}</li>
                    </ul>
                  </div>

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

                    <form onSubmit={handleConnectWhatsApp} className="space-y-4" autoComplete="off">
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
                            autoComplete={field.type === 'password' ? 'new-password' : 'off-dont-autofill'}
                            className="w-full bg-background border border-surface-hover rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-primary transition-colors text-foreground"
                          />
                        </div>
                      ))}
                      <button disabled={loading} type="submit" className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl font-bold hover:bg-primary/90 flex items-center justify-center mt-4 disabled:opacity-50 transition-all">
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (language === 'en' ? 'Create Inbox' : 'ইনবক্স তৈরি করুন')}
                      </button>
                    </form>
                  </div>
                </div>

                {/* Right Column: Permanent Right-Side Onboarding Guide */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="bg-surface/90 backdrop-blur-xl border border-surface-hover rounded-2xl p-5 space-y-4 text-[12px] text-zinc-300 leading-relaxed sticky top-6">
                    <div className="flex items-center gap-2 text-foreground font-bold border-b border-surface-hover pb-3">
                      <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{language === 'en' ? 'WhatsApp Setup Instructions' : 'হোয়াটসঅ্যাপ সেটআপ নির্দেশিকা'}</span>
                    </div>

                    {/* Section 1: Automatic Embedded Signup */}
                    <div className="space-y-2">
                      <div className="text-[11.5px] font-bold text-emerald-400 flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5" />
                        <span>{language === 'en' ? '1. Automatic Signup (Recommended)' : '১. অটোমেটিক মেটা সাইনআপ (প্রস্তাবিত)'}</span>
                      </div>
                      <ol className="text-[11px] text-zinc-400 space-y-1.5 pl-4 list-decimal">
                        <li>{language === 'en' ? 'Click "Connect with Meta" button on the left.' : 'বাম পাশের "Connect with Meta" বাটনে ক্লিক করুন।'}</li>
                        <li>{language === 'en' ? 'Log in with Facebook account managing your Business Manager.' : 'বিজনেস ম্যানেজার যুক্ত ফেসবুক একাউন্টে লগইন করুন।'}</li>
                        <li>{language === 'en' ? 'Select or create Meta Business Account & WhatsApp Profile.' : 'মেটা বিজনেস একাউন্ট ও হোয়াটসঅ্যাপ প্রোফাইল সিলেক্ট করুন।'}</li>
                        <li>{language === 'en' ? 'Enter phone number and verify using SMS/Call OTP code.' : 'ফোন নম্বর দিন এবং এসএমএস/কল ওটিপি দিয়ে ভেরিফাই করুন।'}</li>
                      </ol>
                    </div>

                    {/* Critical Unregister Warning */}
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-1">
                      <p className="font-bold text-emerald-400 text-[11.5px] flex items-center gap-1">
                        🛑 {language === 'en' ? 'Important Requirement' : 'জরুরি শর্ত (কি না করলে হবে না)'}
                      </p>
                      <p className="text-[11px] text-zinc-300">
                        {language === 'en'
                          ? 'The phone number MUST NOT be active on mobile WhatsApp. If active, open WhatsApp App on phone → Settings → Account → Delete My Account first.'
                          : 'নম্বরটি ফোনে হোয়াটসঅ্যাপ অ্যাপে সক্রিয় থাকলে মেটা API কানেক্ট হবে না। প্রথমে ফোনের WhatsApp App → Settings → Account → Delete My Account করতে হবে।'}
                      </p>
                    </div>

                    {/* Section 2: Manual Setup */}
                    <div className="space-y-2 pt-2 border-t border-surface-hover">
                      <div className="text-[11.5px] font-bold text-foreground flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-blue-400" />
                        <span>{language === 'en' ? '2. Manual Setup via Developer Portal' : '২. মেটা ডেভেলপার পোর্টাল থেকে ম্যানুয়াল সেটআপ'}</span>
                      </div>
                      <div className="space-y-2 text-[11px] text-zinc-400">
                        <div className="bg-background/40 p-2.5 rounded-lg border border-surface-hover/50">
                          <p className="font-bold text-zinc-200">Step 1: Get Phone Number ID & WABA ID</p>
                          <p className="mt-0.5">{language === 'en' ? 'Go to developers.facebook.com → My Apps → Select Business App → WhatsApp → API Setup to copy IDs.' : 'developers.facebook.com → My Apps → Business App → WhatsApp → API Setup থেকে Phone Number ID এবং WABA ID কপি করুন।'}</p>
                        </div>
                        <div className="bg-background/40 p-2.5 rounded-lg border border-surface-hover/50">
                          <p className="font-bold text-zinc-200">Step 2: Generate Permanent Token</p>
                          <p className="mt-0.5">{language === 'en' ? 'Go to business.facebook.com/settings → System Users → Create Admin System User → Generate Token with whatsapp_business_messaging permission.' : 'business.facebook.com/settings → System Users → Admin System User তৈরি করে whatsapp_business_messaging পারমিশন দিয়ে Permanent Token জেনারেট করুন।'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            ) : (
              /* FULL INTERACTIVE WHATSAPP WEB (BAILEYS) AUTHENTICATION FLOW */
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Left Column: Actions & Controls */}
                <div className="lg:col-span-7 space-y-4">
                  {/* Rate Limit & Precautions Banner for WhatsApp Web */}
                  <div className="bg-amber-500/10 border border-amber-500/25 p-4 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{language === 'en' ? 'WhatsApp Web (Unofficial QR) Notice & Rate Limits' : 'হোয়াটসঅ্যাপ ওয়েব (আনঅফিশিয়াল QR) রেট লিমিট ও সতর্কতা'}</span>
                    </div>
                    <div className="text-[11px] text-amber-200/90 leading-relaxed space-y-1">
                      <p className="font-semibold text-amber-300">
                        ⚡ {language === 'en' ? 'System Rate Limit: Max 10 messages per minute per tenant.' : 'সিস্টেম রেট লিমিট: সর্বোচ্চ ১০ মেসেজ প্রতি মিনিটে (প্রতি ১০ সেকেন্ডে ১টি)।'}
                      </p>
                      <ul className="pl-4 list-disc space-y-1 text-zinc-300">
                        <li>{language === 'en' ? 'This is an unofficial web-socket connection (Baileys). Designed strictly for 1-on-1 customer replies.' : 'এটি আনঅফিশিয়াল ওয়েব-সকেট কানেকশন। এটি শুধুমাত্র কাস্টমারদের ১-অন-১ প্রশ্নের উত্তর দেওয়ার জন্য।'}</li>
                        <li>{language === 'en' ? 'Bulk broadcast campaigns are DISABLED on WhatsApp Web to prevent WhatsApp bot detection and account bans.' : 'হোয়াটসঅ্যাপ নাম্বার ব্যান হওয়া থেকে সুরক্ষার জন্য WhatsApp Web-এ বাল্ক ব্রডকাস্ট বন্ধ রাখা হয়েছে।'}</li>
                        <li>{language === 'en' ? 'Avoid sending un-solicited spam messages or cold bulk texts to unknown numbers.' : 'অপরিচিত নম্বরে এক সাথে স্প্যাম বা প্রমোশনাল বার্তা পাঠানো থেকে বিরত থাকুন।'}</li>
                        <li>{language === 'en' ? 'Keep your main phone connected to the internet to maintain active sync.' : 'লাইভ সিঙ্ক বজায় রাখতে মূল ফোনটি ইন্টারনেটে যুক্ত রাখুন।'}</li>
                      </ul>
                    </div>
                  </div>

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
                            <div className="bg-white p-4 rounded-2xl inline-block shadow-md border border-border">
                              <QRCode value={qrCodeData} size={200} />
                            </div>
                            <div className="text-xs text-muted-foreground space-y-1">
                              <p className="font-bold text-foreground">{language === 'en' ? 'Scan with WhatsApp' : 'WhatsApp দিয়ে স্ক্যান করুন'}</p>
                              <p>{language === 'en' ? 'Open WhatsApp → Settings → Linked Devices → Link a Device' : 'WhatsApp খুলুন → Settings → Linked Devices → Link a Device'}</p>
                            </div>
                            <button
                              onClick={handleStartQr}
                              className="px-3 py-1.5 bg-surface-hover text-foreground hover:text-primary rounded-lg text-[11px] font-bold inline-flex items-center gap-1 transition-colors border border-border"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
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
                </div>

                {/* Right Column: Permanent Right-Side Web Guide */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="bg-surface/90 backdrop-blur-xl border border-surface-hover rounded-2xl p-5 space-y-4 text-[12px] text-zinc-300 leading-relaxed sticky top-6">
                    <div className="flex items-center gap-2 text-foreground font-bold border-b border-surface-hover pb-3">
                      <HelpCircle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>{language === 'en' ? 'WhatsApp Web Instructions' : 'হোয়াটসঅ্যাপ ওয়েব নির্দেশিকা'}</span>
                    </div>

                    <div className="space-y-2 text-[11px] text-zinc-400">
                      <div className="bg-background/40 p-2.5 rounded-lg border border-surface-hover/50">
                        <p className="font-bold text-zinc-200">Option 1: QR Code Scan</p>
                        <p className="mt-0.5">{language === 'en' ? 'Open WhatsApp on your phone → Settings → Linked Devices → Link a Device → Scan QR code.' : 'আপনার ফোনে হোয়াটসঅ্যাপ খুলুন → Settings → Linked Devices → Link a Device → স্ক্রিনের QR কোডটি স্ক্যান করুন।'}</p>
                      </div>
                      <div className="bg-background/40 p-2.5 rounded-lg border border-surface-hover/50">
                        <p className="font-bold text-zinc-200">Option 2: Pairing Code</p>
                        <p className="mt-0.5">{language === 'en' ? 'Enter phone number, copy 8-digit code, open WhatsApp → Linked Devices → Link with phone number instead.' : 'ফোন নম্বর দিন, ৮ ডিজিটের কোড কপি করুন, ফোনে WhatsApp → Linked Devices → Link with phone number instead সিলেক্ট করুন।'}</p>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

        {/* Step 3: Messenger */}
        {(step === 2 || step === 3) && selectedChannel === 'messenger' && (
          <div className="animate-in fade-in slide-in-from-right-8 duration-400 max-w-5xl">
            <button onClick={() => setStep(1)} className="flex items-center text-[12px] text-zinc-400 hover:text-foreground mb-6 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> {language === 'en' ? 'Back' : 'পেছনে'}
            </button>
            <h1 className="text-2xl font-black text-foreground mb-6">
              {language === 'en' ? 'Configure Messenger' : 'Messenger কনফিগার করুন'}
            </h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Column: Actions & Form */}
              <div className="lg:col-span-7 space-y-4">
                {/* Instruction banner for Messenger */}
                <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-blue-400 font-bold text-xs">
                    <ShieldCheck className="w-4 h-4" />
                    <span>{language === 'en' ? 'Meta Official Messenger Integration Setup' : 'মেটা অফিশিয়াল মেসেঞ্জার ইন্টিগ্রেশন নির্দেশনা'}</span>
                  </div>
                  <ul className="text-[11px] text-zinc-300 space-y-1 pl-5 list-disc leading-relaxed">
                    <li>{language === 'en' ? 'Click "Connect Facebook Page" to authorize using your Facebook account with Page Management permissions.' : '"Connect Facebook Page" বাটনে ক্লিক করে ফেসবুক পেজের পারমিশন দিন।'}</li>
                    <li>{language === 'en' ? 'Supports Meta Page messaging, automated AI responses, and Meta Broadcast Campaigns.' : 'মেটা মেসেজিং, অটোমেটেড এআই রেসপন্স এবং ব্রডকাস্ট ক্যাম্পেইন সাপোর্ট করে।'}</li>
                    <li>{language === 'en' ? 'For manual setup, paste your Facebook Page ID and Page Access Token from Facebook Business Manager.' : 'ম্যানুয়াল সেটআপের ক্ষেত্রে ফেসবুক পেজ আইডি এবং পেজ এক্সেস টোকেন দিন।'}</li>
                  </ul>
                </div>

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

                  <form onSubmit={handleConnectMessenger} className="space-y-4" autoComplete="off">
                    {[
                      { label: language === 'en' ? 'Page Name / Inbox Name' : 'পেজের নাম / ইনবক্সের নাম', value: fbData.pageName, key: 'pageName', placeholder: 'My Business Page', type: 'text' },
                      { label: 'Facebook Page ID', value: fbData.pageId, key: 'pageId', placeholder: 'e.g. 104561239845', type: 'text' },
                      { label: 'Page Access Token', value: fbData.accessToken, key: 'accessToken', placeholder: 'EAA...', type: 'password' },
                    ].map(field => (
                      <div key={field.key}>
                        <label className="block text-[12px] font-bold text-zinc-400 mb-1">{field.label}</label>
                        <input required type={field.type} value={field.value} onChange={e => setFbData({ ...fbData, [field.key]: e.target.value })} placeholder={field.placeholder} autoComplete={field.type === 'password' ? 'new-password' : 'off-dont-autofill'} className="w-full bg-background border border-surface-hover rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-primary transition-colors text-foreground" />
                      </div>
                    ))}
                    <button disabled={loading} type="submit" className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-bold hover:bg-blue-700 flex items-center justify-center disabled:opacity-50 transition-all">
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (language === 'en' ? 'Connect Manually' : 'ম্যানুয়ালি কানেক্ট করুন')}
                    </button>
                  </form>
                </div>
              </div>

              {/* Right Column: Permanent Messenger Setup Guide */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-surface/90 backdrop-blur-xl border border-surface-hover rounded-2xl p-5 space-y-4 text-[12px] text-zinc-300 leading-relaxed sticky top-6">
                  <div className="flex items-center gap-2 text-foreground font-bold border-b border-surface-hover pb-3">
                    <HelpCircle className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>{language === 'en' ? 'Messenger Setup Instructions' : 'মেসেঞ্জার সেটআপ নির্দেশিকা'}</span>
                  </div>

                  {/* Section 1: Automatic Facebook OAuth */}
                  <div className="space-y-2">
                    <div className="text-[11.5px] font-bold text-blue-400 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5" />
                      <span>{language === 'en' ? '1. Automatic Facebook Login' : '১. অটোমেটিক ফেসবুক লগইন'}</span>
                    </div>
                    <ol className="text-[11px] text-zinc-400 space-y-1.5 pl-4 list-decimal">
                      <li>{language === 'en' ? 'Click "Connect Facebook Page" button on the left.' : 'বাম পাশের "Connect Facebook Page" বাটনে ক্লিক করুন।'}</li>
                      <li>{language === 'en' ? 'Log in with Facebook account that has Admin access to your Page.' : 'পেজের এডমিন এক্সেস আছে এমন ফেসবুক একাউন্টে লগইন করুন।'}</li>
                      <li>{language === 'en' ? 'Select your Facebook Page(s) and confirm permissions.' : 'আপনার ফেসবুক পেজ সিলেক্ট করুন এবং পারমিশন নিশ্চিত করুন।'}</li>
                    </ol>
                  </div>

                  {/* Requirement Banner */}
                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl space-y-1">
                    <p className="font-bold text-blue-400 text-[11.5px] flex items-center gap-1">
                      🛑 {language === 'en' ? 'Requirement' : 'আবশ্যিক শর্ত'}
                    </p>
                    <p className="text-[11px] text-zinc-300">
                      {language === 'en'
                        ? 'Personal Facebook profiles cannot receive API webhooks. You MUST connect an active Facebook Page.'
                        : 'পার্সোনাল ফেসবুক আইডি দিয়ে মেসেজিং এপিআই কাজ করে না। অবশ্যই একটি সক্রিয় ফেসবুক পেজ কানেক্ট করতে হবে।'}
                    </p>
                  </div>

                  {/* Section 2: Manual Setup */}
                  <div className="space-y-2 pt-2 border-t border-surface-hover">
                    <div className="text-[11.5px] font-bold text-foreground flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-blue-400" />
                      <span>{language === 'en' ? '2. Manual Token Setup' : '২. ম্যানুয়াল টোকেন সেটআপ'}</span>
                    </div>
                    <div className="space-y-2 text-[11px] text-zinc-400">
                      <div className="bg-background/40 p-2.5 rounded-lg border border-surface-hover/50">
                        <p className="font-bold text-zinc-200">Step 1: Get Facebook Page ID</p>
                        <p className="mt-0.5">{language === 'en' ? 'Go to your Facebook Page → About → Page Transparency to copy Page ID.' : 'আপনার ফেসবুক পেজ → About → Page Transparency থেকে পেজ আইডি কপি করুন।'}</p>
                      </div>
                      <div className="bg-background/40 p-2.5 rounded-lg border border-surface-hover/50">
                        <p className="font-bold text-zinc-200">Step 2: Get Page Access Token</p>
                        <p className="mt-0.5">{language === 'en' ? 'Go to developers.facebook.com → My Apps → Messenger → Access Tokens → Add Page & Generate Token.' : 'developers.facebook.com → My Apps → Messenger → Access Tokens সেকশন থেকে পেজ যুক্ত করে টোকেন তৈরি করুন।'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Step 3: Instagram */}
        {(step === 2 || step === 3) && selectedChannel === 'instagram' && (
          <div className="animate-in fade-in slide-in-from-right-8 duration-400 max-w-5xl">
            <button onClick={() => setStep(1)} className="flex items-center text-[12px] text-zinc-400 hover:text-foreground mb-6 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> {language === 'en' ? 'Back' : 'পেছনে'}
            </button>
            <h1 className="text-2xl font-black text-foreground mb-6">
              {language === 'en' ? 'Configure Instagram' : 'Instagram কনফিগার করুন'}
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

              {/* Left Column: Actions & Form */}
              <div className="lg:col-span-7 space-y-4">
                {/* Instruction banner for Instagram */}
                <div className="bg-pink-500/10 border border-pink-500/20 p-4 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-pink-400 font-bold text-xs">
                    <ShieldCheck className="w-4 h-4" />
                    <span>{language === 'en' ? 'Instagram Professional Account Setup Guidelines' : 'ইন্সটাগ্রাম বিজনেস অ্যাকাউন্ট ইন্সট্রাকশন'}</span>
                  </div>
                  <ul className="text-[11px] text-zinc-300 space-y-1 pl-5 list-disc leading-relaxed">
                    <li>{language === 'en' ? 'Your Instagram Account MUST be converted to a Business or Creator Account.' : 'আপনার ইন্সটাগ্রাম অ্যাকাউন্টটি অবশ্যই Business বা Creator অ্যাকাউন্ট হতে হবে।'}</li>
                    <li>{language === 'en' ? 'The Instagram Account MUST be linked to an active Facebook Page.' : 'ইন্সটাগ্রাম অ্যাকাউন্টটি অবশ্যই আপনার ফেসবুক পেজের সাথে কানেক্টেড থাকতে হবে।'}</li>
                    <li>{language === 'en' ? 'Click "Connect Instagram" button below to log in via Facebook and authorize Instagram DM access.' : 'নিচে "Connect Instagram" বাটনে ক্লিক করে মেটা ড্যাশবোর্ডের মাধ্যমে অনুমোদন সম্পন্ন করুন।'}</li>
                  </ul>
                </div>

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

                  <form onSubmit={handleConnectInstagram} className="space-y-4" autoComplete="off">
                    {[
                      { label: language === 'en' ? 'Account / Inbox Name' : 'অ্যাকাউন্টের নাম', value: igData.pageName, key: 'pageName', placeholder: 'My IG Page', type: 'text' },
                      { label: 'Instagram Account ID', value: igData.instagramId, key: 'instagramId', placeholder: 'e.g. 1784140000000', type: 'text' },
                      { label: 'Access Token', value: igData.accessToken, key: 'accessToken', placeholder: 'EAA...', type: 'password' },
                    ].map(field => (
                      <div key={field.key}>
                        <label className="block text-[12px] font-bold text-zinc-400 mb-1">{field.label}</label>
                        <input required type={field.type} value={field.value} onChange={e => setIgData({ ...igData, [field.key]: e.target.value })} placeholder={field.placeholder} autoComplete={field.type === 'password' ? 'new-password' : 'off-dont-autofill'} className="w-full bg-background border border-surface-hover rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-primary transition-colors text-foreground" />
                      </div>
                    ))}
                    <button disabled={loading} type="submit" className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2.5 rounded-xl font-bold flex items-center justify-center disabled:opacity-50 transition-all hover:opacity-90 shadow-lg shadow-pink-600/20">
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (language === 'en' ? 'Connect Manually' : 'ম্যানুয়ালি কানেক্ট করুন')}
                    </button>
                  </form>
                </div>
              </div>

              {/* Right Column: Permanent Instagram Setup Guide */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-surface/90 backdrop-blur-xl border border-surface-hover rounded-2xl p-5 space-y-4 text-[12px] text-zinc-300 leading-relaxed sticky top-6">
                  <div className="flex items-center gap-2 text-foreground font-bold border-b border-surface-hover pb-3">
                    <HelpCircle className="w-4 h-4 text-pink-400 shrink-0" />
                    <span>{language === 'en' ? 'Instagram Setup Instructions' : 'ইনস্টাগ্রাম সেটআপ নির্দেশিকা'}</span>
                  </div>

                  {/* Section 1: Automatic Signup */}
                  <div className="space-y-2">
                    <div className="text-[11.5px] font-bold text-pink-400 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5" />
                      <span>{language === 'en' ? '1. Automatic Meta OAuth' : '১. অটোমেটিক মেটা এক্সেস'}</span>
                    </div>
                    <ol className="text-[11px] text-zinc-400 space-y-1.5 pl-4 list-decimal">
                      <li>{language === 'en' ? 'Click "Connect Instagram" button on the left.' : 'বাম পাশের "Connect Instagram" বাটনে ক্লিক করুন।'}</li>
                      <li>{language === 'en' ? 'Log in with Facebook account linked to your Instagram Business profile.' : 'ইনস্টাগ্রামের সাথে যুক্ত ফেসবুক একাউন্টে লগইন করুন।'}</li>
                      <li>{language === 'en' ? 'Select Instagram Professional Account and linked Facebook Page.' : 'ইনস্টাগ্রাম বিজনেস একাউন্ট এবং সাথে লিংক থাকা ফেসবুক পেজটি সিলেক্ট করুন।'}</li>
                    </ol>
                  </div>

                  {/* Critical Professional Account Banner */}
                  <div className="p-3 bg-pink-500/10 border border-pink-500/20 rounded-xl space-y-1">
                    <p className="font-bold text-pink-400 text-[11.5px] flex items-center gap-1">
                      📸 {language === 'en' ? 'Business/Creator Profile Required' : 'বিজনেস বা ক্রিয়েটর একাউন্ট আবশ্যক'}
                    </p>
                    <p className="text-[11px] text-zinc-300">
                      {language === 'en'
                        ? 'Personal Instagram accounts cannot receive API webhooks. Switch account in Instagram Mobile App → Settings → Account → Switch to Professional Account.'
                        : 'পার্সোনাল ইনস্টাগ্রাম একাউন্টে মেটা এপিআই কাজ করে না। ইনস্টাগ্রাম মোবাইল অ্যাপের Settings → Account → Switch to Professional Account দিয়ে বিজনেস বা ক্রিয়েটর একাউন্টে রূপান্তর করুন।'}
                    </p>
                  </div>

                  {/* Section 2: Manual Setup */}
                  <div className="space-y-2 pt-2 border-t border-surface-hover">
                    <div className="text-[11.5px] font-bold text-foreground flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-pink-400" />
                      <span>{language === 'en' ? '2. Manual Token Setup' : '২. ম্যানুয়াল টোকেন সেটআপ'}</span>
                    </div>
                    <div className="space-y-2 text-[11px] text-zinc-400">
                      <div className="bg-background/40 p-2.5 rounded-lg border border-surface-hover/50">
                        <p className="font-bold text-zinc-200">Step 1: Get Instagram Business ID</p>
                        <p className="mt-0.5">{language === 'en' ? 'Go to developers.facebook.com → My Apps → Business App → Instagram → API Setup to copy Account ID.' : 'developers.facebook.com → My Apps → Business App → Instagram → API Setup থেকে Account ID দিন।'}</p>
                      </div>
                      <div className="bg-background/40 p-2.5 rounded-lg border border-surface-hover/50">
                        <p className="font-bold text-zinc-200">Step 2: Get Page Access Token</p>
                        <p className="mt-0.5">{language === 'en' ? 'Generate Page Access Token for the Facebook Page linked to your Instagram Account with instagram_manage_messages permission.' : 'ইনস্টাগ্রাম একাউন্টের সাথে লিংক করা ফেসবুক পেজের জন্য instagram_manage_messages পারমিশনসহ Page Access Token তৈরি করুন।'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Step 2: Website sub-option picker */}
        {step === 2 && selectedChannel === 'website' && (
          <div className="animate-in fade-in slide-in-from-right-8 duration-400">
            <button onClick={() => setStep(1)} className="flex items-center text-[12px] text-zinc-400 hover:text-foreground mb-6 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> {language === 'en' ? 'Back' : 'পেছনে'}
            </button>
            <h1 className="text-2xl font-black text-foreground mb-1">
              {language === 'en' ? 'Choose Widget Type' : 'উইজেট ধরন বেছে নিন'}
            </h1>
            <p className="text-[13px] text-zinc-400 mb-8">
              {language === 'en' ? 'How do you want to engage visitors on your website?' : 'আপনার ওয়েবসাইটের ভিজিটরদের সাথে কিভাবে যোগাযোগ করবেন?'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
              <button
                onClick={() => { setWebsiteSubType('LIVE_CHAT'); setStep(3); }}
                className="bg-surface/70 backdrop-blur-sm p-6 rounded-2xl border border-surface-hover hover:border-purple-500/50 hover:shadow-lg transition-all text-left group">
                <div className="w-11 h-11 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Zap className="w-5 h-5 text-purple-400" />
                </div>
                <h3 className="font-bold text-[14px] text-foreground mb-1">
                  {language === 'en' ? 'Website Live Chat' : 'লাইভ চ্যাট উইজেট'}
                </h3>
                <p className="text-[12px] text-zinc-400 leading-relaxed">
                  {language === 'en' ? 'Embed a branded chat widget directly into your website. Visitors message your inbox.' : 'আপনার ওয়েবসাইটে একটি ব্র্যান্ডেড চ্যাট বক্স যোগ করুন। ভিজিটররা সরাসরি ইনবক্সে মেসেজ করবে।'}
                </p>
                <div className="mt-3 flex items-center gap-1 text-purple-400 text-[11px] font-bold">
                  {language === 'en' ? 'Custom branding' : 'কাস্টম ব্র্যান্ডিং'} <ChevronRight className="w-3 h-3" />
                </div>
              </button>

              <button
                onClick={() => { setWebsiteSubType('WHATSAPP'); setStep(3); fetchWaInboxes(); }}
                className="bg-surface/70 backdrop-blur-sm p-6 rounded-2xl border border-surface-hover hover:border-emerald-500/50 hover:shadow-lg transition-all text-left group">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <PhoneCall className="w-5 h-5 text-emerald-500" />
                </div>
                <h3 className="font-bold text-[14px] text-foreground mb-1">
                  {language === 'en' ? 'WhatsApp on Website' : 'ওয়েবসাইটে হোয়াটসঅ্যাপ'}
                </h3>
                <p className="text-[12px] text-zinc-400 leading-relaxed">
                  {language === 'en' ? 'Add a floating WhatsApp button. Visitors tap it to open WhatsApp and chat with you.' : 'একটি ফ্লোটিং হোয়াটসঅ্যাপ বাটন যোগ করুন। ভিজিটররা ক্লিক করে সরাসরি হোয়াটসঅ্যাপে মেসেজ করবে।'}
                </p>
                <div className="mt-3 flex items-center gap-1 text-emerald-500 text-[11px] font-bold">
                  {language === 'en' ? 'Floating chat button' : 'ফ্লোটিং বাটন'} <ChevronRight className="w-3 h-3" />
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Website — Live Chat Form */}
        {step === 3 && selectedChannel === 'website' && websiteSubType === 'LIVE_CHAT' && (
          <div className="animate-in fade-in slide-in-from-right-8 duration-400 max-w-xl">
            <button onClick={() => setStep(2)} className="flex items-center text-[12px] text-zinc-400 hover:text-foreground mb-6 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> {language === 'en' ? 'Back' : 'পেছনে'}
            </button>
            <h1 className="text-2xl font-black text-foreground mb-6">
              {language === 'en' ? 'Configure Live Chat Widget' : 'লাইভ চ্যাট উইজেট কনফিগার করুন'}
            </h1>
            <form onSubmit={handleCreateLiveChatWidget}>
              <div className="bg-surface/70 backdrop-blur-xl border border-surface-hover rounded-2xl p-6 space-y-4">
                {[
                  { label: language === 'en' ? 'Widget Name' : 'উইজেটের নাম', key: 'name', placeholder: language === 'en' ? 'e.g. Sales Chat' : 'যেমন: সেলস চ্যাট', type: 'text', required: true },
                  { label: language === 'en' ? 'Your Website Domain' : 'ওয়েবসাইট ডোমেইন', key: 'domain', placeholder: 'e.g. mystore.com', type: 'text', required: false },
                  { label: language === 'en' ? 'Chat Heading' : 'চ্যাটের শিরোনাম', key: 'heading', placeholder: 'Chat with us', type: 'text', required: false },
                  { label: language === 'en' ? 'Tagline' : 'ট্যাগলাইন', key: 'tagline', placeholder: 'We are here to help.', type: 'text', required: false },
                ].map(field => (
                  <div key={field.key}>
                    <label className="block text-[12px] font-bold text-zinc-400 mb-1">{field.label}</label>
                    <input
                      required={field.required}
                      type={field.type}
                      value={(widgetForm as any)[field.key]}
                      onChange={e => setWidgetForm({ ...widgetForm, [field.key]: e.target.value })}
                      placeholder={field.placeholder}
                      className="w-full bg-background border border-surface-hover rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-primary transition-colors text-foreground"
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-[12px] font-bold text-zinc-400 mb-1">
                    {language === 'en' ? 'Brand Color' : 'ব্র্যান্ড কালার'}
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={widgetForm.primaryColor}
                      onChange={e => setWidgetForm({ ...widgetForm, primaryColor: e.target.value })}
                      className="w-10 h-10 rounded-lg border border-surface-hover cursor-pointer bg-transparent"
                    />
                    <span className="text-[12px] font-mono text-zinc-400">{widgetForm.primaryColor}</span>
                  </div>
                </div>
                <label className="flex items-center gap-3 cursor-pointer p-3 bg-background border border-surface-hover rounded-xl hover:border-primary/40 transition-colors">
                  <input
                    type="checkbox"
                    checked={widgetForm.greetingEnabled}
                    onChange={e => setWidgetForm({ ...widgetForm, greetingEnabled: e.target.checked })}
                    className="w-4 h-4 rounded text-primary"
                  />
                  <div>
                    <div className="text-[12px] font-bold text-foreground">{language === 'en' ? 'Show Greeting Message' : 'স্বাগত বার্তা দেখান'}</div>
                    <div className="text-[11px] text-zinc-400">{language === 'en' ? 'Auto-open chat with a greeting when visitor arrives' : 'ভিজিটর আসলে স্বয়ংক্রিয়ভাবে চ্যাট খুলবে'}</div>
                  </div>
                </label>
                <button disabled={loading} type="submit" className="w-full bg-purple-600 text-white py-2.5 rounded-xl font-bold hover:bg-purple-700 flex items-center justify-center gap-2 disabled:opacity-50 transition-all mt-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  {language === 'en' ? 'Generate Widget Code' : 'উইজেট কোড তৈরি করুন'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 3: Website — WhatsApp Inbox Picker */}
        {step === 3 && selectedChannel === 'website' && websiteSubType === 'WHATSAPP' && (
          <div className="animate-in fade-in slide-in-from-right-8 duration-400 max-w-xl">
            <button onClick={() => setStep(2)} className="flex items-center text-[12px] text-zinc-400 hover:text-foreground mb-6 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> {language === 'en' ? 'Back' : 'পেছনে'}
            </button>
            <h1 className="text-2xl font-black text-foreground mb-1">
              {language === 'en' ? 'Pick a WhatsApp Inbox' : 'হোয়াটসঅ্যাপ ইনবক্স বেছে নিন'}
            </h1>
            <p className="text-[13px] text-zinc-400 mb-6">
              {language === 'en' ? 'Visitors clicking your website button will open a chat with this number.' : 'ভিজিটররা বাটন ক্লিক করলে এই নম্বরে চ্যাট খুলবে।'}
            </p>

            {waInboxesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : waInboxes.length === 0 ? (
              <div className="bg-surface/70 border border-surface-hover rounded-2xl p-8 text-center">
                <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-7 h-7 text-orange-400" />
                </div>
                <h3 className="font-bold text-foreground mb-2">
                  {language === 'en' ? 'No Connected WhatsApp Found' : 'কোনো সংযুক্ত হোয়াটসঅ্যাপ নেই'}
                </h3>
                <p className="text-[12px] text-zinc-400 mb-5">
                  {language === 'en' ? 'Please connect a WhatsApp account first before creating a WhatsApp website widget.' : 'প্রথমে একটি হোয়াটসঅ্যাপ অ্যাকাউন্ট কানেক্ট করুন।'}
                </p>
                <button
                  onClick={() => { setStep(1); setSelectedChannel('whatsapp'); setTimeout(() => setStep(2), 100); }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-[12px] hover:bg-emerald-500 transition-colors"
                >
                  <PhoneCall className="w-4 h-4" />
                  {language === 'en' ? 'Connect WhatsApp First' : 'WhatsApp কানেক্ট করুন'}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {waInboxes.map(inbox => (
                  <button
                    key={inbox.id}
                    onClick={() => setSelectedWaInbox(selectedWaInbox?.id === inbox.id ? null : inbox)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all ${
                      selectedWaInbox?.id === inbox.id
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : 'border-surface-hover bg-surface/70 hover:border-emerald-500/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                        <PhoneCall className="w-4 h-4 text-emerald-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-[13px] text-foreground truncate">{inbox.displayName || 'WhatsApp'}</div>
                        <div className="text-[11px] text-zinc-400">{inbox.phoneNumber || inbox.provider}</div>
                      </div>
                      {selectedWaInbox?.id === inbox.id && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
                <button
                  disabled={!selectedWaInbox || loading}
                  onClick={handleCreateWaWidget}
                  className="w-full mt-2 bg-emerald-600 text-white py-2.5 rounded-xl font-bold hover:bg-emerald-500 flex items-center justify-center gap-2 disabled:opacity-40 transition-all"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                  {language === 'en' ? 'Generate Widget Code' : 'উইজেট কোড তৈরি করুন'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Website Widget — Code Generated */}
        {step === 4 && selectedChannel === 'website' && generatedWidget && (() => {
          const embedCode = getEmbedCode(generatedWidget);
          return (
            <div className="animate-in zoom-in-95 duration-400 max-w-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h1 className="text-xl font-black text-foreground">
                    {language === 'en' ? 'Widget Ready! 🎉' : 'উইজেট তৈরি হয়েছে! 🎉'}
                  </h1>
                  <p className="text-[12px] text-muted-foreground">
                    {language === 'en' ? 'Copy the code and paste it into your website.' : 'কোডটি কপি করে আপনার ওয়েবসাইটে পেস্ট করুন।'}
                  </p>
                </div>
              </div>

              {/* Code block */}
              <div className="bg-background border border-border rounded-2xl overflow-hidden mb-5">
                <div className="flex items-center justify-between px-4 py-2.5 bg-muted/50 border-b border-border">
                  <span className="text-[11px] font-mono text-muted-foreground">HTML — Paste before &lt;/body&gt;</span>
                  <button
                    onClick={() => handleCopyCode(embedCode)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                      codeCopied ? 'bg-emerald-600 text-white' : 'bg-muted text-foreground hover:bg-muted/80 border border-border'
                    }`}
                  >
                    {codeCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {codeCopied ? (language === 'en' ? 'Copied!' : 'কপি হয়েছে!') : (language === 'en' ? 'Copy Code' : 'কপি করুন')}
                  </button>
                </div>
                <pre className="text-[11px] font-mono text-emerald-400 dark:text-emerald-300 p-4 overflow-x-auto leading-relaxed whitespace-pre-wrap break-all">{embedCode}</pre>
              </div>

              {/* Installation instructions */}
              <div className="bg-blue-500/5 border border-blue-500/15 rounded-2xl p-5 space-y-3 mb-5">
                <div className="flex items-center gap-2 text-blue-400 font-bold text-[12px]">
                  <ExternalLink className="w-3.5 h-3.5" />
                  {language === 'en' ? 'Installation Instructions' : 'ইন্সটলেশন নির্দেশনা'}
                </div>
                <ol className="space-y-2 text-[12px] text-zinc-400">
                  <li className="flex gap-2"><span className="text-primary font-bold shrink-0">1.</span>{language === 'en' ? 'Copy the code above.' : 'উপরের কোডটি কপি করুন।'}</li>
                  <li className="flex gap-2"><span className="text-primary font-bold shrink-0">2.</span>{language === 'en' ? 'Open your website HTML file or CMS template.' : 'আপনার ওয়েবসাইটের HTML ফাইল বা CMS টেমপ্লেট খুলুন।'}</li>
                  <li className="flex gap-2"><span className="text-primary font-bold shrink-0">3.</span>{language === 'en' ? 'Paste it just before the closing </body> tag.' : 'কোডটি </body> ট্যাগের ঠিক আগে পেস্ট করুন।'}</li>
                  <li className="flex gap-2"><span className="text-primary font-bold shrink-0">4.</span>{language === 'en' ? 'Save & publish. Your widget will appear on the site.' : 'সেভ করে পাবলিশ করুন। ওয়েবসাইটে উইজেট দেখা যাবে।'}</li>
                </ol>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleCopyCode(embedCode)}
                  className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl font-bold hover:bg-primary/90 flex items-center justify-center gap-2 transition-all"
                >
                  {codeCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {codeCopied ? (language === 'en' ? 'Copied!' : 'কপি হয়েছে!') : (language === 'en' ? 'Copy Embed Code' : 'এম্বেড কোড কপি করুন')}
                </button>
                <button
                  onClick={() => router.push('/dashboard/settings/inboxes')}
                  className="px-5 py-2.5 rounded-xl border border-surface-hover text-zinc-400 hover:text-foreground hover:border-primary/40 text-[13px] font-bold transition-colors"
                >
                  {language === 'en' ? 'Done' : 'সম্পন্ন'}
                </button>
              </div>
            </div>
          );
        })()}

        {/* Step 4: Success (non-website channels) */}
        {step === 4 && selectedChannel !== 'website' && (
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
