// Static marketing content for the public site. Bilingual where it is part of
// the curated/marketing copy; news posts keep their original language.

import type { Lang } from '@/i18n';

export interface Bi {
  bn: string;
  en: string;
}

export const ORG = {
  nameEn: 'Chhatradol',
  nameBn: 'ছাত্রদল',
  shortEn: 'Chhatradol',
  shortBn: 'ছাত্রদল',
  taglineBn: 'একতা, শিক্ষা, উন্নতি',
  taglineEn: 'Unity · Education · Progress',
  established: '2019',
  website: 'https://chhatradol.org',
  email: 'info@chhatradol.org',
  phones: ['7811073412'],
  whatsapp: 'https://wa.me/917811073412',
  whatsappNumber: '7811073412',
  address: {
    bn: ['ছাত্রদল অফিস', 'গ্রাম ও পোস্ট: নিজ নাড়াজোল', 'থানা: দাসপুর, জেলা: পশ্চিম মেদিনীপুর', 'পিন: ৭২১২১১, পশ্চিমবঙ্গ, ভারত'],
    en: ['Chhatradol Office', 'Vill. & P.O.: Nij Narajole', 'P.S.: Daspur, Dist.: Paschim Medinipur', 'PIN: 721211, West Bengal, India'],
  },
  social: {
    website: 'https://chhatradol.org',
    facebook: 'https://facebook.com/chhatradolswo',
    instagram: 'https://instagram.com/chhatradolswo',
    twitter: 'https://x.com/Chhatradolswo',
    youtube: 'https://youtube.com/@Chhatradolswo',
    whatsapp: 'https://wa.me/917811073412',
  },
};

export const FALLBACK_IMAGE = '/assets/images/Chhatradol.jpg';

export function name(lang: Lang) {
  return lang === 'en' ? ORG.shortEn : ORG.shortBn;
}

export const NAV_LINKS = [
  { to: '/', key: 'nav.home', exact: true },
  { to: '/about', key: 'nav.about' },
  { to: '/programs', key: 'nav.programs' },
  { to: '/events', key: 'nav.events' },
  { to: '/gallery', key: 'nav.gallery' },
  { to: '/impacts', key: 'nav.impacts' },
  { to: '/contact', key: 'nav.contact' },
  { to: '/volunteer', key: 'nav.volunteer' },
  { to: '/donate', key: 'nav.donate' },
];

export const IMPACT_STATS: { value: Bi; label: Bi }[] = [
  { value: { bn: '৫০০+', en: '500+' }, label: { bn: 'ছাত্র-ছাত্রীকে সাহায্য', en: 'Students supported' } },
  { value: { bn: '২৫+', en: '25+' }, label: { bn: 'স্বাস্থ্য শিবির আয়োজিত', en: 'Health camps held' } },
  { value: { bn: '২০০০+', en: '2000+' }, label: { bn: 'বৃক্ষ রোপণ', en: 'Trees planted' } },
  { value: { bn: '৭+', en: '7+' }, label: { bn: 'বছর ধরে সেবা', en: 'Years of service' } },
];

export interface TeamMember {
  name: Bi;
  role: Bi;
  img: string;
}

export const TEAM_MEMBERS: TeamMember[] = [
  { name: { bn: 'স্বরূপ সামন্ত', en: 'Swarup Samanta' }, role: { bn: 'সভাপতি', en: 'President' }, img: '/assets/images/about/members/swarup.jpg' },
  { name: { bn: 'প্রবাল ভুঁইয়া', en: 'Prabal Bhunia' }, role: { bn: 'সহ-সভাপতি', en: 'Vice President' }, img: '/assets/images/about/members/prabal.jpg' },
  { name: { bn: 'সায়ন সামন্ত', en: 'Sayan Samanta' }, role: { bn: 'সাধারণ সম্পাদক', en: 'General Secretary' }, img: '/assets/images/about/members/sayan.jpg' },
  { name: { bn: 'সুরজিৎ বেরা', en: 'Surajit Bera' }, role: { bn: 'যুগ্ম সম্পাদক', en: 'Joint Secretary' }, img: '/assets/images/about/members/surajit.jpg' },
  { name: { bn: 'শুভজিৎ কুন্ডু', en: 'Subhajit Kundu' }, role: { bn: 'কোষাধ্যক্ষ', en: 'Treasurer' }, img: '/assets/images/about/members/subhajit.jpg' },
  { name: { bn: 'সৌমেন মাইতি', en: 'Soumen Maity' }, role: { bn: 'সহ-কোষাধ্যক্ষ', en: 'Assistant Treasurer' }, img: '/assets/images/about/members/soumen.jpg' },
  { name: { bn: 'শুভদীপ ঘোড়াই', en: 'Subhadip Ghorai' }, role: { bn: 'সদস্য', en: 'Member' }, img: '/assets/images/about/members/subhadip.jpg' },
  { name: { bn: 'পবিত্র সাঁতরা', en: 'Pabitra Santra' }, role: { bn: 'সদস্য', en: 'Member' }, img: '/assets/images/about/members/pabitra.jpg' },
];

