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
  console.log("=== LATEST SMS TRANSACTIONS ===");
  const sms = await prisma.smsTransaction.findMany({ 
    take: 10,
    orderBy: { createdAt: 'desc' }
  });
  console.log(JSON.stringify(sms, null, 2));

  console.log("=== LATEST MFS PAYMENTS ===");
  const payments = await prisma.payment.findMany({ 
    take: 10,
    orderBy: { createdAt: 'desc' },
    where: { mfsAccountId: { not: null } }
  });
  console.log(JSON.stringify(payments, null, 2));
}
main().finally(() => prisma['$disconnect']());
`.replace(/\n/g, ' ');

    const checkSmsCmd = `docker compose --env-file .env.live exec -T backend node -e ${JSON.stringify(jsCode)}`;

    const res = await ssh.execCommand(checkSmsCmd, { cwd: process.env.LIVE_PROJECT_PATH });
    console.log(res.stdout || res.stderr);

    ssh.dispose();
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

inspectLiveData();
