const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

async function main() {
  const prisma = new PrismaClient();
  try {
    const config = await prisma.landingPageConfig.findFirst();
    if (config) {
      fs.writeFileSync('C:\\Users\\ASUS\\.gemini\\antigravity-ide\\scratch\\landing_page.json', JSON.stringify(config, null, 2));
      console.log('Successfully exported LandingPageConfig');
    } else {
      console.log('No LandingPageConfig found in local DB');
    }
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