export const CORE_VALUES: { label: Bi; text: Bi }[] = [
  { label: { bn: 'শিক্ষা', en: 'Education' }, text: { bn: 'আমরা বিশ্বাস করি শিক্ষা হল উন্নতির চাবিকাঠি।', en: 'We believe education is the key to progress.' } },
  { label: { bn: 'সেবা', en: 'Service' }, text: { bn: 'আমরা নিঃস্বার্থভাবে সমাজের সেবা করি।', en: 'We serve society selflessly.' } },
  { label: { bn: 'সততা', en: 'Integrity' }, text: { bn: 'আমাদের সকল কার্যক্রমে স্বচ্ছতা ও সততা বজায় রাখি।', en: 'We maintain transparency and honesty in all we do.' } },
  { label: { bn: 'সহমর্মিতা', en: 'Compassion' }, text: { bn: 'আমরা প্রতিটি মানুষের প্রতি সহানুভূতিশীল।', en: 'We are compassionate towards everyone.' } },
  { label: { bn: 'দায়িত্বশীলতা', en: 'Accountability' }, text: { bn: 'আমরা আমাদের প্রতিশ্রুতির প্রতি দায়বদ্ধ।', en: 'We are accountable to our commitments.' } },
];

export interface Program {
  title: Bi;
  description: Bi;
  details: Bi;
  icon: string;
}

