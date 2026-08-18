'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { format } from 'date-fns';
import { Mail, CheckCircle, Clock, Search, Paperclip, Send, AlertCircle, X } from 'lucide-react';
import AdminLoader from '@/components/AdminLoader';
import AdminPagination from '@/components/AdminPagination';

export default function SuperadminTicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [replyFile, setReplyFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchTickets();
    fetchAdmins();
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

  const fetchAdmins = async () => {
    try {
      const token = Cookies.get('access_token');
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/tickets/admins`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAdmins(res.data);
    } catch (error) {
      console.error(error);
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

  const updateStatus = async (id: string, status: string) => {
    try {
      const token = Cookies.get('access_token');
      await axios.patch(`${process.env.NEXT_PUBLIC_API_URL}/tickets/${id}/status`, { status }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchTickets();
      if (selectedTicket?.id === id) {
        fetchTicketDetails(id);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const assignTicket = async (id: string, assignedToId: string | null) => {
    try {
      const token = Cookies.get('access_token');
      await axios.patch(`${process.env.NEXT_PUBLIC_API_URL}/tickets/${id}/assign`, { assignedToId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchTickets();
      if (selectedTicket?.id === id) {
        fetchTicketDetails(id);
      }
    } catch (error) {
      console.error(error);
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

  if (loading) return <AdminLoader message="Loading support tickets thread..." />;

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto animate-in fade-in h-[calc(100vh-60px)] md:h-[calc(100vh-80px)] flex flex-col md:flex-row gap-4 md:gap-6">
      {/* Left List */}
      <div className={`flex-1 flex flex-col bg-white dark:bg-surface border border-slate-200 dark:border-surface-hover rounded-2xl overflow-hidden shadow-sm dark:shadow-xl ${selectedTicket ? 'hidden md:flex md:max-w-md' : 'flex'}`}>
        <div className="p-5 border-b border-slate-200 dark:border-surface-hover">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Support Tickets</h1>
          <p className="text-[13px] text-slate-600 dark:text-zinc-400 mt-1">Manage tenant support requests</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {tickets.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-zinc-500 text-[13px]">No tickets found.</div>
          ) : (
            tickets.slice((page - 1) * pageSize, page * pageSize).map(ticket => (
              <div 
                key={ticket.id} 
                onClick={() => fetchTicketDetails(ticket.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedTicket?.id === ticket.id ? 'bg-primary/10 border-primary/30' : 'bg-slate-50 dark:bg-background hover:bg-slate-100 dark:hover:bg-surface-hover border-slate-200 dark:border-surface-hover'}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="text-[13px] font-semibold truncate flex-1 text-slate-900 dark:text-foreground">{ticket.subject}</div>
                  <div className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ml-2 ${ticket.status === 'open' ? 'bg-red-500/10 text-red-600 dark:text-red-400' : ticket.status === 'answered' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'bg-slate-200 dark:bg-zinc-500/10 text-slate-600 dark:text-zinc-400'}`}>
                    {ticket.status}
                  </div>
                </div>
                <div className="flex justify-between items-center text-[12px] text-slate-500 dark:text-zinc-500">
                  <div className="flex flex-col gap-0.5">
                    <span className="truncate max-w-[120px] font-medium text-slate-700 dark:text-zinc-400">{ticket.tenant?.businessName}</span>
                    <span className="text-[10px] text-slate-500 dark:text-zinc-400">{ticket.type}</span>
                  </div>
                  <span className="text-[11px] text-slate-400 dark:text-zinc-500">{format(new Date(ticket.createdAt), 'MMM d')}</span>
                </div>
                {ticket.assignedTo && (
                  <div className="mt-2 text-[10px] font-bold bg-primary/10 text-primary px-2 py-1 rounded-md inline-block">
                    Assigned: {ticket.assignedTo.name}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <AdminPagination
          currentPage={page}
          totalItems={tickets.length}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* Right Detail Pane */}
      {selectedTicket && (
        <div className="flex-[2] flex flex-col bg-white dark:bg-surface border border-slate-200 dark:border-surface-hover rounded-2xl overflow-hidden shadow-sm dark:shadow-xl">
          {/* Header */}
          <div className="p-5 border-b border-slate-200 dark:border-surface-hover bg-slate-50/80 dark:bg-background flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <button className="md:hidden text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white" onClick={() => setSelectedTicket(null)}><X className="w-5 h-5"/></button>
                <div>
                  <h2 className="text-[15px] font-bold text-slate-900 dark:text-foreground">{selectedTicket.subject}</h2>
                  <span className="text-[11px] font-semibold text-primary">{selectedTicket.type}</span>
                </div>
              </div>
              <div className="text-[12px] text-slate-600 dark:text-zinc-400 flex items-center gap-2">
                <span className="font-semibold text-slate-800 dark:text-zinc-200">{selectedTicket.tenant?.businessName}</span>
                <span>•</span>
                <span>{format(new Date(selectedTicket.createdAt), 'PP p')}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <select 
                value={selectedTicket.assignedToId || ''} 
                onChange={(e) => assignTicket(selectedTicket.id, e.target.value || null)}
                className="text-[12px] bg-slate-100 dark:bg-surface border border-slate-300 dark:border-surface-hover rounded-lg px-3 py-2 outline-none focus:border-primary text-slate-900 dark:text-foreground cursor-pointer"
              >
                <option value="">Unassigned</option>
                {admins.map(admin => (
                  <option key={admin.id} value={admin.id}>{admin.name}</option>
                ))}
              </select>

              <select 
                value={selectedTicket.status} 
                onChange={(e) => updateStatus(selectedTicket.id, e.target.value)}
                className="text-[12px] bg-slate-100 dark:bg-surface border border-slate-300 dark:border-surface-hover rounded-lg px-3 py-2 outline-none focus:border-primary text-slate-900 dark:text-foreground cursor-pointer"
              >
                <option value="open">Open</option>
                <option value="answered">Answered</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>

          {/* Messages Thread */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {selectedTicket.messages?.map((msg: any) => (
              <div key={msg.id} className={`flex gap-4 ${msg.senderType === 'admin' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.senderType === 'admin' ? 'bg-primary/20 text-primary' : 'bg-slate-200 dark:bg-surface-hover text-slate-600 dark:text-zinc-400'}`}>
                  {msg.senderType === 'admin' ? <CheckCircle className="w-4 h-4"/> : <AlertCircle className="w-4 h-4"/>}
                </div>
                <div className={`max-w-[75%] ${msg.senderType === 'admin' ? 'items-end flex flex-col' : ''}`}>
                  <div className="text-[12px] text-slate-500 dark:text-zinc-500 mb-1 flex items-center gap-2">
                    <span className="font-medium text-slate-800 dark:text-zinc-300">{msg.senderType === 'admin' ? msg.sender?.name || 'Admin' : selectedTicket.tenant?.businessName}</span>
                    <span>{format(new Date(msg.createdAt), 'p')}</span>
                  </div>
                  <div className={`text-[13px] p-4 rounded-2xl whitespace-pre-wrap ${msg.senderType === 'admin' ? 'bg-primary text-white rounded-tr-none shadow-md' : 'bg-slate-100 dark:bg-surface-hover border border-slate-200 dark:border-surface-hover text-slate-900 dark:text-zinc-200 rounded-tl-none'}`}>
                    {msg.message}
                  </div>
                  {msg.attachmentUrl && (
                    <a href={(process.env.NEXT_PUBLIC_API_URL || '').replace('/api', '') + msg.attachmentUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-2 text-[12px] text-primary bg-primary/10 px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-colors">
                      <Paperclip className="w-3.5 h-3.5" /> View Attachment
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Reply Box */}
          <div className="p-4 bg-slate-50/80 dark:bg-background border-t border-slate-200 dark:border-surface-hover">
            <form onSubmit={handleSendReply} className="flex gap-3">
              <button 
                type="button" 
                onClick={() => document.getElementById('reply-file')?.click()}
                className="p-3 bg-white dark:bg-surface border border-slate-300 dark:border-surface-hover rounded-xl text-slate-500 dark:text-zinc-400 hover:text-primary transition-colors shrink-0 cursor-pointer"
              >
                <Paperclip className="w-5 h-5" />
              </button>
              <input type="file" id="reply-file" className="hidden" onChange={(e) => setReplyFile(e.target.files?.[0] || null)} />
              
              <div className="flex-1 flex flex-col gap-2">
                {replyFile && (
                  <div className="text-[12px] text-slate-600 dark:text-zinc-400 flex items-center gap-2">
                    <Paperclip className="w-3 h-3" /> {replyFile.name}
                    <button type="button" onClick={() => setReplyFile(null)} className="text-red-500 hover:text-red-600 cursor-pointer">Remove</button>
                  </div>
                )}
                <textarea 
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Type your reply..."
                  className="w-full bg-white dark:bg-surface border border-slate-300 dark:border-surface-hover rounded-xl px-4 py-3 text-[13px] outline-none focus:border-primary resize-none text-slate-900 dark:text-foreground placeholder:text-slate-400 dark:placeholder:text-zinc-500"
                  rows={2}
                />
              </div>

              <button 
                type="submit" 
                disabled={sending || (!replyMessage.trim() && !replyFile)}
                className="bg-primary text-white p-3 rounded-xl hover:bg-primary-hover disabled:opacity-50 transition-colors shrink-0 h-fit cursor-pointer shadow-md"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
