import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Database...');

  // 1. Create Superadmin User
  const existingSuperadmin = await prisma.user.findUnique({ where: { email: 'superadmin@zinichat.com' } });
  if (!existingSuperadmin) {
    const passwordHash = await bcrypt.hash('superadmin123', 10);
    await prisma.user.create({
      data: {
        name: 'ZiniChat Superadmin',
        email: 'superadmin@zinichat.com',
        passwordHash,
        role: 'superadmin',
        permissions: ['*']
      }
    });
    console.log('Superadmin created.');
  }

  // 2. Create 3 Packages (Monthly & Yearly in BDT)
  const plans = [
    {
      name: 'Starter',
      nameBn: 'স্টার্টার',
      description: 'Perfect for small businesses starting out.',
      descriptionBn: 'ছোট ব্যবসার জন্য একদম পারফেক্ট।',
      priceMonthlyBdt: 999,
      priceYearlyBdt: 9990,
      messageQuota: 5000,
      aiQuota: 2000,
      seatLimit: 1,
      channelLimit: 1,
      storageLimitMb: 500,
      features: JSON.stringify(['whatsapp', 'lead_manage']),
      featuresJson: [
        { en: '1 WhatsApp Number', bn: '১টি হোয়াটসঅ্যাপ নাম্বার' },
        { en: '2,000 AI Responses', bn: '২,০০০ এআই রেসপন্স' },
        { en: 'Lead Management', bn: 'লিড ম্যানেজমেন্ট' }
      ],
      isPopular: false
    },
    {
      name: 'Growth',
      nameBn: 'গ্রোথ',
      description: 'For growing teams with more volume.',
      descriptionBn: 'মাঝারি বা বড় ব্যবসার জন্য।',
      priceMonthlyBdt: 2499,
      priceYearlyBdt: 24990,
      messageQuota: 20000,
      aiQuota: 10000,
      seatLimit: 3,
      channelLimit: 3,
      storageLimitMb: 2048, // 2GB
      features: JSON.stringify(['whatsapp', 'messenger', 'lead_manage', 'commerce', 'ai_assistant']),
      featuresJson: [
        { en: '3 Channels (WA/FB)', bn: '৩টি চ্যানেল (WA/FB)' },
        { en: '10,000 AI Responses', bn: '১০,০০০ এআই রেসপন্স' },
        { en: 'Commerce & Orders', bn: 'কমার্স ও অর্ডার' },
        { en: 'Custom AI Training', bn: 'কাস্টম এআই ট্রেনিং' }
      ],
      isPopular: true
    },
    {
      name: 'Enterprise',
      nameBn: 'এন্টারপ্রাইজ',
      description: 'Advanced features for large teams.',
      descriptionBn: 'বড় টিমের জন্য অ্যাডভান্সড ফিচার।',
      priceMonthlyBdt: 4999,
      priceYearlyBdt: 49990,
      messageQuota: 100000,
      aiQuota: 50000,
      seatLimit: 10,
      channelLimit: 10,
      storageLimitMb: 10240, // 10GB
      features: JSON.stringify(['whatsapp', 'messenger', 'lead_manage', 'commerce', 'ai_assistant', 'api_access']),
      featuresJson: [
        { en: 'Unlimited Channels', bn: 'আনলিমিটেড চ্যানেল' },
        { en: '50,000 AI Responses', bn: '৫০,০০০ এআই রেসপন্স' },
        { en: 'API Access', bn: 'এপিআই এক্সেস' },
        { en: 'Priority Support', bn: 'প্রায়োরিটি সাপোর্ট' }
      ],
      isPopular: false
    }
  ];

  for (const plan of plans) {
    const existing = await prisma.plan.findFirst({ where: { name: plan.name } });
    if (!existing) {
      await prisma.plan.create({ data: plan });
    } else {
      await prisma.plan.update({ where: { id: existing.id }, data: plan });
    }
  }
  console.log('Plans seeded successfully.');

  // 3. Create sample coupon
  const existingCoupon = await prisma.coupon.findUnique({ where: { code: 'WELCOME50' } });
  if (!existingCoupon) {
    await prisma.coupon.create({
      data: {
        code: 'WELCOME50',
        discountType: 'percentage',
        discountAmount: 50,
        maxUses: 100,
        isActive: true
      }
    });
    console.log('Sample coupon WELCOME50 created.');
  }

  // Set initial exchange rate (1 USD = 120 BDT roughly)
  const existingRate = await prisma.exchangeRate.findFirst();
  if (!existingRate) {
    await prisma.exchangeRate.create({
      data: {
        baseCurrency: 'USD',
        targetCurrency: 'BDT',
        rate: 120
      }
    });
    console.log('Exchange rate seeded.');
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
