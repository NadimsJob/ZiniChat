'use client';

import { useEffect, useState, useMemo } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import { useCurrency } from '@/components/CurrencyProvider';
import { Check, X, ArrowRight, Info } from 'lucide-react';
import Link from 'next/link';

export default function PricingPage() {
  const { language } = useLanguage();
  const { rate, formatBDT, formatNumber, displayCurrency, setDisplayCurrency, formatPrice } = useCurrency();
  const [plans, setPlans] = useState<any[]>([]);
  const [addons, setAddons] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/packages/plans`).then(res => res.json()),
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/packages/addons`).then(res => res.json()),
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/landing-page/config`).then(res => res.json())
    ])
    .then(([plansData, addonsData, configData]) => {
      const sortedPlans = (plansData || []).sort((a: any, b: any) => a.priceMonthlyBdt - b.priceMonthlyBdt);
      setPlans(sortedPlans);
      setAddons(addonsData || []);
      setConfig(configData);
    })
    .catch(console.error)
    .finally(() => {
      setLoading(false);
      // Ensure page starts at the top after rendering
      setTimeout(() => window.scrollTo(0, 0), 10);
    });
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

                    // Direct DB boolean property check
                    if (plan[key] === true) return 'yes';
                    if ((key === 'allowByok' || key === 'byok') && plan.allowByok === true) return 'yes';

                    let feats = plan.features;
                    if (typeof feats === 'string') {
                      try { feats = JSON.parse(feats); } catch (e) { feats = []; }
                    }

                    if (Array.isArray(feats)) {
                      if (feats.includes(key)) return 'yes';

                      // Alias mapping to seamlessly match Superadmin package feature IDs
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
                        'platform_support_ai': ['platform_support_ai', 'priority_support']
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
      // Fallback
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

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
        <div className="max-w-6xl mx-auto relative z-10 grid md:grid-cols-3 gap-6 lg:gap-8">
          {plans.map((plan: any) => {
            const mBdt = Number(plan.priceMonthlyBdt) || 0;
            const mUsd = Number(plan.priceMonthlyUsd) > 0 ? Number(plan.priceMonthlyUsd) : Math.round(mBdt / (rate || 121));

            const yBdt = Number(plan.priceYearlyBdt) > 0 ? Number(plan.priceYearlyBdt) : Math.round(mBdt * 12 * 0.8334);
            const yUsd = Number(plan.priceYearlyUsd) > 0 ? Number(plan.priceYearlyUsd) : Math.round(mUsd * 12 * 0.8334);

            const wBdt = (plan.allowWeekly && Number(plan.priceWeeklyBdt) > 0) ? Number(plan.priceWeeklyBdt) : (plan.allowWeekly ? Math.round(mBdt / 4) : 0);
            const wUsd = (plan.allowWeekly && Number(plan.priceWeeklyUsd) > 0) ? Number(plan.priceWeeklyUsd) : (plan.allowWeekly ? Math.round(mUsd / 4) : 0);

            const promoBdt = Number(plan.promoPriceMonthlyBdt) || 0;
            const promoUsd = Number(plan.promoPriceMonthlyUsd) > 0 ? Number(plan.promoPriceMonthlyUsd) : Math.round(promoBdt / (rate || 121));

            const baseWeekly = displayCurrency === 'USD' ? wUsd : wBdt;
            const baseMonthly = displayCurrency === 'USD' ? mUsd : mBdt;
            const baseYearly = displayCurrency === 'USD' ? yUsd : yBdt;
            const promoPrice = displayCurrency === 'USD' ? promoUsd : promoBdt;

            let displayPrice = baseMonthly;
            let intervalText = language === 'en' ? 'per month' : 'প্রতি মাসে';

            if (billingCycle === 'weekly') {
              displayPrice = baseWeekly;
              intervalText = language === 'en' ? 'per week' : 'প্রতি সপ্তাহে';
            } else if (billingCycle === 'yearly') {
              displayPrice = baseYearly > 0 ? (displayCurrency === 'USD' ? Math.round((baseYearly / 12) * 100) / 100 : Math.round(baseYearly / 12)) : baseMonthly;
              intervalText = language === 'en' ? 'per month (billed yearly)' : 'প্রতি মাসে (বার্ষিক বিলিং)';
            } else {
              displayPrice = (billingCycle === 'monthly' && Number(plan.promoMonths) > 0) ? promoPrice : baseMonthly;
              intervalText = language === 'en' ? 'per month' : 'প্রতি মাসে';
            }
            
            let planDiscount = Number(plan.yearlyDiscountPercent) || 0;
            if (!planDiscount && baseMonthly > 0 && baseYearly > 0) {
              planDiscount = Math.round(((baseMonthly * 12 - baseYearly) / (baseMonthly * 12)) * 100 * 100) / 100;
            }

            const isPop = plan.isPopular;
            const textColor = isPop ? 'text-zinc-900' : 'text-foreground';
            const mutedColor = isPop ? 'text-zinc-800' : 'text-muted-foreground';
            const borderColor = isPop ? 'border-black/10' : 'border-border';
            
            return (
              <div 
                key={plan.id} 
                className={`group flex flex-col p-8 sm:p-10 rounded-[32px] border transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl ${
                  isPop 
                    ? 'border-transparent shadow-xl relative transform md:-translate-y-4 hover:!translate-y-[-24px] bg-[#FFC527]' 
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
                    <span className="text-2xl font-bold mt-2">{displayCurrency === 'BDT' ? '৳' : '$'}</span>
                    <span className="text-6xl font-black tracking-tighter">
                      {formatNumber(displayPrice)}
                    </span>
                  </div>
                  
                  <div className={`text-sm mt-2 font-medium ${mutedColor}`}>
                     {intervalText}
                  </div>
                  
                  {billingCycle === 'monthly' && Number(plan.promoMonths) > 0 ? (
                    <div className={`text-sm font-bold mt-3 inline-block self-start px-2 py-1 rounded ${isPop ? 'bg-black/10 text-zinc-900' : 'bg-primary/10 text-primary'}`}>
                      {language === 'en' ? `For the first ${plan.promoMonths} months, then ${displayCurrency === 'BDT' ? '৳' : '$'}${formatNumber(baseMonthly)}/mo` : `প্রথম ${plan.promoMonths} মাসের জন্য, তারপর ${displayCurrency === 'BDT' ? '৳' : '$'}${formatNumber(baseMonthly)}/মাস`}
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
                          ? `Billed ${displayCurrency === 'BDT' ? '৳' : '$'}${formatNumber(baseYearly)} yearly` 
                          : `বছরে ${displayCurrency === 'BDT' ? '৳' : '$'}${formatNumber(baseYearly)} বিল করা হবে`}
                      </div>
                      {planDiscount > 0 ? (
                        <div className="text-[11px] font-extrabold uppercase tracking-wider mt-1">
                          {language === 'en' ? `Save ${planDiscount}%` : `${formatNumber(planDiscount)}% সাশ্রয়`}
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
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 opacity-0 invisible group-hover/info:opacity-100 group-hover/info:visible transition-all duration-200 z-50 w-64 p-3 bg-zinc-900 text-zinc-100 text-xs rounded-xl shadow-2xl border border-zinc-800 pointer-events-none text-left font-normal leading-relaxed">
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
                      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-zinc-900" />
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
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 opacity-0 invisible group-hover/info:opacity-100 group-hover/info:visible transition-all duration-200 z-50 w-64 p-3 bg-zinc-900 text-zinc-100 text-xs rounded-xl shadow-2xl border border-zinc-800 pointer-events-none text-left font-normal leading-relaxed">
                      {language === 'en' ? (
                        <>
                          <strong className="block text-white mb-1 font-semibold">💬 Monthly Outbound Messages ({plan.messageQuota === -1 ? 'Unlimited' : formatNumber(plan.messageQuota)})</strong>
                          Only your <strong className="text-emerald-400">outbound replies</strong> count (agent + AI). Customers can message you freely — unlimited inbound. This quota covers replies sent via WhatsApp, Messenger, Instagram & Broadcasts.
                        </>
                      ) : (
                        <>
                          <strong className="block text-white mb-1 font-semibold">💬 মাসিক আউটবাউন্ড মেসেজ ({plan.messageQuota === -1 ? 'আনলিমিটেড' : formatNumber(plan.messageQuota)})</strong>
                          শুধু আপনার <strong className="text-emerald-400">পাঠানো (Outbound)</strong> রিপ্লাই গণনা হয় — এজেন্ট ও AI উত্তর মিলিয়ে। কাস্টমার যত ইচ্ছা মেসেজ করতে পারবে, তাতে কোটা খরচ হয় না। WhatsApp, Messenger, Instagram ও Broadcast মিলে মোট {plan.messageQuota === -1 ? 'আনলিমিটেড' : formatNumber(plan.messageQuota)}টি উত্তর পাঠানো যাবে।
                        </>
                      )}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-zinc-900" />
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
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 opacity-0 invisible group-hover/info:opacity-100 group-hover/info:visible transition-all duration-200 z-50 w-64 p-3 bg-zinc-900 text-zinc-100 text-xs rounded-xl shadow-2xl border border-zinc-800 pointer-events-none text-left font-normal leading-relaxed">
                      {language === 'en' ? (
                        <>
                          <strong className="block text-white mb-1 font-semibold">🤖 AI Auto-Responses ({plan.aiQuota === -1 ? 'Unlimited' : formatNumber(plan.aiQuota)})</strong>
                          AI Automation: Number of automated customer replies & product recommendations generated by AI per month.
                        </>
                      ) : (
                        <>
                          <strong className="block text-white mb-1 font-semibold">🤖 এআই রেসপন্স ({plan.aiQuota === -1 ? 'আনলিমিটেড' : formatNumber(plan.aiQuota)})</strong>
                          এআই অটোমেশন: প্রতি মাসে কাস্টমারের প্রশ্নের উত্তর ও সেলস হ্যান্ডেল করতে এআই মোট {plan.aiQuota === -1 ? 'আনলিমিটেড' : formatNumber(plan.aiQuota)}টি স্বয়ংক্রিয় রিপ্লাই দিতে পারবে।
                        </>
                      )}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-zinc-900" />
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

      {/* Feature Comparison Table */}
      <section className="relative w-full max-w-6xl mx-auto px-4 py-16 border-t border-border/40">
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

                  const baseWeekly = displayCurrency === 'USD' ? wUsd : wBdt;
                  const baseMonthly = displayCurrency === 'USD' ? mUsd : mBdt;
                  const baseYearly = displayCurrency === 'USD' ? yUsd : yBdt;
                  const headerDisplayPrice = billingCycle === 'weekly' && plan.allowWeekly ? baseWeekly : billingCycle === 'yearly' && baseYearly > 0 ? Math.round(baseYearly / 12) : baseMonthly;

                  return (
                    <th key={plan.id} className="p-5 border-b border-border text-center w-1/4">
                      <div className="text-lg font-bold mb-1 text-foreground">{language === 'en' ? plan.name : (plan.nameBn || plan.name)}</div>
                      <div className="text-sm text-muted-foreground font-medium">
                        {displayCurrency === 'BDT' ? '৳' : '$'}{formatNumber(headerDisplayPrice)}/{billingCycle === 'weekly' ? 'wk' : 'mo'}
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