export const PROGRAMS: Program[] = [
  {
    title: { bn: 'রক্তদান শিবির', en: 'Blood donation camps' },
    description: {
      bn: 'রক্তদান শিবিরের মাধ্যমে স্বেচ্ছাসেবকদের উৎসাহিত করে নিয়মিত রক্তদানের ব্যবস্থা করা হয়, যা জরুরি সময়ে অসহায় রোগীদের জীবন রক্ষায় গুরুত্বপূর্ণ ভূমিকা পালন করে।',
      en: 'We organise regular blood-donation camps, encouraging volunteers to donate so that blood is available for patients in emergencies.',
    },
    details: {
      bn: 'বিশেষজ্ঞ চিকিৎসকরা রক্তদাতাদের স্বাস্থ্য পরীক্ষা করেন, নিরাপদ রক্ত সংগ্রহ নিশ্চিত করেন এবং রক্তদাতাদের জন্য সনদপত্র ও পুষ্টিকর খাদ্য প্রদান করা হয়।',
      en: 'Specialist doctors screen donors, ensure safe collection, and every donor receives a certificate and refreshments.',
    },
    icon: '/assets/images/favicon/favicon192.png',
  },
  {
    title: { bn: 'পোশাক বিতরণ', en: 'Clothing distribution' },
    description: {
      bn: 'দরিদ্র ও অসহায় মানুষের জন্য নিয়মিত বিনামূল্যে পোশাক বিতরণের ব্যবস্থা করা হয়, যা পিছিয়ে থাকা পরিবারের মৌলিক প্রয়োজন পূরণে সহায়তা করে।',
      en: 'We regularly distribute free clothing to the poor and needy, helping families meet a basic essential need.',
    },
    details: {
      bn: 'শিশু, নারী ও পুরুষ—সকলের জন্য নতুন বা ভাল মানের ব্যবহৃত পোশাক সংগ্রহ করে বাছাই করে উপকারভোগীদের হাতে তুলে দেওয়া হয়।',
      en: 'Volunteers collect new and good-quality used clothes for children, women and men, sort them and hand them to those in need.',
    },
    icon: '/assets/images/favicon/favicon192.png',
  },
  {
    title: { bn: 'পরিবেশ সুরক্ষা ও বৃক্ষরোপণ', en: 'Environment & tree plantation' },
    description: {
      bn: 'পরিবেশের ভারসাম্য বজায় রাখতে ও দূষণ কমাতে নিয়মিত বৃক্ষরোপণ অভিযান ও পরিচ্ছন্নতা কর্মসূচি পালন করা হয়।',
      en: 'We run regular tree-plantation and cleanliness drives to protect the environment and reduce pollution.',
    },
    details: {
      bn: 'প্রতি বছর বিভিন্ন স্থানে বৃক্ষরোপণ ও চারা বিতরণ করা হয় এবং জনবহুল এলাকায় পরিচ্ছন্নতা অভিযান পরিচালিত হয়।',
      en: 'Each year we plant trees, distribute saplings and run clean-up drives in busy public areas.',
    },
    icon: '/assets/images/favicon/favicon192.png',
  },
  {
    title: { bn: 'শীতবস্ত্র বিতরণ', en: 'Winter clothing drive' },
    description: {
      bn: 'কঠোর শীতে দরিদ্র ও ছিন্নমূল মানুষ যাতে কষ্ট না পায়, সেজন্য শীতবস্ত্র বিতরণ কর্মসূচি পরিচালনা করা হয়।',
      en: 'So that the poor and homeless do not suffer in the harsh cold, we run a winter-clothing distribution programme.',
    },
    details: {
      bn: 'কম্বল, সোয়েটার, জ্যাকেট, ক্যাপ ও মোজা গ্রামীণ এলাকা, স্টেশন ও বস্তিতে পৌঁছে দেওয়া হয়।',
      en: 'Blankets, sweaters, jackets, caps and socks are delivered to villages, stations and slums.',
    },
    icon: '/assets/images/favicon/favicon192.png',
  },
  {
    title: { bn: 'শিক্ষাদান কর্মসূচি', en: 'Free tutoring' },
    description: {
      bn: 'দরিদ্র ও মেধাবী শিক্ষার্থীদের জন্য বিনামূল্যে শিক্ষাদানের ব্যবস্থা করা হয়, যাতে তারা উজ্জ্বল ভবিষ্যৎ গড়তে পারে।',
      en: 'We provide free tutoring for poor but talented students so they can build a bright future.',
    },
    details: {
      bn: 'অভিজ্ঞ শিক্ষকরা নিয়মিত ক্লাস নেন, পরীক্ষার প্রস্তুতিতে সহায়তা করেন এবং বই-খাতাসহ শিক্ষাসামগ্রী সরবরাহ করা হয়।',
      en: 'Experienced teachers hold regular classes, help with exam preparation, and books and stationery are provided.',
    },
    icon: '/assets/images/favicon/favicon192.png',
  },
  {
    title: { bn: 'জরুরি ত্রাণ বিতরণ', en: 'Emergency relief' },
    description: {
      bn: 'প্রাকৃতিক দুর্যোগ বা সংকটে অসহায় ও ক্ষতিগ্রস্ত মানুষের পাশে দাঁড়িয়ে দ্রুত খাদ্য, জল ও ওষুধ পৌঁছে দেওয়া হয়।',
      en: 'In natural disasters and crises we stand by the affected, quickly delivering food, water and medicine.',
    },
    details: {
      bn: 'স্বেচ্ছাসেবকরা ক্ষতিগ্রস্ত এলাকায় পৌঁছে চাল, ডাল, তেল, শুকনো খাবার ও বিশুদ্ধ জলসহ জরুরি সামগ্রী বিতরণ করেন।',
      en: 'Volunteers reach affected areas and distribute rice, pulses, oil, dry food, clean water and other essentials.',
    },
    icon: '/assets/images/favicon/favicon192.png',
  },
  {
    title: { bn: 'স্বাস্থ্য সচেতনতা ও শিবির', en: 'Health awareness & camps' },
    description: {
      bn: 'নিয়মিত স্বাস্থ্য শিবিরে বিনামূল্যে স্বাস্থ্য পরীক্ষা, ঔষধ বিতরণ ও রোগ সম্পর্কে সচেতনতা বৃদ্ধি করা হয়।',
      en: 'Regular health camps offer free check-ups, medicine distribution and disease-awareness sessions.',
    },
    details: {
      bn: 'বিশেষজ্ঞ ডাক্তাররা প্রাথমিক পরীক্ষা করেন, বিনামূল্যে ঔষধ দেন এবং ডায়াবেটিস ও রক্তচাপ নিয়ে পরামর্শ দেন।',
      en: 'Specialist doctors carry out check-ups, give free medicine and advise on diabetes and blood pressure.',
    },
    icon: '/assets/images/favicon/favicon192.png',
  },
  {
    title: { bn: 'নারী ও শিশু উন্নয়ন', en: 'Women & child development' },
    description: {
      bn: 'নারী ও শিশুদের অধিকার রক্ষা ও উন্নয়নে কর্মশালা, প্রশিক্ষণ ও সহায়তা প্রদান করা হয়।',
      en: 'We run workshops, training and support to protect and develop the rights of women and children.',
    },
    details: {
      bn: 'নারী স্বাবলম্বীকরণে সেলাই, হস্তশিল্প ও কম্পিউটার প্রশিক্ষণ এবং শিশুদের জন্য পুষ্টি ও সাংস্কৃতিক কর্মসূচি আয়োজন করা হয়।',
      en: 'Sewing, handicraft and computer training empower women, while nutrition and cultural programmes support children.',
    },
    icon: '/assets/images/favicon/favicon192.png',
  },
];

