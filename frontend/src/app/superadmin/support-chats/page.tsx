'use client';

import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { useLanguage } from '@/components/LanguageProvider';
import { Bot, User, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function SupportChatsPage() {
  const { language } = useLanguage();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [aiConfigs, setAiConfigs] = useState<any[]>([]);

  useEffect(() => {
    fetchConversations();
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/ai-config`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setAiConfigs(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const fetchConversations = async () => {
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/support-chat/admin/conversations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setConversations(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSetSupportDefault = async (configId: string) => {
    if (!configId) return;
    if (confirm(language === 'en' ? 'Set this as the Platform Support AI?' : 'এটিকে প্ল্যাটফর্ম সাপোর্ট এআই হিসেবে সেট করবেন?')) {
      try {
        const token = Cookies.get('access_token');
        const res = await fetch(`${API}/ai-config/${configId}/set-support-default`, {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) fetchConfigs();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSelectConversation = async (tenantId: string) => {
    setSelectedTenantId(tenantId);
    setLoadingMessages(true);
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/support-chat/admin/conversations`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tenantId })
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMessages(false);
    }
  };

  if (loading) {
    return <div className="p-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-[15px] font-bold tracking-tight flex items-center gap-3">
            <Bot className="w-4 h-4 text-blue-500" />
            {language === 'en' ? 'AI Support Chats' : 'এআই সাপোর্ট চ্যাটস'}
          </h1>
          <p className="text-zinc-400 mt-2 text-[12px]">
            {language === 'en' ? 'View conversations between tenants and the Platform Support AI.' : 'টেন্যান্ট এবং প্ল্যাটফর্ম এআই-এর মধ্যকার চ্যাট দেখুন।'}
          </p>
        </div>
        
        <div className="flex items-center gap-3 bg-surface border border-surface-hover px-3 py-2 rounded-xl">
          <span className="text-[12px] font-medium text-zinc-400 whitespace-nowrap">
            {language === 'en' ? 'Active Support Model:' : 'অ্যাক্টিভ সাপোর্ট মডেল:'}
          </span>
          <select 
            className="bg-background border border-surface-hover rounded-lg px-2 py-1.5 text-[12px] focus:outline-none focus:border-blue-500"
            value={aiConfigs.find(c => c.isSupportDefault)?.id || ''}
            onChange={(e) => handleSetSupportDefault(e.target.value)}
          >
            <option value="" disabled>{language === 'en' ? 'Select a Model...' : 'মডেল সিলেক্ট করুন...'}</option>
            {aiConfigs.map(config => (
              <option key={config.id} value={config.id}>
                {config.name} ({config.modelName})
              </option>
            ))}
          </select>
        </div>
      </div>

      {!selectedTenantId ? (
        <div className="bg-surface border border-surface-hover rounded-xl overflow-hidden">
          <table className="w-full text-left text-[12px]">
            <thead className="bg-surface-hover/50 text-zinc-400">
              <tr>
                <th className="px-4 py-3 font-medium">Tenant</th>
                <th className="px-4 py-3 font-medium">Messages</th>
                <th className="px-4 py-3 font-medium">Last Updated</th>
                <th className="px-4 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-hover">
              {conversations.map(conv => (
                <tr key={conv.id} className="hover:bg-surface-hover/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-zinc-200">{conv.tenant.businessName}</div>
                    <div className="text-zinc-500">{conv.tenant.email}</div>
                  </td>
                  <td className="px-4 py-3 text-zinc-300">{conv._count.messages}</td>
                  <td className="px-4 py-3 text-zinc-400">{new Date(conv.updatedAt).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    <button 
                      onClick={() => handleSelectConversation(conv.tenantId)}
                      className="px-3 py-1.5 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 rounded-lg transition-colors font-semibold"
                    >
                      View Chat
                    </button>
                  </td>
                </tr>
              ))}
              {conversations.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-zinc-500">
                    No support conversations found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-surface border border-surface-hover rounded-xl flex flex-col h-[600px]">
          <div className="p-3 border-b border-surface-hover flex items-center gap-3">
            <button 
              onClick={() => setSelectedTenantId(null)}
              className="p-1.5 hover:bg-surface-hover rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-zinc-400" />
            </button>
            <h2 className="font-semibold text-[13px] text-zinc-200">
              Chat History
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loadingMessages ? (
              <div className="text-center pt-10"><Loader2 className="w-6 h-6 animate-spin mx-auto text-zinc-500" /></div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-2 ${msg.senderType === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.senderType === 'ai' && (
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 mt-1">
                      <Bot className="w-3 h-3 text-blue-500" />
                    </div>
                  )}
                  <div 
                    className={`max-w-[80%] p-3 rounded-2xl text-[13px] whitespace-pre-wrap ${
                      msg.senderType === 'user' 
                        ? 'bg-primary text-white rounded-tr-sm' 
                        : 'bg-zinc-800 text-zinc-200 border border-zinc-700 rounded-tl-sm'
                    }`}
                  >
                    {msg.message}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
