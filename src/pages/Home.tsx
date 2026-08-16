import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useT } from '@/i18n';
import { usePosts } from '@/hooks/usePosts';
import { useInView, useCountUp } from '@/hooks/useInView';
import { useSEO } from '@/hooks/useSEO';
import { SEO } from '@/data/seoConfig';
import {
  FaHeart, FaArrowRight, FaShieldHalved, FaUsers, FaLeaf, FaHandshake,
  FaGraduationCap, FaDroplet, FaStethoscope, FaHandsHoldingChild,
  FaUserGroup, FaHandHoldingHeart, FaMusic, FaQuoteLeft, FaPlay,
  FaRegCalendarDays
} from 'react-icons/fa6';

// ─── Original Brand Color Tokens ───
const BRAND = '#c2410c';       // Terracotta Brand Red-Orange
const BRAND_LIGHT = '#ea580c'; // Light Terracotta
const INK = '#1c1917';         // Rich Dark Ink
const BG_CREAM = '#faf6ef';    // Warm Linen Paper Background
const ACCENT_LIGHT = '#fdcf6f';// Light Gold
const RULE = '#e7e5e4';        // Subtle Rule / Border

const FALLBACK_IMG = '/assets/images/Chhatradol.jpg';

const onImgErr = (e: React.SyntheticEvent<HTMLImageElement>) => {
  if (e.currentTarget.src !== window.location.origin + FALLBACK_IMG) {
    e.currentTarget.src = FALLBACK_IMG;
  }
};

