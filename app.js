'use strict';

const $ = (id) => document.getElementById(id);
const cfg = window.APP_CONFIG || {};
const hasSupabaseConfig = Boolean(
  typeof cfg.SUPABASE_URL === 'string' && cfg.SUPABASE_URL.startsWith('https://') &&
  typeof cfg.SUPABASE_ANON_KEY === 'string' && cfg.SUPABASE_ANON_KEY.length > 20 &&
  !cfg.SUPABASE_URL.includes('YOUR_') && !cfg.SUPABASE_ANON_KEY.includes('YOUR_')
);
const sb = hasSupabaseConfig && window.supabase
  ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY)
  : null;

const bn = (value) => String(value).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[Number(d)]);
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[ch]));
const STORAGE = {
  photo: 'mahbub-bcs-profile-photo-v1',
  daily: 'mahbub-bcs-daily-check-v1',
  topics: 'mahbub-bcs-topic-progress-v1',
  attempts: 'mahbub-bcs-local-attempts-v1'
};

let authMode = 'login';
let currentUser = null;
let deferredInstallPrompt = null;
let selectedExamFolder = 'BCS';
let selectedSubjectId = null;
let mockQuestions = [];
let mockAnswers = {};
let mockIndex = 0;
let mockSeconds = 600;
let mockTimerId = null;

