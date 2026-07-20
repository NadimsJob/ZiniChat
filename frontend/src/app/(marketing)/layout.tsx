'use client';

import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useLanguage } from '@/components/LanguageProvider';
import { Globe, MessageSquare } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const { language, setLanguage } = useLanguage();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-300">
      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-surface-hover bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center hover:opacity-90 transition-opacity">
              <img src="/logo.png" alt="ZiniChat Logo" className="h-20 sm:h-20 md:h-16 w-auto object-contain" />
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-500 dark:text-zinc-400">
              <Link href="/features" className="hover:text-foreground transition-colors">
                {language === 'en' ? 'Features' : 'ফিচার্স'}
              </Link>
              <Link href="/pricing" className="hover:text-foreground transition-colors">
                {language === 'en' ? 'Pricing' : 'প্রাইসিং'}
              </Link>
              <Link href="/about" className="hover:text-foreground transition-colors">
                {language === 'en' ? 'About Us' : 'আমাদের সম্পর্কে'}
              </Link>
              <Link href="/faq" className="hover:text-foreground transition-colors">
                {language === 'en' ? 'FAQ' : 'সাধারণ জিজ্ঞাসা'}
              </Link>
              <Link href="/contact" className="hover:text-foreground transition-colors">
                {language === 'en' ? 'Contact' : 'যোগাযোগ'}
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {/* Language Toggle */}
            <button
              onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
              className="flex items-center justify-center gap-1.5 h-8 px-3 rounded-full border border-surface-hover bg-background hover:bg-surface text-xs font-medium text-zinc-500 hover:text-foreground transition-all"
            >
              <Globe className="w-3.5 h-3.5" />
              {language === 'en' ? 'EN' : 'BN'}
            </button>



            <Link href="/login" className="flex items-center justify-center h-8 px-4 rounded-full bg-gradient-to-r from-primary to-secondary text-white text-xs font-bold hover:opacity-90 transition-all shadow-glow">
              {language === 'en' ? 'Login →' : 'লগইন →'}
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-surface-hover py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-sm text-zinc-500">
            © {new Date().getFullYear()} ZiniChat. {language === 'en' ? 'All rights reserved.' : 'সর্বস্বত্ব সংরক্ষিত।'}
          </p>
          <div className="flex gap-6 text-sm text-zinc-500">
            <Link href="/terms" className="hover:text-foreground">{language === 'en' ? 'Terms' : 'শর্তাবলী'}</Link>
            <Link href="/privacy" className="hover:text-foreground">{language === 'en' ? 'Privacy' : 'গোপনীয়তা'}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
