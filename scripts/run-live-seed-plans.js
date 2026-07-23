const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const path = require('path');
const os = require('os');
require('dotenv').config({ path: path.join(__dirname, '.env.deploy') });

async function runSeed() {
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
  console.log("Starting migration...");

  // 1. Create Free Plan
  console.log("Creating FREE Plan...");
  const freePlan = await prisma.plan.create({
    data: {
      name: "Free",
      nameBn: "ফ্রি",
      description: "Ideal for trying out the platform.",
      descriptionBn: "প্লাটফর্ম ট্রায়াল করার জন্য একদম পারফেক্ট।",
      priceMonthlyBdt: 0,
      priceYearlyBdt: 0,
      messageQuota: 100,
      aiQuota: 100,
      seatLimit: 1,
      channelLimit: 1,
      storageLimitMb: 500,
      trialDays: 0,
      allowByok: false,
      isDefault: true,
      features: ["ai_assistant", "whatsapp"],
      featuresJson: [
        { en: "AI Assistant", bn: "এআই অ্যাসিস্ট্যান্ট" },
        { en: "WhatsApp Web (QR)", bn: "হোয়াটসঅ্যাপ ওয়েব (কিউআর)" }
      ]
    }
  });

  console.log("FREE Plan Created. ID:", freePlan.id);

  // 2. Safely migrate existing Tenants and Subscriptions to FREE plan
  console.log("Migrating existing Subscriptions and Tenants to FREE plan...");
  await prisma.subscription.updateMany({
    data: { planId: freePlan.id }
  });
  await prisma.tenant.updateMany({
    data: { planId: freePlan.id }
  });

  // 3. Delete old plans
  console.log("Deleting old Plans and Addons...");
  await prisma.plan.deleteMany({
    where: {
      id: { not: freePlan.id }
    }
  });
  await prisma.addon.deleteMany();

  // 4. Create other plans
  console.log("Creating STARTER Plan...");
  await prisma.plan.create({
    data: {
      name: "Starter",
      nameBn: "স্টার্টার",
      description: "Perfect for small businesses starting out.",
      descriptionBn: "ছোট ব্যবসার জন্য একদম পারফেক্ট।",
      priceMonthlyBdt: 499,
      priceYearlyBdt: 4990,
      yearlyDiscountPercent: 16.66,
      messageQuota: 2000,
      aiQuota: 500,
      seatLimit: 2,
      channelLimit: 1,
      storageLimitMb: 1024,
      trialDays: 7,
      allowByok: false,
      features: ["ai_assistant", "whatsapp", "website_widget", "lead_manage", "contact_labels"],
      featuresJson: [
        { en: "AI Assistant", bn: "এআই অ্যাসিস্ট্যান্ট" },
        { en: "WhatsApp Web (QR)", bn: "হোয়াটসঅ্যাপ ওয়েব (কিউআর)" },
        { en: "WhatsApp Website Widget", bn: "হোয়াটসঅ্যাপ ওয়েবসাইট উইজেট" },
        { en: "Leads CRM", bn: "লিডস সিআরএম" },
        { en: "Custom Contact Labels", bn: "কাস্টম কন্টাক্ট লেবেল" }
      ]
    }
  });

  console.log("Creating GROWTH Plan...");
  await prisma.plan.create({
    data: {
      name: "Growth",
      nameBn: "গ্রোথ",
      description: "For growing teams with more volume.",
      descriptionBn: "মাঝারি বা বড় ব্যবসার জন্য।",
      priceMonthlyBdt: 1990,
      priceYearlyBdt: 19900,
      messageQuota: 10000,
      aiQuota: 3000,
      seatLimit: 5,
      channelLimit: 3,
      storageLimitMb: 5120,
      trialDays: 7,
      allowByok: true,
      isPopular: true,
      features: ["ai_assistant", "whatsapp", "whatsapp_api", "messenger", "instagram", "website_widget", "lead_manage", "commerce", "broadcast", "team_roles", "contact_labels", "byok"],
      featuresJson: [
        { en: "AI Assistant", bn: "এআই অ্যাসিস্ট্যান্ট" },
        { en: "WhatsApp Web", bn: "হোয়াটসঅ্যাপ ওয়েব" },
        { en: "WhatsApp API (Official)", bn: "অফিসিয়াল হোয়াটসঅ্যাপ এপিআই" },
        { en: "Messenger Integration", bn: "ম্যাসেঞ্জার ইন্টিগ্রেশন" },
        { en: "Instagram DM", bn: "ইন্সটাগ্রাম ডিএম" },
        { en: "Website Widget", bn: "ওয়েবসাইট উইজেট" },
        { en: "Leads CRM", bn: "লিডস সিআরএম" },
        { en: "Products & Orders", bn: "প্রোডাক্টস ও অর্ডার" },
        { en: "Broadcast Campaign", bn: "ব্রডকাস্ট ক্যাম্পেইন" },
        { en: "Team Members & Roles", bn: "টিম মেম্বার ও রোলস" },
        { en: "Custom Contact Labels", bn: "কাস্টম কন্টাক্ট লেবেল" },
        { en: "Bring Your Own Key (BYOK)", bn: "নিজের এপিআই কী ব্যবহারের সুবিধা (BYOK)" }
      ]
    }
  });

  console.log("Creating BUSINESS Plan...");
  await prisma.plan.create({
    data: {
      name: "Business",
      nameBn: "বিজনেস",
      description: "Advanced features for large teams.",
      descriptionBn: "বড় টিমের জন্য অ্যাডভান্সড ফিচার।",
      priceMonthlyBdt: 4990,
      priceYearlyBdt: 49900,
      messageQuota: 50000,
      aiQuota: 10000,
      seatLimit: 15,
      channelLimit: 10,
      storageLimitMb: 15360,
      trialDays: 14,
      allowByok: true,
      features: ["ai_assistant", "whatsapp", "whatsapp_api", "messenger", "instagram", "website_widget", "lead_manage", "commerce", "broadcast", "team_roles", "contact_labels", "byok", "platform_support_ai"],
      featuresJson: [
        { en: "All Features Included", bn: "সব ফিচার অন্তর্ভুক্ত" },
        { en: "Priority Support", bn: "প্রায়োরিটি সাপোর্ট" }
      ]
    }
  });

  // 5. Create Addons
  console.log("Creating Addons...");
  await prisma.addon.createMany({
    data: [
      {
        name: "Extra 500 AI Responses",
        nameBn: "অতিরিক্ত ৫০০ এআই রেসপন্স",
        priceBdt: 100,
        type: "ai_responses",
        value: 500
      },
      {
        name: "Extra 1,000 AI Responses",
        nameBn: "অতিরিক্ত ১,০০০ এআই রেসপন্স",
        priceBdt: 180,
        type: "ai_responses",
        value: 1000
      },
      {
        name: "Extra 10,000 Messages",
        nameBn: "অতিরিক্ত ১০,০০০ মেসেজ",
        priceBdt: 250,
        type: "extra_messages",
        value: 10000
      },
      {
        name: "Extra Team Member",
        nameBn: "অতিরিক্ত টিম মেম্বার",
        priceBdt: 150,
        type: "extra_seats",
        value: 1
      },
      {
        name: "Extra WhatsApp Number",
        nameBn: "অতিরিক্ত হোয়াটসঅ্যাপ নাম্বার",
        priceBdt: 400,
        type: "extra_channels",
        value: 1
      }
    ]
  });

  console.log("Migration completed successfully!");
}

run().catch(console.error).finally(() => process.exit(0));
    `;

    console.log('🔄 Uploading and executing seeding script on live server...\n');
    
    await ssh.execCommand("cat << 'EOF' > /tmp/seed-plans.js\n" + scriptToRun + "\nEOF");
    await ssh.execCommand('docker cp /tmp/seed-plans.js zinichat_backend_live:/usr/src/app/seed-plans.js', { cwd: process.env.LIVE_PROJECT_PATH });
    
    const result = await ssh.execCommand(
      'docker exec zinichat_backend_live node seed-plans.js',
      { cwd: process.env.LIVE_PROJECT_PATH }
    );

    console.log('STDOUT:', result.stdout);
    if (result.stderr) console.log('STDERR:', result.stderr);

    ssh.dispose();
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

runSeed();
