# Mahbub BCS Guidelines — সংস্করণ ২

এই সংস্করণে যুক্ত হয়েছে:
- English section headings এবং বিষয়ভিত্তিক Subject Folders
- প্রতিটি বিষয়ের Topic ও Subtopic তালিকা
- BCS, Bank এবং Government Job-এর আলাদা Previous Year Question ফোল্ডার
- ২০১০–২০২৬ সাল নির্বাচন করার কাঠামো
- প্রতিদিন ৬ ঘণ্টার রুটিন, সাপ্তাহিক চক্র এবং ৯ মাসের পরিকল্পনা
- দৈনিক ও টপিকভিত্তিক অগ্রগতি Local Storage-এ সংরক্ষণ
- Header-এ নিজের ছবি যুক্ত করার সুবিধা (শুধু এই ডিভাইসে সংরক্ষিত)
- PWA manifest, service worker এবং ১৯২/৫১২ PNG আইকন
- আগের Supabase login/signup ও attempts history-এর সঙ্গে সামঞ্জস্য রাখার চেষ্টা

## গুরুত্বপূর্ণ সতর্কতা

২০১০–২০২৬ সালের পূর্ণ বিগত প্রশ্ন এই প্যাকেজে এখনো যুক্ত করা হয়নি। কারণ মূল প্রশ্নপত্র/বিশ্বস্ত উৎস যাচাই ছাড়া কোনো প্রশ্নকে বিগত বছরের প্রশ্ন হিসেবে দেখানো হবে না। `question-bank.js`-এ যাচাইকৃত প্রশ্ন যোগ করার কাঠামো দেওয়া আছে; বর্তমানে array খালি।

## GitHub-এ আপডেট

1. ZIP extract করুন।
2. GitHub repository-এর `main` branch-এ যান।
3. এই প্যাকেজের `index.html`, `styles.css`, `app.js`, `manifest.webmanifest`, `sw.js`, `question-bank.js` ও `README-BN.md` দিয়ে একই নামের ফাইল replace করুন।
4. `assets` folder-এর ভেতরের `icon.svg`, `icon-192.png`, `icon-512.png` আপলোড করুন।
5. আগের `config.js` ফাইলটি **replace বা delete করবেন না**। তাতে আপনার Supabase project configuration আছে।
6. Commit changes করুন এবং Vercel deployment সম্পন্ন হওয়া পর্যন্ত অপেক্ষা করুন।

## প্রশ্ন যুক্ত করার নিয়ম

`question-bank.js`-এর format অনুযায়ী প্রতিটি প্রশ্নে মূল প্রশ্ন, মূল অপশন (যদি থাকে), পরীক্ষার নাম, সাল, বিষয় এবং উৎস দিতে হবে। সঠিক উত্তর নিশ্চিত না হলে `correctIndex: null` রাখুন এবং ব্যাখ্যা না থাকলে `explanation: ''` রাখুন।

## Personal photo

অ্যাপে লগইন করে উপরের ছবির/প্রোফাইল আইকন বাটনে চাপ দিয়ে নিজের ছবি নির্বাচন করুন। ছবিটি শুধু এই ব্রাউজারের Local Storage-এ থাকবে; অন্য ডিভাইসে স্বয়ংক্রিয়ভাবে যাবে না।
