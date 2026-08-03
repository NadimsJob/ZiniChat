'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import { Download, X, Share, PlusSquare } from 'lucide-react';

export default function PwaInstallBanner() {
  const { language } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  const t = (en: string, bn: string) => language === 'en' ? en : bn;

  useEffect(() => {
    // Check if window exists (client-side)
    if (typeof window === 'undefined') return;

    // Detect if already installed (standalone mode)
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true;

    if (isStandalone) return;

    const isDismissed = localStorage.getItem('pwa_banner_dismissed') === 'true';
    if (isDismissed) return;

    // 1. Android/Chrome prompt interception
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 2. iOS detection
    const ua = window.navigator.userAgent;
    const isIosDevice = /iphone|ipad|ipod/i.test(ua);
    
    if (isIosDevice) {
      setIsIOS(true);
      setShowBanner(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowBanner(false);
      localStorage.setItem('pwa_banner_dismissed', 'true');
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('pwa_banner_dismissed', 'true');
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:hidden animate-in slide-in-from-bottom-5 duration-500">
      <div className="bg-surface/90 backdrop-blur-xl border border-border/80 rounded-2xl p-4 shadow-2xl max-w-md mx-auto relative overflow-hidden bg-slate-900/90">
        {/* Top Glow Accent */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary via-orange-500 to-primary" />
        
        {/* Dismiss Button */}
        <button 
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-slate-400 hover:text-foreground transition-colors p-1 rounded-full hover:bg-white/10"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex gap-3 pr-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Download className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h4 className="font-bold text-foreground text-[14px]">
              {t('Install ZiniChat App', 'জিনিচ্যাট অ্যাপ ইনস্টল করুন')}
            </h4>
            
            {isIOS ? (
              <div className="text-[12px] text-slate-400 mt-1 leading-relaxed space-y-1">
                <p>
                  {t('To install on iOS:', 'আইওএস-এ ইনস্টল করতে:')}
                </p>
                <div className="flex items-center gap-1 flex-wrap">
                  <span>{t('1. Tap the Share button', '১. শেয়ার আইকনে')}</span>
                  <Share className="w-3.5 h-3.5 text-primary inline mx-0.5" />
                  <span>{t('at the bottom.', 'ট্যাপ করুন।')}</span>
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  <span>{t('2. Select', '২. তারপর')}</span>
                  <strong className="text-foreground">'{t('Add to Home Screen', 'Add to Home Screen')}'</strong>
                  <PlusSquare className="w-3.5 h-3.5 text-primary inline mx-0.5" />
                  <span>{t('option.', 'অপশনটি সিলেক্ট করুন।')}</span>
                </div>
              </div>
            ) : (
              <>
                <p className="text-[12px] text-slate-400 mt-1">
                  {t('Access our dashboard instantly from your home screen with a single tap.', 'যেকোনো সময় হোম স্ক্রিন থেকে এক ক্লিকে সরাসরি ড্যাশবোর্ড অ্যাক্সেস করুন।')}
                </p>
                <button
                  onClick={handleInstallClick}
                  className="mt-3 flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold py-1.5 px-4 rounded-xl text-[12px] shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 active:translate-y-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  {t('Install Now', 'এখনই ইনস্টল করুন')}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
