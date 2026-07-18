const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function check() {
  // Find ZiniChat Enterprise tenant
  const tenant = await p.tenant.findFirst({ 
    where: { businessName: 'ZiniChat Enterprise' },
    include: { 
      users: { select: { email: true, role: true } },
      contacts: { select: { name: true, stageId: true } },
      kanbanStages: true
    }
  });
  console.log('Tenant:', JSON.stringify(tenant, null, 2));
}

check().catch(console.error).finally(() => p.$disconnect());
