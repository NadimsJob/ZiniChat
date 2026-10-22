'use client';

import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import Cookies from 'js-cookie';
import {
  Users, Plus, Shield, ShieldCheck, Mail, X, Edit2, Trash2, Crown, Save,
  CheckCircle2, Lock, Wifi, Megaphone, ShoppingCart, ShoppingBag, Settings,
  Brain, CreditCard, UserCog, Inbox, Tag, MessageSquare, BarChart2, Clock, Globe,
  Search, Sparkles, Check, CheckSquare, Square, Layers, HelpCircle
} from 'lucide-react';
import InstructionBanner from '@/components/InstructionBanner';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface PermissionItem {
  key: string;
  label: string;
  labelBn: string;
  description: string;
  descriptionBn: string;
  isAction?: boolean;
}

interface PermissionGroup {
  id: string;
  title: string;
  titleBn: string;
  icon: any;
  color: string;
  items: PermissionItem[];
}

const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: 'inbox_group',
    title: 'Live Inbox & Channels',
    titleBn: 'লাইভ ইনবক্স ও চ্যানেল সংযোগ',
    icon: Inbox,
    color: 'emerald',
    items: [
      { key: 'inbox', label: 'Full Live Inbox Access', labelBn: 'সম্পূর্ণ ইনবক্স অ্যাক্সেস', description: 'Access live conversations and chats', descriptionBn: 'লাইভ চ্যাট এবং কথোপকথন দেখার পূর্ণ অ্যাক্সেস' },
      { key: 'inbox:view', label: 'View Conversations', labelBn: 'কথোপকথন দেখুন', description: 'Read customer messages and thread history', descriptionBn: 'গ্রাহকের মেসেজ এবং হিস্ট্রি পড়ার অ্যাক্সেস', isAction: true },
      { key: 'inbox:reply', label: 'Reply to Messages', labelBn: 'মেসেজের উত্তর দিন', description: 'Send chat replies, media, and quick templates', descriptionBn: 'কাস্টমারকে উত্তর এবং ফাইল পাঠানোর অনুমতি', isAction: true },
      { key: 'inbox:assign', label: 'Assign Conversations', labelBn: 'চ্যাট অ্যাসাইন করুন', description: 'Transfer or assign tickets to other team agents', descriptionBn: 'অন্য এজেন্টদের কাছে চ্যাট ট্রান্সফার করার সুবিধা', isAction: true },
      { key: 'inbox:delete', label: 'Delete Messages / Chats', labelBn: 'চ্যাট ডিলিট করুন', description: 'Permanently remove conversations or messages', descriptionBn: 'কথোপকথন বা মেসেজ স্থায়ীভাবে মুছে ফেলা', isAction: true },
      { key: 'inboxes:manage', label: 'Manage Channels', labelBn: 'চ্যানেল ইন্টিগ্রেশন', description: 'Connect & manage WhatsApp, Facebook, Instagram', descriptionBn: 'হোয়াটসঅ্যাপ, ফেসবুক ও ইনস্টাগ্রাম চ্যানেল ম্যানেজ', isAction: true },
    ]
  },
  {
    id: 'leads_group',
    title: 'Leads & CRM Contacts',
    titleBn: 'লিডস ও সিআরএম কন্টাক্টস',
    icon: UserCog,
    color: 'blue',
    items: [
      { key: 'leads', label: 'Full Leads Module', labelBn: 'সম্পূর্ণ লিডস মডিউল', description: 'Access contact list and CRM pipeline', descriptionBn: 'কন্টাক্ট লিস্ট এবং সিআরএম পাইপলাইন অ্যাক্সেস' },
      { key: 'leads:view', label: 'View Leads & Contacts', labelBn: 'লিডস ও কন্টাক্টস দেখুন', description: 'View customer names, phone, email & lead stages', descriptionBn: 'গ্রাহকের নাম, ফোন, ইমেইল এবং স্টেজ দেখুন', isAction: true },
      { key: 'leads:manage', label: 'Manage & Edit Leads', labelBn: 'লিডস এডিট ও আপডেট', description: 'Update lead status, tags, custom notes & data', descriptionBn: 'লিডের স্ট্যাটাস, ট্যাগ এবং নোটস আপডেট করার ক্ষমতা', isAction: true },
      { key: 'leads:export', label: 'Export Leads Data', labelBn: 'লিডস ডাটা এক্সপোর্ট', description: 'Export customer contact list to CSV / Excel', descriptionBn: 'কাস্টমার ডাটা এক্সেল বা সিএসভিতে ডাউনলোড করুন', isAction: true },
    ]
  },
  {
    id: 'products_group',
    title: 'Products & Catalog',
    titleBn: 'প্রোডাক্ট ও ক্যাটালগ',
    icon: ShoppingCart,
    color: 'amber',
    items: [
      { key: 'products', label: 'Full Products Module', labelBn: 'সম্পূর্ণ প্রোডাক্ট মডিউল', description: 'Catalog navigation and product inventory', descriptionBn: 'প্রোডাক্ট ক্যাটালগ ও স্টক নেভিগেশন' },
      { key: 'products:view', label: 'View Products Catalog', labelBn: 'প্রোডাক্ট ক্যাটালগ দেখুন', description: 'Browse items, pricing, SKU, and stock count', descriptionBn: 'আইটেম, মূল্য, স্টক এবং বিবরণী দেখার অনুমতি', isAction: true },
      { key: 'products:manage', label: 'Add & Edit Products', labelBn: 'প্রোডাক্ট যোগ ও এডিট', description: 'Create, update prices, manage stock & delete products', descriptionBn: 'প্রোডাক্ট তৈরি, মূল্য ও স্টক পরিবর্তন বা ডিলিট', isAction: true },
    ]
  },
  {
    id: 'orders_group',
    title: 'Orders & Sales Management',
    titleBn: 'অর্ডার ও সেলস ম্যানেজমেন্ট',
    icon: ShoppingBag,
    color: 'purple',
    items: [
      { key: 'orders', label: 'Full Orders Module', labelBn: 'সম্পূর্ণ অর্ডার মডিউল', description: 'Sales and order pipeline management', descriptionBn: 'বিক্রয় এবং অর্ডার পাইপলাইন অ্যাক্সেস' },
      { key: 'orders:view', label: 'View Orders', labelBn: 'অর্ডার তালিকা দেখুন', description: 'Review order records, shipping info & invoices', descriptionBn: 'অর্ডার রেকর্ড, ডেলিভারি ও ইনভয়েস দেখার অনুমতি', isAction: true },
      { key: 'orders:manage', label: 'Process & Edit Orders', labelBn: 'অর্ডার প্রসেস ও এডিট', description: 'Change order status, confirm payments, update courier', descriptionBn: 'অর্ডার স্ট্যাটাস, পেমেন্ট নিশ্চিতকরণ ও কুরিয়ার আপডেট', isAction: true },
    ]
  },
  {
    id: 'marketing_group',
    title: 'Marketing, Ads & Campaigns',
    titleBn: 'মার্কেটিং, এডস ও ক্যাম্পেইন',
    icon: Megaphone,
    color: 'rose',
    items: [
      { key: 'broadcasts:view', label: 'View Broadcasts', labelBn: 'ব্রডকাস্ট দেখুন', description: 'View mass messaging campaign analytics', descriptionBn: 'মেসেজিং ক্যাম্পেইন হিস্ট্রি ও স্ট্যাটস দেখুন', isAction: true },
      { key: 'broadcasts:create', label: 'Create & Send Broadcasts', labelBn: 'ব্রডকাস্ট তৈরি ও সেন্ড', description: 'Send mass marketing campaigns to customers', descriptionBn: 'গ্রাহকদের কাছে বাল্ক মেসেজিং ক্যাম্পেইন প্রেরণ', isAction: true },
      { key: 'zini_mail:view', label: 'View Zini-Mail (AI Email)', labelBn: 'জিনি-মেইল দেখুন', description: 'View automated cold email outreach campaigns', descriptionBn: 'অটোমেটেড কোল্ড ইমেইল ক্যাম্পেইন দেখুন', isAction: true },
      { key: 'zini_mail:manage', label: 'Manage AI Email Outreach', labelBn: 'এআই ইমেইল ক্যাম্পেইন ম্যানেজ', description: 'Launch new AI outreach, mailboxes & templates', descriptionBn: 'নতুন ক্যাম্পেইন, মেইলবক্স ও এআই টেমপ্লেট তৈরি', isAction: true },
      { key: 'meta_ads:view', label: 'View Meta Ads Manager', labelBn: 'মেটা এডস দেখুন', description: 'View Facebook & Instagram ad campaign metrics', descriptionBn: 'ফেসবুক ও ইনস্টাগ্রাম এডস মেট্রিক্স দেখুন', isAction: true },
      { key: 'meta_ads:manage', label: 'Manage Meta Ads & Budget', labelBn: 'মেটা এডস ও বাজেট ম্যানেজ', description: 'Create ads, adjust budget & trigger AI diagnosis', descriptionBn: 'এড ক্যাম্পেইন তৈরি, বাজেট পরিবর্তন ও এআই ডায়াগনস', isAction: true },
      { key: 'capi_hub:view', label: 'View CAPI Hub Tracking', labelBn: 'সিএপিআই হাব ট্র্যাকিং দেখুন', description: 'Monitor server-side Meta Conversions API events', descriptionBn: 'সার্ভার-সাইড মেটা কনভার্শন ইভেন্টস মনিটর', isAction: true },
      { key: 'capi_hub:manage', label: 'Configure CAPI Hub', labelBn: 'সিএপিআই হাব কনফিগারেশন', description: 'Connect Pixel, test events & configure domains', descriptionBn: 'পিক্সেল কানেক্ট, ডোমেন ও টেস্ট ইভেন্টস কনফিগার', isAction: true },
    ]
  },
  {
    id: 'ai_group',
    title: 'AI Training & Intelligence',
    titleBn: 'এআই ট্রেনিং ও ইন্টেলিজেন্স',
    icon: Brain,
    color: 'cyan',
    items: [
      { key: 'ai_training', label: 'Full AI Training Module', labelBn: 'সম্পূর্ণ এআই ট্রেনিং মডিউল', description: 'Access AI knowledge base & bot configuration', descriptionBn: 'এআই নলেজ বেস এবং কনফিগারেশন অ্যাক্সেস' },
      { key: 'ai_training:view', label: 'View Knowledge Base', labelBn: 'এআই নলেজ বেস দেখুন', description: 'Review business prompts, FAQs & simulated chat', descriptionBn: 'প্রম্পট, প্রশ্নোত্তর এবং টেস্ট সিমুলেটর দেখুন', isAction: true },
      { key: 'ai_training:manage', label: 'Train & Update AI', labelBn: 'এআই ট্রেইন ও আপডেট করুন', description: 'Add Q&As, train knowledge base & tune AI behavior', descriptionBn: 'নতুন প্রশ্নোত্তর যোগ, জ্ঞান ভান্ডার ও এআই টিউন করুন', isAction: true },
    ]
  },
  {
    id: 'workspace_group',
    title: 'Workspace & Settings',
    titleBn: 'ওয়ার্কস্পেস ও সেটিংস',
    icon: Settings,
    color: 'slate',
    items: [
      { key: 'team:view', label: 'View Team Roster', labelBn: 'টিম মেম্বারদের দেখুন', description: 'View team members, status & access list', descriptionBn: 'টিম মেম্বার এবং তাদের অ্যাক্সেস স্ট্যাটাস দেখুন', isAction: true },
      { key: 'team:manage', label: 'Manage Team Members', labelBn: 'টিম মেম্বার ম্যানেজ করুন', description: 'Invite, edit permissions & remove team agents', descriptionBn: 'নতুন এজেন্ট ইনভাইট, পারমিশন পরিবর্তন ও রিমুভ', isAction: true },
      { key: 'storage:view', label: 'View Storage & Assets', labelBn: 'স্টোরেজ ও ফাইল দেখুন', description: 'View media library and uploaded files', descriptionBn: 'মিডিয়া লাইব্রেরি এবং আপলোড ফাইল দেখুন', isAction: true },
      { key: 'storage:manage', label: 'Manage Storage Files', labelBn: 'স্টোরেজ ফাইল ম্যানেজ করুন', description: 'Upload, delete, and organize media files', descriptionBn: 'ফাইল আপলোড, মুছে ফেলা এবং পরিচালনা', isAction: true },
      { key: 'settings:view', label: 'View Workspace Settings', labelBn: 'ওয়ার্কস্পেস সেটিংস দেখুন', description: 'View tenant configuration and preferences', descriptionBn: 'বিজনেস প্রোফাইল ও কনফিগারেশন দেখুন', isAction: true },
      { key: 'settings:manage', label: 'Modify Workspace Settings', labelBn: 'ওয়ার্কস্পেস সেটিংস পরিবর্তন', description: 'Change business profile, hours, and defaults', descriptionBn: 'বিজনেস সেটিংস, সময়সূচী ও প্রেফারেন্স পরিবর্তন', isAction: true },
      { key: 'subscription:view', label: 'View Subscription & Billing', labelBn: 'সাবস্ক্রিপশন ও বিলিং দেখুন', description: 'Review active plan, quota usage, invoices', descriptionBn: 'এক্টিভ প্ল্যান, কোটা ব্যবহার ও ইনভয়েস দেখুন', isAction: true },
      { key: 'support', label: 'Support & Help Desk', labelBn: 'সাপোর্ট ও হেল্প ডেস্ক', description: 'Access ZiniChat customer support and tickets', descriptionBn: 'সাপোর্ট টিকিট ওপেন এবং হেল্প সেন্টার অ্যাক্সেস' },
    ]
  }
];

