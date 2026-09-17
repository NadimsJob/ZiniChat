const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: 'job.nadim30@gmail.com' },
    include: { tenant: { include: { businessNature: true } } }
  });

  if (!user) {
    console.log('User not found!');
    return;
  }

  console.log('User:', user.email, 'Tenant ID:', user.tenantId);
  console.log('Business Nature:', user.tenant?.businessNature);

  const conversations = await prisma.conversation.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { updatedAt: 'desc' },
    take: 5,
    include: {
      contact: true,
      messages: {
        orderBy: { createdAt: 'asc' },
        take: 20
      }
    }
  });

  console.log(`Found ${conversations.length} recent conversations:`);
  for (const c of conversations) {
    console.log(`--- Conversation ${c.id} with Contact ${c.contact.name} (${c.contact.phone || c.contact.email}) ---`);
    console.log('Status:', c.status, 'PendingOrderProposal:', c.pendingOrderProposal);
    for (const m of c.messages) {
      console.log(`  [${m.senderType}] ${m.createdAt.toISOString()}: ${m.content}`);
    }
  }

  const orders = await prisma.order.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { items: true, contact: true }
  });

  console.log(`Recent Orders count: ${orders.length}`);
  for (const o of orders) {
    console.log(`Order ${o.id}: status=${o.status}, createdBy=${o.createdBy}, total=${o.totalAmount}, contact=${o.contact?.name}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
