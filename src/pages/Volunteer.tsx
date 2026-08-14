import { useState } from 'react';
import { Link } from 'react-router-dom';
import { VOLUNTEER_PROGRAM_OPTIONS } from '@/data/content';
import { supabase } from '@/lib/supabase';
import { useT } from '@/i18n';
import { PageShell, SERIF_BN } from './_field-journal';
import Breadcrumb from '@/components/ui/Breadcrumb';
import {
  FaUser,
  FaEnvelope,
  FaPhone,
  FaHandshake,
  FaCommentDots,
  FaCheck,
  FaArrowRight,
  FaHeart,
  FaGraduationCap,
  FaUsers,
  FaSeedling,
  FaHandHoldingHeart,
} from 'react-icons/fa6';

export default function Volunteer() {
  const { t, lang } = useT();
  const bn = lang === 'bn';
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    area: VOLUNTEER_PROGRAM_OPTIONS[0].en,
    message: '',
    agree: true,
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.agree) {
      setError(t('volunteer.agreeError'));
      return;
    }
    setStatus('sending');
    setError('');

    const { error: err } = await supabase.from('cswo_volunteer_applications').insert({
      name: form.name,
      email: form.email || null,
      phone: form.phone || null,
      area_of_interest: form.area,
      message: form.message || null,
    });

    if (err) {
      setStatus('error');
      setError(t('volunteer.error'));
      return;
    }

    // Send confirmation email to user if email provided
    if (form.email) {
      try {
        await supabase.functions.invoke('send-volunteer-confirmation', {
          body: {
            name: form.name,
            email: form.email,
            area: form.area,
          },
        });
      } catch {
        console.warn('Confirmation email could not be sent');
      }
    }

    setStatus('sent');
    setForm({ name: '', email: '', phone: '', area: VOLUNTEER_PROGRAM_OPTIONS[0].en, message: '', agree: true });
  };

  return (
    <PageShell>
      <Breadcrumb title={bn ? 'স্বেচ্ছাসেবক' : 'Become a Volunteer'} />

      {/* ── 1. HERO SECTION ───────────────────────────────────────────── */}
      <section className="relative bg-[#faf6ef] pt-6 pb-12 overflow-hidden">
        {/* Left Decorative Botanical Leaf SVG */}
        <div className="absolute left-2 top-8 opacity-25 pointer-events-none hidden md:block">
          <svg width="60" height="140" viewBox="0 0 60 140" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 10C20 40 40 70 50 130" stroke="#4d7c0f" strokeWidth="2" strokeLinecap="round" />
            <path d="M15 25C2 22 2 12 15 25Z" fill="#4d7c0f" />
            <path d="M22 45C8 40 5 28 22 45Z" fill="#4d7c0f" />
            <path d="M30 70C15 62 10 50 30 70Z" fill="#4d7c0f" />
            <path d="M38 95C22 88 18 75 38 95Z" fill="#4d7c0f" />
          </svg>
        </div>

        <div className="mx-auto max-w-[1240px] px-6 md:px-10">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-12 items-center">
            
            {/* Left Copy */}
            <div className="md:col-span-7 space-y-4">
              <div className="relative inline-block">
                <h1 className="font-bengali text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-stone-900 leading-tight" style={SERIF_BN}>
                  Become a <span className="text-[#c2410c]">volunteer</span>
                </h1>
              </div>

              <p className="font-bengali text-base sm:text-lg text-stone-600 max-w-lg leading-relaxed">
                {t('volunteer.subtitle')}
              </p>

              {/* Trust Badges */}
              <div className="pt-2 sm:pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100/80 text-[#c2410c]">
                    <FaUsers className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-bengali text-xs font-bold text-stone-900">{bn ? 'সামাজিক প্রভাব' : 'Social Impact'}</h4>
                    <p className="font-bengali text-[11px] text-stone-500">{bn ? 'সরাসরি জনসেবা' : 'Direct Community Service'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:border-l sm:border-stone-200/80 sm:pl-6">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100/80 text-[#c2410c]">
                    <FaGraduationCap className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-bengali text-xs font-bold text-stone-900">{bn ? 'দক্ষতা বৃদ্ধি' : 'Skill Building'}</h4>
                    <p className="font-bengali text-[11px] text-stone-500">{bn ? 'বাস্তব অভিজ্ঞতা' : 'Real-world Experience'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Hero Visual Badge */}
            <div className="hidden md:flex md:col-span-5 relative items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-tr from-amber-200/30 via-red-100/40 to-transparent rounded-full blur-3xl" />

              <div className="relative z-10 flex flex-col items-center">
                <div className="relative flex h-44 w-44 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 via-[#c2410c] to-red-600 shadow-2xl ring-8 ring-white/90">
                  <FaHandHoldingHeart className="h-20 w-20 text-white drop-shadow-lg" />
                </div>

                <div className="mt-4 rounded-2xl bg-white p-4 shadow-xl border border-stone-100 flex items-center gap-3.5 max-w-xs transform translate-x-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100 text-[#c2410c]">
                    <FaHeart className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-bengali text-xs font-bold text-stone-900 leading-snug">
                      {bn ? 'সমাজে ইতিবাচক পরিবর্তন আনুন।' : 'Create a positive impact in society.'}
                    </p>
                    <p className="font-serif italic text-[11px] text-stone-500 mt-0.5">
                      {bn ? 'আমাদের সাথে যুক্ত হোন! ♡' : 'Join our family today! ♡'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── 2. MAIN CONTENT SECTION ─────────────────────────────────── */}
      <section className="bg-[#faf6ef] pb-16">
        <div className="mx-auto max-w-[1240px] px-3.5 sm:px-6 md:px-10">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">

            {/* LEFT COLUMN: APPLICATION FORM (7 cols) ─────────────── */}
            <div className="lg:col-span-7 flex flex-col">
              <div className="rounded-3xl bg-white p-5 sm:p-8 md:p-9 shadow-md border border-stone-200/80 space-y-6 h-full flex flex-col justify-between">
                
                <div className="border-b border-stone-100 pb-4">
                  <div className="font-mono text-xs font-bold uppercase tracking-wider text-[#c2410c]">
                    {bn ? 'আবেদন ফর্ম' : 'APPLICATION FORM'}
                  </div>
                  <h2 className="mt-1 font-bengali text-2xl sm:text-3xl font-bold text-stone-900" style={SERIF_BN}>
                    {bn ? 'আপনার তথ্য পূরণ করুন।' : 'Fill in your details.'}
                  </h2>
                </div>

                {status === 'sent' ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-8 text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white shadow">
                      <FaCheck className="h-6 w-6" />
                    </div>
                    <h3 className="font-bengali text-lg font-bold text-emerald-950" style={SERIF_BN}>
                      {bn ? 'আবেদন জমা হয়েছে।' : 'Application submitted.'}
                    </h3>
                    <p className="mt-1 font-bengali text-sm text-emerald-800">
                      {t('volunteer.success')}
                    </p>
                    <button
                      type="button"
                      onClick={() => setStatus('idle')}
                      className="mt-5 rounded-full bg-emerald-700 px-6 py-2 font-mono text-xs font-bold text-white uppercase tracking-wider shadow hover:bg-emerald-800 transition-colors"
                    >
                      {bn ? 'আরেকটি আবেদন' : 'Apply again'}
                    </button>
                  </div>
                ) : (
                  <form onSubmit={submit} className="space-y-4 flex-1 flex flex-col justify-between">
                    {/* Full Name */}
                    <div>
                      <label className="mb-1 block font-bengali text-xs font-bold text-stone-700">
                        {bn ? 'পূর্ণ নাম *' : 'FULL NAME *'}
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">
                          <FaUser className="h-3.5 w-3.5" />
                        </span>
                        <input
                          required
                          value={form.name}
                          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                          placeholder={bn ? 'আপনার পূর্ণ নাম' : 'Your full name'}
                          className="w-full rounded-xl border border-stone-200/90 bg-stone-50/40 pl-10 pr-4 py-3 font-bengali text-sm text-stone-900 outline-none transition-all focus:bg-white focus:border-[#c2410c]"
                        />
                      </div>
                    </div>

                    {/* Email & Phone */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block font-bengali text-xs font-bold text-stone-700">
                          {bn ? 'ইমেল' : 'EMAIL'}
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">
                            <FaEnvelope className="h-3.5 w-3.5" />
                          </span>
                          <input
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                            placeholder={bn ? 'আপনার ইমেল' : 'Your email'}
                            className="w-full rounded-xl border border-stone-200/90 bg-stone-50/40 pl-10 pr-4 py-3 font-bengali text-sm text-stone-900 outline-none transition-all focus:bg-white focus:border-[#c2410c]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-1 block font-bengali text-xs font-bold text-stone-700">
                          {bn ? 'ফোন *' : 'PHONE *'}
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">
                            <FaPhone className="h-3.5 w-3.5" />
                          </span>
                          <input
                            type="tel"
                            required
                            value={form.phone}
                            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                            placeholder={bn ? 'মোবাইল নম্বর' : 'Mobile number'}
                            className="w-full rounded-xl border border-stone-200/90 bg-stone-50/40 pl-10 pr-4 py-3 font-bengali text-sm text-stone-900 outline-none transition-all focus:bg-white focus:border-[#c2410c]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Area of Interest */}
                    <div>
                      <label className="mb-1 block font-bengali text-xs font-bold text-stone-700">
                        {bn ? 'আগ্রহের ক্ষেত্র' : 'AREA OF INTEREST'}
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">
                          <FaHandshake className="h-3.5 w-3.5" />
                        </span>
                        <select
                          value={form.area}
                          onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))}
                          className="w-full rounded-xl border border-stone-200/90 bg-stone-50/40 pl-10 pr-4 py-3 font-bengali text-sm text-stone-900 outline-none transition-all focus:bg-white focus:border-[#c2410c] appearance-none"
                        >
                          {VOLUNTEER_PROGRAM_OPTIONS.map((o) => (
                            <option key={o.en} value={o.en}>{o[lang]}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Motivation / Experience */}
                    <div>
                      <label className="mb-1 block font-bengali text-xs font-bold text-stone-700">
                        {bn ? 'আপনার প্রেরণা / অভিজ্ঞতা' : 'YOUR MOTIVATION / EXPERIENCE'}
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-3 text-stone-400">
                          <FaCommentDots className="h-3.5 w-3.5" />
                        </span>
                        <textarea
                          rows={4}
                          value={form.message}
                          onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                          placeholder={bn ? 'আপনার প্রেরণা ও অভিজ্ঞতা লিখুন…' : 'Share your motivation and experience...'}
                          className="w-full rounded-xl border border-stone-200/90 bg-stone-50/40 pl-10 pr-4 py-3 font-bengali text-sm text-stone-900 outline-none transition-all focus:bg-white focus:border-[#c2410c] resize-none"
                        />
                      </div>
                    </div>

                    {/* Agreement checkbox */}
                    <div className="flex items-start gap-2.5 pt-1">
                      <input
                        type="checkbox"
                        id="agreeVolunteer"
                        checked={form.agree}
                        onChange={(e) => setForm((f) => ({ ...f, agree: e.target.checked }))}
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-stone-300 text-[#c2410c] focus:ring-[#c2410c]"
                      />
                      <label htmlFor="agreeVolunteer" className="text-xs text-stone-600 font-bengali cursor-pointer leading-snug">
                        {bn ? 'আমি সংস্থার নিয়ম ও নির্দেশাবলী মেনে চলতে সম্মত।' : "I agree to abide by the Organization's rules and guidelines."}
                      </label>
                    </div>

                    {error && (
                      <p className="font-bengali text-xs text-red-600 font-semibold">{error}</p>
                    )}

                    {/* Submit Button */}
                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={status === 'sending'}
                        className="group w-full inline-flex items-center justify-center gap-3 rounded-full bg-[#c2410c] hover:bg-[#9a3412] text-white font-bengali text-base font-bold py-3.5 px-8 shadow-md hover:shadow-lg transition-all disabled:opacity-60"
                      >
                        <span>{status === 'sending' ? t('volunteer.submitting') : (bn ? 'আবেদন জমা দিন' : 'SUBMIT APPLICATION')}</span>
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#c2410c]">
                          <FaArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                        </div>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: SIDEBAR (5 cols) ───── */}
            <div className="lg:col-span-5 space-y-5">

              {/* Card 1: Why Volunteer? */}
              <div className="rounded-3xl border border-stone-200/60 bg-[#faf6ef] p-5 sm:p-6 shadow-sm space-y-4">
                <div className="relative inline-block">
                  <h3 className="font-bengali text-2xl font-bold text-stone-900" style={SERIF_BN}>
                    {bn ? 'কেন স্বেচ্ছাসেবক হবেন?' : 'Why Volunteer?'}
                  </h3>
                  <div className="mt-1 h-0.5 w-10 bg-[#c2410c] rounded-full" />
                </div>

                <div className="space-y-4">
                  {/* Item 1 */}
                  <div className="flex items-start gap-3.5 sm:gap-4">
                    <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full bg-white border border-stone-200/80 text-[#c2410c] shadow-sm">
                      <FaHeart className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div>
                      <h4 className="font-bengali text-sm font-bold text-stone-900">
                        {bn ? 'সরাসরি সমাজের উপকারে আসুন' : 'Make a direct impact'}
                      </h4>
                      <p className="font-bengali text-xs text-stone-500 mt-0.5 leading-relaxed">
                        {bn ? 'সমাজে ইতিবাচক পরিবর্তন আনুন' : 'Create positive change in the community'}
                      </p>
                    </div>
                  </div>

                  {/* Item 2 */}
                  <div className="flex items-start gap-3.5 sm:gap-4">
                    <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full bg-white border border-stone-200/80 text-[#c2410c] shadow-sm">
                      <FaGraduationCap className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div>
                      <h4 className="font-bengali text-sm font-bold text-stone-900">
                        {bn ? 'নতুন দক্ষতা ও অভিজ্ঞতা অর্জন করুন' : 'Gain new skills & experiences'}
                      </h4>
                      <p className="font-bengali text-xs text-stone-500 mt-0.5 leading-relaxed">
                        {bn ? 'শিখুন, বাড়ুন এবং আপনার দক্ষতা বৃদ্ধি করুন' : 'Learn, grow and enhance your abilities'}
                      </p>
                    </div>
                  </div>

                  {/* Item 3 */}
                  <div className="flex items-start gap-3.5 sm:gap-4">
                    <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full bg-white border border-stone-200/80 text-[#c2410c] shadow-sm">
                      <FaUsers className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div>
                      <h4 className="font-bengali text-sm font-bold text-stone-900">
                        {bn ? 'একটি উৎসাহী দলের অংশ হোন' : 'Be part of a passionate team'}
                      </h4>
                      <p className="font-bengali text-xs text-stone-500 mt-0.5 leading-relaxed">
                        {bn ? 'সমমনা ও যত্নশীল মানুষের সাথে কাজ করুন' : 'Work with like-minded and caring individuals'}
                      </p>
                    </div>
                  </div>

                  {/* Item 4 */}
                  <div className="flex items-start gap-3.5 sm:gap-4">
                    <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full bg-white border border-stone-200/80 text-[#c2410c] shadow-sm">
                      <FaSeedling className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div>
                      <h4 className="font-bengali text-sm font-bold text-stone-900">
                        {bn ? 'সবুজ ও শক্তিশালী সমাজ গঠনে অবদান রাখুন' : 'Contribute to a greener, stronger society'}
                      </h4>
                      <p className="font-bengali text-xs text-stone-500 mt-0.5 leading-relaxed">
                        {bn ? 'সকলের জন্য একটি টেকসই ভবিষ্যৎ গড়তে সাহায্য করুন' : 'Help build a sustainable future for all'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Programme Areas */}
              <div className="rounded-3xl border border-stone-200/60 bg-[#faf6ef] p-5 sm:p-7 shadow-sm space-y-4">
                <h3 className="font-bengali text-2xl font-bold text-stone-900" style={SERIF_BN}>
                  {bn ? 'কার্যক্রম ক্ষেত্র' : 'Programme Areas'}
                </h3>

                <div className="flex flex-wrap gap-2.5 pt-1">
                  {VOLUNTEER_PROGRAM_OPTIONS.map((o) => (
                    <span
                      key={o.en}
                      className="rounded-full bg-[#f5ede2] border border-[#ebded0] px-4 py-2 font-bengali text-xs font-semibold text-[#c2410c] hover:bg-[#ebdccb] transition-colors"
                    >
                      {o[lang]}
                    </span>
                  ))}
                </div>
              </div>

              {/* Card 3: Have questions? */}
              <div className="rounded-3xl border border-stone-200/60 bg-[#faf6ef] p-5 sm:p-7 shadow-sm relative overflow-hidden flex flex-row items-center justify-between gap-3">
                <div className="space-y-2 z-10">
                  <h3 className="font-bengali text-xl sm:text-2xl font-bold text-stone-900" style={SERIF_BN}>
                    {bn ? 'প্রশ্ন আছে?' : 'Have questions?'}
                  </h3>
                  <p className="text-xs text-stone-600 font-bengali">
                    {bn ? 'আমরা আপনাকে সাহায্য করতে প্রস্তুত।' : "We're here to help you."}
                  </p>
                  <div className="pt-1.5">
                    <Link
                      to="/contact"
                      className="inline-flex items-center gap-2 rounded-xl border border-[#c2410c] bg-white hover:bg-orange-50 px-4 py-2 font-bengali text-xs font-bold text-[#c2410c] shadow-sm transition-all"
                    >
                      <FaPhone className="h-3.5 w-3.5" />
                      <span>{bn ? 'যোগাযোগ করুন' : 'Contact Us'}</span>
                    </Link>
                  </div>
                </div>

                {/* Illustration Graphic: Orange Heart & Hands */}
                <div className="relative shrink-0 flex items-center justify-center">
                  <div className="relative flex flex-col items-center">
                    <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-[#c2410c] text-white flex items-center justify-center shadow-md mb-1">
                      <FaHeart className="h-6 w-6 sm:h-8 sm:w-8" />
                    </div>
                    <svg width="90" height="45" viewBox="0 0 100 50" fill="none" stroke="#c2410c" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M20 45 C20 28, 25 15, 30 15 C35 15, 35 28, 35 45" />
                      <path d="M40 45 C40 22, 45 10, 50 10 C55 10, 55 22, 55 45" />
                      <path d="M60 45 C60 28, 65 15, 70 15 C75 15, 75 28, 75 45" />
                    </svg>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* ── 3. BOTTOM DARK GREEN CTA BANNER ─────────────────────────── */}
      <section className="relative bg-gradient-to-r from-[#0f392b] via-[#085450] to-[#0a2e23] py-12 sm:py-16 md:py-20 text-white overflow-hidden">
        {/* Decorative Background Leaf Glow */}
        <div className="absolute right-0 bottom-0 opacity-20 pointer-events-none translate-x-12 translate-y-12">
          <svg width="320" height="320" viewBox="0 0 100 100" fill="none" stroke="currentColor" className="text-emerald-300">
            <path d="M10 90 Q 50 10 90 90" strokeWidth="2" />
            <path d="M50 50 Q 30 30 20 40" strokeWidth="2" />
            <path d="M50 40 Q 70 20 80 30" strokeWidth="2" />
          </svg>
        </div>

        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 md:px-10 relative z-10">
          <div className="max-w-3xl space-y-4 text-center md:text-left">
            <h2
              className="font-bengali text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight"
              style={SERIF_BN}
            >
              {bn ? 'একসাথে, আমরা গড়ে তুলবো এক সুন্দর আগামী।' : 'Together, we can create a better tomorrow.'}
            </h2>

            <p className="font-bengali text-emerald-100/90 text-sm sm:text-lg max-w-2xl mx-auto md:mx-0 leading-relaxed">
              {bn
                ? 'আপনার আজকের সামান্য সহমর্মিতা ও অবদান অসংখ্য মানুষের জীবনকে বদলে দিতে পারে।'
                : 'Your support today can transform countless lives across our communities.'}
            </p>

            <div className="pt-3 flex flex-col sm:flex-row items-center justify-center md:justify-start gap-3 sm:gap-4">
              <Link
                to="/impacts"
                className="w-full sm:w-auto text-center px-7 py-3.5 rounded-full border border-emerald-400/50 hover:bg-white hover:text-[#0f392b] text-white font-bengali text-sm font-bold transition-all duration-300 shadow-sm"
              >
                {bn ? 'আমাদের কাজ দেখুন' : 'Explore Our Work'}
              </Link>

              <Link
                to="/donate"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-full bg-[#c2410c] hover:bg-[#9a3412] text-white font-bengali text-sm font-bold transition-all duration-300 shadow-xl hover:-translate-y-0.5"
              >
                <FaHeart className="w-4 h-4 text-amber-200" />
                <span>{bn ? 'এখনই দান করুন' : 'Donate Now'}</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
