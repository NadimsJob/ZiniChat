import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LandingPageService {
  constructor(private prisma: PrismaService) {}

  async getConfig() {
    let config = await this.prisma.landingPageConfig.findFirst();
    if (!config) {
      // Create default config if it doesn't exist
      config = await this.prisma.landingPageConfig.create({
        data: {
          heroTitle: 'Supercharge Your Business with AI',
          heroTitleBn: 'এআই দিয়ে আপনার ব্যবসাকে শক্তিশালী করুন',
          heroSubtitle: 'The ultimate omnichannel platform for WhatsApp, Messenger, and Instagram.',
          heroSubtitleBn: 'হোয়াটসঅ্যাপ, মেসেঞ্জার এবং ইনস্টাগ্রামের জন্য সেরা অমনিচ্যানেল প্ল্যাটফর্ম।',
          featuresJson: [
            { 
              id: 'ai',
              iconName: 'Bot',
              colorTheme: 'green',
              title: { en: 'AI-Powered Auto Reply', bn: 'এআই অটো রিপ্লাই' }, 
              description: { 
                en: 'Train your own custom AI assistant on your product catalog, FAQs, and business knowledge. Automatically handle customer inquiries 24/7 without human intervention.', 
                bn: 'আপনার পণ্য ক্যাটালগ, FAQ এবং ব্যবসার তথ্য দিয়ে নিজস্ব AI অ্যাসিস্ট্যান্ট ট্রেইন করুন। ২৪/৭ স্বয়ংক্রিয়ভাবে গ্রাহকদের প্রশ্নের উত্তর দিন।' 
              },
              bullets: {
                en: ['Custom knowledge base training', 'Smart handoff to human agents'],
                bn: ['কাস্টম নলেজ বেস ট্রেনিং', 'মানব এজেন্টকে স্মার্ট হ্যান্ডঅফ']
              }
            },
            { 
              id: 'inbox',
              iconName: 'MessageSquare',
              colorTheme: 'blue',
              title: { en: 'Unified Omnichannel Inbox', bn: 'ইউনিফাইড অমনিচ্যানেল ইনবক্স' }, 
              description: { 
                en: 'Manage all customer conversations from WhatsApp, Meta Messenger, and Instagram DM in a single, powerful inbox. No more tab switching.', 
                bn: 'WhatsApp, Meta Messenger, এবং Instagram DM থেকে সব গ্রাহকের কথোপকথন একটি শক্তিশালী ইনবক্সে পরিচালনা করুন।' 
              },
              bullets: {
                en: ['WhatsApp Business API & QR', 'Meta Messenger integration'],
                bn: ['WhatsApp Business API ও QR', 'Meta Messenger ইন্টিগ্রেশন']
              }
            }
          ],
          pricingJson: {
            compareFeatures: [
              { id: 'limits', type: 'header', en: 'Limits', bn: 'লিমিটস' },
              { id: 'seats', type: 'value', featureKey: 'seatLimit', en: 'Team Members', bn: 'টিম মেম্বার' },
              { id: 'msg_quota', type: 'value', featureKey: 'messageQuota', en: 'Monthly Messages', bn: 'মাসিক মেসেজ' },
              { id: 'ai_quota', type: 'value', featureKey: 'aiQuota', en: 'AI Responses', bn: 'এআই রেসপন্স' },
              
              { id: 'channels', type: 'header', en: 'Channels', bn: 'চ্যানেলসমূহ' },
              { id: 'whatsapp_qr', type: 'boolean', featureKey: 'whatsapp_qr', en: 'WhatsApp Web (QR)', bn: 'হোয়াটসঅ্যাপ ওয়েব (QR)' },
              { id: 'website_widget', type: 'boolean', featureKey: 'website_widget', en: 'Website Widget', bn: 'ওয়েবসাইট উইজেট' },
              { id: 'whatsapp', type: 'boolean', featureKey: 'whatsapp', en: 'Official WhatsApp API', bn: 'অফিসিয়াল হোয়াটসঅ্যাপ API' },
              { id: 'messenger', type: 'boolean', featureKey: 'messenger', en: 'Meta Messenger', bn: 'মেটা মেসেঞ্জার' },
              { id: 'instagram_dm', type: 'boolean', featureKey: 'instagram_dm', en: 'Instagram DM', bn: 'ইনস্টাগ্রাম ডিএম' },

              { id: 'features_hdr', type: 'header', en: 'Features', bn: 'ফিচারসমূহ' },
              { id: 'ai_assistant', type: 'boolean', featureKey: 'ai_assistant', en: 'AI Assistant', bn: 'এআই অ্যাসিস্ট্যান্ট' },
              { id: 'lead_manage', type: 'boolean', featureKey: 'lead_manage', en: 'Leads CRM', bn: 'লিডস সিআরএম' },
              { id: 'contact_labels', type: 'boolean', featureKey: 'contact_labels', en: 'Custom Contact Labels', bn: 'কাস্টম কন্টাক্ট লেবেল' },
              { id: 'team_management', type: 'boolean', featureKey: 'team_management', en: 'Team Members & Roles', bn: 'টিম মেম্বার ও রোলস' },
              { id: 'commerce', type: 'boolean', featureKey: 'commerce', en: 'Products & Orders', bn: 'প্রোডাক্টস ও অর্ডার' },
              { id: 'broadcast', type: 'boolean', featureKey: 'broadcast', en: 'Broadcast Campaign', bn: 'ব্রডকাস্ট ক্যাম্পেইন' },
              { id: 'allowByok', type: 'boolean', featureKey: 'allowByok', en: 'Bring Your Own Key (BYOK)', bn: 'নিজের এপিআই কী (BYOK)' },
              { id: 'platform_support_ai', type: 'boolean', featureKey: 'platform_support_ai', en: 'Priority AI Support', bn: 'প্রায়োরিটি সাপোর্ট' }
            ]
          },
          faqsJson: {
            categories: [
              { id: 'all', icon: 'Search', en: 'All Questions', bn: 'সব প্রশ্ন' },
              { id: 'general', icon: 'MessageCircleQuestion', en: 'General', bn: 'সাধারণ' },
              { id: 'pricing', icon: 'Receipt', en: 'Pricing & Quota', bn: 'মূল্য ও কোটা' },
              { id: 'ai', icon: 'Bot', en: 'AI Assistant', bn: 'এআই অ্যাসিস্ট্যান্ট' }
            ],
            faqs: [
              { 
                categoryId: 'general',
                question: { en: 'What is ZiniChat?', bn: 'ZiniChat কী?' }, 
                answer: { en: 'ZiniChat is an omnichannel AI platform.', bn: 'ZiniChat একটি অমনিচ্যানেল এআই প্ল্যাটফর্ম।' } 
              },
              {
                categoryId: 'pricing',
                question: { 
                  en: 'Does unused message or AI quota carry forward to the next month?', 
                  bn: 'অব্যবহৃত মেসেজ বা এআই রেসপন্স কোটা কি পরের মাসে ক্যারি ফরওয়ার্ড হবে?' 
                },
                answer: { 
                  en: 'Yes! For all paid plans, any unused AI response or total message balance will automatically carry forward when you renew your subscription for the next month. However, for the Free (0 BDT) plan, unused quotas reset each month and do not carry forward.', 
                  bn: 'হ্যাঁ! যেকোনো পেইড প্ল্যানে রিনিউ করলে আপনার আগের মাসের অব্যবহৃত এআই রেসপন্স ও মেসেজ কোটা স্বয়ংক্রিয়ভাবে পরের মাসে যোগ (Carry Forward) হবে। তবে ফ্রি (০ টাকা) প্ল্যানের ক্ষেত্রে অব্যবহৃত কোটা পরবর্তী মাসে ক্যারি ফরওয়ার্ড হবে না, স্বয়ংক্রিয়ভাবে রিসেট হয়ে যাবে।' 
                }
              },
              {
                categoryId: 'ai',
                question: {
                  en: 'How do I automatically train my AI Assistant using my Website URL?',
                  bn: 'ওয়েবসাইট লিংক দিয়ে কীভাবে স্বয়ংক্রিয়ভাবে এআই ট্রেন করা যায়?'
                },
                answer: {
                  en: 'In Dashboard -> Settings -> AI Training, enter your website URL and click "Fetch Website Knowledge & Train AI". ZiniChat will automatically crawl your site, extract key pages & policies, create a structured summary, and save it directly into your AI Assistant context.',
                  bn: 'ড্যাশবোর্ডের Settings -> AI Training পেজে গিয়ে আপনার ওয়েবসাইট URL বসিয়ে "Fetch Website Knowledge & Train AI" বাটনে ক্লিক করলেই ZiniChat ওয়েবসাইটের বিভিন্ন পেজ ও পলিসি স্ক্র্যাপ করে অটোমেটিক এআই নলেজ বেসে ট্রেনিং সম্পন্ন করে নেবে।'
                }
              },
              {
                categoryId: 'ai',
                question: {
                  en: 'How does ZiniChat minimize AI token consumption and cost?',
                  bn: 'ZiniChat কীভাবে এআই টোকেন খরচ ও সার্ভিস খরচ সাশ্রয় করে?'
                },
                answer: {
                  en: 'ZiniChat uses a 2-stage dynamic indexing & prompt caching architecture. Common greetings skip product catalog queries, dynamic retrieval fetches only top relevant items, and prompt headers are prefix-cached for up to 80% input token cost savings.',
                  bn: 'ZiniChat ২-স্টেজ ডাইনামিক ইনডেক্সিং এবং প্রম্পট ক্যাশিং আর্কিটেকচার ব্যবহার করে। সাধারণ মেসেজে ক্যাটাগরি সার্চ স্কিপ করা হয় এবং ডাইনামিক ফিল্টারিং দিয়ে ইনপুট টোকেন কস্ট ৮০% পর্যন্ত সাশ্রয় করা হয়।'
                }
              }
            ]
          },
          privacyPolicyJson: {
            en: 'Your Privacy Policy goes here. Edit this from the Superadmin dashboard.',
            bn: 'আপনার প্রাইভেসি পলিসি এখানে থাকবে। সুপারঅ্যাডমিন ড্যাশবোর্ড থেকে এটি এডিট করুন।'
          },
          termsConditionsJson: {
            en: 'Your Terms & Conditions go here. Edit this from the Superadmin dashboard.',
            bn: 'আপনার শর্তাবলী এখানে থাকবে। সুপারঅ্যাডমিন ড্যাশবোর্ড থেকে এটি এডিট করুন।'
          },
          dataDeletionJson: {
            en: 'Instructions for user data deletion go here. Edit this from the Superadmin dashboard.',
            bn: 'ব্যবহারকারীর ডেটা মুছে ফেলার নির্দেশাবলী এখানে থাকবে। সুপারঅ্যাডমিন ড্যাশবোর্ড থেকে এটি এডিট করুন।'
          },
          contactInfo: {
            address: { 
              en: '#386, Uttar Badda, Dhaka-1212, Bangladesh', 
              bn: '#৩৮৬, উত্তর বাড্ডা, ঢাকা-১২১২, বাংলাদেশ' 
            },
            email: 'info@zinichat.com',
            phone: '01533894967'
          },
          socialLinksJson: {
            facebook: { url: 'https://facebook.com', enabled: true },
            twitter: { url: 'https://twitter.com', enabled: true },
            linkedin: { url: 'https://linkedin.com', enabled: true },
            instagram: { url: 'https://instagram.com', enabled: true },
            whatsapp: { url: 'https://wa.me/8801533894967', enabled: true }
          }
        }
      });
    } else {
      // Ensure latest official contact details are synced in DB
      const current = (config.contactInfo as any) || {};
      if (current.email === 'hello@zinichat.com' || current.phone === '+880 1700 000 000' || current.phone === '+880 1234 567 890' || !current.address?.en?.includes('Badda')) {
        const updatedContactInfo = {
          address: { 
            en: '#386, Uttar Badda, Dhaka-1212, Bangladesh', 
            bn: '#৩৮৬, উত্তর বাড্ডা, ঢাকা-১২১২, বাংলাদেশ' 
          },
          email: 'info@zinichat.com',
          phone: '01533894967'
        };
        config = await this.prisma.landingPageConfig.update({
          where: { id: config.id },
          data: { contactInfo: updatedContactInfo }
        });
      }
    }
    return config;
  }

  async updateConfig(data: any) {
    const config = await this.getConfig();
    return this.prisma.landingPageConfig.update({
      where: { id: config.id },
      data
    });
  }
}
