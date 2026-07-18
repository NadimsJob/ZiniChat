import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const config = await prisma.landingPageConfig.findFirst();

  const data = {
    heroTitle: 'Add the power of WhatsApp API to your business',
    heroTitleBn: 'আপনার ব্যবসায় হোয়াটসঅ্যাপ এপিআই-এর শক্তি যুক্ত করুন',
    heroSubtitle: 'Bulk messaging, chatbots, automation and more — easily provide WhatsApp services to your clients from our platform.',
    heroSubtitleBn: 'বাল্ক মেসেজিং, চ্যাটবট, অটোমেশন এবং আরও অনেক কিছু — আমাদের প্ল্যাটফর্ম থেকে খুব সহজেই আপনার গ্রাহকদের হোয়াটসঅ্যাপ সেবা প্রদান করুন।',
    featuresJson: [
      {
        title: { en: 'Bulk Messaging', bn: 'বাল্ক মেসেজিং' },
        description: { 
          en: 'Send thousands of messages at once without the risk of getting banned. Target specific customer segments with ease.', 
          bn: 'ব্যান হওয়ার ঝুঁকি ছাড়াই একসাথে হাজার হাজার মেসেজ পাঠান। খুব সহজেই নির্দিষ্ট গ্রাহকদের টার্গেট করুন।' 
        }
      },
      {
        title: { en: 'Smart Chatbot Automation', bn: 'স্মার্ট চ্যাটবট অটোমেশন' },
        description: { 
          en: 'Set up automated replies and intelligent AI chatbots to handle customer queries 24/7, even when you are asleep.', 
          bn: 'অটোমেটেড রিপ্লাই এবং কৃত্রিম বুদ্ধিমত্তার চ্যাটবট সেট আপ করুন যা ২৪/৭ গ্রাহকদের উত্তর দেবে, এমনকি আপনি ঘুমিয়ে থাকলেও।' 
        }
      },
      {
        title: { en: 'Team Inbox & CRM', bn: 'টিম ইনবক্স ও সিআরএম' },
        description: { 
          en: 'Manage all your customer conversations in one unified dashboard. Assign chats to team members and track progress.', 
          bn: 'এক ড্যাশবোর্ড থেকে আপনার সব গ্রাহকের কথোপকথন পরিচালনা করুন। দলের সদস্যদের চ্যাট অ্যাসাইন করুন।' 
        }
      },
      {
        title: { en: 'API Integrations', bn: 'এপিআই ইন্টিগ্রেশন' },
        description: { 
          en: 'Connect WhatsApp with your existing tools like Shopify, WooCommerce, Zapier, and custom CRM systems seamlessly.', 
          bn: 'শপিফাই, উকমার্স, জ্যাপিয়ার এবং কাস্টম সিআরএম-এর মতো আপনার বিদ্যমান টুলগুলির সাথে হোয়াটসঅ্যাপ কানেক্ট করুন।' 
        }
      }
    ],
    pricingJson: [
      {
        name: { en: 'Starter Plan', bn: 'স্টার্টার প্ল্যান' },
        price: { en: '৳1,500', bn: '৳১,৫০০' },
        features: [
          { en: 'Official WhatsApp API', bn: 'অফিসিয়াল হোয়াটসঅ্যাপ এপিআই' },
          { en: 'Green Tick Assistance', bn: 'গ্রিন টিক সহায়তা' },
          { en: '5,000 Free Conversations', bn: '৫,০০০ ফ্রি কনভারসেশন' },
          { en: 'Basic Chatbot Builder', bn: 'বেসিক চ্যাটবট বিল্ডার' },
          { en: '1 Team Member', bn: '১ জন টিম মেম্বার' }
        ]
      },
      {
        name: { en: 'Growth Plan', bn: 'গ্রোথ প্ল্যান' },
        price: { en: '৳3,500', bn: '৳৩,৫০০' },
        features: [
          { en: 'Everything in Starter', bn: 'স্টার্টার প্ল্যানের সবকিছু' },
          { en: 'Advanced AI Chatbot', bn: 'অ্যাডভান্সড এআই চ্যাটবট' },
          { en: '20,000 Free Conversations', bn: '২০,০০০ ফ্রি কনভারসেশন' },
          { en: 'API Integrations', bn: 'এপিআই ইন্টিগ্রেশন' },
          { en: '5 Team Members', bn: '৫ জন টিম মেম্বার' }
        ]
      },
      {
        name: { en: 'Enterprise', bn: 'এন্টারপ্রাইজ' },
        price: { en: 'Custom', bn: 'কাস্টম' },
        features: [
          { en: 'Everything in Growth', bn: 'গ্রোথ প্ল্যানের সবকিছু' },
          { en: 'Unlimited Conversations', bn: 'আনলিমিটেড কনভারসেশন' },
          { en: 'Dedicated Account Manager', bn: 'ডেডিকেটেড একাউন্ট ম্যানেজার' },
          { en: 'Custom Integrations', bn: 'কাস্টম ইন্টিগ্রেশন' },
          { en: 'Unlimited Team Members', bn: 'আনলিমিটেড টিম মেম্বার' }
        ]
      }
    ],
    faqsJson: [
      {
        question: { en: 'What is WhatsApp Business API and how does it work?', bn: 'হোয়াটসঅ্যাপ বিজনেস এপিআই কী এবং এটি কীভাবে কাজ করে?' },
        answer: { 
          en: 'WhatsApp Business API is an official service from Meta that allows businesses to send WhatsApp messages programmatically. ZiniChat provides a simple dashboard built on top of it so you can run bulk campaigns, chatbots, and customer support without any coding.', 
          bn: 'হোয়াটসঅ্যাপ বিজনেস এপিআই মেটার একটি অফিসিয়াল সার্ভিস যা দিয়ে প্রোগ্রাম্যাটিক্যালি মেসেজ পাঠানো যায়। ZiniChat আপনাকে একটি সহজ ড্যাশবোর্ড দেয় যাতে আপনি কোডিং ছাড়াই ক্যাম্পেইন ও চ্যাটবট চালাতে পারেন।' 
        }
      },
      {
        question: { en: 'How long does WhatsApp API setup take in Bangladesh?', bn: 'বাংলাদেশে হোয়াটসঅ্যাপ এপিআই সেটআপ করতে কতক্ষণ সময় লাগে?' },
        answer: { 
          en: 'For Bangladesh businesses, ZiniChat completes the full WhatsApp Business API setup within 24-48 hours after you submit your business verification documents and a dedicated phone number.', 
          bn: 'বাংলাদেশি ব্যবসার জন্য, ডকুমেন্ট ও ফোন নম্বর জমা দেওয়ার ২৪-৪৮ ঘণ্টার মধ্যে ZiniChat সম্পূর্ণ সেটআপ সম্পন্ন করে।' 
        }
      },
      {
        question: { en: 'Do I need a WhatsApp Business account to use ZiniChat?', bn: 'ZiniChat ব্যবহার করতে কি হোয়াটসঅ্যাপ বিজনেস অ্যাকাউন্ট লাগবে?' },
        answer: { 
          en: 'Yes, a verified Meta Business account and a dedicated phone number (not used on regular WhatsApp) are required. Our team guides you through the Meta Business verification process step by step.', 
          bn: 'হ্যাঁ, একটি ভেরিফায়েড মেটা বিজনেস অ্যাকাউন্ট এবং একটি নতুন ফোন নম্বর প্রয়োজন। আমাদের টিম আপনাকে ভেরিফিকেশন প্রক্রিয়ায় ধাপে ধাপে গাইড করবে।' 
        }
      },
      {
        question: { en: 'Is there a daily message sending limit on WhatsApp API?', bn: 'হোয়াটসঅ্যাপ এপিআই-তে কি দৈনিক মেসেজ পাঠানোর কোনো লিমিট আছে?' },
        answer: { 
          en: 'Meta uses a messaging tier system. New numbers start at 1,000 unique conversations per 24 hours and automatically scale up to 10K, 100K, and unlimited as you maintain good quality ratings.', 
          bn: 'মেটার একটি টিয়ার সিস্টেম আছে। নতুন নম্বর প্রতিদিন ১,০০০ কনভারসেশন দিয়ে শুরু হয় এবং ভালো কোয়ালিটি রেটিং থাকলে এটি ১০ হাজার, ১ লাখ এবং আনলিমিটেড পর্যন্ত বাড়ে।' 
        }
      },
      {
        question: { en: 'What payment methods does ZiniChat support?', bn: 'ZiniChat কোন কোন পেমেন্ট মেথড সাপোর্ট করে?' },
        answer: { 
          en: 'ZiniChat supports bKash, Nagad, Rocket, local bank transfer for Bangladesh customers, and international cards (Visa, Mastercard) for global clients. Both monthly and yearly plans are available.', 
          bn: 'ZiniChat বাংলাদেশি গ্রাহকদের জন্য বিকাশ, নগদ, রকেট ও ব্যাংক ট্রান্সফার এবং গ্লোবাল ক্লায়েন্টদের জন্য ভিসা ও মাস্টারকার্ড সাপোর্ট করে। মাসিক এবং বার্ষিক উভয় প্ল্যানই রয়েছে।' 
        }
      }
    ]
  };

  if (config) {
    await prisma.landingPageConfig.update({
      where: { id: config.id },
      data
    });
    console.log('Updated existing LandingPageConfig with ZiniChat exact data.');
  } else {
    await prisma.landingPageConfig.create({
      data
    });
    console.log('Created new LandingPageConfig with ZiniChat exact data.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
