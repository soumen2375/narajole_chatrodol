import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ORG } from '@/data/content';
import { supabase } from '@/lib/supabase';
import { useT } from '@/i18n';
import { useSEO } from '@/hooks/useSEO';
import { SEO } from '@/data/seoConfig';
import { PageShell, SERIF_BN } from './_field-journal';
import Breadcrumb from '@/components/ui/Breadcrumb';
import {
  FaUser,
  FaPhone,
  FaEnvelope,
  FaList,
  FaCommentDots,
  FaPaperPlane,
  FaCheck,
  FaLocationDot,
  FaDroplet,
  FaTent,
  FaWhatsapp,
  FaChevronRight,
  FaHeadphones,
  FaClock,
  FaShieldHalved,
  FaUsers,
  FaHeart,
  FaArrowUpRightFromSquare
} from 'react-icons/fa6';

type Status = 'idle' | 'sending' | 'sent' | 'error';

export default function Contact() {
  const { t, lang } = useT();
  const bn = lang === 'bn';
  useSEO(SEO['/contact']);
  const [form, setForm] = useState({ name: '', phone: '', email: '', subject: '', message: '' });
  const [agreed, setAgreed] = useState(true);
  const [status, setStatus] = useState<Status>('idle');
  const [errDetail, setErrDetail] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [bloodHospital, setBloodHospital] = useState('');

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreed) return;
    setStatus('sending');
    const isBloodRequest = form.subject === 'Blood required' || form.subject === 'রক্তের প্রয়োজন';
    const fullMessage = isBloodRequest && (bloodGroup || bloodHospital)
      ? `${form.message}\n\nBlood Group: ${bloodGroup || 'Not specified'}\nHospital: ${bloodHospital || 'Not specified'}`
      : form.message;

    const { error } = await supabase.from('cswo_contact_messages').insert([{
      name: form.name, phone: form.phone, email: form.email,
      subject: form.subject, message: fullMessage,
    }]);

    if (error) setErrDetail(error.message || '');
    setStatus(error ? 'error' : 'sent');
  }

  const subjectOpts = t('contact.subjectOpts').split(',');

  return (
    <PageShell>
      <Breadcrumb title={bn ? 'যোগাযোগ' : 'Contact Us'} />

      {/* ── 1. HERO SECTION (MATCHING MOCKUP) ───────────────────────── */}
      <section className="relative bg-[#faf6ef] pt-6 pb-12 overflow-hidden">
        {/* Left Decorative Botanical Leaves Flourish SVG */}
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
            
            {/* Left Hero Copy */}
            <div className="md:col-span-7 space-y-4">
              <div className="relative inline-block">
                {/* Floating Heart Line Doodle */}
                <div className="absolute -top-6 right-0 text-[#c2410c] opacity-60">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                </div>

                <h1 className="font-bengali text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-stone-900 leading-tight" style={SERIF_BN}>
                  Talk <span className="text-[#c2410c]">to</span> us.
                </h1>
              </div>

              <p className="font-bengali text-base sm:text-lg text-stone-600 max-w-lg leading-relaxed">
                {t('contact.heroLede')}
              </p>

              {/* 3 Trust Badges (We Listen, We Respond, Your Information) */}
              <div className="pt-2 sm:pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-6">
                {/* Badge 1: We listen */}
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100/80 text-[#c2410c]">
                    <FaHeadphones className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-bengali text-xs font-bold text-stone-900">{bn ? 'আমরা শুনি' : 'We listen'}</h4>
                    <p className="font-bengali text-[11px] text-stone-500">{bn ? 'সতর্কতার সাথে' : 'Carefully'}</p>
                  </div>
                </div>

                {/* Badge 2: We respond */}
                <div className="flex items-center gap-3 sm:border-l sm:border-stone-200/80 sm:pl-6">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100/80 text-[#c2410c]">
                    <FaClock className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-bengali text-xs font-bold text-stone-900">{bn ? 'আমরা সাড়া দিই' : 'We respond'}</h4>
                    <p className="font-bengali text-[11px] text-stone-500">{bn ? '২৪ ঘণ্টার মধ্যে' : 'within 24 hours'}</p>
                  </div>
                </div>

                {/* Badge 3: Your information */}
                <div className="flex items-center gap-3 sm:border-l sm:border-stone-200/80 sm:pl-6">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100/80 text-[#c2410c]">
                    <FaShieldHalved className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-bengali text-xs font-bold text-stone-900">{bn ? 'আপনার তথ্য' : 'Your information'}</h4>
                    <p className="font-bengali text-[11px] text-stone-500">{bn ? 'আমাদের কাছে নিরাপদ' : 'is safe with us'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Hero Graphic & Quote Badge */}
            <div className="hidden md:flex md:col-span-5 relative items-center justify-center">
              {/* Soft ambient background glow */}
              <div className="absolute inset-0 bg-gradient-to-tr from-amber-200/30 via-red-100/40 to-transparent rounded-full blur-3xl" />

              <div className="relative z-10 flex flex-col items-center">
                {/* 3D Heart & Blood Drop Visual Card */}
                <div className="relative flex h-48 w-48 items-center justify-center rounded-full bg-gradient-to-br from-red-500 via-[#c2410c] to-amber-600 shadow-2xl ring-8 ring-white/90">
                  <div className="relative z-10 flex flex-col items-center justify-center text-white">
                    <FaHeart className="h-20 w-20 text-white drop-shadow-lg animate-pulse" />
                    <FaDroplet className="h-8 w-8 text-red-100 -mt-4 drop-shadow-sm" />
                  </div>
                </div>

                {/* Floating Quote Badge Card */}
                <div className="mt-4 rounded-2xl bg-white p-4 shadow-xl border border-stone-100 flex items-center gap-3.5 max-w-xs transform translate-x-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 text-[#c2410c]">
                    <FaUsers className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-bengali text-xs font-bold text-stone-900 leading-snug">
                      {bn ? 'একত্রে আমরা এক সুন্দর আগামী গড়ে তুলি।' : 'Together we can create a better tomorrow.'}
                    </p>
                    <p className="font-serif italic text-[11px] text-stone-500 mt-0.5">
                      {bn ? 'ধন্যবাদ! ♡' : 'Thank you! ♡'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── 2. MAIN CONTENT CARD GRID ───────────────────────────────── */}
      <section className="bg-[#faf6ef] pb-16">
        <div className="mx-auto max-w-[1240px] px-3.5 sm:px-6 md:px-10">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">

            {/* LEFT COLUMN: BLOOD BANNER & FORM (7 cols) ──────────── */}
            <div className="lg:col-span-7 space-y-6">

              {/* Urgent Blood CTA Banner (Rust-Orange Box matching mockup) */}
              <div className="rounded-2xl bg-[#c2410c] p-4 sm:p-6 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[#c2410c] shadow-inner mt-0.5 sm:mt-0">
                    <FaDroplet className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bengali text-base font-bold text-white sm:text-lg leading-snug">
                      {bn ? 'রক্তের প্রয়োজন বা রক্তদান শিবির আয়োজন?' : 'Need Blood or Want to Organise a Camp?'}
                    </h3>
                    <p className="mt-0.5 font-bengali text-xs text-white/90">
                      {bn ? 'দ্রুত প্রক্রিয়াকরণের জন্য আমাদের নিবেদিত ফর্মে আবেদন করুন।' : 'Please use our dedicated forms for faster processing and support.'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-row sm:flex-nowrap gap-2 shrink-0 pt-1 sm:pt-0">
                  <Link
                    to="/blood-request"
                    className="flex-1 sm:flex-initial justify-center inline-flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 font-bengali text-xs font-bold text-[#c2410c] shadow transition-all hover:bg-stone-100 text-center"
                  >
                    <FaDroplet className="h-3 w-3" />
                    <span>{bn ? 'রক্তের আবেদন' : 'Request Blood'}</span>
                  </Link>
                  <Link
                    to="/organise-blood-camp"
                    className="flex-1 sm:flex-initial justify-center inline-flex items-center gap-1.5 rounded-lg border border-white/80 px-3.5 py-2 font-bengali text-xs font-bold text-white transition-all hover:bg-white/10 text-center"
                  >
                    <FaTent className="h-3 w-3" />
                    <span>{bn ? 'শিবির আয়োজন' : 'Organise Camp'}</span>
                  </Link>
                </div>
              </div>

              {/* Send us a Message Container (White Card) */}
              <div className="rounded-2xl bg-white p-4 sm:p-8 shadow-sm border border-stone-200/80 space-y-5">
                <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                  <div className="flex items-center gap-2.5">
                    <FaEnvelope className="h-5 w-5 text-[#c2410c]" />
                    <h2 className="font-bengali text-xl font-bold text-stone-900" style={SERIF_BN}>
                      {bn ? 'বার্তা পাঠান' : 'Send us a message'}
                    </h2>
                  </div>
                  {/* Dashed line & paper plane doodle */}
                  <div className="text-[#c2410c] opacity-60">
                    <FaPaperPlane className="h-4 w-4" />
                  </div>
                </div>

                {status === 'sent' ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-8 text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white shadow">
                      <FaCheck className="h-6 w-6" />
                    </div>
                    <h3 className="font-bengali text-lg font-bold text-emerald-950" style={SERIF_BN}>
                      {t('contact.msgSent')}
                    </h3>
                    <p className="mt-1 font-bengali text-sm text-emerald-800">
                      {t('contact.msgSentSub')}
                    </p>
                    <button
                      type="button"
                      onClick={() => { setForm({ name: '', phone: '', email: '', subject: '', message: '' }); setStatus('idle'); }}
                      className="mt-5 rounded-full bg-emerald-700 px-6 py-2 font-mono text-xs font-bold text-white uppercase tracking-wider shadow hover:bg-emerald-800 transition-colors"
                    >
                      {t('contact.anotherMsg')}
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Name & Phone */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block font-bengali text-xs font-bold text-stone-700">
                          {bn ? 'সম্পূর্ণ নাম *' : 'Full Name *'}
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">
                            <FaUser className="h-3.5 w-3.5" />
                          </span>
                          <input
                            required
                            value={form.name}
                            onChange={set('name')}
                            placeholder={bn ? 'আপনার নাম' : 'Your full name'}
                            className="w-full rounded-xl border border-stone-200/90 bg-stone-50/40 pl-10 pr-4 py-2.5 font-bengali text-sm text-stone-900 outline-none transition-all focus:bg-white focus:border-[#c2410c]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-1 block font-bengali text-xs font-bold text-stone-700">
                          {bn ? 'ফোন *' : 'Phone *'}
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">
                            <FaPhone className="h-3.5 w-3.5" />
                          </span>
                          <input
                            type="tel"
                            required
                            value={form.phone}
                            onChange={set('phone')}
                            placeholder={bn ? 'মোবাইল নম্বর' : 'Mobile number'}
                            className="w-full rounded-xl border border-stone-200/90 bg-stone-50/40 pl-10 pr-4 py-2.5 font-bengali text-sm text-stone-900 outline-none transition-all focus:bg-white focus:border-[#c2410c]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Email */}
                    <div>
                      <label className="mb-1 block font-bengali text-xs font-bold text-stone-700">
                        {bn ? 'ইমেল *' : 'Email *'}
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">
                          <FaEnvelope className="h-3.5 w-3.5" />
                        </span>
                        <input
                          type="email"
                          required
                          value={form.email}
                          onChange={set('email')}
                          placeholder={bn ? 'আপনার ইমেল ঠিকানা' : 'Your email address'}
                          className="w-full rounded-xl border border-stone-200/90 bg-stone-50/40 pl-10 pr-4 py-2.5 font-bengali text-sm text-stone-900 outline-none transition-all focus:bg-white focus:border-[#c2410c]"
                        />
                      </div>
                    </div>

                    {/* Subject */}
                    <div>
                      <label className="mb-1 block font-bengali text-xs font-bold text-stone-700">
                        {bn ? 'বিষয় *' : 'Subject *'}
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">
                          <FaList className="h-3.5 w-3.5" />
                        </span>
                        <select
                          required
                          value={form.subject}
                          onChange={set('subject')}
                          className="w-full rounded-xl border border-stone-200/90 bg-stone-50/40 pl-10 pr-4 py-2.5 font-bengali text-sm text-stone-900 outline-none transition-all focus:bg-white focus:border-[#c2410c] appearance-none"
                        >
                          {subjectOpts.map((opt, i) => (
                            <option key={i} value={i === 0 ? '' : opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Contextual Blood Details */}
                    {(form.subject === 'Blood required' || form.subject === 'রক্তের প্রয়োজন') && (
                      <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 space-y-3">
                        <div className="font-mono text-xs font-bold uppercase tracking-wider text-[#c2410c]">
                          {bn ? 'রক্তের বিবরণ' : 'Blood Details'}
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div>
                            <label className="mb-1 block font-bengali text-xs font-semibold text-stone-600">
                              {bn ? 'রক্তের গ্রুপ' : 'Blood Group'}
                            </label>
                            <select
                              value={bloodGroup}
                              onChange={(e) => setBloodGroup(e.target.value)}
                              className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none"
                            >
                              <option value="">{bn ? 'বেছে নিন' : 'Select group'}</option>
                              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'].map((g) => (
                                <option key={g} value={g}>{g}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block font-bengali text-xs font-semibold text-stone-600">
                              {bn ? 'হাসপাতাল' : 'Hospital'}
                            </label>
                            <input
                              value={bloodHospital}
                              onChange={(e) => setBloodHospital(e.target.value)}
                              placeholder={bn ? 'হাসপাতালের নাম' : 'Hospital name'}
                              className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Message */}
                    <div>
                      <label className="mb-1 block font-bengali text-xs font-bold text-stone-700">
                        {bn ? 'বার্তা *' : 'Message *'}
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-3 text-stone-400">
                          <FaCommentDots className="h-3.5 w-3.5" />
                        </span>
                        <textarea
                          required
                          rows={4}
                          value={form.message}
                          onChange={set('message')}
                          placeholder={bn ? 'আপনার বার্তা এখানে লিখুন…' : 'Write your message here...'}
                          className="w-full rounded-xl border border-stone-200/90 bg-stone-50/40 pl-10 pr-4 py-2.5 font-bengali text-sm text-stone-900 outline-none transition-all focus:bg-white focus:border-[#c2410c] resize-none"
                        />
                      </div>
                    </div>

                    {/* Guidelines Agreement Checkbox */}
                    <div className="flex items-start gap-2.5 pt-1">
                      <input
                        type="checkbox"
                        id="agreeRules"
                        checked={agreed}
                        onChange={(e) => setAgreed(e.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-stone-300 text-[#c2410c] focus:ring-[#c2410c]"
                      />
                      <label htmlFor="agreeRules" className="text-xs text-stone-600 font-bengali cursor-pointer leading-snug">
                        {bn ? 'আমি সংস্থার নিয়ম ও নির্দেশাবলী মেনে চলতে সম্মত।' : "I agree to abide by the Organization's rules and guidelines."}
                      </label>
                    </div>

                    {/* Error message */}
                    {status === 'error' && (
                      <div className="rounded-xl border border-red-300 bg-red-50 p-3.5 text-red-800">
                        <p className="font-bengali text-sm font-semibold">{t('contact.error')}</p>
                        {errDetail && <p className="mt-1 font-mono text-xs">{errDetail}</p>}
                      </div>
                    )}

                    {/* Submit Button */}
                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={status === 'sending' || !agreed}
                        className="w-full inline-flex items-center justify-center gap-2.5 rounded-xl bg-[#c2410c] hover:bg-[#9a3412] text-white font-bengali text-base font-bold py-3.5 px-8 shadow-md hover:shadow-lg transition-all disabled:opacity-60"
                      >
                        <span>{status === 'sending' ? t('contact.sending') : (bn ? 'বার্তা পাঠান' : 'Send Message')}</span>
                        <FaPaperPlane className="h-4 w-4" />
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: GET IN TOUCH CARDS (5 cols) ─────────── */}
            <div className="lg:col-span-5 space-y-3.5">
              <div>
                <h2 className="font-bengali text-xl font-bold text-stone-900" style={SERIF_BN}>
                  {t('contact.formTitle')}
                </h2>
                <p className="text-xs text-stone-500 font-bengali">
                  {bn ? 'আমরা আপনাকে সাহায্য ও সহায়তা করতে প্রস্তুত।' : "We're here to help and support you."}
                </p>
              </div>

              {/* Card 1: Office Address */}
              <div className="rounded-2xl border border-stone-200/80 bg-stone-50/60 p-4 flex items-start gap-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100 text-[#c2410c]">
                  <FaLocationDot className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-bengali text-sm font-bold text-stone-900">
                    {bn ? 'ছত্রদল দফতর' : 'Chhatradol Office'}
                  </h4>
                  <div className="mt-1 space-y-0.5 text-xs text-stone-600 font-bengali leading-relaxed">
                    {ORG.address[lang].map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card 2: WhatsApp Support */}
              <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/70 p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
                    <FaWhatsapp className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bengali text-sm font-bold text-emerald-950">
                      {bn ? 'হোয়াটসঅ্যাপ সহায়তা' : 'WhatsApp Support'}
                    </h4>
                    <a
                      href={ORG.social.whatsapp}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 px-3 py-1 font-mono text-[11px] font-bold text-white shadow-sm transition-all"
                    >
                      <span>Chat on WhatsApp</span>
                    </a>
                  </div>
                </div>
                <FaChevronRight className="h-3.5 w-3.5 text-emerald-700" />
              </div>

              {/* Card 3: Phone */}
              <div className="rounded-2xl border border-stone-200/80 bg-stone-50/60 p-4 flex items-center justify-between gap-3 hover:border-stone-300 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100 text-[#c2410c]">
                    <FaPhone className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-bengali text-sm font-bold text-stone-900">
                      {bn ? 'ফোন' : 'Phone'}
                    </h4>
                    <div className="mt-0.5">
                      {ORG.phones.map((ph) => (
                        <a key={ph} href={`tel:+91${ph}`} className="font-mono text-xs font-semibold text-stone-700 hover:text-[#c2410c]">
                          +91 {ph}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
                <FaChevronRight className="h-3.5 w-3.5 text-stone-400" />
              </div>

              {/* Card 4: Email */}
              <div className="rounded-2xl border border-stone-200/80 bg-stone-50/60 p-4 flex items-center justify-between gap-3 hover:border-stone-300 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100 text-[#c2410c]">
                    <FaEnvelope className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-bengali text-sm font-bold text-stone-900">
                      {bn ? 'ইমেল' : 'Email'}
                    </h4>
                    <a href={`mailto:${ORG.email}`} className="mt-0.5 block font-mono text-xs font-semibold text-stone-700 hover:text-[#c2410c]">
                      {ORG.email}
                    </a>
                  </div>
                </div>
                <FaChevronRight className="h-3.5 w-3.5 text-stone-400" />
              </div>

              {/* Card 5: Embedded Location Map */}
              <div className="rounded-2xl overflow-hidden border border-stone-200/80 shadow-sm bg-white">
                <iframe
                  title="Narajole Location Map"
                  src="https://www.openstreetmap.org/export/embed.html?bbox=87.2500%2C22.3500%2C87.4500%2C22.5500&layer=mapnik&marker=22.4400%2C87.3200"
                  width="100%"
                  height="160"
                  style={{ border: 0, display: 'block' }}
                  loading="lazy"
                  allowFullScreen
                />
                <div className="bg-[#faf6ef] py-2.5 px-4 text-center border-t border-stone-200/60">
                  <a
                    href="https://www.openstreetmap.org/?mlat=22.44&mlon=87.32#map=13/22.44/87.32"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs font-bold text-[#c2410c] hover:underline inline-flex items-center gap-1.5"
                  >
                    <span>{bn ? 'মানচিত্র দেখুন' : 'View larger map'}</span>
                    <FaArrowUpRightFromSquare className="h-3 w-3" />
                  </a>
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
