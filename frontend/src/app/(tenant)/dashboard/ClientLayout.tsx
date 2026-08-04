'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLanguage } from '@/components/LanguageProvider';
import { useCurrency } from '@/components/CurrencyProvider';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { useFeature } from '@/hooks/useFeature';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { 
 MessageSquare,
 MessageCircle,
 LayoutGrid, 
 Inbox, 
 Megaphone, 
 Settings2, 
 ShoppingCart, 
 ShoppingBag,
 BarChart3, 
 Globe, 
 LogOut, 
 Moon, 
 Sun, 
 Bell,
 ChevronDown,
 Menu,
 PhoneCall,
 ThumbsUp,
 Zap,
 Key,
 Webhook,
 ShieldCheck,
 PlayCircle,
 Crown,
 Wallet,
 UserCircle,
 Tag,
 Camera,
 Receipt,
 Lock,
 Pin,
 X
} from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';
import SupportWidget from '@/components/SupportWidget';
import { toast, Toaster } from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function TenantLayout({ children }: { children: React.ReactNode }) {
 const pathname = usePathname();
 const router = useRouter();
 const { language, setLanguage } = useLanguage();
 const { fromCurrency, formatBDT, loading: currencyLoading } = useCurrency();
 const { theme, setTheme } = useTheme();
 const [mounted, setMounted] = useState(false);
 const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
 const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
 const [userProfile, setUserProfile] = useState<any>(null);
 const [inboxUnreadCount, setInboxUnreadCount] = useState(0);
 const [showTrialModal, setShowTrialModal] = useState(false);
 const [showFeatureLockedModal, setShowFeatureLockedModal] = useState(false);
 const [allowedFeatures, setAllowedFeatures] = useState<string[]>(['*']);
 const [avatarError, setAvatarError] = useState(false);


 const hasAgentPresence = useFeature('agent_presence');
 const [presenceStatus, setPresenceStatus] = useState<'available' | 'busy' | 'away' | 'offline'>('available');
 const [showPresenceMenu, setShowPresenceMenu] = useState(false);

 const handlePresenceChange = async (status: string) => {
   setPresenceStatus(status as any);
   setShowPresenceMenu(false);
   try {
     const token = Cookies.get('access_token');
     await fetch(`${API}/inbox/presence`, {
       method: 'PATCH',
       headers: {
         'Content-Type': 'application/json',
         Authorization: `Bearer ${token}`
       },
       body: JSON.stringify({ status })
     });
   } catch (err) {
     console.error(err);
   }
 };

 // Auto-collapsible sidebar state for Inbox page
 const isInboxPage = pathname.startsWith('/dashboard/inbox');
 const [sidebarPinned, setSidebarPinned] = useState(false);
 const [sidebarHovered, setSidebarHovered] = useState(false);
 const isSidebarCollapsed = isInboxPage && !sidebarPinned && !sidebarHovered;

 useEffect(() => {
 setMounted(true);
 const token = Cookies.get('access_token');
 
 // Global fetch interceptor for Trial/Subscription expiration (402 Payment Required)
 const originalFetch = window.fetch;
 window.fetch = async (...args) => {
 const response = await originalFetch(...args);
 if (response.status === 402) {
 setShowTrialModal(true);
 }
 return response;
 };
 
 const fetchUserAndQuotas = async () => {
 try {
 const [userRes, quotasRes, unreadRes] = await Promise.all([
 fetch(`${API}/auth/me`, { headers: { 'Authorization': `Bearer ${token}` } }),
 fetch(`${API}/billing/quotas`, { headers: { 'Authorization': `Bearer ${token}` } }),
 fetch(`${API}/inbox/unread-count`, { headers: { 'Authorization': `Bearer ${token}` } })
 ]);
 if (userRes.ok) {
 const userData = await userRes.json();
 setUserProfile(userData);
  if (userData.tenant && userData.tenant.isOnboarded === false && !window.location.pathname.includes('/onboarding')) {
  router.push('/dashboard/onboarding');
  }

  // Global Spotlight Tour for New Tenants
  if (typeof window !== 'undefined') {
    const tourSeen = localStorage.getItem('zinichat_global_tour_seen') === 'true';
    if (!tourSeen) {
      setTimeout(() => {
        try {
          const driverObj = driver({
            showProgress: true,
            animate: true,
            onDestroyed: () => {
              localStorage.setItem('zinichat_global_tour_seen', 'true');
            },
            steps: [
              { 
                element: '#sidebar-inbox', 
                popover: { 
                  title: language === 'en' ? '📬 Live Inbox' : '📬 লাইভ ইনবক্স', 
                  description: language === 'en' ? 'Manage customer conversations from WhatsApp, Facebook, and Instagram in real-time.' : 'হোয়াটসঅ্যাপ, ফেসবুক ও ইনস্টাগ্রামের সমস্ত কাস্টমার চ্যাট এক ইনবক্সে হ্যান্ডেল করুন।',
                  side: "right", 
                  align: 'start' 
                } 
              },
              { 
                element: '#sidebar-ai-training', 
                popover: { 
                  title: language === 'en' ? '🤖 AI Assistant Training' : '🤖 এআই ট্রেইনিং', 
                  description: language === 'en' ? 'Train your AI assistant with your business Q&As, products, and persona.' : 'আপনার ব্যবসার তথ্য ও প্রম্পট দিয়ে এআই-কে স্মার্ট করার ট্রেনিং দিন।',
                  side: "right", 
                  align: 'start' 
                } 
              },
              { 
                element: '#sidebar-inboxes', 
                popover: { 
                  title: language === 'en' ? '🔌 Channel Integration' : '🔌 চ্যানেল ইন্টিগ্রেশন', 
                  description: language === 'en' ? 'Connect Meta Official WhatsApp API, Facebook Pages, or Instagram DMs.' : 'অফিসিয়াল হোয়াটসঅ্যাপ এপিআই বা সামাজিক মাধ্যম কানেক্ট করুন।',
                  side: "right", 
                  align: 'start' 
                } 
              }
            ]
          });
          driverObj.drive();
        } catch (e) {
          console.error('Driver.js tour error', e);
        }
      }, 1200);
    }
  }
 }
 if (quotasRes.ok) {
 const quotas = await quotasRes.json();
 if (quotas.features) {
 setAllowedFeatures(quotas.features);
 }
 }
 if (unreadRes.ok) {
 const unreadData = await unreadRes.json();
 setInboxUnreadCount(unreadData.unreadCount || 0);
 }
 } catch (err) { console.error(err); }
 };
 if (token) fetchUserAndQuotas();

 // Connect to Inbox Socket for global unread badge & bottom-right real-time toast
 let socket: any;
 if (token) {
 import('socket.io-client').then(({ io }) => {
 socket = io(`${API}/inbox`, { 
 auth: { token },
 transports: ['polling', 'websocket'] 
 });
 socket.on('new_message', (data: any) => {
 // If we are not currently on the inbox page, increment badge & show bottom-right toast
 if (!window.location.pathname.includes('/dashboard/inbox')) {
 setInboxUnreadCount(prev => prev + 1);

        const senderName =
          data.contact?.name ||
          data.contact?.pushName ||
          data.conversation?.contact?.name ||
          data.conversation?.contactName ||
          data.contactName ||
          data.message?.senderName ||
          data.contact?.phoneNo ||
          data.contact?.phoneNumber ||
          data.conversation?.externalThreadId ||
          'New Contact';

        let msgSnippet = data.text || data.message?.content?.body || data.message?.content?.text || '';
        if (!msgSnippet && typeof data.message?.content === 'string') {
          try {
            const parsed = JSON.parse(data.message.content);
            msgSnippet = parsed.body || parsed.text || (parsed.mediaUrl ? '📷 Photo' : 'New Message');
          } catch (e) {
            msgSnippet = data.message.content;
          }
        }
        if (!msgSnippet) msgSnippet = 'New Message';

        toast.custom(
          (t) => (
            <div
              onClick={() => {
                toast.dismiss(t.id);
                router.push(`/dashboard/inbox?id=${data.conversation?.id || data.conversationId || ''}`);
              }}
              className={`${
                t.visible ? 'animate-in slide-in-from-bottom-5 duration-300' : 'animate-out fade-out duration-200'
              } max-w-sm w-full bg-slate-900/95 text-white shadow-2xl rounded-2xl p-3.5 border border-emerald-500/30 flex items-start gap-3 cursor-pointer hover:bg-slate-800 transition-all group`}
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-md">
                {senderName.substring(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <h4 className="text-xs font-bold text-emerald-400 truncate">{senderName}</h4>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] text-zinc-400">Just now</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toast.dismiss(t.id);
                      }}
                      className="p-1 hover:bg-white/10 rounded-md text-zinc-400 hover:text-white transition-colors"
                      title="Close notification"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-zinc-200 truncate mt-0.5">{msgSnippet}</p>
                <span className="text-[10px] text-emerald-400 font-semibold mt-1 inline-flex items-center gap-1 group-hover:underline">
                  Click to reply →
                </span>
              </div>
            </div>
          ),
          { position: 'bottom-right', duration: 5000 }
        ); }
 });
 });
 }

 return () => {
 if (socket) socket.disconnect();
 window.fetch = originalFetch;
 };
 }, []);

 // Clear unread count when visiting inbox
 useEffect(() => {
 if (pathname.includes('/dashboard/inbox')) {
 setInboxUnreadCount(0);
 }
 }, [pathname]);

 // Prevent direct URL access to locked features
 useEffect(() => {
 if (!allowedFeatures.includes('*') && !hasAccess(pathname)) {
 setShowFeatureLockedModal(true);
 router.push('/dashboard');
 }
 }, [pathname, allowedFeatures]);

 const handleLogout = () => {
 Cookies.remove('access_token');
 Cookies.remove('user_role');
 router.push('/login');
 };



 // Map required features for each module
 const featureMap: Record<string, string[]> = {
 '/dashboard/leads': ['lead_manage'],
 '/dashboard/products': ['commerce'],
 '/dashboard/orders': ['commerce'],
 '/dashboard/broadcasts': ['broadcast'],
 '/dashboard/settings/inboxes': ['whatsapp', 'messenger', 'instagram_dm'],
 '/dashboard/settings/ai-training': ['ai_assistant'],
 '/dashboard/team': ['team_management'],
 '/dashboard/settings/labels': ['contact_labels'],
 };

 const hasAccess = (href: string) => {
 if (allowedFeatures.includes('*')) return true; // still loading
 const requiredFeature = featureMap[href];
 if (!requiredFeature) return true; // no restriction
 return requiredFeature.some(f => allowedFeatures.includes(f));
 };

  const menuGroups = [
    {
      title: language === 'en' ? 'MY HOME' : 'আমার হোম',
      items: [
        { name: language === 'en' ? 'Dashboard' : 'ড্যাশবোর্ড', icon: LayoutGrid, href: '/dashboard' },
      ]
    },
    {
      title: language === 'en' ? 'AUTOMATION' : 'অটোমেশন',
      items: [
        { name: language === 'en' ? 'Live Inbox' : 'লাইভ ইনবক্স', icon: Inbox, href: '/dashboard/inbox', id: 'sidebar-inbox' },
        { name: language === 'en' ? 'Channel Integration' : 'চ্যানেল ইন্টিগ্রেশন', icon: Webhook, href: '/dashboard/settings/inboxes', id: 'sidebar-inboxes' },
        { name: language === 'en' ? 'AI Training' : 'এআই ট্রেইনিং', icon: Zap, href: '/dashboard/settings/ai-training', id: 'sidebar-ai-training' },
      ]
    },
    {
      title: language === 'en' ? 'OTHERS' : 'অন্যান্য',
      items: [
        { name: language === 'en' ? 'Leads' : 'লিডস', icon: UserCircle, href: '/dashboard/leads' },
        { name: language === 'en' ? 'Product List' : 'প্রোডাক্ট লিস্ট', icon: ShoppingCart, href: '/dashboard/products' },
        { name: language === 'en' ? 'Manage Order' : 'ম্যানেজ অর্ডার', icon: ShoppingBag, href: '/dashboard/orders' },
        { name: language === 'en' ? 'Broadcasts' : 'ব্রডকাস্ট', icon: Megaphone, href: '/dashboard/broadcasts' },
        { name: language === 'en' ? 'Team' : 'টিম', icon: UserCircle, href: '/dashboard/team' },
        { name: language === 'en' ? 'Tags' : 'ট্যাগ', icon: Tag, href: '/dashboard/settings/labels' },
        { name: language === 'en' ? 'Support Ticket' : 'সাপোর্ট টিকিট', icon: MessageSquare, href: '/dashboard/support' },
      ]
    },
    {
      title: language === 'en' ? 'SETTINGS' : 'সেটিংস',
      items: [
        { name: language === 'en' ? 'Storage' : 'স্টোরেজ', icon: Settings2, href: '/dashboard/settings/storage' },
        { name: language === 'en' ? 'Subscription' : 'সাবস্ক্রিপশন', icon: Crown, href: '/dashboard/settings/subscription' },
        { name: language === 'en' ? 'Billing History' : 'বিলিং হিস্ট্রি', icon: Receipt, href: '/dashboard/settings/billing-history' },
      ]
    }
  ];

 if (pathname === '/dashboard/onboarding') {
 return (
 <div className="min-h-screen bg-slate-50 text-[#334155] w-full overflow-y-auto p-4 md:p-8">
 {children}
 </div>
 );
 }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-transparent text-foreground">
      
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside 
        onMouseEnter={() => isInboxPage && setSidebarHovered(true)}
        onMouseLeave={() => isInboxPage && setSidebarHovered(false)}
        className={`
          fixed md:relative z-50 h-full 
          ${isSidebarCollapsed ? 'w-[56px]' : 'w-[165px]'} 
          border-r border-border bg-surface backdrop-blur-2xl 
          shadow-[4px_0_24px_rgba(31,130,74,0.03)]
          flex flex-col shrink-0 transition-all duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Logo Area */}
        <div className="h-14 px-1 flex items-center justify-between gap-1 border-b border-border/50 shrink-0 relative">
          <Link href="/dashboard" className="flex-1 flex items-center h-full hover:opacity-90 w-full relative">
            <img 
              src="/icon.png" 
              alt="ZiniChat" 
              className={`absolute left-1 top-1/2 -translate-y-1/2 w-[46px] h-[46px] object-contain transition-all duration-200 ${isSidebarCollapsed ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'}`} 
            />
            <img 
              src="/logo.png" 
              alt="ZiniChat Logo" 
              className={`absolute left-1 top-1/2 -translate-y-1/2 h-[46px] w-[150px] object-contain object-left transition-all duration-200 ${isSidebarCollapsed ? 'opacity-0 scale-75 pointer-events-none' : 'opacity-100 scale-100'}`} 
            />
          </Link>
          {isInboxPage && !isSidebarCollapsed && (
            <button 
              onClick={() => setSidebarPinned(!sidebarPinned)}
              title={sidebarPinned ? (language === 'en' ? 'Unpin Sidebar' : 'সাইডবার আনপিন করুন') : (language === 'en' ? 'Pin Sidebar' : 'সাইডবার পিন করুন')}
              className="hidden md:flex p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
            >
              <Pin className={`w-3.5 h-3.5 ${sidebarPinned ? 'text-primary rotate-45' : ''}`} />
            </button>
          )}
          <button 
            className="md:hidden text-slate-400 hover:text-slate-600"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <ChevronDown className="w-5 h-5 rotate-90" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-1.5 py-2 space-y-3 overflow-y-auto custom-scrollbar">
          {menuGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="flex flex-col">
              {!isSidebarCollapsed && (
                <div className="px-3 mb-1.5 mt-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {group.title}
                </div>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  const isLocked = !hasAccess(item.href);

                  return (
                    <div key={item.name} className="flex flex-col relative">
                      <Link 
                        id={item.id}
                        href={item.href}
                        title={isSidebarCollapsed ? item.name : undefined}
                        onClick={(e) => {
                          if (isLocked) {
                            e.preventDefault();
                            setShowFeatureLockedModal(true);
                          } else {
                            setIsMobileMenuOpen(false);
                          }
                        }}
                        className={`group flex items-center ${isSidebarCollapsed ? 'justify-center px-1 py-2' : 'justify-between px-2 py-1.5'} rounded-lg text-[12px] font-medium transition-all ${
                          isActive
                            ? 'bg-gradient-to-r from-primary/15 via-primary/10 to-amber-500/10 text-primary shadow-[0_2px_10px_rgba(31,130,74,0.12)] border border-primary/25 font-bold'
                            : 'text-slate-600 hover:bg-primary/5 hover:text-primary hover:border-primary/10 border border-transparent'
                        } ${isLocked ? 'opacity-80' : ''}`}
                      >
                        <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-2.5'}`}>
                          <item.icon className={`w-4 h-4 transition-colors ${isActive ? 'text-primary' : 'text-slate-400 group-hover:text-primary/70'}`} />
                          {!isSidebarCollapsed && (
                            <>
                              <span className={isActive ? 'text-primary font-bold' : ''}>{item.name}</span>
                              {isLocked && <Lock className="w-3 h-3 text-amber-500 ml-1" />}
                            </>
                          )}
                        </div>
                        
                        {/* Inbox Badge */}
                        {!isSidebarCollapsed ? (
                          <div className="flex items-center gap-2">
                            {(item.name === 'Live Inbox' || item.name === 'লাইভ ইনবক্স') && inboxUnreadCount > 0 && (
                              <span className="flex h-5 items-center justify-center rounded-full bg-red-500 px-2 text-[10px] font-bold text-white">
                                {inboxUnreadCount > 99 ? '99+' : inboxUnreadCount}
                              </span>
                            )}
                          </div>
                        ) : (
                          (item.name === 'Live Inbox' || item.name === 'লাইভ ইনবক্স') && inboxUnreadCount > 0 && (
                            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                          )
                        )}
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>


 {/* Main Content Area */}
 <main className="flex-1 flex flex-col min-w-0">
 
 {/* Topbar */}
 <header className="h-16 md:h-14 px-4 md:px-3 flex items-center justify-between shrink-0 bg-surface/70 backdrop-blur-xl border-b border-border shadow-sm relative z-40">
 <div className="flex items-center gap-3 md:gap-2">
 <button 
 className="md:hidden p-2.5 -ml-2.5 text-slate-500 hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"
 onClick={() => setIsMobileMenuOpen(true)}
 >
 <Menu className="w-6 h-6 md:w-3.5 md:h-3.5" />
 </button>
 <div className="hidden md:flex w-7 h-7 rounded bg-primary/10 items-center justify-center text-primary">
 <LayoutGrid className="w-3.5 h-3.5" />
 </div>
 <h2 className="text-[16px] md:text-[13px] font-bold text-foreground tracking-tight">
  {language === 'en' ? 'Overview' : 'ওভারভিউ'}
  </h2>

  </div>
  
  <div className="flex items-center gap-2 md:gap-1.5">
  {mounted && (
   <button
   onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
   title={language === 'en' ? 'Switch to Bengali' : 'Switch to English'}
   className="relative flex items-center justify-between w-[46px] h-6 bg-surface-hover/60 border border-surface-hover rounded-full p-0.5 overflow-hidden transition-colors hover:border-primary/50 mx-1 cursor-pointer"
   >
   <div
   className={`absolute top-[1px] bottom-[1px] w-[20px] bg-primary rounded-full transition-transform duration-300 shadow-sm ${
   language === 'bn' ? 'translate-x-[20px]' : 'translate-x-0'
   }`}
   />
   <span className={`relative z-10 w-1/2 text-[9px] font-bold text-center transition-colors ${language === 'en' ? 'text-white' : 'text-zinc-400'}`}>EN</span>
   <span className={`relative z-10 w-1/2 text-[9px] font-bold text-center transition-colors ${language === 'bn' ? 'text-white' : 'text-zinc-400'}`}>BN</span>
   </button>
   )}
  
   {mounted && (
     <button
       onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
       title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
       className="p-2 md:p-1.5 rounded-xl bg-surface-hover/60 border border-surface-hover hover:border-primary/40 text-foreground transition-all cursor-pointer flex items-center justify-center"
     >
       {theme === 'dark' ? (
         <Sun className="w-5 h-5 md:w-3.5 md:h-3.5 text-amber-400" />
       ) : (
         <Moon className="w-5 h-5 md:w-3.5 md:h-3.5 text-slate-600 dark:text-zinc-300" />
       )}
     </button>
   )}
  
   {mounted && <NotificationBell />}

   {mounted && hasAgentPresence && (
     <div className="relative z-50">
       <button
         onClick={() => setShowPresenceMenu(!showPresenceMenu)}
         className="flex items-center gap-1.5 px-3 py-1.5 md:px-2.5 md:py-1 bg-surface-hover/60 border border-surface-hover hover:border-primary/40 rounded-full text-[13px] md:text-[11px] font-medium text-foreground shadow-2xs transition-all cursor-pointer"
       >
         <span className={`w-2 h-2 rounded-full ${
           presenceStatus === 'available' ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]' :
           presenceStatus === 'busy' ? 'bg-amber-500' :
           presenceStatus === 'away' ? 'bg-yellow-500' : 'bg-slate-400'
         }`} />
         <span className="capitalize">{presenceStatus}</span>
         <ChevronDown className="w-3 h-3 text-zinc-400" />
       </button>

       {showPresenceMenu && (
         <div className="absolute right-0 mt-1 w-32 bg-surface/95 backdrop-blur-xl border border-surface-hover rounded-xl shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
           {[
             { id: 'available', label: 'Available', color: 'bg-emerald-500' },
             { id: 'busy', label: 'Busy', color: 'bg-amber-500' },
             { id: 'away', label: 'Away', color: 'bg-yellow-500' },
             { id: 'offline', label: 'Offline', color: 'bg-slate-400' },
           ].map(item => (
             <button
               key={item.id}
               onClick={() => handlePresenceChange(item.id)}
               className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-left hover:bg-surface-hover transition-colors cursor-pointer ${presenceStatus === item.id ? 'font-bold text-foreground bg-surface-hover' : 'text-zinc-400'}`}
             >
               <span className={`w-2 h-2 rounded-full ${item.color}`} />
               {item.label}
             </button>
           ))}
         </div>
       )}
     </div>
   )}

 {isProfileMenuOpen && (
 <div 
 className="fixed inset-0 z-40"
 onClick={() => setIsProfileMenuOpen(false)}
 />
 )}
 <div className="relative ml-1 md:ml-2 z-50">
 <button 
 className="flex items-center outline-none cursor-pointer"
 onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
 >
 {userProfile?.profilePicUrl && !avatarError ? (
 <img
 src={`${API}${userProfile.profilePicUrl}`}
 alt="Avatar"
 className="w-10 h-10 md:w-8 md:h-8 rounded-full object-cover border border-surface-hover"
 onError={() => setAvatarError(true)}
 />
 ) : (
 <div className="w-10 h-10 md:w-7 md:h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[14px] md:text-[10px] font-bold uppercase border border-primary/20">
 {userProfile?.name?.charAt(0) || 'U'}
 </div>
 )}
 </button>
 
 {/* Dropdown menu */}
 <div className={`absolute right-0 top-full mt-2 w-48 bg-surface/95 backdrop-blur-xl border border-surface-hover rounded-xl shadow-2xl transition-all overflow-hidden ${isProfileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
 <div className="px-3 py-2 border-b border-surface-hover">
 <p className="text-[12px] font-semibold text-foreground truncate">{userProfile?.name || (language === 'en' ? 'My Account' : 'আমার অ্যাকাউন্ট')}</p>
 <p className="text-[10px] text-zinc-400 truncate">{userProfile?.email || ''}</p>
 </div>
 <div className="p-1.5">
 <Link 
 href="/dashboard/profile" 
 onClick={() => setIsProfileMenuOpen(false)}
 className="flex items-center gap-2 px-2 py-1.5 text-[12px] text-zinc-300 hover:bg-surface-hover rounded-md transition-colors"
 >
 <UserCircle className="w-3.5 h-3.5" />
 {language === 'en' ? 'Profile' : 'প্রোফাইল'}
 </Link>
 <button onClick={handleLogout} className="w-full flex items-center gap-2 px-2 py-1.5 text-[12px] text-red-400 hover:bg-red-500/10 rounded-md transition-colors mt-0.5 cursor-pointer">
 <LogOut className="w-3.5 h-3.5" />
 {language === 'en' ? 'Logout' : 'লগআউট'}
 </button>
 </div>
 </div>
 </div>
 </div>
 </header>

 {/* Page Content */}
 <div className={`flex-1 overflow-auto custom-scrollbar pb-14 md:pb-0 ${pathname.includes('/inbox') ? 'p-0' : 'p-3'}`}>
 {children}
 </div>

 {/* Mobile Bottom Navigation Bar */}
 <div className="md:hidden fixed bottom-0 left-0 right-0 h-[64px] bg-white/95 dark:bg-surface/95 backdrop-blur-xl border-t border-slate-200 dark:border-surface-hover z-50 flex items-center justify-around px-1 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] pb-safe">
   <Link 
     href="/dashboard" 
     className={`flex flex-col items-center justify-center w-full h-full text-[11px] font-medium transition-colors ${pathname === '/dashboard' ? 'text-primary font-bold' : 'text-slate-500 dark:text-zinc-400'}`}
   >
     <LayoutGrid className={`w-6 h-6 mb-1 ${pathname === '/dashboard' ? 'fill-primary/10 stroke-[2.5px]' : 'stroke-2'}`} />
     <span>{language === 'en' ? 'Home' : 'হোম'}</span>
   </Link>

   <Link 
     href="/dashboard/inbox" 
     className={`flex flex-col items-center justify-center w-full h-full text-[11px] font-medium transition-colors relative ${pathname.includes('/inbox') ? 'text-primary font-bold' : 'text-slate-500 dark:text-zinc-400'}`}
   >
     <div className="relative">
       <Inbox className={`w-6 h-6 mb-1 ${pathname.includes('/inbox') ? 'fill-primary/10 stroke-[2.5px]' : 'stroke-2'}`} />
       {inboxUnreadCount > 0 && (
         <span className="absolute -top-1 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
           {inboxUnreadCount > 99 ? '99+' : inboxUnreadCount}
         </span>
       )}
     </div>
     <span>{language === 'en' ? 'Inbox' : 'ইনবক্স'}</span>
   </Link>

   <Link 
     href="/dashboard/leads" 
     className={`flex flex-col items-center justify-center w-full h-full text-[11px] font-medium transition-colors ${pathname.includes('/leads') ? 'text-primary font-bold' : 'text-slate-500 dark:text-zinc-400'}`}
   >
     <UserCircle className={`w-6 h-6 mb-1 ${pathname.includes('/leads') ? 'fill-primary/10 stroke-[2.5px]' : 'stroke-2'}`} />
     <span>{language === 'en' ? 'Leads' : 'লিডস'}</span>
   </Link>

   <Link 
     href="/dashboard/orders" 
     className={`flex flex-col items-center justify-center w-full h-full text-[11px] font-medium transition-colors ${pathname.includes('/orders') ? 'text-primary font-bold' : 'text-slate-500 dark:text-zinc-400'}`}
   >
     <ShoppingBag className={`w-6 h-6 mb-1 ${pathname.includes('/orders') ? 'fill-primary/10 stroke-[2.5px]' : 'stroke-2'}`} />
     <span>{language === 'en' ? 'Orders' : 'অর্ডার'}</span>
   </Link>

   <button 
     onClick={() => setIsMobileMenuOpen(true)}
     className="flex flex-col items-center justify-center w-full h-full text-[11px] font-medium text-slate-500 dark:text-zinc-400 hover:text-primary transition-colors"
   >
     <Menu className="w-6 h-6 mb-1 stroke-2" />
     <span>{language === 'en' ? 'Menu' : 'মেনু'}</span>
   </button>
 </div>
 </main>

 {/* Trial Expired Modal */}
 {showTrialModal && (
 <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-1.5">
 <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center border border-red-500/20">
 <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
 <Crown className="w-8 h-8" />
 </div>
 <h3 className="text-2xl font-bold text-slate-900 mb-2">Trial Expired</h3>
 <p className="text-slate-600 mb-8">
 Your free trial has ended. Please subscribe to a plan to continue using this feature and unlock all premium capabilities.
 </p>
 <div className="flex gap-2">
 <button 
 onClick={() => setShowTrialModal(false)}
 className="flex-1 px-1.5 py-1 rounded-xl border border-slate-200 font-medium hover:bg-slate-50 :bg-zinc-800 transition-colors"
 >
 Close
 </button>
 <button 
 onClick={() => {
 setShowTrialModal(false);
 router.push('/dashboard/settings/subscription');
 }}
 className="flex-1 px-1.5 py-1 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
 >
 Subscribe Now
 </button>
 </div>
 </div>
 </div>
 )}

 {/* Feature Locked Modal */}
 {showFeatureLockedModal && (
 <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-1.5">
 <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center border border-amber-500/20">
 <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
 <Lock className="w-8 h-8" />
 </div>
 <h3 className="text-2xl font-bold text-slate-900 mb-2">
 {language === 'en' ? 'Feature Locked' : 'ফিচারটি লক করা আছে'}
 </h3>
 <p className="text-slate-600 mb-8">
 {language === 'en' 
 ? 'This feature is not available in your current plan. Please upgrade your subscription to access it.'
 : 'এই ফিচারটি আপনার বর্তমান প্ল্যানে নেই। এটি ব্যবহার করতে আপনার প্ল্যান আপগ্রেড করুন।'}
 </p>
 <div className="flex gap-2">
 <button 
 onClick={() => setShowFeatureLockedModal(false)}
 className="flex-1 px-1.5 py-1 rounded-xl border border-slate-200 font-medium hover:bg-slate-50 :bg-zinc-800 transition-colors"
 >
 {language === 'en' ? 'Close' : 'বন্ধ করুন'}
 </button>
 <button 
 onClick={() => {
 setShowFeatureLockedModal(false);
 router.push('/dashboard/settings/subscription');
 }}
 className="flex-1 px-1.5 py-1 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-medium shadow-lg shadow-orange-500/20 hover:scale-105 transition-transform"
 >
 {language === 'en' ? 'Upgrade Plan' : 'আপগ্রেড করুন'}
 </button>
 </div>
 </div>
 </div>
 )}

 {/* Floating Action Buttons or Modals */}
 {(allowedFeatures.includes('*') || allowedFeatures.includes('platform_support_ai')) && (
 <SupportWidget />
 )}

 </div>
 );
}
