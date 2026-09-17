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
    const pendingSubs = await prisma.subscription.findMany({
      where: { status: 'pending' },
      include: { tenant: { include: { plan: true } } }
    });
    
    console.log('Found ' + pendingSubs.length + ' pending subscriptions.');
    
    let updatedCount = 0;
    for (const sub of pendingSubs) {
      console.log('Processing tenant: ' + sub.tenant.name);
      
      const newStatus = sub.tenant.plan.name === 'Free' ? 'trialing' : 'active';
      
      const periodStart = sub.currentPeriodStart || new Date();
      const periodEnd = new Date(periodStart);
      periodEnd.setDate(periodStart.getDate() + 7); // 7 days trial
      
      await prisma.subscription.update({
        where: { id: sub.id },
        data: {
          status: newStatus,
          currentPeriodEnd: periodEnd,
        }
      });
      console.log('Updated to ' + newStatus + ' with expiry ' + periodEnd.toISOString());
      updatedCount++;
    }
    
    console.log('Successfully updated ' + updatedCount + ' subscriptions.');
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
