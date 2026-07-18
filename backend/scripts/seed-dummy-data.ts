import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding data...');

  // 1. Create Superadmin if not exists
  const superadminEmail = 'admin@zinichat.com';
  let superadmin = await prisma.user.findUnique({ where: { email: superadminEmail } });
  if (!superadmin) {
    const passwordHash = await bcrypt.hash('admin123', 10);
    superadmin = await prisma.user.create({
      data: {
        name: 'Super Admin',
        email: superadminEmail,
        passwordHash,
        role: 'superadmin',
        agentAccessMode: 'ALL_CHANNELS'
      },
    });
    console.log('Created superadmin');
  }

  // 2. Fetch or Create Plans
  let basicPlan = await prisma.plan.findFirst({ where: { name: 'Basic' } });
  if (!basicPlan) {
    basicPlan = await prisma.plan.create({
      data: { name: 'Basic', priceUsd: 19, messageQuota: 1000, aiQuota: 100, seatLimit: 3, features: ['inbox', 'crm'], isActive: true }
    });
  }
  
  let proPlan = await prisma.plan.findFirst({ where: { name: 'Pro' } });
  if (!proPlan) {
    proPlan = await prisma.plan.create({
      data: { name: 'Pro', priceUsd: 49, messageQuota: 5000, aiQuota: 500, seatLimit: 10, features: ['inbox', 'crm', 'commerce'], isActive: true }
    });
  }

  let enterprisePlan = await prisma.plan.findFirst({ where: { name: 'Enterprise' } });
  if (!enterprisePlan) {
    enterprisePlan = await prisma.plan.create({
      data: { name: 'Enterprise', priceUsd: 99, messageQuota: 20000, aiQuota: 2000, seatLimit: 25, features: ['inbox', 'crm', 'commerce', 'ai_assistant'], isActive: true }
    });
  }

  const plans = [basicPlan, proPlan, enterprisePlan];

  // 3. Create 3 Tenants with varying data
  const tenantConfigs = [
    { businessName: 'Fashion Hub', email: 'owner@fashionhub.com', plan: proPlan },
    { businessName: 'Tech Store', email: 'owner@techstore.com', plan: basicPlan },
    { businessName: 'Foodies', email: 'owner@foodies.com', plan: enterprisePlan },
  ];

  for (const tConfig of tenantConfigs) {
    let tenant = await prisma.tenant.findFirst({ where: { businessName: tConfig.businessName } });
    
    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: {
          businessName: tConfig.businessName,
          planId: tConfig.plan!.id,
          status: 'active'
        }
      });
      console.log(`Created tenant: ${tenant.businessName}`);

      // Create owner user
      const passwordHash = await bcrypt.hash('password123', 10);
      const owner = await prisma.user.create({
        data: {
          name: `${tConfig.businessName} Owner`,
          email: tConfig.email,
          passwordHash,
          role: 'owner',
          tenantId: tenant.id,
          agentAccessMode: 'ALL_CHANNELS'
        }
      });

      // Create Subscription
      await prisma.subscription.create({
        data: {
          tenantId: tenant.id,
          planId: tConfig.plan!.id,
          status: 'active',
          currentPeriodEnd: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        }
      });

      // --- SEED FEATURES ---

      // 1. Team (Agents)
      const agent1 = await prisma.user.create({
        data: {
          name: 'Support Agent 1', email: `agent1@${tConfig.businessName.replace(/\s+/g, '').toLowerCase()}.com`, passwordHash, role: 'agent', tenantId: tenant.id, agentAccessMode: 'ALL_CHANNELS'
        }
      });

      // 2. Channels
      const waChannel = await prisma.channelConnection.create({
        data: {
          tenantId: tenant.id,
          channelType: 'whatsapp',
          externalAccountId: `wa-${tConfig.businessName}`,
          accessTokenEncrypted: 'dummy-token',
          displayName: 'WhatsApp Business',
          status: 'active'
        }
      });

      // 3. Labels
      const vipLabel = await prisma.label.create({ data: { tenantId: tenant.id, name: 'VIP', color: '#8b5cf6' } });

      // 4. Contacts & Conversations
      const contact1 = await prisma.contact.create({
        data: { tenantId: tenant.id, name: 'Alice Smith', externalContactId: '+1234567890', channel: 'whatsapp', email: 'alice@test.com', phone: '+1234567890' }
      });
      const conv1 = await prisma.conversation.create({
        data: {
          tenantId: tenant.id,
          contactId: contact1.id,
          channel: 'whatsapp',
          status: 'open',
          lastMessageAt: new Date(),
          assignedAgentId: agent1.id
        }
      });
      await prisma.conversationLabel.create({ data: { conversationId: conv1.id, labelId: vipLabel.id } });
      await prisma.message.create({ data: { conversationId: conv1.id, type: 'text', status: 'delivered', content: 'Hi, I need help with my order.', direction: 'INBOUND', externalMessageId: 'ext-1' } });

      // 5. Products
      const product1 = await prisma.product.create({
        data: { tenantId: tenant.id, name: 'Wireless Headphones', description: 'Noise cancelling headphones.', price: 2500, stockCount: 50, imageUrl: 'https://via.placeholder.com/300' }
      });

      // 6. Orders
      await prisma.order.create({
        data: {
          tenantId: tenant.id,
          contactId: contact1.id,
          totalAmount: 2500,
          status: 'pending',
          currency: 'BDT',
          items: {
            create: [
              { productId: product1.id, quantity: 1, priceAtTime: 2500 }
            ]
          }
        }
      });

      // 7. Lead Stages (Kanban)
      const stageNew = await prisma.kanbanStage.create({ data: { tenantId: tenant.id, name: 'New Lead', color: '#3b82f6', order: 0 } });
      
      // Update contact with lead stage
      await prisma.contact.update({
        where: { id: contact1.id },
        data: {
          stageId: stageNew.id,
          assignedUserId: agent1.id,
        }
      });

      // 8. Notifications
      await prisma.notification.create({
        data: {
          userId: owner.id,
          title: 'Welcome!',
          message: 'Welcome to your new dashboard.',
          type: 'info',
        }
      });
    } else {
      console.log(`Tenant ${tConfig.businessName} already exists, skipping...`);
    }
  }

  // Generate some payments for superadmin to see in pending/approved
  const firstTenant = await prisma.tenant.findFirst();
  if (firstTenant) {
    const existingPayment = await prisma.payment.findFirst({ where: { trxId: 'TRX-DUMMY-123' } });
    const sub = await prisma.subscription.findFirst({ where: { tenantId: firstTenant.id }});
    if (!existingPayment && sub) {
      await prisma.payment.create({
        data: {
          tenantId: firstTenant.id,
          subscriptionId: sub.id,
          amount: 5000,
          provider: 'manual',
          trxId: 'TRX-DUMMY-123',
          status: 'pending',
        }
      });
      await prisma.payment.create({
        data: {
          tenantId: firstTenant.id,
          subscriptionId: sub.id,
          amount: 10000,
          provider: 'manual',
          trxId: 'TRX-DUMMY-456',
          status: 'success',
        }
      });
      console.log('Created dummy payments for superadmin.');
    }
  }

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
