import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

/** 70px-radius capsule: red number → bold label → muted line → READ MORE. */
export default function StatCard({
  value,
  label,
  description,
  to,
  linkLabel = 'READ MORE',
}: {
  value: ReactNode;
  label: ReactNode;
  description?: ReactNode;
  to?: string;
  linkLabel?: string;
}) {
  return (
    <div className="stat-capsule flex h-full flex-col items-center justify-center">
      <div className="font-archivo text-[30px] font-bold leading-none text-site-red">{value}</div>
      <div className="mt-2.5 font-archivo text-[15px] font-bold leading-tight text-site-ink">
        {label}
      </div>
      {description && (
        <p className="mt-3 font-dmsans text-[13px] leading-[1.7] text-site-muted">{description}</p>
      )}
      {to && (
        <Link to={to} className="read-more mt-4">
          {linkLabel}
        </Link>
      )}
    </div>
  );
}
