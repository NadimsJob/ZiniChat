'use client';

import { useLanguage } from '@/components/LanguageProvider';

export default function AboutPage() {
  const { language } = useLanguage();

  return (
    <div className="py-24 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
          {language === 'en' ? 'About Us' : 'আমাদের সম্পর্কে'}
        </h1>
      </div>

      <div className="prose prose-zinc dark:prose-invert prose-lg mx-auto">
        <p>
          {language === 'en' 
            ? 'We are a dedicated team building the next generation omnichannel AI assistant platform for businesses in Bangladesh and globally. Our mission is to democratize AI automation and make it accessible to everyone.' 
            : 'আমরা বাংলাদেশের এবং বিশ্বের অন্যান্য ব্যবসার জন্য পরবর্তী প্রজন্মের অমনিচ্যানেল এআই অ্যাসিস্ট্যান্ট প্ল্যাটফর্ম তৈরি করছি। আমাদের লক্ষ্য হলো এআই অটোমেশনকে সবার জন্য সহজলভ্য করা।'}
        </p>
        <p>
          {language === 'en'
            ? 'With seamless integrations for WhatsApp, Messenger, and Instagram, we help you connect with your customers where they are, automatically handling inquiries 24/7.'
            : 'হোয়াটসঅ্যাপ, মেসেঞ্জার এবং ইনস্টাগ্রামের সাথে সরাসরি যুক্ত হয়ে, আমরা আপনাকে আপনার গ্রাহকদের সাথে সার্বক্ষণিক যোগাযোগ রাখতে এবং স্বয়ংক্রিয়ভাবে সাপোর্ট দিতে সাহায্য করি।'}
        </p>
      </div>
    </div>
  );
}
