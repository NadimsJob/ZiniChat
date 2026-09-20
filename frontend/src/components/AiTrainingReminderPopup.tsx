'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import { useRouter } from 'next/navigation';
import { X, Bot, ChevronRight, CheckCircle2, MessageSquare, ShoppingBag, LayoutGrid } from 'lucide-react';

export default function AiTrainingReminderPopup({ 
  setupStatus 
}: { 
  setupStatus: any;
}) {
  const { language } = useLanguage();
  const router = useRouter();
  const [show, setShow] = useState(false);

  const isFullyDone = setupStatus 
    ? (setupStatus.hasConnectedChannel && setupStatus.hasConfiguredAi && setupStatus.hasCreatedProduct && setupStatus.aiTrainingScore >= 50)
    : false;

  useEffect(() => {
    // Check if dismissed
    if (typeof window !== 'undefined' && setupStatus) {
      const isDismissedPerm = localStorage.getItem('zinichat_wizard_seen') === 'true';
      const isDismissedSession = sessionStorage.getItem('wizard_dismissed_session') === 'true';
      if (isDismissedPerm || isFullyDone) return;
      
      // Delay to avoid jumping on initial load
      const initialTimer = setTimeout(() => {
        if (!isDismissedSession) setShow(true);
      }, 3000);

      // Re-trigger every 3 minutes if not dismissed for this session
      const interval = setInterval(() => {
        if (!sessionStorage.getItem('wizard_dismissed_session')) setShow(true);
      }, 3 * 60 * 1000);

      return () => {
        clearTimeout(initialTimer);
        clearInterval(interval);
      };
    }
  }, [isFullyDone, setupStatus]);

  if (!setupStatus || !show) return null;

  const {
    hasConnectedChannel,
    hasConfiguredAi,
    hasCreatedProduct,
    businessNature,
    aiTrainingScore
  } = setupStatus;

  const handleDismiss = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('wizard_dismissed_session', 'true');
    }
    setShow(false);
  };

  const handleFullySetup = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('zinichat_wizard_seen', 'true');
    }
    setShow(false);
  };

  const getProductGuidance = () => {
    const biz = businessNature || 'Retail/F-commerce';
    if (biz === 'Real Estate') return language === 'en' ? 'Add Properties' : 'প্রপার্টি যোগ করুন';
    if (biz === 'Tech & Software') return language === 'en' ? 'Add Software Plans' : 'সফটওয়্যার প্ল্যান যোগ করুন';
    if (biz === 'Healthcare') return language === 'en' ? 'Add Services' : 'সার্ভিস যোগ করুন';
    if (biz === 'Education') return language === 'en' ? 'Add Courses' : 'কোর্স যোগ করুন';
    if (biz === 'Hospitality') return language === 'en' ? 'Add Rooms/Packages' : 'রুম/প্যাকেজ যোগ করুন';
    return language === 'en' ? 'Add Products/Services' : 'পণ্য/সেবা যোগ করুন';
  };

  // Determine Next Action
  let nextActionTitle = '';
  let nextActionLink = '';
  let ActionIcon = LayoutGrid;
  
  if (!hasConnectedChannel) {
    nextActionTitle = language === 'en' ? 'Connect Channel' : 'চ্যানেল কানেক্ট করুন';
    nextActionLink = '/dashboard/settings/inboxes';
    ActionIcon = MessageSquare;
  } else if (!hasConfiguredAi || aiTrainingScore < 50) {
    nextActionTitle = language === 'en' ? 'Complete AI Training' : 'এআই ট্রেইনিং সম্পূর্ণ করুন';
    nextActionLink = '/dashboard/settings/ai-training';
    ActionIcon = Bot;
  } else if (!hasCreatedProduct) {
    nextActionTitle = getProductGuidance();
    nextActionLink = '/dashboard/products';
    ActionIcon = ShoppingBag;
  }

  return (
    <div className="fixed bottom-6 right-6 z-[100] w-[340px] sm:w-[380px] bg-surface border border-primary/30 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
      
      {/* Header */}
      <div className="bg-primary/10 border-b border-primary/20 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary">
          <Bot className="w-5 h-5" />
          <h3 className="font-bold">
            {language === 'en' ? 'Quick Setup Guide' : 'কুইক সেটআপ গাইড'}
          </h3>
        </div>
        <button onClick={handleDismiss} className="p-1 hover:bg-primary/20 rounded-md text-primary/70 hover:text-primary">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="p-5 space-y-5">
        
        {/* Checklist */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground mb-1">
            {language === 'en' ? 'Your Progress:' : 'আপনার অগ্রগতি:'}
          </p>
          
          <div className={`flex items-center justify-between p-2.5 rounded-lg border ${hasConnectedChannel ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-surface-hover/30 border-surface-hover text-muted-foreground'}`}>
            <span className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className={`w-4 h-4 ${hasConnectedChannel ? 'text-emerald-500' : 'opacity-30'}`} /> 
              {language === 'en' ? '1. Connect Channel' : '১. চ্যানেল কানেক্ট করুন'}
            </span>
          </div>

          <div className={`flex items-center justify-between p-2.5 rounded-lg border ${(hasConfiguredAi && aiTrainingScore >= 50) ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-surface-hover/30 border-surface-hover text-muted-foreground'}`}>
            <span className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className={`w-4 h-4 ${(hasConfiguredAi && aiTrainingScore >= 50) ? 'text-emerald-500' : 'opacity-30'}`} /> 
              {language === 'en' ? `2. AI Training (${aiTrainingScore}%)` : `২. এআই ট্রেইনিং (${aiTrainingScore}%)`}
            </span>
          </div>

          <div className={`flex items-center justify-between p-2.5 rounded-lg border ${hasCreatedProduct ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-surface-hover/30 border-surface-hover text-muted-foreground'}`}>
            <span className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className={`w-4 h-4 ${hasCreatedProduct ? 'text-emerald-500' : 'opacity-30'}`} /> 
              {language === 'en' ? `3. ${getProductGuidance()}` : `৩. ${getProductGuidance()}`}
            </span>
          </div>
        </div>

        {/* Dynamic CTA */}
        {nextActionTitle && (
          <button
            onClick={() => { setShow(false); router.push(nextActionLink); }}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-xl font-bold transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
          >
            <ActionIcon className="w-5 h-5" />
            {nextActionTitle}
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={handleFullySetup}
          className="w-full bg-surface-hover/50 hover:bg-surface-hover text-muted-foreground py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-colors flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4" />
          {language === 'en' ? "I'm already satisfied with my setup" : 'আমি আমার সেটআপ নিয়ে সন্তুষ্ট'}
        </button>

      </div>
    </div>
  );
}
