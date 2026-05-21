import { useMemo, useState } from 'react';
import { GALLERY_IMAGES } from '@/data/content';
import { useT } from '@/i18n';
import { PageShell, PageHero, Icon } from './_field-journal';

// ════════════════════════════════════════════════════════════════════
//  Gallery — চিত্রশালা
// ════════════════════════════════════════════════════════════════════

export default function Gallery() {
  const { lang } = useT();
  const bn = lang === 'bn';

  const ALL_LABEL = bn ? 'সব' : 'All';
  const allCategories = useMemo(
    () => [ALL_LABEL, ...Array.from(new Set(GALLERY_IMAGES.map((g) => g.category[lang])))],
    [lang, ALL_LABEL],
  );
  const [filter, setFilter] = useState<string>(ALL_LABEL);

  const items = filter === ALL_LABEL || !allCategories.includes(filter)
    ? GALLERY_IMAGES
    : GALLERY_IMAGES.filter((g) => g.category[lang] === filter);

  return (
    <PageShell>
      <PageHero
        eyebrow={bn ? 'Gallery · চিত্রশালা' : 'Gallery · Photographs'}
        title={bn
          ? 'সাত বছরের মুহূর্ত — ক্যামেরায় ধরা পড়া আমাদের যাত্রা।'
          : 'Seven Years of Moments — Our Journey Captured Through the Lens.'}
        lede={bn
          ? 'ক্যাম্প, কর্মসূচি, সম্প্রদায়িক উদযাপন — প্রতিটি ছবিতে গাঁথা আছে একেকটা গল্প।'
          : 'Camps, programmes, community celebrations — each photograph holds a story.'}
      />

      {/* Filter chips */}
      <section style={{ background: 'var(--c-paper)' }}>
        <div className="mx-auto max-w-[1320px] px-6 pt-8 md:px-10">
          <div className="flex flex-wrap items-center gap-2 border-b pb-4" style={{ borderColor: 'var(--c-rule)' }}>
            <span className="pr-3 font-mono text-[11px] uppercase tracking-[0.22em]" style={{ color: 'var(--c-muted)' }}>
              {bn ? 'বিভাগ:' : 'Category:'}
            </span>
            {allCategories.map((c) => {
              const active = filter === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setFilter(c)}
                  className="inline-flex items-center rounded-full px-3.5 py-1.5 font-bengali text-[12.5px] font-medium transition-colors"
                  style={{
                    background: active ? 'var(--c-brand)' : 'transparent',
                    color:      active ? '#fff' : 'var(--c-ink-2)',
                    border:    `1px solid ${active ? 'var(--c-brand)' : 'var(--c-rule)'}`,
                  }}
                >
                  {c}
                </button>
              );
            })}
            <span className="ml-auto font-mono text-[10.5px] uppercase tracking-[0.22em]" style={{ color: 'var(--c-muted)' }}>
              {items.length} {bn ? 'ছবি' : 'photographs'}
            </span>
          </div>
        </div>
      </section>

      {/* Masonry via CSS columns */}
      <section style={{ background: 'var(--c-paper)' }}>
        <div className="mx-auto max-w-[1320px] px-6 py-12 md:px-10">
          <div className="columns-1 gap-5 sm:columns-2 lg:columns-3">
            {items.map((g, i) => (
              <figure
                key={g.src + i}
                className="card-lift group mb-5 inline-block w-full break-inside-avoid overflow-hidden rounded-[3px]"
                style={{ background: 'var(--c-bg)' }}
              >
                <div className="relative">
                  <img src={g.src} alt={g.alt[lang]} className="block h-auto w-full transition-transform duration-700 ease-out group-hover:scale-[1.04]" onError={(e) => { if (e.currentTarget.src.indexOf('chatrodol') < 0) e.currentTarget.src = '/assets/images/chatrodol.jpg'; }} />
                  <div
                    className="pointer-events-none absolute inset-0 flex flex-col items-start justify-end p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    style={{ background: 'linear-gradient(180deg, transparent 50%, rgba(28,25,23,0.6))' }}
                  >
                    <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/70">{g.category[lang]}</div>
                    <div className="mt-1 font-bengali text-[16px] text-white">{g.alt[lang]}</div>
                  </div>
                  {g.more && (
                    <a
                      href={g.more}
                      target="_blank"
                      rel="noreferrer"
                      className="absolute right-3 top-3 inline-flex h-7 items-center gap-1 rounded-full bg-white/90 px-3 font-mono text-[10px] uppercase tracking-[0.18em] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                      style={{ color: 'var(--c-ink)' }}
                    >
                      {bn ? 'আরো' : 'More'} <Icon.Arrow className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </figure>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
