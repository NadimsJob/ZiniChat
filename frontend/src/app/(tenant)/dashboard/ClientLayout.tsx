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
  Tag
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
  const [allowedFeatures, setAllowedFeatures] = useState<string[]>(['*']);
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    'Settings': true,
    'সেটিংস': true
  });

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
        const [userRes, quotasRes] = await Promise.all([
          fetch(`${API}/auth/me`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`${API}/billing/quotas`, { headers: { 'Authorization': `Bearer ${token}` } })
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
    '/dashboard/settings/whatsapp': ['whatsapp'],
    '/dashboard/settings/messenger': ['messenger'],
    '/dashboard/settings/ai-training': ['ai_assistant'],
    '/dashboard/support': ['platform_support_ai'],
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
    { name: language === 'en' ? 'Inbox' : 'ইনবক্স', icon: Inbox, href: '/dashboard/inbox' },
    { name: language === 'en' ? 'Leads' : 'লিডস', icon: UserCircle, href: '/dashboard/leads' },
    { name: language === 'en' ? 'Products' : 'প্রডাক্টস', icon: ShoppingCart, href: '/dashboard/products' },
    { name: language === 'en' ? 'Orders' : 'অর্ডারস', icon: ShoppingBag, href: '/dashboard/orders' },
    { name: language === 'en' ? 'Support' : 'সাপোর্ট', icon: MessageSquare, href: '/dashboard/support' },
    { 
      name: language === 'en' ? 'Settings' : 'সেটিংস', 
      icon: Settings2, 
      href: '/dashboard/settings', 
      hasSubmenu: true,
      subItems: [
        { name: language === 'en' ? 'WhatsApp' : 'হোয়াটসঅ্যাপ', icon: PhoneCall, href: '/dashboard/settings/whatsapp' },
        { name: language === 'en' ? 'Messenger' : 'মেসেঞ্জার', icon: MessageCircle, href: '/dashboard/settings/messenger' },
        { name: language === 'en' ? 'Team' : 'টিম', icon: UserCircle, href: '/dashboard/team' },
        { name: language === 'en' ? 'AI Training' : 'এআই ট্রেইনিং', icon: Zap, href: '/dashboard/settings/ai-training' },
        { name: language === 'en' ? 'Labels' : 'লেবেলস', icon: Tag, href: '/dashboard/settings/labels' },
        { name: language === 'en' ? 'Subscription' : 'সাবস্ক্রিপশন', icon: Crown, href: '/dashboard/settings/subscription' },
        { name: language === 'en' ? 'Storage' : 'স্টোরেজ', icon: Settings2, href: '/dashboard/settings/storage' },
      ] // Removed hasAccess filter here
    },
  ]; // Removed hasAccess filter here

  if (pathname === '/dashboard/onboarding') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#09090b] text-[#334155] dark:text-zinc-300 w-full overflow-y-auto p-4 md:p-8">
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
        fixed md:relative z-50 h-full w-[190px] 
        border-r border-border bg-surface backdrop-blur-2xl 
        shadow-[4px_0_24px_rgba(31,130,74,0.03)]
        flex flex-col shrink-0 transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        
        {/* Logo Area */}
        <div className="h-12 px-3 flex items-center justify-between gap-2 border-b border-slate-200 dark:border-zinc-800 shrink-0">
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

            return (
              <div key={item.name} className="flex flex-col">
                <Link 
                  href={item.hasSubmenu ? '#' : item.href}
                  onClick={(e) => {
                    if (item.hasSubmenu) {
                      toggleSubmenu(item.name, e);
                    } else {
                      setIsMobileMenuOpen(false);
                    }
                  }}
                  className={`flex items-center justify-between px-2 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
                    isActive && !item.hasSubmenu
                      ? 'bg-gradient-to-r from-primary/10 to-accent/10 dark:from-primary/20 dark:to-accent/5 text-primary shadow-sm border border-primary/10'
                      : 'text-slate-600 dark:text-zinc-400 hover:bg-white/60 dark:hover:bg-zinc-800/50 hover:text-slate-900 dark:hover:text-zinc-200 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <item.icon className={`w-3.5 h-3.5 ${isActive ? 'text-primary' : 'text-slate-400 dark:text-zinc-500'}`} />
                    <span className={isActive ? 'text-primary' : ''}>{item.name}</span>
                  </div>
                  
                  {/* Submenu Indicator or Inbox Badge */}
                  <div className="flex items-center gap-2">
                    {(item.name === 'Inbox' || item.name === 'ইনবক্স') && inboxUnreadCount > 0 && (
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
                  <div className="mt-0.5 ml-3 pl-3 border-l border-slate-100 dark:border-zinc-800 flex flex-col space-y-0.5">
                    {item.subItems.map((subItem) => {
                      const isSubActive = pathname === subItem.href;
                      return (
                        <Link
                          key={subItem.name}
                          href={subItem.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`flex items-center gap-2 px-1.5 py-1 rounded-md text-[12px] font-medium transition-colors ${
                            isSubActive
                              ? 'text-primary bg-gradient-to-r from-primary/10 to-accent/5 shadow-sm border border-primary/10'
                              : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-white/60 dark:hover:bg-zinc-800/30'
                          }`}
                        >
                          <subItem.icon className={`w-3.5 h-3.5 ${isSubActive ? 'text-primary' : 'text-slate-400 dark:text-zinc-500'}`} />
                          {subItem.name}
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
        <header className="h-12 px-3 flex items-center justify-between shrink-0 bg-surface/70 backdrop-blur-xl border-b border-border shadow-sm relative z-10">
          <div className="flex items-center gap-2">
            <button 
              className="md:hidden p-1.5 -ml-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="w-3.5 h-3.5" />
            </button>
            <div className="hidden md:flex w-7 h-7 rounded bg-slate-200/50 dark:bg-zinc-800 items-center justify-center text-slate-500">
              <LayoutGrid className="w-3.5 h-3.5" />
            </div>
            <h2 className="text-[13px] font-bold text-slate-900 dark:text-white">
              {language === 'en' ? 'Overview' : 'ওভারভিউ'}
            </h2>

            {userProfile?.tenant?.plan && (
              <div className="hidden md:flex items-center ml-4 gap-2">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full border border-zinc-200 dark:border-zinc-700">
                  {language === 'en' ? userProfile.tenant.plan.name : userProfile.tenant.plan.nameBn || userProfile.tenant.plan.name}
                </span>
                <Link href="/dashboard/settings/billing">
                  <span className="text-[11px] font-black text-white bg-gradient-to-r from-orange-500 to-amber-500 px-3 py-1 rounded-full shadow-lg shadow-orange-500/30 animate-pulse hover:animate-none hover:scale-105 transition-transform cursor-pointer border-2 border-surface">
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
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200/50 dark:hover:bg-zinc-800 transition-colors"
              >
                <Globe className="w-3.5 h-3.5" />
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
                {userProfile?.profilePicUrl ? (
                  <img
                    src={`${API}${userProfile.profilePicUrl}`}
                    alt="Avatar"
                    className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-zinc-700"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold uppercase border border-primary/20">
                    {userProfile?.name?.charAt(0) || 'U'}
                  </div>
                )}
              </button>
              
              {/* Dropdown menu */}
              <div className={`absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[#121214] border border-slate-200 dark:border-zinc-800 rounded-xl shadow-lg transition-all overflow-hidden ${isProfileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
                <div className="px-3 py-2 border-b border-slate-200 dark:border-zinc-800">
                  <p className="text-[12px] font-semibold text-slate-900 dark:text-white truncate">{userProfile?.name || (language === 'en' ? 'My Account' : 'আমার অ্যাকাউন্ট')}</p>
                  <p className="text-[10px] text-slate-500 truncate">{userProfile?.email || ''}</p>
                </div>
                <div className="p-1.5">
                  <Link 
                    href="/dashboard/profile" 
                    onClick={() => setIsProfileMenuOpen(false)}
                    className="flex items-center gap-2 px-2 py-1.5 text-[12px] text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800/50 rounded-md transition-colors"
                  >
                    <UserCircle className="w-3.5 h-3.5" />
                    {language === 'en' ? 'Profile' : 'প্রোফাইল'}
                  </Link>
                  <button onClick={handleLogout} className="w-full flex items-center gap-2 px-2 py-1.5 text-[12px] text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-colors mt-0.5">
                    <LogOut className="w-3.5 h-3.5" />
                    {language === 'en' ? 'Logout' : 'লগআউট'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className={`flex-1 overflow-auto custom-scrollbar ${pathname.includes('/inbox') ? 'p-0' : 'p-3'}`}>
          {children}
        </div>
      </main>

      {/* Trial Expired Modal */}
      {showTrialModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-1.5">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-md w-full p-8 text-center border border-red-500/20">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Crown className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Trial Expired</h3>
            <p className="text-slate-600 dark:text-zinc-400 mb-8">
              Your free trial has ended. Please subscribe to a plan to continue using this feature and unlock all premium capabilities.
            </p>
            <div className="flex gap-2">
              <button 
                onClick={() => setShowTrialModal(false)}
                className="flex-1 px-1.5 py-1 rounded-xl border border-slate-200 dark:border-zinc-800 font-medium hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
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

      {/* Floating Action Buttons or Modals */}
      <SupportWidget />

    </div>
  );
}
