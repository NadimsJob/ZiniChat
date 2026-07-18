'use client';

import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { useLanguage } from '@/components/LanguageProvider';
import { Mail, Send, Save, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Bell, CreditCard, Package, Clock } from 'lucide-react';

const DEFAULT_TEMPLATES: Record<string, { subject: string; body: string }> = {
  welcome: {
    subject: '🎉 ZiniChat-এ আপনাকে স্বাগতম, {{tenantName}}!',
    body: `প্রিয় {{tenantName}},

ZiniChat প্ল্যাটফর্মে আপনাকে স্বাগতম! আপনার অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে।

এখনই আপনার ড্যাশবোর্ডে লগইন করে আপনার কাস্টমারদের সাথে যুক্ত হওয়া শুরু করুন।

ধন্যবাদ,
ZiniChat টিম`,
  },
  paymentSubmitted: {
    subject: '✅ পেমেন্ট সাবমিট সফল হয়েছে – {{tenantName}}',
    body: `প্রিয় {{tenantName}},

আপনার পেমেন্ট সাবমিট সফলভাবে গ্রহণ করা হয়েছে। আমাদের টিম শীঘ্রই এটি ভেরিফাই করবে।

TrxID: {{trxId}}
পরিমাণ: {{amount}} BDT

ভেরিফিকেশনে সাধারণত ১–২ কার্যদিবস সময় লাগে। অ্যাপ্রুভ হলে আপনাকে ইমেইলে জানানো হবে।`,
  },
  paymentPendingAdmin: {
    subject: '🔔 নতুন পেমেন্ট ভেরিফিকেশন প্রয়োজন – {{tenantName}}',
    body: `অ্যাডমিন সতর্কতা:
একটি নতুন ম্যানুয়াল পেমেন্ট সাবমিট হয়েছে। অনুগ্রহ করে ভেরিফাই করুন।

টেন্যান্ট: {{tenantName}}
TrxID: {{trxId}}
পরিমাণ: {{amount}} BDT

দয়া করে Superadmin প্যানেলে গিয়ে পেমেন্টটি অ্যাপ্রুভ করুন।`,
  },
  paymentApproved: {
    subject: '🎉 পেমেন্ট অনুমোদিত হয়েছে – {{planName}} প্ল্যান সক্রিয়!',
    body: `প্রিয় {{tenantName}},

আপনার পেমেন্ট সফলভাবে অনুমোদিত হয়েছে। 
আপনার সাবস্ক্রিপশন এখন সক্রিয়!

সক্রিয় প্ল্যান: {{planName}}

এখনই আপনার ড্যাশবোর্ডে লগইন করে সব ফিচার উপভোগ করুন!`,
  },
  addonPurchased: {
    subject: '🧩 অ্যাড-অন সক্রিয় হয়েছে – {{addonName}}',
    body: `প্রিয় {{tenantName}},

আপনার কেনা অ্যাড-অনটি সফলভাবে আপনার অ্যাকাউন্টে যোগ করা হয়েছে এবং এখনই ব্যবহারযোগ্য।

অ্যাড-অন: {{addonName}}
পরিমাণ: {{amount}} BDT

যেকোনো প্রয়োজনে আমাদের সাথে যোগাযোগ করুন।`,
  },
  expiryReminder7d: {
    subject: '⚠️ সাবস্ক্রিপশনের মেয়াদ ৭ দিনে শেষ হবে – {{tenantName}}',
    body: `প্রিয় {{tenantName}},

আপনার সাবস্ক্রিপশনের মেয়াদ মাত্র ৭ দিন পরে শেষ হবে।

মেয়াদ শেষের তারিখ: {{expiryDate}}

আপনার প্ল্যাটফর্মের সার্ভিস নিরবচ্ছিন্ন রাখতে এখনই রিনিউ করুন।`,
  },
  expiryReminder2d: {
    subject: '🚨 শেষ সতর্কতা – সাবস্ক্রিপশনের মেয়াদ মাত্র ২ দিন বাকি!',
    body: `প্রিয় {{tenantName}},

আপনার সাবস্ক্রিপশনের মেয়াদ মাত্র ২ দিন পরে শেষ হবে! 
মেয়াদ শেষ হলে আপনার সকল সার্ভিস সাময়িকভাবে বন্ধ হয়ে যেতে পারে।

মেয়াদ শেষের তারিখ: {{expiryDate}}

অনুগ্রহ করে দ্রুত আপনার সাবস্ক্রিপশনটি রিনিউ করুন।`,
  },
  agentCreated: {
    subject: '🔐 ZiniChat-এ আপনাকে এজেন্ট হিসেবে যুক্ত করা হয়েছে',
    body: `প্রিয় {{agentName}},

{{tenantName}} আপনাকে ZiniChat সিস্টেমে এজেন্ট হিসেবে যুক্ত করেছে।
নিচের ক্রেডেনশিয়াল ব্যবহার করে সিস্টেমে লগইন করুন:

Email: {{email}}
Password: {{password}}

লগইন লিংক: {{loginUrl}}

⚠️ নিরাপত্তার স্বার্থে লগইন করার পর অবশ্যই আপনার পাসওয়ার্ড পরিবর্তন করে নিবেন।`,
  },
  passwordReset: {
    subject: '🔐 পাসওয়ার্ড রিসেট করুন – ZiniChat',
    body: `প্রিয় {{userName}},

আমরা আপনার অ্যাকাউন্টের জন্য একটি পাসওয়ার্ড রিসেট করার অনুরোধ পেয়েছি। 
অনুগ্রহ করে নিচের লিংকে ক্লিক করে নতুন পাসওয়ার্ড সেট করুন:

{{resetLink}}

⚠️ এই লিংকটি আগামী ১ ঘণ্টার জন্য কাজ করবে। আপনি যদি এই অনুরোধটি না করে থাকেন, তাহলে এই ইমেইলটি এড়িয়ে যান।`,
  },
};

