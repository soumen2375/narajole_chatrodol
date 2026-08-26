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
        <h2 className="h-section text-site-ink">{title}</h2>
        <p className="body-text mt-3 max-w-xl">{subtitle}</p>
      </div>
      {linkTo && (
        <Link to={linkTo} className="btn-tertiary group gap-1.5">
          {linkText}
          <FaArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
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
    <section
      className="relative w-full overflow-hidden bg-site-green px-5 pb-16 pt-12 sm:px-8 md:pb-24 md:pt-16"
      style={{ borderRadius: '0 0 56px 56px' }}
    >
      <div className="mx-auto grid w-full max-w-site items-center gap-12 lg:grid-cols-[1.05fr_.95fr] lg:gap-16">
          <div>
            {/* Eyebrow Tagline */}
            <div className="inline-flex items-center gap-2 font-dmsans text-[13px] font-bold uppercase tracking-[0.18em] text-site-yellow">
              <span>— Unity • Education • Progress</span>
            </div>

            {/* Main Headline */}
            <h1 className="mt-5 font-archivo text-[clamp(40px,4.6vw,62px)] font-bold leading-[1.08] tracking-[-0.025em] text-white [text-wrap:balance]">
              {bn ? 'একসাথে, আমরা গড়ি এক সুন্দর আগামী।' : 'Together, we build a better tomorrow.'}
            </h1>

            {/* Subtitle */}
            <p className="mt-6 max-w-[470px] font-dmsans text-[16px] leading-[1.8] text-white/70">
              {bn
                ? 'শিক্ষা, স্বাস্থ্যসেবা, পরিবেশ এবং সামাজিক উন্নয়নের মাধ্যমে সমাজকে আরও শক্তিশালী ও আলোকিত করে তোলাই ছাত্রদলের মূল লক্ষ্য।'
                : 'Chhatradol SWO is dedicated to social welfare, education, healthcare, and community development for a stronger and brighter society.'}
            </p>

            {/* CTA Buttons */}
            <div className="mt-9 flex flex-col items-stretch gap-3.5 sm:flex-row sm:items-center sm:gap-4">
              <Link to="/donate" className="btn-yellow font-bengali">
                {bn ? 'দান করুন' : 'Donate Now'}
              </Link>
              <Link to="/events" className="btn-ghost-light font-bengali">
                {bn ? 'আমাদের কার্যক্রম ➔' : 'Explore Our Work ➔'}
              </Link>
            </div>
          </div>

          {/* Concentric-circle photo medallion:
              thin outline arc → sand ring → deeper sand ring → photo,
              with sand circles orbiting behind it. */}
          <div className="relative mx-auto flex aspect-square w-full max-w-[440px] items-center justify-center">
            {/* Orbiting sand circles */}
            <span
              aria-hidden="true"
              className="absolute right-[2%] top-[2%] h-[16%] w-[16%] rounded-full bg-site-sand-3 opacity-80"
            />
            <span
              aria-hidden="true"
              className="absolute bottom-[6%] right-[-2%] h-[19%] w-[19%] rounded-full bg-site-sand-3 opacity-70"
            />
            <span
              aria-hidden="true"
              className="absolute bottom-[10%] left-[-1%] h-[12%] w-[12%] rounded-full bg-site-sand-3 opacity-60"
            />

            {/* Thin outline arc */}
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-full border-2 border-site-sand/45"
            />
            <span
              aria-hidden="true"
              className="absolute inset-[5%] rounded-full border border-site-sand/30"
            />

            {/* Solid concentric rings + photo */}
            <div className="relative flex aspect-square w-[86%] rounded-full bg-site-sand p-[6%]">
              <div className="flex flex-1 rounded-full bg-site-sand-2 p-[5%]">
                <div className="flex-1 overflow-hidden rounded-full bg-[#eef4e7]">
                  <img
                    src="/assets/images/Chhatradol4.jpg"
                    alt="Chhatradol SWO Team"
                    className="h-full w-full rounded-full object-cover"
                    onError={onImgErr}
                  />
                </div>
              </div>
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
    <div className="relative z-10 mx-auto -mt-8 w-full max-w-[1340px] px-5 sm:px-8 md:-mt-12">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {values.map((v, i) => {
          const VIcon = v.icon;
          return (
            <div key={i} className="flex items-center gap-3.5 rounded-full border border-site-line bg-white px-6 py-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-site-cream text-site-green">
                <VIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-archivo text-[15px] font-bold text-site-ink">{v.title}</h3>
                <p className="truncate font-dmsans text-[12.5px] text-site-muted">{v.desc}</p>
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
      number: 5000,
      suffix: '+',
      label: bn ? 'জীবনের উন্নয়ন' : 'Lives Impacted',
      desc: bn
        ? 'আমাদের নানা সামাজিক উদ্যোগের মাধ্যমে ৫,০০০-এরও বেশি মানুষের জীবন স্পর্শ করেছি — শিক্ষা ও প্রয়োজনীয় সহায়তা থেকে শুরু করে মানবিক ও সমাজকল্যাণমূলক কর্মসূচি পর্যন্ত।'
        : 'More than 5,000 lives have been touched through our community initiatives, from education and essential support to humanitarian and social welfare programs.',
    },
    {
      number: 25,
      suffix: '+',
      label: bn ? 'শিক্ষা কর্মসূচি' : 'Education Programs',
      desc: bn
        ? '২৫টিরও বেশি শিক্ষাকেন্দ্রিক উদ্যোগের মাধ্যমে আমরা সুবিধাবঞ্চিত পরিবারের শিশু ও তরুণদের জন্য পড়াশোনাকে আরও সহজলভ্য, অর্থবহ ও ক্ষমতায়নমূলক করে তুলতে কাজ করি।'
        : 'Through 25+ education-focused initiatives, we work to make learning more accessible, meaningful, and empowering for children and young people from underserved communities.',
    },
    {
      number: 2000,
      suffix: '+',
      label: bn ? 'স্বেচ্ছাসেবকের ঘণ্টা' : 'Volunteer Hours',
      desc: bn
        ? '২,০০০-এরও বেশি স্বেচ্ছাসেবী ঘণ্টা সেই মানুষদের সময়, নিষ্ঠা ও সহমর্মিতার প্রতিচ্ছবি, যাঁরা নিজের সমাজের পাশে দাঁড়িয়ে অর্থবহ পরিবর্তন আনতে বেছে নিয়েছেন।'
        : 'Over 2,000 volunteer hours represent the time, dedication, and compassion of people who chose to stand with their communities and create meaningful change.',
    },
    {
      number: 47,
      suffix: '+',
      label: bn ? 'রক্তদান শিবির' : 'Blood Donation Camps',
      desc: bn
        ? '৪৭টিরও বেশি রক্তদান শিবিরের মাধ্যমে আমরা থ্যালাসেমিয়া আক্রান্ত শিশু ও নিয়মিত রক্ত সঞ্চালনের উপর নির্ভরশীল রোগীদের জন্য রক্তের নিরবচ্ছিন্ন সরবরাহ নিশ্চিত করতে সহায়তা করি।'
        : 'Through 47+ blood donation camps, we help ensure a steady supply of blood for thalassemia children and other patients who depend on regular transfusions to live and thrive.',
    },
  ];

  return (
    <section className="site-section">
      <div className="site-wrap max-w-[1340px]">
        <Reveal>
          <SectionHeader
            title={bn ? 'আমাদের কাজের প্রভাব' : 'Our Impact in Numbers'}
            subtitle={bn ? 'মানুষের জীবন পরিবর্তনই আমাদের প্রকৃত সাফল্য।' : 'Real people. Real change. Real impact.'}
            linkTo="/impacts"
            linkText={bn ? 'সকল প্রভাব দেখুন' : 'View all impact'}
          />
        </Reveal>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
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

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className="stat-capsule flex h-full flex-col items-center px-7 py-10"
    >
      <div className="font-archivo text-[32px] font-bold leading-none text-site-red">
        {lang === 'bn' ? `${count}${item.suffix}` : `${count}${item.suffix}`}
      </div>
      <p className="mt-3 font-archivo text-[16px] font-bold leading-tight text-site-ink">
        {item.label}
      </p>
      <p className="mt-3.5 font-dmsans text-[13px] leading-[1.75] text-site-muted">
        {item.desc}
      </p>
      <Link to="/impacts" className="read-more mt-5">READ MORE</Link>
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
      iconBg: 'bg-site-cream text-site-blood',
      img: '/assets/images/service/post-33-raktokotha-camp.jpg',
    },
    {
      title: bn ? 'শিক্ষা ও শিক্ষা সহায়তা' : 'Education & Learning',
      desc: bn
        ? 'দরিদ্র ও মেধাবী শিক্ষার্থীদের জন্য বিনামূল্যে শিক্ষা, পাঠ্যসামগ্রী ও দিকনির্দেশনা।'
        : 'Supporting students with study materials, guidance, and educational support programs.',
      icon: FaGraduationCap,
      iconBg: 'bg-site-cream text-site-green',
      img: '/assets/images/service/post-34-students-book-support.jpg',
    },
    {
      title: bn ? 'স্বাস্থ্য সেবা সহায়তা' : 'Healthcare Support',
      desc: bn
        ? 'বিনামূল্যে স্বাস্থ্য পরীক্ষা, বিশেষজ্ঞ ডাক্তারের পরামর্শ ও ঔষধ বিতরণ কর্মসূচি।'
        : 'Health check-ups, medical camps, and support for underprivileged communities.',
      icon: FaStethoscope,
      iconBg: 'bg-site-cream text-site-green',
      img: '/assets/images/service/post-15-mental-care-home.jpg',
    },
    {
      title: bn ? 'পরিবেশ সুরক্ষা উদ্যোগ' : 'Environment Initiative',
      desc: bn
        ? 'সবুজ বসুন্ধরা গড়তে বৃক্ষরোপণ, পরিচ্ছন্নতা অভিযান ও পরিবেশ সচেতনতা।'
        : 'Tree plantation, clean drives, and environment awareness for a greener future.',
      icon: FaLeaf,
      iconBg: 'bg-site-cream text-site-green',
      img: '/assets/images/service/tree_plantations.jpg',
    },
    {
      title: bn ? 'নারী ক্ষমতায়ন' : 'Women Empowerment',
      desc: bn
        ? 'স্বাবলম্বী হতে নারীদের আত্মনির্ভরশীলতা ও বৃত্তিমূলক প্রশিক্ষণ প্রদান।'
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
        ? 'প্রাকৃতিক দুর্যোগ ও দুঃসময়ে অসহায় মানুষদের খাদ্য ও বাসস্থান সহায়তা।'
        : 'Providing help during natural disasters and supporting needy families.',
      icon: FaHandHoldingHeart,
      iconBg: 'bg-site-cream text-site-green',
      img: '/assets/images/service/post-30-tarpaulin-distribution.jpg',
    },
    {
      title: bn ? 'সাংস্কৃতিক ও খেলাধুলা' : 'Cultural Activities',
      desc: bn
        ? 'ঐতিহ্য ও সাংস্কৃতিক বিকাশ রক্ষায় প্রতিযোগিতা ও মেধা বিকাশ অনুষ্ঠান।'
        : 'Promoting culture, sports, and social harmony through various events.',
      icon: FaMusic,
      iconBg: 'bg-site-cream text-site-green',
      img: '/assets/images/service/drawing.jpg',
    },
  ];

  return (
    <section className="site-section-b">
      <div className="site-wrap max-w-[1340px]">
        <Reveal>
          <SectionHeader
            title={bn ? 'আমাদের মূল কর্মসূচিসমূহ' : 'Our Key Programs'}
            subtitle={bn ? 'যে ক্ষেত্রগুলোতে আমরা সমাজ পরিবর্তনের কাজ করি।' : 'We work in areas that create the biggest impact.'}
            linkTo="/programs"
            linkText={bn ? 'সকল কর্মসূচি দেখুন' : 'View all programs'}
          />
        </Reveal>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {programs.map((prog, idx) => {
            const PIcon = prog.icon;
            return (
              <div key={idx} className="group soft-card flex flex-col p-7">
                {/* Thumbnail Image */}
                <div className="img-zoom relative aspect-[16/10] overflow-hidden rounded-[16px]">
                  <img
                    src={prog.img}
                    alt={prog.title}
                    className="h-full w-full object-cover"
                    onError={onImgErr}
                  />
                  <div className="absolute left-4 top-4">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${prog.iconBg}`}>
                      <PIcon className="h-5 w-5" />
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="flex flex-1 flex-col justify-between pt-6">
                  <div>
                    <h3 className="font-archivo text-[21px] font-bold leading-[1.25] text-site-ink">
                      {prog.title}
                    </h3>
                    <p className="mt-2.5 font-dmsans text-[14px] leading-[1.75] text-site-muted">
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
    <section className="site-section-b">
      <div className="site-wrap max-w-[1340px]">
        <div className="grid grid-cols-1 items-center gap-10 rounded-card bg-site-green p-8 text-white lg:grid-cols-12 lg:p-12">
          {/* Left Column: Image */}
          <div className="lg:col-span-5">
            <div className="img-zoom overflow-hidden rounded-panel">
              <img
                src="/assets/images/impacts/education2.jpg"
                alt="Education Mission"
                className="aspect-[4/3] w-full object-cover"
                onError={onImgErr}
              />
            </div>
          </div>

          {/* Middle Column: Text & Quote */}
          <div className="lg:col-span-4">
            <div className="eyebrow-light">
              • {bn ? 'আমাদের ভিশন' : 'OUR MISSION'}
            </div>
            <h2 className="h-section mt-4 text-white">
              {bn ? 'শিক্ষা: অন্ধকার থেকে আলোর দিকে' : 'Education: from darkness to light'}
            </h2>

            <div className="mt-5 flex items-start gap-3 rounded-soft border border-white/12 bg-white/5 p-5">
              <FaQuoteLeft className="h-6 w-6 flex-shrink-0 text-site-yellow opacity-80" />
              <p className="font-dmsans text-[14px] leading-[1.8] text-white/85">
                {bn
                  ? 'আমরা বিশ্বাস করি প্রতিটি শিশুই মানসম্পন্ন শিক্ষার অধিকারী এবং প্রতিটি মানুষ সুযোগ পাওয়ার যোগ্য।'
                  : 'We believe every child deserves quality education and every individual deserves an opportunity to build a better future.'}
              </p>
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/about" className="btn-yellow">
                {bn ? 'আমাদের ভিশন ➔' : 'Our Mission ➔'}
              </Link>
              <Link to="https://www.youtube.com/@Chhatradolswo" className="btn-ghost-light">
                <FaPlay className="h-3 w-3 text-site-yellow" />
                {bn ? 'ভিডিও দেখুন' : 'Watch Video'}
              </Link>
            </div>
          </div>

          {/* Right Column: 4 Feature Items */}
          <div className="space-y-3.5 lg:col-span-3">
            {missionPoints.map((pt, i) => {
              const IconComp = pt.icon;
              return (
                <div key={i} className="flex items-center gap-3.5 rounded-full border border-white/12 bg-white/5 p-3.5 transition-colors hover:bg-white/10">
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-site-yellow">
                    <IconComp className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <h4 className="font-archivo text-[14px] font-bold text-white">{pt.title}</h4>
                    <p className="font-dmsans text-[12px] text-white/70">{pt.desc}</p>
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
// Shared post list — the news strip and the blog cards read from the same source.
function useHomePosts() {
  const { posts: dbPosts } = usePosts();

  return useMemo(() => {
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
}

function LatestNewsSection() {
  const allPosts = useHomePosts();

  const currentPost = allPosts[0];
  const last5Posts = allPosts.slice(1, 6);

  return (
    <section className="site-section-b">
      <div className="site-wrap max-w-[1340px]">
        <Reveal>
          <SectionHeader
            title="Latest News & Events"
            subtitle="Stay updated with our latest activities and community initiatives."
            linkTo="/events"
            linkText="View all news"
          />
        </Reveal>

        <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
          {/* First Big Position: Current Post */}
          {currentPost && (
            <div className="flex flex-col lg:col-span-7">
              <Link
                to={`/events/${currentPost.slug || currentPost.id}`}
                className="group soft-card flex h-full flex-col overflow-hidden p-6 transition-colors hover:border-site-green/35 sm:p-7"
              >
                <div className="img-zoom relative aspect-[16/9] w-full flex-shrink-0 overflow-hidden rounded-[16px]">
                  <img
                    src={currentPost.img}
                    alt={currentPost.title}
                    className="h-full w-full object-cover"
                    onError={onImgErr}
                  />
                  <div className="absolute left-4 top-4 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-site-yellow px-3.5 py-1.5 font-dmsans text-[11px] font-bold text-site-ink">
                      Featured Event
                    </span>
                    <span className="rounded-full bg-site-green px-3.5 py-1.5 font-dmsans text-[11px] font-semibold text-white">
                      {currentPost.date}
                    </span>
                  </div>
                </div>

                <div className="flex flex-1 flex-col justify-between pt-6">
                  <div>
                    <div className="flex items-center gap-2 font-dmsans text-[11px] font-bold uppercase tracking-[0.14em] text-site-red">
                      <FaRegCalendarDays className="h-3.5 w-3.5" />
                      <span>{currentPost.cat} • Narajole</span>
                    </div>
                    <h3 className="mt-3 font-archivo text-[22px] font-bold leading-[1.25] text-site-ink sm:text-[26px]">
                      {currentPost.title}
                    </h3>
                    <p className="mt-3 line-clamp-3 font-dmsans text-[15px] leading-[1.8] text-site-muted">
                      {currentPost.desc}
                    </p>
                  </div>

                  <span className="btn-tertiary mt-6 gap-2 transition-transform group-hover:translate-x-1">
                    <span>Read full story</span>
                    <FaArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </Link>
            </div>
          )}

          {/* Right Column: Next 5 Posts */}
          <div className="flex h-full flex-col justify-between gap-3 lg:col-span-5">
            {last5Posts.map((item, idx) => (
              <Link
                key={item.id || idx}
                to={`/events/${item.slug || item.id}`}
                className="group soft-card-sm flex gap-4 p-3 transition-colors hover:border-site-green/35 sm:p-3.5"
              >
                <div className="img-zoom relative h-20 w-24 flex-shrink-0 overflow-hidden rounded-[20px] sm:h-24 sm:w-32">
                  <img
                    src={item.img}
                    alt={item.title}
                    className="absolute inset-0 h-full w-full object-cover"
                    onError={onImgErr}
                  />
                </div>

                <div className="flex min-w-0 flex-1 flex-col justify-center">
                  <div className="flex items-center justify-between gap-2">
                    <span className="chip-static truncate py-1 text-[10px] font-bold uppercase tracking-[0.1em]">
                      {item.cat}
                    </span>
                    <span className="shrink-0 font-dmsans text-[11px] font-medium text-site-faint">
                      {item.date}
                    </span>
                  </div>

                  <h4 className="mt-1.5 line-clamp-1 font-archivo text-[14px] font-bold leading-snug text-site-ink">
                    {item.title}
                  </h4>

                  <p className="mt-1 line-clamp-1 font-dmsans text-[12px] leading-relaxed text-site-muted">
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
    <section className="site-section-b">
      <div className="site-wrap max-w-[1340px]">
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
            <div key={idx} className="soft-card flex flex-col justify-between p-8">
              <div>
                <FaQuoteLeft className="h-7 w-7 text-site-yellow" />
                <p className="mt-5 font-dmsans text-[14.5px] leading-[1.8] text-site-soft">
                  "{t.quote}"
                </p>
              </div>

              <div className="mt-7 flex items-center gap-3.5 border-t border-site-line pt-5">
                <img
                  src={t.avatar}
                  alt={t.author}
                  className="h-12 w-12 rounded-full object-cover"
                  onError={onImgErr}
                />
                <div>
                  <h4 className="font-archivo text-[16px] font-bold text-site-ink">{t.author}</h4>
                  <span className="font-dmsans text-[12px] text-site-faint">{t.role}</span>
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
    <div className="site-wrap max-w-[1340px] pb-14 md:pb-20">
      <div className="rounded-panel bg-site-yellow p-8 md:p-[52px]">
        <div className="flex flex-col items-start justify-between gap-8 text-site-ink md:flex-row md:items-center">
          <div className="flex items-center gap-6">
            <span className="hidden h-16 w-16 items-center justify-center rounded-full bg-site-ink/10 sm:flex">
              <FaUserGroup className="h-7 w-7 text-site-ink" />
            </span>
            <div>
              <h2 className="font-archivo text-[clamp(26px,3vw,38px)] font-bold leading-[1.15] tracking-[-0.02em]">
                {bn ? 'পরিবর্তনের অংশ হোন' : 'Be Part of the Change'}
              </h2>
              <p className="mt-3 max-w-xl font-dmsans text-[15.5px] leading-[1.7] text-[#3b3413]">
                {bn
                  ? 'আপনার একটি ছোট সাহায্য কারো জীবনে বড় পরিবর্তন আনতে পারে।'
                  : 'Your small help can bring a big change in someone\'s life.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link to="/donate" className="btn-green">
              {bn ? 'দান করুন' : 'Donate Now'}
            </Link>
            <Link to="/volunteer" className="btn-ghost-dark">
              {bn ? 'আমাদের সাথে যুক্ত হোন' : 'Volunteer with Us'}
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
      iconBg: 'bg-site-cream text-site-green',
      title: bn ? 'অনলাইনে দান করুন' : 'Donate',
      desc: bn
        ? 'আপনার আর্থিক সহায়তা আমাদের মিশন পরিচালনা ও অসহায় মানুষের পাশে দাঁড়াতে সাহায্য করে।'
        : 'Your donation helps us continue our mission and support more people in need.',
      linkText: bn ? 'দান করুন ➔' : 'Donate Now ➔',
      to: '/donate',
    },
    {
      icon: FaUserGroup,
      iconBg: 'bg-site-cream text-site-green',
      title: bn ? 'স্বেচ্ছাসেবক হোন' : 'Volunteer',
      desc: bn
        ? 'আমাদের মেধা ও সময় দিয়ে সমাজে প্রত্যক্ষ প্রভাব ফেলতে দলে যোগ দিন।'
        : 'Join our team of volunteers and make a direct impact in your community.',
      linkText: bn ? 'যুক্ত হোন ➔' : 'Join Us ➔',
      to: '/volunteer',
    },
    {
      icon: FaHandshake,
      iconBg: 'bg-site-cream text-site-green',
      title: bn ? 'অংশীদার হোন' : 'Partner With Us',
      desc: bn
        ? 'প্রতিষ্ঠান ও সংস্থার সাথে যৌথভাবে সমাজে দীর্ঘমেয়াদী কাজ গড়ে তুলুন।'
        : 'Partner with organizations and help us reach more communities.',
      linkText: bn ? 'যোগাযোগ করুন ➔' : 'Partner With Us ➔',
      to: '/contact',
    },
  ];

  return (
    <section className="site-section-b">
      <div className="site-wrap max-w-[1340px]">
        <Reveal>
          <div className="mb-10 text-left">
            <h2 className="h-section text-site-ink">
              {bn ? 'অংশগ্রহণ করুন' : 'Get Involved'}
            </h2>
            <p className="body-text mt-3 max-w-xl">
              {bn ? 'আমাদের কাজে সহযাত্রী হওয়ার বিভিন্ন উপায় রয়েছে।' : 'There are many ways you can contribute.'}
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {cards.map((c, idx) => {
            const CIcon = c.icon;
            return (
              <div key={idx} className="soft-card flex flex-col justify-between p-8">
                <div>
                  <span className={`inline-flex h-12 w-12 items-center justify-center rounded-full ${c.iconBg}`}>
                    <CIcon className="h-5 w-5" />
                  </span>
                  <h3 className="h-card mt-5 text-site-ink">
                    {c.title}
                  </h3>
                  <p className="mt-3 font-dmsans text-[14px] leading-[1.75] text-site-muted">
                    {c.desc}
                  </p>
                </div>

                <Link to={c.to} className="btn-tertiary mt-7">
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

// ─────────────────── 10. OUR RECENT BLOGS ───────────────────
function RecentBlogsSection() {
  const posts = useHomePosts();
  const blogs = posts.slice(0, 3);

  if (blogs.length === 0) return null;

  return (
    <section className="site-section-b">
      <div className="site-wrap max-w-[1340px]">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <div className="eyebrow">Our Blogs</div>
            <h2 className="h-section mt-3 text-site-ink">Our Recent Blogs</h2>
          </div>
        </Reveal>

        <div className="mx-auto mt-11 grid max-w-[1120px] grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {blogs.map((b, idx) => (
            <article key={b.id || idx} className="group soft-card-sm flex flex-col overflow-hidden">
              <div className="img-zoom aspect-[16/10] w-full overflow-hidden">
                <img
                  src={b.img}
                  alt={b.title}
                  loading="lazy"
                  className="h-full w-full object-cover"
                  onError={onImgErr}
                />
              </div>

              <div className="flex flex-1 flex-col items-center p-6 text-center">
                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 font-dmsans text-[11px] text-site-faint">
                  <span>Admin</span>
                  <span>{b.date}</span>
                  <span>{b.cat}</span>
                </div>

                <h3 className="mt-3.5 font-archivo text-[17px] font-bold leading-[1.3] text-site-ink">
                  {b.title}
                </h3>
                <p className="mt-2.5 line-clamp-3 font-dmsans text-[13px] leading-[1.75] text-site-muted">
                  {b.desc}
                </p>

                <Link
                  to={`/events/${b.slug || b.id}`}
                  className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-full bg-site-green px-7 font-dmsans text-[12.5px] font-bold text-white transition-colors hover:bg-site-green-2"
                >
                  Read More
                </Link>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link to="/events" className="btn-ghost-dark">
            View all posts
            <FaArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ════════════════════════════════════════════════════════════════════
export default function Home() {
  useSEO(SEO['/']);

  return (
    <div className="min-h-screen bg-site-cream font-dmsans">
      <Hero />
      <CoreValuesBar />
      <ImpactSection />
      <KeyProgramsSection />
      <MissionSpotlight />
      <LatestNewsSection />
      <TestimonialsSection />
      <CtaBannerSection />
      <GetInvolvedCardsSection />
      <RecentBlogsSection />
    </div>
  );
}
