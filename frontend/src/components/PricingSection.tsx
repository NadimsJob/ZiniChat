'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import { useCurrency } from '@/components/CurrencyProvider';
import { Check, Info } from 'lucide-react';
import Link from 'next/link';

import { getCachedPlans } from '@/lib/publicDataCache';

export function PricingSection({ isHomepage = false, initialPlans }: { isHomepage?: boolean; initialPlans?: any[] }) {
  const { language } = useLanguage();
  const { rate, formatBDT, formatNumber, displayCurrency, setDisplayCurrency } = useCurrency();
  const [plans, setPlans] = useState<any[]>(initialPlans || []);
  const [loading, setLoading] = useState(!initialPlans || initialPlans.length === 0);
  const [billingCycle, setBillingCycle] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    if (initialPlans && initialPlans.length > 0) {
      setPlans(initialPlans);
      setLoading(false);
      return;
    }

    getCachedPlans()
      .then(plansData => {
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
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [initialPlans]);

  const hasAnyPaidWeeklyPlan = plans.some(
    (p: any) => p.allowWeekly === true && Number(p.priceMonthlyBdt) > 0
  );

  useEffect(() => {
    if (!hasAnyPaidWeeklyPlan && billingCycle === 'weekly') {
      setBillingCycle('monthly');
    }
  }, [hasAnyPaidWeeklyPlan, billingCycle]);

  const maxDiscountPercent = plans.reduce((max: number, p: any) => {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <section className="relative w-full py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
      <div className="max-w-7xl mx-auto text-center mb-16">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
          {language === 'en' ? 'Pricing & Plans' : 'প্যাকেজ ও প্রাইসিং'}
        </span>
        <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-6 text-foreground">
          {language === 'en' ? 'Simple, transparent pricing' : 'সহজ ও স্বচ্ছ প্রাইসিং'}
        </h2>
        
        {/* Currency & Billing Cycle Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
          {/* Currency Switcher */}
          <div className="inline-flex bg-card border border-border rounded-2xl p-1 shadow-sm">
            <button
              onClick={() => setDisplayCurrency('BDT')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${displayCurrency === 'BDT' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              BDT
            </button>
            <button
              onClick={() => setDisplayCurrency('USD')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${displayCurrency === 'USD' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              USD
            </button>
          </div>

          {/* Billing Cycle Switcher: Weekly / Monthly / Yearly */}
          <div className="inline-flex bg-card border border-primary/20 rounded-2xl p-1 shadow-sm items-center gap-1">
            {hasAnyPaidWeeklyPlan && (
              <button
                onClick={() => setBillingCycle('weekly')}
                className={`px-4 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
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
              className={`px-4 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                billingCycle === 'monthly' 
                  ? 'bg-primary text-primary-foreground shadow-md' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {language === 'en' ? 'Monthly' : 'মাসিক'}
            </button>

            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-4 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${
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

      <div className="max-w-7xl mx-auto relative z-10 grid md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {plans.map((plan: any) => {
          const mBdt = Number(plan.priceMonthlyBdt) || 0;
          const mUsd = Number(plan.priceMonthlyUsd) > 0 ? Number(plan.priceMonthlyUsd) : Math.round(mBdt / (rate || 121));

          const rawYBdt = Number(plan.priceYearlyBdt) || 0;
          const rawYUsd = Number(plan.priceYearlyUsd) || 0;
          const discountPct = Number(plan.yearlyDiscountPercent) || 0;

          // If DB yearly price == monthly*12 (no discount applied), apply discountPct
          // Otherwise use the stored yearly price as-is (already discounted)
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

                {isHomepage && (
                  <Link 
                    href="/pricing" 
                    className={`block mt-4 w-full py-3 rounded-xl font-bold text-sm text-center transition-all ${isPop ? 'text-zinc-800 hover:text-zinc-900 underline' : 'text-primary hover:underline'}`}
                  >
                    {language === 'en' ? 'View More' : 'বিস্তারিত দেখুন'}
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {isHomepage && (
        <div className="text-center mt-12">
          <Link href="/pricing" className="inline-flex items-center gap-2 font-bold text-primary hover:underline">
            {language === 'en' ? 'View Full Comparison' : 'সম্পূর্ণ প্রাইসিং তুলনা দেখুন'}
          </Link>
        </div>
      )}
    </section>
  );
}
