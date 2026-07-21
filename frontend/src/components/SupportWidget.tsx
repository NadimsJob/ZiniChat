'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Loader2, Bot, User } from 'lucide-react';
import Cookies from 'js-cookie';
import { useLanguage } from '@/components/LanguageProvider';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function SupportWidget() {
  const { language } = useLanguage();
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
    const handleOpenWidget = () => setIsOpen(true);
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

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 p-4 rounded-full bg-primary text-white shadow-lg hover:bg-primary/90 transition-transform duration-300 z-50 ${isOpen ? 'scale-0' : 'scale-100 hover:scale-110'}`}
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {/* Chat Window */}
      <div 
        className={`fixed bottom-6 right-6 w-[350px] sm:w-[400px] h-[550px] max-h-[85vh] bg-surface/90 backdrop-blur-xl border border-border rounded-2xl shadow-2xl flex flex-col transition-all duration-300 origin-bottom-right z-50 ${isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-primary/10 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-[14px]">ZiniChat Support</h3>
              <p className="text-[11px] text-primary/80">
                {language === 'en' ? 'AI Assistant is online' : 'এআই অ্যাসিস্ট্যান্ট অনলাইনে আছে'}
              </p>
            </div>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && !loading && (
            <div className="text-center text-slate-500 text-[12px] mt-10">
              {language === 'en' ? 'Ask me anything about setting up ZiniChat!' : 'ZiniChat সেটআপ নিয়ে যেকোনো প্রশ্ন করতে পারেন!'}
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
                className={`max-w-[80%] p-3 rounded-2xl text-[13px] whitespace-pre-wrap ${
                  msg.senderType === 'user' 
                    ? 'bg-primary text-white rounded-tr-sm' 
                    : 'bg-slate-100 dark:bg-zinc-800 text-foreground border border-border rounded-tl-sm'
                }`}
              >
                {msg.message}
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
