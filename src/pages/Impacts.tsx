import { IMPACT_STATS, SUCCESS_STORIES, TESTIMONIALS } from '@/data/content';
import { useT } from '@/i18n';
import {
  PageShell, PageHero, SectionHeader, GetInvolvedSection,
  SERIF_BN, Icon,
} from './_field-journal';

// ════════════════════════════════════════════════════════════════════
//  Impacts — প্রভাব
// ════════════════════════════════════════════════════════════════════

const FOCUS_BREAKDOWN = {
  bn: [
    { tag: '01', label: 'রক্তদান শিবির',       stat: '২৫+',    unit: 'শিবির' },
    { tag: '02', label: 'শিক্ষাবৃত্তি',          stat: '৫০+',    unit: 'শিক্ষার্থী' },
    { tag: '03', label: 'বৃক্ষরোপণ',            stat: '২০০০+',  unit: 'গাছ' },
    { tag: '04', label: 'শীতবস্ত্র বিতরণ',      stat: '৩০০+',   unit: 'পরিবার' },
    { tag: '05', label: 'ত্রাণ বিতরণ',          stat: '৫০০+',   unit: 'পরিবার' },
    { tag: '06', label: 'বিনামূল্যে বই',        stat: '১০০০+',  unit: 'বই' },
    { tag: '07', label: 'স্বাস্থ্য পরীক্ষা',    stat: '৮০০+',   unit: 'রোগী' },
    { tag: '08', label: 'সামাজিক সচেতনতা',     stat: '৫০+',    unit: 'অনুষ্ঠান' },
  ],
  en: [
    { tag: '01', label: 'Blood donation camps',   stat: '25+',   unit: 'camps' },
    { tag: '02', label: 'Students supported',      stat: '50+',   unit: 'students' },
    { tag: '03', label: 'Trees planted',           stat: '2000+', unit: 'trees' },
    { tag: '04', label: 'Winter clothing drives',  stat: '300+',  unit: 'families' },
    { tag: '05', label: 'Relief distributions',    stat: '500+',  unit: 'families' },
    { tag: '06', label: 'Free books distributed',  stat: '1000+', unit: 'books' },
    { tag: '07', label: 'Health check-ups',        stat: '800+',  unit: 'patients' },
    { tag: '08', label: 'Awareness events',        stat: '50+',   unit: 'events' },
  ],
};

const FOCUS_ICONS = [
  Icon.Droplet, Icon.Grad, Icon.Tree, Icon.Shirt,
  Icon.Package, Icon.Book, Icon.Stetho, Icon.Users,
];

