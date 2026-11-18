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
    id: 'bangla',
    title: 'Bangla',
    bn: 'বাংলা ভাষা ও সাহিত্য',
    icon: 'অ',
    color: 'blue',
    description: 'বাংলা ব্যাকরণ, ভাষা, সাহিত্য ও সাহিত্যিক।',
    topics: [
      {
        title: 'বাংলা ভাষা ও ধ্বনিতত্ত্ব',
        subtopics: [
          { title: 'ভাষা ও বাংলা ভাষা', items: ['ভাষার সংজ্ঞা, বৈশিষ্ট্য ও উপাদান', 'ভাষার উৎপত্তি ও ক্রমবিকাশ', 'বাংলা ভাষার উৎপত্তি ও ইন্দো-ইউরোপীয় ভাষাগোষ্ঠী', 'বাংলা ভাষার উপভাষা ও আঞ্চলিক রূপ'] },
          { title: 'ধ্বনিতত্ত্ব', items: ['ধ্বনি ও বর্ণের পার্থক্য', 'স্বরধ্বনি ও ব্যঞ্জনধ্বনি', 'উচ্চারণস্থান ও উচ্চারণরীতি', 'অল্পপ্রাণ ও মহাপ্রাণ ধ্বনি', 'ঘোষ ও অঘোষ ধ্বনি', 'নাসিক্য ও উষ্ম ধ্বনি'] },
          { title: 'বর্ণ ও বানান', items: ['স্বরবর্ণ ও ব্যঞ্জনবর্ণ', 'যুক্তবর্ণ ও ফলা', 'ণত্ব ও ষত্ব বিধান', 'শুদ্ধ বানান ও বানানরীতি', 'বাংলা একাডেমির প্রমিত বানানরীতি'] }
        ]
      },
      {
        title: 'শব্দতত্ত্ব ও রূপতত্ত্ব',
        subtopics: [
          { title: 'শব্দের শ্রেণিবিভাগ', items: ['উৎস অনুসারে শব্দ: তৎসম, অর্ধতৎসম, তদ্ভব, দেশি ও বিদেশি', 'গঠন অনুসারে শব্দ: মৌলিক ও সাধিত', 'অর্থ অনুসারে শব্দের শ্রেণি', 'শব্দের অর্থ পরিবর্তন'] },
          { title: 'শব্দগঠন', items: ['প্রকৃতি ও প্রত্যয়', 'উপসর্গ ও অনুসর্গ', 'বাংলা ও সংস্কৃত প্রত্যয়', 'কৃৎ ও তদ্ধিত প্রত্যয়', 'সমাসবদ্ধ ও সন্ধিবদ্ধ শব্দ'] },
          { title: 'সন্ধি ও সমাস', items: ['স্বরসন্ধি, ব্যঞ্জনসন্ধি ও বিসর্গসন্ধি', 'সন্ধিবিচ্ছেদ', 'দ্বন্দ্ব, কর্মধারয় ও তৎপুরুষ সমাস', 'বহুব্রীহি, দ্বিগু ও অব্যয়ীভাব সমাস', 'সমাস নির্ণয় ও ব্যাসবাক্য'] }
        ]
      },
      {
        title: 'পদ, বাক্য ও ব্যাকরণ',
        subtopics: [
          { title: 'পদ প্রকরণ', items: ['বিশেষ্য ও তার প্রকারভেদ', 'সর্বনাম ও তার প্রকারভেদ', 'বিশেষণ ও তার প্রকারভেদ', 'ক্রিয়া ও তার প্রকারভেদ', 'ক্রিয়াবিশেষণ ও অব্যয়'] },
          { title: 'কারক ও বিভক্তি', items: ['কর্তৃকারক ও কর্মকারক', 'করণ, সম্প্রদান, অপাদান ও অধিকরণ কারক', 'বিভক্তি ও অনুসর্গ', 'কারক নির্ণয়'] },
          { title: 'বাক্যতত্ত্ব', items: ['বাক্যের সংজ্ঞা ও গঠন', 'সরল, জটিল ও যৌগিক বাক্য', 'বাক্যের উদ্দেশ্য ও বিধেয়', 'বাক্য রূপান্তর', 'বাচ্য ও উক্তি পরিবর্তন', 'বাক্যশুদ্ধি ও বাক্য সংশোধন'] },
          { title: 'অন্যান্য ব্যাকরণ', items: ['লিঙ্গ, বচন ও পুরুষ', 'কাল ও ক্রিয়ার কাল', 'বিরামচিহ্ন ও যতি চিহ্ন', 'একই শব্দের বিভিন্ন অর্থ', 'শুদ্ধ প্রয়োগ ও অপপ্রয়োগ'] }
        ]
      },
      {
        title: 'শব্দভাণ্ডার ও প্রয়োগ',
        subtopics: [
          { title: 'শব্দার্থ', items: ['সমার্থক শব্দ', 'বিপরীতার্থক শব্দ', 'একই শব্দের একাধিক অর্থ', 'শব্দের অর্থ ও প্রয়োগ'] },
          { title: 'বিশেষ শব্দ ও বাক্য', items: ['এক কথায় প্রকাশ', 'বাগধারা ও বাগবিধি', 'প্রবাদ-প্রবচন', 'পারিভাষিক শব্দ', 'শব্দজোড় ও সমোচ্চারিত শব্দ'] }
        ]
      },
      {
        title: 'বাংলা সাহিত্যের ইতিহাস',
        subtopics: [
          { title: 'প্রাচীন যুগ', items: ['বাংলা সাহিত্যের যুগবিভাগ', 'চর্যাপদ: আবিষ্কার, ভাষা ও কবি', 'চর্যাপদের পদকর্তা ও বিষয়বস্তু', 'প্রাচীন যুগের সাহিত্যিক বৈশিষ্ট্য'] },
          { title: 'মধ্যযুগ', items: ['শ্রীকৃষ্ণকীর্তন কাব্য', 'মঙ্গলকাব্য ও এর শাখা', 'বৈষ্ণব পদাবলি', 'অনুবাদ সাহিত্য', 'মুসলিম সাহিত্য ও পুঁথিসাহিত্য', 'আরাকান রাজসভা ও বাংলা সাহিত্য'] },
          { title: 'আধুনিক যুগ', items: ['ফোর্ট উইলিয়াম কলেজ ও বাংলা গদ্য', 'ঈশ্বরচন্দ্র বিদ্যাসাগর ও গদ্যচর্চা', 'বাংলা নবজাগরণ', 'উনিশ শতকের কবিতা, উপন্যাস ও নাটক', 'রবীন্দ্রযুগ ও নজরুলযুগ', 'আধুনিক ও সমকালীন সাহিত্য'] }
        ]
      },
      {
        title: 'সাহিত্যিক ও সাহিত্যকর্ম',
        subtopics: [
          { title: 'প্রধান কবি ও সাহিত্যিক', items: ['মাইকেল মধুসূদন দত্ত', 'বঙ্কিমচন্দ্র চট্টোপাধ্যায়', 'রবীন্দ্রনাথ ঠাকুর', 'কাজী নজরুল ইসলাম', 'জীবনানন্দ দাশ', 'জসীমউদ্দীন', 'সুকান্ত ভট্টাচার্য', 'শামসুর রাহমান ও সমকালীন কবি'] },
          { title: 'উপন্যাস, গল্প ও নাটক', items: ['প্রধান ঔপন্যাসিক ও তাঁদের রচনা', 'প্রধান ছোটগল্পকার ও গল্প', 'নাট্যকার ও তাঁদের নাটক', 'প্রবন্ধ, ভ্রমণকাহিনি ও আত্মজীবনী'] },
          { title: 'সাহিত্য বিষয়ক তথ্য', items: ['লেখকের ছদ্মনাম ও উপাধি', 'সাহিত্য পুরস্কার ও সম্মাননা', 'সাহিত্য পত্রিকা ও সাময়িকী', 'প্রথম প্রকাশিত গ্রন্থ ও গুরুত্বপূর্ণ সাহিত্যকর্ম', 'মুক্তিযুদ্ধ ও ভাষা আন্দোলনভিত্তিক সাহিত্য'] }
        ]
      }
    ]
  },
  {
    id: 'english',
    title: 'English',
    bn: 'ইংরেজি ভাষা ও সাহিত্য',
    icon: 'En',
    color: 'purple',
    description: 'English grammar, vocabulary, literature and comprehension.',
    topics: [
      {
        title: 'Parts of Speech and Word Classes',
        subtopics: [
          { title: 'Noun and Pronoun', items: ['Kinds of nouns', 'Countable and uncountable nouns', 'Gender, number and case', 'Personal, relative and demonstrative pronouns', 'Pronoun agreement'] },
          { title: 'Adjective and Adverb', items: ['Kinds and degrees of adjectives', 'Comparison of adjectives', 'Kinds of adverbs', 'Position and use of adverbs'] },
          { title: 'Verb and Other Parts of Speech', items: ['Main and auxiliary verbs', 'Transitive and intransitive verbs', 'Finite and non-finite verbs', 'Prepositions and conjunctions', 'Interjections and articles'] }
        ]
      },
      {
        title: 'Tense, Verb and Agreement',
        subtopics: [
          { title: 'Tense', items: ['Present, past and future tense', 'Indefinite, continuous, perfect and perfect continuous', 'Sequence of tenses', 'Appropriate tense selection'] },
          { title: 'Right Form of Verbs', items: ['Subject and verb relationship', 'Verb after modal auxiliaries', 'Verb after prepositions and conjunctions', 'Gerund and infinitive after verbs', 'Conditional verb forms'] },
          { title: 'Subject-Verb Agreement', items: ['Singular and plural subjects', 'Agreement with collective nouns', 'Either-or and neither-nor structures', 'Indefinite pronouns and agreement'] },
          { title: 'Voice and Narration', items: ['Active and passive voice', 'Voice change in different tenses', 'Imperative and interrogative voice', 'Direct and indirect speech', 'Reporting verbs and tense changes'] }
        ]
      },
      {
        title: 'Sentence Structure and Transformation',
        subtopics: [
          { title: 'Phrase and Clause', items: ['Noun, adjective and adverb phrases', 'Main and subordinate clauses', 'Noun, adjective and adverb clauses', 'Finite and non-finite clauses'] },
          { title: 'Sentence Classification', items: ['Assertive, interrogative and imperative', 'Exclamatory and optative sentences', 'Simple, compound and complex sentences'] },
          { title: 'Sentence Transformation', items: ['Affirmative and negative', 'Active and passive', 'Degree transformation', 'Simple, complex and compound conversion', 'Too...to, so...that and unless structures'] },
          { title: 'Special Structures', items: ['Conditional sentences', 'Inversion and emphasis', 'Cleft sentences', 'Parallelism and modifiers', 'Punctuation and capitalization'] }
        ]
      },
      {
        title: 'Articles, Prepositions and Vocabulary',
        subtopics: [
          { title: 'Articles and Determiners', items: ['Definite and indefinite articles', 'Zero article', 'Use of some, any, much, many and few', 'Determiners and quantifiers'] },
          { title: 'Prepositions', items: ['Prepositions of time and place', 'Prepositions after adjectives and verbs', 'Appropriate prepositions', 'Phrasal verbs'] },
          { title: 'Vocabulary', items: ['Synonyms and antonyms', 'Idioms and phrases', 'One-word substitution', 'Spelling and commonly confused words', 'Analogy and word relationships'] }
        ]
      },
      {
        title: 'Reading and Writing Skills',
        subtopics: [
          { title: 'Reading Comprehension', items: ['Main idea and supporting details', 'Inference and interpretation', 'Vocabulary in context', 'Author’s tone and purpose'] },
          { title: 'Writing', items: ['Paragraph and essay writing', 'Precis and summary writing', 'Formal letters and applications', 'Report writing', 'Translation between Bangla and English'] }
        ]
      },
      {
        title: 'English Literature',
        subtopics: [
          { title: 'Literary Periods', items: ['Old and Middle English periods', 'Renaissance and Elizabethan age', 'Neoclassical and Romantic periods', 'Victorian age', 'Modern and Postmodern literature'] },
          { title: 'Poets and Writers', items: ['Geoffrey Chaucer and William Shakespeare', 'John Milton and William Wordsworth', 'S. T. Coleridge and John Keats', 'Charles Dickens and Jane Austen', 'T. S. Eliot, George Bernard Shaw and major modern writers'] },
          { title: 'Literary Terms and Works', items: ['Drama, tragedy and comedy', 'Epic, lyric, sonnet and ode', 'Novel, novella and short story', 'Figures of speech and literary devices', 'Major works, characters and literary awards'] }
        ]
      }
    ]
  },
  {
    id: 'math',
    title: 'Mathematics',
    bn: 'গাণিতিক যুক্তি',
    icon: '∑',
    color: 'green',
    description: 'Arithmetic, algebra, geometry and quantitative reasoning.',
    topics: [
      {
        title: 'Arithmetic',
        subtopics: [
          { title: 'Number System', items: ['Natural, whole, integer and rational numbers', 'Prime, composite and co-prime numbers', 'Divisibility rules', 'LCM and GCD', 'Remainder and unit digit'] },
          { title: 'Fractions and Decimals', items: ['Common and decimal fractions', 'Fraction comparison and simplification', 'Recurring decimals', 'BODMAS and approximation'] },
          { title: 'Ratio, Proportion and Percentage', items: ['Ratio and proportion', 'Direct and inverse variation', 'Percentage increase and decrease', 'Successive percentage'] },
          { title: 'Commercial Arithmetic', items: ['Profit, loss and discount', 'Simple and compound interest', 'Commission and partnership', 'Average and weighted average', 'Mixture and alligation'] },
          { title: 'Time and Work', items: ['Work rate and combined work', 'Efficiency and wages', 'Pipes and cisterns'] },
          { title: 'Speed, Time and Distance', items: ['Relative speed', 'Train problems', 'Boats and streams', 'Race and circular motion'] },
          { title: 'Other Arithmetic', items: ['Age-related problems', 'Unitary method', 'Problems on numbers', 'Calendar and clock basics'] }
        ]
      },
      {
        title: 'Algebra',
        subtopics: [
          { title: 'Algebraic Expressions', items: ['Variables, constants and coefficients', 'Algebraic identities', 'Factorization', 'Simplification of expressions'] },
          { title: 'Equations', items: ['Linear equations in one variable', 'Simultaneous linear equations', 'Quadratic equations', 'Roots and discriminant', 'Word problems using equations'] },
          { title: 'Indices, Surds and Logarithms', items: ['Laws of indices', 'Surds and rationalization', 'Logarithmic laws', 'Exponential equations'] },
          { title: 'Sequences and Functions', items: ['Arithmetic progression', 'Geometric progression', 'Patterns and series', 'Functions and graphs', 'Inequalities'] }
        ]
      },
      {
        title: 'Geometry and Mensuration',
        subtopics: [
          { title: 'Basic Geometry', items: ['Points, lines and angles', 'Parallel and perpendicular lines', 'Properties of triangles', 'Congruence and similarity'] },
          { title: 'Plane Figures', items: ['Quadrilaterals and polygons', 'Circle, chord, tangent and arc', 'Angles in a circle', 'Geometrical theorems'] },
          { title: 'Mensuration', items: ['Perimeter and area of plane figures', 'Area of triangle and quadrilateral', 'Circumference and area of circle', 'Volume and surface area of solids', 'Cube, cuboid, cylinder, cone and sphere'] }
        ]
      },
      {
        title: 'Statistics and Probability',
        subtopics: [
          { title: 'Statistics', items: ['Data collection and classification', 'Frequency distribution and tables', 'Bar charts, pie charts and graphs', 'Mean, median and mode', 'Range and basic dispersion'] },
          { title: 'Probability and Counting', items: ['Basic probability concepts', 'Sample space and events', 'Fundamental counting principle', 'Permutations and combinations (basic)'] }
        ]
      }
    ]
  },
  {
    id: 'mental',
    title: 'Mental Ability',
    bn: 'মানসিক দক্ষতা ও বিশ্লেষণী ক্ষমতা',
    icon: '◇',
    color: 'orange',
    description: 'Verbal, numerical, analytical and non-verbal reasoning.',
    topics: [
      {
        title: 'Verbal Reasoning',
        subtopics: [
          { title: 'Word and Letter Reasoning', items: ['Word analogy', 'Letter analogy', 'Classification and odd one out', 'Word formation and arrangement'] },
          { title: 'Series and Coding', items: ['Letter series', 'Word series', 'Mixed series', 'Coding and decoding', 'Symbol substitution'] },
          { title: 'Logical Reasoning', items: ['Statement and conclusion', 'Statement and assumption', 'Syllogism', 'Cause and effect', 'Course of action'] },
          { title: 'Relationship and Direction', items: ['Blood relations', 'Direction and distance', 'Ranking and order', 'Calendar and clock reasoning'] }
        ]
      },
      {
        title: 'Numerical Reasoning',
        subtopics: [
          { title: 'Number Reasoning', items: ['Number series', 'Missing numbers', 'Number analogy', 'Mathematical operations', 'Numerical patterns'] },
          { title: 'Quantitative Analysis', items: ['Basic arithmetic reasoning', 'Ratio and percentage reasoning', 'Age and time-based problems', 'Data interpretation', 'Tables, charts and graphs'] }
        ]
      },
      {
        title: 'Analytical Reasoning',
        subtopics: [
          { title: 'Arrangement and Puzzle', items: ['Linear arrangement', 'Circular arrangement', 'Order and ranking puzzles', 'Scheduling and grouping', 'Selection and distribution'] },
          { title: 'Critical Thinking', items: ['Logical deduction', 'Inference and assumptions', 'Strengthening and weakening arguments', 'Decision making', 'Analytical problem solving'] }
        ]
      },
      {
        title: 'Non-verbal Reasoning',
        subtopics: [
          { title: 'Figure and Pattern', items: ['Figure series', 'Pattern completion', 'Mirror images', 'Water images', 'Embedded figures'] },
          { title: 'Spatial Reasoning', items: ['Paper folding and cutting', 'Cubes and dice', 'Shape classification', 'Rotation and reflection', 'Visual analogy'] }
        ]
      }
    ]
  },

  {
    id: 'bangladesh',
    title: 'Bangladesh Affairs',
    bn: 'বাংলাদেশ বিষয়াবলি',
    icon: 'BD',
    color: 'red',
    description: 'বাংলাদেশের ইতিহাস, সংবিধান, অর্থনীতি, সমাজ ও প্রশাসন।',
    topics: [
      {
        title: 'প্রাচীন বাংলার ইতিহাস',
        subtopics: [
          { title: 'প্রাচীন জনপদ ও রাজবংশ', items: ['পুণ্ড্র, বঙ্গ, গৌড়, সমতট ও হরিকেল', 'মৌর্য ও গুপ্ত শাসন', 'শশাঙ্ক ও গৌড় রাজ্য', 'পাল বংশ ও সেন বংশ'] },
          { title: 'প্রত্নতাত্ত্বিক ঐতিহ্য', items: ['মহাস্থানগড়', 'পাহাড়পুর বৌদ্ধবিহার', 'ময়নামতি ও শালবন বিহার', 'প্রাচীন মুদ্রা, শিলালিপি ও স্থাপত্য'] }
        ]
      },
      {
        title: 'মধ্যযুগ ও ঔপনিবেশিক শাসন',
        subtopics: [
          { title: 'মুসলিম শাসন ও সুলতানি আমল', items: ['বাংলায় মুসলিম শাসনের সূচনা', 'স্বাধীন সুলতানি আমল', 'ইলিয়াস শাহী ও হোসেন শাহী বংশ', 'মুঘল শাসন ও সুবাহ বাংলা'] },
          { title: 'ব্রিটিশ শাসন', items: ['পলাশীর যুদ্ধ ও বক্সারের যুদ্ধ', 'চিরস্থায়ী বন্দোবস্ত', 'ফকির-সন্ন্যাসী বিদ্রোহ', 'ফরায়েজি আন্দোলন ও তিতুমীর', 'সিপাহি বিদ্রোহ', 'বঙ্গভঙ্গ ১৯০৫ ও বঙ্গভঙ্গ রদ'] },
          { title: 'রাজনৈতিক ও সামাজিক আন্দোলন', items: ['ব্রিটিশবিরোধী আন্দোলন', 'স্বদেশি আন্দোলন', 'কৃষক ও শ্রমিক আন্দোলন', 'লাহোর প্রস্তাব ১৯৪০', 'ভারত বিভাগ ১৯৪৭'] }
        ]
      },
      {
        title: 'ভাষা আন্দোলন ও স্বাধীনতা সংগ্রাম',
        subtopics: [
          { title: 'ভাষা আন্দোলন', items: ['রাষ্ট্রভাষা বিতর্ক', 'ভাষা আন্দোলনের পটভূমি', '২১ ফেব্রুয়ারি ১৯৫২', 'শহিদ ও ভাষাসংগ্রামী', 'রাষ্ট্রভাষা হিসেবে বাংলার স্বীকৃতি'] },
          { title: 'স্বাধিকার আন্দোলন', items: ['যুক্তফ্রন্ট নির্বাচন ১৯৫৪', 'সামরিক শাসন ১৯৫৮', 'ছয় দফা আন্দোলন ১৯৬৬', 'আগরতলা মামলা', 'ঊনসত্তরের গণঅভ্যুত্থান', '১৯৭০ সালের সাধারণ নির্বাচন'] },
          { title: 'মুক্তিযুদ্ধ ১৯৭১', items: ['৭ মার্চের ঐতিহাসিক ভাষণ', 'অপারেশন সার্চলাইট ও ২৫ মার্চ', 'স্বাধীনতার ঘোষণা', 'মুজিবনগর সরকার', 'মুক্তিযুদ্ধের সেক্টর ও সেক্টর কমান্ডার', 'বীরশ্রেষ্ঠ ও খেতাবপ্রাপ্ত মুক্তিযোদ্ধা', 'যুদ্ধকালীন আন্তর্জাতিক ভূমিকা', '১৬ ডিসেম্বর বিজয়'] },
          { title: 'স্বাধীন বাংলাদেশ', items: ['সংবিধান প্রণয়ন ও কার্যকর', 'যুদ্ধবিধ্বস্ত দেশ পুনর্গঠন', 'রাষ্ট্রপতি ও সরকারব্যবস্থার পরিবর্তন', 'গুরুত্বপূর্ণ জাতীয় রাজনৈতিক ঘটনা'] }
        ]
      },
      {
        title: 'বাংলাদেশের সংবিধান ও রাষ্ট্রব্যবস্থা',
        subtopics: [
          { title: 'সংবিধানের ইতিহাস ও বৈশিষ্ট্য', items: ['সংবিধান প্রণয়ন কমিটি', 'গণপরিষদ ও সংবিধান গৃহীত হওয়ার তারিখ', 'সংবিধানের প্রস্তাবনা', 'সংবিধানের বৈশিষ্ট্য ও সংশোধনী'] },
          { title: 'রাষ্ট্র পরিচালনার মূলনীতি ও অধিকার', items: ['জাতীয়তাবাদ, সমাজতন্ত্র, গণতন্ত্র ও ধর্মনিরপেক্ষতা', 'মৌলিক অধিকার', 'রাষ্ট্র পরিচালনার মূলনীতি', 'নাগরিকের মৌলিক কর্তব্য'] },
          { title: 'রাষ্ট্রের অঙ্গ', items: ['আইন বিভাগ ও জাতীয় সংসদ', 'নির্বাহী বিভাগ ও মন্ত্রিসভা', 'রাষ্ট্রপতি ও প্রধানমন্ত্রীর দায়িত্ব', 'বিচার বিভাগ ও সুপ্রিম কোর্ট', 'সংবিধান সংশোধন পদ্ধতি'] },
          { title: 'সাংবিধানিক ও স্বায়ত্তশাসিত প্রতিষ্ঠান', items: ['নির্বাচন কমিশন', 'সরকারি কর্ম কমিশন', 'মহাহিসাব নিরীক্ষক ও নিয়ন্ত্রক', 'অ্যাটর্নি জেনারেল', 'দুর্নীতি দমন কমিশন ও অন্যান্য প্রতিষ্ঠান'] }
        ]
      },
      {
        title: 'বাংলাদেশের ভূগোল ও পরিবেশ',
        subtopics: [
          { title: 'ভৌগোলিক পরিচিতি', items: ['অবস্থান, আয়তন ও সীমানা', 'বিভাগ, জেলা ও উপজেলা', 'স্থলবন্দর ও সমুদ্রবন্দর', 'দ্বীপ, চর ও উপকূলীয় অঞ্চল'] },
          { title: 'নদ-নদী ও প্রাকৃতিক সম্পদ', items: ['প্রধান নদ-নদী ও নদীপ্রণালি', 'পদ্মা, মেঘনা, যমুনা ও ব্রহ্মপুত্র', 'হাওর, বিল ও জলাভূমি', 'খনিজ ও জ্বালানি সম্পদ', 'বন, পাহাড় ও জীববৈচিত্র্য'] },
          { title: 'জলবায়ু ও দুর্যোগ', items: ['ঋতুবৈচিত্র্য ও জলবায়ু', 'ঘূর্ণিঝড় ও জলোচ্ছ্বাস', 'বন্যা, খরা ও নদীভাঙন', 'ভূমিকম্প ও ভূমিধস', 'জলবায়ু পরিবর্তনের প্রভাব'] }
        ]
      },
      {
        title: 'বাংলাদেশের অর্থনীতি ও উন্নয়ন',
        subtopics: [
          { title: 'অর্থনৈতিক কাঠামো', items: ['GDP, GNI ও মাথাপিছু আয়', 'কৃষি, শিল্প ও সেবা খাত', 'জাতীয় আয় ও অর্থনৈতিক প্রবৃদ্ধি', 'দারিদ্র্য, বেকারত্ব ও বৈষম্য'] },
          { title: 'বাজেট ও আর্থিক ব্যবস্থা', items: ['জাতীয় বাজেট ও বাজেটের ধরন', 'রাজস্ব, কর ও ভ্যাট', 'সরকারি ব্যয় ও ঋণ', 'বাংলাদেশ ব্যাংক ও মুদ্রানীতি'] },
          { title: 'বাণিজ্য ও উন্নয়ন', items: ['রপ্তানি ও আমদানি', 'তৈরি পোশাক শিল্প', 'প্রবাসী আয় ও রেমিট্যান্স', 'বৈদেশিক বিনিয়োগ ও বৈদেশিক সাহায্য', 'পঞ্চবার্ষিক পরিকল্পনা ও প্রেক্ষিত পরিকল্পনা', 'SDG ও উন্নয়ন সূচক'] }
        ]
      },
      {
        title: 'সমাজ, সংস্কৃতি ও জাতীয় বিষয়াবলি',
        subtopics: [
          { title: 'জনসংখ্যা ও সমাজ', items: ['জনশুমারি ও জনসংখ্যার বৈশিষ্ট্য', 'জাতিগোষ্ঠী ও ক্ষুদ্র নৃগোষ্ঠী', 'শিক্ষা ও স্বাস্থ্যব্যবস্থা', 'নারী উন্নয়ন ও সামাজিক সুরক্ষা'] },
          { title: 'সংস্কৃতি ও ঐতিহ্য', items: ['লোকসংস্কৃতি ও লোকসাহিত্য', 'উৎসব, ঐতিহ্য ও প্রত্নসম্পদ', 'জাতীয় সংগীত, পতাকা ও প্রতীক', 'জাতীয় দিবস ও গুরুত্বপূর্ণ তারিখ'] },
          { title: 'প্রশাসন ও সাম্প্রতিক বিষয়', items: ['স্থানীয় সরকারব্যবস্থা', 'বিভিন্ন মন্ত্রণালয় ও অধিদপ্তর', 'গুরুত্বপূর্ণ জাতীয় প্রতিষ্ঠান', 'অবকাঠামো ও মেগা প্রকল্প', 'সাম্প্রতিক জাতীয় ঘটনা ও তথ্যের তারিখ'] }
        ]
      }
    ]
  },
  {
    id: 'international',
    title: 'International Affairs',
    bn: 'আন্তর্জাতিক বিষয়াবলি',
    icon: '◎',
    color: 'cyan',
    description: 'বিশ্ব রাজনীতি, আন্তর্জাতিক সংস্থা, কূটনীতি ও বৈশ্বিক অর্থনীতি।',
    topics: [
      {
        title: 'বিশ্বের ভৌগোলিক ও রাজনৈতিক পরিচিতি',
        subtopics: [
          { title: 'দেশ, রাজধানী ও মুদ্রা', items: ['বিশ্বের দেশ ও রাজধানী', 'দেশভিত্তিক মুদ্রা', 'দেশের সরকারি ভাষা', 'রাষ্ট্রের নাম ও পরিবর্তন'] },
          { title: 'মহাদেশ ও অঞ্চল', items: ['এশিয়া, ইউরোপ, আফ্রিকা, আমেরিকা ও ওশেনিয়া', 'মধ্যপ্রাচ্য ও উপসাগরীয় অঞ্চল', 'দক্ষিণ এশিয়া ও দক্ষিণ-পূর্ব এশিয়া', 'গুরুত্বপূর্ণ প্রণালি, খাল ও সমুদ্র'] },
          { title: 'বিশ্ব ভূরাজনীতি', items: ['সীমান্ত ও বিরোধপূর্ণ অঞ্চল', 'গুরুত্বপূর্ণ দ্বীপ ও উপদ্বীপ', 'বিশ্বের প্রধান পর্বত, নদী ও মরুভূমি', 'কৌশলগত অঞ্চল ও সামুদ্রিক পথ'] }
        ]
      },
      {
        title: 'জাতিসংঘ ও এর অঙ্গসংস্থা',
        subtopics: [
          { title: 'জাতিসংঘের মৌলিক পরিচিতি', items: ['প্রতিষ্ঠার পটভূমি ও সনদ', 'সদস্যপদ ও সদর দপ্তর', 'জাতিসংঘের উদ্দেশ্য ও নীতি', 'সাধারণ পরিষদ ও নিরাপত্তা পরিষদ'] },
          { title: 'জাতিসংঘের প্রধান অঙ্গ', items: ['অর্থনৈতিক ও সামাজিক পরিষদ', 'আন্তর্জাতিক বিচার আদালত', 'সচিবালয় ও মহাসচিব', 'ট্রাস্টিশিপ কাউন্সিল'] },
          { title: 'বিশেষায়িত সংস্থা ও কর্মসূচি', items: ['WHO, UNESCO ও UNICEF', 'FAO, ILO ও IAEA', 'IMF ও World Bank', 'UNDP, UNHCR, UNEP ও WFP', 'UN peacekeeping ও মানবিক কার্যক্রম'] },
          { title: 'জাতিসংঘ ও বাংলাদেশ', items: ['জাতিসংঘে বাংলাদেশের সদস্যপদ', 'বাংলাদেশের শান্তিরক্ষা কার্যক্রম', 'বাংলাদেশ ও জাতিসংঘের গুরুত্বপূর্ণ ভূমিকা'] }
        ]
      },
      {
        title: 'আন্তর্জাতিক ও আঞ্চলিক সংস্থা',
        subtopics: [
          { title: 'বিশ্বব্যাপী সংস্থা', items: ['বিশ্ব বাণিজ্য সংস্থা (WTO)', 'বিশ্বব্যাংক ও IMF', 'কমনওয়েলথ', 'OIC ও NAM', 'OECD ও G7/G20'] },
          { title: 'আঞ্চলিক সংস্থা', items: ['SAARC ও BIMSTEC', 'ASEAN ও APEC', 'ইউরোপীয় ইউনিয়ন (EU)', 'আফ্রিকান ইউনিয়ন (AU)', 'আরব লীগ ও GCC'] },
          { title: 'সংস্থাভিত্তিক তথ্য', items: ['প্রতিষ্ঠার সাল ও সদর দপ্তর', 'সদস্যদেশ ও উদ্দেশ্য', 'প্রধান ও মহাসচিব', 'সাম্প্রতিক সম্মেলন ও সিদ্ধান্ত'] }
        ]
      },
      {
        title: 'আন্তর্জাতিক আইন, চুক্তি ও কূটনীতি',
        subtopics: [
          { title: 'আন্তর্জাতিক আইন', items: ['আন্তর্জাতিক আইনের উৎস', 'আন্তর্জাতিক বিচারব্যবস্থা', 'সমুদ্র আইন ও UNCLOS', 'কূটনৈতিক ও কনস্যুলার সম্পর্ক'] },
          { title: 'আন্তর্জাতিক চুক্তি', items: ['মানবাধিকার সনদ ও কনভেনশন', 'জেনেভা কনভেনশন', 'পারমাণবিক অস্ত্র বিস্তার রোধ চুক্তি', 'জলবায়ু চুক্তি ও প্যারিস চুক্তি', 'শরণার্থী ও অভিবাসনবিষয়ক কাঠামো'] },
          { title: 'কূটনৈতিক সম্পর্ক', items: ['দ্বিপাক্ষিক ও বহুপাক্ষিক কূটনীতি', 'রাষ্ট্রদূত ও হাইকমিশনার', 'আন্তর্জাতিক সম্মেলন', 'শান্তি আলোচনা ও মধ্যস্থতা'] }
        ]
      },
      {
        title: 'বিশ্ব রাজনীতি ও আন্তর্জাতিক অর্থনীতি',
        subtopics: [
          { title: 'বিশ্ব রাজনীতি', items: ['শীতল যুদ্ধ ও পরবর্তী বিশ্বব্যবস্থা', 'আন্তর্জাতিক শক্তির ভারসাম্য', 'প্রধান রাজনৈতিক জোট ও সামরিক জোট', 'গুরুত্বপূর্ণ যুদ্ধ ও সংঘাত', 'শান্তিচুক্তি ও চলমান বিরোধ'] },
          { title: 'বিশ্ব অর্থনীতি', items: ['আন্তর্জাতিক বাণিজ্য ও বিশ্বায়ন', 'বৈদেশিক মুদ্রা ও বিনিময় হার', 'জ্বালানি ও খাদ্য নিরাপত্তা', 'বিশ্ব অর্থনৈতিক সংকট ও মন্দা'] },
          { title: 'বৈশ্বিক সূচক', items: ['মানব উন্নয়ন সূচক (HDI)', 'বিশ্ব ক্ষুধা ও দারিদ্র্য সূচক', 'দুর্নীতি ধারণা সূচক', 'গণতন্ত্র ও শান্তি সূচক', 'বিশ্ব অর্থনৈতিক প্রতিবেদন'] }
        ]
      },
      {
        title: 'বিশ্বের সাম্প্রতিক গুরুত্বপূর্ণ বিষয়',
        subtopics: [
          { title: 'বিজ্ঞান ও প্রযুক্তি', items: ['কৃত্রিম বুদ্ধিমত্তা ও ডিজিটাল প্রযুক্তি', 'মহাকাশ গবেষণা', 'নতুন আবিষ্কার ও উদ্ভাবন'] },
          { title: 'পরিবেশ ও উন্নয়ন', items: ['জলবায়ু সম্মেলন ও COP', 'জীববৈচিত্র্য ও পরিবেশ সংরক্ষণ', 'SDG অগ্রগতি ও বৈশ্বিক উন্নয়ন'] },
          { title: 'আন্তর্জাতিক ঘটনাবলি', items: ['সাম্প্রতিক নির্বাচন ও সরকার পরিবর্তন', 'আন্তর্জাতিক পুরস্কার', 'বিশ্ব সম্মেলন ও গুরুত্বপূর্ণ সিদ্ধান্ত', 'সাম্প্রতিক সংঘাত ও কূটনৈতিক অগ্রগতি'] }
        ]
      }
    ]
  },
  {
    id: 'geography',
    title: 'Geography & Environment',
    bn: 'ভূগোল, পরিবেশ ও দুর্যোগ ব্যবস্থাপনা',
    icon: '◉',
    color: 'lime',
    description: 'প্রাকৃতিক ও মানবীয় ভূগোল, পরিবেশ ও দুর্যোগ ব্যবস্থাপনা।',
    topics: [
      {
        title: 'ভৌত ভূগোল',
        subtopics: [
          { title: 'পৃথিবীর গঠন ও ভূপ্রকৃতি', items: ['পৃথিবীর অভ্যন্তরীণ গঠন', 'ভূত্বক, ম্যান্টল ও কেন্দ্র', 'শিলা ও খনিজ', 'পর্বত, মালভূমি ও সমভূমি', 'ভূমিকম্প ও আগ্নেয়গিরি'] },
          { title: 'বায়ুমণ্ডল ও জলবায়ু', items: ['বায়ুমণ্ডলের স্তর', 'তাপমাত্রা ও বায়ুচাপ', 'বায়ুপ্রবাহ ও মৌসুমি বায়ু', 'বৃষ্টিপাত ও জলবায়ুর শ্রেণিবিভাগ', 'আবহাওয়া ও জলবায়ুর পার্থক্য'] },
          { title: 'জলমণ্ডল', items: ['সমুদ্র ও মহাসাগর', 'জোয়ার-ভাটা ও সমুদ্রস্রোত', 'নদী ও নদী অববাহিকা', 'জলচক্র ও ভূগর্ভস্থ পানি'] }
        ]
      },
      {
        title: 'মানব ও অর্থনৈতিক ভূগোল',
        subtopics: [
          { title: 'জনসংখ্যা ও বসতি', items: ['জনসংখ্যার বণ্টন ও ঘনত্ব', 'জনসংখ্যা বৃদ্ধি ও অভিবাসন', 'নগরায়ণ ও গ্রামীণ বসতি', 'জনমিতিক পরিবর্তন'] },
          { title: 'অর্থনৈতিক ভূগোল', items: ['কৃষি ও কৃষিজ সম্পদ', 'শিল্প ও শিল্পাঞ্চল', 'খনিজ ও জ্বালানি সম্পদ', 'পরিবহন ও যোগাযোগ', 'বিশ্ব বাণিজ্য ও অর্থনৈতিক অঞ্চল'] },
          { title: 'আঞ্চলিক ভূগোল', items: ['দক্ষিণ এশিয়ার ভূগোল', 'এশিয়া ও ইউরোপের গুরুত্বপূর্ণ অঞ্চল', 'আফ্রিকা ও আমেরিকার ভূগোল', 'বিশ্বের গুরুত্বপূর্ণ নদী, পর্বত ও মরুভূমি'] }
        ]
      },
      {
        title: 'পরিবেশ ও জলবায়ু পরিবর্তন',
        subtopics: [
          { title: 'পরিবেশের মৌলিক ধারণা', items: ['পরিবেশ ও বাস্তুতন্ত্র', 'খাদ্যশৃঙ্খল ও খাদ্যজাল', 'জীববৈচিত্র্য ও সংরক্ষণ', 'প্রাকৃতিক সম্পদের টেকসই ব্যবহার'] },
          { title: 'পরিবেশ দূষণ', items: ['বায়ু, পানি ও মাটি দূষণ', 'শব্দ ও প্লাস্টিক দূষণ', 'বর্জ্য ব্যবস্থাপনা', 'দূষণের কারণ ও প্রতিকার'] },
          { title: 'জলবায়ু পরিবর্তন', items: ['গ্রিনহাউস প্রভাব ও বৈশ্বিক উষ্ণায়ন', 'জলবায়ু পরিবর্তনের কারণ ও প্রভাব', 'অভিযোজন ও প্রশমন', 'আন্তর্জাতিক পরিবেশ চুক্তি', 'টেকসই উন্নয়ন ও পরিবেশনীতি'] }
        ]
      },
      {
        title: 'দুর্যোগ ব্যবস্থাপনা',
        subtopics: [
          { title: 'প্রাকৃতিক দুর্যোগ', items: ['বন্যা ও আকস্মিক বন্যা', 'ঘূর্ণিঝড় ও জলোচ্ছ্বাস', 'খরা ও তাপপ্রবাহ', 'ভূমিকম্প ও ভূমিধস', 'নদীভাঙন ও লবণাক্ততা'] },
          { title: 'দুর্যোগ ব্যবস্থাপনার ধাপ', items: ['ঝুঁকি নিরূপণ ও প্রশমন', 'প্রস্তুতি ও আগাম সতর্কীকরণ', 'জরুরি সাড়া ও উদ্ধার', 'পুনর্বাসন ও পুনর্গঠন'] },
          { title: 'প্রাতিষ্ঠানিক ও আন্তর্জাতিক কাঠামো', items: ['বাংলাদেশের দুর্যোগ ব্যবস্থাপনা প্রতিষ্ঠান', 'দুর্যোগ ব্যবস্থাপনা আইন ও নীতিমালা', 'Sendai Framework', 'আন্তর্জাতিক মানবিক সহায়তা'] }
        ]
      }
    ]
  },

  {
    id: 'science',
    title: 'General Science',
    bn: 'সাধারণ বিজ্ঞান',
    icon: '⚛',
    color: 'teal',
    description: 'পদার্থবিজ্ঞান, রসায়ন, জীববিজ্ঞান ও ব্যবহারিক বিজ্ঞান।',
    topics: [
      {
        title: 'পদার্থবিজ্ঞান',
        subtopics: [
          { title: 'পরিমাপ ও একক', items: ['ভৌত রাশি ও পরিমাপ', 'মৌলিক ও লব্ধ একক', 'SI একক পদ্ধতি', 'স্কেলার ও ভেক্টর রাশি'] },
          { title: 'গতি ও বল', items: ['দূরত্ব, সরণ, দ্রুতি ও বেগ', 'ত্বরণ ও গতির সূত্র', 'নিউটনের গতিসূত্র', 'মহাকর্ষ ও অভিকর্ষ', 'ভর, ওজন ও ঘর্ষণ'] },
          { title: 'কাজ, শক্তি ও ক্ষমতা', items: ['কাজ ও ক্ষমতার ধারণা', 'গতিশক্তি ও বিভবশক্তি', 'শক্তির নিত্যতা সূত্র', 'শক্তির রূপান্তর'] },
          { title: 'তাপ ও তাপগতিবিদ্যা', items: ['তাপ ও তাপমাত্রা', 'তাপ সঞ্চালন: পরিবহন, পরিচলন ও বিকিরণ', 'আপেক্ষিক তাপ ও সুপ্ততাপ', 'তাপীয় প্রসারণ', 'তাপগতিবিদ্যার সূত্র'] },
          { title: 'আলো ও শব্দ', items: ['আলোর প্রতিফলন ও প্রতিসরণ', 'লেন্স ও দর্পণ', 'আলোর বর্ণালি', 'শব্দের উৎপত্তি ও বিস্তার', 'কম্পাঙ্ক, তরঙ্গদৈর্ঘ্য ও প্রতিধ্বনি'] },
          { title: 'বিদ্যুৎ ও চুম্বকত্ব', items: ['বিদ্যুৎ প্রবাহ, বিভব ও রোধ', 'ওহমের সূত্র', 'সিরিজ ও প্যারালাল বর্তনী', 'চুম্বক ও তড়িৎচুম্বক', 'জেনারেটর, মোটর ও ট্রান্সফরমার'] },
          { title: 'আধুনিক পদার্থবিজ্ঞান', items: ['পরমাণু ও নিউক্লিয়াস', 'তেজস্ক্রিয়তা', 'পারমাণবিক শক্তি', 'সেমিকন্ডাক্টর ও ইলেকট্রনিক্স'] }
        ]
      },
      {
        title: 'রসায়নবিজ্ঞান',
        subtopics: [
          { title: 'পরমাণু ও মৌল', items: ['পরমাণুর গঠন', 'প্রোটন, নিউট্রন ও ইলেকট্রন', 'পারমাণবিক ও ভরসংখ্যা', 'আইসোটোপ ও আইসোবার', 'পর্যায় সারণি ও পর্যায়বৃত্ত ধর্ম'] },
          { title: 'রাসায়নিক বন্ধন ও বিক্রিয়া', items: ['আয়নিক ও সমযোজী বন্ধন', 'রাসায়নিক সংকেত ও সমীকরণ', 'জারণ ও বিজারণ', 'অনুঘটক ও বিক্রিয়ার গতি'] },
          { title: 'অম্ল, ক্ষার ও লবণ', items: ['অম্ল ও ক্ষারের বৈশিষ্ট্য', 'pH স্কেল', 'নিরপেক্ষকরণ বিক্রিয়া', 'গুরুত্বপূর্ণ লবণ ও ব্যবহার'] },
          { title: 'পদার্থ ও যৌগ', items: ['মৌল, যৌগ ও মিশ্রণ', 'ধাতু ও অধাতু', 'জৈব ও অজৈব যৌগ', 'কার্বন ও হাইড্রোকার্বন', 'পলিমার ও প্লাস্টিক'] },
          { title: 'দৈনন্দিন রসায়ন', items: ['সাবান ও ডিটারজেন্ট', 'সার ও কীটনাশক', 'খাদ্য সংরক্ষণ', 'জ্বালানি ও দহন', 'পানি বিশুদ্ধকরণ'] }
        ]
      },
      {
        title: 'জীববিজ্ঞান',
        subtopics: [
          { title: 'কোষ ও টিস্যু', items: ['কোষের গঠন ও অঙ্গাণু', 'উদ্ভিদ ও প্রাণিকোষ', 'কোষ বিভাজন: মাইটোসিস ও মিয়োসিস', 'টিস্যু ও অঙ্গতন্ত্র'] },
          { title: 'মানবদেহ ও শারীরবৃত্ত', items: ['পরিপাক ও পুষ্টি', 'রক্ত ও রক্তসংবহন', 'শ্বাসক্রিয়া ও গ্যাস বিনিময়', 'রেচন ও বৃক্ক', 'স্নায়ুতন্ত্র ও হরমোন', 'কঙ্কাল ও পেশিতন্ত্র', 'প্রজনন ও বংশগতি'] },
          { title: 'জিনতত্ত্ব ও বিবর্তন', items: ['DNA, RNA ও জিন', 'ক্রোমোজোম ও বংশগতি', 'মেন্ডেলের সূত্র', 'বিবর্তন ও প্রাকৃতিক নির্বাচন'] },
          { title: 'উদ্ভিদবিজ্ঞান', items: ['উদ্ভিদের অঙ্গ ও কাজ', 'সালোকসংশ্লেষণ', 'শ্বসন ও প্রস্বেদন', 'উদ্ভিদের প্রজনন ও পরাগায়ন'] },
          { title: 'অণুজীব ও রোগ', items: ['ব্যাকটেরিয়া, ভাইরাস ও ছত্রাক', 'পরজীবী ও প্রোটোজোয়া', 'সংক্রামক ও অসংক্রামক রোগ', 'টিকা ও রোগ প্রতিরোধ', 'অ্যান্টিবায়োটিক ও জীবাণুনাশক'] }
        ]
      },
      {
        title: 'স্বাস্থ্য, পুষ্টি ও ব্যবহারিক বিজ্ঞান',
        subtopics: [
          { title: 'খাদ্য ও পুষ্টি', items: ['শর্করা, আমিষ ও স্নেহ', 'ভিটামিন ও খনিজ লবণ', 'পানির প্রয়োজনীয়তা', 'পুষ্টিহীনতা ও অভাবজনিত রোগ'] },
          { title: 'জনস্বাস্থ্য', items: ['ব্যক্তিগত ও পরিবেশগত স্বাস্থ্যবিধি', 'বিশুদ্ধ পানি ও স্যানিটেশন', 'টিকাদান ও জনস্বাস্থ্য কর্মসূচি', 'প্রাথমিক চিকিৎসার সাধারণ ধারণা'] },
          { title: 'বৈজ্ঞানিক আবিষ্কার', items: ['গুরুত্বপূর্ণ বিজ্ঞানী ও তাঁদের আবিষ্কার', 'বৈজ্ঞানিক যন্ত্রপাতি', 'মহাকাশ ও জ্যোতির্বিজ্ঞান', 'নবায়নযোগ্য জ্বালানি ও আধুনিক প্রযুক্তি'] }
        ]
      }
    ]
  },
  {
    id: 'ict',
    title: 'Computer & ICT',
    bn: 'কম্পিউটার ও তথ্যপ্রযুক্তি',
    icon: '⌘',
    color: 'indigo',
    description: 'কম্পিউটার, নেটওয়ার্ক, ডেটাবেজ, সাইবার নিরাপত্তা ও ডিজিটাল সেবা।',
    topics: [
      {
        title: 'কম্পিউটারের মৌলিক ধারণা',
        subtopics: [
          { title: 'কম্পিউটারের পরিচিতি', items: ['কম্পিউটারের সংজ্ঞা ও বৈশিষ্ট্য', 'কম্পিউটারের প্রজন্ম', 'কম্পিউটারের শ্রেণিবিভাগ', 'অ্যানালগ, ডিজিটাল ও হাইব্রিড কম্পিউটার'] },
          { title: 'হার্ডওয়্যার ও সফটওয়্যার', items: ['CPU ও এর অংশ', 'মাদারবোর্ড ও প্রসেসর', 'ইনপুট ও আউটপুট ডিভাইস', 'RAM, ROM ও ক্যাশ মেমোরি', 'সিস্টেম ও অ্যাপ্লিকেশন সফটওয়্যার'] },
          { title: 'ডেটা ও সংখ্যা পদ্ধতি', items: ['বিট, বাইট ও ডেটা একক', 'বাইনারি, অক্টাল, দশমিক ও হেক্সাডেসিমাল', 'সংখ্যা পদ্ধতির রূপান্তর', 'ASCII ও Unicode'] },
          { title: 'অপারেটিং সিস্টেম', items: ['অপারেটিং সিস্টেমের কাজ', 'Windows, Linux, Android ও iOS', 'ফাইল ও ফোল্ডার ব্যবস্থাপনা', 'সফটওয়্যার ইনস্টলেশন ও আপডেট'] }
        ]
      },
      {
        title: 'কম্পিউটার নেটওয়ার্ক ও ইন্টারনেট',
        subtopics: [
          { title: 'নেটওয়ার্কের ধরন', items: ['LAN, MAN ও WAN', 'PAN ও WLAN', 'নেটওয়ার্ক টপোলজি', 'সার্ভার ও ক্লায়েন্ট'] },
          { title: 'নেটওয়ার্ক ডিভাইস', items: ['মডেম, রাউটার ও সুইচ', 'হাব, ব্রিজ ও রিপিটার', 'নেটওয়ার্ক কার্ড ও অ্যাকসেস পয়েন্ট'] },
          { title: 'ইন্টারনেট ও ওয়েব', items: ['ইন্টারনেট ও ইন্ট্রানেট', 'WWW, ওয়েবসাইট ও ওয়েবপেজ', 'ব্রাউজার ও সার্চ ইঞ্জিন', 'URL, IP ও DNS', 'HTTP, HTTPS ও FTP', 'ই-মেইল ও অনলাইন যোগাযোগ'] },
          { title: 'ক্লাউড ও আধুনিক সেবা', items: ['ক্লাউড কম্পিউটিং', 'ডেটা সেন্টার', 'সামাজিক যোগাযোগমাধ্যম', 'ই-কমার্স ও ডিজিটাল লেনদেন'] }
        ]
      },
      {
        title: 'ডেটাবেজ ও প্রোগ্রামিং',
        subtopics: [
          { title: 'ডেটাবেজ', items: ['ডেটা ও তথ্যের পার্থক্য', 'ডেটাবেজ ম্যানেজমেন্ট সিস্টেম', 'টেবিল, রেকর্ড ও ফিল্ড', 'প্রাইমারি ও ফরেন কী', 'SQL-এর প্রাথমিক ধারণা'] },
          { title: 'প্রোগ্রামিং', items: ['প্রোগ্রাম ও প্রোগ্রামিং ভাষা', 'মেশিন, অ্যাসেম্বলি ও উচ্চস্তরের ভাষা', 'অ্যালগরিদম ও ফ্লোচার্ট', 'ভেরিয়েবল ও ডেটা টাইপ', 'শর্ত, লুপ ও ফাংশন'] },
          { title: 'অফিস অ্যাপ্লিকেশন', items: ['Word processing', 'Spreadsheet ও সূত্র', 'Presentation software', 'ডেটা বিশ্লেষণ ও চার্ট'] }
        ]
      },
      {
        title: 'সাইবার নিরাপত্তা ও ডিজিটাল প্রযুক্তি',
        subtopics: [
          { title: 'সাইবার নিরাপত্তার ধারণা', items: ['তথ্য নিরাপত্তা ও গোপনীয়তা', 'পাসওয়ার্ড ও বহুধাপ যাচাইকরণ', 'ম্যালওয়্যার, ভাইরাস ও র‍্যানসমওয়্যার', 'ফিশিং ও অনলাইন প্রতারণা', 'নিরাপদ ব্রাউজিং ও সাইবার সচেতনতা'] },
          { title: 'ডিজিটাল নিরাপত্তা', items: ['এনক্রিপশন ও ডিক্রিপশন', 'ডিজিটাল স্বাক্ষর ও সার্টিফিকেট', 'ব্যাকআপ ও ডেটা সুরক্ষা', 'সাইবার অপরাধ ও আইনগত সচেতনতা'] },
          { title: 'বাংলাদেশের ICT', items: ['ডিজিটাল বাংলাদেশ ধারণা', 'স্মার্ট বাংলাদেশ উদ্যোগ', 'ই-গভর্ন্যান্স ও ই-সেবা', 'জাতীয় তথ্য ও যোগাযোগ প্রযুক্তি নীতি', 'ডিজিটাল আর্থিক সেবা'] },
          { title: 'উদীয়মান প্রযুক্তি', items: ['কৃত্রিম বুদ্ধিমত্তা (AI)', 'মেশিন লার্নিং', 'রোবটিক্স ও অটোমেশন', 'ইন্টারনেট অব থিংস (IoT)', 'ব্লকচেইন ও বিগ ডেটা'] }
        ]
      }
    ]
  },
  {
    id: 'ethics',
    title: 'Ethics & Good Governance',
    bn: 'নৈতিকতা, মূল্যবোধ ও সুশাসন',
    icon: '⚖',
    color: 'gold',
    description: 'নৈতিকতা, মূল্যবোধ, সততা, জবাবদিহি ও সুশাসন।',
    topics: [
      {
        title: 'নৈতিকতা ও মূল্যবোধ',
        subtopics: [
          { title: 'নৈতিকতার মৌলিক ধারণা', items: ['নৈতিকতা ও অনৈতিকতা', 'নৈতিকতা ও আইনের সম্পর্ক', 'ব্যক্তিগত ও সামাজিক নৈতিকতা', 'পেশাগত নৈতিকতা'] },
          { title: 'মূল্যবোধ', items: ['মানবিক ও সামাজিক মূল্যবোধ', 'সততা, নিষ্ঠা ও দায়িত্ববোধ', 'সহনশীলতা ও পরমতসহিষ্ণুতা', 'সমতা, ন্যায়বিচার ও মানবিক মর্যাদা'] },
          { title: 'নৈতিক সিদ্ধান্ত গ্রহণ', items: ['নৈতিক দ্বন্দ্ব ও সমাধান', 'নৈতিক যুক্তি ও বিবেচনা', 'স্বার্থের সংঘাত', 'ব্যক্তিগত ও প্রাতিষ্ঠানিক সততা'] }
        ]
      },
      {
        title: 'সুশাসন',
        subtopics: [
          { title: 'সুশাসনের ধারণা ও উপাদান', items: ['সুশাসনের সংজ্ঞা ও বৈশিষ্ট্য', 'আইনের শাসন', 'অংশগ্রহণ ও ঐকমত্য', 'স্বচ্ছতা ও জবাবদিহি', 'দক্ষতা ও কার্যকারিতা', 'অন্তর্ভুক্তি ও ন্যায়সংগততা'] },
          { title: 'সুশাসনের প্রতিবন্ধকতা', items: ['দুর্নীতি ও স্বজনপ্রীতি', 'ক্ষমতার অপব্যবহার', 'প্রশাসনিক জটিলতা', 'রাজনৈতিক ও প্রাতিষ্ঠানিক দুর্বলতা'] },
          { title: 'সুশাসন প্রতিষ্ঠার উপায়', items: ['দুর্নীতি প্রতিরোধ', 'সামাজিক জবাবদিহি', 'নাগরিক অংশগ্রহণ', 'প্রাতিষ্ঠানিক সংস্কার', 'তথ্য অধিকার ও স্বচ্ছতা'] }
        ]
      },
      {
        title: 'জনপ্রশাসন ও সরকারি সেবা',
        subtopics: [
          { title: 'বাংলাদেশের প্রশাসনিক কাঠামো', items: ['কেন্দ্রীয় প্রশাসন', 'বিভাগ, জেলা ও উপজেলা প্রশাসন', 'মন্ত্রণালয় ও অধিদপ্তর', 'স্থানীয় সরকার প্রতিষ্ঠান'] },
          { title: 'জনপ্রশাসনের ধারণা', items: ['জনপ্রশাসনের প্রকৃতি ও পরিধি', 'আমলাতন্ত্র ও প্রশাসনিক কাঠামো', 'নীতি প্রণয়ন ও বাস্তবায়ন', 'সরকারি কর্মচারীর দায়িত্ব ও আচরণবিধি'] },
          { title: 'নাগরিক সেবা ও অধিকার', items: ['নাগরিক সনদ', 'অভিযোগ প্রতিকার ব্যবস্থা', 'তথ্য অধিকার আইন', 'ই-গভর্ন্যান্স ও ডিজিটাল সেবা', 'সেবা প্রদান ও নাগরিক অংশগ্রহণ'] }
        ]
      }
    ]
  },

  {
    id: 'economics',
    title: 'Economics',
    bn: 'অর্থনীতি',
    icon: '৳',
    color: 'green',
    description: 'Microeconomics, macroeconomics and Bangladesh economy.',
    topics: [
      {
        title: 'অর্থনীতির মৌলিক ধারণা',
        subtopics: [
          { title: 'অর্থনীতির পরিচিতি', items: ['অর্থনীতির সংজ্ঞা, প্রকৃতি ও পরিধি', 'ব্যক্তি ও সামষ্টিক অর্থনীতি', 'দুষ্প্রাপ্যতা, অভাব ও নির্বাচন', 'সুযোগ ব্যয় ও উৎপাদন সম্ভাবনা রেখা'] },
          { title: 'অর্থনৈতিক ব্যবস্থা', items: ['পুঁজিবাদী অর্থনীতি', 'সমাজতান্ত্রিক অর্থনীতি', 'মিশ্র অর্থনীতি', 'বাজার ও পরিকল্পিত অর্থনীতি'] },
          { title: 'উৎপাদনের উপাদান', items: ['ভূমি, শ্রম, মূলধন ও সংগঠন', 'উৎপাদন, বণ্টন ও ভোগ', 'উৎপাদনশীলতা ও দক্ষতা'] }
        ]
      },
      {
        title: 'ব্যষ্টিক অর্থনীতি',
        subtopics: [
          { title: 'চাহিদা ও যোগান', items: ['চাহিদার সংজ্ঞা ও নির্ধারক', 'চাহিদার বিধি ও ব্যতিক্রম', 'যোগানের সংজ্ঞা ও নির্ধারক', 'যোগানের বিধি', 'বাজার ভারসাম্য ও ভারসাম্য মূল্য'] },
          { title: 'স্থিতিস্থাপকতা', items: ['চাহিদার মূল্য স্থিতিস্থাপকতা', 'আয় স্থিতিস্থাপকতা', 'আড়াআড়ি স্থিতিস্থাপকতা', 'যোগানের স্থিতিস্থাপকতা'] },
          { title: 'ভোক্তা ও উৎপাদন', items: ['উপযোগ ও প্রান্তিক উপযোগ', 'ক্রমহ্রাসমান প্রান্তিক উপযোগ বিধি', 'উদাসীনতা রেখা', 'উৎপাদন অপেক্ষক', 'ক্রমহ্রাসমান উৎপাদন বিধি'] },
          { title: 'ব্যয় ও বাজার', items: ['স্থির ও পরিবর্তনশীল ব্যয়', 'গড় ও প্রান্তিক ব্যয়', 'পূর্ণ প্রতিযোগিতা', 'একচেটিয়া বাজার', 'অলিগোপলি ও একচেটিয়া প্রতিযোগিতা'] }
        ]
      },
      {
        title: 'সামষ্টিক অর্থনীতি',
        subtopics: [
          { title: 'জাতীয় আয়', items: ['GDP, GNP ও NNP', 'জাতীয় আয় পরিমাপের পদ্ধতি', 'নামমাত্র ও প্রকৃত GDP', 'মাথাপিছু আয় ও অর্থনৈতিক প্রবৃদ্ধি'] },
          { title: 'ভোগ, সঞ্চয় ও বিনিয়োগ', items: ['ভোগ অপেক্ষক', 'সঞ্চয় ও বিনিয়োগ', 'প্রান্তিক ভোগ প্রবণতা', 'গুণক ও ত্বরক'] },
          { title: 'মুদ্রা ও ব্যাংকিং', items: ['মুদ্রার সংজ্ঞা ও কার্যাবলি', 'অর্থের যোগান', 'বাণিজ্যিক ব্যাংকের ভূমিকা', 'কেন্দ্রীয় ব্যাংক ও ঋণ নিয়ন্ত্রণ'] },
          { title: 'মুদ্রাস্ফীতি ও কর্মসংস্থান', items: ['মুদ্রাস্ফীতির কারণ ও প্রভাব', 'মুদ্রাসংকোচন', 'বেকারত্বের ধরন', 'ব্যবসায় চক্র ও অর্থনৈতিক মন্দা'] },
          { title: 'রাজস্ব ও মুদ্রানীতি', items: ['রাজস্বনীতির উদ্দেশ্য', 'প্রত্যক্ষ ও পরোক্ষ কর', 'সরকারি আয় ও ব্যয়', 'মুদ্রানীতির উপকরণ'] }
        ]
      },
      {
        title: 'বাংলাদেশের অর্থনীতি',
        subtopics: [
          { title: 'অর্থনৈতিক কাঠামো', items: ['বাংলাদেশের অর্থনীতির বৈশিষ্ট্য', 'কৃষি, শিল্প ও সেবা খাত', 'GDP ও প্রবৃদ্ধি', 'দারিদ্র্য ও আয় বৈষম্য'] },
          { title: 'উন্নয়ন ও পরিকল্পনা', items: ['উন্নয়ন পরিকল্পনা', 'পঞ্চবার্ষিক পরিকল্পনা', 'প্রেক্ষিত পরিকল্পনা', 'SDG ও অন্তর্ভুক্তিমূলক উন্নয়ন'] },
          { title: 'বৈদেশিক খাত', items: ['রপ্তানি ও আমদানি', 'বাণিজ্য ভারসাম্য', 'Balance of Payments', 'রেমিট্যান্স ও বৈদেশিক মুদ্রার রিজার্ভ', 'বৈদেশিক বিনিয়োগ ও ঋণ'] },
          { title: 'বাজেট ও আর্থিক খাত', items: ['জাতীয় বাজেট', 'রাজস্ব আয় ও সরকারি ব্যয়', 'কর ও ভ্যাট', 'বাংলাদেশ ব্যাংকের ভূমিকা', 'ব্যাংক ও আর্থিক প্রতিষ্ঠানের ভূমিকা'] }
        ]
      }
    ]
  },
  {
    id: 'banking',
    title: 'Banking & Finance',
    bn: 'ব্যাংকিং, ফিন্যান্স ও হিসাববিজ্ঞান',
    icon: '৳',
    color: 'navy',
    description: 'Banking, finance, accounting and financial markets.',
    topics: [
      {
        title: 'ব্যাংকিংয়ের মৌলিক ধারণা',
        subtopics: [
          { title: 'ব্যাংকের পরিচিতি', items: ['ব্যাংকের সংজ্ঞা ও কার্যাবলি', 'ব্যাংকের শ্রেণিবিভাগ', 'বাণিজ্যিক ও বিশেষায়িত ব্যাংক', 'কেন্দ্রীয় ব্যাংকের ভূমিকা'] },
          { title: 'ব্যাংকিং কার্যক্রম', items: ['আমানত ও আমানতের ধরন', 'ঋণ ও অগ্রিম', 'চেক ও বিনিময় বিল', 'ব্যাংক হিসাব ও হিসাব পরিচালনা', 'ব্যাংকের গ্রাহকসেবা'] },
          { title: 'আধুনিক ব্যাংকিং', items: ['মোবাইল ও এজেন্ট ব্যাংকিং', 'ইন্টারনেট ও ডিজিটাল ব্যাংকিং', 'কার্ড ও ইলেকট্রনিক পেমেন্ট', 'আর্থিক অন্তর্ভুক্তি'] }
        ]
      },
      {
        title: 'ফিন্যান্স ও আর্থিক বাজার',
        subtopics: [
          { title: 'ফিন্যান্সের মৌলিক ধারণা', items: ['ফিন্যান্সের সংজ্ঞা ও পরিধি', 'ব্যক্তিগত ও ব্যবসায়িক অর্থায়ন', 'অর্থের সময়মূল্য', 'বর্তমান ও ভবিষ্যৎ মূল্য'] },
          { title: 'আর্থিক বাজার', items: ['মুদ্রাবাজার ও পুঁজিবাজার', 'প্রাথমিক ও দ্বিতীয় বাজার', 'শেয়ার ও বন্ড', 'স্টক এক্সচেঞ্জ', 'সিকিউরিটিজ ও বিনিয়োগ'] },
          { title: 'ঝুঁকি ও ব্যবস্থাপনা', items: ['আর্থিক ঝুঁকির ধরন', 'ঝুঁকি ও মুনাফার সম্পর্ক', 'বিনিয়োগের মৌলিক ধারণা', 'বীমা ও ঝুঁকি হ্রাস'] },
          { title: 'আন্তর্জাতিক ফিন্যান্স', items: ['বৈদেশিক মুদ্রা বিনিময়', 'বিনিময় হার', 'আন্তর্জাতিক ব্যাংকিং', 'Balance of Payments'] }
        ]
      },
      {
        title: 'হিসাববিজ্ঞান',
        subtopics: [
          { title: 'হিসাববিজ্ঞানের ভিত্তি', items: ['হিসাববিজ্ঞানের সংজ্ঞা ও উদ্দেশ্য', 'হিসাববিজ্ঞানের নীতি ও ধারণা', 'সম্পদ, দায় ও মালিকানা স্বত্ব', 'হিসাব সমীকরণ'] },
          { title: 'হিসাবের বই', items: ['জাবেদা ও লেনদেন', 'খতিয়ান ও হিসাবের শ্রেণিবিভাগ', 'রেওয়ামিল', 'সমন্বয় ও সমাপনী দাখিলা'] },
          { title: 'আর্থিক বিবরণী', items: ['আয় বিবরণী', 'আর্থিক অবস্থার বিবরণী', 'নগদ প্রবাহ বিবরণী', 'অবচয় ও মজুত পণ্য', 'ব্যাংক সমন্বয় বিবরণী'] },
          { title: 'আর্থিক বিশ্লেষণ', items: ['তারল্য অনুপাত', 'লাভজনকতা অনুপাত', 'দক্ষতা ও ঋণ অনুপাত', 'আর্থিক বিবরণী বিশ্লেষণ'] }
        ]
      },
      {
        title: 'বাংলাদেশের ব্যাংকিং ব্যবস্থা',
        subtopics: [
          { title: 'বাংলাদেশ ব্যাংক', items: ['প্রতিষ্ঠা ও কার্যাবলি', 'মুদ্রানীতি ও ব্যাংক তদারকি', 'ব্যাংক নোট ও মুদ্রা ব্যবস্থাপনা', 'বৈদেশিক মুদ্রার রিজার্ভ'] },
          { title: 'ব্যাংক ও আর্থিক প্রতিষ্ঠান', items: ['তফসিলি ব্যাংক', 'সরকারি ও বেসরকারি ব্যাংক', 'বিশেষায়িত ব্যাংক', 'আর্থিক প্রতিষ্ঠান ও ক্ষুদ্রঋণ'] },
          { title: 'ব্যাংকিং নিয়ন্ত্রণ ও ঝুঁকি', items: ['ব্যাংকিং আইন ও বিধিবিধান', 'ঋণ শ্রেণিকরণ ও খেলাপি ঋণ', 'প্রভিশনিং ও মূলধন পর্যাপ্ততা', 'KYC ও AML-এর ধারণা', 'ব্যাংকিং ঝুঁকি ব্যবস্থাপনা'] }
        ]
      }
    ]
  },
  {
    id: 'admin',
    title: 'Government & Post-specific',
    bn: 'সরকারি চাকরি ও পদভিত্তিক প্রস্তুতি',
    icon: '▤',
    color: 'slate',
    description: 'সরকারি নিয়োগ পরীক্ষা ও পদভিত্তিক প্রস্তুতি।',
    topics: [
      {
        title: 'সাধারণ নিয়োগ পরীক্ষার বিষয়',
        subtopics: [
          { title: 'ভাষা ও সাহিত্য', items: ['বাংলা ব্যাকরণ ও সাহিত্য', 'English Grammar and Literature', 'অনুবাদ ও লিখিত দক্ষতা'] },
          { title: 'গণিত ও মানসিক দক্ষতা', items: ['পাটিগণিত ও বীজগণিত', 'জ্যামিতি ও পরিমিতি', 'যুক্তি ও বিশ্লেষণ', 'মানসিক দক্ষতা'] },
          { title: 'সাধারণ জ্ঞান', items: ['বাংলাদেশ বিষয়াবলি', 'আন্তর্জাতিক বিষয়াবলি', 'সাধারণ বিজ্ঞান', 'কম্পিউটার ও তথ্যপ্রযুক্তি', 'ভূগোল ও পরিবেশ'] }
        ]
      },
      {
        title: 'মন্ত্রণালয় ও অধিদপ্তরভিত্তিক প্রস্তুতি',
        subtopics: [
          { title: 'প্রশাসনিক ও আইনগত জ্ঞান', items: ['বাংলাদেশের সংবিধান', 'সরকারি প্রশাসন ও দাপ্তরিক কাঠামো', 'প্রাসঙ্গিক আইন, বিধি ও নীতিমালা', 'সরকারি কর্মচারী আচরণবিধি'] },
          { title: 'দপ্তর ও প্রতিষ্ঠানের কার্যাবলি', items: ['সংশ্লিষ্ট মন্ত্রণালয়ের দায়িত্ব', 'অধিদপ্তর ও সংস্থার কাজ', 'সেবা ও প্রকল্প সম্পর্কে ধারণা', 'প্রাসঙ্গিক সরকারি কর্মসূচি'] },
          { title: 'পদভিত্তিক প্রস্তুতি', items: ['নিয়োগ বিজ্ঞপ্তি ও নির্দিষ্ট সিলেবাস বিশ্লেষণ', 'পদের দায়িত্ব ও কাজ', 'প্রয়োজনীয় পেশাগত ও কারিগরি জ্ঞান', 'লিখিত ও ব্যবহারিক পরীক্ষার প্রস্তুতি'] }
        ]
      },
      {
        title: 'লিখিত পরীক্ষা ও ভাইভা',
        subtopics: [
          { title: 'লিখিত প্রস্তুতি', items: ['রচনা ও প্রবন্ধ', 'সারাংশ ও অনুবাদ', 'প্রতিবেদন ও আবেদনপত্র', 'গাণিতিক ও বিশ্লেষণধর্মী প্রশ্ন'] },
          { title: 'ভাইভা প্রস্তুতি', items: ['নিজের পরিচয় ও শিক্ষাগত যোগ্যতা', 'নিজ জেলা ও উপজেলা সম্পর্কে জ্ঞান', 'সংশ্লিষ্ট দপ্তর ও পদের দায়িত্ব', 'সাম্প্রতিক বিষয় ও সাধারণ জ্ঞান', 'যোগাযোগ ও উপস্থাপন দক্ষতা'] },
          { title: 'পরীক্ষার তথ্য ও ব্যবস্থাপনা', items: ['নিয়োগ বিজ্ঞপ্তি ও আবেদন', 'প্রবেশপত্র ও পরীক্ষার সময়সূচি', 'অফিশিয়াল ফলাফল ও নোটিশ', 'প্রতিষ্ঠানের সরকারি ওয়েবসাইট থেকে তথ্য যাচাই'] }
        ]
      }
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

  const topicHTML = subject.topics.map((topic, groupIndex) => {
    const topicTitle = Array.isArray(topic) ? topic[0] : topic.title;
    const subs = Array.isArray(topic) ? topic[1] : topic.subtopics;

    return `
      <details class="topic-group" open>
        <summary>
          <span>${escapeHtml(topicTitle)}</span>
          <small>${bn(subs.length)}টি সাবটপিক</small>
        </summary>
        <ol>
          ${subs.map((sub, subIndex) => {
            const subTitle = typeof sub === 'string' ? sub : sub.title;
            const items = typeof sub === 'string' ? [] : (sub.items || []);
            const key = `${subject.id}:${groupIndex}:${subIndex}`;
            const done = Boolean(progress[key]);

            return `
              <li class="topic-line">
                <span>${escapeHtml(subTitle)}</span>
                <button class="topic-check ${done ? 'completed' : ''}"
                  type="button"
                  data-topic-check="${escapeHtml(key)}">
                  ${done ? '✓ সম্পন্ন' : 'পড়া শেষ হয়নি'}
                </button>
                ${items.length ? `
                  <ul class="subtopic-details">
                    ${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}
                  </ul>
                ` : ''}
              </li>
            `;
          }).join('')}
        </ol>
      </details>
    `;
  }).join('');

  $('subjectDetail').classList.remove('hidden');
  $('subjectDetail').innerHTML = `
    <div class="detail-head">
      <div>
        <span class="eyebrow">SUBJECT FOLDER</span>
        <h3>${escapeHtml(subject.title)}</h3>
        <p class="muted">${escapeHtml(subject.bn)} · ${escapeHtml(subject.description)}</p>
      </div>
      <button type="button" class="button button-light" id="closeSubject">বন্ধ করুন</button>
    </div>
    <div class="topic-groups">${topicHTML}</div>
  `;

  $('subjectDetail').scrollIntoView({ behavior: 'smooth', block: 'start' });

  $('closeSubject').addEventListener('click', () => {
    $('subjectDetail').classList.add('hidden');
  });

  $('subjectDetail').querySelectorAll('[data-topic-check]').forEach(button => {
    button.addEventListener('click', () => {
      markTopicComplete(
        button.dataset.topicCheck,
        !button.classList.contains('completed')
      );
    });
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
