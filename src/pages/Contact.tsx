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
      <section className="page-hero relative overflow-hidden pb-16 pt-12 md:pb-[86px] md:pt-[76px]">
        {/* Left Decorative Botanical Leaves Flourish SVG */}
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
            
            {/* Left Hero Copy */}
            <div className="md:col-span-7 space-y-4">
              <div className="relative inline-block">
                {/* Floating Heart Line Doodle */}
                <div className="absolute -top-6 right-0 text-site-yellow opacity-60">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                </div>

                <h1 className="h-display text-white">
                  Talk <span className="text-site-yellow">to</span> us.
                </h1>
              </div>

              <p className="font-dmsans text-[16px] text-white/70 max-w-xl leading-[1.8]">
                {t('contact.heroLede')}
              </p>

              {/* 3 Trust Badges (We Listen, We Respond, Your Information) */}
              <div className="pt-2 sm:pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-6">
                {/* Badge 1: We listen */}
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-site-yellow">
                    <FaHeadphones className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-bengali text-[13px] font-bold text-white">{bn ? 'আমরা শুনি' : 'We listen'}</h4>
                    <p className="font-bengali text-[11.5px] text-white/60">{bn ? 'সতর্কতার সাথে' : 'Carefully'}</p>
                  </div>
                </div>

                {/* Badge 2: We respond */}
                <div className="flex items-center gap-3 sm:border-l sm:border-white/15 sm:pl-6">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-site-yellow">
                    <FaClock className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-bengali text-[13px] font-bold text-white">{bn ? 'আমরা সাড়া দিই' : 'We respond'}</h4>
                    <p className="font-bengali text-[11.5px] text-white/60">{bn ? '২৪ ঘণ্টার মধ্যে' : 'within 24 hours'}</p>
                  </div>
                </div>

                {/* Badge 3: Your information */}
                <div className="flex items-center gap-3 sm:border-l sm:border-white/15 sm:pl-6">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-site-yellow">
                    <FaShieldHalved className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-bengali text-[13px] font-bold text-white">{bn ? 'আপনার তথ্য' : 'Your information'}</h4>
                    <p className="font-bengali text-[11.5px] text-white/60">{bn ? 'আমাদের কাছে নিরাপদ' : 'is safe with us'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Hero Graphic & Quote Badge */}
            <div className="hidden md:flex md:col-span-5 relative items-center justify-center">
              {/* Soft ambient background glow */}
              <div className="absolute inset-0 bg-site-sand-3/40 rounded-full blur-3xl" />

              <div className="relative z-10 flex flex-col items-center">
                {/* 3D Heart & Blood Drop Visual Card */}
                <div className="relative flex h-48 w-48 items-center justify-center rounded-full bg-white/10">
                  <div className="relative z-10 flex flex-col items-center justify-center text-white">
                    <FaHeart className="h-20 w-20 text-white animate-pulse" />
                    <FaDroplet className="h-8 w-8 text-white/75 -mt-4" />
                  </div>
                </div>

                {/* Floating Quote Badge Card */}
                <div className="mt-6 rounded-card bg-white p-5 border border-site-line flex items-center gap-3.5 max-w-xs transform translate-x-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-site-cream text-site-green">
                    <FaUsers className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-bengali text-xs font-bold text-site-ink leading-snug">
                      {bn ? 'একত্রে আমরা এক সুন্দর আগামী গড়ে তুলি।' : 'Together we can create a better tomorrow.'}
                    </p>
                    <p className="font-dmsans italic text-[11.5px] text-site-muted mt-1">
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
      <section className="bg-site-cream pb-16 pt-12 md:pb-20 md:pt-16">
        <div className="mx-auto max-w-[1240px] px-3.5 sm:px-6 md:px-10">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">

            {/* LEFT COLUMN: BLOOD BANNER & FORM (7 cols) ──────────── */}
            <div className="lg:col-span-7 space-y-6">

              {/* Urgent Blood CTA Banner (Rust-Orange Box matching mockup) */}
              <div className="rounded-card bg-[var(--green)] p-4 sm:p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[var(--green)] mt-0.5 sm:mt-0">
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
                    className="flex-1 sm:flex-initial justify-center inline-flex items-center gap-1.5 rounded-[18px] bg-white px-3.5 py-2 font-bengali text-xs font-bold text-[var(--green)] transition-all hover:bg-site-cream text-center"
                  >
                    <FaDroplet className="h-3 w-3" />
                    <span>{bn ? 'রক্তের আবেদন' : 'Request Blood'}</span>
                  </Link>
                  <Link
                    to="/organise-blood-camp"
                    className="flex-1 sm:flex-initial justify-center inline-flex items-center gap-1.5 rounded-[18px] border border-white/80 px-3.5 py-2 font-bengali text-xs font-bold text-white transition-all hover:bg-white/10 text-center"
                  >
                    <FaTent className="h-3 w-3" />
                    <span>{bn ? 'শিবির আয়োজন' : 'Organise Camp'}</span>
                  </Link>
                </div>
              </div>

              {/* Send us a Message Container (White Card) */}
              <div className="rounded-card bg-white p-4 sm:p-8 border border-site-line space-y-5">
                <div className="flex items-center justify-between border-b border-site-line pb-4">
                  <div className="flex items-center gap-2.5">
                    <FaEnvelope className="h-5 w-5 text-[var(--green)]" />
                    <h2 className="font-archivo text-xl font-bold text-site-ink">
                      {bn ? 'বার্তা পাঠান' : 'Send us a message'}
                    </h2>
                  </div>
                  {/* Dashed line & paper plane doodle */}
                  <div className="text-[var(--green)] opacity-60">
                    <FaPaperPlane className="h-4 w-4" />
                  </div>
                </div>

                {status === 'sent' ? (
                  <div className="rounded-card border border-site-line bg-site-cream p-8 text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-site-green text-white">
                      <FaCheck className="h-6 w-6" />
                    </div>
                    <h3 className="font-bengali text-lg font-bold text-site-green" style={SERIF_BN}>
                      {t('contact.msgSent')}
                    </h3>
                    <p className="mt-1 font-bengali text-sm text-site-green">
                      {t('contact.msgSentSub')}
                    </p>
                    <button
                      type="button"
                      onClick={() => { setForm({ name: '', phone: '', email: '', subject: '', message: '' }); setStatus('idle'); }}
                      className="mt-5 rounded-full bg-site-green px-6 py-2 font-dmmono text-xs font-bold text-white uppercase tracking-wider hover:bg-site-green transition-colors"
                    >
                      {t('contact.anotherMsg')}
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Name & Phone */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block font-bengali text-xs font-bold text-site-soft">
                          {bn ? 'সম্পূর্ণ নাম *' : 'Full Name *'}
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-site-faint">
                            <FaUser className="h-3.5 w-3.5" />
                          </span>
                          <input
                            required
                            value={form.name}
                            onChange={set('name')}
                            placeholder={bn ? 'আপনার নাম' : 'Your full name'}
                            className="site-input font-bengali pl-12"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-1 block font-bengali text-xs font-bold text-site-soft">
                          {bn ? 'ফোন *' : 'Phone *'}
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-site-faint">
                            <FaPhone className="h-3.5 w-3.5" />
                          </span>
                          <input
                            type="tel"
                            required
                            value={form.phone}
                            onChange={set('phone')}
                            placeholder={bn ? 'মোবাইল নম্বর' : 'Mobile number'}
                            className="site-input font-bengali pl-12"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Email */}
                    <div>
                      <label className="mb-1 block font-bengali text-xs font-bold text-site-soft">
                        {bn ? 'ইমেল *' : 'Email *'}
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-site-faint">
                          <FaEnvelope className="h-3.5 w-3.5" />
                        </span>
                        <input
                          type="email"
                          required
                          value={form.email}
                          onChange={set('email')}
                          placeholder={bn ? 'আপনার ইমেল ঠিকানা' : 'Your email address'}
                          className="site-input font-bengali pl-12"
                        />
                      </div>
                    </div>

                    {/* Subject */}
                    <div>
                      <label className="mb-1 block font-bengali text-xs font-bold text-site-soft">
                        {bn ? 'বিষয় *' : 'Subject *'}
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-site-faint">
                          <FaList className="h-3.5 w-3.5" />
                        </span>
                        <select
                          required
                          value={form.subject}
                          onChange={set('subject')}
                          className="site-select font-bengali pl-12"
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
                      <div className="rounded-soft border border-site-blood/40 bg-site-cream p-4 space-y-3">
                        <div className="font-dmmono text-xs font-bold uppercase tracking-wider text-[var(--green)]">
                          {bn ? 'রক্তের বিবরণ' : 'Blood Details'}
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div>
                            <label className="mb-1 block font-bengali text-xs font-semibold text-site-soft">
                              {bn ? 'রক্তের গ্রুপ' : 'Blood Group'}
                            </label>
                            <select
                              value={bloodGroup}
                              onChange={(e) => setBloodGroup(e.target.value)}
                              className="site-input px-5 text-[13.5px]"
                            >
                              <option value="">{bn ? 'বেছে নিন' : 'Select group'}</option>
                              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'].map((g) => (
                                <option key={g} value={g}>{g}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block font-bengali text-xs font-semibold text-site-soft">
                              {bn ? 'হাসপাতাল' : 'Hospital'}
                            </label>
                            <input
                              value={bloodHospital}
                              onChange={(e) => setBloodHospital(e.target.value)}
                              placeholder={bn ? 'হাসপাতালের নাম' : 'Hospital name'}
                              className="site-input px-5 text-[13.5px]"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Message */}
                    <div>
                      <label className="mb-1 block font-bengali text-xs font-bold text-site-soft">
                        {bn ? 'বার্তা *' : 'Message *'}
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-3 text-site-faint">
                          <FaCommentDots className="h-3.5 w-3.5" />
                        </span>
                        <textarea
                          required
                          rows={4}
                          value={form.message}
                          onChange={set('message')}
                          placeholder={bn ? 'আপনার বার্তা এখানে লিখুন…' : 'Write your message here...'}
                          className="site-textarea font-bengali pl-12 resize-none"
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
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-site-line text-[var(--green)] focus:ring-[var(--green)]"
                      />
                      <label htmlFor="agreeRules" className="text-xs text-site-soft font-bengali cursor-pointer leading-snug">
                        {bn ? 'আমি সংস্থার নিয়ম ও নির্দেশাবলী মেনে চলতে সম্মত।' : "I agree to abide by the Organization's rules and guidelines."}
                      </label>
                    </div>

                    {/* Error message */}
                    {status === 'error' && (
                      <div className="rounded-soft border border-site-blood/40 bg-site-cream p-3.5 text-site-blood">
                        <p className="font-bengali text-sm font-semibold">{t('contact.error')}</p>
                        {errDetail && <p className="mt-1 font-dmmono text-xs">{errDetail}</p>}
                      </div>
                    )}

                    {/* Submit Button */}
                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={status === 'sending' || !agreed}
                        className="w-full inline-flex items-center justify-center gap-2.5 rounded-soft bg-[var(--green)] hover:bg-[var(--green-2)] text-white font-bengali text-base font-bold py-3.5 px-8 transition-all disabled:opacity-60"
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
                <h2 className="font-bengali text-xl font-bold text-site-ink" style={SERIF_BN}>
                  {t('contact.formTitle')}
                </h2>
                <p className="text-xs text-site-muted font-bengali">
                  {bn ? 'আমরা আপনাকে সাহায্য ও সহায়তা করতে প্রস্তুত।' : "We're here to help and support you."}
                </p>
              </div>

              {/* Card 1: Office Address */}
              <div className="rounded-card border border-site-line bg-site-cream/60 p-4 flex items-start gap-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-site-cream text-[var(--green)]">
                  <FaLocationDot className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-bengali text-sm font-bold text-site-ink">
                    {bn ? 'ছত্রদল দফতর' : 'Chhatradol Office'}
                  </h4>
                  <div className="mt-1 space-y-0.5 text-xs text-site-soft font-bengali leading-relaxed">
                    {ORG.address[lang].map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card 2: WhatsApp Support */}
              <div className="rounded-card border border-site-line bg-site-cream p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-site-green text-white">
                    <FaWhatsapp className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bengali text-sm font-bold text-site-green">
                      {bn ? 'হোয়াটসঅ্যাপ সহায়তা' : 'WhatsApp Support'}
                    </h4>
                    <a
                      href={ORG.social.whatsapp}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-site-green hover:bg-site-green px-3 py-1 font-dmmono text-[11px] font-bold text-white transition-all"
                    >
                      <span>Chat on WhatsApp</span>
                    </a>
                  </div>
                </div>
                <FaChevronRight className="h-3.5 w-3.5 text-site-green" />
              </div>

              {/* Card 3: Phone */}
              <div className="rounded-card border border-site-line bg-site-cream/60 p-4 flex items-center justify-between gap-3 hover:border-site-line transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-site-cream text-[var(--green)]">
                    <FaPhone className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-bengali text-sm font-bold text-site-ink">
                      {bn ? 'ফোন' : 'Phone'}
                    </h4>
                    <div className="mt-0.5">
                      {ORG.phones.map((ph) => (
                        <a key={ph} href={`tel:+91${ph}`} className="font-dmmono text-xs font-semibold text-site-soft hover:text-[var(--green)]">
                          +91 {ph}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
                <FaChevronRight className="h-3.5 w-3.5 text-site-faint" />
              </div>

              {/* Card 4: Email */}
              <div className="rounded-card border border-site-line bg-site-cream/60 p-4 flex items-center justify-between gap-3 hover:border-site-line transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-site-cream text-[var(--green)]">
                    <FaEnvelope className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-bengali text-sm font-bold text-site-ink">
                      {bn ? 'ইমেল' : 'Email'}
                    </h4>
                    <a href={`mailto:${ORG.email}`} className="mt-0.5 block font-dmmono text-xs font-semibold text-site-soft hover:text-[var(--green)]">
                      {ORG.email}
                    </a>
                  </div>
                </div>
                <FaChevronRight className="h-3.5 w-3.5 text-site-faint" />
              </div>

              {/* Card 5: Embedded Location Map */}
              <div className="rounded-card overflow-hidden border border-site-line bg-white">
                <iframe
                  title="Narajole Location Map"
                  src="https://www.openstreetmap.org/export/embed.html?bbox=87.2500%2C22.3500%2C87.4500%2C22.5500&layer=mapnik&marker=22.4400%2C87.3200"
                  width="100%"
                  height="160"
                  style={{ border: 0, display: 'block' }}
                  loading="lazy"
                  allowFullScreen
                />
                <div className="bg-[var(--cream)] py-2.5 px-4 text-center border-t border-site-line">
                  <a
                    href="https://www.openstreetmap.org/?mlat=22.44&mlon=87.32#map=13/22.44/87.32"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-dmmono text-xs font-bold text-[var(--green)] hover:underline inline-flex items-center gap-1.5"
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
    </PageShell>
  );
}
