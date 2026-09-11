const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const path = require('path');
const os = require('os');
require('dotenv').config({ path: path.join(__dirname, '.env.deploy') });

async function main() {
  const ssh = new NodeSSH();
  const keyPath = process.env.LIVE_SSH_KEY_PATH || path.join(os.homedir(), '.ssh', 'id_rsa');
  
  await ssh.connect({
    host: process.env.LIVE_SERVER_HOST || '76.13.187.85',
    username: process.env.LIVE_SERVER_USER || 'root',
    privateKey: fs.readFileSync(keyPath, 'utf8'),
  });

  const code = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const user = await prisma.user.findFirst({
    where: { email: 'job.nadim30@gmail.com' },
    include: { tenant: true }
  });
  if (!user) return console.log('User not found!');
  console.log('User:', user.email, 'Tenant ID:', user.tenantId);
  console.log('Business Nature:', JSON.stringify(user.tenant?.businessNature));

  const conversations = await prisma.conversation.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { lastMessageAt: 'desc' },
    take: 5,
    include: {
      contact: true,
      messages: { orderBy: { createdAt: 'asc' } }
    }
  });

  console.log('Found', conversations.length, 'conversations');
  for (const c of conversations) {
    console.log('--- CONV ID:', c.id, '| Contact:', c.contact?.name, c.contact?.phone);
    console.log('    PendingProposal:', JSON.stringify(c.pendingOrderProposal));
    for (const m of c.messages) {
      console.log('  [' + m.senderType + '] ' + m.createdAt.toISOString() + ': ' + String(m.content || '').slice(0, 150));
    }
  }

  const contact = await prisma.contact.findFirst({
    where: { tenantId: user.tenantId, name: { contains: 'Nadim', mode: 'insensitive' } }
  });
  const conversation = await prisma.conversation.findFirst({
    where: { tenantId: user.tenantId, contactId: contact?.id }
  });

  if (contact) {
    const existingOrder = await prisma.order.findFirst({
      where: { tenantId: user.tenantId, contactId: contact.id }
    });
    if (!existingOrder) {
      const created = await prisma.order.create({
        data: {
          tenantId: user.tenantId,
          contactId: contact.id,
          conversationId: conversation?.id,
          totalAmount: 0,
          notes: '[AI Demo Request] Software/Plan: Starter | Date: Tomorrow 10:00 AM | Phone: 01791894967 | Customer message: "Ji agami kal 10 tay"',
          createdBy: 'ai',
          status: 'pending'
        }
      });
      if (conversation) {
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: { hasOrderRequest: true }
        });
      }
      console.log('Created missing order:', created.id);
    } else {
      console.log('Order already exists:', existingOrder.id);
    }
  }

  const orders = await prisma.order.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { createdAt: 'desc' }
  });
  console.log('ORDERS Count:', orders.length);
  for (const o of orders) {
    console.log('Order:', o.id, o.status, o.notes, o.createdAt);
  }
  await prisma.$disconnect();
}
run();
`;

  await ssh.execCommand(`docker exec zinichat_backend_live node -e "${code.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\$/g, '\\$').replace(/\n/g, ' ')}"`);
  const res = await ssh.execCommand(`docker exec zinichat_backend_live node -e "${code.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\$/g, '\\$').replace(/\n/g, ' ')}"`);
  console.log('--- DATABASE INSPECTION ---');
  console.log(res.stdout);
  console.log(res.stderr);
  console.log('--- DATABASE INSPECTION ---');
  console.log(res.stdout);
  console.log(res.stderr);

  ssh.dispose();
}

main().catch(console.error);
