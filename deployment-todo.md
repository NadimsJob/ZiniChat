# MCP CI/CD Deployment TODO List

এই ফাইলটি MCP Server ব্যবহার করে Test এবং Live সার্ভারে অটোমেটিক ডেপ্লয়মেন্ট সেটআপ করার একটি চেকলিস্ট। কাজগুলো এই লিস্ট অনুযায়ী সিরিয়ালি করা হবে।

## 📋 Task Checklist

- [ ] **Step 1: Environment Variables সেটআপ করা**
  - [ ] লোকাল `.env` ফাইলে `VPS_HOST`, `VPS_USERNAME`, `VPS_PASSWORD` ভ্যারিয়েবলগুলো অ্যাড করা (বাসা এবং অফিসের পিসিতে)।

- [ ] **Step 2: কাস্টম MCP Server স্ক্রিপ্ট তৈরি করা**
  - [ ] `scripts/mcp-deploy-server.js` ফাইল তৈরি করা।
  - [ ] Node.js এর জন্য প্রয়োজনীয় প্যাকেজ (যেমন `node-ssh` বা `@modelcontextprotocol/sdk`) ইন্সটল বা কনফিগার করা।
  - [ ] `deploy_test_server` টুল তৈরি করা (যা SSH করে `zinichat-test` ফোল্ডারে `git pull` এবং `docker compose up -d` করবে)।
  - [ ] `deploy_live_server` টুল তৈরি করা (যা SSH করে `zinichat-live` ফোল্ডারে `git pull` এবং `docker compose up -d` করবে)।

- [ ] **Step 3: MCP Config আপডেট করা**
  - [ ] প্রোজেক্টের `mcp-config.json` ফাইলে নতুন `deploy-server` অ্যাড করা যাতে Antigravity IDE টুলগুলো চিনে নিতে পারে।

- [ ] **Step 4: গিটহাবে পুশ করা**
  - [ ] নতুন স্ক্রিপ্ট এবং আপডেটগুলো `main` ব্রাঞ্চে পুশ করা, যাতে অফিসের পিসিতেও টুলগুলো কাজ করে।

- [ ] **Step 5: টেস্টিং (Verification)**
  - [ ] এআই-কে কমান্ড দিয়ে টেস্ট সার্ভারে ডেপ্লয় করে দেখা সবকিছু ঠিকঠাক কাজ করছে কিনা।

---

## 🔵 Meta Developer Portal Action Items (Facebook Comment Automation)

- [ ] **1. Webhook Field Subscriptions**
  - Meta Developer Portal -> App Setup -> **Messenger / Webhooks**
  - Webhook Subscriptions এ **`feed`** ফিল্ডে টিক চিহ্ন দিন এবং সাবস্ক্রাইব করুন।

- [ ] **2. Meta App Review Submission (Permissions)**
  - Meta Developer Portal -> **App Review -> Permissions and Features**
  - নিচের ২টি পারমিশন রিকোয়েস্ট করুন এবং Advanced Access-এর জন্য সাবমিট করুন:
    1. **`pages_read_engagement`**: ফেসবুক পোস্টের কমেন্ট ও ফিড ইভেন্ট পড়ার অনুমতি।
    2. **`pages_manage_engagement`**: ফেসবুক পোস্টের কমেন্টে পাবলিক রিপ্লাই দেওয়া ও লাইক/হাইড করার অনুমতি।
  - **Screencast & Use Case Video**: স্ক্রিনকাস্ট ভিডিও রেকর্ড করে জাস্টিফিকেশন সহ সাবমিট করুন (কীভাবে ZiniChat কাস্টমার সাপোর্টের জন্য কমেন্টে উত্তর দেয়)।

- [ ] **3. Existing Connected Pages Re-Authentication**
  - পূর্বে কানেক্ট করা পেজগুলোর টোকেনে `pages_manage_engagement` পারমিশন যোগ করার জন্য ড্যাশবোর্ড থেকে পেজগুলো **Reconnect** করান।
