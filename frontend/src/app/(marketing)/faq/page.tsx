'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/components/LanguageProvider';

export default function FAQPage() {
  const { language } = useLanguage();
  const [config, setConfig] = useState<any>(null);
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/landing-page/config`)
      .then(res => res.json())
      .then(data => setConfig(data))
      .catch(console.error);
  }, []);

  if (!config) return null;

  return (
    <div className="py-24 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
          {language === 'en' ? 'Frequently Asked Questions' : 'সাধারণ জিজ্ঞাসা'}
        </h1>
        <p className="mt-4 text-xl text-zinc-500">
          {language === 'en' ? 'Everything you need to know about the product and billing.' : 'প্রোডাক্ট এবং বিলিং সম্পর্কে আপনার যা জানা প্রয়োজন।'}
        </p>
      </div>

      <div className="space-y-4">
        {config.faqsJson?.map((faq: any, idx: number) => (
          <div key={idx} className="bg-surface border border-surface-hover rounded-2xl overflow-hidden transition-all duration-300">
            <button
              onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
              className="w-full text-left px-6 py-5 font-semibold text-lg flex justify-between items-center focus:outline-none"
            >
              {language === 'en' ? faq.question?.en || faq.question : faq.question?.bn || faq.question}
              <span className={`transition-transform duration-300 ${openIdx === idx ? 'rotate-180' : ''}`}>
                <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </button>
            <div className={`px-6 text-zinc-500 transition-all duration-300 ease-in-out ${openIdx === idx ? 'pb-5 opacity-100' : 'max-h-0 opacity-0 overflow-hidden py-0'}`}>
              <p className="leading-relaxed">{language === 'en' ? faq.answer?.en || faq.answer : faq.answer?.bn || faq.answer}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
