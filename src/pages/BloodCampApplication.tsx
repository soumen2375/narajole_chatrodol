import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useT } from '@/i18n';
import { useSEO } from '@/hooks/useSEO';
import { SEO } from '@/data/seoConfig';
import { PageShell, SERIF_BN } from './_field-journal';
import Breadcrumb from '@/components/ui/Breadcrumb';
import {
  FaUser,
  FaBookmark,
  FaPhone,
  FaEnvelope,
  FaCalendarDays,
  FaUsers,
  FaLocationDot,
  FaCommentDots,
  FaCheck,
  FaArrowRight,
  FaHeart,
  FaTent,
  FaUserDoctor,
  FaFileCircleCheck,
  FaBullhorn,
} from 'react-icons/fa6';

export default function BloodCampApplication() {
  const { t, lang } = useT();
  const bn = lang === 'bn';
  useSEO(SEO['/organise-blood-camp']);
  const [form, setForm] = useState({
    org_name: '',
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    proposed_date: '',
    proposed_venue: '',
    expected_donors: '',
    message: '',
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const set = (k: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    const { error } = await supabase.from('cswo_blood_camp_applications').insert({
      org_name: form.org_name || null,
      contact_name: form.contact_name,
      contact_phone: form.contact_phone,
      contact_email: form.contact_email || null,
      proposed_date: form.proposed_date || null,
      proposed_venue: form.proposed_venue,
      expected_donors: Number(form.expected_donors) || null,
      message: form.message || null,
      status: 'pending',
    });
    setStatus(error ? 'error' : 'sent');
  };

  return (
    <PageShell>
      <Breadcrumb title={bn ? 'রক্তদান শিবির আয়োজন' : 'Organise a Blood Camp'} />

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

        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 md:px-10">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-12 items-center">
            {/* Left Hero Copy */}
            <div className="md:col-span-7 space-y-4">
              <div className="relative inline-block">
                <h1
                  className="h-display text-white"
                >
                  Organise a <span className="text-site-yellow">blood camp</span>
                </h1>
              </div>

              <p className="font-dmsans text-[16px] text-white/70 max-w-xl leading-[1.8]">
                {t('blood.campSubtitle')}
              </p>

              {/* Trust Badges */}
              <div className="pt-2 sm:pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-site-yellow">
                    <FaUserDoctor className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-bengali text-[13px] font-bold text-white">
                      {bn ? 'মেডিকেল টিম সহায়তা' : 'Full Medical Support'}
                    </h4>
                    <p className="font-bengali text-[11.5px] text-white/60">
                      {bn ? 'দক্ষ চিকিৎসক ও টিম' : 'Expert doctors & team'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:border-l sm:border-white/15 sm:pl-6">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-site-yellow">
                    <FaFileCircleCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-bengali text-[13px] font-bold text-white">
                      {bn ? 'সার্টিফিকেট ও সম্মাননা' : 'Certificates & Badges'}
                    </h4>
                    <p className="font-bengali text-[11.5px] text-white/60">
                      {bn ? 'রক্তদাতাদের জন্য' : 'For all blood donors'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Hero Visual Badge */}
            <div className="hidden md:flex md:col-span-5 relative items-center justify-center">
              <div className="absolute inset-0 bg-site-sand-3/40 rounded-full blur-3xl" />

              <div className="relative z-10 flex flex-col items-center">
                <div className="relative flex h-44 w-44 items-center justify-center rounded-full bg-white/10">
                  <div className="flex flex-col items-center justify-center text-white">
                    <FaTent className="h-16 w-16" />
                    <FaHeart className="h-6 w-6 text-site-yellow -mt-2" />
                  </div>
                </div>

                <div className="mt-6 rounded-card bg-white p-5 border border-site-line flex items-center gap-3.5 max-w-xs transform translate-x-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-site-cream text-site-green">
                    <FaTent className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-bengali text-xs font-bold text-site-ink leading-snug">
                      {bn ? 'আপনার এলাকায় রক্তদান শিবির আয়োজন করুন।' : 'Host a life-saving camp in your area.'}
                    </p>
                    <p className="font-dmsans italic text-[11.5px] text-site-muted mt-1">
                      {bn ? 'আমরা সম্পূর্ণ সহায়তা প্রদান করি! ♡' : 'We provide end-to-end guidance! ♡'}
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
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
            
            {/* LEFT COLUMN: BLOOD CAMP APPLICATION FORM (7 cols) ──── */}
            <div className="lg:col-span-7 flex flex-col">
              <div className="rounded-panel bg-white p-5 sm:p-7 md:p-8 border border-site-line space-y-5 h-full flex flex-col justify-between">
                <div>
                  <div className="font-dmmono text-xs font-bold uppercase tracking-wider text-[var(--green)]">
                    {bn ? 'শিবির আবেদনের তথ্য' : 'CAMP APPLICATION DETAILS'}
                  </div>
                  <h2 className="mt-1 font-archivo text-2xl sm:text-3xl font-bold text-site-ink">
                    {bn ? 'আপনার বিবরণ শেয়ার করুন।' : 'Share your organization details.'}
                  </h2>
                </div>

                {status === 'sent' ? (
                  <div className="rounded-card border border-site-line bg-site-cream p-8 text-center my-auto">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-site-green text-white">
                      <FaCheck className="h-6 w-6" />
                    </div>
                    <h3 className="font-bengali text-lg font-bold text-site-green" style={SERIF_BN}>
                      {bn ? 'আবেদন গৃহীত হয়েছে!' : 'Application Received!'}
                    </h3>
                    <p className="mt-1 font-bengali text-sm text-site-green">
                      {t('blood.submitSuccess')}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setStatus('idle');
                        setForm({
                          org_name: '',
                          contact_name: '',
                          contact_phone: '',
                          contact_email: '',
                          proposed_date: '',
                          proposed_venue: '',
                          expected_donors: '',
                          message: '',
                        });
                      }}
                      className="mt-5 rounded-full bg-site-green px-6 py-2 font-dmmono text-xs font-bold text-white uppercase tracking-wider hover:bg-site-green transition-colors"
                    >
                      {bn ? 'আরেকটি আবেদন' : 'Submit Another'}
                    </button>
                  </div>
                ) : (
                  <form onSubmit={submit} className="space-y-3.5 flex-1 flex flex-col justify-between pt-1">
                    {/* Organization Name */}
                    <div>
                      <label className="mb-1 block font-bengali text-xs font-bold text-site-soft">
                        {t('blood.orgName')}
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-site-faint">
                          <FaBookmark className="h-3.5 w-3.5" />
                        </span>
                        <input
                          value={form.org_name}
                          onChange={set('org_name')}
                          placeholder={bn ? 'সংগঠন / প্রতিষ্ঠানের নাম (যদি থাকে)' : 'Organization / Club name (if any)'}
                          className="site-input font-bengali pl-12"
                        />
                      </div>
                    </div>

                    {/* Contact Name & Phone */}
                    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block font-bengali text-xs font-bold text-site-soft">
                          {bn ? 'যোগাযোগকারীর নাম *' : 'Contact Name *'}
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-site-faint">
                            <FaUser className="h-3.5 w-3.5" />
                          </span>
                          <input
                            required
                            value={form.contact_name}
                            onChange={set('contact_name')}
                            placeholder={bn ? 'আপনার পুরো নাম' : 'Your full name'}
                            className="site-input font-bengali pl-12"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-1 block font-bengali text-xs font-bold text-site-soft">
                          {t('blood.contactPhone')} *
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-site-faint">
                            <FaPhone className="h-3.5 w-3.5" />
                          </span>
                          <input
                            required
                            type="tel"
                            value={form.contact_phone}
                            onChange={set('contact_phone')}
                            placeholder={bn ? 'ফোন নম্বর' : 'Phone number'}
                            className="site-input font-bengali pl-12"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Contact Email & Proposed Date */}
                    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block font-bengali text-xs font-bold text-site-soft">
                          {bn ? 'ইমেল' : 'Email'}
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-site-faint">
                            <FaEnvelope className="h-3.5 w-3.5" />
                          </span>
                          <input
                            type="email"
                            value={form.contact_email}
                            onChange={set('contact_email')}
                            placeholder={bn ? 'ইমেল ঠিকানা' : 'Email address'}
                            className="site-input font-bengali pl-12"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-1 block font-bengali text-xs font-bold text-site-soft">
                          {t('blood.proposedDate')}
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-site-faint">
                            <FaCalendarDays className="h-3.5 w-3.5" />
                          </span>
                          <input
                            type="date"
                            value={form.proposed_date}
                            onChange={set('proposed_date')}
                            className="site-input font-bengali pl-12"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Expected Donors & Proposed Venue */}
                    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block font-bengali text-xs font-bold text-site-soft">
                          {t('blood.expectedDonors')}
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-site-faint">
                            <FaUsers className="h-3.5 w-3.5" />
                          </span>
                          <input
                            type="number"
                            min="10"
                            value={form.expected_donors}
                            onChange={set('expected_donors')}
                            placeholder="50"
                            className="site-input font-bengali pl-12"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-1 block font-bengali text-xs font-bold text-site-soft">
                          {t('blood.proposedVenue')} *
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-site-faint">
                            <FaLocationDot className="h-3.5 w-3.5" />
                          </span>
                          <input
                            required
                            value={form.proposed_venue}
                            onChange={set('proposed_venue')}
                            placeholder={bn ? 'প্রস্তাবিত স্থান ও ঠিকানা' : 'Proposed venue and address'}
                            className="site-input font-bengali pl-12"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Additional Message */}
                    <div>
                      <label className="mb-1 block font-bengali text-xs font-bold text-site-soft">
                        {bn ? 'অতিরিক্ত বার্তা' : 'Additional Message'}
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-3 text-site-faint">
                          <FaCommentDots className="h-3.5 w-3.5" />
                        </span>
                        <textarea
                          rows={3}
                          value={form.message}
                          onChange={set('message')}
                          placeholder={bn ? 'যেকোনো বিশেষ প্রয়োজনীয়তা বা বিবরণ…' : 'Any special requirements or details...'}
                          className="site-textarea font-bengali pl-12 resize-none"
                        />
                      </div>
                    </div>

                    {status === 'error' && (
                      <div className="rounded-soft border border-site-blood/40 bg-site-cream p-3.5 text-site-blood">
                        <p className="font-bengali text-xs font-semibold">
                          {bn ? '⚠ আবেদন জমা দিতে সমস্যা হয়েছে।' : '⚠ Could not submit your application.'}
                        </p>
                      </div>
                    )}

                    {/* Submit Button */}
                    <div className="pt-1">
                      <button
                        type="submit"
                        disabled={status === 'sending'}
                        className="group w-full inline-flex items-center justify-center gap-3 rounded-full bg-[var(--green)] hover:bg-[var(--green-2)] text-white font-bengali text-base font-bold py-3.5 px-8 transition-all disabled:opacity-60"
                      >
                        <span>{status === 'sending' ? (bn ? 'পাঠানো হচ্ছে…' : 'Submitting…') : (bn ? 'আবেদন জমা দিন' : 'Submit Request')}</span>
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
            <div className="lg:col-span-5 flex flex-col justify-between space-y-4 h-full">
              
              {/* Card 1: What We Provide */}
              <div className="rounded-panel border border-site-line bg-[var(--cream)] p-4 sm:p-5 space-y-3">
                <div className="relative inline-block">
                  <h3 className="font-bengali text-xl sm:text-2xl font-bold text-site-ink" style={SERIF_BN}>
                    {bn ? 'আমরা যা প্রদান করি' : 'What We Provide'}
                  </h3>
                  <div className="mt-1 h-0.5 w-10 bg-[var(--green)] rounded-full" />
                </div>

                <div className="space-y-3">
                  {[
                    { icon: FaUsers, title: bn ? 'রক্তদাতা নিয়োগ ও ব্যবস্থাপনা' : 'Donor recruitment & management', sub: bn ? 'উৎসাহী দাতা সংগ্রহ' : 'Active community support' },
                    { icon: FaUserDoctor, title: bn ? 'মেডিকেল টিম সহায়তা' : 'Medical team support', sub: bn ? 'অভিজ্ঞ চিকিৎসক দল' : 'Certified health team' },
                    { icon: FaFileCircleCheck, title: bn ? 'সার্টিফিকেট ও সম্মাননা' : 'Certificates & recognition', sub: bn ? 'সকল রক্তদাতাদের জন্য' : 'For all blood donors' },
                    { icon: FaBullhorn, title: bn ? 'প্রচার ও মিডিয়া কভারেজ' : 'Promotion & coverage', sub: bn ? 'সামাজিক প্রচার সহায়তা' : 'Social media promotion' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white border border-site-line text-[var(--green)]">
                        <item.icon className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <h4 className="font-bengali text-xs sm:text-sm font-bold text-site-ink">{item.title}</h4>
                        <p className="font-bengali text-[11px] text-site-muted">{item.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 2: Have questions? */}
              <div className="rounded-panel border border-site-line bg-[var(--cream)] p-4 sm:p-5 relative overflow-hidden flex flex-row items-center justify-between gap-3">
                <div className="space-y-1.5 z-10">
                  <h3 className="font-bengali text-lg sm:text-xl font-bold text-site-ink" style={SERIF_BN}>
                    {bn ? 'প্রশ্ন আছে?' : 'Have questions?'}
                  </h3>
                  <p className="text-xs text-site-soft font-bengali">
                    {bn ? 'আমরা আপনাকে সাহায্য করতে প্রস্তুত।' : "We're here to help you."}
                  </p>
                  <div className="pt-1">
                    <Link
                      to="/contact"
                      className="inline-flex items-center gap-2 rounded-soft border border-[var(--green)] bg-white hover:bg-site-cream px-3.5 py-1.5 font-bengali text-xs font-bold text-[var(--green)] transition-all"
                    >
                      <FaPhone className="h-3 w-3" />
                      <span>{bn ? 'যোগাযোগ করুন' : 'Contact Us'}</span>
                    </Link>
                  </div>
                </div>

                {/* Illustration Graphic: Orange Heart & Hands */}
                <div className="relative shrink-0 flex items-center justify-center">
                  <div className="relative flex flex-col items-center">
                    <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-full bg-[var(--green)] text-white flex items-center justify-center mb-0.5">
                      <FaHeart className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                    <svg width="80" height="38" viewBox="0 0 100 50" fill="none" stroke="var(--green)" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M20 45 C20 28, 25 15, 30 15 C35 15, 35 28, 35 45" />
                      <path d="M40 45 C40 22, 45 10, 50 10 C55 10, 55 22, 55 45" />
                      <path d="M60 45 C60 28, 65 15, 70 15 C75 15, 75 28, 75 45" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Card 3: Dark Green CTA Banner Card */}
              <div className="rounded-panel bg-site-green p-4 sm:p-5 text-white relative overflow-hidden space-y-2.5">
                {/* Background Leaf Glow */}
                <div className="absolute right-0 bottom-0 opacity-15 pointer-events-none translate-x-8 translate-y-8">
                  <svg width="160" height="160" viewBox="0 0 100 100" fill="none" stroke="currentColor" className="text-white/70">
                    <path d="M10 90 Q 50 10 90 90" strokeWidth="2" />
                    <path d="M50 50 Q 30 30 20 40" strokeWidth="2" />
                    <path d="M50 40 Q 70 20 80 30" strokeWidth="2" />
                  </svg>
                </div>

                <div className="relative z-10 space-y-2.5">
                  <h3
                    className="font-bengali text-lg sm:text-xl font-bold tracking-tight text-white leading-snug"
                    style={SERIF_BN}
                  >
                    {bn ? 'একসাথে, আমরা গড়ে তুলবো এক সুন্দর আগামী।' : 'Together, we can create a better tomorrow.'}
                  </h3>

                  <p className="font-bengali text-white/70 text-xs leading-relaxed">
                    {bn
                      ? 'আপনার আজকের সামান্য সহমর্মিতা ও অবদান অসংখ্য মানুষের জীবনকে বদলে দিতে পারে।'
                      : 'Your support today can transform countless lives across our communities.'}
                  </p>

                  <div className="pt-1 flex flex-wrap items-center gap-2">
                    <Link
                      to="/impacts"
                      className="px-3.5 py-1.5 rounded-full border border-site-line hover:bg-white hover:text-[var(--green)] text-white font-bengali text-xs font-bold transition-all duration-300"
                    >
                      {bn ? 'আমাদের কাজ দেখুন' : 'Explore Our Work'}
                    </Link>

                    <Link
                      to="/donate"
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[var(--green)] hover:bg-[var(--green-2)] text-white font-bengali text-xs font-bold transition-all duration-300"
                    >
                      <FaHeart className="w-3 h-3 text-site-yellow" />
                      <span>{bn ? 'এখনই দান করুন' : 'Donate Now'}</span>
                    </Link>
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
