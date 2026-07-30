'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Cookies from 'js-cookie';
import { io, Socket } from 'socket.io-client';
import { useLanguage } from '@/components/LanguageProvider';
import { useFeature } from '@/hooks/useFeature';
import ConversationSidebar from '@/components/inbox/ConversationSidebar';
import { 
  Search, Send, User as UserIcon, Clock, MessageSquare, Phone, Info, Tag, Plus, 
  Check, MessageCircle, MoreVertical, X, UserCircle, UserPlus, Mail, Building, 
  MapPin, AlertCircle, Paperclip, File as FileIcon, Trash2, Bot, ToggleLeft, 
  ToggleRight, Wand2, RefreshCw, ChevronLeft, PanelRight, Eye, Star, Archive, 
  CheckCircle2, Flag, UserCheck, Sparkles 
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import LabelForm from '@/components/labels/LabelForm';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function InboxPage() {
  const { language } = useLanguage();

  // Feature Flags
  const hasSmartTabs = useFeature('inbox_smart_tabs');
  const hasCollaborators = useFeature('inbox_multi_agent_collaborators');
  const hasAiPicker = useFeature('inbox_multi_ai_assistant_picker');

  // State
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [availableLabels, setAvailableLabels] = useState<any[]>([]);
  const [activeChannels, setActiveChannels] = useState<any[]>([]);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [aiAssistants, setAiAssistants] = useState<any[]>([]);
  const [tenantBusinessName, setTenantBusinessName] = useState<string>('ZiniChat');

  useEffect(() => {
    try {
      const userCookie = Cookies.get('user');
      if (userCookie) {
        const u = JSON.parse(userCookie);
        if (u.businessName) setTenantBusinessName(u.businessName);
        else if (u.tenant?.businessName) setTenantBusinessName(u.tenant.businessName);
      }
    } catch (e) {}
  }, []);

  // Navigation & Filtering
  const [activeTab, setActiveTab] = useState<string>('all'); // all, order_requests, unreplied, tickets, resolved, archived
  const [channelFilter, setChannelFilter] = useState<string>('all'); // all, whatsapp, messenger, instagram
  const [tabCounts, setTabCounts] = useState<{ [key: string]: number }>({
    all: 0, order_requests: 0, unreplied: 0, tickets: 0, resolved: 0, archived: 0
  });

  // UI Menus
  const [showAssignMenu, setShowAssignMenu] = useState(false);
  const [showCollaboratorMenu, setShowCollaboratorMenu] = useState(false);
  const [showAiPickerMenu, setShowAiPickerMenu] = useState(false);
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [isCreatingLabel, setIsCreatingLabel] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch counts for tabs
  const fetchCounts = useCallback(async () => {
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/inbox/counts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const counts = await res.json();
        setTabCounts(counts);
      }
    } catch (err) {
      console.error('Failed to fetch inbox counts:', err);
    }
  }, []);

  // Fetch conversations with active view & channel filter
  const fetchConversations = useCallback(async () => {
    try {
      const token = Cookies.get('access_token');
      const view = hasSmartTabs ? activeTab : 'all';
      const res = await fetch(`${API}/inbox/conversations?view=${view}&channel=${channelFilter}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
        if (data.length > 0 && !selectedConvId) {
          setSelectedConvId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, channelFilter, hasSmartTabs, selectedConvId]);

  const fetchLabels = async () => {
    const token = Cookies.get('access_token');
    const res = await fetch(`${API}/labels`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setAvailableLabels(await res.json());
  };

  // Connect socket and load auxiliary metadata
  useEffect(() => {
    const token = Cookies.get('access_token');
    if (!token) return;

    const socket = io(`${API}/inbox`, { auth: { token } });
    socketRef.current = socket;

    socket.on('new_message', (data) => {
      setConversations(prev => {
        const convIndex = prev.findIndex(c => c.id === data.conversationId);
        if (convIndex > -1) {
          const updatedConv = { ...prev[convIndex], lastMessageAt: new Date().toISOString() };
          if (data.contact) updatedConv.contact = { ...updatedConv.contact, ...data.contact };
          const newConvs = [...prev];
          newConvs.splice(convIndex, 1);
          newConvs.unshift(updatedConv);
          return newConvs;
        } else if (data.conversation) {
          if (prev.some(c => c.id === data.conversation.id)) return prev;
          return [data.conversation, ...prev];
        }
        return prev;
      });

      setSelectedConvId(currentSelectedId => {
        if (currentSelectedId === data.conversationId) {
          setMessages(prev => {
            if (prev.some(m => m.id === data.message.id)) return prev;
            return [...prev, data.message];
          });
        }
        return currentSelectedId;
      });

      fetchCounts();
    });

    socket.on('conversation:starred', ({ conversationId, isStarred }) => {
      setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, isStarred } : c));
    });

    socket.on('conversation:archived', ({ conversationId, isArchived }) => {
      setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, isArchived } : c));
      fetchCounts();
    });

    socket.on('conversation:resolved', ({ conversationId, resolvedAt }) => {
      setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, status: resolvedAt ? 'resolved' : 'open', resolvedAt } : c));
      fetchCounts();
    });

    socket.on('conversation:followUpFlagged', ({ conversationId, requiresFollowUp }) => {
      setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, requiresFollowUp } : c));
      fetchCounts();
    });

    socket.on('conversation:collaboratorAdded', () => {
      fetchConversations();
    });

    // Fetch initial auxiliary metadata
    Promise.all([
      fetch(`${API}/labels`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API}/tenant/team`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API}/inbox/channels`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API}/ai-config`, { headers: { Authorization: `Bearer ${token}` } }),
    ]).then(async ([labelsRes, agentsRes, channelsRes, aiRes]) => {
      if (labelsRes.ok) setAvailableLabels(await labelsRes.json());
      if (agentsRes.ok) setAgents(await agentsRes.json());
      if (channelsRes.ok) setActiveChannels(await channelsRes.json());
      if (aiRes.ok) setAiAssistants(await aiRes.json());
    }).catch(console.error);

    fetchCounts();
    fetchConversations();

    return () => {
      socket.disconnect();
    };
  }, []);

  // Refetch conversations when tab or channel changes
  useEffect(() => {
    fetchConversations();
  }, [activeTab, channelFilter]);

  // Fetch messages for active conversation
  useEffect(() => {
    if (!selectedConvId) return;

    const token = Cookies.get('access_token');
    fetch(`${API}/inbox/conversations/${selectedConvId}/messages`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setMessages(data);
      })
      .catch(console.error);
  }, [selectedConvId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const activeConv = conversations.find(c => c.id === selectedConvId);

  // Actions
  const handleToggleStar = async () => {
    if (!selectedConvId) return;
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/inbox/conversations/${selectedConvId}/star`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const updated = await res.json();
        setConversations(prev => prev.map(c => c.id === selectedConvId ? { ...c, isStarred: updated.isStarred } : c));
        toast.success(updated.isStarred ? 'Starred' : 'Unstarred');
      }
    } catch (err) {
      toast.error('Failed to update star');
    }
  };

  const handleToggleArchive = async () => {
    if (!selectedConvId || !activeConv) return;
    const isArchived = activeConv.isArchived;
    const endpoint = isArchived ? 'unarchive' : 'archive';
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/inbox/conversations/${selectedConvId}/${endpoint}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setConversations(prev => prev.map(c => c.id === selectedConvId ? { ...c, isArchived: !isArchived } : c));
        fetchCounts();
        toast.success(isArchived ? 'Unarchived' : 'Archived');
      }
    } catch (err) {
      toast.error('Failed to update archive status');
    }
  };

  const handleToggleResolve = async () => {
    if (!selectedConvId || !activeConv) return;
    const isResolved = activeConv.status === 'resolved';
    const endpoint = isResolved ? 'reopen' : 'resolve';
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/inbox/conversations/${selectedConvId}/${endpoint}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const updated = await res.json();
        setConversations(prev => prev.map(c => c.id === selectedConvId ? { ...c, status: updated.status, resolvedAt: updated.resolvedAt } : c));
        fetchCounts();
        toast.success(isResolved ? 'Reopened' : 'Resolved');
      }
    } catch (err) {
      toast.error('Failed to update resolve status');
    }
  };

  const handleToggleFollowUp = async () => {
    if (!selectedConvId || !activeConv) return;
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/inbox/conversations/${selectedConvId}/follow-up`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const updated = await res.json();
        setConversations(prev => prev.map(c => c.id === selectedConvId ? { ...c, requiresFollowUp: updated.requiresFollowUp } : c));
        fetchCounts();
        toast.success(updated.requiresFollowUp ? 'Flagged for follow-up' : 'Unflagged follow-up');
      }
    } catch (err) {
      toast.error('Failed to update follow-up status');
    }
  };

  const handleAssignAgent = async (agentId: string | null) => {
    if (!selectedConvId) return;
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/inbox/conversations/${selectedConvId}/assign`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ agentId })
      });
      if (res.ok) {
        const updated = await res.json();
        setConversations(prev => prev.map(c => c.id === selectedConvId ? { ...c, assignedAgentId: agentId, assignedAgent: updated.assignedAgent } : c));
        toast.success('Agent assigned');
      }
    } catch (err) {
      toast.error('Failed to assign agent');
    }
    setShowAssignMenu(false);
  };

  const handleAddCollaborator = async (userId: string) => {
    if (!selectedConvId) return;
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/inbox/conversations/${selectedConvId}/collaborators`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      });
      if (res.ok) {
        fetchConversations();
        toast.success('Collaborator added');
      }
    } catch (err) {
      toast.error('Failed to add collaborator');
    }
    setShowCollaboratorMenu(false);
  };

  const handleSetAssistant = async (aiAssistantId: string | null) => {
    if (!selectedConvId) return;
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/inbox/conversations/${selectedConvId}/assistant`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ aiAssistantId })
      });
      if (res.ok) {
        setConversations(prev => prev.map(c => c.id === selectedConvId ? { ...c, aiAssistantId } : c));
        toast.success('AI Assistant updated');
      }
    } catch (err) {
      toast.error('Failed to set AI Assistant');
    }
    setShowAiPickerMenu(false);
  };

  const handleToggleAiReply = async (isAiEnabled: boolean) => {
    if (!selectedConvId) return;
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/inbox/conversations/${selectedConvId}/toggle-ai`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isAiEnabled })
      });
      if (res.ok) {
        setConversations(prev => prev.map(c => c.id === selectedConvId ? { ...c, isAiEnabled } : c));
        toast.success(`AI Auto-Reply ${isAiEnabled ? 'ON' : 'OFF'}`);
      }
    } catch (err) {
      toast.error('Failed to toggle AI');
    }
  };

  const handleToggleLabel = async (labelId: string) => {
    if (!selectedConvId) return;
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/inbox/conversations/${selectedConvId}/labels`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ labelId })
      });
      if (res.ok) {
        const { added } = await res.json();
        setConversations(prev => prev.map(conv => {
          if (conv.id === selectedConvId) {
            let newLabels = [...(conv.labels || [])];
            if (added) {
              const lbl = availableLabels.find(l => l.id === labelId);
              if (lbl) newLabels.push({ label: lbl, labelId });
            } else {
              newLabels = newLabels.filter(l => l.labelId !== labelId);
            }
            return { ...conv, labels: newLabels };
          }
          return conv;
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateLabel = async (data: { name: string; color: string; aiPrompt?: string }) => {
    const token = Cookies.get('access_token');
    const res = await fetch(`${API}/labels`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    if (res.ok) {
      const created = await res.json();
      fetchLabels();
      return created;
    }
    return null;
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && !selectedFile) || !selectedConvId) return;

    const token = Cookies.get('access_token');
    const content = inputText;
    setInputText('');
    const fileToSend = selectedFile;
    setSelectedFile(null);

    try {
      let res;
      if (fileToSend) {
        const formData = new FormData();
        formData.append('conversationId', selectedConvId);
        if (content) formData.append('content', content);
        formData.append('file', fileToSend);
        
        res = await fetch(`${API}/inbox/messages/media`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
      } else {
        res = await fetch(`${API}/inbox/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ conversationId: selectedConvId, content })
        });
      }

      if (!res.ok) throw new Error('Failed to send message');
    } catch (err) {
      toast.error('Failed to send message');
    }
  };

  const handleDeleteConversation = async () => {
    if (!selectedConvId || !activeConv) return;
    if (!window.confirm(language === 'en' ? 'Are you sure you want to delete this conversation?' : 'কনভারসেশনটি মুছে ফেলতে চান?')) return;

    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/inbox/conversations/${selectedConvId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setConversations(prev => prev.filter(c => c.id !== selectedConvId));
        setSelectedConvId(null);
        fetchCounts();
        toast.success('Conversation deleted');
      }
    } catch (err) {
      toast.error('Failed to delete conversation');
    }
  };

  const handleUpdateContactInList = (contactId: string, updatedContactData: any) => {
    setConversations(prev => prev.map(c => {
      if (c.contactId === contactId) {
        return { ...c, contact: { ...c.contact, ...updatedContactData } };
      }
      return c;
    }));
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background text-foreground">
      
      {/* LEFT COLUMN: Conversation List */}
      <div className="w-full md:w-80 lg:w-96 border-r border-border flex flex-col bg-surface/70 backdrop-blur-xl shrink-0">
        
        {/* Smart Tabs Bar */}
        {hasSmartTabs && (
          <div className="flex items-center gap-1 p-2 border-b border-border overflow-x-auto custom-scrollbar text-[11px] font-medium shrink-0 bg-muted/30">
            {[
              { id: 'all', label: language === 'en' ? 'All' : 'সব', count: tabCounts.all },
              { id: 'order_requests', label: language === 'en' ? 'Orders' : 'অর্ডার', count: tabCounts.order_requests },
              { id: 'unreplied', label: language === 'en' ? 'Unreplied' : 'আনরিপ্লাইড', count: tabCounts.unreplied },
              { id: 'tickets', label: language === 'en' ? 'Tickets' : 'টিকিট', count: tabCounts.tickets },
              { id: 'resolved', label: language === 'en' ? 'Resolved' : 'সমাধানকৃত', count: tabCounts.resolved },
              { id: 'archived', label: language === 'en' ? 'Archived' : 'আর্কাইভ', count: tabCounts.archived },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-2.5 py-1 rounded-lg transition-all shrink-0 flex items-center gap-1 cursor-pointer ${
                  activeTab === tab.id 
                    ? 'bg-primary text-primary-foreground font-bold shadow-xs' 
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    activeTab === tab.id ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Channel Filter Row */}
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border bg-background/50 shrink-0 text-xs">
          <button
            onClick={() => setChannelFilter('all')}
            className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors cursor-pointer ${
              channelFilter === 'all' ? 'bg-secondary text-secondary-foreground font-bold' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            {language === 'en' ? 'All Channels' : 'সব চ্যানেল'}
          </button>
          {activeChannels.map(ch => (
            <button
              key={ch.id}
              onClick={() => setChannelFilter(ch.channelType)}
              className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize transition-colors cursor-pointer ${
                channelFilter === ch.channelType ? 'bg-secondary text-secondary-foreground font-bold' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {ch.channelType}
            </button>
          ))}
        </div>

        {/* Conversation Items List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-border/40">
          {loading ? (
            <div className="p-4 text-center text-xs text-muted-foreground animate-pulse">
              {language === 'en' ? 'Loading inbox...' : 'ইনবক্স লোড হচ্ছে...'}
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground space-y-1">
              <MessageCircle className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="font-semibold">{language === 'en' ? 'No conversations found' : 'কোন কনভারসেশন নেই'}</p>
              <p className="text-[11px] text-muted-foreground">{language === 'en' ? 'Messages will appear here when customers message you.' : 'কাস্টমার মেসেজ দিলে তা এখানে আসবে।'}</p>
            </div>
          ) : (
            conversations.map(conv => {
              const isSelected = conv.id === selectedConvId;
              const lastMsg = conv.messages?.[0];
              const lastText = lastMsg ? (typeof lastMsg.content === 'object' ? (lastMsg.content.body || lastMsg.content.text || JSON.stringify(lastMsg.content)) : String(lastMsg.content)) : '';

              return (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConvId(conv.id)}
                  className={`p-3 cursor-pointer transition-all hover:bg-muted/50 ${
                    isSelected ? 'bg-primary/10 border-l-4 border-primary' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="relative shrink-0">
                        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs border border-primary/20">
                          {conv.contact?.name ? conv.contact.name[0].toUpperCase() : 'C'}
                        </div>
                        <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background text-[9px] font-bold text-white flex items-center justify-center uppercase ${
                          conv.channel === 'whatsapp' ? 'bg-emerald-600' : conv.channel === 'messenger' ? 'bg-blue-600' : 'bg-pink-600'
                        }`}>
                          {conv.channel[0]}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <h4 className="text-xs font-bold text-foreground truncate">
                            {conv.contact?.name || conv.contact?.phone || 'Customer'}
                          </h4>
                          {conv.isStarred && <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />}
                          {conv.requiresFollowUp && <Flag className="w-3 h-3 text-red-500 shrink-0" />}
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                          {lastText || (language === 'en' ? 'No messages' : 'কোন মেসেজ নেই')}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 space-y-1">
                      <span className="text-[10px] text-muted-foreground">
                        {conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                      {conv.unreadCount > 0 && (
                        <div>
                          <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full shadow-xs">
                            {conv.unreadCount}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Badges & Collaborators footer */}
                  <div className="mt-2 flex items-center justify-between text-[10px] pt-1">
                    <div className="flex flex-wrap items-center gap-1">
                      {conv.labels?.map((l: any) => (
                        <span key={l.labelId} style={{ backgroundColor: `${l.label.color}20`, color: l.label.color, borderColor: l.label.color }} className="px-1.5 py-0.2 rounded border text-[9px] font-medium">
                          {l.label.name}
                        </span>
                      ))}
                      {conv.assignedAgentId === null && (
                        <span className="text-amber-600 bg-amber-50 px-1 rounded text-[9px]">Unassigned</span>
                      )}
                    </div>

                    {/* Collaborator Avatar Chips */}
                    {hasCollaborators && conv.collaborators && conv.collaborators.length > 0 && (
                      <div className="flex -space-x-1 overflow-hidden">
                        {conv.collaborators.map((col: any) => (
                          <div key={col.userId} title={col.user?.name} className="inline-block h-4 w-4 rounded-full ring-1 ring-background bg-secondary/20 text-secondary text-[8px] font-bold text-center leading-4">
                            {col.user?.name?.[0] || 'A'}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* MIDDLE COLUMN: Active Chat Panel */}
      {selectedConvId && activeConv ? (
        <div className="flex-1 flex flex-col min-w-0 bg-background">
          
          {/* Header */}
          <div className="h-14 px-4 border-b border-border bg-surface/80 backdrop-blur-xl flex items-center justify-between shrink-0 shadow-2xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs border border-primary/20 shrink-0">
                {activeConv.contact?.name ? activeConv.contact.name[0].toUpperCase() : 'C'}
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-foreground truncate flex items-center gap-2">
                  {activeConv.contact?.name || activeConv.contact?.phone || 'Customer'}
                  <span className="text-[10px] text-muted-foreground font-normal capitalize">({activeConv.channel})</span>
                </h3>
                <p className="text-[10px] text-muted-foreground flex items-center gap-2">
                  <span>{activeConv.contact?.phone || activeConv.contact?.externalContactId}</span>
                  {activeConv.assignedAgent && (
                    <span className="text-primary font-medium">· Assigned to: {activeConv.assignedAgent.name}</span>
                  )}
                </p>
              </div>
            </div>

            {/* Header Control Buttons */}
            <div className="flex items-center gap-1 text-muted-foreground">
              {/* Star */}
              <button
                onClick={handleToggleStar}
                className={`p-1.5 rounded-lg hover:bg-muted transition-colors ${activeConv.isStarred ? 'text-amber-500' : ''}`}
                title={activeConv.isStarred ? 'Unstar' : 'Star'}
              >
                <Star className={`w-4 h-4 ${activeConv.isStarred ? 'fill-amber-500' : ''}`} />
              </button>

              {/* Follow-up flag */}
              <button
                onClick={handleToggleFollowUp}
                className={`p-1.5 rounded-lg hover:bg-muted transition-colors ${activeConv.requiresFollowUp ? 'text-red-500' : ''}`}
                title="Flag for follow-up"
              >
                <Flag className={`w-4 h-4 ${activeConv.requiresFollowUp ? 'fill-red-500' : ''}`} />
              </button>

              {/* Resolve */}
              <button
                onClick={handleToggleResolve}
                className={`p-1.5 rounded-lg hover:bg-muted transition-colors ${activeConv.status === 'resolved' ? 'text-emerald-600' : ''}`}
                title={activeConv.status === 'resolved' ? 'Reopen' : 'Resolve'}
              >
                <CheckCircle2 className="w-4 h-4" />
              </button>

              {/* Archive */}
              <button
                onClick={handleToggleArchive}
                className={`p-1.5 rounded-lg hover:bg-muted transition-colors ${activeConv.isArchived ? 'text-blue-600' : ''}`}
                title={activeConv.isArchived ? 'Unarchive' : 'Archive'}
              >
                <Archive className="w-4 h-4" />
              </button>

              {/* Assign Agent */}
              <div className="relative">
                <button
                  onClick={() => setShowAssignMenu(!showAssignMenu)}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                  title="Assign Agent"
                >
                  <UserPlus className="w-4 h-4" />
                </button>
                {showAssignMenu && (
                  <div className="absolute right-0 mt-1 w-44 bg-card border border-border rounded-xl shadow-lg p-1 z-50 animate-in fade-in zoom-in-95 duration-100 text-xs">
                    <button onClick={() => handleAssignAgent(null)} className="w-full text-left px-2.5 py-1.5 hover:bg-muted rounded-lg text-amber-600 font-medium">
                      Unassign
                    </button>
                    {agents.map(a => (
                      <button key={a.id} onClick={() => handleAssignAgent(a.id)} className="w-full text-left px-2.5 py-1.5 hover:bg-muted rounded-lg text-foreground">
                        {a.name} ({a.role})
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Collaborator */}
              {hasCollaborators && (
                <div className="relative">
                  <button
                    onClick={() => setShowCollaboratorMenu(!showCollaboratorMenu)}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                    title="Add Collaborator"
                  >
                    <UserCheck className="w-4 h-4" />
                  </button>
                  {showCollaboratorMenu && (
                    <div className="absolute right-0 mt-1 w-44 bg-card border border-border rounded-xl shadow-lg p-1 z-50 animate-in fade-in zoom-in-95 duration-100 text-xs">
                      <p className="px-2.5 py-1 text-[10px] text-muted-foreground font-bold uppercase">Add Collaborator</p>
                      {agents.map(a => (
                        <button key={a.id} onClick={() => handleAddCollaborator(a.id)} className="w-full text-left px-2.5 py-1.5 hover:bg-muted rounded-lg text-foreground">
                          {a.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Toggle Right Sidebar */}
              <button
                onClick={() => setShowRightSidebar(!showRightSidebar)}
                className={`p-1.5 rounded-lg hover:bg-muted transition-colors ${showRightSidebar ? 'text-primary' : ''}`}
                title="Toggle Sidebar"
              >
                <PanelRight className="w-4 h-4" />
              </button>

              {/* Delete */}
              <button
                onClick={handleDeleteConversation}
                className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                title="Delete Conversation"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-slate-50/50">
            {messages.map((m, idx) => {
              const isInbound = m.direction === 'inbound';
              const isAi = m.senderType === 'ai';
              const contentText = typeof m.content === 'object' ? (m.content.body || m.content.text || JSON.stringify(m.content)) : String(m.content);
              const mediaUrl = typeof m.content === 'object' ? m.content.mediaUrl : null;

              return (
                <div key={m.id || idx} className={`flex flex-col ${isInbound ? 'items-start' : 'items-end'}`}>
                  {/* Sender Badge */}
                  {isAi && (
                    <span className="text-[10px] font-bold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full mb-1 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Replied by {tenantBusinessName} AI ✨
                    </span>
                  )}
                  {!isInbound && !isAi && m.senderUser && (
                    <span className="text-[9px] text-muted-foreground mb-0.5">
                      {m.senderUser.name}
                    </span>
                  )}

                  <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-xs shadow-2xs ${
                    isInbound 
                      ? 'bg-card text-foreground border border-border rounded-tl-xs' 
                      : isAi 
                        ? 'bg-purple-600 text-white rounded-tr-xs' 
                        : 'bg-primary text-primary-foreground rounded-tr-xs'
                  }`}>
                    {mediaUrl && (
                      <div className="mb-2">
                        {m.type === 'image' ? (
                          <img 
                            src={`${API}${mediaUrl}`} 
                            alt="attachment" 
                            onClick={() => setZoomedImage(`${API}${mediaUrl}`)}
                            className="max-h-48 rounded-lg cursor-pointer hover:opacity-90 object-cover" 
                          />
                        ) : (
                          <a href={`${API}${mediaUrl}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 underline text-[11px]">
                            <FileIcon className="w-4 h-4" /> Download File
                          </a>
                        )}
                      </div>
                    )}
                    <p className="whitespace-pre-wrap leading-relaxed">{contentText}</p>
                    <span className={`block text-[9px] mt-1 text-right ${isInbound ? 'text-muted-foreground' : 'text-white/70'}`}>
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Compose Bar */}
          <div className="p-3 border-t border-border bg-surface/80 backdrop-blur-xl shrink-0 space-y-2">
            
            {/* Compose Controls Row */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                {/* AI Toggle */}
                <button
                  type="button"
                  onClick={() => handleToggleAiReply(!activeConv.isAiEnabled)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                    activeConv.isAiEnabled 
                      ? 'bg-purple-100 text-purple-700 border border-purple-300' 
                      : 'bg-muted text-muted-foreground border border-border'
                  }`}
                >
                  <Bot className="w-3.5 h-3.5" />
                  {activeConv.isAiEnabled ? 'AI Auto-Reply ON' : 'AI Auto-Reply OFF'}
                </button>

                {/* Multiple AI Assistant Picker Dropdown */}
                {hasAiPicker && aiAssistants.length > 1 && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowAiPickerMenu(!showAiPickerMenu)}
                      className="px-2 py-1 bg-muted border border-border rounded-lg text-[10px] font-medium flex items-center gap-1 text-muted-foreground hover:text-foreground"
                    >
                      <span>AI Model: {activeConv.aiAssistant?.agentName || 'Default'}</span>
                      <ChevronLeft className="-rotate-90 w-3 h-3" />
                    </button>
                    {showAiPickerMenu && (
                      <div className="absolute bottom-full mb-1 left-0 w-48 bg-card border border-border rounded-xl shadow-lg p-1 z-50 text-xs">
                        <button onClick={() => handleSetAssistant(null)} className="w-full text-left px-2.5 py-1.5 hover:bg-muted rounded-lg text-foreground font-medium">
                          Default System Model
                        </button>
                        {aiAssistants.map(ast => (
                          <button key={ast.id} onClick={() => handleSetAssistant(ast.id)} className="w-full text-left px-2.5 py-1.5 hover:bg-muted rounded-lg text-foreground">
                            {ast.name || ast.modelName} ({ast.provider})
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {selectedFile && (
                <div className="flex items-center gap-1 text-[11px] bg-muted px-2 py-0.5 rounded text-foreground">
                  <Paperclip className="w-3 h-3" />
                  <span className="truncate max-w-[120px]">{selectedFile.name}</span>
                  <button onClick={() => setSelectedFile(null)} className="text-red-500"><X className="w-3 h-3" /></button>
                </div>
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={e => e.target.files?.[0] && setSelectedFile(e.target.files[0])} 
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-muted-foreground hover:text-primary hover:bg-muted rounded-lg transition-colors cursor-pointer"
                title="Attach file"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              <input
                type="text"
                placeholder={language === 'en' ? 'Type a message...' : 'মেসেজ লিখুন...'}
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                className="flex-1 bg-background border border-border rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-primary text-foreground"
              />

              <button
                type="submit"
                disabled={!inputText.trim() && !selectedFile}
                className="p-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center p-8 text-center text-muted-foreground bg-slate-50/50">
          <div>
            <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground/30 mb-2" />
            <h3 className="text-sm font-bold text-foreground">
              {language === 'en' ? 'Select a conversation' : 'একটি কনভারসেশন সিলেক্ট করুন'}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {language === 'en' ? 'Choose a chat from the left panel to start messaging.' : 'মেসেজিং শুরু করতে বাঁপাশের প্যানেল থেকে চ্যাট বাছুন।'}
            </p>
          </div>
        </div>
      )}

      {/* RIGHT COLUMN: CRM Sidebar Component */}
      {selectedConvId && activeConv && showRightSidebar && (
        <ConversationSidebar
          conversation={activeConv}
          availableLabels={availableLabels}
          onToggleLabel={handleToggleLabel}
          onCreateLabel={handleCreateLabel}
          onUpdateContact={handleUpdateContactInList}
        />
      )}

      {/* Image Zoom Modal */}
      {zoomedImage && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4" onClick={() => setZoomedImage(null)}>
          <div className="relative max-w-4xl max-h-[90vh]">
            <img src={zoomedImage} alt="Zoomed" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" />
            <button onClick={() => setZoomedImage(null)} className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full hover:bg-black">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
