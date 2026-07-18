'use client';
import { useLanguage } from '@/components/LanguageProvider';
import { useState } from 'react';
import axios from 'axios';

export default function ContactPage() {
  const { language } = useLanguage();
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/inquiries`, formData);
      setSuccess(true);
      setFormData({ name: '', email: '', message: '' });
    } catch (err) {
      console.error(err);
      setError(language === 'en' ? 'Failed to send message. Please try again.' : 'মেসেজ পাঠাতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="py-24 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
          {language === 'en' ? 'Contact Us' : 'যোগাযোগ করুন'}
        </h1>
        <p className="mt-4 text-xl text-zinc-500">
          {language === 'en' ? 'We would love to hear from you.' : 'আমরা আপনার কথা শুনতে চাই।'}
        </p>
      </div>

      <div className="bg-surface border border-surface-hover p-8 rounded-3xl shadow-lg">
        {success ? (
          <div className="text-center py-10">
            <div className="w-16 h-16 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">{language === 'en' ? 'Message Sent!' : 'মেসেজ পাঠানো হয়েছে!'}</h2>
            <p className="text-zinc-500 mb-6">{language === 'en' ? 'Thank you for reaching out. We will get back to you shortly.' : 'যোগাযোগ করার জন্য ধন্যবাদ। আমরা শীঘ্রই আপনার সাথে যোগাযোগ করব।'}</p>
            <button onClick={() => setSuccess(false)} className="px-6 py-2 bg-surface-hover hover:bg-zinc-800 rounded-full text-sm font-medium transition-colors">
              {language === 'en' ? 'Send Another Message' : 'আরেকটি মেসেজ পাঠান'}
            </button>
          </div>
        ) : (
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-sm">{error}</div>}
            <div>
              <label className="block text-sm font-medium mb-2">
                {language === 'en' ? 'Name' : 'নাম'}
              </label>
              <input 
                type="text" 
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-background border border-surface-hover rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary/50 transition-all" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                {language === 'en' ? 'Email' : 'ইমেইল'}
              </label>
              <input 
                type="email" 
                required
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-background border border-surface-hover rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary/50 transition-all" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                {language === 'en' ? 'Message' : 'মেসেজ'}
              </label>
              <textarea 
                rows={5} 
                required
                value={formData.message}
                onChange={e => setFormData({ ...formData, message: e.target.value })}
                className="w-full bg-background border border-surface-hover rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary/50 transition-all"
              ></textarea>
            </div>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-primary to-secondary text-white font-bold py-4 rounded-xl hover:opacity-90 transition-all shadow-glow disabled:opacity-50"
            >
              {isSubmitting ? (language === 'en' ? 'Sending...' : 'পাঠানো হচ্ছে...') : (language === 'en' ? 'Send Message' : 'মেসেজ পাঠান')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
