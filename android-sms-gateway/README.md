# Android MFS & Bank SMS Gateway App

এটি একটি লাইটওয়েট নেটিভ অ্যান্ড্রয়েড অ্যাপ্লিকেশন যা ব্যাকগ্রাউন্ডে ইনকামিং পেমেন্ট সংক্রান্ত এসএমএস মনিটর করে এবং তা রিয়েল-টাইমে আপনার ZiniChat ব্যাকএন্ড সার্ভারে পোস্ট করে।

---

## ১. কিভাবে কাজ করে?
1. **SMS Receiver (`SmsReceiver.kt`):** অ্যান্ড্রয়েড যখনই কোনো নতুন এসএমএস রিসিভ করে, এই রিসিভারটি ট্রিগার হয়।
2. **Local Filter & Regex Parser:** রিসিভারটি মেসেজ প্রেরক (যেমন: `bKash`, `16247`, `NAGAD`, `16167`, `CityBank`, `BRACBANK` ইত্যাদি) চেক করে। অফিশিয়াল এসএমএস হলে তা থেকে TrxID/Trace No এবং অ্যামাউন্ট এক্সট্র্যাক্ট করে।
3. **HTTP Webhook Sync:** এক্সট্র্যাক্ট করা ডেটা সিকিউর হেডার টোকেন `X-SMS-GATEWAY-API-KEY` সহ আপনার ব্যাকএন্ড এপিআইতে (`/mfs-payments/sms-webhook`) পোস্ট করে।

---

## ২. প্রজেক্ট সেটআপ গাইডলাইন (Android Studio)
1. **Android Studio** ওপেন করে **New Project** -> **Empty Views Activity** সিলেক্ট করুন।
2. প্রজেক্টের ল্যাঙ্গুয়েজ **Kotlin** এবং Minimum SDK **API 26: Android 8.0 (Oreo)** সিলেক্ট করুন।
3. নিচের সোর্স ফাইলগুলো আপনার প্রজেক্টের ডিরেক্টরিতে যথাস্থানে কপি করুন:
   * `AndroidManifest.xml` -> `app/src/main/AndroidManifest.xml` (ওভাররাইট করুন)
   * `MainActivity.kt` -> `app/src/main/java/com/example/smsgateway/MainActivity.kt`
   * `SmsReceiver.kt` -> `app/src/main/java/com/example/smsgateway/SmsReceiver.kt`
   * `SmsGatewayService.kt` -> `app/src/main/java/com/example/smsgateway/SmsGatewayService.kt`

---

## ৩. অ্যাপ কনফিগারেশন ও রান
1. অ্যাপটি মোবাইলে ইনস্টল করার পর প্রথমবার চালু করলে **SMS Permissions** চাইবে, তা এপ্রুভ করুন।
2. অ্যাপের হোম স্ক্রিনে দুটি ইনপুট ফিল্ড পাবেন:
   * **ZiniChat Backend URL:** আপনার ব্যাকএন্ড সার্ভার এপিআই এর রুট ইউআরএল (যেমন: `https://api.zinichat.com/mfs-payments/sms-webhook`)।
   * **API Gateway Key:** সুপারঅ্যাডমিন প্যানেলে প্রদর্শিত সিক্রেট টোকেন (default: `sms-gateway-secret-token`)।
3. **"Start Background Sync"** বোতামে চাপ দিন। অ্যাপটি এখন ব্যাকগ্রাউন্ডে মিনিমাইজ বা লকড অবস্থায় থাকলেও এসএমএস রিড করতে পারবে।