const subjects = [
  {
    id: 'bangla', title: 'Bangla', bn: 'বাংলা ভাষা ও সাহিত্য', icon: 'অ', color: 'blue',
    description: 'ব্যাকরণ, ভাষা, সাহিত্য, লেখক ও রচনা।',
    topics: [
      ['বাংলা ভাষা ও ব্যাকরণ', ['ধ্বনি ও বর্ণ; উচ্চারণ ও বানান', 'শব্দ, পদ, প্রকৃতি ও প্রত্যয়', 'সন্ধি, সমাস, উপসর্গ ও অনুসর্গ', 'কারক, বিভক্তি, বাচ্য ও উক্তি', 'বাক্য, বাক্যশুদ্ধি ও বিরামচিহ্ন', 'সমার্থক, বিপরীতার্থক, এককথায় প্রকাশ', 'বাগধারা, প্রবাদ-প্রবচন ও পরিভাষা']],
      ['বাংলা সাহিত্যের ইতিহাস', ['প্রাচীন যুগ ও চর্যাপদ', 'মধ্যযুগ: শ্রীকৃষ্ণকীর্তন ও মঙ্গলকাব্য', 'বৈষ্ণব পদাবলি, অনুবাদ সাহিত্য ও মুসলিম সাহিত্য', 'আধুনিক যুগের সূচনা ও উনিশ শতক', 'বিশ শতক ও সমকালীন সাহিত্য']],
      ['সাহিত্যিক ও সাহিত্যকর্ম', ['কবি, ঔপন্যাসিক, নাট্যকার ও প্রাবন্ধিক', 'কাব্যগ্রন্থ, উপন্যাস, নাটক ও ছোটগল্প', 'সাহিত্য পুরস্কার ও সাময়িকপত্র', 'মুক্তিযুদ্ধভিত্তিক সাহিত্য ও ভাষা আন্দোলনভিত্তিক সাহিত্য']],
      ['লিখিত বাংলা', ['সারাংশ ও সারমর্ম', 'ভাবসম্প্রসারণ', 'রচনা ও প্রবন্ধ', 'পত্র, আবেদন ও প্রতিবেদন', 'অনুবাদ ও অনুচ্ছেদ']]
    ]
  },
  {
    id: 'english', title: 'English', bn: 'ইংরেজি ভাষা ও সাহিত্য', icon: 'En', color: 'purple',
    description: 'Grammar, vocabulary, literature and writing.',
    topics: [
      ['Grammar', ['Parts of Speech', 'Noun, Pronoun, Adjective, Verb and Adverb', 'Tense, Voice and Narration', 'Subject-Verb Agreement', 'Article, Preposition and Conjunction', 'Right Form of Verbs', 'Gerund, Participle and Infinitive', 'Clause, Phrase and Sentence Transformation', 'Conditionals, Modifiers and Parallelism', 'Correction, Punctuation and Sentence Completion']],
      ['Vocabulary', ['Synonyms and Antonyms', 'Idioms and Phrases', 'One-word Substitution', 'Spelling and Common Errors', 'Appropriate Prepositions', 'Analogy and Word Meaning']],
      ['Reading and Writing', ['Reading Comprehension', 'Translation: Bangla to English and English to Bangla', 'Precis and Summary', 'Paragraph, Essay and Report', 'Formal Letter and Application']],
      ['English Literature', ['Literary Periods and Major Movements', 'Poets, Authors and Dramatists', 'Major Works and Characters', 'Literary Terms and Awards']]
    ]
  },
  {
    id: 'math', title: 'Mathematics', bn: 'গাণিতিক যুক্তি', icon: '∑', color: 'green',
    description: 'Arithmetic, algebra, geometry and practical problem solving.',
    topics: [
      ['Arithmetic', ['Number system, LCM and GCD', 'Fraction, decimal and simplification', 'Ratio, proportion and variation', 'Percentage', 'Profit, loss and discount', 'Average and mixture', 'Simple and compound interest', 'Time and work; pipes and cisterns', 'Speed, time and distance; trains and boats', 'Age, partnership and unitary method']],
      ['Algebra', ['Algebraic expressions and identities', 'Linear equations and simultaneous equations', 'Quadratic equations', 'Indices, surds and logarithms', 'Sequences and series', 'Inequalities and functions']],
      ['Geometry and Mensuration', ['Lines, angles and triangles', 'Quadrilaterals and polygons', 'Circle and related theorems', 'Perimeter, area and volume', 'Surface area of 3D figures']],
      ['Statistics and Probability', ['Data, tables and graphs', 'Mean, median and mode', 'Range and basic dispersion', 'Basic probability and counting']]
    ]
  },
  {
    id: 'mental', title: 'Mental Ability', bn: 'মানসিক দক্ষতা ও বিশ্লেষণী ক্ষমতা', icon: '◇', color: 'orange',
    description: 'Verbal, numerical, analytical and non-verbal reasoning.',
    topics: [
      ['Verbal Reasoning', ['Word and letter series', 'Analogy and classification', 'Coding-decoding', 'Direction and distance', 'Blood relations', 'Ranking and order', 'Statement and conclusion', 'Syllogism and logical deduction']],
      ['Numerical Reasoning', ['Number series', 'Missing numbers', 'Mathematical operations', 'Data interpretation', 'Basic quantitative comparison']],
      ['Analytical and Non-verbal Reasoning', ['Arrangement and scheduling', 'Pattern and figure series', 'Mirror and water images', 'Paper folding and cutting', 'Shape classification', 'Cause and effect']]
    ]
  },
  {
    id: 'bangladesh', title: 'Bangladesh Affairs', bn: 'বাংলাদেশ বিষয়াবলি', icon: 'BD', color: 'red',
    description: 'History, constitution, geography, economy and governance.',
    topics: [
      ['History and Heritage', ['Ancient Bengal and archaeological heritage', 'Sultanate and Mughal Bengal', 'British rule and reform movements', 'Language Movement 1952', 'Six-Point Movement and mass uprisings', 'Liberation War 1971: background, sectors and events', 'Post-independence history and national milestones']],
      ['Constitution and Government', ['Constitutional history and key features', 'Fundamental principles and fundamental rights', 'State organs and separation of powers', 'President, Prime Minister and Cabinet', 'Parliament, law-making and elections', 'Judiciary and constitutional bodies', 'Local government and public administration']],
      ['Geography, Society and Culture', ['Location, boundaries and administrative divisions', 'Rivers, landforms and natural resources', 'Climate, population and demographic indicators', 'Ethnic communities, languages and cultural heritage', 'Education, health and social development']],
      ['Economy and Development', ['Economic sectors and national income', 'Budget, revenue and public expenditure', 'Trade, exports, imports and remittances', 'Agriculture, industry and services', 'Development plans, poverty and SDGs', 'Banking, monetary policy and financial inclusion']],
      ['National and Current Affairs', ['National institutions and important offices', 'National awards, days and events', 'Infrastructure and mega projects', 'Recent national developments: source and date-based notes']]
    ]
  },
  {
    id: 'international', title: 'International Affairs', bn: 'আন্তর্জাতিক বিষয়াবলি', icon: '◎', color: 'cyan',
    description: 'Global organizations, diplomacy, treaties and world affairs.',
    topics: [
      ['United Nations System', ['UN Charter and principal organs', 'General Assembly and Security Council', 'ECOSOC, ICJ and Secretariat', 'UN funds, programmes and specialized agencies', 'Peacekeeping, humanitarian work and reform']],
      ['International and Regional Organizations', ['World Bank Group, IMF and WTO', 'Commonwealth, OIC and NAM', 'SAARC, ASEAN, BIMSTEC and EU', 'AU, Arab League and other regional bodies', 'Headquarters, membership, mandate and leadership (dated facts)']],
      ['Treaties and Global Conventions', ['Climate agreements and COP process', 'Human rights declarations and conventions', 'Law of the Sea and international law', 'Arms control and non-proliferation treaties', 'Trade, migration and refugee frameworks']],
      ['World Politics and Economy', ['Countries, capitals, currencies and strategic regions', 'Geopolitics and diplomatic relations', 'International trade and global institutions', 'Major conflicts and peace processes (date-based)', 'Global indices and development reports']],
      ['Global Development', ['Sustainable Development Goals', 'Climate change and biodiversity', 'Global health and food security', 'Technology, energy and demographic trends']]
    ]
  },
  {
    id: 'science', title: 'General Science', bn: 'সাধারণ বিজ্ঞান', icon: '⚛', color: 'teal',
    description: 'Physics, chemistry, biology and everyday science.',
    topics: [
      ['Physics', ['Measurement and units', 'Motion, force and Newton’s laws', 'Work, energy and power', 'Heat, temperature and thermodynamics', 'Light, sound and waves', 'Electricity, magnetism and electronics']],
      ['Chemistry', ['Structure of atom and periodic table', 'Elements, compounds and mixtures', 'Chemical bonds and reactions', 'Acids, bases and salts', 'Organic chemistry and polymers', 'Metals, non-metals and everyday chemicals']],
      ['Biology', ['Cell, tissue and organ systems', 'Human physiology and nutrition', 'Genetics, DNA and evolution', 'Plant physiology and reproduction', 'Microorganisms and diseases', 'Ecology and biodiversity']],
      ['Applied Science', ['Health, hygiene and public health', 'Food, vitamins and deficiency diseases', 'Scientific instruments and discoveries', 'Renewable energy and modern technology']]
    ]
  },
  {
    id: 'ict', title: 'Computer & ICT', bn: 'কম্পিউটার ও তথ্যপ্রযুক্তি', icon: '⌘', color: 'indigo',
    description: 'Computer fundamentals, networks, cybersecurity and digital services.',
    topics: [
      ['Computer Fundamentals', ['Hardware and software', 'Input, output and storage devices', 'Number systems and data representation', 'Operating systems and application software', 'Database and information systems']],
      ['Networks and Internet', ['LAN, WAN and network devices', 'Internet, web, browser and search', 'IP, DNS, URL and protocols', 'Cloud computing and web services']],
      ['Cybersecurity and Digital Bangladesh', ['Privacy, authentication and safe browsing', 'Malware, phishing and cyber hygiene', 'Encryption and digital signatures', 'E-governance and public digital services', 'Digital economy and emerging technologies']],
      ['Programming and Office Tools', ['Algorithms and flowcharts', 'Basic programming concepts', 'Word processing and spreadsheets', 'Presentation and data handling']]
    ]
  },
  {
    id: 'geography', title: 'Geography & Environment', bn: 'ভূগোল, পরিবেশ ও দুর্যোগ ব্যবস্থাপনা', icon: '◉', color: 'lime',
    description: 'Physical and human geography, resources, climate and disaster response.',
    topics: [
      ['Physical Geography', ['Earth structure and landforms', 'Atmosphere, weather and climate', 'Rivers, oceans and hydrological cycle', 'Soil, rocks and natural processes']],
      ['Human and Economic Geography', ['Population and migration', 'Settlement and urbanization', 'Resources, agriculture and industry', 'Regional geography of South Asia and the world']],
      ['Environment and Climate', ['Ecosystem and biodiversity', 'Pollution and waste management', 'Climate change, adaptation and mitigation', 'Environmental laws and global agreements']],
      ['Disaster Management', ['Flood, cyclone, drought, earthquake and landslide', 'Risk reduction and early warning', 'Preparedness, response and recovery', 'Disaster management institutions']]
    ]
  },
  {
    id: 'ethics', title: 'Ethics & Good Governance', bn: 'নৈতিকতা, মূল্যবোধ ও সুশাসন', icon: '⚖', color: 'gold',
    description: 'Ethics, integrity, accountability, transparency and public service.',
    topics: [
      ['Ethics and Values', ['Personal, social and professional values', 'Moral reasoning and ethical decision-making', 'Public service values and code of conduct', 'Conflict of interest and integrity']],
      ['Good Governance', ['Rule of law and participation', 'Transparency and accountability', 'Responsiveness and effectiveness', 'Equity, inclusion and consensus', 'Anti-corruption and social accountability']],
      ['Public Administration', ['Administrative structure of Bangladesh', 'Civil service and public policy', 'Citizen charter and grievance redress', 'Right to Information and service delivery', 'E-governance and innovation']]
    ]
  },
  {
    id: 'economics', title: 'Economics', bn: 'অর্থনীতি', icon: '৳', color: 'green',
    description: 'Microeconomics, macroeconomics, public finance and Bangladesh economy.',
    topics: [
      ['Microeconomics', ['Scarcity, choice and opportunity cost', 'Demand, supply and market equilibrium', 'Elasticity and consumer behaviour', 'Production, cost and revenue', 'Market structures and price determination']],
      ['Macroeconomics', ['National income and its measurement', 'Consumption, saving and investment', 'Inflation, unemployment and business cycle', 'Money, banking and monetary policy', 'Fiscal policy and public finance']],
      ['Bangladesh Economy', ['Economic structure and development indicators', 'Budget, taxation and public debt', 'Agriculture, industry and services', 'Trade, balance of payments and remittances', 'Poverty, inequality and inclusive development']]
    ]
  },
  {
    id: 'banking', title: 'Banking & Finance', bn: 'ব্যাংকিং, ফিন্যান্স ও হিসাববিজ্ঞান', icon: '৳', color: 'navy',
    description: 'Core banking, financial markets, accounting and bank recruitment topics.',
    topics: [
      ['Banking Fundamentals', ['Functions and types of banks', 'Central bank and monetary policy', 'Deposit, loan and credit products', 'Negotiable instruments and payment systems', 'KYC, AML and compliance concepts']],
      ['Finance and Markets', ['Time value of money and basic valuation', 'Money market and capital market', 'Shares, bonds and securities', 'Risk management and financial inclusion', 'Foreign exchange and international banking']],
      ['Accounting', ['Accounting principles and concepts', 'Journal, ledger and trial balance', 'Financial statements and ratios', 'Depreciation and inventory', 'Bank reconciliation']],
      ['Banking in Bangladesh', ['Bangladesh Bank and scheduled banks', 'Banking regulation and supervision', 'Digital financial services', 'NPL, provisioning and risk concepts']]
    ]
  },
  {
    id: 'admin', title: 'Government & Post-specific', bn: 'সরকারি চাকরি ও পদভিত্তিক প্রস্তুতি', icon: '▤', color: 'slate',
    description: 'Common public recruitment preparation; always follow the exact circular.',
    topics: [
      ['Common Recruitment Topics', ['বাংলা, English, mathematics and general knowledge', 'Computer and ICT', 'Constitution and public administration', 'Written composition and analytical questions', 'Viva preparation and communication']],
      ['Post-specific Preparation', ['Read the latest recruitment circular and official syllabus', 'List subject requirements for the exact post', 'Study relevant acts, rules and departmental functions', 'Prepare technical/professional subject content', 'Track exam notices, admit cards and results from official sources']]
    ]
  }
];

