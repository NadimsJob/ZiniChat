const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const path = require('path');
const os = require('os');
require('dotenv').config({ path: path.join(__dirname, '.env.deploy') });

async function main() {
  const ssh = new NodeSSH();
  const keyPath = process.env.LIVE_SSH_KEY_PATH || path.join(os.homedir(), '.ssh', 'id_rsa');
  
  await ssh.connect({
    host: process.env.LIVE_SERVER_HOST || '76.13.187.85',
    username: process.env.LIVE_SERVER_USER || 'root',
    privateKey: fs.readFileSync(keyPath, 'utf8'),
  });

  const email = 'tabassumoishi02@gmail.com';

  const scriptContent = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const user = await prisma.user.findFirst({
    where: { email: { equals: '${email}', mode: 'insensitive' } },
    include: { tenant: true }
  });

  console.log("USER DETAILS:");
  console.log(JSON.stringify(user, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2));

  await prisma.$disconnect();
}

check().catch(console.error);
`;

  await ssh.execCommand(`cat <<'EOF' > /tmp/check_user.js\n${scriptContent}\nEOF`);
  await ssh.execCommand(`docker cp /tmp/check_user.js zinichat_backend_live:/usr/src/app/check_user.js`);
  const result = await ssh.execCommand(`docker exec zinichat_backend_live node /usr/src/app/check_user.js`);
  await ssh.execCommand(`docker exec zinichat_backend_live rm -f /usr/src/app/check_user.js`);
  await ssh.execCommand(`rm -f /tmp/check_user.js`);

  console.log('--- STDOUT ---');
  console.log(result.stdout);
  console.log('--- STDERR ---');
  console.log(result.stderr);

  ssh.dispose();
}

main().catch(console.error);
