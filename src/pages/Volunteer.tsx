import { useState } from 'react';
import { Link } from 'react-router-dom';
import { VOLUNTEER_PROGRAM_OPTIONS } from '@/data/content';
import { supabase } from '@/lib/supabase';
import { useT } from '@/i18n';
import { useSEO } from '@/hooks/useSEO';
import { SEO } from '@/data/seoConfig';
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
  useSEO(SEO['/volunteer']);
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
      <section className="page-hero relative overflow-hidden pb-16 pt-12 md:pb-[86px] md:pt-[76px]">
        {/* Left Decorative Botanical Leaf SVG */}
        <div className="absolute left-2 top-8 opacity-30 pointer-events-none hidden md:block">
          <svg width="60" height="140" viewBox="0 0 60 140" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 10C20 40 40 70 50 130" stroke="#ffc800" strokeWidth="2" strokeLinecap="round" />
            <path d="M15 25C2 22 2 12 15 25Z" fill="#ffc800" />
            <path d="M22 45C8 40 5 28 22 45Z" fill="#ffc800" />
            <path d="M30 70C15 62 10 50 30 70Z" fill="#ffc800" />
            <path d="M38 95C22 88 18 75 38 95Z" fill="#ffc800" />
          </svg>
        </div>

        <div className="mx-auto max-w-[1240px] px-6 md:px-10">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-12 items-center">
            
            {/* Left Copy */}
            <div className="md:col-span-7 space-y-4">
              <div className="relative inline-block">
                <h1 className="h-display text-white">
                  Become a <span className="text-site-yellow">volunteer</span>
                </h1>
              </div>

              <p className="font-dmsans text-[16px] text-white/70 max-w-xl leading-[1.8]">
                {t('volunteer.subtitle')}
              </p>

              {/* Trust Badges */}
              <div className="pt-2 sm:pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-site-yellow">
                    <FaUsers className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-bengali text-[13px] font-bold text-white">{bn ? 'সামাজিক প্রভাব' : 'Social Impact'}</h4>
                    <p className="font-bengali text-[11.5px] text-white/60">{bn ? 'সরাসরি জনসেবা' : 'Direct Community Service'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:border-l sm:border-white/15 sm:pl-6">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-site-yellow">
                    <FaGraduationCap className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-bengali text-[13px] font-bold text-white">{bn ? 'দক্ষতা বৃদ্ধি' : 'Skill Building'}</h4>
                    <p className="font-bengali text-[11.5px] text-white/60">{bn ? 'বাস্তব অভিজ্ঞতা' : 'Real-world Experience'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Hero Visual Badge */}
            <div className="hidden md:flex md:col-span-5 relative items-center justify-center">
              <div className="absolute inset-0 bg-site-sand-3/40 rounded-full blur-3xl" />

              <div className="relative z-10 flex flex-col items-center">
                <div className="relative flex h-44 w-44 items-center justify-center rounded-full bg-white/10">
                  <FaHandHoldingHeart className="h-20 w-20 text-white" />
                </div>

                <div className="mt-6 rounded-card bg-white p-5 border border-site-line flex items-center gap-3.5 max-w-xs transform translate-x-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-site-cream text-site-green">
                    <FaHeart className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-bengali text-xs font-bold text-site-ink leading-snug">
                      {bn ? 'সমাজে ইতিবাচক পরিবর্তন আনুন।' : 'Create a positive impact in society.'}
                    </p>
                    <p className="font-dmsans italic text-[11.5px] text-site-muted mt-1">
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
      <section className="bg-site-cream pb-16 pt-12 md:pb-20 md:pt-16">
        <div className="mx-auto max-w-[1240px] px-3.5 sm:px-6 md:px-10">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">

            {/* LEFT COLUMN: APPLICATION FORM (7 cols) ─────────────── */}
            <div className="lg:col-span-7 flex flex-col">
              <div className="rounded-panel bg-white p-5 sm:p-8 md:p-9 border border-site-line space-y-6 h-full flex flex-col justify-between">
                
                <div className="border-b border-site-line pb-4">
                  <div className="font-dmmono text-xs font-bold uppercase tracking-wider text-[var(--green)]">
                    {bn ? 'আবেদন ফর্ম' : 'APPLICATION FORM'}
                  </div>
                  <h2 className="mt-1 font-archivo text-2xl sm:text-3xl font-bold text-site-ink">
                    {bn ? 'আপনার তথ্য পূরণ করুন।' : 'Fill in your details.'}
                  </h2>
                </div>

                {status === 'sent' ? (
                  <div className="rounded-card border border-site-line bg-site-cream p-8 text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-site-green text-white">
                      <FaCheck className="h-6 w-6" />
                    </div>
                    <h3 className="font-bengali text-lg font-bold text-site-green" style={SERIF_BN}>
                      {bn ? 'আবেদন জমা হয়েছে।' : 'Application submitted.'}
                    </h3>
                    <p className="mt-1 font-bengali text-sm text-site-green">
                      {t('volunteer.success')}
                    </p>
                    <button
                      type="button"
                      onClick={() => setStatus('idle')}
                      className="mt-5 rounded-full bg-site-green px-6 py-2 font-dmmono text-xs font-bold text-white uppercase tracking-wider hover:bg-site-green transition-colors"
                    >
                      {bn ? 'আরেকটি আবেদন' : 'Apply again'}
                    </button>
                  </div>
                ) : (
                  <form onSubmit={submit} className="space-y-4 flex-1 flex flex-col justify-between">
                    {/* Full Name */}
                    <div>
                      <label className="mb-1 block font-bengali text-xs font-bold text-site-soft">
                        {bn ? 'পূর্ণ নাম *' : 'FULL NAME *'}
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-site-faint">
                          <FaUser className="h-3.5 w-3.5" />
                        </span>
                        <input
                          required
                          value={form.name}
                          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                          placeholder={bn ? 'আপনার পূর্ণ নাম' : 'Your full name'}
                          className="site-input font-bengali pl-12"
                        />
                      </div>
                    </div>

                    {/* Email & Phone */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block font-bengali text-xs font-bold text-site-soft">
                          {bn ? 'ইমেল' : 'EMAIL'}
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-site-faint">
                            <FaEnvelope className="h-3.5 w-3.5" />
                          </span>
                          <input
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                            placeholder={bn ? 'আপনার ইমেল' : 'Your email'}
                            className="site-input font-bengali pl-12"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-1 block font-bengali text-xs font-bold text-site-soft">
                          {bn ? 'ফোন *' : 'PHONE *'}
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-site-faint">
                            <FaPhone className="h-3.5 w-3.5" />
                          </span>
                          <input
                            type="tel"
                            required
                            value={form.phone}
                            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                            placeholder={bn ? 'মোবাইল নম্বর' : 'Mobile number'}
                            className="site-input font-bengali pl-12"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Area of Interest */}
                    <div>
                      <label className="mb-1 block font-bengali text-xs font-bold text-site-soft">
                        {bn ? 'আগ্রহের ক্ষেত্র' : 'AREA OF INTEREST'}
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-site-faint">
                          <FaHandshake className="h-3.5 w-3.5" />
                        </span>
                        <select
                          value={form.area}
                          onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))}
                          className="site-select font-bengali pl-12"
                        >
                          {VOLUNTEER_PROGRAM_OPTIONS.map((o) => (
                            <option key={o.en} value={o.en}>{o[lang]}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Motivation / Experience */}
                    <div>
                      <label className="mb-1 block font-bengali text-xs font-bold text-site-soft">
                        {bn ? 'আপনার প্রেরণা / অভিজ্ঞতা' : 'YOUR MOTIVATION / EXPERIENCE'}
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-3 text-site-faint">
                          <FaCommentDots className="h-3.5 w-3.5" />
                        </span>
                        <textarea
                          rows={4}
                          value={form.message}
                          onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                          placeholder={bn ? 'আপনার প্রেরণা ও অভিজ্ঞতা লিখুন…' : 'Share your motivation and experience...'}
                          className="site-textarea font-bengali pl-12 resize-none"
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
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-site-line text-[var(--green)] focus:ring-[var(--green)]"
                      />
                      <label htmlFor="agreeVolunteer" className="text-xs text-site-soft font-bengali cursor-pointer leading-snug">
                        {bn ? 'আমি সংস্থার নিয়ম ও নির্দেশাবলী মেনে চলতে সম্মত।' : "I agree to abide by the Organization's rules and guidelines."}
                      </label>
                    </div>

                    {error && (
                      <p className="font-bengali text-xs text-site-blood font-semibold">{error}</p>
                    )}

                    {/* Submit Button */}
                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={status === 'sending'}
                        className="group w-full inline-flex items-center justify-center gap-3 rounded-full bg-[var(--green)] hover:bg-[var(--green-2)] text-white font-bengali text-base font-bold py-3.5 px-8 transition-all disabled:opacity-60"
                      >
                        <span>{status === 'sending' ? t('volunteer.submitting') : (bn ? 'আবেদন জমা দিন' : 'SUBMIT APPLICATION')}</span>
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[var(--green)]">
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
              <div className="rounded-panel border border-site-line bg-[var(--cream)] p-5 sm:p-6 space-y-4">
                <div className="relative inline-block">
                  <h3 className="font-bengali text-2xl font-bold text-site-ink" style={SERIF_BN}>
                    {bn ? 'কেন স্বেচ্ছাসেবক হবেন?' : 'Why Volunteer?'}
                  </h3>
                  <div className="mt-1 h-0.5 w-10 bg-[var(--green)] rounded-full" />
                </div>

                <div className="space-y-4">
                  {/* Item 1 */}
                  <div className="flex items-start gap-3.5 sm:gap-4">
                    <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full bg-white border border-site-line text-[var(--green)]">
                      <FaHeart className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div>
                      <h4 className="font-bengali text-sm font-bold text-site-ink">
                        {bn ? 'সরাসরি সমাজের উপকারে আসুন' : 'Make a direct impact'}
                      </h4>
                      <p className="font-bengali text-xs text-site-muted mt-0.5 leading-relaxed">
                        {bn ? 'সমাজে ইতিবাচক পরিবর্তন আনুন' : 'Create positive change in the community'}
                      </p>
                    </div>
                  </div>

                  {/* Item 2 */}
                  <div className="flex items-start gap-3.5 sm:gap-4">
                    <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full bg-white border border-site-line text-[var(--green)]">
                      <FaGraduationCap className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div>
                      <h4 className="font-bengali text-sm font-bold text-site-ink">
                        {bn ? 'নতুন দক্ষতা ও অভিজ্ঞতা অর্জন করুন' : 'Gain new skills & experiences'}
                      </h4>
                      <p className="font-bengali text-xs text-site-muted mt-0.5 leading-relaxed">
                        {bn ? 'শিখুন, বাড়ুন এবং আপনার দক্ষতা বৃদ্ধি করুন' : 'Learn, grow and enhance your abilities'}
                      </p>
                    </div>
                  </div>

                  {/* Item 3 */}
                  <div className="flex items-start gap-3.5 sm:gap-4">
                    <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full bg-white border border-site-line text-[var(--green)]">
                      <FaUsers className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div>
                      <h4 className="font-bengali text-sm font-bold text-site-ink">
                        {bn ? 'একটি উৎসাহী দলের অংশ হোন' : 'Be part of a passionate team'}
                      </h4>
                      <p className="font-bengali text-xs text-site-muted mt-0.5 leading-relaxed">
                        {bn ? 'সমমনা ও যত্নশীল মানুষের সাথে কাজ করুন' : 'Work with like-minded and caring individuals'}
                      </p>
                    </div>
                  </div>

                  {/* Item 4 */}
                  <div className="flex items-start gap-3.5 sm:gap-4">
                    <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full bg-white border border-site-line text-[var(--green)]">
                      <FaSeedling className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div>
                      <h4 className="font-bengali text-sm font-bold text-site-ink">
                        {bn ? 'সবুজ ও শক্তিশালী সমাজ গঠনে অবদান রাখুন' : 'Contribute to a greener, stronger society'}
                      </h4>
                      <p className="font-bengali text-xs text-site-muted mt-0.5 leading-relaxed">
                        {bn ? 'সকলের জন্য একটি টেকসই ভবিষ্যৎ গড়তে সাহায্য করুন' : 'Help build a sustainable future for all'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Programme Areas */}
              <div className="rounded-panel border border-site-line bg-[var(--cream)] p-5 sm:p-7 space-y-4">
                <h3 className="font-bengali text-2xl font-bold text-site-ink" style={SERIF_BN}>
                  {bn ? 'কার্যক্রম ক্ষেত্র' : 'Programme Areas'}
                </h3>

                <div className="flex flex-wrap gap-2.5 pt-1">
                  {VOLUNTEER_PROGRAM_OPTIONS.map((o) => (
                    <span
                      key={o.en}
                      className="rounded-full bg-[var(--cream)] border border-[var(--line)] px-4 py-2 font-bengali text-xs font-semibold text-[var(--green)] hover:bg-[var(--line)] transition-colors"
                    >
                      {o[lang]}
                    </span>
                  ))}
                </div>
              </div>

              {/* Card 3: Have questions? */}
              <div className="rounded-panel border border-site-line bg-[var(--cream)] p-5 sm:p-7 relative overflow-hidden flex flex-row items-center justify-between gap-3">
                <div className="space-y-2 z-10">
                  <h3 className="font-bengali text-xl sm:text-2xl font-bold text-site-ink" style={SERIF_BN}>
                    {bn ? 'প্রশ্ন আছে?' : 'Have questions?'}
                  </h3>
                  <p className="text-xs text-site-soft font-bengali">
                    {bn ? 'আমরা আপনাকে সাহায্য করতে প্রস্তুত।' : "We're here to help you."}
                  </p>
                  <div className="pt-1.5">
                    <Link
                      to="/contact"
                      className="inline-flex items-center gap-2 rounded-soft border border-[var(--green)] bg-white hover:bg-site-cream px-4 py-2 font-bengali text-xs font-bold text-[var(--green)] transition-all"
                    >
                      <FaPhone className="h-3.5 w-3.5" />
                      <span>{bn ? 'যোগাযোগ করুন' : 'Contact Us'}</span>
                    </Link>
                  </div>
                </div>

                {/* Illustration Graphic: Orange Heart & Hands */}
                <div className="relative shrink-0 flex items-center justify-center">
                  <div className="relative flex flex-col items-center">
                    <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-[var(--green)] text-white flex items-center justify-center mb-1">
                      <FaHeart className="h-6 w-6 sm:h-8 sm:w-8" />
                    </div>
                    <svg width="90" height="45" viewBox="0 0 100 50" fill="none" stroke="var(--green)" strokeWidth="1.5" strokeLinecap="round">
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
    </PageShell>
  );
}
