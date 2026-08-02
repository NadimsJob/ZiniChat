const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const plansToDelete = ['Free', 'Starter', 'Growth'];
  
  for (const planName of plansToDelete) {
    const plan = await prisma.plan.findFirst({
      where: { name: planName }
    });
    
    if (plan) {
      console.log(`Found plan: ${plan.name} (${plan.id})`);
      
      const tenantsCount = await prisma.tenant.count({
        where: { planId: plan.id }
      });
      
      const subsCount = await prisma.subscription.count({
        where: { planId: plan.id }
      });
      
      console.log(`  Tenants using it: ${tenantsCount}`);
      console.log(`  Subscriptions using it: ${subsCount}`);
      
      if (tenantsCount > 0) {
        console.log(`  Unlinking from ${tenantsCount} tenants...`);
        await prisma.tenant.updateMany({
          where: { planId: plan.id },
          data: { planId: null }
        });
      }
      
      if (subsCount > 0) {
        console.log(`  Deleting ${subsCount} subscriptions...`);
        await prisma.subscription.deleteMany({
          where: { planId: plan.id }
        });
      }
      
      console.log(`  Deleting plan ${plan.name}...`);
      await prisma.plan.delete({
        where: { id: plan.id }
      });
      console.log(`  Successfully deleted ${plan.name}`);
    } else {
      console.log(`Plan ${planName} not found.`);
    }
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
