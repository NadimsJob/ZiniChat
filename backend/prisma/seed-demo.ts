import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Demo Data...');

  // 1. Ensure Plans exist with proper features
  const plansData = [
    {
      name: 'Starter Plan',
      nameBn: 'স্টার্টার প্ল্যান',
      priceUsd: 15.00,
      billingCycle: 'monthly',
      messageQuota: 1000,
      aiQuota: 500,
      seatLimit: 1,
      isActive: true,
      features: JSON.stringify(['messenger', 'lead_manage'])
    },
    {
      name: 'Growth Plan',
      nameBn: 'গ্রোথ প্ল্যান',
      priceUsd: 49.00,
      billingCycle: 'monthly',
      messageQuota: 5000,
      aiQuota: 3000,
      seatLimit: 3,
      isActive: true,
      features: JSON.stringify(['messenger', 'whatsapp', 'lead_manage', 'commerce', 'ai_assistant'])
    },
    {
      name: 'Pro Plan',
      nameBn: 'প্রো প্ল্যান',
      priceUsd: 99.00,
      billingCycle: 'monthly',
      messageQuota: 20000,
      aiQuota: 15000,
      seatLimit: 10,
      isActive: true,
      features: JSON.stringify(['messenger', 'whatsapp', 'lead_manage', 'commerce', 'ai_assistant', 'own_api'])
    }
  ];

  const plans = [];
  for (const p of plansData) {
    let plan = await prisma.plan.findFirst({ where: { name: p.name } });
    if (plan) {
      plan = await prisma.plan.update({ where: { id: plan.id }, data: { features: p.features } });
    } else {
      plan = await prisma.plan.create({ data: p });
    }
    plans.push(plan);
  }

  // 2. Create 3 Demo Tenants (One for each plan)
  const tenantConfigs = [
    { name: 'StyleX Fashion', email: 'starter@stylex.com', planIdx: 0 },
    { name: 'GadgetHub BD', email: 'growth@gadgethub.com', planIdx: 1 },
    { name: 'ZiniChat Enterprise', email: 'pro@zinichat.com', planIdx: 2 }
  ];

  const hashedPassword = await bcrypt.hash('123456', 10);

  for (const config of tenantConfigs) {
    let tenant = await prisma.tenant.findFirst({ where: { businessName: config.name } });
    
    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: {
          businessName: config.name,
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
        }
      });
      
      const user = await prisma.user.create({
        data: {
          tenantId: tenant.id,
          name: `${config.name} Admin`,
          email: config.email,
          passwordHash: hashedPassword,
          role: 'admin',
        }
      });

      await prisma.subscription.create({
        data: {
          tenantId: tenant.id,
          planId: plans[config.planIdx].id,
          status: 'active',
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      });
    }

    const tenantId = tenant.id;

    // 3. Create AI Assistant
    const aiAssistant = await prisma.aiAssistant.findFirst({ where: { tenantId } });
    if (!aiAssistant) {
      await prisma.aiAssistant.create({
        data: {
          tenantId,
          modelProvider: 'openai',
          modelName: 'gpt-4o-mini',
          apiKeyMode: 'platform',
          systemPrompt: `You are the AI assistant for ${config.name}. Be polite and helpful.`,
          routingMode: 'system_only'
        }
      });
    }

    // 4. Create Kanban Stages
    const stages = ['New', 'Follow Up', 'Qualified', 'Lost'];
    const dbStages = [];
    for (const [index, s] of stages.entries()) {
      let stage = await prisma.kanbanStage.findFirst({ where: { tenantId, name: s } });
      if (!stage) {
        stage = await prisma.kanbanStage.create({ data: { tenantId, name: s, order: index } });
      }
      dbStages.push(stage);
    }

    // 5. Create Products
    const products = [
      { name: 'Wireless Headphones', price: 2500, sku: 'WH-01' },
      { name: 'Smart Watch', price: 3500, sku: 'SW-02' },
      { name: 'Bluetooth Speaker', price: 1500, sku: 'BS-03' },
      { name: 'Power Bank 20000mAh', price: 2000, sku: 'PB-04' }
    ];
    for (const p of products) {
      const exists = await prisma.product.findFirst({ where: { tenantId, sku: p.sku } });
      if (!exists) {
        await prisma.product.create({ data: { tenantId, ...p, stockCount: 50, trackInventory: true } });
      }
    }

    // 6. Create Contacts & Conversations
    for (let i = 1; i <= 5; i++) {
      const contactPhone = `+880170000000${i}`;
      let contact = await prisma.contact.findFirst({ where: { tenantId, phone: contactPhone } });
      if (!contact) {
        contact = await prisma.contact.create({
          data: {
            tenantId,
            name: `Customer ${i}`,
            phone: contactPhone,
            stageId: dbStages[i % 4].id,
            channel: 'whatsapp',
            externalContactId: `ext_${contactPhone}`
          }
        });

        const conversation = await prisma.conversation.create({
          data: {
            tenantId,
            contactId: contact.id,
            channel: 'whatsapp'
          }
        });

        // Messages
        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            externalMessageId: `msg_${Date.now()}_in_${i}`,
            direction: 'inbound',
            type: 'text',
            status: 'delivered',
            content: { text: `Hello, do you have the smart watch in stock?` }
          }
        });
        
        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            externalMessageId: `msg_${Date.now()}_out_${i}`,
            direction: 'outbound',
            type: 'text',
            content: `Yes, we do! It costs 3500 BDT.`,
            status: 'delivered'
          }
        });

        // Orders
        if (i % 2 === 0) {
          await prisma.order.create({
            data: {
              tenantId,
              conversationId: conversation.id,
              contactId: contact.id,
              status: 'pending',
              totalAmount: 3500,
              items: {
                create: [
                  { productId: (await prisma.product.findFirst({ where: { tenantId, sku: 'SW-02' } }))!.id, quantity: 1, priceAtTime: 3500 }
                ]
              }
            }
          });
        }
      }
    }
    
    console.log(`Seeded demo data for tenant: ${config.name}`);
  }

  console.log('Demo Data Seeding Complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
