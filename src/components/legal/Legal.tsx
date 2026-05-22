import { fjVars, SERIF_BN } from '@/pages/_field-journal';
import { ORG } from '@/data/content';

export const LAST_UPDATED = '21 May 2026';

const INK    = '#1c1917';
const INK2   = '#44403c';
const MUTED  = '#78716c';
const RULE   = '#e7e5e4';
const BRAND  = '#c2410c';
const BG     = '#faf6ef';
const PAPER  = '#ffffff';

export function LegalLayout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ ...fjVars, background: BG, color: INK, fontFamily: 'Roboto, "Noto Sans Bengali", sans-serif' }}>
      {/* Hero */}
      <section className="relative overflow-hidden" style={{ background: BG }}>
        <div className="relative mx-auto grid max-w-[1320px] grid-cols-12 gap-8 px-6 pb-14 pt-16 md:px-10 md:pt-20">
          <div className="col-span-12 md:col-span-8">
            <h1 className="font-bengali text-[44px] leading-[1.05] md:text-[60px]" style={{ ...SERIF_BN, color: INK }}>{title}</h1>
            <p className="mt-4 font-mono text-[12px] uppercase tracking-[0.18em]" style={{ color: MUTED }}>
              Last updated: {LAST_UPDATED}
            </p>
          </div>
        </div>
        <div className="mx-auto h-px max-w-[1320px] px-6 md:px-10">
          <div className="h-px w-full" style={{ background: RULE }} />
        </div>
      </section>

      {/* Content */}
      <section style={{ background: PAPER }}>
        <div className="mx-auto max-w-[1320px] px-6 py-16 md:px-10">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
            <div className="legal-prose lg:col-span-8" style={{ color: INK2, fontSize: '15px', lineHeight: '1.75' }}>
              {children}
            </div>
            {/* Sidebar contact */}
            <aside className="lg:col-span-4">
              <div className="sticky top-8 rounded-[3px] border p-6" style={{ borderColor: RULE, background: BG }}>
                <div className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: MUTED }}>Contact</div>
                <div className="mt-4 space-y-2">
                  <p className="font-bengali text-[15px] font-semibold" style={{ ...SERIF_BN, color: INK }}>{ORG.nameEn}</p>
                  {ORG.address.en.map((line, i) => (
                    <p key={i} className="text-[13.5px]" style={{ color: INK2 }}>{line}</p>
                  ))}
                  <div className="pt-2">
                    <a href={`mailto:${ORG.email}`} className="text-[13.5px] transition-opacity hover:opacity-70" style={{ color: BRAND }}>
                      {ORG.email}
                    </a>
                  </div>
                  <div>
                    {ORG.phones.map((p) => (
                      <a key={p} href={`tel:+91${p}`} className="block text-[13.5px] transition-opacity hover:opacity-70" style={{ color: INK2 }}>
                        +91 {p}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
}

export function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-[18px] font-bold" style={{ color: '#1c1917' }}>{heading}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

export function List({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  );
}
