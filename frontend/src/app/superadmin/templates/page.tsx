'use client';

import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { MessageSquare, Check, X, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLanguage } from '@/components/LanguageProvider';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function SuperadminTemplatesPage() {
  const { language } = useLanguage();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/broadcasts/admin/templates`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/broadcasts/admin/templates/${id}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        toast.success(language === 'en' ? `Template marked as ${status}` : `টেমপ্লেট ${status} করা হয়েছে`);
        fetchTemplates();
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  if (loading) {
    return <div className="p-6 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4 p-4 animate-in fade-in duration-500">
      <div className="flex justify-between items-center bg-white dark:bg-[#0f0f11] border border-slate-200 dark:border-zinc-800 p-4 rounded-2xl">
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2 text-primary">
            <MessageSquare className="w-5 h-5" /> 
            {language === 'en' ? 'Message Templates Approval' : 'মেসেজ টেমপ্লেটস অ্যাপ্রুভাল'}
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            {language === 'en' ? 'Review and approve WhatsApp message templates from tenants.' : 'টেন্যান্টদের হোয়াটসঅ্যাপ টেমপ্লেট রিভিউ ও অ্যাপ্রুভ করুন।'}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#0f0f11] border border-slate-200 dark:border-zinc-800 rounded-2xl p-4">
        <div className="space-y-4">
          {templates.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 text-[13px]">
              {language === 'en' ? 'No templates found.' : 'কোনো টেমপ্লেট পাওয়া যায়নি।'}
            </div>
          ) : (
            templates.map((template) => (
              <div key={template.id} className="p-4 border border-slate-200 dark:border-zinc-800 rounded-xl">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-[14px]">{template.name}</h3>
                    <p className="text-[12px] text-zinc-500">
                      Tenant: {template.tenant?.businessName || 'Unknown'} &bull; Category: {template.category}
                    </p>
                  </div>
                  <div>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                      template.status === 'APPROVED' ? 'bg-green-500/10 text-green-500' :
                      template.status === 'REJECTED' ? 'bg-red-500/10 text-red-500' :
                      'bg-orange-500/10 text-orange-500'
                    }`}>
                      {template.status}
                    </span>
                  </div>
                </div>
                <div className="bg-slate-50 dark:bg-zinc-900 p-3 rounded-lg border border-slate-100 dark:border-zinc-800 text-[13px] whitespace-pre-wrap font-mono mb-3">
                  {template.body}
                </div>
                {template.status === 'PENDING' && (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => updateStatus(template.id, 'APPROVED')}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded-lg text-[12px] font-bold hover:bg-green-600 transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" /> {language === 'en' ? 'Approve' : 'অ্যাপ্রুভ'}
                    </button>
                    <button 
                      onClick={() => updateStatus(template.id, 'REJECTED')}
                      className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white rounded-lg text-[12px] font-bold hover:bg-red-600 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" /> {language === 'en' ? 'Reject' : 'রিজেক্ট'}
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
