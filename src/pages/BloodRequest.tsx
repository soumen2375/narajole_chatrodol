import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useT } from '@/i18n';
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

        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 md:px-10">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-12 items-center">
            {/* Left Hero Copy */}
            <div className="md:col-span-7 space-y-4">
              <div className="relative inline-block">
                <h1
                  className="font-bengali text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-stone-900 leading-tight"
                  style={SERIF_BN}
                >
                  Request <span className="text-[#c2410c]">blood</span>
                </h1>
              </div>

              <p className="font-bengali text-base sm:text-lg text-stone-600 max-w-lg leading-relaxed">
                {t('blood.requestSubtitle')}
              </p>

              {/* Trust Badges */}
              <div className="pt-2 sm:pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100/80 text-[#c2410c]">
                    <FaClock className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-bengali text-xs font-bold text-stone-900">
                      {bn ? '২৪/৭ জরুরি সাড়া' : '24/7 Rapid Response'}
                    </h4>
                    <p className="font-bengali text-[11px] text-stone-500">
                      {bn ? '২-৪ ঘণ্টার মধ্যে যোগাযোগ' : 'Action within 2-4 hours'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:border-l sm:border-stone-200/80 sm:pl-6">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100/80 text-[#c2410c]">
                    <FaShieldHalved className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-bengali text-xs font-bold text-stone-900">
                      {bn ? 'যাচাইকৃত রক্তদাতা' : 'Verified Donors'}
                    </h4>
                    <p className="font-bengali text-[11px] text-stone-500">
                      {bn ? 'নিরাপদ রক্তের সেবা' : 'Trusted community registry'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Hero Visual Badge */}
            <div className="hidden md:flex md:col-span-5 relative items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-tr from-red-200/30 via-amber-100/40 to-transparent rounded-full blur-3xl" />

              <div className="relative z-10 flex flex-col items-center">
                <div className="relative flex h-44 w-44 items-center justify-center rounded-full bg-gradient-to-br from-red-500 via-[#c2410c] to-amber-600 shadow-2xl ring-8 ring-white/90 animate-pulse">
                  <div className="flex flex-col items-center justify-center text-white">
                    <FaDroplet className="h-16 w-16 drop-shadow-lg" />
                    <FaHeart className="h-6 w-6 text-red-200 -mt-2" />
                  </div>
                </div>

                <div className="mt-4 rounded-2xl bg-white p-4 shadow-xl border border-stone-100 flex items-center gap-3.5 max-w-xs transform translate-x-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 text-[#c2410c]">
                    <FaDroplet className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-bengali text-xs font-bold text-stone-900 leading-snug">
                      {bn ? 'রক্তদান জীবনের সেরা দান।' : 'Every blood drop saves a precious life.'}
                    </p>
                    <p className="font-serif italic text-[11px] text-stone-500 mt-0.5">
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
      <section className="bg-[#faf6ef] pb-16">
        <div className="mx-auto max-w-[1240px] px-3.5 sm:px-6 md:px-10">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* LEFT COLUMN: BLOOD REQUEST FORM (7 cols) ─────────────── */}
            <div className="lg:col-span-7 flex flex-col">
              <div className="rounded-3xl bg-white p-5 sm:p-8 md:p-9 shadow-md border border-stone-200/80 space-y-6 h-full flex flex-col justify-between">
                <div className="border-b border-stone-100 pb-4">
                  <div className="font-mono text-xs font-bold uppercase tracking-wider text-[#c2410c]">
                    {bn ? 'জরুরি রক্তের আবেদন' : 'EMERGENCY BLOOD REQUEST'}
                  </div>
                  <h2 className="mt-1 font-bengali text-2xl sm:text-3xl font-bold text-stone-900" style={SERIF_BN}>
                    {bn ? 'রোগীর তথ্য পূরণ করুন।' : 'Fill in patient details.'}
                  </h2>
                </div>

                {status === 'sent' ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-8 text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white shadow">
                      <FaCheck className="h-6 w-6" />
                    </div>
                    <h3 className="font-bengali text-lg font-bold text-emerald-950" style={SERIF_BN}>
                      {bn ? 'আবেদন গৃহীত হয়েছে' : 'Request Submitted'}
                    </h3>
                    <p className="mt-1 font-bengali text-sm text-emerald-800">
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
                      className="mt-5 rounded-full bg-emerald-700 px-6 py-2 font-mono text-xs font-bold text-white uppercase tracking-wider shadow hover:bg-emerald-800 transition-colors"
                    >
                      {bn ? 'আরেকটি আবেদন' : 'Submit Another'}
                    </button>
                  </div>
                ) : (
                  <form onSubmit={submit} className="space-y-4 flex-1 flex flex-col justify-between">
                    {/* Patient Name */}
                    <div>
                      <label className="mb-1 block font-bengali text-xs font-bold text-stone-700">
                        {t('blood.patientName')} *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">
                          <FaUser className="h-3.5 w-3.5" />
                        </span>
                        <input
                          required
                          value={form.patient_name}
                          onChange={set('patient_name')}
                          placeholder={bn ? 'রোগীর পুরো নাম' : "Patient's full name"}
                          className="w-full rounded-xl border border-stone-200/90 bg-stone-50/40 pl-10 pr-4 py-3 font-bengali text-sm text-stone-900 outline-none transition-all focus:bg-white focus:border-[#c2410c]"
                        />
                      </div>
                    </div>

                    {/* Blood Group & Units Needed */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block font-bengali text-xs font-bold text-stone-700">
                          {t('blood.bloodGroup')} *
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#c2410c]">
                            <FaDroplet className="h-3.5 w-3.5" />
                          </span>
                          <select
                            required
                            value={form.blood_group}
                            onChange={set('blood_group')}
                            className="w-full rounded-xl border border-stone-200/90 bg-stone-50/40 pl-10 pr-4 py-3 font-bengali text-sm text-stone-900 outline-none transition-all focus:bg-white focus:border-[#c2410c] appearance-none"
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
                        <label className="mb-1 block font-bengali text-xs font-bold text-stone-700">
                          {t('blood.unitsNeeded')}
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">
                            <FaHashtag className="h-3.5 w-3.5" />
                          </span>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={form.units_needed}
                            onChange={set('units_needed')}
                            className="w-full rounded-xl border border-stone-200/90 bg-stone-50/40 pl-10 pr-4 py-3 font-bengali text-sm text-stone-900 outline-none transition-all focus:bg-white focus:border-[#c2410c]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Hospital & Contact Phone */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block font-bengali text-xs font-bold text-stone-700">
                          {t('blood.hospital')} *
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">
                            <FaHospital className="h-3.5 w-3.5" />
                          </span>
                          <input
                            required
                            value={form.hospital}
                            onChange={set('hospital')}
                            placeholder={bn ? 'হাসপাতালের নাম ও স্থান' : 'Hospital name and location'}
                            className="w-full rounded-xl border border-stone-200/90 bg-stone-50/40 pl-10 pr-4 py-3 font-bengali text-sm text-stone-900 outline-none transition-all focus:bg-white focus:border-[#c2410c]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-1 block font-bengali text-xs font-bold text-stone-700">
                          {t('blood.contactPhone')} *
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">
                            <FaPhone className="h-3.5 w-3.5" />
                          </span>
                          <input
                            required
                            type="tel"
                            value={form.contact_phone}
                            onChange={set('contact_phone')}
                            placeholder={bn ? 'যোগাযোগের ফোন নম্বর' : 'Contact phone number'}
                            className="w-full rounded-xl border border-stone-200/90 bg-stone-50/40 pl-10 pr-4 py-3 font-bengali text-sm text-stone-900 outline-none transition-all focus:bg-white focus:border-[#c2410c]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Required Date & Requester Name */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block font-bengali text-xs font-bold text-stone-700">
                          {t('blood.requiredDate')}
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">
                            <FaCalendarDays className="h-3.5 w-3.5" />
                          </span>
                          <input
                            type="date"
                            value={form.required_by}
                            onChange={set('required_by')}
                            className="w-full rounded-xl border border-stone-200/90 bg-stone-50/40 pl-10 pr-4 py-3 font-bengali text-sm text-stone-900 outline-none transition-all focus:bg-white focus:border-[#c2410c]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-1 block font-bengali text-xs font-bold text-stone-700">
                          {bn ? 'আবেদনকারীর নাম' : 'Requester Name'}
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">
                            <FaUser className="h-3.5 w-3.5" />
                          </span>
                          <input
                            value={form.requester_name}
                            onChange={set('requester_name')}
                            placeholder={bn ? 'আপনার নাম' : 'Your name'}
                            className="w-full rounded-xl border border-stone-200/90 bg-stone-50/40 pl-10 pr-4 py-3 font-bengali text-sm text-stone-900 outline-none transition-all focus:bg-white focus:border-[#c2410c]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Message / Additional Details */}
                    <div>
                      <label className="mb-1 block font-bengali text-xs font-bold text-stone-700">
                        {bn ? 'অতিরিক্ত তথ্য' : 'Additional Info'}
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-3 text-stone-400">
                          <FaCommentDots className="h-3.5 w-3.5" />
                        </span>
                        <textarea
                          rows={3}
                          value={form.message}
                          onChange={set('message')}
                          placeholder={bn ? 'যেকোনো গুরুত্বপূর্ণ বিবরণ বা নির্দেশনা…' : 'Any important details or instructions...'}
                          className="w-full rounded-xl border border-stone-200/90 bg-stone-50/40 pl-10 pr-4 py-3 font-bengali text-sm text-stone-900 outline-none transition-all focus:bg-white focus:border-[#c2410c] resize-none"
                        />
                      </div>
                    </div>

                    {status === 'error' && (
                      <div className="rounded-xl border border-red-300 bg-red-50 p-3.5 text-red-800">
                        <p className="font-bengali text-xs font-semibold">
                          {bn ? '⚠ আবেদন জমা দিতে সমস্যা হয়েছে।' : '⚠ Could not submit your request.'}
                        </p>
                        {errMsg && <p className="mt-1 font-mono text-[11px]">{errMsg}</p>}
                      </div>
                    )}

                    {/* Submit Button */}
                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={status === 'sending'}
                        className="group w-full inline-flex items-center justify-center gap-3 rounded-full bg-[#c2410c] hover:bg-[#9a3412] text-white font-bengali text-base font-bold py-3.5 px-8 shadow-md hover:shadow-lg transition-all disabled:opacity-60"
                      >
                        <span>{status === 'sending' ? (bn ? 'পাঠানো হচ্ছে…' : 'Submitting…') : t('blood.submitRequest')}</span>
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
              {/* Card 1: Emergency Contact Info */}
              <div className="rounded-3xl border border-stone-200/60 bg-[#faf6ef] p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-100 text-[#c2410c]">
                    <FaClock className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bengali text-lg font-bold text-stone-900" style={SERIF_BN}>
                      {bn ? 'জরুরি সহায়তা প্রক্রিয়া' : 'Rapid Response Process'}
                    </h3>
                    <p className="font-bengali text-xs text-stone-500">
                      {bn ? 'আমরা কীভাবে সাহায্য করি' : 'How we assist you'}
                    </p>
                  </div>
                </div>

                <p className="font-bengali text-xs text-stone-600 leading-relaxed">
                  {bn
                    ? 'আবেদন পাওয়ার পর আমরা আমাদের রেজিস্ট্রিকৃত রক্তদাতা তালিকা থেকে উপযুক্ত দাতাদের সাথে দ্রুত যোগাযোগ করি।'
                    : 'After receiving your request, we immediately contact matched donors from our community registry.'}
                </p>

                <div className="rounded-xl bg-orange-100/50 p-3 font-bengali text-xs text-[#c2410c] font-semibold flex items-center gap-2">
                  <FaClock className="h-4 w-4 shrink-0" />
                  <span>{bn ? 'সাধারণত ২-৪ ঘণ্টার মধ্যে সাড়া দেওয়া হয়।' : 'Typically responded within 2-4 hours.'}</span>
                </div>
              </div>

              {/* Card 2: Become a Blood Donor */}
              <div className="rounded-3xl border border-stone-200/60 bg-[#faf6ef] p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
                    <FaDroplet className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bengali text-lg font-bold text-stone-900" style={SERIF_BN}>
                      {bn ? 'রক্তদাতা হোন' : 'Become a Blood Donor'}
                    </h3>
                    <p className="font-bengali text-xs text-stone-500">
                      {bn ? 'জীবন বাঁচান' : 'Save lives'}
                    </p>
                  </div>
                </div>

                <p className="font-bengali text-xs text-stone-600 leading-relaxed">
                  {bn
                    ? 'রক্তদান করে একজনের অমূল্য জীবন বাঁচান। আমাদের পরবর্তী রক্তদান শিবিরে অংশ নিন।'
                    : 'Save a life by donating blood. Join our next blood donation camp.'}
                </p>

                <div className="pt-1">
                  <Link
                    to="/events"
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 px-4 py-2 font-bengali text-xs font-bold text-white shadow-sm transition-all"
                  >
                    <FaCalendarCheck className="h-3.5 w-3.5" />
                    <span>{bn ? 'অনুষ্ঠান দেখুন' : 'View Upcoming Camps'}</span>
                  </Link>
                </div>
              </div>

              {/* Card 3: Have questions? */}
              <div className="rounded-3xl border border-stone-200/60 bg-[#faf6ef] p-5 sm:p-6 shadow-sm relative overflow-hidden flex flex-row items-center justify-between gap-3">
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
