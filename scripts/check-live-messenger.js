const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const path = require('path');
const os = require('os');
require('dotenv').config({ path: path.join(__dirname, '.env.deploy') });

async function inspectMessenger() {
  const ssh = new NodeSSH();
  
  try {
    await ssh.connect({
      host: process.env.LIVE_SERVER_HOST,
      username: process.env.LIVE_SERVER_USER || 'root',
      privateKey: fs.readFileSync(path.join(os.homedir(), '.ssh', 'id_rsa'), 'utf8')
    });

    console.log('✅ SSH Connected to LIVE server\n');

    const jsCode = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  console.log("=== CHANNEL CONNECTIONS ===");
  const channels = await prisma.channelConnection.findMany();
  console.log(JSON.stringify(channels.map(c => ({
    id: c.id,
    tenantId: c.tenantId,
    channelType: c.channelType,
    displayName: c.displayName,
    externalAccountId: c.externalAccountId,
    status: c.status,
    isActive: c.isActive
  })), null, 2));

  console.log("=== RECENT CONVERSATIONS ===");
  const convs = await prisma.conversation.findMany({
    take: 5,
    orderBy: { updatedAt: "desc" },
    include: { contact: true, messages: { take: 2, orderBy: { createdAt: "desc" } } }
  });
  console.log(JSON.stringify(convs, null, 2));

  console.log("=== RECENT MESSAGES ===");
  const msgs = await prisma.message.findMany({
    take: 10,
    orderBy: { createdAt: "desc" }
  });
  console.log(JSON.stringify(msgs, null, 2));
}
main().finally(() => prisma['$disconnect']());
`.replace(/\n/g, ' ');

    const cmd = `docker compose --env-file .env.live exec -T backend node -e ${JSON.stringify(jsCode)}`;
    const res = await ssh.execCommand(cmd, { cwd: process.env.LIVE_PROJECT_PATH });
    console.log(res.stdout || res.stderr);

    console.log('\n=== BACKEND DOCKER LOGS SEARCHING FOR MESSENGER ===');
    const logsRes = await ssh.execCommand('docker compose --env-file .env.live logs --tail=200 backend | grep -i messenger', { cwd: process.env.LIVE_PROJECT_PATH });
    console.log(logsRes.stdout || 'No messenger logs found');

    ssh.dispose();
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

inspectMessenger();
