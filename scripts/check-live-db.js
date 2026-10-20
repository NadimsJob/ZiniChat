const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const path = require('path');
const os = require('os');
require('dotenv').config({ path: path.join(__dirname, '.env.deploy') });

async function checkLiveDatabase() {
  const ssh = new NodeSSH();
  
  try {
    await ssh.connect({
      host: process.env.LIVE_SERVER_HOST,
      username: process.env.LIVE_SERVER_USER || 'root',
      privateKey: fs.readFileSync(path.join(os.homedir(), '.ssh', 'id_rsa'), 'utf8')
    });

    console.log('✅ SSH Connected to LIVE server\n');

    const remoteScript = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== 1. DATABASE CONNECTIVITY & RECORD COUNTS ===");
  const [tenantsCount, usersCount, plansCount, subsCount, messagesCount, aiLogsCount, configsCount] = await Promise.all([
    prisma.tenant.count(),
    prisma.user.count(),
    prisma.plan.count(),
    prisma.subscription.count(),
    prisma.message.count(),
    prisma.aiUsageLog.count(),
    prisma.landingPageConfig.count()
  ]);
  console.log(JSON.stringify({
    tenants: tenantsCount,
    users: usersCount,
    plans: plansCount,
    subscriptions: subsCount,
    messages: messagesCount,
    aiUsageLogs: aiLogsCount,
    landingPageConfigs: configsCount
  }, null, 2));

  console.log("\\n=== 2. LANDING PAGE CONFIG & FAQ IN POSTGRESQL ===");
  const config = await prisma.landingPageConfig.findFirst();
  if (!config) {
    console.log("No LandingPageConfig found!");
  } else {
    const faqs = config.faqsJson?.faqs || [];
    console.log("Total FAQs in DB:", faqs.length);
    const quotaFaq = faqs.find(f => {
      const qBn = f.question?.bn || "";
      const qEn = f.question?.en || "";
      return qBn.includes("কোটা") || qEn.toLowerCase().includes("quota");
    });
    if (quotaFaq) {
      console.log("Found Quota FAQ in DB:\\n", JSON.stringify(quotaFaq, null, 2));
    } else {
      console.log("Quota FAQ not found in DB!");
    }
  }

  console.log("\\n=== 3. ACTIVE PLANS IN DB ===");
  const plans = await prisma.plan.findMany({
    where: { isActive: true },
    select: { id: true, name: true, priceMonthlyBdt: true, messageQuota: true, aiQuota: true, seatLimit: true }
  });
  console.log(JSON.stringify(plans, null, 2));

  console.log("\\n=== 4. TENANT SAMPLE QUOTAS & USAGE ===");
  const sampleTenants = await prisma.tenant.findMany({
    take: 3,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      businessName: true,
      plan: { select: { name: true, messageQuota: true, aiQuota: true } },
      subscriptions: {
        where: { status: { in: ['active', 'trialing'] } },
        select: { status: true, currentPeriodStart: true, currentPeriodEnd: true }
      }
    }
  });
  console.log(JSON.stringify(sampleTenants, null, 2));
}

main()
  .catch(e => console.error("DB Check Error:", e))
  .finally(() => prisma.$disconnect());
`;

    // Write to /tmp/db_audit.js on remote host
    await ssh.execCommand(`cat << 'EOF' > /tmp/db_audit.js\n${remoteScript}\nEOF`);

    // Run inside docker container by piping
    const cmd = `docker compose --env-file .env.live exec -T backend node - < /tmp/db_audit.js`;
    const result = await ssh.execCommand(cmd, { cwd: process.env.LIVE_PROJECT_PATH || '/root/ZiniChat' });

    console.log(result.stdout);
    if (result.stderr) {
      console.error('STDERR:', result.stderr);
    }

    // Clean up
    await ssh.execCommand('rm -f /tmp/db_audit.js');
  } catch (err) {
    console.error('Check failed:', err);
  } finally {
    ssh.dispose();
  }
}

checkLiveDatabase();
