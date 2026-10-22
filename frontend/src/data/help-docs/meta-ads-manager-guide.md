# Meta Ads Manager, AI Diagnostics & Advanced Campaign Creation Manual

## Overview
The **Meta Ads Manager** (`মেটা অ্যাডস ম্যানেজার`) empowers ZiniChat merchants to manage connected Facebook Ad Accounts, monitor live ad performance, run AI-powered campaign telemetry diagnostics, scale daily budgets safely with double confirmation, create full custom campaigns (Ads Manager Pipeline), and boost organic Facebook Page posts in 1 click using native Meta Graph API integration.

---

## 1. Core Feature Pillars

| Feature Pillar | Description | Key Merchant Benefit |
| :--- | :--- | :--- |
| 📊 **Active Campaigns & Scale Hub** | Real-time overview of active campaigns, ad sets, impressions, clicks, CTR, and spend with live Meta status sync. | Instant high-contrast status toggle (Active/Paused), search bar, status filter pills, and inline daily budget adjustment. |
| 📝 **Direct Campaign & Ad Set Editor** | Modify campaign name, delivery status, daily budget, and ad set audience targeting (countries, age min/max, gender, interests) directly. | Complete campaign editing without leaving ZiniChat dashboard. |
| 🤖 **Multi-Dimensional AI Diagnosis** | AI evaluates telemetry and generates holistic suggestions covering Targeting, Creatives & Hooks, Placements, and Budget. | Actionable diagnostic roadmap. Applying changes requires 2-step confirmation popup. Costs **1 AI Credit**. |
| 🎯 **AI Audience Re-Targeting Assistant** | Formulates refined audience criteria (niche interests, age, gender, geo) to eliminate unqualified lead and messaging traffic. | Solves low-intent or irrelevant customer inquiries. Costs **1 AI Credit**. |
| ⚙️ **Granular Manual Placements** | Interactive placement controls for Facebook Feeds, Stories, Reels, Instagram, Messenger, and Audience Network with 1-click presets. | Precise placement targeting tailored to campaign objectives. |
| 🖼️ **Multi-Creative Existing Post Selection** | Select multiple published page posts simultaneously to generate multiple distinct ad creative units under the same ad set. | Fast creative split-testing on Meta without manual post duplication. |
| 🛡️ **2-Step Double Confirmation Scaling** | Prevents blind accidental budget changes. Displays exact current vs. target budget and required quota before execution. | High safety for ad spend. Applying AI recommendation costs **2 AI Response Credits**. |
| ✨ **Zero Storage Quota Page Post Boosting** | Select any photo or status post from the connected Facebook Page and boost it in 1 click using Meta CDN. | Preserves 100% of organic likes and consumes **0 bytes** of ZiniChat tenant storage quota. |
| 📱 **Mobile-First Responsive UI** | Compact native card layout, touch momentum, and bottom-sheet style scrollable modals (`max-h-[90vh]`). | Fast, fluid management from mobile phones and tablets. |

---

## 2. Connecting Your Facebook Ad Account & OAuth Security

1. Navigate to **Dashboard > Settings > Meta Ads Manager** (`/dashboard/settings/meta-ads`).
2. Click the blue **"Connect Account"** (`মেটা অ্যাকাউন্ট কানেক্ট করুন`) button.
3. In the Facebook login pop-up, authorize ZiniChat to access your ad accounts (`ads_management`, `ads_read`).
4. **OAuth Session Preservation**: Sessions use secure `Lax` cookies so returning from `facebook.com` will never log you out of your ZiniChat tenant account.
5. Upon redirection, your ad accounts, balance, currency, and connected Facebook Page will be displayed automatically.

---

## 3. Active Campaigns Hub, Status Sync & Direct Editing

### Real-Time Meta Status Sync & High-Contrast Toggles
- Campaigns display real-time Meta delivery status via `effective_status` (Active, Paused, In Review, Completed).
- Click the **"Sync Meta Status"** (`মেটা স্ট্যাটাস সিঙ্ক`) button at any time to instantly pull the latest delivery state from Meta Ads Manager.
- Use the tactile toggle switch to pause or activate any campaign immediately.
- Filter campaigns instantly using the search bar or filter pills (`All`, `Active`, `Paused`).

### Direct Campaign & Audience Editing
1. Click the **"Edit"** (`এডিট`) button on any active campaign card or table row.
2. An interactive modal opens pre-populated with existing ad set data from Meta:
   - **Campaign Name & Status**
   - **Daily Budget ($)**
   - **Target Countries** (comma-separated ISO codes, e.g. `BD, US`)
   - **Age Range** (e.g. 21 to 55)
   - **Gender Targeting** (All, Men, or Women)
   - **Detailed Interests** (comma-separated consumer interests)
3. Click **"Save Changes to Meta"** (`মেটায় সেভ করুন`) to push updates directly to Meta Graph API.

---

## 4. Multi-Dimensional AI Campaign Diagnostics & 2-Step Smart Scaling

### Step A: Running Multi-Dimensional Diagnostics (1 AI Credit)
1. In the **Active Campaigns & Scale Hub** tab, locate your campaign.
2. Click the **"AI Diagnose"** (`এআই অ্যানালিসিস`) button with the `1 AI` badge.
3. The system deducts strictly **1 AI Response Credit** from your independent AI pool.
4. An interactive modal appears showing:
   - **Campaign Health Score** (0–100 scale).
   - **7-Day Telemetry & Conversion Events**: Impressions, Clicks, Spend, CTR, CPC, Messages Started, Leads, Purchases.
   - **Targeting Optimization**: Geo, age, and demographic suggestions.
   - **Creative & Hook Optimization**: Ad copy angles and visual fatigue recommendations.
   - **Placement Optimization**: Feed vs. Stories & Reels performance advice.
   - **Actionable Optimization Roadmap**: Clear recommendations with 1-click apply buttons.

