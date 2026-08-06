'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { Mail, CheckCircle, Clock } from 'lucide-react';

export default function InquiriesPage() {
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInquiries();
  }, []);

  const fetchInquiries = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/inquiries`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInquiries(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${process.env.NEXT_PUBLIC_API_URL}/inquiries/${id}/status`, { status }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchInquiries();
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-zinc-500">Loading inquiries...</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto animate-in fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Site Inquiries</h1>
          <p className="text-sm text-zinc-400 mt-1">Manage contact form messages from the public website</p>
        </div>
        <div className="bg-surface border border-surface-hover px-4 py-2 rounded-xl text-sm font-medium">
          Total: {inquiries.length}
        </div>
      </div>

      <div className="grid gap-4">
        {inquiries.length === 0 ? (
          <div className="bg-surface border border-surface-hover rounded-2xl p-12 text-center text-zinc-500">
            No inquiries found.
          </div>
        ) : (
          inquiries.map((inquiry) => (
            <div key={inquiry.id} className={`bg-surface border p-6 rounded-2xl transition-all ${inquiry.status === 'unread' ? 'border-primary shadow-[0_0_15px_rgba(31,130,74,0.1)]' : 'border-surface-hover'}`}>
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${inquiry.status === 'unread' ? 'bg-primary/20 text-primary' : 'bg-surface-hover text-zinc-400'}`}>
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">{inquiry.name}</h3>
                    <a href={`mailto:${inquiry.email}`} className="text-sm text-secondary hover:underline">{inquiry.email}</a>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-zinc-500 mb-2">{format(new Date(inquiry.createdAt), 'PPp')}</div>
                  <select 
                    value={inquiry.status}
                    onChange={(e) => updateStatus(inquiry.id, e.target.value)}
                    className={`text-xs px-3 py-1 rounded-full border outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer ${
                      inquiry.status === 'unread' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
                      inquiry.status === 'replied' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 
                      'bg-surface text-zinc-300 border-surface-hover'
                    }`}
                  >
                    <option value="unread">Unread</option>
                    <option value="read">Read</option>
                    <option value="replied">Replied</option>
                  </select>
                </div>
              </div>
              
              <div className="bg-background rounded-xl p-4 text-sm text-zinc-300 border border-surface-hover mt-4 whitespace-pre-wrap">
                {inquiry.message}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