const EMAIL_CATEGORIES = [
  {
    key: 'welcome',
    label: 'Welcome Email',
    labelBn: 'ওয়েলকাম ইমেইল',
    description: 'নতুন টেন্যান্ট সাইনআপ করলে পাঠানো হবে',
    icon: Mail,
    enabledField: 'sendWelcomeEmail',
    subjectField: 'welcomeSubject',
    bodyField: 'welcomeBody',
    vars: ['{{tenantName}}', '{{email}}'],
  },
  {
    key: 'paymentSubmitted',
    label: 'Payment Submitted',
    labelBn: 'পেমেন্ট সাবমিট কনফার্মেশন (টেন্যান্ট)',
    description: 'টেন্যান্ট TrxID সাবমিট করলে তাকে কনফার্মেশন ইমেইল পাঠানো হবে',
    icon: CreditCard,
    enabledField: 'paymentSubmittedEnabled',
    subjectField: 'paymentSubmittedSubject',
    bodyField: 'paymentSubmittedBody',
    vars: ['{{tenantName}}', '{{email}}', '{{amount}}', '{{trxId}}'],
  },
  {
    key: 'paymentPendingAdmin',
    label: 'Pending Payment Alert',
    labelBn: 'পেন্ডিং পেমেন্ট অ্যালার্ট (অ্যাডমিন)',
    description: 'টেন্যান্ট পেমেন্ট সাবমিট করলে সব Superadmin-দের নোটিফিকেশন পাঠানো হবে',
    icon: Bell,
    enabledField: 'paymentPendingAdminEnabled',
    subjectField: 'paymentPendingAdminSubject',
    bodyField: 'paymentPendingAdminBody',
    vars: ['{{tenantName}}', '{{amount}}', '{{trxId}}'],
  },
  {
    key: 'paymentApproved',
    label: 'Payment Approved',
    labelBn: 'পেমেন্ট অনুমোদন (টেন্যান্ট)',
    description: 'অ্যাডমিন পেমেন্ট অনুমোদন করলে টেন্যান্টকে ইমেইল পাঠানো হবে',
    icon: CheckCircle,
    enabledField: 'paymentApprovedEnabled',
    subjectField: 'paymentApprovedSubject',
    bodyField: 'paymentApprovedBody',
    vars: ['{{tenantName}}', '{{email}}', '{{planName}}'],
  },
  {
    key: 'addonPurchased',
    label: 'Addon Purchased',
    labelBn: 'অ্যাড-অন পার্চেজ কনফার্মেশন (টেন্যান্ট)',
    description: 'টেন্যান্ট অ্যাড-অন কিনলে কনফার্মেশন ইমেইল পাঠানো হবে',
    icon: Package,
    enabledField: 'addonPurchasedEnabled',
    subjectField: 'addonPurchasedSubject',
    bodyField: 'addonPurchasedBody',
    vars: ['{{tenantName}}', '{{email}}', '{{addonName}}', '{{amount}}'],
  },
  {
    key: 'expiryReminder7d',
    label: 'Expiry Reminder (7 Days)',
    labelBn: 'সাবস্ক্রিপশন মেয়াদ শেষের রিমাইন্ডার (৭ দিন আগে)',
    description: 'সাবস্ক্রিপশনের মেয়াদ শেষ হওয়ার ৭ দিন আগে টেন্যান্টকে রিমাইন্ডার পাঠানো হবে',
    icon: Clock,
    enabledField: 'expiryReminder7dEnabled',
    subjectField: 'expiryReminder7dSubject',
    bodyField: 'expiryReminder7dBody',
    vars: ['{{tenantName}}', '{{email}}', '{{daysLeft}}', '{{expiryDate}}'],
  },
  {
    key: 'expiryReminder2d',
    label: 'Expiry Reminder (2 Days)',
    labelBn: 'সাবস্ক্রিপশন মেয়াদ শেষের রিমাইন্ডার (২ দিন আগে)',
    description: 'সাবস্ক্রিপশনের মেয়াদ শেষ হওয়ার ২ দিন আগে টেন্যান্টকে জরুরি রিমাইন্ডার পাঠানো হবে',
    icon: AlertCircle,
    enabledField: 'expiryReminder2dEnabled',
    subjectField: 'expiryReminder2dSubject',
    bodyField: 'expiryReminder2dBody',
    vars: ['{{tenantName}}', '{{email}}', '{{daysLeft}}', '{{expiryDate}}'],
  },
  {
    key: 'agentCreated',
    label: 'Agent Created',
    labelBn: 'এজেন্ট একাউন্ট তৈরি (টেন্যান্ট)',
    description: 'টেন্যান্ট নতুন এজেন্ট তৈরি করলে ইমেইলে লগইন ডিটেইলস পাঠানো হবে',
    icon: Mail,
    enabledField: 'agentCreatedEnabled',
    subjectField: 'agentCreatedSubject',
    bodyField: 'agentCreatedBody',
    vars: ['{{agentName}}', '{{tenantName}}', '{{email}}', '{{password}}', '{{loginUrl}}'],
  },
  {
    key: 'passwordReset',
    label: 'Password Reset',
    labelBn: 'পাসওয়ার্ড রিসেট',
    description: 'ইউজার পাসওয়ার্ড রিসেট করতে চাইলে এই ইমেইল পাঠানো হবে',
    icon: Mail,
    enabledField: 'passwordResetEnabled',
    subjectField: 'passwordResetSubject',
    bodyField: 'passwordResetBody',
    vars: ['{{userName}}', '{{email}}', '{{resetLink}}'],
  },
  {
    key: 'newInquiry',
    label: 'New Website Inquiry',
    labelBn: 'ওয়েবসাইট ইনকোয়ারি (অ্যাডমিন)',
    description: 'ওয়েবসাইট থেকে নতুন মেসেজ আসলে সুপারঅ্যাডমিনদের ইমেইল পাঠানো হবে',
    icon: Bell,
    enabledField: 'newInquiryEnabled',
    subjectField: 'newInquirySubject',
    bodyField: 'newInquiryBody',
    vars: ['{{name}}', '{{email}}', '{{message}}'],
  },
  {
    key: 'ticketCreated',
    label: 'New Support Ticket',
    labelBn: 'নতুন সাপোর্ট টিকিট (অ্যাডমিন)',
    description: 'টেন্যান্ট নতুন টিকিট তৈরি করলে সুপারঅ্যাডমিনদের ইমেইল পাঠানো হবে',
    icon: Mail,
    enabledField: 'ticketCreatedEnabled',
    subjectField: 'ticketCreatedSubject',
    bodyField: 'ticketCreatedBody',
    vars: ['{{tenantName}}', '{{subject}}', '{{priority}}'],
  },
  {
    key: 'ticketReplied',
    label: 'Ticket Replied',
    labelBn: 'টিকিট রিপ্লাই',
    description: 'টিকিটে নতুন রিপ্লাই দিলে টেন্যান্ট বা অ্যাডমিনকে পাঠানো হবে',
    icon: Mail,
    enabledField: 'ticketRepliedEnabled',
    subjectField: 'ticketRepliedSubject',
    bodyField: 'ticketRepliedBody',
    vars: ['{{subject}}', '{{message}}'],
  },
  {
    key: 'ticketStatus',
    label: 'Ticket Status Updated',
    labelBn: 'টিকিট স্ট্যাটাস আপডেট',
    description: 'টিকিটের স্ট্যাটাস পরিবর্তন হলে টেন্যান্টকে পাঠানো হবে',
    icon: CheckCircle,
    enabledField: 'ticketStatusEnabled',
    subjectField: 'ticketStatusSubject',
    bodyField: 'ticketStatusBody',
    vars: ['{{subject}}', '{{status}}'],
  },
  {
    key: 'ticketAssigned',
    label: 'Ticket Assigned',
    labelBn: 'টিকিট অ্যাসাইন (অ্যাডমিন)',
    description: 'কোনো অ্যাডমিনকে টিকিট অ্যাসাইন করা হলে তাকে ইমেইল পাঠানো হবে',
    icon: Bell,
    enabledField: 'ticketAssignedEnabled',
    subjectField: 'ticketAssignedSubject',
    bodyField: 'ticketAssignedBody',
    vars: ['{{adminName}}', '{{tenantName}}', '{{subject}}'],
  },
];

