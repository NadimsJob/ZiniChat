import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as nodemailer from 'nodemailer';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
// ─── Default Email Templates ──────────────────────────────────────────────────
const TEMPLATES = {
  welcomeSubject: 'ZiniChat প্ল্যাটফর্মে স্বাগতম! 🎉',
  welcomeBody: `প্রিয় {{tenantName}},

ZiniChat প্ল্যাটফর্মে আপনাকে স্বাগতম! আপনার অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে।

এখনই আপনার ড্যাশবোর্ডে লগইন করে আপনার কাস্টমারদের সাথে যুক্ত হওয়া শুরু করুন।`,

  paymentSubmittedSubject: '✅ পেমেন্ট সাবমিট সফল হয়েছে – {{tenantName}}',
  paymentSubmittedBody: `প্রিয় {{tenantName}},

আপনার পেমেন্ট সাবমিট সফলভাবে গ্রহণ করা হয়েছে। আমাদের টিম শীঘ্রই এটি ভেরিফাই করবে।

TrxID: {{trxId}}
পরিমাণ: {{amount}} BDT

ভেরিফিকেশনে সাধারণত ১–২ কার্যদিবস সময় লাগে। অ্যাপ্রুভ হলে আপনাকে ইমেইলে জানানো হবে।`,

  paymentPendingAdminSubject: '🔔 নতুন পেমেন্ট ভেরিফিকেশন প্রয়োজন – {{tenantName}}',
  paymentPendingAdminBody: `অ্যাডমিন সতর্কতা:
একটি নতুন ম্যানুয়াল পেমেন্ট সাবমিট হয়েছে। অনুগ্রহ করে ভেরিফাই করুন।

টেন্যান্ট: {{tenantName}}
TrxID: {{trxId}}
পরিমাণ: {{amount}} BDT

দয়া করে Superadmin প্যানেলে গিয়ে পেমেন্টটি অ্যাপ্রুভ করুন।`,

  paymentApprovedSubject: '🎉 পেমেন্ট অনুমোদিত হয়েছে – {{planName}} প্ল্যান সক্রিয়!',
  paymentApprovedBody: `প্রিয় {{tenantName}},

আপনার পেমেন্ট সফলভাবে অনুমোদিত হয়েছে। 
আপনার সাবস্ক্রিপশন এখন সক্রিয়!

সক্রিয় প্ল্যান: {{planName}}

এখনই আপনার ড্যাশবোর্ডে লগইন করে সব ফিচার উপভোগ করুন!`,

  addonPurchasedSubject: '🧩 অ্যাড-অন সক্রিয় হয়েছে – {{addonName}}',
  addonPurchasedBody: `প্রিয় {{tenantName}},

আপনার কেনা অ্যাড-অনটি সফলভাবে আপনার অ্যাকাউন্টে যোগ করা হয়েছে এবং এখনই ব্যবহারযোগ্য।

অ্যাড-অন: {{addonName}}
পরিমাণ: {{amount}} BDT

যেকোনো প্রয়োজনে আমাদের সাথে যোগাযোগ করুন।`,

  expiryReminder7dSubject: '⚠️ সাবস্ক্রিপশনের মেয়াদ ৭ দিনে শেষ হবে – {{tenantName}}',
  expiryReminder7dBody: `প্রিয় {{tenantName}},

আপনার সাবস্ক্রিপশনের মেয়াদ মাত্র ৭ দিন পরে শেষ হবে।

মেয়াদ শেষের তারিখ: {{expiryDate}}

আপনার প্ল্যাটফর্মের সার্ভিস নিরবচ্ছিন্ন রাখতে এখনই রিনিউ করুন।`,

  expiryReminder2dSubject: '🚨 শেষ সতর্কতা – সাবস্ক্রিপশনের মেয়াদ মাত্র ২ দিন বাকি!',
  expiryReminder2dBody: `প্রিয় {{tenantName}},

আপনার সাবস্ক্রিপশনের মেয়াদ মাত্র ২ দিন পরে শেষ হবে! 
মেয়াদ শেষ হলে আপনার সকল সার্ভিস সাময়িকভাবে বন্ধ হয়ে যেতে পারে।

মেয়াদ শেষের তারিখ: {{expiryDate}}

অনুগ্রহ করে দ্রুত আপনার সাবস্ক্রিপশনটি রিনিউ করুন।`,

  agentCreatedSubject: '🔐 ZiniChat-এ আপনাকে এজেন্ট হিসেবে যুক্ত করা হয়েছে',
  agentCreatedBody: `প্রিয় {{agentName}},

{{tenantName}} আপনাকে ZiniChat সিস্টেমে এজেন্ট হিসেবে যুক্ত করেছে।
নিচের ক্রেডেনশিয়াল ব্যবহার করে সিস্টেমে লগইন করুন:

Email: {{email}}
Password: {{password}}

লগইন লিংক: {{loginUrl}}

⚠️ নিরাপত্তার স্বার্থে লগইন করার পর অবশ্যই আপনার পাসওয়ার্ড পরিবর্তন করে নিবেন।`,

  passwordResetSubject: '🔐 পাসওয়ার্ড রিসেট করুন – ZiniChat',
  passwordResetBody: `প্রিয় {{userName}},

আমরা আপনার অ্যাকাউন্টের জন্য একটি পাসওয়ার্ড রিসেট করার অনুরোধ পেয়েছি। 
অনুগ্রহ করে নিচের লিংকে ক্লিক করে নতুন পাসওয়ার্ড সেট করুন:

{{resetLink}}

⚠️ এই লিংকটি আগামী ১ ঘণ্টার জন্য কাজ করবে। আপনি যদি এই অনুরোধটি না করে থাকেন, তাহলে এই ইমেইলটি এড়িয়ে যান।`,

  newInquirySubject: '🔔 নতুন ওয়েবসাইট ইনকোয়ারি – {{name}}',
  newInquiryBody: `অ্যাডমিন সতর্কতা:
ওয়েবসাইটের কন্টাক্ট ফর্ম থেকে একটি নতুন মেসেজ এসেছে।

নাম: {{name}}
ইমেইল: {{email}}

মেসেজ:
{{message}}

দয়া করে Superadmin প্যানেলে গিয়ে ইনকোয়ারিটি চেক করুন।`,

  ticketCreatedSubject: '🎫 নতুন সাপোর্ট টিকিট – {{tenantName}}',
  ticketCreatedBody: `অ্যাডমিন সতর্কতা:
একটি নতুন সাপোর্ট টিকিট তৈরি করা হয়েছে।

টেন্যান্ট: {{tenantName}}
বিষয়: {{subject}}
প্রাইওরিটি: {{priority}}

দয়া করে Superadmin প্যানেলে গিয়ে টিকিটটি চেক করুন।`,

  ticketRepliedSubject: '💬 সাপোর্ট টিকিটে নতুন রিপ্লাই',
  ticketRepliedBody: `আপনার সাপোর্ট টিকিটে একটি নতুন রিপ্লাই এসেছে।

বিষয়: {{subject}}
মেসেজ:
{{message}}

বিস্তারিত দেখতে প্যানেলে লগইন করুন।`,

  ticketStatusSubject: '🔄 সাপোর্ট টিকিটের স্ট্যাটাস আপডেট',
  ticketStatusBody: `আপনার সাপোর্ট টিকিটের স্ট্যাটাস পরিবর্তন করা হয়েছে।

বিষয়: {{subject}}
নতুন স্ট্যাটাস: {{status}}

বিস্তারিত দেখতে প্যানেলে লগইন করুন।`,

  ticketAssignedSubject: '📌 আপনাকে একটি টিকিট অ্যাসাইন করা হয়েছে',
  ticketAssignedBody: `প্রিয় {{adminName}},

আপনাকে একটি সাপোর্ট টিকিট অ্যাসাইন করা হয়েছে।

টেন্যান্ট: {{tenantName}}
বিষয়: {{subject}}

দয়া করে Superadmin প্যানেলে গিয়ে টিকিটটি চেক করুন।`,

  broadcastCompletedSubject: '✅ ব্রডকাস্ট সফলভাবে সম্পন্ন হয়েছে – {{broadcastName}}',
  broadcastCompletedBody: `প্রিয় {{businessName}},

আপনার ব্রডকাস্ট ক্যাম্পেইনটি সফলভাবে সবার কাছে পাঠানো সম্পন্ন হয়েছে!

ক্যাম্পেইন: {{broadcastName}}
মোট প্রাপক: {{totalRecipients}}
সময়: {{timestamp}}

আপনার ড্যাশবোর্ডে লগইন করে বিস্তারিত রিপোর্ট চেক করতে পারেন।`,

  storageWarning80Subject: '⚠️ সতর্কতা: স্টোরেজ ৮০% পূর্ণ হয়ে গেছে – {{tenantName}}',
  storageWarning80Body: `প্রিয় {{tenantName}},

আপনার ZiniChat অ্যাকাউন্টের স্টোরেজ বর্তমানে {{usedMb}} MB ব্যবহৃত হয়েছে, যা মোট সীমা {{limitMb}} MB-এর {{percent}}% পূর্ণ।

আপনার স্টোরেজ সম্পূর্ণ পূর্ণ হওয়ার আগেই পদক্ষেপ নিন:
• পুরনো চ্যাট মিডিয়া, AI ডকুমেন্ট বা পণ্যের ছবি মুছে দিন
• অথবা একটি উচ্চতর প্ল্যানে আপগ্রেড করুন যেখানে আরো স্টোরেজ থাকবে

স্টোরেজ ম্যানেজ করতে: আপনার ড্যাশবোর্ড → সেটিংস → স্টোরেজ

যেকোনো সহায়তার জন্য আমাদের সাপোর্ট টিমের সাথে যোগাযোগ করুন।

ধন্যবাদ,
ZiniChat টিম`,

  storageWarning100Subject: '🚨 জরুরি সতর্কতা: স্টোরেজ সম্পূর্ণ পূর্ণ! ফাইল আপলোড বন্ধ হয়েছে – {{tenantName}}',
  storageWarning100Body: `প্রিয় {{tenantName}},

আপনার ZiniChat অ্যাকাউন্টের স্টোরেজ সম্পূর্ণ পূর্ণ হয়ে গেছে ({{usedMb}} MB / {{limitMb}} MB)।

⛔ এই মুহূর্তে কোনো নতুন ফাইল, ছবি বা ডকুমেন্ট আপলোড করা সম্ভব হচ্ছে না।

আপনার সার্ভিস স্বাভাবিক রাখতে অবিলম্বে পদক্ষেপ নিন:
১. পুরনো চ্যাট মিডিয়া, AI ডকুমেন্ট বা পণ্যের ছবি মুছে দিন
২. অথবা একটি উচ্চতর প্ল্যানে আপগ্রেড করুন

স্টোরেজ ম্যানেজ করতে: আপনার ড্যাশবোর্ড → সেটিংস → স্টোরেজ
আপগ্রেড করতে: আপনার ড্যাশবোর্ড → সেটিংস → সাবস্ক্রিপশন

যেকোনো সহায়তার জন্য আমাদের সাপোর্ট টিমের সাথে যোগাযোগ করুন।

ধন্যবাদ,
ZiniChat টিম`,

  messageWarning80Subject: '⚠️ সতর্কতা: মাসিক মেসেজ কোটা ৮০% ব্যবহৃত হয়েছে – {{tenantName}}',
  messageWarning80Body: `প্রিয় {{tenantName}},

আপনার ZiniChat অ্যাকাউন্টের মাসিক আউটবাউন্ড মেসেজ কোটার ৮০% ব্যবহৃত হয়ে গেছে ({{used}} / {{limit}} মেসেজ)।

কোটা সম্পূর্ণ শেষ হওয়ার আগেই আপনার সার্ভিস নিরবচ্ছিন্ন রাখতে পদক্ষেপ নিন:
• অযাচিত ব্রডকাস্ট ক্যাম্পেইন কমান
• অথবা এখনই আপনার প্ল্যানটি আপগ্রেড করুন

আপগ্রেড করতে: আপনার ড্যাশবোর্ড → সেটিংস → সাবস্ক্রিপশন

ধন্যবাদ,
ZiniChat টিম`,

  messageWarning100Subject: '🚨 জরুরি সতর্কতা: মাসিক মেসেজ কোটা সম্পূর্ণ শেষ! – {{tenantName}}',
  messageWarning100Body: `প্রিয় {{tenantName}},

আপনার ZiniChat অ্যাকাউন্টের মাসিক আউটবাউন্ড মেসেজ কোটা সম্পূর্ণ শেষ হয়ে গেছে ({{used}} / {{limit}} মেসেজ)।

⛔ এই মুহূর্তে কাস্টমারদের কোনো আউটবাউন্ড মেসেজ (এজেন্ট চ্যাট অথবা ব্রডকাস্ট) পাঠানো যাবে না।

আপনার ব্যবসা ও গ্রাহক সেবা সচল রাখতে অবিলম্বে আপনার প্ল্যানটি আপগ্রেড করুন।

আপগ্রেড করতে: আপনার ড্যাশবোর্ড → সেটিংস → সাবস্ক্রিপশন

ধন্যবাদ,
ZiniChat টিম`,

  aiWarning80Subject: '⚠️ সতর্কতা: মাসিক এআই রেসপন্স কোটা ৮০% ব্যবহৃত হয়েছে – {{tenantName}}',
  aiWarning80Body: `প্রিয় {{tenantName}},

আপনার ZiniChat অ্যাকাউন্টের মাসিক এআই রেসপন্স (AI Auto-Replies) কোটার ৮০% ব্যবহৃত হয়ে গেছে ({{used}} / {{limit}} রেসপন্স)।

কোটা সম্পূর্ণ শেষ হওয়ার আগেই এআই সেবা নিরবচ্ছিন্ন রাখতে এখনই আপনার প্ল্যানটি আপগ্রেড করুন।

আপগ্রেড করতে: আপনার ড্যাশবোর্ড → সেটিংস → সাবস্ক্রিপশন

ধন্যবাদ,
ZiniChat টিম`,

  aiWarning100Subject: '🚨 জরুরি সতর্কতা: মাসিক এআই রেসপন্স কোটা সম্পূর্ণ শেষ! – {{tenantName}}',
  aiWarning100Body: `প্রিয় {{tenantName}},

আপনার ZiniChat অ্যাকাউন্টের মাসিক এআই রেসপন্স (AI Auto-Replies) কোটা সম্পূর্ণ শেষ হয়ে গেছে ({{used}} / {{limit}} রেসপন্স)।

⛔ চ্যাটবট এখন আর গ্রাহকদের স্বয়ংক্রিয় উত্তর দিতে পারবে না। কাস্টমারদের সমস্ত ইনকোয়ারি এখন ম্যানুয়ালি উত্তর দিতে হবে।

চ্যাটবট অটো-রিপ্লাই পুনরায় চালু করতে অবিলম্বে আপনার প্ল্যানটি আপগ্রেড করুন।

আপগ্রেড করতে: আপনার ড্যাশবোর্ড → সেটিংস → সাবস্ক্রিপশন

ধন্যবাদ,
ZiniChat টিম`,
};


// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class SmtpService {
  private readonly logger = new Logger(SmtpService.name);

  constructor(
    private prisma: PrismaService,
    @InjectQueue('email') private emailQueue: Queue
  ) {}

  async getConfig() {
    let config = await this.prisma.smtpConfig.findFirst();
    
    if (!config) {
      config = await this.prisma.smtpConfig.create({
        data: {
          host: 'smtp.mailtrap.io',
          port: 2525,
          secure: false,
          username: '',
          password: '',
          fromEmail: 'noreply@zinichat.com',
          fromName: 'ZiniChat',
          sendWelcomeEmail: false,
          welcomeSubject: TEMPLATES.welcomeSubject,
          welcomeBody: TEMPLATES.welcomeBody,
          paymentSubmittedSubject: TEMPLATES.paymentSubmittedSubject,
          paymentSubmittedBody: TEMPLATES.paymentSubmittedBody,
          paymentPendingAdminSubject: TEMPLATES.paymentPendingAdminSubject,
          paymentPendingAdminBody: TEMPLATES.paymentPendingAdminBody,
          paymentApprovedSubject: TEMPLATES.paymentApprovedSubject,
          paymentApprovedBody: TEMPLATES.paymentApprovedBody,
          addonPurchasedSubject: TEMPLATES.addonPurchasedSubject,
          addonPurchasedBody: TEMPLATES.addonPurchasedBody,
          expiryReminder7dSubject: TEMPLATES.expiryReminder7dSubject,
          expiryReminder7dBody: TEMPLATES.expiryReminder7dBody,
          expiryReminder2dSubject: TEMPLATES.expiryReminder2dSubject,
          expiryReminder2dBody: TEMPLATES.expiryReminder2dBody,
          agentCreatedSubject: TEMPLATES.agentCreatedSubject,
          agentCreatedBody: TEMPLATES.agentCreatedBody,
          passwordResetEnabled: true,
          passwordResetSubject: TEMPLATES.passwordResetSubject,
          passwordResetBody: TEMPLATES.passwordResetBody,
          newInquiryEnabled: true,
          newInquirySubject: TEMPLATES.newInquirySubject,
          newInquiryBody: TEMPLATES.newInquiryBody,
          ticketCreatedEnabled: true,
          ticketCreatedSubject: TEMPLATES.ticketCreatedSubject,
          ticketCreatedBody: TEMPLATES.ticketCreatedBody,
          ticketRepliedEnabled: true,
          ticketRepliedSubject: TEMPLATES.ticketRepliedSubject,
          ticketRepliedBody: TEMPLATES.ticketRepliedBody,
          ticketStatusEnabled: true,
          ticketStatusSubject: TEMPLATES.ticketStatusSubject,
          ticketStatusBody: TEMPLATES.ticketStatusBody,
          ticketAssignedEnabled: true,
          ticketAssignedSubject: TEMPLATES.ticketAssignedSubject,
          ticketAssignedBody: TEMPLATES.ticketAssignedBody,
          broadcastCompletedEnabled: true,
          broadcastCompletedSubject: TEMPLATES.broadcastCompletedSubject,
          broadcastCompletedBody: TEMPLATES.broadcastCompletedBody,
          storageWarning80Enabled: true,
          storageWarning80Subject: TEMPLATES.storageWarning80Subject,
          storageWarning80Body: TEMPLATES.storageWarning80Body,
          storageWarning100Enabled: true,
          storageWarning100Subject: TEMPLATES.storageWarning100Subject,
          storageWarning100Body: TEMPLATES.storageWarning100Body,
          messageWarning80Enabled: true,
          messageWarning80Subject: TEMPLATES.messageWarning80Subject,
          messageWarning80Body: TEMPLATES.messageWarning80Body,
          messageWarning100Enabled: true,
          messageWarning100Subject: TEMPLATES.messageWarning100Subject,
          messageWarning100Body: TEMPLATES.messageWarning100Body,
          aiWarning80Enabled: true,
          aiWarning80Subject: TEMPLATES.aiWarning80Subject,
          aiWarning80Body: TEMPLATES.aiWarning80Body,
          aiWarning100Enabled: true,
          aiWarning100Subject: TEMPLATES.aiWarning100Subject,
          aiWarning100Body: TEMPLATES.aiWarning100Body,
        }
      });
    } else {
      // Backfill missing fields for existing config
      let needsUpdate = false;
      const updates: any = {};

      if (!config.paymentSubmittedSubject) { updates.paymentSubmittedSubject = TEMPLATES.paymentSubmittedSubject; updates.paymentSubmittedBody = TEMPLATES.paymentSubmittedBody; needsUpdate = true; }
      if (!config.paymentPendingAdminSubject) { updates.paymentPendingAdminSubject = TEMPLATES.paymentPendingAdminSubject; updates.paymentPendingAdminBody = TEMPLATES.paymentPendingAdminBody; needsUpdate = true; }
      if (!config.paymentApprovedSubject) { updates.paymentApprovedSubject = TEMPLATES.paymentApprovedSubject; updates.paymentApprovedBody = TEMPLATES.paymentApprovedBody; needsUpdate = true; }
      if (!config.addonPurchasedSubject) { updates.addonPurchasedSubject = TEMPLATES.addonPurchasedSubject; updates.addonPurchasedBody = TEMPLATES.addonPurchasedBody; needsUpdate = true; }
      if (!config.expiryReminder7dSubject) { updates.expiryReminder7dSubject = TEMPLATES.expiryReminder7dSubject; updates.expiryReminder7dBody = TEMPLATES.expiryReminder7dBody; needsUpdate = true; }
      if (!config.expiryReminder2dSubject) { updates.expiryReminder2dSubject = TEMPLATES.expiryReminder2dSubject; updates.expiryReminder2dBody = TEMPLATES.expiryReminder2dBody; needsUpdate = true; }
      if (!config.welcomeSubject) { updates.welcomeSubject = TEMPLATES.welcomeSubject; updates.welcomeBody = TEMPLATES.welcomeBody; needsUpdate = true; }
      if (!config.agentCreatedSubject) { updates.agentCreatedSubject = TEMPLATES.agentCreatedSubject; updates.agentCreatedBody = TEMPLATES.agentCreatedBody; needsUpdate = true; }
      if (!config.passwordResetSubject) { updates.passwordResetSubject = TEMPLATES.passwordResetSubject; updates.passwordResetBody = TEMPLATES.passwordResetBody; needsUpdate = true; }
      if (!config.newInquirySubject) { updates.newInquirySubject = TEMPLATES.newInquirySubject; updates.newInquiryBody = TEMPLATES.newInquiryBody; needsUpdate = true; }
      if (!config.ticketCreatedSubject) { updates.ticketCreatedSubject = TEMPLATES.ticketCreatedSubject; updates.ticketCreatedBody = TEMPLATES.ticketCreatedBody; needsUpdate = true; }
      if (!config.ticketRepliedSubject) { updates.ticketRepliedSubject = TEMPLATES.ticketRepliedSubject; updates.ticketRepliedBody = TEMPLATES.ticketRepliedBody; needsUpdate = true; }
      if (!config.ticketStatusSubject) { updates.ticketStatusSubject = TEMPLATES.ticketStatusSubject; updates.ticketStatusBody = TEMPLATES.ticketStatusBody; needsUpdate = true; }
      if (!config.ticketAssignedSubject) { updates.ticketAssignedSubject = TEMPLATES.ticketAssignedSubject; updates.ticketAssignedBody = TEMPLATES.ticketAssignedBody; needsUpdate = true; }
      if (!config.broadcastCompletedSubject) { updates.broadcastCompletedSubject = TEMPLATES.broadcastCompletedSubject; updates.broadcastCompletedBody = TEMPLATES.broadcastCompletedBody; needsUpdate = true; }
      if (!config.storageWarning80Subject) { updates.storageWarning80Subject = TEMPLATES.storageWarning80Subject; updates.storageWarning80Body = TEMPLATES.storageWarning80Body; needsUpdate = true; }
      if (!config.storageWarning100Subject) { updates.storageWarning100Subject = TEMPLATES.storageWarning100Subject; updates.storageWarning100Body = TEMPLATES.storageWarning100Body; needsUpdate = true; }
      if (!config.messageWarning80Subject) { updates.messageWarning80Subject = TEMPLATES.messageWarning80Subject; updates.messageWarning80Body = TEMPLATES.messageWarning80Body; needsUpdate = true; }
      if (!config.messageWarning100Subject) { updates.messageWarning100Subject = TEMPLATES.messageWarning100Subject; updates.messageWarning100Body = TEMPLATES.messageWarning100Body; needsUpdate = true; }
      if (!config.aiWarning80Subject) { updates.aiWarning80Subject = TEMPLATES.aiWarning80Subject; updates.aiWarning80Body = TEMPLATES.aiWarning80Body; needsUpdate = true; }
      if (!config.aiWarning100Subject) { updates.aiWarning100Subject = TEMPLATES.aiWarning100Subject; updates.aiWarning100Body = TEMPLATES.aiWarning100Body; needsUpdate = true; }

      if (needsUpdate) {
        config = await this.prisma.smtpConfig.update({
          where: { id: config.id },
          data: updates
        });
      }
    }
    return config;
  }

  async updateConfig(data: any) {
    const config = await this.getConfig();
    return this.prisma.smtpConfig.update({
      where: { id: config.id },
      data: {
        host: data.host ?? config.host,
        port: data.port ? Number(data.port) : config.port,
        secure: data.secure !== undefined ? !!data.secure : config.secure,
        username: data.username ?? config.username,
        password: data.password ?? config.password,
        fromEmail: data.fromEmail ?? config.fromEmail,
        fromName: data.fromName ?? config.fromName,
        sendWelcomeEmail: data.sendWelcomeEmail !== undefined ? !!data.sendWelcomeEmail : config.sendWelcomeEmail,
        welcomeSubject: data.welcomeSubject ?? config.welcomeSubject,
        welcomeBody: data.welcomeBody ?? config.welcomeBody,
        paymentSubmittedEnabled: data.paymentSubmittedEnabled !== undefined ? !!data.paymentSubmittedEnabled : config.paymentSubmittedEnabled,
        paymentSubmittedSubject: data.paymentSubmittedSubject ?? config.paymentSubmittedSubject,
        paymentSubmittedBody: data.paymentSubmittedBody ?? config.paymentSubmittedBody,
        paymentPendingAdminEnabled: data.paymentPendingAdminEnabled !== undefined ? !!data.paymentPendingAdminEnabled : config.paymentPendingAdminEnabled,
        paymentPendingAdminSubject: data.paymentPendingAdminSubject ?? config.paymentPendingAdminSubject,
        paymentPendingAdminBody: data.paymentPendingAdminBody ?? config.paymentPendingAdminBody,
        paymentApprovedEnabled: data.paymentApprovedEnabled !== undefined ? !!data.paymentApprovedEnabled : config.paymentApprovedEnabled,
        paymentApprovedSubject: data.paymentApprovedSubject ?? config.paymentApprovedSubject,
        paymentApprovedBody: data.paymentApprovedBody ?? config.paymentApprovedBody,
        addonPurchasedEnabled: data.addonPurchasedEnabled !== undefined ? !!data.addonPurchasedEnabled : config.addonPurchasedEnabled,
        addonPurchasedSubject: data.addonPurchasedSubject ?? config.addonPurchasedSubject,
        addonPurchasedBody: data.addonPurchasedBody ?? config.addonPurchasedBody,
        expiryReminder7dEnabled: data.expiryReminder7dEnabled !== undefined ? !!data.expiryReminder7dEnabled : config.expiryReminder7dEnabled,
        expiryReminder7dSubject: data.expiryReminder7dSubject ?? config.expiryReminder7dSubject,
        expiryReminder7dBody: data.expiryReminder7dBody ?? config.expiryReminder7dBody,
        expiryReminder2dEnabled: data.expiryReminder2dEnabled !== undefined ? !!data.expiryReminder2dEnabled : config.expiryReminder2dEnabled,
        expiryReminder2dSubject: data.expiryReminder2dSubject ?? config.expiryReminder2dSubject,
        expiryReminder2dBody: data.expiryReminder2dBody ?? config.expiryReminder2dBody,
        agentCreatedEnabled: data.agentCreatedEnabled !== undefined ? !!data.agentCreatedEnabled : config.agentCreatedEnabled,
        agentCreatedSubject: data.agentCreatedSubject ?? config.agentCreatedSubject,
        agentCreatedBody: data.agentCreatedBody ?? config.agentCreatedBody,
        passwordResetEnabled: data.passwordResetEnabled !== undefined ? !!data.passwordResetEnabled : config.passwordResetEnabled,
        passwordResetSubject: data.passwordResetSubject ?? config.passwordResetSubject,
        passwordResetBody: data.passwordResetBody ?? config.passwordResetBody,
        newInquiryEnabled: data.newInquiryEnabled !== undefined ? !!data.newInquiryEnabled : config.newInquiryEnabled,
        newInquirySubject: data.newInquirySubject ?? config.newInquirySubject,
        newInquiryBody: data.newInquiryBody ?? config.newInquiryBody,
        ticketCreatedEnabled: data.ticketCreatedEnabled !== undefined ? !!data.ticketCreatedEnabled : config.ticketCreatedEnabled,
        ticketCreatedSubject: data.ticketCreatedSubject ?? config.ticketCreatedSubject,
        ticketCreatedBody: data.ticketCreatedBody ?? config.ticketCreatedBody,
        ticketRepliedEnabled: data.ticketRepliedEnabled !== undefined ? !!data.ticketRepliedEnabled : config.ticketRepliedEnabled,
        ticketRepliedSubject: data.ticketRepliedSubject ?? config.ticketRepliedSubject,
        ticketRepliedBody: data.ticketRepliedBody ?? config.ticketRepliedBody,
        ticketStatusEnabled: data.ticketStatusEnabled !== undefined ? !!data.ticketStatusEnabled : config.ticketStatusEnabled,
        ticketStatusSubject: data.ticketStatusSubject ?? config.ticketStatusSubject,
        ticketStatusBody: data.ticketStatusBody ?? config.ticketStatusBody,
        ticketAssignedEnabled: data.ticketAssignedEnabled !== undefined ? !!data.ticketAssignedEnabled : config.ticketAssignedEnabled,
        ticketAssignedSubject: data.ticketAssignedSubject ?? config.ticketAssignedSubject,
        ticketAssignedBody: data.ticketAssignedBody ?? config.ticketAssignedBody,
        broadcastCompletedEnabled: data.broadcastCompletedEnabled !== undefined ? !!data.broadcastCompletedEnabled : config.broadcastCompletedEnabled,
        broadcastCompletedSubject: data.broadcastCompletedSubject ?? config.broadcastCompletedSubject,
        broadcastCompletedBody: data.broadcastCompletedBody ?? config.broadcastCompletedBody,
        storageWarning80Enabled: data.storageWarning80Enabled !== undefined ? !!data.storageWarning80Enabled : config.storageWarning80Enabled,
        storageWarning80Subject: data.storageWarning80Subject ?? config.storageWarning80Subject,
        storageWarning80Body: data.storageWarning80Body ?? config.storageWarning80Body,
        storageWarning100Enabled: data.storageWarning100Enabled !== undefined ? !!data.storageWarning100Enabled : config.storageWarning100Enabled,
        storageWarning100Subject: data.storageWarning100Subject ?? config.storageWarning100Subject,
        storageWarning100Body: data.storageWarning100Body ?? config.storageWarning100Body,
        messageWarning80Enabled: data.messageWarning80Enabled !== undefined ? !!data.messageWarning80Enabled : config.messageWarning80Enabled,
        messageWarning80Subject: data.messageWarning80Subject ?? config.messageWarning80Subject,
        messageWarning80Body: data.messageWarning80Body ?? config.messageWarning80Body,
        messageWarning100Enabled: data.messageWarning100Enabled !== undefined ? !!data.messageWarning100Enabled : config.messageWarning100Enabled,
        messageWarning100Subject: data.messageWarning100Subject ?? config.messageWarning100Subject,
        messageWarning100Body: data.messageWarning100Body ?? config.messageWarning100Body,
        aiWarning80Enabled: data.aiWarning80Enabled !== undefined ? !!data.aiWarning80Enabled : config.aiWarning80Enabled,
        aiWarning80Subject: data.aiWarning80Subject ?? config.aiWarning80Subject,
        aiWarning80Body: data.aiWarning80Body ?? config.aiWarning80Body,
        aiWarning100Enabled: data.aiWarning100Enabled !== undefined ? !!data.aiWarning100Enabled : config.aiWarning100Enabled,
        aiWarning100Subject: data.aiWarning100Subject ?? config.aiWarning100Subject,
        aiWarning100Body: data.aiWarning100Body ?? config.aiWarning100Body,
      }
    });
  }

  async createTransporter(config: any) {
    const isPort465 = Number(config.port) === 465;
    return nodemailer.createTransport({
      host: config.host,
      port: Number(config.port),
      secure: config.secure !== undefined ? config.secure : isPort465,
      auth: config.username && config.password ? {
        user: config.username,
        pass: config.password
      } : undefined,
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000
    });
  }

  private generateMasterHtml(rawText: string, config: any): string {
    const platformUrl = process.env.NEXT_PUBLIC_API_URL 
      ? process.env.NEXT_PUBLIC_API_URL.replace(':3001', ':3000') 
      : 'https://zinichat.com';

    // Format paragraphs and convert URLs to styled buttons or clear links
    let formattedText = rawText
      .split('\n\n')
      .map(p => `<p style="margin: 0 0 16px 0;">${p.replace(/\n/g, '<br/>')}</p>`)
      .join('');

    // Convert raw HTTP links into styled buttons
    formattedText = formattedText.replace(
      /(<p[^>]*>)?(https?:\/\/[^\s<]+)(<\/p>)?/g,
      (match, pStart, url, pEnd) => {
        if (url.includes('/login') || url.includes('/verify') || url.includes('/reset-password')) {
          return `<div style="text-align: center; margin: 24px 0;">
            <a href="${url}" target="_blank" style="background-color: #1F824A; color: #ffffff; padding: 12px 28px; font-weight: 600; font-size: 14px; text-decoration: none; border-radius: 8px; display: inline-block; box-shadow: 0 2px 4px rgba(31, 130, 74, 0.2);">এখানে ক্লিক করুন</a>
          </div>`;
        }
        return `<a href="${url}" style="color: #1F824A; text-decoration: underline; font-weight: 500;">${url}</a>`;
      }
    );

    return `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ZiniChat Notification</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5; margin: 0; padding: 40px 16px; -webkit-font-smoothing: antialiased;">
  <div style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e4e4e7; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);">
    
    <!-- Header Banner -->
    <div style="background: linear-gradient(135deg, #1F824A 0%, #155E34 100%); padding: 28px 32px; text-align: center;">
      <span style="color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; display: inline-block;">
        Zini<span style="color: #EE8D27;">Chat</span>
      </span>
      <p style="color: rgba(255,255,255,0.85); font-size: 12px; margin: 4px 0 0 0; font-weight: 500;">Omnichannel AI Business Platform</p>
    </div>

    <!-- Body Content -->
    <div style="padding: 36px 32px; color: #27272a; font-size: 15px; line-height: 1.7;">
      ${formattedText}
    </div>

    <!-- Footer -->
    <div style="padding: 24px 32px; text-align: center; background-color: #fafafa; border-top: 1px solid #f4f4f5; color: #71717a; font-size: 12px; line-height: 1.6;">
      <p style="margin: 0 0 8px 0; font-weight: 500;">এই ইমেইলটি স্বয়ংক্রিয়ভাবে পাঠানো হয়েছে। অনুগ্রহ করে রিপ্লাই করবেন না।</p>
      <p style="margin: 0; color: #a1a1aa;">
        © ${new Date().getFullYear()} <strong style="color: #52525b;">ZiniChat Platform</strong> • <a href="${platformUrl}" style="color: #1F824A; text-decoration: none;">www.zinichat.com</a>
      </p>
    </div>

  </div>
</body>
</html>`;
  }

  async internalExecuteSendMail({ to, subject, html, plainText }: { to: string; subject: string; html?: string; plainText?: string }) {
    const config = await this.getConfig();
    if (!config.host || !config.fromEmail) {
      this.logger.warn('SMTP is not fully configured. Skipping mail dispatch.');
      throw new InternalServerErrorException('SMTP server is not configured in Superadmin settings.');
    }
    const transporter = await this.createTransporter(config);
    
    const finalHtml = plainText ? this.generateMasterHtml(plainText, config) : html;

    const info = await transporter.sendMail({
      from: `"${config.fromName || 'ZiniChat'}" <${config.fromEmail}>`,
      to,
      subject,
      html: finalHtml
    });
    this.logger.log(`Email sent successfully: ${info.messageId} | Server Response: ${info.response}`);
    return info;
  }

  async sendMail({ to, subject, html, plainText }: { to: string; subject: string; html?: string; plainText?: string }) {
    await this.emailQueue.add('send-email', { to, subject, html, plainText }, { 
      attempts: 3, 
      backoff: { type: 'exponential', delay: 2000 } 
    });
  }

  private replacePlaceholders(template: string, vars: Record<string, string>): string {
    return Object.entries(vars).reduce(
      (t, [k, v]) => t.replace(new RegExp(`{{${k}}}`, 'g'), v ?? ''),
      template
    );
  }

  async sendTestMail(to: string) {
    return this.internalExecuteSendMail({
      to,
      subject: 'ZiniChat SMTP Connection Test ✅',
      plainText: `হ্যালো,\n\nএটি একটি টেস্ট ইমেইল। আপনার SMTP কানেকশন সফলভাবে কাজ করছে!\n\nধন্যবাদ,\nZiniChat`
    });
  }

  async triggerWelcomeEmail(toEmail: string, tenantName: string) {
    const config = await this.getConfig();
    if (!config.sendWelcomeEmail) return;
    const vars = { tenantName, email: toEmail };
    const subject = this.replacePlaceholders(config.welcomeSubject || 'Welcome!', vars);
    const bodyText = this.replacePlaceholders(config.welcomeBody || 'Welcome to ZiniChat!', vars);
    await this.sendMail({ to: toEmail, subject, plainText: bodyText });
  }

  async triggerPaymentSubmittedEmail(toEmail: string, tenantName: string, amount: string, trxId: string) {
    const config = await this.getConfig();
    if (!config.paymentSubmittedEnabled) return;
    const vars = { tenantName, email: toEmail, amount, trxId };
    const subject = this.replacePlaceholders(config.paymentSubmittedSubject || TEMPLATES.paymentSubmittedSubject, vars);
    const bodyText = this.replacePlaceholders(config.paymentSubmittedBody || TEMPLATES.paymentSubmittedBody, vars);
    await this.sendMail({ to: toEmail, subject, plainText: bodyText });
  }

  async getAdminNotificationEmails(): Promise<string[]> {
    const admins = await this.prisma.user.findMany({ where: { role: 'superadmin' } });
    const emailSet = new Set<string>();
    emailSet.add('support@zinichat.com');
    for (const admin of admins) {
      if (admin.email) emailSet.add(admin.email);
    }
    return Array.from(emailSet);
  }

  async triggerPaymentPendingAdminEmail(tenantName: string, amount: string, trxId: string) {
    const config = await this.getConfig();
    if (!config.paymentPendingAdminEnabled) return;
    const recipients = await this.getAdminNotificationEmails();
    const vars = { tenantName, amount, trxId };
    const subject = this.replacePlaceholders(config.paymentPendingAdminSubject || TEMPLATES.paymentPendingAdminSubject, vars);
    const bodyText = this.replacePlaceholders(config.paymentPendingAdminBody || TEMPLATES.paymentPendingAdminBody, vars);
    for (const toEmail of recipients) {
      await this.sendMail({ to: toEmail, subject, plainText: bodyText });
    }
  }

  async triggerPaymentApprovedEmail(toEmail: string, tenantName: string, planName: string) {
    const config = await this.getConfig();
    if (!config.paymentApprovedEnabled) return;
    const vars = { tenantName, email: toEmail, planName };
    const subject = this.replacePlaceholders(config.paymentApprovedSubject || TEMPLATES.paymentApprovedSubject, vars);
    const bodyText = this.replacePlaceholders(config.paymentApprovedBody || TEMPLATES.paymentApprovedBody, vars);
    await this.sendMail({ to: toEmail, subject, plainText: bodyText });
  }

  async triggerAddonPurchasedEmail(toEmail: string, tenantName: string, addonName: string, amount: string) {
    const config = await this.getConfig();
    if (!config.addonPurchasedEnabled) return;
    const vars = { tenantName, email: toEmail, addonName, amount };
    const subject = this.replacePlaceholders(config.addonPurchasedSubject || TEMPLATES.addonPurchasedSubject, vars);
    const bodyText = this.replacePlaceholders(config.addonPurchasedBody || TEMPLATES.addonPurchasedBody, vars);
    await this.sendMail({ to: toEmail, subject, plainText: bodyText });
  }

  async triggerPaymentRejectedEmail(toEmail: string, tenantName: string, trxId: string, reason?: string) {
    const subject = `❌ পেমেন্ট বাতিল করা হয়েছে (TrxID: ${trxId}) – ZiniChat`;
    const plainText = `প্রিয় ${tenantName},\n\nআপনার পেমেন্ট রিকোয়েস্টটি (TrxID: ${trxId}) পর্যালোচনা করার পর বাতিল করা হয়েছে।\n${reason ? `\nকারণ: ${reason}\n` : ''}\nযেকোনো প্রয়োজনে সাপোর্ট টিমের সাথে যোগাযোগ করুন।\n\nধন্যবাদ,\nZiniChat টিম`;
    await this.sendMail({ to: toEmail, subject, plainText });
  }

  async triggerExpiryReminderEmail(toEmail: string, tenantName: string, daysLeft: number, expiryDate: string) {
    const config = await this.getConfig();
    const vars = { tenantName, email: toEmail, daysLeft: String(daysLeft), expiryDate };
    if (daysLeft === 7 && config.expiryReminder7dEnabled) {
      const subject = this.replacePlaceholders(config.expiryReminder7dSubject || TEMPLATES.expiryReminder7dSubject, vars);
      const bodyText = this.replacePlaceholders(config.expiryReminder7dBody || TEMPLATES.expiryReminder7dBody, vars);
      await this.sendMail({ to: toEmail, subject, plainText: bodyText });
    } else if (daysLeft === 2 && config.expiryReminder2dEnabled) {
      const subject = this.replacePlaceholders(config.expiryReminder2dSubject || TEMPLATES.expiryReminder2dSubject, vars);
      const bodyText = this.replacePlaceholders(config.expiryReminder2dBody || TEMPLATES.expiryReminder2dBody, vars);
      await this.sendMail({ to: toEmail, subject, plainText: bodyText });
    }
  }

  async triggerAgentCreatedEmail(toEmail: string, agentName: string, tenantName: string, plainPassword: string) {
    const config = await this.getConfig();
    if (!config.agentCreatedEnabled) return;
    const loginUrl = process.env.NEXT_PUBLIC_API_URL 
      ? process.env.NEXT_PUBLIC_API_URL.replace(':3001', ':3000') + '/login'
      : 'https://zinichat.com/login';
    const vars = { tenantName, email: toEmail, agentName, password: plainPassword, loginUrl };
    const subject = this.replacePlaceholders(config.agentCreatedSubject || TEMPLATES.agentCreatedSubject, vars);
    const bodyText = this.replacePlaceholders(config.agentCreatedBody || TEMPLATES.agentCreatedBody, vars);
    await this.sendMail({ to: toEmail, subject, plainText: bodyText });
  }

  async triggerPasswordResetEmail(toEmail: string, userName: string, resetLink: string) {
    const config = await this.getConfig();
    const vars = { userName: userName || 'User', email: toEmail, resetLink };
    const subject = this.replacePlaceholders(config.passwordResetSubject || TEMPLATES.passwordResetSubject, vars);
    const bodyText = this.replacePlaceholders(config.passwordResetBody || TEMPLATES.passwordResetBody, vars);

    this.logger.log(`Dispatching password reset email to ${toEmail} via SMTP host ${config.host}:${config.port}...`);
    try {
      const info = await this.internalExecuteSendMail({ to: toEmail, subject, plainText: bodyText });
      return info;
    } catch (err: any) {
      this.logger.error(`Failed to send password reset email to ${toEmail}: ${err.message}`, err.stack);
      throw new InternalServerErrorException(`Email delivery failed: ${err.message}`);
    }
  }

  async triggerNewInquiryEmail(name: string, email: string, message: string) {
    const config = await this.getConfig();
    if (!config.newInquiryEnabled) return;
    
    const recipients = await this.getAdminNotificationEmails();
    const vars = { name, email, message };
    const subject = this.replacePlaceholders(config.newInquirySubject || TEMPLATES.newInquirySubject, vars);
    const bodyText = this.replacePlaceholders(config.newInquiryBody || TEMPLATES.newInquiryBody, vars);
    
    for (const toEmail of recipients) {
      await this.sendMail({ to: toEmail, subject, plainText: bodyText });
    }
  }

  async triggerTicketCreatedEmail(tenantName: string, subjectLine: string, priority: string) {
    const config = await this.getConfig();
    if (!config.ticketCreatedEnabled) return;
    const recipients = await this.getAdminNotificationEmails();
    const vars = { tenantName, subject: subjectLine, priority };
    const subject = this.replacePlaceholders(config.ticketCreatedSubject || TEMPLATES.ticketCreatedSubject, vars);
    const bodyText = this.replacePlaceholders(config.ticketCreatedBody || TEMPLATES.ticketCreatedBody, vars);
    for (const toEmail of recipients) {
      await this.sendMail({ to: toEmail, subject, plainText: bodyText });
    }
  }

  async triggerTicketRepliedEmail(toEmail: string, subjectLine: string, message: string) {
    const config = await this.getConfig();
    if (!config.ticketRepliedEnabled) return;
    const vars = { subject: subjectLine, message };
    const subject = this.replacePlaceholders(config.ticketRepliedSubject || TEMPLATES.ticketRepliedSubject, vars);
    const bodyText = this.replacePlaceholders(config.ticketRepliedBody || TEMPLATES.ticketRepliedBody, vars);
    await this.sendMail({ to: toEmail, subject, plainText: bodyText });
  }

  async triggerTicketStatusEmail(toEmail: string, subjectLine: string, status: string) {
    const config = await this.getConfig();
    if (!config.ticketStatusEnabled) return;
    const vars = { subject: subjectLine, status };
    const subject = this.replacePlaceholders(config.ticketStatusSubject || TEMPLATES.ticketStatusSubject, vars);
    const bodyText = this.replacePlaceholders(config.ticketStatusBody || TEMPLATES.ticketStatusBody, vars);
    await this.sendMail({ to: toEmail, subject, plainText: bodyText });
  }

  async triggerTicketAssignedEmail(toEmail: string, adminName: string, tenantName: string, subjectLine: string) {
    const config = await this.getConfig();
    if (!config.ticketAssignedEnabled) return;
    const vars = { adminName, tenantName, subject: subjectLine };
    const subject = this.replacePlaceholders(config.ticketAssignedSubject || TEMPLATES.ticketAssignedSubject, vars);
    const bodyText = this.replacePlaceholders(config.ticketAssignedBody || TEMPLATES.ticketAssignedBody, vars);
    await this.sendMail({ to: toEmail, subject, plainText: bodyText });
  }

  async triggerBroadcastCompletedEmail(toEmail: string, businessName: string, broadcastName: string, totalRecipients: number) {
    const config = await this.getConfig();
    if (!config.broadcastCompletedEnabled) return;
    const timestamp = new Date().toLocaleString();
    const vars = { businessName, broadcastName, totalRecipients: String(totalRecipients), timestamp };
    const subject = this.replacePlaceholders(config.broadcastCompletedSubject || TEMPLATES.broadcastCompletedSubject, vars);
    const bodyText = this.replacePlaceholders(config.broadcastCompletedBody || TEMPLATES.broadcastCompletedBody, vars);
    await this.sendMail({ to: toEmail, subject, plainText: bodyText });
  }

  async triggerPlanCustomizedEmail(toEmail: string, tenantName: string, customDetails: string) {
    const subject = `Your ZiniChat plan limits have been updated for ${tenantName}`;
    const plainText = `Hi ${tenantName},\n\nYour ZiniChat subscription plan limits have been customized by support.\n\nUpdated Limits:\n${customDetails}\n\nLog in to your dashboard to view your updated plan details.\n\nBest regards,\nZiniChat Team`;
    await this.sendMail({ to: toEmail, subject, plainText });
  }

  async triggerVerifyEmail(toEmail: string, userName: string, verifyLink: string) {
    const subject = '📧 ইমেইল ভেরিফাই করুন – ZiniChat';
    const plainText = `প্রিয় ${userName},\n\nআপনার ZiniChat অ্যাকাউন্টের ইমেইল ঠিকানা ভেরিফাই করতে নিচের লিংকে ক্লিক করুন:\n\n${verifyLink}\n\nএই লিংকটি আগামী ২৪ ঘণ্টার জন্য কার্যকর থাকবে।\n\nধন্যবাদ,\nZiniChat টিম`;
    await this.sendMail({ to: toEmail, subject, plainText });
  }

  async triggerStorageWarningEmail(
    toEmail: string,
    tenantName: string,
    percent: number,
    usedMb: string,
    limitMb: string
  ) {
    const config = await this.getConfig();
    const vars = { tenantName, percent: String(percent), usedMb, limitMb };

    if (percent >= 100) {
      if (!config.storageWarning100Enabled) return;
      const subject = this.replacePlaceholders(config.storageWarning100Subject || TEMPLATES.storageWarning100Subject, vars);
      const bodyText = this.replacePlaceholders(config.storageWarning100Body || TEMPLATES.storageWarning100Body, vars);
      await this.sendMail({ to: toEmail, subject, plainText: bodyText });
    } else {
      if (!config.storageWarning80Enabled) return;
      const subject = this.replacePlaceholders(config.storageWarning80Subject || TEMPLATES.storageWarning80Subject, vars);
      const bodyText = this.replacePlaceholders(config.storageWarning80Body || TEMPLATES.storageWarning80Body, vars);
      await this.sendMail({ to: toEmail, subject, plainText: bodyText });
    }
  }

  async triggerMessageWarningEmail(
    toEmail: string,
    tenantName: string,
    percent: number,
    used: number,
    limit: number
  ) {
    const config = await this.getConfig();
    const vars = { tenantName, percent: String(percent), used: String(used), limit: String(limit) };

    if (percent >= 100) {
      if (!config.messageWarning100Enabled) return;
      const subject = this.replacePlaceholders(config.messageWarning100Subject || TEMPLATES.messageWarning100Subject, vars);
      const bodyText = this.replacePlaceholders(config.messageWarning100Body || TEMPLATES.messageWarning100Body, vars);
      await this.sendMail({ to: toEmail, subject, plainText: bodyText });
    } else {
      if (!config.messageWarning80Enabled) return;
      const subject = this.replacePlaceholders(config.messageWarning80Subject || TEMPLATES.messageWarning80Subject, vars);
      const bodyText = this.replacePlaceholders(config.messageWarning80Body || TEMPLATES.messageWarning80Body, vars);
      await this.sendMail({ to: toEmail, subject, plainText: bodyText });
    }
  }

  async triggerAiWarningEmail(
    toEmail: string,
    tenantName: string,
    percent: number,
    used: number,
    limit: number
  ) {
    const config = await this.getConfig();
    const vars = { tenantName, percent: String(percent), used: String(used), limit: String(limit) };

    if (percent >= 100) {
      if (!config.aiWarning100Enabled) return;
      const subject = this.replacePlaceholders(config.aiWarning100Subject || TEMPLATES.aiWarning100Subject, vars);
      const bodyText = this.replacePlaceholders(config.aiWarning100Body || TEMPLATES.aiWarning100Body, vars);
      await this.sendMail({ to: toEmail, subject, plainText: bodyText });
    } else {
      if (!config.aiWarning80Enabled) return;
      const subject = this.replacePlaceholders(config.aiWarning80Subject || TEMPLATES.aiWarning80Subject, vars);
      const bodyText = this.replacePlaceholders(config.aiWarning80Body || TEMPLATES.aiWarning80Body, vars);
      await this.sendMail({ to: toEmail, subject, plainText: bodyText });
    }
  }

  async triggerOtpVerificationEmail(toEmail: string, otpCode: string) {
    const subject = '🔐 আপনার ZiniChat অ্যাকাউন্টের ভেরিফিকেশন কোড';
    const plainText = `প্রিয় গ্রাহক,\n\nZiniChat-এ রেজিস্ট্রেশন করার জন্য আপনাকে ধন্যবাদ। আপনার ৬-ডিজিটের ভেরিফিকেশন কোডটি নিচে দেওয়া হলো:\n\n👉  ${otpCode}  👈\n\nএই কোডটি আগামী ১৫ মিনিটের জন্য কার্যকর থাকবে। নিরাপত্তার স্বার্থে কোডটি কারও সাথে শেয়ার করবেন না।\n\nধন্যবাদ,\nZiniChat টিম`;
    await this.sendMail({ to: toEmail, subject, plainText });
  }
}
