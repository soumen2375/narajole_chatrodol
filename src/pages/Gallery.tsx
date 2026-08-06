import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FaPlay,
  FaChevronLeft, FaChevronRight, FaMagnifyingGlass,
} from 'react-icons/fa6';
import { useGallery } from '@/hooks/useGallery';
import { useT } from '@/i18n';
import { PageShell, SERIF_BN, Icon, FJ } from './_field-journal';
import Breadcrumb from '@/components/ui/Breadcrumb';

// ════════════════════════════════════════════════════════════════════
//  Gallery — চিত্রশালা
// ════════════════════════════════════════════════════════════════════

const FALLBACK = '/assets/images/Chhatradol.jpg';
const onErr = (e: React.SyntheticEvent<HTMLImageElement>) => {
  if (e.currentTarget.src.indexOf('Chhatradol') < 0) e.currentTarget.src = FALLBACK;
};

export default function Gallery() {
  const { lang } = useT();
  const bn = lang === 'bn';
  const tr = (en: string, bnT: string) => (bn ? bnT : en);
  const { items: all, loading } = useGallery();

  // ── Showcase carousel ──
  const [slideIdx, setSlideIdx] = useState(0);
  const slides = useMemo(() => (all.length > 0 ? all.slice(0, 10) : []), [all]);
  const currentSlide = slides[slideIdx] ?? null;

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setTimeout(() => setSlideIdx((i) => (i + 1) % slides.length), 4500);
    return () => clearTimeout(t);
  }, [slideIdx, slides.length]);

  const slidePrev = () => setSlideIdx((i) => (i - 1 + slides.length) % slides.length);
  const slideNext = () => setSlideIdx((i) => (i + 1) % slides.length);

  // ── Filter / grid ──
  const ALL = tr('All', 'সব');
  const [filter, setFilter]     = useState<string>(ALL);
  const [query, setQuery]       = useState('');
  const [sort, setSort]         = useState<'latest' | 'oldest'>('latest');
  const [visible, setVisible]   = useState(12);
  const [lightbox, setLightbox] = useState<number | null>(null);

  const categories = useMemo(
    () => [ALL, ...Array.from(new Set(all.map((g) => g.category[lang] || g.category.en || g.category.bn).filter(Boolean)))],
    [all, lang, ALL],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = all.filter((g) => {
      const cat = g.category[lang] || g.category.en || g.category.bn;
      const alt = g.alt[lang] || g.alt.en || g.alt.bn;
      const sub = g.sub_category[lang] || g.sub_category.en || g.sub_category.bn;
      if (filter !== ALL && cat !== filter) return false;
      if (q && !`${alt} ${cat} ${sub}`.toLowerCase().includes(q)) return false;
      return true;
    });
    return sort === 'oldest' ? [...base].reverse() : base;
  }, [all, filter, query, lang, ALL, sort]);

  const shown = filtered.slice(0, visible);
  const reset = (fn: () => void) => { fn(); setVisible(12); };

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
      <Breadcrumb title="Gallery" />

      {/* ════ CINEMA SHOWCASE (top of page) ════ */}
      <section style={{ background: '#0d0c0a' }}>
        <div className="mx-auto max-w-[1320px] px-6 py-8 md:px-10">
          <div className="relative overflow-hidden rounded-[18px]" style={{ background: '#1c1917', minHeight: '320px' }}>
            <div className="grid min-h-[320px] grid-cols-12">

              {/* Left: text + CTAs */}
              <div className="col-span-12 flex flex-col justify-center px-8 py-10 md:col-span-4 md:px-9 lg:col-span-4">
                <h2 className="font-bengali text-[24px] leading-[1.3] text-white md:text-[28px]" style={SERIF_BN}>
                  {tr('Captured Moments of Service & Impact', 'সেবা ও প্রভাবের ধরা মুহূর্ত')}
                </h2>
                <div className="mt-2.5 h-[3px] w-9 rounded-full" style={{ background: FJ.brand }} />
                <p className="mt-4 font-bengali text-[13px] leading-[1.75]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {tr(
                    'Blood donation camps, education drives, health outreach, cultural programmes, and community welfare — our journey through real moments.',
                    'রক্তদান শিবির, শিক্ষা অভিযান, স্বাস্থ্যসেবা, সাংস্কৃতিক কার্যক্রম এবং সামাজিক কল্যাণ — বাস্তব মুহূর্তের মাধ্যমে আমাদের যাত্রা।',
                  )}
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <button
                    onClick={() => document.getElementById('gallery-grid')?.scrollIntoView({ behavior: 'smooth' })}
                    className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-bengali text-[13px] font-semibold text-white transition-opacity hover:opacity-85"
                    style={{ background: FJ.brand }}
                  >
                    {tr('View All Photos', 'সব ছবি দেখুন')} <Icon.Arrow className="h-3 w-3" />
                  </button>
                  <button
                    className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-bengali text-[13px] font-medium text-white"
                    style={{ border: '1px solid rgba(255,255,255,0.18)' }}
                  >
                    <FaPlay className="h-3 w-3" style={{ color: FJ.brand }} />
                    {tr('Watch Stories', 'গল্প দেখুন')}
                  </button>
                </div>
              </div>

              {/* Right: image */}
              <div className="relative col-span-12 md:col-span-8" style={{ minHeight: '320px' }}>
                {currentSlide ? (
                  <>
                    <img
                      src={currentSlide.src}
                      onError={onErr}
                      alt={currentSlide.alt[lang]}
                      className="h-full w-full object-cover"
                      style={{ minHeight: '320px', maxHeight: '420px' }}
                    />
                    {/* Left-side gradient blend */}
                    <div className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(90deg,#1c1917 0%,transparent 18%)' }} />
                    {/* Bottom caption gradient */}
                    <div className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(180deg,transparent 55%,rgba(10,8,6,0.7) 100%)' }} />

                    {/* Caption */}
                    <div className="absolute bottom-0 left-0 right-0 p-5">
                      <div className="font-bengali text-[15px] font-semibold text-white drop-shadow">
                        {currentSlide.alt[lang] || currentSlide.alt.en || currentSlide.alt.bn}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[10.5px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
                        <span>{currentSlide.category[lang] || currentSlide.category.en || currentSlide.category.bn}</span>
                        <span>·</span>
                        <span>{tr('Narajole, West Bengal', 'নারাজোল, পশ্চিমবঙ্গ')}</span>
                      </div>
                    </div>

                    {/* Nav arrows */}
                    <button
                      onClick={slidePrev}
                      className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-white transition-all hover:bg-white/20"
                      style={{ background: 'rgba(255,255,255,0.12)' }}
                    >
                      <FaChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={slideNext}
                      className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-white transition-all hover:bg-white/20"
                      style={{ background: 'rgba(255,255,255,0.12)' }}
                    >
                      <FaChevronRight className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <div className="h-full w-full animate-pulse" style={{ background: '#2a2825', minHeight: '320px' }} />
                )}
              </div>
            </div>
          </div>
        </div>
      </section>



      {/* ════ FILTER + SEARCH ════ */}
      <section id="gallery-grid" style={{ background: FJ.bg }}>
        <div className="mx-auto max-w-[1320px] px-6 pt-8 pb-3 md:px-10">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            {/* Category pills */}
            <div className="flex flex-1 flex-wrap items-center gap-2">
              {categories.map((c) => {
                const active = filter === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => reset(() => setFilter(c))}
                    className="rounded-full px-4 py-1.5 font-bengali text-[12.5px] font-medium transition-all"
                    style={{
                      background: active ? FJ.brand : FJ.paper,
                      color: active ? '#fff' : FJ.ink2,
                      border: `1px solid ${active ? FJ.brand : FJ.rule}`,
                    }}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
            {/* Search */}
            <div className="relative">
              <FaMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2" style={{ color: FJ.muted }} />
              <input
                value={query}
                onChange={(e) => reset(() => setQuery(e.target.value))}
                placeholder={tr('Search gallery…', 'গ্যালারি খুঁজুন…')}
                className="w-full rounded-[8px] py-2 pl-9 pr-3 font-bengali text-[13px] outline-none lg:w-52"
                style={{ background: FJ.paper, color: FJ.ink, border: `1px solid ${FJ.rule}` }}
              />
            </div>
          </div>

          {/* Sort */}
          <div className="mt-3 flex items-center justify-end">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10.5px]" style={{ color: FJ.muted }}>{tr('Sort by:', 'সাজান:')}</span>
              <select
                value={sort}
                onChange={(e) => reset(() => setSort(e.target.value as 'latest' | 'oldest'))}
                className="cursor-pointer rounded-[6px] px-2 py-1 font-bengali text-[12px] outline-none"
                style={{ background: FJ.paper, color: FJ.ink2, border: `1px solid ${FJ.rule}` }}
              >
                <option value="latest">{tr('Latest', 'সর্বশেষ')}</option>
                <option value="oldest">{tr('Oldest', 'পুরনো')}</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* ════ PHOTO GRID ════ */}
      <section style={{ background: FJ.bg }}>
        <div className="mx-auto max-w-[1320px] px-6 pb-16 pt-4 md:px-10">
          {loading ? (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-[10px] animate-pulse" style={{ border: `1px solid ${FJ.rule}` }}>
                  <div className="aspect-square w-full" style={{ background: '#f5f5f4' }} />
                </div>
              ))}
            </div>
          ) : shown.length === 0 ? (
            <div className="rounded-[14px] py-20 text-center" style={{ border: `1px dashed ${FJ.rule}` }}>
              <p className="font-bengali text-[15px]" style={{ color: FJ.ink }}>
                {tr('No photographs match.', 'কোনো ছবি মেলেনি।')}
              </p>
            </div>
          ) : (
            <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-3">
              {shown.map((g) => {
                const categoryText = g.category[lang] || g.category.en || g.category.bn;
                const altText = g.alt[lang] || g.alt.en || g.alt.bn;
                return (
                  <button
                    key={g.id}
                    onClick={() => openAt(g.id)}
                    className="card-lift group mb-3 block w-full break-inside-avoid overflow-hidden rounded-[10px] text-left"
                    style={{ border: `1px solid ${FJ.rule}` }}
                  >
                    <div className="img-zoom relative">
                      <img src={g.src} onError={onErr} loading="lazy" alt={altText} className="block h-auto max-h-[420px] w-full object-cover" />
                      <div
                        className="pointer-events-none absolute inset-0 flex flex-col justify-end p-3"
                        style={{ background: 'linear-gradient(180deg, transparent 35%, rgba(20,15,10,0.85))' }}
                      >
                        {categoryText && (
                          <div className="font-mono text-[9px] uppercase tracking-[0.2em] font-semibold text-white/80">
                            {categoryText}
                          </div>
                        )}
                        {altText && (
                          <div
                            className="mt-0.5 font-bengali text-[13px] font-semibold leading-snug text-white"
                            style={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } as React.CSSProperties}
                          >
                            {altText}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {visible < filtered.length && (
            <div className="mt-8 text-center">
              <button
                onClick={() => setVisible((v) => v + 12)}
                className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 font-bengali text-[13.5px] font-semibold transition-colors hover:bg-stone-100"
                style={{ border: `1px solid ${FJ.rule}`, color: FJ.ink }}
              >
                {tr('Load more photos', 'আরও ছবি দেখুন')} <Icon.Arrow className="h-3 w-3" style={{ color: FJ.brand }} />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ════ LIGHTBOX ════ */}
      {current && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6"
          style={{ background: 'rgba(15,12,10,0.95)' }}
          onClick={() => setLightbox(null)}
        >
          <button onClick={() => setLightbox(null)} className="absolute right-3 top-3 sm:right-6 sm:top-6 flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full text-white z-10 transition-transform active:scale-95" style={{ background: 'rgba(255,255,255,0.2)' }} aria-label="Close">✕</button>
          <button onClick={(e) => { e.stopPropagation(); step(-1); }} className="absolute left-2 top-1/2 flex h-9 w-9 sm:h-11 sm:w-11 -translate-y-1/2 items-center justify-center rounded-full text-white z-10 md:left-6 transition-transform active:scale-95" style={{ background: 'rgba(255,255,255,0.2)' }} aria-label="Previous">
            <FaChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); step(1); }} className="absolute right-2 top-1/2 flex h-9 w-9 sm:h-11 sm:w-11 -translate-y-1/2 items-center justify-center rounded-full text-white z-10 md:right-6 transition-transform active:scale-95" style={{ background: 'rgba(255,255,255,0.2)' }} aria-label="Next">
            <FaChevronRight className="h-4 w-4" />
          </button>
          <figure className="max-h-[85vh] max-w-[92vw] sm:max-w-[1000px] overflow-y-auto px-1" onClick={(e) => e.stopPropagation()}>
            <img src={current.src} onError={onErr} alt={current.alt[lang]} className="mx-auto max-h-[62vh] sm:max-h-[74vh] w-auto max-w-full rounded-[8px] object-contain" />
            <figcaption className="mt-3 text-center px-2">
              <div className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: '#fca47e' }}>
                {current.category[lang] || current.category.en || current.category.bn}
              </div>
              <div className="mt-1 font-bengali text-[13.5px] sm:text-[15px] text-white leading-snug">
                {current.alt[lang] || current.alt.en || current.alt.bn}
              </div>
              <div className="mt-1 font-mono text-[11px] text-white/50">{(lightbox ?? 0) + 1} / {filtered.length}</div>
              {current.more && (
                <a href={current.more} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 font-bengali text-[12.5px] font-semibold" style={{ color: '#fca47e' }}>
                  {tr('More', 'আরও')} <Icon.Arrow className="h-3 w-3" />
                </a>
              )}
            </figcaption>
          </figure>
        </div>
      )}
    </PageShell>
  );
}


