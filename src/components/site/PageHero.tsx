import type { ReactNode } from 'react';

/**
 * The green band that opens every non-home page.
 * `tone="blood"` is reserved for the blood-request page only.
 */
export default function PageHero({
  eyebrow,
  title,
  intro,
  tone = 'green',
  children,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  intro?: ReactNode;
  tone?: 'green' | 'blood';
  children?: ReactNode;
}) {
  return (
    <section
      className="page-hero px-5 pb-16 pt-14 sm:px-8 md:pb-[86px] md:pt-[76px]"
      style={tone === 'blood' ? { background: 'var(--blood)' } : undefined}
    >
      <div className="mx-auto w-full max-w-site">
        {eyebrow && <div className="eyebrow-light">{eyebrow}</div>}
        <h1 className="h-display mt-4 max-w-4xl text-white">{title}</h1>
        {intro && (
          <p className="mt-4 max-w-2xl font-dmsans text-[15px] leading-[1.8] text-white/70 md:text-[16px]">
            {intro}
          </p>
        )}
        {children}
      </div>
    </section>
  );
}