### Step B: 2-Step Double Confirmation
1. Click any optimization CTA (e.g., "Apply Recommended Budget", "Apply Recommended Targeting", or scaling chips `+20%`, `+50%`, `-10%`, `-20%`).
2. A required **Confirmation Popup** appears displaying:
   - Target Campaign Name
   - Exact Parameters changing (e.g. Budget change or Audience criteria)
   - Quota Warning: `⚠️ Executing this optimization will deduct 2 AI Response Credits from your quota.`
3. Click **"Confirm & Apply on Meta"** (`নিশ্চিত করুন ও মেটাতে অ্যাপ্লাই করুন`).
4. Changes are deployed instantly to Meta Graph API.

---

## 5. AI Audience Re-Targeting Assistant (Fixing Unqualified Traffic)

When an active campaign is receiving unqualified messages or non-buying leads:
1. Click the purple **"AI Re-target (1 AI)"** (`টার্গেটিং রি-ডিজাইন`) button on the campaign.
2. Describe:
   - Who is currently messaging you (e.g., *"Students with zero budget asking irrelevant questions"*).
   - Who your ideal paying buyer is (e.g., *"Working professionals aged 25-45 looking for premium organic skincare"*).
3. Click **"Generate Refined Audience (1 AI Credit)"**.
4. The AI analyzes your problem and returns:
   - **Diagnostic Insight**: Why current targeting attracted the wrong audience.
   - **Refined Targeting Parameters**: Precise age bracket, target countries, gender, and focused interests.
   - **Creative Angle Suggestions**: How to update ad copy to pre-qualify customers before they message.
5. Click **"Apply Refined Audience to Campaign"** to open the 2-step confirmation modal and deploy to Meta.

---

## 6. Advanced Custom Campaign Creation (3-Tier Ads Manager Pipeline)

### Level 1: Campaign Setup & Objectives
- Choose from 5 core Meta marketing objectives (`OUTCOME_SALES`, `OUTCOME_LEADS`, `OUTCOME_TRAFFIC`, `OUTCOME_ENGAGEMENT`, `OUTCOME_AWARENESS`).
- Select compliance declarations for special ad categories if applicable.

### Level 2: AdSet Budget, Schedule, Audience & Manual Placements
- **Budget & Schedule**: Quick selection chips or custom budget with duration slider (1 to 60 days).
- **Targeting**: Countries, age range (18–65+), gender, and detailed interests.
- **Granular Manual Placements**: Toggle between Advantage+ Automatic Placements and Granular Manual Placements:
  - Checkboxes for Facebook Feed, Instagram Feed, Marketplace, Video Feeds, Stories, Reels, Messenger Inbox, and Audience Network.
  - 1-Click Presets: `Select All`, `Feeds Only`, and `Stories & Reels`.

### Level 3: Ad Creative, Multi-Post Selection & Dynamic Copy
Merchants can choose between two creative strategies:
1. **📸 Upload New Media & Dynamic Copy**:
   - **Multi-Option Primary Texts**: Add up to 5 primary text variations (`+ Add Text Option`).
   - **Multi-Option Headlines**: Add up to 3 catchy headlines (`+ Add Headline`).
   - **Feed Description & CTA**: Custom description and action button.
   - **Destination Link & Image URL**: Direct product or landing page links.
2. **📄 Boost Existing Facebook Page Posts (Single or Multiple)**:
   - Click "Existing Page Post" to browse published posts from your connected Facebook Page.
   - **Multi-Post Creative Selection**: Select multiple posts simultaneously with `✓ Creative #X` badges. Meta will create separate ad creative units under the same ad set for native split-testing.
   - Preserves 100% of organic likes, comments, and shares using Meta's `object_story_id`.

---

## 7. AI Pre-Flight Ad & Copy Analyzer (1 AI Credit)

Before spending ad budget on new ads, click **"AI Pre-Flight Ad Analyzer"**:
- Evaluates Hook Strength, Clarity, Offer Appeal, and Meta Policy Compliance.
- Generates 3 high-converting copy variations with 1-click **"Apply to Form"** (`ফর্মে ব্যবহার করুন`) buttons.
- Deducts strictly **1 AI Response Credit** from your independent AI quota pool (Rule 4).

---

## 8. Meta Pixel Conversion Tracking Integration

Merchants can connect website conversions directly to any discovered Meta Pixel:
- Toggle **"Track Website Conversions with Meta Pixel"** (`মেটা পিক্সেল দিয়ে কনভার্সন ট্র্যাক করুন`).
- Select from auto-discovered Pixels connected to your ad account.
- ZiniChat automatically attaches `tracking_specs` with `action.type: ['offsite_conversion']` and your `fb_pixel` ID to the Meta Ad payload.

---

## 9. Boosting an Existing Facebook Page Post (Quick Flow & Zero Storage Quota)

1. Switch to the **Boost Page Post** (`পেইজ পোস্ট বুস্টিং`) tab.
2. **Zero Storage Consumption**: Posts stream directly from Meta's CDN (`graph.facebook.com` / `fbcdn.net`) and consume **0 bytes** of your ZiniChat tenant storage quota.
3. Click **"Boost This Post"** (`এই পোস্টটি বুস্ট করুন`) on your desired post.
4. Set Daily Budget, Duration, and Target Audience.
5. Click **"Launch Ad on Meta Now"** (`এখনই মেটাতে বিজ্ঞাপন লাইভ করুন`). The ad goes live immediately on Meta.
