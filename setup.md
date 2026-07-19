# ZiniChat PC Setup Instructions

অফিসের বা নতুন কোনো পিসিতে কাজ শুরু করার জন্য নিচের স্টেপগুলো সিরিয়ালি ফলো করুন:

### Step 1: কোড আপডেট করা
প্রজেক্ট ওপেন করে টার্মিনালে রান করুন:
```bash
git pull origin main
```

### Step 2: Backend সেটআপ
১. টার্মিনালে `cd backend` লিখে ব্যাকএন্ড ফোল্ডারে যান।
২. `npm install` রান করুন।
৩. `backend` ফোল্ডারের ভেতরে থাকা `.env.example` ফাইলটির নাম পালটে শুধু `.env` রাখুন।
৪. `.env` ফাইলে `DATABASE_URL` এবং `DIRECT_URL` এর জায়গায় ক্লাউডের এই লাইন দুটো বসিয়ে সেভ করুন:
```
DATABASE_URL="postgresql://postgres.rpjjpzsdqeosoglnktlr:hD8DB1zg3gIE23sV@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"
DIRECT_URL="postgresql://postgres.rpjjpzsdqeosoglnktlr:hD8DB1zg3gIE23sV@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"
```
৫. এরপর রান করুন:
```bash
npx prisma generate
```
(এতে আপনার লোকাল কোডের সাথে ডাটাবেস লিংক হয়ে যাবে)।

### Step 3: Frontend সেটআপ
১. টার্মিনালে `cd ../frontend` লিখে ফ্রন্টএন্ড ফোল্ডারে যান।
২. `npm install` রান করুন।
৩. `frontend/.env.local.example` ফাইলটির নাম পালটে `.env.local` রাখুন।

### Step 4: Redis চালু করা
পিসিতে যদি Redis ইন্সটল করা থাকে, তবে মেক শিওর করবেন যে সেটা রানিং আছে। (উইন্ডোজে WSL বা Docker-এর মাধ্যমে Redis রান করতে পারেন)।

### Step 5: প্রজেক্ট রান করা
সবশেষে দুইটা আলাদা টার্মিনাল ওপেন করে রান করুন:
- ব্যাকএন্ড টার্মিনালে (backend ফোল্ডারের ভেতর): `npm run start:dev`
- ফ্রন্টএন্ড টার্মিনালে (frontend ফোল্ডারের ভেতর): `npm run dev`