export default function Impacts() {
  const { lang } = useT();
  const bn = lang === 'bn';
  const breakdown = FOCUS_BREAKDOWN[lang];

  return (
    <PageShell>
      <PageHero
        eyebrow={bn ? 'Impacts · প্রভাব' : 'Impacts · Our Reach'}
        title={bn
          ? 'সংখ্যায়, গল্পে, কণ্ঠস্বরে — আমাদের প্রভাবের ছবি।'
          : 'In numbers, stories and voices — a picture of our impact.'}
        lede={bn
          ? 'সাত বছরে আমরা ৩,০০০+ জীবনে সরাসরি পৌঁছেছি। প্রতিটি সংখ্যার পেছনে আছে একটা মানুষের গল্প।'
          : 'In seven years we have directly reached 3,000+ lives. Behind every number is a person\'s story.'}
      />

      {/* Hero stat */}
      <section style={{ background: 'var(--c-paper)' }}>
        <div className="mx-auto max-w-[1320px] px-6 py-20 md:px-10">
          <div className="flex flex-col items-center border-b pb-16 text-center" style={{ borderColor: 'var(--c-rule)' }}>
            <div className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--c-muted)' }}>
              Total Reach · {bn ? 'সার্বিক প্রভাব' : 'Overall Impact'}
            </div>
            <div className="mt-4 font-bengali text-[80px] leading-none md:text-[120px]" style={{ ...SERIF_BN, color: 'var(--c-brand)' }}>
              {bn ? '৩,০০০+' : '3,000+'}
            </div>
            <div className="mt-3 font-bengali text-[22px]" style={{ ...SERIF_BN, color: 'var(--c-ink)' }}>
              {bn ? 'জীবনে সরাসরি পৌঁছেছি' : 'lives directly reached'}
            </div>
            <p className="mt-4 max-w-xl font-bengali text-[15px] leading-relaxed" style={{ color: 'var(--c-ink-2)' }}>
              {bn
                ? '২০১৯ থেকে ২০২৬ — স্বাস্থ্য, শিক্ষা, পরিবেশ ও মানবিক সহায়তায় আমাদের সম্মিলিত যাত্রা।'
                : '2019 to 2026 — our collective journey in health, education, environment and humanitarian support.'}
            </p>
          </div>

          {/* Key stats ledger */}
          <div className="mt-16 grid grid-cols-2 gap-px md:grid-cols-4" style={{ background: 'var(--c-rule)' }}>
            {IMPACT_STATS.map((s) => (
              <div key={s.label.bn} className="p-7" style={{ background: 'var(--c-paper)' }}>
                <div className="mt-3 font-bengali text-[48px] leading-none" style={{ ...SERIF_BN, color: 'var(--c-brand)' }}>{s.value[lang]}</div>
                <div className="mt-2 font-bengali text-[14px] leading-snug" style={{ color: 'var(--c-ink-2)' }}>{s.label[lang]}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Focus breakdown */}
      <section style={{ background: 'var(--c-bg)' }}>
        <div className="mx-auto max-w-[1320px] px-6 py-24 md:px-10">
          <SectionHeader
            eyebrow="Breakdown · 08 Programs"
            title={bn ? 'কর্মসূচিভিত্তিক প্রভাব' : 'Impact by Programme'}
            kicker={bn
              ? 'আটটি সক্রিয় কর্মসূচিতে আমাদের সুনির্দিষ্ট অবদানের বিবরণ।'
              : 'A breakdown of our specific contributions across eight active programmes.'}
          />
          <div className="grid grid-cols-1 gap-px sm:grid-cols-2 lg:grid-cols-4" style={{ background: 'var(--c-rule)' }}>
            {breakdown.map((f, i) => {
              const FIcon = FOCUS_ICONS[i % FOCUS_ICONS.length];
              return (
                <div key={f.tag} className="group flex flex-col gap-4 p-7" style={{ background: 'var(--c-bg)' }}>
                  <div
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border transition-colors group-hover:bg-[color:var(--c-brand)] group-hover:text-white"
                    style={{ borderColor: 'var(--c-rule)', color: 'var(--c-brand)' }}
                  >
                    <FIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-bengali text-[38px] leading-none" style={{ ...SERIF_BN, color: 'var(--c-brand)' }}>{f.stat}</div>
                    <div className="mt-1 font-bengali text-[12px]" style={{ color: 'var(--c-muted)' }}>{f.unit}</div>
                  </div>
                  <p className="font-bengali text-[14px] leading-snug" style={{ color: 'var(--c-ink)' }}>{f.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Success stories */}
      <section style={{ background: 'var(--c-paper)' }}>
        <div className="mx-auto max-w-[1320px] px-6 py-24 md:px-10">
          <SectionHeader
            eyebrow="Stories · সাফল্যের গল্প"
            title={bn ? 'মানুষের কথা' : 'Human Stories'}
            kicker={bn
              ? 'সংখ্যার বাইরে — এই গল্পগুলো আমাদের কাজের সত্যিকারের ফলাফল।'
              : 'Beyond the numbers — these stories are the true results of our work.'}
          />
          <div className="grid grid-cols-1 gap-px md:grid-cols-2" style={{ background: 'var(--c-rule)' }}>
            {SUCCESS_STORIES.map((s, i) => (
              <article key={i} className="flex flex-col" style={{ background: 'var(--c-paper)' }}>
                <div className="overflow-hidden">
                  <img
                    src={s.img}
                    alt={s.title[lang]}
                    className="aspect-[16/9] w-full object-cover transition-transform duration-700 ease-out hover:scale-[1.03]"
                    onError={(e) => { if (e.currentTarget.src.indexOf('Chhatradol') < 0) e.currentTarget.src = '/assets/images/Chhatradol.jpg'; }}
                  />
                </div>
                <div className="flex flex-1 flex-col gap-4 p-8">
                  <h3 className="font-bengali text-[22px] leading-snug" style={{ ...SERIF_BN, color: 'var(--c-ink)' }}>{s.title[lang]}</h3>
                  <p className="flex-1 font-bengali text-[14px] leading-relaxed" style={{ color: 'var(--c-ink-2)' }}>{s.summary[lang]}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      {TESTIMONIALS && TESTIMONIALS.length > 0 && (
        <section style={{ background: 'var(--c-bg)' }}>
          <div className="mx-auto max-w-[1320px] px-6 py-24 md:px-10">
            <SectionHeader
              eyebrow="Testimonials · মতামত"
              title={bn ? 'তাঁদের কথায়' : 'In their words'}
            />
            <div className="grid grid-cols-1 gap-px md:grid-cols-3" style={{ background: 'var(--c-rule)' }}>
              {TESTIMONIALS.slice(0, 3).map((t, i) => (
                <blockquote key={i} className="flex flex-col gap-5 p-8" style={{ background: 'var(--c-bg)' }}>
                  <Icon.Quote className="h-6 w-6" style={{ color: 'var(--c-brand)' }} />
                  <p className="flex-1 font-bengali text-[15px] leading-[1.8]" style={{ color: 'var(--c-ink)' }}>
                    {t.quote[lang]}
                  </p>
                  <footer className="border-t pt-4" style={{ borderColor: 'var(--c-rule)' }}>
                    <div className="font-bengali text-[14px] font-medium" style={{ color: 'var(--c-ink)' }}>
                      {t.author[lang]}
                    </div>
                    {t.role && (
                      <div className="mt-0.5 font-bengali text-[12px]" style={{ color: 'var(--c-muted)' }}>
                        {t.role[lang]}
                      </div>
                    )}
                  </footer>
                </blockquote>
              ))}
            </div>
          </div>
        </section>
      )}

      <GetInvolvedSection />
    </PageShell>
  );
}
