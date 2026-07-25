require('dotenv').config({ path: '../backend/.env.live' });
const { PrismaClient } = require('../backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.findFirst({
    where: { businessName: "Nadim Mridha's Workspace" },
    include: {
      subscriptions: {
        include: { plan: true }
      }
    }
  });

  console.log("Tenant customFeatures:", tenant.customFeatures);
  console.log("Tenant customAllowByok:", tenant.customAllowByok);
  
  if (tenant.subscriptions.length > 0) {
    console.log("Base Plan Features:", tenant.subscriptions[0].plan.features);
    console.log("Base Plan AllowByok:", tenant.subscriptions[0].plan.allowByok);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
