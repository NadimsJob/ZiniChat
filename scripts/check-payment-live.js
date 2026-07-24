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

    const checkCmd = `docker compose --env-file .env.live exec -T backend node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); async function main() { const p = await prisma.payment.findMany({ take: 10, orderBy: { createdAt: 'desc' } }); console.log(JSON.stringify(p.map(x=>({ id: x.id, amountBdt: x.amountBdt, baseAmountBdt: x.baseAmountBdt, createdAt: x.createdAt })), null, 2)); } main();"`;

    const res = await ssh.execCommand(checkCmd, { cwd: process.env.LIVE_PROJECT_PATH });
    console.log(res.stdout || res.stderr);

    ssh.dispose();
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

inspectLiveData();
