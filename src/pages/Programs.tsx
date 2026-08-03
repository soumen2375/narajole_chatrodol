import { PROGRAMS } from '@/data/content';
import { useT } from '@/i18n';
import {
  PageShell, PageHero, SectionHeader, GetInvolvedSection,
  SERIF_BN, Icon,
} from './_field-journal';

// ════════════════════════════════════════════════════════════════════
//  Programs — কর্মসূচি
// ════════════════════════════════════════════════════════════════════

const PROGRAM_ICONS = [
  Icon.Droplet, Icon.Shirt, Icon.Tree, Icon.Snow,
  Icon.Book, Icon.Package, Icon.Stetho, Icon.Users,
];
const PROGRAM_FOCUS = {
  bn: ['স্বাস্থ্য','মানবিক','পরিবেশ','মানবিক','শিক্ষা','ত্রাণ','স্বাস্থ্য','সমাজ'],
  en: ['Health','Humanitarian','Environment','Humanitarian','Education','Relief','Health','Society'],
};

const FOCUS_AREAS = {
  bn: [
    { tag: '01', en: 'Health',       bn: 'স্বাস্থ্য', n: '৩' },
    { tag: '02', en: 'Education',    bn: 'শিক্ষা',    n: '১' },
    { tag: '03', en: 'Environment',  bn: 'পরিবেশ',    n: '১' },
    { tag: '04', en: 'Humanitarian', bn: 'মানবিক',    n: '৩' },
  ],
  en: [
    { tag: '01', en: 'Health',       bn: 'Health',       n: '3' },
    { tag: '02', en: 'Education',    bn: 'Education',    n: '1' },
    { tag: '03', en: 'Environment',  bn: 'Environment',  n: '1' },
    { tag: '04', en: 'Humanitarian', bn: 'Humanitarian', n: '3' },
  ],
};

import Breadcrumb from '@/components/ui/Breadcrumb';

export default function Programs() {
  const { lang, t } = useT();
  const bn = lang === 'bn';
  const focusAreas = FOCUS_AREAS[lang];

  return (
    <PageShell>
      <Breadcrumb title="Our Programs" />
      <PageHero
        eyebrow={bn ? 'Programs · কর্মসূচি' : 'Programs · What We Do'}
        title={bn
          ? 'আট ধরনের কর্মসূচি, একটাই লক্ষ্য — সমাজের পাশে থাকা।'
          : 'Eight Programmes, One Goal — Standing by Society.'}
        lede={bn
          ? 'আমরা চার বড় ক্ষেত্রে কাজ করি — স্বাস্থ্য, শিক্ষা, পরিবেশ ও মানবিক সহায়তা। প্রতিটি কর্মসূচি স্থানীয় সম্প্রদায়ের সক্রিয় অংশগ্রহণে পরিচালিত হয়।'
          : 'We work in four major areas — health, education, environment and humanitarian support. Each programme is run with active participation from local communities.'}
      />

      {/* Focus area band */}
      <section style={{ background: 'var(--c-paper)' }}>
        <div className="mx-auto max-w-[1320px] px-4 py-12 md:px-10 md:py-16">
          <div className="grid grid-cols-2 gap-px md:grid-cols-4" style={{ background: 'var(--c-rule)' }}>
            {focusAreas.map((f) => (
              <div key={f.tag} className="p-4 md:p-7" style={{ background: 'var(--c-paper)' }}>
                <div className="font-mono text-[9px] uppercase tracking-[0.18em] md:text-[10px] md:tracking-[0.22em]" style={{ color: 'var(--c-muted)' }}>{f.tag} · Focus</div>
                <div className="mt-2 font-bengali text-[20px] leading-tight md:mt-3 md:text-[28px]" style={{ ...SERIF_BN, color: 'var(--c-ink)' }}>{f.bn}</div>
                <div className="mt-3 flex items-baseline gap-1 border-t pt-2 md:mt-4 md:gap-2 md:pt-3" style={{ borderColor: 'var(--c-rule)' }}>
                  <span className="font-bengali text-[22px] md:text-[28px]" style={{ ...SERIF_BN, color: 'var(--c-brand)' }}>{f.n}</span>
                  <span className="font-bengali text-[11px] md:text-[12.5px]" style={{ color: 'var(--c-muted)' }}>{bn ? 'কর্মসূচি' : 'programmes'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* All programs grid */}
      <section style={{ background: 'var(--c-bg)' }}>
        <div className="mx-auto max-w-[1320px] px-6 py-24 md:px-10">
          <SectionHeader
            eyebrow="What We Do · 08 Programs"
            title={t('programs.title')}
            kicker={bn
              ? 'শিক্ষা, স্বাস্থ্য, পরিবেশ ও মানবিক সহায়তা — আট ধরনের কর্মসূচির মাধ্যমে আমরা সমাজের পাশে দাঁড়াই।'
              : 'Education, health, environment and humanitarian support — eight programmes standing with society.'}
          />
          <div className="grid grid-cols-1 gap-px md:grid-cols-2 lg:grid-cols-4" style={{ background: 'var(--c-rule)' }}>
            {PROGRAMS.map((p, i) => {
              const PIcon = PROGRAM_ICONS[i % PROGRAM_ICONS.length];
              const focus = PROGRAM_FOCUS[lang][i % PROGRAM_FOCUS[lang].length];
              return (
                <article key={p.title.bn} className="group flex flex-col gap-4 p-7" style={{ background: 'var(--c-bg)' }}>
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-full border transition-colors group-hover:bg-[color:var(--c-brand)] group-hover:text-white" style={{ borderColor: 'var(--c-rule)', color: 'var(--c-brand)' }}>
                    <PIcon className="h-5 w-5" />
                  </div>
                  <div className="mt-1">
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em]" style={{ background: 'rgba(194,65,12,0.08)', color: 'var(--c-brand)' }}>
                      {focus}
                    </span>
                    <h3 className="mt-3 font-bengali text-[19px] leading-snug" style={{ ...SERIF_BN, color: 'var(--c-ink)' }}>{p.title[lang]}</h3>
                  </div>
                  <p className="flex-1 font-bengali text-[13.5px] leading-relaxed" style={{ color: 'var(--c-ink-2)' }}>{p.description[lang]}</p>
                  <div className="mt-3 border-t pt-4" style={{ borderColor: 'var(--c-rule)' }}>
                    <p className="font-bengali text-[12.5px] leading-relaxed" style={{ color: 'var(--c-muted)' }}>{p.details[lang]}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <GetInvolvedSection />
    </PageShell>
  );
}
