'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import Cookies from 'js-cookie';
import { Plus, Webhook, Trash2, Copy, RefreshCw, MessageCircle, PhoneCall, Camera, Settings2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

export default function InboxesPage() {
  const { language } = useLanguage();
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConnections = async () => {
    setLoading(true);
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/inbox/channels`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setConnections(data);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to fetch channels');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, []);

  const handleDelete = async (id: string, channelType: string) => {
    if (!window.confirm(language === 'en' ? 'Are you sure you want to delete this inbox?' : 'আপনি কি নিশ্চিত যে আপনি এটি মুছতে চান?')) return;
    try {
      const token = Cookies.get('access_token');
      // Assume the old routes still exist backend side for deletion, e.g. /settings/whatsapp/:id
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/settings/${channelType}/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Inbox deleted successfully');
        fetchConnections();
      } else {
        toast.error('Failed to delete inbox');
      }
    } catch (err) {
      toast.error('Error deleting inbox');
    }
  };

  const handleToggleAiReply = async (id: string, channelType: string, currentStatus: boolean) => {
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/settings/${channelType}/${id}/ai-reply`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isAiAutoReplyEnabled: !currentStatus })
      });
      if (res.ok) {
        toast.success('AI setting updated');
        fetchConnections();
      }
    } catch (err) {
      toast.error('Error updating AI setting');
    }
  };

  const getChannelIcon = (type: string) => {
    switch(type) {
      case 'whatsapp': return <PhoneCall className="w-5 h-5 text-emerald-500" />;
      case 'messenger': return <MessageCircle className="w-5 h-5 text-blue-500" />;
      case 'instagram': return <Camera className="w-5 h-5 text-pink-500" />;
      default: return <Webhook className="w-5 h-5 text-primary" />;
    }
  };

  const getChannelName = (type: string) => {
    switch(type) {
      case 'whatsapp': return 'WhatsApp';
      case 'messenger': return 'Messenger';
      case 'instagram': return 'Instagram';
      default: return type;
    }
  };

  return (
    <div className="min-h-full bg-slate-50/50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">
              {language === 'en' ? 'Inboxes' : 'ইনবক্সসমূহ'}
            </h1>
            <p className="text-sm text-slate-500 max-w-2xl">
              {language === 'en' 
                ? 'A channel is the mode of communication your customer chooses to interact with you. An inbox is where you manage interactions for a specific channel.' 
                : 'আপনার গ্রাহকরা যে মাধ্যমে আপনার সাথে যোগাযোগ করে তা হলো চ্যানেল। ইনবক্স হলো সেই জায়গা যেখানে আপনি ওই চ্যানেলের মেসেজগুলো পরিচালনা করেন।'}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Link 
              href="/dashboard/settings/inboxes/new"
              className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors shadow-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {language === 'en' ? 'Add Inbox' : 'ইনবক্স যুক্ত করুন'}
            </Link>
          </div>
        </div>

        {/* List Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h2 className="text-sm font-semibold text-slate-700">
              {connections.length} {connections.length === 1 ? 'inbox' : 'inboxes'}
            </h2>
            <button onClick={fetchConnections} className="p-1.5 text-slate-400 hover:text-primary transition-colors">
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
              connections.map(conn => (
                <div key={conn.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                      {getChannelIcon(conn.channelType)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 flex items-center gap-2 text-sm">
                        {conn.displayName || conn.phoneNumber || getChannelName(conn.channelType)}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          conn.status === 'active' 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {conn.status}
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {getChannelName(conn.channelType)} {conn.connectionMethod ? `(${conn.connectionMethod})` : ''}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex items-center gap-2 mr-4 border-r border-slate-200 pr-4">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">AI Reply</span>
                      <button
                        onClick={() => handleToggleAiReply(conn.id, conn.channelType, conn.isAiAutoReplyEnabled)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                          conn.isAiAutoReplyEnabled ? 'bg-primary' : 'bg-slate-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm ${
                            conn.isAiAutoReplyEnabled ? 'translate-x-4.5' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <button 
                      onClick={() => handleDelete(conn.id, conn.channelType)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
