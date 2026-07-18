'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { Mail, CheckCircle, Clock, Search, Paperclip, Send, AlertCircle, Plus, X } from 'lucide-react';
import { useLanguage } from '@/components/LanguageProvider';

export default function TenantSupportPage() {
  const { language } = useLanguage();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [replyFile, setReplyFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);

  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newType, setNewType] = useState('General');
  const [newPriority, setNewPriority] = useState('medium');
  const [newMessage, setNewMessage] = useState('');
  const [newFile, setNewFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/tickets`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTickets(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTicketDetails = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/tickets/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedTicket(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newMessage.trim()) return;
    
    setCreating(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('subject', newSubject);
      formData.append('type', newType);
      formData.append('priority', newPriority);
      formData.append('message', newMessage);
      if (newFile) formData.append('file', newFile);

      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/tickets`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      
      setIsNewTicketOpen(false);
      setNewSubject('');
      setNewType('General');
      setNewMessage('');
      setNewFile(null);
      fetchTickets();
    } catch (error) {
      console.error(error);
    } finally {
      setCreating(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim() && !replyFile) return;
    
    setSending(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      if (replyMessage.trim()) formData.append('message', replyMessage);
      if (replyFile) formData.append('file', replyFile);

      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/tickets/${selectedTicket.id}/messages`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      
      setReplyMessage('');
      setReplyFile(null);
      fetchTicketDetails(selectedTicket.id);
      fetchTickets();
    } catch (error) {
      console.error(error);
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-zinc-500">Loading support...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto animate-in fade-in h-[calc(100vh-80px)] flex gap-6 relative">
      {/* Left List */}
      <div className={`flex-1 flex flex-col bg-surface border border-surface-hover rounded-2xl overflow-hidden ${selectedTicket ? 'hidden md:flex md:max-w-md' : 'flex'}`}>
        <div className="p-5 border-b border-surface-hover flex justify-between items-center bg-background">
          <div>
            <h1 className="text-xl font-bold">{language === 'en' ? 'Support' : 'সাপোর্ট'}</h1>
            <p className="text-[13px] text-zinc-400 mt-1">{language === 'en' ? 'Need help? Contact support' : 'যেকোনো প্রয়োজনে যোগাযোগ করুন'}</p>
          </div>
          <button 
            onClick={() => setIsNewTicketOpen(true)}
            className="bg-primary/10 text-primary p-2 rounded-xl hover:bg-primary hover:text-white transition-colors"
            title="New Ticket"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {tickets.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 text-[13px]">{language === 'en' ? 'No tickets found.' : 'কোনো টিকিট পাওয়া যায়নি'}</div>
          ) : (
            tickets.map(ticket => (
              <div 
                key={ticket.id} 
                onClick={() => fetchTicketDetails(ticket.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedTicket?.id === ticket.id ? 'bg-primary/5 border-primary/20' : 'bg-background hover:bg-surface-hover border-surface-hover'}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="text-[13px] font-semibold truncate flex-1 text-foreground">{ticket.subject}</div>
                  <div className={`text-[10px] px-2 py-0.5 rounded-full uppercase ml-2 ${ticket.status === 'open' ? 'bg-red-500/10 text-red-500' : ticket.status === 'answered' ? 'bg-blue-500/10 text-blue-500' : 'bg-zinc-500/10 text-zinc-400'}`}>
                    {ticket.status}
                  </div>
                </div>
                <div className="flex justify-between items-center text-[12px] text-zinc-500">
                  <div className="flex gap-2 items-center">
                    <span className="capitalize text-[10px] bg-surface-hover px-2 py-0.5 rounded-full">{ticket.priority}</span>
                    <span className="text-[10px] text-zinc-400">{ticket.type}</span>
                  </div>
                  <span>{format(new Date(ticket.createdAt), 'MMM d, yyyy')}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Detail Pane */}
      {selectedTicket && (
        <div className="flex-[2] flex flex-col bg-surface border border-surface-hover rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="p-5 border-b border-surface-hover bg-background flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button className="md:hidden text-zinc-400 hover:text-white" onClick={() => setSelectedTicket(null)}><X className="w-5 h-5"/></button>
              <div>
                <h2 className="text-[15px] font-bold text-foreground">{selectedTicket.subject}</h2>
                <span className="text-[11px] text-zinc-400">{selectedTicket.type}</span>
              </div>
            </div>
            <div className={`text-[10px] px-2 py-0.5 rounded-full uppercase ${selectedTicket.status === 'open' ? 'bg-red-500/10 text-red-500' : selectedTicket.status === 'answered' ? 'bg-blue-500/10 text-blue-500' : 'bg-zinc-500/10 text-zinc-400'}`}>
              {selectedTicket.status}
            </div>
          </div>

          {/* Messages Thread */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {selectedTicket.messages?.map((msg: any) => (
              <div key={msg.id} className={`flex gap-4 ${msg.senderType === 'tenant' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.senderType === 'admin' ? 'bg-primary/20 text-primary' : 'bg-surface-hover text-zinc-400'}`}>
                  {msg.senderType === 'admin' ? <CheckCircle className="w-4 h-4"/> : <AlertCircle className="w-4 h-4"/>}
                </div>
                <div className={`max-w-[75%] ${msg.senderType === 'tenant' ? 'items-end flex flex-col' : ''}`}>
                  <div className="text-[12px] text-zinc-500 mb-1 flex items-center gap-2">
                    <span className="font-medium text-zinc-300">{msg.senderType === 'admin' ? msg.sender?.name || 'Support Team' : language === 'en' ? 'You' : 'আপনি'}</span>
                    <span>{format(new Date(msg.createdAt), 'p')}</span>
                  </div>
                  <div className={`text-[13px] p-4 rounded-2xl whitespace-pre-wrap ${msg.senderType === 'tenant' ? 'bg-primary text-white rounded-tr-none' : 'bg-surface-hover border border-surface-hover text-zinc-200 rounded-tl-none'}`}>
                    {msg.message}
                  </div>
                  {msg.attachmentUrl && (
                    <a href={(process.env.NEXT_PUBLIC_API_URL || '').replace('/api', '') + msg.attachmentUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-2 text-[12px] text-primary bg-primary/10 px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-colors">
                      <Paperclip className="w-3.5 h-3.5" /> {language === 'en' ? 'View Attachment' : 'অ্যাটাচমেন্ট দেখুন'}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Reply Box */}
          {selectedTicket.status !== 'closed' && (
            <div className="p-4 bg-background border-t border-surface-hover">
              <form onSubmit={handleSendReply} className="flex gap-3">
                <button 
                  type="button" 
                  onClick={() => document.getElementById('reply-file')?.click()}
                  className="p-3 bg-surface border border-surface-hover rounded-xl text-zinc-400 hover:text-primary transition-colors shrink-0"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <input type="file" id="reply-file" className="hidden" onChange={(e) => setReplyFile(e.target.files?.[0] || null)} />
                
                <div className="flex-1 flex flex-col gap-2">
                  {replyFile && (
                    <div className="text-[12px] text-zinc-400 flex items-center gap-2">
                      <Paperclip className="w-3 h-3" /> {replyFile.name}
                      <button type="button" onClick={() => setReplyFile(null)} className="text-red-400 hover:text-red-300">Remove</button>
                    </div>
                  )}
                  <textarea 
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder={language === 'en' ? 'Type your reply...' : 'আপনার মেসেজ লিখুন...'}
                    className="w-full bg-surface border border-surface-hover rounded-xl px-4 py-3 text-[13px] outline-none focus:border-primary resize-none text-foreground"
                    rows={2}
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={sending || (!replyMessage.trim() && !replyFile)}
                  className="bg-primary text-white p-3 rounded-xl hover:bg-primary-hover disabled:opacity-50 transition-colors shrink-0 h-fit"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          )}
        </div>
      )}
      
      {!selectedTicket && tickets.length > 0 && (
        <div className="hidden md:flex flex-[2] bg-surface border border-surface-hover rounded-2xl items-center justify-center text-zinc-500">
          <div className="text-center">
            <Mail className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>{language === 'en' ? 'Select a ticket to view details' : 'বিস্তারিত দেখতে একটি টিকিট নির্বাচন করুন'}</p>
          </div>
        </div>
      )}

      {/* New Ticket Modal */}
      {isNewTicketOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-surface-hover rounded-2xl max-w-md w-full overflow-hidden">
            <div className="p-5 border-b border-surface-hover flex justify-between items-center bg-background">
              <h3 className="text-[15px] font-bold">{language === 'en' ? 'Create Support Ticket' : 'নতুন সাপোর্ট টিকিট'}</h3>
              <button onClick={() => setIsNewTicketOpen(false)} className="text-zinc-400 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleCreateTicket} className="p-5 space-y-4">
              <div>
                <label className="block text-[12px] text-zinc-400 mb-1">{language === 'en' ? 'Subject' : 'বিষয়'}</label>
                <input 
                  type="text"
                  required
                  value={newSubject}
                  onChange={e => setNewSubject(e.target.value)}
                  className="w-full bg-background border border-surface-hover rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-primary text-foreground"
                />
              </div>
              <div>
                <label className="block text-[12px] text-zinc-400 mb-1">{language === 'en' ? 'Service / Type' : 'সার্ভিস / ধরন'}</label>
                <select 
                  value={newType}
                  onChange={e => setNewType(e.target.value)}
                  className="w-full bg-background border border-surface-hover rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-primary text-foreground"
                >
                  <option value="General">General Query</option>
                  <option value="Billing">Billing & Subscription</option>
                  <option value="WhatsApp Integration">WhatsApp Integration</option>
                  <option value="Messenger Integration">Messenger Integration</option>
                  <option value="AI Training">AI Training & Knowledge Base</option>
                  <option value="Technical Bug">Technical Bug / Issue</option>
                </select>
              </div>
              <div>
                <label className="block text-[12px] text-zinc-400 mb-1">{language === 'en' ? 'Priority' : 'গুরুত্ব'}</label>
                <select 
                  value={newPriority}
                  onChange={e => setNewPriority(e.target.value)}
                  className="w-full bg-background border border-surface-hover rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-primary text-foreground"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="block text-[12px] text-zinc-400 mb-1">{language === 'en' ? 'Message' : 'মেসেজ'}</label>
                <textarea 
                  required
                  rows={4}
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  className="w-full bg-background border border-surface-hover rounded-xl px-4 py-3 text-[13px] outline-none focus:border-primary resize-none text-foreground"
                />
              </div>
              <div>
                <label className="block text-[12px] text-zinc-400 mb-1">{language === 'en' ? 'Attachment (Optional)' : 'অ্যাটাচমেন্ট (অপশনাল)'}</label>
                <input 
                  type="file"
                  onChange={e => setNewFile(e.target.files?.[0] || null)}
                  className="w-full text-[12px] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[12px] file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                />
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsNewTicketOpen(false)}
                  className="px-4 py-2 rounded-xl text-[13px] text-zinc-400 hover:text-white"
                >
                  {language === 'en' ? 'Cancel' : 'ক্যান্সেল'}
                </button>
                <button 
                  type="submit" 
                  disabled={creating}
                  className="px-6 py-2 rounded-xl bg-primary text-white text-[13px] font-medium hover:bg-primary-hover disabled:opacity-50"
                >
                  {creating ? (language === 'en' ? 'Creating...' : 'তৈরি হচ্ছে...') : (language === 'en' ? 'Submit Ticket' : 'সাবমিট করুন')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
