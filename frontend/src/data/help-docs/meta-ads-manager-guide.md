# Meta Ads Manager, AI Diagnostics & Advanced Campaign Creation Manual

## Overview
The **Meta Ads Manager** (`মেটা অ্যাডস ম্যানেজার`) empowers ZiniChat merchants to manage connected Facebook Ad Accounts, monitor live ad performance, run AI-powered campaign telemetry diagnostics, scale daily budgets safely with double confirmation, create full custom campaigns (Ads Manager Pipeline), and boost organic Facebook Page posts in 1 click using native Meta Graph API integration.

---

## 1. Core Feature Pillars

| Feature Pillar | Description | Key Merchant Benefit |
| :--- | :--- | :--- |
| 📊 **Active Campaigns & Scale Hub** | Real-time overview of active campaigns, ad sets, impressions, clicks, CTR, and spend. | Instant status toggle (Active/Paused) and inline daily budget adjustment without opening Meta Ads Manager. |
| 🤖 **AI Campaign Telemetry & Diagnosis** | AI evaluates 7-day impressions, clicks, CTR, CPC, and generates an algorithmic Health Score (0-100) and actionable advice. | Identifies ad fatigue or winning opportunities before wasting ad spend. Costs **1 AI Response Credit**. |
| 🛡️ **2-Step Double Confirmation Scaling** | Prevents blind accidental budget changes. Displays exact current vs. target budget and required quota before execution. | High safety for ad spend. Applying AI recommendation costs **2 AI Response Credits**. |
| 🎯 **Full Ads Manager Campaign Pipeline** | Launch brand new multi-tier campaigns (Campaign Objective -> AdSet with budget/schedule/audience -> Ad Creative with copy/links). | Merchants can run full ads directly from ZiniChat without navigating complex Facebook Ads Manager. |
| ✨ **Boost Existing Page Posts** | Select any photo or status post from the connected Facebook Page and boost it in 1 click. | Preserves 100% of organic likes, comments, and shares using Meta's `object_story_id`. |
| 📱 **Mobile-First Responsive UI** | Compact native card layout, responsive button groups, and horizontal scrolling tabs. | Fast, fluid management from mobile phones and tablets. |

---

## 2. Connecting Your Facebook Ad Account & OAuth Security

1. Navigate to **Dashboard > Settings > Meta Ads Manager** (`/dashboard/settings/meta-ads`).
2. Click the blue **"Connect Account"** (`মেটা অ্যাকাউন্ট কানেক্ট করুন`) button.
3. In the Facebook login pop-up, authorize ZiniChat to access your ad accounts (`ads_management`, `ads_read`).
4. **OAuth Session Preservation**: Sessions use secure `Lax` cookies so returning from `facebook.com` will never log you out of your ZiniChat tenant account.
5. Upon redirection, your ad accounts, balance, currency, and connected Facebook Page will be displayed automatically.

---

## 3. AI Campaign Telemetry Diagnosis & 2-Step Smart Scaling

### Step A: Running AI Diagnostics (1 AI Credit)
1. In the **Active Campaigns & Scale Hub** tab, locate your campaign.
2. Click the **"AI Diagnose"** (`এআই অ্যানালিসিস`) button with the `1 AI` badge.
3. The system checks your AI Response Quota pool and deducts 1 unit.
4. An interactive modal appears showing:
   - **Campaign Health Score** (e.g. 94/100 for high efficiency, 52/100 for ad fatigue).
   - **7-Day Telemetry Grid**: Impressions, Clicks, Spend, CTR, CPC.
   - **AI Diagnostic Evaluation**: Clear natural language diagnosis in Bengali or English.
   - **Recommended Optimization**: Suggested scaling percentage or audience expansion.

### Step B: 2-Step Confirmation & Applying Recommendation (2 AI Credits)
1. Click **"Apply AI Optimization (2 AI Credits)"** inside the diagnostic modal, or click any scale chip (`+20%`, `+50%`, `-10%`, `-20%`).
2. A **Confirmation Popup** appears displaying:
   - Target Campaign Name
   - Exact Budget Change (e.g., $10 ➔ $12 (+20%)) or Audience updates
   - Quota Warning: `⚠️ Executing this optimization will deduct 2 AI Response Credits from your quota.`
3. Click **"Confirm & Apply on Meta"** (`নিশ্চিত করুন ও মেটাতে অ্যাপ্লাই করুন`).
4. Changes are deployed instantly to Meta Graph API, and 2 AI Response units are logged.

---

## 4. Advanced Custom Campaign Creation (Ads Manager Flow)

1. Switch to the **Create Campaign (Ads Manager)** (`নতুন ক্যাম্পেইন (অ্যাড ম্যানেজার)`) tab.
2. **Step 1: Campaign Objective & Name**:
   - Choose your objective: `Engagement` (`OUTCOME_ENGAGEMENT`), `Traffic` (`OUTCOME_TRAFFIC`), `Leads` (`OUTCOME_LEADS`), or `Sales` (`OUTCOME_SALES`).
   - Enter your Campaign Name.
3. **Step 2: AdSet Budget, Schedule & Audience Targeting**:
   - Set daily budget (quick chips: $5, $10, $25, $50, $100).
   - Adjust campaign duration slider (1 to 60 days).
   - Specify target countries (e.g., `BD, US, CA`), age range (`18-65`), and gender (`All`, `Men`, `Women`).
4. **Step 3: Ad Creative & Copy**:
   - Enter your **Ad Headline**.
   - Write your **Primary Text** (ad copy/sales pitch).
   - Enter your **Destination Website URL**.
   - Provide an optional **Banner Image URL** (preview appears in real time).
5. Click **"Launch Campaign on Meta Now"** (`এখনই মেটাতে ক্যাম্পেইন চালু করুন`). The system creates Campaign ➔ AdSet ➔ AdCreative ➔ Ad atomically on Meta.

---

## 5. Boosting an Existing Facebook Page Post

1. Switch to the **Boost Page Post** (`পেইজ পোস্ট বুস্টিং`) tab.
2. The system automatically fetches recent posts published on your connected Facebook Page.
3. Click **"Boost This Post"** (`এই পোস্টটি বুস্ট করুন`) on your desired post.
4. Set your:
   - **Daily Budget** (e.g., ৳500 or $5)
   - **Duration** (1 to 30 days)
   - **Audience Target** (Country, Age range, Gender)
5. Click **"Launch Ad on Meta Now"** (`এখনই মেটাতে বিজ্ঞাপন লাইভ করুন`). The ad goes live immediately on Meta.
