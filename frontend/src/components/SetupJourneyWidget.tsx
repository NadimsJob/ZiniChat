'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import Cookies from 'js-cookie';
import Link from 'next/link';
import { 
  CheckCircle2, 
  Circle, 
  MessageCircle, 
  Bot, 
  Inbox,
  X,
  Sparkles,
  ChevronRight,
  PartyPopper
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function SetupJourneyWidget({ 
  initialStatus 
}: { 
  initialStatus?: any 
}) {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(!initialStatus);
  const [status, setStatus] = useState<any>(initialStatus || null);
  const [dismissed, setDismissed] = useState(false);
  const [checkedInbox, setCheckedInbox] = useState(false);

  useEffect(() => {
    // Check local storage for dismissal & inbox visit
    if (typeof window !== 'undefined') {
      const isDismissed = localStorage.getItem('zinichat_setup_banner_dismissed') === 'true';
      const isInboxVisited = localStorage.getItem('zinichat_inbox_visited') === 'true';
      setDismissed(isDismissed);
      setCheckedInbox(isInboxVisited);
    }

    if (!initialStatus) {
      fetchSetupStatus();
    }
  }, [initialStatus]);

  const fetchSetupStatus = async () => {
    try {
      const token = Cookies.get('access_token');
      if (!token) {
        setLoading(false);
        return;
      }
      const res = await fetch(`${API}/auth/setup-status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setStatus(await res.json());
      }
    } catch (err) {
      console.error('Setup status fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('zinichat_setup_banner_dismissed', 'true');
    }
  };

  const handleInboxStepClick = () => {
    setCheckedInbox(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('zinichat_inbox_visited', 'true');
    }
  };

  if (loading || dismissed) return null;

  const step1Done = Boolean(status?.hasConnectedChannel);
  const step2Done = Boolean(status?.hasConfiguredAi || status?.hasNamedAgent);
  const step3Done = Boolean(checkedInbox || status?.hasConnectedChannel);

  const steps = [
    {
      id: 'channel',
      title: language === 'en' ? 'Connect Channel' : 'চ্যানেল কানেক্ট করুন',
      subtitle: language === 'en' ? 'WhatsApp / Meta API' : 'হোয়াটসঅ্যাপ / মেটা এপিআই',
      icon: MessageCircle,
      isDone: step1Done,
      href: '/dashboard/settings/inboxes/new',
      onClick: undefined
    },
    {
      id: 'ai',
      title: language === 'en' ? 'Train AI' : 'এআই ট্রেইন করুন',
      subtitle: language === 'en' ? 'Persona & Q&A' : 'পারসোনা ও নলেজ বেইস',
      icon: Bot,
      isDone: step2Done,
      href: '/dashboard/settings/ai-training',
      onClick: undefined
    },
    {
      id: 'inbox',
      title: language === 'en' ? 'Check Inbox' : 'ইনবক্স চেক করুন',
      subtitle: language === 'en' ? 'Live chat workspace' : 'লাইভ চ্যাট ওয়ার্কস্পেস',
      icon: Inbox,
      isDone: step3Done,
      href: '/dashboard/inbox',
      onClick: handleInboxStepClick
    }
  ];

  const completedCount = steps.filter(s => s.isDone).length;
  const totalCount = 3;
  const progressPercent = Math.round((completedCount / totalCount) * 100);
  const isAllCompleted = completedCount === totalCount;

  if (isAllCompleted) {
    return (
      <div className="w-full bg-gradient-to-r from-emerald-900/90 via-teal-900/90 to-emerald-950/90 border border-emerald-500/40 rounded-2xl p-4 shadow-lg backdrop-blur-xl mb-6 relative animate-in fade-in duration-500 flex items-center justify-between gap-3 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
            <PartyPopper className="w-5 h-5 animate-bounce" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-emerald-200 flex items-center gap-2">
              {language === 'en' ? '🎉 Congratulations! Workspace Setup Complete!' : '🎉 অভিনন্দন! আপনার ওয়ার্কস্পেস সেটআপ ১০০% সম্পূর্ণ!'}
            </h3>
            <p className="text-[12px] text-emerald-300/80">
              {language === 'en' ? 'Your AI assistant is fully trained and ready to engage with customers.' : 'আপনার এআই অ্যাসিস্ট্যান্ট ট্রেইনড এবং কাস্টমারদের হ্যান্ডেল করার জন্য প্রস্তুত।'}
            </p>
          </div>
        </div>
        <button 
          onClick={handleDismiss}
          className="p-1.5 hover:bg-emerald-800/50 rounded-lg text-emerald-300 hover:text-white transition-colors cursor-pointer"
          title={language === 'en' ? 'Dismiss' : 'বন্ধ করুন'}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-full bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-900 border border-emerald-500/30 rounded-2xl p-4 md:p-5 shadow-xl backdrop-blur-xl mb-6 relative transition-all duration-300 animate-in fade-in slide-in-from-top-4 overflow-hidden group">
      {/* Background Subtle Gradient Glow */}
      <div className="absolute -right-20 -top-20 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Dismiss Button */}
      <button 
        onClick={handleDismiss}
        className="absolute top-3.5 right-3.5 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer z-10"
        title={language === 'en' ? 'Dismiss Checklist' : 'চেকলিস্ট ড্রপ করুন'}
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-0">
        
        {/* Left Side: Title & Progress Bar */}
        <div className="space-y-2 max-w-sm">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              {language === 'en' ? 'Fast-Track Setup' : 'ফাস্ট-ট্র্যাক সেটআপ'}
            </span>
          </div>

          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            {language === 'en' ? 'Welcome to ZiniChat!' : 'স্বাগতম জিনিচ্যাটে!'} 👋
          </h2>

          <p className="text-[12px] text-zinc-300/90 font-sans">
            {language === 'en' 
              ? 'Complete these 3 quick steps to automate customer support in 10 minutes.' 
              : '১০ মিনিটে অটোমেটেড সাপোর্ট চালু করতে এই ৩টি ধাপ সম্পন্ন করুন।'}
          </p>

          {/* Compact Progress Bar */}
          <div className="space-y-1 pt-1">
            <div className="flex justify-between items-center text-[11px]">
              <span className="font-semibold text-zinc-400">
                {language === 'en' ? 'Onboarding Progress' : 'অনবোর্ডিং অগ্রগতি'}
              </span>
              <span className="font-bold text-emerald-400">
                {completedCount} {language === 'en' ? 'of' : 'এর মধ্যে'} {totalCount} ({progressPercent}%)
              </span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 rounded-full transition-all duration-700 ease-out shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right Side: 3 Actionable Step Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 flex-1 lg:max-w-2xl">
          {steps.map((step, index) => {
            const Icon = step.icon;

            return (
              <Link 
                key={step.id}
                href={step.href}
                onClick={step.onClick}
                className={`relative flex items-center justify-between p-3 rounded-xl border transition-all duration-200 group/step ${
                  step.isDone
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300 hover:border-emerald-400'
                    : 'bg-slate-800/80 border-slate-700 text-zinc-200 hover:border-emerald-500/50 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    step.isDone 
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                      : 'bg-slate-700 text-zinc-300 group-hover/step:bg-emerald-500/10 group-hover/step:text-emerald-400'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-zinc-400 font-mono">0{index + 1}.</span>
                      <h4 className={`text-[12px] font-bold truncate ${step.isDone ? 'text-emerald-200 line-through' : 'text-white'}`}>
                        {step.title}
                      </h4>
                    </div>
                    <p className="text-[10px] text-zinc-400 truncate font-sans">
                      {step.subtitle}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 ml-1">
                  {step.isDone ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-zinc-400 group-hover/step:text-emerald-400 group-hover/step:translate-x-0.5 transition-all" />
                  )}
                </div>
              </Link>
            );
          })}
        </div>

      </div>
    </div>
  );
}
