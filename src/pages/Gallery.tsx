import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FaChevronLeft, FaChevronRight, FaMagnifyingGlass, FaRotateLeft, FaArrowRight
} from 'react-icons/fa6';
import { useGallery } from '@/hooks/useGallery';
import { useT } from '@/i18n';
import { useSEO } from '@/hooks/useSEO';
import { SEO } from '@/data/seoConfig';
import { PageShell, SERIF_BN, SERIF_EN, Icon, FJ } from './_field-journal';
import Breadcrumb from '@/components/ui/Breadcrumb';

// ════════════════════════════════════════════════════════════════════
//  Gallery — চিত্রশালা (Pixabay Mobile-Matching Design)
// ════════════════════════════════════════════════════════════════════

const FALLBACK = '/assets/images/Chhatradol.jpg';
const onErr = (e: React.SyntheticEvent<HTMLImageElement>) => {
  if (e.currentTarget.src.indexOf('Chhatradol') < 0) e.currentTarget.src = FALLBACK;
};

export default function Gallery() {
  const { lang } = useT();
  const bn = lang === 'bn';
  useSEO(SEO['/gallery']);
  const tr = (en: string, bnT: string) => (bn ? bnT : en);
  const { items: all, loading } = useGallery();

  // ── Showcase carousel slides ──
  const [slideIdx, setSlideIdx] = useState(0);
  const slides = useMemo(() => (all.length > 0 ? all.slice(0, 10) : []), [all]);
  const currentSlide = slides[slideIdx] ?? null;

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setTimeout(() => setSlideIdx((i) => (i + 1) % slides.length), 5000);
    return () => clearTimeout(t);
  }, [slideIdx, slides.length]);

  const slidePrev = () => setSlideIdx((i) => (i - 1 + slides.length) % slides.length);
  const slideNext = () => setSlideIdx((i) => (i + 1) % slides.length);

  // ── Filter / grid state — show 10 photos at a time ──
  const ALL = tr('All', 'সব');
  const [filter, setFilter]     = useState<string>(ALL);
  const [query, setQuery]       = useState('');
  const [sort, setSort]         = useState<'latest' | 'oldest'>('latest');
  const [visible, setVisible]   = useState(10);
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
  const reset = (fn: () => void) => { fn(); setVisible(10); };

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

      {/* ════ PIXABAY-STYLE FULL-PHOTO HERO BANNER ════ */}
      <section className="relative min-h-[480px] sm:min-h-[520px] md:min-h-[560px] w-full overflow-hidden flex flex-col justify-between py-8 sm:py-12 px-4 sm:px-6 md:px-10 bg-stone-950">
        {/* Full-size Featured Photo Background with Smooth Crossfade */}
        <div className="absolute inset-0 z-0">
          {slides.map((slide, idx) => (
            <img
              key={slide.id || idx}
              src={slide.src}
              onError={onErr}
              alt={slide.alt[lang] || ''}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${
                idx === slideIdx ? 'opacity-100 scale-100' : 'opacity-0 scale-105 pointer-events-none'
              }`}
            />
          ))}
          {/* Lightened Dark Overlay so background photo is visible */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/35 to-black/65" />
        </div>

        {/* Top Spacer */}
        <div className="relative z-10 w-full" />

        {/* Center Content */}
        <div className="relative z-10 mx-auto w-full max-w-4xl text-center py-5 sm:py-8">
          {/* Title in soft grey */}
          <h1
            className="font-bengali text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-stone-200 leading-snug drop-shadow-lg px-2"
            style={bn ? SERIF_BN : SERIF_EN}
          >
            {tr('Captured Moments of Service & Impact', 'সেবা, সমাজ কল্যাণ ও প্রভাবের স্থির মুহূর্তসমূহ')}
          </h1>

          {/* Category Filter Tabs (Scrollable Row WITHOUT visible scrollbar) */}
          <div className="mt-6 sm:mt-8 flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-1 px-1 snap-x [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {categories.map((c) => {
              const active = filter === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => reset(() => setFilter(c))}
                  className={`snap-center shrink-0 rounded-full px-4 sm:px-5 py-1.5 sm:py-2 font-bengali text-xs sm:text-sm font-semibold transition-all duration-200 ${
                    active
                      ? 'bg-white text-stone-900 shadow-lg scale-105'
                      : 'bg-black/40 hover:bg-white/20 text-white/90 border border-white/20 backdrop-blur-md'
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>

          {/* Search Bar */}
          <div className="mt-4 sm:mt-6 mx-auto w-full max-w-2xl relative px-1">
            <div className="relative flex items-center">
              <FaMagnifyingGlass className="absolute left-4 sm:left-5 text-stone-300 text-xs sm:text-base pointer-events-none z-10" />
              <input
                type="text"
                value={query}
                onChange={(e) => reset(() => setQuery(e.target.value))}
                placeholder={tr('Search photos, activities, events...', 'ছবি, ঘটনা বা কার্যক্রমের নাম দিয়ে খুঁজুন...')}
                className="w-full rounded-full py-3 sm:py-4 pl-10 sm:pl-14 pr-10 text-xs sm:text-base bg-black/40 hover:bg-black/50 focus:bg-black/70 text-white placeholder-stone-300/80 border border-white/30 shadow-2xl backdrop-blur-md outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 transition-all font-bengali"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => reset(() => setQuery(''))}
                  className="absolute right-3.5 sm:right-4 text-stone-300 hover:text-white text-xs bg-white/20 hover:bg-white/30 w-6 h-6 rounded-full flex items-center justify-center transition-all z-10"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Popular Tags (Scrollable Row WITHOUT visible scrollbar) */}
          <div className="mt-3 sm:mt-4 flex items-center justify-start sm:justify-center gap-1.5 sm:gap-2 font-bengali text-xs overflow-x-auto pb-1 px-1 snap-x [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <span className="text-stone-300 text-xs mr-1 font-medium drop-shadow shrink-0">{tr('Popular:', 'জনপ্রিয়:')}</span>
            {[
              { en: 'Blood Camp', bn: 'রক্তদান শিবির', query: 'blood' },
              { en: 'Health Checkup', bn: 'স্বাস্থ্য পরীক্ষা', query: 'health' },
              { en: 'Education Drive', bn: 'শিক্ষা সাহায্য', query: 'education' },
              { en: 'Tree Plantation', bn: 'বৃক্ষরোপণ', query: 'tree' },
            ].map((tag) => (
              <button
                key={tag.en}
                type="button"
                onClick={() => reset(() => setQuery(tag.query))}
                className="snap-center shrink-0 rounded-lg px-2.5 py-1 bg-black/40 hover:bg-white/20 text-stone-200 hover:text-white border border-white/15 backdrop-blur-md transition-all text-xs"
              >
                #{tr(tag.en, tag.bn)}
              </button>
            ))}
          </div>
        </div>

        {/* Bottom Info Bar */}
        <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col items-center justify-center gap-1.5 pt-2 text-white/90 text-center">
          {/* Featured Photo Caption */}
          {currentSlide && (
            <div className="text-xs text-stone-200/90 font-medium drop-shadow truncate max-w-full px-4">
              <span className="text-stone-300/80">
                {tr('Featured:', 'বিশেষ:')}{' '}
              </span>
              <span className="font-semibold text-white">
                {currentSlide.alt[lang] || currentSlide.alt.en || currentSlide.alt.bn}
              </span>
            </div>
          )}

          {/* Slide Navigation Dots */}
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={slidePrev}
              className="p-1 text-white/70 hover:text-white transition-all active:scale-95"
              aria-label="Previous Slide"
            >
              <FaChevronLeft className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-center gap-1.5">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSlideIdx(idx)}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    idx === slideIdx ? 'w-5 bg-white shadow' : 'w-1.5 bg-white/40 hover:bg-white/70'
                  }`}
                  aria-label={`Slide ${idx + 1}`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={slideNext}
              className="p-1 text-white/70 hover:text-white transition-all active:scale-95"
              aria-label="Next Slide"
            >
              <FaChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* ════ PHOTO GRID SECTION ════ */}
      <section id="gallery-grid" className="py-6 sm:py-8" style={{ background: FJ.bg }}>
        <div className="mx-auto max-w-[1320px] px-4 sm:px-6 md:px-10">
          {/* Filter Bar: Reset & Sort */}
          <div className="flex items-center justify-between pb-4 border-b border-stone-200/80 mb-6">
            {(filter !== ALL || query) ? (
              <button
                type="button"
                onClick={() => reset(() => { setFilter(ALL); setQuery(''); })}
                className="inline-flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900 font-semibold"
              >
                <FaRotateLeft className="w-3 h-3" />
                {tr('Reset filters', 'ফিল্টার মুছুন')}
              </button>
            ) : <div />}

            <div className="flex items-center gap-2 ml-auto">
              <span className="font-mono text-xs text-stone-500">{tr('Sort by:', 'সাজান:')}</span>
              <select
                value={sort}
                onChange={(e) => reset(() => setSort(e.target.value as 'latest' | 'oldest'))}
                className="cursor-pointer rounded-lg px-2.5 py-1.5 font-bengali text-xs font-semibold outline-none bg-white border border-stone-300 text-stone-800 shadow-sm"
              >
                <option value="latest">{tr('Latest First', 'সর্বশেষ আগে')}</option>
                <option value="oldest">{tr('Oldest First', 'পুরনো আগে')}</option>
              </select>
            </div>
          </div>

          {/* Grid Layout (Shows 10 photos initially) */}
          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-xl animate-pulse border border-stone-200">
                  <div className="aspect-square w-full bg-stone-200" />
                </div>
              ))}
            </div>
          ) : shown.length === 0 ? (
            <div className="rounded-2xl py-16 text-center border-2 border-dashed border-stone-300 bg-white px-4">
              <p className="font-bengali text-base font-semibold text-stone-800">
                {tr('No photographs found matching your criteria.', 'কোনো ছবি খুঁজে পাওয়া যায়নি।')}
              </p>
              <button
                type="button"
                onClick={() => reset(() => { setFilter(ALL); setQuery(''); })}
                className="mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2 font-bengali text-xs font-bold text-white transition-all bg-amber-700 hover:bg-amber-800"
              >
                {tr('Show all photos', 'সব ছবি দেখুন')}
              </button>
            </div>
          ) : (
            <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-3 sm:gap-4 space-y-3 sm:space-y-4">
              {shown.map((g) => {
                const categoryText = g.category[lang] || g.category.en || g.category.bn;
                const altText = g.alt[lang] || g.alt.en || g.alt.bn;
                return (
                  <button
                    key={g.id}
                    onClick={() => openAt(g.id)}
                    className="group relative block w-full break-inside-avoid overflow-hidden rounded-xl text-left bg-stone-900 border border-stone-200/80 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                  >
                    <div className="relative overflow-hidden">
                      <img
                        src={g.src}
                        onError={onErr}
                        loading="lazy"
                        alt={altText}
                        className="block h-auto max-h-[440px] w-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div
                        className="absolute inset-0 flex flex-col justify-end p-3 sm:p-4 opacity-90 group-hover:opacity-100 transition-opacity"
                        style={{ background: 'linear-gradient(180deg, transparent 35%, rgba(15,12,10,0.9))' }}
                      >
                        {categoryText && (
                          <div className="font-mono text-[9px] uppercase tracking-[0.2em] font-bold text-amber-400">
                            {categoryText}
                          </div>
                        )}
                        {altText && (
                          <div
                            className="mt-1 font-bengali text-xs sm:text-sm font-semibold leading-snug text-white"
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

          {/* Load More Button */}
          {visible < filtered.length && (
            <div className="mt-10 sm:mt-12 text-center">
              <button
                type="button"
                onClick={() => setVisible((v) => v + 10)}
                className="inline-flex items-center gap-2 rounded-full px-7 sm:px-8 py-2.5 sm:py-3 font-bengali text-xs sm:text-sm font-bold text-stone-900 bg-white border border-stone-300 shadow-md hover:shadow-lg transition-all hover:bg-stone-50"
              >
                {tr('Load more photos', 'আরও ছবি দেখুন')} <Icon.Arrow className="h-3.5 w-3.5 text-amber-700" />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ════ LIGHTBOX MODAL ════ */}
      {current && (() => {
        const photoTitle = current.alt[lang] || current.alt.en || current.alt.bn || 'Chhatradol Gallery';
        const photoCategory = current.category[lang] || current.category.en || current.category.bn || 'Events';

        return (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6"
            style={{ background: 'rgba(12,10,8,0.96)' }}
            onClick={() => setLightbox(null)}
          >
            <button
              type="button"
              onClick={() => setLightbox(null)}
              className="absolute right-4 top-4 sm:right-6 sm:top-6 flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full text-white z-10 bg-white/10 hover:bg-white/20 transition-transform active:scale-95"
              aria-label="Close"
            >
              ✕
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); step(-1); }}
              className="absolute left-3 top-1/2 flex h-9 w-9 sm:h-12 sm:w-12 -translate-y-1/2 items-center justify-center rounded-full text-white z-10 md:left-6 bg-white/10 hover:bg-white/20 transition-transform active:scale-95"
              aria-label="Previous"
            >
              <FaChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); step(1); }}
              className="absolute right-3 top-1/2 flex h-9 w-9 sm:h-12 sm:w-12 -translate-y-1/2 items-center justify-center rounded-full text-white z-10 md:right-6 bg-white/10 hover:bg-white/20 transition-transform active:scale-95"
              aria-label="Next"
            >
              <FaChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>

            <figure className="max-h-[92vh] max-w-[92vw] sm:max-w-[1000px] overflow-y-auto px-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden" onClick={(e) => e.stopPropagation()}>
              <img src={current.src} onError={onErr} alt={photoTitle} className="mx-auto max-h-[64vh] sm:max-h-[74vh] w-auto max-w-full rounded-xl object-contain shadow-2xl" />

              <figcaption className="mt-3.5 text-center px-2">
                <div className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-amber-400">
                  {photoCategory}
                </div>
                <div className="mt-1 font-bengali font-sans text-xs sm:text-base font-semibold text-white leading-snug max-w-2xl mx-auto">
                  {photoTitle}
                </div>

                {/* Direct 'More' button pointing to Facebook / Story link */}
                <div className="mt-3.5 flex justify-center">
                  <a
                    href={current.more || 'https://www.facebook.com/chhatradol'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full px-5 py-2 font-bengali text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 transition-all shadow-md active:scale-95"
                  >
                    <span>{tr('More', 'আরও')}</span>
                    <FaArrowRight className="h-3 w-3" />
                  </a>
                </div>
              </figcaption>
            </figure>
          </div>
        );
      })()}
    </PageShell>
  );
}
