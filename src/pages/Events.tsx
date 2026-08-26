import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePosts } from '@/hooks/usePosts';
import { useCategories } from '@/hooks/useCategories';
import { useT } from '@/i18n';
import { useSEO } from '@/hooks/useSEO';
import { SEO } from '@/data/seoConfig';
import { PageShell, PageHero, SERIF_BN, Icon, FJ } from './_field-journal';
import Breadcrumb from '@/components/ui/Breadcrumb';

// ════════════════════════════════════════════════════════════════════
//  Events — অনুষ্ঠান ও খবর  (editorial programmes & events listing)
// ════════════════════════════════════════════════════════════════════

const PAGE_SIZE = 9;
const FALLBACK_IMG = '/assets/images/Chhatradol.jpg';

const onImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
  if (e.currentTarget.src.indexOf('Chhatradol') < 0) e.currentTarget.src = FALLBACK_IMG;
};
const excerpt = (html: string, n = 120) =>
  html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, n);
const yearOf = (s: string) => { const m = String(s).match(/(19|20)\d{2}/); return m ? m[0] : ''; };

function CalIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className} style={style}>
      <rect x="3" y="4.5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v3M16 3v3" strokeLinecap="round" />
    </svg>
  );
}
function SearchIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className} style={style}>
      <circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" strokeLinecap="round" />
    </svg>
  );
}

