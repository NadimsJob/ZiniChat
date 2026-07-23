'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import { useCurrency } from '@/components/CurrencyProvider';
import { Check } from 'lucide-react';
import Link from 'next/link';

export function PricingSection({ isHomepage = false }: { isHomepage?: boolean }) {
  const { language } = useLanguage();
  const { rate, formatBDT, formatNumber, displayCurrency, setDisplayCurrency } = useCurrency();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isYearly, setIsYearly] = useState(false);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/packages/plans`)
      .then(res => res.json())
      .then(plansData => {
        const sortedPlans = (plansData || []).sort((a: any, b: any) => a.priceMonthlyBdt - b.priceMonthlyBdt);
        setPlans(sortedPlans);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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
        
        {/* Currency Toggle */}
        <div className="flex justify-center mb-4">
          <div className="inline-flex bg-card border border-border rounded-full p-1 shadow-sm">
            <button
              onClick={() => setDisplayCurrency('BDT')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${displayCurrency === 'BDT' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              BDT
            </button>
            <button
              onClick={() => setDisplayCurrency('USD')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${displayCurrency === 'USD' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              USD
            </button>
          </div>
        </div>

        {/* Monthly/Yearly Toggle */}
        <div className="flex items-center justify-center gap-4 mt-8">
          <span className={`text-sm font-bold transition-colors ${!isYearly ? 'text-foreground' : 'text-muted-foreground'}`}>
            {language === 'en' ? 'Monthly' : 'মাসিক'}
          </span>
          <button 
            onClick={() => setIsYearly(!isYearly)}
            className="relative w-16 h-8 rounded-full bg-card border border-border transition-colors p-1 flex items-center shadow-inner"
          >
            <div className={`w-6 h-6 rounded-full bg-primary shadow-md transition-transform duration-300 ${isYearly ? 'translate-x-8' : 'translate-x-0'}`} />
          </button>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-bold transition-colors ${isYearly ? 'text-foreground' : 'text-muted-foreground'}`}>
              {language === 'en' ? 'Yearly' : 'বার্ষিক'}
            </span>
            {maxDiscountPercent > 0 && (
              <span className="bg-emerald-500/10 text-emerald-600 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                {language === 'en' 
                  ? `Save up to ${maxDiscountPercent}%` 
                  : `সর্বোচ্চ ${formatNumber(maxDiscountPercent)}% সাশ্রয়`}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10 grid md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {plans.map((plan: any) => {
          const mBdt = Number(plan.priceMonthlyBdt) || 0;
          const mUsd = Number(plan.priceMonthlyUsd) > 0 ? Number(plan.priceMonthlyUsd) : Math.round(mBdt / (rate || 121));

          const yBdt = Number(plan.priceYearlyBdt) > 0 ? Number(plan.priceYearlyBdt) : Math.round(mBdt * 12 * 0.8334);
          const yUsd = Number(plan.priceYearlyUsd) > 0 ? Number(plan.priceYearlyUsd) : Math.round(mUsd * 12 * 0.8334);

          const promoBdt = Number(plan.promoPriceMonthlyBdt) || 0;
          const promoUsd = Number(plan.promoPriceMonthlyUsd) > 0 ? Number(plan.promoPriceMonthlyUsd) : Math.round(promoBdt / (rate || 121));

          const baseMonthly = displayCurrency === 'USD' ? mUsd : mBdt;
          const baseYearly = displayCurrency === 'USD' ? yUsd : yBdt;
          const promoPrice = displayCurrency === 'USD' ? promoUsd : promoBdt;

          const displayPrice = isYearly && baseYearly > 0 ? Math.round(baseYearly / 12) : baseMonthly;
          
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
                    {formatNumber(!isYearly && Number(plan.promoMonths) > 0 ? promoPrice : displayPrice)}
                  </span>
                </div>
                
                <div className={`text-sm mt-2 font-medium ${mutedColor}`}>
                   {language === 'en' ? 'per month' : 'প্রতি মাসে'}
                </div>
                
                {!isYearly && Number(plan.promoMonths) > 0 ? (
                  <div className={`text-sm font-bold mt-3 inline-block self-start px-2 py-1 rounded ${isPop ? 'bg-black/10 text-zinc-900' : 'bg-primary/10 text-primary'}`}>
                    {language === 'en' ? `For the first ${plan.promoMonths} months, then ${displayCurrency === 'BDT' ? '৳' : '$'}${formatNumber(displayPrice)}/mo` : `প্রথম ${plan.promoMonths} মাসের জন্য, তারপর ${displayCurrency === 'BDT' ? '৳' : '$'}${formatNumber(displayPrice)}/মাস`}
                  </div>
                ) : null}

                {isYearly && baseYearly > 0 ? (
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
                <li className="flex items-start gap-3 text-[15px] font-medium">
                  <div className="mt-0.5 bg-green-500 rounded-full p-0.5"><Check className="w-4 h-4 shrink-0 text-white" strokeWidth={3} /></div>
                  <span><strong className={`font-extrabold ${textColor}`}>{plan.seatLimit === -1 ? 'Unlimited' : formatNumber(plan.seatLimit)}</strong> {language === 'en' ? 'Team Members' : 'টিম মেম্বার'}</span>
                </li>
                <li className="flex items-start gap-3 text-[15px] font-medium">
                  <div className="mt-0.5 bg-green-500 rounded-full p-0.5"><Check className="w-4 h-4 shrink-0 text-white" strokeWidth={3} /></div>
                  <span><strong className={`font-extrabold ${textColor}`}>{plan.messageQuota === -1 ? 'Unlimited' : formatNumber(plan.messageQuota)}</strong> {language === 'en' ? 'Messages/mo' : 'মেসেজ/মাস'}</span>
                </li>
                <li className="flex items-start gap-3 text-[15px] font-medium">
                  <div className="mt-0.5 bg-green-500 rounded-full p-0.5"><Check className="w-4 h-4 shrink-0 text-white" strokeWidth={3} /></div>
                  <span><strong className={`font-extrabold ${textColor}`}>{plan.aiQuota === -1 ? 'Unlimited' : formatNumber(plan.aiQuota)}</strong> {language === 'en' ? 'AI Responses/mo' : 'এআই রেসপন্স/মাস'}</span>
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
                  href={`/signup?planId=${plan.id}`} 
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
