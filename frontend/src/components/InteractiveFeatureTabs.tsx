'use client';

import { useLanguage } from '@/components/LanguageProvider';
import * as LucideIcons from 'lucide-react';

const colorThemeMap: Record<string, any> = {
  green: { color: 'from-green-500/20 to-emerald-500/20', iconColor: 'text-green-500', borderHover: 'hover:border-green-500/40', glowColor: 'shadow-green-500/10' },
  blue: { color: 'from-blue-500/20 to-cyan-500/20', iconColor: 'text-blue-500', borderHover: 'hover:border-blue-500/40', glowColor: 'shadow-blue-500/10' },
  orange: { color: 'from-orange-500/20 to-amber-500/20', iconColor: 'text-orange-500', borderHover: 'hover:border-orange-500/40', glowColor: 'shadow-orange-500/10' },
  purple: { color: 'from-purple-500/20 to-violet-500/20', iconColor: 'text-purple-500', borderHover: 'hover:border-purple-500/40', glowColor: 'shadow-purple-500/10' },
  teal: { color: 'from-teal-500/20 to-cyan-500/20', iconColor: 'text-teal-500', borderHover: 'hover:border-teal-500/40', glowColor: 'shadow-teal-500/10' },
  pink: { color: 'from-pink-500/20 to-rose-500/20', iconColor: 'text-pink-500', borderHover: 'hover:border-pink-500/40', glowColor: 'shadow-pink-500/10' },
};

export function processFeatures(rawFeatures: any[]) {
  if (!rawFeatures || !Array.isArray(rawFeatures)) return [];
  return rawFeatures.map(f => {
    const theme = colorThemeMap[f.colorTheme || 'blue'] || colorThemeMap['blue'];
    const IconComponent = (LucideIcons as any)[f.iconName || 'Star'] || LucideIcons.Star;
    return {
      id: f.id || 'feature',
      icon: <IconComponent className="w-8 h-8" strokeWidth={1.5} />,
      title: f.title || { en: '', bn: '' },
      description: f.description || { en: '', bn: '' },
      bullets: f.bullets || { en: [], bn: [] },
      ...theme
    };
  });
}

