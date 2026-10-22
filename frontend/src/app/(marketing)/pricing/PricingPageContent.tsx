'use client';

import { useEffect, useState, useMemo } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import { useCurrency } from '@/components/CurrencyProvider';
import { Check, X, ArrowRight, Info, Mail, Sparkles, ShieldCheck, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { DEFAULT_FALLBACK_CONFIG, getCachedLandingConfig, getCachedPlans } from '@/lib/publicDataCache';

export default function PricingPageContent() {
  const { language } = useLanguage();
  const { rate, formatBDT, formatNumber, displayCurrency, setDisplayCurrency, formatPrice } = useCurrency();
  const [plans, setPlans] = useState<any[]>([]);
  const [addons, setAddons] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(DEFAULT_FALLBACK_CONFIG);
  const [billingCycle, setBillingCycle] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    Promise.all([
      getCachedPlans(),
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/packages/addons`).then(res => res.ok ? res.json() : []).catch(() => []),
      getCachedLandingConfig()
    ])
    .then(([plansData, addonsData, configData]) => {
      const getPlanWeight = (plan: any) => {
        const name = (plan.name || '').toLowerCase();
        if (name.includes('free') || name.includes('ফ্রী') || Number(plan.priceMonthlyBdt) === 0) return 0;
        if (name.includes('starter') || name.includes('স্টার্টার')) return 1;
        if (name.includes('growth') || name.includes('গ্রোথ')) return 2;
        if (name.includes('scale') || name.includes('স্কেল') || name.includes('enterprise')) return 3;
        return 4;
      };

      const sortedPlans = (plansData || []).sort((a: any, b: any) => {
        const priceDiff = Number(a.priceMonthlyBdt) - Number(b.priceMonthlyBdt);
        if (priceDiff !== 0) return priceDiff;
        return getPlanWeight(a) - getPlanWeight(b);
      });

      setPlans(sortedPlans);
      setAddons(addonsData || []);
      if (configData) setConfig(configData);
    })
    .catch(console.error);
  }, []);

  const maxDiscountPercent = useMemo(() => {
    if (!plans || plans.length === 0) return 0;
    return plans.reduce((max: number, p: any) => {
      let disc = Number(p.yearlyDiscountPercent) || 0;
      if (!disc) {
        const m = Number(p.priceMonthlyBdt) || 0;
        const y = Number(p.priceYearlyBdt) || 0;
        if (m > 0 && y > 0) {
          disc = Math.round(((m * 12 - y) / (m * 12)) * 100 * 100) / 100;
        }
      }
      return disc > max ? disc : max;
    }, 0);
  }, [plans]);

  const hasAnyPaidWeeklyPlan = useMemo(() => {
    if (!plans || plans.length === 0) return false;
    return plans.some((p: any) => p.allowWeekly === true && Number(p.priceMonthlyBdt) > 0);
  }, [plans]);

  useEffect(() => {
    if (!hasAnyPaidWeeklyPlan && billingCycle === 'weekly') {
      setBillingCycle('monthly');
    }
  }, [hasAnyPaidWeeklyPlan, billingCycle]);

  const tableRows = useMemo(() => {
    const rows: any[] = [];
    if (config?.pricingJson?.compareFeatures && config.pricingJson.compareFeatures.length > 0) {
      config.pricingJson.compareFeatures.forEach((item: any) => {
        if (item.type === 'header') {
          rows.push({
            isHeader: true,
            en: item.en,
            bn: item.bn
          });
        } else {
          rows.push({
            isHeader: false,
            en: item.en,
            bn: item.bn,
            get: (plan: any) => {
              if (item.type === 'boolean') {
                 if (item.featureKey) {
                    const key = item.featureKey;

                    if (plan[key] === true) return 'yes';
                    if ((key === 'allowByok' || key === 'byok') && plan.allowByok === true) return 'yes';

                    let feats = plan.features;
                    if (typeof feats === 'string') {
                      try { feats = JSON.parse(feats); } catch (e) { feats = []; }
                    }

                    if (Array.isArray(feats)) {
                      if (feats.includes(key)) return 'yes';

                      const aliasMap: Record<string, string[]> = {
                        'whatsapp_qr': ['whatsapp_qr'],
                        'whatsapp': ['whatsapp', 'whatsapp_api', 'official_whatsapp'],
                        'whatsapp_api': ['whatsapp', 'whatsapp_api', 'official_whatsapp'],
                        'instagram_dm': ['instagram_dm', 'instagram'],
                        'instagram': ['instagram_dm', 'instagram'],
                        'team_management': ['team_management', 'team_roles'],
                        'team_roles': ['team_management', 'team_roles'],
                        'allowByok': ['allowByok', 'byok'],
                        'byok': ['allowByok', 'byok'],
                        'website_widget': ['website_widget', 'widget', 'whatsapp_widget'],
                        'platform_support_ai': ['platform_support_ai', 'priority_support'],
                        'ai_email_outreach': ['ai_email_outreach', 'zini_mail', 'outreach', 'email_outreach']
                      };

                      const aliases = aliasMap[key] || [];
                      if (aliases.some(alias => feats.includes(alias))) return 'yes';
                    }
                 }
                 return 'no';
              } else if (item.type === 'value') {
                 const val = plan[item.featureKey];
                 if (val === undefined || val === null) return '-';
                 if (val === -1) return 'Unlimited';
                 if (typeof val === 'number') return formatNumber(val);
                 return String(val);
              }
              return 'no';
            }
          });
        }
      });
    } else {
      rows.push(
        { isHeader: true, en: 'Channels', bn: 'চ্যানেলসমূহ' },
        { isHeader: false, en: 'WhatsApp Business API', bn: 'হোয়াটসঅ্যাপ API', get: (p: any) => p.features?.includes('whatsapp') ? 'yes' : 'no' },
        { isHeader: false, en: 'Meta Messenger', bn: 'মেটা মেসেঞ্জার', get: (p: any) => p.features?.includes('messenger') ? 'yes' : 'no' },
        { isHeader: true, en: 'Limits', bn: 'লিমিটস' },
        { isHeader: false, en: 'Team Members', bn: 'টিম মেম্বার', get: (p: any) => p.seatLimit === -1 ? 'Unlimited' : formatNumber(p.seatLimit) },
        { isHeader: false, en: 'Monthly Messages', bn: 'মাসিক মেসেজ', get: (p: any) => p.messageQuota === -1 ? 'Unlimited' : formatNumber(p.messageQuota) }
      );
    }
    return rows;
  }, [config, formatNumber]);

  return (
    <div className="flex flex-col items-center w-full overflow-hidden bg-background min-h-screen">
      {/* Hero */}
      <section className="relative w-full overflow-hidden bg-muted py-20 px-4 text-center lg:py-28">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[40rem] h-[40rem] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
        </div>
        
        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
            {language === 'en' ? 'Pricing & Plans' : 'প্যাকেজ ও প্রাইসিং'}
          </div>
          <h1 className="mb-6 text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl text-foreground">
            {language === 'en' ? 'Simple, transparent pricing' : 'সহজ ও স্বচ্ছ প্রাইসিং'}
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
            {language === 'en' 
              ? 'No hidden fees, no surprise charges. Choose the plan that fits your business scale.' 
              : 'কোনো লুকানো চার্জ নেই। আপনার ব্যবসার জন্য মানানসই প্ল্যান বেছে নিন।'}
          </p>

          {/* Currency & Billing Cycle Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            {/* Currency Switcher */}
            <div className="inline-flex bg-card border border-primary/20 rounded-2xl p-1 shadow-inner relative z-20">
              <button
                onClick={() => setDisplayCurrency('BDT')}
                className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${displayCurrency === 'BDT' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'}`}
              >
                BDT
              </button>
              <button
                onClick={() => setDisplayCurrency('USD')}
                className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${displayCurrency === 'USD' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'}`}
              >
                USD
              </button>
            </div>

            {/* Billing Cycle Switcher: Weekly / Monthly / Yearly */}
            <div className="inline-flex bg-card border border-primary/20 rounded-2xl p-1 shadow-inner relative z-20 items-center gap-1">
              {hasAnyPaidWeeklyPlan && (
                <button
                  onClick={() => setBillingCycle('weekly')}
                  className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${
                    billingCycle === 'weekly' 
                      ? 'bg-primary text-primary-foreground shadow-md' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {language === 'en' ? 'Weekly' : 'সাপ্তাহিক'}
                </button>
              )}

              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${
                  billingCycle === 'monthly' 
                    ? 'bg-primary text-primary-foreground shadow-md' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {language === 'en' ? 'Monthly' : 'মাসিক'}
              </button>

              <button
                onClick={() => setBillingCycle('yearly')}
                className={`px-5 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-1.5 ${
                  billingCycle === 'yearly' 
                    ? 'bg-primary text-primary-foreground shadow-md' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>{language === 'en' ? 'Yearly' : 'বার্ষিক'}</span>
                {maxDiscountPercent > 0 && (
                  <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                    billingCycle === 'yearly' ? 'bg-white/20 text-white' : 'bg-emerald-500/15 text-emerald-600'
                  }`}>
                    -{Math.round(maxDiscountPercent)}%
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="relative w-full -mt-10 px-4 sm:px-6 lg:px-8 pb-20">
        <div className="max-w-7xl mx-auto relative z-10 grid md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {plans.map((plan: any) => {
            const mBdt = Number(plan.priceMonthlyBdt) || 0;
            const mUsd = Number(plan.priceMonthlyUsd) > 0 ? Number(plan.priceMonthlyUsd) : Math.round(mBdt / (rate || 121));

            const rawYBdt = Number(plan.priceYearlyBdt) || 0;
            const rawYUsd = Number(plan.priceYearlyUsd) || 0;
            const discountPct = Number(plan.yearlyDiscountPercent) || 0;

            const computeDiscountedYearly = (rawY: number, monthly: number) => {
              if (rawY <= 0) return Math.round(monthly * 12 * (1 - discountPct / 100));
              const fullYear = monthly * 12;
              const isUndiscounted = fullYear > 0 && Math.abs(rawY - fullYear) < 1;
              return isUndiscounted && discountPct > 0
                ? Math.round(fullYear * (1 - discountPct / 100))
                : rawY;
            };

            const yBdt = mBdt > 0 ? computeDiscountedYearly(rawYBdt, mBdt) : rawYBdt;
            const yUsd = mUsd > 0 ? computeDiscountedYearly(rawYUsd, mUsd) : rawYUsd || Math.round(yBdt / (rate || 121));

            const wBdt = (plan.allowWeekly && Number(plan.priceWeeklyBdt) > 0) ? Number(plan.priceWeeklyBdt) : (plan.allowWeekly ? Math.round(mBdt / 4) : 0);
            const wUsd = (plan.allowWeekly && Number(plan.priceWeeklyUsd) > 0) ? Number(plan.priceWeeklyUsd) : (plan.allowWeekly ? Math.round(mUsd / 4) : 0);

            const promoBdt = Number(plan.promoPriceMonthlyBdt) || 0;
            const promoUsd = Number(plan.promoPriceMonthlyUsd) > 0 ? Number(plan.promoPriceMonthlyUsd) : Math.round(promoBdt / (rate || 121));

            const isBdt = displayCurrency === 'BDT';
            const currSymbol = isBdt ? '৳' : '$';

            const baseWeekly = isBdt ? wBdt : wUsd;
            const baseMonthly = isBdt ? mBdt : mUsd;
            const baseYearly = isBdt ? yBdt : yUsd;
            const promoPrice = isBdt ? promoBdt : promoUsd;

            let displayPrice = baseMonthly;
            let intervalText = language === 'en' ? 'per month' : 'প্রতি মাসে';

            if (billingCycle === 'weekly') {
              displayPrice = baseWeekly;
              intervalText = language === 'en' ? 'per week' : 'প্রতি সপ্তাহে';
            } else if (billingCycle === 'yearly') {
              displayPrice = baseYearly > 0 ? (!isBdt ? Math.round((baseYearly / 12) * 100) / 100 : Math.round(baseYearly / 12)) : baseMonthly;
              intervalText = language === 'en' ? 'per month (billed yearly)' : 'প্রতি মাসে (বার্ষিক বিলিং)';
            } else {
              displayPrice = (billingCycle === 'monthly' && Number(plan.promoMonths) > 0) ? promoPrice : baseMonthly;
              intervalText = language === 'en' ? 'per month' : 'প্রতি মাসে';
            }
            
            let planDiscount = discountPct;
            if (!planDiscount && baseMonthly > 0 && baseYearly > 0) {
              planDiscount = Math.round(((baseMonthly * 12 - baseYearly) / (baseMonthly * 12)) * 100 * 100) / 100;
            }
            const yearlySavingsAmount = baseMonthly > 0 && planDiscount > 0
              ? Math.round(baseMonthly * 12 * planDiscount / 100)
              : 0;

            const isPop = plan.isPopular;
            const textColor = isPop ? 'text-zinc-900' : 'text-foreground';
            const mutedColor = isPop ? 'text-zinc-800' : 'text-muted-foreground';
            const borderColor = isPop ? 'border-black/10' : 'border-border';
            
            return (
              <div 
                key={plan.id} 
                className={`group relative flex flex-col p-8 sm:p-10 rounded-[32px] border transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl z-10 hover:z-30 ${
                  isPop 
                    ? 'border-transparent shadow-xl transform md:-translate-y-4 hover:!translate-y-[-24px] bg-[#FFC527]' 
                    : 'bg-card border-border hover:border-primary/30 shadow-sm'
                }`}
              >
                {isPop && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-white text-zinc-900 text-[12px] font-bold py-1.5 px-6 rounded-full shadow-md whitespace-nowrap border border-zinc-200">
                    {language === 'en' ? 'Most Popular' : 'সবচেয়ে জনপ্রিয়'}
                  </div>
                )}
                
                <h3 className={`text-3xl font-extrabold mb-2 ${textColor}`}>
                  {language === 'en' ? plan.name : (plan.nameBn || plan.name)}
                </h3>
                <p className={`text-[15px] h-12 mb-6 line-clamp-2 ${mutedColor}`}>
                  {language === 'en' ? plan.description : (plan.descriptionBn || plan.description)}
                </p>
                
                <div className="mb-6 flex flex-col">
                  <div className={`flex items-start gap-1 ${textColor}`}>
                    <span className="text-2xl font-bold mt-2">{currSymbol}</span>
                    <span className="text-6xl font-black tracking-tighter">
                      {formatNumber(displayPrice)}
                    </span>
                  </div>
                  
                  <div className={`text-sm mt-2 font-medium ${mutedColor}`}>
                     {intervalText}
                  </div>
                  
                  {billingCycle === 'monthly' && Number(plan.promoMonths) > 0 ? (
                    <div className={`text-sm font-bold mt-3 inline-block self-start px-2 py-1 rounded ${isPop ? 'bg-black/10 text-zinc-900' : 'bg-primary/10 text-primary'}`}>
                      {language === 'en' ? `For the first ${plan.promoMonths} months, then ${currSymbol}${formatNumber(baseMonthly)}/mo` : `প্রথম ${plan.promoMonths} মাসের জন্য, তারপর ${currSymbol}${formatNumber(baseMonthly)}/মাস`}
                    </div>
                  ) : null}

                  {Number(plan.priceMonthlyBdt) === 0 && plan.allowWeekly ? (
                    <div className={`mt-3 p-2.5 rounded-2xl border text-xs font-bold transition-all ${isPop ? 'bg-black/10 border-black/20 text-zinc-900' : 'bg-primary/10 border-primary/20 text-primary'}`}>
                      🗓️ {language === 'en' ? '1-Week Free Trial — No credit card needed' : '১ সপ্তাহের ফ্রি ট্রায়াল — কোনো কার্ড লাগবে না'}
                    </div>
                  ) : null}

                  {billingCycle === 'weekly' && Number(plan.priceMonthlyBdt) > 0 && plan.allowWeekly ? (
                    <div className={`mt-3 p-2.5 rounded-2xl border text-xs font-bold transition-all ${isPop ? 'bg-black/10 border-black/20 text-zinc-900' : 'bg-primary/10 border-primary/20 text-primary'}`}>
                      {language === 'en' ? 'Billed weekly • Cancel anytime' : 'সাপ্তাহিক বিলিং • যেকোনো সময় পরিবর্তনযোগ্য'}
                    </div>
                  ) : null}

                  {billingCycle === 'yearly' && baseYearly > 0 ? (
                    <div className={`mt-3 p-3 rounded-2xl border transition-all ${isPop ? 'bg-black/10 border-black/20 text-zinc-900 font-bold' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 font-bold'}`}>
                      <div className="text-xs">
                        {language === 'en' 
                          ? `Billed ${currSymbol}${formatNumber(baseYearly)} yearly` 
                          : `বছরে ${currSymbol}${formatNumber(baseYearly)} বিল করা হবে`}
                      </div>
                      {planDiscount > 0 ? (
                        <div className="text-[11px] font-extrabold uppercase tracking-wider mt-1">
                          {yearlySavingsAmount > 0
                            ? (language === 'en'
                              ? `Save ${currSymbol}${formatNumber(yearlySavingsAmount)}/yr (${Math.round(planDiscount)}% off)`
                              : `${currSymbol}${formatNumber(yearlySavingsAmount)} সাশ্রয় (${Math.round(planDiscount)}% ছাড়)`)
                            : (language === 'en' ? `Save ${Math.round(planDiscount)}%` : `${Math.round(planDiscount)}% সাশ্রয়`)}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className={`w-full h-px my-6 ${borderColor}`} />

                <div className={`text-[13px] font-bold uppercase tracking-wider mb-5 ${mutedColor}`}>
                  {language === 'en' ? 'Top Features' : 'প্রধান ফিচারসমূহ'}
                </div>
                
                <ul className={`space-y-4 mb-8 flex-1 ${mutedColor}`}>
                <li className="flex items-center justify-between text-[15px] font-medium">
                  <div className="flex items-center gap-3">
                    <div className="bg-green-500 rounded-full p-0.5"><Check className="w-4 h-4 shrink-0 text-white" strokeWidth={3} /></div>
                    <span>
                      <strong className={`font-extrabold ${textColor}`}>
                        {plan.seatLimit === -1 ? (language === 'en' ? 'Unlimited' : 'আনলিমিটেড') : formatNumber(plan.seatLimit)}
                      </strong>{' '}
                      {language === 'en' ? 'Team Members' : 'টিম মেম্বার'}
                    </span>
                  </div>
                  <div className="relative group/info cursor-pointer inline-flex items-center">
                    <Info className={`w-4 h-4 transition-colors ${isPop ? 'text-zinc-800 hover:text-black' : 'text-muted-foreground hover:text-foreground'}`} />
                    <div className="absolute right-0 bottom-full mb-2 opacity-0 invisible group-hover/info:opacity-100 group-hover/info:visible transition-all duration-200 z-50 w-64 p-3 bg-zinc-900 text-zinc-100 text-xs rounded-xl shadow-2xl border border-zinc-800 pointer-events-none text-left font-normal leading-relaxed">
                      {language === 'en' ? (
                        <>
                          <strong className="block text-white mb-1 font-semibold">👥 Team Members ({plan.seatLimit === -1 ? 'Unlimited' : formatNumber(plan.seatLimit)})</strong>
                          Staff/Agent accounts: Up to {plan.seatLimit === -1 ? 'unlimited' : formatNumber(plan.seatLimit)} members can log in simultaneously to handle customer chats & support.
                        </>
                      ) : (
                        <>
                          <strong className="block text-white mb-1 font-semibold">👥 টিম মেম্বার ({plan.seatLimit === -1 ? 'আনলিমিটেড' : formatNumber(plan.seatLimit)})</strong>
                          স্টাফ/এজেন্ট এক্সেস: আপনার টিমের মোট {plan.seatLimit === -1 ? 'আনলিমিটেড' : formatNumber(plan.seatLimit)} জন সদস্য একসাথে লগইন করে কাস্টমার চ্যাট ও ইনবক্স সাপোর্ট দিতে পারবেন।
                        </>
                      )}
                      <div className="absolute top-full right-2 -mt-1 border-4 border-transparent border-t-zinc-900" />
                    </div>
                  </div>
                </li>
                <li className="flex items-center justify-between text-[15px] font-medium">
                  <div className="flex items-center gap-3">
                    <div className="bg-green-500 rounded-full p-0.5"><Check className="w-4 h-4 shrink-0 text-white" strokeWidth={3} /></div>
                    <span>
                      <strong className={`font-extrabold ${textColor}`}>
                        {plan.messageQuota === -1 ? (language === 'en' ? 'Unlimited' : 'আনলিমিটেড') : formatNumber(plan.messageQuota)}
                      </strong>{' '}
                      {language === 'en' ? 'Messages/mo' : 'মেসেজ/মাস'}
                    </span>
                  </div>
                  <div className="relative group/info cursor-pointer inline-flex items-center">
                    <Info className={`w-4 h-4 transition-colors ${isPop ? 'text-zinc-800 hover:text-black' : 'text-muted-foreground hover:text-foreground'}`} />
                    <div className="absolute right-0 bottom-full mb-2 opacity-0 invisible group-hover/info:opacity-100 group-hover/info:visible transition-all duration-200 z-50 w-64 p-3 bg-zinc-900 text-zinc-100 text-xs rounded-xl shadow-2xl border border-zinc-800 pointer-events-none text-left font-normal leading-relaxed">
                      {language === 'en' ? (
                        <>
                          <strong className="block text-white mb-1 font-semibold">💬 Monthly Agent Messages & Broadcasts ({plan.messageQuota === -1 ? 'Unlimited' : formatNumber(plan.messageQuota)})</strong>
                          Dedicated for your <strong className="text-emerald-400">human team members</strong> to reply in the Live Inbox and send bulk WhatsApp marketing broadcasts. <strong className="text-emerald-400">Independent Pool:</strong> Automated AI replies do NOT consume this quota!
                        </>
                      ) : (
                        <>
                          <strong className="block text-white mb-1 font-semibold">💬 মাসিক এজেন্ট মেসেজ ও ব্রডকাস্ট ({plan.messageQuota === -1 ? 'আনলিমিটেড' : formatNumber(plan.messageQuota)})</strong>
                          আপনার টিমের <strong className="text-emerald-400">হিউম্যান এজেন্টদের</strong> ইনবক্স রিপ্লাই এবং হোয়াটসঅ্যাপ ব্রডকাস্টের জন্য নির্ধারিত। <strong className="text-emerald-400">স্বতন্ত্র কোটা:</strong> এআই-এর উত্তরে এই মেসেজ কোটা কাটা যায় না!
                        </>
                      )}
                      <div className="absolute top-full right-2 -mt-1 border-4 border-transparent border-t-zinc-900" />
                    </div>
                  </div>
                </li>
                <li className="flex items-center justify-between text-[15px] font-medium">
                  <div className="flex items-center gap-3">
                    <div className="bg-green-500 rounded-full p-0.5"><Check className="w-4 h-4 shrink-0 text-white" strokeWidth={3} /></div>
                    <span>
                      <strong className={`font-extrabold ${textColor}`}>
                        {plan.aiQuota === -1 ? (language === 'en' ? 'Unlimited' : 'আনলিমিটেড') : formatNumber(plan.aiQuota)}
                      </strong>{' '}
                      {language === 'en' ? 'AI Responses/mo' : 'এআই রেসপন্স/মাস'}
                    </span>
                  </div>
                  <div className="relative group/info cursor-pointer inline-flex items-center">
                    <Info className={`w-4 h-4 transition-colors ${isPop ? 'text-zinc-800 hover:text-black' : 'text-muted-foreground hover:text-foreground'}`} />
                    <div className="absolute right-0 bottom-full mb-2 opacity-0 invisible group-hover/info:opacity-100 group-hover/info:visible transition-all duration-200 z-50 w-64 p-3 bg-zinc-900 text-zinc-100 text-xs rounded-xl shadow-2xl border border-zinc-800 pointer-events-none text-left font-normal leading-relaxed">
                      {language === 'en' ? (
                        <>
                          <strong className="block text-white mb-1 font-semibold">🤖 Automated AI Responses ({plan.aiQuota === -1 ? 'Unlimited' : formatNumber(plan.aiQuota)})</strong>
                          Dedicated AI Automation: Total automated 24/7 customer replies, product recommendations & order processing. This is a 100% separate quota pool from your agent messages.
                        </>
                      ) : (
                        <>
                          <strong className="block text-white mb-1 font-semibold">🤖 স্বয়ংক্রিয় এআই রেসপন্স ({plan.aiQuota === -1 ? 'আনলিমিটেড' : formatNumber(plan.aiQuota)})</strong>
                          ডেডিকেটেড এআই কোটা: কাস্টমারদের ২৪/৭ স্বয়ংক্রিয় উত্তর, প্রোডাক্ট ক্যাটালগ রিকমেন্ডেশন ও অর্ডার নিতে মোট {plan.aiQuota === -1 ? 'আনলিমিটেড' : formatNumber(plan.aiQuota)}টি এআই রিপ্লাই। এটি মূল এজেন্ট মেসেজ কোটা থেকে সম্পূর্ণ আলাদা।
                        </>
                      )}
                      <div className="absolute top-full right-2 -mt-1 border-4 border-transparent border-t-zinc-900" />
                    </div>
                  </div>
                </li>
                  {plan.featuresJson?.map((f: any, i: number) => (
                    <li key={i} className="flex items-start gap-3 text-[15px] font-medium">
                      <div className="mt-0.5 bg-green-500 rounded-full p-0.5"><Check className="w-4 h-4 shrink-0 text-white" strokeWidth={3} /></div>
                      <span>{language === 'en' ? f.en : (f.bn || f.en)}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto">
                  <Link 
                    href={`/signup?planId=${plan.id}&cycle=${billingCycle}`} 
                    className={`block w-full py-4 rounded-[16px] font-extrabold text-[16px] text-center transition-all ${
                      isPop 
                        ? 'bg-white text-zinc-900 hover:bg-zinc-50 shadow-md border-2 border-white' 
                        : 'bg-transparent border-2 border-primary/20 text-foreground hover:border-primary hover:bg-primary/5'
                    }`}
                  >
                    {Number(plan.priceMonthlyBdt) === 0 
                      ? (language === 'en' ? 'Get Started for Free' : 'শুরু করুন')
                      : plan.trialDays > 0
                        ? (language === 'en' ? `Start ${plan.trialDays}-Day Free Trial` : 'শুরু করুন')
                        : (language === 'en' ? 'Subscribe Now' : 'শুরু করুন')}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Zini-Mail Cold Outreach Pricing Transparency Banner */}
      <section className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-card/80 to-background/90 p-6 sm:p-8 md:p-10 backdrop-blur-xl shadow-2xl">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
          
          <div className="relative z-10 flex flex-col gap-6 sm:gap-8">
            {/* Header Content */}
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-bold text-emerald-400 mb-4 shadow-sm">
                <Mail className="w-3.5 h-3.5" />
                <span>{language === 'en' ? 'Included in Growth & Scale Plans' : 'গ্রোথ ও স্কেল প্ল্যানে অন্তর্ভুক্ত'}</span>
              </div>
              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-foreground tracking-tight mb-3">
                {language === 'en' ? 'Zini-Mail: Autonomous AI Cold Email Outreach' : 'জিনি-মেইল: স্বয়ংক্রিয় এআই কোল্ড ইমেইল আউটরিচ'}
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                {language === 'en'
                  ? 'No expensive 3rd-party cold email software subscriptions needed. Discover B2B leads via SERP, compose personalized emails with Gemini AI, safely dispatch via your own SMTP/Google Workspace, and convert clickers directly on WhatsApp.'
                  : 'বাইরের কোনো অতিরিক্ত কোল্ড ইমেইল টুলের সাবস্ক্রিপশন ছাড়াই গুগলে লিড সার্চ করুন, জেমিনি এআই দিয়ে পার্সোনালাইজড ইমেইল ড্রাফট করুন এবং আপনার নিজস্ব জিমেইল বা ডোমেন এসএমটিপি দিয়ে নিরাপদে পাঠিয়ে হোয়াটসঅ্যাপে কনভার্ট করুন।'}
              </p>
            </div>

            {/* 3 Pillars Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 w-full">
              <div className="p-5 sm:p-6 rounded-2xl bg-card/60 backdrop-blur-md border border-emerald-500/20 hover:border-emerald-500/40 transition-all duration-300 shadow-sm flex flex-col justify-between group">
                <div>
                  <div className="flex items-center gap-2.5 text-sm font-bold text-emerald-400 mb-2">
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <span>{language === 'en' ? '1 AI Unit / Email' : '১ এআই রেসপন্স / ইমেইল'}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {language === 'en' 
                      ? 'Dispatched cold emails count directly towards your regular AI quota with zero extra subscription fees.' 
                      : 'পাঠানো প্রতিটি ইমেইল আপনার রেগুলার এআই কোটা থেকে সমন্বয় হয়। বাড়তি কোনো সফটওয়্যার ফি নেই।'}
                  </p>
                </div>
              </div>

              <div className="p-5 sm:p-6 rounded-2xl bg-card/60 backdrop-blur-md border border-blue-500/20 hover:border-blue-500/40 transition-all duration-300 shadow-sm flex flex-col justify-between group">
                <div>
                  <div className="flex items-center gap-2.5 text-sm font-bold text-blue-400 mb-2">
                    <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 group-hover:scale-110 transition-transform">
                      <RefreshCw className="w-4 h-4" />
                    </div>
                    <span>{language === 'en' ? 'Atomic Saga Refund' : 'অটোমেটিক ইউনিট রিফান্ড'}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {language === 'en' 
                      ? 'If a dispatch fails or bounces, the AI unit is instantly refunded to your balance automatically.' 
                      : 'কোনো ইমেইল বাউন্স বা ফেইল করলে এআই ইউনিট স্বয়ংক্রিয়ভাবে আপনার ব্যালেন্সে ফেরত দেওয়া হয়।'}
                  </p>
                </div>
              </div>

              <div className="p-5 sm:p-6 rounded-2xl bg-card/60 backdrop-blur-md border border-amber-500/20 hover:border-amber-500/40 transition-all duration-300 shadow-sm flex flex-col justify-between group">
                <div>
                  <div className="flex items-center gap-2.5 text-sm font-bold text-amber-400 mb-2">
                    <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 group-hover:scale-110 transition-transform">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <span>{language === 'en' ? 'BYO SMTP (৳0 Fee)' : 'নিজস্ব SMTP (৳০ ফি)'}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {language === 'en' 
                      ? 'Connect your own Google Workspace, Zoho, or private SMTP servers with zero markup.' 
                      : 'কোনো লুকানো খরচ ছাড়াই নিজের জিমেইল, জোহো বা এসএমটিপি কানেক্ট করে আনলিমিটেড মেইল পাঠান।'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="relative w-full max-w-7xl mx-auto px-4 py-16 border-t border-border/40">
        <div className="pointer-events-none absolute left-0 bottom-0 w-[40rem] h-[40rem] bg-secondary/10 rounded-full blur-[120px]" />
        
        <div className="text-center mb-12 relative z-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-foreground mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
            {language === 'en' ? 'Comparison' : 'তুলনা'}
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight mb-4 text-foreground">
            {language === 'en' ? 'Compare Plans' : 'প্ল্যান তুলনা করুন'}
          </h2>
        </div>

        <div className="w-full overflow-x-auto bg-card border border-border rounded-3xl p-6 shadow-sm relative z-10">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="w-1/3 p-5 border-b border-border bg-card sticky left-0 z-10"></th>
                {plans.map((plan: any) => {
                  const mBdt = Number(plan.priceMonthlyBdt) || 0;
                  const mUsd = Number(plan.priceMonthlyUsd) > 0 ? Number(plan.priceMonthlyUsd) : Math.round(mBdt / (rate || 121));
                  const yBdt = Number(plan.priceYearlyBdt) > 0 ? Number(plan.priceYearlyBdt) : Math.round(mBdt * 12 * 0.8334);
                  const yUsd = Number(plan.priceYearlyUsd) > 0 ? Number(plan.priceYearlyUsd) : Math.round(mUsd * 12 * 0.8334);
                  const wBdt = (plan.allowWeekly && Number(plan.priceWeeklyBdt) > 0) ? Number(plan.priceWeeklyBdt) : (plan.allowWeekly ? Math.round(mBdt / 4) : 0);
                  const wUsd = (plan.allowWeekly && Number(plan.priceWeeklyUsd) > 0) ? Number(plan.priceWeeklyUsd) : (plan.allowWeekly ? Math.round(mUsd / 4) : 0);

                  const isBdt = displayCurrency === 'BDT';
                  const currSymbol = isBdt ? '৳' : '$';

                  const baseWeekly = isBdt ? wBdt : wUsd;
                  const baseMonthly = isBdt ? mBdt : mUsd;
                  const baseYearly = isBdt ? yBdt : yUsd;
                  const headerDisplayPrice = billingCycle === 'weekly' && plan.allowWeekly ? baseWeekly : billingCycle === 'yearly' && baseYearly > 0 ? Math.round(baseYearly / 12) : baseMonthly;

                  return (
                    <th key={plan.id} className="p-5 border-b border-border text-center w-1/4">
                      <div className="text-lg font-bold mb-1 text-foreground">{language === 'en' ? plan.name : (plan.nameBn || plan.name)}</div>
                      <div className="text-sm text-muted-foreground font-medium">
                        {currSymbol}{formatNumber(headerDisplayPrice)}/{billingCycle === 'weekly' ? 'wk' : 'mo'}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, idx) => {
                return (
                  <tr key={idx} className={row.isHeader ? 'bg-muted/50' : 'hover:bg-muted transition-colors group'}>
                    <td className={`p-4 border-b border-border sticky left-0 bg-card group-hover:bg-muted transition-colors ${row.isHeader ? 'font-bold text-sm uppercase tracking-wider text-primary pt-8 pb-4 bg-muted/50' : 'text-sm font-medium text-foreground'}`}>
                      {language === 'en' ? row.en : row.bn}
                    </td>
                    {row.isHeader ? (
                      plans.map((p: any) => <td key={p.id} className="border-b border-border bg-muted/50"></td>)
                    ) : (
                      plans.map((plan: any) => {
                        const val = row.get!(plan);
                        return (
                          <td key={plan.id} className="p-4 border-b border-border text-center text-sm">
                            {val === 'yes' ? (
                              <div className="mx-auto w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                <Check className="w-4 h-4 text-white" strokeWidth={3} />
                              </div>
                            ) : val === 'no' ? (
                              <X className="w-5 h-5 text-muted-foreground/50 mx-auto" />
                            ) : (
                              <span className="font-semibold text-muted-foreground">{val}</span>
                            )}
                          </td>
                        );
                      })
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Add-ons Section */}
      {addons.length > 0 && (
        <section className="relative w-full bg-muted border-y border-border/40 py-24">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-foreground mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                {language === 'en' ? 'Add-ons' : 'অ্যাড-অন'}
              </span>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4 text-foreground">
                {language === 'en' ? 'Need more power?' : 'আরও বেশি লিমিট প্রয়োজন?'}
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                {language === 'en' 
                  ? 'Scale your business seamlessly. Add extra limits to your active subscription anytime without upgrading your base plan.' 
                  : 'আপনার সাবস্ক্রিপশনে যেকোনো সময় অতিরিক্ত লিমিট যুক্ত করুন।'}
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {addons.map((addon) => (
                <div key={addon.id} className="group bg-card border border-border p-8 rounded-3xl text-left hover:border-primary/50 hover:shadow-xl transition-all duration-300">
                  <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-foreground group-hover:text-primary transition-colors">
                    {language === 'en' ? addon.name : (addon.nameBn || addon.name)}
                  </h3>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-8 bg-muted inline-block px-2.5 py-1 rounded-md">
                    +{formatNumber(addon.value)} {addon.type.replace('_', ' ')}
                  </p>
                  <div className="flex items-center justify-between border-t border-border pt-4">
                    <div className="text-3xl font-black text-foreground">{formatPrice(addon.priceBdt)}</div>
                    <div className="text-xs text-muted-foreground font-semibold px-2 py-1">One-time</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Mini FAQ */}
      <section className="w-full max-w-3xl mx-auto px-4 py-24 text-center">
        <h2 className="text-2xl font-bold mb-6 text-foreground">
          {language === 'en' ? 'Billing Questions?' : 'বিলিং সংক্রান্ত প্রশ্ন?'}
        </h2>
        <p className="text-muted-foreground mb-8 text-lg">
          {language === 'en' ? 'Can I upgrade or downgrade anytime? Yes, you can change your plan anytime from your dashboard. The pricing difference will be prorated.' : 'আমি কি যেকোনো সময় আপগ্রেড বা ডাউনগ্রেড করতে পারি? হ্যাঁ, আপনি ড্যাশবোর্ড থেকে যেকোনো সময় প্ল্যান পরিবর্তন করতে পারবেন।'}
        </p>
        <Link href="/faq" className="inline-flex items-center gap-2 text-primary font-bold hover:underline px-6 py-3 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors">
          {language === 'en' ? 'Read all FAQs' : 'সব FAQ পড়ুন'} <ArrowRight className="w-4 h-4" />
        </Link>
      </section>
    </div>
  );
}
