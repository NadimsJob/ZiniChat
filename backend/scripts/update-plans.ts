import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Fetching all plans...');
  const plans = await prisma.plan.findMany();

  for (const plan of plans) {
    let features: string[] = [];
    if (typeof plan.features === 'string') {
        features = JSON.parse(plan.features as string);
    } else if (Array.isArray(plan.features)) {
        features = plan.features as string[];
    }

    if (!features.includes('whatsapp_qr')) {
      features.push('whatsapp_qr');
      await prisma.plan.update({
        where: { id: plan.id },
        data: { features }
      });
      console.log(`Updated plan: ${plan.name} - Added whatsapp_qr`);
    } else {
      console.log(`Plan: ${plan.name} - already has whatsapp_qr`);
    }
  }
  console.log('Update complete.');
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
