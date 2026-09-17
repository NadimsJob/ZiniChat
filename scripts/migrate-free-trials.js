const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const path = require('path');
const os = require('os');
require('dotenv').config({ path: path.join(__dirname, '.env.deploy') });

async function fixLiveSubs() {
  const ssh = new NodeSSH();
  
  try {
    await ssh.connect({
      host: process.env.LIVE_SERVER_HOST || '76.13.187.85',
      username: process.env.LIVE_SERVER_USER || 'root',
      privateKey: fs.readFileSync(path.join(os.homedir(), '.ssh', 'id_rsa'), 'utf8')
    });

    console.log('✅ SSH Connected to Live Server\n');

    const updateScript = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const freePlan = await prisma.plan.findFirst({
      where: { name: 'Free' }
    });

    if (!freePlan) {
      console.log('Free plan not found!');
      return;
    }

    const freeSubscriptions = await prisma.subscription.findMany({
      where: {
        planId: freePlan.id
      }
    });

    console.log('Found ' + freeSubscriptions.length + ' Free subscriptions to evaluate.');

    let updatedCount = 0;
    let expiredCount = 0;
    let trialingCount = 0;
    const now = new Date();

    for (const sub of freeSubscriptions) {
      const start = new Date(sub.currentPeriodStart);
      const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from start
      
      let newStatus = 'trialing';
      if (end < now) {
        newStatus = 'expired';
      }

      await prisma.subscription.update({
        where: { id: sub.id },
        data: {
          currentPeriodEnd: end,
          status: newStatus
        }
      });

      updatedCount++;
      if (newStatus === 'expired') expiredCount++;
      if (newStatus === 'trialing') trialingCount++;
    }

    console.log('Migration complete.');
    console.log('Total Updated: ' + updatedCount);
    console.log('Converted to expired: ' + expiredCount);
    console.log('Kept as trialing: ' + trialingCount);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
`;

    const base64Script = Buffer.from(updateScript).toString('base64');
    const cmd = `docker compose --env-file .env.live exec -T backend node -e "eval(Buffer.from('${base64Script}', 'base64').toString())"`;

    const result = await ssh.execCommand(cmd, { cwd: process.env.LIVE_PROJECT_PATH || '/var/www/zinichat-live' });
    
    console.log('\n=== Output ===');
    console.log(result.stdout);
    if (result.stderr) {
      console.log('\n=== Error ===');
      console.error(result.stderr);
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    ssh.dispose();
  }
}

fixLiveSubs();
