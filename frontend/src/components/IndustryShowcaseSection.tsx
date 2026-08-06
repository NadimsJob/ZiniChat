'use client';

import { useState } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import { 
  ShoppingCart, Building2, Hotel, Truck, Stethoscope, 
  GraduationCap, Briefcase, Cpu, Factory, CheckCircle2, ArrowRight 
} from 'lucide-react';
import Link from 'next/link';

export const INDUSTRIES_DATA = [
  {
    id: 'retail-ecommerce',
    nameEn: 'Retail, E-commerce & Trading',
    nameBn: 'খুচরা ব্যবসা, ই-কমার্স ও বাণিজ্য',
    icon: ShoppingCart,
    color: 'from-emerald-500 to-teal-600',
    iconColor: 'text-emerald-500',
    badgeEn: 'E-Commerce Mode',
    badgeBn: 'ই-কমার্স মোড',
    useCaseEn: 'Auto product catalog, MFS (bKash/Nagad) payment matching, instant stock check, & automated order placement.',
    useCaseBn: 'অটো প্রডাক্ট ক্যাটালগ, bKash/Nagad পেমেন্ট ভেরিফিকেশন, ইনস্ট্যান্ট স্টক চেক এবং অটোমেটিক অর্ডার কনফার্মেশন।',
    highlightsEn: ['Product Catalog Sync', 'Auto MFS Matching', 'Instant Order Placement'],
    highlightsBn: ['প্রডাক্ট ক্যাটালগ সিঙ্ক', 'অটো পেমেন্ট ভেরিফাই', 'ইনস্ট্যান্ট অর্ডার প্লেসমেন্ট'],
  },
  {
    id: 'real-estate',
    nameEn: 'Real Estate & Construction',
    nameBn: 'রিয়েল এস্টেট ও নির্মাণ',
    icon: Building2,
    color: 'from-blue-500 to-cyan-600',
    iconColor: 'text-blue-500',
    badgeEn: 'Property Listing Mode',
    badgeBn: 'প্রপার্টি লিস্টিং মোড',
    useCaseEn: 'Property photo gallery, sqft/bedroom specs, location filters, site visit booking, & automated CRM lead capture.',
    useCaseBn: 'প্রপার্টি ফটো গ্যালারি, স্কয়ার ফিট/বেডরুম স্পেক্স, লোকেশন ফিল্টার, সাইট ভিজিট বুকিং এবং অটো সিআরএম লিড ক্যাপচার।',
    highlightsEn: ['Property Photo Gallery', 'Site Visit Booking', 'CRM Lead Intake Pipeline'],
    highlightsBn: ['প্রপার্টি ফটো গ্যালারি', 'সাইট ভিজিট বুকিং', 'সিআরএম লিড ইনটেক পাইপলাইন'],
  },
  {
    id: 'hospitality-travel',
    nameEn: 'Hospitality, Travel & Lifestyle',
    nameBn: 'হোটেল, ভ্রমণ ও লাইফস্টাইল',
    icon: Hotel,
    color: 'from-amber-500 to-orange-600',
    iconColor: 'text-amber-500',
    badgeEn: 'Booking & Reservations',
    badgeBn: 'বুকিং ও রিজার্ভেশন',
    useCaseEn: 'Room rates & availability inquiry, tour itinerary packages, 24/7 FAQ support, & direct booking inquiries.',
    useCaseBn: 'রুমের ভাড়া ও বুকিং ইনকোয়ারি, ট্যুর প্যাকেজ ডিটেইলস, ২৪/৭ কাস্টমার সাপোর্ট এবং সরাসরি বুকিং রিকুয়েস্ট।',
    highlightsEn: ['Room & Tour Packages', '24/7 FAQ Assistant', 'Direct Booking Flow'],
    highlightsBn: ['রুম ও ট্যুর প্যাকেজ', '২৪/৭ অটো সাপোর্ট', 'ডাইরেক্ট বুকিং ফ্লো'],
  },
  {
    id: 'logistics',
    nameEn: 'Logistics & Infrastructure',
    nameBn: 'লজিস্টিকস, পরিবহন ও অবকাঠামো',
    icon: Truck,
    color: 'from-indigo-500 to-purple-600',
    iconColor: 'text-indigo-500',
    badgeEn: 'Tracking & Support',
    badgeBn: 'ট্র্যাকিং ও সাপোর্ট',
    useCaseEn: 'Parcel delivery status updates, shipping fee calculation, route FAQs, & complaint resolution routing.',
    useCaseBn: 'পার্সেল ট্র্যাকিং আপডেট, ডেলিভারি চার্জ ক্যালকুলেশন, রুট সংক্রান্ত প্রশ্ন উত্তর এবং সাপোর্ট কাস্টমার সার্ভিস।',
    highlightsEn: ['Delivery Tracking', 'Rate Calculation', 'Issue Handoff'],
    highlightsBn: ['ডেলিভারি ট্র্যাকিং', 'চার্জ ক্যালকুলেশন', 'ইস্যু হ্যান্ডঅফ'],
  },
  {
    id: 'healthcare',
    nameEn: 'Healthcare & Clinics',
    nameBn: 'স্বাস্থ্যসেবা ও ক্লিনিক',
    icon: Stethoscope,
    color: 'from-rose-500 to-pink-600',
    iconColor: 'text-rose-500',
    badgeEn: 'Appointment & Consultation',
    badgeBn: 'অ্যাপয়েন্টমেন্ট ও তথ্য',
    useCaseEn: 'Doctor schedules, appointment request collection, test report delivery alerts, & emergency escalation.',
    useCaseBn: 'ডাক্তারদের সময়সূচী, অ্যাপয়েন্টমেন্ট রিকুয়েস্ট গ্রহণ, রিপোর্ট ডেলিভারি নোটিফিকেশন এবং জরুরি যোগাযোগ।',
    highlightsEn: ['Doctor Schedule FAQ', 'Appointment Intake', 'Automated Alerts'],
    highlightsBn: ['ডাক্তারদের শিডিউল', 'অ্যাপয়েন্টমেন্ট গ্রহণ', 'অটোমেটেড অ্যালার্ট'],
  },
  {
    id: 'education',
    nameEn: 'Education & Academies',
    nameBn: 'শিক্ষা ও কোচিং ইনস্টিটিউট',
    icon: GraduationCap,
    color: 'from-violet-500 to-purple-600',
    iconColor: 'text-violet-500',
    badgeEn: 'Admission & Course Info',
    badgeBn: 'ভর্তি ও কোর্স তথ্য',
    useCaseEn: 'Course fee breakdown, batch schedules, syllabus FAQs, admission lead collection, & automated follow-ups.',
    useCaseBn: 'কোর্স ফি ও ব্যাচের সময়সূচি, সিলেবাস সম্পর্কিত তথ্য, ভর্তি ইচ্ছুক শিক্ষার্থীদের তথ্য সেভ এবং অটো ফলো-আপ।',
    highlightsEn: ['Course Catalog', 'Admission Leads', 'Class Schedules'],
    highlightsBn: ['কোর্স ক্যাটালগ', 'ভর্তি ইচ্ছুক লিড', 'ক্লাস শিডিউল'],
  },
  {
    id: 'financial-services',
    nameEn: 'Financial & Professional Services',
    nameBn: 'আর্থিক ও পেশাগত সেবা',
    icon: Briefcase,
    color: 'from-emerald-600 to-green-700',
    iconColor: 'text-emerald-600',
    badgeEn: 'Consultation & Inquiry',
    badgeBn: 'পরামর্শ ও সেবা',
    useCaseEn: 'Service package inquiry, appointment booking for consultancy, document requirement guide, & lead profiling.',
    useCaseBn: 'সার্ভিস প্যাকেজ ইনকোয়ারি, কন্সালটেন্সি বুকিং, প্রয়োজনীয় কাগজের তথ্য প্রদান এবং সম্ভাব্য ক্লায়েন্ট শনাক্তকরণ।',
    highlightsEn: ['Consultation Booking', 'Document Checklists', 'Client Profiling'],
    highlightsBn: ['কন্সালটেন্সি বুকিং', 'ডকুমেন্ট চেকলিস্ট', 'ক্লায়েন্ট প্রোফাইলিং'],
  },
  {
    id: 'technology-software',
    nameEn: 'Technology & Software',
    nameBn: 'প্রযুক্তি ও সফটওয়্যার',
    icon: Cpu,
    color: 'from-sky-500 to-blue-600',
    iconColor: 'text-sky-500',
    badgeEn: 'SaaS & Tech Support',
    badgeBn: 'সফটওয়্যার ও টেক সাপোর্ট',
    useCaseEn: 'Feature inquiry, demo request collection, automated tier recommendation, & instant L1 technical support.',
    useCaseBn: 'ফিচার সংক্রান্ত উত্তর, ডেমো রিকুয়েস্ট গ্রহণ, প্রাইসিং নির্দেশিকা এবং প্রাথমিক কারিগরি প্রশ্নের উত্তর প্রদান।',
    highlightsEn: ['Demo Booking', 'L1 Automated Support', 'Plan Recommender'],
    highlightsBn: ['ডেমো বুকিং', 'অটোমেটেড সাপোর্ট', 'প্ল্যান রেকমেন্ডার'],
  },
  {
    id: 'manufacturing-industrial',
    nameEn: 'Manufacturing & Industrial',
    nameBn: 'উৎপাদন ও শিল্প',
    icon: Factory,
    color: 'from-amber-600 to-yellow-700',
    iconColor: 'text-amber-600',
    badgeEn: 'B2B & Wholesale Inquiry',
    badgeBn: 'পাইকারি ও বিটুবি অর্ডার',
    useCaseEn: 'Bulk order quotation requests, product specs sheets, factory visit appointments, & distributor onboarding.',
    useCaseBn: 'পাইকারি অর্ডারের কোটেশন গ্রহণ, প্রডাক্ট স্পেসিফিকেশন প্রদান, কারখানা ভিজিট শিডিউল এবং পরিবেশক ইনটেক।',
    highlightsEn: ['Bulk RFQ Intake', 'Product Specs Sheet', 'Distributor Leads'],
    highlightsBn: ['বাল্ক কোটেশন ইনটেক', 'প্রডাক্ট স্পেকস শিট', 'ডিস্ট্রিবিউটর লিড'],
  },
];

