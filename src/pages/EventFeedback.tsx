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

  const inputCls = 'site-input font-bengali';
  const textareaCls = 'site-textarea font-bengali resize-none';

  return (
    <PageShell>
      <PageHero
        eyebrow={bn ? 'অনুষ্ঠান মতামত' : 'Event Feedback'}
        title={eventItem ? eventItem.title : tr('Event Feedback', 'অনুষ্ঠান মতামত')}
        lede={tr(
          'Please share your valuable feedback to help us improve future programs.',
          'ভবিষ্যতের কর্মসূচি আরও উন্নত করতে আপনার মূল্যবান মতামত আমাদের সাথে শেয়ার করুন।'
        )}
      />

      <section>
        <div className="mx-auto max-w-site px-5 py-14 sm:px-8 md:py-20">
          <div className="mx-auto max-w-2xl">
            {postsLoading ? (
              <div className="form-card text-center">
                <span className="mr-2 inline-block h-6 w-6 animate-spin rounded-full border-2 border-site-green border-t-transparent align-middle" />
                <span className="font-dmsans text-[15px] text-site-muted">
                  {tr('Loading event details...', 'অনুষ্ঠানের বিবরণ লোড হচ্ছে...')}
                </span>
              </div>
            ) : status === 'sent' ? (
              <div className="form-card text-center">
                <span
                  className="mx-auto mb-5 flex h-[78px] w-[78px] items-center justify-center rounded-full"
                  style={{ background: 'var(--green)' }}
                >
                  <Icon.Check className="h-8 w-8 text-site-yellow" />
                </span>
                <p
                  className="h-card font-bengali"
                  style={{ ...SERIF_BN, color: 'var(--c-ink)' }}
                >
                  {bn ? 'ধন্যবাদ! আপনার মতামত জমা দেওয়া হয়েছে' : 'Thank You! Feedback Submitted'}
                </p>
                <p className="mt-3 font-bengali text-[14.5px] leading-[1.8]" style={{ color: 'var(--c-ink-2)' }}>
                  {bn
                    ? 'আপনার মূল্যবান মতামত আমাদের পরবর্তী কর্মসূচি আরও সুন্দর ও সার্থক করতে সাহায্য করবে।'
                    : 'Your valuable response will help us organize better programs in the future.'}
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  {id && (
                    <Link to={`/events/${id}`} className="btn-ghost-dark font-bengali text-[13.5px]">
                      {bn ? 'অনুষ্ঠানে ফিরে যান' : 'Back to Event'}
                    </Link>
                  )}
                  <Link to="/events" className="btn-green font-bengali text-[13.5px]">
                    {bn ? 'সকল অনুষ্ঠান' : 'All Events'}
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="form-card space-y-6">
                {/* Event verification notice if not found */}
                {!eventItem && !postsLoading && (
                  <div className="success-panel font-bengali">
                    ⚠️ {tr('Note: Event not found or deleted. Feedback will be logged generally.', 'দ্রষ্টব্য: অনুষ্ঠানটি পাওয়া যায়নি। মতামতটি সাধারণ তালিকাভুক্ত হবে।')}
                  </div>
                )}

                {/* Attendee Name */}
                <div>
                  <label htmlFor="feedback-name" className="site-label font-bengali">
                    {bn ? 'আপনার নাম *' : 'Your Name *'}
                  </label>
                  <input
                    id="feedback-name"
                    required
                    value={form.attendee_name}
                    onChange={set('attendee_name')}
                    placeholder={bn ? 'আপনার পুরো নাম' : 'Enter your name'}
                    className={inputCls}
                  />
                </div>

                {/* Phone number */}
                <div>
                  <label htmlFor="feedback-phone" className="site-label font-bengali">
                    {bn ? 'ফোন নম্বর' : 'Phone Number'}
                  </label>
                  <input
                    id="feedback-phone"
                    value={form.phone}
                    onChange={set('phone')}
                    placeholder={bn ? 'মোবাইল নম্বর (ঐচ্ছিক)' : 'Mobile number (optional)'}
                    className={inputCls}
                  />
                </div>

                {/* Rating — pill chips */}
                <fieldset>
                  <legend className="site-label font-bengali">
                    {bn ? 'সামগ্রিক মূল্যায়ন *' : 'Overall Rating *'}
                  </legend>
                  <div className="flex flex-wrap items-center gap-2.5">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const active = ratingHover !== null ? star <= ratingHover : star <= form.rating;
                      return (
                        <button
                          key={star}
                          type="button"
                          aria-pressed={star === form.rating}
                          aria-label={fmtRating(star, bn)}
                          onClick={() => setForm((f) => ({ ...f, rating: star }))}
                          onMouseEnter={() => setRatingHover(star)}
                          onMouseLeave={() => setRatingHover(null)}
                          className={`chip w-12 px-0 text-[15px] font-bold ${active ? 'chip-on' : ''}`}
                        >
                          {star}
                        </button>
                      );
                    })}
                    <span className="ml-1 font-dmmono text-[12.5px]" style={{ color: 'var(--c-muted)' }}>
                      ({fmtRating(form.rating, bn)})
                    </span>
                  </div>
                </fieldset>

                {/* What did you like? */}
                <div>
                  <label htmlFor="feedback-liked" className="site-label font-bengali">
                    {bn ? 'আপনার সবচেয়ে ভালো লেগেছে কী? *' : 'What did you like most? *'}
                  </label>
                  <textarea
                    id="feedback-liked"
                    required
                    rows={3}
                    value={form.liked}
                    onChange={set('liked')}
                    placeholder={bn ? 'এখানে লিখুন…' : 'Tell us what was good…'}
                    className={textareaCls}
                  />
                </div>

                {/* What could be improved? */}
                <div>
                  <label htmlFor="feedback-improve" className="site-label font-bengali">
                    {bn ? 'আমাদের আরও কী উন্নত করা প্রয়োজন?' : 'What could be improved?'}
                  </label>
                  <textarea
                    id="feedback-improve"
                    rows={3}
                    value={form.improve}
                    onChange={set('improve')}
                    placeholder={bn ? 'কোনো পরামর্শ থাকলে লিখুন…' : 'Any suggestions for improvement…'}
                    className={textareaCls}
                  />
                </div>

                {/* Attend again? */}
                <fieldset>
                  <legend className="site-label font-bengali">
                    {bn ? 'আপনি কি ক্লাবের পরবর্তী কর্মসূচিতে যোগ দিতে চান? *' : 'Would you attend our future events? *'}
                  </legend>
                  <div className="flex flex-wrap gap-2.5">
                    <label
                      className={`chip cursor-pointer font-bengali ${form.attend_again === 'yes' ? 'chip-on' : ''}`}
                    >
                      <input
                        type="radio"
                        name="attend_again"
                        value="yes"
                        checked={form.attend_again === 'yes'}
                        onChange={(e) => setForm((f) => ({ ...f, attend_again: e.target.value }))}
                        className="sr-only"
                      />
                      <span>{bn ? 'হ্যাঁ, অবশ্যই' : 'Yes, definitely'}</span>
                    </label>
                    <label
                      className={`chip cursor-pointer font-bengali ${form.attend_again === 'no' ? 'chip-on' : ''}`}
                    >
                      <input
                        type="radio"
                        name="attend_again"
                        value="no"
                        checked={form.attend_again === 'no'}
                        onChange={(e) => setForm((f) => ({ ...f, attend_again: e.target.value }))}
                        className="sr-only"
                      />
                      <span>{bn ? 'না, ধন্যবাদ' : 'No, thanks'}</span>
                    </label>
                  </div>
                </fieldset>

                {/* Comments */}
                <div>
                  <label htmlFor="feedback-comments" className="site-label font-bengali">
                    {bn ? 'অন্যান্য মন্তব্য (ঐচ্ছিক)' : 'Other Comments (Optional)'}
                  </label>
                  <textarea
                    id="feedback-comments"
                    rows={3}
                    value={form.comments}
                    onChange={set('comments')}
                    placeholder={bn ? 'অন্যান্য মন্তব্য এখানে লিখুন…' : 'Any other comments…'}
                    className={textareaCls}
                  />
                </div>

                {status === 'error' && (
                  <div className="error-panel">
                    <p className="font-bengali text-[13.5px] font-bold">
                      {bn ? '⚠ ত্রুটি: মতামত জমা দেওয়া যায়নি।' : '⚠ Error: Could not submit feedback.'}
                    </p>
                    {errorMsg && (
                      <p className="mt-1.5 font-dmmono text-[11.5px]">
                        {errorMsg}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-7" style={{ borderColor: 'var(--c-rule)' }}>
                  <Link
                    to={id ? `/events/${id}` : '/events'}
                    className="btn-ghost-dark font-bengali text-[13.5px]"
                  >
                    {bn ? 'বাতিল' : 'Cancel'}
                  </Link>

                  <button
                    type="submit"
                    disabled={status === 'sending'}
                    className="btn-yellow font-bengali text-[13.5px]"
                  >
                    {status === 'sending' ? (
                      <>
                        <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-site-ink border-t-transparent" />
                        {bn ? 'জমা দেওয়া হচ্ছে…' : 'Submitting…'}
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
