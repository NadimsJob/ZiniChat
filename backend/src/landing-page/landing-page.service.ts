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
              title: { en: 'Omnichannel Inbox', bn: 'অমনিচ্যানেল ইনবক্স' }, 
              description: { en: 'Manage all channels in one place.', bn: 'এক জায়গা থেকে সব চ্যানেল পরিচালনা করুন।' } 
            },
            { 
              title: { en: 'AI Assistant', bn: 'এআই অ্যাসিস্ট্যান্ট' }, 
              description: { en: '24/7 automated replies.', bn: '২৪/৭ অটোমেটেড রিপ্লাই।' } 
            }
          ],
          pricingJson: [
            { 
              name: { en: 'Starter', bn: 'স্টার্টার' }, 
              price: { en: '৳1000/mo', bn: '৳১০০০/মাস' }, 
              features: [{ en: '1 Seat', bn: '১ টি সিট' }, { en: '1000 Messages', bn: '১০০০ মেসেজ' }] 
            }
          ],
          faqsJson: [
            { 
              question: { en: 'Is it secure?', bn: 'এটি কি নিরাপদ?' }, 
              answer: { en: 'Yes, fully encrypted.', bn: 'হ্যাঁ, সম্পূর্ণ এনক্রিপ্টেড।' } 
            }
          ]
        }
      });
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
