'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';
import { 
  X, 
  MessageCircle, 
  Bot, 
  ShoppingBag, 
  CheckCircle2, 
  ChevronRight,
  QrCode,
  Cloud,
  Home,
  Building2,
  Cpu,
  Stethoscope,
  Factory,
  Truck,
  GraduationCap
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function SetupWizardModal({ 
  open, 
  onClose, 
  setupStatus 
}: { 
  open: boolean; 
  onClose: () => void; 
  setupStatus: any 
}) {
  const { language } = useLanguage();
  const router = useRouter();
  
  // Steps: 1 (Channel), 2 (AI), 3 (Products/Vertical)
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // AI Form state
  const [agentName, setAgentName] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [qnas, setQnas] = useState([{ q: '', a: '' }, { q: '', a: '' }]);

  useEffect(() => {
    if (open) {
      // Auto-advance if already done
      if (setupStatus?.hasConnectedChannel && !setupStatus?.hasConfiguredAi) {
        setStep(2);
      } else if (setupStatus?.hasConnectedChannel && setupStatus?.hasConfiguredAi) {
        setStep(3);
      } else {
        setStep(1);
      }
    }
  }, [open, setupStatus]);

  const handleClose = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('zinichat_wizard_seen', 'true');
    }
    onClose();
  };

  const handleSaveAi = async () => {
    if (!agentName.trim()) return toast.error(language === 'en' ? 'Agent Name required' : 'এজেন্টের নাম দিন');
    if (!systemPrompt.trim()) return toast.error(language === 'en' ? 'Persona required' : 'পারসোনা দিন');

    setLoading(true);
    try {
      const token = Cookies.get('access_token');
      
      // Save persona
      const personaRes = await fetch(`${API}/ai-training/persona`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          agentName,
          systemPrompt,
        })
      });

      if (!personaRes.ok) throw new Error('Failed to save AI persona');

      // Save Q&As
      const validQnas = qnas.filter(q => q.q.trim() && q.a.trim());
      for (const qna of validQnas) {
        await fetch(`${API}/ai-training/qna`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ question: qna.q, answer: qna.a })
        });
      }

      toast.success(language === 'en' ? 'AI Trained successfully!' : 'এআই সফলভাবে ট্রেইন করা হয়েছে!');
      setStep(3);
    } catch (error) {
      console.error(error);
      toast.error(language === 'en' ? 'Failed to save AI training' : 'এআই ট্রেইনিং সেভ করতে ব্যর্থ');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const renderVerticalGuide = () => {
    const biz = setupStatus?.businessNature || 'Retail/F-commerce';
    let icon = <ShoppingBag className="w-10 h-10 text-emerald-400 mb-3" />;
    let title = language === 'en' ? 'Add Your Products' : 'পণ্য যোগ করুন';
    let desc = language === 'en' 
      ? 'Add your products here. AI will automatically recognize them and reply to customers instantly!' 
      : 'আপনার পণ্যগুলো এখানে অ্যাড করুন, AI অটোমেটিকালি এখান থেকে প্রোডাক্ট চিনে নিয়ে কাস্টমারকে সঠিক রিপ্লাই দিবে।';
    let btnText = language === 'en' ? '+ Add Products →' : '+ প্রোডাক্ট যোগ করুন →';
    let link = '/dashboard/products';

    if (biz === 'Real Estate') {
      icon = <Building2 className="w-10 h-10 text-emerald-400 mb-3" />;
      title = language === 'en' ? 'Add Properties' : 'প্রপার্টি যোগ করুন';
      desc = language === 'en' 
        ? 'Add your property listings so AI can provide details and schedule viewings.'
        : 'আপনার সম্পত্তি লিস্টিং Add করুন → AI ক্রেতাদের ডিটেইলস দেবে ও viewing schedule করবে।';
      btnText = language === 'en' ? '+ Add Property →' : '+ প্রপার্টি যোগ করুন →';
      link = '/dashboard/products';
    } else if (biz === 'Tech & Software') {
      icon = <Cpu className="w-10 h-10 text-emerald-400 mb-3" />;
      title = language === 'en' ? 'Add Software Plans' : 'সফটওয়্যার প্ল্যান যোগ করুন';
      desc = language === 'en'
        ? 'Add your software plans/packages so AI can book demos and explain plans.'
        : 'আপনার Software Plans/Packages Add করুন → AI Demo Book করতে এবং প্ল্যান ব্যাখ্যা করতে পারবে।';
      btnText = language === 'en' ? '+ Add Software →' : '+ সফটওয়্যার যোগ করুন →';
      link = '/dashboard/products';
    } else if (biz === 'Healthcare') {
      icon = <Stethoscope className="w-10 h-10 text-emerald-400 mb-3" />;
      title = language === 'en' ? 'Add Doctors/Services' : 'সার্ভিস যোগ করুন';
      desc = language === 'en'
        ? 'Add doctors and services so AI can book appointments and provide info.'
        : 'ডাক্তার ও Services Add করুন → AI Appointment বুক করবে ও সেবার তথ্য দেবে।';
      btnText = language === 'en' ? '+ Add Services →' : '+ সার্ভিস যোগ করুন →';
      link = '/dashboard/products';
    } else if (biz === 'Education') {
      icon = <GraduationCap className="w-10 h-10 text-emerald-400 mb-3" />;
      title = language === 'en' ? 'Add Courses' : 'কোর্স যোগ করুন';
      desc = language === 'en'
        ? 'Add your courses so AI can provide details to students.'
        : 'আপনার কোর্সগুলো Add করুন → AI স্টুডেন্টদের কোর্সের বিস্তারিত জানাতে পারবে।';
      btnText = language === 'en' ? '+ Add Courses →' : '+ কোর্স যোগ করুন →';
      link = '/dashboard/products';
    } else if (biz === 'Hospitality') {
      icon = <Home className="w-10 h-10 text-emerald-400 mb-3" />;
      title = language === 'en' ? 'Add Rooms/Packages' : 'রুম/প্যাকেজ যোগ করুন';
      desc = language === 'en'
        ? 'Add your rooms or packages so AI can assist with bookings.'
        : 'আপনার রুম বা প্যাকেজগুলো Add করুন → AI বুকিং নিতে সাহায্য করবে।';
      btnText = language === 'en' ? '+ Add Rooms →' : '+ রুম যোগ করুন →';
      link = '/dashboard/products';
    }

    return (
      <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-6 text-center mt-6">
        <div className="flex justify-center">{icon}</div>
        <h4 className="text-lg font-bold text-white mb-2">{title}</h4>
        <p className="text-sm text-zinc-400 mb-6 max-w-md mx-auto">{desc}</p>
        <button
          onClick={() => {
            handleClose();
            router.push(link);
          }}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
        >
          {btnText}
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative bg-surface border border-surface-hover w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-surface-hover flex items-center justify-between bg-surface-hover/30">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              {language === 'en' ? '🎯 Quick Setup Guide' : '🎯 কুইক সেটআপ গাইড'}
            </h2>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex gap-1">
                {[1, 2, 3].map(i => (
                  <div key={i} className={`w-8 h-1.5 rounded-full ${step >= i ? 'bg-primary' : 'bg-surface-hover'}`} />
                ))}
              </div>
              <span className="text-xs text-muted-foreground ml-2">Step {step} of 3</span>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-surface-hover rounded-lg text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[75vh] overflow-y-auto">
          
          {/* STEP 1: Connect Channel */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/20 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">
                  {language === 'en' ? 'Connect Your First Channel' : 'আপনার প্রথম চ্যানেল কানেক্ট করুন'}
                </h3>
                <p className="text-muted-foreground">
                  {language === 'en' ? 'Choose how you want to connect WhatsApp:' : 'হোয়াটসঅ্যাপ কীভাবে কানেক্ট করতে চান বেছে নিন:'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => { handleClose(); router.push('/dashboard/settings/inboxes/new?type=whatsapp_qr'); }}
                  className="bg-surface-hover/30 border border-surface-hover hover:border-primary hover:bg-primary/5 rounded-xl p-5 text-left transition-all group"
                >
                  <QrCode className="w-8 h-8 text-emerald-500 mb-3" />
                  <h4 className="font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
                    {language === 'en' ? 'WhatsApp QR' : 'হোয়াটসঅ্যাপ কিউআর (QR)'}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {language === 'en' ? 'Quick & easy setup. Link via WhatsApp Web QR code.' : 'দ্রুত এবং সহজ সেটআপ। হোয়াটসঅ্যাপ ওয়েব কিউআর কোড দিয়ে লিংক করুন।'}
                  </p>
                </button>

                <button
                  onClick={() => { handleClose(); router.push('/dashboard/settings/inboxes/new?type=whatsapp'); }}
                  className="bg-surface-hover/30 border border-surface-hover hover:border-primary hover:bg-primary/5 rounded-xl p-5 text-left transition-all group"
                >
                  <Cloud className="w-8 h-8 text-blue-500 mb-3" />
                  <h4 className="font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
                    {language === 'en' ? 'Meta Cloud API' : 'মেটা ক্লাউড এপিআই'}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {language === 'en' ? 'Business grade connection for high volume messaging.' : 'বেশি মেসেজ আদান-প্রদানের জন্য অফিশিয়াল মেটা কানেকশন।'}
                  </p>
                </button>
              </div>

              <div className="flex items-center justify-between pt-4">
                <button onClick={() => setStep(2)} className="text-sm text-muted-foreground hover:text-foreground">
                  {language === 'en' ? 'Skip for now' : 'এখনকার মত স্কিপ করুন'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Train AI */}
          {step === 2 && (
            <div className="space-y-6">
               <div className="text-center">
                <div className="w-16 h-16 bg-blue-500/20 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Bot className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">
                  {language === 'en' ? 'Train Your AI Assistant' : 'আপনার এআই ট্রেইন করুন'}
                </h3>
                <p className="text-muted-foreground">
                  {language === 'en' ? "Give your AI an identity and define how it should talk." : "আপনার এআই-কে একটি নাম দিন এবং সে কীভাবে কথা বলবে তা ঠিক করুন।"}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">
                    {language === 'en' ? 'Agent Name *' : 'এজেন্টের নাম *'}
                  </label>
                  <input
                    type="text"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    placeholder={language === 'en' ? 'e.g. Sarah from ZiniChat' : 'উদাঃ সারাহ, কাস্টমার সাপোর্ট'}
                    className="w-full bg-background border border-surface-hover rounded-lg px-3 py-2 text-foreground focus:border-primary outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">
                    {language === 'en' ? 'Business Description (Persona) *' : 'ব্যবসার বিবরণ (পারসোনা) *'}
                  </label>
                  <textarea
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    rows={4}
                    placeholder={language === 'en' ? 'Describe your business, products, and how the AI should behave...' : 'আপনার ব্যবসা এবং এআই কীভাবে কাস্টমারদের সাথে কথা বলবে তা বর্ণনা করুন...'}
                    className="w-full bg-background border border-surface-hover rounded-lg px-3 py-2 text-foreground focus:border-primary outline-none resize-none"
                  />
                  <div className="text-right mt-1 text-xs text-muted-foreground">
                    {systemPrompt.length} chars
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground">
                    {language === 'en' ? 'Add Quick Q&A (Optional)' : 'কুইক প্রশ্ন ও উত্তর যোগ করুন (অপশনাল)'}
                  </label>
                  {qnas.map((qna, idx) => (
                    <div key={idx} className="bg-surface-hover/30 p-3 rounded-lg border border-surface-hover mb-3 space-y-2">
                      <input
                        type="text"
                        value={qna.q}
                        onChange={(e) => {
                          const newQnas = [...qnas];
                          newQnas[idx].q = e.target.value;
                          setQnas(newQnas);
                        }}
                        placeholder={language === 'en' ? 'Question (e.g. Do you have delivery?)' : 'প্রশ্ন (উদাঃ আপনাদের ডেলিভারি আছে?)'}
                        className="w-full bg-background border border-surface-hover rounded-md px-3 py-1.5 text-sm text-foreground focus:border-primary outline-none"
                      />
                      <input
                        type="text"
                        value={qna.a}
                        onChange={(e) => {
                          const newQnas = [...qnas];
                          newQnas[idx].a = e.target.value;
                          setQnas(newQnas);
                        }}
                        placeholder={language === 'en' ? 'Answer (e.g. Yes, nationwide delivery available)' : 'উত্তর (উদাঃ হ্যাঁ, সারাদেশে ডেলিভারি দেওয়া হয়)'}
                        className="w-full bg-background border border-surface-hover rounded-md px-3 py-1.5 text-sm text-foreground focus:border-primary outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button onClick={() => setStep(3)} className="text-sm text-muted-foreground hover:text-foreground">
                  {language === 'en' ? 'Skip for now' : 'এখনকার মত স্কিপ করুন'}
                </button>
                <button
                  onClick={handleSaveAi}
                  disabled={loading}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? (language === 'en' ? 'Saving...' : 'সেভ হচ্ছে...') : (language === 'en' ? 'Save & Continue →' : 'সেভ করুন ও এগিয়ে যান →')}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Check Inbox & Vertical Guide */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-emerald-500/20 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">
                  {language === 'en' ? 'You are almost there!' : 'আপনি প্রায় তৈরি!'}
                </h3>
                <p className="text-muted-foreground">
                  {language === 'en' ? "Complete the final step based on your business type." : "আপনার ব্যবসার ধরন অনুযায়ী শেষ ধাপটি সম্পন্ন করুন।"}
                </p>
              </div>

              {renderVerticalGuide()}

              <div className="mt-8 border-t border-surface-hover pt-6">
                <p className="text-sm text-muted-foreground text-center mb-4">
                  {language === 'en' ? 'Or, go straight to your inbox to see live messages:' : 'অথবা, সরাসরি ইনবক্সে গিয়ে লাইভ মেসেজ দেখতে পারেন:'}
                </p>
                <button
                  onClick={() => { handleClose(); router.push('/dashboard/inbox'); }}
                  className="w-full bg-surface-hover hover:bg-surface-hover/80 text-foreground border border-surface-hover px-6 py-3 rounded-xl font-medium transition-colors flex justify-center items-center gap-2 group"
                >
                  <span>{language === 'en' ? 'Open Live Inbox' : 'লাইভ ইনবক্স খুলুন'}</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
