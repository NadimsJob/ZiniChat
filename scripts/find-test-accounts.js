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

async function check() {
  const emails = ${JSON.stringify(emails)};
  console.log("Searching for target emails in Live DB...");
  const users = await prisma.user.findMany({
    where: { email: { in: emails, mode: 'insensitive' } },
    include: {
      tenant: {
        select: {
          id: true,
          businessName: true,
          _count: {
            select: {
              users: true,
              contacts: true,
              conversations: true,
              orders: true,
              products: true,
              Ticket: true,
              subscriptions: true,
              payments: true
            }
          }
        }
      }
    }
  });

  console.log("FOUND USERS (" + users.length + "):");
  for (const u of users) {
    console.log("-----------------------------------------");
    console.log("User ID: " + u.id);
    console.log("Email: " + u.email);
    console.log("Name: " + u.name);
    console.log("Role: " + u.role);
    console.log("Tenant ID: " + u.tenantId);
    if (u.tenant) {
      console.log("Tenant Name: " + u.tenant.businessName);
      console.log("Tenant Counts: " + JSON.stringify(u.tenant._count, null, 2));
    }
  }

  await prisma.$disconnect();
}

check().catch(console.error);
`;

  await ssh.execCommand(`cat <<'EOF' > /tmp/inspect_users.js\n${scriptContent}\nEOF`);
  await ssh.execCommand(`docker cp /tmp/inspect_users.js zinichat_backend_live:/usr/src/app/inspect_users.js`);
  const result = await ssh.execCommand(`docker exec zinichat_backend_live node /usr/src/app/inspect_users.js`);
  await ssh.execCommand(`docker exec zinichat_backend_live rm -f /usr/src/app/inspect_users.js`);
  await ssh.execCommand(`rm -f /tmp/inspect_users.js`);

  console.log('--- STDOUT ---');
  console.log(result.stdout);
  console.log('--- STDERR ---');
  console.log(result.stderr);

  ssh.dispose();
}

main().catch(console.error);
