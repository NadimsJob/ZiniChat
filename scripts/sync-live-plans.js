const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const path = require('path');
const os = require('os');
require('dotenv').config({ path: path.join(__dirname, '.env.deploy') });

async function syncLivePlans() {
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
  const freePlan = await prisma.plan.findFirst({ where: { name: 'Free' } });
  if (!freePlan) {
    console.error('Free plan not found');
    return;
  }

  const freeFeatures = freePlan.features;
  const freeFeaturesJson = freePlan.featuresJson;

  const nonFreePlans = await prisma.plan.findMany({
    where: { NOT: { name: 'Free' } }
  });

  for (const plan of nonFreePlans) {
    await prisma.plan.update({
      where: { id: plan.id },
      data: {
        description: plan.description || 'Suitable for growing businesses.',
        descriptionBn: plan.descriptionBn || 'আপনার ব্যবসার অগ্রগতির জন্য উপযুক্ত।',
        features: freeFeatures,
        featuresJson: freeFeaturesJson,
        messageQuota: plan.messageQuota > 0 ? plan.messageQuota : freePlan.messageQuota,
        aiQuota: plan.aiQuota > 0 ? plan.aiQuota : freePlan.aiQuota,
        seatLimit: plan.seatLimit > 0 ? plan.seatLimit : freePlan.seatLimit,
        whatsappLimit: plan.whatsappLimit > 0 ? plan.whatsappLimit : freePlan.whatsappLimit,
        messengerLimit: plan.messengerLimit > 0 ? plan.messengerLimit : freePlan.messengerLimit,
        instagramLimit: plan.instagramLimit > 0 ? plan.instagramLimit : freePlan.instagramLimit,
        websiteWidgetLimit: plan.websiteWidgetLimit > 0 ? plan.websiteWidgetLimit : freePlan.websiteWidgetLimit,
        productCatalogLimit: plan.productCatalogLimit > 0 ? plan.productCatalogLimit : freePlan.productCatalogLimit,
        storageLimitMb: plan.storageLimitMb > 0 ? plan.storageLimitMb : freePlan.storageLimitMb,
        allowWeekly: true,
        isActive: true
      }
    });
    console.log('Successfully updated plan:', plan.name);
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
`;

    // Put script into container via temporary file or base64
    const base64Script = Buffer.from(updateScript).toString('base64');
    const cmd = `docker compose --env-file .env.live exec -T backend node -e "eval(Buffer.from('${base64Script}', 'base64').toString())"`;

    const result = await ssh.execCommand(cmd, { cwd: process.env.LIVE_PROJECT_PATH || '/var/www/zinichat-live' });

    console.log('--- SYNC OUTPUT ---');
    console.log(result.stdout);
    if (result.stderr) console.error('STDERR:', result.stderr);

  } catch (err) {
    console.error('❌ Error syncing live plans:', err);
  } finally {
    ssh.dispose();
  }
}

syncLivePlans();