export default function SmtpSettingsPage() {
  const { language } = useLanguage();
  const [form, setForm] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testing, setTesting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [openSection, setOpenSection] = useState<string | null>(null);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const token = Cookies.get('access_token');
      if (!token) {
        setStatusMsg({ type: 'error', text: '❌ লগইন করা নেই। পুনরায় লগইন করুন।' });
        setLoading(false);
        return;
      }
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiUrl}/smtp`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        // Merge defaults if fields are empty
        const mergedData = { ...data };
        EMAIL_CATEGORIES.forEach(cat => {
          const defaultCat = DEFAULT_TEMPLATES[cat.key];
          if (defaultCat) {
            if (!mergedData[cat.subjectField]) mergedData[cat.subjectField] = defaultCat.subject;
            if (!mergedData[cat.bodyField]) mergedData[cat.bodyField] = defaultCat.body;
          }
        });
        setForm(mergedData);
      } else {
        setStatusMsg({ type: 'error', text: `❌ API Error: ${res.status} ${res.statusText}` });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: `❌ সংযোগ ব্যর্থ: Backend চলছে কিনা দেখুন (http://localhost:3001)` });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchConfig(); }, []);

  const handleSave = async () => {
    setSaving(true);
    setStatusMsg(null);
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/smtp`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setStatusMsg({ type: 'success', text: '✅ সেটিংস সফলভাবে সেভ হয়েছে!' });
      } else {
        setStatusMsg({ type: 'error', text: '❌ সেভ করতে সমস্যা হয়েছে।' });
      }
    } catch {
      setStatusMsg({ type: 'error', text: '❌ সংযোগে সমস্যা হয়েছে।' });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!testEmail) return;
    setTesting(true);
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/smtp/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ to: testEmail }),
      });
      setStatusMsg(res.ok
        ? { type: 'success', text: `✅ টেস্ট ইমেইল ${testEmail}-এ পাঠানো হয়েছে!` }
        : { type: 'error', text: '❌ টেস্ট ইমেইল পাঠাতে ব্যর্থ।' });
    } finally {
      setTesting(false);
    }
  };

  const update = (key: string, val: any) => setForm((prev: any) => ({ ...prev, [key]: val }));

  if (loading) return <div className="p-2.5 text-zinc-400">লোড হচ্ছে...</div>;

  return (
    <div className="p-3 space-y-3 max-w-4xl">
      <div>
        <h1 className="text-[13px] font-bold flex items-center gap-2">
          <Mail className="w-4 h-4 text-primary" />
          {language === 'en' ? 'SMTP & Email Settings' : 'SMTP ও ইমেইল সেটিংস'}
        </h1>
        <p className="text-[12px] text-zinc-400 mt-1">SMTP কনফিগারেশন এবং সব ইমেইল টেমপ্লেট ম্যানেজ করুন।</p>
      </div>

      {/* SMTP Config */}
      <div className="bg-surface border border-zinc-800 rounded-xl p-3 space-y-2">
        <h2 className="font-semibold text-[13px]">SMTP Server Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {[
            { label: 'Host', field: 'host', placeholder: 'smtp.gmail.com' },
            { label: 'Port', field: 'port', placeholder: '587', type: 'number' },
            { label: 'Username', field: 'username', placeholder: 'user@gmail.com' },
            { label: 'Password', field: 'password', placeholder: '••••••••', type: 'password' },
            { label: 'From Email', field: 'fromEmail', placeholder: 'noreply@yourplatform.com' },
            { label: 'From Name', field: 'fromName', placeholder: 'YourPlatform' },
          ].map(({ label, field, placeholder, type }) => (
            <div key={field}>
              <label className="block text-xs text-zinc-400 mb-1">{label}</label>
              <input
                type={type || 'text'}
                value={form[field] || ''}
                onChange={(e) => update(field, e.target.value)}
                placeholder={placeholder}
                className="w-full bg-background border border-zinc-800 rounded-lg px-3 py-2 text-[12px] focus:outline-none focus:border-primary"
              />
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => update('secure', !form.secure)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.secure ? 'bg-primary' : 'bg-zinc-700'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.secure ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
          <span className="text-[12px] text-zinc-300">SSL/TLS Secure</span>
        </div>
      </div>

      {/* Email Category Templates */}
      <div className="space-y-3">
        <h2 className="font-semibold text-[13px]">Email Templates</h2>
        {EMAIL_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isOpen = openSection === cat.key;
          const isEnabled = form[cat.enabledField];
          return (
            <div key={cat.key} className="bg-surface border border-zinc-800 rounded-xl overflow-hidden">
              {/* Header */}
              <button
                onClick={() => setOpenSection(isOpen ? null : cat.key)}
                className="w-full flex items-center justify-between p-2.5 hover:bg-zinc-800/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isEnabled ? 'bg-primary/10' : 'bg-zinc-800'}`}>
                    <Icon className={`w-4 h-4 ${isEnabled ? 'text-primary' : 'text-zinc-500'}`} />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-[12px]">{language === 'en' ? cat.label : cat.labelBn}</p>
                    <p className="text-xs text-zinc-500">{cat.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${isEnabled ? 'bg-primary/10 text-primary' : 'bg-zinc-800 text-zinc-500'}`}>
                    {isEnabled ? 'চালু' : 'বন্ধ'}
                  </span>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
                </div>
              </button>

              {/* Expanded Content */}
              {isOpen && (
                <div className="border-t border-zinc-800 p-5 space-y-2">
                  {/* Enable Toggle */}
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-medium">এই ক্যাটাগরির ইমেইল সক্রিয় করুন</span>
                    <button
                      onClick={() => update(cat.enabledField, !isEnabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isEnabled ? 'bg-primary' : 'bg-zinc-700'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>

                  {/* Available Vars */}
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs text-zinc-500">ব্যবহারযোগ্য ভেরিয়েবল:</span>
                    {cat.vars.map((v) => (
                      <code key={v} className="text-xs bg-zinc-800 text-primary px-2 py-0.5 rounded">{v}</code>
                    ))}
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Subject (বিষয়)</label>
                    <input
                      type="text"
                      value={form[cat.subjectField] || ''}
                      onChange={(e) => update(cat.subjectField, e.target.value)}
                      className="w-full bg-background border border-zinc-800 rounded-lg px-3 py-2 text-[12px] focus:outline-none focus:border-primary"
                    />
                  </div>

                  {/* Body */}
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Body (HTML)</label>
                    <textarea
                      value={form[cat.bodyField] || ''}
                      onChange={(e) => update(cat.bodyField, e.target.value)}
                      rows={8}
                      className="w-full bg-background border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-primary resize-y"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Test Email */}
      <div className="bg-surface border border-zinc-800 rounded-xl p-5">
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <Send className="w-4 h-4 text-zinc-400" /> Test Email
        </h2>
        <div className="flex gap-3">
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="your@email.com"
            className="flex-1 bg-background border border-zinc-800 rounded-lg px-3 py-2 text-[12px] focus:outline-none focus:border-primary"
          />
          <button
            onClick={handleTest}
            disabled={testing || !testEmail}
            className="px-5 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg text-[12px] transition-colors disabled:opacity-50"
          >
            {testing ? 'পাঠানো হচ্ছে...' : 'টেস্ট পাঠাও'}
          </button>
        </div>
      </div>

      {/* Status */}
      {statusMsg && (
        <div className={`p-3 rounded-lg text-[12px] text-center ${statusMsg.type === 'success' ? 'bg-primary/10 text-primary' : 'bg-red-500/10 text-red-400'}`}>
          {statusMsg.text}
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-3 py-2.5 bg-primary text-black font-semibold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'সেভ হচ্ছে...' : 'সব পরিবর্তন সেভ করুন'}
        </button>
      </div>
    </div>
  );
}
