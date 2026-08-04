'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Cookies from 'js-cookie';
import { io, Socket } from 'socket.io-client';
import { useLanguage } from '@/components/LanguageProvider';
import { useFeature } from '@/hooks/useFeature';
import ConversationSidebar from '@/components/inbox/ConversationSidebar';
import { 
  Search, Send, User as UserIcon, Clock, MessageSquare, Phone, Info, Tag, Plus, 
  Check, CheckCheck, MessageCircle, MoreVertical, X, UserCircle, UserPlus, Mail, Building, 
  MapPin, AlertCircle, Paperclip, File as FileIcon, Trash2, Bot, ToggleLeft, 
  ToggleRight, Wand2, RefreshCw, ChevronLeft, PanelRight, Eye, Star, Archive, 
  CheckCircle2, Flag, UserCheck, Sparkles, Calendar, Download, Reply, Share2, Ban, Filter
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
  const hasCommentAutomation = useFeature('facebook_comment_automation');

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
  const [followUpPickerConvId, setFollowUpPickerConvId] = useState<string | null>(null);
  // Mobile WhatsApp-style panel navigation: 'list' | 'chat' | 'crm'
  const [mobilePanelView, setMobilePanelView] = useState<'list' | 'chat' | 'crm'>('list');

  // Quote, Forward, Block & Search States
  const [replyingToMessage, setReplyingToMessage] = useState<any | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<any | null>(null);
  const [forwardSearchQuery, setForwardSearchQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterParam, setFilterParam] = useState('all'); // all, starred, unassigned, blocked, order_requests

  // FB Comments State
  const [commentLogs, setCommentLogs] = useState<any[]>([]);
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);
  const [humanReplyText, setHumanReplyText] = useState('');
  const [sendingHumanReply, setSendingHumanReply] = useState(false);
  const [commentLogsLoading, setCommentLogsLoading] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const assignMenuRef = useRef<HTMLDivElement>(null);
  const collaboratorMenuRef = useRef<HTMLDivElement>(null);
  const aiPickerMenuRef = useRef<HTMLDivElement>(null);

  // Close all header dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showAssignMenu && assignMenuRef.current && !assignMenuRef.current.contains(e.target as Node)) {
        setShowAssignMenu(false);
      }
      if (showCollaboratorMenu && collaboratorMenuRef.current && !collaboratorMenuRef.current.contains(e.target as Node)) {
        setShowCollaboratorMenu(false);
      }
      if (showAiPickerMenu && aiPickerMenuRef.current && !aiPickerMenuRef.current.contains(e.target as Node)) {
        setShowAiPickerMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAssignMenu, showCollaboratorMenu, showAiPickerMenu]);

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

  const fetchCommentLogs = useCallback(async () => {
    setCommentLogsLoading(true);
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/channels/messenger/comments/all?page=1&limit=50`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCommentLogs(data.items || []);
        if (data.items?.length > 0 && !selectedCommentId) {
          setSelectedCommentId(data.items[0].commentId);
        }
      }
    } catch (err) {
      console.error('Failed to fetch comment logs:', err);
    } finally {
      setCommentLogsLoading(false);
    }
  }, [selectedCommentId]);

  useEffect(() => {
    if (channelFilter === 'facebook_comments') {
      fetchCommentLogs();
    }
  }, [channelFilter, fetchCommentLogs]);

  const handleSendHumanCommentReply = async (commentId: string) => {
    if (!humanReplyText.trim()) return;
    setSendingHumanReply(true);
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/channels/messenger/comments/${commentId}/human-reply`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ replyText: humanReplyText }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(language === 'en' ? 'Reply posted to Facebook!' : 'ফেসবুকে কমেন্ট রিপ্লাই পোস্ট হয়েছে!');
        setHumanReplyText('');
        setCommentLogs(prev => prev.map(c => c.commentId === commentId ? { ...c, replyText: data.replyText, replyStatus: 'replied', skipReason: 'human_reply' } : c));
      } else {
        const errData = await res.json();
        toast.error(`Failed to post reply: ${errData.message || 'Error'}`);
      }
    } catch (err) {
      toast.error('Network error posting comment reply');
    } finally {
      setSendingHumanReply(false);
    }
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

    socket.on('message:status', ({ messageId, status }) => {
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, status } : m));
    });

    socket.on('conversation:read', (data) => {
      setConversations(prev => prev.map(c => 
        c.id === data.conversationId ? { ...c, unreadCount: 0 } : c
      ));
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
      if (agentsRes.ok) {
        const teamData = await agentsRes.json();
        setAgents(Array.isArray(teamData) ? teamData : (teamData.users || []));
      }
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

  const handleToggleBlock = async () => {
    if (!selectedConvId || !activeConv) return;
    const isBlocked = activeConv.isBlocked || activeConv.contact?.isBlocked;
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/inbox/conversations/${selectedConvId}/block`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const updated = await res.json();
        setConversations(prev => prev.map(c => c.id === selectedConvId ? { 
          ...c, 
          isBlocked: updated.isBlocked, 
          contact: c.contact ? { ...c.contact, isBlocked: updated.isBlocked } : c.contact 
        } : c));
        toast.success(updated.isBlocked ? 'Conversation blocked' : 'Conversation unblocked');
      }
    } catch (err) {
      toast.error('Failed to update block status');
    }
  };

  const handleForwardSubmit = async (targetConvId: string) => {
    if (!forwardingMessage || !targetConvId) return;
    try {
      const token = Cookies.get('access_token');
      
      let forwardContent = forwardingMessage.content;
      if (typeof forwardContent === 'object' && forwardContent !== null) {
        forwardContent = forwardContent.body || forwardContent.text || forwardContent.caption || JSON.stringify(forwardContent);
      }

      const res = await fetch(`${API}/inbox/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          conversationId: targetConvId,
          content: forwardContent
        })
      });

      if (res.ok) {
        toast.success(language === 'en' ? 'Message forwarded' : 'মেসেজ ফরোয়ার্ড করা হয়েছে');
        setForwardingMessage(null);
        setForwardSearchQuery('');
      } else {
        toast.error('Failed to forward message');
      }
    } catch (err) {
      toast.error('Error forwarding message');
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

  const renderMessageStatus = (m: any) => {
    if (m.direction !== 'outbound') return null;

    const status = m.status || 'sent';

    if (status === 'read' || status === 'seen') {
      return (
        <span title="Read / Seen" className="inline-flex items-center ml-1">
          <CheckCheck className="w-3.5 h-3.5 text-sky-300 shrink-0 drop-shadow-xs" />
        </span>
      );
    }

    if (status === 'delivered') {
      return (
        <span title="Delivered" className="inline-flex items-center ml-1">
          <CheckCheck className="w-3.5 h-3.5 text-white/90 shrink-0" />
        </span>
      );
    }

    if (status === 'sent') {
      return (
        <span title="Sent" className="inline-flex items-center ml-1">
          <Check className="w-3.5 h-3.5 text-white/90 shrink-0" />
        </span>
      );
    }

    if (status === 'pending') {
      return (
        <span title="Sending..." className="inline-flex items-center ml-1">
          <Clock className="w-3 h-3 text-white/70 shrink-0 animate-pulse" />
        </span>
      );
    }

    if (status === 'failed' || status === 'rate_limited') {
      return (
        <span title={status === 'rate_limited' ? 'Rate limited (max 10 msgs/min)' : 'Failed to send'} className="inline-flex items-center ml-1">
          <AlertCircle className="w-3.5 h-3.5 text-rose-300 shrink-0" />
        </span>
      );
    }

    return (
      <span title="Sent" className="inline-flex items-center ml-1">
        <Check className="w-3.5 h-3.5 text-white/90 shrink-0" />
      </span>
    );
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && !selectedFile) || !selectedConvId) return;

    const token = Cookies.get('access_token');
    let content = inputText;
    const currentReply = replyingToMessage;

    setInputText('');
    setReplyingToMessage(null);

    const fileToSend = selectedFile;
    setSelectedFile(null);

    // If replying to a message, embed quoted message structure in JSON payload
    if (currentReply && !fileToSend) {
      let quotedText = currentReply.content;
      if (typeof quotedText === 'object' && quotedText !== null) {
        quotedText = quotedText.body || quotedText.text || quotedText.caption || (currentReply.type === 'image' ? '📷 Photo' : 'Document');
      } else if (typeof quotedText === 'string' && quotedText.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(quotedText);
          quotedText = parsed.text || parsed.body || parsed.caption || (currentReply.type === 'image' ? '📷 Photo' : 'Attachment');
        } catch (e) {}
      }
      const senderName = currentReply.senderUser?.name || (currentReply.direction === 'inbound' ? (activeConv?.contact?.name || 'Customer') : 'Agent');
      
      content = JSON.stringify({
        text: inputText,
        quotedMessage: {
          id: currentReply.id,
          senderName,
          text: String(quotedText || '').slice(0, 100),
          type: currentReply.type
        }
      });
    }

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

  const handleQuickFollowUpUpdate = async (conv: any, dateValue: string) => {
    if (!conv?.contact?.id) return;
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/contacts/${conv.contact.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ followUpAt: dateValue ? new Date(dateValue).toISOString() : null }),
      });
      if (res.ok) {
        const updated = await res.json();
        handleUpdateContactInList(conv.contact.id, updated);
        setFollowUpPickerConvId(null);
        toast.success(language === 'en' ? 'Follow-up date saved!' : 'ফলো-আপ তারিখ সেভ হয়েছে!');
      }
    } catch (err) {
      toast.error('Failed to update follow-up date');
    }
  };

  const handleForceDownload = async (url: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Fallback if we cannot fetch
    const fallbackToNewTab = () => window.open(url, '_blank');
    
    try {
      const toastId = toast.loading(language === 'en' ? 'Downloading...' : 'ডাউনলোড হচ্ছে...', { id: 'download-toast' });
      const response = await fetch(url);
      
      if (!response.ok) {
        toast.dismiss(toastId);
        fallbackToNewTab();
        return;
      }
      
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      
      let filename = 'downloaded_image.jpg';
      try {
        const parts = url.split('/');
        const lastPart = parts[parts.length - 1];
        if (lastPart) {
          filename = lastPart.split('?')[0] || 'image.jpg';
        }
      } catch (e) {}
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      
      toast.success(language === 'en' ? 'Downloaded successfully!' : 'ডাউনলোড সম্পন্ন হয়েছে!', { id: toastId });
    } catch (err) {
      toast.dismiss('download-toast');
      console.error('Download failed, falling back to new tab', err);
      fallbackToNewTab();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-background text-foreground">
      
      {/* FULL-WIDTH TOP HEADER */}
      <div className="w-full flex items-center justify-between border-b border-border bg-surface/80 backdrop-blur-md shrink-0 px-2 sm:px-4 py-2 z-10 shadow-sm overflow-x-auto custom-scrollbar">
        {/* Smart Tabs Bar */}
        <div className="flex items-center gap-1.5 text-[11px] font-medium shrink-0">
          {hasSmartTabs && [
            { id: 'all', label: language === 'en' ? 'All Contacts' : 'সব কন্টাক্ট', count: tabCounts.all, icon: UserIcon },
            { id: 'order_requests', label: language === 'en' ? 'Order Requests' : 'অর্ডার রিকোয়েস্ট', count: tabCounts.order_requests, icon: CheckCircle2 },
            { id: 'unreplied', label: language === 'en' ? 'Unreplied' : 'আনরিপ্লাইড', count: tabCounts.unreplied, icon: MessageSquare },
            { id: 'tickets', label: language === 'en' ? 'Tickets' : 'টিকিট', count: tabCounts.tickets, icon: Tag },
            { id: 'resolved', label: language === 'en' ? 'Resolved' : 'সমাধানকৃত', count: tabCounts.resolved, icon: Check },
            { id: 'archived', label: language === 'en' ? 'Archived' : 'আর্কাইভ', count: tabCounts.archived, icon: Archive },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-md transition-all shrink-0 flex items-center gap-1.5 cursor-pointer border border-transparent ${
                  activeTab === tab.id 
                    ? 'bg-primary text-primary-foreground font-bold shadow-sm' 
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground border-border/40'
                }`}
              >
                <Icon className="w-3.5 h-3.5 opacity-70" />
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    activeTab === tab.id ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-primary/10 text-primary font-bold'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Channel Filter Row */}
        <div className="flex items-center gap-1.5 pl-3 border-l border-border/40 text-xs shrink-0 h-8 ml-3">
          <button
            onClick={() => setChannelFilter('all')}
            className={`px-3 py-1 rounded-md text-[11px] transition-colors cursor-pointer border border-transparent ${
              channelFilter === 'all' ? 'bg-secondary text-secondary-foreground font-bold shadow-sm' : 'text-muted-foreground hover:bg-muted/50 border-border/40'
            }`}
          >
            {language === 'en' ? 'All channels' : 'সব চ্যানেল'}
          </button>
          {activeChannels.map(ch => (
            <button
              key={ch.id}
              onClick={() => setChannelFilter(ch.channelType)}
              className={`px-3 py-1 rounded-md text-[11px] capitalize transition-colors cursor-pointer border border-transparent ${
                channelFilter === ch.channelType ? 'bg-secondary text-secondary-foreground font-bold shadow-sm' : 'text-muted-foreground hover:bg-muted/50 border-border/40'
              }`}
            >
              {ch.channelType}
            </button>
          ))}
          {hasCommentAutomation && (
            <button
              onClick={() => setChannelFilter('facebook_comments')}
              className={`px-3 py-1 rounded-md text-[11px] transition-colors cursor-pointer border border-transparent flex items-center gap-1.5 ${
                channelFilter === 'facebook_comments' ? 'bg-orange-500 text-white font-bold shadow-sm' : 'text-muted-foreground hover:bg-muted/50 border-border/40'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{language === 'en' ? 'FB Comments' : 'FB কমেন্ট'}</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden gap-3 p-0 md:p-3 bg-background">
        {/* LEFT COLUMN: Conversation List */}
        <div className={`w-full md:w-80 lg:w-96 md:border border-border/80 md:shadow-sm dark:shadow-[0_0_15px_rgba(0,0,0,0.2)] md:rounded-2xl flex-col bg-card shrink-0 overflow-hidden ${
          // On mobile: show only when mobilePanelView === 'list'
          // On desktop: always show
          mobilePanelView === 'list' ? 'flex md:flex' : 'hidden md:flex'
        }`}>
          
          {/* Header Search & Parameter Filter */}
          <div className="p-2.5 border-b border-border/40 shrink-0 bg-background/50 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={language === 'en' ? 'Search...' : 'সার্চ...'}
                className="w-full pl-8 pr-6 py-1.5 bg-background border border-border rounded-md text-xs focus:outline-none focus:border-primary text-foreground"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2 top-2 text-muted-foreground hover:text-foreground">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            
            <div className="relative shrink-0">
              <select
                value={filterParam}
                onChange={e => setFilterParam(e.target.value)}
                className="bg-background border border-border rounded-md px-2 py-1.5 text-[11px] font-medium text-foreground focus:outline-none focus:border-primary cursor-pointer max-w-[120px]"
                title={language === 'en' ? 'Filter by parameter' : 'প্যারামিটার ফিল্টার'}
              >
                <option value="all">{language === 'en' ? 'All Chats' : 'সব চ্যাট'}</option>
                <option value="starred">{language === 'en' ? '⭐ Starred' : '⭐ স্টার্ড'}</option>
                <option value="unassigned">{language === 'en' ? '👤 Unassigned' : '👤 আনঅ্যাসাইনড'}</option>
                <option value="blocked">{language === 'en' ? '🚫 Blocked' : '🚫 ব্লকড'}</option>
                <option value="order_requests">{language === 'en' ? '🛍️ Orders' : '🛍️ অর্ডার'}</option>
                
                {availableLabels.length > 0 && (
                  <optgroup label={language === 'en' ? 'Tags' : 'ট্যাগস'}>
                    {availableLabels.map(l => (
                      <option key={l.id} value={`tag_${l.id}`}>🏷️ {l.name}</option>
                    ))}
                  </optgroup>
                )}

                {agents.length > 0 && (
                  <optgroup label={language === 'en' ? 'Agents' : 'এজেন্ট'}>
                    {agents.map(a => (
                      <option key={a.id} value={`agent_${a.id}`}>👤 {a.name}</option>
                    ))}
                  </optgroup>
                )}

                <optgroup label={language === 'en' ? 'Follow-up' : 'ফলো-আপ'}>
                  <option value="followup_today">{language === 'en' ? '📅 Today' : '📅 আজকে'}</option>
                  <option value="followup_upcoming">{language === 'en' ? '📅 Upcoming' : '📅 আগামীতে'}</option>
                  <option value="followup_past">{language === 'en' ? '📅 Past Due' : '📅 অতীত'}</option>
                </optgroup>
              </select>
            </div>
          </div>

        {/* Conversation Items List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-border/40">
          {channelFilter === 'facebook_comments' ? (
            commentLogsLoading ? (
              <div className="p-4 text-center text-xs text-muted-foreground animate-pulse">
                {language === 'en' ? 'Loading Facebook comments...' : 'ফেসবুক কমেন্ট লোড হচ্ছে...'}
              </div>
            ) : commentLogs.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground space-y-1">
                <MessageSquare className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="font-semibold">{language === 'en' ? 'No Facebook comments found' : 'কোন কমেন্ট পাওয়া যায়নি'}</p>
                <p className="text-[11px] text-muted-foreground">{language === 'en' ? 'Comments on your Facebook posts will appear here.' : 'আপনার পেজের পোস্টে আসা কমেন্ট এখানে দেখাবে।'}</p>
              </div>
            ) : (
              commentLogs.map(c => {
                const isSelected = c.commentId === selectedCommentId;
                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      setSelectedCommentId(c.commentId);
                      setMobilePanelView('chat');
                    }}
                    className={`px-3 py-2.5 cursor-pointer transition-all hover:bg-muted/50 ${
                      isSelected ? 'bg-orange-500/10 border-l-4 border-orange-500' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 font-bold flex items-center justify-center text-xs border border-blue-500/20 shrink-0">
                          <MessageSquare className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-foreground truncate">
                            {c.userName || 'Facebook User'}
                          </h4>
                          <p className="text-[11px] text-muted-foreground truncate">
                            "{c.commentText}"
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <div className="mt-0.5">
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                            c.replyStatus === 'replied' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {c.replyStatus}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )
          ) : loading ? (
            <div className="p-4 text-center text-xs text-muted-foreground animate-pulse">
              {language === 'en' ? 'Loading inbox...' : 'ইনবক্স লোড হচ্ছে...'}
            </div>
          ) : (() => {
            const filteredConversations = conversations.filter(conv => {
              if (filterParam === 'starred' && !conv.isStarred) return false;
              if (filterParam === 'unassigned' && conv.assignedAgentId) return false;
              if (filterParam === 'blocked' && (!conv.isBlocked && !conv.contact?.isBlocked)) return false;
              if (filterParam === 'order_requests' && !conv.hasOrderRequest) return false;

              if (filterParam.startsWith('tag_')) {
                const tagId = filterParam.split('_')[1];
                if (!conv.labels?.some((l: any) => l.labelId === tagId)) return false;
              }

              if (filterParam.startsWith('agent_')) {
                const agentId = filterParam.split('_')[1];
                if (conv.assignedAgentId !== agentId) return false;
              }

              if (filterParam.startsWith('followup_')) {
                if (!conv.contact?.followUpAt) return false;
                const fDate = new Date(conv.contact.followUpAt);
                fDate.setHours(0,0,0,0);
                const today = new Date();
                today.setHours(0,0,0,0);
                
                if (filterParam === 'followup_today' && fDate.getTime() !== today.getTime()) return false;
                if (filterParam === 'followup_upcoming' && fDate.getTime() <= today.getTime()) return false;
                if (filterParam === 'followup_past' && fDate.getTime() >= today.getTime()) return false;
              }

              if (!searchQuery.trim()) return true;
              const q = searchQuery.toLowerCase().trim();
              
              const contactName = (conv.contact?.name || '').toLowerCase();
              const contactPhone = (conv.contact?.phone || conv.contact?.externalContactId || '').toLowerCase();
              const contactEmail = (conv.contact?.email || '').toLowerCase();
              const tags = (conv.labels || []).map((l: any) => l.label?.name || '').join(' ').toLowerCase();

              const lastMsg = conv.messages?.[0];
              let msgText = '';
              if (lastMsg) {
                if (typeof lastMsg.content === 'string') msgText = lastMsg.content.toLowerCase();
                else if (typeof lastMsg.content === 'object' && lastMsg.content !== null) {
                  msgText = (lastMsg.content.body || lastMsg.content.text || lastMsg.content.caption || '').toLowerCase();
                }
              }

              return contactName.includes(q) || contactPhone.includes(q) || contactEmail.includes(q) || tags.includes(q) || msgText.includes(q);
            });

            if (filteredConversations.length === 0) {
              return (
                <div className="p-8 text-center text-xs text-muted-foreground space-y-1">
                  <MessageCircle className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="font-semibold">{language === 'en' ? 'No conversations found' : 'কোন কনভারসেশন নেই'}</p>
                  <p className="text-[11px] text-muted-foreground">{language === 'en' ? 'Messages will appear here when customers message you.' : 'কাস্টমার মেসেজ দিলে তা এখানে আসবে।'}</p>
                </div>
              );
            }

            return filteredConversations.map(conv => {
              const isSelected = conv.id === selectedConvId;
              const lastMsg = conv.messages?.[0];
              let lastText = '';
              if (lastMsg) {
                let parsed: any = lastMsg.content;
                if (typeof lastMsg.content === 'string' && lastMsg.content.trim().startsWith('{')) {
                  try { parsed = JSON.parse(lastMsg.content); } catch (e) {}
                }
                if (typeof parsed === 'object' && parsed !== null) {
                  lastText = parsed.body || parsed.text || parsed.caption || (lastMsg.type === 'image' ? '📷 Photo' : lastMsg.type === 'video' ? '🎥 Video' : lastMsg.type === 'audio' ? '🎤 Voice' : lastMsg.type === 'document' ? '📄 Document' : '');
                } else if (typeof lastMsg.content === 'string') {
                  if (lastMsg.content.trim().startsWith('{') && lastMsg.content.includes('"mediaUrl"')) {
                    lastText = lastMsg.type === 'image' ? '📷 Photo' : lastMsg.type === 'video' ? '🎥 Video' : lastMsg.type === 'audio' ? '🎤 Voice' : '📄 Document';
                  } else {
                    lastText = lastMsg.content;
                  }
                }
              }

              return (
                <div
                  key={conv.id}
                  onClick={() => {
                    setSelectedConvId(conv.id);
                    setMobilePanelView('chat');
                  }}
                  className={`px-3 py-2.5 cursor-pointer transition-all hover:bg-muted/50 ${
                    isSelected ? 'bg-primary/10 border-l-4 border-primary' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    {/* Left Info: Avatar + Name + Snippet */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="relative shrink-0">
                        <div className="w-10 h-10 md:w-8 md:h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm md:text-xs border border-primary/20">
                          {conv.contact?.name ? conv.contact.name[0].toUpperCase() : 'C'}
                        </div>
                        <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 md:w-3 md:h-3 rounded-full border-2 border-background text-[8px] font-bold text-white flex items-center justify-center uppercase ${
                          conv.channel === 'whatsapp' ? 'bg-emerald-600' : conv.channel === 'messenger' ? 'bg-blue-600' : 'bg-pink-600'
                        }`}>
                          {conv.channel[0]}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <h4 className="text-sm md:text-xs font-bold text-foreground truncate">
                            {conv.contact?.name || conv.contact?.phone || 'Customer'}
                          </h4>
                          {conv.isStarred && <Star className="w-3.5 h-3.5 md:w-3 md:h-3 text-amber-500 fill-amber-500 shrink-0" />}
                          {conv.requiresFollowUp && <Flag className="w-3.5 h-3.5 md:w-3 md:h-3 text-red-500 shrink-0" />}
                        </div>
                        <p className="text-xs md:text-[11px] text-muted-foreground truncate max-w-[180px] md:max-w-[160px]">
                          {lastText || (language === 'en' ? 'No messages' : 'কোন মেসেজ নেই')}
                        </p>
                      </div>
                    </div>

                    {/* Right Side: Timestamp + Badges / Unassigned / Tags */}
                    <div className="text-right shrink-0 flex flex-col items-end gap-1">
                      <span className="text-[11px] md:text-[10px] text-muted-foreground whitespace-nowrap">
                        {conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                      <div className="flex items-center justify-end gap-1 flex-wrap">
                        {conv.labels?.slice(0, 2).map((l: any) => (
                          <span key={l.labelId} style={{ backgroundColor: `${l.label.color}20`, color: l.label.color, borderColor: l.label.color }} className="px-1.5 py-0.5 rounded border text-[10px] md:text-[9px] font-medium">
                            {l.label.name}
                          </span>
                        ))}
                        {conv.assignedAgentId === null && (
                          <span className="text-amber-600 bg-amber-500/10 dark:bg-amber-500/20 text-[10px] md:text-[9px] font-medium px-1.5 py-0.5 rounded border border-amber-500/30 whitespace-nowrap">
                            Unassigned
                          </span>
                        )}
                        {hasCollaborators && conv.collaborators && conv.collaborators.length > 0 && (
                          <div className="flex -space-x-1 overflow-hidden shrink-0">
                            {conv.collaborators.map((col: any) => (
                              <div key={col.userId} title={col.user?.name} className="inline-block h-3.5 w-3.5 rounded-full ring-1 ring-background bg-secondary/20 text-secondary text-[7px] font-bold text-center leading-3.5">
                                {col.user?.name?.[0] || 'A'}
                              </div>
                            ))}
                          </div>
                        )}
                        {conv.unreadCount > 0 && (
                          <span className="bg-red-500 text-white text-[10px] md:text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-xs">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>

      {/* MIDDLE COLUMN: Active Chat / Facebook Comment Panel */}
      {channelFilter === 'facebook_comments' ? (
        (() => {
          const selectedComment = commentLogs.find(c => c.commentId === selectedCommentId);
          return selectedComment ? (
            <div className={`flex-1 flex-col min-w-0 bg-card md:border border-border/80 md:shadow-sm dark:shadow-[0_0_15px_rgba(0,0,0,0.2)] md:rounded-2xl overflow-hidden ${
              mobilePanelView === 'chat' ? 'flex' : 'hidden md:flex'
            }`}>
              {/* Header */}
              <div className="h-14 px-3 md:px-4 border-b border-border bg-surface/80 backdrop-blur-xl flex items-center justify-between shrink-0 shadow-2xs">
                <div className="flex items-center gap-3">
                  <button onClick={() => setMobilePanelView('list')} className="md:hidden p-1.5 text-muted-foreground hover:text-foreground">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="w-9 h-9 rounded-full bg-blue-500/10 text-blue-500 font-bold flex items-center justify-center border border-blue-500/20">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
                      <span>{selectedComment.userName || 'Facebook User'}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 font-bold border border-orange-500/20">
                        Post Comment
                      </span>
                    </h3>
                    <p className="text-[10px] text-muted-foreground">Post ID: {selectedComment.postId}</p>
                  </div>
                </div>
              </div>

              {/* Main Comment & Reply View */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4 font-sans bg-muted/10">
                <div className="p-4 bg-card rounded-2xl border border-border/70 shadow-2xs max-w-xl">
                  <span className="text-[10px] font-bold text-primary uppercase tracking-wider block mb-1">
                    Customer Comment:
                  </span>
                  <p className="text-xs text-foreground font-medium leading-relaxed">"{selectedComment.commentText}"</p>
                  <span className="text-[10px] text-muted-foreground mt-2 block text-right">
                    {new Date(selectedComment.createdAt).toLocaleString()}
                  </span>
                </div>

                {selectedComment.replyText ? (
                  <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 max-w-xl ml-auto text-right">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                      {selectedComment.skipReason === 'human_reply' ? 'Human Agent Reply:' : 'AI Auto-Reply:'}
                    </span>
                    <p className="text-xs text-foreground font-medium leading-relaxed">"{selectedComment.replyText}"</p>
                  </div>
                ) : (
                  <div className="p-3.5 bg-amber-500/10 rounded-xl border border-amber-500/20 text-xs text-amber-400 font-medium">
                    Status: {selectedComment.replyStatus} ({selectedComment.skipReason || 'No reply generated'})
                  </div>
                )}
              </div>

              {/* Human Re-comment Form */}
              <div className="p-3 border-t border-border bg-surface/80 backdrop-blur-md">
                <form onSubmit={(e) => { e.preventDefault(); handleSendHumanCommentReply(selectedComment.commentId); }} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={humanReplyText}
                    onChange={(e) => setHumanReplyText(e.target.value)}
                    placeholder={language === 'en' ? 'Type human comment reply to post on Facebook...' : 'কমেন্টের পাবলিক উত্তর লিখুন (ফেসবুকে পোস্ট হবে)...'}
                    className="flex-1 p-2.5 bg-background border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <button
                    type="submit"
                    disabled={sendingHumanReply || !humanReplyText.trim()}
                    className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{sendingHumanReply ? 'Posting...' : language === 'en' ? 'Re-comment' : 'রিপ্লাই দিন'}</span>
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className={`flex-1 flex-col items-center justify-center text-xs text-muted-foreground bg-card md:border border-border/80 md:rounded-2xl ${
              mobilePanelView === 'chat' ? 'flex' : 'hidden md:flex'
            }`}>
              <MessageSquare className="w-10 h-10 mb-2 opacity-30 text-muted-foreground" />
              <p className="font-medium">{language === 'en' ? 'Select a comment to view & reply' : 'উত্তর দিতে একটি কমেন্ট সিলেক্ট করুন'}</p>
            </div>
          );
        })()
      ) : selectedConvId && activeConv ? (
        <div className={`flex-1 flex-col min-w-0 bg-card md:border border-border/80 md:shadow-sm dark:shadow-[0_0_15px_rgba(0,0,0,0.2)] md:rounded-2xl overflow-hidden ${
          // On mobile: show only when mobilePanelView === 'chat'
          // On desktop: always show when conversation selected
          mobilePanelView === 'chat' ? 'flex' : 'hidden md:flex'
        }`}>
          
          {/* Header */}
          <div className="h-14 px-2 md:px-4 border-b border-border bg-surface/80 backdrop-blur-xl flex items-center justify-between shrink-0 shadow-2xs">
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              <button 
                onClick={() => { setMobilePanelView('list'); setSelectedConvId(null); }}
                className="md:hidden p-1.5 -ml-1 text-muted-foreground hover:bg-muted rounded-full"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              {/* Clickable Avatar + Name → opens CRM panel */}
              <button
                onClick={() => {
                  if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                    setMobilePanelView('crm');
                  } else {
                    setShowRightSidebar(!showRightSidebar);
                  }
                }}
                className="flex items-center gap-2 md:gap-2.5 min-w-0 cursor-pointer hover:opacity-80 active:opacity-60 transition-opacity group"
                title={language === 'en' ? 'View CRM Details' : 'CRM ডিটেইলস দেখুন'}
              >
                <div className="w-10 h-10 md:w-9 md:h-9 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm md:text-xs border border-primary/20 shrink-0 group-hover:border-primary/60 transition-colors">
                  {activeConv.contact?.name ? activeConv.contact.name[0].toUpperCase() : 'C'}
                </div>
                <div className="min-w-0 text-left">
                  <h3 className="text-sm md:text-xs font-bold text-foreground truncate flex items-center gap-2">
                    {activeConv.contact?.name || activeConv.contact?.phone || 'Customer'}
                    <span className="text-xs md:text-[10px] text-muted-foreground font-normal capitalize">({activeConv.channel})</span>
                  </h3>
                  <p className="text-[11px] md:text-[10px] text-muted-foreground flex items-center gap-2">
                    <span>{activeConv.contact?.phone || activeConv.contact?.externalContactId}</span>
                    {activeConv.assignedAgent && (
                      <span className="text-primary font-medium">· Assigned to: {activeConv.assignedAgent.name}</span>
                    )}
                  </p>
                </div>
              </button>
            </div>


            {/* Header Control Buttons */}
            <div className="flex items-center gap-1 text-muted-foreground">
              {/* Star */}
              <button
                onClick={handleToggleStar}
                className={`p-1.5 rounded-lg hover:bg-muted transition-colors ${activeConv.isStarred ? 'text-amber-500' : ''}`}
                title={activeConv.isStarred 
                  ? (language === 'en' ? 'Unstar Conversation' : 'অনস্টার করুন')
                  : (language === 'en' ? 'Star Conversation — Mark important chat for quick reference' : 'স্টার করুন — গুরুত্বপূর্ণ চ্যাট দ্রুত পাওয়ার জন্য চিহ্নিত করতে')}
              >
                <Star className={`w-4 h-4 ${activeConv.isStarred ? 'fill-amber-500' : ''}`} />
              </button>

              {/* Follow-up flag */}
              <button
                onClick={handleToggleFollowUp}
                className={`p-1.5 rounded-lg hover:bg-muted transition-colors ${activeConv.requiresFollowUp ? 'text-red-500' : ''}`}
                title={language === 'en' ? 'Flag for Follow-up — Flag when customer needs a future follow-up call or reply' : 'ফলো-আপ ফ্ল্যাগ — গ্রাহককে পরবর্তীতে কল বা মেসেজ দেয়ার প্রয়োজন হলে চিহ্নিত করতে'}
              >
                <Flag className={`w-4 h-4 ${activeConv.requiresFollowUp ? 'fill-red-500' : ''}`} />
              </button>

              {/* Resolve */}
              <button
                onClick={handleToggleResolve}
                className={`p-1.5 rounded-lg hover:bg-muted transition-colors ${activeConv.status === 'resolved' ? 'text-emerald-600' : ''}`}
                title={activeConv.status === 'resolved'
                  ? (language === 'en' ? 'Reopen Conversation' : 'পুনরায় ওপেন করুন')
                  : (language === 'en' ? 'Resolve Conversation — Mark inquiry as solved when customer issue is completed' : 'রেসোলভ করুন — কাস্টমারের বিষয়ের সমাধান হলে চিহ্নিত করতে')}
              >
                <CheckCircle2 className="w-4 h-4" />
              </button>

              {/* Archive */}
              <button
                onClick={handleToggleArchive}
                className={`p-1.5 rounded-lg hover:bg-muted transition-colors ${activeConv.isArchived ? 'text-blue-600' : ''}`}
                title={activeConv.isArchived
                  ? (language === 'en' ? 'Unarchive Conversation' : 'আনআর্কাইভ করুন')
                  : (language === 'en' ? 'Archive Conversation — Move inactive chat out of active inbox' : 'আর্কাইভ করুন — নিষ্ক্রিয় চ্যাট ইনবক্স থেকে সরাতে')}
              >
                <Archive className="w-4 h-4" />
              </button>

              {/* Block */}
              <button
                onClick={handleToggleBlock}
                className={`p-1.5 rounded-lg hover:bg-muted transition-colors ${activeConv.isBlocked || activeConv.contact?.isBlocked ? 'text-rose-600 bg-rose-500/10' : ''}`}
                title={activeConv.isBlocked || activeConv.contact?.isBlocked
                  ? (language === 'en' ? 'Unblock Contact' : 'আনব্লক করুন')
                  : (language === 'en' ? 'Block Contact — Block contact and stop AI auto-replies' : 'ব্লক করুন — কাস্টমারকে ব্লক করতে ও এআই অটো-রিপ্লাই বন্ধ করতে')}
              >
                <Ban className="w-4 h-4" />
              </button>

              {/* Assign Agent */}
              <div className="relative">
                <button
                  onClick={() => setShowAssignMenu(!showAssignMenu)}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                  title={language === 'en' ? 'Assign Agent — Transfer this conversation to a team member' : 'এজেন্ট অ্যাসাইন — চ্যাটটির দায়িত্ব টিমের অন্য এজেন্টকে দিতে'}
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
                    title={language === 'en' ? 'Add Collaborator — Add team members to monitor or assist in this chat' : 'কোলাবোরেটর যুক্ত — সহযোগিতার জন্য সহকর্মীকে চ্যাটে যুক্ত করতে'}
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
                onClick={() => {
                  // On mobile: switch to CRM panel view
                  if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                    setMobilePanelView('crm');
                  } else {
                    setShowRightSidebar(!showRightSidebar);
                  }
                }}
                className={`p-1.5 rounded-lg hover:bg-muted transition-colors ${showRightSidebar ? 'text-primary lg:text-primary' : ''} ${mobilePanelView === 'crm' ? 'text-primary lg:text-inherit' : ''}`}
                title={language === 'en' ? 'Toggle Sidebar — Show or hide customer CRM details & notes' : 'সাইডবার হাইড/শো — কাস্টমার CRM ডিটেইলস প্যানেল'}
              >
                <PanelRight className="w-4 h-4" />
              </button>

              {/* Delete */}
              <button
                onClick={handleDeleteConversation}
                className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                title={language === 'en' ? 'Delete Conversation — Permanently delete chat and messages' : 'কনভারসেশন মুছুন — স্থায়ীভাবে সকল মেসেজ মুছে ফেলতে'}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-background">
            {messages.map((m, idx) => {
              const isInbound = m.direction === 'inbound';
              const isAi = m.senderType === 'ai';
              let parsedContent: any = m.content;
              if (typeof m.content === 'string' && m.content.trim().startsWith('{')) {
                try {
                  parsedContent = JSON.parse(m.content);
                } catch (e) {}
              }

              const mediaUrl = m.mediaUrl || (typeof parsedContent === 'object' && parsedContent !== null ? (parsedContent.mediaUrl || parsedContent.localUrl) : null);

              let contentText = '';
              if (typeof parsedContent === 'object' && parsedContent !== null) {
                contentText = parsedContent.body || parsedContent.text || parsedContent.caption || '';
              } else if (typeof m.content === 'string') {
                contentText = m.content;
              }

              if (contentText.trim().startsWith('{') && contentText.includes('"mediaUrl"')) {
                try {
                  const json = JSON.parse(contentText);
                  contentText = json.body || json.text || json.caption || '';
                } catch (e) {
                  contentText = '';
                }
              }

              const resolveMediaUrl = (url: string | null) => {
                if (!url) return '';
                if (url.startsWith('http://') || url.startsWith('https://')) return url;
                const cleanUrl = url.startsWith('/') ? url : `/${url}`;
                return `${API}${cleanUrl}`;
              };

              // Hide raw URL string if it matches the mediaUrl
              if (mediaUrl && (contentText === mediaUrl || contentText === m.mediaUrl || contentText === resolveMediaUrl(mediaUrl))) {
                contentText = '';
              }

              const quoted = typeof parsedContent === 'object' && parsedContent !== null ? parsedContent.quotedMessage : null;

              return (
                <div key={m.id || idx} className={`flex flex-col group ${isInbound ? 'items-start' : 'items-end'} w-full`}>
                  {!isInbound && !isAi && m.senderUser && (
                    <span className="text-[9px] text-muted-foreground mb-0.5">
                      {m.senderUser.name}
                    </span>
                  )}

                  <div className={`flex items-center gap-2 max-w-full ${isInbound ? 'flex-row' : 'flex-row-reverse'}`}>
                    <div className={`max-w-[85vw] md:max-w-[45vw] lg:max-w-[600px] rounded-2xl px-4 py-3 text-[14px] md:text-[13px] leading-relaxed shadow-sm ${
                      isInbound 
                        ? 'bg-muted/50 dark:bg-muted/30 text-foreground border border-border/60 rounded-tl-xs' 
                        : isAi 
                          ? 'bg-purple-500/5 dark:bg-purple-500/10 text-foreground border border-purple-500/30 rounded-tr-xs shadow-[0_0_15px_rgba(168,85,247,0.08)]' 
                          : 'bg-primary text-primary-foreground rounded-tr-xs shadow-md shadow-primary/20'
                    }`}>
                    {/* Quoted Message Card */}
                    {quoted && (
                      <div className={`mb-2 p-2 rounded-lg text-[11px] border-l-4 ${isInbound ? 'bg-background/80 border-primary text-foreground' : 'bg-black/20 border-white text-white'}`}>
                        <div className="font-bold text-[10px] opacity-90">{quoted.senderName}</div>
                        <div className="truncate opacity-80">{quoted.text || (quoted.type === 'image' ? '📷 Photo' : 'Attachment')}</div>
                      </div>
                    )}

                    {mediaUrl && (
                      <div className="mb-2">
                        {m.type === 'image' ? (
                          <img 
                            src={resolveMediaUrl(mediaUrl)} 
                            alt="attachment" 
                            onClick={() => setZoomedImage(resolveMediaUrl(mediaUrl))}
                            className="max-h-48 rounded-lg cursor-pointer hover:opacity-90 object-cover" 
                          />
                        ) : m.type === 'audio' ? (
                          <audio controls src={resolveMediaUrl(mediaUrl)} className="max-w-[220px] md:max-w-[280px] h-10 mt-1 outline-none">
                            Your browser does not support the audio element.
                          </audio>
                        ) : m.type === 'video' ? (
                          <video controls src={resolveMediaUrl(mediaUrl)} className="max-h-48 max-w-full rounded-lg object-cover outline-none" />
                        ) : (
                          <a href={resolveMediaUrl(mediaUrl)} target="_blank" rel="noreferrer" className="flex items-center gap-2 underline text-[11px]">
                            <FileIcon className="w-4 h-4" /> Download File
                          </a>
                        )}
                      </div>
                    )}
                    {contentText ? (
                      <p className="whitespace-pre-wrap leading-relaxed">{contentText}</p>
                    ) : null}
                    <div className={`flex items-center justify-between gap-3 mt-1.5 pt-1.5 border-t ${isInbound ? 'border-border/50' : isAi ? 'border-purple-500/20' : 'border-white/20'}`}>
                      {isAi ? (
                        <span className="text-[10px] md:text-[9px] font-bold text-purple-400 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Replied by {tenantBusinessName} AI ✨
                        </span>
                      ) : <div />}
                      <span className={`flex items-center gap-0.5 text-[11px] md:text-[9px] text-right ${isInbound || isAi ? 'text-muted-foreground' : 'text-white/70'}`}>
                        <span>{new Date(m.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        {renderMessageStatus(m)}
                      </span>
                    </div>
                    </div>
                    
                    {/* Hover Quick Action Buttons (Reply / Quote & Forward) */}
                    <div className="hidden group-hover:flex items-center gap-1 bg-card border border-border shadow-md rounded-full px-2 py-0.5 shrink-0 z-10">
                      <button 
                        onClick={() => setReplyingToMessage(m)}
                        className="p-1 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                        title={language === 'en' ? 'Reply / Quote Message' : 'রিপ্লাই / কোট মেসেজ'}
                      >
                        <Reply className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => setForwardingMessage(m)}
                        className="p-1 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                        title={language === 'en' ? 'Forward Message' : 'ফরোয়ার্ড করুন'}
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Compose Bar */}
          <div className="p-3 border-t border-border bg-surface/80 backdrop-blur-xl shrink-0 space-y-2">
            
            {/* Replying Preview Banner */}
            {replyingToMessage && (
              <div className="flex items-center justify-between bg-primary/10 border-l-4 border-primary px-3 py-1.5 rounded-lg text-xs">
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-primary text-[10px] flex items-center gap-1">
                    <Reply className="w-3 h-3" /> Replying to {replyingToMessage.senderUser?.name || (replyingToMessage.direction === 'inbound' ? (activeConv?.contact?.name || 'Customer') : 'Agent')}
                  </div>
                  <div className="text-muted-foreground text-[11px] truncate">
                    {typeof replyingToMessage.content === 'string' ? replyingToMessage.content : (replyingToMessage.content?.body || replyingToMessage.content?.text || 'Attachment')}
                  </div>
                </div>
                <button onClick={() => setReplyingToMessage(null)} className="p-1 text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Blocked Contact Warning Banner */}
            {(activeConv.isBlocked || activeConv.contact?.isBlocked) && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 p-2 rounded-lg text-xs font-semibold flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Ban className="w-4 h-4" />
                  <span>{language === 'en' ? 'This contact is blocked. AI auto-replies are disabled.' : 'এই কনভারসেশনটি ব্লক করা রয়েছে। এআই অটো-রিপ্লাই বন্ধ আছে।'}</span>
                </div>
                <button onClick={handleToggleBlock} className="text-[11px] underline font-bold cursor-pointer">
                  {language === 'en' ? 'Unblock' : 'আনব্লক'}
                </button>
              </div>
            )}
            
            {/* Compose Controls Row */}
            {!(activeConv.isBlocked || activeConv.contact?.isBlocked) && (
              <>
                <div className="flex items-center justify-between text-xs mt-3">
                  <div className="flex items-center gap-2">
                    {/* AI Toggle or Channel Setting Disabled Notice */}
                    {activeConv.channelConnection?.isAiAutoReplyEnabled === false ? (
                      <div 
                        className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9.5px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 cursor-help"
                        title={language === 'en' ? 'AI Auto-Reply is turned OFF in Channel Integration settings for this channel' : 'চ্যানেল ইন্টিগ্রেশন সেটিংসে এই চ্যানেলের এআই অটো-রিপ্লাই বন্ধ করা আছে'}
                      >
                        <AlertCircle className="w-3 h-3 text-amber-500 shrink-0" />
                        <span>
                          {language === 'en' 
                            ? 'AI Auto-Reply OFF (Disabled in Channel Settings)' 
                            : 'চ্যানেল সেটিংসে AI Auto-Reply বন্ধ আছে'}
                        </span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleToggleAiReply(!activeConv.isAiEnabled)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                          activeConv.isAiEnabled 
                            ? 'bg-purple-100 text-purple-700 border border-purple-300 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800' 
                            : 'bg-muted text-muted-foreground border border-border'
                        }`}
                      >
                        <Bot className="w-3.5 h-3.5" />
                        {activeConv.isAiEnabled ? 'AI Auto-Reply ON' : 'AI Auto-Reply OFF'}
                      </button>
                    )}

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
                <form onSubmit={handleSendMessage} className="flex items-center gap-2 mt-2">
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
                    className="flex-1 bg-background border border-border rounded-2xl px-4 py-2.5 text-[14px] md:text-xs focus:outline-none focus:border-primary text-foreground"
                  />

                  <button
                    type="submit"
                    disabled={!inputText.trim() && !selectedFile}
                    className="p-2.5 md:p-2 bg-primary text-primary-foreground rounded-xl md:rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    <Send className="w-5 h-5 md:w-4 md:h-4" />
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center p-8 text-center text-muted-foreground bg-card border border-border/80 shadow-sm dark:shadow-[0_0_15px_rgba(0,0,0,0.2)] rounded-2xl overflow-hidden">
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
      {selectedConvId && activeConv && (
        <>
          {/* Desktop Right Sidebar — controlled by showRightSidebar toggle */}
          {showRightSidebar && (
            <div className="hidden lg:block w-80 shrink-0">
              <ConversationSidebar
                conversation={activeConv}
                availableLabels={availableLabels}
                onToggleLabel={handleToggleLabel}
                onCreateLabel={handleCreateLabel}
                onUpdateContact={handleUpdateContactInList}
              />
            </div>
          )}

          {/* Mobile Full-Screen CRM Panel — WhatsApp style, triggered by PanelRight icon */}
          {mobilePanelView === 'crm' && (
            <div className="lg:hidden fixed inset-0 z-50 flex flex-col bg-background animate-in slide-in-from-right duration-200">
              {/* CRM Header with back button */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-surface/80 backdrop-blur-xl shrink-0 shadow-sm">
                <button
                  onClick={() => setMobilePanelView('chat')}
                  className="p-1.5 -ml-1.5 text-muted-foreground hover:bg-muted rounded-full transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs border border-primary/20 shrink-0">
                  {activeConv.contact?.name ? activeConv.contact.name[0].toUpperCase() : 'C'}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-foreground truncate">
                    {language === 'en' ? 'CRM Details' : 'CRM ডিটেইলস'}
                  </h3>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {activeConv.contact?.name || activeConv.contact?.phone || 'Customer'}
                  </p>
                </div>
              </div>
              {/* CRM Content */}
              <div className="flex-1 overflow-hidden">
                <ConversationSidebar
                  conversation={activeConv}
                  availableLabels={availableLabels}
                  onToggleLabel={handleToggleLabel}
                  onCreateLabel={handleCreateLabel}
                  onUpdateContact={handleUpdateContactInList}
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* Image Zoom Modal */}
      {zoomedImage && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4" onClick={() => setZoomedImage(null)}>
          <div className="relative max-w-4xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <img src={zoomedImage} alt="Zoomed" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" />
            
            {/* Download Button */}
            <button 
              onClick={(e) => handleForceDownload(zoomedImage, e)}
              className="absolute top-2 right-12 p-2 bg-black/60 text-white rounded-full hover:bg-black transition-colors flex items-center justify-center cursor-pointer"
              title={language === 'en' ? 'Download Image' : 'ডাউনলোড করুন'}
            >
              <Download className="w-5 h-5" />
            </button>

            {/* Close Button */}
            <button onClick={() => setZoomedImage(null)} className="absolute top-2 right-2 p-2 bg-black/60 text-white rounded-full hover:bg-black">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Forward Message Modal */}
      {forwardingMessage && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4" onClick={() => setForwardingMessage(null)}>
          <div className="bg-card border border-border rounded-2xl p-4 max-w-md w-full shadow-2xl space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <Share2 className="w-4 h-4 text-primary" />
                {language === 'en' ? 'Forward Message' : 'মেসেজ ফরোয়ার্ড করুন'}
              </h3>
              <button onClick={() => setForwardingMessage(null)} className="p-1 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <input 
                type="text"
                value={forwardSearchQuery}
                onChange={e => setForwardSearchQuery(e.target.value)}
                placeholder={language === 'en' ? 'Search contacts to forward...' : 'কন্টাক্ট সার্চ করুন...'}
                className="w-full pl-8 pr-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:outline-none focus:border-primary text-foreground"
              />
            </div>

            <div className="max-h-64 overflow-y-auto custom-scrollbar divide-y divide-border/50">
              {conversations
                .filter(c => {
                  if (!forwardSearchQuery.trim()) return true;
                  const q = forwardSearchQuery.toLowerCase();
                  return (c.contact?.name || '').toLowerCase().includes(q) || (c.contact?.phone || '').toLowerCase().includes(q);
                })
                .map(c => (
                  <div key={c.id} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0">
                        {c.contact?.name ? c.contact.name[0].toUpperCase() : 'C'}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-foreground truncate">{c.contact?.name || 'Customer'}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{c.contact?.phone || c.contact?.externalContactId}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleForwardSubmit(c.id)}
                      className="px-3 py-1 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors shadow-xs"
                    >
                      {language === 'en' ? 'Send' : 'পাঠান'}
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