const ROLE_PRESETS = [
  {
    id: 'support',
    name: 'Customer Support',
    nameBn: 'কাস্টমার সাপোর্ট',
    icon: Inbox,
    color: 'emerald',
    description: 'Live Inbox, replying, assigning, lead view, catalog view, order view & support.',
    descriptionBn: 'লাইভ ইনবক্স, চ্যাট রিপ্লাই, টিকিট অ্যাসাইন, লিড ও ক্যাটালগ ভিউ।',
    permissions: [
      'inbox', 'inbox:view', 'inbox:reply', 'inbox:assign',
      'leads:view', 'products:view', 'orders:view', 'support'
    ]
  },
  {
    id: 'sales',
    name: 'Sales & Orders Agent',
    nameBn: 'সেলস ও অর্ডার এক্সিকিউটিভ',
    icon: ShoppingBag,
    color: 'purple',
    description: 'Chat reply, CRM lead editing, processing orders & invoices.',
    descriptionBn: 'চ্যাট রিপ্লাই, সিআরএম লিড আপডেট, অর্ডার প্রসেসিং ও ইনভয়েস হ্যান্ডেল।',
    permissions: [
      'inbox', 'inbox:view', 'inbox:reply',
      'leads:view', 'leads:manage',
      'orders:view', 'orders:manage',
      'products:view', 'support'
    ]
  },
  {
    id: 'marketing',
    name: 'Marketing Specialist',
    nameBn: 'মার্কেটিং ও এডস স্পেশালিস্ট',
    icon: Megaphone,
    color: 'rose',
    description: 'Broadcasts, Zini-Mail AI outreach, Meta Ads Manager, CAPI Hub & lead export.',
    descriptionBn: 'ব্রডকাস্ট, জিনি-মেইল এআই আউটরিচ, মেটা এডস ও লিড এক্সপোর্ট।',
    permissions: [
      'broadcasts:view', 'broadcasts:create',
      'zini_mail:view', 'zini_mail:manage',
      'meta_ads:view', 'meta_ads:manage',
      'capi_hub:view', 'capi_hub:manage',
      'leads:view', 'leads:export'
    ]
  },
  {
    id: 'catalog',
    name: 'Catalog Manager',
    nameBn: 'ক্যাটালগ ও ইনভেন্টরি ম্যানেজার',
    icon: ShoppingCart,
    color: 'amber',
    description: 'Products catalog management, order overview & media storage management.',
    descriptionBn: 'প্রোডাক্ট তৈরি ও এডিট, স্টক ম্যানেজমেন্ট এবং মিডিয়া স্টোরেজ।',
    permissions: [
      'products', 'products:view', 'products:manage',
      'orders:view',
      'storage:view', 'storage:manage'
    ]
  },
  {
    id: 'full_agent',
    name: 'Master Agent (Full)',
    nameBn: 'মাস্টার এজেন্ট (পূর্ণ অ্যাক্সেস)',
    icon: ShieldCheck,
    color: 'blue',
    description: 'Operational access to all workspace features and daily modules.',
    descriptionBn: 'ওয়ার্কস্পেসের সমস্ত মডিউল ও ফিচারে সম্পূর্ণ অ্যাক্সেস।',
    permissions: [
      'inbox', 'inbox:view', 'inbox:reply', 'inbox:assign', 'inbox:delete', 'inboxes:manage',
      'leads', 'leads:view', 'leads:manage', 'leads:export',
      'products', 'products:view', 'products:manage',
      'orders', 'orders:view', 'orders:manage',
      'broadcasts:view', 'broadcasts:create',
      'zini_mail:view', 'zini_mail:manage',
      'meta_ads:view', 'meta_ads:manage',
      'capi_hub:view', 'capi_hub:manage',
      'ai_training', 'ai_training:view', 'ai_training:manage',
      'team:view', 'storage:view', 'storage:manage',
      'settings:view', 'support'
    ]
  }
];

