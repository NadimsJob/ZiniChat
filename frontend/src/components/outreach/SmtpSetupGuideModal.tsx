'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import {
  HelpCircle,
  ExternalLink,
  Copy,
  Check,
  Mail,
  Server,
  Zap,
  ShieldAlert,
  AlertTriangle,
  Info,
  Key,
  Globe,
  Lock,
  ChevronRight,
  X
} from 'lucide-react';

export type SmtpGuideTab = 'gmail' | 'outlook' | 'cpanel';

interface SmtpSetupGuideProps {
  isOpen?: boolean;
  onClose?: () => void;
  activeTab?: SmtpGuideTab;
  onTabChange?: (tab: SmtpGuideTab) => void;
  mode?: 'modal' | 'inline';
}

export default function SmtpSetupGuide({
  isOpen = true,
  onClose,
  activeTab: controlledTab,
  onTabChange,
  mode = 'modal',
}: SmtpSetupGuideProps) {
  const { language } = useLanguage();
  const [internalTab, setInternalTab] = useState<SmtpGuideTab>('gmail');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const currentTab = controlledTab ?? internalTab;
  const handleSelectTab = (tab: SmtpGuideTab) => {
    if (onTabChange) onTabChange(tab);
    else setInternalTab(tab);
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (mode === 'modal' && !isOpen) return null;

  const content = (
    <div className="space-y-5 text-xs text-muted-foreground leading-relaxed">
      {/* Provider Selector Tabs */}
      <div className="grid grid-cols-3 gap-2 p-1 bg-surface border border-border/60 rounded-xl">
        <button
          type="button"
          onClick={() => handleSelectTab('gmail')}
          className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg font-bold text-[11px] sm:text-xs transition-all ${
            currentTab === 'gmail'
              ? 'bg-red-500/15 text-red-500 border border-red-500/30 shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
          }`}
        >
          <Mail className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Google / Gmail</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectTab('outlook')}
          className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg font-bold text-[11px] sm:text-xs transition-all ${
            currentTab === 'outlook'
              ? 'bg-blue-500/15 text-blue-500 border border-blue-500/30 shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
          }`}
        >
          <Server className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Microsoft 365</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectTab('cpanel')}
          className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg font-bold text-[11px] sm:text-xs transition-all ${
            currentTab === 'cpanel'
              ? 'bg-orange-500/15 text-orange-500 border border-orange-500/30 shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
          }`}
        >
          <Zap className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">cPanel Webmail</span>
        </button>
      </div>

      {/* TAB 1: GOOGLE WORKSPACE / GMAIL */}
      {currentTab === 'gmail' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Quick Parameters Box */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-red-500/5 border border-red-500/20 rounded-xl text-[11px]">
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                {language === 'en' ? 'Host' : 'হোস্ট'}
              </span>
              <div className="flex items-center gap-1 font-mono font-bold text-foreground">
                <span>smtp.gmail.com</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard('smtp.gmail.com', 'gmail_host')}
                  className="text-muted-foreground hover:text-red-500"
                  title="Copy"
                >
                  {copiedKey === 'gmail_host' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                {language === 'en' ? 'Port / Security' : 'পোর্ট ও সিকিউরিটি'}
              </span>
              <span className="font-mono font-bold text-foreground">465 (SSL) / 587</span>
            </div>

            <div className="col-span-2">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                {language === 'en' ? 'Password Type' : 'পাসওয়ার্ড টাইপ'}
              </span>
              <span className="font-bold text-red-500">
                {language === 'en' ? '16-Character App Password (Mandatory)' : '১৬ অক্ষরের অ্যাপ পাসওয়ার্ড (আবশ্যক)'}
              </span>
            </div>
          </div>

          {/* Warning / Important Callout */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-[11px] text-amber-500">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-semibold">
                {language === 'en' ? 'Do NOT use regular Gmail password!' : 'সাধারণ জিমেইল পাসওয়ার্ড দিয়ে কানেক্ট হবে না!'}
              </strong>
              <span>
                {language === 'en'
                  ? 'Google disables basic password authentication for 3rd-party apps. You must generate a free 16-character Google App Password following the steps below.'
                  : 'গুগলের সিকিউরিটি পলিসির কারণে সাধারণ পাসওয়ার্ড ব্লক থাকে। আপনাকে নিচের ৪টি ধাপ অনুসরণ করে ১৬ অক্ষরের ফ্রি অ্যাপ পাসওয়ার্ড তৈরি করে নিতে হবে।'}
              </span>
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-2.5">
            <div className="p-3 bg-surface/80 rounded-xl border border-border flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-red-500/10 text-red-500 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                1
              </span>
              <div>
                <strong className="text-foreground block text-xs">
                  {language === 'en' ? 'Enable 2-Step Verification on Google Account' : 'গুগল অ্যাকাউন্টে ২-স্টেপ ভেরিফিকেশন অন করুন'}
                </strong>
                <p className="mt-0.5 text-[11px]">
                  {language === 'en'
                    ? 'Visit Google Account Security settings and make sure 2-Step Verification is turned ON.'
                    : 'প্রথমে আপনার গুগল অ্যাকাউন্টের সিকিউরিটি সেটিংস-এ গিয়ে ২-স্টেপ ভেরিফিকেশন (2-Step Verification) অন আছে কিনা নিশ্চিত করুন।'}
                </p>
                <a
                  href="https://myaccount.google.com/security"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 text-red-500 hover:text-red-400 font-medium inline-flex items-center gap-1 text-[11px] underline"
                >
                  myaccount.google.com/security <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <div className="p-3 bg-surface/80 rounded-xl border border-border flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-red-500/10 text-red-500 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                2
              </span>
              <div>
                <strong className="text-foreground block text-xs">
                  {language === 'en' ? 'Visit App Passwords Generator' : 'অ্যাপ পাসওয়ার্ডস পেজে সরাসরি প্রবেশ করুন'}
                </strong>
                <p className="mt-0.5 text-[11px]">
                  {language === 'en'
                    ? 'Open the direct link below while logged in to your Google account.'
                    : 'নিচের লিংকে ক্লিক করে সরাসরি গুগল অ্যাপ পাসওয়ার্ড জেনারেটর পেজে যান:'}
                </p>
                <a
                  href="https://myaccount.google.com/apppasswords"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 text-emerald-500 hover:text-emerald-400 font-semibold inline-flex items-center gap-1 text-[11px] underline"
                >
                  myaccount.google.com/apppasswords <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <div className="p-3 bg-surface/80 rounded-xl border border-border flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-red-500/10 text-red-500 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                3
              </span>
              <div>
                <strong className="text-foreground block text-xs">
                  {language === 'en' ? 'Name the App as "Zini-Mail"' : 'অ্যাপের নাম দিন "Zini-Mail"'}
                </strong>
                <p className="mt-0.5 text-[11px]">
                  {language === 'en'
                    ? 'Under "App name", type "Zini-Mail" and click the "Create" button.'
                    : '"App name" বক্সে "Zini-Mail" লিখুন এবং "Create" (বা তৈরি করুন) বাটনে ক্লিক করুন।'}
                </p>
              </div>
            </div>

            <div className="p-3 bg-surface/80 rounded-xl border border-border flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-red-500/10 text-red-500 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                4
              </span>
              <div>
                <strong className="text-foreground block text-xs">
                  {language === 'en' ? 'Copy the 16-Character Password' : '১৬ অক্ষরের পাসওয়ার্ড কপি করে পেস্ট করুন'}
                </strong>
                <p className="mt-0.5 text-[11px]">
                  {language === 'en'
                    ? 'A popup with a yellow box will show a 16-letter password (e.g., "abcd efgh ijkl mnop"). Copy and paste it into the Password field above. (Spaces will be ignored automatically).'
                    : 'একটি হলুদ বক্সে ১৬ অক্ষরের পাসওয়ার্ড দেখতে পাবেন (যেমন: "abcd efgh ijkl mnop")। এটি কপি করে Zini-Mail-এর "Password / App Password" বক্সে বসিয়ে দিন।'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MICROSOFT 365 / OUTLOOK */}
      {currentTab === 'outlook' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Quick Parameters Box */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl text-[11px]">
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                {language === 'en' ? 'Host' : 'হোস্ট'}
              </span>
              <div className="flex items-center gap-1 font-mono font-bold text-foreground">
                <span>smtp.office365.com</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard('smtp.office365.com', 'outlook_host')}
                  className="text-muted-foreground hover:text-blue-500"
                  title="Copy"
                >
                  {copiedKey === 'outlook_host' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                {language === 'en' ? 'Port / Security' : 'পোর্ট ও সিকিউরিটি'}
              </span>
              <span className="font-mono font-bold text-foreground">587 (STARTTLS)</span>
            </div>

            <div className="col-span-2">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                {language === 'en' ? 'Login Username' : 'লগইন ইউজারনেম'}
              </span>
              <span className="font-mono font-bold text-foreground truncate block">
                {language === 'en' ? 'Your full Outlook or M365 email' : 'আপনার সম্পূর্ণ আউটলুক বা M365 ইমেইল'}
              </span>
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-2.5">
            <div className="p-3 bg-surface/80 rounded-xl border border-border flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-500 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                1
              </span>
              <div>
                <strong className="text-foreground block text-xs">
                  {language === 'en' ? 'Where to get credentials?' : 'ক্রেডেনশিয়াল কোথায় পাবেন?'}
                </strong>
                <p className="mt-0.5 text-[11px]">
                  {language === 'en'
                    ? 'Host is smtp.office365.com and Port is 587. Your SMTP username is your full email address (e.g. yourname@outlook.com or info@yourcompany.com).'
                    : 'হোস্ট হিসেবে দিন smtp.office365.com এবং পোর্ট ৫৮৭। ইউজারনেম হিসেবে আপনার সম্পূর্ণ ইমেইল অ্যাড্রেসটি দিন।'}
                </p>
              </div>
            </div>

            <div className="p-3 bg-surface/80 rounded-xl border border-border flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-500 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                2
              </span>
              <div>
                <strong className="text-foreground block text-xs">
                  {language === 'en' ? 'Personal Outlook / Hotmail (App Password)' : 'ব্যক্তিগত আউটলুক / হটমেইলে অ্যাপ পাসওয়ার্ড'}
                </strong>
                <p className="mt-0.5 text-[11px]">
                  {language === 'en'
                    ? 'If your Microsoft account has 2-Step Verification enabled, generate an App Password from Microsoft Security proofs:'
                    : 'যদি আপনার মাইক্রোসফট অ্যাকাউন্টে ২-স্টেপ ভেরিফিকেশন চালু থাকে, তবে নিচের লিংক থেকে অ্যাপ পাসওয়ার্ড তৈরি করে নিন:'}
                </p>
                <a
                  href="https://account.live.com/proofs/AppPassword"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 text-blue-500 hover:text-blue-400 font-semibold inline-flex items-center gap-1 text-[11px] underline"
                >
                  account.live.com/proofs/AppPassword <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <div className="p-3 bg-surface/80 rounded-xl border border-border flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-500 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                3
              </span>
              <div>
                <strong className="text-foreground block text-xs">
                  {language === 'en' ? 'Microsoft 365 Business (Admin SMTP Auth)' : 'মাইক্রোসফট ৩৬৫ বিজনেস (অ্যাডমিন SMTP অনুমোদন)'}
                </strong>
                <p className="mt-0.5 text-[11px]">
                  {language === 'en'
                    ? 'In corporate Microsoft 365, ensure "Authenticated SMTP" is enabled in M365 Admin Center: Users → Active Users → Mail → Manage email apps → Check "Authenticated SMTP".'
                    : 'বিজনেস মাইক্রোসফট ৩৬৫-এর ক্ষেত্রে আপনার ডোমেইন অ্যাডমিনকে নিশ্চিত করতে হবে যে M365 Admin Center থেকে আপনার মেইলবক্সের "Authenticated SMTP" অপশনটি টিক দেওয়া (Enabled) আছে।'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CUSTOM / CPANEL WEBMAIL */}
      {currentTab === 'cpanel' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Quick Parameters Box */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-orange-500/5 border border-orange-500/20 rounded-xl text-[11px]">
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                {language === 'en' ? 'Host (Default)' : 'হোস্ট (সাধারণত)'}
              </span>
              <div className="flex items-center gap-1 font-mono font-bold text-foreground">
                <span>mail.yourdomain.com</span>
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                {language === 'en' ? 'Port / Security' : 'পোর্ট ও সিকিউরিটি'}
              </span>
              <span className="font-mono font-bold text-foreground">465 (SSL) / 587</span>
            </div>

            <div className="col-span-2">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                {language === 'en' ? 'Where is Password?' : 'পাসওয়ার্ড কোথায় পাবেন?'}
              </span>
              <span className="font-bold text-orange-500">
                {language === 'en' ? 'Your cPanel Email Account Password' : 'সিপ্যানেলে ইমেইল খোলার সময় দেওয়া পাসওয়ার্ড'}
              </span>
            </div>
          </div>

          {/* cPanel Step by Step Guide */}
          <div className="space-y-2.5">
            <div className="p-3 bg-surface/80 rounded-xl border border-border flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-orange-500/10 text-orange-500 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                1
              </span>
              <div>
                <strong className="text-foreground block text-xs">
                  {language === 'en' ? 'Log in to your Hosting cPanel' : 'আপনার হোস্টিংয়ের cPanel-এ লগইন করুন'}
                </strong>
                <p className="mt-0.5 text-[11px]">
                  {language === 'en'
                    ? 'Open your website cPanel URL (e.g. yourdomain.com/cpanel or cpanel.yourdomain.com) and log in with your hosting credentials.'
                    : 'আপনার ওয়েবসাইটের cPanel লিঙ্ক (যেমন: yourdomain.com/cpanel)-এ যান এবং ইউজারনেম-পাসওয়ার্ড দিয়ে লগইন করুন।'}
                </p>
              </div>
            </div>

            <div className="p-3 bg-surface/80 rounded-xl border border-border flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-orange-500/10 text-orange-500 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                2
              </span>
              <div>
                <strong className="text-foreground block text-xs">
                  {language === 'en' ? 'Open "Email Accounts" in cPanel' : 'cPanel-এর "Email Accounts" মেনুতে যান'}
                </strong>
                <p className="mt-0.5 text-[11px]">
                  {language === 'en'
                    ? 'Under the "Email" section, click on "Email Accounts" to see all your created domain email addresses.'
                    : 'cPanel ড্যাশবোর্ডে "Email" সেকশনের অধীনে থাকা "Email Accounts" অপশনে ক্লিক করুন। সেখানে আপনার সকল ডোমেইন ইমেইল দেখতে পাবেন।'}
                </p>
              </div>
            </div>

            <div className="p-3 bg-surface/80 rounded-xl border border-border flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-orange-500/10 text-orange-500 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                3
              </span>
              <div>
                <strong className="text-foreground block text-xs">
                  {language === 'en' ? 'Click "Connect Devices" or "Set Up Mail Client"' : '"Connect Devices" বা "Set Up Mail Client"-এ ক্লিক করুন'}
                </strong>
                <p className="mt-0.5 text-[11px]">
                  {language === 'en'
                    ? 'Find the email address you want to connect (e.g. info@yourbrand.com) and click the "Connect Devices" button on the right.'
                    : 'আপনি যে ইমেইলটি কানেক্ট করতে চান (যেমন: sales@yourdomain.com), সেটির ডানপাশে থাকা "Connect Devices" বাটনে ক্লিক করুন।'}
                </p>
              </div>
            </div>

            <div className="p-3 bg-surface/80 rounded-xl border border-border flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-orange-500/10 text-orange-500 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                4
              </span>
              <div>
                <strong className="text-foreground block text-xs">
                  {language === 'en' ? 'Copy from "Secure SSL/TLS Settings (Recommended)"' : '"Secure SSL/TLS Settings" বক্স থেকে তথ্য কপি করুন'}
                </strong>
                <div className="mt-1.5 p-2.5 rounded-lg bg-surface border border-border/80 font-mono text-[11px] space-y-1">
                  <div>
                    <span className="text-muted-foreground font-sans">{language === 'en' ? 'Outgoing Server (Host): ' : 'আউটগোয়িং সার্ভার (হোস্ট): '}</span>
                    <strong className="text-foreground">mail.yourdomain.com</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-sans">{language === 'en' ? 'SMTP Port: ' : 'এসএমটিপি পোর্ট: '}</span>
                    <strong className="text-foreground">465 (SSL)</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-sans">{language === 'en' ? 'Username: ' : 'ইউজারনেম: '}</span>
                    <strong className="text-foreground">your full email address</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-sans">{language === 'en' ? 'Password: ' : 'পাসওয়ার্ড: '}</span>
                    <strong className="text-foreground">{language === 'en' ? 'Email account password' : 'ইমেইল খোলার সময় দেওয়া পাসওয়ার্ড'}</strong>
                  </div>
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {language === 'en'
                    ? 'Tip: If you forgot the email password, click "Manage" next to the email in cPanel to set a new password instantly without deleting the account.'
                    : 'পরামর্শ: পাসওয়ার্ড মনে না থাকলে সিপ্যানেলে ইমেইলের পাশে "Manage" বাটনে ক্লিক করে সাথে সাথে নতুন পাসওয়ার্ড সেট করে নিতে পারেন।'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (mode === 'inline') {
    return (
      <div className="bg-surface/70 backdrop-blur-xl border border-border rounded-2xl p-5 sm:p-6 shadow-md space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-bold text-foreground">
              {language === 'en' ? 'SMTP Setup Instructions & Credentials Guide' : 'এসএমটিপি কানেকশন ও পাসওয়ার্ড নির্দেশিকা'}
            </h3>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold">
            Step-by-Step
          </span>
        </div>
        {content}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card text-card-foreground border border-border max-w-xl w-full rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-border sticky top-0 bg-card z-10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                {language === 'en' ? 'Where to Find SMTP Credentials?' : 'এসএমটিপি তথ্য ও পাসওয়ার্ড কোথায় পাবেন?'}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {language === 'en'
                  ? 'Detailed guides for Google Workspace/Gmail, Microsoft 365, and cPanel Webmail.'
                  : 'গুগল জিমেইল, মাইক্রোসফট ৩৬৫ এবং সিপ্যানেল ওয়েবমেইলের ধাপে ধাপে নির্দেশনা।'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg border border-border hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {content}

        <div className="flex items-center justify-end pt-3 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm"
          >
            {language === 'en' ? 'Close & Continue' : 'বুঝেছি, বন্ধ করুন'}
          </button>
        </div>
      </div>
    </div>
  );
}
