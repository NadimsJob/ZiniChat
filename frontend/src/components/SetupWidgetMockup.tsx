'use client';

import { useEffect, useState, useRef } from 'react';
import { CheckCircle2, PlayCircle, Timer, MousePointer2, Loader2, Circle } from 'lucide-react';
import Link from 'next/link';

export default function SetupWidgetMockup({ language }: { language: string }) {
  const [step, setStep] = useState(0);
  const [isClicking, setIsClicking] = useState(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const playSequence = () => {
      // Step 0: Initial state, cursor moves to Facebook (1s)
      setStep(0);
      
      timeoutId = setTimeout(() => {
        // Click Facebook
        setIsClicking(true);
        setTimeout(() => {
          setIsClicking(false);
          setStep(1); // Facebook checked, cursor moves to WA
          
          timeoutId = setTimeout(() => {
            // Click WA
            setIsClicking(true);
            setTimeout(() => {
              setIsClicking(false);
              setStep(2); // WA checked, cursor moves to AI
              
              timeoutId = setTimeout(() => {
                // Click AI
                setIsClicking(true);
                setTimeout(() => {
                  setIsClicking(false);
                  setStep(3); // AI checked, Status Live
                  
                  // Wait at end, then loop
                  timeoutId = setTimeout(playSequence, 4000);
                }, 200);
              }, 1200);
            }, 200);
          }, 1200);
        }, 200);
      }, 1500);
    };

    playSequence();

    return () => clearTimeout(timeoutId);
  }, []);

  // Cursor positions for each step
  const getCursorStyle = () => {
    switch(step) {
      case 0: return { transform: 'translate(40px, 95px)' }; // Over Facebook
      case 1: return { transform: 'translate(40px, 130px)' }; // Over WA
      case 2: return { transform: 'translate(40px, 165px)' }; // Over AI
      case 3: return { transform: 'translate(180px, 220px)', opacity: 0 }; // Hide away
      default: return { transform: 'translate(40px, 95px)' };
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto mt-12 mb-4 relative z-10 animate-fade-in-up">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/30 to-secondary/30 blur-3xl -z-10 rounded-full" />
      <div className="bg-surface/80 backdrop-blur-xl border border-border rounded-3xl p-1 shadow-2xl overflow-hidden">
        <div className="bg-background rounded-[1.35rem] p-6 sm:p-8 relative overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
          
          <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-10">
            <div className="flex-1 space-y-4 text-center sm:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 text-red-500 text-xs font-bold uppercase tracking-wider mb-2">
                <Timer className="w-4 h-4 animate-pulse" />
                {language === 'en' ? '2-Minute Setup' : '২-মিনিট সেটআপ'}
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-foreground leading-tight">
                {language === 'en' ? 'Run your AI Assistant instantly!' : 'আপনার এআই অ্যাসিস্ট্যান্ট চালু করুন মুহূর্তেই!'}
              </h3>
              <p className="text-muted-foreground text-sm sm:text-base">
                {language === 'en' 
                  ? 'No coding required. Just connect your page, click a button, and your AI is ready to sell.' 
                  : 'কোনো কোডিংয়ের ঝামেলা নেই। পেজ কানেক্ট করুন, এক ক্লিকেই এআই রেডি!'}
              </p>
              
              <div className="pt-2">
                <Link href="/signup" className="inline-flex items-center justify-center gap-2 bg-foreground text-background hover:bg-foreground/90 transition-all px-6 py-3 rounded-xl font-bold shadow-lg shadow-black/10">
                  <PlayCircle className="w-5 h-5 text-primary" />
                  {language === 'en' ? 'Start Setup Now' : 'এখনই সেটআপ শুরু করুন'}
                </Link>
              </div>
            </div>

            {/* Widget Mockup Graphic */}
            <div className="w-full sm:w-[280px] shrink-0 relative perspective-1000">
              <div className="w-full bg-card border border-border rounded-2xl p-4 shadow-xl rotate-y-[-10deg] rotate-x-[5deg] hover:rotate-0 transition-transform duration-500 ease-out relative overflow-hidden">
                
                {/* Animated Cursor */}
                <div 
                  className={`absolute z-50 pointer-events-none transition-all duration-700 ease-in-out ${isClicking ? 'scale-75 text-primary' : 'scale-100 text-slate-800 dark:text-white'}`}
                  style={{ ...getCursorStyle(), width: '24px', height: '24px' }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-md">
                    <path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>
                    <path d="m13 13 6 6"/>
                  </svg>
                </div>

                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border/50">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-500 ${step === 3 ? 'bg-primary/20 text-primary' : 'bg-slate-100 dark:bg-zinc-800 text-slate-400'}`}>
                    {step === 3 ? <CheckCircle2 className="w-6 h-6 animate-in zoom-in" /> : <Timer className="w-6 h-6" />}
                  </div>
                  <div>
                    <div className="font-bold text-sm">{language === 'en' ? 'Setup Complete' : 'সেটআপ সম্পন্ন'}</div>
                    <div className="text-xs text-muted-foreground transition-all duration-500">{step === 3 ? '100% Ready' : `${Math.round((step/3)*100)}% Ready`}</div>
                  </div>
                </div>
                
                <div className="space-y-3 relative">
                  {/* Item 1 */}
                  <div className={`flex items-center gap-2 text-xs font-medium transition-all duration-300 ${step >= 1 ? 'text-foreground' : 'text-slate-400'}`}>
                    <div className="w-4 h-4 flex items-center justify-center relative">
                      {step >= 1 ? <CheckCircle2 className="w-4 h-4 text-emerald-500 absolute animate-in zoom-in duration-300" /> : <Circle className="w-4 h-4 text-slate-300 absolute" />}
                    </div>
                    Connect Facebook
                  </div>
                  
                  {/* Item 2 */}
                  <div className={`flex items-center gap-2 text-xs font-medium transition-all duration-300 ${step >= 2 ? 'text-foreground' : 'text-slate-400'}`}>
                    <div className="w-4 h-4 flex items-center justify-center relative">
                      {step >= 2 ? <CheckCircle2 className="w-4 h-4 text-emerald-500 absolute animate-in zoom-in duration-300" /> : <Circle className="w-4 h-4 text-slate-300 absolute" />}
                    </div>
                    Connect WhatsApp
                  </div>
                  
                  {/* Item 3 */}
                  <div className={`flex items-center gap-2 text-xs font-medium transition-all duration-300 ${step >= 3 ? 'text-foreground' : 'text-slate-400'}`}>
                    <div className="w-4 h-4 flex items-center justify-center relative">
                      {step >= 3 ? <CheckCircle2 className="w-4 h-4 text-emerald-500 absolute animate-in zoom-in duration-300" /> : <Circle className="w-4 h-4 text-slate-300 absolute" />}
                    </div>
                    Train AI Bot
                  </div>
                </div>
                
                <div className="mt-5 pt-3 border-t border-border/50 flex justify-between items-center">
                  <span className="text-[10px] text-muted-foreground font-semibold">STATUS</span>
                  {step === 3 ? (
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-md font-bold flex items-center gap-1 animate-in fade-in zoom-in duration-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> LIVE
                    </span>
                  ) : (
                    <span className="text-[10px] bg-slate-100 dark:bg-zinc-800 text-slate-500 px-2 py-1 rounded-md font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> PENDING
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
