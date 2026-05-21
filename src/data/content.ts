// Static marketing content for the public site, ported from the original
// Narajole Chhatrodol Angular app and updated for the registered trust name.

export const ORG = {
  nameEn: 'Chhatradol Social Welfare Organisation',
  nameBn: 'নাড়াজোল ছাত্রদল',
  shortBn: 'ছাত্রদল',
  tagline: 'A Public Charitable Trust',
  taglineBn: 'একতা, শিক্ষা, উন্নতি',
  established: '2019',
  registeredAs: 'Public Charitable Trust',
  email: 'info@narajolchhatrodol.org',
  phones: ['7074074110', '7430029114'],
  address: {
    line1: 'নাড়াজোল ছাত্রদল অফিস',
    line2: 'গ্রাম ও পোস্ট: নিজ নাড়াজোল',
    line3: 'থানা: দাসপুর, জেলা: পশ্চিম মেদিনীপুর',
    line4: 'পিন: ৭২১২১১, পশ্চিমবঙ্গ, ভারত',
  },
  social: {
    facebook: 'https://www.facebook.com/profile.php?id=100085903702733',
    instagram: 'https://www.instagram.com/',
    youtube: 'https://www.youtube.com/',
  },
};

export const FALLBACK_IMAGE = '/assets/images/chatrodol.jpg';

export const NAV_LINKS = [
  { to: '/', label: 'হোম', exact: true },
  { to: '/about', label: 'আমাদের কথা' },
  { to: '/programs', label: 'কর্মসূচি' },
  { to: '/events', label: 'অনুষ্ঠান' },
  { to: '/gallery', label: 'চিত্রশালা' },
  { to: '/impacts', label: 'প্রভাব' },
  { to: '/contact', label: 'যোগাযোগ' },
  { to: '/volunteer', label: 'স্বেচ্ছাসেবক হোন' },
  { to: '/donate', label: 'অনুদান' },
];

export const IMPACT_STATS = [
  { value: '৫০০+', label: 'ছাত্র-ছাত্রীকে সাহায্য করা হয়েছে' },
  { value: '২৫+', label: 'স্বাস্থ্য শিবির আয়োজিত' },
  { value: '২০০০+', label: 'বৃক্ষ রোপণ করা হয়েছে' },
  { value: '৭+', label: 'বছর ধরে সেবা' },
];

export interface TeamMember {
  name: string;
  role: string;
  img: string;
}

export const TEAM_MEMBERS: TeamMember[] = [
  { name: 'স্বরূপ সামন্ত', role: 'সভাপতি', img: '/assets/images/members/swarup.jpg' },
  { name: 'শুভদীপ ঘোড়াই', role: 'সহ-সভাপতি', img: '/assets/images/members/subhadip.jpg' },
  { name: 'সায়ন সামন্ত', role: 'সাধারণ সম্পাদক', img: '/assets/images/members/sayan.jpg' },
  { name: 'সুরজিৎ বেরা', role: 'যুগ্ম সম্পাদক', img: '/assets/images/members/surajit.jpg' },
  { name: 'শুভজিৎ কুন্ডু', role: 'কোষাধ্যক্ষ', img: '/assets/images/members/subhajit.jpg' },
  { name: 'পবিত্র সাঁতরা', role: 'সহ-কোষাধ্যক্ষ', img: '/assets/images/members/pabitra.jpg' },
  { name: 'সৌমেন মাইতি', role: 'ডিজিটাল অপারেশনস ও কমপ্লায়েন্স সম্পাদক', img: '/assets/images/members/soumen.jpg' },
  { name: 'প্রবাল ভুঁইয়া', role: 'এক্সেকিউশন ও রিসোর্স ম্যানেজার', img: '/assets/images/members/prabal.jpg' },
];

export const CORE_VALUES = [
  { label: 'শিক্ষা', text: 'আমরা বিশ্বাস করি শিক্ষা হল উন্নতির চাবিকাঠি।' },
  { label: 'সেবা', text: 'আমরা নিঃস্বার্থভাবে সমাজের সেবা করি।' },
  { label: 'সততা', text: 'আমাদের সকল কার্যক্রমে আমরা স্বচ্ছতা ও সততা বজায় রাখি।' },
  { label: 'সহমর্মিতা', text: 'আমরা সমাজের প্রতিটি মানুষের প্রতি সহানুভূতিশীল।' },
  { label: 'দায়িত্বশীলতা', text: 'আমরা আমাদের প্রতিশ্রুতির প্রতি দায়বদ্ধ।' },
];

export interface Program {
  title: string;
  description: string;
  details: string;
  icon: string;
}

