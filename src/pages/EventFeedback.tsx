import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useT } from '@/i18n';
import { usePosts } from '@/hooks/usePosts';
import { PageShell, PageHero, SERIF_BN, Icon } from './_field-journal';

export default function EventFeedback() {
  const { id } = useParams<{ id: string }>();
  const { posts, loading: postsLoading } = usePosts();
  const { lang } = useT();
  const bn = lang === 'bn';
  const tr = (en: string, bnStr: string) => (lang === 'en' ? en : bnStr);

  // Form states
  const [form, setForm] = useState({
    attendee_name: '',
    phone: '',
    rating: 5,
    liked: '',
    improve: '',
    attend_again: 'yes',
    comments: '',
  });

  const [ratingHover, setRatingHover] = useState<number | null>(null);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // Find event
  const eventItem = posts.find((p) => p.id === id);

  const set = (k: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setStatus('sending');
    setErrorMsg('');

    try {
      const { error } = await supabase.from('cswo_event_feedback').insert({
        event_id: id,
        attendee_name: form.attendee_name,
        phone: form.phone || null,
        rating: Number(form.rating),
        liked: form.liked || null,
        improve: form.improve || null,
        attend_again: form.attend_again === 'yes',
        comments: form.comments || null,
      });

      if (error) {
        console.error('Feedback submission error:', error);
        if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
          setErrorMsg(
            tr(
              'Feedback system is coming soon. Please contact us directly to share your thoughts!',
              'মতামত ব্যবস্থা শীঘ্রই আসছে। আপনার মূল্যবান মতামত জানাতে সরাসরি আমাদের সাথে যোগাযোগ করুন!'
            )
          );
        } else {
          setErrorMsg(error.message);
        }
        setStatus('error');
      } else {
        setStatus('sent');
      }
    } catch (err: any) {
      console.error('Feedback catch error:', err);
      setErrorMsg(err.message || 'Error occurred');
      setStatus('error');
    }
  };

  const inputCls = `w-full rounded-[3px] border px-4 py-3 font-bengali text-[14px] bg-transparent outline-none transition-colors focus:border-[color:var(--c-brand)]`;
  const inputStyle = { borderColor: 'var(--c-rule)', color: 'var(--c-ink)' };

  return (
    <PageShell>
      <PageHero
        eyebrow={bn ? 'অনুষ্ঠান মতামত' : 'Event Feedback'}
        title={eventItem ? eventItem.title : tr('Event Feedback', 'অনুষ্ঠান মতামত')}
        lede={tr(
          'Please share your valuable feedback to help us improve future programs.',
          'ভবিষ্যতের কর্মসূচি আরও উন্নত করতে আপনার মূল্যবান মতামত আমাদের সাথে শেয়ার করুন।'
        )}
      />

      <section style={{ background: 'var(--c-paper)' }}>
        <div className="mx-auto max-w-[1320px] px-6 py-16 md:px-10">
          <div className="mx-auto max-w-2xl">
            {postsLoading ? (
              <div className="py-12 text-center text-gray-500">
                <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-orange-600 border-t-transparent mr-2" />
                {tr('Loading event details...', 'অনুষ্ঠানের বিবরণ লোড হচ্ছে...')}
              </div>
            ) : status === 'sent' ? (
              <div
                className="rounded-[3px] border p-10 text-center"
                style={{
                  borderColor: 'var(--c-brand)',
                  background: 'rgba(194,65,12,0.04)',
                }}
              >
                <div
                  className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
                  style={{ background: 'var(--c-brand)' }}
                >
                  <Icon.Check className="h-7 w-7 text-white" />
                </div>
                <p
                  className="font-bengali text-[22px] font-semibold"
                  style={{ ...SERIF_BN, color: 'var(--c-ink)' }}
                >
                  {bn ? 'ধন্যবাদ! আপনার মতামত জমা দেওয়া হয়েছে' : 'Thank You! Feedback Submitted'}
                </p>
                <p className="mt-2 font-bengali text-[14.5px]" style={{ color: 'var(--c-ink-2)' }}>
                  {bn
                    ? 'আপনার মূল্যবান মতামত আমাদের পরবর্তী কর্মসূচি আরও সুন্দর ও সার্থক করতে সাহায্য করবে।'
                    : 'Your valuable response will help us organize better programs in the future.'}
                </p>
                <div className="mt-8 flex justify-center gap-4">
                  {id && (
                    <Link
                      to={`/events/${id}`}
                      className="rounded-full border px-5 py-2 font-bengali text-[12.5px] font-semibold transition-colors hover:bg-black/5"
                      style={{ borderColor: 'var(--c-rule)', color: 'var(--c-ink)' }}
                    >
                      {bn ? 'অনুষ্ঠানে ফিরে যান' : 'Back to Event'}
                    </Link>
                  )}
                  <Link
                    to="/events"
                    className="rounded-full px-5 py-2 font-bengali text-[12.5px] font-semibold text-white"
                    style={{ background: 'var(--c-brand)' }}
                  >
                    {bn ? 'সকল অনুষ্ঠান' : 'All Events'}
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Event verification notice if not found */}
                {!eventItem && !postsLoading && (
                  <div
                    className="rounded-[3px] p-4 text-[13.5px] border"
                    style={{
                      background: 'rgba(194,65,12,0.04)',
                      borderColor: 'rgba(194,65,12,0.15)',
                      color: 'var(--c-ink)',
                    }}
                  >
                    ⚠️ {tr('Note: Event not found or deleted. Feedback will be logged generally.', 'দ্রষ্টব্য: অনুষ্ঠানটি পাওয়া যায়নি। মতামতটি সাধারণ তালিকাভুক্ত হবে।')}
                  </div>
                )}

                {/* Attendee Name */}
                <div>
                  <label
                    className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.22em]"
                    style={{ color: 'var(--c-muted)' }}
                  >
                    {bn ? 'আপনার নাম *' : 'Your Name *'}
                  </label>
                  <input
                    required
                    value={form.attendee_name}
                    onChange={set('attendee_name')}
                    placeholder={bn ? 'আপনার পুরো নাম' : 'Enter your name'}
                    className={inputCls}
                    style={inputStyle}
                  />
                </div>

                {/* Phone number */}
                <div>
                  <label
                    className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.22em]"
                    style={{ color: 'var(--c-muted)' }}
                  >
                    {bn ? 'ফোন নম্বর' : 'Phone Number'}
                  </label>
                  <input
                    value={form.phone}
                    onChange={set('phone')}
                    placeholder={bn ? 'মোবাইল নম্বর (ঐচ্ছিক)' : 'Mobile number (optional)'}
                    className={inputCls}
                    style={inputStyle}
                  />
                </div>

                {/* Rating (Stars selector) */}
                <div>
                  <label
                    className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.22em]"
                    style={{ color: 'var(--c-muted)' }}
                  >
                    {bn ? 'সামগ্রিক মূল্যায়ন *' : 'Overall Rating *'}
                  </label>
                  <div className="flex items-center gap-2 py-1">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const active = ratingHover !== null ? star <= ratingHover : star <= form.rating;
                      return (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, rating: star }))}
                          onMouseEnter={() => setRatingHover(star)}
                          onMouseLeave={() => setRatingHover(null)}
                          className="text-2xl transition-transform duration-100 hover:scale-125 focus:outline-none"
                          style={{ color: active ? '#f59e0b' : 'var(--c-rule)' }}
                        >
                          ★
                        </button>
                      );
                    })}
                    <span className="ml-2 font-mono text-[12.5px]" style={{ color: 'var(--c-muted)' }}>
                      ({fmtRating(form.rating, bn)})
                    </span>
                  </div>
                </div>

                {/* What did you like? */}
                <div>
                  <label
                    className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.22em]"
                    style={{ color: 'var(--c-muted)' }}
                  >
                    {bn ? 'আপনার সবচেয়ে ভালো লেগেছে কী? *' : 'What did you like most? *'}
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={form.liked}
                    onChange={set('liked')}
                    placeholder={bn ? 'এখানে লিখুন…' : 'Tell us what was good…'}
                    className={`${inputCls} resize-none`}
                    style={inputStyle}
                  />
                </div>

                {/* What could be improved? */}
                <div>
                  <label
                    className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.22em]"
                    style={{ color: 'var(--c-muted)' }}
                  >
                    {bn ? 'আমাদের আরও কী উন্নত করা প্রয়োজন?' : 'What could be improved?'}
                  </label>
                  <textarea
                    rows={3}
                    value={form.improve}
                    onChange={set('improve')}
                    placeholder={bn ? 'কোনো পরামর্শ থাকলে লিখুন…' : 'Any suggestions for improvement…'}
                    className={`${inputCls} resize-none`}
                    style={inputStyle}
                  />
                </div>

                {/* Attend again? */}
                <div>
                  <label
                    className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.22em]"
                    style={{ color: 'var(--c-muted)' }}
                  >
                    {bn ? 'আপনি কি ক্লাবের পরবর্তী কর্মসূচিতে যোগ দিতে চান? *' : 'Would you attend our future events? *'}
                  </label>
                  <div className="flex gap-6 py-1">
                    <label className="flex items-center gap-2 cursor-pointer font-bengali text-[14px]">
                      <input
                        type="radio"
                        name="attend_again"
                        value="yes"
                        checked={form.attend_again === 'yes'}
                        onChange={(e) => setForm((f) => ({ ...f, attend_again: e.target.value }))}
                        className="h-4 w-4 accent-orange-600"
                      />
                      <span>{bn ? 'হ্যাঁ, অবশ্যই' : 'Yes, definitely'}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-bengali text-[14px]">
                      <input
                        type="radio"
                        name="attend_again"
                        value="no"
                        checked={form.attend_again === 'no'}
                        onChange={(e) => setForm((f) => ({ ...f, attend_again: e.target.value }))}
                        className="h-4 w-4 accent-orange-600"
                      />
                      <span>{bn ? 'না, ধন্যবাদ' : 'No, thanks'}</span>
                    </label>
                  </div>
                </div>

                {/* Comments */}
                <div>
                  <label
                    className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.22em]"
                    style={{ color: 'var(--c-muted)' }}
                  >
                    {bn ? 'অন্যান্য মন্তব্য (ঐচ্ছিক)' : 'Other Comments (Optional)'}
                  </label>
                  <textarea
                    rows={3}
                    value={form.comments}
                    onChange={set('comments')}
                    placeholder={bn ? 'অন্যান্য মন্তব্য এখানে লিখুন…' : 'Any other comments…'}
                    className={`${inputCls} resize-none`}
                    style={inputStyle}
                  />
                </div>

                {status === 'error' && (
                  <div
                    className="rounded-[3px] border px-4 py-3"
                    style={{ borderColor: '#fca5a5', background: '#fef2f2' }}
                  >
                    <p className="font-bengali text-[13px] font-semibold" style={{ color: '#dc2626' }}>
                      {bn ? '⚠ ত্রুটি: মতামত জমা দেওয়া যায়নি।' : '⚠ Error: Could not submit feedback.'}
                    </p>
                    {errorMsg && (
                      <p className="mt-1 font-mono text-[11.5px]" style={{ color: '#b91c1c' }}>
                        {errorMsg}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between gap-4 border-t pt-6" style={{ borderColor: 'var(--c-rule)' }}>
                  <Link
                    to={id ? `/events/${id}` : '/events'}
                    className="rounded-full border px-6 py-2.5 font-bengali text-[13px] font-semibold transition-colors hover:bg-black/5"
                    style={{ borderColor: 'var(--c-rule)', color: 'var(--c-ink)' }}
                  >
                    {bn ? 'বাতিল' : 'Cancel'}
                  </Link>

                  <button
                    type="submit"
                    disabled={status === 'sending'}
                    className="inline-flex items-center gap-2 rounded-full px-8 py-2.5 font-bengali text-[13px] font-semibold text-white transition-opacity disabled:opacity-60"
                    style={{ background: 'var(--c-brand)' }}
                  >
                    {status === 'sending' ? (
                      <>
                        <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        {bn ? 'জমা দেওয়া হচ্ছে…' : 'Submitting…'}
                      </>
                    ) : (
                      <>
                        {bn ? 'মতামত দিন' : 'Submit Feedback'}{' '}
                        <Icon.Arrow className="h-3 w-3" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>
    </PageShell>
  );
}

function fmtRating(r: number, bn: boolean): string {
  const dict: Record<number, [string, string]> = {
    1: ['Poor', 'দুর্বল'],
    2: ['Fair', 'চলনসই'],
    3: ['Good', 'ভালো'],
    4: ['Very Good', 'খুব ভালো'],
    5: ['Excellent', 'অসাধারণ'],
  };
  return dict[r] ? (bn ? dict[r][1] : dict[r][0]) : String(r);
}