export interface Testimonial {
  quote: Bi;
  author: Bi;
  role: Bi;
}

export const TESTIMONIALS: Testimonial[] = [
  {
    quote: {
      bn: 'ছাত্রদল আমার সন্তানকে বিনামূল্যে শিক্ষার সুযোগ দিয়েছে। আমি চিরকৃতজ্ঞ।',
      en: 'Chhatradol gave my child the opportunity of free education. I am forever grateful.',
    },
    author: { bn: 'অজয় বিশ্বাস', en: 'Ajay Biswas' },
    role: { bn: 'অভিভাবক', en: 'Guardian' },
  },
  {
    quote: {
      bn: 'এই সংগঠনের স্বাস্থ্য শিবিরগুলি আমাদের গ্রামের মানুষের জন্য অত্যন্ত উপকারী।',
      en: "This Organization's health camps have been extremely helpful for our village.",
    },
    author: { bn: 'সুজয় দাশ', en: 'Sujay Das' },
    role: { bn: 'গ্রামবাসী', en: 'Villager' },
  },
  {
    quote: {
      bn: 'স্বেচ্ছাসেবক হিসেবে কাজ করতে পেরে গর্বিত। এটি সমাজে ইতিবাচক পরিবর্তন আনতে সাহায্য করে।',
      en: 'I am proud to work as a volunteer. It helps bring positive change to society.',
    },
    author: { bn: 'অঙ্কিতা মন্ডল', en: 'Ankita Mondal' },
    role: { bn: 'স্বেচ্ছাসেবিকা', en: 'Volunteer' },
  },
];

export interface SuccessStory {
  id?: string;
  title: Bi;
  summary: Bi;
  quote?: Bi;
  author?: Bi;
  category?: Bi;
  fullContent?: Bi;
  img: string;
}