export const PROGRAMS: Program[] = [
  {
    title: 'রক্তদান শিবির: জীবন বাঁচানোর মহৎ উদ্যোগ',
    description:
      'রক্তদান শিবিরের মাধ্যমে স্বেচ্ছাসেবকদের উৎসাহিত করে নিয়মিত রক্তদানের ব্যবস্থা করা হয়। এই উদ্যোগের মাধ্যমে জরুরি সময়ে অসহায় রোগীদের জন্য রক্ত সরবরাহ নিশ্চিত করা হয় এবং জীবন রক্ষায় গুরুত্বপূর্ণ ভূমিকা পালন করা যায়।',
    details:
      'আমাদের রক্তদান শিবিরে বিশেষজ্ঞ চিকিৎসকরা রক্তদাতাদের স্বাস্থ্য পরীক্ষা করেন, নিরাপদ রক্ত সংগ্রহের সকল ব্যবস্থা গ্রহণ করেন এবং রক্তদানের গুরুত্ব সম্পর্কে সবাইকে সচেতন করেন। রক্তদাতাদের জন্য সনদপত্র ও পুষ্টিকর খাদ্যও প্রদান করা হয়।',
    icon: '/assets/images/favicon/favicon192.png',
  },
  {
    title: 'পোশাক বিতরণ',
    description:
      'দরিদ্র ও অসহায় মানুষের জন্য নিয়মিত বিনামূল্যে পোশাক বিতরণের ব্যবস্থা করা হয়। এতে আর্থিকভাবে পিছিয়ে থাকা পরিবারগুলোর মৌলিক প্রয়োজন পূরণে সহায়তা পাওয়া যায় এবং তারা স্বাভাবিক জীবনযাপনে স্বাচ্ছন্দ্য অনুভব করে।',
    details:
      'এই কর্মসূচির আওতায় শিশু, নারী ও পুরুষ—সকল বয়সের মানুষের জন্য প্রয়োজন অনুযায়ী নতুন বা ভাল মানের ব্যবহৃত পোশাক বিতরণ করা হয়। স্বেচ্ছাসেবকরা বাড়ি বাড়ি সংগ্রহ অভিযান চালিয়ে পোশাক সংগ্রহ করেন এবং সেগুলো সঠিকভাবে বাছাই করে উপকারভোগীদের হাতে তুলে দেন।',
    icon: '/assets/images/favicon/favicon192.png',
  },
  {
    title: 'পরিবেশ সুরক্ষা ও বৃক্ষরোপণ অভিযান',
    description:
      'পরিবেশের ভারসাম্য বজায় রাখতে এবং দূষণ কমাতে নিয়মিত বৃক্ষরোপণ অভিযান ও পরিচ্ছন্নতা কর্মসূচি পালন করা হয়। এতে স্থানীয়দের মধ্যে পরিবেশ সচেতনতা বাড়ে।',
    details:
      'প্রতি বছর আমরা বিভিন্ন স্থানে বৃক্ষরোপণ কর্মসূচি পালন করি এবং চারা বিতরণের মাধ্যমে মানুষকে গাছ লাগাতে উৎসাহিত করি। এছাড়াও, আমরা স্থানীয় বাজার এবং জনবহুল এলাকাগুলিতে পরিচ্ছন্নতা অভিযান পরিচালনা করি।',
    icon: '/assets/images/favicon/favicon192.png',
  },
  {
    title: 'শীতবস্ত্র বিতরণ: ছিন্নমূল মানুষের পাশে উষ্ণতার হাত',
    description:
      'কঠোর শীতের তাপমাত্রায় দরিদ্র ও ছিন্নমূল মানুষ যাতে কষ্ট না পায়, সেজন্য শীতবস্ত্র বিতরণ কর্মসূচি পরিচালনা করা হয়। এই উদ্যোগ অসহায় মানুষের জীবন রক্ষায় বিশেষ ভূমিকা রাখে এবং শীতের রাতগুলোকে কিছুটা উষ্ণ করে তোলে।',
    details:
      'কর্মসূচির মাধ্যমে কম্বল, সোয়েটার, জ্যাকেট, ক্যাপ ও মোজা সহ বিভিন্ন শীতবস্ত্র বিতরণ করা হয়। স্বেচ্ছাসেবক দলের সহযোগিতায় গ্রামীণ এলাকা, স্টেশন এলাকা ও ঝুপড়ি বস্তিতে শীতবস্ত্র পৌঁছে দেওয়া হয় যাতে প্রত্যেকে শীত থেকে সুরক্ষা পায়।',
    icon: '/assets/images/favicon/favicon192.png',
  },
  {
    title: 'শিক্ষাদান কর্মসূচি',
    description:
      'দরিদ্র ও মেধাবী শিক্ষার্থীদের জন্য বিনামূল্যে শিক্ষাদানের ব্যবস্থা করা হয়। এতে স্কুলগামী শিক্ষার্থীরা তাদের পড়াশোনায় সহায়তা পায় এবং ভবিষ্যতে একটি উজ্জ্বল ক্যারিয়ার গড়ার সুযোগ লাভ করে।',
    details:
      'আমাদের শিক্ষাদান কর্মসূচিতে অভিজ্ঞ শিক্ষকরা নিয়মিত ক্লাস নেন, পরীক্ষার প্রস্তুতিতে সহায়তা করেন এবং শিক্ষার্থীদের সকল শিক্ষামূলক চাহিদা পূরণ করেন। আমরা বই, খাতা এবং অন্যান্য প্রয়োজনীয় শিক্ষাসামগ্রীও সরবরাহ করি।',
    icon: '/assets/images/favicon/favicon192.png',
  },
  {
    title: 'জরুরি ত্রাণ বিতরণ',
    description:
      'জরুরি ত্রাণ বিতরণ কর্মসূচির মাধ্যমে প্রাকৃতিক দুর্যোগ, দুর্ঘটনা বা যে কোনো সংকটময় পরিস্থিতিতে অসহায় ও ক্ষতিগ্রস্ত মানুষের পাশে দাঁড়ানো হয়। এই উদ্যোগের মাধ্যমে তারা দ্রুত খাদ্য, পানি, ওষুধ এবং অন্যান্য প্রয়োজনীয় সামগ্রী পেয়ে স্বাভাবিক জীবনে ফিরে আসতে পারে।',
    details:
      'আমাদের ত্রাণ বিতরণ কার্যক্রমে স্বেচ্ছাসেবকরা ক্ষতিগ্রস্ত এলাকায় পৌঁছে পরিস্থিতি মূল্যায়ন করেন, তালিকা প্রস্তুত করেন এবং সুশৃঙ্খলভাবে ত্রাণ বিতরণ নিশ্চিত করেন। চাল, ডাল, তেল, লবণ, শুকনো খাবার, বিশুদ্ধ পানীয় জলসহ জরুরি সামগ্রী সরবরাহ করা হয়। সংকট মোকাবিলায় ত্বরিত সহায়তা দেওয়ার এই উদ্যোগ অসংখ্য পরিবারের জন্য আশীর্বাদ হয়ে দাঁড়ায়।',
    icon: '/assets/images/favicon/favicon192.png',
  },
  {
    title: 'স্বাস্থ্য সচেতনতা ও স্বাস্থ্য শিবির',
    description:
      'নিয়মিত স্বাস্থ্য শিবির আয়োজন করে বিনামূল্যে স্বাস্থ্য পরীক্ষা, ঔষধ বিতরণ এবং বিভিন্ন রোগ সম্পর্কে সচেতনতা বৃদ্ধি করা হয়। এটি গ্রামীণ এলাকার মানুষের স্বাস্থ্যের মান উন্নত করতে সাহায্য করে।',
    details:
      'স্বাস্থ্য শিবিরগুলিতে বিশেষজ্ঞ ডাক্তাররা প্রাথমিক স্বাস্থ্য পরীক্ষা করেন, বিনামূল্যে ঔষধ দেন এবং ডায়াবেটিস, রক্তচাপ, এবং অন্যান্য সাধারণ রোগ সম্পর্কে পরামর্শ দেন। আমরা স্বাস্থ্যকর জীবনধারা সম্পর্কে কর্মশালাও আয়োজন করি।',
    icon: '/assets/images/favicon/favicon192.png',
  },
  {
    title: 'নারী ও শিশু উন্নয়ন',
    description:
      'নারী ও শিশুদের অধিকার রক্ষা এবং তাদের উন্নয়নের জন্য বিভিন্ন কর্মশালা, প্রশিক্ষণ এবং সহায়তা প্রদান করা হয়। এতে তারা সমাজে স্বাবলম্বী হয়ে উঠতে পারে।',
    details:
      'আমরা নারী স্বাবলম্বীকরণের জন্য সেলাই, হস্তশিল্প এবং কম্পিউটার প্রশিক্ষণের ব্যবস্থা করি। শিশুদের জন্য পুষ্টি ও স্বাস্থ্য সম্পর্কে সচেতনতা কার্যক্রম এবং তাদের মানসিক বিকাশের জন্য বিভিন্ন সাংস্কৃতিক অনুষ্ঠানের আয়োজন করা হয়।',
    icon: '/assets/images/favicon/favicon192.png',
  },
];

