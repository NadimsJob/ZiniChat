const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const path = require('path');
const os = require('os');
require('dotenv').config({ path: path.join(__dirname, '.env.deploy') });

async function checkComments() {
  const ssh = new NodeSSH();
  try {
    await ssh.connect({
      host: process.env.LIVE_SERVER_HOST,
      username: process.env.LIVE_SERVER_USER || 'root',
      privateKey: fs.readFileSync(path.join(os.homedir(), '.ssh', 'id_rsa'), 'utf8')
    });

    console.log('✅ Connected to LIVE server\n');

    const jsCode = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  console.log('=== TENANTS & FEATURES ===');
  const tenants = await prisma.tenant.findMany({
    include: {
      subscriptions: {
        include: { plan: true }
      }
    }
  });
  for (const t of tenants) {
    console.log("Tenant:", t.id, t.businessName);
    console.log("Custom Features:", t.customFeatures);
    if (t.subscriptions && t.subscriptions[0]) {
      console.log("Active Plan Features:", t.subscriptions[0].plan.features);
    }
  }

  console.log('=== CHANNEL CONNECTIONS ===');
  const conns = await prisma.channelConnection.findMany();
  console.log(JSON.stringify(conns, null, 2));

  console.log('=== FACEBOOK COMMENT LOGS ===');
  const logs = await prisma.facebookCommentLog.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' }
  });
  console.log(JSON.stringify(logs, null, 2));
}
main().finally(() => prisma['$disconnect']());
    `.replace(/\n/g, ' ');

    const cmd = `docker compose --env-file .env.live exec -T backend node -e ${JSON.stringify(jsCode)}`;
    const res = await ssh.execCommand(cmd, { cwd: process.env.LIVE_PROJECT_PATH });
    console.log(res.stdout || res.stderr);

    ssh.dispose();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkComments();
