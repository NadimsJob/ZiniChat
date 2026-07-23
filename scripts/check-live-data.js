const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const path = require('path');
const os = require('os');
require('dotenv').config({ path: path.join(__dirname, '.env.deploy') });

async function inspectLiveData() {
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
  console.log("=== USERS & ROLES ===");
  const users = await prisma.user.findMany({ select: { id: true, email: true, name: true, role: true, tenantId: true } });
  console.log(JSON.stringify(users, null, 2));

  console.log("=== RECENT NOTIFICATIONS ===");
  const notifs = await prisma.notification.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { email: true, role: true, tenantId: true } } }
  });
  console.log(JSON.stringify(notifs, null, 2));

  console.log("=== AI CONFIGS ===");
  const aiConfigs = await prisma.aiConfig.findMany();
  console.log(JSON.stringify(aiConfigs.map(c => ({
    id: c.id,
    name: c.name,
    provider: c.provider,
    modelName: c.modelName,
    apiEndpoint: c.apiEndpoint,
    isActive: c.isActive,
    isSupportDefault: c.isSupportDefault,
    hasApiKey: !!c.apiKey,
    keyLength: c.apiKey ? c.apiKey.length : 0
  })), null, 2));

  console.log("=== RECENT SUPPORT MESSAGES ===");
  const supportMsgs = await prisma.supportMessage.findMany({
    take: 10,
    orderBy: { createdAt: "desc" }
  });
  console.log(JSON.stringify(supportMsgs, null, 2));
}
main().finally(() => prisma['$disconnect']());
`.replace(/\n/g, ' ');

    const checkNotifsCmd = `docker compose --env-file .env.live exec -T backend node -e ${JSON.stringify(jsCode)}`;

    const res = await ssh.execCommand(checkNotifsCmd, { cwd: process.env.LIVE_PROJECT_PATH });
    console.log(res.stdout || res.stderr);

    ssh.dispose();
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

inspectLiveData();
