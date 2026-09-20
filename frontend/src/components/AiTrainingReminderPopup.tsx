'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import { useRouter } from 'next/navigation';
import { X, Bot, ChevronRight, CheckCircle2 } from 'lucide-react';

export default function AiTrainingReminderPopup({ 
  score,
  qnaCount,
  hasProduct,
  businessNature
}: { 
  score: number;
  qnaCount: number;
  hasProduct: boolean;
  businessNature: string | null;
}) {
  const { language } = useLanguage();
  const router = useRouter();
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Check if dismissed
    if (typeof window !== 'undefined') {
      const isDismissed = localStorage.getItem('zinichat_ai_reminder_dismissed') === 'true';
      if (isDismissed || score >= 50) return;
    }

    // Initial delay before first show (10 seconds)
    const initialTimer = setTimeout(() => {
      setShow(true);
    }, 10000);

    // Then show every 3 minutes
    const interval = setInterval(() => {
      setShow(true);
    }, 3 * 60 * 1000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [score]);

  if (!show) return null;

  const handleDismiss = () => {
    setShow(false);
  };

  const handleFullySetup = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('zinichat_ai_reminder_dismissed', 'true');
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

  return (
    <div className="fixed bottom-6 right-6 z-[100] w-80 sm:w-96 bg-surface border border-red-500/30 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
      
      {/* Header */}
      <div className="bg-red-500/10 border-b border-red-500/20 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-red-500">
          <Bot className="w-5 h-5" />
          <h3 className="font-bold">
            {language === 'en' ? `AI Training Incomplete (${score}%)` : `এআই ট্রেইনিং অসম্পূর্ণ (${score}%)`}
          </h3>
        </div>
        <button onClick={handleDismiss} className="p-1 hover:bg-red-500/20 rounded-md text-red-400">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="p-5 space-y-4">
        {/* Progress Bar */}
        <div>
          <div className="flex justify-between text-xs mb-1 text-muted-foreground">
            <span>Progress</span>
            <span>{score}% / 50% Required</span>
          </div>
          <div className="w-full bg-surface-hover rounded-full h-2 overflow-hidden">
            <div 
              className="bg-red-500 h-full rounded-full transition-all"
              style={{ width: `${score}%` }}
            />
          </div>
        </div>

        {/* Missing Tasks */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">
            {language === 'en' ? 'Still needed:' : 'এখনো বাকি আছে:'}
          </p>
          <ul className="text-sm space-y-2 text-muted-foreground">
            {qnaCount < 3 && (
              <li className="flex items-start gap-2">
                <X className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>
                  {language === 'en' ? `Add Q&As (${qnaCount}/3 added)` : `প্রশ্ন-উত্তর যোগ করুন (${qnaCount}/৩ যোগ করা হয়েছে)`}
                </span>
              </li>
            )}
            {!hasProduct && (
              <li className="flex items-start gap-2">
                <X className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>
                  {getProductGuidance()}
                </span>
              </li>
            )}
          </ul>
        </div>

        {/* AI Guideline Message */}
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-xs text-emerald-600 dark:text-emerald-400">
          <strong>💡 {language === 'en' ? 'Pro Tip:' : 'টিপস:'}</strong> {language === 'en' 
            ? 'Add your products/services above. AI will automatically learn them and reply to customers instantly!' 
            : `এখানে ${getProductGuidance().replace(' যোগ করুন', '')} অ্যাড করুন, AI অটোমেটিকালি এখান থেকে চিনে নিয়ে কাস্টমারকে সঠিক রিপ্লাই দিবে।`}
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-2">
          <button
            onClick={() => { setShow(false); router.push('/dashboard/settings/ai-training'); }}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-2.5 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
          >
            {language === 'en' ? 'Complete AI Training' : 'এআই ট্রেইনিং সম্পূর্ণ করুন'}
            <ChevronRight className="w-4 h-4" />
          </button>
          
          <button
            onClick={handleFullySetup}
            className="w-full bg-surface-hover/50 hover:bg-surface-hover text-muted-foreground py-2.5 rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            {language === 'en' ? "I'm fully set up" : 'আমি ইতিমধ্যে সেটআপ করেছি'}
          </button>
        </div>
      </div>
    </div>
  );
}
