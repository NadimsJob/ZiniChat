import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding packages and addons...');

  await prisma.plan.deleteMany();
  await prisma.addon.deleteMany();

  // Create 3 Plans
  await prisma.plan.create({
    data: {
      name: 'Starter Plan',
      nameBn: 'স্টার্টার প্ল্যান',
      description: 'Perfect for small businesses starting their journey.',
      descriptionBn: 'ছোট ব্যবসার জন্য একদম পারফেক্ট।',
      priceUsd: 15.00,
      billingCycle: 'monthly',
      messageQuota: 1000,
      aiQuota: 500,
      seatLimit: 1,
      isActive: true,
      isPopular: false,
      featuresJson: [
        { en: 'Basic Analytics', bn: 'বেসিক অ্যানালিটিক্স' },
      ],
    },
  });

  await prisma.plan.create({
    data: {
      name: 'Growth Plan',
      nameBn: 'গ্রোথ প্ল্যান',
      description: 'Ideal for growing teams with higher volume.',
      descriptionBn: 'ক্রমবর্ধমান ব্যবসার জন্য সবচেয়ে জনপ্রিয় প্ল্যান।',
      priceUsd: 49.00,
      billingCycle: 'monthly',
      messageQuota: 5000,
      aiQuota: 3000,
      seatLimit: 3,
      isActive: true,
      isPopular: true,
      featuresJson: [
        { en: 'Advanced Analytics', bn: 'অ্যাডভান্সড অ্যানালিটিক্স' },
        { en: 'WhatsApp & Messenger', bn: 'হোয়াটসঅ্যাপ ও মেসেঞ্জার' },
      ],
    },
  });

  await prisma.plan.create({
    data: {
      name: 'Pro Plan',
      nameBn: 'প্রো প্ল্যান',
      description: 'For power users needing unlimited scale.',
      descriptionBn: 'বড় টিম এবং পাওয়ার ইউজারদের জন্য।',
      priceUsd: 99.00,
      billingCycle: 'monthly',
      messageQuota: 20000,
      aiQuota: 15000,
      seatLimit: 10,
      isActive: true,
      isPopular: false,
      featuresJson: [
        { en: 'Custom AI Tools', bn: 'কাস্টম এআই টুলস' },
        { en: '24/7 Priority Support', bn: 'সার্বক্ষণিক প্রাইওরিটি সাপোর্ট' },
      ],
    },
  });

  // Create Addons
  await prisma.addon.create({
    data: {
      name: 'Extra AI Tokens',
      nameBn: 'অতিরিক্ত এআই টোকেন',
      description: 'Get an extra 5000 AI tokens for your assistant.',
      descriptionBn: 'আপনার এআই অ্যাসিস্ট্যান্টের জন্য অতিরিক্ত ৫০০০ টোকেন।',
      priceUsd: 10.00,
      type: 'ai_tokens',
      value: 5000,
      isActive: true,
    },
  });

  await prisma.addon.create({
    data: {
      name: 'Extra Team Member',
      nameBn: 'অতিরিক্ত টিম মেম্বার',
      description: 'Add one more team member to your workspace.',
      descriptionBn: 'আপনার ওয়ার্কস্পেসে আরও একজন নতুন টিম মেম্বার যোগ করুন।',
      priceUsd: 5.00,
      type: 'seats',
      value: 1,
      isActive: true,
    },
  });

  await prisma.addon.create({
    data: {
      name: 'Extra Messages',
      nameBn: 'অতিরিক্ত মেসেজ',
      description: 'Add 10,000 more messages to your quota.',
      descriptionBn: 'আপনার কোটায় আরও ১০,০০০ মেসেজ যোগ করুন।',
      priceUsd: 15.00,
      type: 'messages',
      value: 10000,
      isActive: true,
    },
  });

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
