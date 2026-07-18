'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import { useCurrency } from '@/components/CurrencyProvider';
import Link from 'next/link';

export default function PricingPage() {
  const { language } = useLanguage();
  const { formatBDT, formatNumber } = useCurrency();
  const [plans, setPlans] = useState<any[]>([]);
  const [addons, setAddons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/packages/plans`).then(res => res.json()),
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/packages/addons`).then(res => res.json())
    ])
    .then(([plansData, addonsData]) => {
      setPlans(plansData || []);
      setAddons(addonsData || []);
    })
    .catch(console.error)
    .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="py-24 text-center text-zinc-500">Loading pricing...</div>;
  }

  return (
    <div className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
          {language === 'en' ? 'Pricing Plans' : 'প্রাইসিং প্ল্যানসমূহ'}
        </h1>
        <p className="mt-4 text-xl text-zinc-500 max-w-2xl mx-auto">
          {language === 'en' ? 'Choose the plan that best fits your business needs.' : 'আপনার ব্যবসার জন্য উপযুক্ত প্ল্যানটি বেছে নিন।'}
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {plans.map((plan: any, idx: number) => (
          <div key={plan.id} className={`p-8 rounded-3xl bg-surface border flex flex-col items-center text-center shadow-lg relative overflow-hidden transition-all duration-300 hover:-translate-y-1 ${plan.isPopular ? 'border-primary/50 ring-1 ring-primary/50' : 'border-surface-hover hover:border-secondary/50'}`}>
            {plan.isPopular && (
              <div className="absolute top-0 w-full bg-gradient-to-r from-primary to-secondary text-white text-xs font-bold py-1 uppercase tracking-wider">
                {language === 'en' ? 'Most Popular' : 'জনপ্রিয়'}
              </div>
            )}
            
            <h3 className="text-xl font-semibold mt-4">{language === 'en' ? plan.name : (plan.nameBn || plan.name)}</h3>
            <p className="text-sm text-zinc-400 mt-2 h-10">{language === 'en' ? plan.description : (plan.descriptionBn || plan.description)}</p>
            
            <div className="flex items-baseline justify-center gap-1 mb-8">
                <span className="text-5xl font-extrabold text-foreground">{formatBDT(plan.priceMonthlyBdt)}</span>
                <span className="text-zinc-500 font-medium">/mo</span>
              </div>
            
            <ul className="space-y-4 mb-8 w-full text-left text-zinc-400">
              <li className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-secondary/20 text-secondary flex items-center justify-center text-xs">✓</div>
                {formatNumber(plan.seatLimit)} {language === 'en' ? 'Team Members' : 'টিম মেম্বার'}
              </li>
              <li className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-secondary/20 text-secondary flex items-center justify-center text-xs">✓</div>
                {formatNumber(plan.messageQuota)} {language === 'en' ? 'Messages/mo' : 'মেসেজ/মাস'}
              </li>
              <li className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-secondary/20 text-secondary flex items-center justify-center text-xs">✓</div>
                {formatNumber(plan.aiQuota)} {language === 'en' ? 'AI Responses/mo' : 'এআই রেসপন্স/মাস'}
              </li>
              {Array.isArray(plan.features) && plan.features.map((feature: string) => {
                const featureMap: Record<string, {en: string, bn: string}> = {
                  'ai_assistant': { en: 'AI Assistant', bn: 'এআই অ্যাসিস্ট্যান্ট' },
                  'own_api': { en: 'Bring Your Own Key', bn: 'নিজস্ব এপিআই কি' },
                  'messenger': { en: 'Messenger Integration', bn: 'মেসেঞ্জার ইন্টিগ্রেশন' },
                  'whatsapp': { en: 'WhatsApp Integration', bn: 'হোয়াটসঅ্যাপ ইন্টিগ্রেশন' },
                  'lead_manage': { en: 'Leads CRM', bn: 'লিডস সিআরএম' },
                  'commerce': { en: 'Products & Orders', bn: 'প্রোডাক্টস এবং অর্ডারস' }
                };
                const labels = featureMap[feature];
                if (!labels) return null;
                return (
                  <li key={feature} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-secondary/20 text-secondary flex items-center justify-center text-xs">✓</div>
                    {language === 'en' ? labels.en : labels.bn}
                  </li>
                );
              })}
              {plan.featuresJson?.map((f: any, i: number) => (
                <li key={i} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-secondary/20 text-secondary flex items-center justify-center text-xs">✓</div>
                  {language === 'en' ? f.en : (f.bn || f.en)}
                </li>
              ))}
            </ul>
            <Link href="/signup" className={`mt-auto w-full py-4 rounded-xl font-semibold transition-colors ${plan.isPopular ? 'bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90 shadow-lg shadow-secondary/20' : 'bg-surface-hover hover:bg-surface-hover/80 text-foreground'}`}>
              {language === 'en' ? 'Get Started' : 'শুরু করুন'}
            </Link>
          </div>
        ))}
      </div>

      {addons.length > 0 && (
        <div className="mt-32 max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight">
              {language === 'en' ? 'Available Add-ons' : 'অ্যাড-অন সমূহ'}
            </h2>
            <p className="mt-4 text-zinc-500">
              {language === 'en' ? 'Need more limits? Purchase add-ons anytime.' : 'আরও লিমিট প্রয়োজন? যেকোনো সময় অ্যাড-অন কিনতে পারবেন।'}
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {addons.map((addon) => (
              <div key={addon.id} className="bg-surface border border-surface-hover p-6 rounded-2xl text-center">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-foreground">{language === 'en' ? addon.name : (addon.nameBn || addon.name)}</h3>
                  <div className="text-2xl font-black mt-4 text-secondary">{formatBDT(addon.priceBdt)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
