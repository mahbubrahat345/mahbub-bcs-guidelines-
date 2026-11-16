/* Mahbub BCS Guidelines — app.js
   Works with the existing index.html and Supabase JS v2 CDN.
   Public browser config belongs in config.js (URL + publishable/anon key only).
*/

(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const APP_REDIRECT_URL = 'https://mahbub-bcs-guidelines.vercel.app/';
  const TEST_SECONDS = 10 * 60;
  const STORAGE_KEY = 'mahbub-bcs-guidelines-study-progress-v1';
  const LETTERS = ['ক', 'খ', 'গ', 'ঘ'];

  const config = window.APP_CONFIG || {};
  const hasConfig = typeof config.SUPABASE_URL === 'string'
    && config.SUPABASE_URL.startsWith('https://')
    && !config.SUPABASE_URL.includes('YOUR_')
    && typeof config.SUPABASE_ANON_KEY === 'string'
    && config.SUPABASE_ANON_KEY.length > 20
    && !config.SUPABASE_ANON_KEY.includes('YOUR_');

  const supabaseClient = hasConfig && window.supabase?.createClient
    ? window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY)
    : null;

  let authMode = 'login';
  let currentUser = null;
  let quizQuestions = [];
  let quizAnswers = {};
  let questionIndex = 0;
  let secondsLeft = TEST_SECONDS;
  let timerId = null;
  let quizFinished = false;
  let latestResult = null;
  let deferredInstallPrompt = null;
  let recoveryMode = false;
  let pendingSignupEmail = '';

  const bn = (value) => String(value).replace(/\d/g, (digit) => '০১২৩৪৫৬৭৮৯'[Number(digit)]);
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);

  // Original practice questions. These are sample questions, not an authenticated previous-year question bank.
  const questionBank = [
    // BCS practice set
    { categories: ['BCS'], subject: 'বাংলা', q: 'বাংলা সাহিত্যের প্রাচীনতম প্রাপ্ত নিদর্শন কোনটি?', options: ['শ্রীকৃষ্ণকীর্তন', 'চর্যাপদ', 'মঙ্গলকাব্য', 'গীতগোবিন্দ'], answer: 1, explain: 'চর্যাপদ বাংলা সাহিত্যের প্রাচীনতম প্রাপ্ত নিদর্শন।' },
    { categories: ['BCS'], subject: 'বাংলা', q: '‘অগ্নিবীণা’ কাব্যগ্রন্থের রচয়িতা কে?', options: ['রবীন্দ্রনাথ ঠাকুর', 'জসীমউদ্‌দীন', 'কাজী নজরুল ইসলাম', 'মাইকেল মধুসূদন দত্ত'], answer: 2, explain: '‘অগ্নিবীণা’ কাজী নজরুল ইসলামের প্রথম কাব্যগ্রন্থ।' },
    { categories: ['BCS'], subject: 'English', q: 'Choose the synonym of “Abundant”.', options: ['Scarce', 'Plentiful', 'Tiny', 'Rare'], answer: 1, explain: 'Abundant means plentiful or available in a large quantity.' },
    { categories: ['BCS'], subject: 'English', q: 'What is the plural form of “criterion”?', options: ['Criterions', 'Criteria', 'Criterias', 'Criterion'], answer: 1, explain: 'Criteria is the plural form of criterion.' },
    { categories: ['BCS'], subject: 'গণিত', q: '২০০-এর ১৫% কত?', options: ['২০', '২৫', '৩০', '৩৫'], answer: 2, explain: '২০০ × ১৫ ÷ ১০০ = ৩০।' },
    { categories: ['BCS'], subject: 'বাংলাদেশ বিষয়াবলি', q: 'বাংলাদেশের সংবিধান কার্যকর হয় কবে?', options: ['২৬ মার্চ ১৯৭১', '১৬ ডিসেম্বর ১৯৭১', '৪ নভেম্বর ১৯৭২', '১৬ ডিসেম্বর ১৯৭২'], answer: 3, explain: 'সংবিধান ৪ নভেম্বর ১৯৭২ গৃহীত হয় এবং ১৬ ডিসেম্বর ১৯৭২ কার্যকর হয়।' },
    { categories: ['BCS'], subject: 'আন্তর্জাতিক বিষয়াবলি', q: 'জাতিসংঘ প্রতিষ্ঠিত হয় কত সালে?', options: ['১৯৪৪', '১৯৪৫', '১৯৪৬', '১৯৪৭'], answer: 1, explain: 'জাতিসংঘ ২৪ অক্টোবর ১৯৪৫ সালে প্রতিষ্ঠিত হয়।' },
    { categories: ['BCS'], subject: 'বিজ্ঞান', q: 'উদ্ভিদের খাদ্য তৈরির প্রধান অঙ্গাণু কোনটি?', options: ['মাইটোকন্ড্রিয়া', 'রাইবোজোম', 'ক্লোরোপ্লাস্ট', 'নিউক্লিয়াস'], answer: 2, explain: 'ক্লোরোপ্লাস্টে ক্লোরোফিল থাকে; এখানে সালোকসংশ্লেষণ ঘটে।' },
    { categories: ['BCS'], subject: 'ICT', q: 'কম্পিউটারের বাইনারি সংখ্যা পদ্ধতিতে কোন দুটি অঙ্ক ব্যবহৃত হয়?', options: ['১ ও ২', '০ ও ১', '০ ও ৯', '২ ও ৮'], answer: 1, explain: 'বাইনারি সংখ্যা পদ্ধতিতে ০ এবং ১ ব্যবহৃত হয়।' },
    { categories: ['BCS'], subject: 'অর্থনীতি', q: 'অর্থনীতিতে দুষ্প্রাপ্যতা বলতে কী বোঝায়?', options: ['চাহিদার তুলনায় সম্পদের সীমাবদ্ধতা', 'সব পণ্যের অবাধ প্রাপ্যতা', 'শুধু অর্থের অভাব', 'শুধু জনসংখ্যা বৃদ্ধি'], answer: 0, explain: 'সীমিত সম্পদের তুলনায় মানুষের অভাব/চাহিদা অসীম হওয়াই দুষ্প্রাপ্যতার মূল ধারণা।' },

    // Bank practice set
    { categories: ['Bank'], subject: 'গণিত', q: 'একটি সংখ্যার ২৫% = ৫০ হলে সংখ্যাটি কত?', options: ['১০০', '১৫০', '২০০', '২৫০'], answer: 2, explain: 'সংখ্যাটি = ৫০ × ১০০ ÷ ২৫ = ২০০।' },
    { categories: ['Bank'], subject: 'গণিত', q: '২:৩ অনুপাতে মোট ২৫ ভাগ করলে প্রথম অংশ কত?', options: ['৫', '১০', '১৫', '২০'], answer: 1, explain: 'মোট অনুপাত ৫; প্রথম অংশ = ২৫ × ২/৫ = ১০।' },
    { categories: ['Bank'], subject: 'গণিত', q: '১,০০০ টাকার ১০% হারে ২ বছরের সরল সুদ কত?', options: ['১০০ টাকা', '১৫০ টাকা', '২০০ টাকা', '২৫০ টাকা'], answer: 2, explain: 'সরল সুদ = (মূলধন × হার × সময়) ÷ ১০০ = ২০০ টাকা।' },
    { categories: ['Bank'], subject: 'গণিত', q: '১০, ১২ ও ১৪-এর গড় কত?', options: ['১০', '১১', '১২', '১৩'], answer: 2, explain: '(১০ + ১২ + ১৪) ÷ ৩ = ১২।' },
    { categories: ['Bank'], subject: 'English', q: 'Choose the antonym of “Expand”.', options: ['Enlarge', 'Extend', 'Contract', 'Increase'], answer: 2, explain: 'Contract means to become smaller; it is the antonym of expand.' },
    { categories: ['Bank'], subject: 'English', q: 'Choose the correct sentence.', options: ['He go to school.', 'He goes to school.', 'He going to school.', 'He gone to school.'], answer: 1, explain: 'In the simple present tense, “he” takes the verb form “goes”.' },
    { categories: ['Bank'], subject: 'বাংলা', q: '‘যে উপকারীর উপকার স্বীকার করে’—এক কথায় কী?', options: ['কৃতঘ্ন', 'কৃতজ্ঞ', 'পরোপকারী', 'নির্লোভ'], answer: 1, explain: 'উপকারীর উপকার স্বীকার করে যে, সে কৃতজ্ঞ।' },
    { categories: ['Bank'], subject: 'সাধারণ জ্ঞান', q: 'বাংলাদেশের কেন্দ্রীয় ব্যাংকের নাম কী?', options: ['সোনালী ব্যাংক', 'বাংলাদেশ ব্যাংক', 'জনতা ব্যাংক', 'রূপালী ব্যাংক'], answer: 1, explain: 'বাংলাদেশের কেন্দ্রীয় ব্যাংক হলো বাংলাদেশ ব্যাংক।' },
    { categories: ['Bank'], subject: 'মানসিক দক্ষতা', q: 'ধারাটি সম্পূর্ণ করো: ৩, ৬, ৯, ১২, __', options: ['১৩', '১৪', '১৫', '১৮'], answer: 2, explain: 'প্রতিবার ৩ যোগ হচ্ছে; পরের সংখ্যা ১৫।' },
    { categories: ['Bank'], subject: 'অর্থনীতি', q: 'সাধারণভাবে বাজারে পণ্যের দাম বাড়লে চাহিদার পরিমাণ কী হয়, অন্যান্য বিষয় অপরিবর্তিত থাকলে?', options: ['বাড়ে', 'কমে', 'অপরিবর্তিত থাকে', 'শূন্য হয়'], answer: 1, explain: 'চাহিদার সূত্র অনুযায়ী অন্যান্য বিষয় অপরিবর্তিত থাকলে দাম বাড়লে চাহিদার পরিমাণ কমে।' },

    // Ministry/directorate practice set
    { categories: ['Govt'], subject: 'বাংলাদেশ বিষয়াবলি', q: 'বাংলাদেশের বিজয় দিবস কবে?', options: ['২৬ মার্চ', '২১ ফেব্রুয়ারি', '১৬ ডিসেম্বর', '১৪ ডিসেম্বর'], answer: 2, explain: '১৬ ডিসেম্বর বাংলাদেশের বিজয় দিবস।' },
    { categories: ['Govt'], subject: 'বাংলাদেশ বিষয়াবলি', q: 'আন্তর্জাতিক মাতৃভাষা দিবস পালিত হয় কবে?', options: ['২৬ মার্চ', '২১ ফেব্রুয়ারি', '১৬ ডিসেম্বর', '১ মে'], answer: 1, explain: '২১ ফেব্রুয়ারি আন্তর্জাতিক মাতৃভাষা দিবস।' },
    { categories: ['Govt'], subject: 'বাংলাদেশ বিষয়াবলি', q: 'মুজিবনগর সরকার শপথ গ্রহণ করে কবে?', options: ['১০ এপ্রিল ১৯৭১', '১৭ এপ্রিল ১৯৭১', '২৬ মার্চ ১৯৭১', '১৬ ডিসেম্বর ১৯৭১'], answer: 1, explain: 'মুজিবনগর সরকার ১৭ এপ্রিল ১৯৭১ শপথ গ্রহণ করে।' },
    { categories: ['Govt'], subject: 'বিজ্ঞান', q: 'বল-এর SI একক কী?', options: ['জুল', 'ওয়াট', 'নিউটন', 'প্যাসকেল'], answer: 2, explain: 'বল-এর SI একক নিউটন।' },
    { categories: ['Govt'], subject: 'বিজ্ঞান', q: 'পানির রাসায়নিক সংকেত কোনটি?', options: ['CO₂', 'H₂O', 'O₂', 'NaCl'], answer: 1, explain: 'পানির রাসায়নিক সংকেত H₂O।' },
    { categories: ['Govt'], subject: 'সাধারণ জ্ঞান', q: 'বিশ্ব স্বাস্থ্য সংস্থার সংক্ষিপ্ত রূপ কী?', options: ['WTO', 'WHO', 'UNESCO', 'UNICEF'], answer: 1, explain: 'বিশ্ব স্বাস্থ্য সংস্থার সংক্ষিপ্ত রূপ WHO।' },
    { categories: ['Govt'], subject: 'গণিত', q: '৫০০-এর ২০% কত?', options: ['৫০', '৭৫', '১০০', '১২৫'], answer: 2, explain: '৫০০ × ২০ ÷ ১০০ = ১০০।' },
    { categories: ['Govt'], subject: 'ICT', q: 'CPU-এর পূর্ণরূপ কোনটি?', options: ['Central Processing Unit', 'Computer Personal Unit', 'Central Program Utility', 'Control Processing User'], answer: 0, explain: 'CPU-এর পূর্ণরূপ Central Processing Unit।' },
    { categories: ['Govt'], subject: 'ভূগোল', q: 'পৃথিবীর বৃহত্তম মহাসাগর কোনটি?', options: ['আটলান্টিক', 'ভারত', 'প্রশান্ত', 'দক্ষিণ'], answer: 2, explain: 'প্রশান্ত মহাসাগর পৃথিবীর বৃহত্তম মহাসাগর।' },
    { categories: ['Govt'], subject: 'মানসিক দক্ষতা', q: 'সব গোলাপ ফুল। কিছু ফুল দ্রুত ঝরে যায়। এ থেকে নিশ্চিতভাবে কোনটি বলা যায়?', options: ['সব গোলাপ দ্রুত ঝরে যায়', 'কিছু গোলাপ দ্রুত ঝরে যায়', 'সব ফুল গোলাপ', 'কোনো সিদ্ধান্ত নিশ্চিত নয়'], answer: 3, explain: 'দ্রুত ঝরে যাওয়া ফুলের মধ্যে গোলাপ আছে কি না তথ্য থেকে নিশ্চিত হওয়া যায় না।' }
  ];

  // Detailed study checklist. Chapter/subtopic structure follows the BPSC preliminary syllabus
  // as a core framework; bank and ministry/directorate sections are common-core extensions.
  const studyPlan = [
    { subject: 'বাংলা ভাষা ও সাহিত্য', chapters: [
      { title: 'বাংলা ভাষা', topics: ['ভাষা, বাংলা ভাষার উৎপত্তি ও ক্রমবিকাশ', 'ধ্বনি ও বর্ণ; স্বরধ্বনি ও ব্যঞ্জনধ্বনি', 'উচ্চারণ, ধ্বনির পরিবর্তন ও ধ্বনিতত্ত্ব', 'শব্দ, শব্দের শ্রেণিবিভাগ ও গঠন', 'পদ ও পদপ্রকরণ', 'বাক্য ও বাক্যের শ্রেণিবিভাগ', 'সন্ধি ও সন্ধিবিচ্ছেদ', 'সমাস ও সমাসবদ্ধ পদ', 'উপসর্গ, প্রত্যয় ও অনুসর্গ', 'কারক ও বিভক্তি', 'বচন, লিঙ্গ ও পুরুষ', 'সমার্থক ও বিপরীতার্থক শব্দ', 'বাগধারা, প্রবাদ-প্রবচন ও এককথায় প্রকাশ', 'শুদ্ধ বানান, বাক্যশুদ্ধি ও প্রয়োগ-অপপ্রয়োগ', 'বাংলা পরিভাষা'] },
      { title: 'বাংলা সাহিত্য: প্রাচীন ও মধ্যযুগ', topics: ['চর্যাপদ: আবিষ্কার, ভাষা, কবি ও বিষয়বস্তু', 'শ্রীকৃষ্ণকীর্তন ও বড়ু চণ্ডীদাস', 'মঙ্গলকাব্য: মনসামঙ্গল, চণ্ডীমঙ্গল, ধর্মমঙ্গল', 'বৈষ্ণব পদাবলি ও বিদ্যাপতি', 'অনুবাদ সাহিত্য ও মুসলিম সাহিত্যধারা', 'আরাকান রাজসভা ও আলাওল', 'মধ্যযুগের উল্লেখযোগ্য কবি ও সাহিত্যকর্ম'] },
      { title: 'বাংলা সাহিত্য: আধুনিক যুগ', topics: ['ফোর্ট উইলিয়াম কলেজ ও বাংলা গদ্যের বিকাশ', 'ঈশ্বরচন্দ্র বিদ্যাসাগর ও বঙ্কিমচন্দ্র', 'মাইকেল মধুসূদন দত্ত', 'রবীন্দ্রনাথ ঠাকুর', 'কাজী নজরুল ইসলাম', 'শরৎচন্দ্র, বিভূতিভূষণ ও মানিক বন্দ্যোপাধ্যায়', 'জসীমউদ্‌দীন, জীবনানন্দ দাশ ও আধুনিক কবিতা', 'সুকান্ত ভট্টাচার্য ও অন্যান্য কবি', 'বাংলাদেশের কথাসাহিত্য, নাটক ও প্রবন্ধ', 'মুক্তিযুদ্ধভিত্তিক সাহিত্য', 'লেখক-গ্রন্থ, ছদ্মনাম, উপাধি ও সাহিত্য পুরস্কার'] }
    ]},
    { subject: 'English Language and Literature', chapters: [
      { title: 'Grammar and Language', topics: ['Parts of Speech: noun, pronoun, adjective, verb, adverb', 'Determiners, articles, gender and number', 'Finite and non-finite verbs; gerund, participle, infinitive', 'Tense and sequence of tenses', 'Subject-verb agreement', 'Right form of verbs and modals', 'Prepositions and appropriate prepositions', 'Conjunctions and linking words', 'Phrases and idioms', 'Clauses: noun, adjective and adverb clauses', 'Simple, compound and complex sentences', 'Transformation of sentences', 'Active and passive voice', 'Direct and indirect speech', 'Correction of errors', 'Synonyms, antonyms and word meaning', 'Spelling, prefix, suffix and word formation', 'Analogy and commonly confused words'] },
      { title: 'Composition', topics: ['Paragraph structure and development', 'Letter, application and email format', 'Precis and summary writing', 'Translation: Bangla to English and English to Bangla', 'Comprehension and answering questions'] },
      { title: 'English Literature', topics: ['Old and Middle English literature: basic timeline', 'Renaissance and Elizabethan period', 'William Shakespeare: plays and sonnets', 'Metaphysical poets and John Milton', 'Romantic period: Wordsworth, Coleridge, Shelley, Keats, Byron', 'Victorian period: major poets and novelists', 'Modern and contemporary literature', 'Major writers, works, literary terms and quotations'] }
    ]},
    { subject: 'বাংলাদেশ বিষয়াবলি', chapters: [
      { title: 'বাংলাদেশের ইতিহাস ও অভ্যুদয়', topics: ['প্রাচীন বাংলার জনপদ ও রাজনৈতিক ইতিহাস', 'সুলতানি ও মুঘল আমল', 'বাংলায় ইউরোপীয়দের আগমন ও ব্রিটিশ শাসন', 'বঙ্গভঙ্গ, স্বদেশি আন্দোলন ও ব্রিটিশবিরোধী আন্দোলন', 'পাকিস্তান রাষ্ট্রের সৃষ্টি ও পূর্ব বাংলার রাজনৈতিক প্রেক্ষাপট', 'ভাষা আন্দোলন ১৯৫২', 'যুক্তফ্রন্ট নির্বাচন ১৯৫৪', 'ছয় দফা ও ১৯৬৬ সালের আন্দোলন', 'আগরতলা মামলা ও ১৯৬৯-এর গণঅভ্যুত্থান', '১৯৭০ সালের নির্বাচন ও অসহযোগ আন্দোলন', '৭ মার্চের ভাষণ ও স্বাধীনতার ঘোষণা', 'মুজিবনগর সরকার: গঠন ও কার্যক্রম', 'মুক্তিযুদ্ধের সেক্টর, সংগঠন ও কৌশল', 'মুক্তিযুদ্ধে দেশি-বিদেশি ভূমিকা', 'বিজয়, আত্মসমর্পণ ও স্বাধীন বাংলাদেশের অভ্যুদয়'] },
      { title: 'সংবিধান, সরকার ও প্রশাসন', topics: ['সংবিধান প্রণয়ন, গৃহীত ও কার্যকর হওয়ার তারিখ', 'সংবিধানের প্রস্তাবনা ও বৈশিষ্ট্য', 'রাষ্ট্র পরিচালনার মূলনীতি', 'মৌলিক অধিকার ও কর্তব্য', 'সংবিধানের গুরুত্বপূর্ণ অনুচ্ছেদ ও সংশোধনী', 'রাষ্ট্রপতি, প্রধানমন্ত্রী ও মন্ত্রিসভা', 'জাতীয় সংসদ ও আইন প্রণয়ন প্রক্রিয়া', 'বিচার বিভাগ ও সুপ্রিম কোর্ট', 'নির্বাচন কমিশন ও নির্বাচনব্যবস্থা', 'স্থানীয় সরকার: সিটি করপোরেশন, পৌরসভা, উপজেলা ও ইউনিয়ন', 'মন্ত্রণালয়, বিভাগ, অধিদপ্তর ও মাঠ প্রশাসন', 'সরকারি কর্মচারী, জনপ্রশাসন ও প্রশাসনিক সংস্কার'] },
      { title: 'অর্থনীতি, কৃষি, শিল্প ও বাণিজ্য', topics: ['বাংলাদেশের অর্থনীতির বৈশিষ্ট্য ও খাত', 'জিডিপি, জিএনআই, মাথাপিছু আয় ও প্রবৃদ্ধি', 'জাতীয় বাজেট, রাজস্ব ও উন্নয়ন ব্যয়', 'বার্ষিক উন্নয়ন কর্মসূচি ও পঞ্চবার্ষিক পরিকল্পনা', 'দারিদ্র্য, বৈষম্য, কর্মসংস্থান ও মানব উন্নয়ন', 'কৃষি, খাদ্য উৎপাদন ও খাদ্য নিরাপত্তা', 'শিল্পায়ন, তৈরি পোশাক ও ক্ষুদ্র-মাঝারি শিল্প', 'আমদানি-রপ্তানি, বাণিজ্য ঘাটতি ও বৈদেশিক মুদ্রা', 'রেমিট্যান্স, বৈদেশিক ঋণ ও বিনিয়োগ', 'বাংলাদেশ ব্যাংক, বাণিজ্যিক ব্যাংক ও বীমা', 'বিদ্যুৎ, জ্বালানি ও অবকাঠামো'] },
      { title: 'জনসংখ্যা, সমাজ, সংস্কৃতি ও জাতীয় অর্জন', topics: ['জনশুমারি, জনসংখ্যা ও জনমিতিক সূচক', 'ক্ষুদ্র নৃগোষ্ঠী, জাতিসত্তা ও সংস্কৃতি', 'শিক্ষা, স্বাস্থ্য ও সামাজিক সুরক্ষা', 'জাতীয় দিবস, জাতীয় প্রতীক ও জাতীয় পুরস্কার', 'বিশিষ্ট ব্যক্তি, প্রতিষ্ঠান ও স্থাপনা', 'বাংলাদেশের খেলাধুলা, চলচ্চিত্র ও গণমাধ্যম', 'জাতীয় অর্জন ও গুরুত্বপূর্ণ সাম্প্রতিক তথ্য'] }
    ]},
    { subject: 'আন্তর্জাতিক বিষয়াবলি', chapters: [
      { title: 'বৈশ্বিক ইতিহাস, ব্যবস্থা ও ভূরাজনীতি', topics: ['প্রাচীন সভ্যতা ও বিশ্ব ইতিহাসের প্রধান বাঁক', 'রেনেসাঁ, শিল্পবিপ্লব ও উপনিবেশবাদ', 'প্রথম বিশ্বযুদ্ধ: কারণ, ঘটনা ও ফলাফল', 'দ্বিতীয় বিশ্বযুদ্ধ ও জাতিসংঘ প্রতিষ্ঠা', 'স্নায়ুযুদ্ধ, জোটনিরপেক্ষ আন্দোলন ও দ্বিমেরু বিশ্ব', 'সোভিয়েত ইউনিয়নের পতন ও একমেরু/বহুমেরু বিশ্ব', 'উপনিবেশমুক্তি ও নতুন রাষ্ট্রের উত্থান', 'বিশ্বায়ন ও আন্তর্জাতিক ব্যবস্থার পরিবর্তন', 'ভূরাজনীতি, ভূকৌশল ও প্রভাববলয়', 'গুরুত্বপূর্ণ অঞ্চল, প্রণালি, খাল ও সামুদ্রিক পথ'] },
      { title: 'আন্তর্জাতিক নিরাপত্তা ও ক্ষমতা সম্পর্ক', topics: ['রাষ্ট্র, সার্বভৌমত্ব ও জাতীয় স্বার্থ', 'কূটনীতি, পররাষ্ট্রনীতি ও আন্তর্জাতিক আইন', 'প্রচলিত ও অপ্রচলিত নিরাপত্তা', 'সন্ত্রাসবাদ, উগ্রবাদ ও আন্তর্জাতিক অপরাধ: ধারণা ও প্রতিরোধ', 'পারমাণবিক নিরস্ত্রীকরণ ও অস্ত্র নিয়ন্ত্রণ চুক্তি', 'শরণার্থী, অভিবাসন ও মানবিক সংকট', 'সীমান্ত, সমুদ্রসীমা ও বিরোধ নিষ্পত্তি', 'আন্তর্জাতিক সংঘাত ও শান্তি প্রতিষ্ঠা'] },
      { title: 'আন্তর্জাতিক সংগঠন ও বৈশ্বিক অর্থনৈতিক প্রতিষ্ঠান', topics: ['জাতিসংঘ: প্রতিষ্ঠা, অঙ্গ, সংস্থা ও কার্যক্রম', 'জাতিসংঘের বিশেষায়িত সংস্থা ও তহবিল', 'আঞ্চলিক সংগঠন: SAARC, BIMSTEC, ASEAN, EU, AU', 'ইসলামি ও আরব বিশ্ব: OIC, Arab League, GCC', 'অর্থনৈতিক ফোরাম: WTO, IMF, World Bank, ADB, AIIB', 'বিশ্বের রাজনৈতিক ও অর্থনৈতিক জোট: G7, G20, BRICS, OECD', 'নিরাপত্তা ও সামরিক জোট: NATO এবং অন্যান্য কাঠামো', 'আন্তর্জাতিক আদালত ও বিচার প্রতিষ্ঠান: ICJ, ICC', 'আন্তর্জাতিক চুক্তি, সনদ ও ঘোষণাপত্র', 'বাংলাদেশের সদস্যপদ, ভূমিকা ও অবদান'] },
      { title: 'আন্তর্জাতিক পরিবেশ, জলবায়ু ও কূটনীতি', topics: ['জলবায়ু পরিবর্তন ও বৈশ্বিক উষ্ণায়ন', 'জাতিসংঘ জলবায়ু কাঠামো ও COP সম্মেলন', 'প্যারিস চুক্তি ও কিয়োটো প্রটোকল', 'জীববৈচিত্র্য, বন ও মরুকরণ সংক্রান্ত চুক্তি', 'টেকসই উন্নয়ন অভীষ্ট (SDGs)', 'সমুদ্র, পানি ও পরিবেশ সুরক্ষা কূটনীতি'] },
      { title: 'বিশ্বের দেশ, অঞ্চল ও সাম্প্রতিক ঘটনাপ্রবাহ', topics: ['মহাদেশ, দেশ, রাজধানী ও মুদ্রা', 'গুরুত্বপূর্ণ রাষ্ট্রপ্রধান ও সরকারপ্রধান', 'বিশ্বের গুরুত্বপূর্ণ নির্বাচন ও রাজনৈতিক পরিবর্তন', 'আন্তর্জাতিক পুরস্কার ও সম্মাননা', 'বিশ্ব অর্থনীতি, জ্বালানি ও বাণিজ্যের সাম্প্রতিক প্রবণতা', 'আন্তর্জাতিক খেলাধুলা, সম্মেলন ও দিবস', 'সাম্প্রতিক সংঘাত, চুক্তি, নিষেধাজ্ঞা ও কূটনৈতিক উদ্যোগ'] }
    ]},
    { subject: 'ভূগোল, পরিবেশ ও দুর্যোগ ব্যবস্থাপনা', chapters: [
      { title: 'বাংলাদেশ ও বিশ্ব ভূগোল', topics: ['বাংলাদেশের অবস্থান, সীমানা ও ভৌগোলিক গুরুত্ব', 'বাংলাদেশের বিভাগ, জেলা ও ভৌত অঞ্চল', 'নদ-নদী, বদ্বীপ, পাহাড়, উপকূল ও দ্বীপ', 'বিশ্বের মহাদেশ, মহাসাগর, পর্বত ও মরুভূমি', 'অক্ষাংশ, দ্রাঘিমাংশ, সময় অঞ্চল ও মানচিত্র', 'প্রাকৃতিক সম্পদ ও সম্পদের বণ্টন'] },
      { title: 'পরিবেশ ও জলবায়ু', topics: ['পরিবেশ, বাস্তুতন্ত্র ও জীববৈচিত্র্য', 'বায়ু, পানি, মাটি ও শব্দদূষণ', 'জলবায়ু পরিবর্তনের কারণ ও প্রভাব', 'বাংলাদেশের পরিবেশগত সমস্যা ও সংরক্ষণ', 'নবায়নযোগ্য জ্বালানি ও টেকসই উন্নয়ন'] },
      { title: 'দুর্যোগ ব্যবস্থাপনা', topics: ['ঘূর্ণিঝড়, জলোচ্ছ্বাস ও বন্যা', 'নদীভাঙন, খরা ও লবণাক্ততা', 'ভূমিকম্প, ভূমিধস ও সুনামি', 'দুর্যোগের ঝুঁকি, প্রস্তুতি, সাড়া ও পুনর্বাসন', 'বাংলাদেশের দুর্যোগ ব্যবস্থাপনা কাঠামো'] }
    ]},
    { subject: 'সাধারণ বিজ্ঞান', chapters: [
      { title: 'পদার্থবিজ্ঞান', topics: ['পদার্থের অবস্থা, পরমাণু ও মৌলিক কণা', 'ভৌত রাশি, একক ও পরিমাপ', 'বল, গতি, কাজ, ক্ষমতা ও শক্তি', 'তাপ, তাপমাত্রা ও তাপগতিবিদ্যা', 'আলো, দর্পণ, লেন্স ও আলোকীয় যন্ত্র', 'শব্দ, তরঙ্গ ও কম্পন', 'চুম্বকত্ব, স্থির ও চল তড়িৎ', 'ইলেকট্রনিকস, সেমিকন্ডাক্টর ও ট্রানজিস্টর', 'শক্তির উৎস, নবায়নযোগ্য শক্তি ও পারমাণবিক শক্তি'] },
      { title: 'রসায়ন', topics: ['মৌল, যৌগ, মিশ্রণ ও পরমাণুর গঠন', 'পর্যায় সারণি ও রাসায়নিক বন্ধন', 'অম্ল, ক্ষার, লবণ ও pH', 'ধাতু, অধাতু ও তাদের যৌগ', 'জারণ-বিজারণ ও তড়িৎ রাসায়নিক কোষ', 'কার্বন ও জৈব যৌগ', 'পলিমার, সাবান, ডিটারজেন্ট ও দৈনন্দিন রসায়ন'] },
      { title: 'জীববিজ্ঞান ও মানবদেহ', topics: ['কোষ, টিস্যু, অঙ্গ ও অঙ্গতন্ত্র', 'উদ্ভিদকোষ, প্রাণিকোষ ও কোষ বিভাজন', 'জিন, DNA, RNA ও বংশগতি', 'সালোকসংশ্লেষণ ও উদ্ভিদের পুষ্টি', 'মানবদেহের পরিপাক, শ্বসন ও রক্তসঞ্চালন', 'স্নায়ুতন্ত্র, হরমোন ও প্রজনন', 'খাদ্য, পুষ্টি, ভিটামিন ও খনিজ', 'রোগজীবাণু, সংক্রামক রোগ ও টিকা', 'ভাইরাস, ব্যাকটেরিয়া ও অণুজীব', 'জীববৈচিত্র্য, শ্রেণিবিন্যাস ও নামকরণ'] },
      { title: 'আধুনিক বিজ্ঞান ও স্বাস্থ্য', topics: ['মহাকাশ, সৌরজগৎ, নক্ষত্র ও ব্ল্যাক হোল', 'ভূতত্ত্ব, টেকটোনিক প্লেট ও ভূমিকম্প', 'আবহাওয়া, বায়ুমণ্ডল ও সমুদ্রবিজ্ঞান', 'জীবপ্রযুক্তি, জেনেটিক ইঞ্জিনিয়ারিং ও ন্যানোপ্রযুক্তি', 'রোবটিকস, কৃত্রিম বুদ্ধিমত্তা ও আধুনিক উদ্ভাবন', 'জনস্বাস্থ্য, রোগ প্রতিরোধ ও টিকাদান'] }
    ]},
    { subject: 'কম্পিউটার ও তথ্যপ্রযুক্তি', chapters: [
      { title: 'কম্পিউটার পরিচিতি ও সংগঠন', topics: ['কম্পিউটারের ইতিহাস ও প্রজন্ম', 'কম্পিউটারের প্রকারভেদ ও ব্যবহার', 'কম্পিউটার আর্কিটেকচার: CPU, ALU, CU', 'ইনপুট, আউটপুট ও স্টোরেজ ডিভাইস', 'হার্ডওয়্যার, সফটওয়্যার ও ফার্মওয়্যার', 'অপারেটিং সিস্টেম ও অ্যাপ্লিকেশন সফটওয়্যার', 'ডেটা, তথ্য, বিট, বাইট ও মেমোরি'] },
      { title: 'সংখ্যা পদ্ধতি ও ডেটাবেজ', topics: ['বাইনারি, অক্টাল, দশমিক ও হেক্সাডেসিমেল', 'সংখ্যা পদ্ধতির রূপান্তর', 'লজিক গেট ও বুলিয়ান অ্যালজেবরা', 'ডেটাবেজ, টেবিল, রেকর্ড ও ফিল্ড', 'প্রোগ্রামিং ভাষা ও অ্যালগরিদমের ধারণা'] },
      { title: 'নেটওয়ার্ক, ইন্টারনেট ও সাইবার নিরাপত্তা', topics: ['কম্পিউটার নেটওয়ার্ক: LAN, MAN, WAN', 'ইন্টারনেট, WWW, ওয়েব ব্রাউজার ও সার্চ ইঞ্জিন', 'IP address, domain, URL ও DNS', 'ই-মেইল, ক্লাউড কম্পিউটিং ও ই-কমার্স', 'মোবাইল নেটওয়ার্ক: 2G থেকে 5G', 'সাইবার অপরাধ, গোপনীয়তা ও নিরাপদ ব্যবহার', 'ভাইরাস, ম্যালওয়্যার, ফায়ারওয়াল ও এনক্রিপশন'] },
      { title: 'আধুনিক ICT', topics: ['স্মার্টফোন ও দৈনন্দিন ICT', 'সামাজিক যোগাযোগমাধ্যম ও ডিজিটাল যোগাযোগ', 'কৃত্রিম বুদ্ধিমত্তা ও মেশিন লার্নিং', 'রোবটিকস, IoT ও ব্লকচেইনের ধারণা', 'ই-গভর্ন্যান্স ও ডিজিটাল বাংলাদেশ/স্মার্ট বাংলাদেশ', 'প্রযুক্তি প্রতিষ্ঠান ও তাদের উদ্ভাবন'] }
    ]},
    { subject: 'গাণিতিক যুক্তি', chapters: [
      { title: 'পাটিগণিত', topics: ['বাস্তব সংখ্যা ও সংখ্যার ধারণা', 'গ.সা.গু ও ল.সা.গু', 'ভগ্নাংশ, দশমিক ও সরলীকরণ', 'শতকরা ও পরিবর্তনের হার', 'অনুপাত ও সমানুপাত', 'লাভ-ক্ষতি ও ছাড়', 'সরল ও চক্রবৃদ্ধি মুনাফা', 'গড়, ঐকিক নিয়ম ও কাজ-সময়', 'দূরত্ব, সময় ও গতি'] },
      { title: 'বীজগণিত', topics: ['বীজগাণিতিক সূত্রাবলি', 'উৎপাদক ও বহুপদী', 'সরল ও দ্বিঘাত সমীকরণ', 'অসমতা ও সহসমীকরণ', 'সূচক ও লগারিদম', 'সমান্তর ও গুণোত্তর ধারা'] },
      { title: 'জ্যামিতি ও পরিমিতি', topics: ['রেখা, কোণ ও তাদের বৈশিষ্ট্য', 'ত্রিভুজ ও চতুর্ভুজ', 'পিথাগোরাসের উপপাদ্য', 'বৃত্ত ও বৃত্তসংক্রান্ত উপপাদ্য', 'ক্ষেত্রফল ও পরিসীমা', 'ঘনবস্তু: আয়তন ও পৃষ্ঠতল'] },
      { title: 'সেট, বিন্যাস ও পরিসংখ্যান', topics: ['সেট ও সেটের ক্রিয়া', 'বিন্যাস ও সমাবেশ', 'তথ্য, উপাত্ত ও সারণি', 'গড়, মধ্যক ও প্রচুরক', 'সম্ভাবনার মৌলিক ধারণা'] }
    ]},
    { subject: 'মানসিক দক্ষতা', chapters: [
      { title: 'ভাষাগত ও যৌক্তিক বিচার', topics: ['শব্দ ও বর্ণের সাদৃশ্য', 'শ্রেণিবিন্যাস ও ব্যতিক্রম নির্ণয়', 'বর্ণ/শব্দের সংকেত ও কোডিং-ডিকোডিং', 'বক্তব্য, অনুমান ও সিদ্ধান্ত', 'যুক্তির ধাঁধা ও সম্পর্ক নির্ণয়'] },
      { title: 'সংখ্যাগত ও সমস্যা সমাধান', topics: ['সংখ্যার ধারা ও প্যাটার্ন', 'গাণিতিক যুক্তি ও দ্রুত হিসাব', 'বয়স, সময় ও ক্যালেন্ডার', 'দিক নির্ণয় ও অবস্থান', 'তথ্য বিশ্লেষণ ও সমস্যা সমাধান'] },
      { title: 'স্থানিক ও যান্ত্রিক দক্ষতা', topics: ['আকৃতি, চিত্র ও নকশা বিশ্লেষণ', 'আয়না ও পানির প্রতিবিম্ব', 'কাগজ ভাঁজ ও কাটা', 'ঘনক, পাশা ও ঘূর্ণন', 'যান্ত্রিক নীতি ও সাধারণ যন্ত্রের ধারণা'] }
    ]},
    { subject: 'নৈতিকতা, মূল্যবোধ ও সুশাসন', chapters: [
      { title: 'নৈতিকতা ও মূল্যবোধ', topics: ['নৈতিকতা, নীতিবোধ ও মূল্যবোধের সংজ্ঞা', 'ব্যক্তিগত, সামাজিক, ধর্মীয় ও রাষ্ট্রীয় মূল্যবোধ', 'নৈতিকতা ও আইনের পার্থক্য', 'সততা, ন্যায়পরায়ণতা, দায়িত্বশীলতা ও সহনশীলতা', 'নাগরিক দায়িত্ব, কর্তব্য ও দেশপ্রেম', 'নৈতিক শিক্ষা ও চরিত্র গঠন', 'মূল্যবোধের সঙ্গে সুশাসনের সম্পর্ক'] },
      { title: 'সুশাসনের ধারণা ও উপাদান', topics: ['সুশাসনের সংজ্ঞা, ধারণা ও বৈশিষ্ট্য', 'অংশগ্রহণ, আইনের শাসন ও স্বচ্ছতা', 'জবাবদিহিতা ও দায়িত্বশীলতা', 'কার্যকারিতা, দক্ষতা ও সাড়া প্রদান', 'সমতা, অন্তর্ভুক্তি ও ঐকমত্য', 'বিকেন্দ্রীকরণ ও জনসম্পৃক্ততা'] },
      { title: 'প্রশাসন, নাগরিক সেবা ও দুর্নীতি প্রতিরোধ', topics: ['জনপ্রশাসনে নৈতিকতা ও পেশাগত আচরণ', 'সরকারি কর্মচারীর আচরণ ও দায়িত্ব', 'তথ্য অধিকার ও নাগরিক সনদ', 'দুর্নীতির কারণ, প্রভাব ও প্রতিরোধ', 'দুর্নীতি দমন কমিশনের ভূমিকা', 'ই-গভর্ন্যান্স ও সেবা সহজীকরণ', 'মানবাধিকার, আইনের শাসন ও ন্যায়বিচার'] },
      { title: 'জাতীয় উন্নয়ন ও প্রয়োগ', topics: ['জাতীয় উন্নয়নে মূল্যবোধ ও সুশাসনের প্রভাব', 'সুশাসনের অভাবে ব্যক্তি ও সমাজের ক্ষতি', 'সুশাসন প্রতিষ্ঠার সামাজিক ও প্রাতিষ্ঠানিক উপায়', 'নৈতিক দ্বন্দ্ব ও সিদ্ধান্ত গ্রহণ', 'বাস্তব জীবনের উদাহরণভিত্তিক বিশ্লেষণ'] }
    ]},
    { subject: 'ব্যাংক ও মন্ত্রণালয়/অধিদপ্তর অতিরিক্ত প্রস্তুতি', chapters: [
      { title: 'ব্যাংক নিয়োগ পরীক্ষার সাধারণ অংশ', topics: ['বাংলাদেশ ব্যাংক ও আর্থিক খাতের কাঠামো', 'মুদ্রানীতি, রাজস্বনীতি ও মূল্যস্ফীতি', 'ব্যাংকিং পরিভাষা ও কেন্দ্রীয় ব্যাংকের কাজ', 'হিসাববিজ্ঞান: ডেবিট, ক্রেডিট ও আর্থিক বিবরণী', 'English: vocabulary, grammar, comprehension ও composition', 'গণিত: দ্রুত গণনা, ডাটা ইন্টারপ্রিটেশন ও word problems', 'কম্পিউটার, ICT ও সাম্প্রতিক অর্থনীতি'] },
      { title: 'মন্ত্রণালয়/অধিদপ্তর নিয়োগ পরীক্ষার সাধারণ অংশ', topics: ['বাংলা ব্যাকরণ ও সাহিত্য পুনরালোচনা', 'English grammar, vocabulary ও comprehension', 'গণিত ও মানসিক দক্ষতা', 'বাংলাদেশ ও আন্তর্জাতিক সাধারণ জ্ঞান', 'সংবিধান, সরকারি প্রশাসন ও নাগরিক সেবা', 'নৈতিকতা, শুদ্ধাচার ও সুশাসন', 'পদভিত্তিক আইন, বিধিমালা ও দাপ্তরিক কার্যাবলি'] },
      { title: 'লিখিত ও ব্যবহারিক প্রস্তুতি', topics: ['বাংলা ও ইংরেজি অনুবাদ', 'সারাংশ, ভাবসম্প্রসারণ ও প্রতিবেদন', 'দরখাস্ত, পত্র ও অফিস নোট', 'গণিতের লিখিত সমাধান ও ব্যাখ্যা', 'কম্পিউটার টাইপিং ও অফিস অ্যাপ্লিকেশন', 'মৌখিক পরীক্ষার সাধারণ প্রস্তুতি'] }
    ]}
  ];

  // 50th BCS preliminary mark distribution (200 marks), reported after BPSC published the revised syllabus in Dec 2025.
  // The detailed topic checklist below is a study expansion; always follow the exam-specific BPSC notice if amended.
  const bcs50Marks = {
    'বাংলা ভাষা ও সাহিত্য': 30,
    'English Language and Literature': 30,
    'বাংলাদেশ বিষয়াবলি': 25,
    'আন্তর্জাতিক বিষয়াবলি': 25,
    'ভূগোল, পরিবেশ ও দুর্যোগ ব্যবস্থাপনা': 10,
    'সাধারণ বিজ্ঞান': 15,
    'কম্পিউটার ও তথ্যপ্রযুক্তি': 15,
    'গাণিতিক যুক্তি': 20,
    'মানসিক দক্ষতা': 15,
    'নৈতিকতা, মূল্যবোধ ও সুশাসন': 15
  };
  const organizationGroup = (org) => {
    const e = org.en.toLowerCase();
    if (/united nations|world health organization|unesco|unicef|international labour organization|food and agriculture|undp|unhcr|international atomic energy/.test(e)) return 'জাতিসংঘ ও সংশ্লিষ্ট সংস্থা';
    if (/saarc|bimstec|asean|european union|organisation of islamic|african union/.test(e)) return 'আঞ্চলিক ও আন্তঃরাষ্ট্রীয় সংগঠন';
    if (/international monetary fund|world bank|world trade organization|asian development bank|asian infrastructure/.test(e)) return 'আন্তর্জাতিক অর্থনৈতিক ও বাণিজ্যিক প্রতিষ্ঠান';
    if (/nato/.test(e)) return 'নিরাপত্তা ও সামরিক জোট';
    if (/group of twenty|brics/.test(e)) return 'বৈশ্বিক অর্থনৈতিক ফোরাম ও জোট';
    if (/international court of justice|international criminal court/.test(e)) return 'আন্তর্জাতিক বিচার প্রতিষ্ঠান';
    return 'অন্যান্য আন্তর্জাতিক প্রতিষ্ঠান';
  };

  const organizationLibrary = [
    { name:'জাতিসংঘ', en:'United Nations (UN)', founded:'১৯৪৫', hq:'নিউইয়র্ক, যুক্তরাষ্ট্র', purpose:'আন্তর্জাতিক শান্তি ও নিরাপত্তা রক্ষা, দেশগুলোর মধ্যে সহযোগিতা এবং মানবাধিকার উন্নয়ন।', purposeEn:'To maintain international peace and security, promote cooperation among nations, and advance human rights.' },
    { name:'বিশ্ব স্বাস্থ্য সংস্থা', en:'World Health Organization (WHO)', founded:'১৯৪৮', hq:'জেনেভা, সুইজারল্যান্ড', purpose:'বিশ্বব্যাপী জনস্বাস্থ্য উন্নয়ন, রোগ প্রতিরোধ এবং স্বাস্থ্যবিষয়ক সমন্বয়।', purposeEn:'To promote global public health, prevent diseases, and coordinate international health work.' },
    { name:'জাতিসংঘ শিক্ষা, বিজ্ঞান ও সংস্কৃতি সংস্থা', en:'UNESCO', founded:'১৯৪৫', hq:'প্যারিস, ফ্রান্স', purpose:'শিক্ষা, বিজ্ঞান, সংস্কৃতি ও যোগাযোগের মাধ্যমে শান্তি ও সহযোগিতা প্রতিষ্ঠা।', purposeEn:'To build peace through international cooperation in education, science, culture and communication.' },
    { name:'জাতিসংঘ শিশু তহবিল', en:'UNICEF', founded:'১৯৪৬', hq:'নিউইয়র্ক, যুক্তরাষ্ট্র', purpose:'শিশুর অধিকার, স্বাস্থ্য, পুষ্টি, শিক্ষা ও সুরক্ষা নিশ্চিত করতে কাজ করা।', purposeEn:'To protect children’s rights and support their health, nutrition, education and protection.' },
    { name:'আন্তর্জাতিক শ্রম সংস্থা', en:'International Labour Organization (ILO)', founded:'১৯১৯', hq:'জেনেভা, সুইজারল্যান্ড', purpose:'শ্রমিকের অধিকার, শোভন কাজ ও শ্রমমান উন্নয়নে কাজ করা।', purposeEn:'To promote workers’ rights, decent work and international labour standards.' },
    { name:'খাদ্য ও কৃষি সংস্থা', en:'Food and Agriculture Organization (FAO)', founded:'১৯৪৫', hq:'রোম, ইতালি', purpose:'ক্ষুধা দূরীকরণ, খাদ্য নিরাপত্তা ও কৃষির উন্নয়ন।', purposeEn:'To achieve food security and improve agriculture, nutrition and rural livelihoods.' },
    { name:'আন্তর্জাতিক মুদ্রা তহবিল', en:'International Monetary Fund (IMF)', founded:'১৯৪৪ (প্রতিষ্ঠার সিদ্ধান্ত); কার্যক্রম ১৯৪৫–৪৭', hq:'ওয়াশিংটন, ডি.সি., যুক্তরাষ্ট্র', purpose:'আন্তর্জাতিক মুদ্রা সহযোগিতা, আর্থিক স্থিতিশীলতা ও সদস্যদেশকে নীতিগত/আর্থিক সহায়তা।', purposeEn:'To promote monetary cooperation and financial stability and provide policy and financial support to members.' },
    { name:'বিশ্বব্যাংক', en:'World Bank', founded:'১৯৪৪', hq:'ওয়াশিংটন, ডি.সি., যুক্তরাষ্ট্র', purpose:'দারিদ্র্য হ্রাস ও উন্নয়ন প্রকল্পে অর্থায়ন ও জ্ঞানগত সহায়তা।', purposeEn:'To reduce poverty and support development through financing and knowledge.' },
    { name:'বিশ্ব বাণিজ্য সংস্থা', en:'World Trade Organization (WTO)', founded:'১৯৯৫', hq:'জেনেভা, সুইজারল্যান্ড', purpose:'বৈশ্বিক বাণিজ্যের নিয়ম পরিচালনা, আলোচনা ও বাণিজ্য বিরোধ নিষ্পত্তি।', purposeEn:'To administer global trade rules, provide a forum for negotiations and settle trade disputes.' },
    { name:'জাতিসংঘ উন্নয়ন কর্মসূচি', en:'United Nations Development Programme (UNDP)', founded:'১৯৬৫', hq:'নিউইয়র্ক, যুক্তরাষ্ট্র', purpose:'দারিদ্র্য হ্রাস, সুশাসন, সংকট মোকাবিলা ও টেকসই উন্নয়নে সহায়তা।', purposeEn:'To support poverty reduction, governance, crisis resilience and sustainable development.' },
    { name:'জাতিসংঘ শরণার্থী সংস্থা', en:'United Nations High Commissioner for Refugees (UNHCR)', founded:'১৯৫০', hq:'জেনেভা, সুইজারল্যান্ড', purpose:'শরণার্থী, আশ্রয়প্রার্থী ও রাষ্ট্রহীন মানুষের সুরক্ষা ও সহায়তা।', purposeEn:'To protect and assist refugees, asylum-seekers and stateless people.' },
    { name:'আন্তর্জাতিক পরমাণু শক্তি সংস্থা', en:'International Atomic Energy Agency (IAEA)', founded:'১৯৫৭', hq:'ভিয়েনা, অস্ট্রিয়া', purpose:'পারমাণবিক শক্তির শান্তিপূর্ণ ব্যবহার ও নিরাপত্তা তদারকিতে সহযোগিতা।', purposeEn:'To promote the peaceful use of nuclear energy and strengthen nuclear safety and safeguards.' },
    { name:'দক্ষিণ এশীয় আঞ্চলিক সহযোগিতা সংস্থা', en:'South Asian Association for Regional Cooperation (SAARC)', founded:'১৯৮৫', hq:'কাঠমান্ডু, নেপাল', purpose:'দক্ষিণ এশিয়ার অর্থনৈতিক, সামাজিক ও সাংস্কৃতিক সহযোগিতা বৃদ্ধি।', purposeEn:'To promote economic, social and cultural cooperation in South Asia.' },
    { name:'বঙ্গোপসাগরীয় বহুখাতীয় প্রযুক্তি ও অর্থনৈতিক সহযোগিতা উদ্যোগ', en:'Bay of Bengal Initiative for Multi-Sectoral Technical and Economic Cooperation (BIMSTEC)', founded:'১৯৯৭', hq:'ঢাকা, বাংলাদেশ', purpose:'বঙ্গোপসাগরীয় অঞ্চলে বাণিজ্য, যোগাযোগ, নিরাপত্তা ও উন্নয়ন সহযোগিতা।', purposeEn:'To promote trade, connectivity, security and development cooperation around the Bay of Bengal.' },
    { name:'দক্ষিণ-পূর্ব এশীয় জাতিসমূহের সংস্থা', en:'Association of Southeast Asian Nations (ASEAN)', founded:'১৯৬৭', hq:'জাকার্তা, ইন্দোনেশিয়া', purpose:'দক্ষিণ-পূর্ব এশিয়ায় আঞ্চলিক শান্তি, স্থিতিশীলতা ও অর্থনৈতিক সহযোগিতা।', purposeEn:'To foster regional peace, stability and economic cooperation in Southeast Asia.' },
    { name:'ইউরোপীয় ইউনিয়ন', en:'European Union (EU)', founded:'১৯৯৩ (মাস্ট্রিখ্ট চুক্তি কার্যকর)', hq:'ব্রাসেলস, বেলজিয়াম (প্রধান প্রতিষ্ঠানসমূহ)', purpose:'ইউরোপীয় দেশগুলোর রাজনৈতিক ও অর্থনৈতিক একীকরণ এবং অভিন্ন নীতিতে সহযোগিতা।', purposeEn:'To promote political and economic integration and common policies among European countries.' },
    { name:'ইসলামি সহযোগিতা সংস্থা', en:'Organisation of Islamic Cooperation (OIC)', founded:'১৯৬৯', hq:'জেদ্দা, সৌদি আরব', purpose:'সদস্যদেশগুলোর মধ্যে সংহতি ও সহযোগিতা এবং মুসলিম বিশ্বের স্বার্থসংশ্লিষ্ট বিষয়ে কাজ করা।', purposeEn:'To promote solidarity and cooperation among member states and address issues affecting the Muslim world.' },
    { name:'আফ্রিকান ইউনিয়ন', en:'African Union (AU)', founded:'২০০২', hq:'আদ্দিস আবাবা, ইথিওপিয়া', purpose:'আফ্রিকায় ঐক্য, শান্তি, নিরাপত্তা ও টেকসই উন্নয়ন এগিয়ে নেওয়া।', purposeEn:'To advance unity, peace, security and sustainable development in Africa.' },
    { name:'উত্তর আটলান্টিক চুক্তি সংস্থা', en:'North Atlantic Treaty Organization (NATO)', founded:'১৯৪৯', hq:'ব্রাসেলস, বেলজিয়াম', purpose:'সদস্যদেশগুলোর সম্মিলিত প্রতিরক্ষা ও নিরাপত্তা সহযোগিতা।', purposeEn:'To provide collective defence and security cooperation among its members.' },
    { name:'জি-২০', en:'Group of Twenty (G20)', founded:'১৯৯৯', hq:'স্থায়ী সদর দপ্তর নেই; সভাপতিত্ব ঘূর্ণায়মান', purpose:'বিশ্ব অর্থনীতি, আর্থিক স্থিতিশীলতা ও আন্তর্জাতিক অর্থনৈতিক সহযোগিতা নিয়ে আলোচনা।', purposeEn:'A forum for international economic cooperation on global growth and financial stability.' },
    { name:'ব্রিকস', en:'BRICS', founded:'২০০৯ সালে BRIC শীর্ষ সম্মেলন; ২০১০ থেকে BRICS নাম', hq:'স্থায়ী সদর দপ্তর নেই; সভাপতিত্ব ঘূর্ণায়মান', purpose:'উদীয়মান অর্থনীতির দেশগুলোর রাজনৈতিক ও অর্থনৈতিক সহযোগিতা বৃদ্ধি।', purposeEn:'To strengthen political and economic cooperation among major emerging economies.' },
    { name:'এশীয় উন্নয়ন ব্যাংক', en:'Asian Development Bank (ADB)', founded:'১৯৬৬', hq:'মানিলা, ফিলিপাইন', purpose:'এশিয়া ও প্রশান্ত মহাসাগরীয় অঞ্চলে উন্নয়ন অর্থায়ন ও দারিদ্র্য হ্রাস।', purposeEn:'To finance development and reduce poverty in Asia and the Pacific.' },
    { name:'এশীয় অবকাঠামো বিনিয়োগ ব্যাংক', en:'Asian Infrastructure Investment Bank (AIIB)', founded:'২০১৬', hq:'বেইজিং, চীন', purpose:'এশিয়া ও অন্যান্য অঞ্চলে টেকসই অবকাঠামো উন্নয়নে অর্থায়ন।', purposeEn:'To finance sustainable infrastructure development in Asia and beyond.' },
    { name:'আন্তর্জাতিক বিচার আদালত', en:'International Court of Justice (ICJ)', founded:'১৯৪৫; কার্যক্রম ১৯৪৬', hq:'দ্য হেগ, নেদারল্যান্ডস', purpose:'রাষ্ট্রগুলোর মধ্যকার আইনগত বিরোধ নিষ্পত্তি ও পরামর্শমূলক মতামত প্রদান।', purposeEn:'To settle legal disputes between states and give advisory opinions.' },
    { name:'আন্তর্জাতিক অপরাধ আদালত', en:'International Criminal Court (ICC)', founded:'২০০২', hq:'দ্য হেগ, নেদারল্যান্ডস', purpose:'গণহত্যা, মানবতাবিরোধী অপরাধ, যুদ্ধাপরাধ ও আগ্রাসনের অপরাধে ব্যক্তির বিচার।', purposeEn:'To prosecute individuals for genocide, crimes against humanity, war crimes and aggression.' }
  ];

  function show(viewId) {
    ['authView', 'appView', 'quizView', 'resultView'].forEach((id) => {
      const node = $(id);
      if (node) node.classList.toggle('hidden', id !== viewId);
    });
  }

  function setMessage(message, isError = true) {
    const node = $('authMessage');
    if (!node) return;
    node.textContent = message;
    node.style.color = isError ? '#b42318' : '#16845b';
  }

  function toast(message) {
    const node = $('toast');
    if (!node) return;
    node.textContent = message;
    node.classList.add('show');
    window.clearTimeout(toast._timer);
    toast._timer = window.setTimeout(() => node.classList.remove('show'), 3200);
  }

  function getEmail() {
    return ($('email')?.value || '').trim().toLowerCase();
  }

  function setAuthMode(mode) {
    authMode = mode;
    document.querySelectorAll('.tab').forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.tab === mode);
    });
    $('nameLabel')?.classList.toggle('hidden', mode !== 'signup');
    if ($('authSubmit')) $('authSubmit').textContent = mode === 'signup' ? 'অ্যাকাউন্ট তৈরি করুন' : 'লগইন করুন';
    if ($('authNote')) $('authNote').textContent = mode === 'signup'
      ? 'ইমেইল নিশ্চিতকরণের বার্তা পাঠানো হবে।'
      : 'অ্যাকাউন্ট না থাকলে “নতুন অ্যাকাউন্ট” নির্বাচন করুন।';
    if ($('password')) $('password').autocomplete = mode === 'signup' ? 'new-password' : 'current-password';
    setMessage('');
  }

  function createAuthActions() {
    const note = $('authNote');
    if (!note || $('authExtraActions')) return;
    const wrapper = document.createElement('div');
    wrapper.id = 'authExtraActions';
    wrapper.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin:10px 0 4px';
    wrapper.innerHTML = `
      <button type="button" id="forgotPasswordBtn" class="ghost">পাসওয়ার্ড ভুলে গেছি</button>
      <button type="button" id="resendEmailBtn" class="ghost">Confirmation Email আবার পাঠান</button>`;
    note.insertAdjacentElement('afterend', wrapper);
    $('forgotPasswordBtn').addEventListener('click', sendPasswordRecovery);
    $('resendEmailBtn').addEventListener('click', resendConfirmation);
  }

  function injectExtraStyles() {
    if ($('appExtraStyles')) return;
    const style = document.createElement('style');
    style.id = 'appExtraStyles';
    style.textContent = `
      #authExtraActions button{font-size:12px;padding:8px 10px}
      .study-plan{margin:24px 0;background:#fff;border:1px solid #e4e9f0;border-radius:18px;padding:20px;box-shadow:0 5px 22px #152b4608}
      .study-plan-head{display:flex;gap:12px;align-items:flex-start;justify-content:space-between;flex-wrap:wrap}
      .study-plan-head h2{margin:0 0 5px}.study-plan-head p{margin:0;color:#667085;font-size:13px}
      .study-progress{height:8px;background:#edf1f6;border-radius:20px;overflow:hidden;margin:14px 0}
      .study-progress>span{display:block;height:100%;background:#16845b;width:0;transition:width .2s}
      .syllabus-note{margin:14px 0;padding:13px;border:1px solid #dce5ef;border-radius:12px;background:#f8fafc;font-size:13px;color:#344054}.syllabus-note p{margin:6px 0}.syllabus-note a{color:#175cd3}
      .org-group-title{margin:16px 0 7px;font-size:14px;color:#175cd3}
      .study-subject{border-top:1px solid #edf0f4;padding:12px 0}
      .study-subject summary{cursor:pointer;font-weight:700;color:#142d50}
      .study-topics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;padding-top:10px}
      .study-topics label{display:flex;gap:8px;align-items:flex-start;margin:0;padding:8px 10px;border:1px solid #edf0f4;border-radius:10px;font-size:13px}
      .study-topics input{width:auto;margin:3px 0 0;flex:none}
      .study-chapter{margin:9px 0 9px 12px;padding:9px 12px;border-left:3px solid #e4e9f0;background:#fafbfd;border-radius:8px}
      .study-chapter>summary{cursor:pointer;font-weight:600;color:#344563;font-size:13px}
      .org-library{margin-top:24px;padding-top:18px;border-top:2px solid #e8edf3}
      .org-library h3{margin:0 0 6px;color:#142d50}.org-library>p{font-size:13px;color:#667085}
      #orgSearch{width:100%;padding:11px;border:1px solid #d7dee8;border-radius:9px;margin:8px 0 12px}
      .org-card{border:1px solid #e4e9f0;border-radius:10px;margin:8px 0;padding:10px 12px;background:#fff}
      .org-card summary{cursor:pointer;display:flex;flex-direction:column;gap:3px}
      .org-card summary span{font-size:12px;color:#667085}
      .org-info{padding:8px 0 0;font-size:13px;color:#344054}
      .org-info p{margin:7px 0}
      .recovery-panel{max-width:460px;margin:30px auto}
      .recovery-panel p{font-size:13px;color:#667085}
      .recovery-panel button{width:100%;margin-top:12px}
      .inline-help{font-size:12px;color:#667085;margin-top:8px}
      @media(max-width:600px){.study-topics{grid-template-columns:1fr}.study-plan{padding:15px}}
    `;
    document.head.appendChild(style);
  }

  function readStudyProgress() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return stored && typeof stored === 'object' ? stored : {};
    } catch (_) {
      return {};
    }
  }

  function renderStudyPlan() {
    const appView = $('appView');
    if (!appView || $('studyPlan')) return;
    const stats = appView.querySelector('.stats');
    if (!stats) return;

    const progress = readStudyProgress();
    const section = document.createElement('section');
    section.id = 'studyPlan';
    section.className = 'study-plan';
    section.innerHTML = `
      <div class="study-plan-head">
        <div><h2>আমার বিস্তারিত পড়ার সিলেবাস</h2><p>বিষয় → অধ্যায় → সাব-টপিক। প্রতিটি সাব-টপিক শেষ হলে টিক দিন। অগ্রগতি এই ফোনের ব্রাউজারে সংরক্ষিত থাকবে; অন্য ডিভাইসে নিজে থেকে Sync হবে না।</p></div>
        <strong id="studyProgressText">০%</strong>
      </div>
      <div class="study-progress"><span id="studyProgressBar"></span></div>
      <div class="syllabus-note">
        <strong>৫০তম BCS প্রিলিমিনারি: ২০০ নম্বরের সংশোধিত মানবণ্টন</strong>
        <p>বাংলা ৩০, English ৩০, বাংলাদেশ ২৫, আন্তর্জাতিক ২৫, ভূগোল/পরিবেশ/দুর্যোগ ১০, বিজ্ঞান ১৫, ICT ১৫, গণিত ২০, মানসিক দক্ষতা ১৫, নৈতিকতা/মূল্যবোধ/সুশাসন ১৫।</p>
        <p>এই নম্বরবণ্টন ৫০তম BCS-এর প্রকাশিত সংশোধিত কাঠামোর সংবাদ-প্রতিবেদন অনুযায়ী। বিষয়ভিত্তিক চেকলিস্টটি প্রস্তুতির জন্য বিস্তৃত করা হয়েছে; একে প্রতিটি পরীক্ষার অপরিবর্তনীয় সরকারি টপিক-তালিকা মনে করবেন না। পরবর্তী BCS-এর নিজস্ব বিজ্ঞপ্তি/সিলেবাস অগ্রাধিকার পাবে।</p>
        <a href="https://en.prothomalo.com/youth/employment/lr0bgxb7cr" target="_blank" rel="noopener noreferrer">৫০তম BCS-এর মানবণ্টন সংক্রান্ত প্রতিবেদন</a> · <a href="https://bpsc.gov.bd/" target="_blank" rel="noopener noreferrer">BPSC-এর সরকারি ওয়েবসাইট</a>
      </div>
      <div id="studySubjects"></div>
      <div class="org-library">
        <h3>আন্তর্জাতিক সংগঠন: বাংলা ও English তথ্যভান্ডার</h3>
        <p>সংগঠনগুলো ধরন অনুযায়ী আলাদা করা হয়েছে। প্রতিষ্ঠা ও সদর দপ্তরের তথ্য সাধারণ পরিচিতি; সদস্যসংখ্যা/বর্তমান নেতৃত্বের মতো পরিবর্তনশীল তথ্য যাচাই ছাড়া দেখানো হয় না।</p>
        <input id="orgSearch" type="search" placeholder="সংগঠনের নাম খুঁজুন (বাংলা/English)">
        <div id="orgCards"></div>
      </div>`;

    const subjectContainer = section.querySelector('#studySubjects');
    studyPlan.forEach((item, subjectIndex) => {
      const details = document.createElement('details');
      details.className = 'study-subject';
      details.open = subjectIndex === 0;
      const summary = document.createElement('summary');
      const mark = bcs50Marks[item.subject];
      summary.textContent = mark ? `${item.subject} — ${bn(mark)} নম্বর (৫০তম BCS)` : item.subject;
      details.appendChild(summary);
      item.chapters.forEach((chapter, chapterIndex) => {
        const chapterDetails = document.createElement('details');
        chapterDetails.className = 'study-chapter';
        const chapterSummary = document.createElement('summary');
        chapterSummary.textContent = chapter.title;
        chapterDetails.appendChild(chapterSummary);
        const topics = document.createElement('div');
        topics.className = 'study-topics';
        chapter.topics.forEach((topic, topicIndex) => {
          const key = `v2-${subjectIndex}-${chapterIndex}-${topicIndex}`;
          const label = document.createElement('label');
          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.checked = Boolean(progress[key]);
          checkbox.dataset.progressKey = key;
          const text = document.createElement('span');
          text.textContent = topic;
          label.append(checkbox, text);
          topics.appendChild(label);
        });
        chapterDetails.appendChild(topics);
        details.appendChild(chapterDetails);
      });
      subjectContainer.appendChild(details);
    });

    const orgCards = section.querySelector('#orgCards');
    const renderOrganizations = (query = '') => {
      orgCards.replaceChildren();
      const q = query.trim().toLocaleLowerCase();
      const filtered = organizationLibrary.filter(org => `${org.name} ${org.en} ${org.hq}`.toLocaleLowerCase().includes(q));
      const grouped = new Map();
      filtered.forEach(org => {
        const group = organizationGroup(org);
        if (!grouped.has(group)) grouped.set(group, []);
        grouped.get(group).push(org);
      });
      grouped.forEach((items, groupName) => {
        const heading = document.createElement('h4');
        heading.className = 'org-group-title';
        heading.textContent = groupName;
        orgCards.appendChild(heading);
        items.forEach(org => {
          const card = document.createElement('details');
          card.className = 'org-card';
          const summary = document.createElement('summary');
          summary.innerHTML = `<strong>${escapeHtml(org.name)}</strong><span>${escapeHtml(org.en)}</span>`;
          const body = document.createElement('div');
          body.className = 'org-info';
          body.innerHTML = `
            <p><b>প্রতিষ্ঠা:</b> ${escapeHtml(org.founded)}</p>
            <p><b>সদর দপ্তর:</b> ${escapeHtml(org.hq)}</p>
            <p><b>কাজ ও উদ্দেশ্য (বাংলা):</b> ${escapeHtml(org.purpose)}</p>
            <p><b>Purpose and functions (English):</b> ${escapeHtml(org.purposeEn)}</p>`;
          card.append(summary, body);
          orgCards.appendChild(card);
        });
      });
      if (!orgCards.children.length) orgCards.textContent = 'কোনো সংগঠন পাওয়া যায়নি।';
    };
    renderOrganizations();
    section.querySelector('#orgSearch').addEventListener('input', event => renderOrganizations(event.target.value));

    stats.insertAdjacentElement('afterend', section);
    section.addEventListener('change', (event) => {
      const checkbox = event.target.closest('input[data-progress-key]');
      if (!checkbox) return;
      const latest = readStudyProgress();
      latest[checkbox.dataset.progressKey] = checkbox.checked;
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(latest)); } catch (_) { toast('এই ডিভাইসে অগ্রগতি সংরক্ষণ করা যায়নি।'); }
      updateStudyProgress();
    });
    updateStudyProgress();
  }

  function updateStudyProgress() {
    const text = $('studyProgressText');
    const bar = $('studyProgressBar');
    if (!text || !bar) return;
    const all = $('studySubjects')?.querySelectorAll('input[type="checkbox"]') || [];
    const done = [...all].filter((checkbox) => checkbox.checked).length;
    const percent = all.length ? Math.round(done / all.length * 100) : 0;
    text.textContent = `${bn(percent)}% সম্পন্ন`;
    bar.style.width = `${percent}%`;
  }

  async function sendPasswordRecovery() {
    if (!supabaseClient) return setMessage('Supabase URL ও Publishable key ঠিকভাবে সেট করা নেই।');
    const email = getEmail();
    if (!email) return setMessage('আগে Email ঘরে আপনার ইমেইল ঠিকানা লিখুন।');
    setMessage('Password reset email পাঠানো হচ্ছে…', false);
    try {
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo: APP_REDIRECT_URL });
      if (error) throw error;
      setMessage('Password reset email পাঠানো হয়েছে। Gmail-এর সবচেয়ে নতুন ইমেইল খুলে লিংকে চাপ দিন।', false);
    } catch (error) {
      setMessage(error.message || 'Password reset email পাঠানো যায়নি।');
    }
  }

  async function resendConfirmation() {
    if (!supabaseClient) return setMessage('Supabase সংযোগ পাওয়া যাচ্ছে না।');
    const email = getEmail() || pendingSignupEmail;
    if (!email) return setMessage('আগে Email ঘরে আপনার ইমেইল ঠিকানা লিখুন।');
    setMessage('Confirmation email পাঠানো হচ্ছে…', false);
    try {
      const { error } = await supabaseClient.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: APP_REDIRECT_URL }
      });
      if (error) throw error;
      setMessage('নতুন Confirmation Email পাঠানো হয়েছে। Gmail-এর Inbox ও Spam ফোল্ডার দেখুন।', false);
    } catch (error) {
      setMessage(error.message || 'Confirmation email পাঠানো যায়নি।');
    }
  }

  function showPasswordUpdate() {
    recoveryMode = true;
    show('authView');
    const authPanel = document.querySelector('#authView .auth-panel');
    if (authPanel) authPanel.classList.add('hidden');

    let panel = $('passwordRecoveryPanel');
    if (!panel) {
      panel = document.createElement('section');
      panel.id = 'passwordRecoveryPanel';
      panel.className = 'panel recovery-panel';
      panel.innerHTML = `
        <h2>নতুন পাসওয়ার্ড সেট করুন</h2>
        <p>আপনার অ্যাকাউন্টের জন্য নতুন পাসওয়ার্ড দিন। এটি Supabase Database Password বা Gmail Password নয়।</p>
        <form id="newPasswordForm">
          <label>নতুন পাসওয়ার্ড<input id="newPassword" type="password" minlength="8" required autocomplete="new-password" placeholder="কমপক্ষে ৮ অক্ষর"></label>
          <label>পাসওয়ার্ড আবার লিখুন<input id="confirmNewPassword" type="password" minlength="8" required autocomplete="new-password" placeholder="একই পাসওয়ার্ড আবার লিখুন"></label>
          <button class="primary" type="submit">নতুন পাসওয়ার্ড সংরক্ষণ করুন</button>
        </form>
        <p id="recoveryMessage" role="status" class="inline-help"></p>`;
      $('authView').appendChild(panel);
      $('newPasswordForm').addEventListener('submit', updatePassword);
    }
    panel.classList.remove('hidden');
  }

  async function updatePassword(event) {
    event.preventDefault();
    const password = $('newPassword').value;
    const confirmation = $('confirmNewPassword').value;
    const message = $('recoveryMessage');
    if (password.length < 8) { message.textContent = 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।'; return; }
    if (password !== confirmation) { message.textContent = 'দুটি পাসওয়ার্ড এক হয়নি। আবার লিখুন।'; return; }
    if (!supabaseClient) { message.textContent = 'Supabase সংযোগ পাওয়া যাচ্ছে না।'; return; }
    message.textContent = 'পাসওয়ার্ড সংরক্ষণ করা হচ্ছে…';
    try {
      const { error } = await supabaseClient.auth.updateUser({ password });
      if (error) throw error;
      message.textContent = 'নতুন পাসওয়ার্ড সংরক্ষিত হয়েছে। এখন নতুন পাসওয়ার্ড দিয়ে লগইন করুন।';
      await supabaseClient.auth.signOut();
      recoveryMode = false;
      $('passwordRecoveryPanel')?.classList.add('hidden');
      document.querySelector('#authView .auth-panel')?.classList.remove('hidden');
      setAuthMode('login');
      setMessage('পাসওয়ার্ড পরিবর্তন হয়েছে। নতুন পাসওয়ার্ড দিয়ে লগইন করুন।', false);
    } catch (error) {
      message.textContent = error.message || 'পাসওয়ার্ড পরিবর্তন করা যায়নি। নতুন Recovery Email চেয়ে চেষ্টা করুন।';
    }
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    setMessage('');
    if (!supabaseClient) return setMessage('Supabase সংযোগ নেই। config.js-এ Project URL ও Publishable key পরীক্ষা করুন।');

    const email = getEmail();
    const password = $('password').value;
    const fullName = $('fullName')?.value.trim() || '';
    if (!email || !password) return setMessage('ইমেইল ও পাসওয়ার্ড লিখুন।');

    $('authSubmit').disabled = true;
    $('authSubmit').textContent = 'অপেক্ষা করুন…';
    try {
      if (authMode === 'signup') {
        const { data, error } = await supabaseClient.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: APP_REDIRECT_URL
          }
        });
        if (error) throw error;
        pendingSignupEmail = email;
        if (data.session && data.user) {
          await enterDashboard(data.user);
        } else {
          setMessage('অ্যাকাউন্ট তৈরি হয়েছে। Gmail-এ নতুন Confirmation Email খুলে নিশ্চিত করুন। প্রয়োজনে নিচের Resend বাটন ব্যবহার করুন।', false);
        }
      } else {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.session && data.user) await enterDashboard(data.user);
        else setMessage('লগইন সম্পন্ন হয়নি। ইমেইল নিশ্চিত করুন।');
      }
    } catch (error) {
      const message = error.message || 'অনুরোধ সম্পন্ন হয়নি।';
      if (/invalid login credentials/i.test(message)) {
        setMessage('ইমেইল বা পাসওয়ার্ড মেলেনি। Email ঘরে ঠিকানা লিখে “পাসওয়ার্ড ভুলে গেছি” চাপুন।');
      } else if (/email not confirmed/i.test(message)) {
        pendingSignupEmail = email;
        setMessage('আপনার ইমেইল এখনো নিশ্চিত হয়নি। নতুন Confirmation Email পাঠাতে নিচের বাটন চাপুন।');
      } else {
        setMessage(message);
      }
    } finally {
      $('authSubmit').disabled = false;
      $('authSubmit').textContent = authMode === 'signup' ? 'অ্যাকাউন্ট তৈরি করুন' : 'লগইন করুন';
    }
  }

  async function enterDashboard(user) {
    currentUser = user;
    recoveryMode = false;
    $('userName').textContent = user.user_metadata?.full_name || user.email?.split('@')[0] || 'শিক্ষার্থী';
    show('appView');
    renderStudyPlan();
    await loadStats();
  }

  async function loadStats() {
    if (!supabaseClient || !currentUser) return;
    const { data, error } = await supabaseClient
      .from('attempts')
      .select('score,total,created_at')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      toast('ফলাফল লোড হয়নি। attempts টেবিল ও RLS নীতি পরীক্ষা করতে হবে।');
      return;
    }

    const rows = data || [];
    $('testCount').textContent = bn(rows.length);
    const percentages = rows.filter((row) => Number(row.total) > 0)
      .map((row) => Math.round(Number(row.score) / Number(row.total) * 100));
    const average = percentages.length ? Math.round(percentages.reduce((sum, value) => sum + value, 0) / percentages.length) : 0;
    $('avgScore').textContent = `${bn(average)}%`;
    $('bestScore').textContent = `${bn(percentages.length ? Math.max(...percentages) : 0)}%`;

    const history = $('history');
    history.replaceChildren();
    if (!rows.length) {
      const p = document.createElement('p');
      p.className = 'muted';
      p.textContent = 'এখনো কোনো পরীক্ষা দেওয়া হয়নি।';
      history.appendChild(p);
      return;
    }
    rows.slice(0, 8).forEach((row) => {
      const item = document.createElement('div');
      item.className = 'history-item';
      const date = document.createElement('span');
      date.textContent = new Date(row.created_at).toLocaleDateString('bn-BD');
      const score = document.createElement('b');
      const percent = Number(row.total) ? Math.round(Number(row.score) / Number(row.total) * 100) : 0;
      score.textContent = `${bn(row.score)}/${bn(row.total)} (${bn(percent)}%)`;
      item.append(date, score);
      history.appendChild(item);
    });
  }

  function shuffle(items) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function startTest(category) {
    const available = category === 'Subject'
      ? questionBank
      : questionBank.filter((question) => question.categories.includes(category));
    quizQuestions = shuffle(available).slice(0, 10);
    if (!quizQuestions.length) return toast('এই বিভাগের প্রশ্ন এখনো যোগ করা হয়নি।');

    quizAnswers = {};
    questionIndex = 0;
    secondsLeft = TEST_SECONDS;
    quizFinished = false;
    latestResult = null;
    $('quizCategory').textContent = ({ BCS: 'BCS প্রস্তুতি', Bank: 'ব্যাংক নিয়োগ', Govt: 'মন্ত্রণালয় ও অধিদপ্তর', Subject: 'বিষয়ভিত্তিক অনুশীলন' })[category] || 'অনুশীলন পরীক্ষা';
    show('quizView');
    renderQuestion();
    updateTimer();
    window.clearInterval(timerId);
    timerId = window.setInterval(() => {
      secondsLeft -= 1;
      updateTimer();
      if (secondsLeft <= 0) finishTest();
    }, 1000);
  }

  function updateTimer() {
    const minutes = Math.floor(Math.max(0, secondsLeft) / 60);
    const seconds = Math.max(0, secondsLeft) % 60;
    $('timer').textContent = `${bn(minutes)}:${bn(String(seconds).padStart(2, '0'))}`;
  }

  function renderQuestion() {
    const question = quizQuestions[questionIndex];
    $('questionNumber').textContent = `প্রশ্ন ${bn(questionIndex + 1)}/${bn(quizQuestions.length)}`;
    $('questionText').textContent = question.q;
    $('progressBar').style.width = `${(questionIndex + 1) / quizQuestions.length * 100}%`;
    const options = $('options');
    options.replaceChildren();

    question.options.forEach((option, optionIndex) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `option${quizAnswers[questionIndex] === optionIndex ? ' selected' : ''}`;
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'quiz-option';
      radio.checked = quizAnswers[questionIndex] === optionIndex;
      radio.tabIndex = -1;
      const label = document.createElement('span');
      label.textContent = `${LETTERS[optionIndex]}. ${option}`;
      button.append(radio, label);
      button.addEventListener('click', () => {
        quizAnswers[questionIndex] = optionIndex;
        renderQuestion();
      });
      options.appendChild(button);
    });

    $('prevQuestion').disabled = questionIndex === 0;
    $('nextQuestion').classList.toggle('hidden', questionIndex === quizQuestions.length - 1);
    $('submitQuiz').classList.toggle('hidden', questionIndex !== quizQuestions.length - 1);
  }

  function moveQuestion(step) {
    const next = questionIndex + step;
    if (next < 0 || next >= quizQuestions.length) return;
    questionIndex = next;
    renderQuestion();
  }

  async function finishTest() {
    if (quizFinished) return;
    quizFinished = true;
    window.clearInterval(timerId);
    const score = quizQuestions.reduce((sum, question, index) => sum + (quizAnswers[index] === question.answer ? 1 : 0), 0);
    latestResult = { score, total: quizQuestions.length, questions: [...quizQuestions], answers: { ...quizAnswers } };

    $('score').textContent = bn(score);
    $('resultText').textContent = score >= 8 ? 'চমৎকার প্রস্তুতি!' : score >= 5 ? 'ভালো চেষ্টা, আরও অনুশীলন করো।' : 'নিয়মিত অনুশীলন চালিয়ে যাও।';
    $('resultSummary').textContent = `সঠিক উত্তর ${bn(score)}টি · ভুল/অনুত্তরিত ${bn(quizQuestions.length - score)}টি`;
    $('reviewList').replaceChildren();
    show('resultView');

    if (supabaseClient && currentUser) {
      const details = quizQuestions.map((question, index) => ({
        question: question.q,
        subject: question.subject,
        selected: quizAnswers[index] ?? null,
        correct: question.answer
      }));
      const { error } = await supabaseClient.from('attempts').insert({
        user_id: currentUser.id,
        score,
        total: quizQuestions.length,
        details
      });
      if (error) toast(`ফলাফল সংরক্ষণ হয়নি: ${error.message}`);
      else await loadStats();
    }
  }

  function showReview() {
    if (!latestResult) return;
    const list = $('reviewList');
    list.replaceChildren();
    latestResult.questions.forEach((question, index) => {
      const panel = document.createElement('div');
      panel.className = 'panel review-item';
      const heading = document.createElement('h3');
      heading.textContent = `${bn(index + 1)}. ${question.q}`;
      const userAnswer = document.createElement('p');
      userAnswer.className = latestResult.answers[index] === question.answer ? 'correct' : 'wrong';
      userAnswer.textContent = `তোমার উত্তর: ${latestResult.answers[index] === undefined ? 'দেওয়া হয়নি' : question.options[latestResult.answers[index]]}`;
      const correctAnswer = document.createElement('p');
      correctAnswer.className = 'correct';
      correctAnswer.textContent = `সঠিক উত্তর: ${question.options[question.answer]}`;
      const explanation = document.createElement('p');
      explanation.className = 'muted';
      explanation.textContent = `ব্যাখ্যা: ${question.explain}`;
      panel.append(heading, userAnswer, correctAnswer, explanation);
      list.appendChild(panel);
    });
    list.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function logout() {
    window.clearInterval(timerId);
    if (supabaseClient) {
      const { error } = await supabaseClient.auth.signOut();
      if (error) toast('লগআউট সম্পন্ন হয়নি। আবার চেষ্টা করুন।');
    }
    currentUser = null;
    show('authView');
  }

  function handleRedirectErrors() {
    const params = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const errorCode = params.get('error_code') || hash.get('error_code');
    const description = params.get('error_description') || hash.get('error_description');
    if (errorCode === 'otp_expired') {
      setMessage('এই ইমেইল লিংকের মেয়াদ শেষ হয়েছে বা এটি আগেই ব্যবহার হয়েছে। Login পেজে Email লিখে “পাসওয়ার্ড ভুলে গেছি” চাপুন এবং নতুন লিংক ব্যবহার করুন।');
    } else if (description) {
      setMessage(decodeURIComponent(description.replace(/\+/g, ' ')));
    }
  }

  function attachEvents() {
    document.querySelectorAll('.tab').forEach((tab) => tab.addEventListener('click', () => setAuthMode(tab.dataset.tab)));
    $('authForm')?.addEventListener('submit', handleAuthSubmit);
    $('prevQuestion')?.addEventListener('click', () => moveQuestion(-1));
    $('nextQuestion')?.addEventListener('click', () => moveQuestion(1));
    $('submitQuiz')?.addEventListener('click', finishTest);
    $('quitQuiz')?.addEventListener('click', () => {
      if (window.confirm('পরীক্ষা বাতিল করে ড্যাশবোর্ডে ফিরবেন?')) {
        window.clearInterval(timerId);
        show('appView');
      }
    });
    $('reviewBtn')?.addEventListener('click', showReview);
    $('dashboardBtn')?.addEventListener('click', () => show('appView'));
    $('startTest')?.addEventListener('click', () => startTest('BCS'));
    document.querySelectorAll('.category').forEach((button) => {
      button.addEventListener('click', () => startTest(button.dataset.category));
    });
    $('logoutBtn')?.addEventListener('click', logout);
    $('installBtn')?.addEventListener('click', async () => {
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      $('installBtn').classList.add('hidden');
    });
  }

  function initializeAuthListener() {
    if (!supabaseClient) {
      setMessage('অ্যাপের Supabase সংযোগ পাওয়া যায়নি। config.js-এ URL ও Publishable key পরীক্ষা করুন।');
      return;
    }

    supabaseClient.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        showPasswordUpdate();
      } else if (event === 'SIGNED_IN' && session?.user && !recoveryMode) {
        // Defer Supabase queries until the auth callback has completed.
        window.setTimeout(() => enterDashboard(session.user), 0);
      } else if (event === 'SIGNED_OUT') {
        currentUser = null;
      }
    });

    supabaseClient.auth.getSession().then(({ data, error }) => {
      if (error) return;
      if (data.session?.user && !recoveryMode) enterDashboard(data.session.user);
    }).catch(() => setMessage('সেশন যাচাই করা যায়নি। আবার Login করুন।'));
  }

  function initialize() {
    injectExtraStyles();
    createAuthActions();
    attachEvents();
    if ($('year')) $('year').textContent = new Date().getFullYear();
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
    }
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      deferredInstallPrompt = event;
      $('installBtn')?.classList.remove('hidden');
    });
    handleRedirectErrors();
    initializeAuthListener();
  }

  initialize();
})();
