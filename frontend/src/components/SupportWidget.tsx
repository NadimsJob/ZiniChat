'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Loader2, Bot, Check, Ban, LogOut } from 'lucide-react';
import Cookies from 'js-cookie';
import { useLanguage } from '@/components/LanguageProvider';
import { usePathname, useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function SupportWidget() {
  const { language } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();
  const isInbox = pathname?.includes('/inbox');
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleOpenWidget = (e: any) => {
      setIsOpen(true);
      if (e.detail?.message) {
        setInput(e.detail.message);
      }
    };
    window.addEventListener('open-support-widget', handleOpenWidget);
    return () => window.removeEventListener('open-support-widget', handleOpenWidget);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchHistory = async () => {
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/support-chat`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Failed to fetch support chat history', err);
    }
  };

  const closeSupportSession = async () => {
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/support-chat/close`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, { senderType: 'ai', message: data.message }]);
      }
    } catch (err) {
      console.error('Failed to close support session', err);
    }
  };

  const handlePermissionDecision = async (decision: 'confirm' | 'cancel', description: string) => {
    const text = decision === 'confirm' 
      ? `হ্যাঁ, আমি সম্মতি দিচ্ছি: ${description}`
      : `না, বাতিল করুন: ${description}`;
    
    setInput('');
    setMessages(prev => [...prev, { senderType: 'user', message: text }]);
    setLoading(true);

    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/support-chat/send`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: text })
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, { senderType: 'ai', message: data.message }]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { senderType: 'user', message: userMsg }]);
    setLoading(true);

    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/support-chat/send`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: userMsg })
      });
      
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, { senderType: 'ai', message: data.message }]);
      } else {
        setMessages(prev => [...prev, { senderType: 'ai', message: "Sorry, I couldn't process your request." }]);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { senderType: 'ai', message: "Connection error. Please try again later." }]);
    } finally {
      setLoading(false);
    }
  };

  const renderFormattedMessage = (msg: any) => {
    const text = msg.message || '';

    // Check for Permission Request card
    if (text.includes('ACTION_PERMISSION_REQUEST:')) {
      try {
        const jsonStr = text.split('ACTION_PERMISSION_REQUEST:')[1].split('\n')[0];
        const payload = JSON.parse(jsonStr);
        return (
          <div className="space-y-3">
            <p className="font-semibold text-amber-600 dark:text-amber-400">⚠️ পারমিশন অনুরোধ:</p>
            <p className="text-zinc-700 dark:text-zinc-300 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">{payload.description}</p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => handlePermissionDecision('confirm', payload.description)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[12px] font-bold shadow transition-colors"
              >
                <Check className="w-3.5 h-3.5" /> হ্যাঁ, ইমপ্লিমেন্ট করুন
              </button>
              <button
                onClick={() => handlePermissionDecision('cancel', payload.description)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-[12px] font-bold shadow transition-colors"
              >
                <Ban className="w-3.5 h-3.5" /> বাতিল
              </button>
            </div>
          </div>
        );
      } catch (err) {
        // Fallback to normal text
      }
    }

    // Check for markdown link patterns e.g. [Link Text](/path)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      const label = match[1];
      const url = match[2];
      parts.push(
        <button
          key={match.index}
          onClick={() => {
            if (url.startsWith('/')) {
              router.push(url);
              setIsOpen(false);
            } else {
              window.open(url, '_blank');
            }
          }}
          className="inline-flex items-center gap-1 my-1 px-2.5 py-1 bg-primary text-white rounded-md text-[11px] font-bold hover:bg-primary/90 transition-all shadow-sm"
        >
          {label}
        </button>
      );
      lastIndex = linkRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return <div>{parts.length > 0 ? parts : text}</div>;
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed ${isInbox ? 'bottom-16 md:bottom-3 right-3 p-2.5' : 'bottom-16 md:bottom-6 right-4 md:right-6 px-3 py-2 md:px-4 md:py-2.5'} rounded-full bg-primary text-white shadow-xl hover:bg-primary/90 transition-transform duration-300 z-50 flex items-center gap-2 ${isOpen ? 'scale-0' : 'scale-100 hover:scale-105'}`}
        title="ZiniChat Support AI"
      >
        <MessageCircle className="w-5 h-5" />
        {!isInbox && <span className="font-semibold text-xs sm:text-sm hidden sm:inline">ZiniChat Support</span>}
      </button>

      {/* Chat Window */}
      <div 
        className={`fixed bottom-16 md:bottom-6 right-2 sm:right-6 w-[calc(100vw-16px)] sm:w-[420px] h-[520px] max-h-[80vh] bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl flex flex-col transition-all duration-300 origin-bottom-right z-50 ${isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 border-b border-border bg-primary/10 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-[14px]">ZiniChat Support</h3>
              <p className="text-[11px] text-primary/80">
                {language === 'en' ? 'AI Support Engineer is online' : 'এআই সাপোর্ট ইঞ্জিনিয়ারিং অনলাইনে আছে'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={closeSupportSession}
              title="Close Current Session"
              className="p-1.5 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && !loading && (
            <div className="text-center text-slate-500 text-[12px] mt-10">
              {language === 'en' ? 'Ask me anything about setting up ZiniChat!' : 'ZiniChat অ্যাকাউন্ট ও ফিচার সেটআপ নিয়ে যেকোনো প্রশ্ন করতে পারেন!'}
            </div>
          )}
          
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-2 ${msg.senderType === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.senderType === 'ai' && (
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-1">
                  <Bot className="w-3 h-3 text-primary" />
                </div>
              )}
              <div 
                className={`max-w-[85%] p-3 rounded-2xl text-[13px] whitespace-pre-wrap ${
                  msg.senderType === 'user' 
                    ? 'bg-primary text-white rounded-tr-sm' 
                    : 'bg-slate-100 dark:bg-zinc-800 text-foreground border border-border rounded-tl-sm'
                }`}
              >
                {renderFormattedMessage(msg)}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-2 justify-start">
               <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-1">
                  <Bot className="w-3 h-3 text-primary" />
                </div>
                <div className="bg-slate-100 dark:bg-zinc-800 p-3 rounded-2xl rounded-tl-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form onSubmit={sendMessage} className="p-3 border-t border-border bg-surface rounded-b-2xl flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={language === 'en' ? 'Type your message...' : 'আপনার মেসেজ লিখুন...'}
            className="flex-1 max-h-32 min-h-[44px] bg-slate-50 dark:bg-zinc-900 border border-border rounded-xl px-3 py-2.5 text-[13px] focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(e);
              }
            }}
          />
          <button 
            type="submit"
            disabled={!input.trim() || loading}
            className="p-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </>
  );
}
