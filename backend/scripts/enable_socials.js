const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const configs = await prisma.landingPageConfig.findMany();
  for (const config of configs) {
    let socialLinksJson = config.socialLinksJson || {};
    
    const platforms = ['facebook', 'twitter', 'linkedin', 'instagram', 'whatsapp'];
    for (const platform of platforms) {
      if (!socialLinksJson[platform]) {
        socialLinksJson[platform] = { url: `https://${platform}.com/zinichat`, enabled: true };
      } else {
        socialLinksJson[platform].enabled = true;
        if (!socialLinksJson[platform].url) {
          socialLinksJson[platform].url = `https://${platform}.com/zinichat`;
        }
      }
    }

    await prisma.landingPageConfig.update({
      where: { id: config.id },
      data: { socialLinksJson }
    });
  }
  console.log("Updated social links successfully!");
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
