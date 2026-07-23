'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { useEffect, useState } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import { useTheme } from 'next-themes';
import { 
  LayoutGrid, 
  Users, 
  CreditCard, 
  ClipboardList, 
  Globe, 
  Settings2, 
  LogOut, 
  Moon, 
  Sun, 
  Bell,
  ChevronDown,
  Menu,
  ShieldCheck,
  DollarSign,
  Mail,
  Bot,
  Package,
  Key,
  Landmark,
  Clock
} from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';

function parseJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error("JWT Parse Error", e);
    return null;
  }
}

export default function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
  
  const [permissions, setPermissions] = useState<string[]>([]);
  const [userRole, setUserRole] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [mounted, setMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setMounted(true);
    const token = Cookies.get('access_token');
    if (token) {
      const payload = parseJwt(token);
      if (payload) {
        setPermissions(payload.permissions || []);
        setUserRole(payload.role || '');
        setUserEmail(payload.email || '');
      }
    }
  }, []);

  const hasPermission = (perm: string) => {
    const roleFromCookie = Cookies.get('user_role');
    if (userRole === 'superadmin' || roleFromCookie === 'superadmin') return true;
    if (userEmail === 'admin@platform.com') return true; 
    return permissions.includes('*') || permissions.includes(perm);
  };

  const handleLogout = () => {
    Cookies.remove('access_token');
    Cookies.remove('user_role');
    router.push('/superadmin/login');
  };

  const toggleSubmenu = (menuName: string, e: React.MouseEvent) => {
    e.preventDefault();
    setOpenMenus(prev => ({ ...prev, [menuName]: !prev[menuName] }));
  };

  const navItems = [
    { name: language === 'en' ? 'Platform Overview' : 'প্ল্যাটফর্ম ওভারভিউ', icon: LayoutGrid, href: '/superadmin', show: true },
    { name: language === 'en' ? 'Tenants' : 'টেন্যান্টস', icon: Users, href: '/superadmin/tenants', show: hasPermission('manage:tenants') },
    { name: language === 'en' ? 'Packages & Plans' : 'প্যাকেজ ও প্ল্যান', icon: Package, href: '/superadmin/packages', show: hasPermission('manage:billing') },
    { name: language === 'en' ? 'Coupons' : 'কুপন', icon: Package, href: '/superadmin/coupons', show: hasPermission('manage:billing') },
    { name: language === 'en' ? 'Billing' : 'বিলিং', icon: CreditCard, href: '/superadmin/billing', show: hasPermission('manage:billing') },
    { name: language === 'en' ? 'Pending Payments' : 'পেন্ডিং পেমেন্ট', icon: Clock, href: '/superadmin/payments', show: hasPermission('manage:billing') },
    { name: language === 'en' ? 'Audit Logs' : 'অডিট লগস', icon: ClipboardList, href: '/superadmin/audit-logs', show: hasPermission('manage:audit') },
    { name: language === 'en' ? 'Inquiries' : 'ইনকোয়ারি', icon: Mail, href: '/superadmin/inquiries', show: hasPermission('manage:site') },
    { name: language === 'en' ? 'Support Tickets' : 'সাপোর্ট টিকিট', icon: ClipboardList, href: '/superadmin/tickets', show: hasPermission('manage:site') },
    { name: language === 'en' ? 'AI Support Chats' : 'এআই সাপোর্ট চ্যাটস', icon: Bot, href: '/superadmin/support-chats', show: hasPermission('manage:site') },
    { 
      name: language === 'en' ? 'Settings' : 'সেটিংস', 
      icon: Settings2, 
      href: '#', 
      show: true,
      hasSubmenu: true,
      subItems: [
        { name: language === 'en' ? 'Site Editor' : 'সাইট এডিটর', icon: Globe, href: '/superadmin/site-editor', show: hasPermission('manage:site') },
        { name: language === 'en' ? 'Team Members' : 'টিম মেম্বারস', icon: ShieldCheck, href: '/superadmin/team', show: hasPermission('manage:team') },
        { name: language === 'en' ? 'Currency' : 'কারেন্সি', icon: DollarSign, href: '/superadmin/currency', show: hasPermission('manage:currency') },
        { name: language === 'en' ? 'SMTP Settings' : 'এসএমটিপি সেটিংস', icon: Mail, href: '/superadmin/settings/smtp', show: hasPermission('manage:site') },
        { name: language === 'en' ? 'Business Nature' : 'বিজনেস নেচার', icon: ClipboardList, href: '/superadmin/settings/business-nature', show: hasPermission('manage:site') },
        { name: language === 'en' ? 'AI Integrations' : 'এআই ইন্টিগ্রেশন', icon: Bot, href: '/superadmin/settings/ai', show: hasPermission('manage:site') },
        { name: language === 'en' ? 'Payment Gateways' : 'পেমেন্ট গেটওয়ে', icon: Landmark, href: '/superadmin/settings/payments', show: hasPermission('manage:site') },
        { name: language === 'en' ? 'MFS & Bank Gateway' : 'এমএফএস ও ব্যাংক গেটওয়ে', icon: Landmark, href: '/superadmin/settings/mfs', show: hasPermission('manage:site') },
        { name: language === 'en' ? 'Google Login' : 'গুগল লগইন সেটিংস', icon: Key, href: '/superadmin/settings/google-auth', show: hasPermission('manage:site') },
        { name: language === 'en' ? 'Facebook Login' : 'ফেসবুক লগইন সেটিংস', icon: Globe, href: '/superadmin/settings/facebook-auth', show: hasPermission('manage:site') },
      ].filter(sub => sub.show)
    }
  ];

  if (pathname === '/superadmin/login') {
    return <div className="min-h-screen bg-[#f8fafc] dark:bg-[#09090b] text-[#334155] dark:text-zinc-300">{children}</div>;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f8fafc] dark:bg-[#09090b] text-[#334155] dark:text-zinc-300">
      
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
        border-r border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#0f0f11] 
        flex flex-col shrink-0 transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        
        {/* Logo Area */}
        <div className="h-12 px-3 flex items-center justify-between gap-2 border-b border-slate-200 dark:border-zinc-800 shrink-0">
          <Link href="/superadmin" className="flex-1 flex items-center justify-start h-full py-0.5 hover:opacity-90 transition-opacity overflow-hidden">
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
          <div className="px-2 mb-2 text-[10px] font-bold text-secondary uppercase tracking-widest">
            {language === 'en' ? 'Superadmin' : 'সুপারএডমিন'}
          </div>
          {mounted && navItems.map((item) => {
            if (!item.show) return null;
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
                      ? 'bg-secondary/10 dark:bg-secondary/10 text-secondary'
                      : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800/50 hover:text-slate-900 dark:hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <item.icon className={`w-3.5 h-3.5 ${isActive ? 'text-secondary' : 'text-slate-400 dark:text-zinc-500'}`} />
                    <span className={isActive ? 'text-secondary' : ''}>{item.name}</span>
                  </div>
                  
                  {item.hasSubmenu && (
                    <div className="flex items-center gap-2">
                      <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  )}
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
                          className={`flex items-center gap-2 px-1.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                            isSubActive
                              ? 'text-secondary bg-secondary/10'
                              : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800/30'
                          }`}
                        >
                          <subItem.icon className={`w-3 h-3 ${isSubActive ? 'text-secondary' : 'text-slate-400 dark:text-zinc-500'}`} />
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

        {/* Sidebar Footer */}
        <div className="p-2 border-t border-slate-200 dark:border-zinc-800 flex flex-col gap-2">
          <div className="flex items-center justify-between px-2">
            <button 
              onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
              className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 transition-colors"
            >
              <Globe className="w-3.5 h-3.5" />
              {language === 'en' ? 'English' : 'বাংলা'}
            </button>
          </div>
          
          <button onClick={handleLogout} className="flex items-center justify-center gap-2 w-full py-1.5 rounded-md bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 text-[12px] font-medium hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors">
            <LogOut className="w-3.5 h-3.5" />
            {language === 'en' ? 'Logout' : 'লগআউট'}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        
        {/* Topbar */}
        <header className="h-12 px-3 flex items-center justify-between shrink-0 bg-[#f8fafc] dark:bg-[#09090b] border-b border-slate-200 dark:border-zinc-800 relative z-10">
          <div className="flex items-center gap-2">
            <button 
              className="md:hidden p-1.5 -ml-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="w-3.5 h-3.5" />
            </button>
            <div className="hidden md:flex w-7 h-7 rounded bg-secondary/10 items-center justify-center text-secondary">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <h2 className="text-[13px] font-bold text-slate-900 dark:text-white">
              {language === 'en' ? 'Restricted Access Zone' : 'নিয়ন্ত্রিত অ্যাক্সেস জোন'}
            </h2>
          </div>
          
          <div className="flex items-center gap-2 md:gap-3">
            {mounted && (
              <button
                onClick={() => {
                  const currentTheme = theme === 'system' ? 'light' : theme;
                  setTheme(currentTheme === 'dark' ? 'light' : 'dark');
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200/50 dark:hover:bg-zinc-800 transition-colors"
              >
                {theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            )}
            
            {mounted && <NotificationBell />}

            <Link href="/superadmin/profile" className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200/50 dark:hover:bg-zinc-800 transition-colors">
              <Settings2 className="w-4 h-4" />
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-3">
          {children}
        </div>
      </main>
    </div>
  );
}
