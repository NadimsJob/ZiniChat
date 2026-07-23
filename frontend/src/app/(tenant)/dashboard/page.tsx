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
  Crown,
  Package,
  MessageSquare
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
  const [setupStatus, setSetupStatus] = useState<any>(null);
  const [showSetupBanner, setShowSetupBanner] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = Cookies.get('access_token');
      const [statsRes, setupRes] = await Promise.all([
        fetch(`${API}/stats/tenant/dashboard`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API}/auth/setup-status`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      if (statsRes.ok) setStats(await statsRes.json());
      if (setupRes.ok) setSetupStatus(await setupRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const userName = Cookies.get('user_name') || 'Admin';
  const isSetupPending = setupStatus && (!setupStatus.hasBusinessProfile || !setupStatus.hasConnectedChannel);

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto space-y-6 px-1.5 py-2.5">
        <div className="h-10 w-48 bg-slate-100 dark:bg-zinc-800 animate-pulse rounded-lg"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-slate-100 dark:bg-zinc-800 animate-pulse rounded-2xl"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 px-1.5 py-2.5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
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
        <div className="flex items-center gap-3">
          {stats?.plan && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 rounded-lg border border-slate-200 dark:border-zinc-700">
              <span className="text-[12px] text-slate-500">{language === 'en' ? 'Current Plan:' : 'বর্তমান প্ল্যান:'}</span>
              <span className="text-[12px] font-bold text-primary">{stats.plan.name}</span>
            </div>
          )}
          <Link 
            href="/dashboard/settings/subscription"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 hover:bg-yellow-500/20 border border-yellow-500/20 rounded-lg text-[13px] font-bold transition-all shadow-sm"
          >
            <Crown className="w-4 h-4" />
            {language === 'en' ? 'Upgrade Plan' : 'আপগ্রেড করুন'}
          </Link>
        </div>
      </div>

      {isSetupPending ? (
        // ==========================================
        // SETUP PENDING VIEW
        // ==========================================
        <div className="max-w-4xl mx-auto mt-8 space-y-6">
          {showSetupBanner && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/5 border border-primary/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-3xl -z-10 rounded-full mix-blend-multiply" />
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-zinc-200">
                  {language === 'en' ? 'Having trouble setting up? We will do it for FREE 🎁' : 'Setup করতে সমস্যা হচ্ছে? আমরা FREE করে দিব 🎁'}
                </h3>
                <p className="text-slate-500 dark:text-zinc-400 text-sm mt-1">
                  {language === 'en' ? 'New signup? Our team will do your entire Meta + WhatsApp setup for free within the first 7 days.' : 'নতুন signup করেছেন? প্রথম ৭ দিন আমাদের team আপনার পুরো Meta + WhatsApp setup free-তে করে দিবে।'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={(e) => { e.preventDefault(); window.dispatchEvent(new CustomEvent('open-support-widget')); }}
                  className="whitespace-nowrap px-4 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                >
                  {language === 'en' ? 'Get Free Setup →' : 'ফ্রি সেটআপ নিন →'}
                </button>
                <button 
                  onClick={() => setShowSetupBanner(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white/50 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {stats?.features && setupStatus && (
            <SetupJourneyWidget allowedFeatures={stats.features} initialStatus={setupStatus} compact={false} />
          )}
        </div>
      ) : (
        // ==========================================
        // DETAILED DASHBOARD VIEW
        // ==========================================
        <div className="flex flex-col xl:flex-row gap-6">
          
          {/* Main Content (Left) */}
          <div className="flex-1 space-y-6 min-w-0">
            
            {/* Core Usage (Messages & AI) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Message Quota */}
              <div className="bg-white dark:bg-[#0f0f11] rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <MessageSquare className="w-4 h-4 text-primary" />
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                      {language === 'en' ? 'Messaging Usage' : 'মেসেজিং ব্যবহার'}
                    </h3>
                  </div>
                  <Link href="/dashboard/inbox" className="text-xs text-primary font-medium hover:underline">
                    {language === 'en' ? 'Go to Inbox →' : 'ইনবক্স দেখুন →'}
                  </Link>
                </div>
                
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                    {stats?.messages?.used || 0}
                  </span>
                  <span className="text-sm font-medium text-slate-400">
                    / {stats?.messages?.limit || 0}
                  </span>
                </div>
                
                <div className="w-full bg-slate-100 dark:bg-zinc-800 rounded-full h-2 overflow-hidden mb-1">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ${stats?.messages?.percentage > 90 ? 'bg-red-500' : 'bg-primary'}`}
                    style={{ width: `${stats?.messages?.percentage || 0}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>{stats?.messages?.percentage || 0}% {language === 'en' ? 'used this month' : 'ব্যবহৃত'}</span>
                  <span className="text-slate-400">Monthly Quota</span>
                </div>
              </div>

              {/* AI Quota */}
              {stats?.features?.includes('ai_bot') && (
                <div className="bg-white dark:bg-[#0f0f11] rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-purple-500" />
                      </div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                        {language === 'en' ? 'AI Responses Usage' : 'এআই রেসপন্স ব্যবহার'}
                      </h3>
                    </div>
                    <Link href="/dashboard/settings/ai-training" className="text-xs text-purple-500 font-medium hover:underline">
                      {language === 'en' ? 'Train AI →' : 'এআই ট্রেইন করুন →'}
                    </Link>
                  </div>
                  
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                      {stats?.aiQuota?.used || 0}
                    </span>
                    <span className="text-sm font-medium text-slate-400">
                      / {stats?.aiQuota?.limit || 0}
                    </span>
                  </div>
                  
                  <div className="w-full bg-slate-100 dark:bg-zinc-800 rounded-full h-2 overflow-hidden mb-1">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${stats?.aiQuota?.percentage > 90 ? 'bg-red-500' : 'bg-purple-500'}`}
                      style={{ width: `${stats?.aiQuota?.percentage || 0}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>{stats?.aiQuota?.percentage || 0}% {language === 'en' ? 'used this month' : 'ব্যবহৃত'}</span>
                    <span className="text-slate-400">Monthly Quota</span>
                  </div>
                </div>
              )}
            </div>

            {/* Feature Modules */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* E-Commerce Module */}
              {stats?.features?.includes('ecommerce') && (
                <div className="bg-white dark:bg-[#0f0f11] rounded-2xl border border-amber-500/20 shadow-sm overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl -z-10" />
                  <div className="p-4 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4 text-amber-500" />
                      {language === 'en' ? 'E-Commerce Overview' : 'ই-কমার্স ওভারভিউ'}
                    </h3>
                    <Link href="/dashboard/orders" className="text-xs font-medium text-amber-600 hover:underline">
                      View All
                    </Link>
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">{language === 'en' ? 'Monthly Revenue' : 'মাসিক আয়'}</p>
                      <p className="text-xl font-bold text-slate-900 dark:text-white">৳{stats?.orders?.revenue?.toLocaleString() || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">{language === 'en' ? 'Total Products' : 'মোট প্রোডাক্ট'}</p>
                      <p className="text-xl font-bold text-slate-900 dark:text-white">{stats?.orders?.totalProducts || 0}</p>
                    </div>
                    <div className="col-span-2 flex gap-4 pt-4 border-t border-slate-100 dark:border-zinc-800">
                      <div className="flex-1 bg-amber-50 dark:bg-amber-500/5 p-3 rounded-xl border border-amber-100 dark:border-amber-500/10">
                        <p className="text-[11px] text-amber-600 dark:text-amber-500 font-bold uppercase mb-1">Pending Orders</p>
                        <p className="text-2xl font-extrabold text-amber-700 dark:text-amber-400">{stats?.orders?.pending || 0}</p>
                      </div>
                      <div className="flex-1 bg-emerald-50 dark:bg-emerald-500/5 p-3 rounded-xl border border-emerald-100 dark:border-emerald-500/10">
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-500 font-bold uppercase mb-1">Completed</p>
                        <p className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400">{stats?.orders?.completed || 0}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* CRM Module */}
              {stats?.features?.includes('lead_crm') && (
                <div className="bg-white dark:bg-[#0f0f11] rounded-2xl border border-secondary/20 shadow-sm overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/10 rounded-full blur-2xl -z-10" />
                  <div className="p-4 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Users className="w-4 h-4 text-secondary" />
                      {language === 'en' ? 'CRM & Leads' : 'সিআরএম ও লিডস'}
                    </h3>
                    <Link href="/dashboard/leads" className="text-xs font-medium text-secondary hover:underline">
                      Manage Leads
                    </Link>
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-4">
                    <div className="bg-secondary/5 p-4 rounded-xl border border-secondary/10">
                      <p className="text-xs text-secondary font-bold uppercase mb-1">{language === 'en' ? 'Total Active Leads' : 'মোট লিড'}</p>
                      <p className="text-3xl font-extrabold text-slate-900 dark:text-white">{stats?.leads?.total || 0}</p>
                    </div>
                    <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
                      <p className="text-xs text-primary font-bold uppercase mb-1">{language === 'en' ? 'New This Month' : 'নতুন লিড'}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-3xl font-extrabold text-slate-900 dark:text-white">{stats?.leads?.newThisMonth || 0}</p>
                        <TrendingUp className="w-5 h-5 text-primary" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Quick Actions & Recent Activity */}
            <div className="grid md:grid-cols-[1fr_2fr] gap-6">
              
              {/* Quick Actions */}
              <div className="bg-white dark:bg-[#0f0f11] rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm p-4">
                <h3 className="font-bold text-slate-900 dark:text-white text-[13px] mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  {language === 'en' ? 'Quick Actions' : 'কুইক একশন'}
                </h3>
                <div className="flex flex-col gap-2">
                  <Link href="/dashboard/settings/whatsapp" className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/50 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded bg-green-500/10 text-green-600 flex items-center justify-center">
                        <PhoneCall className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-sm font-medium text-slate-700 dark:text-zinc-300">Add WhatsApp</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </Link>

                  <Link href="/dashboard/inbox" className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/50 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded bg-primary/10 text-primary flex items-center justify-center">
                        <Send className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-sm font-medium text-slate-700 dark:text-zinc-300">Send Message</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </Link>

                  {stats?.features?.includes('ecommerce') && (
                    <Link href="/dashboard/products" className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/50 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded bg-amber-500/10 text-amber-600 flex items-center justify-center">
                          <Package className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-sm font-medium text-slate-700 dark:text-zinc-300">Add Product</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  )}

                  {stats?.features?.includes('broadcast') && (
                    <Link href="/dashboard/broadcast" className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/50 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded bg-violet-500/10 text-violet-600 flex items-center justify-center">
                          <Megaphone className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-sm font-medium text-slate-700 dark:text-zinc-300">New Broadcast</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  )}
                </div>
              </div>

              {/* Recent Activity Feed */}
              <div className="bg-white dark:bg-[#0f0f11] rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm p-4 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-slate-900 dark:text-white text-[13px]">
                    {language === 'en' ? 'Recent Activity' : 'সাম্প্রতিক অ্যাক্টিভিটি'}
                  </h3>
                  <Link href="/dashboard/inbox" className="text-[11px] font-medium text-primary hover:underline">
                    View All
                  </Link>
                </div>
                
                {stats?.activity?.length > 0 ? (
                  <div className="flex-1 space-y-4">
                    {stats.activity.map((act: any) => (
                      <div key={act.id} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                          {act.title.includes('received') ? (
                            <ArrowRight className="w-3.5 h-3.5 text-secondary rotate-90" />
                          ) : (
                            <Send className="w-3.5 h-3.5 text-primary" />
                          )}
                        </div>
                        <div>
                          <p className="text-[13px] text-slate-900 dark:text-white font-medium">
                            {act.title} • <span className="text-primary">{act.contactName}</span>
                          </p>
                          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">{act.description}</p>
                          <p className="text-[10px] text-slate-400 mt-1">
                            {new Date(act.time).toLocaleDateString()} {new Date(act.time).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-slate-50 dark:bg-zinc-800/30 rounded-xl border border-dashed border-slate-200 dark:border-zinc-700">
                    <CheckCircle2 className="w-8 h-8 text-slate-300 dark:text-zinc-600 mb-2" />
                    <p className="text-[13px] text-slate-500 font-medium">No recent activity</p>
                    <p className="text-[11px] text-slate-400">Incoming messages and events will appear here.</p>
                  </div>
                )}
              </div>

            </div>

          </div>

          {/* Right Sidebar (Compact Setup Journey) */}
          {stats?.features && setupStatus && (
            <div className="w-full xl:w-[320px] shrink-0">
              <SetupJourneyWidget allowedFeatures={stats.features} initialStatus={setupStatus} compact={true} />
            </div>
          )}

        </div>
      )}

    </div>
  );
}
