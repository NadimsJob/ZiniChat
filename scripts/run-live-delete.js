const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const path = require('path');
const os = require('os');
require('dotenv').config({ path: path.join(__dirname, '.env.deploy') });

async function runDeletion() {
  const ssh = new NodeSSH();
  
  try {
    await ssh.connect({
      host: process.env.LIVE_SERVER_HOST,
      username: process.env.LIVE_SERVER_USER || 'root',
      privateKey: fs.readFileSync(path.join(os.homedir(), '.ssh', 'id_rsa'), 'utf8')
    });

    console.log('✅ SSH Connected\n');

    const scriptToRun = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const t = await prisma.tenant.findFirst({ where: { businessName: { contains: "Shanta", mode: "insensitive" } }, orderBy: { createdAt: "desc" } });
  if (!t) return console.log("No test tenant found");
  console.log("Deleting tenant: " + t.id + " " + t.businessName);
  await prisma.$transaction([
    prisma.auditLog.deleteMany({ where: { targetTenantId: t.id } }),
    prisma.aiUsageLog.deleteMany({ where: { tenantId: t.id } }),
    prisma.message.deleteMany({ where: { conversation: { tenantId: t.id } } }),
    prisma.conversationLabel.deleteMany({ where: { conversation: { tenantId: t.id } } }),
    prisma.conversation.deleteMany({ where: { tenantId: t.id } }),
    prisma.contactNote.deleteMany({ where: { contact: { tenantId: t.id } } }),
    prisma.broadcastRecipient.deleteMany({ where: { contact: { tenantId: t.id } } }),
    prisma.contact.deleteMany({ where: { tenantId: t.id } }),
    prisma.aiAssistantTool.deleteMany({ where: { assistant: { tenantId: t.id } } }),
    prisma.aiAssistant.deleteMany({ where: { tenantId: t.id } }),
    prisma.automation.deleteMany({ where: { tenantId: t.id } }),
    prisma.template.deleteMany({ where: { tenantId: t.id } }),
    prisma.broadcast.deleteMany({ where: { tenantId: t.id } }),
    prisma.payment.deleteMany({ where: { tenantId: t.id } }),
    prisma.orderItem.deleteMany({ where: { order: { tenantId: t.id } } }),
    prisma.order.deleteMany({ where: { tenantId: t.id } }),
    prisma.subscription.deleteMany({ where: { tenantId: t.id } }),
    prisma.knowledgeChunk.deleteMany({ where: { document: { tenantId: t.id } } }),
    prisma.knowledgeDocument.deleteMany({ where: { tenantId: t.id } }),
    prisma.qnAKnowledgeBase.deleteMany({ where: { tenantId: t.id } }),
    prisma.label.deleteMany({ where: { tenantId: t.id } }),
    prisma.kanbanStage.deleteMany({ where: { tenantId: t.id } }),
    prisma.supportConversation.deleteMany({ where: { tenantId: t.id } }),
    prisma.ticket.deleteMany({ where: { tenantId: t.id } }),
    prisma.agentChannelAssignment.deleteMany({ where: { user: { tenantId: t.id } } }),
    prisma.channelConnection.deleteMany({ where: { tenantId: t.id } }),
    prisma.user.deleteMany({ where: { tenantId: t.id } }),
    prisma.tenant.delete({ where: { id: t.id } })
  ]);
  console.log("Deleted");
}
run().catch(console.error).finally(() => process.exit(0));
    `;

    console.log('🔄 Uploading and executing deletion script on live server...\n');
    
    await ssh.execCommand("cat << 'EOF' > /tmp/delete-tenant.js\n" + scriptToRun + "\nEOF");
    await ssh.execCommand('docker cp /tmp/delete-tenant.js zinichat_backend_live:/usr/src/app/delete-tenant.js', { cwd: process.env.LIVE_PROJECT_PATH });
    
    const result = await ssh.execCommand(
      'docker exec zinichat_backend_live node delete-tenant.js',
      { cwd: process.env.LIVE_PROJECT_PATH }
    );

    console.log('STDOUT:', result.stdout);
    if (result.stderr) console.log('STDERR:', result.stderr);

    ssh.dispose();
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

runDeletion();
