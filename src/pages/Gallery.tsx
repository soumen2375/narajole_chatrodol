import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FaChevronLeft, FaChevronRight, FaMagnifyingGlass, FaRotateLeft, FaArrowRight
} from 'react-icons/fa6';
import { useGallery } from '@/hooks/useGallery';
import { useT } from '@/i18n';
import { useSEO } from '@/hooks/useSEO';
import { SEO } from '@/data/seoConfig';
import { PageShell, Icon } from './_field-journal';
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

      {/* ════ FULL-PHOTO HERO BANNER ════ */}
      <section className="page-hero relative flex min-h-[500px] w-full flex-col justify-between overflow-hidden px-5 pb-6 pt-10 sm:min-h-[540px] sm:px-8 sm:pt-14 md:min-h-[580px] md:pt-16">
        {/* Full-size Featured Photo Background with Smooth Crossfade */}
        <div className="absolute inset-0 z-0">
          {slides.map((slide, idx) => (
            <img
              key={slide.id || idx}
              src={slide.src}
              onError={onErr}
              alt={slide.alt[lang] || ''}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-in-out ${
                idx === slideIdx ? 'opacity-100 scale-100' : 'opacity-0 scale-105 pointer-events-none'
              }`}
            />
          ))}
          {/* Neutral charcoal scrim.
              A green wash used to sit here, but it tinted every photo and
              washed out the real colours of the work being shown. A neutral
              dark gradient keeps the headline and search field readable while
              letting the photography read true, and it deepens toward the
              bottom where the carousel controls sit. */}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(23,23,26,.58) 0%, rgba(23,23,26,.46) 45%, rgba(15,15,17,.80) 100%)' }} />
        </div>

        {/* Center Content */}
        <div className="relative z-10 mx-auto w-full max-w-4xl pt-2 text-center sm:pt-4">
          <div className="eyebrow-light">{tr('Gallery', 'চিত্রশালা')}</div>
          <h1 className="h-display mx-auto mt-4 text-white">
            {bn ? (
              <>
                সেবা, সমাজ কল্যাণ <br />
                ও প্রভাবের স্থির মুহূর্তসমূহ
              </>
            ) : (
              <>
                {/* Desktop (3 lines) */}
                <span className="hidden sm:inline">
                  Captured Moments of Service <br />
                  &amp; <br />
                  Impact
                </span>
                {/* Mobile (2 lines matching screenshot) */}
                <span className="inline sm:hidden">
                  Captured Moments of <br />
                  Service &amp; Impact
                </span>
              </>
            )}
          </h1>

          {/* Category Filter Tabs */}
          <div className="mt-6 flex snap-x items-center justify-start gap-2 overflow-x-auto px-1 pb-1 sm:mt-8 sm:justify-center [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {categories.map((c) => {
              const active = filter === c;
              return (
                <button
                  key={c}
                  type="button"
                  aria-pressed={active}
                  onClick={() => reset(() => setFilter(c))}
                  className={`chip shrink-0 snap-center px-5 text-[13px] ${
                    active
                      ? 'border-site-yellow bg-site-yellow text-site-ink'
                      : 'border-white/35 bg-transparent text-white hover:border-site-yellow hover:text-site-yellow'
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>

          {/* Search Bar */}
          <div className="relative mx-auto mt-4 w-full max-w-2xl px-1 sm:mt-5">
            <label htmlFor="gallery-search" className="sr-only">
              {tr('Search photos, activities, events...', 'ছবি, ঘটনা বা কার্যক্রমের নাম দিয়ে খুঁজুন...')}
            </label>
            <div className="relative flex items-center">
              <FaMagnifyingGlass className="pointer-events-none absolute left-6 z-10 text-sm text-site-faint" />
              <input
                id="gallery-search"
                type="text"
                value={query}
                onChange={(e) => reset(() => setQuery(e.target.value))}
                placeholder={tr('Search photos, activities, events...', 'ছবি, ঘটনা বা কার্যক্রমের নাম দিয়ে খুঁজুন...')}
                className="site-input pl-14 pr-12 text-[14.5px]"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => reset(() => setQuery(''))}
                  aria-label={tr('Clear search', 'অনুসন্ধান মুছুন')}
                  className="absolute right-4 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-site-cream text-[12px] text-site-green transition-colors hover:bg-site-yellow hover:text-site-ink"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Popular Tags */}
          <div className="mt-3.5 flex snap-x items-center justify-start gap-2 overflow-x-auto px-1 pb-1 font-dmsans text-xs sm:justify-center [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <span className="mr-1 shrink-0 font-dmsans text-[12px] font-medium text-white/60">{tr('Popular:', 'জনপ্রিয়:')}</span>
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
                className="shrink-0 snap-center rounded-full border border-white/25 px-3.5 py-1.5 text-[12px] text-white/85 transition-colors hover:border-site-yellow hover:text-site-yellow"
              >
                #{tr(tag.en, tag.bn)}
              </button>
            ))}
          </div>
        </div>

        {/* Bottom Info Bar — pinned cleanly at the bottom edge of the banner */}
        <div className="relative z-10 mx-auto mt-auto flex w-full max-w-4xl flex-col items-center justify-center gap-2 pb-1 pt-6 text-center text-white/90">
          {/* Featured Photo Caption */}
          {currentSlide && (
            <div className="max-w-full truncate px-4 font-dmsans text-[12px] font-medium">
              <span className="font-normal text-white/55">
                {tr('Featured:', 'বিশেষ:')}{' '}
              </span>
              <span className="font-bold uppercase tracking-[0.14em] text-site-yellow">
                {currentSlide.alt[lang] || currentSlide.alt.en || currentSlide.alt.bn}
              </span>
            </div>
          )}

          {/* Slide Navigation Dots */}
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={slidePrev}
              className="flex h-11 w-11 items-center justify-center rounded-full text-white/70 transition-all hover:text-site-yellow active:scale-95"
              aria-label="Previous Slide"
            >
              <FaChevronLeft className="h-3.5 w-3.5" />
            </button>

            <div className="flex items-center gap-1.5">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSlideIdx(idx)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === slideIdx ? 'w-6 bg-site-yellow' : 'w-1.5 bg-white/40 hover:bg-white/70'
                  }`}
                  aria-label={`Slide ${idx + 1}`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={slideNext}
              className="flex h-11 w-11 items-center justify-center rounded-full text-white/70 transition-all hover:text-site-yellow active:scale-95"
              aria-label="Next Slide"
            >
              <FaChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* ════ PHOTO GRID SECTION ════ */}
      <section id="gallery-grid" className="py-12 md:py-16">
        <div className="mx-auto max-w-site px-5 sm:px-8">
          {/* Filter Bar: Reset & Sort */}
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-site-line pb-5">
            {(filter !== ALL || query) ? (
              <button
                type="button"
                onClick={() => reset(() => { setFilter(ALL); setQuery(''); })}
                className="btn-tertiary gap-1.5"
              >
                <FaRotateLeft className="h-3 w-3" />
                {tr('Reset filters', 'ফিল্টার মুছুন')}
              </button>
            ) : <div />}

            <div className="ml-auto flex items-center gap-2.5">
              <label htmlFor="gallery-sort" className="font-dmmono text-[11px] uppercase tracking-[0.14em] text-site-faint">
                {tr('Sort by:', 'সাজান:')}
              </label>
              <select
                id="gallery-sort"
                value={sort}
                onChange={(e) => reset(() => setSort(e.target.value as 'latest' | 'oldest'))}
                className="site-select w-auto cursor-pointer font-bengali text-[13px]"
              >
                <option value="latest">{tr('Latest First', 'সর্বশেষ আগে')}</option>
                <option value="oldest">{tr('Oldest First', 'পুরনো আগে')}</option>
              </select>
            </div>
          </div>

          {/* Grid Layout (Shows 10 photos initially) */}
          {loading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="soft-card animate-pulse overflow-hidden p-5">
                  <div className="aspect-[4/3] w-full rounded-[16px]" style={{ background: '#eef4e7' }} />
                  <div className="mt-4 h-4 w-2/3 rounded-full" style={{ background: '#eef4e7' }} />
                </div>
              ))}
            </div>
          ) : shown.length === 0 ? (
            <div className="rounded-panel border border-dashed border-site-line-2 bg-white px-5 py-16 text-center">
              <p className="font-bengali text-[16px] font-bold text-site-ink">
                {tr('No photographs found matching your criteria.', 'কোনো ছবি খুঁজে পাওয়া যায়নি।')}
              </p>
              <button
                type="button"
                onClick={() => reset(() => { setFilter(ALL); setQuery(''); })}
                className="btn-green mt-6 font-bengali text-[13.5px]"
              >
                {tr('Show all photos', 'সব ছবি দেখুন')}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((g) => {
                const categoryText = g.category[lang] || g.category.en || g.category.bn;
                const altText = g.alt[lang] || g.alt.en || g.alt.bn;
                return (
                  <button
                    key={g.id}
                    onClick={() => openAt(g.id)}
                    className="group soft-card flex w-full flex-col overflow-hidden p-5 text-left transition-colors hover:border-site-green/35"
                  >
                    <div className="img-zoom relative aspect-[4/3] w-full overflow-hidden rounded-[16px]">
                      <img
                        src={g.src}
                        onError={onErr}
                        loading="lazy"
                        alt={altText}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    {/* Caption bar */}
                    <div className="pt-4">
                      {categoryText && (
                        <div className="font-dmmono text-[10px] font-medium uppercase tracking-[0.16em] text-site-red">
                          {categoryText}
                        </div>
                      )}
                      {altText && (
                        <div className="mt-2 line-clamp-2 font-archivo text-[15px] font-bold leading-snug text-site-ink">
                          {altText}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Load More Button */}
          {visible < filtered.length && (
            <div className="mt-12 text-center">
              <button
                type="button"
                onClick={() => setVisible((v) => v + 10)}
                className="btn-ghost-dark font-bengali text-[14px]"
              >
                {tr('Load more photos', 'আরও ছবি দেখুন')} <Icon.Arrow className="h-3 w-3" />
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
            style={{ background: 'rgba(10,59,47,0.96)' }}
            onClick={() => setLightbox(null)}
          >
            <button
              type="button"
              onClick={() => setLightbox(null)}
              className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-transform hover:bg-site-yellow hover:text-site-ink active:scale-95 sm:right-6 sm:top-6"
              aria-label="Close"
            >
              ✕
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); step(-1); }}
              className="absolute left-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-transform hover:bg-site-yellow hover:text-site-ink active:scale-95 md:left-6 md:h-12 md:w-12"
              aria-label="Previous"
            >
              <FaChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); step(1); }}
              className="absolute right-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-transform hover:bg-site-yellow hover:text-site-ink active:scale-95 md:right-6 md:h-12 md:w-12"
              aria-label="Next"
            >
              <FaChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>

            <figure className="max-h-[92vh] max-w-[92vw] overflow-y-auto px-1 sm:max-w-[1000px] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden" onClick={(e) => e.stopPropagation()}>
              <img src={current.src} onError={onErr} alt={photoTitle} className="mx-auto max-h-[64vh] w-auto max-w-full rounded-panel object-contain sm:max-h-[74vh]" />

              <figcaption className="mt-5 px-2 text-center">
                <div className="font-dmmono text-[11px] font-medium uppercase tracking-[0.16em] text-site-yellow">
                  {photoCategory}
                </div>
                <div className="mx-auto mt-2 max-w-2xl font-archivo text-[16px] font-bold leading-snug text-white">
                  {photoTitle}
                </div>

                {/* Direct 'More' button pointing to Facebook / Story link */}
                <div className="mt-5 flex justify-center">
                  <a
                    href={current.more || 'https://www.facebook.com/chhatradol'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-yellow font-bengali text-[13.5px]"
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