export const SUCCESS_STORIES: SuccessStory[] = [
  {
    id: 'priti-kumari',
    title: { bn: 'শিক্ষাজীবন: অন্ধকার থেকে আলো', en: 'Education: From Darkness to Light' },
    summary: {
      bn: 'একজন দরিদ্র পরিবারের সন্তান আমাদের শিক্ষাবৃত্তির মাধ্যমে পড়াশোনা সম্পন্ন করে এখন স্বপ্ন দেখছে ডাক্তার হওয়ার।',
      en: 'A child from an underprivileged family received educational support and books, allowing her to stay in school and excel.',
    },
    quote: {
      bn: 'সহায়তার আগে, আমি শুধু পড়ার স্বপ্ন দেখতাম। আজ আমি ডাক্তার হওয়ার স্বপ্ন দেখি।',
      en: 'Before the support, I dreamed of studying. Today, I dream of becoming a doctor.',
    },
    author: {
      bn: '— প্রীতি কুমারী, অষ্টম শ্রেণী',
      en: '— Priti Kumari, Class 8',
    },
    category: { bn: 'শিক্ষা', en: 'Education' },
    fullContent: {
      bn: 'প্রীতি কুমারীর পরিবার আর্থিক সংকটের কারণে তার পড়াশোনা বন্ধ করে দেওয়ার সিদ্ধান্ত নিয়েছিল। নাড়াজোল ছাত্রদল তার সমগ্র বই, খাতা ও বার্ষিক ফি বহনের দায়িত্ব নেয়। আজ সে তার শ্রেণীর সেরা শিক্ষার্থীদের একজন।',
      en: 'Priti Kumari’s family was about to discontinue her education due to severe financial hardship. NaraJol Chhatradal stepped in with complete textbook support, uniforms, and tuition sponsorship. Today she ranks among the top performers in her grade.',
    },
    img: '/assets/images/impacts/education.jpg',
  },
  {
    id: 'raju-mondal',
    title: { bn: 'আত্মনির্ভরতার গল্প: জীবিকা উন্নয়ন', en: 'Self-Reliance: Skill Training' },
    summary: {
      bn: 'কারিগরি ও সেলাই প্রশিক্ষণের মাধ্যমে হস্তশিল্পে নতুন কেরিয়ার গড়ে পরিবারের দায়িত্ব নিয়েছেন রাজু।',
      en: 'Through specialized skill development & tailoring training, Raju unlocked stable income opportunities.',
    },
    quote: {
      bn: 'দক্ষতা উন্নয়ন কর্মসূচি আমাকে একটি চাকরি পেতে এবং আমার পরিবারকে সহায়তা করতে সাহায্য করেছে।',
      en: 'The skill training program helped me get a job and support my family.',
    },
    author: {
      bn: '— রাজু মন্ডল',
      en: '— Raju Mondal',
    },
    category: { bn: 'জীবিকা', en: 'Livelihood' },
    fullContent: {
      bn: 'রাজু মন্ডল দীর্ঘদিন কর্মহীন থাকার পর ছাত্রদলের বৃত্তিমূলক প্রশিক্ষণ ও হস্তশিল্প কর্মশালায় অংশগ্রহণ করেন। প্রশিক্ষণ শেষে তিনি কাজ পান এবং নিজের ক্ষুদ্র পারিবারিক ব্যবসায় স্বাবলম্বী হয়ে ওঠেন।',
      en: 'After months of unemployment, Raju enrolled in our vocational tailoring and craftsmanship drive. Upon course completion, he secured steady manufacturing orders and now supports his parents with dignity.',
    },
    img: '/assets/images/impacts/tree_plantations.jpg',
  },
];

