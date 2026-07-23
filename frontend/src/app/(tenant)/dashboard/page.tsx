'use client';

import { 
  X, 
  PhoneCall, 
  Send, 
  Megaphone, 
  CheckCircle2, 
  TrendingUp, 
  Activity, 
  Eye,
  ArrowRight,
  Bot,
  Users,
  ShoppingCart,
  Crown
} from 'lucide-react';
import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import Link from 'next/link';
import { useLanguage } from '@/components/LanguageProvider';
import SetupJourneyWidget from '@/components/SetupJourneyWidget';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function TenantDashboardOverview() {
  const { language } = useLanguage();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showSetupBanner, setShowSetupBanner] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/stats/tenant/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const userName = Cookies.get('user_name') || 'Admin';

  return (
    <div className="max-w-5xl mx-auto space-y-6 px-1.5 py-2.5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            {language === 'en' ? 'Welcome, ' : 'স্বাগতম, '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
              {userName}
            </span>
          </h1>
          <p className="text-slate-500 text-[12px] mt-0.5">
            {language === 'en' ? 'Your dashboard overview' : 'আপনার ড্যাশবোর্ড ওভারভিউ'}
          </p>
        </div>
        <Link 
          href="/dashboard/settings/subscription"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 hover:bg-yellow-500/20 border border-yellow-500/20 rounded-lg text-[13px] font-bold transition-all shadow-sm"
        >
          <Crown className="w-4 h-4" />
          {language === 'en' ? 'Upgrade Plan' : 'আপগ্রেড করুন'}
        </Link>
      </div>

      {/* Setup Journey Checklist */}
      {stats?.features && (
        <SetupJourneyWidget allowedFeatures={stats.features} />
      )}

      {/* Free Setup Banner */}
      {showSetupBanner && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-5 rounded-2xl bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/5 border border-primary/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-3xl -z-10 rounded-full mix-blend-multiply" />
          <div>
            <h3 className="font-bold text-slate-800 dark:text-zinc-200">
              {language === 'en' ? 'Having trouble setting up? We will do it for FREE 🎁' : 'Setup করতে সমস্যা হচ্ছে? আমরা FREE করে দিব 🎁'}
            </h3>
            <p className="text-slate-500 dark:text-zinc-400 text-[11px] mt-1">
              {language === 'en' ? 'New signup? Our team will do your entire Meta + WhatsApp setup for free within the first 7 days.' : 'নতুন signup করেছেন? প্রথম ৭ দিন আমাদের team আপনার পুরো Meta + WhatsApp setup free-তে করে দিবে।'}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button 
              onClick={(e) => { e.preventDefault(); window.dispatchEvent(new CustomEvent('open-support-widget')); }}
              className="whitespace-nowrap px-1.5 py-2 bg-primary text-white text-[13px] font-medium rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
            >
              {language === 'en' ? 'Get Free Setup →' : 'ফ্রি সেটআপ নিন →'}
            </button>
            <button 
              onClick={() => setShowSetupBanner(false)}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {loading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-slate-100 dark:bg-zinc-800/50 rounded-2xl border border-slate-200/50 dark:border-zinc-800 p-5 h-[130px] animate-pulse"></div>
            ))}
          </>
        ) : (
          <>
            {/* Messages */}
            <Link href="/dashboard/inbox" className="bg-gradient-to-br from-primary/10 to-white dark:from-primary/5 dark:to-[#0f0f11] rounded-2xl border border-primary/20 p-3 shadow-sm hover:shadow-md transition-all relative overflow-hidden group block cursor-pointer">
              <div className="absolute -right-4 -top-4 w-20 h-20 bg-primary/20 rounded-full blur-2xl group-hover:scale-150 transition-transform" />
              <div className="flex justify-between items-start mb-2 relative z-10">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider group-hover:text-primary transition-colors">
                  {language === 'en' ? 'Total Messages' : 'মোট মেসেজ'}
                </span>
                <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Send className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="flex items-baseline gap-2 relative z-10">
                <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
                  {stats?.messages?.used || 0}
                </span>
                <span className="text-[12px] font-medium text-slate-400">
                  / {stats?.messages?.limit || 0}
                </span>
              </div>
              
              {/* Progress Bar */}
              {stats?.messages && (
                <div className="mt-3 relative z-10">
                  <div className="w-full bg-slate-100 dark:bg-zinc-800 rounded-full h-1 overflow-hidden">
                    <div 
                      className={`h-1 rounded-full ${stats.messages.percentage > 90 ? 'bg-red-500' : 'bg-primary'}`}
                      style={{ width: `${stats.messages.percentage}%` }}
                    ></div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 text-right">
                    {stats.messages.percentage}% Used
                  </p>
                </div>
              )}
            </Link>

            {/* Leads */}
            {stats?.features?.includes('lead_crm') && (
              <Link href="/dashboard/leads" className="bg-gradient-to-br from-secondary/10 to-white dark:from-secondary/5 dark:to-[#0f0f11] rounded-2xl border border-secondary/20 p-3 shadow-sm hover:shadow-md transition-all relative overflow-hidden group block cursor-pointer">
                <div className="absolute -right-4 -top-4 w-20 h-20 bg-secondary/20 rounded-full blur-2xl group-hover:scale-150 transition-transform" />
                <div className="flex justify-between items-start mb-2 relative z-10">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider group-hover:text-secondary transition-colors">
                    {language === 'en' ? 'Active Leads' : 'অ্যাক্টিভ লিডস'}
                  </span>
                  <div className="w-7 h-7 rounded-full bg-secondary/20 text-secondary flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-white relative z-10">
                  {stats?.leads?.total || 0}
                </div>
              </Link>
            )}

            {/* Pending Orders */}
            {stats?.features?.includes('ecommerce') && (
              <Link href="/dashboard/orders" className="bg-gradient-to-br from-amber-500/10 to-white dark:from-amber-500/5 dark:to-[#0f0f11] rounded-2xl border border-amber-500/20 p-3 shadow-sm hover:shadow-md transition-all relative overflow-hidden group block cursor-pointer">
                <div className="absolute -right-4 -top-4 w-20 h-20 bg-amber-500/20 rounded-full blur-2xl group-hover:scale-150 transition-transform" />
                <div className="flex justify-between items-start mb-2 relative z-10">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider group-hover:text-amber-500 transition-colors">
                    {language === 'en' ? 'Pending Orders' : 'পেন্ডিং অর্ডার'}
                  </span>
                  <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <ShoppingCart className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-white relative z-10">
                  {stats?.orders?.pending || 0}
                </div>
              </Link>
            )}

            {/* AI Responses Usage */}
            {stats?.features?.includes('ai_bot') && (
              <Link href="/dashboard/settings/ai" className="bg-gradient-to-br from-purple-500/10 to-white dark:from-purple-500/5 dark:to-[#0f0f11] rounded-2xl border border-purple-500/20 p-3 shadow-sm hover:shadow-md transition-all relative overflow-hidden group block cursor-pointer">
                <div className="absolute -right-4 -top-4 w-20 h-20 bg-purple-500/20 rounded-full blur-2xl group-hover:scale-150 transition-transform" />
                <div className="flex justify-between items-start mb-2 relative z-10">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider group-hover:text-purple-500 transition-colors">
                    {language === 'en' ? 'AI Responses' : 'এআই রেসপন্স'}
                  </span>
                  <div className="w-7 h-7 rounded-full bg-purple-500/20 text-purple-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2 relative z-10">
                  <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
                    {stats?.aiQuota?.used || 0}
                  </span>
                  <span className="text-[12px] font-medium text-slate-400">
                    / {stats?.aiQuota?.limit || 0}
                  </span>
                </div>
                
                {/* Progress Bar */}
                {stats?.aiQuota && (
                  <div className="mt-3 relative z-10">
                    <div className="w-full bg-slate-100 dark:bg-zinc-800 rounded-full h-1 overflow-hidden">
                      <div 
                        className={`h-1 rounded-full ${stats.aiQuota.percentage > 90 ? 'bg-red-500' : 'bg-purple-500'}`}
                        style={{ width: `${stats.aiQuota.percentage}%` }}
                      ></div>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 text-right">
                      {stats.aiQuota.percentage}% Used
                    </p>
                  </div>
                )}
              </Link>
            )}
          </>
        )}
      </div>

      {/* Bottom Row */}
      <div className="grid md:grid-cols-[2fr_1fr] gap-2 pb-8">
        {/* Quick Start */}
        <div className="bg-white dark:bg-[#0f0f11] rounded-2xl border border-primary/10 shadow-xl shadow-primary/5 hover:border-primary/20 hover:shadow-primary/10 transition-all p-1.5 flex flex-col gap-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/10 to-secondary/10 blur-3xl -z-10 rounded-full" />
          
          <h3 className="font-bold text-slate-900 dark:text-white text-[13px] mb-2">
            {language === 'en' ? 'Quick Actions' : 'কুইক একশন'}
          </h3>
          
          <div className="grid sm:grid-cols-2 gap-2">
            <Link href="/dashboard/settings/whatsapp" className="flex items-center justify-between p-1.5 rounded-xl bg-gradient-to-r from-primary/10 to-secondary/10 dark:from-primary/5 dark:to-secondary/5 border border-primary/20 hover:border-primary/40 hover:shadow-md hover:shadow-primary/10 transition-all text-left group">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-[13px] text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                    {language === 'en' ? 'Add WhatsApp' : 'হোয়াটসঅ্যাপ যুক্ত করুন'}
                  </div>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-primary/50 group-hover:text-primary transition-all group-hover:translate-x-1" />
            </Link>

            <Link href="/dashboard/inbox" className="flex items-center justify-between p-1.5 rounded-xl bg-gradient-to-r from-secondary/10 to-primary/10 dark:from-secondary/5 dark:to-primary/5 border border-secondary/20 hover:border-secondary/40 hover:shadow-md hover:shadow-secondary/10 transition-all text-left group">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-[13px] text-slate-900 dark:text-white group-hover:text-secondary transition-colors">
                    {language === 'en' ? 'Send Message' : 'মেসেজ পাঠান'}
                  </div>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-secondary/50 group-hover:text-secondary transition-all group-hover:translate-x-1" />
            </Link>
            
            {stats?.features?.includes('broadcast') && (
              <Link href="/dashboard/broadcast" className="flex items-center justify-between p-1.5 rounded-xl bg-gradient-to-r from-violet-50/50 to-purple-50/50 dark:from-violet-900/10 dark:to-purple-900/10 border border-violet-100 dark:border-violet-900/30 hover:border-violet-300 dark:hover:border-violet-700 hover:shadow-md hover:shadow-violet-500/10 transition-all text-left group">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Megaphone className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-[13px] text-slate-900 dark:text-white group-hover:text-violet-700 transition-colors">
                      {language === 'en' ? 'New Broadcast' : 'নতুন ব্রডকাস্ট'}
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-violet-300 dark:text-violet-900 group-hover:text-violet-600 transition-all group-hover:translate-x-1" />
              </Link>
            )}
          </div>
        </div>

        {/* Recent Activity placeholder */}
        <div className="bg-white dark:bg-[#0f0f11] rounded-2xl border border-primary/10 shadow-xl shadow-primary/5 hover:border-primary/20 hover:shadow-primary/10 transition-all p-1.5 flex flex-col">
          <div className="flex items-center gap-2 mb-8">
            <Activity className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-slate-900 dark:text-white text-[13px]">
              {language === 'en' ? 'System Status' : 'সিস্টেম স্ট্যাটাস'}
            </h3>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center text-[13px]">
            <CheckCircle2 className="w-9 h-9 text-emerald-500/50 mb-3" />
            <p className="text-slate-500 font-medium">All systems operational</p>
          </div>
        </div>
      </div>
    </div>
  );
}
