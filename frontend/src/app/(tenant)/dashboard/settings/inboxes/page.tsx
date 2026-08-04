'use client';

import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import Link from 'next/link';
import { useLanguage } from '@/components/LanguageProvider';
import InstructionBanner from '@/components/InstructionBanner';
import toast from 'react-hot-toast';
import { 
  Plus, Webhook, Trash2, RefreshCw, MessageCircle, PhoneCall, Camera, RotateCcw, 
  Globe, Code, Zap, Copy, X, Sparkles, Save, Eye, Send, MessageSquare
} from 'lucide-react';
import CommentConfigModal from './CommentConfigModal';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function InboxesPage() {
  const { language } = useLanguage();
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [codeModalWidget, setCodeModalWidget] = useState<any | null>(null);
  const [commentModalChannel, setCommentModalChannel] = useState<any | null>(null);

  const fetchConnections = async () => {
    setLoading(true);
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/inbox/channels`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setConnections(data || []);
      }
    } catch (error) {
      console.error(error);
      toast.error(language === 'en' ? 'Failed to fetch channels' : 'চ্যানেল লোড করতে ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm(language === 'en' ? 'Are you sure you want to delete this inbox?' : 'আপনি কি নিশ্চিত যে আপনি এই ইনবক্সটি মুছতে চান?')) return;
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/inbox/channels/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success(language === 'en' ? 'Inbox deleted successfully' : 'ইনবক্স মুছে ফেলা হয়েছে');
        fetchConnections();
      } else {
        toast.error(language === 'en' ? 'Failed to delete inbox' : 'ইনবক্স মুছতে ব্যর্থ হয়েছে');
      }
    } catch (err) {
      toast.error(language === 'en' ? 'Error deleting inbox' : 'ইনবক্স মুছতে ত্রুটি হয়েছে');
    }
  };

  const handleToggleAiReply = async (id: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    // Optimistic UI update
    setConnections(prev => prev.map(c => c.id === id ? { ...c, isAiAutoReplyEnabled: nextStatus } : c));

    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/inbox/channels/${id}/ai-reply`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isAiAutoReplyEnabled: nextStatus })
      });

      if (res.ok) {
        toast.success(language === 'en' ? `AI Auto-Reply ${nextStatus ? 'Enabled' : 'Disabled'}` : `এআই অটো-রিপ্লাই ${nextStatus ? 'চালু' : 'বন্ধ'} হয়েছে`);
      } else {
        toast.error(language === 'en' ? 'Failed to update AI setting' : 'এআই সেটিং আপডেট করতে ব্যর্থ হয়েছে');
        fetchConnections();
      }
    } catch (err) {
      toast.error(language === 'en' ? 'Error updating AI setting' : 'এআই সেটিং আপডেট করতে সমস্যা হয়েছে');
      fetchConnections();
    }
  };

  const handleToggleIgnoreGroups = async (id: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    // Optimistic UI update
    setConnections(prev => prev.map(c => c.id === id ? { ...c, ignoreGroupMessages: nextStatus } : c));

    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/inbox/channels/${id}/ignore-groups`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ignoreGroupMessages: nextStatus })
      });

      if (res.ok) {
        toast.success(language === 'en' 
          ? `Ignore Group Messages ${nextStatus ? 'Enabled' : 'Disabled'}` 
          : `গ্রুপ মেসেজ ইগনোর ${nextStatus ? 'চালু' : 'বন্ধ'} হয়েছে`);
      } else {
        toast.error(language === 'en' ? 'Failed to update Group setting' : 'গ্রুপ সেটিং আপডেট করতে ব্যর্থ হয়েছে');
        fetchConnections();
      }
    } catch (err) {
      toast.error(language === 'en' ? 'Error updating Group setting' : 'গ্রুপ সেটিং আপডেট করতে সমস্যা হয়েছে');
      fetchConnections();
    }
  };

  const handleTestPing = async (id: string) => {
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/inbox/channels/website-widget/${id}/test-ping`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success(language === 'en' ? 'Connection Established 🟢! Test message sent to Inbox.' : 'কানেকশন এস্টাবলিশড 🟢! টেস্ট মেসেজ ইনবক্সে পাঠানো হয়েছে।');
      } else {
        toast.error(language === 'en' ? 'Failed to send test ping' : 'টেস্ট পিং পাঠাতে ব্যর্থ হয়েছে');
      }
    } catch (err) {
      toast.error('Test ping error');
    }
  };

  const getChannelIcon = (type: string) => {
    switch(type?.toLowerCase()) {
      case 'whatsapp': return <PhoneCall className="w-5 h-5 text-emerald-500" />;
      case 'messenger': return <MessageCircle className="w-5 h-5 text-blue-500" />;
      case 'instagram': return <Camera className="w-5 h-5 text-pink-500" />;
      case 'website': return <Globe className="w-5 h-5 text-indigo-500" />;
      default: return <Webhook className="w-5 h-5 text-primary" />;
    }
  };

  const getChannelName = (type: string) => {
    switch(type?.toLowerCase()) {
      case 'whatsapp': return 'WhatsApp';
      case 'messenger': return 'Messenger';
      case 'instagram': return 'Instagram';
      case 'website': return 'Website Widget';
      default: return type || 'Channel';
    }
  };

  return (
    <div className="min-h-full bg-background p-2 sm:p-4 md:p-8 text-foreground">
      <div className="max-w-5xl mx-auto space-y-4">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-4 rounded-2xl border border-border shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-foreground mb-0.5 font-sans">
              {language === 'en' ? 'Connected Inboxes' : 'সংযুক্ত ইনবক্সসমূহ'}
            </h1>
            <p className="text-xs text-muted-foreground max-w-2xl font-sans">
              {language === 'en' 
                ? 'Manage active channels (WhatsApp, Messenger, Instagram, Website Widgets) and check connection health.' 
                : 'আপনার হোয়াটসঅ্যাপ, মেসেঞ্জার বা ওয়েবসাইট উইজেট চ্যানেলের কানেকশন স্ট্যাটাস এবং AI রিপ্লাই সেটিংস ম্যানেজ করুন।'}
            </p>
          </div>
          
          <Link 
            href="/dashboard/settings/inboxes/new"
            className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 transition-all shadow-sm flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {language === 'en' ? 'Add Inbox' : 'ইনবক্স যুক্ত করুন'}
          </Link>
        </div>

        {/* Instruction Banner */}
        <InstructionBanner 
          title={language === 'en' ? 'Inbox Connection Status Instructions' : 'ইনবক্স কানেকশন স্ট্যাটাস নির্দেশিকা'}
          description={language === 'en' ? 'Check if your connected channels are active. A green badge indicates the channel is connected and ready to receive messages. Toggle AI Auto-Reply per inbox to automate customer replies.' : 'এখানে আপনার হোয়াটসঅ্যাপ, মেসেঞ্জার বা ওয়েবসাইট চ্যাটের আসল কানেকশন স্ট্যাটাস দেখা যাবে। সবুজ "Active 🟢" দেখানোর অর্থ হলো চ্যানেলটি মেসেজ আদান-প্রদানের জন্য সম্পূর্ণ প্রস্তুত।'}
          icon={Webhook}
          variant="emerald"
        />

        {/* List Section */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="p-3.5 border-b border-border flex items-center justify-between bg-muted/50">
            <h2 className="text-xs font-bold text-muted-foreground">
              {connections.length} {connections.length === 1 ? 'inbox' : 'inboxes'}
            </h2>
            <button onClick={fetchConnections} className="p-1.5 text-muted-foreground hover:text-primary transition-colors cursor-pointer" title="Refresh Inbox Status">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="divide-y divide-border/50">
            {loading ? (
              <div className="p-12 flex justify-center">
                <RefreshCw className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : connections.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <Webhook className="w-12 h-12 mx-auto mb-4 opacity-20 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground mb-1">
                  {language === 'en' ? 'No inboxes found' : 'কোনো ইনবক্স পাওয়া যায়নি'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {language === 'en' ? 'Click "Add Inbox" to connect a channel.' : 'চ্যানেল কানেক্ট করতে "ইনবক্স যুক্ত করুন" এ ক্লিক করুন।'}
                </p>
              </div>
            ) : (
              connections.map(conn => {
                const isActive = conn.isConnected === true || conn.status === 'active' || conn.qrStatus === 'CONNECTED';
                
                return (
                  <div key={conn.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors group">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0 border border-border">
                        {getChannelIcon(conn.channelType)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-foreground flex items-center gap-2 text-xs truncate">
                          <span className="truncate">{conn.displayName || conn.phoneNumber || getChannelName(conn.channelType)}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 shrink-0 ${
                            isActive
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                              : 'bg-red-500/10 text-red-500 border border-red-500/20'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                            {isActive ? (language === 'en' ? 'Active 🟢' : 'সক্রিয় 🟢') : (language === 'en' ? 'Disconnected 🔴' : 'ডিসকানেক্টেড 🔴')}
                          </span>
                        </h3>
                        <p className="text-[11px] text-muted-foreground mt-0.5 truncate font-sans">
                          {getChannelName(conn.channelType)} {conn.provider ? `(${conn.provider})` : ''}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-border">
                      {!isActive && (
                        <Link
                          href="/dashboard/settings/inboxes/new"
                          className="px-2.5 py-1 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/20 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all shrink-0 cursor-pointer font-sans"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>{language === 'en' ? 'Reconnect / Scan QR' : 'পুনরায় কানেক্ট করুন'}</span>
                        </Link>
                      )}

                      {conn.channelType?.toLowerCase() === 'website' && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setCodeModalWidget(conn)}
                            className="px-2.5 py-1 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer shadow-2xs font-sans"
                            title="Customize Widget & View Code"
                          >
                            <Code className="w-3.5 h-3.5" />
                            <span>{language === 'en' ? 'Settings & Code' : 'সেটিংস ও কোড'}</span>
                          </button>
                          <button
                            onClick={() => handleTestPing(conn.id)}
                            className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all shrink-0 cursor-pointer font-sans"
                            title="Test Connection Ping"
                          >
                            <Zap className="w-3.5 h-3.5" />
                            <span>{language === 'en' ? 'Test Ping' : 'টেস্ট মোটিক'}</span>
                          </button>
                        </div>
                      )}

                      {conn.channelType?.toLowerCase() === 'messenger' && (
                        <button
                          onClick={() => setCommentModalChannel(conn)}
                          className="px-2.5 py-1 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer shadow-2xs font-sans mr-2"
                          title="Configure Facebook Comment Auto-Reply"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                          <span>{language === 'en' ? 'Comment Auto-Reply' : 'কমেন্ট অটো-রিপ্লাই'}</span>
                        </button>
                      )}

                      <div className="flex items-center gap-2 mr-2">
                        <span className="text-[11px] text-muted-foreground font-semibold font-sans">AI Auto-Reply</span>
                        <button
                          type="button"
                          onClick={() => handleToggleAiReply(conn.id, !!conn.isAiAutoReplyEnabled)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                            conn.isAiAutoReplyEnabled ? 'bg-primary' : 'bg-muted'
                          }`}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm ${
                              conn.isAiAutoReplyEnabled ? 'translate-x-4.5' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      {conn.channelType?.toLowerCase() === 'whatsapp' && (
                        <div className="flex items-center gap-2 mr-2">
                          <span className="text-[11px] text-muted-foreground font-semibold font-sans">
                            {language === 'en' ? 'Ignore Group Msgs' : 'গ্রুপ মেসেজ ইগনোর'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleIgnoreGroups(conn.id, conn.ignoreGroupMessages ?? true)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                              (conn.ignoreGroupMessages ?? true) ? 'bg-emerald-600' : 'bg-muted'
                            }`}
                            title={language === 'en' ? 'Ignore WhatsApp Group Messages' : 'হোয়াটসঅ্যাপ গ্রুপ মেসেজ ইগনোর করুন'}
                          >
                            <span
                              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm ${
                                (conn.ignoreGroupMessages ?? true) ? 'translate-x-4.5' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      )}

                      <button 
                        onClick={() => handleDelete(conn.id)}
                        className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors shrink-0 cursor-pointer"
                        title="Delete Inbox"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Chatwoot-Style Interactive Widget Customization & Code Modal */}
      {codeModalWidget && (
        <WidgetConfigModal
          widget={codeModalWidget}
          onClose={() => setCodeModalWidget(null)}
          onRefresh={fetchConnections}
          language={language}
          API={API}
        />
      )}

      {/* Facebook Comment Automation Modal */}
      {commentModalChannel && (
        <CommentConfigModal
          channel={commentModalChannel}
          onClose={() => setCommentModalChannel(null)}
          onRefresh={fetchConnections}
          language={language}
          API={API}
        />
      )}
    </div>
  );
}

function WidgetConfigModal({ widget, onClose, onRefresh, language, API }: any) {
  const [primaryColor, setPrimaryColor] = useState(widget.primaryColor || '#1F824A');
  const [name, setName] = useState(widget.displayName || widget.name || 'Website Widget');
  const [heading, setHeading] = useState(widget.heading || 'Chat with us');
  const [tagline, setTagline] = useState(widget.tagline || 'We are here to help you.');
  const [greetingEnabled, setGreetingEnabled] = useState(widget.greetingEnabled ?? true);
  const [isPreviewOpen, setIsPreviewOpen] = useState(true);
  const [saving, setSaving] = useState(false);

  const presetColors = [
    '#1F824A', // Zini Green
    '#EE8D27', // Zini Orange
    '#2563EB', // Royal Blue
    '#7C3AED', // Deep Purple
    '#DB2777', // Hot Pink
    '#0F172A', // Slate Dark
    '#0891B2', // Teal/Cyan
  ];

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/website-widget/${widget.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          primaryColor,
          heading,
          tagline,
          greetingEnabled,
        }),
      });

      if (res.ok) {
        toast.success(language === 'en' ? 'Widget settings updated!' : 'উইজেটের সেটিংস আপডেট হয়েছে!');
        onRefresh();
      } else {
        toast.error('Failed to update widget');
      }
    } catch (err) {
      toast.error('Error updating widget settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestPing = async () => {
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/inbox/channels/website-widget/${widget.id}/test-ping`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success(language === 'en' ? 'Connection Established 🟢! Test message sent to Inbox.' : 'কানেকশন এস্টাবলিশড 🟢! টেস্ট মেসেজ ইনবক্সে পাঠানো হয়েছে।');
      } else {
        toast.error(language === 'en' ? 'Failed to send test ping' : 'টেস্ট পিং পাঠাতে ব্যর্থ হয়েছে');
      }
    } catch (err) {
      toast.error('Test ping error');
    }
  };

  const scriptCode = `<script src="https://zinichat.com/widget.js" data-widget-token="${widget.widgetToken}" async></script>`;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto" onClick={onClose}>
      <div className="bg-card rounded-2xl max-w-4xl w-full p-4 sm:p-6 space-y-6 shadow-2xl border border-border my-auto max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold shadow-sm transition-colors" style={{ backgroundColor: primaryColor }}>
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-base">
                {name} <span className="text-xs text-muted-foreground font-medium">({widget.type || 'LIVE_CHAT'})</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                {language === 'en' ? 'Customize colors, headers, and embed code for your website' : 'আপনার ওয়েবসাইটের লাইভ চ্যাট কালার, হেডিং ও স্ক্রিপ্ট সেটিংস কাস্টমাইজ করুন'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2-Column Split: Left Controls + Right Chatwoot Live Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Settings & Controls (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Color & Theme Settings Card */}
            <div className="bg-muted/30 border border-border p-4 rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                {language === 'en' ? 'Widget Design & Color' : 'উইজেটের থিম ও কালার'}
              </h4>

              {/* Primary Color Selector */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground mb-1.5 block">
                  {language === 'en' ? 'Primary Theme Color' : 'প্রধান ব্র্যান্ড কালার'}
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {presetColors.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setPrimaryColor(color)}
                      style={{ backgroundColor: color }}
                      className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer ${
                        primaryColor === color ? 'border-foreground scale-110 shadow-sm' : 'border-transparent opacity-80 hover:opacity-100'
                      }`}
                    />
                  ))}
                  <div className="flex items-center gap-1.5 ml-2 border border-border rounded-lg px-2 py-1 bg-background">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={e => setPrimaryColor(e.target.value)}
                      className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
                    />
                    <span className="text-[11px] font-mono text-foreground uppercase">{primaryColor}</span>
                  </div>
                </div>
              </div>

              {/* Name & Heading inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                    {language === 'en' ? 'Widget Name' : 'উইজেটের নাম'}
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 md:py-1.5 text-[16px] md:text-xs text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                    {language === 'en' ? 'Header Title' : 'হেডিং শিরোনাম'}
                  </label>
                  <input
                    type="text"
                    value={heading}
                    onChange={e => setHeading(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 md:py-1.5 text-[16px] md:text-xs text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Tagline input */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                  {language === 'en' ? 'Subheading / Tagline' : 'ট্যাগলাইন বিবরণ'}
                </label>
                <input
                  type="text"
                  value={tagline}
                  onChange={e => setTagline(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 md:py-1.5 text-[16px] md:text-xs text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              {/* Greeting Toggle & Save Button */}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-foreground">
                  <input
                    type="checkbox"
                    checked={greetingEnabled}
                    onChange={e => setGreetingEnabled(e.target.checked)}
                    className="rounded text-primary focus:ring-primary h-4 w-4"
                  />
                  <span>{language === 'en' ? 'Enable Greeting Message' : 'ওয়েলকাম মেসেজ সক্রিয় রাখুন'}</span>
                </label>

                <button
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="px-3.5 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Saving...' : (language === 'en' ? 'Save Design' : 'ডিজাইন সেভ করুন')}</span>
                </button>
              </div>
            </div>

            {/* Script Code Block */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>{language === 'en' ? 'Embed Code' : 'ওয়েবসাইট ইনটিগ্রেশন কোড'}</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  {language === 'en' ? 'Paste before </body> tag' : '</body> ট্যাগের ঠিক পূর্বে পেস্ট করুন'}
                </span>
              </label>

              <div className="relative bg-slate-950 text-slate-100 p-3.5 rounded-xl font-mono text-[11px] overflow-x-auto leading-relaxed border border-slate-800">
                <code>{scriptCode}</code>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={handleTestPing}
                  className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{language === 'en' ? 'Test Ping' : 'টেস্ট মোটিক'}</span>
                </button>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(scriptCode);
                    toast.success(language === 'en' ? 'Script code copied!' : 'কোড কপি হয়েছে!');
                  }}
                  className="px-4 py-1.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{language === 'en' ? 'Copy Script Code' : 'কোড কপি করুন'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Chatwoot-Style Interactive Visual Preview (5 cols) */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="w-full bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden relative min-h-[380px] flex flex-col justify-between p-3 select-none">
              
              {/* Simulated Browser Bar */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 px-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                </div>
                <span className="text-[10px] font-medium text-slate-400 bg-slate-800 px-2 py-0.5 rounded truncate max-w-[140px]">
                  your-website.com
                </span>
                <Eye className="w-3.5 h-3.5 text-slate-500" />
              </div>

              {/* Simulated Website Background Content */}
              <div className="flex-1 flex flex-col items-center justify-center p-4 text-center my-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700/50 flex items-center justify-center mb-2">
                  <Globe className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-xs font-bold text-slate-300">Live Website Preview</p>
                <p className="text-[10px] text-slate-500 mt-1 max-w-[200px]">
                  See how your chat widget bubble looks on your website.
                </p>
              </div>

              {/* Chatwoot-Style Floating Live Chat Window */}
              {isPreviewOpen && (
                <div className="w-full bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden mb-2 animate-in slide-in-from-bottom-4 duration-300">
                  
                  {/* Chat Box Header (Themed with primaryColor) */}
                  <div className="p-3 text-white transition-colors flex items-center justify-between shadow-xs" style={{ backgroundColor: primaryColor }}>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-xs">
                        Z
                      </div>
                      <div>
                        <h5 className="font-bold text-xs truncate max-w-[150px] leading-tight">{heading}</h5>
                        <p className="text-[10px] text-white/80 truncate max-w-[150px] leading-tight">{tagline}</p>
                      </div>
                    </div>
                    <button onClick={() => setIsPreviewOpen(false)} className="text-white/80 hover:text-white p-1">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Chat Box Body */}
                  <div className="p-3 bg-slate-50 space-y-2 min-h-[100px] max-h-[120px] overflow-y-auto">
                    {greetingEnabled && (
                      <div className="flex items-start gap-1.5">
                        <div className="w-5 h-5 rounded-full text-[9px] font-bold text-white flex items-center justify-center shrink-0 mt-0.5 transition-colors" style={{ backgroundColor: primaryColor }}>
                          AI
                        </div>
                        <div className="bg-white border border-slate-200 p-2 rounded-2xl rounded-tl-xs text-[11px] text-slate-800 shadow-2xs max-w-[85%] leading-relaxed">
                          Hello! 👋 Welcome to our site. How can we help you today?
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Chat Box Input Placeholder */}
                  <div className="p-2 border-t border-slate-100 bg-white flex items-center gap-2">
                    <input
                      disabled
                      type="text"
                      placeholder="Type a message..."
                      className="w-full bg-slate-100 rounded-lg px-2.5 py-1 text-[10px] text-slate-400 focus:outline-none"
                    />
                    <div className="p-1 rounded-lg text-white shrink-0 transition-colors" style={{ backgroundColor: primaryColor }}>
                      <Send className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              )}

              {/* Floating Launcher Bubble */}
              <div className="flex justify-end pr-1 pb-1">
                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(!isPreviewOpen)}
                  style={{ backgroundColor: primaryColor }}
                  className="w-11 h-11 rounded-full text-white flex items-center justify-center shadow-lg hover:scale-105 transition-all cursor-pointer relative"
                  title="Click to toggle chat preview"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 border-2 border-slate-900 rounded-full animate-pulse" />
                </button>
              </div>

            </div>
            
            <p className="text-[10px] text-slate-400 mt-2 font-medium text-center">
              💡 {language === 'en' ? 'Click the launcher bubble to toggle chat preview' : 'চ্যাট উইজেটটি হাইড/শো করতে বাবলটিতে চাপুন'}
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
