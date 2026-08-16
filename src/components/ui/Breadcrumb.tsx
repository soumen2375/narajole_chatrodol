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
    <nav aria-label="Breadcrumb" className="w-full bg-[#faf6ef]/70 py-2.5 px-4 sm:px-8 border-b border-stone-200/50 opacity-90 hover:opacity-100 transition-opacity">
      <div className="mx-auto flex max-w-[1340px] items-center gap-2 text-xs sm:text-sm font-sans">
        {/* Soft Home icon button */}
        <Link
          to="/"
          className="group inline-flex items-center gap-1.5 text-stone-600 hover:text-[#c2410c] font-medium transition-colors shrink-0"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-100/50 text-[#c2410c]/80 transition-all group-hover:scale-105 group-hover:bg-orange-100">
            <FaHouse className="h-3 w-3" />
          </span>
          <span className="text-stone-700 font-semibold group-hover:text-[#c2410c] transition-colors">Home</span>
        </Link>

        {items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2 shrink-0">
            <FaChevronRight className="h-3 w-3 text-stone-400/80" />
            {item.to ? (
              <Link to={item.to} className="text-stone-600 hover:text-[#c2410c] transition-colors">
                {item.label}
              </Link>
            ) : (
              <span className="text-stone-800 font-semibold">{item.label}</span>
            )}
          </div>
        ))}

        <FaChevronRight className="h-3 w-3 text-stone-400/80 shrink-0" />
        <span className="text-[#c2410c]/90 font-bold tracking-tight truncate">{title}</span>
      </div>
    </nav>
  );
}

