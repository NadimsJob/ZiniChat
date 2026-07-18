'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/components/LanguageProvider';

export default function FeaturesPage() {
  const { language } = useLanguage();
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/landing-page/config`)
      .then(res => res.json())
      .then(data => setConfig(data))
      .catch(console.error);
  }, []);

  if (!config) return null;

  return (
    <div className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
          {language === 'en' ? 'Platform Features' : 'প্ল্যাটফর্ম ফিচারসমূহ'}
        </h1>
        <p className="mt-4 text-xl text-zinc-500 max-w-2xl mx-auto">
          {language === 'en' ? 'Discover all the powerful tools we offer to supercharge your business.' : 'আপনার ব্যবসাকে আরও গতিশীল করতে আমাদের সব শক্তিশালী টুলস সম্পর্কে জানুন।'}
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {config.featuresJson?.map((feature: any, idx: number) => (
          <div key={idx} className="p-8 rounded-3xl bg-surface border border-surface-hover hover:border-secondary/50 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 text-secondary flex items-center justify-center mb-6">
              <svg className="w-6 h-6 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold mb-4">{language === 'en' ? feature.title?.en || feature.title : feature.title?.bn || feature.title}</h3>
            <p className="text-zinc-500 leading-relaxed">{language === 'en' ? feature.description?.en || feature.description : feature.description?.bn || feature.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
