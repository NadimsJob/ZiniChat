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

const checkIsDismissed = (tenantId?: string): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    if (Cookies.get('zinichat_setup_banner_dismissed') === 'true' || localStorage.getItem('zinichat_setup_banner_dismissed') === 'true') {
      return true;
    }
    if (tenantId) {
      if (Cookies.get(`zinichat_setup_banner_dismissed_${tenantId}`) === 'true' || localStorage.getItem(`zinichat_setup_banner_dismissed_${tenantId}`) === 'true') {
        return true;
      }
    }
  } catch {}
  return false;
};

const markBannerAsDismissed = (tenantId?: string) => {
  if (typeof window === 'undefined') return;
  try {
    Cookies.set('zinichat_setup_banner_dismissed', 'true', { expires: 365, path: '/' });
    localStorage.setItem('zinichat_setup_banner_dismissed', 'true');
    if (tenantId) {
      Cookies.set(`zinichat_setup_banner_dismissed_${tenantId}`, 'true', { expires: 365, path: '/' });
      localStorage.setItem(`zinichat_setup_banner_dismissed_${tenantId}`, 'true');
    }
  } catch {}
};

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

  // Check if banner was already dismissed or viewed in a previous session
  const [wasDismissedAtMount] = useState<boolean>(() => checkIsDismissed(initialStatus?.tenantId));

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isInboxVisited = localStorage.getItem('zinichat_inbox_visited') === 'true';
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

  const handleDismissCompleted = () => {
    setDismissed(true);
    markBannerAsDismissed(status?.tenantId);
  };

  const handleInboxStepClick = () => {
    setCheckedInbox(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('zinichat_inbox_visited', 'true');
    }
  };

  const step1Done = Boolean(status?.hasConnectedChannel);
  const step2Done = Boolean(status?.hasConfiguredAi && (status?.aiTrainingScore >= 50));
  const step3Done = Boolean(checkedInbox || status?.hasCreatedLead);

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

  // Once 100% completed and displayed in this view session, mark as viewed in the background
  // so that on subsequent reloads, navigation, or logins, it is never shown again!
  useEffect(() => {
    if (isAllCompleted) {
      markBannerAsDismissed(status?.tenantId);
    }
  }, [isAllCompleted, status?.tenantId]);

  if (loading) return null;

  // If 100% completed and already viewed or dismissed, hide it permanently
  if (isAllCompleted) {
    const isDismissed = dismissed || wasDismissedAtMount || checkIsDismissed(status?.tenantId);
    if (isDismissed) return null;

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
          onClick={handleDismissCompleted}
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
      <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/15 transition-all pointer-events-none" />
      <div className="absolute -left-10 -top-10 w-40 h-40 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header Info Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-white tracking-wide">
                {language === 'en' ? 'Workspace Connectivity & Setup Checklist' : 'ওয়ার্কস্পেস কানেক্টিভিটি ও সেটআপ চেকলিস্ট'}
              </h3>
              <span className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                {completedCount}/{totalCount} ({progressPercent}%)
              </span>
            </div>
            <p className="text-[12px] text-zinc-400 mt-0.5">
              {language === 'en' 
                ? 'Complete all 3 steps below to activate full AI customer automation.' 
                : 'সবকটি ৩টি ধাপ সম্পূর্ণ করুন যাতে আপনার এআই সিস্টেম কাস্টমারদের সাথে অটোমেশন চালু করতে পারে।'}
            </p>
          </div>
        </div>
      </div>

      {/* Progress Line */}
      <div className="w-full bg-slate-800/80 rounded-full h-1.5 mb-4 overflow-hidden border border-slate-700/50 relative z-10">
        <div 
          className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500 ease-out" 
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* 3 Step Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 relative z-10">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <Link
              key={step.id}
              href={step.href}
              onClick={step.onClick}
              className={`p-3.5 rounded-xl border transition-all duration-200 flex items-center justify-between group/card ${
                step.isDone
                  ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200 hover:bg-emerald-900/40'
                  : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                  step.isDone
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                    : 'bg-slate-700/50 border-slate-600/50 text-slate-400'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-zinc-500 font-mono">0{idx + 1}.</span>
                    <h4 className="font-semibold text-xs truncate group-hover/card:text-emerald-400 transition-colors">
                      {step.title}
                    </h4>
                  </div>
                  <p className="text-[10px] text-zinc-400 truncate mt-0.5">
                    {step.subtitle}
                  </p>
                </div>
              </div>

              <div className="shrink-0 ml-2">
                {step.isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover/card:text-slate-300 group-hover/card:translate-x-0.5 transition-all" />
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
