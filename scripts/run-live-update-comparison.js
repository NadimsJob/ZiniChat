const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const path = require('path');
const os = require('os');
require('dotenv').config({ path: path.join(__dirname, '.env.deploy') });

async function runUpdate() {
  const ssh = new NodeSSH();
  
  try {
    await ssh.connect({
      host: process.env.LIVE_SERVER_HOST,
      username: process.env.LIVE_SERVER_USER || 'root',
      privateKey: fs.readFileSync(path.join(os.homedir(), '.ssh', 'id_rsa'), 'utf8')
    });

    console.log('✅ SSH Connected\n');

    const scriptToRun = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log("Updating LandingPageConfig comparison table features...");
  
  const compareFeatures = [
    { type: "header", en: "Limits", bn: "লিমিটস" },
    { type: "value", featureKey: "seatLimit", en: "Team Members", bn: "টিম মেম্বার" },
    { type: "value", featureKey: "messageQuota", en: "Monthly Messages", bn: "মাসিক মেসেজ" },
    { type: "value", featureKey: "aiQuota", en: "AI Responses", bn: "এআই রেসপন্স" },
    
    { type: "header", en: "Channels", bn: "চ্যানেলসমূহ" },
    { type: "boolean", featureKey: "whatsapp", en: "WhatsApp Web (QR)", bn: "হোয়াটসঅ্যাপ ওয়েব (কিউআর)" },
    { type: "boolean", featureKey: "website_widget", en: "Website Widget", bn: "ওয়েবসাইট উইজেট" },
    { type: "boolean", featureKey: "whatsapp_api", en: "Official WhatsApp API", bn: "অফিসিয়াল হোয়াটসঅ্যাপ এপিআই" },
    { type: "boolean", featureKey: "messenger", en: "Meta Messenger", bn: "মেটা মেসেঞ্জার" },
    { type: "boolean", featureKey: "instagram", en: "Instagram DM", bn: "ইন্সটাগ্রাম ডিএম" },

    { type: "header", en: "Features", bn: "ফিচারসমূহ" },
    { type: "boolean", featureKey: "ai_assistant", en: "AI Assistant", bn: "এআই অ্যাসিস্ট্যান্ট" },
    { type: "boolean", featureKey: "lead_manage", en: "Leads CRM", bn: "লিডস সিআরএম" },
    { type: "boolean", featureKey: "contact_labels", en: "Custom Contact Labels", bn: "কাস্টম কন্টাক্ট লেবেল" },
    { type: "boolean", featureKey: "team_roles", en: "Team Members & Roles", bn: "টিম মেম্বার ও রোলস" },
    { type: "boolean", featureKey: "commerce", en: "Products & Orders", bn: "প্রোডাক্টস ও অর্ডার" },
    { type: "boolean", featureKey: "broadcast", en: "Broadcast Campaign", bn: "ব্রডকাস্ট ক্যাম্পেইন" },
    { type: "boolean", featureKey: "byok", en: "Bring Your Own Key (BYOK)", bn: "নিজের এপিআই কী (BYOK)" },
    { type: "boolean", featureKey: "platform_support_ai", en: "Priority AI Support", bn: "প্রায়োরিটি সাপোর্ট" }
  ];

  // Fetch the first/only landing page config
  const configs = await prisma.landingPageConfig.findMany();
  if (configs.length > 0) {
    const currentPricingJson = configs[0].pricingJson || {};
    
    await prisma.landingPageConfig.update({
      where: { id: configs[0].id },
      data: {
        pricingJson: {
          ...currentPricingJson,
          compareFeatures: compareFeatures
        }
      }
    });
    console.log("Successfully updated compareFeatures in live DB!");
  } else {
    console.log("No LandingPageConfig found!");
  }
}

run().catch(console.error).finally(() => process.exit(0));
    `;

    console.log('🔄 Uploading and executing comparison update script on live server...\n');
    
    await ssh.execCommand("cat << 'EOF' > /tmp/update-comparison.js\n" + scriptToRun + "\nEOF");
    await ssh.execCommand('docker cp /tmp/update-comparison.js zinichat_backend_live:/usr/src/app/update-comparison.js', { cwd: process.env.LIVE_PROJECT_PATH });
    
    const result = await ssh.execCommand(
      'docker exec zinichat_backend_live node update-comparison.js',
      { cwd: process.env.LIVE_PROJECT_PATH }
    );

    console.log('STDOUT:', result.stdout);
    if (result.stderr) console.log('STDERR:', result.stderr);

    ssh.dispose();
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

runUpdate();
