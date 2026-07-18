'use client';

import { useState, useEffect, useRef } from 'react';
import Cookies from 'js-cookie';
import { io, Socket } from 'socket.io-client';
import { useLanguage } from '@/components/LanguageProvider';
import { Search, Send, User as UserIcon, Clock, MessageSquare, Phone, Info, Tag, Plus, Check, MessageCircle, MoreVertical, X, UserCircle, UserPlus, Mail, Building, MapPin, AlertCircle, Paperclip, File as FileIcon } from 'lucide-react';
import Link from 'next/link';

export default function InboxPage() {
  const { language } = useLanguage();
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [availableLabels, setAvailableLabels] = useState<any[]>([]);
  const [showLabelsMenu, setShowLabelsMenu] = useState(false);
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [activeChannels, setActiveChannels] = useState<any[]>([]);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  
  const [agents, setAgents] = useState<any[]>([]);
  const [showAssignMenu, setShowAssignMenu] = useState(false);
  
  const [showLeadInfo, setShowLeadInfo] = useState(true);
  const [stages, setStages] = useState<any[]>([]);
  const [editDetails, setEditDetails] = useState({
    stageId: '',
    followUpAt: '',
    phone: '',
    email: '',
    company: '',
    address: '',
    assignedUserId: ''
  });
  const [noteContent, setNoteContent] = useState('');

  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Connect to Socket and fetch conversations
  useEffect(() => {
    const token = Cookies.get('access_token');
    if (!token) return;

    // Connect to /inbox namespace
    const socket = io(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/inbox`, {
      auth: { token }
    });
    socketRef.current = socket;

    socket.on('new_message', (data) => {
      console.log('New message received via socket:', data);
      
      // Update conversations list (move to top, update last message)
      setConversations(prev => {
        const convIndex = prev.findIndex(c => c.id === data.conversationId);
        if (convIndex > -1) {
          const updatedConv = { ...prev[convIndex], lastMessageAt: new Date().toISOString() };
          if (data.contact) {
            updatedConv.contact = { ...updatedConv.contact, ...data.contact };
          }
          const newConvs = [...prev];
          newConvs.splice(convIndex, 1);
          newConvs.unshift(updatedConv);
          return newConvs;
        } else if (data.conversation) {
           if (prev.some(c => c.id === data.conversation.id)) return prev;
           const newConv = { ...data.conversation };
           if (data.contact) {
             newConv.contact = data.contact;
           }
           return [newConv, ...prev];
        }
        return prev;
      });

      // If this message belongs to the currently active conversation, append it
      setSelectedConvId(currentSelectedId => {
        if (currentSelectedId === data.conversationId) {
          setMessages(prev => {
            if (prev.some(m => m.id === data.message.id)) return prev;
            return [...prev, data.message];
          });
        }
        return currentSelectedId;
      });
    });

    // Fetch labels, agents, stages, and active channels
    Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/labels`, { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/tenant/team`, { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/leads/stages`, { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/inbox/channels`, { headers: { 'Authorization': `Bearer ${token}` } })
    ])
      .then(async ([labelsRes, agentsRes, stagesRes, channelsRes]) => {
        if (labelsRes.ok) setAvailableLabels(await labelsRes.json());
        if (agentsRes.ok) setAgents(await agentsRes.json());
        if (stagesRes.ok) setStages(await stagesRes.json());
        if (channelsRes.ok) setActiveChannels(await channelsRes.json());
      })
      .catch(err => console.error(err));

    // Fetch initial conversations
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/inbox/conversations`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setConversations(data);
        setLoading(false);
        
        // Handle contactId from URL
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          const contactId = params.get('contactId');
          if (contactId) {
            const conv = data.find((c: any) => c.contactId === contactId);
            if (conv) {
              setSelectedConvId(conv.id);
            }
          }
        }
      })
      .catch(err => {
        console.error('Failed to fetch conversations:', err);
        setLoading(false);
      });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Fetch messages when a conversation is selected
  useEffect(() => {
    if (!selectedConvId) return;

    const token = Cookies.get('access_token');
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/inbox/conversations/${selectedConvId}/messages`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setMessages(data);
      })
      .catch(err => console.error(err));
  }, [selectedConvId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (selectedConvId) {
      const conv = conversations.find(c => c.id === selectedConvId);
      if (conv?.contact) {
        setEditDetails({
          stageId: conv.contact.stageId || '',
          followUpAt: conv.contact.followUpAt ? new Date(conv.contact.followUpAt).toISOString().split('T')[0] : '',
          phone: conv.contact.phone || '',
          email: conv.contact.email || '',
          company: conv.contact.company || '',
          address: conv.contact.address || '',
          assignedUserId: conv.contact.assignedUserId || ''
        });
      }
    }
  }, [selectedConvId, conversations]);

  const handleUpdateLeadDetails = async () => {
    const conv = conversations.find(c => c.id === selectedConvId);
    if (!conv || !conv.contact) return;
    
    const payload: any = { ...editDetails };
    if (!payload.stageId) payload.stageId = null;
    if (!payload.assignedUserId) payload.assignedUserId = null;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/leads/${conv.contact.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Cookies.get('access_token')}` },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const updatedContact = await res.json();
        setConversations(prev => prev.map(c => c.id === selectedConvId ? { ...c, contact: { ...c.contact, ...updatedContact } } : c));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveNote = async () => {
    if (!noteContent.trim()) return;
    const conv = conversations.find(c => c.id === selectedConvId);
    if (!conv || !conv.contact) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/leads/${conv.contact.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Cookies.get('access_token')}` },
        body: JSON.stringify({ content: noteContent })
      });
      if (res.ok) {
        const newNote = await res.json();
        const currentNotes = conv.contact.notes || [];
        setConversations(prev => prev.map(c => c.id === selectedConvId ? { ...c, contact: { ...c.contact, notes: [newNote, ...currentNotes] } } : c));
        setNoteContent('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Auto-scroll to bottom of messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleToggleLabel = async (labelId: string) => {
    if (!selectedConvId) return;
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/inbox/conversations/${selectedConvId}/labels`, {
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
        
        res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/inbox/messages/media`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });
      } else {
        res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/inbox/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            conversationId: selectedConvId,
            content
          })
        });
      }

      if (!res.ok) {
        throw new Error('Failed to send message');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssignAgent = async (agentId: string | null) => {
    if (!selectedConvId) return;
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/inbox/conversations/${selectedConvId}/assign`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ agentId })
      });
      if (res.ok) {
        const updatedConv = await res.json();
        setConversations(prev => prev.map(conv => conv.id === selectedConvId ? { ...conv, assignedAgentId: agentId, assignedAgent: updatedConv.assignedAgent } : conv));
      }
    } catch (err) {
      console.error(err);
    }
    setShowAssignMenu(false);
  };

  const selectedConv = conversations.find(c => c.id === selectedConvId);
  const filteredConversations = conversations.filter(c => channelFilter === 'all' || c.channelConnectionId === channelFilter || (channelFilter === c.channel && !c.channelConnectionId));

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-white/40 dark:bg-zinc-950/60 backdrop-blur-2xl">
        <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin mb-4"></div>
        <p className="text-[13px] font-medium text-zinc-500 dark:text-zinc-400">
          {language === 'en' ? 'Loading Inbox...' : 'ইনবক্স লোড হচ্ছে...'}
        </p>
      </div>
    );
  }

  if (activeChannels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-white/40 dark:bg-zinc-950/60 backdrop-blur-2xl p-6 relative">
        <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-emerald-500/20 flex items-center justify-center mb-6 shadow-lg shadow-primary/5 ring-1 ring-primary/20">
          <MessageSquare className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-3 text-center">
          {language === 'en' ? 'Inbox requires a connected channel' : 'ইনবক্স ব্যবহার করতে একটি চ্যানেল কানেক্ট করুন'}
        </h2>
        <p className="text-[14px] text-zinc-500 dark:text-zinc-400 mb-8 text-center max-w-md leading-relaxed">
          {language === 'en' 
            ? 'To start receiving and sending messages to your leads, you must connect at least one active channel like WhatsApp or Messenger.' 
            : 'লিডদের মেসেজ আদান-প্রদান শুরু করতে, আপনাকে অন্তত একটি অ্যাক্টিভ চ্যানেল (WhatsApp বা Messenger) কানেক্ট করতে হবে।'}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link href="/dashboard/settings/whatsapp" className="px-6 py-2.5 bg-gradient-to-r from-primary to-emerald-500 text-white rounded-xl font-medium shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2">
            <Phone className="w-4 h-4" />
            {language === 'en' ? 'Connect WhatsApp' : 'WhatsApp কানেক্ট করুন'}
          </Link>
          <Link href="/dashboard/settings/messenger" className="px-6 py-2.5 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 rounded-xl font-medium shadow-sm hover:bg-slate-50 dark:hover:bg-zinc-700 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2">
            <MessageCircle className="w-4 h-4" />
            {language === 'en' ? 'Connect Messenger' : 'Messenger কানেক্ট করুন'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-white/40 dark:bg-zinc-950/60 backdrop-blur-2xl overflow-hidden relative">
      
      {/* Left Pane - Conversations List */}
      <div className="w-72 flex-shrink-0 border-r border-white/50 dark:border-zinc-800 flex flex-col bg-gradient-to-b from-white/60 to-white/30 dark:from-zinc-900/50 dark:to-zinc-900/20 backdrop-blur-md relative z-10">
        <div className="px-2 py-1.5 border-b border-surface-hover">
          <div className="flex items-center justify-between mb-1.5">
            <h2 className="text-[14px] font-bold">{language === 'en' ? 'Inbox' : 'ইনবক্স'}</h2>
          </div>
          <div className="relative">
            <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input 
              type="text" 
              placeholder={language === 'en' ? 'Search contacts...' : 'কন্টাক্ট খুঁজুন...'} 
              className="w-full bg-surface border border-primary/10 hover:border-primary/20 transition-all rounded-md pl-7 pr-2 py-1 text-[12px] focus:outline-none focus:border-primary"
            />
          </div>
          
          <div className="flex flex-wrap gap-1 bg-surface-hover p-1 rounded-md mt-1.5">
            <button 
              onClick={() => setChannelFilter('all')}
              className={`flex-1 py-1 px-2 min-w-[60px] text-[11px] font-medium rounded-md transition-colors ${channelFilter === 'all' ? 'bg-white dark:bg-zinc-800 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-zinc-400'}`}
            >
              All
            </button>
            {activeChannels.map(channel => (
              <button 
                key={channel.id}
                onClick={() => setChannelFilter(channel.id)}
                className={`flex-1 py-1 px-2 min-w-[80px] text-[11px] font-medium rounded-md transition-colors flex justify-center items-center gap-1 ${channelFilter === channel.id ? 'bg-white dark:bg-zinc-800 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-zinc-400'}`}
              >
                {channel.channelType === 'whatsapp' ? <Phone className="w-3 h-3" /> : <MessageCircle className="w-3 h-3" />}
                <span className="truncate max-w-[80px]">{channel.displayName || channel.phoneNumber || channel.channelType}</span>
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-1.5 space-y-0.5">
          {loading ? (
            <div className="p-4 text-center text-sm text-zinc-500 font-medium animate-pulse">Loading...</div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center text-zinc-400 bg-white/30 rounded-2xl border border-dashed border-zinc-300 mt-4">
              <MessageSquare className="w-8 h-8 mb-3 opacity-50 text-primary" />
              <p className="text-sm font-medium">{language === 'en' ? 'No conversations yet' : 'কোনো কথোপকথন নেই'}</p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelectedConvId(conv.id)}
                className={`w-full flex items-center gap-2 p-1.5 rounded-lg transition-all text-left border ${
                  selectedConvId === conv.id 
                    ? 'bg-white/90 dark:bg-zinc-800 shadow-sm border-primary/20 ring-1 ring-primary/10' 
                    : 'bg-transparent border-transparent hover:bg-white/40 dark:hover:bg-zinc-800/40'
                }`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-[10px] shadow-inner ${selectedConvId === conv.id ? 'bg-gradient-to-br from-primary to-emerald-500' : 'bg-gradient-to-br from-slate-300 to-slate-400 dark:from-zinc-700 dark:to-zinc-600'}`}>
                  {conv.contact?.name ? conv.contact.name.charAt(0) : <UserIcon className="w-3 h-3" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline leading-none">
                    <h3 className="text-[12px] font-semibold truncate text-zinc-900 dark:text-zinc-100">
                      {conv.contact?.name || conv.contact?.externalContactId || 'Unknown'}
                    </h3>
                    <span className="text-[9px] text-zinc-400 flex-shrink-0 ml-1">
                      {new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-500 truncate mt-0.5 leading-tight flex items-center gap-1">
                    {conv.channel === 'whatsapp' ? <Phone className="w-3 h-3" /> : <MessageCircle className="w-3 h-3" />}
                    {conv.channelConnection ? (conv.channelConnection.displayName || conv.channelConnection.phoneNumber) : conv.channel}
                  </p>
                  {conv.labels && conv.labels.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {conv.labels.map((cl: any) => (
                        <span key={cl.labelId} className="px-1.5 py-0.5 rounded text-[10px] font-medium border"
                          style={{ backgroundColor: `${cl.label.color}15`, color: cl.label.color, borderColor: `${cl.label.color}30` }}>
                          {cl.label.name}
                        </span>
                      ))}
                    </div>
                  )}
                  {conv.assignedAgent && (
                    <div className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1">
                      <UserIcon className="w-3 h-3" />
                      {conv.assignedAgent.name}
                    </div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right Pane - Chat Window */}
      <div className="flex-1 flex flex-col bg-white/20 dark:bg-black/20 relative">
        {selectedConvId ? (
          <>
            {/* Chat Header */}
            <div className="h-[44px] px-3 border-b border-white/40 dark:border-zinc-800/60 flex items-center justify-between bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl shrink-0 z-20">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/40 dark:to-teal-900/40 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-[10px] uppercase shadow-sm">
                  {selectedConv?.contact?.name ? selectedConv.contact.name.charAt(0) : <UserIcon className="w-3 h-3" />}
                </div>
                <div>
                  <h2 className="font-semibold text-[13px] text-zinc-900 dark:text-zinc-100 leading-none mb-0.5">
                    {selectedConv?.contact?.name || selectedConv?.contact?.externalContactId || 'Unknown Contact'}
                  </h2>
                  <div className="flex items-center gap-1 text-[10px] text-zinc-500 leading-none">
                    <span className="flex w-2 h-2 rounded-full bg-emerald-500"></span>
                    {selectedConv?.channelConnection ? (selectedConv.channelConnection.displayName || selectedConv.channelConnection.phoneNumber) : (selectedConv?.channel === 'whatsapp' ? 'WhatsApp' : selectedConv?.channel)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-zinc-400 relative">
                {/* Agent Assignment Dropdown */}
                <div className="relative">
                  <button 
                    onClick={() => { setShowAssignMenu(!showAssignMenu); setShowLabelsMenu(false); }}
                    className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 text-sm border ${showAssignMenu ? 'bg-primary/10 text-primary border-primary/20' : 'hover:bg-surface-hover border-transparent'}`}
                    title={language === 'en' ? 'Assign Agent' : 'এজেন্ট অ্যাসাইন করুন'}
                  >
                    <UserIcon className="w-4 h-4" />
                    <span className="text-xs font-medium whitespace-nowrap hidden sm:inline-block">
                      {selectedConv?.assignedAgent ? selectedConv.assignedAgent.name : (language === 'en' ? 'Assign' : 'অ্যাসাইন')}
                    </span>
                  </button>
                  {showAssignMenu && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-surface border border-primary/10 shadow-xl shadow-primary/5 hover:border-primary/20 hover:shadow-primary/10 transition-all rounded-xl shadow-xl z-10 overflow-hidden">
                      <div className="p-2 border-b border-surface-hover">
                        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-2">
                          {language === 'en' ? 'Assign Agent' : 'এজেন্ট অ্যাসাইন করুন'}
                        </span>
                      </div>
                      <div className="max-h-64 overflow-y-auto p-1">
                        <button
                          onClick={() => handleAssignAgent(null)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between ${!selectedConv?.assignedAgentId ? 'bg-primary/10 text-primary' : 'hover:bg-surface-hover text-zinc-700 dark:text-zinc-300'}`}
                        >
                          <span>{language === 'en' ? 'Unassigned' : 'আনঅ্যাসাইন'}</span>
                          {!selectedConv?.assignedAgentId && <Check className="w-4 h-4" />}
                        </button>
                        {agents.map(agent => (
                          <button
                            key={agent.id}
                            onClick={() => handleAssignAgent(agent.id)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between ${selectedConv?.assignedAgentId === agent.id ? 'bg-primary/10 text-primary' : 'hover:bg-surface-hover text-zinc-700 dark:text-zinc-300'}`}
                          >
                            <span className="truncate">{agent.name}</span>
                            {selectedConv?.assignedAgentId === agent.id && <Check className="w-4 h-4" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <button 
                  onClick={() => { setShowLabelsMenu(!showLabelsMenu); setShowAssignMenu(false); }}
                  className={`p-2 rounded-lg transition-colors flex items-center gap-1 text-sm ${showLabelsMenu ? 'bg-primary/10 text-primary' : 'hover:bg-surface-hover'}`}
                  title={language === 'en' ? 'Labels' : 'লেবেলস'}
                >
                  <Tag className="w-4 h-4" />
                </button>
                {showLabelsMenu && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[#121214] border border-slate-200 dark:border-zinc-800 rounded-xl shadow-lg z-10 p-2 animate-in fade-in zoom-in duration-200">
                    <div className="text-xs font-bold px-2 py-1.5 text-slate-500 mb-1">
                      {language === 'en' ? 'Toggle Labels' : 'লেবেল পরিবর্তন করুন'}
                    </div>
                    {availableLabels.length === 0 ? (
                      <div className="text-xs px-2 py-2 text-slate-400 text-center">No labels found</div>
                    ) : (
                      availableLabels.map(label => {
                        const isApplied = selectedConv?.labels?.some((cl: any) => cl.labelId === label.id);
                        return (
                          <button
                            key={label.id}
                            onClick={() => handleToggleLabel(label.id)}
                            className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-lg transition-colors text-left text-sm group"
                          >
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: label.color }}></div>
                            <span className="flex-1 truncate text-slate-700 dark:text-zinc-300 group-hover:text-slate-900 dark:group-hover:text-white">
                              {label.name}
                            </span>
                            {isApplied && <Check className="w-3.5 h-3.5 text-primary" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <button className="p-1.5 text-zinc-400 hover:text-primary transition-colors">
                    <Search className="w-4 h-4" />
                  </button>
                  <button onClick={() => setShowLeadInfo(!showLeadInfo)} className={`p-1.5 transition-colors ${showLeadInfo ? 'text-primary' : 'text-zinc-400 hover:text-primary'}`}>
                    <Info className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5 custom-scrollbar bg-slate-50/50 dark:bg-zinc-950/50 bg-grid-pattern relative z-0">
              <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-transparent to-white/40 dark:from-black/40 dark:via-transparent dark:to-black/40 pointer-events-none" />
              
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-zinc-500 font-medium text-[12px] relative z-10">
                  {language === 'en' ? 'Loading messages...' : 'মেসেজ লোড হচ্ছে...'}
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isOutbound = msg.direction === 'outbound';
                  return (
                    <div key={msg.id || idx} className={`flex relative z-10 ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-lg px-2 py-1 shadow-sm text-[12px] relative ${
                        isOutbound 
                          ? 'bg-gradient-to-br from-primary to-emerald-600 text-white rounded-br-none border border-primary/20' 
                          : 'bg-white/95 dark:bg-zinc-800/95 backdrop-blur-md border border-slate-200/60 dark:border-zinc-700/60 text-slate-800 dark:text-zinc-100 rounded-bl-none'
                      }`}>
                        <div className="whitespace-pre-wrap leading-snug flex flex-col">
                          {msg.content?.quotedMsg && (
                            <div className="mb-2 p-2 rounded bg-black/5 dark:bg-white/5 border-l-4 border-primary/50 text-[11px] opacity-80">
                              <div className="font-semibold mb-0.5">{msg.content.quotedMsg.participant?.split('@')[0] || 'Someone'}</div>
                              <div className="truncate max-w-[200px]">{msg.content.quotedMsg.text}</div>
                            </div>
                          )}
                          {msg.type !== 'text' && (
                            <span className="italic opacity-80 text-[11px] block mb-1">
                              [{msg.type} message]
                            </span>
                          )}
                          {msg.content?.thumbnail && !msg.content?.mediaUrl && (
                            <img 
                              src={`data:image/jpeg;base64,${msg.content.thumbnail}`} 
                              alt="Media thumbnail" 
                              onClick={() => setZoomedImage(`data:image/jpeg;base64,${msg.content.thumbnail}`)}
                              className="max-w-[200px] rounded-md mb-2 shadow-sm border border-black/10 dark:border-white/10 cursor-pointer hover:opacity-90 transition-opacity" 
                            />
                          )}
                          {msg.content?.mediaUrl && msg.type === 'image' && (
                            <img 
                              src={msg.content.mediaUrl} 
                              alt="Media image" 
                              onClick={() => setZoomedImage(msg.content.mediaUrl)}
                              className="max-w-[250px] max-h-[250px] object-cover rounded-md mb-2 shadow-sm border border-black/10 dark:border-white/10 cursor-pointer hover:opacity-90 transition-opacity" 
                            />
                          )}
                          {msg.content?.mediaUrl && msg.type === 'video' && (
                            <video 
                              src={msg.content.mediaUrl} 
                              controls
                              className="max-w-[250px] max-h-[250px] rounded-md mb-2 shadow-sm border border-black/10 dark:border-white/10" 
                            />
                          )}
                          <div>
                            {msg.content?.body || msg.content?.text || (typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content))}
                            <span className={`inline-block text-[9px] ml-2 float-right mt-1 opacity-70`}>
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                        {msg.status === 'rate_limited' && (
                          <div className="flex items-center gap-1 text-[10px] text-red-500 mt-1 border-t border-red-500/20 pt-1">
                            <AlertCircle className="w-3 h-3" />
                            {language === 'en' ? 'Blocked: Rate Limit Exceeded (10/min) to prevent ban.' : 'ব্লকড: অ্যাকাউন্ট ব্যান এড়াতে লিমিট ক্রস করায় মেসেজ পাঠানো হয়নি।'}
                          </div>
                        )}
                        {msg.status === 'failed' && (
                          <div className="flex items-center gap-1 text-[10px] text-red-500 mt-1 border-t border-red-500/20 pt-1">
                            <AlertCircle className="w-3 h-3" />
                            {language === 'en' ? 'Failed to send.' : 'পাঠাতে ব্যর্থ হয়েছে।'}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div className="px-2 py-1.5 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl border-t border-white/40 dark:border-zinc-800/60 z-20 flex flex-col">
              {selectedFile && (
                <div className="flex items-center gap-2 mb-2 p-2 bg-surface-hover rounded-md border border-slate-200 dark:border-zinc-800 w-max max-w-full">
                  {selectedFile.type.startsWith('image/') ? (
                    <img src={URL.createObjectURL(selectedFile)} alt="preview" className="h-10 w-10 object-cover rounded shadow-sm" />
                  ) : (
                    <div className="h-10 w-10 bg-primary/10 rounded flex items-center justify-center text-primary">
                      <FileIcon className="w-5 h-5" />
                    </div>
                  )}
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-[11px] font-medium truncate">{selectedFile.name}</span>
                    <span className="text-[9px] text-zinc-500">{(selectedFile.size / 1024).toFixed(1)} KB</span>
                  </div>
                  <button type="button" onClick={() => setSelectedFile(null)} className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-full text-zinc-500 hover:text-red-500 transition-colors ml-2">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <form onSubmit={handleSendMessage} className="flex gap-1.5 max-w-full mx-auto w-full items-end">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*,video/*,application/pdf"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      setSelectedFile(e.target.files[0]);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-zinc-500 hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={language === 'en' ? 'Type a message...' : 'মেসেজ টাইপ করুন...'}
                    className="w-full bg-white/90 dark:bg-zinc-800/90 border border-slate-200 dark:border-zinc-700 shadow-inner rounded-md px-3 py-2 text-[12px] focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary transition-all text-slate-800 dark:text-zinc-100 placeholder:text-slate-400"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!inputText.trim() && !selectedFile}
                  className="bg-gradient-to-r from-primary to-emerald-500 text-white px-3 py-2 rounded-md hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
            
            {/* Lead Details Slide-over Panel */}
            <div className={`absolute top-0 bottom-0 right-0 w-80 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-3xl shadow-2xl border-l border-white/50 dark:border-zinc-800 transform transition-transform duration-300 z-30 flex flex-col ${showLeadInfo ? 'translate-x-0' : 'translate-x-full'}`}>
              <div className="px-3 py-3 border-b border-border flex justify-between items-center bg-background/50 backdrop-blur-md shrink-0 h-[44px]">
                <h2 className="text-[13px] font-bold text-foreground">Lead Details</h2>
                <div className="flex items-center space-x-2">
                  <button onClick={handleUpdateLeadDetails} className="text-[11px] bg-primary text-primary-foreground px-2 py-1 rounded-md font-semibold hover:bg-primary/90">Save Changes</button>
                  <button onClick={() => setShowLeadInfo(false)} className="text-foreground/50 hover:text-foreground p-1"><X className="h-4 w-4" /></button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
                
                <div className="flex items-center space-x-3 pb-3 border-b border-border">
                  <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20">
                    <UserCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[12px] font-bold text-foreground leading-tight truncate">{selectedConv?.contact?.name || 'Unknown'}</h3>
                    <p className="text-[10px] text-foreground/60 truncate">{selectedConv?.contact?.externalContactId}</p>
                  </div>
                </div>

                <div className="bg-white/50 dark:bg-zinc-900/50 rounded-lg p-2.5 border border-slate-200 dark:border-zinc-800 space-y-2.5">
                  <h4 className="text-[9px] font-bold text-foreground/50 uppercase tracking-wider">Status & Assignment</h4>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-foreground/70 mb-1">Stage</label>
                      <select value={editDetails.stageId} onChange={(e) => setEditDetails({...editDetails, stageId: e.target.value})} className="w-full bg-surface border border-slate-200 dark:border-zinc-700 rounded-md py-1 px-1.5 text-[11px] focus:ring-1 focus:ring-primary focus:outline-none">
                        <option value="">Select Stage...</option>
                        {stages.map(stage => <option key={stage.id} value={stage.id}>{stage.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-foreground/70 mb-1">Follow-up</label>
                      <input type="date" value={editDetails.followUpAt} onChange={(e) => setEditDetails({...editDetails, followUpAt: e.target.value})} className="w-full bg-surface border border-slate-200 dark:border-zinc-700 rounded-md py-1 px-1.5 text-[11px] focus:ring-1 focus:outline-none text-foreground" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-foreground/70 mb-1 flex items-center"><UserPlus className="w-3 h-3 mr-1" /> Assigned To</label>
                    <select value={editDetails.assignedUserId} onChange={(e) => setEditDetails({...editDetails, assignedUserId: e.target.value})} className="w-full bg-surface border border-slate-200 dark:border-zinc-700 rounded-md py-1 px-1.5 text-[11px] focus:ring-1 focus:ring-primary focus:outline-none">
                      <option value="">Unassigned</option>
                      {agents.map(tm => <option key={tm.id} value={tm.id}>{tm.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="bg-white/50 dark:bg-zinc-900/50 rounded-lg p-2.5 border border-slate-200 dark:border-zinc-800 space-y-2.5">
                  <h4 className="text-[9px] font-bold text-foreground/50 uppercase tracking-wider">Contact Info</h4>
                  
                  <div>
                    <label className="block text-[11px] font-medium text-foreground/70 mb-1 flex items-center"><Phone className="w-3 h-3 mr-1" /> Phone Number</label>
                    <input type="text" value={editDetails.phone} onChange={(e) => setEditDetails({...editDetails, phone: e.target.value})} placeholder="+123456789" className="w-full bg-surface border border-slate-200 dark:border-zinc-700 rounded-md py-1 px-1.5 text-[11px] focus:ring-1 focus:ring-primary focus:outline-none text-foreground" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-foreground/70 mb-1 flex items-center"><Mail className="w-3 h-3 mr-1" /> Email Address</label>
                    <input type="email" value={editDetails.email} onChange={(e) => setEditDetails({...editDetails, email: e.target.value})} placeholder="email@example.com" className="w-full bg-surface border border-slate-200 dark:border-zinc-700 rounded-md py-1 px-1.5 text-[11px] focus:ring-1 focus:ring-primary focus:outline-none text-foreground" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-foreground/70 mb-1 flex items-center"><Building className="w-3 h-3 mr-1" /> Company Name</label>
                    <input type="text" value={editDetails.company} onChange={(e) => setEditDetails({...editDetails, company: e.target.value})} placeholder="Company Ltd." className="w-full bg-surface border border-slate-200 dark:border-zinc-700 rounded-md py-1 px-1.5 text-[11px] focus:ring-1 focus:ring-primary focus:outline-none text-foreground" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-foreground/70 mb-1 flex items-center"><MapPin className="w-3 h-3 mr-1" /> Address</label>
                    <input type="text" value={editDetails.address} onChange={(e) => setEditDetails({...editDetails, address: e.target.value})} placeholder="Full Address..." className="w-full bg-surface border border-slate-200 dark:border-zinc-700 rounded-md py-1 px-1.5 text-[11px] focus:ring-1 focus:ring-primary focus:outline-none text-foreground" />
                  </div>
                </div>

                <div>
                  <h4 className="text-[9px] font-bold text-foreground/60 mb-2 uppercase tracking-wider flex items-center">
                    <Tag className="w-3 h-3 mr-1" /> Notes
                  </h4>
                  <div className="relative mb-2">
                    <textarea value={noteContent} onChange={(e) => setNoteContent(e.target.value)} placeholder="Type a note..." className="w-full bg-surface border border-slate-200 dark:border-zinc-700 rounded-lg p-2 text-[11px] focus:ring-1 focus:ring-primary focus:outline-none min-h-[60px] resize-none pb-7" />
                    <button onClick={handleSaveNote} className="absolute bottom-1.5 right-1.5 bg-primary text-primary-foreground px-2 py-0.5 rounded text-[9px] font-semibold hover:bg-primary/90">Add</button>
                  </div>
                  <div className="space-y-1.5">
                    {selectedConv?.contact?.notes?.map((note: any) => (
                      <div key={note.id} className="bg-surface border border-slate-200 dark:border-zinc-800 p-2 rounded-lg">
                        <p className="text-[11px] text-foreground/90 whitespace-pre-wrap">{note.content}</p>
                        <p className="text-[9px] text-foreground/40 mt-1">{new Date(note.createdAt).toLocaleString()}</p>
                      </div>
                    ))}
                    {(!selectedConv?.contact?.notes || selectedConv.contact.notes.length === 0) && (
                      <p className="text-[11px] text-center text-foreground/40 py-2">No notes added yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-zinc-400 space-y-4">
            <div className="w-16 h-16 rounded-full bg-surface-hover flex items-center justify-center">
              <MessageSquare className="w-8 h-8 opacity-50" />
            </div>
            <p>{language === 'en' ? 'Select a conversation to start messaging' : 'মেসেজ করা শুরু করতে একটি কনভার্সেশন বেছে নিন'}</p>
          </div>
        )}
      </div>
      {/* Zoomed Image Modal */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm cursor-zoom-out"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full flex items-center justify-center">
            <button 
              className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md transition-all"
              onClick={() => setZoomedImage(null)}
            >
              <X className="w-6 h-6" />
            </button>
            <img 
              src={zoomedImage} 
              className="max-w-full max-h-[90vh] rounded-lg shadow-2xl object-contain ring-1 ring-white/20 cursor-default" 
              alt="Zoomed media" 
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
