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
