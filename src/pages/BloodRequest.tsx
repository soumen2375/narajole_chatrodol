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
  FaPhone,
  FaDroplet,
  FaHospital,
  FaCalendarDays,
  FaCommentDots,
  FaCheck,
  FaArrowRight,
  FaHeart,
  FaClock,
  FaShieldHalved,
  FaHashtag,
  FaCalendarCheck,
} from 'react-icons/fa6';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];

export default function BloodRequest() {
  const { t, lang } = useT();
  const bn = lang === 'bn';
  useSEO(SEO['/blood-request']);
  const [form, setForm] = useState({
    patient_name: '',
    blood_group: '',
    hospital: '',
    contact_phone: '',
    units_needed: '1',
    required_by: '',
    requester_name: '',
    message: '',
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errMsg, setErrMsg] = useState('');

  const set = (k: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setErrMsg('');
    const { error } = await supabase.from('cswo_blood_requests').insert({
      patient_name: form.patient_name,
      blood_group: form.blood_group,
      hospital: form.hospital,
      contact_phone: form.contact_phone,
      units_needed: Number(form.units_needed) || 1,
      required_by: form.required_by || null,
      requester_name: form.requester_name || null,
      message: form.message || null,
      status: 'open',
    });
    if (error) {
      setErrMsg(
        error.message ||
          (bn ? 'আবেদন জমা দিতে সমস্যা হয়েছে।' : 'Could not submit your request. Please try again.')
      );
    }
    setStatus(error ? 'error' : 'sent');
  };

  return (
    <PageShell>
      <Breadcrumb title={bn ? 'জরুরি রক্তের আবেদন' : 'Emergency Blood Request'} />

      {/* ── 1. HERO SECTION ───────────────────────────────────────────── */}
      <section className="page-hero relative overflow-hidden pb-16 pt-12 md:pb-[86px] md:pt-[76px]" style={{ background: 'var(--blood)' }}>
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
                  Request <span className="text-site-yellow">blood</span>
                </h1>
              </div>

              <p className="font-dmsans text-[16px] text-white/70 max-w-xl leading-[1.8]">
                {t('blood.requestSubtitle')}
              </p>

              {/* Trust Badges */}
              <div className="pt-2 sm:pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-site-yellow">
                    <FaClock className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-bengali text-[13px] font-bold text-white">
                      {bn ? '২৪/৭ জরুরি সাড়া' : '24/7 Rapid Response'}
                    </h4>
                    <p className="font-bengali text-[11.5px] text-white/60">
                      {bn ? '২-৪ ঘণ্টার মধ্যে যোগাযোগ' : 'Action within 2-4 hours'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:border-l sm:border-white/15 sm:pl-6">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-site-yellow">
                    <FaShieldHalved className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-bengali text-[13px] font-bold text-white">
                      {bn ? 'যাচাইকৃত রক্তদাতা' : 'Verified Donors'}
                    </h4>
                    <p className="font-bengali text-[11.5px] text-white/60">
                      {bn ? 'নিরাপদ রক্তের সেবা' : 'Trusted community registry'}
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
                    <FaDroplet className="h-16 w-16" />
                    <FaHeart className="h-6 w-6 text-white/75 -mt-2" />
                  </div>
                </div>

                <div className="mt-6 rounded-card bg-white p-5 border border-site-line flex items-center gap-3.5 max-w-xs transform translate-x-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-site-cream text-site-blood">
                    <FaDroplet className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-bengali text-xs font-bold text-site-ink leading-snug">
                      {bn ? 'রক্তদান জীবনের সেরা দান।' : 'Every blood drop saves a precious life.'}
                    </p>
                    <p className="font-dmsans italic text-[11.5px] text-site-muted mt-1">
                      {bn ? 'জরুরি সেবায় আমরা পাশে আছি ♡' : 'We are here when you need us most ♡'}
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
            {/* LEFT COLUMN: BLOOD REQUEST FORM (7 cols) ─────────────── */}
            <div className="lg:col-span-7 flex flex-col">
              <div className="rounded-panel bg-white p-5 sm:p-8 md:p-9 border border-site-line space-y-6 h-full flex flex-col justify-between">
                <div className="border-b border-site-line pb-4">
                  <div className="font-dmmono text-xs font-bold uppercase tracking-wider text-[var(--green)]">
                    {bn ? 'জরুরি রক্তের আবেদন' : 'EMERGENCY BLOOD REQUEST'}
                  </div>
                  <h2 className="mt-1 font-archivo text-2xl sm:text-3xl font-bold text-site-ink">
                    {bn ? 'রোগীর তথ্য পূরণ করুন।' : 'Fill in patient details.'}
                  </h2>
                </div>

                {status === 'sent' ? (
                  <div className="rounded-card border border-site-line bg-site-cream p-8 text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-site-green text-white">
                      <FaCheck className="h-6 w-6" />
                    </div>
                    <h3 className="font-bengali text-lg font-bold text-site-green" style={SERIF_BN}>
                      {bn ? 'আবেদন গৃহীত হয়েছে' : 'Request Submitted'}
                    </h3>
                    <p className="mt-1 font-bengali text-sm text-site-green">
                      {t('blood.submitSuccess')}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setStatus('idle');
                        setForm({
                          patient_name: '',
                          blood_group: '',
                          hospital: '',
                          contact_phone: '',
                          units_needed: '1',
                          required_by: '',
                          requester_name: '',
                          message: '',
                        });
                      }}
                      className="mt-5 rounded-full bg-site-green px-6 py-2 font-dmmono text-xs font-bold text-white uppercase tracking-wider hover:bg-site-green transition-colors"
                    >
                      {bn ? 'আরেকটি আবেদন' : 'Submit Another'}
                    </button>
                  </div>
                ) : (
                  <form onSubmit={submit} className="space-y-4 flex-1 flex flex-col justify-between">
                    {/* Patient Name */}
                    <div>
                      <label className="mb-1 block font-bengali text-xs font-bold text-site-soft">
                        {t('blood.patientName')} *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-site-faint">
                          <FaUser className="h-3.5 w-3.5" />
                        </span>
                        <input
                          required
                          value={form.patient_name}
                          onChange={set('patient_name')}
                          placeholder={bn ? 'রোগীর পুরো নাম' : "Patient's full name"}
                          className="site-input font-bengali pl-12"
                        />
                      </div>
                    </div>

                    {/* Blood Group & Units Needed */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block font-bengali text-xs font-bold text-site-soft">
                          {t('blood.bloodGroup')} *
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--green)]">
                            <FaDroplet className="h-3.5 w-3.5" />
                          </span>
                          <select
                            required
                            value={form.blood_group}
                            onChange={set('blood_group')}
                            className="site-select font-bengali pl-12"
                          >
                            <option value="">{bn ? 'রক্তের গ্রুপ বেছে নিন' : 'Select blood group'}</option>
                            {BLOOD_GROUPS.map((g) => (
                              <option key={g} value={g}>
                                {g}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="mb-1 block font-bengali text-xs font-bold text-site-soft">
                          {t('blood.unitsNeeded')}
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-site-faint">
                            <FaHashtag className="h-3.5 w-3.5" />
                          </span>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={form.units_needed}
                            onChange={set('units_needed')}
                            className="site-input font-bengali pl-12"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Hospital & Contact Phone */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block font-bengali text-xs font-bold text-site-soft">
                          {t('blood.hospital')} *
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-site-faint">
                            <FaHospital className="h-3.5 w-3.5" />
                          </span>
                          <input
                            required
                            value={form.hospital}
                            onChange={set('hospital')}
                            placeholder={bn ? 'হাসপাতালের নাম ও স্থান' : 'Hospital name and location'}
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
                            placeholder={bn ? 'যোগাযোগের ফোন নম্বর' : 'Contact phone number'}
                            className="site-input font-bengali pl-12"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Required Date & Requester Name */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block font-bengali text-xs font-bold text-site-soft">
                          {t('blood.requiredDate')}
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-site-faint">
                            <FaCalendarDays className="h-3.5 w-3.5" />
                          </span>
                          <input
                            type="date"
                            value={form.required_by}
                            onChange={set('required_by')}
                            className="site-input font-bengali pl-12"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-1 block font-bengali text-xs font-bold text-site-soft">
                          {bn ? 'আবেদনকারীর নাম' : 'Requester Name'}
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-site-faint">
                            <FaUser className="h-3.5 w-3.5" />
                          </span>
                          <input
                            value={form.requester_name}
                            onChange={set('requester_name')}
                            placeholder={bn ? 'আপনার নাম' : 'Your name'}
                            className="site-input font-bengali pl-12"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Message / Additional Details */}
                    <div>
                      <label className="mb-1 block font-bengali text-xs font-bold text-site-soft">
                        {bn ? 'অতিরিক্ত তথ্য' : 'Additional Info'}
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-3 text-site-faint">
                          <FaCommentDots className="h-3.5 w-3.5" />
                        </span>
                        <textarea
                          rows={3}
                          value={form.message}
                          onChange={set('message')}
                          placeholder={bn ? 'যেকোনো গুরুত্বপূর্ণ বিবরণ বা নির্দেশনা…' : 'Any important details or instructions...'}
                          className="site-textarea font-bengali pl-12 resize-none"
                        />
                      </div>
                    </div>

                    {status === 'error' && (
                      <div className="rounded-soft border border-site-blood/40 bg-site-cream p-3.5 text-site-blood">
                        <p className="font-bengali text-xs font-semibold">
                          {bn ? '⚠ আবেদন জমা দিতে সমস্যা হয়েছে।' : '⚠ Could not submit your request.'}
                        </p>
                        {errMsg && <p className="mt-1 font-dmmono text-[11px]">{errMsg}</p>}
                      </div>
                    )}

                    {/* Submit Button */}
                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={status === 'sending'}
                        className="group w-full inline-flex items-center justify-center gap-3 rounded-full bg-[var(--green)] hover:bg-[var(--green-2)] text-white font-bengali text-base font-bold py-3.5 px-8 transition-all disabled:opacity-60"
                      >
                        <span>{status === 'sending' ? (bn ? 'পাঠানো হচ্ছে…' : 'Submitting…') : t('blood.submitRequest')}</span>
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
              {/* Card 1: Emergency Contact Info */}
              <div className="rounded-panel border border-site-line bg-[var(--cream)] p-5 sm:p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-site-cream text-[var(--green)]">
                    <FaClock className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bengali text-lg font-bold text-site-ink" style={SERIF_BN}>
                      {bn ? 'জরুরি সহায়তা প্রক্রিয়া' : 'Rapid Response Process'}
                    </h3>
                    <p className="font-bengali text-xs text-site-muted">
                      {bn ? 'আমরা কীভাবে সাহায্য করি' : 'How we assist you'}
                    </p>
                  </div>
                </div>

                <p className="font-bengali text-xs text-site-soft leading-relaxed">
                  {bn
                    ? 'আবেদন পাওয়ার পর আমরা আমাদের রেজিস্ট্রিকৃত রক্তদাতা তালিকা থেকে উপযুক্ত দাতাদের সাথে দ্রুত যোগাযোগ করি।'
                    : 'After receiving your request, we immediately contact matched donors from our community registry.'}
                </p>

                <div className="rounded-soft bg-site-cream p-3 font-bengali text-xs text-[var(--green)] font-semibold flex items-center gap-2">
                  <FaClock className="h-4 w-4 shrink-0" />
                  <span>{bn ? 'সাধারণত ২-৪ ঘণ্টার মধ্যে সাড়া দেওয়া হয়।' : 'Typically responded within 2-4 hours.'}</span>
                </div>
              </div>

              {/* Card 2: Become a Blood Donor */}
              <div className="rounded-panel border border-site-line bg-[var(--cream)] p-5 sm:p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-site-cream text-site-green">
                    <FaDroplet className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bengali text-lg font-bold text-site-ink" style={SERIF_BN}>
                      {bn ? 'রক্তদাতা হোন' : 'Become a Blood Donor'}
                    </h3>
                    <p className="font-bengali text-xs text-site-muted">
                      {bn ? 'জীবন বাঁচান' : 'Save lives'}
                    </p>
                  </div>
                </div>

                <p className="font-bengali text-xs text-site-soft leading-relaxed">
                  {bn
                    ? 'রক্তদান করে একজনের অমূল্য জীবন বাঁচান। আমাদের পরবর্তী রক্তদান শিবিরে অংশ নিন।'
                    : 'Save a life by donating blood. Join our next blood donation camp.'}
                </p>

                <div className="pt-1">
                  <Link
                    to="/events"
                    className="inline-flex items-center gap-2 rounded-soft bg-site-green hover:bg-site-green px-4 py-2 font-bengali text-xs font-bold text-white transition-all"
                  >
                    <FaCalendarCheck className="h-3.5 w-3.5" />
                    <span>{bn ? 'অনুষ্ঠান দেখুন' : 'View Upcoming Camps'}</span>
                  </Link>
                </div>
              </div>

              {/* Card 3: Have questions? */}
              <div className="rounded-panel border border-site-line bg-[var(--cream)] p-5 sm:p-6 relative overflow-hidden flex flex-row items-center justify-between gap-3">
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
