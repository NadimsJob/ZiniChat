'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { Mail, CheckCircle, Clock, Search, Paperclip, Send, AlertCircle, Plus, X, Info } from 'lucide-react';
import { useLanguage } from '@/components/LanguageProvider';
import toast from 'react-hot-toast';
import Cookies from 'js-cookie';

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
      const token = Cookies.get('access_token');
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/tickets`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTickets(res.data);

      // Auto mark ticket notifications as read
      axios.post(`${process.env.NEXT_PUBLIC_API_URL}/tickets/mark-read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => {});

      // Check URL query for ticket ID
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const ticketId = urlParams.get('id');
        if (ticketId) {
          fetchTicketDetails(ticketId);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

 const fetchTicketDetails = async (id: string) => {
 try {
 const token = Cookies.get('access_token');
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
 const token = Cookies.get('access_token');
 const formData = new FormData();
 formData.append('subject', newSubject);
 formData.append('type', newType);
 formData.append('priority', newPriority);
 formData.append('message', newMessage);
 if (newFile) formData.append('file', newFile);

 await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/tickets`, formData, {
 headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
 });
 
 toast.success(language === 'en' ? 'Ticket created successfully!' : 'সফলভাবে টিকিট তৈরি হয়েছে!');
 setIsNewTicketOpen(false);
 setNewSubject('');
 setNewType('General');
 setNewMessage('');
 setNewFile(null);
 fetchTickets();
 } catch (error: any) {
 console.error(error);
 toast.error(error.response?.data?.message || (language === 'en' ? 'Failed to create ticket' : 'টিকিট তৈরি করতে ব্যর্থ হয়েছে'));
 } finally {
 setCreating(false);
 }
 };

 const handleSendReply = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!replyMessage.trim() && !replyFile) return;
 
 setSending(true);
 try {
 const token = Cookies.get('access_token');
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

 if (loading) return <div className="p-8 text-center text-muted-foreground">Loading support...</div>;

  return (
  <div className="p-2 md:p-3 w-full animate-in fade-in h-[calc(100vh-64px)] flex flex-col gap-2 relative">
   {/* Compact Instruction Header */}
   <div className="bg-primary/10 border border-primary/20 rounded-lg p-2 flex gap-2 items-center shadow-sm shrink-0">
     <div className="bg-primary text-white p-1 rounded-md shrink-0">
       <Info className="w-4 h-4" />
     </div>
     <div className="flex-1 min-w-0">
       <p className="text-[11px] text-foreground/90 leading-tight">
         <span className="font-bold text-primary mr-1">
           {language === 'en' ? 'Support Center Instructions:' : 'সাপোর্ট সেন্টার নির্দেশনা:'}
         </span>
         {language === 'en' 
           ? 'Create support tickets for billing, integrations, or AI training. Click "+" to submit a ticket.' 
           : 'পেমেন্ট, চ্যানেল কানেকশন বা অন্য সমস্যার জন্য নতুন টিকিট তৈরি করতে "+" বাটনে ক্লিক করুন।'}
       </p>
     </div>
   </div>

   <div className="flex-1 flex gap-3 min-h-0">
  {/* Left List */}
  <div className={`flex-1 md:max-w-xs flex flex-col bg-card border border-border rounded-xl overflow-hidden ${selectedTicket ? 'hidden md:flex' : 'flex'}`}>
  <div className="p-3 border-b border-border flex justify-between items-center bg-muted/50">
  <div>
  <h1 className="text-[14px] font-bold text-foreground">{language === 'en' ? 'Support Tickets' : 'সাপোর্ট টিকিট'}</h1>
  <p className="text-[11px] text-muted-foreground">{language === 'en' ? 'Manage your requests' : 'আপনার রিকোয়েস্ট ম্যানেজ করুন'}</p>
  </div>
  <button 
  onClick={() => setIsNewTicketOpen(true)}
  className="bg-primary text-white p-1.5 rounded-lg hover:bg-primary/90 transition-colors"
  title={language === 'en' ? 'New Ticket' : 'নতুন টিকিট'}
  >
  <Plus className="w-4 h-4" />
  </button>
  </div>
  
  <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
  {tickets.length === 0 ? (
  <div className="text-center py-8 text-muted-foreground text-[12px]">{language === 'en' ? 'No tickets found.' : 'কোনো টিকিট পাওয়া যায়নি'}</div>
  ) : (
  tickets.map(ticket => (
  <div 
  key={ticket.id} 
  onClick={() => fetchTicketDetails(ticket.id)}
  className={`p-2.5 rounded-lg border cursor-pointer transition-all ${selectedTicket?.id === ticket.id ? 'bg-primary/5 border-primary/30 shadow-sm' : 'bg-card hover:bg-muted border-border'}`}
  >
  <div className="flex justify-between items-start mb-1">
  <div className="text-[12px] font-semibold truncate flex-1 text-foreground">{ticket.subject}</div>
  <div className={`text-[9px] px-1.5 py-0.5 font-bold rounded-full uppercase ml-1 ${ticket.status === 'open' ? 'bg-red-500/10 text-red-500' : ticket.status === 'answered' ? 'bg-blue-500/10 text-blue-500' : 'bg-muted text-muted-foreground'}`}>
  {ticket.status}
  </div>
  </div>
  <div className="flex justify-between items-center text-[10px] text-muted-foreground">
  <div className="flex gap-1.5 items-center">
  <span className="capitalize bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{ticket.priority}</span>
  <span className="text-muted-foreground/60">{ticket.type}</span>
  </div>
  <span>{format(new Date(ticket.createdAt), 'MMM d')}</span>
  </div>
  </div>
  ))
  )}
  </div>
  </div>
 
  {/* Right Detail Pane */}
  {selectedTicket ? (
  <div className="flex-1 flex flex-col bg-card border border-border rounded-xl overflow-hidden">
  {/* Header */}
  <div className="p-3 border-b border-border bg-muted/50 flex items-center justify-between gap-3">
  <div className="flex items-center gap-2">
  <button className="md:hidden text-muted-foreground hover:text-foreground" onClick={() => setSelectedTicket(null)}><X className="w-4 h-4"/></button>
  <div>
  <h2 className="text-[13px] font-bold text-foreground">{selectedTicket.subject}</h2>
  <span className="text-[10px] text-muted-foreground">{selectedTicket.type}</span>
  </div>
  </div>
  <div className={`text-[10px] px-2 py-0.5 font-bold rounded-full uppercase ${selectedTicket.status === 'open' ? 'bg-red-500/10 text-red-500' : selectedTicket.status === 'answered' ? 'bg-blue-500/10 text-blue-500' : 'bg-muted text-muted-foreground'}`}>
  {selectedTicket.status}
  </div>
  </div>
 
  {/* Messages Thread */}
  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/5">
  {selectedTicket.messages?.map((msg: any) => (
  <div key={msg.id} className={`flex gap-2.5 ${msg.senderType === 'tenant' ? 'flex-row-reverse' : ''}`}>
  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${msg.senderType === 'admin' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
  {msg.senderType === 'admin' ? <CheckCircle className="w-3.5 h-3.5"/> : <AlertCircle className="w-3.5 h-3.5"/>}
  </div>
  <div className={`max-w-[80%] ${msg.senderType === 'tenant' ? 'items-end flex flex-col' : ''}`}>
  <div className="text-[10px] text-muted-foreground mb-0.5 flex items-center gap-1.5">
  <span className="font-semibold text-foreground">{msg.senderType === 'admin' ? msg.sender?.name || 'Support Team' : language === 'en' ? 'You' : 'আপনি'}</span>
  <span>{format(new Date(msg.createdAt), 'p')}</span>
  </div>
  <div className={`text-[12px] p-3 rounded-xl whitespace-pre-wrap leading-relaxed shadow-sm ${msg.senderType === 'tenant' ? 'bg-primary text-primary-foreground rounded-tr-none' : 'bg-card border border-border text-foreground rounded-tl-none'}`}>
  {msg.message}
  </div>
  {msg.attachmentUrl && (
  <a href={(process.env.NEXT_PUBLIC_API_URL || '').replace('/api', '') + msg.attachmentUrl} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] text-primary bg-primary/10 px-2.5 py-1 rounded-md hover:bg-primary/20 transition-colors">
  <Paperclip className="w-3 h-3" /> {language === 'en' ? 'View Attachment' : 'অ্যাটাচমেন্ট দেখুন'}
  </a>
  )}
  </div>
  </div>
  ))}
  </div>
 
  {/* Reply Box */}
  {selectedTicket.status !== 'closed' && (
  <div className="p-3 bg-card border-t border-border">
  <form onSubmit={handleSendReply} className="flex gap-2 items-end">
  <button 
  type="button" 
  onClick={() => document.getElementById('reply-file')?.click()}
  className="p-2 bg-muted border border-border rounded-lg text-muted-foreground hover:text-foreground transition-colors shrink-0 mb-0.5 cursor-pointer"
  title="Attach file"
  >
  <Paperclip className="w-4 h-4" />
  </button>
  <input type="file" id="reply-file" className="hidden" onChange={(e) => setReplyFile(e.target.files?.[0] || null)} />
  
  <div className="flex-1 flex flex-col gap-1">
  {replyFile && (
  <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 bg-muted px-2 py-0.5 rounded w-max">
  <Paperclip className="w-3 h-3 text-primary" /> {replyFile.name}
  <button type="button" onClick={() => setReplyFile(null)} className="text-red-500 hover:text-red-700 ml-1 font-bold">×</button>
  </div>
  )}
  <textarea 
  value={replyMessage}
  onChange={(e) => setReplyMessage(e.target.value)}
  placeholder={language === 'en' ? 'Type your reply...' : 'আপনার মেসেজ লিখুন...'}
  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-[12px] outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none text-foreground"
  rows={2}
  />
  </div>
 
  <button 
  type="submit" 
  disabled={sending || (!replyMessage.trim() && !replyFile)}
  className="bg-primary text-white p-2.5 rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors shrink-0 mb-0.5 cursor-pointer"
  >
  <Send className="w-4 h-4" />
  </button>
  </form>
  </div>
  )}
  </div>
  ) : (
  <div className="hidden md:flex flex-1 bg-card border border-border rounded-xl items-center justify-center text-muted-foreground">
  <div className="text-center">
  <Mail className="w-10 h-10 mx-auto mb-2 opacity-30 text-primary" />
  <p className="text-[12px] font-medium">{language === 'en' ? 'Select a ticket to view conversation' : 'মেসেজ দেখতে একটি টিকিট সিলেক্ট করুন'}</p>
  </div>
  </div>
  )}
  </div>

  {/* New Ticket Modal */}
  {isNewTicketOpen && (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
  <div className="bg-surface border border-surface-hover rounded-2xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
  <div className="p-5 border-b border-surface-hover flex justify-between items-center bg-background shrink-0">
  <h3 className="text-[15px] font-bold text-foreground">{language === 'en' ? 'Create Support Ticket' : 'নতুন সাপোর্ট টিকিট'}</h3>
  <button type="button" onClick={() => setIsNewTicketOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5"/></button>
  </div>
  <form onSubmit={handleCreateTicket} className="flex flex-col overflow-hidden">
  <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar">
 <div>
 <label className="block text-[12px] text-muted-foreground mb-1">{language === 'en' ? 'Subject' : 'বিষয়'}</label>
 <input 
 type="text"
 required
 value={newSubject}
 onChange={e => setNewSubject(e.target.value)}
 className="w-full bg-background border border-surface-hover rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-primary text-foreground"
 />
 </div>
 <div>
 <label className="block text-[12px] text-muted-foreground mb-1">{language === 'en' ? 'Service / Type' : 'সার্ভিস / ধরন'}</label>
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
 <label className="block text-[12px] text-muted-foreground mb-1">{language === 'en' ? 'Priority' : 'গুরুত্ব'}</label>
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
 <label className="block text-[12px] text-muted-foreground mb-1">{language === 'en' ? 'Message' : 'মেসেজ'}</label>
 <textarea 
 required
 rows={4}
 value={newMessage}
 onChange={e => setNewMessage(e.target.value)}
 className="w-full bg-background border border-surface-hover rounded-xl px-4 py-3 text-[13px] outline-none focus:border-primary resize-none text-foreground"
 />
 </div>
 <div>
 <label className="block text-[12px] text-muted-foreground mb-1">{language === 'en' ? 'Attachment (Optional)' : 'অ্যাটাচমেন্ট (অপশনাল)'}</label>
 <input 
 type="file"
 onChange={e => setNewFile(e.target.files?.[0] || null)}
 className="w-full text-[12px] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[12px] file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 text-muted-foreground"
 />
 </div>
  </div>
  <div className="p-5 border-t border-surface-hover bg-background flex justify-end gap-3 shrink-0">
  <button 
  type="button" 
  onClick={() => setIsNewTicketOpen(false)}
  className="px-4 py-2 rounded-xl text-[13px] text-zinc-400 hover:text-white transition-colors"
  >
  {language === 'en' ? 'Cancel' : 'ক্যান্সেল'}
  </button>
  <button 
  type="submit" 
  disabled={creating}
  className="px-6 py-2 rounded-xl bg-primary text-white text-[13px] font-medium hover:bg-primary-hover disabled:opacity-50 transition-colors"
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
