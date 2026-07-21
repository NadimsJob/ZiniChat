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
    <div className="flex flex-col items-center w-full overflow-hidden bg-background min-h-screen">
      {/* Hero */}
      <section className="relative w-full bg-muted pb-16 pt-12 lg:pb-24 lg:pt-16 border-b border-border/40">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/4 top-0 w-[40rem] h-[40rem] -translate-y-1/2 rounded-full bg-primary/10 blur-[120px]"></div>
          <div className="absolute right-1/4 bottom-0 w-[30rem] h-[30rem] translate-y-1/2 rounded-full bg-secondary/10 blur-[100px]"></div>
        </div>
        
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary sm:text-sm mb-6">
            <span className="relative flex w-2 h-2">
              <span className="absolute inline-flex w-full h-full animate-ping rounded-full bg-primary opacity-75"></span>
              <span className="inline-flex w-2 h-2 rounded-full bg-primary"></span>
            </span>
            {language === 'en' ? 'Support Center' : 'সাপোর্ট সেন্টার'}
          </div>
          
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-foreground">
            {language === 'en' ? 'Frequently Asked Questions' : 'সাধারণ জিজ্ঞাসা'}
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            {language === 'en' 
              ? 'Everything you need to know about the product, integrations, and billing.' 
              : 'প্রোডাক্ট, ইন্টিগ্রেশন এবং বিলিং সম্পর্কে আপনার যা জানা প্রয়োজন।'}
          </p>
          
          {/* Search Bar */}
          <div className="relative max-w-xl mx-auto shadow-sm group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
              <LucideIcons.Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              className="w-full bg-card border border-border rounded-2xl py-4 pl-12 pr-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all placeholder:text-muted-foreground"
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
      <section className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="grid lg:grid-cols-4 gap-8 lg:gap-12 items-start relative z-10">
          
          {/* Sidebar / Categories */}
          <div className="lg:col-span-1 flex flex-col gap-2 sticky top-28 bg-card/50 backdrop-blur-sm border border-border/50 rounded-3xl p-4 shadow-sm">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 px-3 pt-2">
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
                  className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 ${
                    activeCategory === cat.id
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <IconComp className={`w-4 h-4 shrink-0 ${activeCategory === cat.id ? 'text-primary-foreground' : 'text-primary'}`} />
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
                      className={`bg-card border rounded-2xl overflow-hidden transition-all duration-300 ${
                        openIdx === idx ? 'border-primary/40 shadow-lg shadow-primary/5' : 'border-border hover:border-primary/30'
                      }`}
                    >
                      <button
                        onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
                        className="w-full text-left px-6 py-5 flex justify-between items-center focus:outline-none group"
                      >
                        <span className={`font-bold text-base md:text-lg pr-4 transition-colors ${openIdx === idx ? 'text-primary' : 'text-foreground group-hover:text-primary/80'}`}>
                          {qText}
                        </span>
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${openIdx === idx ? 'bg-primary text-primary-foreground rotate-180' : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'}`}>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                          </svg>
                        </span>
                      </button>
                      <div className={`px-6 text-muted-foreground text-sm md:text-base leading-relaxed transition-all duration-300 ease-in-out ${
                        openIdx === idx ? 'pb-6 pt-2 opacity-100' : 'max-h-0 opacity-0 overflow-hidden py-0'
                      }`}>
                        <div dangerouslySetInnerHTML={{ __html: aText }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-20 bg-card border border-border rounded-3xl shadow-sm">
                <div className="w-16 h-16 bg-muted border border-border text-muted-foreground rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <LucideIcons.Search className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-foreground">{language === 'en' ? 'No results found' : 'কোনো ফলাফল পাওয়া যায়নি'}</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  {language === 'en' 
                    ? `We couldn't find any FAQs matching "${searchQuery}"` 
                    : `আমরা "${searchQuery}" এর সাথে মিলে এমন কোনো FAQ খুঁজে পাইনি`}
                </p>
                <button 
                  onClick={() => {
                    setSearchQuery('');
                    setActiveCategory('all');
                  }}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors shadow-sm"
                >
                  {language === 'en' ? 'Clear Search' : 'সার্চ মুছুন'}
                </button>
              </div>
            )}

            {/* Still have questions CTA */}
            <div className="mt-12 p-8 md:p-10 rounded-3xl bg-muted border border-border flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
              <div className="relative z-10 text-center md:text-left">
                <h4 className="text-xl font-extrabold mb-2 text-foreground">{language === 'en' ? 'Still have questions?' : 'এখনও প্রশ্ন আছে?'}</h4>
                <p className="text-muted-foreground text-sm md:text-base">{language === 'en' ? 'Can\'t find the answer you\'re looking for? Please chat to our friendly team.' : 'আপনি যে উত্তরটি খুঁজছেন তা পাচ্ছেন না? অনুগ্রহ করে আমাদের টিমের সাথে কথা বলুন।'}</p>
              </div>
              <Link href="/contact" className="relative z-10 px-6 py-3.5 bg-background hover:bg-card border border-border hover:border-primary/30 text-foreground rounded-xl text-sm font-bold transition-all whitespace-nowrap shadow-sm hover:shadow-md">
                {language === 'en' ? 'Get in touch' : 'যোগাযোগ করুন'}
              </Link>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
}
