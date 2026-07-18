import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as nodemailer from 'nodemailer';

// ─── Default Email Templates ──────────────────────────────────────────────────
const TEMPLATES = {
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
};

// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class SmtpService {
  private readonly logger = new Logger(SmtpService.name);

  constructor(private prisma: PrismaService) {}

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
          welcomeSubject: 'Welcome to ZiniChat! 🎉',
          welcomeBody: '<h1>Welcome!</h1><p>Thank you for signing up to ZiniChat.</p>',
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
      if (!config.welcomeSubject) { updates.welcomeSubject = 'Welcome to ZiniChat! 🎉'; updates.welcomeBody = `প্রিয় {{tenantName}},\n\nZiniChat প্ল্যাটফর্মে আপনাকে স্বাগতম! আপনার অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে।\n\nএখনই আপনার ড্যাশবোর্ডে লগইন করে আপনার কাস্টমারদের সাথে যুক্ত হওয়া শুরু করুন।`; needsUpdate = true; }
      if (!config.agentCreatedSubject) { updates.agentCreatedSubject = TEMPLATES.agentCreatedSubject; updates.agentCreatedBody = TEMPLATES.agentCreatedBody; needsUpdate = true; }
      if (!config.passwordResetSubject) { updates.passwordResetSubject = TEMPLATES.passwordResetSubject; updates.passwordResetBody = TEMPLATES.passwordResetBody; needsUpdate = true; }
      if (!config.newInquirySubject) { updates.newInquirySubject = TEMPLATES.newInquirySubject; updates.newInquiryBody = TEMPLATES.newInquiryBody; needsUpdate = true; }
      if (!config.ticketCreatedSubject) { updates.ticketCreatedSubject = TEMPLATES.ticketCreatedSubject; updates.ticketCreatedBody = TEMPLATES.ticketCreatedBody; needsUpdate = true; }
      if (!config.ticketRepliedSubject) { updates.ticketRepliedSubject = TEMPLATES.ticketRepliedSubject; updates.ticketRepliedBody = TEMPLATES.ticketRepliedBody; needsUpdate = true; }
      if (!config.ticketStatusSubject) { updates.ticketStatusSubject = TEMPLATES.ticketStatusSubject; updates.ticketStatusBody = TEMPLATES.ticketStatusBody; needsUpdate = true; }
      if (!config.ticketAssignedSubject) { updates.ticketAssignedSubject = TEMPLATES.ticketAssignedSubject; updates.ticketAssignedBody = TEMPLATES.ticketAssignedBody; needsUpdate = true; }

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
      }
    });
  }

  async createTransporter(config: any) {
    return nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.username && config.password ? {
        user: config.username,
        pass: config.password
      } : undefined
    });
  }

  private generateMasterHtml(rawText: string, config: any): string {
    // Convert newlines to breaks and simple links
    const formattedText = rawText
      .replace(/\n/g, '<br/>')
      .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" style="color:#3b82f6;text-decoration:none;">$1</a>');

    const platformUrl = process.env.NEXT_PUBLIC_API_URL 
      ? process.env.NEXT_PUBLIC_API_URL.replace(':3001', ':3000') 
      : 'https://zinichat.com';

    const logoUrl = `${platformUrl}/logo.png`;

    return `
<div style="font-family:'Inter', sans-serif; background-color:#f4f4f5; padding:40px 20px; min-height:100vh;">
  <div style="max-width:550px; margin:0 auto; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border: 1px solid #e4e4e7;">
    
    <!-- Header with Logo -->
    <div style="padding:32px 32px 24px; text-align:center; border-bottom:1px solid #f4f4f5; background: linear-gradient(to right, #ffffff, #fafafa);">
      <img src="${logoUrl}" alt="ZiniChat" style="height:48px; width:auto; margin:0 auto;" />
    </div>
    
    <!-- Body Content -->
    <div style="padding:32px; color:#3f3f46; font-size:15px; line-height:1.7;">
      ${formattedText}
    </div>
    
    <!-- Footer -->
    <div style="padding:24px 32px; text-align:center; background-color:#fafafa; border-top:1px solid #f4f4f5; color:#71717a; font-size:12px; line-height:1.6;">
      <p style="margin:0;">এই ইমেইলটি স্বয়ংক্রিয়ভাবে পাঠানো হয়েছে। অনুগ্রহ করে রিপ্লাই করবেন না।</p>
      <p style="margin:8px 0 0;">
        <strong>ZiniChat Platform</strong><br/>
        <a href="${platformUrl}" style="color:#71717a; text-decoration:none;">www.zinichat.com</a> • support@zinichat.com
      </p>
    </div>
  </div>
</div>`;
  }

  async sendMail({ to, subject, html, plainText }: { to: string; subject: string; html?: string; plainText?: string }) {
    try {
      const config = await this.getConfig();
      if (!config.host || !config.fromEmail) {
        this.logger.warn('SMTP is not fully configured. Skipping mail dispatch.');
        return;
      }
      const transporter = await this.createTransporter(config);
      
      const finalHtml = plainText ? this.generateMasterHtml(plainText, config) : html;

      const info = await transporter.sendMail({
        from: `"${config.fromName || 'ZiniChat'}" <${config.fromEmail}>`,
        to,
        subject,
        html: finalHtml
      });
      this.logger.log(`Email sent: ${info.messageId}`);
      return info;
    } catch (err) {
      this.logger.error('Failed to send email:', err);
    }
  }

  private replacePlaceholders(template: string, vars: Record<string, string>): string {
    return Object.entries(vars).reduce(
      (t, [k, v]) => t.replace(new RegExp(`{{${k}}}`, 'g'), v ?? ''),
      template
    );
  }

  async sendTestMail(to: string) {
    return this.sendMail({
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

  async triggerPaymentPendingAdminEmail(tenantName: string, amount: string, trxId: string) {
    const config = await this.getConfig();
    if (!config.paymentPendingAdminEnabled) return;
    const admins = await this.prisma.user.findMany({ where: { role: 'superadmin' } });
    const vars = { tenantName, amount, trxId };
    const subject = this.replacePlaceholders(config.paymentPendingAdminSubject || TEMPLATES.paymentPendingAdminSubject, vars);
    const bodyText = this.replacePlaceholders(config.paymentPendingAdminBody || TEMPLATES.paymentPendingAdminBody, vars);
    for (const admin of admins) {
      await this.sendMail({ to: admin.email, subject, plainText: bodyText });
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
    if (!config.passwordResetEnabled) return;
    const vars = { userName, email: toEmail, resetLink };
    const subject = this.replacePlaceholders(config.passwordResetSubject || TEMPLATES.passwordResetSubject, vars);
    const bodyText = this.replacePlaceholders(config.passwordResetBody || TEMPLATES.passwordResetBody, vars);
    await this.sendMail({ to: toEmail, subject, plainText: bodyText });
  }

  async triggerNewInquiryEmail(name: string, email: string, message: string) {
    const config = await this.getConfig();
    if (!config.newInquiryEnabled) return;
    
    const admins = await this.prisma.user.findMany({ where: { role: 'superadmin' } });
    const vars = { name, email, message };
    const subject = this.replacePlaceholders(config.newInquirySubject || TEMPLATES.newInquirySubject, vars);
    const bodyText = this.replacePlaceholders(config.newInquiryBody || TEMPLATES.newInquiryBody, vars);
    
    for (const admin of admins) {
      await this.sendMail({ to: admin.email, subject, plainText: bodyText });
    }
  }

  async triggerTicketCreatedEmail(tenantName: string, subjectLine: string, priority: string) {
    const config = await this.getConfig();
    if (!config.ticketCreatedEnabled) return;
    const admins = await this.prisma.user.findMany({ where: { role: 'superadmin' } });
    const vars = { tenantName, subject: subjectLine, priority };
    const subject = this.replacePlaceholders(config.ticketCreatedSubject || TEMPLATES.ticketCreatedSubject, vars);
    const bodyText = this.replacePlaceholders(config.ticketCreatedBody || TEMPLATES.ticketCreatedBody, vars);
    for (const admin of admins) {
      await this.sendMail({ to: admin.email, subject, plainText: bodyText });
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
}
