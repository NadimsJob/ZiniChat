const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting migration for Free trials...');
  const now = new Date();

  // Find all subscriptions that belong to a Free plan
  const freePlan = await prisma.plan.findFirst({
    where: { name: 'Free' }
  });

  if (!freePlan) {
    console.log('Free plan not found!');
    return;
  }

  const freeSubscriptions = await prisma.subscription.findMany({
    where: {
      planId: freePlan.id
    }
  });

  console.log(`Found ${freeSubscriptions.length} Free subscriptions to evaluate.`);

  let updatedCount = 0;
  let expiredCount = 0;
  let trialingCount = 0;

  for (const sub of freeSubscriptions) {
    const start = new Date(sub.currentPeriodStart);
    // Trial is 7 days from start
    const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    let newStatus = 'trialing';
    if (end < now) {
      newStatus = 'expired';
    }

    await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        currentPeriodEnd: end,
        status: newStatus
      }
    });

    updatedCount++;
    if (newStatus === 'expired') expiredCount++;
    if (newStatus === 'trialing') trialingCount++;
  }

  console.log(`Migration complete.`);
  console.log(`Total Updated: ${updatedCount}`);
  console.log(`Converted to expired: ${expiredCount}`);
  console.log(`Kept as trialing: ${trialingCount}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