// ─── Scroll Animation Wrapper ───
function Reveal({
  children,
  className = '',
  delay = 0,
  direction = 'up',
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: 'up' | 'left' | 'right' | 'scale';
}) {
  const { ref, inView } = useInView(0.12);
  const cls =
    direction === 'left'
      ? 'reveal-left'
      : direction === 'right'
      ? 'reveal-right'
      : direction === 'scale'
      ? 'reveal-scale'
      : 'reveal';
  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className={`${cls}${inView ? ' revealed' : ''} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

// ─── Section Header Component ───
function SectionHeader({
  title,
  subtitle,
  linkTo,
  linkText,
}: {
  title: string;
  subtitle: string;
  linkTo?: string;
  linkText?: string;
}) {
  return (
    <div className="mb-10 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
      <div>
        <h2 className="font-bengali text-3xl font-bold tracking-tight md:text-4xl" style={{ color: INK }}>
          {title}
        </h2>
        <p className="mt-2 font-bengali text-sm md:text-base" style={{ color: '#57534e' }}>
          {subtitle}
        </p>
      </div>
      {linkTo && (
        <Link
          to={linkTo}
          className="group inline-flex items-center gap-1.5 font-bengali text-sm font-semibold transition-colors"
          style={{ color: BRAND }}
        >
          {linkText}
          <FaArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
        </Link>
      )}
    </div>
  );
}

// ─────────────────── 1. HERO SECTION ───────────────────
function Hero() {
  const { lang } = useT();
  const bn = lang === 'bn';

  return (
    <section className="relative flex min-h-[90vh] items-center overflow-hidden" style={{ background: INK }}>
      {/* Background Image with Original Dark Gradient Overlay */}
      <img
        src="/assets/images/Chhatradol.jpg"
        alt="Chhatradol SWO Team"
        className="absolute inset-0 h-full w-full object-cover"
        onError={onImgErr}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(110deg, rgba(28, 25, 23, 0.95) 0%, rgba(28, 25, 23, 0.82) 50%, rgba(28, 25, 23, 0.45) 100%)',
        }}
      />

      <div className="relative mx-auto w-full max-w-[1340px] px-6 py-20 md:px-10 md:py-28">
        <div className="max-w-2xl">
          {/* Eyebrow Tagline */}
          <div className="inline-flex items-center gap-2 text-lg sm:text-xl font-medium tracking-wide text-amber-200 font-sans">
            <span>— Unity • Education • Progress</span>
          </div>

          {/* Main Headline */}
          <h1 className="mt-4 font-bengali text-4xl font-extrabold leading-[1.1] text-white sm:text-5xl md:text-6xl lg:text-7xl">
            {bn ? 'একসাথে, আমরা গড়ি এক সুন্দর আগামী।' : 'Together, we build a better tomorrow.'}
          </h1>

          {/* Subtitle */}
          <p className="mt-6 max-w-xl font-bengali text-base leading-relaxed text-white/80 md:text-lg">
            {bn
              ? 'শিক্ষা, স্বাস্থ্যসেবা, পরিবেশ এবং সামাজিক উন্নয়নের মাধ্যমে সমাজকে আরও শক্তিশালী ও আলোকিত করে তোলাই ছাত্রদলের মূল লক্ষ্য।'
              : 'Chhatradol SWO is dedicated to social welfare, education, healthcare, and community development for a stronger and brighter society.'}
          </p>

          {/* CTA Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 sm:gap-4">
            <Link
              to="/donate"
              className="inline-flex items-center justify-center gap-2.5 rounded-full px-7 py-3.5 font-bengali text-base font-bold text-white shadow-xl transition-all duration-200 hover:-translate-y-0.5"
              style={{ background: BRAND, boxShadow: '0 12px 30px -8px rgba(194, 65, 12, 0.6)' }}
            >
              {bn ? 'দান করুন 💛' : 'Donate Now 💛'}
            </Link>
            <Link
              to="/events"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/30 px-7 py-3.5 font-bengali text-base font-semibold text-white transition-all duration-200 hover:bg-white/10 hover:border-white/60"
            >
              {bn ? 'আমাদের কার্যক্রম ➔' : 'Explore Our Work ➔'}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────── 2. CORE VALUES FLOATING BAR ───────────────────
function CoreValuesBar() {
  const { lang } = useT();
  const bn = lang === 'bn';

  const values = [
    {
      icon: FaShieldHalved,
      title: bn ? 'স্বচ্ছতা' : 'Transparency',
      desc: bn ? '১০০% স্বচ্ছ কার্যক্রম' : '100% transparent operations',
    },
    {
      icon: FaUsers,
      title: bn ? 'জনকল্যাণমূলক' : 'Community Driven',
      desc: bn ? 'মানুষের পাশে, মানুষের জন্য' : 'By the people, for the people',
    },
    {
      icon: FaLeaf,
      title: bn ? 'অলাভজনক' : 'Non-Profit',
      desc: bn ? 'প্রতিটি দান সরাসরি সেবায়' : 'Every contribution creates impact',
    },
    {
      icon: FaHandshake,
      title: bn ? 'বিশ্বাস ও সততা' : 'Trust & Integrity',
      desc: bn ? 'সততা ও দায়বদ্ধতায় প্রতিশ্রুত' : 'Committed to honesty and accountability',
    },
  ];

  return (
    <div className="relative z-20 mx-auto -mt-6 sm:-mt-10 max-w-[1340px] px-4 md:px-10">
      <div
        className="grid grid-cols-1 divide-y divide-white/10 rounded-2xl border border-white/15 p-4 sm:p-6 shadow-2xl backdrop-blur-md sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4"
        style={{ background: INK }}
      >
        {values.map((v, i) => {
          const VIcon = v.icon;
          return (
            <div key={i} className="flex items-center gap-3.5 py-3 sm:px-6 sm:py-2">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10" style={{ color: ACCENT_LIGHT }}>
                <VIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bengali text-sm sm:text-base font-bold text-white truncate">{v.title}</h3>
                <p className="font-bengali text-xs text-white/70 truncate">{v.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────── 3. OUR IMPACT IN NUMBERS ───────────────────
function ImpactSection() {
  const { lang } = useT();
  const bn = lang === 'bn';

  const stats = [
    {
      icon: FaUserGroup,
      number: 5000,
      suffix: '+',
      label: bn ? 'জীবনের উন্নয়ন' : 'Lives Impacted',
      color: 'bg-orange-100 text-orange-700',
    },
    {
      icon: FaGraduationCap,
      number: 25,
      suffix: '+',
      label: bn ? 'শিক্ষা কর্মসূচি' : 'Education Programs',
      color: 'bg-amber-100 text-amber-700',
    },
    {
      icon: FaHeart,
      number: 2000,
      suffix: '+',
      label: bn ? 'স্বেচ্ছাসেবকের ঘণ্টা' : 'Volunteer Hours',
      color: 'bg-rose-100 text-rose-700',
    },
    {
      icon: FaDroplet,
      number: 47,
      suffix: '+',
      label: bn ? 'রক্তদান শিবির' : 'Blood Donation Camps',
      color: 'bg-teal-100 text-teal-700',
    },
  ];

  return (
    <section className="py-20" style={{ background: BG_CREAM }}>
      <div className="mx-auto max-w-[1340px] px-6 md:px-10">
        <Reveal>
          <SectionHeader
            title={bn ? 'আমাদের কাজের প্রভাব' : 'Our Impact in Numbers'}
            subtitle={bn ? 'মানুষের জীবন পরিবর্তনই আমাদের প্রকৃত সাফল্য।' : 'Real people. Real change. Real impact.'}
            linkTo="/impacts"
            linkText={bn ? 'সকল প্রভাব দেখুন' : 'View all impact'}
          />
        </Reveal>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((item, idx) => (
            <StatCard key={idx} item={item} lang={lang} />
          ))}
        </div>
      </div>
    </section>
  );
}

function StatCard({ item, lang }: { item: any; lang: string }) {
  const { ref, inView } = useInView(0.2);
  const count = useCountUp(item.number, inView, 1600);
  const IconComp = item.icon;

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className="group rounded-2xl border bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl"
      style={{ borderColor: RULE }}
    >
      <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${item.color}`}>
        <IconComp className="h-6 w-6" />
      </div>
      <div className="mt-5 font-bengali text-4xl font-extrabold md:text-5xl" style={{ color: INK }}>
        {lang === 'bn' ? `${count}${item.suffix}` : `${count}${item.suffix}`}
      </div>
      <p className="mt-2 font-bengali text-sm font-medium" style={{ color: '#57534e' }}>
        {item.label}
      </p>
      <div className="mt-4 h-1 w-8 rounded-full transition-all duration-300 group-hover:w-16" style={{ background: BRAND }} />
    </div>
  );
}