export default function Events() {
  useSEO(SEO['/events']);
  const { posts, loading } = usePosts();
  const { flat: categories } = useCategories();
  const { t, lang } = useT();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);

  const [filter, setFilter] = useState('all');
  const [year, setYear] = useState('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  const topLevelCats = useMemo(() => {
    const names = new Set(posts.map((p) => p.category));
    return categories.filter((c) => !c.parent_id && names.has(c.name));
  }, [categories, posts]);

  const years = useMemo(() => {
    const ys = new Set<string>();
    posts.forEach((p) => { const y = yearOf(p.publishedDate); if (y) ys.add(y); });
    return [...ys].sort((a, b) => Number(b) - Number(a));
  }, [posts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result = posts.filter((p) => {
      if (filter !== 'all' && p.category !== filter) return false;
      if (year !== 'all' && yearOf(p.publishedDate) !== year) return false;
      if (q && !(`${p.title} ${excerpt(p.content, 400)}`.toLowerCase().includes(q))) return false;
      return true;
    });
    // Sort by date
    return [...result].sort((a, b) => {
      const da = new Date(a.publishedDate).getTime() || 0;
      const db = new Date(b.publishedDate).getTime() || 0;
      return sortOrder === 'newest' ? db - da : da - db;
    });
  }, [posts, filter, year, query, sortOrder]);

  const isDefaultView = filter === 'all' && year === 'all' && !query.trim();
  const featured = isDefaultView ? filtered[0] : undefined;
  const listed = featured ? filtered.slice(1) : filtered;

  const totalPages = Math.max(1, Math.ceil(listed.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const slice = listed.slice(start, start + PAGE_SIZE);

  const reset = (fn: () => void) => { fn(); setPage(1); };

  return (
    <PageShell>
      <Breadcrumb title="Events" />

      <PageHero eyebrow="Events" title="Events" lede={SEO['/events'].description} />

      {/* ════ FEATURED ════ */}
      {featured && safePage === 1 && (
        <section>
          <div className="mx-auto max-w-site px-5 pt-12 sm:px-8 md:pt-16">
            <Link
              to={`/events/${featured.slug || featured.id}`}
              className="group relative block overflow-hidden rounded-card"
              style={{ border: `1px solid ${FJ.rule}` }}
            >
              <div className="img-zoom">
                <img src={featured.featuredImage || FALLBACK_IMG} onError={onImgError} alt={featured.title} className="h-[220px] w-full object-cover sm:h-[280px] md:h-[340px]" />
              </div>
              <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(13,77,61,0.05) 0%, rgba(13,77,61,0.45) 45%, rgba(13,77,61,0.92) 100%)' }} />
              <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 md:p-10">
                <span className="inline-flex items-center rounded-full px-4 py-1.5 font-dmsans text-[11px] font-bold uppercase tracking-[0.14em]" style={{ background: FJ.yellow, color: FJ.ink }}>
                  {featured.category}
                </span>
                <h2 className="mt-3 max-w-3xl font-archivo text-[22px] font-bold leading-[1.2] text-white sm:text-[28px] md:text-[34px]" style={SERIF_BN}>{featured.title}</h2>
                <p className="mt-2 hidden max-w-2xl font-dmsans text-[14px] leading-[1.75] text-white/75 sm:line-clamp-1 md:line-clamp-2">{excerpt(featured.content, 160)}…</p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <span className="btn-yellow min-h-[44px] px-6 py-3 text-[13px]">
                    {t('events.readMore')} <Icon.Arrow className="h-3 w-3" />
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-dmsans text-[12.5px] text-white/75"><CalIcon className="h-3.5 w-3.5" /> {featured.publishedDate}</span>
                </div>
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* ════ FILTERS ════ */}
      <section>
        <div className="mx-auto max-w-site px-5 pt-10 sm:px-8 md:pt-12">
          <div className="flex flex-col gap-4 rounded-panel border border-site-line bg-white p-5 sm:p-6 lg:flex-row lg:items-center">
            {/* Category pills — wrap on mobile */}
            <div className="flex flex-1 flex-wrap items-center gap-2">
              {[{ id: 'all', name: t('events.catAll') }, ...topLevelCats.map((c) => ({ id: c.name, name: c.name }))].map((c) => {
                const active = filter === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => reset(() => setFilter(c.id))}
                    className={`chip ${active ? 'chip-on' : ''} px-4 text-[13px]`}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>

            {/* Sort / Year / Search — stack on mobile, inline on desktop */}
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center">
              <label htmlFor="events-sort" className="sr-only">{tr('Newest First', 'নতুন প্রথমে')}</label>
              <select
                id="events-sort"
                value={sortOrder}
                onChange={(e) => reset(() => setSortOrder(e.target.value as 'newest' | 'oldest'))}
                className="site-select text-[13px]"
              >
                <option value="newest">{tr('Newest First', 'নতুন প্রথমে')}</option>
                <option value="oldest">{tr('Oldest First', 'পুরানো প্রথমে')}</option>
              </select>
              <label htmlFor="events-year" className="sr-only">{tr('All Years', 'সব বছর')}</label>
              <select
                id="events-year"
                value={year}
                onChange={(e) => reset(() => setYear(e.target.value))}
                className="site-select text-[13px]"
              >
                <option value="all">{tr('All Years', 'সব বছর')}</option>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              <div className="relative sm:col-span-2 lg:col-span-1">
                <label htmlFor="events-search" className="sr-only">{tr('Search events…', 'অনুষ্ঠান খুঁজুন…')}</label>
                <SearchIcon className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: FJ.faint }} />
                <input
                  id="events-search"
                  value={query}
                  onChange={(e) => reset(() => setQuery(e.target.value))}
                  placeholder={tr('Search events…', 'অনুষ্ঠান খুঁজুন…')}
                  className="site-input pl-12 text-[13px] lg:w-56"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════ GRID ════ */}
      <section>
        <div className="mx-auto max-w-site px-5 pb-16 pt-10 sm:px-8">
          {loading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="soft-card flex animate-pulse flex-col p-6">
                  <div className="aspect-[16/10] w-full rounded-[16px]" style={{ background: '#eef4e7' }} />
                  <div className="space-y-3 pt-5">
                    <div className="h-3.5 w-24 rounded-full" style={{ background: '#eef4e7' }} />
                    <div className="h-5 w-3/4 rounded-full" style={{ background: '#eef4e7' }} />
                    <div className="h-3.5 w-full rounded-full" style={{ background: '#eef4e7' }} />
                    <div className="h-9 w-28 rounded-full" style={{ background: '#eef4e7' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : slice.length === 0 ? (
            <div className="rounded-panel border border-dashed border-site-line-2 py-20 text-center">
              <p className="font-dmsans text-[16px]" style={{ color: FJ.ink }}>{tr('No events match your search.', 'আপনার অনুসন্ধানে কিছু মেলেনি।')}</p>
              <button onClick={() => reset(() => { setFilter('all'); setYear('all'); setQuery(''); })} className="btn-tertiary mt-4">
                {tr('Clear filters', 'ফিল্টার মুছুন')}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {slice.map((p) => (
                <article key={p.id} className="group soft-card flex flex-col p-6">
                  <div className="img-zoom relative overflow-hidden rounded-[16px]">
                    <img src={p.featuredImage || FALLBACK_IMG} onError={onImgError} alt={p.title} className="aspect-[16/10] w-full object-cover" loading="lazy" />
                    <span className="absolute left-4 top-4 inline-flex items-center rounded-full px-3.5 py-1.5 font-dmsans text-[10px] font-bold uppercase tracking-[0.14em]" style={{ background: FJ.yellow, color: FJ.ink }}>
                      {p.category}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col pt-5">
                    <span className="inline-flex items-center gap-1.5 font-dmsans text-[12px] font-medium" style={{ color: FJ.faint }}>
                      <CalIcon className="h-3.5 w-3.5" style={{ color: FJ.red }} /> {p.publishedDate}
                    </span>
                    <h3 className="mt-2.5 font-archivo text-[19px] font-bold leading-[1.25]" style={{ ...SERIF_BN, color: FJ.ink }}>{p.title}</h3>
                    <p className="mt-2.5 line-clamp-2 font-dmsans text-[13.5px] leading-[1.75]" style={{ color: FJ.muted }}>{excerpt(p.content)}…</p>
                    <Link
                      to={`/events/${p.slug || p.id}`}
                      className="chip mt-5 self-start px-5 text-[12.5px] font-bold transition-all group-hover:border-site-green group-hover:bg-site-green group-hover:text-white"
                    >
                      {t('events.readMore')} <Icon.Arrow className="h-3 w-3" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-12 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage(safePage - 1)}
                className="chip px-5 font-bengali text-[12.5px] disabled:opacity-35"
              >
                ← {t('events.prev')}
              </button>
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => {
                  const active = n === safePage;
                  return (
                    <button
                      key={n}
                      type="button"
                      aria-current={active ? 'page' : undefined}
                      onClick={() => setPage(n)}
                      className={`chip h-11 w-11 px-0 font-bengali text-[13px] font-bold ${active ? 'chip-on' : ''}`}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage(safePage + 1)}
                className="chip px-5 font-bengali text-[12.5px] disabled:opacity-35"
              >
                {t('events.next')} →
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ════ BLOOD SERVICES ════ */}
      <section>
        <div className="mx-auto max-w-site px-5 pb-14 sm:px-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Request Blood Card */}
            <div className="soft-card flex flex-col justify-between p-8">
              <div>
                <span className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: 'rgba(143,33,22,0.08)' }}>
                  <Icon.Heart className="h-5 w-5" style={{ color: FJ.blood }} />
                </span>
                <h3 className="h-card mt-5" style={{ ...SERIF_BN, color: FJ.ink }}>
                  {t('events.bloodRequest')}
                </h3>
                <p className="mt-3 font-dmsans text-[14.5px] leading-[1.8]" style={{ color: FJ.muted }}>
                  {tr('Need blood urgently? Submit a request and we will connect you with available donors in our network.', 'জরুরি রক্তের প্রয়োজন? আবেদন করুন এবং আমরা আপনাকে আমাদের নেটওয়ার্কের রক্তদাতাদের সাথে যোগাযোগ করিয়ে দেব।')}
                </p>
              </div>
              <div className="mt-7">
                <Link to="/blood-request" className="btn-blood font-bengali text-[14px]">
                  {tr('Request Blood', 'রক্তের আবেদন করুন')} <Icon.Arrow className="h-3 w-3" />
                </Link>
              </div>
            </div>

            {/* Organise Camp Card */}
            <div className="soft-card flex flex-col justify-between p-8">
              <div>
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-site-cream">
                  <Icon.Users className="h-5 w-5" style={{ color: FJ.brand }} />
                </span>
                <h3 className="h-card mt-5" style={{ ...SERIF_BN, color: FJ.ink }}>
                  {t('events.bloodCamp')}
                </h3>
                <p className="mt-3 font-dmsans text-[14.5px] leading-[1.8]" style={{ color: FJ.muted }}>
                  {tr('Partner with us to host a blood donation camp in your locality, institution, or workplace.', 'আপনার এলাকা, প্রতিষ্ঠান বা কর্মক্ষেত্রে একটি রক্তদান শিবির আয়োজন করতে আমাদের সাথে যুক্ত হন।')}
                </p>
              </div>
              <div className="mt-7">
                <Link to="/organise-blood-camp" className="btn-ghost-dark font-bengali text-[14px]">
                  {tr('Organise Camp', 'শিবির আয়োজন করুন')} <Icon.Arrow className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════ CTA ════ */}
      <section>
        <div className="mx-auto max-w-site px-5 pb-16 sm:px-8">
          <div className="flex flex-col items-start justify-between gap-6 rounded-panel bg-site-green p-8 text-white md:flex-row md:items-center md:p-10">
            <div className="flex items-center gap-5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10">
                <Icon.Users className="h-5 w-5" style={{ color: FJ.yellow }} />
              </span>
              <div>
                <h3 className="h-card text-white" style={SERIF_BN}>{tr('Be a part of our next journey.', 'আমাদের পরবর্তী যাত্রার অংশ হন।')}</h3>
                <p className="mt-2 font-dmsans text-[14px] leading-[1.7] text-white/70">{tr('Volunteer, donate or join our upcoming events.', 'স্বেচ্ছাসেবক হন, দান করুন বা আমাদের আসন্ন অনুষ্ঠানে যোগ দিন।')}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/volunteer" className="btn-ghost-light font-bengali text-[14px]">
                {tr('Volunteer', 'স্বেচ্ছাসেবক')}
              </Link>
              <Link to="/donate" className="btn-yellow font-bengali text-[14px]">
                {tr('Donate', 'দান করুন')} <Icon.Arrow className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
