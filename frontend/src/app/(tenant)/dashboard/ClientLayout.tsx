'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLanguage } from '@/components/LanguageProvider';
import { useCurrency } from '@/components/CurrencyProvider';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
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
 Lock
} from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';
import SupportWidget from '@/components/SupportWidget';

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
 const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

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

 // Connect to Inbox Socket for global unread badge
 let socket: any;
 if (token) {
 import('socket.io-client').then(({ io }) => {
 socket = io(`${API}/inbox`, { 
 auth: { token },
 transports: ['polling', 'websocket'] 
 });
 socket.on('new_message', (data: any) => {
 // If we are not currently on the inbox page, increment badge
 if (!window.location.pathname.includes('/dashboard/inbox')) {
 setInboxUnreadCount(prev => prev + 1);
 }
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

 const toggleSubmenu = (menuName: string, e: React.MouseEvent) => {
 e.preventDefault();
 setOpenMenus(prev => ({ ...prev, [menuName]: !prev[menuName] }));
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

 const navItems = [
 { name: language === 'en' ? 'Home' : 'হোম', icon: LayoutGrid, href: '/dashboard' },
 { name: language === 'en' ? 'Live Inbox' : 'লাইভ ইনবক্স', icon: Inbox, href: '/dashboard/inbox' },
 { name: language === 'en' ? 'Leads' : 'লিডস', icon: UserCircle, href: '/dashboard/leads' },
 { name: language === 'en' ? 'Product List' : 'প্রোডাক্ট লিস্ট', icon: ShoppingCart, href: '/dashboard/products' },
 { name: language === 'en' ? 'Manage Order' : 'ম্যানেজ অর্ডার', icon: ShoppingBag, href: '/dashboard/orders' },
 { name: language === 'en' ? 'Broadcasts' : 'ব্রডকাস্ট', icon: Megaphone, href: '/dashboard/broadcasts' },
 { name: language === 'en' ? 'Subscription' : 'সাবস্ক্রিপশন', icon: Crown, href: '/dashboard/settings/subscription' },
 { name: language === 'en' ? 'Billing History' : 'বিলিং হিস্ট্রি', icon: Receipt, href: '/dashboard/settings/billing-history' },
 { name: language === 'en' ? 'Support Ticket' : 'সাপোর্ট টিকিট', icon: MessageSquare, href: '/dashboard/support' },
 { 
 name: language === 'en' ? 'Settings' : 'সেটিংস', 
 icon: Settings2, 
 href: '/dashboard/settings', 
 hasSubmenu: true,
 subItems: [
 { name: language === 'en' ? 'Inboxes' : 'ইনবক্সসমূহ', icon: Webhook, href: '/dashboard/settings/inboxes' },
 { name: language === 'en' ? 'Team' : 'টিম', icon: UserCircle, href: '/dashboard/team' },
 { name: language === 'en' ? 'AI Training' : 'এআই ট্রেইনিং', icon: Zap, href: '/dashboard/settings/ai-training' },
 { name: language === 'en' ? 'Labels' : 'লেবেলস', icon: Tag, href: '/dashboard/settings/labels' },
 { name: language === 'en' ? 'Storage' : 'স্টোরেজ', icon: Settings2, href: '/dashboard/settings/storage' },
 ]
 },
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
 <aside className={`
 fixed md:relative z-50 h-full w-[165px] 
 border-r border-border bg-surface backdrop-blur-2xl 
 shadow-[4px_0_24px_rgba(31,130,74,0.03)]
 flex flex-col shrink-0 transition-transform duration-300 ease-in-out
 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
 `}>
 
 {/* Logo Area */}
 <div className="h-12 px-3 flex items-center justify-between gap-2 border-b border-slate-200 shrink-0">
 <Link href="/dashboard" className="flex-1 flex items-center justify-start h-full py-0.5 hover:opacity-90 transition-opacity overflow-hidden">
 <img src="/logo.png" alt="ZiniChat Logo" className="h-full w-full object-contain object-left scale-[1.3] origin-left ml-2" />
 </Link>
 <button 
 className="md:hidden text-slate-400 hover:text-slate-600"
 onClick={() => setIsMobileMenuOpen(false)}
 >
 <ChevronDown className="w-5 h-5 rotate-90" />
 </button>
 </div>

 {/* Navigation Links */}
 <nav className="flex-1 px-1.5 py-1.5 space-y-0.5 overflow-y-auto custom-scrollbar">
 {navItems.map((item) => {
 const isActive = pathname === item.href || (item.subItems && item.subItems.some(sub => pathname.startsWith(sub.href)));
 const isExpanded = openMenus[item.name];

 const isLocked = !item.hasSubmenu && !hasAccess(item.href);

 return (
 <div key={item.name} className="flex flex-col">
 <Link 
 href={item.hasSubmenu ? '#' : item.href}
 onClick={(e) => {
 if (item.hasSubmenu) {
 toggleSubmenu(item.name, e);
 } else if (isLocked) {
 e.preventDefault();
 setShowFeatureLockedModal(true);
 } else {
 setIsMobileMenuOpen(false);
 }
 }}
 className={`group flex items-center justify-between px-2 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
 isActive && !item.hasSubmenu
 ? 'bg-gradient-to-r from-primary/15 to-primary/5 text-primary shadow-[0_2px_10px_rgba(31,130,74,0.1)] border border-primary/20'
 : 'text-slate-600 hover:bg-primary/5 hover:text-primary hover:border-primary/10 border border-transparent'
 } ${isLocked ? 'opacity-80' : ''}`}
 >
 <div className="flex items-center gap-2.5">
 <item.icon className={`w-3.5 h-3.5 transition-colors ${isActive ? 'text-primary' : 'text-slate-400 group-hover:text-primary/70'}`} />
 <span className={isActive ? 'text-primary' : ''}>{item.name}</span>
 {isLocked && <Lock className="w-3 h-3 text-amber-500 ml-1" />}
 </div>
 
 {/* Submenu Indicator or Inbox Badge */}
 <div className="flex items-center gap-2">
 {(item.name === 'Live Inbox' || item.name === 'লাইভ ইনবক্স') && inboxUnreadCount > 0 && (
 <span className="flex h-5 items-center justify-center rounded-full bg-red-500 px-2 text-[10px] font-bold text-white">
 {inboxUnreadCount > 99 ? '99+' : inboxUnreadCount}
 </span>
 )}
 {item.hasSubmenu && (
 <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
 )}
 </div>
 </Link>

 {/* Submenu */}
 {item.hasSubmenu && item.subItems && isExpanded && (
 <div className="mt-0.5 ml-3 pl-3 border-l border-slate-100 flex flex-col space-y-0.5">
 {item.subItems.map((subItem) => {
 const isSubActive = pathname === subItem.href;
 const isSubLocked = !hasAccess(subItem.href);
 
 return (
 <Link
 key={subItem.name}
 href={subItem.href}
 onClick={(e) => {
 if (isSubLocked) {
 e.preventDefault();
 setShowFeatureLockedModal(true);
 } else {
 setIsMobileMenuOpen(false);
 }
 }}
 className={`group flex items-center justify-between px-2 py-1 rounded-lg text-[12px] font-medium transition-all ${
 isSubActive
 ? 'text-primary bg-gradient-to-r from-primary/10 to-transparent shadow-sm border border-primary/10'
 : 'text-slate-500 hover:text-primary hover:bg-primary/5 border border-transparent'
 } ${isSubLocked ? 'opacity-80' : ''}`}
 >
 <div className="flex items-center gap-2">
 <subItem.icon className={`w-3.5 h-3.5 transition-colors ${isSubActive ? 'text-primary' : 'text-slate-400 group-hover:text-primary/70'}`} />
 {subItem.name}
 </div>
 {isSubLocked && <Lock className="w-3 h-3 text-amber-500" />}
 </Link>
 );
 })}
 </div>
 )}
 </div>
 );
 })}
 </nav>
 </aside>

 {/* Main Content Area */}
 <main className="flex-1 flex flex-col min-w-0">
 
 {/* Topbar */}
 <header className="h-12 px-3 flex items-center justify-between shrink-0 bg-surface/70 backdrop-blur-xl border-b border-border shadow-sm relative z-40">
 <div className="flex items-center gap-2">
 <button 
 className="md:hidden p-1.5 -ml-1.5 text-slate-500 hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"
 onClick={() => setIsMobileMenuOpen(true)}
 >
 <Menu className="w-3.5 h-3.5" />
 </button>
 <div className="hidden md:flex w-7 h-7 rounded bg-primary/10 items-center justify-center text-primary">
 <LayoutGrid className="w-3.5 h-3.5" />
 </div>
 <h2 className="text-[13px] font-bold text-slate-900">
 {language === 'en' ? 'Overview' : 'ওভারভিউ'}
 </h2>

 {userProfile?.tenant?.plan && (
 <div className="hidden md:flex items-center ml-4 gap-2">
 <span className="text-[11px] font-bold text-primary uppercase tracking-wider bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
 {language === 'en' ? userProfile.tenant.plan.name : userProfile.tenant.plan.nameBn || userProfile.tenant.plan.name}
 </span>
 <Link href="/dashboard/settings/subscription">
 <span className="text-[11px] font-black text-white bg-gradient-to-r from-secondary to-amber-500 px-3 py-1 rounded-full shadow-[0_2px_10px_rgba(238,141,39,0.3)] animate-pulse hover:animate-none hover:scale-105 transition-transform cursor-pointer border-2 border-surface">
 {language === 'en' ? 'UPGRADE PLAN 🚀' : 'আপগ্রেড করুন 🚀'}
 </span>
 </Link>
 </div>
 )}
 </div>
 
 <div className="flex items-center gap-2 md:gap-1.5">
 {mounted && (
  <button
  onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
  title={language === 'en' ? 'Switch to Bengali' : 'Switch to English'}
  className="relative flex items-center justify-between w-[46px] h-6 bg-slate-100 border border-slate-200 rounded-full p-0.5 overflow-hidden transition-colors hover:border-primary/50 mx-1 cursor-pointer"
  >
  <div
  className={`absolute top-[1px] bottom-[1px] w-[20px] bg-primary rounded-full transition-transform duration-300 shadow-sm ${
  language === 'bn' ? 'translate-x-[20px]' : 'translate-x-0'
  }`}
  />
  <span className={`relative z-10 w-1/2 text-[9px] font-bold text-center transition-colors ${language === 'en' ? 'text-white' : 'text-slate-500'}`}>EN</span>
  <span className={`relative z-10 w-1/2 text-[9px] font-bold text-center transition-colors ${language === 'bn' ? 'text-white' : 'text-slate-500'}`}>BN</span>
  </button>
  )}
 

 
 {mounted && <NotificationBell />}

 {isProfileMenuOpen && (
 <div 
 className="fixed inset-0 z-40"
 onClick={() => setIsProfileMenuOpen(false)}
 />
 )}
 <div className="relative ml-1 md:ml-2 z-50">
 <button 
 className="flex items-center outline-none"
 onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
 >
 {userProfile?.profilePicUrl && !avatarError ? (
 <img
 src={`${API}${userProfile.profilePicUrl}`}
 alt="Avatar"
 className="w-8 h-8 rounded-full object-cover border border-slate-200"
 onError={() => setAvatarError(true)}
 />
 ) : (
 <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold uppercase border border-primary/20">
 {userProfile?.name?.charAt(0) || 'U'}
 </div>
 )}
 </button>
 
 {/* Dropdown menu */}
 <div className={`absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg transition-all overflow-hidden ${isProfileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
 <div className="px-3 py-2 border-b border-slate-200 ">
 <p className="text-[12px] font-semibold text-slate-900 truncate">{userProfile?.name || (language === 'en' ? 'My Account' : 'আমার অ্যাকাউন্ট')}</p>
 <p className="text-[10px] text-slate-500 truncate">{userProfile?.email || ''}</p>
 </div>
 <div className="p-1.5">
 <Link 
 href="/dashboard/profile" 
 onClick={() => setIsProfileMenuOpen(false)}
 className="flex items-center gap-2 px-2 py-1.5 text-[12px] text-slate-600 hover:bg-slate-50 :bg-zinc-800/50 rounded-md transition-colors"
 >
 <UserCircle className="w-3.5 h-3.5" />
 {language === 'en' ? 'Profile' : 'প্রোফাইল'}
 </Link>
 <button onClick={handleLogout} className="w-full flex items-center gap-2 px-2 py-1.5 text-[12px] text-red-600 hover:bg-red-50 :bg-red-500/10 rounded-md transition-colors mt-0.5">
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
 <div className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-white/95 backdrop-blur-md border-t border-slate-200 z-40 flex items-center justify-around px-1 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
   <Link 
     href="/dashboard" 
     className={`flex flex-col items-center justify-center w-full h-full text-[10px] font-medium transition-colors ${pathname === '/dashboard' ? 'text-primary font-bold' : 'text-slate-500'}`}
   >
     <LayoutGrid className="w-5 h-5 mb-0.5" />
     <span>{language === 'en' ? 'Home' : 'হোম'}</span>
   </Link>

   <Link 
     href="/dashboard/inbox" 
     className={`flex flex-col items-center justify-center w-full h-full text-[10px] font-medium transition-colors relative ${pathname.includes('/inbox') ? 'text-primary font-bold' : 'text-slate-500'}`}
   >
     <div className="relative">
       <Inbox className="w-5 h-5 mb-0.5" />
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
     className={`flex flex-col items-center justify-center w-full h-full text-[10px] font-medium transition-colors ${pathname.includes('/leads') ? 'text-primary font-bold' : 'text-slate-500'}`}
   >
     <UserCircle className="w-5 h-5 mb-0.5" />
     <span>{language === 'en' ? 'Leads' : 'লিডস'}</span>
   </Link>

   <Link 
     href="/dashboard/orders" 
     className={`flex flex-col items-center justify-center w-full h-full text-[10px] font-medium transition-colors ${pathname.includes('/orders') ? 'text-primary font-bold' : 'text-slate-500'}`}
   >
     <ShoppingBag className="w-5 h-5 mb-0.5" />
     <span>{language === 'en' ? 'Orders' : 'অর্ডার'}</span>
   </Link>

   <button 
     onClick={() => setIsMobileMenuOpen(true)}
     className="flex flex-col items-center justify-center w-full h-full text-[10px] font-medium text-slate-500 hover:text-primary transition-colors"
   >
     <Menu className="w-5 h-5 mb-0.5" />
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
