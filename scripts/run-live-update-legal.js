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
  console.log("Updating LandingPageConfig legal policies...");
  
  const privacyPolicyEn = \`# Privacy Policy

**Last Updated:** August 2, 2026

Welcome to ZiniChat. This Privacy Policy explains how we collect, use, and protect your personal data.

## 1. Data Collection
We collect data you provide directly to us (e.g., account registration, Meta/WhatsApp integration tokens).
When you connect Meta services, we request access to your messages and pages strictly to provide our service.

## 2. Data Usage
Your data is used exclusively to facilitate omnichannel messaging, AI assistance, and related CRM features within ZiniChat. We do not sell your personal data.

## 3. Data Protection
We implement robust security measures to protect your data. Passwords and access tokens are encrypted.

## 4. Contact Us
For privacy concerns, contact us at info@zinichat.com.\`;

  const dataDeletionEn = \`# Data Deletion Instructions

According to the Facebook Platform Rules, we must provide an explicit URL where users can request data deletion.

## How to Delete Your Data from ZiniChat

If you have connected your Meta/Facebook account to ZiniChat and wish to remove our app's access and delete your data, please follow these steps:

1. Go to your **Facebook Account Settings** > **Settings & Privacy** > **Settings**.
2. Scroll down and click on **Apps and Websites**.
3. Find **ZiniChat** in the list of active apps and websites.
4. Click **Remove**.
5. Facebook will ask to confirm your action. Click **Remove** again.

Once removed, ZiniChat will lose access to your Meta accounts. 

### Deleting Your ZiniChat Account
To completely delete your ZiniChat account and all associated data from our servers:
1. Log in to your ZiniChat Superadmin or Workspace dashboard.
2. Navigate to **Settings** > **Account**.
3. Click on **Delete Account**.
4. Confirm your choice. All your data will be permanently deleted within 30 days.

If you cannot access your account, please email us at **info@zinichat.com** with the subject "Data Deletion Request".\`;

  const privacyPolicyBn = \`# প্রাইভেসি পলিসি

**সর্বশেষ আপডেট:** ২ আগস্ট, ২০২৬

ZiniChat-এ আপনাকে স্বাগতম। এই প্রাইভেসি পলিসি বর্ণনা করে আমরা কীভাবে আপনার ব্যক্তিগত ডেটা সংগ্রহ, ব্যবহার এবং সুরক্ষিত করি।

## ১. ডেটা সংগ্রহ
আমরা আপনার দেওয়া ডেটা সংগ্রহ করি (যেমন, অ্যাকাউন্ট রেজিস্ট্রেশন, মেটা/হোয়াটসঅ্যাপ টোকেন)। মেটা পরিষেবাগুলি সংযুক্ত করার সময়, আমরা কেবল আমাদের পরিষেবা প্রদানের জন্য আপনার বার্তা এবং পেজগুলোর অ্যাক্সেসের অনুরোধ করি।

## ২. ডেটা ব্যবহার
আপনার ডেটা শুধুমাত্র ZiniChat-এর মধ্যে অমনিচ্যানেল মেসেজিং, এআই অ্যাসিস্ট্যান্স এবং সিআরএম ফিচারগুলির সুবিধার জন্য ব্যবহৃত হয়। আমরা আপনার ব্যক্তিগত ডেটা বিক্রি করি কাশী না।

## ৩. ডেটা সুরক্ষা
আমরা আপনার ডেটা সুরক্ষিত রাখতে শক্তিশালী নিরাপত্তা ব্যবস্থা গ্রহণ করি। পাসওয়ার্ড এবং টোকেনগুলো এনক্রিপ্ট করা থাকে।

## ৪. যোগাযোগ
যেকোনো তথ্যের জন্য যোগাযোগ করুন: info@zinichat.com\`;

  const dataDeletionBn = \`# ডেটা মুছে ফেলার নির্দেশাবলী

ফেসবুক প্ল্যাটফর্মের নিয়ম অনুযায়ী, আমাদের একটি নির্দিষ্ট ইউআরএল প্রদান করতে হবে যেখানে ব্যবহারকারীরা তাদের ডেটা মুছে ফেলার অনুরোধ করতে পারেন।

## ZiniChat থেকে আপনার ডেটা কীভাবে মুছে ফেলবেন

আপনি যদি আপনার মেটা/ফেসবুক অ্যাকাউন্ট ZiniChat-এর সাথে সংযুক্ত করে থাকেন এবং আমাদের অ্যাপের অ্যাক্সেস সরাতে ও আপনার ডেটা মুছে ফেলতে চান, তবে এই ধাপগুলো অনুসরণ করুন:

১. আপনার **ফেসবুক অ্যাকাউন্ট সেটিংস** > **সেটিংস ও প্রাইভেসি** > **সেটিংস**-এ যান।
২. নিচে স্ক্রল করুন এবং **অ্যাপস ও ওয়েবসাইটস (Apps and Websites)**-এ ক্লিক করুন।
৩. সক্রিয় অ্যাপের তালিকায় **ZiniChat** খুঁজুন।
৪. **Remove** বাটনে ক্লিক করুন।
৫. ফেসবুক আপনাকে নিশ্চিত করতে বলবে, আবার **Remove**-এ ক্লিক করুন।

রিমুভ করার পর, ZiniChat আপনার মেটা অ্যাকাউন্টের অ্যাক্সেস হারিয়ে ফেলবে।

### আপনার ZiniChat অ্যাকাউন্ট ডিলিট করা
আমাদের সার্ভার থেকে আপনার ZiniChat অ্যাকাউন্ট এবং সমস্ত ডেটা স্থায়ীভাবে মুছে ফেলতে:
১. আপনার ZiniChat ড্যাশবোর্ডে লগ ইন করুন।
২. **Settings** > **Account**-এ যান।
৩. **Delete Account**-এ ক্লিক করুন এবং নিশ্চিত করুন।

যদি আপনি লগ ইন করতে না পারেন, তবে "Data Deletion Request" লিখে **info@zinichat.com**-এ ইমেইল করুন।\`;

  const configs = await prisma.landingPageConfig.findMany();
  if (configs.length > 0) {
    await prisma.landingPageConfig.update({
      where: { id: configs[0].id },
      data: {
        privacyPolicyJson: { en: privacyPolicyEn, bn: privacyPolicyBn },
        dataDeletionJson: { en: dataDeletionEn, bn: dataDeletionBn }
      }
    });
    console.log("Successfully updated legal policies in live DB!");
  } else {
    console.log("No LandingPageConfig found!");
  }
}

run().catch(console.error).finally(() => process.exit(0));
`;

    const tmpPath = path.join(os.tmpdir(), 'update-legal.js');
    fs.writeFileSync(tmpPath, scriptToRun);

    console.log('🔄 Uploading and executing legal update script on live server...\n');
    
    await ssh.putFile(tmpPath, '/tmp/update-legal.js');
    await ssh.execCommand('docker cp /tmp/update-legal.js zinichat_backend_live:/usr/src/app/update-legal.js', { cwd: process.env.LIVE_PROJECT_PATH });
    
    const result = await ssh.execCommand(
      'docker exec zinichat_backend_live node update-legal.js',
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
