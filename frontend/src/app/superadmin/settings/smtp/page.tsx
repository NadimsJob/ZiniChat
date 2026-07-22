'use client';

import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { useLanguage } from '@/components/LanguageProvider';
import { Mail, Send, Save, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Bell, CreditCard, Package, Clock } from 'lucide-react';

const DEFAULT_TEMPLATES: Record<string, { subject: string; body: string }> = {
  welcome: {
    subject: '🎉 Welcome to ZiniChat, {{tenantName}}!',
    body: `<div style="text-align: center; margin-bottom: 20px;">
  <img src="https://zinichat.com/logo.png" alt="ZiniChat Logo" style="height: 48px; width: auto;" />
</div>

Dear {{tenantName}},

Welcome to ZiniChat! Your account has been created successfully.

Get started by logging into your dashboard and connecting with your customers today.

Thank you,
ZiniChat Team
support@zinichat.com`,
  },
  paymentSubmitted: {
    subject: '✅ Payment Received Successfully – {{tenantName}}',
    body: `<div style="text-align: center; margin-bottom: 20px;">
  <img src="https://zinichat.com/logo.png" alt="ZiniChat Logo" style="height: 48px; width: auto;" />
</div>

Dear {{tenantName}},

Your payment submission has been received successfully. Our team will verify it shortly.

TrxID: {{trxId}}
Amount: {{amount}} BDT

Verification typically takes 1–2 business days. You will be notified via email once approved.

ZiniChat Billing Team
billing@zinichat.com`,
  },
  paymentPendingAdmin: {
    subject: '🔔 New Payment Requires Verification – {{tenantName}}',
    body: `<div style="text-align: center; margin-bottom: 20px;">
  <img src="https://zinichat.com/logo.png" alt="ZiniChat Logo" style="height: 48px; width: auto;" />
</div>

Admin Alert:
A new manual payment has been submitted. Please verify and approve.

Tenant: {{tenantName}}
TrxID: {{trxId}}
Amount: {{amount}} BDT

Please navigate to the Superadmin panel to approve the payment.

ZiniChat System Notification`,
  },
  paymentApproved: {
    subject: '🎉 Payment Approved – {{planName}} Plan Active!',
    body: `<div style="text-align: center; margin-bottom: 20px;">
  <img src="https://zinichat.com/logo.png" alt="ZiniChat Logo" style="height: 48px; width: auto;" />
</div>

Dear {{tenantName}},

Your payment has been successfully approved. 
Your subscription is now active!

Active Plan: {{planName}}

Log in to your dashboard now to enjoy all features!

ZiniChat Team
support@zinichat.com`,
  },
  addonPurchased: {
    subject: '🧩 Add-on Activated – {{addonName}}',
    body: `<div style="text-align: center; margin-bottom: 20px;">
  <img src="https://zinichat.com/logo.png" alt="ZiniChat Logo" style="height: 48px; width: auto;" />
</div>

Dear {{tenantName}},

The add-on you purchased has been successfully added to your account and is ready to use.

Add-on: {{addonName}}
Amount: {{amount}} BDT

If you need any assistance, feel free to contact us.

ZiniChat Team
support@zinichat.com`,
  },
  expiryReminder7d: {
    subject: '⚠️ Subscription Expiring in 7 Days – {{tenantName}}',
    body: `<div style="text-align: center; margin-bottom: 20px;">
  <img src="https://zinichat.com/logo.png" alt="ZiniChat Logo" style="height: 48px; width: auto;" />
</div>

Dear {{tenantName}},

Your ZiniChat subscription will expire in exactly 7 days.

Expiry Date: {{expiryDate}}

Please renew your subscription now to ensure uninterrupted service for your platform.

ZiniChat Team
support@zinichat.com`,
  },
  expiryReminder2d: {
    subject: '🚨 URGENT: Subscription Expiring in 2 Days!',
    body: `<div style="text-align: center; margin-bottom: 20px;">
  <img src="https://zinichat.com/logo.png" alt="ZiniChat Logo" style="height: 48px; width: auto;" />
</div>

Dear {{tenantName}},

Your ZiniChat subscription will expire in just 2 days!
If not renewed, all services will be temporarily suspended.

Expiry Date: {{expiryDate}}

Please renew your subscription immediately.

ZiniChat Team
support@zinichat.com`,
  },
  agentCreated: {
    subject: '🔐 You have been added as an Agent on ZiniChat',
    body: `<div style="text-align: center; margin-bottom: 20px;">
  <img src="https://zinichat.com/logo.png" alt="ZiniChat Logo" style="height: 48px; width: auto;" />
</div>

Dear {{agentName}},

{{tenantName}} has added you as an agent to the ZiniChat system.
Please log in using the credentials below:

Email: {{email}}
Password: {{password}}

Login Link: {{loginUrl}}

⚠️ For your security, please ensure you change your password immediately after logging in.

ZiniChat Team
support@zinichat.com`,
  },
  passwordReset: {
    subject: '🔐 Password Reset Request – ZiniChat',
    body: `<div style="text-align: center; margin-bottom: 20px;">
  <img src="https://zinichat.com/logo.png" alt="ZiniChat Logo" style="height: 48px; width: auto;" />
</div>

Dear {{userName}},

We received a request to reset the password for your account.
Please click the link below to set a new password:

{{resetLink}}

⚠️ This link will remain active for 1 hour. If you did not make this request, please ignore this email.

ZiniChat Security Team
security@zinichat.com`,
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
    key: 'broadcastCompleted',
    label: 'Broadcast Completed Alert',
    labelBn: 'ব্রডকাস্ট সম্পন্ন হওয়ার অ্যালার্ট (টেন্যান্ট)',
    description: 'টেন্যান্টের কোনো বাল্ক ব্রডকাস্ট সম্পন্ন হলে তাকে নোটিফিকেশন পাঠানো হবে',
    icon: Mail,
    enabledField: 'broadcastCompletedEnabled',
    subjectField: 'broadcastCompletedSubject',
    bodyField: 'broadcastCompletedBody',
    vars: ['{{businessName}}', '{{broadcastName}}', '{{totalRecipients}}', '{{timestamp}}'],
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
                <div className="border-t border-zinc-800 p-4 space-y-4">

                  {/* Top bar: Enable Toggle + Variables */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/60">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] text-zinc-500 font-medium uppercase tracking-wide">Variables:</span>
                      {cat.vars.map((v) => (
                        <code key={v} className="text-[10px] bg-zinc-800/80 text-primary px-2 py-0.5 rounded-md border border-zinc-700 cursor-default select-all">{v}</code>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-zinc-400">
                        {isEnabled ? (language === 'en' ? 'Enabled' : 'সক্রিয়') : (language === 'en' ? 'Disabled' : 'নিষ্ক্রিয়')}
                      </span>
                      <button
                        onClick={() => update(cat.enabledField, !isEnabled)}
                        className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${isEnabled ? 'bg-primary' : 'bg-zinc-700'}`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow ${isEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                  </div>

                  {/* Subject Field */}
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 mb-1.5 uppercase tracking-wide">Subject Line</label>
                    <input
                      type="text"
                      value={form[cat.subjectField] || ''}
                      onChange={(e) => update(cat.subjectField, e.target.value)}
                      placeholder="Email subject..."
                      className="w-full bg-background border border-zinc-700 rounded-lg px-3 py-2 text-[12px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                    />
                  </div>

                  {/* Body + Preview Split */}
                  <div className="grid md:grid-cols-2 gap-3">
                    {/* Editor */}
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-400 mb-1.5 uppercase tracking-wide">Email Body</label>
                      <textarea
                        value={form[cat.bodyField] || ''}
                        onChange={(e) => update(cat.bodyField, e.target.value)}
                        rows={12}
                        placeholder="Write your email content here...\n\nYou can use variables like {{tenantName}} anywhere in the text."
                        className="w-full bg-background border border-zinc-700 rounded-lg px-3 py-2.5 text-[12px] leading-relaxed focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all resize-none"
                      />
                    </div>

                    {/* Live Preview */}
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-400 mb-1.5 uppercase tracking-wide">Live Preview</label>
                      <div className="border border-zinc-700 rounded-lg overflow-hidden bg-zinc-950 h-full" style={{ minHeight: '250px' }}>
                        {/* Email Client Header */}
                        <div className="bg-zinc-900 border-b border-zinc-800 px-3 py-2">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                            <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                          </div>
                          <p className="text-[10px] text-zinc-500">From: <span className="text-zinc-300">{form.fromName || 'Your Platform'} &lt;{form.fromEmail || 'noreply@platform.com'}&gt;</span></p>
                          <p className="text-[10px] text-zinc-500">Subject: <span className="text-zinc-200 font-medium">{form[cat.subjectField] || '(no subject)'}</span></p>
                        </div>
                        {/* Email Body Preview */}
                        <div className="p-4 overflow-y-auto" style={{ maxHeight: '220px' }}>
                          <pre className="text-[11px] text-zinc-300 leading-relaxed whitespace-pre-wrap font-sans">
                            {form[cat.bodyField] || '(empty body)'}
                          </pre>
                        </div>
                      </div>
                    </div>
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
      <div className="flex justify-end gap-3">
        <button
          onClick={() => {
            if (confirm(language === 'en' ? 'Are you sure you want to reset all templates to default English text? This will overwrite your current templates.' : 'আপনি কি নিশ্চিত যে সব টেমপ্লেট রিসেট করতে চান? আপনার আগের টেমপ্লেট মুছে যাবে।')) {
              const resetData = { ...form };
              EMAIL_CATEGORIES.forEach(cat => {
                const defaultCat = DEFAULT_TEMPLATES[cat.key];
                if (defaultCat) {
                  resetData[cat.subjectField] = defaultCat.subject;
                  resetData[cat.bodyField] = defaultCat.body;
                }
              });
              setForm(resetData);
            }
          }}
          disabled={saving}
          className="flex items-center gap-2 px-3 py-2.5 bg-zinc-800 text-zinc-300 font-semibold rounded-xl hover:bg-zinc-700 transition-colors disabled:opacity-50"
        >
          {language === 'en' ? 'Reset to Defaults' : 'ডিফল্টে রিসেট করুন'}
        </button>

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