export const FOCUS_AREAS_DATA = [
  {
    id: 'education',
    title: { bn: 'শিক্ষা', en: 'Education' },
    percentage: 92,
    color: '#0c756f',
    description: {
      bn: 'দরিদ্র ও মেধাবী শিশুদের জন্য গুণগত শিক্ষার অধিকার সুনিশ্চিতকরণ।',
      en: 'Improving access to quality education for underprivileged children.',
    },
    details: {
      bn: 'বিনামূল্যে বই বিতরণ, বার্ষিক বৃত্তিপদ্ধতি ও কোচিং সহ ৫০০+ শিক্ষার্থীর সহায়তা।',
      en: 'Free textbook drives, merit scholarship grants, and after-school tutoring for 500+ pupils.',
    },
    iconName: 'Grad',
  },
  {
    id: 'healthcare',
    title: { bn: 'স্বাস্থ্যসেবা', en: 'Healthcare' },
    percentage: 78,
    color: '#c2410c',
    description: {
      bn: 'সুস্থ ও সচেতন সম্প্রদায়ের জন্য নিয়মিত বিনামূল্যে চিকিৎসা ও পরীক্ষা।',
      en: 'Providing healthcare support & awareness for healthier communities.',
    },
    details: {
      bn: '২৫+ বিনামূল্যে রক্তদান ও স্বাস্থ্য পরীক্ষা শিবিরের মাধ্যমে ৮,৯৪৫ জনের স্বাস্থ্য সেবা প্রদান।',
      en: '25+ free health checkups and blood donation camps impacting 8,945 beneficiaries.',
    },
    iconName: 'Stetho',
  },
  {
    id: 'livelihood',
    title: { bn: 'জীবিকা ও দক্ষতা', en: 'Livelihood' },
    percentage: 83,
    color: '#059669',
    description: {
      bn: 'কর্মসংস্থানের সুযোগ তৈরি এবং স্বাবলম্বিতার জন্য কারিগরি প্রশিক্ষণ।',
      en: 'Creating employment opportunities & enhancing skills for self-reliance.',
    },
    details: {
      bn: 'সেলাই, কম্পিউটার ও কুটির শিল্প প্রশিক্ষণে ২০০+ যুব ও নারীর আত্মনির্ভরতা।',
      en: 'Vocational workshops empowering youth and women with employment skills.',
    },
    iconName: 'Package',
  },
  {
    id: 'community',
    title: { bn: 'সামাজিক উন্নয়ন', en: 'Community Dev.' },
    percentage: 88,
    color: '#2563eb',
    description: {
      bn: 'স্থানীয় অংশীদারিত্ব ও অংশগ্রহণের মাধ্যমে গ্রামীণ কাঠামোর জোরদারকরণ।',
      en: 'Strengthening communities through participation & local development.',
    },
    details: {
      bn: '১৮টি গ্রামীণ অঞ্চলে শীতবস্ত্র, ত্রিপল ও দুর্যোগে জরুরি ত্রাণ পৌঁছানো।',
      en: 'Winter clothing, relief material, and infrastructure aid delivered to 18 rural areas.',
    },
    iconName: 'Users',
  },
  {
    id: 'environment',
    title: { bn: 'পরিবেশ সুরক্ষা', en: 'Environment' },
    percentage: 80,
    color: '#16a34a',
    description: {
      bn: 'পরিবেশের টেকসই ভারসাম্য রক্ষা এবং প্রাকৃতিক সম্পদের সংরক্ষণ।',
      en: 'Promoting sustainability and protecting our natural resources.',
    },
    details: {
      bn: '২,০০০+ ফলজ ও বনজ বৃক্ষ রোপণ, প্লাস্টিক মুক্তকরণ ও জল সংরক্ষণ কর্মসূচি।',
      en: 'Over 2,000 trees planted, anti-plastic awareness drives, and sanitation drives.',
    },
    iconName: 'Tree',
  },
];

export const YEARLY_IMPACT_DATA = [
  { year: '2020', lives: 3000, displayLives: '3,000', label: { bn: '৩,০০০ জন', en: '3,000 Lives' } },
  { year: '2021', lives: 5200, displayLives: '5,200', label: { bn: '৫,২০০ জন', en: '5,200 Lives' } },
  { year: '2022', lives: 7500, displayLives: '7,500', label: { bn: '৭,৫০০ জন', en: '7,500 Lives' } },
  { year: '2023', lives: 10000, displayLives: '10,000', label: { bn: '১০,০০০ জন', en: '10,000 Lives' } },
  { year: '2024', lives: 12450, displayLives: '12,450+', label: { bn: '১২,৪৫০+ জন', en: '12,450+ Lives' } },
];