export interface Testimonial {
  quote: string;
  author: string;
  role: string;
}

export const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      'নাড়াজোল ছাত্রদল আমার সন্তানকে বিনামূল্যে শিক্ষার সুযোগ দিয়েছে। তাদের সাহায্যে আমার সন্তান এখন উচ্চশিক্ষা লাভ করছে। আমি চিরকৃতজ্ঞ।',
    author: 'অজয় বিশ্বাস',
    role: 'অভিভাবক',
  },
  {
    quote:
      'এই সংগঠনের স্বাস্থ্য শিবিরগুলি আমাদের গ্রামের মানুষের জন্য অত্যন্ত উপকারী। সময়মতো স্বাস্থ্যসেবা পেয়েছি যা অন্যথায় সম্ভব হতো না।',
    author: 'সুজয় দাশ',
    role: 'গ্রামবাসী',
  },
  {
    quote:
      'আমি একজন স্বেচ্ছাসেবক হিসেবে নাড়াজোল ছাত্রদলের সাথে কাজ করতে পেরে গর্বিত। এটি আমাকে সমাজে ইতিবাচক পরিবর্তন আনতে সাহায্য করে।',
    author: 'অঙ্কিতা মন্ডল',
    role: 'সেচ্ছাসেবিকা',
  },
];

