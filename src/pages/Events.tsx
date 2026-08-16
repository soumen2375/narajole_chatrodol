import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePosts } from '@/hooks/usePosts';
import { useCategories } from '@/hooks/useCategories';
import { useT } from '@/i18n';
import { useSEO } from '@/hooks/useSEO';
import { SEO } from '@/data/seoConfig';
import { PageShell, SERIF_BN, Icon, FJ } from './_field-journal';
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
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} style={style}>
      <rect x="3" y="4.5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v3M16 3v3" strokeLinecap="round" />
    </svg>
  );
}
function SearchIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} style={style}>
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


      {/* ════ FEATURED ════ */}
      {featured && safePage === 1 && (
        <section style={{ background: FJ.paper }}>
          <div className="mx-auto max-w-[1320px] px-4 pt-6 sm:px-6 sm:pt-8 md:px-10 md:pt-10">
            <Link to={`/events/${featured.slug || featured.id}`} className="card-lift group relative block overflow-hidden rounded-[14px] sm:rounded-[18px]" style={{ border: `1px solid ${FJ.rule}` }}>
              <div className="img-zoom">
                <img src={featured.featuredImage || FALLBACK_IMG} onError={onImgError} alt={featured.title} className="h-[180px] w-full object-cover sm:h-[220px] md:h-[260px]" />
              </div>
              <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(20,15,10,0.02) 0%, rgba(20,15,10,0.40) 45%, rgba(20,15,10,0.90) 100%)' }} />
              <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 md:p-8">
                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 font-sans text-[10px] font-bold uppercase tracking-wider text-white sm:px-3 sm:py-1 sm:text-[11px]" style={{ background: FJ.brand }}>
                  {featured.category}
                </span>
                <h2 className="mt-2 max-w-3xl font-bengali font-sans text-[18px] font-extrabold leading-snug text-white sm:text-[22px] md:text-[28px]">{featured.title}</h2>
                <p className="mt-1 hidden max-w-2xl font-bengali font-sans text-[13px] leading-relaxed text-white/80 sm:line-clamp-1 md:line-clamp-2">{excerpt(featured.content, 160)}…</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 sm:mt-3 sm:gap-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-bengali font-sans text-[11px] font-semibold sm:px-4 sm:py-2 sm:text-[13px]" style={{ background: '#fff', color: FJ.ink }}>
                    {t('events.readMore')} <Icon.Arrow className="h-2.5 w-2.5 sm:h-3 sm:w-3" style={{ color: FJ.brand }} />
                  </span>
                  <span className="inline-flex items-center gap-1 font-sans text-xs text-white/80"><CalIcon className="h-3.5 w-3.5" /> {featured.publishedDate}</span>
                </div>
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* ════ FILTERS ════ */}
      <section style={{ background: FJ.paper }}>
        <div className="mx-auto max-w-[1320px] px-4 pt-6 sm:px-6 sm:pt-8 md:px-10 md:pt-10">
          <div className="flex flex-col gap-3 rounded-[14px] p-3 sm:p-4 lg:flex-row lg:items-center" style={{ background: FJ.bg, border: `1px solid ${FJ.rule}` }}>
            {/* Category pills — scroll horizontally on mobile */}
            <div className="flex flex-1 flex-wrap items-center gap-1.5 sm:gap-2">
              {[{ id: 'all', name: t('events.catAll') }, ...topLevelCats.map((c) => ({ id: c.name, name: c.name }))].map((c) => {
                const active = filter === c.id;
                return (
                  <button key={c.id} type="button" onClick={() => reset(() => setFilter(c.id))}
                    className="rounded-full px-3 py-1 font-bengali font-sans text-[11.5px] font-semibold transition-all sm:px-3.5 sm:py-1.5 sm:text-[12.5px]"
                    style={{ background: active ? FJ.brand : FJ.paper, color: active ? '#fff' : FJ.ink2, border: `1px solid ${active ? FJ.brand : FJ.rule}`, boxShadow: active ? `0 6px 16px -8px ${FJ.brand}` : 'none' }}>
                    {c.name}
                  </button>
                );
              })}
            </div>

            {/* Sort / Year / Search — stack on mobile, inline on desktop */}
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-2.5">
              <select value={sortOrder} onChange={(e) => reset(() => setSortOrder(e.target.value as 'newest' | 'oldest'))}
                className="rounded-[8px] px-2.5 py-2 font-bengali font-sans text-[12px] outline-none sm:px-3 sm:text-[13px]" style={{ background: FJ.paper, color: FJ.ink2, border: `1px solid ${FJ.rule}` }}>
                <option value="newest">{tr('Newest First', '\u09a8\u09a4\u09c1\u09a8 \u09aa\u09cd\u09b0\u09a5\u09ae\u09c7')}</option>
                <option value="oldest">{tr('Oldest First', '\u09aa\u09c1\u09b0\u09be\u09a8\u09cb \u09aa\u09cd\u09b0\u09a5\u09ae\u09c7')}</option>
              </select>
              <select value={year} onChange={(e) => reset(() => setYear(e.target.value))}
                className="rounded-[8px] px-2.5 py-2 font-bengali font-sans text-[12px] outline-none sm:px-3 sm:text-[13px]" style={{ background: FJ.paper, color: FJ.ink2, border: `1px solid ${FJ.rule}` }}>
                <option value="all">{tr('All Years', 'সব বছর')}</option>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              <div className="relative col-span-2 sm:col-span-1">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2" style={{ color: FJ.muted }} />
                <input value={query} onChange={(e) => reset(() => setQuery(e.target.value))} placeholder={tr('Search events…', 'অনুষ্ঠান খুঁজুন…')}
                  className="w-full rounded-[8px] py-2 pl-9 pr-3 font-bengali font-sans text-[12px] outline-none sm:text-[13px] lg:w-52" style={{ background: FJ.paper, color: FJ.ink, border: `1px solid ${FJ.rule}` }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════ GRID ════ */}
      <section style={{ background: FJ.paper }}>
        <div className="mx-auto max-w-[1320px] px-6 pb-16 pt-8 md:px-10">
          {loading ? (
            <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex flex-col overflow-hidden rounded-[16px] bg-stone-50 animate-pulse" style={{ border: `1px solid ${FJ.rule}` }}>
                  <div className="aspect-[16/10] w-full" style={{ background: '#f5f5f4' }} />
                  <div className="p-5 space-y-3" style={{ background: '#ffffff' }}>
                    <div className="h-3.5 w-24 rounded-md" style={{ background: '#e7e5e4' }} />
                    <div className="h-5 w-3/4 rounded-md" style={{ background: '#e7e5e4' }} />
                    <div className="h-3.5 w-full rounded-md" style={{ background: '#e7e5e4' }} />
                    <div className="h-7 w-20 rounded-full" style={{ background: '#e7e5e4' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : slice.length === 0 ? (
            <div className="rounded-[14px] py-20 text-center" style={{ border: `1px dashed ${FJ.rule}` }}>
              <p className="font-bengali font-sans text-[16px]" style={{ color: FJ.ink }}>{tr('No events match your search.', 'আপনার অনুসন্ধানে কিছু মেলেনি।')}</p>
              <button onClick={() => reset(() => { setFilter('all'); setYear('all'); setQuery(''); })} className="mt-3 font-bengali font-sans text-[13px] font-semibold" style={{ color: FJ.brand }}>
                {tr('Clear filters', 'ফিল্টার মুছুন')}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
              {slice.map((p) => (
                <article key={p.id} className="card-lift group flex flex-col overflow-hidden rounded-[16px] transition-shadow hover:shadow-lg" style={{ background: FJ.paper, border: `1px solid ${FJ.rule}` }}>
                  <div className="img-zoom relative">
                    <img src={p.featuredImage || FALLBACK_IMG} onError={onImgError} alt={p.title} className="aspect-[16/10] w-full object-cover" loading="lazy" />
                    <span className="absolute left-3 top-3 inline-flex items-center rounded-full px-2.5 py-1 font-sans text-[10px] font-bold uppercase tracking-wider text-white shadow-sm" style={{ background: FJ.brand }}>
                      {p.category}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <span className="inline-flex items-center gap-1.5 font-sans text-xs font-medium text-stone-500">
                      <CalIcon className="h-3.5 w-3.5 text-amber-700" /> {p.publishedDate}
                    </span>
                    <h3 className="mt-2 font-bengali font-sans text-[17px] font-bold leading-snug tracking-tight text-stone-900 group-hover:text-amber-800 transition-colors">{p.title}</h3>
                    <p className="mt-2 line-clamp-2 font-bengali font-sans text-[13.5px] leading-relaxed text-stone-600">{excerpt(p.content)}…</p>
                    <Link to={`/events/${p.slug || p.id}`}
                      className="mt-4 inline-flex items-center gap-1.5 self-start rounded-full px-4 py-2 font-bengali font-sans text-[12.5px] font-semibold transition-all duration-200 group-hover:gap-2.5"
                      style={{ background: 'rgba(194,65,12,0.08)', color: FJ.brand }}>
                      {t('events.readMore')} <Icon.Arrow className="h-3 w-3" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-12 flex items-center justify-center gap-2">
              <button type="button" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}
                className="rounded-full px-4 py-2 font-bengali text-[12.5px] font-medium transition-colors disabled:opacity-35" style={{ border: `1px solid ${FJ.rule}`, color: FJ.ink2 }}>
                ← {t('events.prev')}
              </button>
              <div className="flex items-center gap-1.5">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => {
                  const active = n === safePage;
                  return (
                    <button key={n} type="button" onClick={() => setPage(n)}
                      className="flex h-9 w-9 items-center justify-center rounded-full font-bengali text-[13px] font-semibold transition-all"
                      style={{ background: active ? FJ.brand : 'transparent', color: active ? '#fff' : FJ.ink2, border: `1px solid ${active ? FJ.brand : FJ.rule}` }}>
                      {n}
                    </button>
                  );
                })}
              </div>
              <button type="button" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}
                className="rounded-full px-4 py-2 font-bengali text-[12.5px] font-medium transition-colors disabled:opacity-35" style={{ border: `1px solid ${FJ.rule}`, color: FJ.brand }}>
                {t('events.next')} →
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ════ BLOOD SERVICES ════ */}
      <section style={{ background: FJ.paper }} className="border-t border-stone-200/50">
        <div className="mx-auto max-w-[1320px] px-6 py-12 md:px-10">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Request Blood Card */}
            <div className="rounded-[16px] p-6 flex flex-col justify-between" style={{ background: FJ.bg, border: `1px solid ${FJ.rule}` }}>
              <div>
                <span className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: 'rgba(220,38,38,0.08)' }}>
                  <Icon.Heart className="h-5 w-5 text-red-600" />
                </span>
                <h3 className="mt-4 font-bengali text-[22px] font-bold" style={{ ...SERIF_BN, color: FJ.ink }}>
                  {t('events.bloodRequest')}
                </h3>
                <p className="mt-2 font-bengali text-[14px] leading-relaxed" style={{ color: FJ.ink2 }}>
                  {tr('Need blood urgently? Submit a request and we will connect you with available donors in our network.', 'জরুরি রক্তের প্রয়োজন? আবেদন করুন এবং আমরা আপনাকে আমাদের নেটওয়ার্কের রক্তদাতাদের সাথে যোগাযোগ করিয়ে দেব।')}
                </p>
              </div>
              <div className="mt-6">
                <Link to="/blood-request" className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-bengali text-[13px] font-semibold text-white transition-opacity hover:opacity-90 animate-pulse" style={{ background: 'rgba(220,38,38,0.9)' }}>
                  {tr('Request Blood', 'রক্তের আবেদন করুন')} <Icon.Arrow className="h-3 w-3" />
                </Link>
              </div>
            </div>

            {/* Organise Camp Card */}
            <div className="rounded-[16px] p-6 flex flex-col justify-between" style={{ background: FJ.bg, border: `1px solid ${FJ.rule}` }}>
              <div>
                <span className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: 'rgba(194,65,12,0.08)' }}>
                  <Icon.Users className="h-5 w-5" style={{ color: FJ.brand }} />
                </span>
                <h3 className="mt-4 font-bengali text-[22px] font-bold" style={{ ...SERIF_BN, color: FJ.ink }}>
                  {t('events.bloodCamp')}
                </h3>
                <p className="mt-2 font-bengali text-[14px] leading-relaxed" style={{ color: FJ.ink2 }}>
                  {tr('Partner with us to host a blood donation camp in your locality, institution, or workplace.', 'আপনার এলাকা, প্রতিষ্ঠান বা কর্মক্ষেত্রে একটি রক্তদান শিবির আয়োজন করতে আমাদের সাথে যুক্ত হন।')}
                </p>
              </div>
              <div className="mt-6">
                <Link to="/organise-blood-camp" className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-bengali text-[13px] font-semibold transition-colors hover:bg-black/5" style={{ border: `1px solid ${FJ.rule}`, color: FJ.ink }}>
                  {tr('Organise Camp', 'শিবির আয়োজন করুন')} <Icon.Arrow className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════ CTA ════ */}
      <section style={{ background: FJ.bg }}>
        <div className="mx-auto max-w-[1320px] px-6 py-10 md:px-10">
          <div className="flex flex-col items-center justify-between gap-5 rounded-[16px] p-7 md:flex-row" style={{ background: FJ.paper, border: `1px solid ${FJ.rule}` }}>
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full" style={{ background: 'rgba(194,65,12,0.08)' }}>
                <Icon.Users className="h-5 w-5" style={{ color: FJ.brand }} />
              </span>
              <div>
                <h3 className="font-bengali text-[20px]" style={{ ...SERIF_BN, color: FJ.ink }}>{tr('Be a part of our next journey.', 'আমাদের পরবর্তী যাত্রার অংশ হন।')}</h3>
                <p className="mt-1 font-bengali text-[13.5px]" style={{ color: FJ.ink2 }}>{tr('Volunteer, donate or join our upcoming events.', 'স্বেচ্ছাসেবক হন, দান করুন বা আমাদের আসন্ন অনুষ্ঠানে যোগ দিন।')}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Link to="/volunteer" className="rounded-full px-5 py-2.5 font-bengali text-[13px] font-semibold transition-colors" style={{ border: `1px solid ${FJ.rule}`, color: FJ.ink }}>
                {tr('Volunteer', 'স্বেচ্ছাসেবক')}
              </Link>
              <Link to="/donate" className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-bengali text-[13px] font-semibold text-white transition-opacity hover:opacity-90" style={{ background: FJ.brand }}>
                {tr('Donate', 'দান করুন')} <Icon.Arrow className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}


