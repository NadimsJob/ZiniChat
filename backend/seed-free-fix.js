const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const freePlan = await prisma.plan.findFirst({
    where: { name: 'Free' }
  });

  if (freePlan) {
    await prisma.plan.update({
      where: { id: freePlan.id },
      data: {
        nameBn: 'ফ্রি',
        descriptionBn: 'প্লাটফর্ম ট্রায়াল করার জন্য একদম পারফেক্ট।',
        featuresJson: [
          { en: '1 Team Member', bn: '১ টিম মেম্বার' },
          { en: '100 Messages/mo', bn: '১০০ মেসেজ/মাস' },
          { en: '50 AI Responses', bn: '৫০ এআই রেসপন্স' }
        ]
      }
    });
    console.log('Fixed Bengali encoding for Free plan!');
  } else {
    console.log('Free plan not found');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