export function FeatureMockup({ featureId, language, iconColor, color }: { featureId: string; language: string; iconColor: string; color: string }) {
  if (featureId === 'ai') return (
    <div className="space-y-2 text-xs">
      <div className="flex items-center gap-2 p-2 bg-surface rounded-lg border border-surface-hover">
        <div className="w-6 h-6 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center text-[10px]">AI</div>
        <div className="flex-1"><div className="h-2 bg-green-500/30 rounded w-3/4" /></div>
      </div>
      <div className="p-2 bg-surface-hover rounded-lg text-zinc-500 text-[10px]">
        {language === 'en' ? '✓ Knowledge base trained • 142 Q&A pairs' : '✓ নলেজ বেস ট্রেইন্ড • ১৪২টি Q&A পেয়ার'}
      </div>
      <div className="p-2 bg-primary/10 border border-primary/20 rounded-lg text-[10px] text-primary font-medium">
        {language === 'en' ? 'AI is active — responding in 1.2s avg' : 'AI অ্যাক্টিভ — গড়ে ১.২ সেকেন্ডে রেসপন্স'}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2 bg-surface rounded-lg text-center border border-surface-hover">
          <div className="text-lg font-bold text-green-500">98%</div>
          <div className="text-[9px] text-zinc-500">{language === 'en' ? 'Accuracy' : 'নির্ভুলতা'}</div>
        </div>
        <div className="p-2 bg-surface rounded-lg text-center border border-surface-hover">
          <div className="text-lg font-bold text-secondary">2.4k</div>
          <div className="text-[9px] text-zinc-500">{language === 'en' ? 'Msgs Handled' : 'মেসেজ হ্যান্ডেল'}</div>
        </div>
      </div>
    </div>
  );

  if (featureId === 'inbox') return (
    <div className="space-y-2 text-xs">
      {['WA +8801711...', 'FB Messenger', 'Instagram DM'].map((ch, i) => (
        <div key={i} className="flex items-center gap-2 p-2 bg-surface rounded-lg border border-surface-hover">
          <div className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-green-500' : i === 1 ? 'bg-blue-500' : 'bg-pink-500'}`} />
          <span className="text-zinc-400 flex-1">{ch}</span>
          <span className={`text-[10px] font-bold ${i === 0 ? 'text-green-500' : 'text-zinc-500'}`}>{i === 0 ? (language === 'en' ? 'Active' : 'অ্যাক্টিভ') : (language === 'en' ? 'Connected' : 'সংযুক্ত')}</span>
        </div>
      ))}
      <div className="mt-3 p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-[10px] text-blue-400">
        {language === 'en' ? '📨 3 new messages in unified inbox' : '📨 ইউনিফাইড ইনবক্সে ৩টি নতুন মেসেজ'}
      </div>
    </div>
  );

  if (featureId === 'whatsapp_api') return (
    <div className="space-y-2 text-xs">
      <div className="flex items-center gap-2 p-2 bg-[#075E54]/10 border border-[#075E54]/20 rounded-lg">
        <span className="text-[#25D366] font-bold text-[14px]">💬</span>
        <div className="flex-1">
          <div className="font-bold text-[#25D366]">WhatsApp Cloud API</div>
          <div className="text-[10px] text-zinc-400">{language === 'en' ? 'Official Meta Integration' : 'অফিসিয়াল মেটা ইন্টিগ্রেশন'}</div>
        </div>
      </div>
      <div className="p-2.5 bg-surface rounded-lg border border-surface-hover space-y-1.5">
        <div className="flex justify-between text-[9px] text-zinc-500">
          <span>{language === 'en' ? 'Phone ID:' : 'ফোন আইডি:'} 109843...</span>
          <span className="text-green-500 font-bold">{language === 'en' ? 'Verified' : 'ভেরিফাইড'}</span>
        </div>
        <div className="h-1.5 bg-zinc-700 rounded w-full" />
        <div className="h-1.5 bg-zinc-700 rounded w-2/3" />
      </div>
      <div className="p-2 bg-green-500/10 border border-green-500/20 rounded-lg text-[10px] text-green-400 text-center">
        {language === 'en' ? '⚡ Unlimited official outbound broadcasts allowed' : '⚡ আনলিমিটেড অফিশিয়াল ব্রডকাস্ট অনুমোদন'}
      </div>
    </div>
  );

  if (featureId === 'messenger_api') return (
    <div className="space-y-2 text-xs">
      <div className="flex items-center gap-2 p-2 bg-[#0084FF]/10 border border-[#0084FF]/20 rounded-lg">
        <span className="text-[#0084FF] font-bold text-[14px]">🔵</span>
        <div className="flex-1">
          <div className="font-bold text-[#0084FF]">Meta Messenger</div>
          <div className="text-[10px] text-zinc-400">{language === 'en' ? 'Direct Page Connection' : 'সরাসরি পেজ কানেকশন'}</div>
        </div>
      </div>
      <div className="p-2.5 bg-surface rounded-lg border border-surface-hover space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-[10px] text-white">M</div>
          <span className="font-medium text-zinc-300">StyleHub Page</span>
        </div>
        <p className="text-[10px] text-zinc-500 mt-1">
          {language === 'en' ? '✓ Auto-synced Webhooks active' : '✓ অটো-সিঙ্কড ওয়েব হুক একটিভ'}
        </p>
      </div>
    </div>
  );

  if (featureId === 'instagram_api') return (
    <div className="space-y-2 text-xs">
      <div className="flex items-center gap-2 p-2 bg-gradient-to-tr from-yellow-500/10 via-pink-500/10 to-purple-500/10 border border-pink-500/20 rounded-lg">
        <span className="text-pink-500 font-bold text-[14px]">📸</span>
        <div className="flex-1">
          <div className="font-bold text-pink-500">Instagram DM</div>
          <div className="text-[10px] text-zinc-400">{language === 'en' ? 'Direct Messages & Story Replies' : 'ডাইরেক্ট মেসেজ ও স্টোরি রিপ্লাই'}</div>
        </div>
      </div>
      <div className="p-2.5 bg-surface rounded-lg border border-surface-hover space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-yellow-500 to-purple-500 flex items-center justify-center text-[9px] text-white">IG</div>
          <span className="font-medium text-zinc-300">@stylehub.official</span>
        </div>
        <p className="text-[10px] text-zinc-500 mt-1">
          {language === 'en' ? '✓ Story mention auto-replies active' : '✓ স্টোরি মেনশন অটো-রিপ্লাই একটিভ'}
        </p>
      </div>
    </div>
  );

  if (featureId === 'website_widget') return (
    <div className="space-y-2 text-xs">
      <div className="flex items-center gap-2 p-2 bg-primary/10 border border-primary/20 rounded-lg">
        <span className="text-primary font-bold text-[14px]">🌐</span>
        <div className="flex-1">
          <div className="font-bold text-primary">Website Chat Widget</div>
          <div className="text-[10px] text-zinc-400">{language === 'en' ? 'Live Chat on Your Website' : 'আপনার ওয়েবসাইটে লাইভ চ্যাট'}</div>
        </div>
      </div>
      <div className="p-2.5 bg-surface rounded-lg border border-surface-hover space-y-2">
        <div className="bg-primary/20 p-1.5 rounded text-[9px] text-zinc-300">
          {language === 'en' ? 'Hello! How can we help you today?' : 'হ্যালো! আজ আমরা আপনাকে কীভাবে সাহায্য করতে পারি?'}
        </div>
        <div className="flex justify-end">
          <div className="bg-surface-hover p-1.5 rounded text-[9px] text-zinc-400">
            {language === 'en' ? 'Show me your catalog' : 'আপনাদের ক্যাটালগ দেখান'}
          </div>
        </div>
      </div>
    </div>
  );

  if (featureId === 'leads') return (
    <div className="space-y-2 text-xs">
      {[{stage: language === 'en' ? 'Intake' : 'ইনটেক', count: 12, color: 'bg-zinc-500/20 text-zinc-400'}, {stage: language === 'en' ? 'Interested' : 'আগ্রহী', count: 7, color: 'bg-blue-500/20 text-blue-400'}, {stage: language === 'en' ? 'Closed' : 'ক্লোজড', count: 4, color: 'bg-green-500/20 text-green-500'}].map((s, i) => (
        <div key={i} className={`flex items-center justify-between p-2 rounded-lg border border-surface-hover ${s.color}`}>
          <span className="font-medium">{s.stage}</span>
          <span className="font-bold">{s.count}</span>
        </div>
      ))}
      <div className="p-2 bg-orange-500/10 border border-orange-500/20 rounded-lg text-[10px] text-orange-400">
        🔔 {language === 'en' ? '2 follow-ups due today' : 'আজ ২টি ফলো-আপ বাকি'}
      </div>
    </div>
  );

  if (featureId === 'commerce') return (
    <div className="space-y-2 text-xs">
      <div className="flex items-center gap-2 p-2 bg-surface rounded-lg border border-surface-hover">
        <div className="w-8 h-8 rounded-lg bg-purple-500/20" />
        <div className="flex-1"><div className="text-[10px] font-bold">Premium T-Shirt</div><div className="text-[10px] text-zinc-500">৳850</div></div>
        <span className="text-green-500 text-[10px] font-bold">{language === 'en' ? 'In Stock' : 'স্টকে আছে'}</span>
      </div>
      <div className="grid grid-cols-3 gap-1">
        <div className="p-1.5 bg-surface-hover rounded text-center"><div className="font-bold text-purple-500">24</div><div className="text-[9px] text-zinc-500">{language === 'en' ? 'Orders' : 'অর্ডার'}</div></div>
        <div className="p-1.5 bg-surface-hover rounded text-center"><div className="font-bold text-green-500">৳18k</div><div className="text-[9px] text-zinc-500">{language === 'en' ? 'Revenue' : 'রেভিনিউ'}</div></div>
        <div className="p-1.5 bg-surface-hover rounded text-center"><div className="font-bold text-secondary">8</div><div className="text-[9px] text-zinc-500">{language === 'en' ? 'Products' : 'পণ্য'}</div></div>
      </div>
    </div>
  );

  if (featureId === 'team') return (
    <div className="space-y-2 text-xs">
      {['Rafi (Owner)', 'Mim (Agent)', 'Karim (Agent)'].map((agent, i) => (
        <div key={i} className="flex items-center gap-2 p-2 bg-surface rounded-lg border border-surface-hover">
          <div className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-500 flex items-center justify-center text-[10px] font-bold">{agent[0]}</div>
          <span className="flex-1 text-zinc-400">{agent}</span>
          <span className={`text-[10px] font-bold ${i === 0 ? 'text-secondary' : 'text-teal-500'}`}>{i === 0 ? (language === 'en' ? 'Owner' : 'মালিক') : (language === 'en' ? 'Online' : 'অনলাইন')}</span>
        </div>
      ))}
    </div>
  );

  if (featureId === 'facebook_comment_automation') return (
    <div className="space-y-3 text-[11px] animate-fade-in-up">
      {/* Mock Facebook Post */}
      <div className="p-3 bg-surface rounded-xl border border-surface-hover shadow-sm space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px]">F</div>
          <div>
            <div className="font-bold text-foreground">StyleHub BD</div>
            <div className="text-[9px] text-zinc-500">{language === 'en' ? 'Sponsored' : 'স্পন্সরড'} • 🌐</div>
          </div>
        </div>
        <p className="text-zinc-300 leading-tight">
          {language === 'en' ? 'New summer dress in stock! 👗 Comment "PRICE" to get details.' : 'নতুন সামার ড্রেস স্টকে এসেছে! 👗 বিস্তারিত জানতে "PRICE" কমেন্ট করুন।'}
        </p>
        <div className="border-t border-surface-hover pt-2 mt-1 flex justify-between text-zinc-500 text-[10px]">
          <span>👍 {language === 'en' ? '42 Likes' : '৪২টি লাইক'}</span>
          <span>💬 {language === 'en' ? '18 Comments' : '১৮টি কমেন্ট'}</span>
        </div>
      </div>

      {/* Mock Comments Flow */}
      <div className="space-y-2 pl-3 border-l-2 border-primary/30">
        {/* Customer Comment */}
        <div className="p-2 bg-surface rounded-lg border border-surface-hover">
          <div className="font-bold text-zinc-400">Nusrat Jahan</div>
          <p className="text-zinc-200">{language === 'en' ? 'PRICE please?' : 'PRICE প্লিজ?'}</p>
        </div>

        {/* AI Auto Public Reply */}
        <div className="p-2 bg-primary/10 border border-primary/20 rounded-lg">
          <div className="font-bold text-primary flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            ZiniChat AI ({language === 'en' ? 'Public Reply' : 'পাবলিক রিপ্লাই'})
          </div>
          <p className="text-zinc-300">
            {language === 'en' 
              ? 'Hi Nusrat! We have sent the details to your inbox. Check your Messenger! 😊' 
              : 'হ্যালো নুসরত! আমরা বিস্তারিত আপনার ইনবক্সে পাঠিয়ে দিয়েছি। আপনার মেসেঞ্জার চেক করুন! 😊'}
          </p>
        </div>

        {/* AI Auto Messenger Private Message */}
        <div className="p-2 bg-[#0084FF]/10 border border-[#0084FF]/20 rounded-lg">
          <div className="font-bold text-[#0084FF] flex items-center gap-1">
            <span>💬</span> ZiniChat AI ({language === 'en' ? 'Messenger Private Reply' : 'মেসেঞ্জার প্রাইভেট রিপ্লাই'})
          </div>
          <p className="text-zinc-300">
            {language === 'en'
              ? 'Hi Nusrat, thank you for your comment! The Summer Dress is $15. Click here to buy: stylehub.com/dress-1'
              : 'হ্যালো নুসরত, কমেন্ট করার জন্য ধন্যবাদ! সামার ড্রেসের দাম ৳১,২৫০। কিনতে ভিজিট করুন: stylehub.com/dress-1'}
          </p>
        </div>
      </div>
    </div>
  );

  // Generic Mockup for new dynamically added features
  return (
    <div className="space-y-2 text-xs">
      <div className="grid grid-cols-2 gap-2">
        {[{label: language === 'en' ? 'Messages' : 'মেসেজ', val: '12.4k', color: iconColor}, {label: language === 'en' ? 'Efficiency' : 'দক্ষতা', val: '98%', color: iconColor}].map((stat, i) => (
          <div key={i} className="p-2 bg-surface rounded-lg border border-surface-hover text-center">
            <div className={`text-base font-extrabold ${stat.color}`}>{stat.val}</div>
            <div className="text-[9px] text-zinc-500">{stat.label}</div>
          </div>
        ))}
      </div>
      <div className={`p-2 bg-surface-hover border border-surface-hover rounded-lg text-[10px] text-center ${iconColor}`}>
        {language === 'en' ? 'Active & Running' : 'অ্যাক্টিভ ও রানিং'}
      </div>
    </div>
  );
}

