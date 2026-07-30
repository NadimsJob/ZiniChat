'use client';

import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import Link from 'next/link';
import { useLanguage } from '@/components/LanguageProvider';
import InstructionBanner from '@/components/InstructionBanner';
import toast, { Toaster } from 'react-hot-toast';
import { Plus, Webhook, Trash2, RefreshCw, MessageCircle, PhoneCall, Camera, RotateCcw } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function InboxesPage() {
  const { language } = useLanguage();
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  const getChannelIcon = (type: string) => {
    switch(type?.toLowerCase()) {
      case 'whatsapp': return <PhoneCall className="w-5 h-5 text-emerald-500" />;
      case 'messenger': return <MessageCircle className="w-5 h-5 text-blue-500" />;
      case 'instagram': return <Camera className="w-5 h-5 text-pink-500" />;
      default: return <Webhook className="w-5 h-5 text-primary" />;
    }
  };

  const getChannelName = (type: string) => {
    switch(type?.toLowerCase()) {
      case 'whatsapp': return 'WhatsApp';
      case 'messenger': return 'Messenger';
      case 'instagram': return 'Instagram';
      default: return type || 'Channel';
    }
  };

  return (
    <div className="min-h-full bg-slate-50/50 p-2 sm:p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-4">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-slate-900 mb-0.5">
              {language === 'en' ? 'Connected Inboxes' : 'সংযুক্ত ইনবক্সসমূহ'}
            </h1>
            <p className="text-xs text-slate-500 max-w-2xl">
              {language === 'en' 
                ? 'Manage active channels (WhatsApp, Messenger, Instagram) and check connection health.' 
                : 'আপনার হোয়াটসঅ্যাপ বা মেসেঞ্জার চ্যানেলের কানেকশন স্ট্যাটাস এবং AI রিপ্লাই সেটিংস ম্যানেজ করুন।'}
            </p>
          </div>
          
          <Link 
            href="/dashboard/settings/inboxes/new"
            className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 transition-all shadow-sm flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            {language === 'en' ? 'Add Inbox' : 'ইনবক্স যুক্ত করুন'}
          </Link>
        </div>

        {/* Instruction Banner */}
        <InstructionBanner 
          title={language === 'en' ? 'Inbox Connection Status Instructions' : 'ইনবক্স কানেকশন স্ট্যাটাস নির্দেশিকা'}
          description={language === 'en' ? 'Check if your connected channels are active. A green badge indicates the channel is connected and ready to receive messages. Toggle AI Auto-Reply per inbox to automate customer replies.' : 'এখানে আপনার হোয়াটসঅ্যাপ বা মেসেঞ্জার চ্যানেলের আসল কানেকশন স্ট্যাটাস দেখা যাবে। সবুজ "Active 🟢" দেখানোর অর্থ হলো চ্যানেলটি মেসেজ আদান-প্রদানের জন্য সম্পূর্ণ প্রস্তুত।'}
          icon={Webhook}
          variant="emerald"
        />

        {/* List Section */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h2 className="text-xs font-bold text-slate-700">
              {connections.length} {connections.length === 1 ? 'inbox' : 'inboxes'}
            </h2>
            <button onClick={fetchConnections} className="p-1.5 text-slate-400 hover:text-primary transition-colors" title="Refresh Inbox Status">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {loading ? (
              <div className="p-12 flex justify-center">
                <RefreshCw className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : connections.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <Webhook className="w-12 h-12 mx-auto mb-4 opacity-20 text-slate-400" />
                <p className="text-sm font-medium text-slate-600 mb-1">
                  {language === 'en' ? 'No inboxes found' : 'কোনো ইনবক্স পাওয়া যায়নি'}
                </p>
                <p className="text-xs text-slate-400">
                  {language === 'en' ? 'Click "Add Inbox" to connect a channel.' : 'চ্যানেল কানেক্ট করতে "ইনবক্স যুক্ত করুন" এ ক্লিক করুন।'}
                </p>
              </div>
            ) : (
              connections.map(conn => {
                const isActive = conn.isConnected === true || conn.status === 'active' || conn.qrStatus === 'CONNECTED';
                
                return (
                  <div key={conn.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors group">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                        {getChannelIcon(conn.channelType)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-slate-900 flex items-center gap-2 text-xs truncate">
                          <span className="truncate">{conn.displayName || conn.phoneNumber || getChannelName(conn.channelType)}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 shrink-0 ${
                            isActive
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300/80' 
                              : 'bg-red-100 text-red-800 border border-red-300/80'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                            {isActive ? (language === 'en' ? 'Active 🟢' : 'সক্রিয় 🟢') : (language === 'en' ? 'Disconnected 🔴' : 'ডিসকানেক্টেড 🔴')}
                          </span>
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                          {getChannelName(conn.channelType)} {conn.provider ? `(${conn.provider})` : ''}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      {!isActive && (
                        <Link
                          href="/dashboard/settings/inboxes/new"
                          className="px-2.5 py-1 bg-amber-500/15 text-amber-700 hover:bg-amber-500/20 border border-amber-400/40 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all shrink-0"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>{language === 'en' ? 'Reconnect / Scan QR' : 'পুনরায় কানেক্ট করুন'}</span>
                        </Link>
                      )}

                      <div className="flex items-center gap-2 mr-2">
                        <span className="text-[11px] text-slate-600 font-semibold">AI Auto-Reply</span>
                        <button
                          type="button"
                          onClick={() => handleToggleAiReply(conn.id, !!conn.isAiAutoReplyEnabled)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                            conn.isAiAutoReplyEnabled ? 'bg-primary' : 'bg-slate-300'
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
                          <span className="text-[11px] text-slate-600 font-semibold">
                            {language === 'en' ? 'Ignore Group Msgs' : 'গ্রুপ মেসেজ ইগনোর'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleIgnoreGroups(conn.id, conn.ignoreGroupMessages ?? true)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                              (conn.ignoreGroupMessages ?? true) ? 'bg-emerald-600' : 'bg-slate-300'
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
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
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
    </div>
  );
}
