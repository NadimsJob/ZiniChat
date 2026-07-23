const fs = require('fs');
const envContent = fs.readFileSync(__dirname + '/.env.live', 'utf-8');
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    process.env[match[1]] = match[2].trim().replace(/^['"](.*)['"]$/, '$1');
  }
});
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const searchName = args[0] || 'test';

  console.log(`Searching for tenant with name containing: ${searchName}`);
  
  const tenants = await prisma.tenant.findMany({
    where: {
      businessName: {
        contains: searchName,
        mode: 'insensitive'
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  if (tenants.length === 0) {
    console.log('No test tenants found.');
    return;
  }

  if (tenants.length > 1 && !args[0]) {
    console.log('Found multiple test tenants:');
    tenants.forEach(t => console.log(`- ID: ${t.id} | Name: ${t.businessName} | Created: ${t.createdAt}`));
    console.log('Please provide a specific name or ID as an argument to delete: node delete-live-tenant.js "Exact Name"');
    return;
  }

  const tenantToDelete = tenants[0];
  console.log(`\nFound Tenant to delete: ID ${tenantToDelete.id} - ${tenantToDelete.businessName}`);
  
  // To safely delete without foreign key errors, we must delete backwards in a transaction
  console.log('Initiating cascade deletion transaction...');
  try {
    await prisma.$transaction(async (tx) => {
      // 1. Delete AuditLogs and UsageLogs
      await tx.auditLog.deleteMany({ where: { tenantId: tenantToDelete.id } });
      await tx.usageLog.deleteMany({ where: { tenantId: tenantToDelete.id } });

      // 2. Delete Messages and Conversations
      await tx.message.deleteMany({ where: { tenantId: tenantToDelete.id } });
      await tx.conversation.deleteMany({ where: { tenantId: tenantToDelete.id } });

      // 3. Delete Contacts and ContactNotes
      await tx.contactNote.deleteMany({ where: { contact: { tenantId: tenantToDelete.id } } });
      await tx.contact.deleteMany({ where: { tenantId: tenantToDelete.id } });

      // 4. Delete AiAssistants, Automations, Templates, Broadcasts
      await tx.aiAssistant.deleteMany({ where: { tenantId: tenantToDelete.id } });
      await tx.automation.deleteMany({ where: { tenantId: tenantToDelete.id } });
      await tx.template.deleteMany({ where: { tenantId: tenantToDelete.id } });
      await tx.broadcast.deleteMany({ where: { tenantId: tenantToDelete.id } });

      // 5. Delete Orders, Payments, Subscriptions
      await tx.payment.deleteMany({ where: { tenantId: tenantToDelete.id } });
      await tx.order.deleteMany({ where: { tenantId: tenantToDelete.id } });
      await tx.subscription.deleteMany({ where: { tenantId: tenantToDelete.id } });

      // 6. Delete KnowledgeDocs, QnA, Labels, KanbanStages
      await tx.knowledgeDoc.deleteMany({ where: { tenantId: tenantToDelete.id } });
      await tx.qnAKnowledgeBase.deleteMany({ where: { tenantId: tenantToDelete.id } });
      await tx.label.deleteMany({ where: { tenantId: tenantToDelete.id } });
      await tx.kanbanStage.deleteMany({ where: { tenantId: tenantToDelete.id } });

      // 7. Delete Tickets and Support Conversations
      await tx.supportConversation.deleteMany({ where: { tenantId: tenantToDelete.id } });
      await tx.ticket.deleteMany({ where: { tenantId: tenantToDelete.id } });

      // 8. Delete ChannelConnections
      await tx.channelConnection.deleteMany({ where: { tenantId: tenantToDelete.id } });

      // 9. Delete Users
      await tx.user.deleteMany({ where: { tenantId: tenantToDelete.id } });

      // Finally, delete the tenant
      await tx.tenant.delete({ where: { id: tenantToDelete.id } });
    });
    console.log(`Successfully deleted tenant: ${tenantToDelete.businessName}`);
  } catch (err) {
    console.error('Deletion failed due to an error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
