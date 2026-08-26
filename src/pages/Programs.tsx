import React from 'react';
import { Link } from 'react-router-dom';
import { useT } from '@/i18n';
import Breadcrumb from '@/components/ui/Breadcrumb';
import { useSEO } from '@/hooks/useSEO';
import { SEO } from '@/data/seoConfig';
import {
  FaDroplet, FaGraduationCap, FaStethoscope, FaLeaf, FaHandsHoldingChild,
  FaUserGroup, FaHandHoldingHeart, FaMusic, FaHeart, FaPlay, FaArrowRight,
  FaCalendarDays, FaLocationDot, FaUsers
} from 'react-icons/fa6';

const FALLBACK_IMG = '/assets/images/Chhatradol.jpg';

const onImgErr = (e: React.SyntheticEvent<HTMLImageElement>) => {
  if (!e.currentTarget.src.includes('Chhatradol')) {
    e.currentTarget.src = FALLBACK_IMG;
  }
};

export default function Programs() {
  const { lang } = useT();
  const bn = lang === 'bn';
  useSEO(SEO['/programs']);

  const pillarCards = [
    {
      tag: '01',
      title: bn ? 'স্বাস্থ্য' : 'Health',
      count: bn ? '৩ কর্মসূচি' : '3 PROGRAMMES',
      icon: FaDroplet,
      iconBg: 'bg-site-cream text-site-blood',
    },
    {
      tag: '02',
      title: bn ? 'শিক্ষা' : 'Education',
      count: bn ? '১ কর্মসূচি' : '1 PROGRAMME',
      icon: FaGraduationCap,
      iconBg: 'bg-site-cream text-site-green',
    },
    {
      tag: '03',
      title: bn ? 'পরিবেশ' : 'Environment',
      count: bn ? '১ কর্মসূচি' : '1 PROGRAMME',
      icon: FaLeaf,
      iconBg: 'bg-site-cream text-site-green',
    },
    {
      tag: '04',
      title: bn ? 'মানবিক' : 'Humanitarian',
      count: bn ? '৩ কর্মসূচি' : '3 PROGRAMMES',
      icon: FaHandHoldingHeart,
      iconBg: 'bg-site-cream text-site-green',
    },
  ];

  const keyPrograms = [
    {
      title: bn ? 'রক্তদান শিবির' : 'Blood Donation Camps',
      desc: bn
        ? 'রক্তদানের গুরুত্ব প্রচার এবং নিয়মিত শিবিরের মাধ্যমে জরুরি অবস্থায় রক্ত সরবরাহ নিশ্চিত করা।'
        : 'Organising regular blood donation camps to save lives and promote health awareness.',
      icon: FaDroplet,
      iconBg: 'bg-site-cream text-site-blood',
      img: '/assets/images/service/post-33-raktokotha-camp.jpg',
    },
    {
      title: bn ? 'শিক্ষাদান ও পাঠসামগ্রী' : 'Education & Learning',
      desc: bn
        ? 'দরিদ্র শিক্ষার্থীদের খাতা, বই ও শিক্ষাসামগ্রী প্রদান এবং নিখরচায় পড়াশোনার সুযোগ তৈরি।'
        : 'Supporting students with study materials, guidance, and educational support programs.',
      icon: FaGraduationCap,
      iconBg: 'bg-site-cream text-site-green',
      img: '/assets/images/service/post-34-students-book-support.jpg',
    },
    {
      title: bn ? 'চিকিৎসা ও স্বাস্থ্য পরীক্ষা' : 'Healthcare Support',
      desc: bn
        ? 'ফ্রি হেলথ ক্যাম্প, চক্ষু পরীক্ষা ও প্রান্তিক মানুষের চিকিৎসায় সহায়তামূলক উদ্যোগ।'
        : 'Health check-ups, medical camps, and support for underprivileged communities.',
      icon: FaStethoscope,
      iconBg: 'bg-site-cream text-site-green',
      img: '/assets/images/service/post-15-mental-care-home.jpg',
    },
    {
      title: bn ? 'পরিবেশ সুরক্ষা' : 'Environment Initiative',
      desc: bn
        ? 'বৃক্ষরোপণ কর্মসূচি, প্লাস্টিক মুক্ত অভিযান এবং সচেতনতা বৃদ্ধির মাধ্যমে সবুজ ভবিষ্যৎ গঠন।'
        : 'Tree plantation, clean drives, and environment awareness for a greener future.',
      icon: FaLeaf,
      iconBg: 'bg-site-cream text-site-green',
      img: '/assets/images/impacts/tree_plantations.jpg',
    },
    {
      title: bn ? 'নারী ক্ষমতায়ন' : 'Women Empowerment',
      desc: bn
        ? 'কিশোরী ও নারীদের নিরাপত্তা সচেতনতা, স্বাবলম্বিতা ও সামাজিক প্রশিক্ষণ।'
        : 'Skills training and empowerment programs for women to become self-reliant.',
      icon: FaHandsHoldingChild,
      iconBg: 'bg-site-cream text-site-green',
      img: '/assets/images/service/post-35-stop-child-marriage.jpg',
    },
    {
      title: bn ? 'যুব সমাজ উন্নয়ন' : 'Youth Development',
      desc: bn
        ? 'যুবসমাজের সামাজিক দায়িত্ববোধ বৃদ্ধি ও সুনাগরিক হিসেবে গড়ে তোলার প্রয়াস।'
        : 'Building leadership, confidence, and skills among the youth for a better tomorrow.',
      icon: FaUserGroup,
      iconBg: 'bg-site-cream text-site-green',
      img: '/assets/images/service/post-31-freedom-fighters-program.jpg',
    },
    {
      title: bn ? 'জরুরি ত্রাণ ও সহায়তা' : 'Relief & Support',
      desc: bn
        ? 'প্রাকৃতিক দুর্যোগ ও দুঃসময়ে অসহায় মানুষদের খাদ্য, পোশাক ও বাসস্থান সহায়তা।'
        : 'Providing help during natural disasters and supporting needy families.',
      icon: FaHandHoldingHeart,
      iconBg: 'bg-site-cream text-site-green',
      img: '/assets/images/service/post-30-tarpaulin-distribution.jpg',
    },
    {
      title: bn ? 'সাংস্কৃতিক বিকাশ' : 'Cultural Activities',
      desc: bn
        ? 'ঐতিহ্য ও সাংস্কৃতিক বিকাশ রক্ষায় প্রতিযোগিতা ও মেধা বিকাশ অনুষ্ঠান।'
        : 'Promoting culture, sports, and social harmony through various events.',
      icon: FaMusic,
      iconBg: 'bg-site-cream text-site-green',
      img: '/assets/images/service/drawing.jpg',
    },
  ];

  const impactStats = [
    {
      icon: FaUsers,
      value: '25,000+',
      label: bn ? 'উপকারভোগী মানুষ' : 'Lives Touched',
    },
    {
      icon: FaHandHoldingHeart,
      value: '350+',
      label: bn ? 'স্বেচ্ছাসেবক' : 'Volunteers',
    },
    {
      icon: FaCalendarDays,
      value: '120+',
      label: bn ? 'সম্পন্ন কর্মসূচি' : 'Programs Completed',
    },
    {
      icon: FaLocationDot,
      value: '30+',
      label: bn ? 'সেবিত অঞ্চল' : 'Communities Served',
    },
  ];

  return (
    <div className="min-h-screen bg-site-cream">
      <Breadcrumb title={bn ? 'আমাদের কর্মসূচিসমূহ' : 'Our Programs'} />

      {/* ─────────────────── 1. HERO SECTION ─────────────────── */}
      <section className="page-hero px-5 pb-16 pt-14 sm:px-8 md:pb-[86px] md:pt-[76px]">
        <div className="mx-auto grid w-full max-w-site grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
          {/* Left Content */}
          <div className="lg:col-span-6">
            <div className="eyebrow-light">{bn ? 'আমাদের কর্মসূচিসমূহ' : 'Our Programs'}</div>
            <h1 className="h-display mt-4 text-white">
              {bn ? (
                <>
                  আট ধরনের কর্মসূচি, <br />
                  একটাই লক্ষ্য — <br />
                  <span className="text-site-yellow">সমাজের পাশে থাকা।</span>
                </>
              ) : (
                <>
                  Eight Programmes, <br />
                  One Goal — <br />
                  <span className="text-site-yellow">Standing by Society.</span>
                </>
              )}
            </h1>

            <p className="mt-5 max-w-xl font-dmsans text-[16px] leading-[1.8] text-white/70">
              {bn
                ? 'আমরা চার বড় ক্ষেত্রে কাজ করি — স্বাস্থ্য, শিক্ষা, পরিবেশ ও মানবিক সহায়তা। প্রতিটি কর্মসূচি স্থানীয় সম্প্রদায়ের সক্রিয় অংশগ্রহণে পরিচালিত হয়।'
                : 'We work in four major areas — health, education, environment and humanitarian support. Each programme is run with active participation from local communities.'}
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <a href="#key-programs" className="btn-yellow">
                <span>{bn ? 'কর্মসূচি এক্সপ্লোর করুন' : 'Explore Programs'}</span>
                <FaArrowRight className="h-3 w-3" />
              </a>
              <Link to="/impacts" className="btn-ghost-light">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-site-yellow text-site-ink">
                  <FaPlay className="h-2.5 w-2.5 translate-x-[1px]" />
                </span>
                <span>{bn ? 'আমাদের প্রভাব দেখুন' : 'See Our Impact'}</span>
              </Link>
            </div>
          </div>

          {/* Right Collaged Images */}
          <div className="lg:col-span-6">
            <div className="grid grid-cols-12 items-stretch gap-3">
              {/* Large Left Image */}
              <div className="img-zoom col-span-7 overflow-hidden rounded-panel">
                <img
                  src="/assets/images/service/post-34-students-book-support.jpg"
                  alt="Education Program"
                  className="h-full min-h-[320px] w-full object-cover"
                  onError={onImgErr}
                />
              </div>
              {/* 3 Right Stacked Images */}
              <div className="col-span-5 flex flex-col justify-between gap-3">
                <div className="img-zoom h-24 overflow-hidden rounded-soft sm:h-28">
                  <img
                    src="/assets/images/service/post-15-mental-care-home.jpg"
                    alt="Healthcare Camp"
                    className="h-full w-full object-cover"
                    onError={onImgErr}
                  />
                </div>
                <div className="img-zoom h-24 overflow-hidden rounded-soft sm:h-28">
                  <img
                    src="/assets/images/impacts/tree_plantations.jpg"
                    alt="Tree Plantation"
                    className="h-full w-full object-cover"
                    onError={onImgErr}
                  />
                </div>
                <div className="img-zoom h-24 overflow-hidden rounded-soft sm:h-28">
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
      </section>

      {/* ─────────────────── 2. PILLAR SUMMARY CARDS ─────────────────── */}
      <section className="site-section-t pb-6">
        <div className="site-wrap">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {pillarCards.map((p) => {
              const IconComp = p.icon;
              return (
                <div
                  key={p.tag}
                  className="flex items-center gap-4 rounded-full border border-site-line bg-white px-6 py-5"
                >
                  <span className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${p.iconBg}`}>
                    <IconComp className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <span className="font-dmmono text-[10px] font-medium uppercase tracking-[0.14em] text-site-faint">
                      {p.tag}
                    </span>
                    <h3 className="font-archivo text-[18px] font-bold leading-tight text-site-ink">
                      {p.title}
                    </h3>
                    <p className="mt-0.5 font-dmmono text-[11px] font-medium text-site-red">
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
      <section id="key-programs" className="site-section">
        <div className="site-wrap">
          <div className="mx-auto max-w-2xl text-center">
            <span className="eyebrow">
              {bn ? 'আমরা কী করি' : 'WHAT WE DO'}
            </span>
            <h2 className="h-section mt-3 text-site-ink">
              {bn ? 'আমাদের মূল কর্মসূচিসমূহ' : 'Our Key Programs'}
            </h2>
            <p className="body-text mt-4">
              {bn
                ? 'শিক্ষা, স্বাস্থ্য, পরিবেশ ও মানবিক সহায়তা — আটটি বিশেষ কর্মসূচির মাধ্যমে আমরা সমাজে ইতিবাচক পরিবর্তন আনি।'
                : 'We run impactful programmes that bring real change to people\'s lives with the support of communities and volunteers.'}
            </p>
          </div>

          {/* Stacked wide rows: image | text | pill CTA */}
          <div className="mt-12 grid gap-5">
            {keyPrograms.map((prog, idx) => {
              const PIcon = prog.icon;
              return (
                <div
                  key={idx}
                  className="soft-card grid items-center gap-7 p-6 sm:p-7 lg:grid-cols-[280px_1fr_auto]"
                >
                  {/* Thumbnail Image */}
                  <div className="img-zoom relative aspect-[16/10] overflow-hidden rounded-[16px] lg:aspect-[4/3]">
                    <img
                      src={prog.img}
                      alt={prog.title}
                      className="h-full w-full object-cover"
                      onError={onImgErr}
                    />
                    <div className="absolute left-4 top-4">
                      <span className={`flex h-10 w-10 items-center justify-center rounded-full ${prog.iconBg}`}>
                        <PIcon className="h-5 w-5" />
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div>
                    <h3 className="h-card text-site-ink">
                      {prog.title}
                    </h3>
                    <p className="mt-3 max-w-2xl font-dmsans text-[14.5px] leading-[1.8] text-site-muted">
                      {prog.desc}
                    </p>
                  </div>

                  <Link to="/impacts" className="btn-ghost-dark shrink-0">
                    <span>{bn ? 'আমাদের প্রভাব দেখুন' : 'See Our Impact'}</span>
                    <FaArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─────────────────── 4. IMPACT STATS BAND ─────────────────── */}
      <section className="site-section-b">
        <div className="site-wrap">
          <div className="rounded-panel bg-site-green p-8 text-white sm:p-12">
            <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
              {/* Left Title */}
              <div className="lg:col-span-4">
                <h3 className="h-section text-white">
                  {bn ? 'প্রতিদিন ইতিবাচক প্রভাব তৈরি' : 'Creating Impact Every Day'}
                </h3>
                <p className="mt-4 font-dmsans text-[15px] leading-[1.8] text-white/70">
                  {bn
                    ? 'আপনাদের নিরবচ্ছিন্ন সহযোগিতার মাধ্যমেই আমরা প্রতিদিন নতুন জীবনের হাসি ফোটাতে সক্ষম।'
                    : 'Because of your support, we are able to change lives and build a better society.'}
                </p>
              </div>

              {/* 4 Stat Items */}
              <div className="grid grid-cols-2 gap-6 border-t border-white/15 pt-8 sm:grid-cols-4 lg:col-span-8 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
                {impactStats.map((s) => {
                  const SIcon = s.icon;
                  return (
                    <div key={s.label} className="text-center sm:text-left">
                      <span className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-site-yellow sm:mx-0">
                        <SIcon className="h-5 w-5" />
                      </span>
                      <span className="font-archivo text-[28px] font-bold leading-none text-site-yellow">
                        {s.value}
                      </span>
                      <p className="mt-2 font-dmsans text-[12.5px] font-medium text-white/70">
                        {s.label}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────── 5. CTA BANNER ─────────────────── */}
      <section className="site-section-b">
        <div className="site-wrap">
          <div className="flex flex-col items-start justify-between gap-6 rounded-panel bg-site-yellow p-8 text-site-ink sm:p-10 md:flex-row md:items-center">
            <div className="flex items-center gap-5">
              <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-site-ink/10 text-site-ink">
                <FaHeart className="h-6 w-6" />
              </span>
              <div>
                <h3 className="font-archivo text-[clamp(24px,3vw,34px)] font-bold leading-[1.15] tracking-[-0.02em]">
                  {bn ? 'পরিবর্তনের অংশ হন' : 'Be a Part of Change'}
                </h3>
                <p className="mt-2 font-dmsans text-[15.5px] leading-[1.7] text-[#3b3413]">
                  {bn
                    ? 'আমাদের যাত্রায় যোগ দিন এবং একটি সুন্দর ভবিষ্যৎ গঠনে ভূমিকা রাখুন।'
                    : 'Join our mission and help us build a better tomorrow for everyone.'}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-3">
              <Link to="/volunteer" className="btn-ghost-dark">
                <span>{bn ? 'স্বেচ্ছাসেবক হিসেবে যোগ দিন' : 'Join as Volunteer'}</span>
              </Link>
              <Link to="/donate" className="btn-green">
                <span>{bn ? 'এখনই দান করুন' : 'Donate Now'}</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
