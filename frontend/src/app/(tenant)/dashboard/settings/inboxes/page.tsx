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
import { ChannelBrandIcon } from '@/components/BrandIcons';

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
      toast.error(language === 'en' ? 'Failed to fetch channels' : 'à¦šà§�à¦¯à¦¾à¦¨à§‡à¦² à¦²à§‹à¦¡ à¦•à¦°à¦¤à§‡ à¦¬à§�à¦¯à¦°à§�à¦¥ à¦¹à¦¯à¦¼à§‡à¦›à§‡');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm(language === 'en' ? 'Are you sure you want to delete this inbox?' : 'à¦†à¦ªà¦¨à¦¿ à¦•à¦¿ à¦¨à¦¿à¦¶à§�à¦šà¦¿à¦¤ à¦¯à§‡ à¦†à¦ªà¦¨à¦¿ à¦�à¦‡ à¦‡à¦¨à¦¬à¦•à§�à¦¸à¦Ÿà¦¿ à¦®à§�à¦›à¦¤à§‡ à¦šà¦¾à¦¨?')) return;
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/inbox/channels/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success(language === 'en' ? 'Inbox deleted successfully' : 'à¦‡à¦¨à¦¬à¦•à§�à¦¸ à¦®à§�à¦›à§‡ à¦«à§‡à¦²à¦¾ à¦¹à¦¯à¦¼à§‡à¦›à§‡');
        fetchConnections();
      } else {
        toast.error(language === 'en' ? 'Failed to delete inbox' : 'à¦‡à¦¨à¦¬à¦•à§�à¦¸ à¦®à§�à¦›à¦¤à§‡ à¦¬à§�à¦¯à¦°à§�à¦¥ à¦¹à¦¯à¦¼à§‡à¦›à§‡');
      }
    } catch (err) {
      toast.error(language === 'en' ? 'Error deleting inbox' : 'à¦‡à¦¨à¦¬à¦•à§�à¦¸ à¦®à§�à¦›à¦¤à§‡ à¦¤à§�à¦°à§�à¦Ÿà¦¿ à¦¹à¦¯à¦¼à§‡à¦›à§‡');
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
        toast.success(language === 'en' ? `AI Auto-Reply ${nextStatus ? 'Enabled' : 'Disabled'}` : `à¦�à¦†à¦‡ à¦…à¦Ÿà§‹-à¦°à¦¿à¦ªà§�à¦²à¦¾à¦‡ ${nextStatus ? 'à¦šà¦¾à¦²à§�' : 'à¦¬à¦¨à§�à¦§'} à¦¹à¦¯à¦¼à§‡à¦›à§‡`);
      } else {
        toast.error(language === 'en' ? 'Failed to update AI setting' : 'à¦�à¦†à¦‡ à¦¸à§‡à¦Ÿà¦¿à¦‚ à¦†à¦ªà¦¡à§‡à¦Ÿ à¦•à¦°à¦¤à§‡ à¦¬à§�à¦¯à¦°à§�à¦¥ à¦¹à¦¯à¦¼à§‡à¦›à§‡');
        fetchConnections();
      }
    } catch (err) {
      toast.error(language === 'en' ? 'Error updating AI setting' : 'à¦�à¦†à¦‡ à¦¸à§‡à¦Ÿà¦¿à¦‚ à¦†à¦ªà¦¡à§‡à¦Ÿ à¦•à¦°à¦¤à§‡ à¦¸à¦®à¦¸à§�à¦¯à¦¾ à¦¹à¦¯à¦¼à§‡à¦›à§‡');
      fetchConnections();
    }
  };

  const handleToggleChannelStatus = async (id: string, currentIsActive: boolean) => {
    const nextIsActive = !currentIsActive;
    // Optimistic UI update
    setConnections(prev => prev.map(c => c.id === id ? { 
      ...c, 
      isActive: nextIsActive, 
      status: nextIsActive ? 'active' : 'inactive' 
    } : c));

    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/inbox/channels/${id}/status`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive: nextIsActive })
      });

      if (res.ok) {
        toast.success(
          language === 'en' 
            ? `Channel ${nextIsActive ? 'Activated' : 'Deactivated (Hidden from Live Inbox)'}` 
            : `à¦šà§�à¦¯à¦¾à¦¨à§‡à¦² ${nextIsActive ? 'à¦¸à¦•à§�à¦°à¦¿à¦¯à¦¼' : 'à¦¨à¦¿à¦·à§�à¦•à§�à¦°à¦¿à¦¯à¦¼ (à¦‡à¦¨à¦¬à¦•à§�à¦¸à§‡ à¦†à¦° à¦¦à§‡à¦–à¦¾ à¦¯à¦¾à¦¬à§‡ à¦¨à¦¾)'} à¦¹à¦¯à¦¼à§‡à¦›à§‡`
        );
      } else {
        toast.error(language === 'en' ? 'Failed to update channel status' : 'à¦šà§�à¦¯à¦¾à¦¨à§‡à¦² à¦¸à§�à¦Ÿà§�à¦¯à¦¾à¦Ÿà¦¾à¦¸ à¦†à¦ªà¦¡à§‡à¦Ÿ à¦•à¦°à¦¤à§‡ à¦¬à§�à¦¯à¦°à§�à¦¥ à¦¹à¦¯à¦¼à§‡à¦›à§‡');
        fetchConnections();
      }
    } catch (err) {
      toast.error(language === 'en' ? 'Error updating channel status' : 'à¦šà§�à¦¯à¦¾à¦¨à§‡à¦² à¦¸à§�à¦Ÿà§�à¦¯à¦¾à¦Ÿà¦¾à¦¸ à¦†à¦ªà¦¡à§‡à¦Ÿ à¦•à¦°à¦¤à§‡ à¦¸à¦®à¦¸à§�à¦¯à¦¾ à¦¹à¦¯à¦¼à§‡à¦›à§‡');
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
          : `à¦—à§�à¦°à§�à¦ª à¦®à§‡à¦¸à§‡à¦œ à¦‡à¦—à¦¨à§‹à¦° ${nextStatus ? 'à¦šà¦¾à¦²à§�' : 'à¦¬à¦¨à§�à¦§'} à¦¹à¦¯à¦¼à§‡à¦›à§‡`);
      } else {
        toast.error(language === 'en' ? 'Failed to update Group setting' : 'à¦—à§�à¦°à§�à¦ª à¦¸à§‡à¦Ÿà¦¿à¦‚ à¦†à¦ªà¦¡à§‡à¦Ÿ à¦•à¦°à¦¤à§‡ à¦¬à§�à¦¯à¦°à§�à¦¥ à¦¹à¦¯à¦¼à§‡à¦›à§‡');
        fetchConnections();
      }
    } catch (err) {
      toast.error(language === 'en' ? 'Error updating Group setting' : 'à¦—à§�à¦°à§�à¦ª à¦¸à§‡à¦Ÿà¦¿à¦‚ à¦†à¦ªà¦¡à§‡à¦Ÿ à¦•à¦°à¦¤à§‡ à¦¸à¦®à¦¸à§�à¦¯à¦¾ à¦¹à¦¯à¦¼à§‡à¦›à§‡');
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
        toast.success(language === 'en' ? 'Connection Established ðŸŸ¢! Test message sent to Inbox.' : 'à¦•à¦¾à¦¨à§‡à¦•à¦¶à¦¨ à¦�à¦¸à§�à¦Ÿà¦¾à¦¬à¦²à¦¿à¦¶à¦¡ ðŸŸ¢! à¦Ÿà§‡à¦¸à§�à¦Ÿ à¦®à§‡à¦¸à§‡à¦œ à¦‡à¦¨à¦¬à¦•à§�à¦¸à§‡ à¦ªà¦¾à¦ à¦¾à¦¨à§‹ à¦¹à¦¯à¦¼à§‡à¦›à§‡à¥¤');
      } else {
        toast.error(language === 'en' ? 'Failed to send test ping' : 'à¦Ÿà§‡à¦¸à§�à¦Ÿ à¦ªà¦¿à¦‚ à¦ªà¦¾à¦ à¦¾à¦¤à§‡ à¦¬à§�à¦¯à¦°à§�à¦¥ à¦¹à¦¯à¦¼à§‡à¦›à§‡');
      }
    } catch (err) {
      toast.error('Test ping error');
    }
  };
  const getChannelIcon = (type: string) => {
    return <ChannelBrandIcon channelType={type} className="w-6 h-6" />;
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-4 rounded-2xl border border-zinc-300 dark:border-zinc-700/80 shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-foreground mb-0.5 font-sans">
              {language === 'en' ? 'Connected Inboxes' : 'à¦¸à¦‚à¦¯à§�à¦•à§�à¦¤ à¦‡à¦¨à¦¬à¦•à§�à¦¸à¦¸à¦®à§‚à¦¹'}
            </h1>
            <p className="text-xs text-muted-foreground max-w-2xl font-sans">
              {language === 'en' 
                ? 'Manage active channels (WhatsApp, Messenger, Instagram, Website Widgets) and check connection health.' 
                : 'à¦†à¦ªà¦¨à¦¾à¦° à¦¹à§‹à¦¯à¦¼à¦¾à¦Ÿà¦¸à¦…à§�à¦¯à¦¾à¦ª, à¦®à§‡à¦¸à§‡à¦žà§�à¦œà¦¾à¦° à¦¬à¦¾ à¦“à§Ÿà§‡à¦¬à¦¸à¦¾à¦‡à¦Ÿ à¦‰à¦‡à¦œà§‡à¦Ÿ à¦šà§�à¦¯à¦¾à¦¨à§‡à¦²à§‡à¦° à¦•à¦¾à¦¨à§‡à¦•à¦¶à¦¨ à¦¸à§�à¦Ÿà§�à¦¯à¦¾à¦Ÿà¦¾à¦¸ à¦�à¦¬à¦‚ AI à¦°à¦¿à¦ªà§�à¦²à¦¾à¦‡ à¦¸à§‡à¦Ÿà¦¿à¦‚à¦¸ à¦®à§�à¦¯à¦¾à¦¨à§‡à¦œ à¦•à¦°à§�à¦¨à¥¤'}
            </p>
          </div>
          
          <Link 
            href="/dashboard/settings/inboxes/new"
            className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 transition-all shadow-sm flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {language === 'en' ? 'Add Inbox' : 'à¦‡à¦¨à¦¬à¦•à§�à¦¸ à¦¯à§�à¦•à§�à¦¤ à¦•à¦°à§�à¦¨'}
          </Link>
        </div>

        {/* Instruction Banner */}
        <InstructionBanner 
          title={language === 'en' ? 'Inbox Connection Status Instructions' : 'à¦‡à¦¨à¦¬à¦•à§�à¦¸ à¦•à¦¾à¦¨à§‡à¦•à¦¶à¦¨ à¦¸à§�à¦Ÿà§�à¦¯à¦¾à¦Ÿà¦¾à¦¸ à¦¨à¦¿à¦°à§�à¦¦à§‡à¦¶à¦¿à¦•à¦¾'}
          description={language === 'en' ? 'Check if your connected channels are active. A green badge indicates the channel is connected and ready to receive messages. Toggle AI Auto-Reply per inbox to automate customer replies.' : 'à¦�à¦–à¦¾à¦¨à§‡ à¦†à¦ªà¦¨à¦¾à¦° à¦¹à§‹à¦¯à¦¼à¦¾à¦Ÿà¦¸à¦…à§�à¦¯à¦¾à¦ª, à¦®à§‡à¦¸à§‡à¦žà§�à¦œà¦¾à¦° à¦¬à¦¾ à¦“à§Ÿà§‡à¦¬à¦¸à¦¾à¦‡à¦Ÿ à¦šà§�à¦¯à¦¾à¦Ÿà§‡à¦° à¦†à¦¸à¦² à¦•à¦¾à¦¨à§‡à¦•à¦¶à¦¨ à¦¸à§�à¦Ÿà§�à¦¯à¦¾à¦Ÿà¦¾à¦¸ à¦¦à§‡à¦–à¦¾ à¦¯à¦¾à¦¬à§‡à¥¤ à¦¸à¦¬à§�à¦œ "Active ðŸŸ¢" à¦¦à§‡à¦–à¦¾à¦¨à§‹à¦° à¦…à¦°à§�à¦¥ à¦¹à¦²à§‹ à¦šà§�à¦¯à¦¾à¦¨à§‡à¦²à¦Ÿà¦¿ à¦®à§‡à¦¸à§‡à¦œ à¦†à¦¦à¦¾à¦¨-à¦ªà§�à¦°à¦¦à¦¾à¦¨à§‡à¦° à¦œà¦¨à§�à¦¯ à¦¸à¦®à§�à¦ªà§‚à¦°à§�à¦£ à¦ªà§�à¦°à¦¸à§�à¦¤à§�à¦¤à¥¤'}
          icon={Webhook}
          variant="emerald"
        />

        {/* List Section */}
        <div className="bg-card rounded-2xl border border-zinc-300 dark:border-zinc-700/80 shadow-sm overflow-hidden">
          <div className="p-3.5 border-b border-zinc-300 dark:border-zinc-800 flex items-center justify-between bg-muted/50">
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
                  {language === 'en' ? 'No inboxes found' : 'à¦•à§‹à¦¨à§‹ à¦‡à¦¨à¦¬à¦•à§�à¦¸ à¦ªà¦¾à¦“à§Ÿà¦¾ à¦¯à¦¾à§Ÿà¦¨à¦¿'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {language === 'en' ? 'Click "Add Inbox" to connect a channel.' : 'à¦šà§�à¦¯à¦¾à¦¨à§‡à¦² à¦•à¦¾à¦¨à§‡à¦•à§�à¦Ÿ à¦•à¦°à¦¤à§‡ "à¦‡à¦¨à¦¬à¦•à§�à¦¸ à¦¯à§�à¦•à§�à¦¤ à¦•à¦°à§�à¦¨" à¦� à¦•à§�à¦²à¦¿à¦• à¦•à¦°à§�à¦¨à¥¤'}
                </p>
              </div>
            ) : (
              connections.map(conn => {
                const isChannelInactive = conn.status === 'inactive' || conn.isActive === false;
                const isDisconnected = !isChannelInactive && (conn.status === 'disconnected' || conn.qrStatus === 'DISCONNECTED');
                const isActive = !isChannelInactive && (conn.isConnected === true || conn.status === 'active' || conn.qrStatus === 'CONNECTED');
                
                return (
                  <div key={conn.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors group">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0 border border-border overflow-hidden relative">
                        {(conn.channelType?.toLowerCase() === 'messenger' || conn.channelType?.toLowerCase() === 'instagram') ? (
                          <>
                            <img 
                              src={`https://graph.facebook.com/${conn.channelType?.toLowerCase() === 'instagram' ? conn.verifyToken : conn.externalAccountId}/picture?type=normal`} 
                              alt="Profile" 
                              className="w-full h-full object-cover"
                              onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} 
                            />
                            <div className="hidden absolute inset-0 flex items-center justify-center bg-muted w-full h-full">
                              {getChannelIcon(conn.channelType)}
                            </div>
                          </>
                        ) : (
                          getChannelIcon(conn.channelType)
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-foreground flex items-center gap-2 text-xs truncate">
                          <span className="truncate">{conn.displayName || conn.phoneNumber || getChannelName(conn.channelType)}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 shrink-0 ${
                            isChannelInactive
                              ? 'bg-muted text-muted-foreground border border-border'
                              : isActive
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                              : 'bg-red-500/10 text-red-500 border border-red-500/20'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              isChannelInactive ? 'bg-muted-foreground' : isActive ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
                            }`} />
                            {isChannelInactive 
                              ? (language === 'en' ? 'Inactive âšª' : 'à¦¨à¦¿à¦·à§�à¦•à§�à¦°à¦¿à¦¯à¦¼ âšª')
                              : isActive 
                              ? (language === 'en' ? 'Active ðŸŸ¢' : 'à¦¸à¦•à§�à¦°à¦¿à¦¯à¦¼ ðŸŸ¢') 
                              : (language === 'en' ? 'Disconnected ðŸ”´' : 'à¦¡à¦¿à¦¸à¦•à¦¾à¦¨à§‡à¦•à§�à¦Ÿà§‡à¦¡ ðŸ”´')
                            }
                          </span>
                        </h3>
                        <p className="text-[11px] text-muted-foreground mt-0.5 truncate font-sans">
                          {getChannelName(conn.channelType)} {conn.provider ? `(${conn.provider})` : ''}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-border">
                      {isDisconnected && (
                        <Link
                          href="/dashboard/settings/inboxes/new"
                          className="px-2.5 py-1 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/20 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all shrink-0 cursor-pointer font-sans"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>{language === 'en' ? 'Reconnect / Scan QR' : 'à¦ªà§�à¦¨à¦°à¦¾à¦¯à¦¼ à¦•à¦¾à¦¨à§‡à¦•à§�à¦Ÿ à¦•à¦°à§�à¦¨'}</span>
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
                            <span>{language === 'en' ? 'Settings & Code' : 'à¦¸à§‡à¦Ÿà¦¿à¦‚à¦¸ à¦“ à¦•à§‹à¦¡'}</span>
                          </button>
                          <button
                            onClick={() => handleTestPing(conn.id)}
                            className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all shrink-0 cursor-pointer font-sans"
                            title="Test Connection Ping"
                          >
                            <Zap className="w-3.5 h-3.5" />
                            <span>{language === 'en' ? 'Test Ping' : 'à¦Ÿà§‡à¦¸à§�à¦Ÿ à¦®à§‡à¦¾à¦Ÿà¦¿à¦•'}</span>
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
                          <span>{language === 'en' ? 'Comment Auto-Reply' : 'à¦•à¦®à§‡à¦¨à§�à¦Ÿ à¦…à¦Ÿà§‹-à¦°à¦¿à¦ªà§�à¦²à¦¾à¦‡'}</span>
                        </button>
                      )}

                      <div className="flex items-center gap-2 mr-2">
                        <span className="text-[11px] text-muted-foreground font-semibold font-sans">
                          {language === 'en' ? 'Channel Status' : 'à¦šà§�à¦¯à¦¾à¦¨à§‡à¦² à¦¸à§�à¦Ÿà§�à¦¯à¦¾à¦Ÿà¦¾à¦¸'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleToggleChannelStatus(conn.id, !isChannelInactive)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                            !isChannelInactive ? 'bg-emerald-600' : 'bg-muted'
                          }`}
                          title={language === 'en' ? 'Toggle Channel Active/Inactive (Inactive channels are hidden from Inbox)' : 'à¦šà§�à¦¯à¦¾à¦¨à§‡à¦² à¦¸à¦•à§�à¦°à¦¿à¦¯à¦¼/à¦¨à¦¿à¦·à§�à¦•à§�à¦°à¦¿à¦¯à¦¼ à¦•à¦°à§�à¦¨'}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm ${
                              !isChannelInactive ? 'translate-x-4.5' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

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
                            title={language === 'en' ? 'Ignore WhatsApp Group Messages' : 'হোয়াটসঅ্যাপ গ্রুপ মেসেজ ইগনোর করুন'}
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
          allConnections={connections}
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

function WidgetConfigModal({ widget, allConnections = [], onClose, onRefresh, language, API }: any) {
  const widgetType: 'LIVE_CHAT' | 'WHATSAPP' = (widget.type === 'WHATSAPP' || widget.type === 'whatsapp') ? 'WHATSAPP' : 'LIVE_CHAT';
  
  // Common states
  const [primaryColor, setPrimaryColor] = useState(widget.primaryColor || '#1F824A');
  const [name, setName] = useState(widget.displayName || widget.name || (widgetType === 'WHATSAPP' ? 'WhatsApp Widget' : 'Website Live Chat'));
  const [saving, setSaving] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);

  // Live Chat specific states
  const [heading, setHeading] = useState(widget.heading || 'Chat with us');
  const [tagline, setTagline] = useState(widget.tagline || 'We are here to help you.');
  const [greetingEnabled, setGreetingEnabled] = useState(widget.greetingEnabled ?? true);
  const [isPreviewOpen, setIsPreviewOpen] = useState(true);

  // WhatsApp specific states & connected channel auto-detection
  const whatsappChannels = (allConnections || []).filter(
    (c: any) => c.channelType?.toLowerCase() === 'whatsapp'
  );

  const [selectedInboxId, setSelectedInboxId] = useState<string>(() => {
    if (widget.whatsappInboxId) {
      const match = whatsappChannels.find((c: any) => c.id === widget.whatsappInboxId);
      if (match) return match.id;
    }
    return whatsappChannels[0]?.id || '';
  });

  const activeInbox = whatsappChannels.find((c: any) => c.id === selectedInboxId) || whatsappChannels[0];
  const rawPhone = activeInbox?.phoneNumber || activeInbox?.displayName || activeInbox?.verifyToken || widget.whatsappNumber || '';
  const cleanPhone = rawPhone.replace(/[\s\-\+\(\)]/g, '').split('@')[0];
  const autoWhatsappNumber = cleanPhone ? (cleanPhone.startsWith('0') ? '88' + cleanPhone : cleanPhone) : '';

  const [prefilledText, setPrefilledText] = useState(widget.prefilledText || '');
  const [customIconUrl, setCustomIconUrl] = useState<string | null>(widget.customIconUrl || null);
  const [position, setPosition] = useState<'bottom-right' | 'bottom-left'>(widget.position || 'bottom-right');
  const [tooltipTextEn, setTooltipTextEn] = useState(widget.tooltipTextEn || 'Chat with us on WhatsApp');
  const [tooltipTextBn, setTooltipTextBn] = useState(widget.tooltipTextBn || 'হোয়াটসঅ্যাপে চ্যাট করুন');

  const presetColors = [
    '#1F824A', // Zini Green
    '#25D366', // Official WhatsApp Green
    '#128C7E', // Teal Green
    '#075E54', // Dark WhatsApp Green
    '#EE8D27', // Zini Orange
    '#2563EB', // Royal Blue
    '#0891B2', // Cyan
  ];

  const handleUploadIcon = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploadingIcon(true);
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/website-widget/upload-icon`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setCustomIconUrl(data.iconUrl);
        toast.success(language === 'en' ? 'Custom icon uploaded successfully!' : 'কাস্টম আইকন সফলভাবে আপলোড হয়েছে!');
      } else {
        toast.error(language === 'en' ? 'Failed to upload icon' : 'আইকন আপলোড করতে ব্যর্থ হয়েছে');
      }
    } catch (err) {
      toast.error('Error uploading icon');
    } finally {
      setUploadingIcon(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const token = Cookies.get('access_token');

      const bodyPayload = widgetType === 'WHATSAPP' ? {
        type: 'WHATSAPP',
        name,
        primaryColor,
        whatsappInboxId: selectedInboxId || widget.whatsappInboxId || null,
        whatsappNumber: autoWhatsappNumber,
        prefilledText,
        customIconUrl,
        position,
        tooltipTextEn,
        tooltipTextBn,
      } : {
        type: 'LIVE_CHAT',
        name,
        primaryColor,
        heading,
        tagline,
        greetingEnabled,
      };

      const res = await fetch(`${API}/website-widget/${widget.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(bodyPayload),
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

  const scriptCode = widgetType === 'WHATSAPP'
    ? `<script src="https://zinichat.com/wa-widget.js" data-token="${widget.widgetToken}" async></script>`
    : `<script src="https://zinichat.com/widget.js" data-widget-token="${widget.widgetToken}" async></script>`;

  const waUrl = autoWhatsappNumber ? `https://wa.me/${autoWhatsappNumber}${prefilledText ? `?text=${encodeURIComponent(prefilledText)}` : ''}` : 'https://wa.me/';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto" onClick={onClose}>
      <div className="bg-card rounded-2xl max-w-4xl w-full p-4 sm:p-6 space-y-6 shadow-2xl border border-border my-auto max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold shadow-sm transition-colors" style={{ backgroundColor: primaryColor }}>
              {widgetType === 'WHATSAPP' ? <MessageCircle className="w-5 h-5" /> : <Globe className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-foreground text-base flex items-center gap-2">
                <span>{name}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                  widgetType === 'WHATSAPP' 
                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                    : 'bg-primary/10 text-primary border border-primary/20'
                }`}>
                  {widgetType === 'WHATSAPP' ? 'WHATSAPP WIDGET' : 'LIVE CHAT WIDGET'}
                </span>
              </h3>
              <p className="text-xs text-muted-foreground">
                {widgetType === 'WHATSAPP' 
                  ? (language === 'en' ? 'Customize colors, WhatsApp redirection link, and embed code for your website' : 'আপনার ওয়েবসাইটের হোয়াটসঅ্যাপ উইজেট কালার, ফোন নম্বর ও ডাইরেক্ট রিডাইরেকশন স্ক্রিপ্ট কাস্টমাইজ করুন')
                  : (language === 'en' ? 'Customize colors, header title, tagline, and embed code for your website live chat' : 'আপনার ওয়েবসাইটের লাইভ চ্যাট উইজেটের নাম, কালার ও স্ক্রিপ্ট কোড কাস্টমাইজ করুন')
                }
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2-Column Split: Left Controls + Right Live Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Settings & Controls (7 cols) */}
          <div className="lg:col-span-7 space-y-4">

            {/* Design & Color Card */}
            <div className="bg-muted/30 border border-border p-4 rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                {language === 'en' ? 'Widget Design & Configuration' : 'উইজেট ডিজাইন ও কনফিগারেশন'}
              </h4>

              {/* Primary Color Selector */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground mb-1.5 block">
                  {language === 'en' ? 'Button Theme Color' : 'বাটন ব্র্যান্ড কালার'}
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

              {/* WHATSAPP Specific Controls */}
              {widgetType === 'WHATSAPP' && (
                <>
                  {/* Custom Uploaded Icon Option */}
                  <div className="border-t border-border pt-3 space-y-2">
                    <label className="text-[11px] font-semibold text-muted-foreground block">
                      {language === 'en' ? 'Widget Icon' : 'উইজেট আইকন'}
                    </label>
                    <div className="flex items-center gap-3 p-2.5 bg-background border border-border rounded-xl">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0 shadow-sm"
                        style={{ backgroundColor: primaryColor }}
                      >
                        {customIconUrl ? (
                          <img src={`${API}${customIconUrl}`} alt="Icon" className="w-6 h-6 object-contain rounded-full" />
                        ) : (
                          <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                          </svg>
                        )}
                      </div>

                      <div className="flex-1">
                        <p className="text-xs font-semibold text-foreground">
                          {customIconUrl ? 'Custom Icon Image' : 'Dynamic Vector WhatsApp Icon'}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {language === 'en' ? 'Use official WhatsApp logo or upload custom image' : 'ডিফল্ট আইকন অথবা আপনার লোগো আপলোড করুন'}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <label className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg text-xs font-bold cursor-pointer transition">
                          {uploadingIcon ? '...' : (language === 'en' ? 'Upload' : 'আপলোড')}
                          <input type="file" accept="image/*" onChange={handleUploadIcon} className="hidden" disabled={uploadingIcon} />
                        </label>
                        {customIconUrl && (
                          <button
                            type="button"
                            onClick={() => setCustomIconUrl(null)}
                            className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition cursor-pointer"
                            title="Reset to default vector icon"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Connected WhatsApp Phone Number Card */}
                  <div className="border-t border-border pt-3 space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[11px] font-semibold text-muted-foreground block">
                          {language === 'en' ? 'Connected WhatsApp Number' : 'কানেক্টেড হোয়াটসঅ্যাপ নম্বর'}
                        </label>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold flex items-center gap-1">
                          <span>🔒</span> {language === 'en' ? 'Auto-Synced (Read-Only)' : 'অটো কানেক্টেড (পরিবর্তন অযোগ্য)'}
                        </span>
                      </div>

                      {whatsappChannels.length === 0 ? (
                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-500 text-xs flex items-center gap-2">
                          <span className="text-base">⚠️</span>
                          <span>
                            {language === 'en' 
                              ? 'No WhatsApp channel connected yet. Please connect a WhatsApp channel from Inbox Settings first.' 
                              : 'কোনো হোয়াটসঅ্যাপ চ্যানেল কানেক্ট করা নেই। ইনবক্স সেটিংস থেকে প্রথমে হোয়াটসঅ্যাপ কানেক্ট করুন।'}
                          </span>
                        </div>
                      ) : whatsappChannels.length === 1 ? (
                        <div className="p-3 bg-background border border-emerald-500/30 rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                              <PhoneCall className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-foreground font-mono">
                                +{autoWhatsappNumber || 'No Number Detected'}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {activeInbox?.displayName || (language === 'en' ? 'Active WhatsApp Channel' : 'সক্রিয় হোয়াটসঅ্যাপ চ্যানেল')}
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            Connected 🟢
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <select
                            value={selectedInboxId}
                            onChange={e => setSelectedInboxId(e.target.value)}
                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary font-mono cursor-pointer"
                          >
                            {whatsappChannels.map((c: any) => {
                              const p = (c.phoneNumber || c.displayName || '').replace(/[\s\-\+\(\)]/g, '').split('@')[0];
                              const cleanP = p.startsWith('0') ? '88' + p : p;
                              return (
                                <option key={c.id} value={c.id}>
                                  {c.displayName || c.phoneNumber} (+{cleanP})
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      )}

                      <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1">
                        <span>Target Redirection Link:</span>
                        <span className="font-mono text-emerald-400 font-bold">{waUrl}</span>
                      </p>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                        {language === 'en' ? 'Prefilled Text Message (Optional)' : 'পূর্বনির্ধারিত মেসেজ (ঐচ্ছিক)'}
                      </label>
                      <textarea
                        value={prefilledText}
                        onChange={e => setPrefilledText(e.target.value)}
                        rows={2}
                        placeholder="e.g. Hello! I came from your website."
                        className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                          {language === 'en' ? 'Position' : 'পজিশন'}
                        </label>
                        <select
                          value={position}
                          onChange={e => setPosition(e.target.value as any)}
                          className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary cursor-pointer"
                        >
                          <option value="bottom-right">{language === 'en' ? 'Bottom Right' : 'নিচে ডানদিকে'}</option>
                          <option value="bottom-left">{language === 'en' ? 'Bottom Left' : 'নিচে বামদিকে'}</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                          {language === 'en' ? 'Tooltip Text (Bangla)' : 'টুলটিপ টেক্সট (বাংলা)'}
                        </label>
                        <input
                          type="text"
                          value={tooltipTextBn}
                          onChange={e => setTooltipTextBn(e.target.value)}
                          className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* LIVE CHAT Specific Controls */}
              {widgetType === 'LIVE_CHAT' && (
                <div className="border-t border-border pt-3 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                        {language === 'en' ? 'Widget Name' : 'উইজেটের নাম'}
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
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
                        className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                      {language === 'en' ? 'Tagline' : 'ট্যাগলাইন'}
                    </label>
                    <input
                      type="text"
                      value={tagline}
                      onChange={e => setTagline(e.target.value)}
                      className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-foreground pt-1">
                    <input
                      type="checkbox"
                      checked={greetingEnabled}
                      onChange={e => setGreetingEnabled(e.target.checked)}
                      className="rounded text-primary focus:ring-primary h-4 w-4"
                    />
                    <span>{language === 'en' ? 'Enable Greeting Message' : 'ওয়েলকাম মেসেজ সক্রিয় রাখুন'}</span>
                  </label>
                </div>
              )}

              {/* Save Settings Button */}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <button
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="ml-auto px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : (language === 'en' ? 'Save Settings' : 'সেটিংস সেভ করুন')}</span>
                </button>
              </div>
            </div>

            {/* Script Code Block */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>{language === 'en' ? 'Website Embed Code' : 'আপনার ওয়েবসাইটের জন্য ইন্টিগ্রেশন কোড'}</span>
                <span className="text-[10px] text-muted-foreground font-normal">
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
                  <span>{language === 'en' ? 'Test Connection' : 'টেস্ট কানেকশন'}</span>
                </button>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(scriptCode);
                    toast.success(language === 'en' ? 'Script code copied!' : 'à¦•à§‹à¦¡ à¦•à¦ªà¦¿ à¦¹à§Ÿà§‡à¦›à§‡!');
                  }}
                  className="px-4 py-1.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{language === 'en' ? 'Copy Script Code' : 'à¦•à§‹à¦¡ à¦•à¦ªà¦¿ à¦•à¦°à§�à¦¨'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Visual Preview (5 cols) */}
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
                  <MessageCircle className="w-6 h-6 text-emerald-400" />
                </div>
                <p className="text-xs font-bold text-slate-300">
                  WhatsApp Button Preview
                </p>
                <p className="text-[10px] text-slate-500 mt-1 max-w-[200px]">
                  Preview how the direct WhatsApp button renders on your site
                </p>
              </div>

              {/* WIDGET PREVIEW ACCORDING TO TYPE */}
              {widgetType === 'WHATSAPP' ? (
                <div className={`w-full flex items-center ${position === 'bottom-left' ? 'justify-start' : 'justify-end'} p-2`}>
                <div className="flex items-center gap-2">
                  <div className="bg-slate-800 text-white text-[10px] font-medium px-2.5 py-1.5 rounded-lg shadow-xl border border-slate-700 whitespace-nowrap animate-bounce">
                    {tooltipTextBn || 'à¦¹à§‹à¦¯à¦¼à¦¾à¦Ÿà¦¸à¦…à§�à¦¯à¦¾à¦ªà§‡ à¦šà§�à¦¯à¦¾à¦Ÿ à¦•à¦°à§�à¦¨'}
                  </div>

                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="group relative flex items-center justify-center w-12 h-12 rounded-full text-white shadow-2xl transition transform hover:scale-110"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <span className="absolute -inset-1 rounded-full opacity-35 animate-ping pointer-events-none" style={{ backgroundColor: primaryColor }} />
                    {customIconUrl ? (
                      <img src={`${API}${customIconUrl}`} alt="Icon" className="w-6 h-6 object-contain rounded-full relative z-10" />
                    ) : (
                      <svg className="w-6 h-6 fill-current relative z-10" viewBox="0 0 24 24">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                      </svg>
                    )}
                  </a>
                </div>
              </div>
            ) : (
              <>
                {isPreviewOpen && (
                  <div className="w-full bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden mb-2 animate-in slide-in-from-bottom-4 duration-300">
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

                      <div className="p-3 bg-slate-50 space-y-2 min-h-[100px] max-h-[120px] overflow-y-auto">
                        {greetingEnabled && (
                          <div className="flex items-start gap-1.5">
                            <div className="w-5 h-5 rounded-full text-[9px] font-bold text-white flex items-center justify-center shrink-0 mt-0.5 transition-colors" style={{ backgroundColor: primaryColor }}>
                              AI
                            </div>
                            <div className="bg-white border border-slate-200 p-2 rounded-2xl rounded-tl-xs text-[11px] text-slate-800 shadow-2xs max-w-[85%] leading-relaxed">
                              Hello! ðŸ‘‹ Welcome to our site. How can we help you today?
                            </div>
                          </div>
                        )}
                      </div>

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
                </>
              )}

            </div>
            
            <p className="text-[10px] text-slate-400 mt-2 font-medium text-center">
              ðŸ’¡ {language === 'en' ? 'Live preview updates instantly as you change settings' : 'à¦¡à¦¿à¦œà¦¾à¦‡à¦¨ à¦ªà¦°à¦¿à¦¬à¦°à§�à¦¤à¦¨ à¦•à¦°à¦²à§‡ à¦¸à¦¾à¦¥à§‡ à¦¸à¦¾à¦¥à§‡à¦‡ à¦°à¦¿à¦¯à¦¼à§‡à¦²-à¦Ÿà¦¾à¦‡à¦®à§‡ à¦¦à§‡à¦–à¦¾ à¦¯à¦¾à¦¬à§‡'}
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