const examFolders = [
  { id: 'BCS', title: 'BCS Previous Questions', bn: 'বিসিএস বিগত বছরের প্রশ্ন', icon: '📘', note: 'প্রিলিমিনারি, লিখিত ও ভাইভা—পরীক্ষা ও ধাপ অনুযায়ী।' },
  { id: 'Bank', title: 'Bank Previous Questions', bn: 'ব্যাংক বিগত বছরের প্রশ্ন', icon: '🏦', note: 'ব্যাংক/আর্থিক প্রতিষ্ঠান, পদ ও পরীক্ষার সাল অনুযায়ী।' },
  { id: 'Govt', title: 'Government Job Questions', bn: 'সরকারি চাকরির বিগত বছরের প্রশ্ন', icon: '🏛️', note: 'মন্ত্রণালয়, অধিদপ্তর, কমিশন ও অন্যান্য সরকারি নিয়োগ।' }
];

const dailyBlocks = [
  { id: 'bangla', time: '১ ঘণ্টা', title: 'বাংলা', detail: 'ব্যাকরণ, সাহিত্য বা লিখিত অনুশীলন' },
  { id: 'english', time: '১ ঘণ্টা', title: 'English', detail: 'Grammar, vocabulary and reading/writing' },
  { id: 'math', time: '১ ঘণ্টা', title: 'গণিত ও মানসিক দক্ষতা', detail: '৩০ মিনিট গণিত + ৩০ মিনিট reasoning' },
  { id: 'bd', time: '১ ঘণ্টা', title: 'বাংলাদেশ বিষয়াবলি', detail: 'ইতিহাস, সংবিধান, ভূগোল, অর্থনীতি' },
  { id: 'world', time: '১ ঘণ্টা', title: 'আন্তর্জাতিক / বিজ্ঞান / ICT', detail: 'দিনভেদে পালাক্রমে বিষয় পড়ুন' },
  { id: 'practice', time: '১ ঘণ্টা', title: 'প্রশ্ন, মডেল টেস্ট ও রিভিশন', detail: 'যাচাইকৃত বিগত প্রশ্ন, অনুশীলন ও ভুলের খাতা' }
];

const weeklyItems = [
  ['Monday', 'মূল সিলেবাস', 'বাংলা, English, গণিত, বাংলাদেশ, আন্তর্জাতিক, অনুশীলন'],
  ['Tuesday', 'বিজ্ঞান ও ICT', 'দৈনিক ৬টি ব্লক; ৫ম ব্লকে বিজ্ঞান ও ICT-তে বেশি সময়'],
  ['Wednesday', 'ব্যাংক ও অর্থনীতি', 'গণিত, অর্থনীতি, ব্যাংকিং, English ও সাধারণ বিষয়'],
  ['Thursday', 'সরকারি চাকরি', 'সংবিধান, প্রশাসন, নৈতিকতা ও পদভিত্তিক বিজ্ঞপ্তি'],
  ['Friday', 'দুর্বল বিষয়', 'সপ্তাহে চিহ্নিত দুর্বল টপিকগুলো পুনরায় পড়ুন'],
  ['Saturday', 'প্রশ্ন অনুশীলন', 'বিষয়ভিত্তিক পরীক্ষা, লিখিত অনুশীলন ও ভুল বিশ্লেষণ'],
  ['Sunday', 'Weekly Review', '২ ঘণ্টা মডেল টেস্ট + ২ ঘণ্টা ভুল বিশ্লেষণ + ২ ঘণ্টা রিভিশন']
];

