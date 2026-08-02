const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany();
  console.log(`Found ${tenants.length} tenants to delete.`);
  
  if (tenants.length === 0) {
    console.log("No tenants found.");
    return;
  }

  for (const tenant of tenants) {
    console.log(`\nDeleting data for Tenant: ${tenant.businessName} (${tenant.id})`);

    // We must manually delete dependents because some might not have Cascade delete.
    
    // Delete AuditLogs targeting this tenant or from this tenant's users
    await prisma.auditLog.deleteMany({
      where: {
        OR: [
          { targetTenantId: tenant.id },
          { actorUser: { tenantId: tenant.id } }
        ]
      }
    });

    await prisma.notification.deleteMany({ where: { user: { tenantId: tenant.id } } });
    await prisma.ticketMessage.deleteMany({ where: { ticket: { tenantId: tenant.id } } });
    await prisma.ticket.deleteMany({ where: { tenantId: tenant.id } });

    await prisma.message.deleteMany({ where: { conversation: { tenantId: tenant.id } } });
    await prisma.conversationActivity.deleteMany({ where: { conversation: { tenantId: tenant.id } } });
    await prisma.conversationCollaborator.deleteMany({ where: { conversation: { tenantId: tenant.id } } });
    await prisma.conversationLabel.deleteMany({ where: { conversation: { tenantId: tenant.id } } });
    await prisma.conversation.deleteMany({ where: { tenantId: tenant.id } });

    await prisma.orderItem.deleteMany({ where: { order: { tenantId: tenant.id } } });
    await prisma.order.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.product.deleteMany({ where: { tenantId: tenant.id } });
    
    await prisma.contactNote.deleteMany({ where: { contact: { tenantId: tenant.id } } });
    await prisma.broadcastRecipient.deleteMany({ where: { contact: { tenantId: tenant.id } } });
    await prisma.broadcast.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.contact.deleteMany({ where: { tenantId: tenant.id } });

    await prisma.agentChannelAssignment.deleteMany({ where: { channelConnection: { tenantId: tenant.id } } });
    await prisma.channelConnection.deleteMany({ where: { tenantId: tenant.id } });
    
    await prisma.aiUsageLog.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.aiAssistantTool.deleteMany({ where: { assistant: { tenantId: tenant.id } } });
    await prisma.aiAssistant.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.knowledgeChunk.deleteMany({ where: { document: { tenantId: tenant.id } } });
    await prisma.knowledgeDocument.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.qnAKnowledgeBase.deleteMany({ where: { tenantId: tenant.id } });

    await prisma.payment.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.subscription.deleteMany({ where: { tenantId: tenant.id } });
    
    await prisma.label.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.kanbanStage.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.template.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.automation.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.websiteWidget.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.supportMessage.deleteMany({ where: { conversation: { tenantId: tenant.id } } });
    await prisma.supportConversation.deleteMany({ where: { tenantId: tenant.id } });
    
    await prisma.tenantAcquisitionEvent.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.userPresence.deleteMany({ where: { user: { tenantId: tenant.id } } });
    
    // Unlink customAiConfig if exists
    if (tenant.customAiConfigId) {
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { customAiConfigId: null }
      });
      await prisma.aiConfig.delete({ where: { id: tenant.customAiConfigId } });
    }

    // Finally delete users belonging to this tenant
    await prisma.user.deleteMany({ where: { tenantId: tenant.id } });

    // Then delete the tenant itself
    await prisma.tenant.delete({ where: { id: tenant.id } });
    
    console.log(`Deleted Tenant: ${tenant.businessName}`);
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
