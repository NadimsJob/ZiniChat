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
              { id: 'channels', type: 'header', en: 'Channels', bn: 'চ্যানেলসমূহ' },
              { id: 'whatsapp', type: 'boolean', featureKey: 'whatsapp', en: 'WhatsApp Business API', bn: 'হোয়াটসঅ্যাপ API' },
              { id: 'messenger', type: 'boolean', featureKey: 'messenger', en: 'Meta Messenger', bn: 'মেটা মেসেঞ্জার' },
              { id: 'limits', type: 'header', en: 'Limits', bn: 'লিমিটস' },
              { id: 'seats', type: 'value', featureKey: 'seatLimit', en: 'Team Members', bn: 'টিম মেম্বার' }
            ]
          },
          faqsJson: {
            categories: [
              { id: 'all', icon: 'Search', en: 'All Questions', bn: 'সব প্রশ্ন' },
              { id: 'general', icon: 'MessageCircleQuestion', en: 'General', bn: 'সাধারণ' },
              { id: 'ai', icon: 'Bot', en: 'AI Assistant', bn: 'এআই অ্যাসিস্ট্যান্ট' }
            ],
            faqs: [
              { 
                categoryId: 'general',
                question: { en: 'What is ZiniChat?', bn: 'ZiniChat কী?' }, 
                answer: { en: 'ZiniChat is an omnichannel AI platform.', bn: 'ZiniChat একটি অমনিচ্যানেল এআই প্ল্যাটফর্ম।' } 
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