const monthlyGoals = [
  ['Month 1 · Foundation I', 'বাংলা ব্যাকরণ, English grammar-এর ভিত্তি, পাটিগণিত, প্রাচীন ও মধ্যযুগের বাংলা, বাংলাদেশের ভূগোল, সাধারণ বিজ্ঞানের ভিত্তি।', 'প্রতিদিনের রুটিন স্থাপন এবং প্রতিটি বিষয়ের প্রাথমিক টপিক শেষ।'],
  ['Month 2 · Foundation II', 'বাংলা সাহিত্য, English vocabulary, শতকরা-অনুপাত-লাভক্ষতি, ভাষা আন্দোলন ও মুক্তিযুদ্ধ, সংবিধানের পরিচিতি, UN ও প্রধান আন্তর্জাতিক সংস্থার কাঠামো।', 'প্রথম দুই মাসের বিষয়ভিত্তিক ছোট পরীক্ষা।'],
  ['Month 3 · Core Completion I', 'বীজগণিত, জ্যামিতি, English sentence structure, বাংলাদেশের সরকারব্যবস্থা, আন্তর্জাতিক চুক্তি, পদার্থ ও রসায়নের গুরুত্বপূর্ণ অংশ, ICT fundamentals।', 'প্রতিটি মূল বিষয়ে প্রথম রাউন্ডের নোট সম্পন্ন।'],
  ['Month 4 · Core Completion II', 'বাংলাদেশের অর্থনীতি, বিশ্ব অর্থনীতি, জীববিজ্ঞান, ভূগোল-পরিবেশ, দুর্যোগ ব্যবস্থাপনা, নৈতিকতা ও সুশাসন, লিখিত ইংরেজি ও বাংলা।', 'সাধারণ সিলেবাসের অসমাপ্ত অংশ শনাক্ত ও শেষ করা।'],
  ['Month 5 · Applied Preparation', 'ব্যাংকিং ও ফিন্যান্স, হিসাববিজ্ঞান, মানসিক দক্ষতা, ডেটা ইন্টারপ্রিটেশন, সরকারি প্রশাসন, আন্তর্জাতিক সংস্থার তথ্য ও সাম্প্রতিক বিষয়।', 'ব্যাংক ও সরকারি চাকরির পদভিত্তিক সিলেবাস আলাদা করে ম্যাপ করা।'],
  ['Month 6 · Question Practice', 'বিগত বছরের যাচাইকৃত প্রশ্ন, বিষয়ভিত্তিক MCQ, লিখিত অনুশীলন, গণিতের সমস্যা সমাধান এবং দুর্বল অধ্যায়ের পুনরাবৃত্তি।', 'যাচাইকৃত প্রশ্ন না পাওয়া গেলে সেটি বিগত প্রশ্ন নামে ব্যবহার নয়; মূল উৎস সংগ্রহের তালিকা তৈরি।'],
  ['Month 7 · Exam Practice I', 'সময় ধরে পূর্ণাঙ্গ/বিষয়ভিত্তিক পরীক্ষা, ব্যাংক ও সরকারি চাকরির আলাদা মডেল টেস্ট, লিখিত উত্তর মূল্যায়ন ও ভুলের খাতা।', 'সপ্তাহে একাধিক পূর্ণাঙ্গ অনুশীলন এবং প্রতিটি পরীক্ষার পর বিশ্লেষণ।'],
  ['Month 8 · Exam Practice II', 'দুর্বল বিষয় সংশোধন, পুনরায় প্রশ্ন সমাধান, সাম্প্রতিক তথ্য যাচাই, ভাইভা ও লিখিতের গুরুত্বপূর্ণ অনুশীলন।', 'নিজস্ব ফলাফলের ভিত্তিতে অগ্রাধিকার বদলানো।'],
  ['Month 9 · Final Revision', 'সংক্ষিপ্ত নোট, সূত্র, সংবিধানের ধারা, গুরুত্বপূর্ণ সাহিত্য-লেখক, বিজ্ঞান ও ICT facts, ব্যাংকিং ধারণা ও মডেল টেস্ট।', 'চূড়ান্ত রিভিশন; নতুন বড় অধ্যায় শুরু না করে জানা বিষয় মজবুত করা।']
];

function showMessage(element, text, kind = '') {
  if (!element) return;
  element.textContent = text;
  element.className = `message ${kind}`.trim();
}

function toast(message) {
  const node = $('toast');
  if (!node) return;
  node.textContent = message;
  node.classList.add('show');
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => node.classList.remove('show'), 2800);
}

