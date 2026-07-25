'use client';

import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { MessageSquare, RefreshCw, Search, ShieldCheck, Info } from 'lucide-react';
import { useLanguage } from '@/components/LanguageProvider';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function SuperadminTemplatesPage() {
  const { language } = useLanguage();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
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

  const filteredTemplates = templates.filter(t => {
    const matchesStatus = filterStatus === 'ALL' || t.status === filterStatus;
    const matchesSearch = searchTerm === '' || 
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (t.tenant?.businessName && t.tenant.businessName.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4 p-4 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex justify-between items-center bg-surface/70 backdrop-blur-xl border border-surface-hover p-4 rounded-2xl">
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2 text-primary">
            <MessageSquare className="w-5 h-5" /> 
            {language === 'en' ? 'Meta Message Templates Monitoring' : 'মেটা মেসেজ টেমপ্লেটস মনিটরিং'}
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            {language === 'en' ? 'Real-time read-only status of WhatsApp message templates submitted to Meta API.' : 'মেটা এপিআই-তে পাঠানো সকল টেন্যান্টের হোয়াটসঅ্যাপ টেমপ্লেটের রিয়েল-টাইম স্ট্যাটাস।'}
          </p>
        </div>
        <button 
          onClick={fetchTemplates}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-hover text-zinc-200 text-[12px] font-bold rounded-xl hover:bg-surface-hover/80 transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          {language === 'en' ? 'Refresh Status' : 'রিফ্রেশ করুন'}
        </button>
      </div>

      {/* Info Callout */}
      <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl flex gap-3 text-blue-400">
        <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="space-y-1 text-[12px]">
          <h3 className="font-bold text-[13px]">
            {language === 'en' ? 'Automated Meta Graph API Verification' : 'স্বয়ংক্রিয় মেটা গ্রাফ এপিআই ভেরিফিকেশন'}
          </h3>
          <p className="opacity-90">
            {language === 'en'
              ? 'Templates are now reviewed and approved directly by Meta AI & Webhook status listeners. Superadmin manual approval is disabled as per WhatsApp Cloud API standards.'
              : 'হোয়াটসঅ্যাপ ক্লাউড এপিআই নিয়ম অনুযায়ী টেমপ্লেটসমূহ সরাসরি মেটা এআই ও ওয়েবহুকের মাধ্যমে অনুমোদিত হয়। সুপারএডমিন ম্যানুয়াল অ্যাপ্রুভালের প্রয়োজন নেই।'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-surface/70 border border-surface-hover p-3 rounded-2xl">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={language === 'en' ? 'Search by tenant or template...' : 'টেন্যান্ট বা টেমপ্লেট নাম সার্চ...'}
            className="w-full bg-background border border-surface-hover rounded-xl pl-9 pr-3 py-1.5 text-[12px] outline-none focus:border-primary"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map(st => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all ${
                filterStatus === st ? 'bg-primary text-primary-foreground' : 'bg-surface-hover/30 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Templates Table / List */}
      <div className="bg-surface/70 backdrop-blur-xl border border-surface-hover rounded-2xl p-4">
        <div className="space-y-3">
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 text-[13px]">
              {language === 'en' ? 'No templates found.' : 'কোনো টেমপ্লেট পাওয়া যায়নি।'}
            </div>
          ) : (
            filteredTemplates.map((template) => (
              <div key={template.id} className="p-4 border border-surface-hover rounded-xl bg-background/40 hover:border-primary/30 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-[14px]">{template.name}</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        template.status === 'APPROVED' ? 'bg-green-500/10 text-green-500' :
                        template.status === 'REJECTED' ? 'bg-red-500/10 text-red-500' :
                        'bg-orange-500/10 text-orange-500'
                      }`}>
                        {template.status}
                      </span>
                    </div>
                    <p className="text-[12px] text-zinc-400 mt-0.5">
                      Tenant: <strong className="text-zinc-200">{template.tenant?.businessName || 'Unknown'}</strong> &bull; Category: {template.category} &bull; Language: {template.language || 'bn'}
                    </p>
                  </div>
                  {template.metaTemplateId && (
                    <span className="text-[11px] font-mono text-zinc-500 bg-surface-hover px-2 py-0.5 rounded">
                      ID: {template.metaTemplateId}
                    </span>
                  )}
                </div>

                {template.bodyText && (
                  <div className="bg-background/80 p-3 rounded-lg border border-surface-hover text-[12px] whitespace-pre-wrap font-mono text-zinc-300 mb-2">
                    {template.bodyText}
                  </div>
                )}

                {template.rejectionReason && (
                  <div className="p-2 bg-red-500/10 border border-red-500/20 text-red-400 text-[12px] rounded-lg">
                    <strong>Meta Rejection Reason:</strong> {template.rejectionReason}
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