export function InteractiveFeatureTabs({ activeFeature, setActiveFeature, features }: { activeFeature: number, setActiveFeature: (idx: number) => void, features: any[] }) {
  const { language } = useLanguage();

  if (!features || features.length === 0) return null;

  return (
    <div className="w-full">
      {/* Feature Tab Selector */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {features.map((f, idx) => (
            <button
              key={f.id || idx}
              onClick={() => setActiveFeature(idx)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 border ${
                activeFeature === idx
                  ? 'bg-primary text-white border-primary shadow-glow'
                  : 'bg-surface border-surface-hover text-zinc-500 hover:text-foreground hover:border-primary/30'
              }`}
            >
              <span className={activeFeature === idx ? 'text-white' : f.iconColor}>
                {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
              </span>
              {language === 'en' ? f.title.en.split(' ')[0] : f.title.bn.split(' ')[0]}
            </button>
          ))}
        </div>
      </section>

      {/* Active Feature Detail */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {features.map((feature, idx) => (
          <div
            key={feature.id || idx}
            className={`transition-all duration-500 ${activeFeature === idx ? 'block' : 'hidden'}`}
          >
            <div className={`grid lg:grid-cols-2 gap-12 items-center p-8 md:p-12 rounded-3xl bg-gradient-to-br ${feature.color} border border-surface-hover ${feature.borderHover} shadow-xl ${feature.glowColor} transition-all duration-300`}>
              {/* Left: Content */}
              <div>
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.color} ${feature.iconColor} flex items-center justify-center mb-6 border border-surface-hover`}>
                  {feature.icon}
                </div>
                <h2 className="text-3xl md:text-4xl font-extrabold mb-4 tracking-tight">
                  {language === 'en' ? feature.title.en : feature.title.bn}
                </h2>
                <p className="text-zinc-500 leading-relaxed text-base mb-8">
                  {language === 'en' ? feature.description.en : feature.description.bn}
                </p>
                <ul className="space-y-3">
                  {((language === 'en' ? feature.bullets?.en : feature.bullets?.bn) || []).map((bullet: string, i: number) => (
                    <li key={i} className="flex items-center gap-3 text-sm font-medium">
                      <div className={`w-5 h-5 rounded-full ${feature.color} ${feature.iconColor} flex items-center justify-center shrink-0 border border-current/20`}>
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Right: Visual Mockup */}
              <div className="relative flex justify-center">
                <div className="w-full max-w-sm bg-background/80 backdrop-blur-xl border border-surface-hover rounded-2xl p-4 shadow-2xl">
                  {/* Mockup Header */}
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-surface-hover">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-400" />
                      <div className="w-3 h-3 rounded-full bg-yellow-400" />
                      <div className="w-3 h-3 rounded-full bg-green-400" />
                    </div>
                    <div className="flex-1 bg-surface-hover rounded-full h-5 px-3 flex items-center">
                      <span className="text-[10px] text-zinc-500">zinichat.com</span>
                    </div>
                  </div>
                  {/* Feature-specific visual */}
                  <FeatureMockup featureId={feature.id} language={language} iconColor={feature.iconColor} color={feature.color} />
                </div>
                {/* Floating badge */}
                <div className={`absolute -top-4 -right-4 ${feature.iconColor} bg-background border border-surface-hover rounded-2xl px-3 py-2 text-xs font-bold shadow-lg flex items-center gap-1.5`}>
                  <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                  {language === 'en' ? 'Live Preview' : 'লাইভ প্রিভিউ'}
                </div>
              </div>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
