const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function seed() {
  // Find all tenants that need more leads
  const tenants = await p.tenant.findMany({
    where: { businessName: { in: ['Fashion Hub', 'Tech Store', 'Foodies', 'Test Business BD'] } },
    include: { kanbanStages: true }
  });

  const leadNames = [
    { name: 'Mohammad Rahman', phone: '+8801712345678', email: 'rahman@example.com', company: 'Rahman & Co', address: 'Dhaka, Bangladesh' },
    { name: 'Fatima Akter', phone: '+8801812345678', email: 'fatima@example.com', company: 'Akter Textiles', address: 'Chittagong, Bangladesh' },
    { name: 'Rahim Islam', phone: '+8801912345678', email: 'rahim@example.com', company: 'Islam Traders', address: 'Sylhet, Bangladesh' },
    { name: 'Nasrin Begum', phone: '+8801612345678', email: 'nasrin@example.com', company: 'Begum Fashions', address: 'Rajshahi, Bangladesh' },
    { name: 'Kamal Hossain', phone: '+8801511223344', email: 'kamal@example.com', company: 'Hossain Group', address: 'Khulna, Bangladesh' },
    { name: 'Sumaiya Khatun', phone: '+8801311223344', email: 'sumaiya@example.com', company: 'Khatun Exports', address: 'Barishal, Bangladesh' },
  ];

  for (const tenant of tenants) {
    let stages = tenant.kanbanStages;
    
    // Create stages if missing
    if (stages.length < 3) {
      const stageData = [
        { name: 'New Lead', color: '#3b82f6', order: 0 },
        { name: 'Contacted', color: '#f59e0b', order: 1 },
        { name: 'Qualified', color: '#8b5cf6', order: 2 },
        { name: 'Closed Won', color: '#10b981', order: 3 },
        { name: 'Closed Lost', color: '#ef4444', order: 4 },
      ];
      for (const s of stageData) {
        const exists = stages.find(x => x.name === s.name);
        if (!exists) {
          const created = await p.kanbanStage.create({ data: { tenantId: tenant.id, ...s } });
          stages.push(created);
        }
      }
    }

    // Add leads/contacts
    for (let i = 0; i < leadNames.length; i++) {
      const lead = leadNames[i];
      const stage = stages[i % stages.length];
      
      // Check if contact already exists
      const existing = await p.contact.findFirst({ 
        where: { tenantId: tenant.id, name: lead.name } 
      });
      if (!existing) {
        await p.contact.create({
          data: {
            tenantId: tenant.id,
            channel: 'manual',
            externalContactId: `manual_${tenant.id}_${i}_${Date.now()}`,
            name: lead.name,
            phone: lead.phone,
            email: lead.email,
            company: lead.company,
            address: lead.address,
            stageId: stage.id,
            lastSeenAt: new Date(Date.now() - i * 86400000), // staggered dates
          }
        });
        console.log(`Added lead ${lead.name} to ${tenant.businessName}`);
      }
    }

    // Add notes to first contact
    const firstContact = await p.contact.findFirst({ where: { tenantId: tenant.id } });
    if (firstContact) {
      const noteCount = await p.contactNote.count({ where: { contactId: firstContact.id } });
      if (noteCount === 0) {
        await p.contactNote.create({ data: { contactId: firstContact.id, content: 'Called the customer. They are interested in our premium plan.' } });
        await p.contactNote.create({ data: { contactId: firstContact.id, content: 'Sent follow-up email with pricing details.' } });
      }
    }
  }

  console.log('Leads seeded successfully!');
}

seed().catch(console.error).finally(() => p.$disconnect());
