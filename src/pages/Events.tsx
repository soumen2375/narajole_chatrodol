import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePosts } from '@/hooks/usePosts';
import { useT } from '@/i18n';
import { PageShell, PageHero, SERIF_BN, Icon } from './_field-journal';

// ════════════════════════════════════════════════════════════════════
//  Events — অনুষ্ঠান ও খবর
// ════════════════════════════════════════════════════════════════════

const PAGE_SIZE = 9;
type Cat = 'all' | 'events' | 'education' | 'health' | 'relief';

const CAT_KEYS: Cat[] = ['all', 'events', 'education', 'health', 'relief'];
const CAT_DB: Record<Cat, string | null> = {
  all: null, events: 'Events', education: 'Education', health: 'Health', relief: 'Relief',
};

export default function Events() {
  const { posts } = usePosts();
  const { t, lang } = useT();
  const [filter, setFilter] = useState<Cat>('all');
  const [page, setPage] = useState(1);

  const catLabels: Record<Cat, string> = {
    all:       t('events.catAll'),
    events:    t('events.catEvents'),
    education: t('events.catEducation'),
    health:    t('events.catHealth'),
    relief:    t('events.catRelief'),
  };

  const filtered = useMemo(() => {
    const db = CAT_DB[filter];
    if (!db) return posts;
    return posts.filter((p) => p.category === db);
  }, [posts, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const slice = filtered.slice(start, start + PAGE_SIZE);

  const setCat = (c: Cat) => { setFilter(c); setPage(1); };

  return (
    <PageShell>
      <PageHero
        eyebrow={lang === 'bn' ? 'অনুষ্ঠান ও খবর' : 'Events & News'}
        title={t('events.heroTitle')}
        lede={t('events.heroLede')}
      />

      {/* Filter bar */}
      <section style={{ background: 'var(--c-paper)' }}>
        <div className="mx-auto max-w-[1320px] px-6 pt-8 md:px-10">
          <div className="flex flex-wrap items-center gap-2 border-b pb-4" style={{ borderColor: 'var(--c-rule)' }}>
            <span className="pr-3 font-mono text-[11px] uppercase tracking-[0.22em]" style={{ color: 'var(--c-muted)' }}>
              {t('events.filter')}
            </span>
            {CAT_KEYS.map((c) => {
              const active = filter === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCat(c)}
                  className="inline-flex items-center rounded-full px-3.5 py-1.5 font-bengali text-[12.5px] font-medium transition-colors"
                  style={{
                    background: active ? 'var(--c-brand)' : 'transparent',
                    color:      active ? '#fff' : 'var(--c-ink-2)',
                    border:    `1px solid ${active ? 'var(--c-brand)' : 'var(--c-rule)'}`,
                  }}
                >
                  {catLabels[c]}
                </button>
              );
            })}
            <span className="ml-auto font-mono text-[10.5px] uppercase tracking-[0.22em]" style={{ color: 'var(--c-muted)' }}>
              {filtered.length} {t('events.entries')}
            </span>
          </div>
        </div>
      </section>

      {/* Grid */}
      <section style={{ background: 'var(--c-paper)' }}>
        <div className="mx-auto max-w-[1320px] px-6 py-16 md:px-10">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {slice.map((p) => (
              <article key={p.id} className="card-lift group flex flex-col rounded-[3px] overflow-hidden" style={{ background: 'var(--c-paper)', border: '1px solid var(--c-rule)' }}>
                <div className="img-zoom">
                  <img
                    src={p.featuredImage || '/assets/images/chatrodol.jpg'}
                    alt={p.title}
                    className="aspect-[16/10] w-full object-cover"
                    onError={(e) => { if (e.currentTarget.src.indexOf('chatrodol') < 0) e.currentTarget.src = '/assets/images/chatrodol.jpg'; }}
                  />
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-2 px-5 font-mono text-[10.5px] uppercase tracking-[0.18em]" style={{ color: 'var(--c-muted)' }}>
                  <span style={{ color: 'var(--c-brand)' }}>{p.category}</span>
                  <span style={{ color: 'var(--c-rule)' }}>·</span>
                  <span>{p.publishedDate}</span>
                </div>
                <h3 className="mt-2 px-5 font-bengali text-[20px] leading-snug" style={{ ...SERIF_BN, color: 'var(--c-ink)' }}>
                  {p.title}
                </h3>
                <p className="mt-2 line-clamp-3 px-5 font-bengali text-[13.5px] leading-relaxed" style={{ color: 'var(--c-ink-2)' }}>
                  {p.content.split('\n')[0].slice(0, 160)}…
                </p>
                <Link
                  to={`/events/${p.id}`}
                  className="mx-5 mb-6 mt-3 inline-flex items-center gap-1.5 self-start font-mono text-[10.5px] uppercase tracking-[0.18em] transition-all duration-300 hover:gap-2.5"
                  style={{ color: 'var(--c-brand)' }}
                >
                  {t('events.readMore')} <Icon.Arrow className="h-3 w-3" />
                </Link>
              </article>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-12 flex items-center justify-between border-t pt-6" style={{ borderColor: 'var(--c-rule)' }}>
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="font-mono text-[11px] uppercase tracking-[0.22em] disabled:opacity-40"
                style={{ color: 'var(--c-muted)' }}
              >
                {t('events.prev')}
              </button>
              <div className="font-mono text-[11px] uppercase tracking-[0.22em]" style={{ color: 'var(--c-muted)' }}>
                {t('events.page')} {String(page).padStart(2, '0')} / {String(totalPages).padStart(2, '0')}
              </div>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="font-mono text-[11px] uppercase tracking-[0.22em] disabled:opacity-40"
                style={{ color: 'var(--c-brand)' }}
              >
                {t('events.next')}
              </button>
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
}
