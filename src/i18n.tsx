import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Lang = 'bn' | 'en';

type Dict = Record<string, { bn: string; en: string }>;

// Centralised UI strings. Long-form authored content (news posts) stays in its
// original language; everything that is part of the app chrome is bilingual.
const D: Dict = {
  // ---- nav ----
  'nav.home': { bn: 'হোম', en: 'Home' },
  'nav.about': { bn: 'আমাদের কথা', en: 'About' },
  'nav.programs': { bn: 'কর্মসূচি', en: 'Programs' },
  'nav.events': { bn: 'অনুষ্ঠান', en: 'Events' },
  'nav.gallery': { bn: 'চিত্রশালা', en: 'Gallery' },
  'nav.impacts': { bn: 'প্রভাব', en: 'Impact' },
  'nav.contact': { bn: 'যোগাযোগ', en: 'Contact' },
  'nav.volunteer': { bn: 'স্বেচ্ছাসেবক হোন', en: 'Volunteer' },
  'nav.donate': { bn: 'অনুদান', en: 'Donate' },

  // ---- header / common ----
  'header.login': { bn: 'লগইন', en: 'Login' },
  'header.memberLogin': { bn: 'সদস্য লগইন', en: 'Member Login' },
  'header.dashboard': { bn: 'ড্যাশবোর্ড', en: 'Dashboard' },
  'header.logout': { bn: 'লগআউট', en: 'Logout' },
  'header.adminPanel': { bn: 'অ্যাডমিন প্যানেল', en: 'Admin Panel' },
  'header.memberPanel': { bn: 'সদস্য প্যানেল', en: 'Member Panel' },
  'common.loading': { bn: 'লোড হচ্ছে…', en: 'Loading…' },
  'common.save': { bn: 'সংরক্ষণ করুন', en: 'Save' },
  'common.saving': { bn: 'সংরক্ষণ হচ্ছে…', en: 'Saving…' },
  'common.cancel': { bn: 'বাতিল', en: 'Cancel' },
  'common.submit': { bn: 'জমা দিন', en: 'Submit' },
  'common.edit': { bn: 'সম্পাদনা', en: 'Edit' },
  'common.delete': { bn: 'মুছুন', en: 'Delete' },
  'common.remove': { bn: 'সরান', en: 'Remove' },
  'common.approve': { bn: 'অনুমোদন', en: 'Approve' },
  'common.reject': { bn: 'প্রত্যাখ্যান', en: 'Reject' },
  'common.suspend': { bn: 'স্থগিত', en: 'Suspend' },
  'common.publish': { bn: 'প্রকাশ', en: 'Publish' },
  'common.view': { bn: 'বিস্তারিত', en: 'View' },
  'common.actions': { bn: 'কার্যক্রম', en: 'Actions' },
  'common.status': { bn: 'অবস্থা', en: 'Status' },
  'common.date': { bn: 'তারিখ', en: 'Date' },
  'common.amount': { bn: 'পরিমাণ', en: 'Amount' },
  'common.name': { bn: 'নাম', en: 'Name' },
  'common.fullName': { bn: 'পূর্ণ নাম', en: 'Full name' },
  'common.email': { bn: 'ইমেল', en: 'Email' },
  'common.phone': { bn: 'ফোন', en: 'Phone' },
  'common.address': { bn: 'ঠিকানা', en: 'Address' },
  'common.role': { bn: 'ভূমিকা', en: 'Role' },
  'common.designation': { bn: 'পদবি', en: 'Designation' },
  'common.backToSite': { bn: '← সাইটে ফিরে যান', en: '← Back to site' },
  'common.backToHome': { bn: '← হোমে ফিরে যান', en: '← Back to home' },
  'common.member': { bn: 'সদস্য', en: 'Member' },
  'common.admin': { bn: 'অ্যাডমিন', en: 'Admin' },
  'common.month': { bn: 'মাস', en: 'Month' },
  'common.year': { bn: 'বছর', en: 'Year' },
  'common.none': { bn: 'কিছু নেই', en: 'Nothing yet' },
  'common.processing': { bn: 'প্রক্রিয়াকরণ হচ্ছে…', en: 'Processing…' },

  // ---- login ----
  'login.title': { bn: 'সদস্য / অ্যাডমিন লগইন', en: 'Member / Admin Login' },
  'login.subtitle': { bn: 'আপনার অ্যাকাউন্টে প্রবেশ করুন।', en: 'Sign in to your account.' },
  'login.password': { bn: 'পাসওয়ার্ড', en: 'Password' },
  'login.button': { bn: 'লগইন', en: 'Log in' },
  'login.loggingIn': { bn: 'লগইন হচ্ছে…', en: 'Signing in…' },
  'login.note': {
    bn: 'নতুন সদস্য? সরাসরি সাইন-আপ করা যায় না। অ্যাডমিন অনুমোদন দিলে তবেই আপনি লগইন করতে পারবেন। সদস্য হতে চাইলে',
    en: 'New here? There is no public sign-up. You can log in only after an admin approves your account. To join,',
  },
  'login.applyHere': { bn: 'এখানে আবেদন করুন', en: 'apply here' },
  'login.failed': { bn: 'লগইন ব্যর্থ হয়েছে।', en: 'Login failed.' },

  // ---- home ----
  'home.heroSubtitle': {
    bn: 'আমরা নাড়াজোলের প্রতিটি মানুষের জন্য একটি উজ্জ্বল ও সমৃদ্ধ ভবিষ্যৎ গড়তে প্রতিশ্রুতিবদ্ধ।',
    en: 'We are committed to building a brighter, more prosperous future for everyone in Narajole.',
  },
  'home.donate': { bn: 'অনুদান দিন', en: 'Donate now' },
  'home.join': { bn: 'আমাদের সাথে যোগ দিন', en: 'Join us' },
  'home.impactTitle': { bn: 'আমাদের কার্যক্রমের প্রভাব', en: 'The impact of our work' },
  'home.latestTitle': { bn: 'সর্বশেষ খবর ও অনুষ্ঠান', en: 'Latest news & events' },
  'home.viewAll': { bn: 'সকল খবর ও ইভেন্ট দেখুন', en: 'See all news & events' },

  // ---- about ----
  'about.title': { bn: 'আমাদের কথা', en: 'About us' },
  'about.intro': {
    bn: 'নাড়াজোল ছাত্রদল (Chhatradol Social Welfare Organisation) হল একটি নিবেদিতপ্রাণ সামাজিক কল্যাণমূলক পাবলিক চ্যারিটেবল ট্রাস্ট যা নাড়াজোল এবং এর আশেপাশের সম্প্রদায়ের উন্নতি সাধনে কাজ করে। আমাদের লক্ষ্য হল শিক্ষা, স্বাস্থ্য এবং পরিবেশগত স্থিতিশীলতার মাধ্যমে একটি উজ্জ্বল ভবিষ্যৎ গড়ে তোলা।',
    en: 'Chhatradol Social Welfare Organisation (নাড়াজোল ছাত্রদল) is a dedicated public charitable trust working for the betterment of Narajole and its surrounding communities. Our goal is to build a brighter future through education, healthcare and environmental sustainability.',
  },
  'about.historyTitle': { bn: 'আমাদের ইতিহাস', en: 'Our history' },
  'about.historyText': {
    bn: 'নাড়াজোল ছাত্রদল যাত্রা শুরু করে ২০১৯ সালে, একদল স্বপ্নদর্শী ছাত্র-ছাত্রীর হাত ধরে। প্রথমদিকে ছোট শিক্ষামূলক কর্মসূচি ও পরিবেশ সচেতনতার কাজ দিয়ে শুরু হলেও, সময়ের সাথে আমাদের কার্যক্রমের পরিধি বৃদ্ধি পেয়েছে। আমরা বিনামূল্যে টিউশন, স্বাস্থ্য শিবির, বৃক্ষরোপণ অভিযান এবং দুর্যোগ ত্রাণে অংশ নিয়েছি। ২০২৬ সালে সংস্থাটি একটি পাবলিক চ্যারিটেবল ট্রাস্ট হিসেবে নিবন্ধিত হয়।',
    en: 'Chhatradol began its journey in 2019, led by a group of visionary students. Starting with small educational programmes and environmental awareness drives, our work has steadily grown to include free tutoring, health camps, tree-plantation drives and disaster relief. In 2026 the organisation was registered as a public charitable trust.',
  },
  'about.missionTitle': { bn: 'আমাদের লক্ষ্য', en: 'Our mission' },
  'about.missionText': {
    bn: 'আমাদের লক্ষ্য হল একটি সুস্থ, শিক্ষিত এবং স্বাবলম্বী সমাজ গড়ে তোলা, যেখানে প্রতিটি মানুষ তাদের সম্পূর্ণ সম্ভাবনা উপলব্ধি করতে পারে। আমরা বিশ্বাস করি শিক্ষা, স্বাস্থ্যসেবা এবং পরিবেশ সুরক্ষা হল সমাজের মূল ভিত্তি।',
    en: 'Our mission is to build a healthy, educated and self-reliant society where everyone can realise their full potential. We believe education, healthcare and environmental protection are the foundations of a strong community.',
  },
  'about.visionTitle': { bn: 'আমাদের ভিশন', en: 'Our vision' },
  'about.visionText': {
    bn: 'আমরা এমন একটি সমাজের স্বপ্ন দেখি যেখানে দারিদ্র্য নেই, অশিক্ষা নেই, এবং প্রতিটি শিশু স্বাস্থ্যকর পরিবেশে বেড়ে উঠতে পারে। আমরা একটি সহনশীল, ন্যায়পরায়ণ ও সক্ষম সমাজ গঠনের জন্য কাজ করে যাচ্ছি।',
    en: 'We dream of a society free from poverty and illiteracy, where every child grows up in a healthy environment. We work towards a tolerant, just and capable community.',
  },
  'about.valuesTitle': { bn: 'আমাদের মূল মূল্যবোধ', en: 'Our core values' },
  'about.teamTitle': { bn: 'আমাদের দল', en: 'Our team' },

  // ---- programs ----
  'programs.title': { bn: 'আমাদের কর্মসূচি', en: 'Our programmes' },
  'programs.subtitle': {
    bn: 'শিক্ষা, স্বাস্থ্য, পরিবেশ ও সমাজসেবায় আমাদের নিয়মিত উদ্যোগসমূহ',
    en: 'Our regular initiatives in education, health, environment and social service',
  },
  'programs.joinTitle': { bn: 'আমাদের সাথে যোগ দিন', en: 'Join us' },
  'programs.joinText': {
    bn: 'আপনিও হতে পারেন এই পরিবর্তনের অংশীদার। স্বেচ্ছাসেবক হিসেবে যুক্ত হয়ে সমাজ গঠনে অবদান রাখুন।',
    en: 'You can be part of this change. Join as a volunteer and help build a stronger community.',
  },

  // ---- events ----
  'events.title': { bn: 'অনুষ্ঠান ও খবর', en: 'Events & News' },
  'events.subtitle': { bn: 'আমাদের সাম্প্রতিক ও পূর্ববর্তী কার্যক্রমসমূহ', en: 'Our recent and past activities' },
  'events.upcoming': { bn: 'আসন্ন অনুষ্ঠান', en: 'Upcoming events' },
  'events.past': { bn: 'অতীতের অনুষ্ঠান', en: 'Past events' },
  'events.noUpcoming': { bn: 'বর্তমানে কোন আসন্ন অনুষ্ঠান নেই।', en: 'No upcoming events right now.' },
  'events.noPast': { bn: 'কোন অতীতের অনুষ্ঠান পাওয়া যায়নি।', en: 'No past events found.' },
  'events.filter': { bn: 'ফিল্টার:', en: 'Filter:' },
  'events.entries': { bn: 'এন্ট্রি', en: 'entries' },
  'events.prev': { bn: '← পূর্ববর্তী', en: '← Previous' },
  'events.next': { bn: 'পরবর্তী →', en: 'Next →' },
  'events.page': { bn: 'পাতা', en: 'Page' },
  'events.readMore': { bn: 'বিস্তারিত পড়ুন', en: 'Read more' },
  'events.catAll': { bn: 'সব', en: 'All' },
  'events.catEvents': { bn: 'অনুষ্ঠান', en: 'Events' },
  'events.catEducation': { bn: 'শিক্ষা', en: 'Education' },
  'events.catHealth': { bn: 'স্বাস্থ্য', en: 'Health' },
  'events.catRelief': { bn: 'ত্রাণ', en: 'Relief' },
  'events.heroTitle': { bn: 'মাঠ থেকে — আমাদের সাম্প্রতিক কর্মসূচি ও ইভেন্ট।', en: 'From the field — our recent programmes & events.' },
  'events.heroLede': { bn: 'রক্তদান, স্বাস্থ্য শিবির, পরিবেশ অভিযান, সাংস্কৃতিক উদযাপন — সব কিছুর সাম্প্রতিক রিপোর্ট এখানে।', en: 'Blood donation, health camps, environmental drives, cultural celebrations — the latest reports from every front.' },

  // ---- gallery ----
  'gallery.title': { bn: 'চিত্রশালা', en: 'Gallery' },
  'gallery.subtitle': { bn: 'আমাদের কার্যক্রমের কিছু মুহূর্ত', en: 'Glimpses of our work' },
  'gallery.all': { bn: 'সব', en: 'All' },
  'gallery.more': { bn: 'আরো দেখুন', en: 'See more' },

  // ---- impacts ----
  'impacts.title': { bn: 'প্রভাব', en: 'Impact' },
  'impacts.subtitle': {
    bn: 'আমাদের কার্যক্রম কীভাবে সম্প্রদায়ের জীবনে ইতিবাচক পরিবর্তন আনছে',
    en: 'How our work brings positive change to community life',
  },
  'impacts.testimonials': { bn: 'সাক্ষ্য', en: 'Testimonials' },
  'impacts.stories': { bn: 'সাফল্যের গল্প', en: 'Success stories' },
  'impacts.reportTitle': { bn: 'আমাদের রিপোর্ট', en: 'Our reporting' },
  'impacts.reportText': {
    bn: 'আমরা স্বচ্ছতায় বিশ্বাসী। আমাদের সকল কার্যক্রম ও আর্থিক হিসাব নিয়মিতভাবে নথিভুক্ত ও চার্টার্ড অ্যাকাউন্ট্যান্ট দ্বারা নিরীক্ষিত হয়।',
    en: 'We believe in transparency. All our activities and finances are recorded regularly and audited by chartered accountants.',
  },

  // ---- contact ----
  'contact.title': { bn: 'যোগাযোগ', en: 'Contact' },
  'contact.subtitle': { bn: 'আমরা আপনার কথা শুনতে আগ্রহী', en: "We'd love to hear from you" },
  'contact.formTitle': { bn: 'আমাদের সাথে যোগাযোগ করুন', en: 'Get in touch' },
  'contact.subject': { bn: 'বিষয়', en: 'Subject' },
  'contact.message': { bn: 'আপনার বার্তা', en: 'Your message' },
  'contact.send': { bn: 'বার্তা পাঠান', en: 'Send message' },
  'contact.sending': { bn: 'পাঠানো হচ্ছে…', en: 'Sending…' },
  'contact.success': { bn: 'সফল! আপনার বার্তা পাঠানো হয়েছে।', en: 'Success! Your message has been sent.' },
  'contact.error': { bn: 'বার্তা পাঠাতে সমস্যা হয়েছে।', en: 'Could not send your message.' },
  'contact.addressTitle': { bn: 'আমাদের অফিসের ঠিকানা', en: 'Our office address' },
  'contact.heroTitle': { bn: 'আমাদের সাথে কথা বলুন।', en: 'Talk to us.' },
  'contact.heroLede': { bn: 'প্রশ্ন, পরামর্শ, স্বেচ্ছাসেবী হওয়ার আগ্রহ — যেকোনো কারণে নির্দ্বিধায় যোগাযোগ করুন।', en: 'Questions, suggestions, volunteering — reach out for any reason, any time.' },
  'contact.replyTime': { bn: 'আমরা সাড়া দিই ২৪ ঘণ্টার মধ্যে।', en: 'We respond within 24 hours.' },
  'contact.msgSent': { bn: 'বার্তা পৌঁছে গেছে।', en: 'Message delivered.' },
  'contact.msgSentSub': { bn: 'শীঘ্রই আমরা যোগাযোগ করব।', en: 'We will be in touch soon.' },
  'contact.anotherMsg': { bn: 'আরেকটি বার্তা', en: 'Send another' },
  'contact.office': { bn: 'দফতর', en: 'Office' },
  'contact.subjectOpts': {
    bn: 'বিষয় বেছে নিন…,স্বেচ্ছাসেবী হতে চাই,দান সংক্রান্ত জিজ্ঞাসা,কর্মসূচি সম্পর্কে,মিডিয়া / সংবাদ,অন্যান্য',
    en: 'Choose a subject…,I want to volunteer,Donation enquiry,About a programme,Media / press,Other',
  },

  // ---- volunteer ----
  'volunteer.title': { bn: 'স্বেচ্ছাসেবক হোন', en: 'Become a volunteer' },
  'volunteer.subtitle': {
    bn: 'সমাজ গঠনে একজন মূল্যবান স্বেচ্ছাসেবক হিসেবে অংশ নিন',
    en: 'Join as a valued volunteer and help build the community',
  },
  'volunteer.interest': { bn: 'আগ্রহের ক্ষেত্র', en: 'Area of interest' },
  'volunteer.motivation': { bn: 'আপনার প্রেরণা / অভিজ্ঞতা', en: 'Your motivation / experience' },
  'volunteer.agree': {
    bn: 'আমি সংস্থার নীতিমালা ও নির্দেশিকা মেনে চলতে সম্মত।',
    en: 'I agree to abide by the organisation’s rules and guidelines.',
  },
  'volunteer.agreeError': { bn: 'অনুগ্রহ করে নীতিমালায় সম্মতি দিন।', en: 'Please agree to the guidelines.' },
  'volunteer.submit': { bn: 'আবেদন জমা দিন', en: 'Submit application' },
  'volunteer.submitting': { bn: 'জমা হচ্ছে…', en: 'Submitting…' },
  'volunteer.success': {
    bn: 'ধন্যবাদ! আপনার আবেদন জমা হয়েছে। আমরা শীঘ্রই যোগাযোগ করব।',
    en: 'Thank you! Your application has been submitted. We will be in touch soon.',
  },
  'volunteer.error': { bn: 'আবেদন জমা দিতে সমস্যা হয়েছে।', en: 'Could not submit your application.' },

  // ---- donate ----
  'donate.title': { bn: 'অনুদান দিন', en: 'Make a donation' },
  'donate.subtitle': {
    bn: 'আপনার উদার অনুদান আমাদের সামাজিক ও শিক্ষামূলক কার্যক্রমকে এগিয়ে নিয়ে যাবে',
    en: 'Your generous donation powers our social and educational work',
  },
  'donate.amount': { bn: 'অনুদানের পরিমাণ (₹)', en: 'Donation amount (₹)' },
  'donate.purpose': { bn: 'উদ্দেশ্য', en: 'Purpose' },
  'donate.yourDetails': { bn: 'আপনার বিবরণ', en: 'Your details' },
  'donate.anonymous': { bn: 'নাম প্রকাশ না করে অনুদান দিন', en: 'Donate anonymously' },
  'donate.button': { bn: 'অনুদান দিন', en: 'Donate' },
  'donate.minError': { bn: 'সর্বনিম্ন অনুদান ₹১০।', en: 'Minimum donation is ₹10.' },
  'donate.success': {
    bn: 'ধন্যবাদ! আপনার অনুদান সফলভাবে গৃহীত হয়েছে। আপনার উদারতার জন্য কৃতজ্ঞ।',
    en: 'Thank you! Your donation was received successfully. We are grateful for your generosity.',
  },
  'donate.again': { bn: 'আরেকটি অনুদান দিন', en: 'Donate again' },
  'donate.secure': {
    bn: 'নিরাপদ পেমেন্ট Razorpay-এর মাধ্যমে। আপনার তথ্যের গোপনীয়তা রক্ষা করা হয়।',
    en: 'Secure payment via Razorpay. Your information is kept private.',
  },
  'donate.failed': { bn: 'পেমেন্টে সমস্যা হয়েছে।', en: 'Payment failed.' },
  'pay.failed': {
    bn: 'পেমেন্ট সম্পন্ন করা যায়নি। অনুগ্রহ করে কিছুক্ষণ পরে আবার চেষ্টা করুন।',
    en: 'Payment could not be completed. Please try again later.',
  },
  'pay.cancelled': { bn: 'পেমেন্ট বাতিল করা হয়েছে।', en: 'Payment was cancelled.' },

  // ---- footer ----
  'footer.about': {
    bn: 'একটি সামাজিক কল্যাণমূলক পাবলিক চ্যারিটেবল ট্রাস্ট, যা শিক্ষা, স্বাস্থ্য, পরিবেশ ও দরিদ্রসেবায় নিবেদিত।',
    en: 'A social-welfare public charitable trust devoted to education, health, environment and relief of the poor.',
  },
  'footer.quickLinks': { bn: 'দ্রুত লিঙ্ক', en: 'Quick links' },
  'footer.getInvolved': { bn: 'জড়িত হন', en: 'Get involved' },
  'footer.rights': { bn: 'সর্বস্বত্ব সংরক্ষিত।', en: 'All rights reserved.' },
  'footer.legal': { bn: 'আইনি', en: 'Legal' },
  'legal.terms': { bn: 'শর্তাবলী', en: 'Terms & Conditions' },
  'legal.privacy': { bn: 'গোপনীয়তা নীতি', en: 'Privacy Policy' },
  'legal.refunds': { bn: 'বাতিল ও ফেরত নীতি', en: 'Cancellation & Refunds' },
  'legal.shipping': { bn: 'শিপিং নীতি', en: 'Shipping Policy' },

  // ---- member panel ----
  'm.panel': { bn: 'সদস্য প্যানেল', en: 'Member Panel' },
  'm.dashboard': { bn: 'সারসংক্ষেপ', en: 'Overview' },
  'm.profile': { bn: 'আমার প্রোফাইল', en: 'My profile' },
  'm.posts': { bn: 'আমার লেখা', en: 'My posts' },
  'm.attendance': { bn: 'আমার উপস্থিতি', en: 'My attendance' },
  'm.events': { bn: 'অনুষ্ঠান ও শিবির', en: 'Events & camps' },
  'm.contributions': { bn: 'আমার চাঁদা', en: 'My Contributions' },
  'm.donations': { bn: 'আমার অনুদান', en: 'My donations' },
  'm.gallery': { bn: 'আমার ছবি', en: 'My photos' },
  'm.messages': { bn: 'বার্তা', en: 'Messages' },
  'm.welcome': { bn: 'স্বাগতম', en: 'Welcome' },
  'm.stat.attendance': { bn: 'উপস্থিত অনুষ্ঠান/ক্যাম্প', en: 'Events / camps attended' },
  'm.stat.posts': { bn: 'আমার পোস্ট', en: 'My posts' },
  'm.stat.donated': { bn: 'মোট দান', en: 'Total donated' },
  'm.stat.due': { bn: 'বকেয়া মাস', en: 'Months due' },
  'm.changePassword': { bn: 'পাসওয়ার্ড পরিবর্তন', en: 'Change password' },
  'm.newPassword': { bn: 'নতুন পাসওয়ার্ড', en: 'New password' },
  'm.bloodGroup': { bn: 'রক্তের গ্রুপ', en: 'Blood group' },
  'm.bio': { bn: 'পরিচিতি', en: 'Bio' },
  'm.profileSaved': { bn: 'প্রোফাইল সংরক্ষিত হয়েছে।', en: 'Profile saved.' },
  'm.passwordChanged': { bn: 'পাসওয়ার্ড পরিবর্তিত হয়েছে।', en: 'Password changed.' },
  'm.passwordShort': { bn: 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।', en: 'Password must be at least 6 characters.' },

  // ---- admin panel ----
  'a.panel': { bn: 'অ্যাডমিন প্যানেল', en: 'Admin Panel' },
  'a.dashboard': { bn: 'ড্যাশবোর্ড', en: 'Dashboard' },
  'a.members': { bn: 'সদস্য ব্যবস্থাপনা', en: 'Members' },
  'a.posts': { bn: 'পোস্ট ব্যবস্থাপনা', en: 'Posts' },
  'a.events': { bn: 'অনুষ্ঠান ও ক্যাম্প', en: 'Events & camps' },
  'a.attendance': { bn: 'উপস্থিতি', en: 'Attendance' },
  'a.contributions': { bn: 'মাসিক চাঁদা', en: 'Monthly Contributions' },
  'a.donations': { bn: 'দান রেকর্ড', en: 'Donations' },
  'a.gallery': { bn: 'গ্যালারি', en: 'Gallery' },
  'a.messages': { bn: 'বার্তা ও আবেদন', en: 'Messages' },
  'a.finance': { bn: 'আর্থিক সারসংক্ষেপ', en: 'Finance' },
  'a.expenses': { bn: 'ব্যয় ব্যবস্থাপনা', en: 'Expenses' },
  'a.budgets': { bn: 'বাজেট', en: 'Budgets' },
  'a.ledger': { bn: 'লেজার', en: 'Ledger' },
  'a.audit': { bn: 'অডিট লগ', en: 'Audit log' },
  'a.compliance': { bn: 'বাধ্যবাধকতা', en: 'Compliance' },
  'a.newMember': { bn: '+ নতুন সদস্য', en: '+ New member' },
  'a.categories': { bn: 'বিভাগ ব্যবস্থাপনা', en: 'Categories' },
  'a.directory': { bn: 'সদস্য তালিকা', en: 'Directory' },
  'm.directory': { bn: 'সদস্য তালিকা', en: 'Directory' },
  'm.skills': { bn: 'দক্ষতা / আগ্রহের ক্ষেত্র', en: 'Skills / areas of interest' },
  'm.expiry': { bn: 'সদস্যপদ মেয়াদ শেষ', en: 'Membership expiry' },
  'a.tempPassword': { bn: 'অস্থায়ী পাসওয়ার্ড', en: 'Temporary password' },
  'a.memberDetails': { bn: 'সদস্যের বিস্তারিত', en: 'Member details' },
};

interface I18nValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: keyof typeof D | string) => string;
}

const I18nContext = createContext<I18nValue | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('cswo_lang') : null;
    return saved === 'en' || saved === 'bn' ? saved : 'bn';
  });

  useEffect(() => {
    localStorage.setItem('cswo_lang', lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const t = (key: string) => {
    const entry = D[key];
    if (!entry) return key;
    return entry[lang];
  };

  return (
    <I18nContext.Provider value={{ lang, setLang: setLangState, t }}>{children}</I18nContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useT(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useT must be used within I18nProvider');
  return ctx;
}

// Pick a bilingual value from a {bn,en} object.
export function pick<T>(obj: { bn: T; en: T }, lang: Lang): T {
  return obj[lang];
}
