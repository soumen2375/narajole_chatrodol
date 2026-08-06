import React from 'react';
import { Link } from 'react-router-dom';
import { useT } from '@/i18n';
import Breadcrumb from '@/components/ui/Breadcrumb';
import {
  FaBullseye, FaEye, FaGem, FaGraduationCap, FaUsers, FaShieldHalved,
  FaHandHoldingHeart, FaClipboardCheck, FaFlag, FaUserGroup, FaAward,
  FaPlay, FaArrowRight, FaHeart
} from 'react-icons/fa6';

const BRAND = '#c2410c';
const BG_CREAM = '#faf6ef';
const FALLBACK_IMG = '/assets/images/Chhatradol.jpg';

const onImgErr = (e: React.SyntheticEvent<HTMLImageElement>) => {
  if (e.currentTarget.src !== window.location.origin + FALLBACK_IMG) {
    e.currentTarget.src = FALLBACK_IMG;
  }
};

export default function About() {
  const { lang } = useT();
  const bn = lang === 'bn';

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
      name: bn ? 'শুভদীপ ঘোড়াই' : 'Subhadip Ghorai',
      role: bn ? 'সদস্য' : 'Member',
      img: '/assets/images/about/members/subhadip.jpg',
    },
    {
      name: bn ? 'পবিত্র সাঁতরা' : 'Pabitra Santra',
      role: bn ? 'সদস্য' : 'Member',
      img: '/assets/images/about/members/pabitra.jpg',
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <Breadcrumb title={bn ? 'আমাদের কথা' : 'About Us'} />

      {/* ─────────────────── 1. HERO SECTION ─────────────────── */}
      <section className="py-12 md:py-20" style={{ background: BG_CREAM }}>
        <div className="mx-auto max-w-[1340px] px-6 md:px-10">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-6">
              <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-[1.18] text-slate-900">
                {bn ? (
                  <>
                    সাত বছরের পথচলা <br />
                    একটি ছোট ভাবনা থেকে <br />
                    <span className="text-[#c2410c]">রেজিস্টার্ড ট্রাস্ট।</span>
                  </>
                ) : (
                  <>
                    Seven Years of Journey <br />
                    From a Small Idea to a <br />
                    <span className="text-[#c2410c]">Registered Trust.</span>
                  </>
                )}
              </h1>

              <p className="mt-5 font-sans text-base sm:text-lg leading-relaxed text-slate-600">
                {bn
                  ? '২০১৯ সালে একদল ছাত্রছাত্রীর ভাবনায় জন্ম নিয়েছিল এই ছাত্রদল। আজ আমরা একটি পাবলিক চ্যারিটেবল ট্রাস্ট — পশ্চিম মেদিনীপুরের প্রান্তিক মানুষের পাশে নিরলসভাবে দাঁড়াই।'
                  : 'In 2019, Chhatradol was born from the vision of a group of students. Today we are a public charitable trust — standing steadfastly beside the marginalised people of Paschim Medinipur.'}
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  to="/events"
                  className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 font-sans text-sm font-bold text-white shadow-md transition-all hover:bg-orange-700 hover:shadow-lg"
                  style={{ background: BRAND }}
                >
                  <span>{bn ? 'আমাদের গল্প' : 'Our Story'}</span>
                  <FaArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link
                  to="/gallery"
                  className="inline-flex items-center gap-2.5 rounded-full border border-slate-300 bg-white px-6 py-3.5 font-sans text-sm font-semibold text-slate-800 shadow-sm transition-all hover:bg-slate-50 hover:border-slate-400"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 text-[#c2410c]">
                    <FaPlay className="h-2.5 w-2.5 translate-x-0.5" />
                  </span>
                  <span>{bn ? 'ভিডিও দেখুন' : 'Watch Our Journey'}</span>
                </Link>
              </div>
            </div>

            {/* Right Hero Image */}
            <div className="lg:col-span-6">
              <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xl">
                <img
                  src="/assets/images/about/about.jpg"
                  alt="Chhatradol Students and Volunteers"
                  className="h-full w-full object-cover max-h-[460px]"
                  onError={onImgErr}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────── 2. MISSION / VISION / VALUES ─────────────────── */}
      <section className="py-16 md:py-20 bg-white">
        <div className="mx-auto max-w-[1340px] px-6 md:px-10">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Mission */}
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-7 sm:p-8 shadow-sm transition-all hover:shadow-md">
              <div>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-[#c2410c]">
                    <FaBullseye className="h-6 w-6" />
                  </div>
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-400">
                    01 • {bn ? 'মিশন' : 'MISSION'}
                  </span>
                </div>
                <h3 className="mt-6 font-serif text-2xl font-bold text-slate-900">
                  {bn ? 'মিশন' : 'Mission'}
                </h3>
                <div className="mt-2 h-0.5 w-8 bg-[#c2410c]" />
                <p className="mt-4 font-sans text-sm sm:text-base leading-relaxed text-slate-600">
                  {bn
                    ? 'প্রান্তিক জনগোষ্ঠীর শিক্ষা, স্বাস্থ্য, পরিবেশ ও দৈনন্দিন জীবনের মৌলিক চাহিদা পূরণে নিরলসভাবে কাজ করে যাওয়া।'
                    : 'To tirelessly work in fulfilling the basic needs of marginalised communities in education, health, environment and daily life.'}
                </p>
              </div>
            </div>

            {/* Vision */}
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-7 sm:p-8 shadow-sm transition-all hover:shadow-md">
              <div>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-[#c2410c]">
                    <FaEye className="h-6 w-6" />
                  </div>
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-400">
                    02 • {bn ? 'ভিশন' : 'VISION'}
                  </span>
                </div>
                <h3 className="mt-6 font-serif text-2xl font-bold text-slate-900">
                  {bn ? 'ভিশন' : 'Vision'}
                </h3>
                <div className="mt-2 h-0.5 w-8 bg-[#c2410c]" />
                <p className="mt-4 font-sans text-sm sm:text-base leading-relaxed text-slate-600">
                  {bn
                    ? 'প্রতিটি মানুষের জীবনে শিক্ষা, সুস্বাস্থ্য ও পরিবেশগত সচেতনতা পৌঁছে দেওয়া।'
                    : 'To bring education, good health and environmental awareness to the life of every person.'}
                </p>
              </div>
            </div>

            {/* Values */}
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-7 sm:p-8 shadow-sm transition-all hover:shadow-md">
              <div>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-[#c2410c]">
                    <FaGem className="h-6 w-6" />
                  </div>
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-400">
                    03 • {bn ? 'মূল্যবোধ' : 'VALUES'}
                  </span>
                </div>
                <h3 className="mt-6 font-serif text-2xl font-bold text-slate-900">
                  {bn ? 'মূল্যবোধ' : 'Values'}
                </h3>
                <div className="mt-2 h-0.5 w-8 bg-[#c2410c]" />
                <p className="mt-4 font-sans text-sm sm:text-base leading-relaxed text-slate-600">
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
      <section className="py-16 md:py-20" style={{ background: BG_CREAM }}>
        <div className="mx-auto max-w-[1340px] px-6 md:px-10">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-widest text-[#c2410c]">
              {bn ? 'আমাদের স্তম্ভ' : 'WHAT WE STAND FOR'}
            </span>
            <h2 className="mt-2 font-serif text-3xl sm:text-4xl font-extrabold text-slate-900">
              {bn ? 'আমাদের মূল্যবোধ' : 'Our Core Values'}
            </h2>
            <div className="mx-auto mt-3 h-1 w-12 rounded-full bg-[#c2410c]" />
          </div>

          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {/* Education */}
            <div className="flex flex-col items-center text-center rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-transform hover:-translate-y-1">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-100 text-[#c2410c]">
                <FaGraduationCap className="h-7 w-7" />
              </div>
              <h4 className="mt-4 font-sans text-base font-bold text-slate-900">
                {bn ? 'শিক্ষা' : 'Education'}
              </h4>
              <p className="mt-2 font-sans text-xs leading-relaxed text-slate-600">
                {bn ? 'আমরা বিশ্বাস করি শিক্ষা হল উন্নতির চাবিকাঠি।' : 'We believe education is the key to progress.'}
              </p>
            </div>

            {/* Service */}
            <div className="flex flex-col items-center text-center rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-transform hover:-translate-y-1">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-100 text-[#c2410c]">
                <FaUsers className="h-7 w-7" />
              </div>
              <h4 className="mt-4 font-sans text-base font-bold text-slate-900">
                {bn ? 'সেবা' : 'Service'}
              </h4>
              <p className="mt-2 font-sans text-xs leading-relaxed text-slate-600">
                {bn ? 'আমরা নিঃস্বার্থভাবে সমাজের সেবা করি।' : 'We serve society selflessly.'}
              </p>
            </div>

            {/* Integrity */}
            <div className="flex flex-col items-center text-center rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-transform hover:-translate-y-1">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-100 text-[#c2410c]">
                <FaShieldHalved className="h-7 w-7" />
              </div>
              <h4 className="mt-4 font-sans text-base font-bold text-slate-900">
                {bn ? 'সততা' : 'Integrity'}
              </h4>
              <p className="mt-2 font-sans text-xs leading-relaxed text-slate-600">
                {bn ? 'আমাদের সকল কার্যক্রমে স্বচ্ছতা ও সততা বজায় রাখি।' : 'We maintain transparency and honesty in all we do.'}
              </p>
            </div>

            {/* Compassion */}
            <div className="flex flex-col items-center text-center rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-transform hover:-translate-y-1">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-100 text-[#c2410c]">
                <FaHandHoldingHeart className="h-7 w-7" />
              </div>
              <h4 className="mt-4 font-sans text-base font-bold text-slate-900">
                {bn ? 'সহমর্মিতা' : 'Compassion'}
              </h4>
              <p className="mt-2 font-sans text-xs leading-relaxed text-slate-600">
                {bn ? 'আমরা প্রতিটি মানুষের প্রতি সহানুভূতিশীল।' : 'We are compassionate towards everyone.'}
              </p>
            </div>

            {/* Accountability */}
            <div className="flex flex-col items-center text-center rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-transform hover:-translate-y-1">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-100 text-[#c2410c]">
                <FaClipboardCheck className="h-7 w-7" />
              </div>
              <h4 className="mt-4 font-sans text-base font-bold text-slate-900">
                {bn ? 'দায়িত্বশীলতা' : 'Accountability'}
              </h4>
              <p className="mt-2 font-sans text-xs leading-relaxed text-slate-600">
                {bn ? 'আমরা আমাদের প্রতিশ্রুতির প্রতি দায়বদ্ধ।' : 'We are accountable to our commitments.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────── 4. BRIEF HISTORY / TIMELINE ─────────────────── */}
      <section className="py-16 md:py-20 bg-white">
        <div className="mx-auto max-w-[1340px] px-6 md:px-10">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-widest text-[#c2410c]">
              {bn ? 'আমাদের ইতিহাস' : 'OUR JOURNEY'}
            </span>
            <h2 className="mt-2 font-serif text-3xl sm:text-4xl font-extrabold text-slate-900">
              {bn ? 'পথচলার সংক্ষিপ্ত ইতিহাস' : 'A Brief History'}
            </h2>
            <div className="mx-auto mt-3 h-1 w-12 rounded-full bg-[#c2410c]" />
          </div>

          <div className="relative mt-14">
            {/* Connecting Horizontal Line (Desktop) */}
            <div className="hidden md:block absolute top-1/2 left-10 right-10 h-0.5 -translate-y-6 bg-amber-200/80" />

            <div className="grid grid-cols-1 gap-8 md:grid-cols-4 relative z-10">
              {/* 2019 */}
              <div className="flex flex-col items-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#c2410c] bg-white text-[#c2410c] shadow-md">
                  <FaFlag className="h-5 w-5" />
                </div>
                <span className="mt-4 font-serif text-2xl font-extrabold text-slate-900">
                  2019
                </span>
                <h4 className="mt-1 font-sans text-sm font-bold text-[#c2410c]">
                  {bn ? 'যাত্রা শুরু' : 'Founded'}
                </h4>
                <p className="mt-2 font-sans text-xs leading-relaxed text-slate-600 max-w-xs">
                  {bn
                    ? 'একদল ছাত্রছাত্রীর হাত ধরে প্রথম পরিচ্ছন্নতা অভিযান।'
                    : 'First cleanliness drive by a group of students.'}
                </p>
              </div>

              {/* 2021 */}
              <div className="flex flex-col items-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#c2410c] bg-white text-[#c2410c] shadow-md">
                  <FaHandHoldingHeart className="h-5 w-5" />
                </div>
                <span className="mt-4 font-serif text-2xl font-extrabold text-slate-900">
                  2021
                </span>
                <h4 className="mt-1 font-sans text-sm font-bold text-[#c2410c]">
                  {bn ? 'করোনাকালীন তৎপরতা' : 'COVID Response'}
                </h4>
                <p className="mt-2 font-sans text-xs leading-relaxed text-slate-600 max-w-xs">
                  {bn
                    ? 'মহামারির সময়ে ত্রাণ, মাস্ক, ও অক্সিজেন সিলিন্ডার সহায়তা।'
                    : 'Relief, masks and oxygen cylinder support during the pandemic.'}
                </p>
              </div>

              {/* 2023 */}
              <div className="flex flex-col items-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#c2410c] bg-white text-[#c2410c] shadow-md">
                  <FaUserGroup className="h-5 w-5" />
                </div>
                <span className="mt-4 font-serif text-2xl font-extrabold text-slate-900">
                  2023
                </span>
                <h4 className="mt-1 font-sans text-sm font-bold text-[#c2410c]">
                  {bn ? 'বিকাশ' : 'Growth'}
                </h4>
                <p className="mt-2 font-sans text-xs leading-relaxed text-slate-600 max-w-xs">
                  {bn
                    ? '৮+ কর্মসূচি, ৫০০+ শিক্ষার্থী, ২৫+ স্বাস্থ্য শিবির।'
                    : '8+ programmes, 500+ students supported, 25+ health camps.'}
                </p>
              </div>

              {/* 2026 */}
              <div className="flex flex-col items-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#c2410c] bg-white text-[#c2410c] shadow-md">
                  <FaAward className="h-5 w-5" />
                </div>
                <span className="mt-4 font-serif text-2xl font-extrabold text-slate-900">
                  2026
                </span>
                <h4 className="mt-1 font-sans text-sm font-bold text-[#c2410c]">
                  {bn ? 'রেজিস্ট্রেশন' : 'Registration'}
                </h4>
                <p className="mt-2 font-sans text-xs leading-relaxed text-slate-600 max-w-xs">
                  {bn
                    ? 'সরকারিভাবে পাবলিক চ্যারিটেবল ট্রাস্ট হিসেবে নিবন্ধিত।'
                    : 'Officially registered as a public charitable trust.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────── 5. TRUSTEES / TEAM GRID ─────────────────── */}
      <section className="py-16 md:py-20" style={{ background: BG_CREAM }}>
        <div className="mx-auto max-w-[1340px] px-6 md:px-10">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-widest text-[#c2410c]">
              {bn ? 'আমাদের দল' : 'THE PEOPLE BEHIND US'}
            </span>
            <h2 className="mt-2 font-serif text-3xl sm:text-4xl font-extrabold text-slate-900">
              {bn ? 'যাঁরা পথ দেখাচ্ছেন' : 'The Ones Leading the Way'}
            </h2>
            <div className="mx-auto mt-3 h-1 w-12 rounded-full bg-[#c2410c]" />
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {trustees.map((t, idx) => (
              <div
                key={idx}
                className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                {/* Photo */}
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
                  <img
                    src={t.img}
                    alt={t.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={onImgErr}
                  />
                </div>

                {/* Content */}
                <div className="flex flex-1 flex-col justify-between p-5">
                  <div>
                    <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-amber-700">
                      TRUSTEE
                    </span>
                    <h3 className="mt-1 font-sans text-lg font-bold text-slate-900 transition-colors group-hover:text-[#c2410c]">
                      {t.name}
                    </h3>
                    <p className="mt-0.5 font-sans text-xs font-semibold text-slate-500">
                      {t.role}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────── 6. CTA BANNER ─────────────────── */}
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
                    ? 'আপনার সহায়তা একটি সুন্দর আগামী উপহার দিতে পারে।'
                    : 'Your support can bring hope and create a better tomorrow.'}
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
