import type { ReactNode } from 'react';

/** White 48px-radius card that wraps every form on the public site. */
export default function FormCard({
  title,
  intro,
  className = '',
  children,
}: {
  title?: ReactNode;
  intro?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`form-card ${className}`}>
      {title && <h2 className="h-card text-site-ink">{title}</h2>}
      {intro && <p className="body-small mt-2.5">{intro}</p>}
      <div className={title || intro ? 'mt-7' : ''}>{children}</div>
    </div>
  );
}