export default function TeamPage() {
  const { language } = useLanguage();
  const [agents, setAgents] = useState<any[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [seatLimit, setSeatLimit] = useState(1);
  const [seatUsed, setSeatUsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<any>(null);
  const [statsAgent, setStatsAgent] = useState<any>(null);
  const [statsData, setStatsData] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Search filter inside permissions modal
  const [permissionSearch, setPermissionSearch] = useState('');
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const openStatsModal = async (agent: any) => {
    setStatsAgent(agent);
    setStatsLoading(true);
    setStatsData(null);
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/tenant/team/${agent.id}/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStatsData(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setStatsLoading(false);
    }
  };

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'agent',
    agentAccessMode: 'ALL_CHANNELS',
    assignedChannels: [] as string[],
    menuPermissions: ['inbox', 'inbox:view', 'inbox:reply'] as string[],
    specializationTags: [] as string[],
  });

  const PRESET_SPECIALIZATION_TAGS = [
    'Property Agent', 'Reservation Desk', 'Account Executive',
    'Tax Consultant', 'Doctor Assistant', 'Clinic Receptionist',
    'Academic Counselor', 'Admission Desk', 'Wholesale Manager',
    'Logistics Dispatcher', 'Fleet Manager'
  ];

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = Cookies.get('access_token');
      const [agentsRes, channelsRes] = await Promise.all([
        fetch(`${API}/tenant/team`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API}/channels`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (agentsRes.ok) {
        const data = await agentsRes.json();
        setAgents(data.users || data);
        setSeatLimit(data.seatLimit ?? 1);
        setSeatUsed(data.seatUsed ?? (data.users?.length || 0));
      }
      if (channelsRes.ok) setChannels(await channelsRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const openModal = (agent: any = null) => {
    setError('');
    setPermissionSearch('');
    if (agent) {
      setEditingAgent(agent);
      const perms = Array.isArray(agent.permissions) && agent.permissions.length > 0
        ? agent.permissions
        : ['inbox', 'inbox:view', 'inbox:reply'];

      // Check if current perms match any preset
      const matched = ROLE_PRESETS.find(p =>
        p.permissions.length === perms.length && p.permissions.every(k => perms.includes(k))
      );
      setActivePreset(matched ? matched.id : 'custom');

      setFormData({
        name: agent.name,
        email: agent.email,
        password: '',
        role: agent.role,
        agentAccessMode: agent.agentAccessMode || 'ALL_CHANNELS',
        assignedChannels: agent.channelAssignments?.map((c: any) => c.channelConnectionId) || [],
        menuPermissions: perms,
        specializationTags: agent.specializationTags || [],
      });
    } else {
      setEditingAgent(null);
      setActivePreset('support');
      const defaultPreset = ROLE_PRESETS[0];
      setFormData({
        name: '', email: '', password: '',
        role: 'agent', agentAccessMode: 'ALL_CHANNELS',
        assignedChannels: [],
        menuPermissions: [...defaultPreset.permissions],
        specializationTags: [],
      });
    }
    setIsModalOpen(true);
  };

  const applyPreset = (preset: typeof ROLE_PRESETS[0]) => {
    setActivePreset(preset.id);
    setFormData(prev => ({
      ...prev,
      menuPermissions: [...preset.permissions]
    }));
  };

  const toggleMenuPermission = (key: string) => {
    setActivePreset('custom');
    setFormData(prev => ({
      ...prev,
      menuPermissions: prev.menuPermissions.includes(key)
        ? prev.menuPermissions.filter(k => k !== key)
        : [...prev.menuPermissions, key]
    }));
  };

  const toggleGroupPermissions = (group: PermissionGroup) => {
    setActivePreset('custom');
    const groupKeys = group.items.map(i => i.key);
    const allSelected = groupKeys.every(k => formData.menuPermissions.includes(k));

    setFormData(prev => {
      let nextPerms: string[];
      if (allSelected) {
        nextPerms = prev.menuPermissions.filter(k => !groupKeys.includes(k));
      } else {
        const toAdd = groupKeys.filter(k => !prev.menuPermissions.includes(k));
        nextPerms = [...prev.menuPermissions, ...toAdd];
      }
      return { ...prev, menuPermissions: nextPerms };
    });
  };

  const handleToggleChannel = (channelId: string) => {
    setFormData(prev => ({
      ...prev,
      assignedChannels: prev.assignedChannels.includes(channelId)
        ? prev.assignedChannels.filter(id => id !== channelId)
        : [...prev.assignedChannels, channelId]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const token = Cookies.get('access_token');
      const url = editingAgent ? `${API}/tenant/team/${editingAgent.id}` : `${API}/tenant/team`;
      const method = editingAgent ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(formData)
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to save team member');
      }
      await fetchData();
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(language === 'en' ? 'Remove this team member?' : 'এই টিম মেম্বারকে সরাতে চান?')) return;
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/tenant/team/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.message || 'Failed to delete');
        return;
      }
      fetchData();
    } catch (err) { console.error(err); }
  };

  const isSeatFull = seatUsed >= seatLimit && !editingAgent;

  // Filter permission groups based on search query
  const filteredGroups = useMemo(() => {
    if (!permissionSearch.trim()) return PERMISSION_GROUPS;
    const q = permissionSearch.toLowerCase();
    return PERMISSION_GROUPS.map(group => {
      const matchingItems = group.items.filter(item =>
        item.label.toLowerCase().includes(q) ||
        item.labelBn.toLowerCase().includes(q) ||
        item.key.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.descriptionBn.toLowerCase().includes(q)
      );
      if (matchingItems.length > 0 || group.title.toLowerCase().includes(q) || group.titleBn.toLowerCase().includes(q)) {
        return {
          ...group,
          items: matchingItems.length > 0 ? matchingItems : group.items
        };
      }
      return null;
    }).filter(Boolean) as PermissionGroup[];
  }, [permissionSearch]);

  const getPermissionsSummary = (agent: any) => {
    if (agent.role === 'admin' || agent.role === 'owner') return null;
    const perms: string[] = agent.permissions || [];
    if (perms.length === 0) return { label: language === 'en' ? 'No access' : 'কোনো অ্যাক্সেস নেই', count: 0, topTags: [] };
    if (perms.includes('*')) {
      return {
        presetName: language === 'en' ? 'Full Master Agent' : 'মাস্টার এজেন্ট (ফুল)',
        label: language === 'en' ? 'All Operational Modules' : 'সমস্ত অপারেশনাল মডিউল',
        count: perms.length,
        topTags: [language === 'en' ? 'All Modules' : 'সব মডিউল']
      };
    }

    const matchedPreset = ROLE_PRESETS.find(p =>
      p.permissions.length === perms.length && p.permissions.every(k => perms.includes(k))
    );

    const detectedModules: string[] = [];
    if (perms.some(k => k.startsWith('inbox'))) detectedModules.push(language === 'en' ? 'Inbox' : 'ইনবক্স');
    if (perms.some(k => k.startsWith('leads'))) detectedModules.push(language === 'en' ? 'Leads' : 'লিডস');
    if (perms.some(k => k.startsWith('orders'))) detectedModules.push(language === 'en' ? 'Orders' : 'অর্ডার');
    if (perms.some(k => k.startsWith('products'))) detectedModules.push(language === 'en' ? 'Products' : 'প্রোডাক্ট');
    if (perms.some(k => k.startsWith('broadcasts') || k.startsWith('meta_ads') || k.startsWith('zini_mail'))) {
      detectedModules.push(language === 'en' ? 'Marketing' : 'মার্কেটিং');
    }
    if (perms.some(k => k.startsWith('ai_training'))) detectedModules.push(language === 'en' ? 'AI' : 'এআই');
    if (perms.some(k => k.startsWith('settings') || k.startsWith('team') || k.startsWith('storage'))) {
      detectedModules.push(language === 'en' ? 'Admin' : 'সেটিংস');
    }

    return {
      presetName: matchedPreset ? (language === 'en' ? matchedPreset.name : matchedPreset.nameBn) : null,
      label: matchedPreset
        ? (language === 'en' ? matchedPreset.name : matchedPreset.nameBn)
        : (language === 'en' ? `Custom (${perms.length} actions)` : `কাস্টম (${perms.length} টি অ্যাকশন)`),
      count: perms.length,
      topTags: detectedModules.slice(0, 3)
    };
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-4 shadow-sm max-w-6xl mx-auto space-y-4">
      <InstructionBanner
        title={language === 'en' ? 'Team & Role Permissions' : 'টিম ও রোল পারমিশন'}
        description={language === 'en'
          ? 'Configure fine-grained action-level permissions and inbox channels for each team member. Admins have full access automatically.'
          : 'টিম এজেন্টদের জন্য সূক্ষ্ম অ্যাকশন-ভিত্তিক পারমিশন এবং চ্যানেল নির্ধারণ করুন। অ্যাডমিন ও ওনাররা স্বয়ংক্রিয়ভাবে পূর্ণ অ্যাক্সেস পেয়ে থাকেন।'}
        icon={ShieldCheck}
        variant="emerald"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            {language === 'en' ? 'Team Management' : 'টিম ম্যানেজমেন্ট'}
          </h1>
          <p className="text-muted-foreground text-[13px] mt-1">
            {language === 'en'
              ? 'Manage roles, fine-grained action permissions, and channel assignments.'
              : 'রোল, অ্যাকশন-ভিত্তিক পারমিশন এবং চ্যানেল অ্যাক্সেস কন্ট্রোল করুন।'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Seat usage badge */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold border ${
            isSeatFull
              ? 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
          }`}>
            <Users className="w-3.5 h-3.5" />
            {seatUsed} / {seatLimit} {language === 'en' ? 'Seats Used' : 'সিট ব্যবহৃত'}
          </div>

          <button
            onClick={() => openModal()}
            disabled={isSeatFull}
            title={isSeatFull ? (language === 'en' ? 'Seat limit reached. Upgrade your plan.' : 'সিট লিমিট পূর্ণ। প্ল্যান আপগ্রেড করুন।') : ''}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold transition-all shadow-md whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {language === 'en' ? 'Add Member' : 'মেম্বার যোগ করুন'}
          </button>
        </div>
      </div>

      {/* Team Table */}
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b border-border text-[12px] text-muted-foreground">
                  <th className="px-3 py-2.5 font-semibold">{language === 'en' ? 'Member' : 'মেম্বার'}</th>
                  <th className="px-3 py-2.5 font-semibold">{language === 'en' ? 'Role' : 'রোল'}</th>
                  <th className="px-3 py-2.5 font-semibold hidden md:table-cell">{language === 'en' ? 'Action Permissions' : 'পারমিশন সারসংক্ষেপ'}</th>
                  <th className="px-3 py-2.5 font-semibold hidden md:table-cell">{language === 'en' ? 'Channel Access' : 'চ্যানেল অ্যাক্সেস'}</th>
                  <th className="px-3 py-2.5 font-semibold text-right">{language === 'en' ? 'Actions' : 'অ্যাকশন'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {agents.map((agent) => {
                  const summary = getPermissionsSummary(agent);
                  return (
                    <tr key={agent.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="relative shrink-0">
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[12px] uppercase">
                              {agent.name.substring(0, 2)}
                            </div>
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${
                                agent.presenceStatus === 'available'
                                  ? 'bg-emerald-500 animate-pulse'
                                  : agent.presenceStatus === 'busy'
                                  ? 'bg-amber-500'
                                  : agent.presenceStatus === 'away'
                                  ? 'bg-orange-500'
                                  : 'bg-slate-400'
                              }`}
                              title={`Status: ${agent.presenceStatus || 'offline'}`}
                            />
                          </div>
                          <div>
                            <div className="text-[13px] font-semibold text-foreground flex items-center gap-1.5">
                              <span>{agent.name}</span>
                              {agent.role === 'owner' && <Crown className="w-3.5 h-3.5 text-amber-500" />}
                              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold uppercase ${
                                agent.presenceStatus === 'available'
                                  ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                  : agent.presenceStatus === 'busy'
                                  ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                                  : agent.presenceStatus === 'away'
                                  ? 'bg-orange-500/10 text-orange-600 border border-orange-500/20'
                                  : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                              }`}>
                                {agent.presenceStatus || 'offline'}
                              </span>
                            </div>
                            <div className="text-[11px] text-muted-foreground">{agent.email}</div>
                            {agent.specializationTags?.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {agent.specializationTags.map((tag: string) => (
                                  <span key={tag} className="text-[9px] bg-primary/10 text-primary font-bold px-1.5 py-0.2 rounded-full border border-primary/20">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        {agent.role === 'owner' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-full text-[11px] font-bold">
                            <Crown className="w-3 h-3" /> Owner
                          </span>
                        ) : agent.role === 'admin' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-violet-500/10 text-violet-500 border border-violet-500/20 rounded-full text-[11px] font-bold">
                            <ShieldCheck className="w-3 h-3" /> Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded-full text-[11px] font-bold">
                            <Shield className="w-3 h-3" /> Agent
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 hidden md:table-cell">
                        {agent.role === 'admin' || agent.role === 'owner' ? (
                          <span className="text-[11px] text-emerald-500 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> {language === 'en' ? 'Full Operational Access' : 'সম্পূর্ণ অ্যাক্সেস'}
                          </span>
                        ) : summary ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              {summary.presetName ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-md text-[10px] font-bold">
                                  <Sparkles className="w-2.5 h-2.5" />
                                  {summary.presetName}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted text-foreground border border-border rounded-md text-[10px] font-semibold">
                                  {summary.label}
                                </span>
                              )}
                              <span className="text-[10px] text-muted-foreground font-mono">
                                ({summary.count} {language === 'en' ? 'actions' : 'অ্যাকশন'})
                              </span>
                            </div>
                            {summary.topTags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {summary.topTags.map(tag => (
                                  <span key={tag} className="text-[9px] px-1.5 py-0.2 bg-muted/70 text-muted-foreground rounded font-medium border border-border/50">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">{language === 'en' ? 'No access' : 'কোনো অ্যাক্সেস নেই'}</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 hidden md:table-cell">
                        <span className="text-[11px] text-muted-foreground">
                          {agent.agentAccessMode === 'ASSIGNED_CHANNELS'
                            ? `${agent.channelAssignments?.length || 0} ${language === 'en' ? 'channel(s)' : 'চ্যানেল'}`
                            : (language === 'en' ? 'All Channels' : 'সব চ্যানেল')}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => openStatsModal(agent)}
                            title={language === 'en' ? 'View Activity & Stats' : 'অ্যাক্টিভিটি ও স্ট্যাটস দেখুন'}
                            className="p-1.5 text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors cursor-pointer"
                          >
                            <BarChart2 className="w-3.5 h-3.5" />
                          </button>
                          {agent.role !== 'owner' && (
                            <>
                              <button
                                onClick={() => openModal(agent)}
                                title={language === 'en' ? 'Edit Member Permissions' : 'পারমিশন এডিট করুন'}
                                className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(agent.id)}
                                title={language === 'en' ? 'Delete Member' : 'মুছে ফেলুন'}
                                className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Member Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-[95vw] sm:w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-border shrink-0 bg-muted/20">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-[15px] font-bold text-foreground">
                    {editingAgent
                      ? (language === 'en' ? 'Edit Team Member & Permissions' : 'টিম মেম্বার ও পারমিশন এডিট করুন')
                      : (language === 'en' ? 'Add Team Member & Assign Access' : 'নতুন টিম মেম্বার যোগ ও অ্যাক্সেস দিন')}
                  </h2>
                  <p className="text-[11px] text-muted-foreground">
                    {language === 'en'
                      ? 'Customize module visibility, action authorizations, and channel restrictions.'
                      : 'মডিউল ভিজিবিলিটি, অ্যাকশন পারমিশন এবং চ্যানেল কন্ট্রোল নির্ধারণ করুন।'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4 custom-scrollbar">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-[12px] rounded-xl flex items-center gap-2">
                  <X className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form id="agentForm" onSubmit={handleSubmit} className="space-y-4">
                {/* Basic User Information */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-muted/20 rounded-xl border border-border">
                  {/* Name */}
                  <div>
                    <label className="block text-[12px] font-semibold text-foreground/80 mb-1">
                      {language === 'en' ? 'Full Name' : 'পূর্ণ নাম'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text" required value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-xl text-[13px] focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-foreground"
                      placeholder="e.g. John Doe"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-[12px] font-semibold text-foreground/80 mb-1">
                      {language === 'en' ? 'Email Address' : 'ইমেইল এড্রেস'} {!editingAgent && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="email" required={!editingAgent} disabled={!!editingAgent}
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-xl text-[13px] focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none disabled:opacity-50 text-foreground"
                      placeholder="john@example.com"
                    />
                  </div>

                  {/* Password */}
                  <div className="sm:col-span-2">
                    <label className="block text-[12px] font-semibold text-foreground/80 mb-1">
                      {language === 'en' ? 'Password' : 'পাসওয়ার্ড'} {editingAgent ? `(${language === 'en' ? 'Leave blank to keep unchanged' : 'পরিবর্তন না করতে চাইলে খালি রাখুন'})` : `(${language === 'en' ? 'Optional - auto-generated if blank' : 'ঐচ্ছিক - ফাঁকা রাখলে অটো তৈরি হবে'})`}
                    </label>
                    <input
                      type="text" value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-xl text-[13px] focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-foreground font-mono"
                      placeholder={language === 'en' ? 'Auto-generated if blank' : 'ফাঁকা রাখলে অটো তৈরি হবে'}
                    />
                  </div>
                </div>

                {/* Role Switcher */}
                {(!editingAgent || editingAgent?.role !== 'owner') && (
                  <div>
                    <label className="block text-[12px] font-semibold text-foreground/80 mb-1.5">
                      {language === 'en' ? 'Account Role' : 'একাউন্ট রোল'}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: 'agent', label: language === 'en' ? 'Agent (Custom Permissions)' : 'এজেন্ট (কাস্টম পারমিশন)', desc: language === 'en' ? 'Control exactly what they can see & do' : 'নির্দিষ্ট অ্যাকশন কন্ট্রোল করুন', icon: Shield, color: 'blue' },
                        { value: 'admin', label: language === 'en' ? 'Admin (Full Access)' : 'অ্যাডমিন (সম্পূর্ণ অ্যাক্সেস)', desc: language === 'en' ? 'Automatic full access to all features' : 'সমস্ত ফিচারে পূর্ণ ক্ষমতা', icon: ShieldCheck, color: 'violet' },
                      ].map(({ value, label, desc, icon: Icon, color }) => (
                        <div
                          key={value}
                          onClick={() => setFormData({ ...formData, role: value })}
                          className={`cursor-pointer p-3 border rounded-xl flex items-start gap-2.5 transition-all ${
                            formData.role === value
                              ? 'border-primary bg-primary/10 text-primary shadow-sm'
                              : 'border-border text-muted-foreground hover:bg-muted/50'
                          }`}
                        >
                          <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                          <div>
                            <div className="text-[12px] font-bold text-foreground">{label}</div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">{desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Admin Notice */}
                {formData.role === 'admin' && (
                  <div className="flex items-center gap-2.5 p-3 bg-violet-500/10 border border-violet-500/20 rounded-xl">
                    <CheckCircle2 className="w-5 h-5 text-violet-500 shrink-0" />
                    <div>
                      <p className="text-[12px] text-foreground font-bold">
                        {language === 'en' ? 'Admin Role Selected' : 'অ্যাডমিন রোল নির্বাচিত'}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {language === 'en'
                          ? 'Admins have unrestricted access to all modules, billing, settings, and team management.'
                          : 'অ্যাডমিনরা স্বয়ংক্রিয়ভাবে সমস্ত মডিউল, সেটিংস, টিম এবং বিলিং-এ সম্পূর্ণ প্রবেশাধিকার পাবেন।'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Agent Fine-Grained Permissions Section */}
                {formData.role === 'agent' && (
                  <div className="space-y-3 pt-2 border-t border-border">
                    {/* Header & Preset Selector */}
                    <div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <div>
                          <label className="text-[13px] font-bold text-foreground flex items-center gap-1.5">
                            <Lock className="w-4 h-4 text-primary" />
                            {language === 'en' ? 'Controlled Action Permissions' : 'অ্যাকশন ভিত্তিক নিয়ন্ত্রিত পারমিশন'}
                          </label>
                          <p className="text-[11px] text-muted-foreground">
                            {language === 'en'
                              ? 'Pick a quick preset role or fine-tune individual actions across modules.'
                              : 'প্রিসেট রোল বেছে নিন অথবা প্রতিটি মডিউলের জন্য নির্দিষ্ট অ্যাকশন টিক দিন।'}
                          </p>
                        </div>

                        {/* Total Selected Counter */}
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 border border-primary/20 rounded-lg text-primary text-[11px] font-bold self-start sm:self-auto">
                          <Check className="w-3.5 h-3.5" />
                          <span>{formData.menuPermissions.length} {language === 'en' ? 'actions granted' : 'টি অ্যাকশন চালু'}</span>
                        </div>
                      </div>

                      {/* Quick Presets Ribbon */}
                      <div className="p-2.5 bg-muted/20 border border-border rounded-xl space-y-1.5">
                        <div className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-amber-500" />
                          {language === 'en' ? '1-Click Role Presets:' : 'এক ক্লিকে প্রিসেট রোল:'}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {ROLE_PRESETS.map((preset) => {
                            const isSelected = activePreset === preset.id;
                            const Icon = preset.icon;
                            return (
                              <button
                                key={preset.id}
                                type="button"
                                onClick={() => applyPreset(preset)}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border cursor-pointer ${
                                  isSelected
                                    ? 'bg-primary text-white border-primary shadow-sm scale-102'
                                    : 'bg-card text-foreground border-border hover:border-primary/40'
                                }`}
                                title={language === 'en' ? preset.description : preset.descriptionBn}
                              >
                                <Icon className="w-3 h-3" />
                                <span>{language === 'en' ? preset.name : preset.nameBn}</span>
                              </button>
                            );
                          })}
                          <button
                            type="button"
                            onClick={() => {
                              setActivePreset('custom');
                              setFormData(prev => ({ ...prev, menuPermissions: [] }));
                            }}
                            className="px-2 py-1 rounded-lg text-[11px] font-medium text-muted-foreground hover:text-red-500 border border-border hover:border-red-500/30 transition-colors cursor-pointer"
                          >
                            {language === 'en' ? 'Clear All' : 'সব মুছুন'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Search Permissions */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={permissionSearch}
                        onChange={(e) => setPermissionSearch(e.target.value)}
                        placeholder={language === 'en' ? 'Filter permissions (e.g. export, reply, orders, meta)...' : 'পারমিশন ফিল্টার করুন (যেমন: এক্সপোর্ট, রিপ্লাই, মেটা)...'}
                        className="w-full pl-8 pr-8 py-1.5 bg-background border border-border rounded-xl text-[12px] focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-foreground placeholder:text-muted-foreground"
                      />
                      {permissionSearch && (
                        <button
                          type="button"
                          onClick={() => setPermissionSearch('')}
                          className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* Categorized Permissions Accordion/Grid */}
                    <div className="space-y-3">
                      {filteredGroups.map((group) => {
                        const Icon = group.icon;
                        const groupKeys = group.items.map(i => i.key);
                        const selectedInGroup = groupKeys.filter(k => formData.menuPermissions.includes(k)).length;
                        const allGroupSelected = groupKeys.length > 0 && selectedInGroup === groupKeys.length;

                        return (
                          <div key={group.id} className="bg-card border border-border/80 rounded-xl overflow-hidden shadow-xs">
                            {/* Group Header */}
                            <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-b border-border/50">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                                  <Icon className="w-3.5 h-3.5" />
                                </div>
                                <span className="text-[12px] font-bold text-foreground">
                                  {language === 'en' ? group.title : group.titleBn}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-semibold bg-muted border border-border text-muted-foreground">
                                  {selectedInGroup} / {groupKeys.length}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => toggleGroupPermissions(group)}
                                className="text-[11px] font-semibold text-primary hover:underline cursor-pointer flex items-center gap-1"
                              >
                                {allGroupSelected ? (
                                  <>
                                    <Square className="w-3 h-3" />
                                    <span>{language === 'en' ? 'Deselect Group' : 'ক্লিয়ার'}</span>
                                  </>
                                ) : (
                                  <>
                                    <CheckSquare className="w-3 h-3" />
                                    <span>{language === 'en' ? 'Select Group' : 'সব সিলেক্ট'}</span>
                                  </>
                                )}
                              </button>
                            </div>

                            {/* Group Items Grid */}
                            <div className="p-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {group.items.map((item) => {
                                const checked = formData.menuPermissions.includes(item.key);
                                return (
                                  <label
                                    key={item.key}
                                    className={`flex items-start gap-2.5 p-2 rounded-xl border cursor-pointer transition-all ${
                                      checked
                                        ? 'border-primary/60 bg-primary/5 text-foreground shadow-xs'
                                        : 'border-border/60 text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => toggleMenuPermission(item.key)}
                                      className="mt-0.5 w-3.5 h-3.5 text-primary rounded border-border focus:ring-primary shrink-0 cursor-pointer"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <span className={`text-[12px] font-semibold truncate ${checked ? 'text-foreground' : 'text-foreground/90'}`}>
                                          {language === 'en' ? item.label : item.labelBn}
                                        </span>
                                        {item.isAction && (
                                          <span className="text-[9px] px-1 py-0.2 rounded bg-muted text-muted-foreground font-mono uppercase">
                                            Action
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5 leading-snug">
                                        {language === 'en' ? item.description : item.descriptionBn}
                                      </p>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}

                      {filteredGroups.length === 0 && (
                        <div className="p-6 text-center text-muted-foreground text-[12px] border border-dashed border-border rounded-xl">
                          {language === 'en' ? 'No permissions match your search query.' : 'আপনার সার্চের সাথে কোনো পারমিশন মিল পাওয়া যায়নি।'}
                        </div>
                      )}
                    </div>

                    {/* Channel Access Controls */}
                    <div className="pt-3 border-t border-border space-y-2">
                      <label className="block text-[12px] font-semibold text-foreground/80 flex items-center gap-1.5">
                        <Wifi className="w-3.5 h-3.5 text-muted-foreground" />
                        {language === 'en' ? 'Inbox Channel Isolation' : 'ইনবক্স চ্যানেল লিমিটেশন'}
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { value: 'ALL_CHANNELS', label: 'All Channels', labelBn: 'সব চ্যানেল', sub: 'Can access all connected inboxes', subBn: 'সব কানেক্টেড চ্যানেল দেখতে পাবে' },
                          { value: 'ASSIGNED_CHANNELS', label: 'Assigned Channels Only', labelBn: 'নির্দিষ্ট চ্যানেল', sub: 'Only assigned WhatsApp/FB accounts', subBn: 'কেবল সিলেক্টেড চ্যানেলগুলো অ্যাক্সেস পাবে' },
                        ].map(({ value, label, labelBn, sub, subBn }) => (
                          <div
                            key={value}
                            onClick={() => setFormData({ ...formData, agentAccessMode: value })}
                            className={`cursor-pointer p-2.5 border rounded-xl flex items-start gap-2 transition-all ${
                              formData.agentAccessMode === value
                                ? 'border-primary bg-primary/5 text-primary'
                                : 'border-border text-muted-foreground hover:bg-muted/50'
                            }`}
                          >
                            <div className={`w-3.5 h-3.5 mt-0.5 rounded-full border flex items-center justify-center shrink-0 ${
                              formData.agentAccessMode === value ? 'border-primary' : 'border-border'
                            }`}>
                              {formData.agentAccessMode === value && <div className="w-2 h-2 rounded-full bg-primary" />}
                            </div>
                            <div>
                              <div className="font-semibold text-[12px] text-foreground">{language === 'en' ? label : labelBn}</div>
                              <div className="text-[10px] text-muted-foreground">{language === 'en' ? sub : subBn}</div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {formData.agentAccessMode === 'ASSIGNED_CHANNELS' && (
                        <div className="space-y-1.5 max-h-36 overflow-y-auto p-2 bg-muted/20 border border-border rounded-xl">
                          {channels.length === 0 ? (
                            <p className="text-[11px] text-amber-600 bg-amber-500/10 p-2 rounded-lg">
                              {language === 'en' ? 'No channels connected yet. Connect WhatsApp or Meta pages in Channel Integration.' : 'এখনো কোনো চ্যানেল কানেক্ট করা হয়নি।'}
                            </p>
                          ) : channels.map(channel => (
                            <label key={channel.id} className="flex items-center gap-2 p-2 bg-card rounded-lg border border-border cursor-pointer hover:bg-muted/50 transition-colors">
                              <input
                                type="checkbox"
                                checked={formData.assignedChannels.includes(channel.id)}
                                onChange={() => handleToggleChannel(channel.id)}
                                className="w-3.5 h-3.5 text-primary rounded border-border focus:ring-primary cursor-pointer"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="text-[12px] font-semibold text-foreground truncate">
                                  {channel.displayName || channel.externalAccountId}
                                </div>
                                <div className="text-[10px] text-muted-foreground uppercase">{channel.channelType}</div>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Specialization Role Tags */}
                    <div className="pt-3 border-t border-border">
                      <label className="block text-[12px] font-semibold text-foreground/80 mb-1 flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-primary" />
                        {language === 'en' ? 'Specialization Role Tags (AI Lead Routing)' : 'স্পেশালাইজেশন রোল ট্যাগস (এআই লিড রাউটিং)'}
                      </label>
                      <p className="text-[11px] text-muted-foreground mb-2">
                        {language === 'en'
                          ? 'Incoming AI-qualified leads matching these tags will trigger real-time alerts to this agent.'
                          : 'নির্দিষ্ট ইন্ডাস্ট্রির লিড এলার্ট সরাসরি পেতে ট্যাগ সিলেক্ট করুন।'}
                      </p>
                      <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto custom-scrollbar p-1.5 bg-muted/20 rounded-xl border border-border">
                        {PRESET_SPECIALIZATION_TAGS.map(tag => {
                          const isSelected = formData.specializationTags.includes(tag);
                          return (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  specializationTags: isSelected
                                    ? prev.specializationTags.filter(t => t !== tag)
                                    : [...prev.specializationTags, tag]
                                }));
                              }}
                              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-primary text-white border-primary shadow-xs'
                                  : 'bg-background text-muted-foreground border-border hover:border-primary/50'
                              }`}
                            >
                              {isSelected ? `✓ ${tag}` : `+ ${tag}`}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-3 border-t border-border bg-muted/30 flex justify-end gap-2 rounded-b-2xl shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                {language === 'en' ? 'Cancel' : 'বাতিল'}
              </button>
              <button
                type="submit"
                form="agentForm"
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-[13px] font-semibold transition-all shadow-md shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {saving
                  ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <Save className="w-3.5 h-3.5" />}
                {language === 'en' ? 'Save Member' : 'সেইভ করুন'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Activity & Stats Summary Modal */}
      {statsAgent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-[95vw] sm:w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border shrink-0 bg-muted/20">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-xs">
                  <BarChart2 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-[15px] font-bold text-foreground flex items-center gap-1.5">
                    {statsAgent.name}
                    <span className="text-[11px] font-normal text-muted-foreground">({statsAgent.email})</span>
                  </h2>
                  <p className="text-[11px] text-muted-foreground">
                    {language === 'en' ? 'Member Activity & Access Overview' : 'মেম্বার অ্যাক্টিভিটি ও অ্যাক্সেস ওভারভিউ'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setStatsAgent(null)}
                className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-4">
              {statsLoading ? (
                <div className="h-48 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-emerald-500" />
                </div>
              ) : statsData ? (
                <>
                  {/* Status & Last Active Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    <div className="p-3 bg-muted/30 border border-border rounded-xl">
                      <div className="text-[10px] text-muted-foreground font-semibold uppercase">
                        {language === 'en' ? 'Presence' : 'স্ট্যাটাস'}
                      </div>
                      <div className="text-[13px] font-bold capitalize mt-0.5 flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${
                          statsData.user.presenceStatus === 'available' ? 'bg-emerald-500' : statsData.user.presenceStatus === 'busy' ? 'bg-amber-500' : 'bg-slate-400'
                        }`} />
                        {statsData.user.presenceStatus}
                      </div>
                    </div>

                    <div className="p-3 bg-muted/30 border border-border rounded-xl">
                      <div className="text-[10px] text-muted-foreground font-semibold uppercase">
                        {language === 'en' ? 'Conversations' : 'ইনবক্স হ্যান্ডেল্ড'}
                      </div>
                      <div className="text-[15px] font-extrabold text-emerald-500 mt-0.5">
                        {statsData.stats.handledConversationsCount}
                      </div>
                    </div>

                    <div className="p-3 bg-muted/30 border border-border rounded-xl col-span-2 sm:col-span-1">
                      <div className="text-[10px] text-muted-foreground font-semibold uppercase">
                        {language === 'en' ? 'Assigned Leads' : 'অ্যাসাইনকৃত লিড'}
                      </div>
                      <div className="text-[15px] font-extrabold text-blue-500 mt-0.5">
                        {statsData.stats.assignedContactsCount}
                      </div>
                    </div>
                  </div>

                  {/* Last Login Timestamp */}
                  <div className="p-3 bg-card border border-border rounded-xl flex items-center justify-between text-[12px]">
                    <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      {language === 'en' ? 'Last Active Login:' : 'সর্বশেষ লগইন:'}
                    </span>
                    <span className="font-bold text-foreground">
                      {statsData.user.lastLoginAt
                        ? new Date(statsData.user.lastLoginAt).toLocaleString(language === 'en' ? 'en-US' : 'bn-BD')
                        : (language === 'en' ? 'Never logged in' : 'লগইন রেকর্ড নেই')}
                    </span>
                  </div>

                  {/* Login Log History */}
                  <div>
                    <h4 className="text-[12px] font-bold text-foreground mb-2 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-primary" />
                      {language === 'en' ? 'Recent Login Sessions' : 'সাম্প্রতিক লগইন সেশন'}
                    </h4>
                    {statsData.recentLogins?.length > 0 ? (
                      <div className="border border-border rounded-xl overflow-hidden divide-y divide-border/50 text-[11px]">
                        {statsData.recentLogins.map((log: any) => (
                          <div key={log.id} className="p-2.5 flex items-center justify-between bg-muted/10">
                            <div>
                              <div className="font-semibold text-foreground">
                                {log.browser || 'Browser'} / {log.os || 'OS'} ({log.deviceType || 'Desktop'})
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                IP: {log.ipAddress}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 rounded font-bold text-[10px]">
                                {log.status}
                              </span>
                              <div className="text-[10px] text-muted-foreground mt-0.5">
                                {new Date(log.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 bg-muted/20 border border-border rounded-xl text-[11px] text-muted-foreground text-center">
                        {language === 'en' ? 'No recent login history logged.' : 'কোনো সাম্প্রতিক লগইন হিস্ট্রি নেই।'}
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>

            <div className="px-4 py-3 border-t border-border bg-muted/30 flex justify-end rounded-b-2xl shrink-0">
              <button
                onClick={() => setStatsAgent(null)}
                className="px-4 py-1.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-[12px] font-bold transition-all shadow-md cursor-pointer"
              >
                {language === 'en' ? 'Close' : 'বন্ধ করুন'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