export function IndustryShowcaseSection() {
  const { language } = useLanguage();
  const [selectedIndustry, setSelectedIndustry] = useState<string>(INDUSTRIES_DATA[0].id);

  const activeItem = INDUSTRIES_DATA.find(i => i.id === selectedIndustry) || INDUSTRIES_DATA[0];

  return (
    <section id="industries" className="relative w-full bg-background py-20 border-b border-border/40 overflow-hidden">
      {/* Background Subtle Pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#1F824A_1px,transparent_1px)] [background-size:24px_24px]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-primary">
            ✨ {language === 'en' ? 'Versatile Omnichannel AI' : 'সকল সেক্টরের উপযোগী এআই'}
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground">
            {language === 'en' ? 'Tailored for Your Exact Industry' : 'আপনার ব্যবসার ধরণ যাই হোক, ZiniChat প্রস্তুত'}
          </h2>
          <p className="mt-3 text-base sm:text-lg text-muted-foreground">
            {language === 'en' 
              ? 'Whether you sell online products, list properties, or take service bookings — ZiniChat adapts automatically to your workflow.' 
              : 'ই-কমার্স প্রডাক্ট, রিয়েল এস্টেট প্রপার্টি বা সার্ভিস বুকিং — আপনার ক্যাটাগরি বেছে নিন এবং দেখুন ZiniChat কীভাবে কাজ করে।'}
          </p>
        </div>

        {/* 9 Grid Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
          {INDUSTRIES_DATA.map((ind) => {
            const Icon = ind.icon;
            const isSelected = selectedIndustry === ind.id;

            return (
              <div
                key={ind.id}
                onClick={() => setSelectedIndustry(ind.id)}
                className={`group relative rounded-3xl border p-6 transition-all duration-300 cursor-pointer flex flex-col justify-between ${
                  isSelected 
                    ? 'bg-card border-primary ring-2 ring-primary/20 shadow-xl shadow-primary/10' 
                    : 'bg-card/70 border-border hover:border-primary/50 hover:bg-card hover:shadow-lg'
                }`}
              >
                <div>
                  {/* Top Bar inside card */}
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-surface border border-border group-hover:scale-110 transition-transform ${ind.iconColor}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border bg-surface ${ind.iconColor} border-border`}>
                      {language === 'en' ? ind.badgeEn : ind.badgeBn}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                    {language === 'en' ? ind.nameEn : ind.nameBn}
                  </h3>

                  {/* Description */}
                  <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                    {language === 'en' ? ind.useCaseEn : ind.useCaseBn}
                  </p>
                </div>

                {/* Highlights List */}
                <div className="pt-3 border-t border-border/60">
                  <div className="space-y-1.5">
                    {(language === 'en' ? ind.highlightsEn : ind.highlightsBn).map((hl, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-[11px] font-semibold text-foreground/80">
                        <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${ind.iconColor}`} />
                        <span>{hl}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Dynamic Highlight Banner at Bottom */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-card via-surface to-card border border-primary/30 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <activeItem.icon className={`w-7 h-7 ${activeItem.iconColor}`} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-extrabold uppercase tracking-wider text-primary">
                  {language === 'en' ? 'Active Selection' : 'নির্বাচিত সেক্টর'}
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary">
                  {language === 'en' ? activeItem.badgeEn : activeItem.badgeBn}
                </span>
              </div>
              <h4 className="text-lg font-bold text-foreground">
                {language === 'en' ? activeItem.nameEn : activeItem.nameBn}
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                {language === 'en' ? activeItem.useCaseEn : activeItem.useCaseBn}
              </p>
            </div>
          </div>

          <Link
            href="/signup"
            className="shrink-0 bg-primary text-primary-foreground px-6 py-3 rounded-xl text-xs sm:text-sm font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
          >
            {language === 'en' ? 'Start Free for Your Industry' : 'আপনার ব্যবসার জন্য শুরু করুন'}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

      </div>
    </section>
  );
}
