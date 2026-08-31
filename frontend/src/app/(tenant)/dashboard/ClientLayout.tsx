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
 X,
 Building2,
 Hotel,
 Cpu,
 Briefcase,
 Stethoscope,
 GraduationCap,
 Factory,
 Truck
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
 const [ticketUnreadCount, setTicketUnreadCount] = useState(0);
 const [showTrialModal, setShowTrialModal] = useState(false);
 const [showFeatureLockedModal, setShowFeatureLockedModal] = useState(false);
 const [allowedFeatures, setAllowedFeatures] = useState<string[]>(['*']);
 const [avatarError, setAvatarError] = useState(false);
 const [storageStats, setStorageStats] = useState<any>(null);
 const [quotasData, setQuotasData] = useState<any>(null);
 const [isPropertyMode, setIsPropertyMode] = useState(false);
 const [isHospitalityMode, setIsHospitalityMode] = useState(false);
 const [isTechSoftwareMode, setIsTechSoftwareMode] = useState(false);
 const [isFinancialServiceMode, setIsFinancialServiceMode] = useState(false);
 const [isHealthcareMode, setIsHealthcareMode] = useState(false);
 const [isEducationMode, setIsEducationMode] = useState(false);
 const [isManufacturingMode, setIsManufacturingMode] = useState(false);
 const [isLogisticsMode, setIsLogisticsMode] = useState(false);
 const [isImpersonating, setIsImpersonating] = useState(false);
 const [impersonatedTenantName, setImpersonatedTenantName] = useState('');


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

  const getPageTitle = () => {
    if (pathname === '/dashboard') {
      return language === 'en' ? 'Overview' : 'ওভারভিউ';
    }
    if (pathname.startsWith('/dashboard/inbox')) {
      return language === 'en' ? 'Live Inbox' : 'লাইভ ইনবক্স';
    }
    if (pathname.startsWith('/dashboard/leads')) {
      return language === 'en' ? 'Leads' : 'লিডস';
    }
    if (pathname.startsWith('/dashboard/orders')) {
      return language === 'en'
        ? (isPropertyMode ? 'Inquiries' : isHospitalityMode ? 'Reservations' : isTechSoftwareMode ? 'Demo Requests' : isFinancialServiceMode ? 'Consultations' : isHealthcareMode ? 'Appointments' : isEducationMode ? 'Admissions' : isManufacturingMode ? 'RFQ / Quotations' : isLogisticsMode ? 'Shipments & Bookings' : 'Orders')
        : (isPropertyMode ? 'ইনকয়্যারিস' : isHospitalityMode ? 'রিজার্ভেশন' : isTechSoftwareMode ? 'ডেমো রিকুয়েস্ট' : isFinancialServiceMode ? 'কন্সালটেন্সি' : isHealthcareMode ? 'অ্যাপয়েন্টমেন্টস' : isEducationMode ? 'ভর্তি ইনকোয়ারি' : isManufacturingMode ? 'কোটেশন রিকুয়েস্ট' : isLogisticsMode ? 'শিপমেন্ট ও বুকিং' : 'অর্ডার');
    }
    if (pathname.startsWith('/dashboard/broadcasts')) {
      return language === 'en' ? 'Broadcast' : 'ব্রডকাস্ট';
    }
    if (pathname.startsWith('/dashboard/ai-training') || pathname.startsWith('/dashboard/settings/ai-training')) {
      return language === 'en' ? 'AI Training' : 'এআই ট্রেনিং';
    }
    if (pathname.startsWith('/dashboard/settings/inboxes')) {
      return language === 'en' ? 'Connected Inboxes' : 'কানেক্টেড ইনবক্স';
    }
    if (pathname.startsWith('/dashboard/settings/team')) {
      return language === 'en' ? 'Team Management' : 'টিম ম্যানেজমেন্ট';
    }
    if (pathname.startsWith('/dashboard/settings/quick-replies')) {
      return language === 'en' ? 'Quick Replies' : 'কুইক রিপ্লাই';
    }
    if (pathname.startsWith('/dashboard/settings/sms-gateway')) {
      return language === 'en' ? 'SMS Gateway' : 'এসএমএস গেটওয়ে';
    }
    if (pathname.startsWith('/dashboard/settings/subscription')) {
      return language === 'en' ? 'Subscription' : 'সাবস্ক্রিপশন';
    }
    if (pathname.startsWith('/dashboard/settings')) {
      return language === 'en' ? 'Settings' : 'সেটিংস';
    }
    if (pathname.startsWith('/dashboard/profile')) {
      return language === 'en' ? 'Profile' : 'প্রোফাইল';
    }
    return language === 'en' ? 'Dashboard' : 'ড্যাশবোর্ড';
  };

 // Auto-collapsible sidebar state for Inbox page
 const isInboxPage = pathname.startsWith('/dashboard/inbox');
 const [sidebarPinned, setSidebarPinned] = useState(false);
 const [sidebarHovered, setSidebarHovered] = useState(false);
 const isSidebarCollapsed = isInboxPage && !sidebarPinned && !sidebarHovered;

  useEffect(() => {
  setMounted(true);
  if (typeof window !== 'undefined') {
    if (Cookies.get('impersonation_active') === 'true') {
      setIsImpersonating(true);
      setImpersonatedTenantName(Cookies.get('impersonation_tenant_name') || '');
    }
  }
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
      const [userRes, quotasRes, unreadRes, ticketUnreadRes] = await Promise.all([
        fetch(`${API}/auth/me`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API}/billing/quotas`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API}/inbox/unread-count`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API}/tickets/unread-count`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      if (userRes.ok) {
        const userData = await userRes.json();
        setUserProfile(userData);

        // Check Modes
        if (userData.tenant?.businessNature) {
          try {
            const bnRes = await fetch(`${API}/business-natures`);
            if (bnRes.ok) {
              const natures: any[] = await bnRes.json();
              const matched = natures.find((n: any) => n.name === userData.tenant.businessNature);
              setIsPropertyMode(matched?.isPropertyMode ?? false);
              setIsHospitalityMode(matched?.isHospitalityMode ?? false);
              setIsTechSoftwareMode(matched?.isTechSoftwareMode ?? false);
              setIsFinancialServiceMode(matched?.isFinancialServiceMode ?? false);
              setIsHealthcareMode(matched?.isHealthcareMode ?? false);
              setIsEducationMode(matched?.isEducationMode ?? false);
              setIsManufacturingMode(matched?.isManufacturingMode ?? false);
              setIsLogisticsMode(matched?.isLogisticsMode ?? false);
            }
          } catch (e) {
            console.error(e);
          }
        }

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
        setQuotasData(quotas);
        if (quotas.features) {
          setAllowedFeatures(quotas.features);
        }
      }
      if (unreadRes.ok) {
        const unreadData = await unreadRes.json();
        setInboxUnreadCount(unreadData.unreadCount || 0);
      }
      if (ticketUnreadRes.ok) {
        const tData = await ticketUnreadRes.json();
        setTicketUnreadCount(tData.unreadCount || 0);
      }

      // Fetch storage stats safely
      try {
        const storageRes = await fetch(`${API}/storage/stats`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (storageRes.ok) {
          const sData = await storageRes.json();
          setStorageStats(sData);
        }
      } catch (err) {
        console.warn('Unable to fetch storage stats:', err);
      }
    } catch (err) { console.error(err); }
  };
  if (token) fetchUserAndQuotas();

  // Connect to Inbox Socket for global unread badge & bottom-right real-time toast
  let socket: any;
  let notifSocket: any;
  if (token) {
    import('socket.io-client').then(({ io }) => {
      socket = io(`${API}/inbox`, { 
        auth: { token },
        transports: ['polling', 'websocket'] 
      });
      socket.on('new_message', (data: any) => {
        if (!window.location.pathname.startsWith('/dashboard/inbox')) {
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
                } max-w-sm w-full bg-card text-card-foreground shadow-2xl rounded-2xl p-3.5 border border-border flex items-start gap-3 cursor-pointer hover:bg-muted transition-all group`}
              >
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0 shadow-md">
                  {senderName.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="text-xs font-bold text-primary truncate">{senderName}</h4>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] text-muted-foreground">Just now</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toast.dismiss(t.id);
                        }}
                        className="p-1 hover:bg-background rounded-md text-muted-foreground hover:text-foreground transition-colors"
                        title="Close notification"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">{msgSnippet}</p>
                  <span className="text-[10px] text-primary font-semibold mt-1 inline-flex items-center gap-1 group-hover:underline">
                    Click to reply →
                  </span>
                </div>
              </div>
            ),
            { position: 'bottom-right', duration: 5000 }
          );
        }
      });

      notifSocket = io(`${API}/notifications`, {
        auth: { token },
        transports: ['polling', 'websocket']
      });
      notifSocket.on('notification_received', (data: any) => {
        if (data.type === 'ticket') {
          if (!window.location.pathname.startsWith('/dashboard/support')) {
            setTicketUnreadCount(prev => prev + 1);

            toast.custom(
              (t) => (
                <div
                  onClick={() => {
                    toast.dismiss(t.id);
                    router.push('/dashboard/support');
                  }}
                  className={`${
                    t.visible ? 'animate-in slide-in-from-bottom-5 duration-300' : 'animate-out fade-out duration-200'
                  } max-w-sm w-full bg-card text-card-foreground shadow-2xl rounded-2xl p-3.5 border border-border flex items-start gap-3 cursor-pointer hover:bg-muted transition-all group`}
                >
                  <div className="w-9 h-9 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-xs shrink-0 shadow-md">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-xs font-bold text-foreground truncate">{data.title || 'Support Ticket Update'}</h4>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toast.dismiss(t.id);
                        }}
                        className="p-1 hover:bg-background rounded-md text-muted-foreground hover:text-foreground transition-colors"
                        title="Close notification"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">{data.message}</p>
                    <span className="text-[10px] text-primary font-semibold mt-1 inline-flex items-center gap-1 group-hover:underline">
                      {language === 'en' ? 'Click to view ticket →' : 'টিকিট দেখতে ক্লিক করুন →'}
                    </span>
                  </div>
                </div>
              ),
              { position: 'bottom-right', duration: 6000 }
            );
          }
        }
      });
    });
  }

  return () => {
    if (socket) socket.disconnect();
    if (notifSocket) notifSocket.disconnect();
    window.fetch = originalFetch;
  };
  }, []);

  // Clear unread counts when visiting inbox or support
  useEffect(() => {
    if (pathname === '/dashboard/inbox' || pathname.startsWith('/dashboard/inbox/')) {
      setInboxUnreadCount(0);
    }
    if (pathname === '/dashboard/support' || pathname.startsWith('/dashboard/support/')) {
      setTicketUnreadCount(0);
      const token = Cookies.get('access_token');
      if (token) {
        fetch(`${API}/tickets/mark-read`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch(err => console.error(err));
      }
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
 '/dashboard/team': ['team_management'],
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
        { name: language === 'en' ? 'Live Inbox' : 'লাইভ ইনবক্স', icon: Inbox, href: '/dashboard/inbox', id: 'sidebar-inbox', coreColor: 'emerald' },
        { name: language === 'en' ? 'Channel Integration' : 'চ্যানেল ইন্টিগ্রেশন', icon: Webhook, href: '/dashboard/settings/inboxes', id: 'sidebar-inboxes', coreColor: 'sky' },
        { name: language === 'en' ? 'AI Training' : 'এআই ট্রেইনিং', icon: Zap, href: '/dashboard/settings/ai-training', id: 'sidebar-ai-training', coreColor: 'purple' },
        { 
          name: isPropertyMode 
            ? (language === 'en' ? 'Properties' : 'প্রপার্টি লিস্ট') 
            : isHospitalityMode
            ? (language === 'en' ? 'Rooms & Suites' : 'রুম ও স্যুট')
            : isTechSoftwareMode
            ? (language === 'en' ? 'Software Plans' : 'সফটওয়্যার প্ল্যান')
            : isFinancialServiceMode
            ? (language === 'en' ? 'Services' : 'সার্ভিসেস')
            : isHealthcareMode
            ? (language === 'en' ? 'Doctors & Care' : 'ডাক্তার ও সার্ভিস')
            : isEducationMode
            ? (language === 'en' ? 'Courses & Batches' : 'কোর্স ও ব্যাচ')
            : isManufacturingMode
            ? (language === 'en' ? 'Wholesale Catalog' : 'হোলসেল ক্যাটালগ')
            : isLogisticsMode
            ? (language === 'en' ? 'Freight Catalog' : 'ফ্রেট ক্যাটালগ')
            : (language === 'en' ? 'Product List' : 'প্রোডাক্ট লিস্ট'), 
          icon: isPropertyMode ? Building2 : isHospitalityMode ? Hotel : isTechSoftwareMode ? Cpu : isFinancialServiceMode ? Briefcase : isHealthcareMode ? Stethoscope : isEducationMode ? GraduationCap : isManufacturingMode ? Factory : isLogisticsMode ? Truck : ShoppingCart, 
          href: '/dashboard/products',
          coreColor: 'amber' 
        },
      ]
    },
    {
      title: language === 'en' ? 'OTHERS' : 'অন্যান্য',
      items: [
        { name: language === 'en' ? 'Leads' : 'লিডস', icon: UserCircle, href: '/dashboard/leads' },
        { 
          name: isPropertyMode 
            ? (language === 'en' ? 'Inquiries' : 'ইনকোয়ারি') 
            : isHospitalityMode
            ? (language === 'en' ? 'Reservations' : 'রিজার্ভেশন')
            : isTechSoftwareMode
            ? (language === 'en' ? 'Demo Requests' : 'ডেমো রিকুয়েস্ট')
            : isFinancialServiceMode
            ? (language === 'en' ? 'Consultations' : 'কন্সালটেন্সি')
            : isHealthcareMode
            ? (language === 'en' ? 'Appointments' : 'অ্যাপয়েন্টমেন্টস')
            : isEducationMode
            ? (language === 'en' ? 'Admissions' : 'ভর্তি ইনকোয়ারি')
            : isManufacturingMode
            ? (language === 'en' ? 'RFQ / Quotations' : 'কোটেশন রিকুয়েস্ট')
            : isLogisticsMode
            ? (language === 'en' ? 'Shipments & Bookings' : 'শিপমেন্ট ও বুকিং')
            : (language === 'en' ? 'Manage Order' : 'ম্যানেজ অর্ডার'), 
          icon: isPropertyMode ? Building2 : isHospitalityMode ? Hotel : isTechSoftwareMode ? Cpu : isFinancialServiceMode ? Briefcase : isHealthcareMode ? Stethoscope : isEducationMode ? GraduationCap : isManufacturingMode ? Factory : isLogisticsMode ? Truck : ShoppingBag, 
          href: '/dashboard/orders' 
        },
        { name: language === 'en' ? 'Broadcasts' : 'ব্রডকাস্ট', icon: Megaphone, href: '/dashboard/broadcasts' },
        { name: language === 'en' ? 'Team' : 'টিম', icon: UserCircle, href: '/dashboard/team' },
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
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside 
        onMouseEnter={() => isInboxPage && setSidebarHovered(true)}
        onMouseLeave={() => isInboxPage && setSidebarHovered(false)}
        className={`
          fixed md:relative z-50 h-full 
          ${isSidebarCollapsed ? 'w-[56px]' : 'w-[188px]'} 
          border-r border-border bg-card
          flex flex-col shrink-0 transition-all duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Logo Area */}
        <div className="h-14 px-1.5 flex items-center justify-between gap-1 border-b border-border/50 shrink-0 relative overflow-hidden">
          <Link href="/dashboard" className="flex-1 flex items-center h-full hover:opacity-90 w-full relative">
            <img 
              src="/icon.png" 
              alt="ZiniChat" 
              className={`absolute left-0.5 top-1/2 -translate-y-1/2 w-[46px] h-[46px] object-contain transition-all duration-200 ${isSidebarCollapsed ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'}`} 
            />
            <img 
              src="/logo.png" 
              alt="ZiniChat Logo" 
              className={`absolute left-0.5 top-1/2 -translate-y-1/2 h-[50px] w-[165px] object-contain object-left transition-all duration-200 ${isSidebarCollapsed ? 'opacity-0 scale-75 pointer-events-none' : 'opacity-100 scale-100'}`} 
            />
          </Link>
          {isInboxPage && !isSidebarCollapsed && (
            <button 
              onClick={() => setSidebarPinned(!sidebarPinned)}
              title={sidebarPinned ? (language === 'en' ? 'Unpin Sidebar' : 'সাইডবার আনপিন করুন') : (language === 'en' ? 'Pin Sidebar' : 'সাইডবার পিন করুন')}
              className="hidden md:flex p-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors"
            >
              <Pin className={`w-3.5 h-3.5 ${sidebarPinned ? 'text-primary rotate-45' : ''}`} />
            </button>
          )}
          <button 
            className="md:hidden text-muted-foreground hover:text-foreground"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <ChevronDown className="w-5 h-5 rotate-90" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-1.5 py-2 space-y-3 overflow-y-auto custom-scrollbar pb-20">
          {menuGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="flex flex-col">
              {!isSidebarCollapsed && (
                <div className={`px-3 mb-1.5 mt-2 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 ${
                  group.title.includes('AUTOMATION') || group.title.includes('অটোমেশন')
                    ? 'text-primary dark:text-emerald-400'
                    : 'text-muted-foreground'
                }`}>
                  <span>{group.title}</span>
                  {(group.title.includes('AUTOMATION') || group.title.includes('অটোমেশন')) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary dark:bg-emerald-400 animate-pulse" />
                  )}
                </div>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  const isLocked = !hasAccess(item.href);
                  const coreColor = (item as any).coreColor;

                  let itemStyle = 'text-muted-foreground hover:bg-muted hover:text-foreground';
                  let iconStyle = 'text-muted-foreground group-hover:text-foreground';
                  let textStyle = '';

                  if (coreColor) {
                    if (coreColor === 'emerald') {
                      itemStyle = isActive
                        ? 'bg-emerald-600 dark:bg-emerald-500 text-white font-bold border border-emerald-400 dark:border-emerald-300 shadow-[0_0_14px_rgba(16,185,129,0.4)]'
                        : 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 dark:border-emerald-400/50 font-bold shadow-[0_0_10px_rgba(16,185,129,0.18)] dark:shadow-[0_0_12px_rgba(16,185,129,0.25)] hover:bg-emerald-500/20 hover:border-emerald-500/70 hover:shadow-[0_0_14px_rgba(16,185,129,0.35)]';
                      iconStyle = isActive ? 'text-white' : 'text-emerald-600 dark:text-emerald-400';
                      textStyle = isActive ? 'text-white font-bold' : 'text-emerald-700 dark:text-emerald-300 font-bold';
                    } else if (coreColor === 'sky') {
                      itemStyle = isActive
                        ? 'bg-sky-600 dark:bg-sky-500 text-white font-bold border border-sky-400 dark:border-sky-300 shadow-[0_0_14px_rgba(14,165,233,0.4)]'
                        : 'bg-sky-500/10 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-500/40 dark:border-sky-400/50 font-bold shadow-[0_0_10px_rgba(14,165,233,0.18)] dark:shadow-[0_0_12px_rgba(14,165,233,0.25)] hover:bg-sky-500/20 hover:border-sky-500/70 hover:shadow-[0_0_14px_rgba(14,165,233,0.35)]';
                      iconStyle = isActive ? 'text-white' : 'text-sky-600 dark:text-sky-400';
                      textStyle = isActive ? 'text-white font-bold' : 'text-sky-700 dark:text-sky-300 font-bold';
                    } else if (coreColor === 'purple') {
                      itemStyle = isActive
                        ? 'bg-purple-600 dark:bg-purple-500 text-white font-bold border border-purple-400 dark:border-purple-300 shadow-[0_0_14px_rgba(168,85,247,0.4)]'
                        : 'bg-purple-500/10 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/40 dark:border-purple-400/50 font-bold shadow-[0_0_10px_rgba(168,85,247,0.18)] dark:shadow-[0_0_12px_rgba(168,85,247,0.25)] hover:bg-purple-500/20 hover:border-purple-500/70 hover:shadow-[0_0_14px_rgba(168,85,247,0.35)]';
                      iconStyle = isActive ? 'text-white' : 'text-purple-600 dark:text-purple-400';
                      textStyle = isActive ? 'text-white font-bold' : 'text-purple-700 dark:text-purple-300 font-bold';
                    } else if (coreColor === 'amber') {
                      itemStyle = isActive
                        ? 'bg-amber-600 dark:bg-amber-500 text-white font-bold border border-amber-400 dark:border-amber-300 shadow-[0_0_14px_rgba(245,158,11,0.4)]'
                        : 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 dark:border-amber-400/50 font-bold shadow-[0_0_10px_rgba(245,158,11,0.18)] dark:shadow-[0_0_12px_rgba(245,158,11,0.25)] hover:bg-amber-500/20 hover:border-amber-500/70 hover:shadow-[0_0_14px_rgba(245,158,11,0.35)]';
                      iconStyle = isActive ? 'text-white' : 'text-amber-600 dark:text-amber-400';
                      textStyle = isActive ? 'text-white font-bold' : 'text-amber-700 dark:text-amber-300 font-bold';
                    }
                  } else if (isActive) {
                    itemStyle = 'bg-primary text-primary-foreground font-bold shadow-sm';
                    iconStyle = 'text-primary-foreground';
                    textStyle = 'text-primary-foreground font-bold';
                  }

                  return (
                    <div key={item.name} className="flex flex-col relative">
                      <Link 
                        id={(item as any).id}
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
                        className={`group flex items-center ${isSidebarCollapsed ? 'justify-center px-1 py-2' : 'justify-between px-2.5 py-1.5'} rounded-xl text-[12px] font-medium transition-all ${itemStyle} ${isLocked ? 'opacity-80' : ''}`}
                      >
                        <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-2.5'} min-w-0 flex-1`}>
                          <item.icon className={`w-4 h-4 shrink-0 transition-colors ${iconStyle}`} />
                          {!isSidebarCollapsed && (
                            <>
                              <span className={`truncate whitespace-nowrap ${textStyle}`}>
                                {item.name}
                              </span>
                              {isLocked && <Lock className="w-3 h-3 text-amber-500 ml-1 shrink-0" />}
                            </>
                          )}
                        </div>
                        
                        {/* Inbox & Ticket Badges */}
                        {!isSidebarCollapsed ? (
                          <div className="flex items-center gap-2">
                            {(item.name === 'Live Inbox' || item.name === 'লাইভ ইনবক্স') && inboxUnreadCount > 0 && (
                              <span className="flex h-5 items-center justify-center rounded-full bg-red-500 px-2 text-[10px] font-bold text-white">
                                {inboxUnreadCount > 99 ? '99+' : inboxUnreadCount}
                              </span>
                            )}
                            {(item.name === 'Support Ticket' || item.name === 'সাপোর্ট টিকিট') && ticketUnreadCount > 0 && (
                              <span className="flex h-5 items-center justify-center rounded-full bg-red-500 px-2 text-[10px] font-bold text-white">
                                {ticketUnreadCount > 99 ? '99+' : ticketUnreadCount}
                              </span>
                            )}
                          </div>
                        ) : (
                          <>
                            {(item.name === 'Live Inbox' || item.name === 'লাইভ ইনবক্স') && inboxUnreadCount > 0 && (
                              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            )}
                            {(item.name === 'Support Ticket' || item.name === 'সাপোর্ট টিকিট') && ticketUnreadCount > 0 && (
                              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            )}
                          </>
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
  
  {/* Impersonation Banner */}
  {isImpersonating && (
    <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-md shrink-0 z-50">
      <div className="flex items-center gap-2 min-w-0">
        <ShieldCheck className="w-4 h-4 text-amber-200 animate-pulse shrink-0" />
        <span className="truncate">
          <strong>Superadmin Mode:</strong> Viewing <strong>{impersonatedTenantName || 'Tenant'}</strong> workspace.
        </span>
      </div>
      <button
        onClick={() => {
          Cookies.remove('impersonation_active');
          Cookies.remove('impersonation_tenant_name');
          window.close();
        }}
        className="bg-black/30 hover:bg-black/50 text-white border border-white/20 px-2.5 py-1 rounded-lg transition-all text-[11px] font-bold flex items-center gap-1 shrink-0 cursor-pointer ml-2"
        title="Exit tenant workspace"
      >
        <span>Exit Workspace</span>
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )}

  {/* Topbar */}
 <header className="h-16 md:h-14 px-4 md:px-3 flex items-center justify-between shrink-0 bg-background/80 backdrop-blur-xl border-b border-border shadow-sm relative z-40">
 <div className="flex items-center gap-3 md:gap-2 min-w-0">
 <button 
 className="md:hidden p-2.5 -ml-2.5 text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg transition-colors shrink-0"
 onClick={() => setIsMobileMenuOpen(true)}
 >
 <Menu className="w-6 h-6 md:w-3.5 md:h-3.5" />
 </button>
 <div className="hidden md:flex w-7 h-7 rounded bg-primary/10 items-center justify-center text-primary shrink-0">
 <LayoutGrid className="w-3.5 h-3.5" />
 </div>
 <h2 className="text-[15px] md:text-[13px] font-bold text-foreground tracking-tight truncate max-w-[100px] xs:max-w-[160px] sm:max-w-none">
  {mounted ? getPageTitle() : (language === 'en' ? 'Overview' : 'ওভারভিউ')}
 </h2>

  </div>
  
  <div className="flex items-center gap-2 md:gap-1.5">
  {mounted && (
   <button
   onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
   title={language === 'en' ? 'Switch to Bengali' : 'Switch to English'}
   className="relative flex items-center justify-between w-[46px] h-6 bg-muted border border-border rounded-full p-0.5 overflow-hidden transition-colors hover:border-primary/50 mx-1 cursor-pointer"
   >
   <div
   className={`absolute top-[1px] bottom-[1px] w-[20px] bg-primary rounded-full transition-transform duration-300 shadow-sm ${
   language === 'bn' ? 'translate-x-[20px]' : 'translate-x-0'
   }`}
   />
   <span className={`relative z-10 w-1/2 text-[9px] font-bold text-center transition-colors ${language === 'en' ? 'text-white' : 'text-muted-foreground'}`}>EN</span>
   <span className={`relative z-10 w-1/2 text-[9px] font-bold text-center transition-colors ${language === 'bn' ? 'text-white' : 'text-muted-foreground'}`}>BN</span>
   </button>
   )}
  
   {mounted && (
     <button
       onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
       title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
       className="p-2 md:p-1.5 rounded-xl bg-muted/60 border border-border hover:border-primary/40 text-foreground transition-all cursor-pointer flex items-center justify-center"
     >
       {theme === 'dark' ? (
         <Sun className="w-5 h-5 md:w-3.5 md:h-3.5 text-amber-400" />
       ) : (
         <Moon className="w-5 h-5 md:w-3.5 md:h-3.5 text-muted-foreground" />
       )}
     </button>
   )}
  
   {mounted && <NotificationBell />}

    {mounted && false && (
     <div className="relative z-50">
       <button
         onClick={() => setShowPresenceMenu(!showPresenceMenu)}
         className="flex items-center gap-1.5 px-3 py-1.5 md:px-2.5 md:py-1 bg-muted/60 border border-border hover:border-primary/40 rounded-full text-[13px] md:text-[11px] font-medium text-foreground transition-all cursor-pointer"
       >
         <span className={`w-2 h-2 rounded-full ${
           presenceStatus === 'available' ? 'bg-emerald-500' :
           presenceStatus === 'busy' ? 'bg-amber-500' :
           presenceStatus === 'away' ? 'bg-yellow-500' : 'bg-slate-400'
         }`} />
         <span className="capitalize">{presenceStatus}</span>
         <ChevronDown className="w-3 h-3 text-muted-foreground" />
       </button>

       {showPresenceMenu && (
         <div className="absolute right-0 mt-1 w-32 bg-card border border-border rounded-xl shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
           {[
             { id: 'available', label: 'Available', color: 'bg-emerald-500' },
             { id: 'busy', label: 'Busy', color: 'bg-amber-500' },
             { id: 'away', label: 'Away', color: 'bg-yellow-500' },
             { id: 'offline', label: 'Offline', color: 'bg-slate-400' },
           ].map(item => (
             <button
               key={item.id}
               onClick={() => handlePresenceChange(item.id)}
               className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-left hover:bg-muted transition-colors cursor-pointer ${presenceStatus === item.id ? 'font-bold text-foreground bg-muted' : 'text-muted-foreground'}`}
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
 className="w-10 h-10 md:w-8 md:h-8 rounded-full object-cover border border-border"
 onError={() => setAvatarError(true)}
 />
 ) : (
 <div className="w-10 h-10 md:w-7 md:h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[14px] md:text-[10px] font-bold uppercase border border-primary/20">
 {userProfile?.name?.charAt(0) || 'U'}
 </div>
 )}
 </button>
 
 {/* Dropdown menu */}
 <div className={`absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-xl shadow-2xl transition-all overflow-hidden ${isProfileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
 <div className="px-3 py-2 border-b border-border">
 <p className="text-[12px] font-semibold text-foreground truncate">{userProfile?.name || (language === 'en' ? 'My Account' : 'আমার অ্যাকাউন্ট')}</p>
 <p className="text-[10px] text-muted-foreground truncate">{userProfile?.email || ''}</p>
 </div>
 <div className="p-1.5">
 <Link 
 href="/dashboard/profile" 
 onClick={() => setIsProfileMenuOpen(false)}
 className="flex items-center gap-2 px-2 py-1.5 text-[12px] text-foreground hover:bg-muted rounded-md transition-colors"
 >
 <UserCircle className="w-3.5 h-3.5" />
 {language === 'en' ? 'Profile' : 'প্রোফাইল'}
 </Link>
 <button onClick={handleLogout} className="w-full flex items-center gap-2 px-2 py-1.5 text-[12px] text-red-500 hover:bg-red-500/10 rounded-md transition-colors mt-0.5 cursor-pointer">
 <LogOut className="w-3.5 h-3.5" />
 {language === 'en' ? 'Logout' : 'লগআউট'}
 </button>
 </div>
 </div>
 </div>
 </div>
 </header>

 {/* Page Content */}
 <div className={`flex-1 ${isInboxPage ? 'overflow-hidden p-0' : 'overflow-auto p-3'} custom-scrollbar pb-14 md:pb-0`}>
  {mounted && storageStats && (
    (() => {
      const totalUsedBytes = storageStats.totalUsedBytes || 0;
      const storageLimitBytes = storageStats.storageLimitBytes || 0;
      const storagePercent = storageLimitBytes > 0 ? (totalUsedBytes * 100) / storageLimitBytes : 0;
      const isStorage80 = storagePercent >= 80 && storagePercent < 100;
      const isStorage100 = storagePercent >= 100;

      if (!isStorage80 && !isStorage100) return null;

      return (
        <div className={`mb-3 p-3 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs backdrop-blur-md shadow-sm ${
          isStorage100 
            ? 'bg-red-500/10 border-red-500/20 text-red-500 dark:text-red-400' 
            : 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
        }`}>
          <div className="flex items-center gap-2.5">
            <span className={`w-2 h-2 rounded-full animate-pulse shrink-0 ${isStorage100 ? 'bg-red-500' : 'bg-amber-500'}`} />
            <span className="font-medium">
              {isStorage100 ? (
                language === 'en'
                  ? `🚨 Critical: Storage is fully utilized (${(totalUsedBytes / (1024 * 1024)).toFixed(1)} MB / ${(storageLimitBytes / (1024 * 1024)).toFixed(0)} MB). File uploads are blocked.`
                  : `🚨 জরুরি সতর্কতা: আপনার স্টোরেজ সম্পূর্ণ পূর্ণ (${(totalUsedBytes / (1024 * 1024)).toFixed(1)} MB / ${(storageLimitBytes / (1024 * 1024)).toFixed(0)} MB)। ফাইল আপলোড বন্ধ রয়েছে।`
              ) : (
                language === 'en'
                  ? `⚠️ Warning: Storage is ${storagePercent.toFixed(0)}% full (${(totalUsedBytes / (1024 * 1024)).toFixed(1)} MB / ${(storageLimitBytes / (1024 * 1024)).toFixed(0)} MB). Please clean up files or upgrade.`
                  : `⚠️ সতর্কতা: আপনার স্টোরেজ ${storagePercent.toFixed(0)}% পূর্ণ (${(totalUsedBytes / (1024 * 1024)).toFixed(1)} MB / ${(storageLimitBytes / (1024 * 1024)).toFixed(0)} MB)। ফাইল খালি করুন অথবা আপগ্রেড করুন।`
              )}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
            <Link 
              href="/dashboard/settings/storage" 
              className={`px-3 py-1.5 rounded-lg font-bold border transition-colors text-center w-full sm:w-auto ${
                isStorage100 
                  ? 'bg-red-500 text-white border-red-600 hover:bg-red-600' 
                  : 'bg-amber-500 text-white border-amber-600 hover:bg-amber-600'
              }`}
            >
              {language === 'en' ? 'Manage Storage' : 'স্টোরেজ খালি করুন'}
            </Link>
            <Link 
              href="/dashboard/settings/subscription" 
              className="px-3 py-1.5 rounded-lg font-bold bg-muted hover:bg-muted/80 border border-border text-foreground transition-colors text-center w-full sm:w-auto"
            >
              {language === 'en' ? 'Upgrade' : 'আপগ্রেড'}
            </Link>
          </div>
        </div>
      );
    })()
  )}
  {mounted && quotasData && (
    (() => {
      // ── Message Quota Warnings ──
      const messagesUsed = quotasData.messagesUsed || 0;
      const messageQuota = quotasData.messageQuota || 0;
      const messagePercent = messageQuota > 0 ? (messagesUsed * 100) / messageQuota : 0;
      const isMsg80 = messagePercent >= 80 && messagePercent < 100;
      const isMsg100 = messagePercent >= 100;

      // ── AI Quota Warnings ──
      const aiUsed = quotasData.aiUsed || 0;
      const aiQuota = quotasData.aiQuota || 0;
      const aiPercent = aiQuota > 0 ? (aiUsed * 100) / aiQuota : 0;
      const isAi80 = aiPercent >= 80 && aiPercent < 100;
      const isAi100 = aiPercent >= 100;

      return (
        <>
          {/* Message Quota Warning Banner */}
          {(isMsg80 || isMsg100) && (
            <div className={`mb-3 p-3 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs backdrop-blur-md shadow-sm ${
              isMsg100 
                ? 'bg-red-500/10 border-red-500/20 text-red-500 dark:text-red-400' 
                : 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
            }`}>
              <div className="flex items-center gap-2.5">
                <span className={`w-2 h-2 rounded-full animate-pulse shrink-0 ${isMsg100 ? 'bg-red-500' : 'bg-amber-500'}`} />
                <span className="font-medium">
                  {isMsg100 ? (
                    language === 'en'
                      ? `🚨 Critical: Monthly message quota fully consumed (${messagesUsed} / ${messageQuota}). Sending messages is blocked.`
                      : `🚨 জরুরি সতর্কতা: মাসিক মেসেজ কোটা সম্পূর্ণ শেষ (${messagesUsed} / ${messageQuota})। মেসেজ পাঠানো ব্লক রয়েছে।`
                  ) : (
                    language === 'en'
                      ? `⚠️ Warning: Monthly message quota is ${messagePercent.toFixed(0)}% full (${messagesUsed} / ${messageQuota}).`
                      : `⚠️ সতর্কতা: আপনার মাসিক মেসেজ কোটা ${messagePercent.toFixed(0)}% পূর্ণ (${messagesUsed} / ${messageQuota})।`
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                <Link 
                  href="/dashboard/settings/subscription" 
                  className={`px-3 py-1.5 rounded-lg font-bold border transition-colors text-center w-full sm:w-auto ${
                    isMsg100 
                      ? 'bg-red-500 text-white border-red-600 hover:bg-red-600' 
                      : 'bg-amber-500 text-white border-amber-600 hover:bg-amber-600'
                  }`}
                >
                  {language === 'en' ? 'Upgrade Plan' : 'আপগ্রেড প্ল্যান'}
                </Link>
              </div>
            </div>
          )}

          {/* AI Quota Warning Banner */}
          {(isAi80 || isAi100) && (
            <div className={`mb-3 p-3 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs backdrop-blur-md shadow-sm ${
              isAi100 
                ? 'bg-red-500/10 border-red-500/20 text-red-500 dark:text-red-400' 
                : 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
            }`}>
              <div className="flex items-center gap-2.5">
                <span className={`w-2 h-2 rounded-full animate-pulse shrink-0 ${isAi100 ? 'bg-red-500' : 'bg-amber-500'}`} />
                <span className="font-medium">
                  {isAi100 ? (
                    language === 'en'
                      ? `🚨 Critical: Monthly AI responses quota fully consumed (${aiUsed} / ${aiQuota}). AI chatbot auto-replies are disabled.`
                      : `🚨 জরুরি সতর্কতা: মাসিক এআই রেসপন্স কোটা সম্পূর্ণ শেষ (${aiUsed} / ${aiQuota})। চ্যাটবট অটো-রিপ্লাই বন্ধ রয়েছে।`
                  ) : (
                    language === 'en'
                      ? `⚠️ Warning: Monthly AI responses quota is ${aiPercent.toFixed(0)}% full (${aiUsed} / ${aiQuota}).`
                      : `⚠️ সতর্কতা: আপনার মাসিক এআই রেসপন্স কোটা ${aiPercent.toFixed(0)}% পূর্ণ (${aiUsed} / ${aiQuota})।`
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                <Link 
                  href="/dashboard/settings/subscription" 
                  className={`px-3 py-1.5 rounded-lg font-bold border transition-colors text-center w-full sm:w-auto ${
                    isAi100 
                      ? 'bg-red-500 text-white border-red-600 hover:bg-red-600' 
                      : 'bg-amber-500 text-white border-amber-600 hover:bg-amber-600'
                  }`}
                >
                  {language === 'en' ? 'Upgrade Plan' : 'আপগ্রেড প্ল্যান'}
                </Link>
              </div>
            </div>
          )}
        </>
      );
    })()
  )}
 {children}
 </div>

 {/* Mobile Bottom Navigation Bar */}
 <div className="md:hidden fixed bottom-0 left-0 right-0 h-[64px] bg-card border-t border-border z-50 flex items-center justify-around px-1 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] pb-safe">
   <Link 
     href="/dashboard" 
     className={`flex flex-col items-center justify-center w-full h-full text-[11px] font-medium transition-colors ${pathname === '/dashboard' ? 'text-primary font-bold' : 'text-muted-foreground hover:text-foreground'}`}
   >
     <LayoutGrid className="w-5 h-5 mb-1" />
     <span>{language === 'en' ? 'Home' : 'হোম'}</span>
   </Link>

   <Link 
     href="/dashboard/inbox" 
     className={`flex flex-col items-center justify-center w-full h-full text-[11px] font-medium transition-colors relative ${isInboxPage ? 'text-primary font-bold' : 'text-muted-foreground hover:text-foreground'}`}
   >
     <div className="relative">
       <Inbox className="w-5 h-5 mb-1" />
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
     className={`flex flex-col items-center justify-center w-full h-full text-[11px] font-medium transition-colors ${pathname.includes('/leads') ? 'text-primary font-bold' : 'text-muted-foreground hover:text-foreground'}`}
   >
     <UserCircle className="w-5 h-5 mb-1" />
     <span>{language === 'en' ? 'Leads' : 'লিডস'}</span>
   </Link>

   <Link 
     href="/dashboard/orders" 
   >
     <ShoppingBag className={`w-6 h-6 mb-1 ${pathname.includes('/orders') ? 'fill-primary/10 stroke-[2.5px]' : 'stroke-2'}`} />
     <span>{language === 'en' ? 'Orders' : 'অর্ডার'}</span>
   </Link>

   <button 
     onClick={() => setIsMobileMenuOpen(true)}
     className="flex flex-col items-center justify-center w-full h-full text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors"
   >
     <Menu className="w-6 h-6 mb-1 stroke-2" />
     <span>{language === 'en' ? 'Menu' : 'মেনু'}</span>
   </button>
 </div>
 </main>

 {/* Trial Expired Modal */}
 {showTrialModal && (
 <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4">
 <div className="bg-card text-card-foreground rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 text-center border border-red-500/20 max-h-[90vh] overflow-y-auto">
 <div className="w-16 h-16 bg-red-100 dark:bg-red-950/40 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shrink-0">
 <Crown className="w-8 h-8" />
 </div>
 <h3 className="text-2xl font-bold text-foreground mb-2">Trial Expired</h3>
 <p className="text-muted-foreground mb-8 text-sm">
 Your free trial has ended. Please subscribe to a plan to continue using this feature and unlock all premium capabilities.
 </p>
 <div className="flex gap-2">
 <button 
 onClick={() => setShowTrialModal(false)}
 className="flex-1 px-3 py-2 rounded-xl border border-border font-medium hover:bg-muted text-foreground transition-colors text-sm"
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
 className="flex-1 px-1.5 py-1 rounded-xl border border-border font-medium hover:bg-muted text-foreground transition-colors"
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