function setAuthMode(mode) {
  authMode = mode;
  document.querySelectorAll('.tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.tab === mode));
  $('nameLabel').classList.toggle('hidden', mode !== 'signup');
  $('authSubmit').textContent = mode === 'signup' ? 'অ্যাকাউন্ট তৈরি করুন' : 'লগইন করুন';
  $('authNote').textContent = mode === 'signup' ? 'ইমেইলে নিশ্চিতকরণ বার্তা আসতে পারে।' : 'নতুন হলে “নতুন অ্যাকাউন্ট” নির্বাচন করুন।';
  $('password').autocomplete = mode === 'signup' ? 'new-password' : 'current-password';
  showMessage($('authMessage'), '');
}

function setMainView(viewId) {
  if (viewId !== 'mockView' && $('mockQuiz') && !$('mockQuiz').classList.contains('hidden')) quitMockTest();
  document.querySelectorAll('.content-view').forEach((view) => view.classList.toggle('hidden', view.id !== viewId));
  $('topicView').classList.add('hidden');
  document.querySelectorAll('.nav-item').forEach((button) => button.classList.toggle('active', button.dataset.view === viewId));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showApp(user) {
  currentUser = user || null;
  $('authView').classList.add('hidden');
  $('resetView').classList.add('hidden');
  $('appView').classList.remove('hidden');
  $('topicView').classList.add('hidden');
  $('userName').textContent = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'শিক্ষার্থী';
  $('photoBtn').classList.remove('hidden');
  setMainView('homeView');
  restoreProfilePhoto();
  renderAll();
  loadStats();
}

function showAuth() {
  currentUser = null;
  $('appView').classList.add('hidden');
  $('resetView').classList.add('hidden');
  $('topicView').classList.add('hidden');
  $('authView').classList.remove('hidden');
  $('photoBtn').classList.add('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function loadStats() {
  if (!currentUser) return;
  let rows = [];
  if (sb) {
    try {
      const { data, error } = await sb.from('attempts').select('score,total,created_at').order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      rows = data || [];
    } catch (error) {
      // Keep the app usable even if the optional cloud attempts table is unavailable.
      console.warn('Could not load cloud test history:', error.message);
    }
  }
  try {
    const localRows = JSON.parse(localStorage.getItem(STORAGE.attempts) || '[]');
    rows = [...localRows, ...rows].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  } catch (error) { console.warn('Could not load local test history:', error); }
  $('testCount').textContent = bn(rows.length);
  const average = rows.length ? Math.round(rows.reduce((sum, row) => sum + (Number(row.score) / Math.max(1, Number(row.total)) * 100), 0) / rows.length) : 0;
  const best = rows.length ? Math.max(...rows.map((row) => Math.round(Number(row.score) / Math.max(1, Number(row.total)) * 100))) : 0;
  $('avgScore').textContent = `${bn(average)}%`;
  $('bestScore').textContent = `${bn(best)}%`;
  $('history').innerHTML = rows.length
    ? rows.slice(0, 8).map((row) => `<div class="history-row"><span>${escapeHtml(new Date(row.created_at).toLocaleDateString('bn-BD'))} · ${escapeHtml(row.category || 'Test')}</span><b>${bn(row.score)}/${bn(row.total)} (${bn(Math.round(Number(row.score) / Math.max(1, Number(row.total)) * 100))}%)</b></div>`).join('')
    : '<p class="muted">এখনো কোনো পরীক্ষা দেওয়া হয়নি।</p>';
}

function folderCard(item, kind = 'subject') {
  const isSubject = kind === 'subject';
  const title = isSubject ? item.title : item.title;
  const subtitle = isSubject ? item.bn : item.bn;
  const detail = isSubject ? `${item.topics.length} topic groups` : '2010–2026 · Year-wise archive';
  const icon = isSubject ? item.icon : item.icon;
  return `<button class="folder-card ${isSubject ? `folder-${item.color}` : 'exam-folder'}" type="button" data-${isSubject ? 'subject' : 'exam'}="${escapeHtml(item.id)}">
    <span class="folder-icon">${escapeHtml(icon)}</span><span class="folder-text"><b>${escapeHtml(title)}</b><small>${escapeHtml(subtitle)}</small><em>${escapeHtml(detail)}</em></span><span class="folder-arrow">›</span>
  </button>`;
}

function renderSubjectFolders() {
  const html = subjects.map((subject) => folderCard(subject)).join('');
  $('subjectGrid').innerHTML = html;
  $('homeSubjectGrid').innerHTML = subjects.slice(0, 8).map((subject) => folderCard(subject)).join('');
}

function renderExamFolders() {
  const html = examFolders.map((folder) => folderCard(folder, 'exam')).join('');
  $('examFolderGrid').innerHTML = html;
  $('homeExamGrid').innerHTML = html;
}

function getTopicProgress() {
  try { return JSON.parse(localStorage.getItem(STORAGE.topics) || '{}'); }
  catch { return {}; }
}

function markTopicComplete(key, checked) {
  const progress = getTopicProgress();
  progress[key] = Boolean(checked);
  localStorage.setItem(STORAGE.topics, JSON.stringify(progress));
  const button = document.querySelector(`[data-topic-check="${CSS.escape(key)}"]`);
  if (button) {
    button.classList.toggle('completed', Boolean(checked));
    button.textContent = checked ? '✓ সম্পন্ন' : 'পড়া শেষ হয়নি';
  }
  toast(checked ? 'টপিকটি সম্পন্ন হিসেবে চিহ্নিত হয়েছে।' : 'টপিকটি অসম্পন্ন করা হয়েছে।');
}

function openSubject(subjectId) {
  const subject = subjects.find((item) => item.id === subjectId);
  if (!subject) return;
  selectedSubjectId = subjectId;
  const progress = getTopicProgress();
  $('subjectDetail').classList.remove('hidden');
  $('subjectDetail').innerHTML = `
    <div class="detail-head"><div><span class="eyebrow">SUBJECT FOLDER</span><h3>${escapeHtml(subject.title)}</h3><p class="muted">${escapeHtml(subject.bn)} · ${escapeHtml(subject.description)}</p></div><button type="button" class="button button-light" id="closeSubject">বন্ধ করুন</button></div>
    <div class="topic-groups">${subject.topics.map(([topicTitle, subs], groupIndex) => `
      <details class="topic-group" open>
        <summary><span>${escapeHtml(topicTitle)}</span><small>${bn(subs.length)} subtopics</small></summary>
        <ol>${subs.map((sub, subIndex) => {
          const key = `${subject.id}:${groupIndex}:${subIndex}`;
          const done = Boolean(progress[key]);
          return `<li class="topic-line"><span>${escapeHtml(sub)}</span><button class="topic-check ${done ? 'completed' : ''}" type="button" data-topic-check="${escapeHtml(key)}">${done ? '✓ সম্পন্ন' : 'পড়া শেষ হয়নি'}</button></li>`;
        }).join('')}</ol>
      </details>`).join('')}</div>`;
  $('subjectDetail').scrollIntoView({ behavior: 'smooth', block: 'start' });
  $('closeSubject').addEventListener('click', () => $('subjectDetail').classList.add('hidden'));
  $('subjectDetail').querySelectorAll('[data-topic-check]').forEach((button) => {
    button.addEventListener('click', () => markTopicComplete(button.dataset.topicCheck, !button.classList.contains('completed')));
  });
}

function getVerifiedQuestions() {
  const data = Array.isArray(window.VERIFIED_QUESTIONS) ? window.VERIFIED_QUESTIONS : [];
  return data.filter((item) => item && examFolders.some((f) => f.id === item.category) &&
    Number.isInteger(Number(item.year)) && Number(item.year) >= 2010 && Number(item.year) <= 2026 &&
    typeof item.question === 'string' && item.question.trim() &&
    typeof item.examName === 'string' && item.examName.trim() &&
    typeof item.sourceName === 'string' && item.sourceName.trim());
}

function openExamFolder(folderId) {
  selectedExamFolder = folderId;
  const folder = examFolders.find((item) => item.id === folderId);
  if (!folder) return;
  const list = getVerifiedQuestions().filter((question) => question.category === folderId);
  const years = Array.from({ length: 17 }, (_, index) => 2026 - index);
  $('questionPanel').innerHTML = `
    <div class="detail-head"><div><span class="eyebrow">${escapeHtml(folder.title)}</span><h3>${escapeHtml(folder.bn)}</h3><p class="muted">${escapeHtml(folder.note)}</p></div></div>
    <div class="filter-row"><label>Year <select id="questionYear"><option value="all">সব সাল (২০১০–২০২৬)</option>${years.map((year) => `<option value="${year}">${bn(year)}</option>`).join('')}</select></label><label>Subject <select id="questionSubject"><option value="all">সব বিষয়</option>${[...new Set(list.map((q) => q.subject).filter(Boolean))].sort().map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('')}</select></label></div>
    <div id="questionResults" class="question-results"></div>`;
  const renderResults = () => {
    const year = $('questionYear').value;
    const subject = $('questionSubject').value;
    const filtered = list.filter((q) => (year === 'all' || Number(q.year) === Number(year)) && (subject === 'all' || q.subject === subject));
    const results = $('questionResults');
    if (!filtered.length) {
      const archives = (Array.isArray(window.QUESTION_ARCHIVES) ? window.QUESTION_ARCHIVES : [])
        .filter((item) => item && item.category === folderId && item.url && item.name);
      const archiveHtml = archives.length
        ? `<div class="archive-source-list"><h4>প্রশ্নপত্র খোঁজার উৎস</h4>${archives.map((item) =>
            `<article class="question-card"><b>${escapeHtml(item.name)}</b><p class="muted">${escapeHtml(item.coverage || '')}</p><a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">আর্কাইভ খুলুন ↗</a></article>`
          ).join('')}</div>`
        : '';
      results.innerHTML = `<div class="empty-state"><span class="empty-icon">📂</span><b>এখনো যাচাইকৃত প্রশ্ন যোগ করা হয়নি</b><p>২০১০–২০২৬ সালের প্রশ্নের জন্য নিচের উৎসগুলো দেখুন। উৎসে থাকা সব প্রশ্ন এই অ্যাপে কপি করা হয়নি; মূল প্রশ্নপত্র, উত্তর ও পুনঃপ্রকাশের অনুমতি যাচাই করে তবেই যুক্ত হবে।</p>${archiveHtml}</div>`;
      return;
    }
    results.innerHTML = filtered.slice().sort((a, b) => Number(b.year) - Number(a.year)).map((q, index) => {
      const options = Array.isArray(q.options) && q.options.length
        ? `<ol class="answer-options">${q.options.map((option, i) => `<li class="${Number.isInteger(q.correctIndex) && q.correctIndex === i ? 'is-correct' : ''}">${escapeHtml(option)}</li>`).join('')}</ol>`
        : '<p class="muted tiny">মূল প্রশ্নপত্রে অপশন পাওয়া যায়নি / প্রযোজ্য নয়।</p>';
      const answer = Number.isInteger(q.correctIndex) && Array.isArray(q.options) && q.options[q.correctIndex]
        ? escapeHtml(q.options[q.correctIndex]) : (q.answerText ? escapeHtml(q.answerText) : 'যাচাইকৃত উত্তর সংরক্ষিত নেই');
      const explanation = q.explanation ? `<p><b>ব্যাখ্যা:</b> ${escapeHtml(q.explanation)}</p>` : '<p class="muted"><b>ব্যাখ্যা:</b> নির্ভরযোগ্য ব্যাখ্যা পাওয়া যায়নি; তাই ফাঁকা রাখা হয়েছে।</p>';
      const source = q.sourceUrl ? `<a href="${escapeHtml(q.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(q.sourceName)}</a>` : escapeHtml(q.sourceName);
      return `<article class="question-card"><div class="question-meta"><span>${escapeHtml(q.examName)}</span><span>${bn(q.year)}</span><span>${escapeHtml(q.subject || 'বিষয় উল্লেখ নেই')}</span></div><h4>${bn(index + 1)}. ${escapeHtml(q.question)}</h4>${options}<p class="answer-line"><b>সঠিক উত্তর:</b> ${answer}</p>${explanation}<p class="source-line"><b>উৎস:</b> ${source}</p></article>`;
    }).join('');
  };
  $('questionYear').addEventListener('change', renderResults);
  $('questionSubject').addEventListener('change', renderResults);
  renderResults();
  $('questionPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function stopMockTimer() {
  if (mockTimerId) window.clearInterval(mockTimerId);
  mockTimerId = null;
}

function updateMockTimer() {
  const minutes = Math.floor(mockSeconds / 60);
  const seconds = mockSeconds % 60;
  $('mockTimer').textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function renderMockQuestion() {
  const q = mockQuestions[mockIndex];
  if (!q) return;
  $('mockCounter').textContent = `প্রশ্ন ${bn(mockIndex + 1)}/${bn(mockQuestions.length)}`;
  $('mockQuestion').textContent = q.question;
  $('mockProgress').style.width = `${((mockIndex + 1) / mockQuestions.length) * 100}%`;
  $('mockOptions').innerHTML = q.options.map((option, index) => `<button type="button" class="mock-option ${mockAnswers[mockIndex] === index ? 'selected' : ''}" data-mock-option="${index}"><span>${String.fromCharCode(65 + index)}.</span> ${escapeHtml(option)}</button>`).join('');
  $('mockPrev').disabled = mockIndex === 0;
  $('mockNext').classList.toggle('hidden', mockIndex === mockQuestions.length - 1);
  $('mockSubmit').classList.toggle('hidden', mockIndex !== mockQuestions.length - 1);
}

function startMockTest() {
  const pool = Array.isArray(window.PRACTICE_QUESTIONS) ? window.PRACTICE_QUESTIONS : [];
  if (pool.length < 5) { toast('এখনো পর্যাপ্ত অনুশীলনী প্রশ্ন নেই।'); return; }
  mockQuestions = pool.slice(0, 10);
  mockAnswers = {};
  mockIndex = 0;
  mockSeconds = 600;
  $('mockIntro').classList.add('hidden');
  $('mockResult').classList.add('hidden');
  $('mockQuiz').classList.remove('hidden');
  updateMockTimer();
  renderMockQuestion();
  stopMockTimer();
  mockTimerId = window.setInterval(() => {
    mockSeconds = Math.max(0, mockSeconds - 1);
    updateMockTimer();
    if (mockSeconds === 0) finishMockTest();
  }, 1000);
}

function finishMockTest() {
  stopMockTimer();
  const score = mockQuestions.reduce((sum, q, index) => sum + (mockAnswers[index] === q.correctIndex ? 1 : 0), 0);
  const row = { score, total: mockQuestions.length, category: 'Practice Mock Test', created_at: new Date().toISOString() };
  try {
    const previous = JSON.parse(localStorage.getItem(STORAGE.attempts) || '[]');
    previous.unshift(row);
    localStorage.setItem(STORAGE.attempts, JSON.stringify(previous.slice(0, 100)));
  } catch (error) { console.warn('Could not save local test result:', error); }
  $('mockQuiz').classList.add('hidden');
  $('mockResult').classList.remove('hidden');
  $('mockScore').textContent = `${bn(score)}/${bn(mockQuestions.length)}`;
  $('mockResultTitle').textContent = score >= 8 ? 'চমৎকার অনুশীলন!' : score >= 5 ? 'ভালো অগ্রগতি—আরও অনুশীলন করুন।' : 'ভুলগুলো দেখে আবার অনুশীলন করুন।';
  $('mockReview').innerHTML = mockQuestions.map((q, index) => {
    const chosen = Number.isInteger(mockAnswers[index]) ? q.options[mockAnswers[index]] : 'উত্তর দেওয়া হয়নি';
    const correct = q.options[q.correctIndex];
    const ok = mockAnswers[index] === q.correctIndex;
    return `<article class="review-item"><b>${bn(index + 1)}. ${escapeHtml(q.question)}</b><p class="${ok ? 'review-good' : 'review-wrong'}">আপনার উত্তর: ${escapeHtml(chosen)}</p><p><b>সঠিক উত্তর:</b> ${escapeHtml(correct)}</p><p class="muted">${escapeHtml(q.explanation)}</p></article>`;
  }).join('');
  loadStats();
}

function quitMockTest() {
  stopMockTimer();
  $('mockQuiz').classList.add('hidden');
  $('mockResult').classList.add('hidden');
  $('mockIntro').classList.remove('hidden');
}

function getDailyChecks() {
  try { return JSON.parse(localStorage.getItem(STORAGE.daily) || '{}'); }
  catch { return {}; }
}

function renderRoutine(container, includeChecks) {
  const todayKey = new Date().toLocaleDateString('en-CA');
  const allChecks = getDailyChecks();
  const checks = allChecks[todayKey] || {};
  container.innerHTML = dailyBlocks.map((block, index) => `
    <label class="routine-item ${checks[block.id] ? 'is-done' : ''}">
      ${includeChecks ? `<input type="checkbox" data-routine-check="${block.id}" ${checks[block.id] ? 'checked' : ''}>` : '<span class="routine-number">' + bn(index + 1) + '</span>'}
      <span class="routine-copy"><b>${escapeHtml(block.title)}</b><small>${escapeHtml(block.detail)}</small></span><strong>${escapeHtml(block.time)}</strong>
    </label>`).join('');
  if (includeChecks) {
    container.querySelectorAll('[data-routine-check]').forEach((input) => {
      input.addEventListener('change', () => {
        const current = getDailyChecks();
        const today = current[todayKey] || {};
        today[input.dataset.routineCheck] = input.checked;
        current[todayKey] = today;
        localStorage.setItem(STORAGE.daily, JSON.stringify(current));
        input.closest('.routine-item').classList.toggle('is-done', input.checked);
        updateDailyProgress();
      });
    });
  }
}

function updateDailyProgress() {
  const key = new Date().toLocaleDateString('en-CA');
  const checks = getDailyChecks()[key] || {};
  const done = dailyBlocks.filter((item) => checks[item.id]).length;
  $('dailyProgress').textContent = `আজকের অগ্রগতি: ${bn(done)} / ${bn(dailyBlocks.length)} ঘণ্টার ব্লক সম্পন্ন (${bn(Math.round(done / dailyBlocks.length * 100))}%)`;
}

function renderPlan() {
  renderRoutine($('dailyRoutine'), true);
  renderRoutine($('homeRoutine'), false);
  $('weeklyPlan').innerHTML = weeklyItems.map(([day, title, detail]) => `<article class="week-card"><span>${escapeHtml(day)}</span><b>${escapeHtml(title)}</b><p>${escapeHtml(detail)}</p><small>৬ ঘণ্টা</small></article>`).join('');
  $('monthlyPlan').innerHTML = monthlyGoals.map(([title, focus, target], index) => `<details class="month-card" ${index === 0 ? 'open' : ''}><summary><b>${escapeHtml(title)}</b><span>Month ${index + 1}</span></summary><p><b>Topics:</b> ${escapeHtml(focus)}</p><p><b>Monthly target:</b> ${escapeHtml(target)}</p></details>`).join('');
  updateDailyProgress();
}

function renderAll() {
  renderSubjectFolders();
  renderExamFolders();
  renderPlan();
}

function restoreProfilePhoto() {
  try {
    const stored = localStorage.getItem(STORAGE.photo);
    $('brandPhoto').src = stored || './assets/icon.svg';
  } catch {
    $('brandPhoto').src = './assets/icon.svg';
  }
}

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('ছবিটি পড়া যায়নি।'));
    reader.onload = () => {
      image.onerror = () => reject(new Error('ছবির ফরম্যাট সমর্থিত নয়।'));
      image.onload = () => {
        const max = 420;
        const scale = Math.min(1, max / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

async function handlePhoto(file) {
  if (!file) return;
  if (!file.type.startsWith('image/')) { toast('ছবির ফাইল নির্বাচন করুন।'); return; }
  if (file.size > 8 * 1024 * 1024) { toast('৮ MB-এর কম আকারের ছবি দিন।'); return; }
  try {
    const dataUrl = await compressImage(file);
    localStorage.setItem(STORAGE.photo, dataUrl);
    $('brandPhoto').src = dataUrl;
    toast('আপনার ছবি অ্যাপের হেডারে যুক্ত হয়েছে।');
  } catch (error) {
    toast(error.message || 'ছবি যুক্ত করা যায়নি।');
  }
}

function showResetView() {
  $('authView').classList.add('hidden');
  $('appView').classList.add('hidden');
  $('topicView').classList.add('hidden');
  $('resetView').classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function submitPasswordReset(event) {
  event.preventDefault();
  const password = $('newPassword').value;
  const confirm = $('confirmPassword').value;
  if (password.length < 8) { showMessage($('resetMessage'), 'কমপক্ষে ৮ অক্ষরের পাসওয়ার্ড দিন।', 'error'); return; }
  if (password !== confirm) { showMessage($('resetMessage'), 'দুটি পাসওয়ার্ড মিলছে না।', 'error'); return; }
  if (!sb) { showMessage($('resetMessage'), 'Supabase সংযোগ পাওয়া যায়নি।', 'error'); return; }
  $('resetSubmit').disabled = true;
  try {
    const { data, error } = await sb.auth.updateUser({ password });
    if (error) throw error;
    showMessage($('resetMessage'), 'পাসওয়ার্ড সফলভাবে আপডেট হয়েছে।', 'success');
    if (data?.user) window.setTimeout(() => showApp(data.user), 900);
  } catch (error) {
    showMessage($('resetMessage'), error.message || 'পাসওয়ার্ড আপডেট করা যায়নি। নতুন রিসেট লিংক নিন।', 'error');
  } finally {
    $('resetSubmit').disabled = false;
  }
}

async function sendPasswordReset() {
  const email = $('email').value.trim();
  if (!email) { showMessage($('authMessage'), 'আগে ইমেইল ঠিকানাটি লিখুন।', 'error'); $('email').focus(); return; }
  if (!sb) { showMessage($('authMessage'), 'Supabase configuration পাওয়া যায়নি।', 'error'); return; }
  try {
    const redirectTo = `${window.location.origin}${window.location.pathname}`;
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
    showMessage($('authMessage'), 'পাসওয়ার্ড রিসেটের ইমেইল পাঠানো হয়েছে। নতুন ইমেইলের লিংক ব্যবহার করুন।', 'success');
  } catch (error) {
    showMessage($('authMessage'), error.message || 'রিসেট ইমেইল পাঠানো যায়নি।', 'error');
  }
}

async function submitAuth(event) {
  event.preventDefault();
  showMessage($('authMessage'), '');
  if (!sb) {
    showMessage($('authMessage'), 'Supabase সেটিংস পাওয়া যায়নি। config.js-এ বিদ্যমান URL ও Publishable/Anon Key পরীক্ষা করুন।', 'error');
    return;
  }
  const email = $('email').value.trim();
  const password = $('password').value;
  const fullName = $('fullName').value.trim();
  $('authSubmit').disabled = true;
  try {
    let result;
    if (authMode === 'signup') {
      result = await sb.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
      if (result.error) throw result.error;
      if (result.data.session) showApp(result.data.user);
      else showMessage($('authMessage'), 'অ্যাকাউন্ট তৈরি হয়েছে। ইমেইল নিশ্চিত করে তারপর লগইন করুন।', 'success');
    } else {
      result = await sb.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      showApp(result.data.user);
    }
  } catch (error) {
    showMessage($('authMessage'), error.message || 'অনুরোধ সম্পন্ন হয়নি।', 'error');
  } finally {
    $('authSubmit').disabled = false;
  }
}

async function signOut() {
  if (sb) {
    const { error } = await sb.auth.signOut();
    if (error) { toast(error.message); return; }
  }
  showAuth();
}

function initPwa() {
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch((error) => console.warn('Service worker registration failed:', error));
    });
  }
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    $('installBtn').classList.remove('hidden');
  });
  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    $('installBtn').classList.add('hidden');
    toast('Mahbub BCS ইনস্টল হয়েছে।');
  });
}