export const LOCATION_NODES_DATA = [
  { id: 'narajole', name: { bn: 'নাড়াজোল', en: 'Nij Narajole' }, district: { bn: 'পশ্চিম মেদিনীপুর', en: 'Paschim Medinipur' }, camps: 12, beneficiaries: '4,200+' },
  { id: 'daspur', name: { bn: 'দাসপুর', en: 'Daspur' }, district: { bn: 'পশ্চিম মেদিনীপুর', en: 'Paschim Medinipur' }, camps: 8, beneficiaries: '3,100+' },
  { id: 'ghatal', name: { bn: 'ঘাটাল', en: 'Ghatal' }, district: { bn: 'পশ্চিম মেদিনীপুর', en: 'Paschim Medinipur' }, camps: 6, beneficiaries: '2,500+' },
  { id: 'midnapore', name: { bn: 'মেদিনীপুর শহর', en: 'Midnapore Town' }, district: { bn: 'পশ্চিম মেদিনীপুর', en: 'Paschim Medinipur' }, camps: 5, beneficiaries: '1,650+' },
  { id: 'tamluk', name: { bn: 'তমলুক', en: 'Tamluk' }, district: { bn: 'পূর্ব মেদিনীপুর', en: 'Purba Medinipur' }, camps: 4, beneficiaries: '1,000+' },
];

export interface GalleryImage {
  src: string;
  alt: Bi;
  category: Bi;
  more?: string;
}

export const GALLERY_IMAGES: GalleryImage[] = [
  { src: '/assets/images/service/post-33-raktokotha-camp.jpg', alt: { bn: 'রক্তদান শিবির', en: 'Blood donation camp' }, category: { bn: 'স্বাস্থ্য', en: 'Health' } },
  { src: '/assets/images/impacts/education.jpg', alt: { bn: 'শিক্ষামূলক কর্মসূচি', en: 'Education programme' }, category: { bn: 'শিক্ষা', en: 'Education' } },
  { src: '/assets/images/impacts/tree_plantations.jpg', alt: { bn: 'বৃক্ষরোপণ অভিযান', en: 'Tree plantation' }, category: { bn: 'পরিবেশ', en: 'Environment' } },
  { src: '/assets/images/service/post-34-students-book-support.jpg', alt: { bn: 'বই বিতরণ', en: 'Book distribution' }, category: { bn: 'শিক্ষা', en: 'Education' } },
  { src: '/assets/images/service/post-30-tarpaulin-distribution.jpg', alt: { bn: 'ত্রাণ বিতরণ', en: 'Relief distribution' }, category: { bn: 'কার্যক্রম', en: 'Activities' } },
  { src: '/assets/images/service/post-20-winter-clothes.jpg', alt: { bn: 'শীতবস্ত্র বিতরণ', en: 'Winter clothing' }, category: { bn: 'কার্যক্রম', en: 'Activities' } },
  { src: '/assets/images/gallery/khudiram_bose_birthday_01.jpg', alt: { bn: 'ক্ষুদিরাম বসুর জন্মদিন', en: "Khudiram Bose's birthday" }, category: { bn: 'অনুষ্ঠান', en: 'Events' }, more: 'https://www.facebook.com/share/r/1JEYCmWWne/' },
  { src: '/assets/images/gallery/ghatal_bdo_farewell.jpg', alt: { bn: 'ঘাটাল বিডিও বিদায় সংবর্ধনা', en: 'Ghatal BDO farewell' }, category: { bn: 'অনুষ্ঠান', en: 'Events' } },
];

export const VOLUNTEER_PROGRAM_OPTIONS: Bi[] = [
  { bn: 'বিনামূল্যে শিক্ষাদান', en: 'Free tutoring' },
  { bn: 'স্বাস্থ্য সচেতনতা ও শিবির', en: 'Health awareness & camps' },
  { bn: 'পরিবেশ সুরক্ষা', en: 'Environmental protection' },
  { bn: 'নারী ও শিশু উন্নয়ন', en: 'Women & child development' },
  { bn: 'অন্যান্য সামাজিক কর্মসূচি', en: 'Other social programmes' },
];

export const DONATE_PURPOSES: Bi[] = [
  { bn: 'যেখানে সবচেয়ে বেশি প্রয়োজন', en: 'Where most needed' },
  { bn: 'শিক্ষা', en: 'Education' },
  { bn: 'স্বাস্থ্য ও রক্তদান', en: 'Health & blood donation' },
  { bn: 'পরিবেশ', en: 'Environment' },
  { bn: 'ত্রাণ ও দুর্যোগ', en: 'Relief & disaster' },
];
