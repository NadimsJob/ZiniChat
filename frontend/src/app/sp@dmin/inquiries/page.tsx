'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { Mail, CheckCircle, Clock } from 'lucide-react';
import AdminLoader from '@/components/AdminLoader';
import AdminPagination from '@/components/AdminPagination';

export default function InquiriesPage() {
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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
    return <AdminLoader message="Loading public website inquiries..." />;
  }

  return (
    <div className="p-3 sm:p-6 max-w-6xl mx-auto animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Site Inquiries</h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 mt-1">Manage contact form messages from the public website</p>
        </div>
        <div className="bg-white dark:bg-surface border border-slate-200 dark:border-surface-hover px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium self-start sm:self-auto text-slate-900 dark:text-white shadow-sm">
          Total: {inquiries.length}
        </div>
      </div>

      <div className="bg-white dark:bg-surface border border-slate-200 dark:border-surface-hover rounded-2xl overflow-hidden shadow-sm dark:shadow-xl p-4 space-y-4">
        {inquiries.length === 0 ? (
          <div className="p-8 sm:p-12 text-center text-slate-500 dark:text-zinc-500 text-sm">
            No inquiries found.
          </div>
        ) : (
          <>
            <div className="grid gap-4">
              {inquiries.slice((page - 1) * pageSize, page * pageSize).map((inquiry) => (
                <div key={inquiry.id} className={`bg-slate-50 dark:bg-background border p-4 sm:p-6 rounded-2xl transition-all ${inquiry.status === 'unread' ? 'border-primary shadow-[0_0_15px_rgba(31,130,74,0.1)]' : 'border-slate-200 dark:border-surface-hover'}`}>
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg shrink-0 ${inquiry.status === 'unread' ? 'bg-primary/20 text-primary' : 'bg-slate-200 dark:bg-surface-hover text-slate-600 dark:text-zinc-400'}`}>
                        <Mail className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-slate-900 dark:text-foreground truncate">{inquiry.name}</h3>
                        <a href={`mailto:${inquiry.email}`} className="text-xs sm:text-sm text-secondary hover:underline truncate block font-medium">{inquiry.email}</a>
                      </div>
                    </div>
                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2">
                      <div className="text-[11px] sm:text-xs text-slate-500 dark:text-zinc-500">{format(new Date(inquiry.createdAt), 'PPp')}</div>
                      <select 
                        value={inquiry.status}
                        onChange={(e) => updateStatus(inquiry.id, e.target.value)}
                        className={`text-xs px-3 py-1 rounded-full border outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer ${
                          inquiry.status === 'unread' ? 'bg-red-500/10 text-red-600 border-red-500/20' : 
                          inquiry.status === 'replied' ? 'bg-green-500/10 text-green-600 border-green-500/20' : 
                          'bg-slate-100 dark:bg-surface text-slate-800 dark:text-zinc-300 border-slate-300 dark:border-surface-hover'
                        }`}
                      >
                        <option value="unread">Unread</option>
                        <option value="read">Read</option>
                        <option value="replied">Replied</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-surface rounded-xl p-3 sm:p-4 text-xs sm:text-sm text-slate-900 dark:text-zinc-200 border border-slate-200 dark:border-surface-hover mt-4 whitespace-pre-wrap">
                    {inquiry.message}
                  </div>
                </div>
              ))}
            </div>

            <AdminPagination
              currentPage={page}
              totalItems={inquiries.length}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </>
        )}
      </div>
    </div>
  );
}