export interface SuccessStory {
  title: string;
  summary: string;
  img: string;
}

export const SUCCESS_STORIES: SuccessStory[] = [
  {
    title: 'শিক্ষাজীবন: অন্ধকার থেকে আলো',
    summary:
      'একজন দরিদ্র পরিবারের সন্তান, নাড়াজোল ছাত্রদলের শিক্ষাবৃত্তির মাধ্যমে তার প্রাথমিক ও মাধ্যমিক শিক্ষা সম্পন্ন করেছে। বর্তমানে সে একটি বিশ্ববিদ্যালয়ে কম্পিউটার সায়েন্স নিয়ে পড়ছে এবং তার পরিবারের প্রথম স্নাতক হতে চলেছে।',
    img: '/assets/images/impacts/education.jpg',
  },
  {
    title: 'সবুজ নাড়াজোল: একটি পরিবেশগত বিপ্লব',
    summary:
      'গত পাঁচ বছরে নাড়াজোল ছাত্রদল স্থানীয় সম্প্রদায়ের সহায়তায় ১০০০ এরও বেশি গাছ রোপণ করেছে। এটি শুধু পরিবেশের উন্নতি করেনি, বরং স্থানীয় মানুষের মধ্যে পরিবেশ সচেতনতাও বৃদ্ধি করেছে।',
    img: '/assets/images/impacts/tree_plantations.jpg',
  },
];

export interface GalleryImage {
  src: string;
  alt: string;
  category: string;
  more?: string;
}

export const GALLERY_IMAGES: GalleryImage[] = [
  { src: '/assets/images/service/post-33-raktokotha-camp.jpg', alt: 'রক্তদান শিবির', category: 'স্বাস্থ্য' },
  { src: '/assets/images/impacts/education.jpg', alt: 'শিক্ষামূলক কর্মসূচি', category: 'শিক্ষা' },
  { src: '/assets/images/impacts/tree_plantations.jpg', alt: 'বৃক্ষরোপণ অভিযান', category: 'পরিবেশ' },
  { src: '/assets/images/service/post-34-students-book-support.jpg', alt: 'বই বিতরণ', category: 'শিক্ষা' },
  { src: '/assets/images/service/post-30-tarpaulin-distribution.jpg', alt: 'ত্রাণ বিতরণ', category: 'কার্যক্রম' },
  { src: '/assets/images/service/post-20-winter-clothes.jpg', alt: 'শীতবস্ত্র বিতরণ', category: 'কার্যক্রম' },
  {
    src: '/assets/images/gallery/khudiram_bose_birthday_01.jpg',
    alt: 'ক্ষুদিরাম বসুর জন্মদিন',
    category: 'শুভাগমন',
    more: 'https://www.facebook.com/share/r/1JEYCmWWne/',
  },
  { src: '/assets/images/gallery/ghatal_bdo_farewell.jpg', alt: 'ঘাটাল বিডিও বিদায় সংবর্ধনা', category: 'কার্যক্রম' },
];

export const VOLUNTEER_PROGRAM_OPTIONS = [
  'বিনামূল্যে শিক্ষাদান',
  'স্বাস্থ্য সচেতনতা ও শিবির',
  'পরিবেশ সুরক্ষা',
  'নারী ও শিশু উন্নয়ন',
  'অন্যান্য সামাজিক কর্মসূচি',
];
