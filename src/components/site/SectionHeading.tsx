import type { ReactNode } from 'react';

export default function SectionHeading({
  eyebrow,
  title,
  intro,
  align = 'center',
  className = '',
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  intro?: ReactNode;
  align?: 'center' | 'left';
  className?: string;
}) {
  const centered = align === 'center';
  return (
    <div className={`${centered ? 'mx-auto max-w-2xl text-center' : 'text-left'} ${className}`}>
      {eyebrow && <div className="eyebrow">{eyebrow}</div>}
      <h2 className="h-section mt-3 text-site-ink">{title}</h2>
      {intro && <p className={`body-text mt-4 ${centered ? 'mx-auto' : ''}`}>{intro}</p>}
    </div>
  );
}
