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

  const emails = [
    'jetitbd1@gmail.com',
    'it.shantalife@gmail.com',
    'nadimmridha30@gmail.com',
    'jetitbd@gmail.com',
    'job.nadim30@gmail.com'
  ];

  const scriptContent = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function purge() {
  const emails = ${JSON.stringify(emails)};
  console.log("Starting full workspace purge for remaining accounts:", emails);

  const users = await prisma.user.findMany({
    where: { email: { in: emails, mode: 'insensitive' } },
    select: { id: true, email: true, tenantId: true }
  });

  console.log("Found " + users.length + " matching user accounts.");

  const tenantIds = [...new Set(users.map(u => u.tenantId).filter(Boolean))];

  console.log("Target Tenant IDs to purge:", tenantIds);

  for (const tenantId of tenantIds) {
    console.log("\\nPurging tenant ID: " + tenantId);

    // Delete AI assistants using raw query or model names
    await prisma.$executeRawUnsafe('DELETE FROM ai_assistants WHERE "tenantId" = $1::uuid', tenantId).catch(console.error);
    await prisma.$executeRawUnsafe('DELETE FROM messages WHERE "conversationId" IN (SELECT id FROM conversations WHERE "tenantId" = $1::uuid)', tenantId).catch(console.error);
    await prisma.$executeRawUnsafe('DELETE FROM conversations WHERE "tenantId" = $1::uuid', tenantId).catch(console.error);
    await prisma.$executeRawUnsafe('DELETE FROM products WHERE "tenantId" = $1::uuid', tenantId).catch(console.error);
    await prisma.$executeRawUnsafe('DELETE FROM contacts WHERE "tenantId" = $1::uuid', tenantId).catch(console.error);
    await prisma.$executeRawUnsafe('DELETE FROM subscriptions WHERE "tenantId" = $1::uuid', tenantId).catch(console.error);
    await prisma.$executeRawUnsafe('DELETE FROM payments WHERE "tenantId" = $1::uuid', tenantId).catch(console.error);
    await prisma.$executeRawUnsafe('DELETE FROM users WHERE "tenantId" = $1::uuid', tenantId).catch(console.error);
    await prisma.$executeRawUnsafe('DELETE FROM tenants WHERE id = $1::uuid', tenantId).catch(console.error);
    console.log("Successfully purged tenant with raw execution: " + tenantId);
  }

  // Also cleanup any orphan users matching target emails without tenantId
  await prisma.user.deleteMany({
    where: { email: { in: emails, mode: 'insensitive' } }
  }).catch(() => {});

  console.log("\\n✅ ALL 5 TEST ACCOUNTS AND WORKSPACE DATA FULLY PURGED!");
  await prisma.$disconnect();
}

purge().catch(console.error);
`;

  await ssh.execCommand(`cat <<'EOF' > /tmp/purge_users.js\n${scriptContent}\nEOF`);
  await ssh.execCommand(`docker cp /tmp/purge_users.js zinichat_backend_live:/usr/src/app/purge_users.js`);
  const result = await ssh.execCommand(`docker exec zinichat_backend_live node /usr/src/app/purge_users.js`);
  await ssh.execCommand(`docker exec zinichat_backend_live rm -f /usr/src/app/purge_users.js`);
  await ssh.execCommand(`rm -f /tmp/purge_users.js`);

  console.log('--- STDOUT ---');
  console.log(result.stdout);
  console.log('--- STDERR ---');
  console.log(result.stderr);

  ssh.dispose();
}

main().catch(console.error);
