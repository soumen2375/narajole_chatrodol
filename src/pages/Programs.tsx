import React from 'react';
import { Link } from 'react-router-dom';
import { useT } from '@/i18n';
import Breadcrumb from '@/components/ui/Breadcrumb';
import {
  FaDroplet, FaGraduationCap, FaStethoscope, FaLeaf, FaHandsHoldingChild,
  FaUserGroup, FaHandHoldingHeart, FaMusic, FaHeart, FaPlay, FaArrowRight,
  FaCalendarDays, FaLocationDot, FaUsers
} from 'react-icons/fa6';

const BRAND = '#c2410c';
const BG_CREAM = '#faf6ef';
const FALLBACK_IMG = '/assets/images/Chhatradol.jpg';

const onImgErr = (e: React.SyntheticEvent<HTMLImageElement>) => {
  if (e.currentTarget.src !== window.location.origin + FALLBACK_IMG) {
    e.currentTarget.src = FALLBACK_IMG;
  }
};

export default function Programs() {
  const { lang } = useT();
  const bn = lang === 'bn';

  const pillarCards = [
    {
      tag: '01',
      title: bn ? 'স্বাস্থ্য' : 'Health',
      count: bn ? '৩ কর্মসূচি' : '3 PROGRAMMES',
      icon: FaDroplet,
      iconBg: 'bg-rose-100 text-rose-700',
    },
    {
      tag: '02',
      title: bn ? 'শিক্ষা' : 'Education',
      count: bn ? '১ কর্মসূচি' : '1 PROGRAMME',
      icon: FaGraduationCap,
      iconBg: 'bg-emerald-100 text-emerald-700',
    },
    {
      tag: '03',
      title: bn ? 'পরিবেশ' : 'Environment',
      count: bn ? '১ কর্মসূচি' : '1 PROGRAMME',
      icon: FaLeaf,
      iconBg: 'bg-teal-100 text-teal-700',
    },
    {
      tag: '04',
      title: bn ? 'মানবিক' : 'Humanitarian',
      count: bn ? '৩ কর্মসূচি' : '3 PROGRAMMES',
      icon: FaHandHoldingHeart,
      iconBg: 'bg-indigo-100 text-indigo-700',
    },
  ];

  const keyPrograms = [
    {
      title: bn ? 'রক্তদান শিবির' : 'Blood Donation Camps',
      desc: bn
        ? 'রক্তদানের গুরুত্ব প্রচার এবং নিয়মিত শিবিরের মাধ্যমে জরুরি অবস্থায় রক্ত সরবরাহ নিশ্চিত করা।'
        : 'Organising regular blood donation camps to save lives and promote health awareness.',
      icon: FaDroplet,
      iconBg: 'bg-rose-100 text-rose-700',
      img: '/assets/images/service/post-33-raktokotha-camp.jpg',
    },
    {
      title: bn ? 'শিক্ষাদান ও পাঠসামগ্রী' : 'Education & Learning',
      desc: bn
        ? 'দরিদ্র শিক্ষার্থীদের খাতা, বই ও শিক্ষাসামগ্রী প্রদান এবং নিখরচায় পড়াশোনার সুযোগ তৈরি।'
        : 'Supporting students with study materials, guidance, and educational support programs.',
      icon: FaGraduationCap,
      iconBg: 'bg-amber-100 text-amber-700',
      img: '/assets/images/service/post-34-students-book-support.jpg',
    },
    {
      title: bn ? 'চিকিৎসা ও স্বাস্থ্য পরীক্ষা' : 'Healthcare Support',
      desc: bn
        ? 'ফ্রি হেলথ ক্যাম্প, চক্ষু পরীক্ষা ও প্রান্তিক মানুষের চিকিৎসায় সহায়তামূলক উদ্যোগ।'
        : 'Health check-ups, medical camps, and support for underprivileged communities.',
      icon: FaStethoscope,
      iconBg: 'bg-teal-100 text-teal-700',
      img: '/assets/images/service/post-15-mental-care-home.jpg',
    },
    {
      title: bn ? 'পরিবেশ সুরক্ষা' : 'Environment Initiative',
      desc: bn
        ? 'বৃক্ষরোপণ কর্মসূচি, প্লাস্টিক মুক্ত অভিযান এবং সচেতনতা বৃদ্ধির মাধ্যমে সবুজ ভবিষ্যৎ গঠন।'
        : 'Tree plantation, clean drives, and environment awareness for a greener future.',
      icon: FaLeaf,
      iconBg: 'bg-emerald-100 text-emerald-700',
      img: '/assets/images/impacts/tree_plantations.jpg',
    },
    {
      title: bn ? 'নারী ক্ষমতায়ন' : 'Women Empowerment',
      desc: bn
        ? 'কিশোরী ও নারীদের নিরাপত্তা সচেতনতা, স্বাবলম্বিতা ও সামাজিক প্রশিক্ষণ।'
        : 'Skills training and empowerment programs for women to become self-reliant.',
      icon: FaHandsHoldingChild,
      iconBg: 'bg-orange-100 text-orange-700',
      img: '/assets/images/service/post-35-stop-child-marriage.jpg',
    },
    {
      title: bn ? 'যুব সমাজ উন্নয়ন' : 'Youth Development',
      desc: bn
        ? 'যুবসমাজের সামাজিক দায়িত্ববোধ বৃদ্ধি ও সুনাগরিক হিসেবে গড়ে তোলার প্রয়াস।'
        : 'Building leadership, confidence, and skills among the youth for a better tomorrow.',
      icon: FaUserGroup,
      iconBg: 'bg-blue-100 text-blue-700',
      img: '/assets/images/service/post-31-freedom-fighters-program.jpg',
    },
    {
      title: bn ? 'জরুরি ত্রাণ ও সহায়তা' : 'Relief & Support',
      desc: bn
        ? 'প্রাকৃতিক দুর্যোগ ও দুঃসময়ে অসহায় মানুষদের খাদ্য, পোশাক ও বাসস্থান সহায়তা।'
        : 'Providing help during natural disasters and supporting needy families.',
      icon: FaHandHoldingHeart,
      iconBg: 'bg-indigo-100 text-indigo-700',
      img: '/assets/images/service/post-30-tarpaulin-distribution.jpg',
    },
    {
      title: bn ? 'সাংস্কৃতিক বিকাশ' : 'Cultural Activities',
      desc: bn
        ? 'ঐতিহ্য ও সাংস্কৃতিক বিকাশ রক্ষায় প্রতিযোগিতা ও মেধা বিকাশ অনুষ্ঠান।'
        : 'Promoting culture, sports, and social harmony through various events.',
      icon: FaMusic,
      iconBg: 'bg-purple-100 text-purple-700',
      img: '/assets/images/service/drawing.jpg',
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <Breadcrumb title={bn ? 'আমাদের কর্মসূচিসমূহ' : 'Our Programs'} />

      {/* ─────────────────── 1. HERO SECTION ─────────────────── */}
      <section className="py-12 md:py-20" style={{ background: BG_CREAM }}>
        <div className="mx-auto max-w-[1340px] px-6 md:px-10">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-6">
              <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-[1.18] text-slate-900">
                {bn ? (
                  <>
                    আট ধরনের কর্মসূচি, <br />
                    একটাই লক্ষ্য — <br />
                    <span className="text-[#c2410c]">সমাজের পাশে থাকা।</span>
                  </>
                ) : (
                  <>
                    Eight Programmes, <br />
                    One Goal — <br />
                    <span className="text-[#c2410c]">Standing by Society.</span>
                  </>
                )}
              </h1>

              <p className="mt-5 font-sans text-base sm:text-lg leading-relaxed text-slate-600">
                {bn
                  ? 'আমরা চার বড় ক্ষেত্রে কাজ করি — স্বাস্থ্য, শিক্ষা, পরিবেশ ও মানবিক সহায়তা। প্রতিটি কর্মসূচি স্থানীয় সম্প্রদায়ের সক্রিয় অংশগ্রহণে পরিচালিত হয়।'
                  : 'We work in four major areas — health, education, environment and humanitarian support. Each programme is run with active participation from local communities.'}
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <a
                  href="#key-programs"
                  className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 font-sans text-sm font-bold text-white shadow-md transition-all hover:bg-orange-700 hover:shadow-lg"
                  style={{ background: BRAND }}
                >
                  <span>{bn ? 'কর্মসূচি এক্সপ্লোর করুন' : 'Explore Programs'}</span>
                  <FaArrowRight className="h-3.5 w-3.5" />
                </a>
                <Link
                  to="/impacts"
                  className="inline-flex items-center gap-2.5 rounded-full border border-slate-300 bg-white px-6 py-3.5 font-sans text-sm font-semibold text-slate-800 shadow-sm transition-all hover:bg-slate-50 hover:border-slate-400"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 text-[#c2410c]">
                    <FaPlay className="h-2.5 w-2.5 translate-x-0.5" />
                  </span>
                  <span>{bn ? 'আমাদের প্রভাব দেখুন' : 'See Our Impact'}</span>
                </Link>
              </div>
            </div>

            {/* Right Collaged Images */}
            <div className="lg:col-span-6">
              <div className="grid grid-cols-12 gap-3 items-stretch">
                {/* Large Left Image */}
                <div className="col-span-7 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-lg">
                  <img
                    src="/assets/images/service/post-34-students-book-support.jpg"
                    alt="Education Program"
                    className="h-full w-full object-cover min-h-[320px]"
                    onError={onImgErr}
                  />
                </div>
                {/* 3 Right Stacked Images */}
                <div className="col-span-5 flex flex-col gap-3 justify-between">
                  <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-md h-24 sm:h-28">
                    <img
                      src="/assets/images/service/post-15-mental-care-home.jpg"
                      alt="Healthcare Camp"
                      className="h-full w-full object-cover"
                      onError={onImgErr}
                    />
                  </div>
                  <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-md h-24 sm:h-28">
                    <img
                      src="/assets/images/impacts/tree_plantations.jpg"
                      alt="Tree Plantation"
                      className="h-full w-full object-cover"
                      onError={onImgErr}
                    />
                  </div>
                  <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-md h-24 sm:h-28">
                    <img
                      src="/assets/images/service/post-35-stop-child-marriage.jpg"
                      alt="Women Empowerment"
                      className="h-full w-full object-cover"
                      onError={onImgErr}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────── 2. PILLAR SUMMARY CARDS ─────────────────── */}
      <section className="py-12 bg-white">
        <div className="mx-auto max-w-[1340px] px-6 md:px-10">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {pillarCards.map((p) => {
              const IconComp = p.icon;
              return (
                <div
                  key={p.tag}
                  className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:shadow-md"
                >
                  <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl shadow-inner ${p.iconBg}`}>
                    <IconComp className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {p.tag}
                    </span>
                    <h3 className="font-serif text-lg font-bold text-slate-900 leading-tight">
                      {p.title}
                    </h3>
                    <p className="mt-0.5 font-mono text-[11px] font-bold text-[#c2410c]">
                      {p.count}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─────────────────── 3. OUR KEY PROGRAMS GRID ─────────────────── */}
      <section id="key-programs" className="py-16 md:py-20" style={{ background: BG_CREAM }}>
        <div className="mx-auto max-w-[1340px] px-6 md:px-10">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-widest text-[#c2410c]">
              {bn ? 'আমরা কী করি' : 'WHAT WE DO'}
            </span>
            <h2 className="mt-2 font-serif text-3xl sm:text-4xl font-extrabold text-slate-900">
              {bn ? 'আমাদের মূল কর্মসূচিসমূহ' : 'Our Key Programs'}
            </h2>
            <div className="mx-auto mt-3 h-1 w-12 rounded-full bg-[#c2410c]" />
            <p className="mt-4 font-sans text-sm sm:text-base leading-relaxed text-slate-600">
              {bn
                ? 'শিক্ষা, স্বাস্থ্য, পরিবেশ ও মানবিক সহায়তা — আটটি বিশেষ কর্মসূচির মাধ্যমে আমরা সমাজে ইতিবাচক পরিবর্তন আনি।'
                : 'We run impactful programmes that bring real change to people\'s lives with the support of communities and volunteers.'}
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {keyPrograms.map((prog, idx) => {
              const PIcon = prog.icon;
              return (
                <div
                  key={idx}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl"
                >
                  {/* Thumbnail Image */}
                  <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                    <img
                      src={prog.img}
                      alt={prog.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={onImgErr}
                    />
                    <div className="absolute left-4 top-4">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-md ${prog.iconBg}`}>
                        <PIcon className="h-5 w-5" />
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex flex-1 flex-col justify-between p-6">
                    <div>
                      <h3 className="font-serif text-lg font-bold text-slate-900 transition-colors group-hover:text-[#c2410c]">
                        {prog.title}
                      </h3>
                      <p className="mt-2 font-sans text-xs leading-relaxed text-slate-600">
                        {prog.desc}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─────────────────── 4. IMPACT STATS BAND ─────────────────── */}
      <section className="py-16 md:py-20 bg-white">
        <div className="mx-auto max-w-[1340px] px-6 md:px-10">
          <div className="rounded-3xl border border-slate-200/80 p-8 sm:p-12 shadow-sm" style={{ background: BG_CREAM }}>
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-center">
              {/* Left Title */}
              <div className="lg:col-span-4">
                <h3 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900">
                  {bn ? 'প্রতিদিন ইতিবাচক প্রভাব তৈরি' : 'Creating Impact Every Day'}
                </h3>
                <p className="mt-3 font-sans text-sm text-slate-600 leading-relaxed">
                  {bn
                    ? 'আপনাদের নিরবচ্ছিন্ন সহযোগিতার মাধ্যমেই আমরা প্রতিদিন নতুন জীবনের হাসি ফোটাতে সক্ষম।'
                    : 'Because of your support, we are able to change lives and build a better society.'}
                </p>
              </div>

              {/* 4 Stat Items */}
              <div className="lg:col-span-8 grid grid-cols-2 gap-6 sm:grid-cols-4 border-t border-slate-200/80 pt-6 lg:border-t-0 lg:border-l lg:pl-8 lg:pt-0">
                {/* Stat 1 */}
                <div className="text-center sm:text-left">
                  <div className="mx-auto sm:mx-0 flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-[#c2410c] mb-2">
                    <FaUsers className="h-5 w-5" />
                  </div>
                  <span className="font-serif text-2xl sm:text-3xl font-extrabold text-slate-900">
                    25,000+
                  </span>
                  <p className="mt-1 font-sans text-xs font-semibold text-slate-500">
                    {bn ? 'উপকারভোগী মানুষ' : 'Lives Touched'}
                  </p>
                </div>

                {/* Stat 2 */}
                <div className="text-center sm:text-left">
                  <div className="mx-auto sm:mx-0 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 mb-2">
                    <FaHandHoldingHeart className="h-5 w-5" />
                  </div>
                  <span className="font-serif text-2xl sm:text-3xl font-extrabold text-slate-900">
                    350+
                  </span>
                  <p className="mt-1 font-sans text-xs font-semibold text-slate-500">
                    {bn ? 'স্বেচ্ছাসেবক' : 'Volunteers'}
                  </p>
                </div>

                {/* Stat 3 */}
                <div className="text-center sm:text-left">
                  <div className="mx-auto sm:mx-0 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 mb-2">
                    <FaCalendarDays className="h-5 w-5" />
                  </div>
                  <span className="font-serif text-2xl sm:text-3xl font-extrabold text-slate-900">
                    120+
                  </span>
                  <p className="mt-1 font-sans text-xs font-semibold text-slate-500">
                    {bn ? 'সম্পন্ন কর্মসূচি' : 'Programs Completed'}
                  </p>
                </div>

                {/* Stat 4 */}
                <div className="text-center sm:text-left">
                  <div className="mx-auto sm:mx-0 flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700 mb-2">
                    <FaLocationDot className="h-5 w-5" />
                  </div>
                  <span className="font-serif text-2xl sm:text-3xl font-extrabold text-slate-900">
                    30+
                  </span>
                  <p className="mt-1 font-sans text-xs font-semibold text-slate-500">
                    {bn ? 'সেবিত অঞ্চল' : 'Communities Served'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────── 5. CTA BANNER ─────────────────── */}
      <section className="py-12 bg-white">
        <div className="mx-auto max-w-[1340px] px-6 md:px-10">
          <div
            className="flex flex-col md:flex-row items-center justify-between gap-6 rounded-2xl p-8 sm:p-10 text-white shadow-xl"
            style={{ background: BRAND }}
          >
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md">
                <FaHeart className="h-7 w-7" />
              </div>
              <div>
                <h3 className="font-serif text-2xl sm:text-3xl font-extrabold">
                  {bn ? 'পরিবর্তনের অংশ হন' : 'Be a Part of Change'}
                </h3>
                <p className="mt-1 font-sans text-sm sm:text-base text-white/90">
                  {bn
                    ? 'আমাদের যাত্রায় যোগ দিন এবং একটি সুন্দর ভবিষ্যৎ গঠনে ভূমিকা রাখুন।'
                    : 'Join our mission and help us build a better tomorrow for everyone.'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Link
                to="/volunteer"
                className="inline-flex items-center gap-2 rounded-full border-2 border-white px-6 py-3 font-sans text-sm font-bold text-white transition-all hover:bg-white/10"
              >
                <span>{bn ? 'স্বেচ্ছাসেবক হিসেবে যোগ দিন' : 'Join as Volunteer'}</span>
              </Link>
              <Link
                to="/donate"
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-sans text-sm font-bold shadow-md transition-all hover:bg-amber-50"
                style={{ color: BRAND }}
              >
                <span>{bn ? 'এখনই দান করুন' : 'Donate Now'}</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
