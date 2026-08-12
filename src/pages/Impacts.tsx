import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useT } from '@/i18n';
import {
  PageShell, Reveal, SERIF_BN, SERIF_EN,
} from './_field-journal';
import {
  SUCCESS_STORIES,
  FOCUS_AREAS_DATA,
  YEARLY_IMPACT_DATA,
  LOCATION_NODES_DATA,
  SuccessStory,
} from '@/data/content';
import {
  FaHeart,
  FaUsers,
  FaGraduationCap,
  FaStethoscope,
  FaTree,
  FaBox,
  FaQuoteLeft,
  FaArrowRight,
  FaLocationDot,
  FaXmark,
  FaChevronRight,
  FaChartLine,
  FaBuilding,
  FaMagnifyingGlass,
  FaCircleCheck,
} from 'react-icons/fa6';

// ════════════════════════════════════════════════════════════════════
//  Enhanced Impacts — আমাদের প্রভাব (Redesigned UI)
// ════════════════════════════════════════════════════════════════════

// Animated Counter Hook
function useCountUp(target: number, duration: number = 1800, startOnView: boolean = true) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const [hasAnimated, setHasAnimated] = useState(!startOnView);

  useEffect(() => {
    if (!startOnView) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasAnimated(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [startOnView]);

  useEffect(() => {
    if (!hasAnimated) return;
    let startTime: number | null = null;
    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // Easing: easeOutExpo
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(Math.floor(easeProgress * target));

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      }
    };

    animationFrameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrameId);
  }, [target, duration, hasAnimated]);

  return { count, ref };
}

// Torn Paper Bottom Edge Divider
const TornPaperEdge = ({ className = "text-[#faf6ef]" }: { className?: string }) => (
  <div className={`relative w-full overflow-hidden leading-none select-none pointer-events-none -mb-1 ${className}`}>
    <svg viewBox="0 0 1440 48" className="w-full h-8 md:h-12 fill-current" preserveAspectRatio="none">
      <path d="M0,0 C150,28 350,-10 500,24 C650,50 850,5 1050,30 C1200,48 1350,15 1440,26 L1440,48 L0,48 Z"></path>
    </svg>
  </div>
);

// Leaf Branch SVG Line-art Watermark/Ornament
const LeafOrnament = ({ className = "w-16 h-16 text-emerald-700/30" }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M50,90 Q50,50 85,20" />
    <path d="M50,75 C65,70 75,55 75,55 C60,58 50,75 50,75 Z" fill="currentColor" opacity="0.15" />
    <path d="M50,55 C65,50 78,35 78,35 C63,38 50,55 50,55 Z" fill="currentColor" opacity="0.15" />
    <path d="M50,65 C35,60 25,45 25,45 C40,48 50,65 50,65 Z" fill="currentColor" opacity="0.15" />
    <path d="M50,45 C35,40 22,25 22,25 C37,28 50,45 50,45 Z" fill="currentColor" opacity="0.15" />
  </svg>
);

// Brush Highlight Underline SVG
const BrushUnderline = ({ className = "w-full text-amber-500/80" }: { className?: string }) => (
  <svg viewBox="0 0 240 16" className={`h-3 ${className}`} preserveAspectRatio="none" fill="currentColor">
    <path d="M 5,10 Q 60,3 120,9 T 235,6 C 180,14 100,12 5,10 Z" />
  </svg>
);

