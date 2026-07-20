'use client';
import { useLanguage } from '@/components/LanguageProvider';
import { useState } from 'react';
import axios from 'axios';
import { Mail, MessageCircle, MapPin, Clock } from 'lucide-react';

export default function ContactPage() {
  const { language } = useLanguage();
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const subjects = [
    { id: 'sales', en: 'Sales Inquiry', bn: 'সেলস ইনকোয়ারি' },
    { id: 'support', en: 'Technical Support', bn: 'টেকনিক্যাল সাপোর্ট' },
    { id: 'partnership', en: 'Partnership', bn: 'পার্টনারশিপ' },
    { id: 'demo', en: 'Demo Request', bn: 'ডেমো রিকোয়েস্ট' },
    { id: 'other', en: 'Other', bn: 'অন্যান্য' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/inquiries`, formData);
      setSuccess(true);
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (err) {
      console.error(err);
      setError(language === 'en' ? 'Failed to send message. Please try again.' : 'মেসেজ পাঠাতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center overflow-hidden">
      {/* Hero */}
      <section className="w-full relative py-20 px-4">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-bold mb-6">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            {language === 'en' ? 'Get in Touch' : 'যোগাযোগ করুন'}
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight mb-6">
            {language === 'en' ? (
              <>Let's Talk <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Business</span></>
            ) : (
              <><span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">যোগাযোগ করুন</span> আমাদের সাথে</>
            )}
          </h1>
          <p className="text-lg md:text-xl text-zinc-500 max-w-2xl mx-auto leading-relaxed">
            {language === 'en'
              ? 'Have questions about pricing, features, or integrations? Our team is ready to help.'
              : 'প্রাইসিং, ফিচার বা ইন্টিগ্রেশন সম্পর্কে প্রশ্ন আছে? আমাদের দল সাহায্য করতে প্রস্তুত।'}
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-24">
        <div className="grid lg:grid-cols-5 gap-12 lg:gap-8 items-start">
          
          {/* Left Column: Info Cards */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            
            <div className="p-8 rounded-3xl bg-surface border border-surface-hover hover:border-primary/30 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <MessageCircle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">{language === 'en' ? 'Chat with us' : 'আমাদের সাথে চ্যাট করুন'}</h3>
              <p className="text-zinc-500 text-sm mb-4">{language === 'en' ? 'Fastest way to reach us. Talk to our AI or human agents.' : 'আমাদের সাথে যোগাযোগের দ্রুততম উপায়। AI বা মানব এজেন্টের সাথে কথা বলুন।'}</p>
              <a href="#" className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:text-primary/80 transition-colors">
                {language === 'en' ? 'Start WhatsApp Chat' : 'হোয়াটসঅ্যাপ চ্যাট শুরু করুন'} →
              </a>
            </div>

            <div className="p-8 rounded-3xl bg-surface border border-surface-hover hover:border-blue-500/30 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Mail className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">{language === 'en' ? 'Email Support' : 'ইমেইল সাপোর্ট'}</h3>
              <p className="text-zinc-500 text-sm mb-4">{language === 'en' ? 'For technical issues and detailed inquiries.' : 'টেকনিক্যাল সমস্যা এবং বিস্তারিত অনুসন্ধানের জন্য।'}</p>
              <a href="mailto:support@zinichat.com" className="inline-flex items-center gap-2 text-sm font-bold text-blue-500 hover:text-blue-500/80 transition-colors">
                support@zinichat.com →
              </a>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="p-6 rounded-3xl bg-surface border border-surface-hover flex flex-col gap-4">
                <MapPin className="w-6 h-6 text-orange-500" />
                <div>
                  <h4 className="font-bold text-sm mb-1">{language === 'en' ? 'Office' : 'অফিস'}</h4>
                  <p className="text-xs text-zinc-500">{language === 'en' ? 'Dhaka, Bangladesh' : 'ঢাকা, বাংলাদেশ'}</p>
                </div>
              </div>
              <div className="p-6 rounded-3xl bg-surface border border-surface-hover flex flex-col gap-4">
                <Clock className="w-6 h-6 text-teal-500" />
                <div>
                  <h4 className="font-bold text-sm mb-1">{language === 'en' ? 'Hours' : 'সময়সূচী'}</h4>
                  <p className="text-xs text-zinc-500">{language === 'en' ? '9 AM - 6 PM (Sun-Thu)' : 'সকাল ৯টা - সন্ধ্যা ৬টা (রবি-বৃহস্পতি)'}</p>
                </div>
              </div>
            </div>
            
          </div>

          {/* Right Column: Contact Form */}
          <div className="lg:col-span-3">
            <div className="p-8 md:p-12 rounded-3xl bg-gradient-to-br from-surface to-background border border-surface-hover shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
              
              <h3 className="text-2xl font-bold mb-8 relative z-10">{language === 'en' ? 'Send us a message' : 'আমাদের মেসেজ পাঠান'}</h3>
              
              {success ? (
                <div className="text-center py-16 relative z-10 animate-in fade-in zoom-in duration-500">
                  <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-3xl font-bold mb-3">{language === 'en' ? 'Message Sent Successfully!' : 'মেসেজ সফলভাবে পাঠানো হয়েছে!'}</h2>
                  <p className="text-zinc-500 mb-8 max-w-sm mx-auto">{language === 'en' ? 'Thank you for reaching out. Our team will review your message and get back to you shortly.' : 'যোগাযোগ করার জন্য ধন্যবাদ। আমাদের দল আপনার মেসেজটি দেখবে এবং শীঘ্রই যোগাযোগ করবে।'}</p>
                  <button onClick={() => setSuccess(false)} className="px-8 py-3 bg-surface border border-surface-hover hover:border-primary/30 rounded-full text-sm font-bold transition-all">
                    {language === 'en' ? 'Send Another Message' : 'আরেকটি মেসেজ পাঠান'}
                  </button>
                </div>
              ) : (
                <form className="space-y-6 relative z-10" onSubmit={handleSubmit}>
                  {error && <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-sm font-medium">{error}</div>}
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                        {language === 'en' ? 'Full Name' : 'পুরো নাম'}
                      </label>
                      <input 
                        type="text" 
                        required
                        placeholder={language === 'en' ? 'John Doe' : 'আপনার নাম'}
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-background border border-surface-hover rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                        {language === 'en' ? 'Work Email' : 'ইমেইল'}
                      </label>
                      <input 
                        type="email" 
                        required
                        placeholder="john@company.com"
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        className="w-full bg-background border border-surface-hover rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                      {language === 'en' ? 'Subject' : 'বিষয়'}
                    </label>
                    <div className="relative">
                      <select
                        required
                        value={formData.subject}
                        onChange={e => setFormData({ ...formData, subject: e.target.value })}
                        className="w-full bg-background border border-surface-hover rounded-xl px-4 py-3.5 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                      >
                        <option value="" disabled>{language === 'en' ? 'Select a topic' : 'একটি বিষয় নির্বাচন করুন'}</option>
                        {subjects.map(s => (
                          <option key={s.id} value={s.id}>{language === 'en' ? s.en : s.bn}</option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 flex justify-between">
                      <span>{language === 'en' ? 'Message' : 'মেসেজ'}</span>
                      <span className="font-normal opacity-50">{formData.message.length}/500</span>
                    </label>
                    <textarea 
                      rows={5} 
                      required
                      maxLength={500}
                      placeholder={language === 'en' ? 'How can we help you?' : 'আমরা আপনাকে কীভাবে সাহায্য করতে পারি?'}
                      value={formData.message}
                      onChange={e => setFormData({ ...formData, message: e.target.value })}
                      className="w-full bg-background border border-surface-hover rounded-xl px-4 py-3.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                    />
                  </div>
                  
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-secondary text-white font-bold py-4 rounded-xl hover:opacity-90 transition-all shadow-glow disabled:opacity-70 disabled:cursor-not-allowed group"
                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    ) : (
                      <>
                        {language === 'en' ? 'Send Message' : 'মেসেজ পাঠান'}
                        <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
