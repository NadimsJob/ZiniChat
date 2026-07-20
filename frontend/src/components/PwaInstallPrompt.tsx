'use client';

import { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';
import { useLanguage } from '@/components/LanguageProvider';

interface PwaInstallPromptProps {
  type: 'tenant' | 'superadmin';
}

export default function PwaInstallPrompt({ type }: PwaInstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const { language } = useLanguage();

  useEffect(() => {
    // Only show on mobile/tablet view (max-width: 1024px)
    const isMobileOrTablet = window.matchMedia('(max-width: 1024px)').matches;
    
    // Check if the app is already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                         (window.navigator as any).standalone === true;

    if (!isMobileOrTablet || isStandalone) {
      return;
    }

    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  const appName = type === 'tenant' ? 'ZiniChat' : 'ZiniChat Admin';

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-primary text-primary-foreground p-3 shadow-lg flex items-center justify-between border-b border-white/20 animate-in slide-in-from-top duration-300">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white p-1 flex-shrink-0">
          <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
        </div>
        <div className="flex flex-col">
          <span className="text-[14px] font-bold">
            {language === 'en' ? `Install ${appName}` : `${appName} ইন্সটল করুন`}
          </span>
          <span className="text-[11px] text-primary-foreground/80">
            {language === 'en' 
              ? 'Add to home screen for a better experience.' 
              : 'ভালো অভিজ্ঞতার জন্য হোম স্ক্রিনে যোগ করুন।'}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button 
          onClick={handleInstallClick}
          className="bg-white text-primary text-[12px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 hover:bg-slate-100 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          {language === 'en' ? 'Install' : 'ইন্সটল'}
        </button>
        <button 
          onClick={() => setShowPrompt(false)}
          className="text-primary-foreground/60 hover:text-white p-1.5"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
