# Mahbub BCS Guideline — শুরু করার নির্দেশিকা

এটি একটি PWA starter project। Android Chrome থেকে ইনস্টল করা যায়। এতে নমুনা প্রশ্ন, টাইমার, উত্তর পর্যালোচনা ও Supabase-ভিত্তিক অ্যাকাউন্ট/ফলাফল সংরক্ষণের সংযোগের কাঠামো আছে।

## ১) আগে যা লাগবে
- একটি Supabase project
- একটি GitHub repository
- Vercel account (অথবা অন্য HTTPS static hosting)

## ২) Supabase সেটআপ
1. Supabase-এ নতুন project তৈরি করুন।
2. Project Settings → API থেকে Project URL এবং `anon`/publishable key নিন।
3. `config.js` ফাইলে `YOUR_SUPABASE_PROJECT_URL` ও `YOUR_SUPABASE_ANON_KEY`-এর জায়গায় মান বসান। `service_role` key কখনোই এখানে দেবেন না।
4. Supabase → SQL Editor-এ `supabase-schema.sql`-এর SQL চালান।
5. Authentication → URL Configuration-এ আপনার Vercel domain-কে Site URL ও Redirect URL-এ যুক্ত করুন।
6. Authentication-এর Email confirmation চালু রাখুন। ইমেইল নিশ্চিতকরণ ছাড়া অ্যাকাউন্টে লগইন সম্ভব নাও হতে পারে।

## ৩) অনলাইনে প্রকাশ (Vercel)
1. পুরো project GitHub repository-তে upload করুন।
2. Vercel-এ GitHub দিয়ে sign in করে Add New → Project নির্বাচন করুন।
3. repository import করে Framework Preset: Other / Static নির্বাচন করুন।
4. Build command ফাঁকা রাখুন; Output Directory `.` দিন।
5. Deploy চাপুন। Vercel একটি HTTPS address দেবে।
6. Supabase Authentication URL Configuration-এ সেই address যোগ করুন।

## ৪) Android ফোনে ইনস্টল
1. ফোনে Chrome খুলে Vercel-এর HTTPS link খুলুন।
2. Chrome-এর তিন ডট মেনু → Install app অথবা Add to Home screen চাপুন।
3. Install/ Add চাপুন। হোম স্ক্রিনে অ্যাপের আইকন আসবে।
4. অন্যদের একই link পাঠান; তারাও একইভাবে ইনস্টল করতে পারবে।

## ৫) এখনকার সীমাবদ্ধতা — প্রকাশের আগে পড়ুন
- বর্তমান প্রশ্নগুলো কেবল নমুনা; এগুলো যাচাইকৃত বিগত বছরের প্রশ্নের পূর্ণাঙ্গ ডেটাবেস নয়।
- এই starter-এ পরীক্ষার প্রশ্ন browser-এর JavaScript ফাইলে রাখা। উচ্চ-নিরাপত্তার পরীক্ষার জন্য প্রশ্ন/উত্তর server-side-এ রাখতে হবে।
- Supabase সংযোগ না দিলে রেজিস্ট্রেশন ও ক্লাউডে ফলাফল সংরক্ষণ কাজ করবে না। এটি তখন শুধু UI/নমুনা পরীক্ষা।
- ফলাফল insert হয়, কিন্তু পূর্ণাঙ্গ admin panel, question management, subscription/payment, abuse protection, audit logs ও backup এখনো তৈরি হয়নি।
- Supabase-এর `anon`/publishable key browser-এ ব্যবহার করা স্বাভাবিক; `service_role` key কখনো frontend বা GitHub-এ প্রকাশ করবেন না।
- বাস্তব ব্যবহারকারীর ইমেইল/তথ্য নেওয়ার আগে Privacy Policy, Terms, support contact এবং তথ্য মুছে ফেলার প্রক্রিয়া তৈরি করুন। অপ্রাপ্তবয়স্ক ব্যবহারকারী থাকলে উপযুক্ত অভিভাবকীয় ও গোপনীয়তা-সুরক্ষা বিবেচনা করুন।

## ৬) পরবর্তী উন্নয়ন
- Admin dashboard দিয়ে প্রশ্ন যোগ/সম্পাদনা
- BCS/ব্যাংক/মন্ত্রণালয় আলাদা সিলেবাস ও পরীক্ষার সেট
- যাচাইকৃত বিগত বছরের প্রশ্ন, উৎস ও সাল
- বিষয়ভিত্তিক অগ্রগতি, বুকমার্ক ও ভুল প্রশ্ন পুনরায় অনুশীলন
- প্রশ্ন server থেকে আনা, server-side scoring এবং database backup
