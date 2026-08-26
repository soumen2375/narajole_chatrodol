import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaHouse, FaChevronRight } from 'react-icons/fa6';
import { injectBreadcrumbSchema, removeBreadcrumbSchema } from '@/lib/structuredData';

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

export default function Breadcrumb({ title, items = [] }: { title: string; items?: BreadcrumbItem[] }) {
  useEffect(() => {
    const siteUrl = 'https://www.chhatradol.org';
    const schemaItems = [
      { name: 'Home', url: `${siteUrl}/` },
      ...items.map((it) => ({
        name: it.label,
        url: it.to ? `${siteUrl}${it.to}` : `${siteUrl}${window.location.pathname}`,
      })),
      { name: title, url: `${siteUrl}${window.location.pathname}` },
    ];
    injectBreadcrumbSchema(schemaItems);

    return () => {
      removeBreadcrumbSchema();
    };
  }, [title, items]);

  return (
    <nav aria-label="Breadcrumb" className="w-full border-b border-site-line bg-site-cream px-5 py-3 sm:px-8">
      <div className="mx-auto flex max-w-[1340px] items-center gap-2 font-dmsans text-[12.5px] sm:text-[13px]">
        {/* Soft Home icon button */}
        <Link
          to="/"
          className="group inline-flex shrink-0 items-center gap-2 font-medium text-site-muted transition-colors hover:text-site-green"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-site-green transition-colors group-hover:bg-site-yellow group-hover:text-site-ink">
            <FaHouse className="h-3 w-3" />
          </span>
          <span className="font-semibold text-site-ink transition-colors group-hover:text-site-green">Home</span>
        </Link>

        {items.map((item, idx) => (
          <div key={idx} className="flex shrink-0 items-center gap-2">
            <FaChevronRight className="h-2.5 w-2.5 text-site-faint" />
            {item.to ? (
              <Link to={item.to} className="text-site-muted transition-colors hover:text-site-green">
                {item.label}
              </Link>
            ) : (
              <span className="font-semibold text-site-ink">{item.label}</span>
            )}
          </div>
        ))}

        <FaChevronRight className="h-2.5 w-2.5 shrink-0 text-site-faint" />
        <span className="truncate font-bold tracking-tight text-site-red">{title}</span>
      </div>
    </nav>
  );
}

