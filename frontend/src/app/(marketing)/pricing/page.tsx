'use client';

import { useEffect, useState, useMemo } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import { useCurrency } from '@/components/CurrencyProvider';
import { Check, X } from 'lucide-react';
import Link from 'next/link';

export default function PricingPage() {
  const { language } = useLanguage();
  const { formatBDT, formatNumber } = useCurrency();
  const [plans, setPlans] = useState<any[]>([]);
  const [addons, setAddons] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isYearly, setIsYearly] = useState(false);

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
    .finally(() => setLoading(false));
  }, []);

  const tableRows = useMemo(() => {
    const rows: any[] = [];
    if (config?.pricingComparisonJson?.categories && config.pricingComparisonJson.categories.length > 0) {
      config.pricingComparisonJson.categories.forEach((cat: any) => {
        rows.push({
          isHeader: true,
          en: cat.title?.en || 'Features',
          bn: cat.title?.bn || 'ফিচারসমূহ'
        });
        (cat.items || []).forEach((item: any) => {
          rows.push({
            isHeader: false,
            en: item.name?.en || item.id,
            bn: item.name?.bn || item.id,
            get: (plan: any) => {
              if (item.type === 'quota') {
                const val = plan[item.field];
                return val === -1 ? 'Unlimited' : formatNumber(val);
              } else if (item.type === 'boolean') {
                return plan.features?.includes(item.featureKey) ? 'yes' : 'no';
              }
              return 'no';
            }
          });
        });
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
    <div className="flex flex-col items-center overflow-hidden min-h-screen">
      {/* Hero */}
      <section className="w-full relative py-20 px-4 text-center">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 rounded-[100%] blur-[120px] pointer-events-none" />
        
        <div className="relative z-10 max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
            {language === 'en' ? 'Simple, transparent pricing' : 'সহজ ও স্বচ্ছ প্রাইসিং'}
          </h1>
          <p className="text-lg md:text-xl text-zinc-500 mb-10">
            {language === 'en' 
              ? 'No hidden fees, no surprise charges. Choose the plan that fits your business scale.' 
              : 'কোনো লুকানো চার্জ নেই। আপনার ব্যবসার জন্য মানানসই প্ল্যান বেছে নিন।'}
          </p>

          {/* Monthly/Yearly Toggle */}
          <div className="flex items-center justify-center gap-4 mb-16">
            <span className={`text-sm font-semibold transition-colors ${!isYearly ? 'text-foreground' : 'text-zinc-500'}`}>
              {language === 'en' ? 'Monthly' : 'মাসিক'}
            </span>
            
            <button 
              onClick={() => setIsYearly(!isYearly)}
              className="relative w-16 h-8 rounded-full bg-surface border border-surface-hover transition-colors p-1 flex items-center"
            >
              <div className={`w-6 h-6 rounded-full bg-gradient-to-r from-primary to-secondary shadow-md transition-transform duration-300 ${isYearly ? 'translate-x-8' : 'translate-x-0'}`} />
            </button>
            
            <div className="flex items-center gap-2">
              <span className={`text-sm font-semibold transition-colors ${isYearly ? 'text-foreground' : 'text-zinc-500'}`}>
                {language === 'en' ? 'Yearly' : 'বার্ষিক'}
              </span>
              <span className="bg-green-500/10 text-green-500 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                {language === 'en' ? 'Save 20%' : '২০% ছাড়'}
              </span>
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="max-w-6xl mx-auto relative z-10 grid md:grid-cols-3 gap-8 px-4">
          {plans.map((plan: any) => {
            const price = isYearly && plan.priceYearlyBdt ? plan.priceYearlyBdt : plan.priceMonthlyBdt;
            const displayPrice = isYearly && plan.priceYearlyBdt ? price / 12 : price;
            
            return (
              <div 
                key={plan.id} 
                className={`flex flex-col p-8 rounded-3xl bg-surface border transition-all duration-300 hover:-translate-y-2 ${
                  plan.isPopular 
                    ? 'border-primary shadow-[0_0_40px_-15px_var(--primary)] relative transform md:-translate-y-4 hover:!translate-y-[-24px]' 
                    : 'border-surface-hover hover:border-zinc-700 shadow-xl'
                }`}
              >
                {plan.isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-secondary text-white text-xs font-bold py-1.5 px-6 rounded-full uppercase tracking-wider shadow-lg">
                    {language === 'en' ? 'Most Popular' : 'জনপ্রিয়'}
                  </div>
                )}
                
                <h3 className="text-2xl font-bold mb-2">
                  {language === 'en' ? plan.name : (plan.nameBn || plan.name)}
                </h3>
                <p className="text-sm text-zinc-500 h-10 mb-6 line-clamp-2">
                  {language === 'en' ? plan.description : (plan.descriptionBn || plan.description)}
                </p>
                
                <div className="mb-6 flex flex-col">
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-extrabold tracking-tight">{formatBDT(displayPrice)}</span>
                    <span className="text-zinc-500 font-medium">/mo</span>
                  </div>
                  {isYearly && plan.priceYearlyBdt && (
                    <div className="text-sm text-green-500 font-medium mt-1">
                      {language === 'en' ? `Billed ${formatBDT(plan.priceYearlyBdt)} yearly` : `বছরে ${formatBDT(plan.priceYearlyBdt)} বিল করা হবে`}
                    </div>
                  )}
                  {isYearly && !plan.priceYearlyBdt && (
                    <div className="text-sm text-zinc-500 font-medium mt-1">
                      {language === 'en' ? 'Billed monthly' : 'মাসিক বিল'}
                    </div>
                  )}
                </div>

                <Link 
                  href="/signup" 
                  className={`w-full py-4 rounded-xl font-bold text-sm text-center transition-all mb-8 ${
                    plan.isPopular 
                      ? 'bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90 shadow-glow' 
                      : 'bg-surface-hover text-foreground hover:bg-zinc-800'
                  }`}
                >
                  {language === 'en' ? 'Start Free Trial' : 'ফ্রি ট্রায়াল শুরু করুন'}
                </Link>

                <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4">
                  {language === 'en' ? 'Top Features' : 'প্রধান ফিচারসমূহ'}
                </div>
                
                <ul className="space-y-4 mb-2 flex-1">
                  <li className="flex items-start gap-3 text-sm">
                    <Check className="w-5 h-5 text-green-500 shrink-0" />
                    <span><strong className="text-foreground">{plan.seatLimit === -1 ? 'Unlimited' : formatNumber(plan.seatLimit)}</strong> {language === 'en' ? 'Team Members' : 'টিম মেম্বার'}</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm">
                    <Check className="w-5 h-5 text-green-500 shrink-0" />
                    <span><strong className="text-foreground">{plan.messageQuota === -1 ? 'Unlimited' : formatNumber(plan.messageQuota)}</strong> {language === 'en' ? 'Messages/mo' : 'মেসেজ/মাস'}</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm">
                    <Check className="w-5 h-5 text-green-500 shrink-0" />
                    <span><strong className="text-foreground">{plan.aiQuota === -1 ? 'Unlimited' : formatNumber(plan.aiQuota)}</strong> {language === 'en' ? 'AI Responses/mo' : 'এআই রেসপন্স/মাস'}</span>
                  </li>
                  {plan.featuresJson?.slice(0, 3).map((f: any, i: number) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-zinc-400">
                      <Check className="w-5 h-5 text-green-500/50 shrink-0" />
                      <span>{language === 'en' ? f.en : (f.bn || f.en)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="w-full max-w-6xl mx-auto px-4 py-24 hidden md:block">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight mb-4">
            {language === 'en' ? 'Compare Plans' : 'প্ল্যান তুলনা করুন'}
          </h2>
        </div>

        <div className="w-full overflow-x-auto bg-surface border border-surface-hover rounded-3xl p-6">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="w-1/3 p-4 border-b border-surface-hover bg-surface sticky left-0 z-10"></th>
                {plans.map((plan: any) => (
                  <th key={plan.id} className="p-4 border-b border-surface-hover text-center w-1/4">
                    <div className="text-lg font-bold mb-1">{language === 'en' ? plan.name : (plan.nameBn || plan.name)}</div>
                    <div className="text-sm text-zinc-500 font-normal">
                      {formatBDT(isYearly && plan.priceYearlyBdt ? plan.priceYearlyBdt / 12 : plan.priceMonthlyBdt)}/mo
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, idx) => {
                return (
                  <tr key={idx} className={row.isHeader ? 'bg-surface-hover/30' : 'hover:bg-surface-hover/10 transition-colors'}>
                    <td className={`p-4 border-b border-surface-hover/50 sticky left-0 bg-surface ${row.isHeader ? 'font-bold text-sm uppercase tracking-wider text-primary pt-8 pb-4' : 'text-sm font-medium text-zinc-300'}`}>
                      {language === 'en' ? row.en : row.bn}
                    </td>
                    {row.isHeader ? (
                      plans.map((p: any) => <td key={p.id} className="border-b border-surface-hover/50"></td>)
                    ) : (
                      plans.map((plan: any) => {
                        const val = row.get!(plan);
                        return (
                          <td key={plan.id} className="p-4 border-b border-surface-hover/50 text-center text-sm">
                            {val === 'yes' ? (
                              <Check className="w-5 h-5 text-green-500 mx-auto" />
                            ) : val === 'no' ? (
                              <X className="w-5 h-5 text-zinc-600 mx-auto" />
                            ) : (
                              <span className="font-semibold text-zinc-300">{val}</span>
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
        <section className="w-full bg-surface-hover/30 border-y border-surface-hover py-24">
          <div className="max-w-5xl mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold tracking-tight mb-4">
              {language === 'en' ? 'Need more power? Get Add-ons' : 'আরও বেশি লিমিট প্রয়োজন? অ্যাড-অন নিন'}
            </h2>
            <p className="text-zinc-500 mb-12 max-w-xl mx-auto">
              {language === 'en' 
                ? 'Scale your business seamlessly. Add extra limits to your active subscription anytime.' 
                : 'আপনার সাবস্ক্রিপশনে যেকোনো সময় অতিরিক্ত লিমিট যুক্ত করুন।'}
            </p>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {addons.map((addon) => (
                <div key={addon.id} className="bg-background border border-surface-hover p-8 rounded-3xl text-left hover:border-secondary/50 transition-colors">
                  <div className="w-12 h-12 bg-secondary/10 text-secondary rounded-2xl flex items-center justify-center mb-6">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold mb-1 text-foreground">
                    {language === 'en' ? addon.name : (addon.nameBn || addon.name)}
                  </h3>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-6">
                    +{formatNumber(addon.value)} {addon.type.replace('_', ' ')}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="text-3xl font-black text-secondary">{formatBDT(addon.priceBdt)}</div>
                    <div className="text-xs text-zinc-500 font-medium bg-surface-hover px-2 py-1 rounded">One-time</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Mini FAQ */}
      <section className="w-full max-w-3xl mx-auto px-4 py-24 text-center">
        <h2 className="text-2xl font-bold mb-8">
          {language === 'en' ? 'Billing Questions?' : 'বিলিং সংক্রান্ত প্রশ্ন?'}
        </h2>
        <p className="text-zinc-500 mb-6">
          {language === 'en' ? 'Can I upgrade or downgrade anytime? Yes, you can change your plan anytime from your dashboard. The pricing difference will be prorated.' : 'আমি কি যেকোনো সময় আপগ্রেড বা ডাউনগ্রেড করতে পারি? হ্যাঁ, আপনি ড্যাশবোর্ড থেকে যেকোনো সময় প্ল্যান পরিবর্তন করতে পারবেন।'}
        </p>
        <Link href="/faq" className="text-primary font-bold hover:underline">
          {language === 'en' ? 'Read all FAQs →' : 'সব FAQ পড়ুন →'}
        </Link>
      </section>
    </div>
  );
}