async function installApp() {
  if (!deferredInstallPrompt) {
    toast('Install অপশন না এলে Chrome-এর Menu থেকে Install app দেখুন।');
    return;
  }
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  $('installBtn').classList.add('hidden');
}

function wireEvents() {
  document.querySelectorAll('.tab').forEach((tab) => tab.addEventListener('click', () => setAuthMode(tab.dataset.tab)));
  $('authForm').addEventListener('submit', submitAuth);
  $('resetForm').addEventListener('submit', submitPasswordReset);
  $('forgotBtn').addEventListener('click', sendPasswordReset);
  $('logoutBtn').addEventListener('click', signOut);
  $('installBtn').addEventListener('click', installApp);
  $('photoBtn').addEventListener('click', () => $('photoInput').click());
  $('photoInput').addEventListener('change', (event) => handlePhoto(event.target.files?.[0]));
  $('startMockTest').addEventListener('click', startMockTest);
  $('mockAgain').addEventListener('click', startMockTest);
  $('quitMockTest').addEventListener('click', quitMockTest);
  $('mockPrev').addEventListener('click', () => { if (mockIndex > 0) { mockIndex -= 1; renderMockQuestion(); } });
  $('mockNext').addEventListener('click', () => { if (mockIndex < mockQuestions.length - 1) { mockIndex += 1; renderMockQuestion(); } });
  $('mockSubmit').addEventListener('click', finishMockTest);
  $('mockOptions').addEventListener('click', (event) => {
    const option = event.target.closest('[data-mock-option]');
    if (!option) return;
    mockAnswers[mockIndex] = Number(option.dataset.mockOption);
    renderMockQuestion();
  });
  $('backToSubjects').addEventListener('click', () => setMainView('subjectsView'));
  document.querySelectorAll('.nav-item').forEach((button) => button.addEventListener('click', () => { stopMockTimer(); setMainView(button.dataset.view); }));
  document.querySelectorAll('[data-goto]').forEach((button) => button.addEventListener('click', () => setMainView(button.dataset.goto)));

  document.body.addEventListener('click', (event) => {
    const subjectButton = event.target.closest('[data-subject]');
    if (subjectButton) openSubject(subjectButton.dataset.subject);
    const examButton = event.target.closest('[data-exam]');
    if (examButton) openExamFolder(examButton.dataset.exam);
  });
}

async function initAuth() {
  if (!sb) return;
  try {
    const { data } = await sb.auth.getSession();
    if (data?.session?.user) showApp(data.session.user);
    sb.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') showResetView();
      if (event === 'SIGNED_IN' && session?.user && event !== 'PASSWORD_RECOVERY') showApp(session.user);
      if (event === 'SIGNED_OUT') showAuth();
    });
  } catch (error) {
    console.warn('Session restore failed:', error.message);
  }
}

wireEvents();
initPwa();
initAuth();
