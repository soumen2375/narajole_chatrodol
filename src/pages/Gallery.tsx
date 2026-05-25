import { useCallback, useEffect, useMemo, useState } from 'react';
import { useGallery } from '@/hooks/useGallery';
import { useT } from '@/i18n';
import { PageShell, SERIF_BN, Icon, FJ } from './_field-journal';

// ════════════════════════════════════════════════════════════════════
//  Gallery — চিত্রশালা  (premium storytelling gallery)
// ════════════════════════════════════════════════════════════════════

const FALLBACK = '/assets/images/chatrodol.jpg';
const onErr = (e: React.SyntheticEvent<HTMLImageElement>) => { if (e.currentTarget.src.indexOf('chatrodol') < 0) e.currentTarget.src = FALLBACK; };

export default function Gallery() {
  const { lang } = useT();
  const bn = lang === 'bn';
  const tr = (en: string, bnT: string) => (bn ? bnT : en);
  const { items: all } = useGallery();

  const ALL = tr('All', 'সব');
  const [filter, setFilter] = useState<string>(ALL);
  const [query, setQuery] = useState('');
  const [visible, setVisible] = useState(12);
  const [lightbox, setLightbox] = useState<number | null>(null);

  const categories = useMemo(
    () => [ALL, ...Array.from(new Set(all.map((g) => g.category[lang]).filter(Boolean)))],
    [all, lang, ALL],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((g) => {
      if (filter !== ALL && g.category[lang] !== filter) return false;
      if (q && !`${g.alt[lang]} ${g.category[lang]} ${g.sub_category[lang]}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [all, filter, query, lang, ALL]);

  const featured = filtered.find((g) => /blood|রক্ত/i.test(g.category[lang])) ?? filtered[0];
  const shown = filtered.slice(0, visible);

  const reset = (fn: () => void) => { fn(); setVisible(12); };

  // lightbox navigation over the filtered list
  const openAt = useCallback((id: string) => {
    const idx = filtered.findIndex((g) => g.id === id);
    if (idx >= 0) setLightbox(idx);
  }, [filtered]);
  const step = useCallback((d: number) => {
    setLightbox((cur) => (cur === null ? cur : (cur + d + filtered.length) % filtered.length));
  }, [filtered.length]);

  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null);
      else if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'ArrowLeft') step(-1);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [lightbox, step]);

  const current = lightbox !== null ? filtered[lightbox] : null;

  return (
    <PageShell>
      {/* ════ HERO + STATS ════ */}
      <section style={{ background: FJ.bg }}>
        <div className="mx-auto grid max-w-[1320px] grid-cols-12 items-center gap-8 px-6 pb-10 pt-14 md:px-10 md:pt-20">
          <div className="col-span-12 lg:col-span-7">
            <div className="font-mono text-[11px] uppercase tracking-[0.22em]" style={{ color: FJ.brand }}>{tr('Our journey in pictures', 'ছবিতে আমাদের যাত্রা')}</div>
            <h1 className="mt-3 font-bengali text-[40px] leading-[1.05] md:text-[56px]" style={{ ...SERIF_BN, color: FJ.ink }}>
              {tr('Seven Years of Moments — Our Journey Captured Through the Lens.', 'সাত বছরের মুহূর্ত — ক্যামেরায় ধরা পড়া আমাদের যাত্রা।')}
            </h1>
            <p className="mt-5 max-w-xl font-bengali text-[16px] leading-[1.7]" style={{ color: FJ.ink2 }}>
              {tr('From blood donation camps to student support, environmental drives to community celebrations — these moments define our purpose and progress.', 'রক্তদান শিবির থেকে শিক্ষার্থী সহায়তা, পরিবেশ অভিযান থেকে সম্প্রদায়িক উদযাপন — প্রতিটি মুহূর্ত আমাদের উদ্দেশ্য ও অগ্রগতির গল্প বলে।')}
            </p>
          </div>
          <div className="col-span-12 lg:col-span-5">
            <div className="grid grid-cols-2 gap-4 rounded-[16px] p-6" style={{ background: FJ.paper, border: `1px solid ${FJ.rule}`, boxShadow: '0 12px 32px -16px rgba(28,25,23,0.18)' }}>
              <HeroStat n={`${Math.max(all.length, 50)}+`} label={tr('Captured Moments', 'ধরা মুহূর্ত')} icon={Icon.Quote} />
              <HeroStat n="100+" label={tr('Blood Camps', 'রক্তদান শিবির')} icon={Icon.Droplet} />
              <HeroStat n="300+" label={tr('Student Initiatives', 'শিক্ষার্থী উদ্যোগ')} icon={Icon.Grad} />
              <HeroStat n="7" label={tr('Years of Service', 'বছরের সেবা')} icon={Icon.Users} />
            </div>
          </div>
        </div>
      </section>

      {/* ════ FEATURED ════ */}
      {featured && filter === ALL && !query && (
        <section style={{ background: FJ.paper }}>
          <div className="mx-auto max-w-[1320px] px-6 pt-12 md:px-10">
            <button onClick={() => openAt(featured.id)} className="card-lift group relative block w-full overflow-hidden rounded-[18px] text-left" style={{ border: `1px solid ${FJ.rule}` }}>
              <div className="img-zoom"><img src={featured.src} onError={onErr} alt={featured.alt[lang]} className="h-[300px] w-full object-cover md:h-[400px]" /></div>
              <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(20,15,10,0.05) 0%, rgba(20,15,10,0.4) 55%, rgba(20,15,10,0.85) 100%)' }} />
              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-9">
                <span className="inline-flex items-center rounded-full px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white" style={{ background: FJ.brand }}>{tr('Featured story', 'বিশেষ গল্প')}</span>
                <h2 className="mt-3 max-w-3xl font-bengali text-[24px] leading-tight text-white md:text-[32px]" style={SERIF_BN}>{featured.alt[lang]}</h2>
                <span className="mt-3 inline-flex items-center gap-2 rounded-full px-4 py-2 font-bengali text-[13px] font-semibold" style={{ background: '#fff', color: FJ.ink }}>{tr('View story', 'গল্প দেখুন')} <Icon.Arrow className="h-3 w-3" style={{ color: FJ.brand }} /></span>
              </div>
            </button>
          </div>
        </section>
      )}

      {/* ════ FILTER + SEARCH ════ */}
      <section style={{ background: FJ.paper }}>
        <div className="mx-auto max-w-[1320px] px-6 pt-10 md:px-10">
          <div className="flex flex-col gap-3 rounded-[14px] p-4 lg:flex-row lg:items-center" style={{ background: FJ.bg, border: `1px solid ${FJ.rule}` }}>
            <div className="flex flex-1 flex-wrap items-center gap-2">
              {categories.map((c) => {
                const active = filter === c;
                return (
                  <button key={c} type="button" onClick={() => reset(() => setFilter(c))}
                    className="rounded-full px-3.5 py-1.5 font-bengali text-[12.5px] font-medium transition-all"
                    style={{ background: active ? FJ.brand : FJ.paper, color: active ? '#fff' : FJ.ink2, border: `1px solid ${active ? FJ.brand : FJ.rule}`, boxShadow: active ? `0 6px 16px -8px ${FJ.brand}` : 'none' }}>
                    {c}
                  </button>
                );
              })}
            </div>
            <div className="relative">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2" style={{ color: FJ.muted }}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" strokeLinecap="round" /></svg>
              <input value={query} onChange={(e) => reset(() => setQuery(e.target.value))} placeholder={tr('Search gallery…', 'গ্যালারি খুঁজুন…')} className="w-full rounded-[8px] py-2 pl-9 pr-3 font-bengali text-[13px] outline-none lg:w-56" style={{ background: FJ.paper, color: FJ.ink, border: `1px solid ${FJ.rule}` }} />
            </div>
          </div>
          <div className="mt-3 px-1 font-mono text-[10.5px] uppercase tracking-[0.22em]" style={{ color: FJ.muted }}>{filtered.length} {tr('photographs', 'ছবি')}</div>
        </div>
      </section>

      {/* ════ MASONRY ════ */}
      <section style={{ background: FJ.paper }}>
        <div className="mx-auto max-w-[1320px] px-6 pb-16 pt-6 md:px-10">
          {shown.length === 0 ? (
            <div className="rounded-[14px] py-20 text-center" style={{ border: `1px dashed ${FJ.rule}` }}>
              <p className="font-bengali text-[15px]" style={{ color: FJ.ink }}>{tr('No photographs match.', 'কোনো ছবি মেলেনি।')}</p>
            </div>
          ) : (
            <div className="columns-1 gap-5 sm:columns-2 lg:columns-3">
              {shown.map((g) => (
                <button key={g.id} onClick={() => openAt(g.id)} className="card-lift group mb-5 block w-full break-inside-avoid overflow-hidden rounded-[12px] text-left" style={{ background: FJ.bg, border: `1px solid ${FJ.rule}` }}>
                  <div className="img-zoom relative">
                    <img src={g.src} onError={onErr} loading="lazy" alt={g.alt[lang]} className="block h-auto w-full" />
                    <div className="pointer-events-none absolute inset-0 flex flex-col justify-end p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: 'linear-gradient(180deg, transparent 45%, rgba(20,15,10,0.78))' }}>
                      <div className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-white/80">{g.category[lang]}</div>
                      <div className="mt-1 font-bengali text-[15px] leading-snug text-white">{g.alt[lang]}</div>
                      <div className="mt-1.5 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.16em] text-white/90">{tr('View', 'দেখুন')} <Icon.Arrow className="h-2.5 w-2.5" /></div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {visible < filtered.length && (
            <div className="mt-8 text-center">
              <button onClick={() => setVisible((v) => v + 12)} className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 font-bengali text-[13.5px] font-semibold transition-colors" style={{ border: `1px solid ${FJ.rule}`, color: FJ.ink }}>
                {tr('Load more photos', 'আরও ছবি দেখুন')} <Icon.Arrow className="h-3 w-3" style={{ color: FJ.brand }} />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ════ LIGHTBOX ════ */}
      {current && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(15,12,10,0.92)' }} onClick={() => setLightbox(null)}>
          <button onClick={() => setLightbox(null)} className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full text-white" style={{ background: 'rgba(255,255,255,0.12)' }} aria-label="Close">✕</button>
          <button onClick={(e) => { e.stopPropagation(); step(-1); }} className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-[20px] text-white md:left-6" style={{ background: 'rgba(255,255,255,0.12)' }} aria-label="Previous">‹</button>
          <button onClick={(e) => { e.stopPropagation(); step(1); }} className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-[20px] text-white md:right-6" style={{ background: 'rgba(255,255,255,0.12)' }} aria-label="Next">›</button>
          <figure className="max-h-[88vh] max-w-[1000px]" onClick={(e) => e.stopPropagation()}>
            <img src={current.src} onError={onErr} alt={current.alt[lang]} className="mx-auto max-h-[78vh] w-auto rounded-[8px] object-contain" />
            <figcaption className="mt-3 text-center">
              <div className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: '#fca47e' }}>{current.category[lang]}</div>
              <div className="mt-1 font-bengali text-[15px] text-white">{current.alt[lang]}</div>
              <div className="mt-1 font-mono text-[11px] text-white/50">{(lightbox ?? 0) + 1} / {filtered.length}</div>
              {current.more && <a href={current.more} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 font-bengali text-[12.5px] font-semibold" style={{ color: '#fca47e' }}>{tr('More', 'আরও')} <Icon.Arrow className="h-3 w-3" /></a>}
            </figcaption>
          </figure>
        </div>
      )}
    </PageShell>
  );
}

function HeroStat({ n, label, icon: I }: { n: string; label: string; icon: typeof Icon.Heart }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: 'rgba(194,65,12,0.08)' }}><I className="h-4 w-4" style={{ color: FJ.brand }} /></span>
      <span>
        <span className="block font-bengali text-[20px] font-extrabold leading-none" style={{ ...SERIF_BN, color: FJ.ink }}>{n}</span>
        <span className="block font-bengali text-[11.5px] leading-tight" style={{ color: FJ.ink2 }}>{label}</span>
      </span>
    </div>
  );
}
