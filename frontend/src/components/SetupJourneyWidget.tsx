'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import Cookies from 'js-cookie';
import Link from 'next/link';
import { 
  CheckCircle2, 
  Circle, 
  Building, 
  MessageCircle, 
  Bot, 
  Package, 
  Users, 
  ShieldCheck,
  Loader2,
  Wand2
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function SetupJourneyWidget({ allowedFeatures }: { allowedFeatures: string[] }) {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<any>(null);
  
  useEffect(() => {
    fetchSetupStatus();
  }, []);

  const fetchSetupStatus = async () => {
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/auth/setup-status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setStatus(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-surface rounded-2xl border border-border p-4 shadow-sm flex justify-center items-center h-24 mb-4">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!status) return null;

  // Build dynamic checklist based on allowed features
  const checklist = [
    {
      id: 'business',
      title: language === 'en' ? 'Complete Business Profile' : 'বিজনেস প্রোফাইল সম্পূর্ণ করুন',
      desc: language === 'en' ? 'Add your brand name, address, and business nature.' : 'আপনার ব্র্যান্ডের নাম, ঠিকানা এবং ব্যবসার ধরন যোগ করুন।',
      icon: Building,
      isDone: status.hasBusinessProfile,
      href: '/dashboard/profile',
      show: true
    },
    {
      id: 'channel',
      title: language === 'en' ? 'Connect a Channel' : 'একটি চ্যানেল কানেক্ট করুন',
      desc: language === 'en' ? 'Link your WhatsApp, Facebook, or Instagram to receive messages.' : 'মেসেজ পেতে আপনার হোয়াটসঅ্যাপ, ফেসবুক বা ইনস্টাগ্রাম পেইজ লিংক করুন।',
      icon: MessageCircle,
      isDone: status.hasConnectedChannel,
      href: '/dashboard/settings/whatsapp',
      show: allowedFeatures.includes('whatsapp_qr') || allowedFeatures.includes('whatsapp') || allowedFeatures.includes('messenger') || allowedFeatures.includes('instagram_dm')
    },
    {
      id: 'ai_config',
      title: language === 'en' ? 'Configure AI Agent' : 'এআই এজেন্ট কনফিগার করুন',
      desc: language === 'en' ? 'Give your AI a human-like name and routing rules.' : 'আপনার এআই এর নাম এবং রাউটিং রুলস সেটআপ করুন।',
      icon: Wand2,
      isDone: status.hasNamedAgent,
      href: '/dashboard/settings/ai-training',
      show: allowedFeatures.includes('ai_assistant') || allowedFeatures.includes('platform_support_ai')
    },
    {
      id: 'ai',
      title: language === 'en' ? 'Train AI Assistant' : 'এআই অ্যাসিস্ট্যান্ট ট্রেইন করুন',
      desc: language === 'en' ? 'Add Q&A and knowledge base documents.' : 'নলেজ বেইস ডকুমেন্ট এবং প্রশ্নোত্তর দিন।',
      icon: Bot,
      isDone: status.hasConfiguredAi, // Checking if AI assistant row exists is basic, usually it means they clicked save.
      href: '/dashboard/settings/ai-training',
      show: allowedFeatures.includes('ai_assistant') || allowedFeatures.includes('platform_support_ai')
    },
    {
      id: 'commerce',
      title: language === 'en' ? 'Add a Product' : 'একটি প্রোডাক্ট যোগ করুন',
      desc: language === 'en' ? 'Create your first product to sell through chat.' : 'চ্যাটের মাধ্যমে বিক্রি করতে আপনার প্রথম প্রোডাক্ট যোগ করুন।',
      icon: Package,
      isDone: status.hasCreatedProduct,
      href: '/dashboard/ecommerce',
      show: allowedFeatures.includes('commerce')
    },
    {
      id: 'leads',
      title: language === 'en' ? 'Create a Lead' : 'একটি লিড তৈরি করুন',
      desc: language === 'en' ? 'Add a contact to your CRM pipeline.' : 'আপনার সিআরএম পাইপলাইনে একটি কন্টাক্ট যোগ করুন।',
      icon: Users,
      isDone: status.hasCreatedLead,
      href: '/dashboard/leads',
      show: allowedFeatures.includes('lead_manage')
    }
  ].filter(item => item.show);

  const completedCount = checklist.filter(item => item.isDone).length;
  const totalCount = checklist.length;
  const progressPercent = totalCount === 0 ? 100 : Math.round((completedCount / totalCount) * 100);

  if (progressPercent === 100) {
    return null; // Hide widget completely when 100% done (Optional: could show a minimized success state)
  }

  return (
    <div className="bg-white dark:bg-[#0f0f11] rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden mb-6">
      <div className="p-4 md:p-5 border-b border-border bg-surface/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              {language === 'en' ? 'Setup Your Workspace' : 'আপনার ওয়ার্কস্পেস সেটআপ করুন'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
              {language === 'en' ? 'Complete these steps to get the most out of ZiniChat.' : 'জিনিচ্যাট থেকে সর্বোচ্চ সুবিধা পেতে এই ধাপগুলো সম্পূর্ণ করুন।'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm font-bold text-slate-900 dark:text-white">{progressPercent}%</div>
              <div className="text-xs text-slate-500">{completedCount} of {totalCount} completed</div>
            </div>
            <div className="w-32 h-2.5 bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
        
        {allowedFeatures.includes('platform_support_ai') && (
          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
            <p className="text-[12px] text-slate-500 font-medium flex items-center gap-2">
              <Bot className="w-4 h-4 text-primary" />
              {language === 'en' ? 'Need help setting up?' : 'সেটআপ করতে এআই এর সাহায্য নিতে চান?'}
            </p>
            <button 
              onClick={(e) => {
                e.preventDefault();
                window.dispatchEvent(new CustomEvent('open-support-widget'));
              }}
              className="text-[11px] font-bold px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors"
            >
              {language === 'en' ? 'Ask AI' : 'এআই কে জিজ্ঞাসা করুন'}
            </button>
          </div>
        )}
      </div>

      <div className="divide-y divide-slate-100 dark:divide-zinc-800/50">
        {checklist.map((item, index) => (
          <Link 
            key={item.id} 
            href={item.href}
            className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 md:p-4 hover:bg-surface-hover transition-colors group ${item.isDone ? 'opacity-60 hover:opacity-100' : ''}`}
          >
            <div className="flex items-start gap-4">
              <div className="mt-0.5 shrink-0">
                {item.isDone ? (
                  <CheckCircle2 className="w-6 h-6 text-primary" />
                ) : (
                  <Circle className="w-6 h-6 text-slate-300 dark:text-zinc-600 group-hover:text-primary transition-colors" />
                )}
              </div>
              <div>
                <h3 className={`font-semibold text-[15px] ${item.isDone ? 'text-slate-500 dark:text-zinc-400 line-through' : 'text-slate-900 dark:text-white'}`}>
                  {item.title}
                </h3>
                <p className="text-sm text-slate-500 dark:text-zinc-400 mt-0.5">
                  {item.desc}
                </p>
              </div>
            </div>
            {!item.isDone && (
              <div className="mt-4 sm:mt-0 ml-10 sm:ml-0">
                <span className="flex items-center gap-1.5 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg transition-colors">
                  {language === 'en' ? 'Start' : 'শুরু করুন'}
                  <ChevronRight className="w-4 h-4" />
                </span>
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
