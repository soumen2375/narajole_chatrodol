import { Link, useLocation } from 'react-router-dom';
import { fjVars, SERIF_BN } from '@/pages/_field-journal';
import { ORG } from '@/data/content';
import { useSEO } from '@/hooks/useSEO';
import { SEO } from '@/data/seoConfig';

export const LAST_UPDATED = '21 May 2026';

const POLICY_LINKS = [
  { to: '/terms', label: 'Terms & Conditions' },
  { to: '/privacy', label: 'Privacy Policy' },
  { to: '/refunds', label: 'Refund Policy' },
  { to: '/shipping', label: 'Shipping Policy' },
];

export function LegalLayout({ title, children }: { title: string; children: React.ReactNode }) {
  const { pathname } = useLocation();
  const pageSEO = SEO[pathname] || {
    title: `${title} | Chhatradol Social Welfare Organisation`,
    description: `Read the ${title} of Chhatradol Social Welfare Organisation.`,
  };
  useSEO(pageSEO);
  return (
    <div style={fjVars} className="bg-site-cream font-dmsans text-site-ink">
      {/* Hero */}
      <section className="page-hero px-5 pb-16 pt-14 sm:px-8 md:pb-[86px] md:pt-[76px]">
        <div className="mx-auto w-full max-w-site">
          <div className="eyebrow-light">Legal</div>
          <h1 className="h-display mt-4 max-w-3xl text-white" style={SERIF_BN}>{title}</h1>
          <p className="mt-5 font-dmmono text-[12px] uppercase tracking-[0.18em] text-white/55">
            Last updated: {LAST_UPDATED}
          </p>

          {/* Pill row linking the four policies */}
          <nav aria-label="Policies" className="mt-8 flex flex-wrap gap-2.5">
            {POLICY_LINKS.map((l) => {
              const active = pathname === l.to;
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  aria-current={active ? 'page' : undefined}
                  className={`chip px-5 text-[13px] ${
                    active
                      ? 'border-site-yellow bg-site-yellow text-site-ink'
                      : 'border-white/35 bg-transparent text-white hover:border-site-yellow hover:text-site-yellow'
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </section>

      {/* Content */}
      <section>
        <div className="mx-auto max-w-site px-5 py-14 sm:px-8 md:py-20">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
            <div
              className="legal-prose space-y-5 lg:col-span-8"
              style={{ color: 'var(--soft)', fontSize: '15px', lineHeight: '1.8' }}
            >
              {children}
            </div>
            {/* Sidebar contact */}
            <aside className="lg:col-span-4">
              <div className="sticky top-[92px] soft-card p-7">
                <div className="eyebrow">Contact</div>
                <div className="mt-5 space-y-2">
                  <p className="font-archivo text-[16px] font-bold text-site-ink" style={SERIF_BN}>{ORG.nameEn}</p>
                  {ORG.address.en.map((line, i) => (
                    <p key={i} className="text-[13.5px] text-site-muted">{line}</p>
                  ))}
                  <div className="pt-2">
                    <a href={`mailto:${ORG.email}`} className="text-[13.5px] font-medium text-site-green transition-colors hover:text-site-red">
                      {ORG.email}
                    </a>
                  </div>
                  <div>
                    {ORG.phones.map((p) => (
                      <a key={p} href={`tel:+91${p}`} className="block text-[13.5px] text-site-muted transition-colors hover:text-site-green">
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

/** Each policy clause sits in its own white card. */
export function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="soft-card space-y-3 p-7 md:p-9">
      <h2 className="font-archivo text-[19px] font-bold tracking-[-0.02em] text-site-ink">{heading}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

export function List({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5 marker:text-site-yellow">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  );
}
