# Zini-Mail: Autonomous AI Cold Email Outreach & High-Intent Retargeting

**Category**: Marketing & Ads  
**Feature Flag**: `ai_email_outreach`  
**Plan Requirement**: Growth, Scale, or Custom Tenant Plan with AI Cold Email Outreach enabled  
**AI Credit Cost**: 1 AI Response Unit per successfully delivered email (Automatic full refund if SMTP fails or email bounces)  

![Zini-Mail Autonomous AI Outreach Guide](/docs/zini-mail-outreach-guide.svg)

---

## 1. Overview & Architecture

**Zini-Mail** is an autonomous, end-to-end B2B cold email outreach and conversion acceleration engine built directly into ZiniChat. Unlike traditional disconnected bulk email tools that risk domain blacklisting and lack commerce context, Zini-Mail bridges discovery, AI visual copywriting, strict reputation protection, and closed-loop revenue attribution.

### Core Capabilities:
1. **Zero Domain Burn Guarantee**: Enforces 1 email per minute throttling with random jitter (+0 to +15 seconds), daily tenant sending caps, and automated bounce rate tripwires (> 8% over 50 emails auto-pauses campaign).
2. **AI Vision Card Extraction**: Upload any product poster or hero banner. Multimodal AI automatically extracts offer terms, headline copy, discount codes, and benefits.
3. **No-Email Phone Harvester**: Scraped B2B leads lacking email addresses are never discarded—they are automatically segregated and prepped for WhatsApp Broadcast Retargeting.
4. **Full-Funnel Commerce Attribution**: Tracks 1x1 pixel opens, wraps links with 30-day attribution cookies, and credits closed orders directly back to campaign revenue.
5. **Precision 1-Click Retargeting**: Instantly isolates prospects who opened or clicked but have not placed an order yet, and routes them into conversational WhatsApp broadcasts with 1 click.

---

## 2. Step 1: Connecting & Verifying Custom SMTP

Before launching campaigns, connect your custom business email domain or Google Workspace account to protect your sender reputation.

### Connecting Google Workspace / Gmail
1. Log into your Google Account and navigate to **Security > 2-Step Verification**.
2. Scroll to **App Passwords** and generate a new app password named `ZiniChat Mail`.
3. In ZiniChat, navigate to **Zini-Mail > Settings & SMTP** (`/dashboard/zini-mail/settings`).
4. Enter your connection settings:
   - **Sender Name**: Your Business or Personal Brand Name (e.g. *Dhaka Craft Studio*)
   - **Sender Email**: Your full email address (e.g. *hello@dhakacraft.com*)
   - **SMTP Host**: `smtp.gmail.com`
   - **SMTP Port**: `587` (TLS) or `465` (SSL)
   - **SMTP Username**: Your full Gmail address
   - **SMTP Password**: The 16-character Google App Password (spaces omitted)
5. Click **Verify & Send Test Email**. ZiniChat performs a real-time SMTP socket handshake and verifies that the mailbox accepts outbound messages.

### Connecting cPanel Webmail / Custom Domain
1. In your hosting cPanel, locate **Email Accounts > Connect Devices**.
2. Note your **Outgoing Server** (e.g. `mail.yourdomain.com`), Port (`465` SSL / `587` TLS), and login credentials.
3. Verify your domain's **SPF** (`v=spf1 include:... ~all`) and **DKIM** records in your DNS editor to ensure 99%+ inbox placement.
4. Paste the credentials into the Zini-Mail SMTP Settings modal and run a verification test.

> [!NOTE]
> ZiniChat enforces a default daily outbound cap (typically 100 to 300 emails/day depending on plan tier) to warm up your domain and maintain spotless sender reputation.

---

## 3. Step 2: Creating an Autonomous Outreach Campaign

To launch a campaign, navigate to **Zini-Mail > Campaigns** (`/dashboard/zini-mail`) and click **+ New Campaign**. The 4-step wizard guides you through setup:

### Step 2.1: Campaign Details & Hero Banner
* **Campaign Title**: An internal reference name (e.g. *Q4 Wholesale Handcrafted Ceramics Outreach*).
* **Target Audience**: Describe your ideal B2B prospect persona (e.g. *Boutique lifestyle and interior decor retail shop owners in Dhaka*).
* **Destination URL**: The target landing page or product catalog URL. All links will be wrapped in smart attribution redirects.
* **Hero Banner / Product Poster**: Upload a JPG/PNG of your promotional flyer.
  - Multimodal AI Vision immediately parses the image and displays a **Visual Card Preview** with extracted headline, pricing, and key value propositions.

### Step 2.2: Lead Discovery & Sourcing
Choose your audience sourcing method:
* **Option A: Automated SERP Search**: Enter target search queries (e.g. *craft retail store dhanmondi*). The built-in Google SerpAPI harvester automatically scrapes business domains, contact emails, and phone numbers.
* **Option B: Manual CSV / Contact Import**: Upload a CSV containing `email`, `phone`, `company`, and `name`.

### Step 2.3: AI Tone, Language & Personalization
Configure the AI Drafter settings:
* **Tone Preset**: Choose from *Professional B2B*, *Friendly & Casual*, *Urgent / Limited Offer*, *Consultative*, *Founder-to-Founder*, or *Custom Tone*.
* **Language**: Select *English*, *Bengali (বাংলা)*, or *Banglish*.
* **Sample Preview**: Click **Generate Sample Draft** to review the AI-composed email subject line and HTML body preview before sending.

