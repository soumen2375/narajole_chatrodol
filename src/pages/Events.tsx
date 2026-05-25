import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePosts } from '@/hooks/usePosts';
import { useCategories } from '@/hooks/useCategories';
import { useT } from '@/i18n';
import { PageShell, SERIF_BN, Icon, FJ } from './_field-journal';

// ════════════════════════════════════════════════════════════════════
//  Events — অনুষ্ঠান ও খবর  (editorial programmes & events listing)
// ════════════════════════════════════════════════════════════════════

const PAGE_SIZE = 9;
const FALLBACK_IMG = '/assets/images/chatrodol.jpg';

const onImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
  if (e.currentTarget.src.indexOf('chatrodol') < 0) e.currentTarget.src = FALLBACK_IMG;
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
  const { posts } = usePosts();
  const { flat: categories } = useCategories();
  const { t, lang } = useT();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);

  const [filter, setFilter] = useState('all');
  const [year, setYear] = useState('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

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
    return posts.filter((p) => {
      if (filter !== 'all' && p.category !== filter) return false;
      if (year !== 'all' && yearOf(p.publishedDate) !== year) return false;
      if (q && !(`${p.title} ${excerpt(p.content, 400)}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [posts, filter, year, query]);

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
      {/* ════ HERO + STATS ════ */}
      <section style={{ background: FJ.bg }}>
        <div className="mx-auto grid max-w-[1320px] grid-cols-12 items-center gap-8 px-6 pb-10 pt-14 md:px-10 md:pt-20">
          <div className="col-span-12 lg:col-span-7">
            <div className="font-mono text-[11px] uppercase tracking-[0.22em]" style={{ color: FJ.brand }}>
              {tr('Our Programmes & Events', 'আমাদের কর্মসূচি ও অনুষ্ঠান')}
            </div>
            <h1 className="mt-3 font-bengali text-[40px] leading-[1.05] md:text-[56px]" style={{ ...SERIF_BN, color: FJ.ink }}>
              {t('events.heroTitle')}
            </h1>
            <p className="mt-5 max-w-xl font-bengali text-[16px] leading-[1.7]" style={{ color: FJ.ink2 }}>
              {t('events.heroLede')}
            </p>
          </div>

          <div className="col-span-12 lg:col-span-5">
            <div className="grid grid-cols-2 gap-4 rounded-[16px] p-6 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4" style={{ background: FJ.paper, border: `1px solid ${FJ.rule}`, boxShadow: '0 12px 32px -16px rgba(28,25,23,0.18)' }}>
              <HeroStat icon={Icon.Award}   n={`${Math.max(posts.length, 40)}+`} label={tr('Programmes', 'কর্মসূচি')} />
              <HeroStat icon={Icon.Droplet} n="25+"  label={tr('Blood Camps', 'রক্তদান শিবির')} />
              <HeroStat icon={Icon.Users}   n="7"    label={tr('Years of Service', 'বছরের সেবা')} />
              <HeroStat icon={Icon.Grad}    n="500+" label={tr('Beneficiaries', 'উপকারভোগী')} />
            </div>
          </div>
        </div>
      </section>

      {/* ════ FEATURED ════ */}
      {featured && safePage === 1 && (
        <section style={{ background: FJ.paper }}>
          <div className="mx-auto max-w-[1320px] px-6 pt-12 md:px-10">
            <Link to={`/events/${featured.id}`} className="card-lift group relative block overflow-hidden rounded-[18px]" style={{ border: `1px solid ${FJ.rule}` }}>
              <div className="img-zoom">
                <img src={featured.featuredImage || FALLBACK_IMG} onError={onImgError} alt={featured.title} className="h-[300px] w-full object-cover md:h-[380px]" />
              </div>
              <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(20,15,10,0.05) 0%, rgba(20,15,10,0.45) 55%, rgba(20,15,10,0.88) 100%)' }} />
              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-9">
                <span className="inline-flex items-center rounded-full px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white" style={{ background: FJ.brand }}>
                  {tr('Featured', 'বিশেষ')} · {featured.category}
                </span>
                <h2 className="mt-3 max-w-3xl font-bengali text-[26px] leading-tight text-white md:text-[34px]" style={SERIF_BN}>{featured.title}</h2>
                <p className="mt-2 hidden max-w-2xl font-bengali text-[14px] leading-relaxed text-white/80 sm:line-clamp-2">{excerpt(featured.content, 180)}…</p>
                <div className="mt-4 flex flex-wrap items-center gap-4">
                  <span className="inline-flex items-center gap-2 rounded-full px-4 py-2 font-bengali text-[13px] font-semibold" style={{ background: '#fff', color: FJ.ink }}>
                    {t('events.readMore')} <Icon.Arrow className="h-3 w-3" style={{ color: FJ.brand }} />
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-bengali text-[12.5px] text-white/80"><CalIcon className="h-3.5 w-3.5" /> {featured.publishedDate}</span>
                </div>
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* ════ FILTERS ════ */}
      <section style={{ background: FJ.paper }}>
        <div className="mx-auto max-w-[1320px] px-6 pt-10 md:px-10">
          <div className="flex flex-col gap-3 rounded-[14px] p-4 lg:flex-row lg:items-center" style={{ background: FJ.bg, border: `1px solid ${FJ.rule}` }}>
            <div className="flex flex-1 flex-wrap items-center gap-2">
              {[{ id: 'all', name: t('events.catAll') }, ...topLevelCats.map((c) => ({ id: c.name, name: c.name }))].map((c) => {
                const active = filter === c.id;
                return (
                  <button key={c.id} type="button" onClick={() => reset(() => setFilter(c.id))}
                    className="rounded-full px-3.5 py-1.5 font-bengali text-[12.5px] font-medium transition-all"
                    style={{ background: active ? FJ.brand : FJ.paper, color: active ? '#fff' : FJ.ink2, border: `1px solid ${active ? FJ.brand : FJ.rule}`, boxShadow: active ? `0 6px 16px -8px ${FJ.brand}` : 'none' }}>
                    {c.name}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2.5">
              <select value={year} onChange={(e) => reset(() => setYear(e.target.value))}
                className="rounded-[8px] px-3 py-2 font-bengali text-[13px] outline-none" style={{ background: FJ.paper, color: FJ.ink2, border: `1px solid ${FJ.rule}` }}>
                <option value="all">{tr('All Years', 'সব বছর')}</option>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2" style={{ color: FJ.muted }} />
                <input value={query} onChange={(e) => reset(() => setQuery(e.target.value))} placeholder={tr('Search events…', 'অনুষ্ঠান খুঁজুন…')}
                  className="w-full rounded-[8px] py-2 pl-9 pr-3 font-bengali text-[13px] outline-none lg:w-52" style={{ background: FJ.paper, color: FJ.ink, border: `1px solid ${FJ.rule}` }} />
              </div>
            </div>
          </div>
          <div className="mt-3 px-1 font-mono text-[10.5px] uppercase tracking-[0.22em]" style={{ color: FJ.muted }}>
            {filtered.length} {t('events.entries')}
          </div>
        </div>
      </section>

      {/* ════ GRID ════ */}
      <section style={{ background: FJ.paper }}>
        <div className="mx-auto max-w-[1320px] px-6 pb-16 pt-8 md:px-10">
          {slice.length === 0 ? (
            <div className="rounded-[14px] py-20 text-center" style={{ border: `1px dashed ${FJ.rule}` }}>
              <p className="font-bengali text-[16px]" style={{ color: FJ.ink }}>{tr('No events match your search.', 'আপনার অনুসন্ধানে কিছু মেলেনি।')}</p>
              <button onClick={() => reset(() => { setFilter('all'); setYear('all'); setQuery(''); })} className="mt-3 font-bengali text-[13px] font-semibold" style={{ color: FJ.brand }}>
                {tr('Clear filters', 'ফিল্টার মুছুন')}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
              {slice.map((p) => (
                <article key={p.id} className="card-lift group flex flex-col overflow-hidden rounded-[16px]" style={{ background: FJ.paper, border: `1px solid ${FJ.rule}`, boxShadow: '0 10px 28px -18px rgba(28,25,23,0.22)' }}>
                  <div className="img-zoom relative">
                    <img src={p.featuredImage || FALLBACK_IMG} onError={onImgError} alt={p.title} className="aspect-[16/10] w-full object-cover" />
                    <span className="absolute left-3 top-3 inline-flex items-center rounded-full px-2.5 py-1 font-mono text-[9.5px] font-bold uppercase tracking-[0.16em] text-white" style={{ background: FJ.brand }}>
                      {p.category}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <span className="inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.16em]" style={{ color: FJ.muted }}>
                      <CalIcon className="h-3 w-3" /> {p.publishedDate}
                    </span>
                    <h3 className="mt-2 font-bengali text-[19px] leading-snug" style={{ ...SERIF_BN, color: FJ.ink }}>{p.title}</h3>
                    <p className="mt-2 line-clamp-2 font-bengali text-[13.5px] leading-relaxed" style={{ color: FJ.ink2 }}>{excerpt(p.content)}…</p>
                    <Link to={`/events/${p.id}`}
                      className="mt-4 inline-flex items-center gap-1.5 self-start rounded-full px-4 py-2 font-bengali text-[12.5px] font-semibold transition-all duration-200 group-hover:gap-2.5"
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

function HeroStat({ icon: I, n, label }: { icon: typeof Icon.Heart; n: string; label: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full" style={{ background: 'rgba(194,65,12,0.08)' }}>
        <I className="h-4 w-4" style={{ color: FJ.brand }} />
      </span>
      <span className="mt-2 font-bengali text-[22px] font-extrabold leading-none" style={{ ...SERIF_BN, color: FJ.ink }}>{n}</span>
      <span className="mt-1 font-bengali text-[11.5px] leading-tight" style={{ color: FJ.ink2 }}>{label}</span>
    </div>
  );
}
