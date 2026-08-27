import React from 'react';
import { Link } from 'react-router-dom';
import { useT } from '@/i18n';
import Breadcrumb from '@/components/ui/Breadcrumb';
import { PageHero } from './_field-journal';
import { useSEO } from '@/hooks/useSEO';
import { SEO } from '@/data/seoConfig';
import {
  FaBullseye, FaEye, FaGem, FaGraduationCap, FaUsers, FaShieldHalved,
  FaHandHoldingHeart, FaClipboardCheck, FaFlag, FaUserGroup, FaAward,
  FaPlay, FaArrowRight, FaHeart
} from 'react-icons/fa6';

const FALLBACK_IMG = '/assets/images/Chhatradol.jpg';

const onImgErr = (e: React.SyntheticEvent<HTMLImageElement>) => {
  if (e.currentTarget.src !== window.location.origin + FALLBACK_IMG) {
    e.currentTarget.src = FALLBACK_IMG;
  }
};

export default function About() {
  const { lang } = useT();
  const bn = lang === 'bn';
  useSEO(SEO['/about']);

  const trustees = [
    {
      name: bn ? 'স্বরূপ সামন্ত' : 'Swarup Samanta',
      role: bn ? 'সভাপতি' : 'President',
      img: '/assets/images/about/members/swarup.jpg',
    },
    {
      name: bn ? 'প্রবাল ভুঁইয়া' : 'Prabal Bhunia',
      role: bn ? 'সহ-সভাপতি' : 'Vice President',
      img: '/assets/images/about/members/prabal.jpg',
    },
    {
      name: bn ? 'সায়ন সামন্ত' : 'Sayan Samanta',
      role: bn ? 'সাধারণ সম্পাদক' : 'General Secretary',
      img: '/assets/images/about/members/sayan.jpg',
    },
    {
      name: bn ? 'সুরজিৎ বেরা' : 'Surajit Bera',
      role: bn ? 'যুগ্ম সম্পাদক' : 'Joint Secretary',
      img: '/assets/images/about/members/surajit.jpg',
    },
    {
      name: bn ? 'শুভজিৎ কুন্ডু' : 'Subhajit Kundu',
      role: bn ? 'কোষাধ্যক্ষ' : 'Treasurer',
      img: '/assets/images/about/members/subhajit.jpg',
    },
    {
      name: bn ? 'সৌমেন মাইতি' : 'Soumen Maity',
      role: bn ? 'সহ-কোষাধ্যক্ষ' : 'Assistant Treasurer',
      img: '/assets/images/about/members/soumen.jpg',
    },
    {
      name: bn ? 'শুভদীপ ঘোড়াই' : 'Subhadip Ghorai',
      role: bn ? 'সদস্য' : 'Member',
      img: '/assets/images/about/members/subhadip.jpg',
    },
    {
      name: bn ? 'পবিত্র সাঁতরা' : 'Pabitra Santra',
      role: bn ? 'সদস্য' : 'Member',
      img: '/assets/images/about/members/pabitra.jpg',
    },
  ];

  const coreValues = [
    {
      icon: FaGraduationCap,
      title: bn ? 'শিক্ষা' : 'Education',
      desc: bn ? 'আমরা বিশ্বাস করি শিক্ষা হল উন্নতির চাবিকাঠি।' : 'We believe education is the key to progress.',
    },
    {
      icon: FaUsers,
      title: bn ? 'সেবা' : 'Service',
      desc: bn ? 'আমরা নিঃস্বার্থভাবে সমাজের সেবা করি।' : 'We serve society selflessly.',
    },
    {
      icon: FaShieldHalved,
      title: bn ? 'সততা' : 'Integrity',
      desc: bn ? 'আমাদের সকল কার্যক্রমে স্বচ্ছতা ও সততা বজায় রাখি।' : 'We maintain transparency and honesty in all we do.',
    },
    {
      icon: FaHandHoldingHeart,
      title: bn ? 'সহমর্মিতা' : 'Compassion',
      desc: bn ? 'আমরা প্রতিটি মানুষের প্রতি সহানুভূতিশীল।' : 'We are compassionate towards everyone.',
    },
    {
      icon: FaClipboardCheck,
      title: bn ? 'দায়িত্বশীলতা' : 'Accountability',
      desc: bn ? 'আমরা আমাদের প্রতিশ্রুতির প্রতি দায়বদ্ধ।' : 'We are accountable to our commitments.',
    },
  ];

  const timeline = [
    {
      icon: FaFlag,
      year: '2019',
      title: bn ? 'যাত্রা শুরু' : 'Founded',
      desc: bn
        ? 'একদল ছাত্রছাত্রীর হাত ধরে প্রথম পরিচ্ছন্নতা অভিযান।'
        : 'First cleanliness drive by a group of students.',
    },
    {
      icon: FaHandHoldingHeart,
      year: '2021',
      title: bn ? 'করোনাকালীন তৎপরতা' : 'COVID Response',
      desc: bn
        ? 'মহামারির সময়ে ত্রাণ, মাস্ক, ও অক্সিজেন সিলিন্ডার সহায়তা।'
        : 'Relief, masks and oxygen cylinder support during the pandemic.',
    },
    {
      icon: FaUserGroup,
      year: '2023',
      title: bn ? 'বিকাশ' : 'Growth',
      desc: bn
        ? '৮+ কর্মসূচি, ৫০০+ শিক্ষার্থী, ২৫+ স্বাস্থ্য শিবির।'
        : '8+ programmes, 500+ students supported, 25+ health camps.',
    },
    {
      icon: FaAward,
      year: '2026',
      title: bn ? 'রেজিস্ট্রেশন' : 'Registration',
      desc: bn
        ? 'সরকারিভাবে পাবলিক চ্যারিটেবল ট্রাস্ট হিসেবে নিবন্ধিত।'
        : 'Officially registered as a public charitable trust.',
    },
  ];

  return (
    <div className="min-h-screen bg-site-cream">
      <Breadcrumb title={bn ? 'আমাদের কথা' : 'About Us'} />

      {/* ─────────────────── 1. HERO SECTION ─────────────────── */}
      <PageHero
        title={
          bn ? (
            <>
              সাত বছরের পথচলা <br />
              একটি ছোট ভাবনা থেকে <br />
              <span className="text-site-yellow">রেজিস্টার্ড ট্রাস্ট।</span>
            </>
          ) : (
            <>
              Seven Years of Journey <br />
              From a Small Idea to a <br />
              <span className="text-site-yellow">Registered Trust.</span>
            </>
          )
        }
        lede={
          bn
            ? '২০১৯ সালে একদল ছাত্রছাত্রীর ভাবনায় জন্ম নিয়েছিল এই ছাত্রদল। আজ আমরা একটি পাবলিক চ্যারিটেবল ট্রাস্ট — পশ্চিম মেদিনীপুরের প্রান্তিক মানুষের পাশে নিরলসভাবে দাঁড়াই।'
            : 'In 2019, Chhatradol was born from the vision of a group of students. Today we are a public charitable trust — standing steadfastly beside the marginalised people of Paschim Medinipur.'
        }
        titleClassName="text-[26px] sm:text-[clamp(36px,4.4vw,58px)]"
        image="/assets/images/about/about-hero.jpg"
        imageAlt={
          bn
            ? 'নাড়াজোল ছাত্রদলের স্বেচ্ছাসেবক ও গ্রামের শিশুরা'
            : 'Chhatradol volunteers with children at a distribution drive'
        }
        scrim="strong"
      >
        <div className="mt-8 flex flex-wrap items-center gap-3 sm:mt-9 sm:gap-4">
          <Link to="/events" className="btn-yellow">
            <span>{bn ? 'আমাদের গল্প' : 'Our Story'}</span>
            <FaArrowRight className="h-3 w-3" />
          </Link>
          <Link to="/gallery" className="btn-ghost-light">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-site-yellow text-site-ink">
              <FaPlay className="h-2.5 w-2.5 translate-x-[1px]" />
            </span>
            <span>{bn ? 'ভিডিও দেখুন' : 'Watch Our Journey'}</span>
          </Link>
        </div>
      </PageHero>

      {/* ─────────────────── 2. MISSION / VISION / VALUES ─────────────────── */}
      <section className="site-section">
        <div className="site-wrap">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Mission */}
            <div className="green-card flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-site-yellow">
                    <FaBullseye className="h-5 w-5" />
                  </span>
                  <span className="font-dmmono text-[11px] font-medium uppercase tracking-[0.14em] text-white/50">
                    01 • {bn ? 'মিশন' : 'MISSION'}
                  </span>
                </div>
                <h3 className="h-card mt-6 text-white">
                  {bn ? 'মিশন' : 'Mission'}
                </h3>
                <p className="mt-4 font-dmsans text-[15px] leading-[1.8] text-white/75">
                  {bn
                    ? 'প্রান্তিক জনগোষ্ঠীর শিক্ষা, স্বাস্থ্য, পরিবেশ ও দৈনন্দিন জীবনের মৌলিক চাহিদা পূরণে নিরলসভাবে কাজ করে যাওয়া।'
                    : 'To tirelessly work in fulfilling the basic needs of marginalised communities in education, health, environment and daily life.'}
                </p>
              </div>
            </div>

            {/* Vision */}
            <div className="soft-card flex flex-col justify-between p-8 md:p-9">
              <div>
                <div className="flex items-center justify-between gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-site-cream text-site-green">
                    <FaEye className="h-5 w-5" />
                  </span>
                  <span className="font-dmmono text-[11px] font-medium uppercase tracking-[0.14em] text-site-faint">
                    02 • {bn ? 'ভিশন' : 'VISION'}
                  </span>
                </div>
                <h3 className="h-card mt-6 text-site-ink">
                  {bn ? 'ভিশন' : 'Vision'}
                </h3>
                <p className="mt-4 font-dmsans text-[15px] leading-[1.8] text-site-muted">
                  {bn
                    ? 'প্রতিটি মানুষের জীবনে শিক্ষা, সুস্বাস্থ্য ও পরিবেশগত সচেতনতা পৌঁছে দেওয়া।'
                    : 'To bring education, good health and environmental awareness to the life of every person.'}
                </p>
              </div>
            </div>

            {/* Values */}
            <div className="yellow-card flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-site-ink/10 text-site-ink">
                    <FaGem className="h-5 w-5" />
                  </span>
                  <span className="font-dmmono text-[11px] font-medium uppercase tracking-[0.14em] text-[#3b3413]/60">
                    03 • {bn ? 'মূল্যবোধ' : 'VALUES'}
                  </span>
                </div>
                <h3 className="h-card mt-6 text-site-ink">
                  {bn ? 'মূল্যবোধ' : 'Values'}
                </h3>
                <p className="mt-4 font-dmsans text-[15px] leading-[1.8] text-[#3b3413]">
                  {bn
                    ? 'সততা, স্বচ্ছতা, সহমর্মিতা — এই তিন স্তম্ভের উপর ভর করে আমরা প্রতিটি কর্মসূচি পরিচালনা করি।'
                    : 'Integrity, transparency, compassion — these three pillars guide every programme we run.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────── 3. CORE VALUES ─────────────────── */}
      <section className="site-section-b">
        <div className="site-wrap">
          <div className="mx-auto max-w-2xl text-center">
            <span className="eyebrow">
              {bn ? 'আমাদের স্তম্ভ' : 'WHAT WE STAND FOR'}
            </span>
            <h2 className="h-section mt-3 text-site-ink">
              {bn ? 'আমাদের মূল্যবোধ' : 'Our Core Values'}
            </h2>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {coreValues.map((v, idx) => {
              const VIcon = v.icon;
              return (
                <div key={idx} className="stat-capsule flex flex-col items-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-site-cream text-site-green">
                    <VIcon className="h-6 w-6" />
                  </span>
                  <h4 className="mt-4 font-archivo text-[16px] font-bold text-site-ink">
                    {v.title}
                  </h4>
                  <p className="mt-2.5 font-dmsans text-[13px] leading-[1.7] text-site-muted">
                    {v.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─────────────────── 4. BRIEF HISTORY / TIMELINE ─────────────────── */}
      <section className="site-section-b">
        <div className="site-wrap">
          <div className="mx-auto max-w-2xl text-center">
            <span className="eyebrow">
              {bn ? 'আমাদের ইতিহাস' : 'OUR JOURNEY'}
            </span>
            <h2 className="h-section mt-3 text-site-ink">
              {bn ? 'পথচলার সংক্ষিপ্ত ইতিহাস' : 'A Brief History'}
            </h2>
          </div>

          <div className="relative mt-14">
            {/* Connecting Horizontal Line (Desktop) */}
            <div className="absolute left-10 right-10 top-6 hidden h-px bg-site-line-2 md:block" />

            <div className="relative z-10 grid grid-cols-1 gap-8 md:grid-cols-4">
              {timeline.map((t, idx) => {
                const TIcon = t.icon;
                return (
                  <div key={idx} className="flex flex-col items-center text-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-site-green text-site-yellow">
                      <TIcon className="h-5 w-5" />
                    </span>
                    <span className="mt-4 font-archivo text-[26px] font-bold text-site-red">
                      {t.year}
                    </span>
                    <h4 className="mt-1 font-archivo text-[15px] font-bold text-site-ink">
                      {t.title}
                    </h4>
                    <p className="mt-2 max-w-xs font-dmsans text-[13px] leading-[1.7] text-site-muted">
                      {t.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────── 5. TRUSTEES / TEAM GRID ─────────────────── */}
      <section className="site-section-b">
        <div className="site-wrap">
          <div className="mx-auto max-w-2xl text-center">
            <span className="eyebrow">
              {bn ? 'আমাদের দল' : 'THE PEOPLE BEHIND US'}
            </span>
            <h2 className="h-section mt-3 text-site-ink">
              {bn ? 'যাঁরা পথ দেখাচ্ছেন' : 'The Ones Leading the Way'}
            </h2>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {trustees.map((t, idx) => (
              <div
                key={idx}
                className="capsule-card group flex h-full flex-col items-center px-7 py-10 transition-all duration-300 hover:-translate-y-1 hover:border-site-green/35"
              >
                {/* Photo — circular avatar on a cream ring */}
                <div className="h-[92px] w-[92px] shrink-0 rounded-full bg-site-cream p-[3px] transition-transform duration-300 group-hover:scale-105">
                  <img
                    src={t.img}
                    alt={t.name}
                    className="h-full w-full rounded-full object-cover"
                    onError={onImgErr}
                  />
                </div>

                {/* Content */}
                <span className="mt-5 font-dmmono text-[10px] font-medium uppercase tracking-[0.16em] text-site-red">
                  TRUSTEE
                </span>
                <h3 className="mt-2.5 font-archivo text-[17px] font-bold leading-tight text-site-ink">
                  {t.name}
                </h3>
                <p className="mt-2 font-dmsans text-[12.5px] text-site-faint">
                  {t.role}
                </p>

                {/* Decorative accent dots (reference capsule flourish) */}
                <div className="mt-6 flex items-center justify-center gap-2" aria-hidden="true">
                  <span className="h-[9px] w-[9px] rounded-full bg-site-red transition-transform duration-300 group-hover:scale-125" />
                  <span className="h-[9px] w-[9px] rounded-full bg-site-red/70 transition-transform duration-300 group-hover:scale-125" />
                  <span className="h-[9px] w-[9px] rounded-full bg-site-red/40 transition-transform duration-300 group-hover:scale-125" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────── 6. CTA BANNER ─────────────────── */}
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
                    ? 'আপনার সহায়তা একটি সুন্দর আগামী উপহার দিতে পারে।'
                    : 'Your support can bring hope and create a better tomorrow.'}
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
