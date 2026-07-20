'use client';

import { useEffect, useState, useMemo } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import * as LucideIcons from 'lucide-react';
import Link from 'next/link';

export default function FAQPage() {
  const { language } = useLanguage();
  const [config, setConfig] = useState<any>(null);
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/landing-page/config`)
      .then(res => res.json())
      .then(data => setConfig(data))
      .catch(console.error);
  }, []);

  const dynamicCategories = useMemo(() => {
    const cats = config?.faqsJson?.categories || [];
    const filteredCats = cats.filter((c: any) => c.id !== 'all');
    return [
      { id: 'all', icon: 'Search', en: 'All Questions', bn: 'সব প্রশ্ন' },
      ...filteredCats
    ];
  }, [config]);

  const allFaqs = useMemo(() => {
    return config?.faqsJson?.faqs || [];
  }, [config]);

  const filteredFaqs = useMemo(() => {
    return allFaqs.filter((faq: any) => {
      if (activeCategory !== 'all' && faq.categoryId !== activeCategory) {
        return false;
      }
      
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const qText = (language === 'en' ? (faq.question?.en || faq.question) : (faq.question?.bn || faq.question))?.toLowerCase() || '';
        const aText = (language === 'en' ? (faq.answer?.en || faq.answer) : (faq.answer?.bn || faq.answer))?.toLowerCase() || '';
        
        return qText.includes(query) || aText.includes(query);
      }
      
      return true;
    });
  }, [allFaqs, activeCategory, searchQuery, language]);

  return (
    <div className="flex flex-col items-center overflow-hidden min-h-screen">
      {/* Hero */}
      <section className="w-full bg-surface-hover/30 border-b border-surface-hover py-16 px-4">
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
            {language === 'en' ? 'Frequently Asked Questions' : 'সাধারণ জিজ্ঞাসা'}
          </h1>
          <p className="text-lg text-zinc-500 mb-8 max-w-xl mx-auto">
            {language === 'en' 
              ? 'Everything you need to know about the product, integrations, and billing.' 
              : 'প্রোডাক্ট, ইন্টিগ্রেশন এবং বিলিং সম্পর্কে আপনার যা জানা প্রয়োজন।'}
          </p>
          
          {/* Search Bar */}
          <div className="relative max-w-xl mx-auto">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400">
              <LucideIcons.Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              className="w-full bg-background border border-surface-hover rounded-full py-4 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all shadow-sm"
              placeholder={language === 'en' ? 'Search for answers...' : 'উত্তর খুঁজুন...'}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setOpenIdx(null); // Close accordion on search
              }}
            />
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid lg:grid-cols-4 gap-8 items-start">
          
          {/* Sidebar / Categories */}
          <div className="lg:col-span-1 flex flex-col gap-2 sticky top-28">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 px-2">
              {language === 'en' ? 'Categories' : 'ক্যাটাগরি'}
            </h3>
            {dynamicCategories.map((cat: any) => {
              const IconComp = (LucideIcons as any)[cat.icon || 'HelpCircle'] || LucideIcons.HelpCircle;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCategory(cat.id);
                    setOpenIdx(null);
                  }}
                  className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    activeCategory === cat.id
                      ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm'
                      : 'bg-transparent text-zinc-400 hover:bg-surface hover:text-foreground border border-transparent'
                  }`}
                >
                  <IconComp className="w-4 h-4 shrink-0" />
                  {language === 'en' ? cat.en : cat.bn}
                </button>
              );
            })}
          </div>

          {/* FAQ List */}
          <div className="lg:col-span-3">
            {filteredFaqs.length > 0 ? (
              <div className="space-y-4">
                {filteredFaqs.map((faq: any, idx: number) => {
                  const qText = language === 'en' ? (faq.question?.en || faq.question) : (faq.question?.bn || faq.question);
                  const aText = language === 'en' ? (faq.answer?.en || faq.answer) : (faq.answer?.bn || faq.answer);
                  
                  return (
                    <div 
                      key={idx} 
                      className={`bg-surface border rounded-2xl overflow-hidden transition-all duration-300 ${
                        openIdx === idx ? 'border-primary/40 shadow-glow' : 'border-surface-hover hover:border-zinc-700'
                      }`}
                    >
                      <button
                        onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
                        className="w-full text-left px-6 py-5 flex justify-between items-center focus:outline-none group"
                      >
                        <span className={`font-semibold text-base md:text-lg pr-4 transition-colors ${openIdx === idx ? 'text-primary' : 'group-hover:text-primary/80'}`}>
                          {qText}
                        </span>
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${openIdx === idx ? 'bg-primary text-white rotate-180' : 'bg-surface-hover text-zinc-400'}`}>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                          </svg>
                        </span>
                      </button>
                      <div className={`px-6 text-zinc-400 text-sm md:text-base leading-relaxed transition-all duration-300 ease-in-out ${
                        openIdx === idx ? 'pb-6 pt-2 opacity-100' : 'max-h-0 opacity-0 overflow-hidden py-0'
                      }`}>
                        {aText}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-20 bg-surface/50 border border-surface-hover rounded-3xl">
                <div className="w-16 h-16 bg-surface border border-surface-hover text-zinc-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <LucideIcons.Search className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-2">{language === 'en' ? 'No results found' : 'কোনো ফলাফল পাওয়া যায়নি'}</h3>
                <p className="text-zinc-500 mb-6">
                  {language === 'en' 
                    ? `We couldn't find any FAQs matching "${searchQuery}"` 
                    : `আমরা "${searchQuery}" এর সাথে মিলে এমন কোনো FAQ খুঁজে পাইনি`}
                </p>
                <button 
                  onClick={() => {
                    setSearchQuery('');
                    setActiveCategory('all');
                  }}
                  className="px-6 py-2 bg-primary text-white rounded-full text-sm font-bold shadow-glow"
                >
                  {language === 'en' ? 'Clear Search' : 'সার্চ মুছুন'}
                </button>
              </div>
            )}

            {/* Still have questions CTA */}
            <div className="mt-16 p-8 rounded-3xl bg-gradient-to-r from-surface to-background border border-surface-hover flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h4 className="text-lg font-bold mb-1">{language === 'en' ? 'Still have questions?' : 'এখনও প্রশ্ন আছে?'}</h4>
                <p className="text-zinc-500 text-sm">{language === 'en' ? 'Can\'t find the answer you\'re looking for? Please chat to our friendly team.' : 'আপনি যে উত্তরটি খুঁজছেন তা পাচ্ছেন না? অনুগ্রহ করে আমাদের টিমের সাথে কথা বলুন।'}</p>
              </div>
              <Link href="/contact" className="px-6 py-3 bg-surface-hover hover:bg-zinc-800 border border-surface-hover hover:border-zinc-700 rounded-full text-sm font-bold transition-all whitespace-nowrap">
                {language === 'en' ? 'Get in touch' : 'যোগাযোগ করুন'}
              </Link>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
}
