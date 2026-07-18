const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updatePlans() {
  const plans = await prisma.plan.findMany();
  let updated = 0;
  
  for (const plan of plans) {
    let features = plan.features || [];
    if (typeof features === 'string') {
      try { features = JSON.parse(features); } catch(e) { features = []; }
    }
    
    if (!features.includes('whatsapp_widget')) {
      features.push('whatsapp_widget');
      await prisma.plan.update({
        where: { id: plan.id },
        data: { features }
      });
      updated++;
    }
  }
  console.log('Successfully updated ' + updated + ' plans with whatsapp_widget feature.');
}
updatePlans().catch(console.error).finally(() => prisma.$disconnect());