export default function Impacts() {
  const { lang } = useT();
  const bn = lang === 'bn';

  // Active Story Modal state
  const [selectedStory, setSelectedStory] = useState<SuccessStory | null>(null);
  // Locations Modal state
  const [showLocationsModal, setShowLocationsModal] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');

  // Selected year for interactive analytics chart
  const [selectedYear, setSelectedYear] = useState('2024');

  // Animated metric counters
  const c1 = useCountUp(12450);
  const c2 = useCountUp(2835);
  const c3 = useCountUp(8945);
  const c4 = useCountUp(18);

  const activeYearData = YEARLY_IMPACT_DATA.find((d) => d.year === selectedYear) || YEARLY_IMPACT_DATA[YEARLY_IMPACT_DATA.length - 1];

  const filteredLocations = LOCATION_NODES_DATA.filter(
    (loc) =>
      loc.name[lang].toLowerCase().includes(locationSearch.toLowerCase()) ||
      loc.district[lang].toLowerCase().includes(locationSearch.toLowerCase())
  );

  return (
    <PageShell>
      {/* ─────────────────── 1. HERO SECTION ─────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#faf6ef] via-[#f7f0e6] to-[#efe5d5] pt-10 md:pt-16 pb-0">
        {/* Background Subtle Leaf Watermark */}
        <div className="absolute top-10 right-10 pointer-events-none opacity-20 hidden lg:block">
          <LeafOrnament className="w-96 h-96 text-emerald-800" />
        </div>

        <div className="mx-auto max-w-[1320px] px-6 md:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Content Column */}
            <div className="lg:col-span-7 pt-4 pb-10 md:pb-16 z-10">
              <Reveal direction="up" delay={50}>
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-100/80 border border-amber-300/60 text-amber-900 font-mono text-[11px] uppercase tracking-[0.2em] font-semibold mb-6">
                  <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse"></span>
                  {bn ? 'আমাদের প্রভাব' : 'OUR IMPACT'}
                </div>
              </Reveal>

              <Reveal direction="up" delay={120}>
                <h1
                  className="font-bengali text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.15] text-stone-900"
                  style={bn ? SERIF_BN : SERIF_EN}
                >
                  {bn ? (
                    <>
                      তৈরি করছি <span className="text-[#c2410c] relative inline-block">বাস্তব পরিবর্তন।<BrushUnderline className="absolute left-0 bottom-[-4px] text-amber-500/70" /></span><br />
                      রূপান্তর করছি <span className="text-[#c2410c]">জীবন।</span>
                    </>
                  ) : (
                    <>
                      Creating <span className="text-[#c2410c] relative inline-block">Real Change.<BrushUnderline className="absolute left-0 bottom-[-4px] text-amber-500/70" /></span><br />
                      Transforming <span className="text-[#c2410c]">Lives.</span>
                    </>
                  )}
                </h1>
              </Reveal>

              <Reveal direction="up" delay={200}>
                <p className="mt-6 max-w-xl font-bengali text-base sm:text-lg text-stone-700 leading-relaxed">
                  {bn
                    ? 'প্রতিটি পদক্ষেপ, প্রতিটি দান এবং প্রতিটি উদ্যোগ পরিবর্তনের সুদূরপ্রসারী বার্তা বহন করে। আমাদের একসাথে অর্জিত প্রভাবের বিবরণ নিচে উপস্থাপন করা হলো।'
                    : 'Every initiative, every contribution, and every effort creates a ripple of change. Here’s the impact we have made together.'}
                </p>
              </Reveal>

              <Reveal direction="up" delay={280}>
                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <Link
                    to="/volunteer"
                    className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-full bg-[#15803d] hover:bg-[#166534] text-white font-medium text-sm transition-all duration-300 shadow-md hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <FaHeart className="w-4 h-4 text-emerald-200 animate-pulse" />
                    <span>{bn ? 'পরিবর্তনের অংশ হন' : 'Be a Part of Change'}</span>
                  </Link>

                  <Link
                    to="/donate"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full border border-stone-400/80 hover:border-stone-800 text-stone-800 hover:bg-stone-900 hover:text-white font-medium text-sm transition-all duration-300"
                  >
                    <span>{bn ? 'অনুদানের বিবরণ' : 'Donate & Support'}</span>
                    <FaArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </Reveal>
            </div>

            {/* Right Hero Image Column */}
            <div className="lg:col-span-5 relative z-10">
              <Reveal direction="left" delay={150}>
                <div className="relative mx-auto max-w-md lg:max-w-none">
                  {/* Outer decorative ring */}
                  <div className="absolute -inset-3 rounded-3xl bg-gradient-to-tr from-amber-200/50 via-emerald-200/40 to-amber-100/30 blur-lg opacity-70 transform rotate-1"></div>

                  <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-white bg-white group">
                    <img
                      src="/assets/images/school_girl_mockup.png"
                      alt={bn ? 'ছাত্রী আনন্দদায়ক মুহূর্ত' : 'Smiling student with books'}
                      className="w-full h-[380px] sm:h-[440px] object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
                      onError={(e) => {
                        e.currentTarget.src = '/assets/images/Chhatradol.jpg';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-900/60 via-transparent to-transparent"></div>

                    {/* Bottom floating badge on image */}
                    <div className="absolute bottom-4 left-4 right-4 p-4 rounded-xl bg-white/95 backdrop-blur-md border border-white/50 shadow-lg flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                        <FaGraduationCap className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                          {bn ? 'শিক্ষা সহায়তা প্রকল্প' : 'Education First Initiative'}
                        </div>
                        <div className="text-sm font-bold text-stone-900">
                          {bn ? '৫০০+ শিশুর ভবিষ্যৎ গড়া হচ্ছে' : 'Empowering 500+ young minds'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </div>

        {/* Organic Torn Paper Edge Transition */}
        <TornPaperEdge className="text-white mt-12 md:mt-16" />
      </section>

      {/* ─────────────────── 2. OUR IMPACT AT A GLANCE ─────────────────── */}
      <section className="bg-white py-16 md:py-24 relative">
        <div className="mx-auto max-w-[1320px] px-6 md:px-10">
          <div className="text-center relative max-w-2xl mx-auto mb-16">
            <Reveal direction="up" delay={50}>
              <div className="flex items-center justify-center gap-2 mb-2">
                <LeafOrnament className="w-8 h-8 text-emerald-600/60" />
                <h2
                  className="font-bengali text-3xl sm:text-4xl font-bold text-stone-900 tracking-tight"
                  style={bn ? SERIF_BN : SERIF_EN}
                >
                  {bn ? 'একনজরে আমাদের প্রভাব' : 'Our Impact at a Glance'}
                </h2>
                <LeafOrnament className="w-8 h-8 text-emerald-600/60 transform scale-x-[-1]" />
              </div>
              <p className="font-bengali text-stone-600 text-sm sm:text-base">
                {bn
                  ? 'স্বচ্ছতা ও নিষ্ঠার সাথে সমাজে আমরা যে দীর্ঘস্থায়ী ইতিবাচক ফলাফল তৈরি করেছি।'
                  : 'Quantifiable progress achieved through dedicated community drives.'}
              </p>
            </Reveal>
          </div>

          {/* 4 Stat Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {/* Stat 1: Lives Impacted */}
            <Reveal direction="up" delay={100}>
              <div className="relative p-7 rounded-2xl bg-stone-50 border border-stone-200/80 hover:border-emerald-500/40 hover:bg-white transition-all duration-300 shadow-sm hover:shadow-xl group">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <FaUsers className="w-7 h-7" />
                </div>
                <div className="font-bengali text-4xl sm:text-5xl font-bold text-stone-900 tracking-tight" style={SERIF_EN}>
                  <span ref={c1.ref}>{c1.count.toLocaleString()}</span>+
                </div>
                <div className="mt-2 font-bengali text-base font-semibold text-stone-800">
                  {bn ? 'প্রভাবিত জীবন' : 'Lives Impacted'}
                </div>
                <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200/60 text-emerald-700 text-xs font-medium">
                  <span>▲ 18.7%</span>
                  <span className="text-stone-500">{bn ? 'গত বছরের তুলনায়' : 'from last year'}</span>
                </div>
              </div>
            </Reveal>

            {/* Stat 2: Students Supported */}
            <Reveal direction="up" delay={180}>
              <div className="relative p-7 rounded-2xl bg-stone-50 border border-stone-200/80 hover:border-amber-500/40 hover:bg-white transition-all duration-300 shadow-sm hover:shadow-xl group">
                <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <FaGraduationCap className="w-7 h-7" />
                </div>
                <div className="font-bengali text-4xl sm:text-5xl font-bold text-stone-900 tracking-tight" style={SERIF_EN}>
                  <span ref={c2.ref}>{c2.count.toLocaleString()}</span>
                </div>
                <div className="mt-2 font-bengali text-base font-semibold text-stone-800">
                  {bn ? 'সমর্থিত শিক্ষার্থী' : 'Students Supported'}
                </div>
                <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200/60 text-amber-800 text-xs font-medium">
                  <span>▲ 21.4%</span>
                  <span className="text-stone-500">{bn ? 'গত বছরের তুলনায়' : 'from last year'}</span>
                </div>
              </div>
            </Reveal>

            {/* Stat 3: Health Beneficiaries */}
            <Reveal direction="up" delay={260}>
              <div className="relative p-7 rounded-2xl bg-stone-50 border border-stone-200/80 hover:border-purple-500/40 hover:bg-white transition-all duration-300 shadow-sm hover:shadow-xl group">
                <div className="w-14 h-14 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <FaStethoscope className="w-7 h-7" />
                </div>
                <div className="font-bengali text-4xl sm:text-5xl font-bold text-stone-900 tracking-tight" style={SERIF_EN}>
                  <span ref={c3.ref}>{c3.count.toLocaleString()}</span>
                </div>
                <div className="mt-2 font-bengali text-base font-semibold text-stone-800">
                  {bn ? 'স্বাস্থ্য সুবিধাভোগী' : 'Health Beneficiaries'}
                </div>
                <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-50 border border-purple-200/60 text-purple-700 text-xs font-medium">
                  <span>▲ 16.2%</span>
                  <span className="text-stone-500">{bn ? 'গত বছরের তুলনায়' : 'from last year'}</span>
                </div>
              </div>
            </Reveal>

            {/* Stat 4: Communities Reached */}
            <Reveal direction="up" delay={340}>
              <div className="relative p-7 rounded-2xl bg-stone-50 border border-stone-200/80 hover:border-emerald-500/40 hover:bg-white transition-all duration-300 shadow-sm hover:shadow-xl group">
                <div className="w-14 h-14 rounded-full bg-emerald-100/70 text-emerald-800 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <FaTree className="w-7 h-7" />
                </div>
                <div className="font-bengali text-4xl sm:text-5xl font-bold text-stone-900 tracking-tight" style={SERIF_EN}>
                  <span ref={c4.ref}>{c4.count}</span>
                </div>
                <div className="mt-2 font-bengali text-base font-semibold text-stone-800">
                  {bn ? 'সংযুক্ত সম্প্রদায়' : 'Communities Reached'}
                </div>
                <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200/60 text-emerald-700 text-xs font-medium">
                  <span>▲ 12.5%</span>
                  <span className="text-stone-500">{bn ? 'গত বছরের তুলনায়' : 'from last year'}</span>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ─────────────────── 3. OUR FOCUS AREAS ─────────────────── */}
      <section className="bg-[#faf6ef] py-16 md:py-24 border-t border-b border-stone-200/70 relative">
        <div className="mx-auto max-w-[1320px] px-6 md:px-10">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <Reveal direction="up" delay={50}>
              <h2
                className="font-bengali text-3xl sm:text-4xl font-bold text-stone-900 tracking-tight relative inline-block"
                style={bn ? SERIF_BN : SERIF_EN}
              >
                {bn ? 'আমাদের ফোকাস ক্ষেত্রসমূহ' : 'Our Focus Areas'}
                <BrushUnderline className="absolute left-0 bottom-[-6px] text-amber-500" />
              </h2>
              <p className="mt-4 font-bengali text-stone-600 text-sm sm:text-base">
                {bn
                  ? 'টেকসই ও দীর্ঘস্থায়ী উন্নয়নের লক্ষ্যে আমরা প্রধান ৫টি গুরুত্বপূর্ণ ক্ষেত্র পরিচালনা করি।'
                  : 'We work in key areas to bring sustainable change across vulnerable regions.'}
              </p>
            </Reveal>
          </div>

          {/* 5 Focus Area Cards Horizontal Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-5">
            {FOCUS_AREAS_DATA.map((area, idx) => {
              const iconMap: Record<string, React.ReactNode> = {
                Grad: <FaGraduationCap className="w-5 h-5 text-emerald-700" />,
                Stetho: <FaStethoscope className="w-5 h-5 text-amber-700" />,
                Package: <FaBox className="w-5 h-5 text-emerald-800" />,
                Users: <FaUsers className="w-5 h-5 text-blue-700" />,
                Tree: <FaTree className="w-5 h-5 text-green-700" />,
              };

              return (
                <Reveal key={area.id} direction="up" delay={80 * idx}>
                  <div className="h-full p-6 rounded-2xl bg-white border border-stone-200/90 hover:border-emerald-500/50 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between group">
                    <div>
                      {/* Top icon and title */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          {iconMap[area.iconName] || <FaBox className="w-5 h-5" />}
                        </div>
                        <h3 className="font-bengali font-bold text-stone-900 text-base" style={bn ? SERIF_BN : SERIF_EN}>
                          {area.title[lang]}
                        </h3>
                      </div>

                      {/* Percentage Stat */}
                      <div className="font-bengali text-3xl font-extrabold text-stone-900 my-2" style={SERIF_EN}>
                        {area.percentage}%
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-2.5 rounded-full bg-stone-100 overflow-hidden mb-4 border border-stone-200/60">
                        <div
                          className="h-full rounded-full transition-all duration-1000 ease-out"
                          style={{
                            width: `${area.percentage}%`,
                            backgroundColor: area.color,
                          }}
                        ></div>
                      </div>

                      {/* Description */}
                      <p className="font-bengali text-xs text-stone-600 leading-relaxed">
                        {area.description[lang]}
                      </p>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─────────────────── 4. REAL IMPACT. REAL STORIES. ─────────────────── */}
      <section className="bg-white py-16 md:py-24">
        <div className="mx-auto max-w-[1320px] px-6 md:px-10">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <Reveal direction="up" delay={50}>
              <h2
                className="font-bengali text-3xl sm:text-4xl font-bold text-stone-900 tracking-tight"
                style={bn ? SERIF_BN : SERIF_EN}
              >
                {bn ? (
                  <>
                    প্রকৃত <span className="relative inline-block">প্রভাব।<BrushUnderline className="absolute left-0 bottom-[-4px] text-amber-500" /></span> বাস্তব <span className="relative inline-block">গল্প।<BrushUnderline className="absolute left-0 bottom-[-4px] text-amber-500" /></span>
                  </>
                ) : (
                  <>
                    Real <span className="relative inline-block">Impact.<BrushUnderline className="absolute left-0 bottom-[-4px] text-amber-500" /></span> Real <span className="relative inline-block">Stories.<BrushUnderline className="absolute left-0 bottom-[-4px] text-amber-500" /></span>
                  </>
                )}
              </h2>
              <p className="mt-4 font-bengali text-stone-600 text-sm sm:text-base">
                {bn
                  ? 'আমাদের পরিচালিত গ্রাম ও শহর কেন্দ্রিক কর্মসূচির মাধ্যমে রূপান্তরিত মানুষের বাস্তব জীবনের গল্প।'
                  : 'Stories of change from the communities we serve.'}
              </p>
            </Reveal>
          </div>

          {/* 2 Stories Side by Side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
            {SUCCESS_STORIES.map((story, idx) => (
              <Reveal key={story.id || idx} direction="up" delay={120 * idx}>
                <div className="rounded-2xl border border-stone-200/90 bg-stone-50/60 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col md:flex-row group">
                  <div className="md:w-5/12 relative overflow-hidden h-60 md:h-auto shrink-0">
                    <img
                      src={story.img}
                      alt={story.title[lang]}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      onError={(e) => {
                        e.currentTarget.src = '/assets/images/Chhatradol.jpg';
                      }}
                    />
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-stone-900/80 backdrop-blur-md text-white text-[11px] font-medium tracking-wide">
                      {story.category?.[lang] || (bn ? 'সাফল্যের গল্প' : 'Story')}
                    </div>
                  </div>

                  <div className="p-6 md:p-8 md:w-7/12 flex flex-col justify-between bg-white">
                    <div>
                      <FaQuoteLeft className="w-8 h-8 text-amber-500/40 mb-3" />
                      <p className="font-bengali text-stone-800 text-base font-medium italic leading-relaxed">
                        "{story.quote ? story.quote[lang] : story.summary[lang]}"
                      </p>
                      <div className="mt-4 font-bengali text-xs font-semibold text-stone-500">
                        {story.author?.[lang] || ''}
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between">
                      <button
                        onClick={() => setSelectedStory(story)}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#c2410c] hover:text-amber-700 transition-colors"
                      >
                        <span>{bn ? 'সম্পূর্ণ পড়ুন' : 'Read More'}</span>
                        <FaArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────── 5. INTERACTIVE ANALYTICS & LOCATION MAP ─────────────────── */}
      <section className="bg-[#faf6ef] py-16 md:py-24 border-t border-stone-200/80">
        <div className="mx-auto max-w-[1320px] px-6 md:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Left Column: Our Impact Over the Years */}
            <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-2xl border border-stone-200/90 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                  <div>
                    <h3
                      className="font-bengali text-2xl font-bold text-stone-900"
                      style={bn ? SERIF_BN : SERIF_EN}
                    >
                      {bn ? 'বছরের সাথে প্রভাব বৃদ্ধি' : 'Our Impact Over the Years'}
                    </h3>
                    <p className="text-xs text-stone-500 font-bengali mt-1">
                      {bn ? '২০২০ থেকে ২০২৪ সাল পর্যন্ত জীবনের সুরক্ষা হার' : 'Growth of beneficiaries from 2020 to 2024'}
                    </p>
                  </div>

                  {/* Year selector buttons */}
                  <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg">
                    {YEARLY_IMPACT_DATA.map((d) => (
                      <button
                        key={d.year}
                        onClick={() => setSelectedYear(d.year)}
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                          selectedYear === d.year
                            ? 'bg-emerald-700 text-white shadow-sm'
                            : 'text-stone-600 hover:text-stone-900'
                        }`}
                      >
                        {d.year}
                      </button>
                    ))}
                  </div>
                </div>

                {/* SVG Line & Area Chart */}
                <div className="relative pt-6 pb-2">
                  {/* Floating Tooltip Callout */}
                  <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-700 text-white text-xs font-bold shadow-md animate-bounce">
                    <FaChartLine className="w-3.5 h-3.5 text-emerald-200" />
                    <span>{activeYearData.displayLives} {bn ? 'জন প্রভাবিত' : 'Lives Impacted'}</span>
                    <span className="text-emerald-200 font-normal">({activeYearData.year})</span>
                  </div>

                  <div className="w-full h-56 sm:h-64 relative">
                    <svg viewBox="0 0 500 180" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="impactGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#059669" stopOpacity="0.35" />
                          <stop offset="100%" stopColor="#059669" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Grid Lines */}
                      <line x1="0" y1="30" x2="500" y2="30" stroke="#f3f4f6" strokeWidth="1" strokeDasharray="4" />
                      <line x1="0" y1="75" x2="500" y2="75" stroke="#f3f4f6" strokeWidth="1" strokeDasharray="4" />
                      <line x1="0" y1="120" x2="500" y2="120" stroke="#f3f4f6" strokeWidth="1" strokeDasharray="4" />

                      {/* Area Fill */}
                      <path
                        d="M 20,140 L 130,115 L 240,85 L 350,55 L 470,20 L 470,160 L 20,160 Z"
                        fill="url(#impactGradient)"
                      />

                      {/* Trend Line */}
                      <path
                        d="M 20,140 L 130,115 L 240,85 L 350,55 L 470,20"
                        fill="none"
                        stroke="#059669"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* Interactive Nodes */}
                      {[
                        { year: '2020', cx: 20, cy: 140 },
                        { year: '2021', cx: 130, cy: 115 },
                        { year: '2022', cx: 240, cy: 85 },
                        { year: '2023', cx: 350, cy: 55 },
                        { year: '2024', cx: 470, cy: 20 },
                      ].map((node) => (
                        <g
                          key={node.year}
                          onClick={() => setSelectedYear(node.year)}
                          className="cursor-pointer group"
                        >
                          <circle
                            cx={node.cx}
                            cy={node.cy}
                            r={selectedYear === node.year ? 7 : 5}
                            className={
                              selectedYear === node.year
                                ? 'fill-emerald-700 stroke-white stroke-2'
                                : 'fill-white stroke-emerald-600 stroke-2 group-hover:r-7 transition-all'
                            }
                          />
                        </g>
                      ))}
                    </svg>

                    {/* X-Axis Labels */}
                    <div className="flex justify-between text-xs font-semibold text-stone-500 mt-2 px-2">
                      <span>2020</span>
                      <span>2021</span>
                      <span>2022</span>
                      <span>2023</span>
                      <span>2024</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
                <span>{bn ? 'নিয়মিত আপডেট নিশ্চিতকৃত' : 'Data verified annually'}</span>
                <span className="text-emerald-700 font-semibold">{bn ? 'উৎসা: ক্ষেত্রীয় নিরীক্ষা' : 'Source: Field Surveys'}</span>
              </div>
            </div>

            {/* Right Column: Where We Work (Interactive Map Visual) */}
            <div className="lg:col-span-5 bg-white p-6 sm:p-8 rounded-2xl border border-stone-200/90 shadow-sm flex flex-col justify-between">
              <div>
                <h3
                  className="font-bengali text-2xl font-bold text-stone-900 mb-1"
                  style={bn ? SERIF_BN : SERIF_EN}
                >
                  {bn ? 'আমাদের কর্মক্ষেত্র' : 'Where We Work'}
                </h3>
                <p className="text-xs text-stone-500 font-bengali mb-6">
                  {bn ? 'পশ্চিম মেদিনীপুর ও সন্নিহিত অঞ্চলের বিস্তৃত মানচিত্র' : 'Active regional coverage across Medinipur'}
                </p>

                {/* Map Graphic Visualization */}
                <div className="relative w-full h-48 sm:h-52 rounded-xl bg-emerald-50/60 border border-emerald-100 overflow-hidden flex items-center justify-center p-4">
                  {/* Subtle Map Outline Vector SVG */}
                  <svg viewBox="0 0 200 120" className="w-full h-full text-emerald-200 fill-current opacity-70">
                    <path d="M20,30 Q40,10 80,25 T140,20 Q180,40 160,80 T100,105 Q40,95 20,60 Z" />
                  </svg>

                  {/* Pulsing Pin Markers */}
                  <div className="absolute top-1/3 left-1/3 group cursor-pointer" title="NaRaJol Central">
                    <span className="relative flex h-5 w-5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-5 w-5 bg-emerald-700 text-white items-center justify-center text-[9px] font-bold">📍</span>
                    </span>
                  </div>

                  <div className="absolute top-1/2 left-1/2 group cursor-pointer" title="Daspur">
                    <span className="relative flex h-4 w-4">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-600 text-white items-center justify-center text-[8px]">📍</span>
                    </span>
                  </div>

                  <div className="absolute bottom-1/3 right-1/3 group cursor-pointer" title="Ghatal">
                    <span className="relative flex h-4 w-4">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-600 text-white items-center justify-center text-[8px]">📍</span>
                    </span>
                  </div>
                </div>

                {/* Regional Stats Badge Row */}
                <div className="mt-6 grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/70">
                    <div className="text-xl font-bold text-stone-900" style={SERIF_EN}>18</div>
                    <div className="text-[11px] font-bengali text-stone-600">{bn ? 'সম্পূর্ণ গ্রাম' : 'Communities'}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/70">
                    <div className="text-xl font-bold text-stone-900" style={SERIF_EN}>4</div>
                    <div className="text-[11px] font-bengali text-stone-600">{bn ? 'জেলা অঞ্চল' : 'Districts'}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/70">
                    <div className="text-xl font-bold text-stone-900" style={SERIF_EN}>2</div>
                    <div className="text-[11px] font-bengali text-stone-600">{bn ? 'রাজ্য সীমা' : 'States'}</div>
                  </div>
                </div>
              </div>

              {/* View All Locations Modal Trigger */}
              <button
                onClick={() => setShowLocationsModal(true)}
                className="mt-6 w-full py-3 rounded-xl border border-stone-300 hover:border-stone-800 text-stone-800 font-semibold text-xs transition-colors flex items-center justify-center gap-2"
              >
                <span>{bn ? 'সকল অবস্থান দেখুন' : 'View All Locations'}</span>
                <FaChevronRight className="w-3 h-3 text-stone-500" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────── 6. COMMUNITY TESTIMONIAL & PARTNER BADGES ─────────────────── */}
      <section className="bg-white py-14 border-b border-stone-200/80">
        <div className="mx-auto max-w-[1320px] px-6 md:px-10">
          <div className="p-8 sm:p-10 rounded-3xl bg-[#faf6ef] border border-amber-200/60 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Quote block */}
            <div className="lg:col-span-7 flex gap-4">
              <FaQuoteLeft className="w-10 h-10 text-amber-500/50 shrink-0 mt-1" />
              <div>
                <p className="font-bengali text-stone-800 text-base sm:text-lg font-medium leading-relaxed italic">
                  {bn
                    ? '"ছাত্রদল মানুষের জীবনে সত্যিকারের ইতিবাচক প্রভাব ফেলছে। তাদের নিষ্ঠা ও স্বচ্ছতা আস্থা ও আশার বার্তা যোগায়।"'
                    : '"Chhatradol is making a genuine difference in people\'s lives. Their dedication and transparency inspire trust and hope."'
                  }
                </p>
                <div className="mt-3 font-bengali text-xs font-bold text-amber-800">
                  — {bn ? 'স্থানীয় গ্রামীণ সদস্য' : 'Local Community Member'}
                </div>
              </div>
            </div>

            {/* Right Partner Badges */}
            <div className="lg:col-span-5 flex flex-wrap items-center justify-start lg:justify-end gap-6 border-t lg:border-t-0 lg:border-l border-amber-200/80 pt-6 lg:pt-0 lg:pl-8">
              <div className="flex items-center gap-2 text-stone-700 font-bold text-sm bg-white px-4 py-2 rounded-xl border border-stone-200 shadow-sm">
                <FaBuilding className="w-4 h-4 text-amber-600" />
                <span>Rotary</span>
              </div>
              <div className="flex items-center gap-2 text-stone-700 font-bold text-sm bg-white px-4 py-2 rounded-xl border border-stone-200 shadow-sm">
                <FaCircleCheck className="w-4 h-4 text-emerald-600" />
                <span>GiveIndia</span>
              </div>
              <div className="flex items-center gap-2 text-stone-700 font-bold text-sm bg-white px-4 py-2 rounded-xl border border-stone-200 shadow-sm">
                <FaBox className="w-4 h-4 text-blue-600" />
                <span>CSRBOX</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────── 7. BOTTOM CTA BANNER ─────────────────── */}
      <section className="relative bg-gradient-to-r from-[#0f392b] via-[#085450] to-[#0a2e23] py-16 md:py-20 text-white overflow-hidden">
        {/* Right Sprouting Plant Graphic */}
        <div className="absolute right-0 bottom-0 opacity-25 pointer-events-none translate-x-10 translate-y-10">
          <LeafOrnament className="w-96 h-96 text-emerald-300" />
        </div>

        <div className="mx-auto max-w-[1320px] px-6 md:px-10 relative z-10">
          <div className="max-w-3xl">
            <Reveal direction="up" delay={50}>
              <h2
                className="font-bengali text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight"
                style={bn ? SERIF_BN : SERIF_EN}
              >
                {bn ? 'একসাথে, আমরা গড়ে তুলবো এক সুন্দর আগামী।' : 'Together, we can create a better tomorrow.'}
              </h2>
            </Reveal>

            <Reveal direction="up" delay={120}>
              <p className="mt-4 font-bengali text-emerald-100 text-base sm:text-lg">
                {bn
                  ? 'আপনার আজকের সামান্য সহমর্মিতা ও অবদান অসংখ্য মানুষের জীবনকে বদলে দিতে পারে।'
                  : 'Your support today can transform countless lives across our communities.'}
              </p>
            </Reveal>

            <Reveal direction="up" delay={200}>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  to="/programs"
                  className="px-7 py-3.5 rounded-full border border-emerald-300/60 hover:bg-white hover:text-emerald-950 font-semibold text-sm transition-all duration-300"
                >
                  {bn ? 'আমাদের কাজ খুঁজুন' : 'Explore Our Work'}
                </Link>

                <Link
                  to="/donate"
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#c2410c] hover:bg-amber-600 text-white font-bold text-sm transition-all duration-300 shadow-xl hover:-translate-y-0.5"
                >
                  <FaHeart className="w-4 h-4 text-amber-200" />
                  <span>{bn ? 'এখনই দান করুন' : 'Donate Now'}</span>
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ─────────────────── 8. STORY DETAIL MODAL ─────────────────── */}
      {selectedStory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-stone-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-2xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl overflow-hidden border border-stone-200 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedStory(null)}
              className="absolute top-5 right-5 p-2 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors"
            >
              <FaXmark className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-2">
              <span>{selectedStory.category?.[lang]}</span>
            </div>

            <h3
              className="font-bengali text-2xl sm:text-3xl font-bold text-stone-900 mb-4"
              style={bn ? SERIF_BN : SERIF_EN}
            >
              {selectedStory.title[lang]}
            </h3>

            <div className="rounded-2xl overflow-hidden mb-6 h-56 sm:h-64">
              <img
                src={selectedStory.img}
                alt={selectedStory.title[lang]}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = '/assets/images/Chhatradol.jpg';
                }}
              />
            </div>

            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200/60 mb-6 italic text-stone-800 font-bengali text-sm sm:text-base">
              "{selectedStory.quote ? selectedStory.quote[lang] : selectedStory.summary[lang]}"
              {selectedStory.author && (
                <div className="mt-2 font-bold not-italic text-amber-900 text-xs">
                  {selectedStory.author[lang]}
                </div>
              )}
            </div>

            <p className="font-bengali text-stone-700 text-sm sm:text-base leading-relaxed">
              {selectedStory.fullContent ? selectedStory.fullContent[lang] : selectedStory.summary[lang]}
            </p>

            <div className="mt-8 pt-4 border-t border-stone-200 flex justify-end">
              <button
                onClick={() => setSelectedStory(null)}
                className="px-6 py-2.5 rounded-full bg-stone-900 text-white font-medium text-xs hover:bg-stone-800 transition-colors"
              >
                {bn ? 'বন্ধ করুন' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────── 9. LOCATIONS MODAL ─────────────────── */}
      {showLocationsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-stone-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl overflow-hidden border border-stone-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-stone-200">
              <div>
                <h3
                  className="font-bengali text-xl font-bold text-stone-900"
                  style={bn ? SERIF_BN : SERIF_EN}
                >
                  {bn ? 'সক্রিয় গ্রাম ও কেন্দ্রের তালিকা' : 'Active Field Locations'}
                </h3>
                <p className="text-xs text-stone-500 font-bengali mt-0.5">
                  {bn ? '১৮টি সক্রিয় স্থান ও শিবির পরিচালনা' : '18 communities supported by volunteers'}
                </p>
              </div>
              <button
                onClick={() => setShowLocationsModal(false)}
                className="p-2 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors"
              >
                <FaXmark className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="my-4 relative">
              <FaMagnifyingGlass className="absolute left-3.5 top-3.5 text-stone-400 w-4 h-4" />
              <input
                type="text"
                placeholder={bn ? 'স্থান বা জেলা খুঁজুন...' : 'Search location or district...'}
                value={locationSearch}
                onChange={(e) => setLocationSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-emerald-600 font-bengali"
              />
            </div>

            {/* Scrollable Location List */}
            <div className="overflow-y-auto flex-1 pr-1 divide-y divide-stone-100">
              {filteredLocations.map((loc) => (
                <div key={loc.id} className="py-3 flex items-center justify-between hover:bg-stone-50 px-2 rounded-lg transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <FaLocationDot className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bengali font-bold text-stone-800 text-sm">{loc.name[lang]}</div>
                      <div className="font-bengali text-xs text-stone-500">{loc.district[lang]}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-emerald-800">{loc.beneficiaries}</div>
                    <div className="text-[10px] text-stone-400">{loc.camps} {bn ? 'শিবির' : 'Camps'}</div>
                  </div>
                </div>
              ))}

              {filteredLocations.length === 0 && (
                <div className="py-8 text-center text-xs text-stone-500 font-bengali">
                  {bn ? 'কোন স্থান খুঁজে পাওয়া যায়নি' : 'No matching locations found'}
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-stone-200 flex justify-end">
              <button
                onClick={() => setShowLocationsModal(false)}
                className="px-6 py-2 rounded-full bg-stone-900 text-white font-medium text-xs hover:bg-stone-800 transition-colors"
              >
                {bn ? 'বন্ধ করুন' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