// ─────────────────── 4. OUR KEY PROGRAMS ───────────────────
function KeyProgramsSection() {
  const { lang } = useT();
  const bn = lang === 'bn';

  const programs = [
    {
      title: bn ? 'রক্তদান শিবির' : 'Blood Donation Camps',
      desc: bn
        ? 'জরুরি প্রয়োজনে মুমূর্ষু রোগীদের জীবন বাঁচাতে নিয়মিত রক্তদান শিবিরের আয়োজন করা হয়।'
        : 'Organising regular blood donation camps to save lives and promote health awareness.',
      icon: FaDroplet,
      iconBg: 'bg-rose-100 text-rose-700',
      img: '/assets/images/service/post-33-raktokotha-camp.jpg',
    },
    {
      title: bn ? 'শিক্ষা ও শিক্ষা সহায়তা' : 'Education & Learning',
      desc: bn
        ? 'দরিদ্র ও মেধাবী শিক্ষার্থীদের জন্য বিনামূল্যে শিক্ষা, পাঠ্যসামগ্রী ও দিকনির্দেশনা।'
        : 'Supporting students with study materials, guidance, and educational support programs.',
      icon: FaGraduationCap,
      iconBg: 'bg-amber-100 text-amber-700',
      img: '/assets/images/service/post-34-students-book-support.jpg',
    },
    {
      title: bn ? 'স্বাস্থ্য সেবা সহায়তা' : 'Healthcare Support',
      desc: bn
        ? 'বিনামূল্যে স্বাস্থ্য পরীক্ষা, বিশেষজ্ঞ ডাক্তারের পরামর্শ ও ঔষধ বিতরণ কর্মসূচি।'
        : 'Health check-ups, medical camps, and support for underprivileged communities.',
      icon: FaStethoscope,
      iconBg: 'bg-teal-100 text-teal-700',
      img: '/assets/images/service/post-15-mental-care-home.jpg',
    },
    {
      title: bn ? 'পরিবেশ সুরক্ষা উদ্যোগ' : 'Environment Initiative',
      desc: bn
        ? 'সবুজ বসুন্ধরা গড়তে বৃক্ষরোপণ, পরিচ্ছন্নতা অভিযান ও পরিবেশ সচেতনতা।'
        : 'Tree plantation, clean drives, and environment awareness for a greener future.',
      icon: FaLeaf,
      iconBg: 'bg-green-100 text-green-700',
      img: '/assets/images/service/tree_plantations.jpg',
    },
    {
      title: bn ? 'নারী ক্ষমতায়ন' : 'Women Empowerment',
      desc: bn
        ? 'স্বাবলম্বী হতে নারীদের আত্মনির্ভরশীলতা ও বৃত্তিমূলক প্রশিক্ষণ প্রদান।'
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
        ? 'প্রাকৃতিক দুর্যোগ ও দুঃসময়ে অসহায় মানুষদের খাদ্য ও বাসস্থান সহায়তা।'
        : 'Providing help during natural disasters and supporting needy families.',
      icon: FaHandHoldingHeart,
      iconBg: 'bg-emerald-100 text-emerald-700',
      img: '/assets/images/service/post-30-tarpaulin-distribution.jpg',
    },
    {
      title: bn ? 'সাংস্কৃতিক ও খেলাধুলা' : 'Cultural Activities',
      desc: bn
        ? 'ঐতিহ্য ও সাংস্কৃতিক বিকাশ রক্ষায় প্রতিযোগিতা ও মেধা বিকাশ অনুষ্ঠান।'
        : 'Promoting culture, sports, and social harmony through various events.',
      icon: FaMusic,
      iconBg: 'bg-purple-100 text-purple-700',
      img: '/assets/images/service/drawing.jpg',
    },
  ];

  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-[1340px] px-6 md:px-10">
        <Reveal>
          <SectionHeader
            title={bn ? 'আমাদের মূল কর্মসূচিসমূহ' : 'Our Key Programs'}
            subtitle={bn ? 'যে ক্ষেত্রগুলোতে আমরা সমাজ পরিবর্তনের কাজ করি।' : 'We work in areas that create the biggest impact.'}
            linkTo="/programs"
            linkText={bn ? 'সকল কর্মসূচি দেখুন' : 'View all programs'}
          />
        </Reveal>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {programs.map((prog, idx) => {
            const PIcon = prog.icon;
            return (
              <div
                key={idx}
                className="group flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl"
                style={{ borderColor: RULE }}
              >
                {/* Thumbnail Image */}
                <div className="relative aspect-[4/3] sm:aspect-[16/10] overflow-hidden bg-slate-100">
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
                    <h3 className="font-bengali text-lg font-bold transition-colors group-hover:text-[#c2410c]" style={{ color: INK }}>
                      {prog.title}
                    </h3>
                    <p className="mt-2 font-bengali text-xs leading-relaxed" style={{ color: '#57534e' }}>
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
  );
}

// ─────────────────── 5. SPOTLIGHT / OUR MISSION ───────────────────
function MissionSpotlight() {
  const { lang } = useT();
  const bn = lang === 'bn';

  const missionPoints = [
    {
      icon: FaGraduationCap,
      title: bn ? 'মানসম্পন্ন শিক্ষা' : 'Quality Education',
      desc: bn ? 'সকলের জন্য শিক্ষার সুযোগ নিশ্চিত করা।' : 'We support learning for all.',
    },
    {
      icon: FaLeaf,
      title: bn ? 'উজ্জ্বল ভবিষ্যৎ' : 'Bright Future',
      desc: bn ? 'আগামী প্রজন্মকে সমৃদ্ধ করা।' : 'Empowering the next generation.',
    },
    {
      icon: FaShieldHalved,
      title: bn ? 'সমান সুযোগ' : 'Equal Opportunity',
      desc: bn ? 'প্রান্তিক জনগোষ্ঠীর অধিকার প্রতিষ্ঠা।' : 'Everyone deserves a chance.',
    },
    {
      icon: FaUserGroup,
      title: bn ? 'মজবুত সম্প্রদায়' : 'Stronger Community',
      desc: bn ? 'একত্র হয়ে উন্নতির দিকে এগিয়ে চলা।' : 'Together we grow stronger.',
    },
  ];

  return (
    <section className="py-20 text-white" style={{ background: INK }}>
      <div className="mx-auto max-w-[1340px] px-6 md:px-10">
        <div className="grid grid-cols-1 items-center gap-10 rounded-3xl border border-white/10 p-8 shadow-2xl lg:grid-cols-12 lg:p-12" style={{ background: 'rgba(255,255,255,0.03)' }}>
          {/* Left Column: Image */}
          <div className="lg:col-span-5">
            <div className="relative overflow-hidden rounded-2xl shadow-xl">
              <img
                src="/assets/images/impacts/education.jpg"
                alt="Education Mission"
                className="aspect-[4/3] w-full object-cover transition-transform duration-500 hover:scale-105"
                onError={onImgErr}
              />
            </div>
          </div>

          {/* Middle Column: Text & Quote */}
          <div className="lg:col-span-4">
            <div className="font-mono text-xs font-bold uppercase tracking-wider" style={{ color: ACCENT_LIGHT }}>
              • {bn ? 'আমাদের ভিশন' : 'OUR MISSION'}
            </div>
            <h2 className="mt-3 font-bengali text-3xl font-extrabold leading-tight text-white md:text-4xl">
              {bn ? 'শিক্ষা: অন্ধকার থেকে আলোর দিকে' : 'Education: from darkness to light'}
            </h2>

            <div className="mt-4 flex items-start gap-3 rounded-xl bg-white/5 p-4 border border-white/10">
              <FaQuoteLeft className="h-6 w-6 flex-shrink-0 opacity-80" style={{ color: ACCENT_LIGHT }} />
              <p className="font-bengali text-sm italic leading-relaxed text-white/90">
                {bn
                  ? 'আমরা বিশ্বাস করি প্রতিটি শিশুই মানসম্পন্ন শিক্ষার অধিকারী এবং প্রতিটি মানুষ সুযোগ পাওয়ার যোগ্য।'
                  : 'We believe every child deserves quality education and every individual deserves an opportunity to build a better future.'}
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/about"
                className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 font-bengali text-sm font-bold text-white shadow-md transition-all hover:bg-orange-700"
                style={{ background: BRAND }}
              >
                {bn ? 'আমাদের ভিশন ➔' : 'Our Mission ➔'}
              </Link>
              <Link
                to="https://www.youtube.com/@Chhatradolswo"
                className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-2.5 font-bengali text-sm font-semibold text-white transition-all hover:bg-white/10"
              >
                <FaPlay className="h-3 w-3" style={{ color: ACCENT_LIGHT }} />
                {bn ? 'ভিডিও দেখুন' : 'Watch Video'}
              </Link>
            </div>
          </div>

          {/* Right Column: 4 Feature Items */}
          <div className="space-y-4 lg:col-span-3">
            {missionPoints.map((pt, i) => {
              const IconComp = pt.icon;
              return (
                <div key={i} className="flex items-center gap-3.5 rounded-xl border border-white/10 bg-white/5 p-3.5 transition-colors hover:bg-white/10">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white/10" style={{ color: ACCENT_LIGHT }}>
                    <IconComp className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bengali text-sm font-bold text-white">{pt.title}</h4>
                    <p className="font-bengali text-xs text-white/70">{pt.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────── 6. LATEST NEWS & EVENTS ───────────────────
function LatestNewsSection() {
  const { posts: dbPosts } = usePosts();

  const allPosts = useMemo(() => {
    const DEFAULT_NEWS = [
      {
        id: '1',
        title: 'Free Health Check-up Camp Held in Narajole',
        date: 'May 20, 2026',
        cat: 'Healthcare Initiative',
        desc: 'Our free health check-up camp benefitted over 120 villagers with doctor consultations, diagnostic checkups, and free medicines. Thank you to all healthcare volunteers and community donors.',
        img: '/assets/images/service/post-15-mental-care-home.jpg',
        slug: 'free-general-health-checkup',
      },
      {
        id: '2',
        title: 'Blood Donation Camp – Thank You Volunteers',
        date: 'May 18, 2026',
        cat: 'Blood Camp',
        desc: 'Another successful blood donation camp with overwhelming support from community donors.',
        img: '/assets/images/service/post-33-raktokotha-camp.jpg',
        slug: 'regular-blood-donation-camp',
      },
      {
        id: '3',
        title: 'Study Materials Distributed to Students',
        date: 'May 15, 2026',
        cat: 'Education',
        desc: 'Distributed study materials, books, and stationery to 100+ underprivileged students.',
        img: '/assets/images/service/post-34-students-book-support.jpg',
        slug: 'education-support-program',
      },
      {
        id: '4',
        title: 'Tree Plantation Drive Completed',
        date: 'May 10, 2026',
        cat: 'Environment',
        desc: 'Planted 150+ trees and committed to a cleaner, greener tomorrow in Paschim Medinipur.',
        img: '/assets/images/impacts/tree_plantations.jpg',
        slug: 'tree-plantation-drive',
      },
      {
        id: '5',
        title: 'Winter Warmth & Clothing Distribution',
        date: 'May 04, 2026',
        cat: 'Relief',
        desc: 'Distributed warm clothes and blankets to senior citizens and needy families.',
        img: '/assets/images/service/post-20-winter-clothes.jpg',
        slug: 'winter-clothes-distribution',
      },
      {
        id: '6',
        title: 'Community Awareness & Youth Guidance',
        date: 'Apr 28, 2026',
        cat: 'Social Welfare',
        desc: 'Organized community workshops promoting social awareness, health, and education.',
        img: '/assets/images/service/post-35-stop-child-marriage.jpg',
        slug: 'community-awareness-workshop',
      },
    ];

    if (dbPosts && dbPosts.length > 0) {
      const formattedDb = dbPosts.map((p) => {
        const plainDesc = p.content
          ? p.content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
          : '';
        let formattedDate = p.publishedDate;
        try {
          if (p.publishedDate) {
            const d = new Date(p.publishedDate);
            formattedDate = d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
          }
        } catch {
          // fallback
        }
        return {
          id: p.id,
          title: p.title,
          date: formattedDate || p.publishedDate,
          cat: p.category || 'Event',
          desc: p.share_snippet || plainDesc || p.title,
          img: p.featuredImage || '/assets/images/Chhatradol.jpg',
          slug: p.slug || p.id,
        };
      });

      const dbTitles = new Set(formattedDb.map((p) => p.title.toLowerCase()));
      const extraDefaults = DEFAULT_NEWS.filter((p) => !dbTitles.has(p.title.toLowerCase()));
      return [...formattedDb, ...extraDefaults].slice(0, 6);
    }

    return DEFAULT_NEWS;
  }, [dbPosts]);

  const currentPost = allPosts[0];
  const last5Posts = allPosts.slice(1, 6);

  return (
    <section className="py-20" style={{ background: BG_CREAM }}>
      <div className="mx-auto max-w-[1340px] px-6 md:px-10">
        <Reveal>
          <SectionHeader
            title="Latest News & Events"
            subtitle="Stay updated with our latest activities and community initiatives."
            linkTo="/events"
            linkText="View all news"
          />
        </Reveal>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12 items-stretch">
          {/* First Big Position: Current Post */}
          {currentPost && (
            <div className="lg:col-span-7 flex flex-col">
              <Link
                to={`/events/${currentPost.slug || currentPost.id}`}
                className="group flex flex-col h-full overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-300 hover:shadow-xl hover:border-amber-400"
                style={{ borderColor: RULE }}
              >
                <div className="relative aspect-[4/3] sm:aspect-[16/9] w-full overflow-hidden bg-slate-100 flex-shrink-0">
                  <img
                    src={currentPost.img}
                    alt={currentPost.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={onImgErr}
                  />
                  <div className="absolute left-4 top-4 flex items-center gap-2">
                    <span className="rounded-full px-3 py-1 text-xs font-bold text-white shadow-md" style={{ background: BRAND }}>
                      Featured Event
                    </span>
                    <span className="rounded-full bg-black/60 backdrop-blur-md px-3 py-1 text-xs font-semibold text-white">
                      {currentPost.date}
                    </span>
                  </div>
                </div>

                <div className="flex flex-1 flex-col justify-between p-6 sm:p-7">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold tracking-wide uppercase text-amber-700">
                      <FaRegCalendarDays className="h-3.5 w-3.5 text-[#c2410c]" />
                      <span>{currentPost.cat} • Narajole</span>
                    </div>
                    <h3 className="mt-2.5 font-sans text-xl sm:text-2xl font-bold leading-tight text-slate-900 transition-colors group-hover:text-[#c2410c]">
                      {currentPost.title}
                    </h3>
                    <p className="mt-2.5 font-sans text-sm sm:text-base leading-relaxed text-slate-600 line-clamp-3">
                      {currentPost.desc}
                    </p>
                  </div>

                  <div className="mt-5 flex items-center gap-2 font-sans text-sm font-bold text-[#c2410c] group-hover:translate-x-1 transition-transform">
                    <span>Read full story</span>
                    <FaArrowRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </Link>
            </div>
          )}

          {/* Right Column: Next 5 Posts */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-3 lg:space-y-0 h-full">
            {last5Posts.map((item, idx) => (
              <Link
                key={item.id || idx}
                to={`/events/${item.slug || item.id}`}
                className="group flex gap-3.5 rounded-xl border bg-white p-3 sm:p-3.5 shadow-sm transition-all duration-300 hover:shadow-md hover:border-amber-400 hover:-translate-y-0.5"
                style={{ borderColor: RULE }}
              >
                <div className="relative h-20 w-24 sm:h-24 sm:w-32 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100">
                  <img
                    src={item.img}
                    alt={item.title}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={onImgErr}
                  />
                </div>

                <div className="flex flex-1 flex-col justify-center min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800 border border-amber-200/60 truncate">
                      {item.cat}
                    </span>
                    <span className="text-[11px] font-medium text-slate-400 shrink-0">
                      {item.date}
                    </span>
                  </div>

                  <h4 className="mt-1 font-sans text-xs sm:text-sm font-bold leading-snug text-slate-900 line-clamp-1 transition-colors group-hover:text-[#c2410c]">
                    {item.title}
                  </h4>

                  <p className="mt-0.5 font-sans text-[11px] sm:text-xs text-slate-500 line-clamp-1 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────── 7. VOICES OF OUR COMMUNITY ───────────────────
function TestimonialsSection() {
  const { lang } = useT();
  const bn = lang === 'bn';

  const testimonials = [
    {
      quote: bn
        ? 'ছাত্রদল সংস্থাটি কঠিন সময়ে সর্বদা আমাদের পাশে দাঁড়িয়েছে। তাদের সামাজিক প্রচেষ্টা সত্যিই প্রশংসনীয়।'
        : 'Chhatradol SWO has always supported us in difficult times. Their efforts are truly inspiring.',
      author: 'Swati Maity',
      role: bn ? 'উপকারভোগী' : 'Beneficiary',
      avatar: '/assets/images/testimonials/swati_maity.jpg',
    },
    {
      quote: bn
        ? 'শিক্ষা সহায়তা কর্মসূচির ফলে আমার সন্তান পড়াশোনা চালিয়ে যেতে পেরেছে। ধন্যবাদ ছাত্রদল।'
        : 'The education support program helped me to continue studies. Thank you Chhatradol SWO!',
      author: 'Amit Mallick',
      role: bn ? 'অভিভাবক' : 'Student',
      avatar: '/assets/images/testimonials/amit_mallick.jpg',
    },
    {
      quote: bn
        ? 'এখানে স্বেচ্ছাসেবক হিসেবে কাজ করে আমি মানবসেবার প্রকৃত অর্থ বুঝতে পেরেছি।'
        : 'Being a volunteer here taught me the true meaning of service and humanity.',
      author: 'Tarasankar Patra',
      role: bn ? 'স্বেচ্ছাসেবক' : 'Volunteer',
      avatar: '/assets/images/testimonials/tarasankar_patra.jpg',
    },
  ];

  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-[1340px] px-6 md:px-10">
        <Reveal>
          <SectionHeader
            title={bn ? 'আমাদের মানুষের অভিজ্ঞতা' : 'Voices of Our Community'}
            subtitle={bn ? 'যাঁদের জীবন ছুঁয়েছে আমাদের ভালোবাসা।' : "Hear from the people whose lives we've touched."}
            linkTo="/about"
            linkText={bn ? 'সকল অভিজ্ঞতা দেখুন' : 'View all testimonials'}
          />
        </Reveal>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {testimonials.map((t, idx) => (
            <div
              key={idx}
              className="flex flex-col justify-between rounded-2xl border p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              style={{ background: BG_CREAM, borderColor: RULE }}
            >
              <div>
                <FaQuoteLeft className="h-8 w-8 opacity-80" style={{ color: BRAND }} />
                <p className="mt-4 font-bengali text-sm leading-relaxed italic" style={{ color: INK }}>
                  "{t.quote}"
                </p>
              </div>

              <div className="mt-6 flex items-center gap-3.5 border-t pt-5" style={{ borderColor: RULE }}>
                <img
                  src={t.avatar}
                  alt={t.author}
                  className="h-11 w-11 rounded-full object-cover border-2"
                  style={{ borderColor: BRAND }}
                  onError={onImgErr}
                />
                <div>
                  <h4 className="font-bengali text-base font-bold" style={{ color: INK }}>{t.author}</h4>
                  <span className="font-bengali text-xs text-slate-500">{t.role}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────── 8. CTA BANNER ───────────────────
function CtaBannerSection() {
  const { lang } = useT();
  const bn = lang === 'bn';

  return (
    <div className="mx-auto max-w-[1340px] px-6 py-10 md:px-10">
      <div className="relative overflow-hidden rounded-3xl p-8 md:p-12 shadow-xl" style={{ background: `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_LIGHT} 50%, ${BRAND} 100%)` }}>
        <div className="flex flex-col items-center justify-between gap-8 md:flex-row text-white">
          <div className="flex items-center gap-6">
            <div className="hidden h-16 w-16 items-center justify-center rounded-2xl bg-white/20 sm:flex">
              <FaUserGroup className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="font-bengali text-3xl font-extrabold md:text-4xl">
                {bn ? 'পরিবর্তনের অংশ হোন' : 'Be Part of the Change'}
              </h2>
              <p className="mt-2 font-bengali text-sm md:text-base opacity-90">
                {bn
                  ? 'আপনার একটি ছোট সাহায্য কারো জীবনে বড় পরিবর্তন আনতে পারে।'
                  : 'Your small help can bring a big change in someone\'s life.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <Link
              to="/donate"
              className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 font-bengali text-sm font-bold text-white shadow-md transition-all hover:bg-black"
              style={{ background: INK }}
            >
              {bn ? 'দান করুন ❤' : 'Donate Now ❤'}
            </Link>
            <Link
              to="/volunteer"
              className="inline-flex items-center gap-2 rounded-full border-2 border-white px-7 py-3.5 font-bengali text-sm font-bold text-white transition-all hover:bg-white hover:text-[#c2410c]"
            >
              {bn ? 'আমাদের সাথে যুক্ত হোন 💛' : 'Volunteer with Us 💛'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────── 9. GET INVOLVED SECTION ───────────────────
function GetInvolvedCardsSection() {
  const { lang } = useT();
  const bn = lang === 'bn';

  const cards = [
    {
      icon: FaHeart,
      iconBg: 'bg-orange-100 text-orange-700',
      title: bn ? 'অনলাইনে দান করুন' : 'Donate',
      desc: bn
        ? 'আপনার আর্থিক সহায়তা আমাদের মিশন পরিচালনা ও অসহায় মানুষের পাশে দাঁড়াতে সাহায্য করে।'
        : 'Your donation helps us continue our mission and support more people in need.',
      linkText: bn ? 'দান করুন ➔' : 'Donate Now ➔',
      to: '/donate',
    },
    {
      icon: FaUserGroup,
      iconBg: 'bg-amber-100 text-amber-700',
      title: bn ? 'স্বেচ্ছাসেবক হোন' : 'Volunteer',
      desc: bn
        ? 'আমাদের মেধা ও সময় দিয়ে সমাজে প্রত্যক্ষ প্রভাব ফেলতে দলে যোগ দিন।'
        : 'Join our team of volunteers and make a direct impact in your community.',
      linkText: bn ? 'যুক্ত হোন ➔' : 'Join Us ➔',
      to: '/volunteer',
    },
    {
      icon: FaHandshake,
      iconBg: 'bg-teal-100 text-teal-700',
      title: bn ? 'অংশীদার হোন' : 'Partner With Us',
      desc: bn
        ? 'প্রতিষ্ঠান ও সংস্থার সাথে যৌথভাবে সমাজে দীর্ঘমেয়াদী কাজ গড়ে তুলুন।'
        : 'Partner with organizations and help us reach more communities.',
      linkText: bn ? 'যোগাযোগ করুন ➔' : 'Partner With Us ➔',
      to: '/contact',
    },
  ];

  return (
    <section className="py-20" style={{ background: BG_CREAM }}>
      <div className="mx-auto max-w-[1340px] px-6 md:px-10">
        <Reveal>
          <div className="mb-10 text-left">
            <h2 className="font-bengali text-3xl font-bold md:text-4xl" style={{ color: INK }}>
              {bn ? 'অংশগ্রহণ করুন' : 'Get Involved'}
            </h2>
            <p className="mt-2 font-bengali text-sm md:text-base" style={{ color: '#57534e' }}>
              {bn ? 'আমাদের কাজে সহযাত্রী হওয়ার বিভিন্ন উপায় রয়েছে।' : 'There are many ways you can contribute.'}
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {cards.map((c, idx) => {
            const CIcon = c.icon;
            return (
              <div
                key={idx}
                className="group flex flex-col justify-between rounded-2xl border bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl"
                style={{ borderColor: RULE }}
              >
                <div>
                  <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${c.iconBg}`}>
                    <CIcon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 font-bengali text-xl font-bold transition-colors group-hover:text-[#c2410c]" style={{ color: INK }}>
                    {c.title}
                  </h3>
                  <p className="mt-2 font-bengali text-sm leading-relaxed" style={{ color: '#57534e' }}>
                    {c.desc}
                  </p>
                </div>

                <Link
                  to={c.to}
                  className="mt-6 inline-flex items-center gap-1.5 font-bengali text-sm font-bold transition-colors"
                  style={{ color: BRAND }}
                >
                  {c.linkText}
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ════════════════════════════════════════════════════════════════════
export default function Home() {
  useSEO(SEO['/']);

  return (
    <div className="min-h-screen font-sans" style={{ background: BG_CREAM }}>
      <Hero />
      <CoreValuesBar />
      <ImpactSection />
      <KeyProgramsSection />
      <MissionSpotlight />
      <LatestNewsSection />
      <TestimonialsSection />
      <CtaBannerSection />
      <GetInvolvedCardsSection />
    </div>
  );
}