### Step 2.4: Safeguards & Credit Allocation
* The wizard displays an **AI Credit Safeguard Engine**:
  - Displays **Available AI Credits** in your account.
  - Calculates **Estimated Leads** and **Required AI Units** (1 unit per email lead).
  - If required credits exceed available balance, an amber alert activates with a 1-click **[ Auto-Adjust to Max Affordable ]** button that instantly downscales target leads to fit your budget.

---

## 4. Step 3: Audience Sourcing & No-Email Phone Harvester

During audience discovery, many local businesses publish telephone numbers or WhatsApp lines but lack public email addresses. Traditional email software deletes these records.

**How Zini-Mail Handles Mixed Leads:**
1. **Valid Email Leads**: Enqueued into the throttled BullMQ email dispatch queue.
2. **Phone-Only Leads**: Filtered with status `bypassed_phone_only`. They never consume email sending quotas or trigger SMTP errors.
3. **1-Click WhatsApp Export**: Phone-only leads are aggregated into an actionable cohort ready for instant routing into the **WhatsApp Broadcast Hub** (`/dashboard/broadcasts`) or CSV export.

---

## 5. Step 4: Outbound Dispatcher & Reputation Armor

Once a campaign is launched, ZiniChat's BullMQ throttled queue processes jobs using an intelligent reputation engine:

| Safeguard Feature | Parameter | Purpose |
| :--- | :--- | :--- |
| **Paced Throttle** | 1 email every 60 seconds | Prevents SMTP rate-limit bans from Google, Outlook, and cPanel |
| **Organic Jitter** | +0 to +15 seconds random delay | Eliminates predictable bot timing signatures |
| **Saga Unit Lock** | Reserved upon enqueue, committed on 250 OK | Zero lost credits; full atomic refund on SMTP handshake failure |
| **Bounce Tripwire** | Auto-pause if bounce rate > 8% over 50 emails | Protects domain from severe spam-trap penalties |
| **Superadmin Kill-Switch** | Global toggle in Platform Settings | Instant queue freeze in case of infrastructure maintenance |

---

## 6. Step 5: Full-Funnel Conversion Attribution

Zini-Mail tracks the complete prospect journey from initial delivery to checkout revenue:

```
[ Cold Email Sent ]
       │
       ▼
[ 1x1 Pixel Open ] ────► Records exact timestamp & open count
       │
       ▼
[ Smart Click Link ] ──► Wraps URL with 30-day cookie & UTM parameters
       │
       ▼
[ Storefront Visit ] ──► Injects attribution context into session
       │
       ▼
[ Checkout / Order ] ──► OrdersService hook atomically links order & revenue to campaign
```

* **42-Byte Transparent GIF Pixel**: Ultra-lightweight open tracking embedded at the foot of every HTML email.
* **Smart URL Redirector**: Replaces raw links with `/track/click/:trackingToken`. When clicked, it sets a 30-day attribution cookie on the browser and redirects the customer to the final catalog URL.
* **Atomic Order Hook**: When an order is created through the storefront checkout, ZiniChat inspects the visitor's attribution cookie. If matched to an active outreach campaign lead, the order and its gross revenue (GMV) are credited directly to the campaign dashboard in real time.

---

## 7. Step 6: Retargeting the "Clicked (No Order Yet)" Audience

The highest-converting audience in any cold outreach campaign is the group of prospects who clicked your link but have not yet purchased.

### Finding High-Intent Clickers:
1. Open any campaign in **Zini-Mail > Campaigns > [Campaign Name]** (`/dashboard/zini-mail/[id]`).
2. Above the Leads table, click the primary highlight pill:  
   **`🔥 Clicked (No Order Yet) [Count]`**
3. The table instantly filters to isolate only prospects who:
   - Successfully opened and clicked your outreach link.
   - Have NOT placed an order yet (`hasOrdered: false`).
   - Converted buyers and cold non-clickers are completely excluded.

### 1-Click Retargeting Actions:
* **📢 Push to WhatsApp Broadcast**: Click **Push to WA Broadcast**. ZiniChat instantly passes all phone numbers from the filtered cohort into `/dashboard/broadcasts` as a pre-populated recipient list with an AI-suggested conversational follow-up template.
* **🏷️ Tag in CRM**: Select **Tag in CRM** to automatically assign the `Warm Lead` tag and move prospects to the **Negotiation** stage on your Leads Kanban board.
* **📥 Export Filtered CSV**: Download a clean CSV file containing names, companies, emails, phone numbers, and engagement timestamps.

---

## 8. Step 7: CAN-SPAM Compliance & Unsubscribe Portal

Zini-Mail adheres strictly to international anti-spam standards (CAN-SPAM, GDPR):

* **Automated Footer Injection**: Every outgoing email automatically includes the merchant's physical business address and an unsubscribe link:  
  `https://yourdomain.com/unsubscribe?token=...`
* **Dedicated Public Opt-Out Portal**: When a recipient clicks unsubscribe, they are taken to a clean, dark glassmorphic unsubscribe page (`/unsubscribe`).
* **Instant Suppression List Sync**: The prospect's email is immediately added to the tenant's `OutreachSuppression` table. Future campaigns automatically skip this address during pre-flight checks.

---

## 9. Step 8: Physical Storage Quota Accounting & Billing

* **Lead Record Metering**: Every prospect stored in your campaigns counts towards your tenant's allocated database storage quota (monitored in the Storage Progress Meter on the Zini-Mail overview dashboard).
* **AI Unit Economics**: Exactly 1 AI unit is billed per successfully delivered email. If an email fails due to a network glitch or invalid mailbox, the unit is immediately and atomically refunded back to your tenant balance.
* **Feature Access**: Zini-Mail is isolated under the `ai_email_outreach` permission key. If not visible in your navigation menu, contact your account administrator or upgrade your package.
