'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import { ShieldCheck } from 'lucide-react';

export default function PrivacyPage() {
  const { language } = useLanguage();
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/landing-page/config`)
      .then(res => res.json())
      .then(data => {
        setConfig(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const content = language === 'en' 
    ? config?.privacyPolicyJson?.en 
    : (config?.privacyPolicyJson?.bn || config?.privacyPolicyJson?.en);

  return (
    <div className="flex flex-col items-center w-full overflow-hidden bg-background min-h-screen pt-20">
      <section className="relative w-full overflow-hidden py-16 px-4 text-center lg:py-20">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[40rem] h-[40rem] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
        </div>
        
        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-primary mb-6 shadow-sm">
            <ShieldCheck className="w-4 h-4 text-primary" />
            {language === 'en' ? 'Legal' : 'লিগ্যাল'}
          </div>
          <h1 className="mb-6 text-4xl font-extrabold tracking-tight sm:text-5xl text-foreground">
            {language === 'en' ? 'Privacy Policy' : 'প্রাইভেসি পলিসি'}
          </h1>
          <p className="mx-auto mb-12 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
            {language === 'en' 
              ? 'Your privacy is important to us. Learn how we collect and use your data.' 
              : 'আপনার গোপনীয়তা আমাদের কাছে গুরুত্বপূর্ণ। আমরা কীভাবে আপনার ডেটা সংগ্রহ এবং ব্যবহার করি তা জানুন।'}
          </p>
        </div>
      </section>

      <section className="relative w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="bg-card border border-border rounded-3xl p-8 sm:p-12 shadow-sm whitespace-pre-wrap leading-relaxed text-foreground/80">
          {content || (language === 'en' ? 'No content available.' : 'কোনো তথ্য নেই।')}
        </div>
      </section>
    </div>
  );
}
