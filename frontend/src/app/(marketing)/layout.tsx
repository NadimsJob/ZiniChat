'use client';

import Link from 'next/link';
import { useLanguage } from '@/components/LanguageProvider';
import { Globe, ArrowRight, Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';

const Facebook = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>;
const Twitter = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>;
const Instagram = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>;
const Linkedin = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>;
const Youtube = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><polygon points="10 15 15 12 10 9 10 15"/></svg>;

import Image from 'next/image';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const { language, setLanguage } = useLanguage();
  const [config, setConfig] = useState<any>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/landing-page/config`)
      .then(res => res.json())
      .then(data => setConfig(data))
      .catch(console.error);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-300">
      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center hover:opacity-90 transition-opacity">
              <img src="/logo.png" alt="ZiniChat Logo" className="h-16 sm:h-16 md:h-16 w-auto object-contain" />
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
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
            {/* Language Toggle - Exact Pill Switcher as Tenant Panel */}
            <button
              onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
              title={language === 'en' ? 'Switch to Bengali' : 'Switch to English'}
              className="relative flex items-center justify-between w-[48px] h-7 bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-full p-0.5 overflow-hidden transition-colors hover:border-primary/50 mx-1 cursor-pointer shrink-0 shadow-sm"
            >
              <div
                className={`absolute top-[1px] bottom-[1px] w-[21px] bg-primary rounded-full transition-transform duration-300 shadow-sm ${
                  language === 'bn' ? 'translate-x-[21px]' : 'translate-x-0'
                }`}
              />
              <span className={`relative z-10 w-1/2 text-[10px] font-bold text-center transition-colors ${language === 'en' ? 'text-white' : 'text-slate-500 dark:text-zinc-400'}`}>EN</span>
              <span className={`relative z-10 w-1/2 text-[10px] font-bold text-center transition-colors ${language === 'bn' ? 'text-white' : 'text-slate-500 dark:text-zinc-400'}`}>BN</span>
            </button>


            <Link href="/login" className="hidden sm:flex items-center justify-center h-9 px-5 rounded-full bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-sm">
              {language === 'en' ? 'Login' : 'লগইন'} <ArrowRight className="ml-1 w-3.5 h-3.5" />
            </Link>

            {/* Mobile Menu Toggle */}
            <button 
              className="md:hidden p-2 text-foreground rounded-md hover:bg-muted" 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-20 left-0 w-full bg-background border-b border-border shadow-lg p-4 flex flex-col gap-2">
            <Link href="/features" className="text-sm font-medium hover:text-primary transition-colors py-3 border-b border-border/50" onClick={() => setIsMobileMenuOpen(false)}>
              {language === 'en' ? 'Features' : 'ফিচার্স'}
            </Link>
            <Link href="/pricing" className="text-sm font-medium hover:text-primary transition-colors py-3 border-b border-border/50" onClick={() => setIsMobileMenuOpen(false)}>
              {language === 'en' ? 'Pricing' : 'প্রাইসিং'}
            </Link>
            <Link href="/about" className="text-sm font-medium hover:text-primary transition-colors py-3 border-b border-border/50" onClick={() => setIsMobileMenuOpen(false)}>
              {language === 'en' ? 'About Us' : 'আমাদের সম্পর্কে'}
            </Link>
            <Link href="/faq" className="text-sm font-medium hover:text-primary transition-colors py-3 border-b border-border/50" onClick={() => setIsMobileMenuOpen(false)}>
              {language === 'en' ? 'FAQ' : 'সাধারণ জিজ্ঞাসা'}
            </Link>
            <Link href="/contact" className="text-sm font-medium hover:text-primary transition-colors py-3 border-b border-border/50" onClick={() => setIsMobileMenuOpen(false)}>
              {language === 'en' ? 'Contact' : 'যোগাযোগ'}
            </Link>
            <Link href="/login" className="sm:hidden flex items-center justify-center h-11 rounded-full bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 mt-2 shadow-sm" onClick={() => setIsMobileMenuOpen(false)}>
              {language === 'en' ? 'Login' : 'লগইন'} <ArrowRight className="ml-1 w-4 h-4" />
            </Link>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/50 py-3 lg:py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-4">
            {/* Brand & Address */}
            <div>
              <img src="/logo.png" alt="ZiniChat Logo" className="h-14 w-auto object-contain mb-3" />
              <p className="text-xs text-muted-foreground leading-relaxed mb-3 whitespace-pre-wrap">
                {language === 'en' 
                  ? config?.contactInfo?.address?.en 
                  : (config?.contactInfo?.address?.bn || config?.contactInfo?.address?.en)}
              </p>
              <div className="text-sm font-medium text-foreground">
                {config?.contactInfo?.email && <p>{config.contactInfo.email}</p>}
                {config?.contactInfo?.phone && <p>{config.contactInfo.phone}</p>}
              </div>
            </div>

            {/* Quick Links */}
            <div className="md:col-span-1">
              <h4 className="text-xs font-bold text-foreground mb-3 uppercase tracking-wider">
                {language === 'en' ? 'Quick Links' : 'প্রয়োজনীয় লিংক'}
              </h4>
              <ul className="space-y-2 text-xs text-muted-foreground font-medium">
                <li><Link href="/features" className="hover:text-primary transition-colors">{language === 'en' ? 'Features' : 'ফিচার্স'}</Link></li>
                <li><Link href="/pricing" className="hover:text-primary transition-colors">{language === 'en' ? 'Pricing' : 'প্রাইসিং'}</Link></li>
                <li><Link href="/contact" className="hover:text-primary transition-colors">{language === 'en' ? 'Contact Us' : 'যোগাযোগ'}</Link></li>
              </ul>
            </div>

            {/* Social Links */}
            <div>
              <h4 className="text-xs font-bold text-foreground mb-3 uppercase tracking-wider">
                {language === 'en' ? 'Connect With Us' : 'আমাদের সাথে যুক্ত হোন'}
              </h4>
              <div className="flex flex-wrap gap-2.5">
                {(config?.socialLinksJson?.facebook?.enabled ?? true) && (
                  <a href={config?.socialLinksJson?.facebook?.url || 'https://facebook.com'} target="_blank" rel="noopener noreferrer" title="Facebook" className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:bg-[#1877F2] hover:text-white hover:border-[#1877F2] transition-all shadow-sm">
                    <Facebook className="w-4 h-4" />
                  </a>
                )}
                {(config?.socialLinksJson?.twitter?.enabled ?? true) && (
                  <a href={config?.socialLinksJson?.twitter?.url || 'https://x.com'} target="_blank" rel="noopener noreferrer" title="Twitter / X" className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:bg-[#1DA1F2] hover:text-white hover:border-[#1DA1F2] transition-all shadow-sm">
                    <Twitter className="w-4 h-4" />
                  </a>
                )}
                {(config?.socialLinksJson?.linkedin?.enabled ?? true) && (
                  <a href={config?.socialLinksJson?.linkedin?.url || 'https://linkedin.com'} target="_blank" rel="noopener noreferrer" title="LinkedIn" className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:bg-[#0A66C2] hover:text-white hover:border-[#0A66C2] transition-all shadow-sm">
                    <Linkedin className="w-4 h-4" />
                  </a>
                )}
                {(config?.socialLinksJson?.instagram?.enabled ?? true) && (
                  <a href={config?.socialLinksJson?.instagram?.url || 'https://instagram.com'} target="_blank" rel="noopener noreferrer" title="Instagram" className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:bg-[#E4405F] hover:text-white hover:border-[#E4405F] transition-all shadow-sm">
                    <Instagram className="w-4 h-4" />
                  </a>
                )}
                {(config?.socialLinksJson?.youtube?.enabled ?? true) && (
                  <a href={config?.socialLinksJson?.youtube?.url || 'https://youtube.com'} target="_blank" rel="noopener noreferrer" title="YouTube" className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:bg-[#FF0000] hover:text-white hover:border-[#FF0000] transition-all shadow-sm">
                    <Youtube className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>

          </div>

          <div className="pt-3 border-t border-border flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-[11px] text-muted-foreground font-medium">
              © {new Date().getFullYear()} ZiniChat. {language === 'en' ? 'All rights reserved.' : 'সর্বস্বত্ব সংরক্ষিত।'}
            </p>
            <div className="flex gap-6 text-xs font-bold text-muted-foreground">
              <Link href="/terms" className="hover:text-foreground transition-colors">{language === 'en' ? 'Terms & Conditions' : 'শর্তাবলী'}</Link>
              <Link href="/privacy" className="hover:text-foreground transition-colors">{language === 'en' ? 'Privacy Policy' : 'গোপনীয়তা'}</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
