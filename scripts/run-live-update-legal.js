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
  console.log("Updating LandingPageConfig Terms & Conditions...");
  
  const termsConditionsEn = \`# Terms and Conditions

**Last Updated:** August 2, 2026

Welcome to ZiniChat. By accessing or using our omnichannel AI platform and services, you agree to be bound by these Terms and Conditions.

## 1. Acceptance of Terms
By creating an account, you agree to comply with and be bound by these Terms. If you do not agree, you may not use ZiniChat.

## 2. Use of Services
You agree to use ZiniChat only for lawful purposes. You are responsible for all content you transmit through our platform, including messages sent via connected Meta and WhatsApp accounts. Spamming or abusive messaging is strictly prohibited and may result in immediate account termination.

## 3. Account Responsibilities
You are responsible for maintaining the confidentiality of your account credentials and tokens. You must immediately notify us of any unauthorized use of your account.

## 4. Subscription and Billing
Certain features require a paid subscription. Payments are billed in advance on a recurring basis. Refunds are handled in accordance with our refund policy. Usage limits apply based on your selected plan.

## 5. Third-Party Services
ZiniChat integrates with third-party platforms like Meta (Facebook, Instagram, WhatsApp). Your use of these integrations is also subject to their respective terms and policies. ZiniChat is not responsible for any changes or restrictions imposed by these third-party platforms.

## 6. Limitation of Liability
ZiniChat is provided "as is". We shall not be liable for any indirect, incidental, special, or consequential damages resulting from the use or inability to use our services.

## 7. Contact Us
For any questions regarding these Terms, please contact us at **info@zinichat.com**.\`;

  const termsConditionsBn = \`# শর্তাবলী (Terms and Conditions)

**সর্বশেষ আপডেট:** ২ আগস্ট, ২০২৬

ZiniChat-এ আপনাকে স্বাগতম। আমাদের অমনিচ্যানেল এআই প্ল্যাটফর্ম এবং পরিষেবাগুলো ব্যবহার করার মাধ্যমে, আপনি এই শর্তাবলীতে সম্মত হচ্ছেন।

## ১. শর্তাবলীর সম্মতি
অ্যাকাউন্ট তৈরি করার মাধ্যমে, আপনি এই শর্তাবলী মেনে চলতে সম্মত হচ্ছেন। আপনি যদি সম্মত না হন, তবে ZiniChat ব্যবহার থেকে বিরত থাকুন।

## ২. পরিষেবার ব্যবহার
আপনি শুধুমাত্র বৈধ উদ্দেশ্যে ZiniChat ব্যবহার করতে সম্মত হচ্ছেন। মেটা এবং হোয়াটসঅ্যাপের মাধ্যমে পাঠানো বার্তা সহ আমাদের প্ল্যাটফর্মের মাধ্যমে প্রেরিত সমস্ত কন্টেন্টের জন্য আপনি দায়ী। স্প্যামিং বা অপব্যবহার কঠোরভাবে নিষিদ্ধ এবং এর ফলে অ্যাকাউন্ট বাতিল হতে পারে।

## ৩. অ্যাকাউন্টের দায়িত্ব
আপনার অ্যাকাউন্টের পাসওয়ার্ড এবং টোকেন গোপন রাখার দায়িত্ব আপনার। কোনো অননুমোদিত ব্যবহারের কথা অবিলম্বে আমাদের জানাতে হবে।

## ৪. সাবস্ক্রিপশন এবং বিলিং
কিছু নির্দিষ্ট ফিচারের জন্য পেইড সাবস্ক্রিপশন প্রয়োজন। নির্বাচিত প্ল্যানের উপর ভিত্তি করে ব্যবহারের লিমিট প্রযোজ্য হবে।

## ৫. থার্ড-পার্টি সার্ভিস
ZiniChat মেটা (ফেসবুক, ইনস্টাগ্রাম, হোয়াটসঅ্যাপ)-এর মতো থার্ড-পার্টি প্ল্যাটফর্মগুলোর সাথে ইন্টিগ্রেট করে। আপনার এই ইন্টিগ্রেশনগুলো ব্যবহার করা তাদের নিজস্ব শর্তাবলী এবং নীতিমালার অধীন। এসব প্ল্যাটফর্মের কোনো পরিবর্তন বা বিধিনিষেধের জন্য ZiniChat দায়ী নয়।

## ৬. দায়বদ্ধতার সীমাবদ্ধতা
ZiniChat "যেমন আছে" সেভাবেই প্রদান করা হয়। আমাদের পরিষেবা ব্যবহারের ফলে কোনো পরোক্ষ বা আনুষঙ্গিক ক্ষতির জন্য আমরা দায়ী থাকব না।

## ৭. যোগাযোগ
এই শর্তাবলী সংক্রান্ত যেকোনো প্রশ্নের জন্য অনুগ্রহ করে **info@zinichat.com**-এ আমাদের সাথে যোগাযোগ করুন।\`;

  const configs = await prisma.landingPageConfig.findMany();
  if (configs.length > 0) {
    await prisma.landingPageConfig.update({
      where: { id: configs[0].id },
      data: {
        termsConditionsJson: { en: termsConditionsEn, bn: termsConditionsBn }
      }
    });
    console.log("Successfully updated Terms & Conditions in live DB!");
  } else {
    console.log("No LandingPageConfig found!");
  }
}

run().catch(console.error).finally(() => process.exit(0));
`;

    const tmpPath = path.join(os.tmpdir(), 'update-terms.js');
    fs.writeFileSync(tmpPath, scriptToRun);

    console.log('🔄 Uploading and executing terms update script on live server...\n');
    
    await ssh.putFile(tmpPath, '/tmp/update-terms.js');
    await ssh.execCommand('docker cp /tmp/update-terms.js zinichat_backend_live:/usr/src/app/update-terms.js', { cwd: process.env.LIVE_PROJECT_PATH });
    
    const result = await ssh.execCommand(
      'docker exec zinichat_backend_live node update-terms.js',
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
