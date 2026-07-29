'use client';

import { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { useLanguage } from '@/components/LanguageProvider';
import { useCurrency } from '@/components/CurrencyProvider';
import {
  Crown, Package, Puzzle, Check, Zap, RefreshCw, AlertCircle,
  MessageSquare, Bot, Users, HardDrive, Wifi, Globe, Tag, ShieldCheck,
  BarChart2, Megaphone, Headphones, Star
} from 'lucide-react';
import toast from 'react-hot-toast';

// Complete feature map — must stay in sync with packages/page.tsx and tenants/page.tsx
const FEATURE_MAP: Record<string, { en: string; bn: string; icon: any }> = {
  'ai_assistant':   { en: 'AI Assistant',           bn: 'এআই অ্যাসিস্ট্যান্ট',    icon: Bot },
  'whatsapp':       { en: 'WhatsApp Integration',   bn: 'হোয়াটসঅ্যাপ ইন্টিগ্রেশন', icon: Wifi },
  'messenger':      { en: 'Messenger Integration',  bn: 'মেসেঞ্জার ইন্টিগ্রেশন',   icon: MessageSquare },
  'instagram':      { en: 'Instagram Integration',  bn: 'ইন্সটাগ্রাম ইন্টিগ্রেশন', icon: Globe },
  'lead_manage':    { en: 'Leads CRM',              bn: 'লিডস সিআরএম',            icon: BarChart2 },
  'commerce':       { en: 'Products & Orders',       bn: 'প্রোডাক্টস ও অর্ডারস',    icon: Package },
  'broadcast':      { en: 'Broadcast Campaigns',    bn: 'ব্রডকাস্ট ক্যাম্পেইন',     icon: Megaphone },
  'team':           { en: 'Team Management',        bn: 'টিম ম্যানেজমেন্ট',         icon: Users },
  'labels':         { en: 'Labels & Tagging',       bn: 'লেবেল ও ট্যাগিং',         icon: Tag },
  'support_ai':     { en: 'Support AI Agent',       bn: 'সাপোর্ট এআই এজেন্ট',      icon: Headphones },
  'own_api':        { en: 'Bring Your Own API Key', bn: 'নিজস্ব এপিআই কি',         icon: ShieldCheck },
  'storage':        { en: 'File Storage',           bn: 'ফাইল স্টোরেজ',            icon: HardDrive },
  'analytics':      { en: 'Analytics & Reports',   bn: 'অ্যানালিটিক্স ও রিপোর্ট',  icon: BarChart2 },
};

export default function SubscriptionSettingsPage() {
  const { language } = useLanguage();
  const { rate, formatBdtDirect, formatNumber, displayCurrency, setDisplayCurrency } = useCurrency();

  const [plans, setPlans] = useState<any[]>([]);
  const [addons, setAddons] = useState<any[]>([]);
  const [quotaData, setQuotaData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const maxDiscountPercent = plans.reduce((max: number, p: any) => {
    let disc = Number(p.yearlyDiscountPercent) || 0;
    if (!disc) {
      const m = Number(p.priceMonthlyBdt) || 0;
      const y = Number(p.priceYearlyBdt) || 0;
      if (m > 0 && y > 0) disc = Math.round(((m * 12 - y) / (m * 12)) * 100 * 100) / 100;
    }
    return disc > max ? disc : max;
  }, 0);

  const currentSubscription = quotaData?.subscription;
  const activePlanId = currentSubscription?.planId;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = Cookies.get('access_token');
        const headers = { 'Authorization': `Bearer ${token}` };
        const [plansRes, addonsRes, quotaRes] = await Promise.all([
          fetch(`${API}/packages/plans`),
          fetch(`${API}/packages/addons`),
          fetch(`${API}/billing/quotas`, { headers }),
        ]);
        if (plansRes.ok) setPlans(await plansRes.json());
        if (addonsRes.ok) setAddons(await addonsRes.json());
        if (quotaRes.ok) setQuotaData(await quotaRes.json());
      } catch (err) {
        toast.error(language === 'en' ? 'Failed to load subscription data.' : 'সাবস্ক্রিপশন তথ্য লোড করতে সমস্যা হয়েছে।');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSubscribe = (planId: string) => {
    window.open(`/dashboard/billing/pay-mfs?planId=${planId}&billingCycle=${billingCycle}`, '_blank');
  };

  const handleBuyAddon = (addonId: string) => {
    window.open(`/dashboard/billing/pay-mfs?addonId=${addonId}`, '_blank');
  };

  const parseFeaturesArray = (raw: any): string[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try { return JSON.parse(raw); } catch { return []; }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-4 space-y-4 animate-pulse">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 bg-surface-hover/50 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5 p-2 sm:p-4 pb-10 animate-in fade-in duration-500">

      {/* Page Header */}
      <div className="bg-surface/70 backdrop-blur-xl border border-surface-hover rounded-2xl p-5 shadow-sm">
        <h1 className="text-xl font-bold flex items-center gap-2 text-foreground">
          <Crown className="w-6 h-6 text-yellow-500 shrink-0" />
          {language === 'en' ? 'Subscription & Add-ons' : 'সাবস্ক্রিপশন এবং অ্যাড-অন'}
        </h1>
        <p className="text-[13px] text-zinc-400 mt-1">
          {language === 'en'
            ? 'View your current plan, upgrade, or purchase extra add-ons.'
            : 'আপনার বর্তমান প্ল্যান দেখুন, আপগ্রেড করুন বা অতিরিক্ত লিমিট কিনুন।'}
        </p>
      </div>

        {/* Current Subscription Card */}
        <div className={`rounded-2xl p-5 border ${
          currentSubscription
            ? 'bg-gradient-to-r from-primary/15 via-primary/5 to-secondary/10 border-primary/30'
            : 'bg-surface/50 border-surface-hover'
        } backdrop-blur-xl`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-primary mb-1">
                {language === 'en' ? 'Current Plan' : 'বর্তমান প্ল্যান'}
              </p>
              <div className="flex items-center gap-2">
                <h2 className="text-3xl font-black text-foreground">
                  {quotaData?.customPlanName || quotaData?.basePlan?.name || (language === 'en' ? 'Free Tier' : 'ফ্রি টায়ার')}
                </h2>
                {(quotaData?.customPlanName || (quotaData?.basePlan && (
                  quotaData.messageQuota !== quotaData.basePlan.messageQuota ||
                  quotaData.aiQuota !== quotaData.basePlan.aiQuota ||
                  quotaData.seatLimit !== quotaData.basePlan.seatLimit ||
                  quotaData.whatsappLimit !== quotaData.basePlan.whatsappLimit
                ))) && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    {language === 'en' ? 'CUSTOMIZED' : 'কাস্টমাইজড'}
                  </span>
                )}
              </div>
              {currentSubscription ? (
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    currentSubscription.status === 'active' ? 'bg-green-500/15 text-green-400' :
                    currentSubscription.status === 'trialing' ? 'bg-blue-500/15 text-blue-400' :
                    'bg-orange-500/15 text-orange-400'
                  }`}>
                    {currentSubscription.status?.toUpperCase()}
                  </span>
                  <span className="text-[12px] text-zinc-400">
                    {language === 'en' ? 'Renews:' : 'রিনিউ হবে:'}{' '}
                    <span className="text-zinc-200 font-medium">
                      {new Date(currentSubscription.currentPeriodEnd).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </span>
                </div>
              ) : (
                <p className="text-[12px] text-zinc-400 mt-2">
                  {language === 'en' ? 'No active subscription. Upgrade to unlock more features.' : 'কোনো সক্রিয় সাবস্ক্রিপশন নেই। আরো ফিচার পেতে আপগ্রেড করুন।'}
                </p>
              )}
            </div>

            {/* Quick Quotas */}
            {quotaData && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center">
                {[
                  { label: language === 'en' ? 'Messages' : 'মেসেজ', value: formatNumber(quotaData.messageQuota), icon: MessageSquare },
                  { label: language === 'en' ? 'AI Credits' : 'এআই ক্রেডিট', value: formatNumber(quotaData.aiQuota), icon: Bot },
                  { label: language === 'en' ? 'Seats' : 'সিট', value: formatNumber(quotaData.seatLimit), icon: Users },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="bg-surface/60 backdrop-blur-sm border border-surface-hover rounded-xl px-3 py-2">
                    <Icon className="w-3.5 h-3.5 text-primary mx-auto mb-0.5" />
                    <div className="text-lg font-black text-foreground">{value}</div>
                    <div className="text-[10px] text-zinc-400">{label}/mo</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {(quotaData?.customPlanName || (quotaData?.basePlan && (
            quotaData.messageQuota !== quotaData.basePlan.messageQuota ||
            quotaData.aiQuota !== quotaData.basePlan.aiQuota ||
            quotaData.seatLimit !== quotaData.basePlan.seatLimit ||
            quotaData.whatsappLimit !== quotaData.basePlan.whatsappLimit
          ))) && (
            <div className="mt-4 flex items-center justify-between p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400 shrink-0 fill-amber-400" />
                <div>
                  <div className="text-xs font-bold text-amber-300">
                    {language === 'en' ? 'Custom Plan Active' : 'কাস্টম প্ল্যান সক্রিয়'}
                  </div>
                  <div className="text-[11px] text-amber-400/80">
                    {language === 'en'
                      ? 'Your plan limits have been customized by ZiniChat support for your business needs.'
                      : 'আপনার ব্যবসার সুবিধার জন্য জিনিচ্যাট সাপোর্ট থেকে কাস্টম লিমিট সেট করা হয়েছে।'}
                  </div>
                </div>
              </div>
            </div>
          )}

        {currentSubscription?.status === 'past_due' && (
          <div className="mt-3 flex items-center gap-2 p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="text-[12px] text-red-300">
              {language === 'en' ? 'Payment overdue. Please renew to avoid service interruption.' : 'পেমেন্ট বকেয়া আছে। সেবা বন্ধ এড়াতে দ্রুত পরিশোধ করুন।'}
            </span>
          </div>
        )}
      </div>

      {/* Available Plans */}
      <div className="bg-surface/70 backdrop-blur-xl border border-surface-hover rounded-2xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <h2 className="text-[15px] font-bold flex items-center gap-2 text-foreground">
            <Zap className="w-4 h-4 text-secondary shrink-0" />
            {language === 'en' ? 'Available Plans' : 'উপলব্ধ প্ল্যানসমূহ'}
          </h2>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Currency Toggle */}
            <div className="bg-surface-hover/50 border border-surface-hover rounded-xl p-1 flex">
              {['BDT', 'USD'].map(c => (
                <button key={c}
                  onClick={() => setDisplayCurrency(c as 'BDT' | 'USD')}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${displayCurrency === c ? 'bg-primary text-primary-foreground shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}>
                  {c}
                </button>
              ))}
            </div>

            {/* Billing Cycle Toggle */}
            <div className="bg-surface-hover/50 border border-surface-hover rounded-xl p-1 flex">
              <button onClick={() => setBillingCycle('monthly')}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${billingCycle === 'monthly' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}>
                {language === 'en' ? 'Monthly' : 'মাসিক'}
              </button>
              <button onClick={() => setBillingCycle('yearly')}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${billingCycle === 'yearly' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}>
                {language === 'en' ? 'Yearly' : 'বার্ষিক'}
                {maxDiscountPercent > 0 && (
                  <span className="text-[9px] bg-green-500/20 text-green-500 px-1.5 py-0.5 rounded-full font-bold">
                    Save {formatNumber(maxDiscountPercent)}%
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {plans.length === 0 ? (
          <p className="text-center py-8 text-[13px] text-zinc-500">
            {language === 'en' ? 'No plans available.' : 'কোনো প্ল্যান পাওয়া যায়নি।'}
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {plans.map(plan => {
              const isYearly = billingCycle === 'yearly';
              const mBdt = Number(plan.priceMonthlyBdt) || 0;
              const mUsd = Number(plan.priceMonthlyUsd) > 0 ? Number(plan.priceMonthlyUsd) : Math.round((mBdt / (rate || 121)) * 100) / 100;
              const yBdt = Number(plan.priceYearlyBdt) > 0 ? Number(plan.priceYearlyBdt) : Math.round(mBdt * 12 * 0.8334);
              const yUsd = Number(plan.priceYearlyUsd) > 0 ? Number(plan.priceYearlyUsd) : Math.round(mUsd * 12 * 0.8334);
              const baseMonthly = displayCurrency === 'USD' ? mUsd : mBdt;
              const baseYearly = displayCurrency === 'USD' ? yUsd : yBdt;
              const displayPrice = isYearly && baseYearly > 0
                ? (displayCurrency === 'USD' ? Math.round((baseYearly / 12) * 100) / 100 : Math.round(baseYearly / 12))
                : baseMonthly;

              let planDiscount = Number(plan.yearlyDiscountPercent) || 0;
              if (!planDiscount && baseMonthly > 0 && baseYearly > 0) {
                planDiscount = Math.round(((baseMonthly * 12 - baseYearly) / (baseMonthly * 12)) * 100 * 100) / 100;
              }

              const isActive = activePlanId === plan.id;
              const features = parseFeaturesArray(plan.features);

              // Promo pricing
              const promoMonthly = billingCycle === 'monthly' && plan.promoPriceMonthlyBdt
                ? Number(plan.promoPriceMonthlyBdt) : null;

              return (
                <div key={plan.id}
                  className={`flex flex-col rounded-2xl p-4 border transition-all ${
                    isActive
                      ? 'border-primary ring-1 ring-primary bg-primary/5'
                      : 'border-surface-hover bg-surface/50 hover:border-primary/30'
                  }`}>

                  {isActive && (
                    <div className="flex items-center gap-1 text-[10px] font-bold text-primary uppercase tracking-widest mb-2">
                      <Star className="w-3 h-3" /> {language === 'en' ? 'Active Plan' : 'সক্রিয় প্ল্যান'}
                    </div>
                  )}

                  <h3 className="text-[15px] font-bold text-foreground">
                    {language === 'en' ? plan.name : (plan.nameBn || plan.name)}
                  </h3>

                  <div className="mt-2 flex items-end gap-1">
                    <span className="text-lg font-bold text-primary mt-1">{displayCurrency === 'BDT' ? '৳' : '$'}</span>
                    <span className="text-4xl font-black text-primary leading-none">{formatNumber(displayPrice)}</span>
                    <span className="text-[12px] text-zinc-400 mb-1">/{language === 'en' ? 'mo' : 'মাস'}</span>
                  </div>

                  {promoMonthly && (
                    <div className="text-[11px] text-zinc-500 line-through">
                      ৳{formatNumber(mBdt)}
                    </div>
                  )}

                  {isYearly && baseYearly > 0 && (
                    <div className="mt-2 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                      <div className="text-[11px] font-bold text-emerald-400">
                        {language === 'en'
                          ? `Billed ${displayCurrency === 'BDT' ? '৳' : '$'}${formatNumber(baseYearly)}/year`
                          : `বছরে ${displayCurrency === 'BDT' ? '৳' : '$'}${formatNumber(baseYearly)} বিল`}
                      </div>
                      {planDiscount > 0 && (
                        <div className="text-[10px] text-emerald-500 font-bold mt-0.5">
                          {language === 'en' ? `Save ${planDiscount}%` : `${formatNumber(planDiscount)}% সাশ্রয়`}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="my-3 border-t border-surface-hover" />

                  {/* Quotas */}
                  <ul className="space-y-1.5 flex-1">
                    <li className="flex items-center gap-2 text-[12px] text-zinc-300">
                      <Users className="w-3.5 h-3.5 text-secondary shrink-0" />
                      {formatNumber(plan.seatLimit)} {language === 'en' ? 'Team Members' : 'টিম মেম্বার'}
                    </li>
                    <li className="flex items-center gap-2 text-[12px] text-zinc-300">
                      <MessageSquare className="w-3.5 h-3.5 text-secondary shrink-0" />
                      {formatNumber(plan.messageQuota)} {language === 'en' ? 'Messages/mo' : 'মেসেজ/মাস'}
                    </li>
                    <li className="flex items-center gap-2 text-[12px] text-zinc-300">
                      <Bot className="w-3.5 h-3.5 text-secondary shrink-0" />
                      {formatNumber(plan.aiQuota)} {language === 'en' ? 'AI Credits/mo' : 'এআই ক্রেডিট/মাস'}
                    </li>
                    {plan.storageLimitMb && (
                      <li className="flex items-center gap-2 text-[12px] text-zinc-300">
                        <HardDrive className="w-3.5 h-3.5 text-secondary shrink-0" />
                        {plan.storageLimitMb >= 1024
                          ? `${(plan.storageLimitMb / 1024).toFixed(1)} GB`
                          : `${plan.storageLimitMb} MB`} {language === 'en' ? 'Storage' : 'স্টোরেজ'}
                      </li>
                    )}
                    {/* Feature list */}
                    {features.map((f: string) => {
                      const meta = FEATURE_MAP[f];
                      if (!meta) return null;
                      const Icon = meta.icon;
                      return (
                        <li key={f} className="flex items-center gap-2 text-[12px] text-zinc-300">
                          <Icon className="w-3.5 h-3.5 text-secondary shrink-0" />
                          {language === 'en' ? meta.en : meta.bn}
                        </li>
                      );
                    })}
                  </ul>

                  <button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={isActive}
                    className={`mt-4 w-full py-2 rounded-xl text-[13px] font-bold transition-all ${
                      isActive
                        ? 'bg-primary/10 text-primary cursor-not-allowed'
                        : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 active:scale-[0.98]'
                    }`}>
                    {isActive
                      ? (language === 'en' ? '✓ Current Plan' : '✓ বর্তমান প্ল্যান')
                      : (language === 'en' ? 'Subscribe Now' : 'সাবস্ক্রাইব করুন')}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add-ons */}
      {addons.length > 0 && (
        <div className="bg-surface/70 backdrop-blur-xl border border-surface-hover rounded-2xl p-5">
          <h2 className="text-[15px] font-bold flex items-center gap-2 text-foreground mb-4">
            <Puzzle className="w-4 h-4 text-secondary shrink-0" />
            {language === 'en' ? 'Available Add-ons' : 'উপলব্ধ অ্যাড-অনসমূহ'}
          </h2>
          <p className="text-[12px] text-zinc-400 mb-4">
            {language === 'en'
              ? 'Purchase additional limits on top of your current plan without upgrading.'
              : 'আপগ্রেড না করেই বর্তমান প্ল্যানের উপরে অতিরিক্ত লিমিট কিনুন।'}
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {addons.map(addon => (
              <div key={addon.id}
                className="bg-surface/50 border border-surface-hover rounded-2xl p-4 flex flex-col hover:border-secondary/30 transition-colors">
                <h3 className="text-[13px] font-bold text-foreground">
                  {language === 'en' ? addon.name : (addon.nameBn || addon.name)}
                </h3>
                <div className="text-2xl font-black text-secondary mt-1">
                  {formatBdtDirect(addon.priceBdt)}
                </div>
                <p className="text-[11px] text-zinc-400 mt-1 mb-3 flex-1">
                  {language === 'en' ? addon.description : (addon.descriptionBn || addon.description)}
                </p>
                <div className="space-y-1 mb-4">
                  {addon.type === 'seat' && (
                    <div className="flex items-center gap-1.5 text-[12px] text-zinc-300">
                      <Users className="w-3.5 h-3.5 text-secondary" /> +{formatNumber(addon.limit)} {language === 'en' ? 'Team Members' : 'টিম মেম্বার'}
                    </div>
                  )}
                  {addon.type === 'message' && (
                    <div className="flex items-center gap-1.5 text-[12px] text-zinc-300">
                      <MessageSquare className="w-3.5 h-3.5 text-secondary" /> +{formatNumber(addon.limit)} {language === 'en' ? 'Messages' : 'মেসেজ'}
                    </div>
                  )}
                  {addon.type === 'ai_response' && (
                    <div className="flex items-center gap-1.5 text-[12px] text-zinc-300">
                      <Bot className="w-3.5 h-3.5 text-secondary" /> +{formatNumber(addon.limit)} {language === 'en' ? 'AI Credits' : 'এআই ক্রেডিট'}
                    </div>
                  )}
                  {addon.type === 'storage' && (
                    <div className="flex items-center gap-1.5 text-[12px] text-zinc-300">
                      <HardDrive className="w-3.5 h-3.5 text-secondary" /> +{addon.limit >= 1024 ? `${(addon.limit / 1024).toFixed(1)} GB` : `${addon.limit} MB`} {language === 'en' ? 'Storage' : 'স্টোরেজ'}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleBuyAddon(addon.id)}
                  className="w-full py-2 bg-secondary/10 hover:bg-secondary/20 text-secondary border border-secondary/20 rounded-xl text-[12px] font-bold transition-all active:scale-[0.98]">
                  {language === 'en' ? 'Purchase Add-on' : 'কিনুন'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info note */}
      <div className="flex items-start gap-3 p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl">
        <RefreshCw className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
        <p className="text-[12px] text-zinc-400 leading-relaxed">
          {language === 'en'
            ? 'After completing payment, your subscription will be activated automatically. You can view your payment history from the Billing History page.'
            : 'পেমেন্ট সম্পন্ন করার পর আপনার সাবস্ক্রিপশন স্বয়ংক্রিয়ভাবে সক্রিয় হয়ে যাবে। পেমেন্ট ইতিহাস দেখতে Billing History পেজে যান।'}
        </p>
      </div>
    </div>
  );
}
