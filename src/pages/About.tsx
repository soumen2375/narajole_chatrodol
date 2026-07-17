import { TEAM_MEMBERS, CORE_VALUES } from '@/data/content';
import { useT } from '@/i18n';
import {
  PageShell, PageHero, SectionHeader, GetInvolvedSection,
  SERIF_BN, Icon,
} from './_field-journal';

// ════════════════════════════════════════════════════════════════════
//  About — ছাত্রদলের কথা
// ════════════════════════════════════════════════════════════════════

const VALUE_ICONS: Record<string, React.FC<React.SVGProps<SVGSVGElement>>> = {
  GraduationCap: Icon.Grad, Heart: Icon.Heart, Shield: Icon.Shield,
  Handshake: Icon.Hands, CheckCircle: Icon.Check,
};

export default function About() {
  const { lang } = useT();
  const bn = lang === 'bn';

  return (
    <PageShell>
      <PageHero
        eyebrow={bn ? 'About · আমাদের কথা' : 'About · Our Story'}
        title={bn
          ? 'সাত বছরের পথচলা — একটি ছোট ভাবনা থেকে রেজিস্টার্ড ট্রাস্ট পর্যন্ত।'
          : 'Seven Years of Journey — From a Small Idea to a Registered Trust.'}
        lede={bn
          ? '২০১৯ সালে একদল ছাত্রছাত্রীর ভাবনায় জন্ম নিয়েছিল এই ছাত্রদল। আজ আমরা একটি পাবলিক চ্যারিটেবল ট্রাস্ট — পশ্চিম মেদিনীপুরের প্রান্তিক মানুষের পাশে নিরলসভাবে দাঁড়াই।'
          : 'In 2019, Chhatradol was born from the vision of a group of students. Today we are a public charitable trust — standing steadfastly beside the marginalised people of Paschim Medinipur.'}
      />

      {/* Mission / Vision / Values */}
      <section style={{ background: 'var(--c-paper)' }}>
        <div className="mx-auto max-w-[1320px] px-6 py-24 md:px-10">
          <div className="grid grid-cols-1 gap-px md:grid-cols-3" style={{ background: 'var(--c-rule)' }}>
            {[
              {
                tag: '01', en: 'Mission',
                title: bn ? 'মিশন' : 'Mission',
                text: bn
                  ? 'প্রান্তিক জনগোষ্ঠীর শিক্ষা, স্বাস্থ্য, পরিবেশ ও দৈনন্দিন জীবনের মৌলিক চাহিদা পূরণে নিরলসভাবে কাজ করে যাওয়া।'
                  : 'To tirelessly work in fulfilling the basic needs of marginalised communities in education, health, environment and daily life.',
              },
              {
                tag: '02', en: 'Vision',
                title: bn ? 'ভিশন' : 'Vision',
                text: bn
                  ? 'প্রতিটি মানুষের জীবনে শিক্ষা, সুস্বাস্থ্য ও পরিবেশগত সচেতনতা পৌঁছে দেওয়া।'
                  : 'To bring education, good health and environmental awareness to the life of every person.',
              },
              {
                tag: '03', en: 'Values',
                title: bn ? 'মূল্যবোধ' : 'Values',
                text: bn
                  ? 'সততা, স্বচ্ছতা, সহমর্মিতা — এই তিন স্তম্ভের উপর ভর করে আমরা প্রতিটি কর্মসূচি পরিচালনা করি।'
                  : 'Integrity, transparency, compassion — these three pillars guide every programme we run.',
              },
            ].map((b) => (
              <div key={b.tag} className="p-10" style={{ background: 'var(--c-paper)' }}>
                <div className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--c-muted)' }}>{b.tag} · {b.en}</div>
                <h3 className="mt-3 font-bengali text-[34px] leading-tight" style={{ ...SERIF_BN, color: 'var(--c-ink)' }}>{b.title}</h3>
                <p className="mt-5 font-bengali text-[15px] leading-[1.75]" style={{ color: 'var(--c-ink-2)' }}>{b.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section style={{ background: 'var(--c-bg)' }}>
        <div className="mx-auto max-w-[1320px] px-6 py-24 md:px-10">
          <SectionHeader eyebrow="Core Values · 05" title={bn ? 'আমাদের মূল্যবোধ' : 'Our Core Values'} />
          <div className="grid grid-cols-1 gap-px sm:grid-cols-2 lg:grid-cols-5" style={{ background: 'var(--c-rule)' }}>
            {CORE_VALUES.map((v) => {
              const VIcon = VALUE_ICONS[(v as unknown as { icon: string }).icon] || Icon.Check;
              return (
                <div key={v.label.bn} className="flex flex-col gap-4 p-7" style={{ background: 'var(--c-bg)' }}>
                  <VIcon className="h-6 w-6" style={{ color: 'var(--c-brand)' }} />
                  <div className="font-bengali text-[22px] leading-tight" style={{ ...SERIF_BN, color: 'var(--c-ink)' }}>{v.label[lang]}</div>
                  <p className="font-bengali text-[13.5px] leading-relaxed" style={{ color: 'var(--c-ink-2)' }}>{v.text[lang]}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section style={{ background: 'var(--c-paper)' }}>
        <div className="mx-auto max-w-[1320px] px-6 py-24 md:px-10">
          <SectionHeader eyebrow="Our Journey · 2019–2026" title={bn ? 'পথচলার সংক্ষিপ্ত ইতিহাস' : 'A Brief History'} />
          <div className="grid grid-cols-1 gap-px md:grid-cols-4" style={{ background: 'var(--c-rule)' }}>
            {[
              {
                year: '2019',
                title: bn ? 'যাত্রা শুরু' : 'Founded',
                text: bn ? 'একদল ছাত্রছাত্রীর হাত ধরে প্রথম পরিচ্ছন্নতা অভিযান।' : 'First cleanliness drive by a group of students.',
              },
              {
                year: '2021',
                title: bn ? 'করোনাকালীন তৎপরতা' : 'COVID Response',
                text: bn ? 'মহামারির সময়ে ত্রাণ, মাস্ক, ও অক্সিজেন সিলিন্ডার সহায়তা।' : 'Relief, masks and oxygen cylinder support during the pandemic.',
              },
              {
                year: '2023',
                title: bn ? 'বিকাশ' : 'Growth',
                text: bn ? '৮+ কর্মসূচি, ৫০০+ শিক্ষার্থী, ২৫+ স্বাস্থ্য শিবির।' : '8+ programmes, 500+ students supported, 25+ health camps.',
              },
              {
                year: '2026',
                title: bn ? 'রেজিস্ট্রেশন' : 'Registration',
                text: bn ? 'সরকারিভাবে পাবলিক চ্যারিটেবল ট্রাস্ট হিসেবে নিবন্ধিত।' : 'Officially registered as a public charitable trust.',
              },
            ].map((s) => (
              <div key={s.year} className="p-7" style={{ background: 'var(--c-paper)' }}>
                <div className="font-bengali text-[36px] leading-none" style={{ ...SERIF_BN, color: 'var(--c-brand)' }}>{s.year}</div>
                <h4 className="mt-4 font-bengali text-[20px] leading-tight" style={{ ...SERIF_BN, color: 'var(--c-ink)' }}>{s.title}</h4>
                <p className="mt-2 font-bengali text-[13.5px] leading-relaxed" style={{ color: 'var(--c-ink-2)' }}>{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section style={{ background: 'var(--c-bg)' }}>
        <div className="mx-auto max-w-[1320px] px-6 py-24 md:px-10">
          <SectionHeader
            eyebrow="The Team · Trustees"
            title={bn ? 'যাঁরা পথ দেখাচ্ছেন' : 'The Ones Leading the Way'}
            kicker={bn
              ? 'আট জন স্বেচ্ছাসেবী ট্রাস্টি — সংগঠনের প্রতিটি সিদ্ধান্তের পিছনে।'
              : 'Eight volunteer trustees — behind every decision the Organization makes.'}
          />
          <div className="grid grid-cols-1 gap-px sm:grid-cols-2 lg:grid-cols-4" style={{ background: 'var(--c-rule)' }}>
            {TEAM_MEMBERS.map((m) => (
              <article key={m.name.bn} className="card-lift flex flex-col gap-4 p-7" style={{ background: 'var(--c-bg)' }}>
                <div className="aspect-square w-full overflow-hidden rounded-[3px]" style={{ background: 'linear-gradient(135deg, rgba(234,88,12,0.18), rgba(77,124,15,0.14))' }}>
                  {m.img ? (
                    <img src={m.img} alt={m.name[lang]} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <span className="font-bengali text-[64px] leading-none" style={{ ...SERIF_BN, color: 'var(--c-brand)' }}>{m.name[lang].charAt(0)}</span>
                    </div>
                  )}
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--c-muted)' }}>Trustee</div>
                  <div className="mt-2 font-bengali text-[19px] leading-tight" style={{ ...SERIF_BN, color: 'var(--c-ink)' }}>{m.name[lang]}</div>
                  <div className="mt-1 font-bengali text-[12.5px] leading-snug" style={{ color: 'var(--c-ink-2)' }}>{m.role[lang]}</div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <GetInvolvedSection />
    </PageShell>
  );
}
