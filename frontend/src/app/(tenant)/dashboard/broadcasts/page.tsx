'use client';

import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { Megaphone, Plus, Clock, Users, Play, AlertCircle, Info } from 'lucide-react';
import { useLanguage } from '@/components/LanguageProvider';

export default function BroadcastsPage() {
  const { language } = useLanguage();
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'campaigns' | 'templates'>('campaigns');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = Cookies.get('access_token');
      const endpoint = activeTab === 'campaigns' ? 'broadcasts' : 'broadcasts/templates';
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/${endpoint}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        if (res.status === 403) {
          setError('Your plan does not support Broadcast Campaigns. Please upgrade your plan.');
          return;
        }
        throw new Error('Failed to fetch');
      }

      const data = await res.json();
      if (activeTab === 'campaigns') {
        setBroadcasts(data);
      } else {
        setTemplates(data);
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred while fetching data.');
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4 animate-in fade-in zoom-in duration-500">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl font-bold">{error}</h2>
          <p className="text-zinc-400 mt-2">Access to this feature is restricted by your subscription plan.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4 animate-in fade-in duration-500">
      <div className="flex justify-between items-center bg-surface/70 backdrop-blur-xl border border-surface-hover p-4 rounded-2xl">
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2 text-primary">
            <Megaphone className="w-5 h-5" /> 
            {language === 'en' ? 'Broadcast Campaigns' : 'ব্রডকাস্ট ক্যাম্পেইন'}
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            {language === 'en' ? 'Send bulk messages to your contacts via WhatsApp.' : 'হোয়াটসঅ্যাপের মাধ্যমে বাল্ক মেসেজ পাঠান।'}
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-[13px] font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
          <Plus className="w-4 h-4" /> 
          {activeTab === 'campaigns' 
            ? (language === 'en' ? 'New Campaign' : 'নতুন ক্যাম্পেইন') 
            : (language === 'en' ? 'New Template' : 'নতুন টেমপ্লেট')}
        </button>
      </div>

      {/* Meta Guidelines Alert */}
      <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl flex gap-3 text-blue-400">
        <Info className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h3 className="font-bold text-[14px]">
            {language === 'en' ? 'Meta Broadcasting Guidelines' : 'মেটা (Meta) ব্রডকাস্টিং গাইডলাইন'}
          </h3>
          <ul className="list-disc list-inside text-[13px] opacity-90 space-y-1">
            <li>
              {language === 'en' 
                ? 'To send messages outside the 24-hour window, you MUST use Meta-approved Message Templates.'
                : '২৪-ঘণ্টার উইন্ডোর বাইরে বাল্ক মেসেজ পাঠাতে হলে আপনাকে অবশ্যই মেটা-অ্যাপ্রুভড (Meta-approved) টেমপ্লেট ব্যবহার করতে হবে।'}
            </li>
            <li>
              {language === 'en' 
                ? 'Standard promotional messages can only be sent to customers who interacted with you in the last 24 hours.'
                : 'যেকোনো সাধারণ মেসেজ শুধুমাত্র তাদেরকেই পাঠাতে পারবেন যারা গত ২৪ ঘণ্টার মধ্যে আপনাকে মেসেজ দিয়েছে।'}
            </li>
            <li>
              {language === 'en' 
                ? 'Only send broadcasts to opted-in contacts to avoid getting your WhatsApp Business account blocked.'
                : 'যাদের অনুমতি (Opt-in) আছে শুধুমাত্র তাদেরকেই ব্রডকাস্ট পাঠান, অন্যথায় আপনার অ্যাকাউন্ট ব্লক হতে পারে।'}
            </li>
          </ul>
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-surface-hover/30 rounded-xl w-fit">
        <button 
          onClick={() => setActiveTab('campaigns')}
          className={`px-4 py-1.5 rounded-lg text-[13px] font-bold transition-all ${activeTab === 'campaigns' ? 'bg-primary text-primary-foreground shadow-md' : 'text-zinc-400 hover:text-zinc-200'}`}
        >
          {language === 'en' ? 'Campaigns' : 'ক্যাম্পেইন'}
        </button>
        <button 
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-1.5 rounded-lg text-[13px] font-bold transition-all ${activeTab === 'templates' ? 'bg-primary text-primary-foreground shadow-md' : 'text-zinc-400 hover:text-zinc-200'}`}
        >
          {language === 'en' ? 'Message Templates' : 'মেসেজ টেমপ্লেট'}
        </button>
      </div>

      <div className="bg-surface/70 backdrop-blur-xl border border-surface-hover rounded-2xl p-4">
        {loading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-16 bg-surface-hover/50 rounded-xl"></div>)}
          </div>
        ) : (
          <div className="space-y-3">
            {(activeTab === 'campaigns' ? broadcasts : templates).length === 0 ? (
              <div className="text-center py-12 text-zinc-500 text-[13px]">
                {language === 'en' ? 'No items found.' : 'কোনো তথ্য পাওয়া যায়নি।'}
              </div>
            ) : (
              (activeTab === 'campaigns' ? broadcasts : templates).map((item) => (
                <div key={item.id} className="flex justify-between items-center p-4 bg-background/50 border border-surface-hover rounded-xl hover:border-primary/30 transition-colors">
                  <div>
                    <h3 className="text-[14px] font-bold">{activeTab === 'campaigns' ? (item.template?.name || 'Unnamed Campaign') : item.name}</h3>
                    <div className="flex items-center gap-4 mt-2 text-[12px] text-zinc-400">
                      {activeTab === 'campaigns' ? (
                        <>
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {new Date(item.scheduledAt).toLocaleString()}</span>
                          <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {item._count?.recipients || 0} Recipients</span>
                          <span className="capitalize px-2 py-0.5 bg-secondary/10 text-secondary rounded-full font-bold">{item.status}</span>
                        </>
                      ) : (
                        <>
                          <span className="capitalize px-2 py-0.5 bg-primary/10 text-primary rounded-full font-bold">{item.category}</span>
                          <span className="capitalize px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded-full font-bold">{item.status}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {activeTab === 'campaigns' && item.status === 'scheduled' && (
                    <button className="w-8 h-8 flex items-center justify-center bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500/20">
                      <Play className="w-4 h-4 ml-0.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
