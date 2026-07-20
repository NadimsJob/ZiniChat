const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const config = await prisma.landingPageConfig.findFirst();
  console.log(config);
  if (config) {
    await prisma.landingPageConfig.update({
      where: {id: config.id},
      data: {
        heroTitle: 'Your Omnichannel AI Business Assistant',
        heroTitleBn: 'আপনার ব্যবসার জন্য সম্পূর্ণ ওমনিচ্যানেল এআই অ্যাসিস্ট্যান্ট',
        heroSubtitle: 'ZiniChat provides a human-like AI assistant that handles your customers and converts leads 24/7 across all channels.',
        heroSubtitleBn: 'জিনিচ্যাট আপনার ব্যবসার জন্য এমন একটি মানুষের মতো এআই অ্যাসিস্ট্যান্ট প্রদান করে, যা ২৪/৭ সব চ্যানেলে কাস্টমার সামলায় এবং লিড কনভার্ট করে।'
      }
    });
    console.log('Updated config in database');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
