import { Link } from 'react-router-dom';
import { FaHouse, FaChevronRight } from 'react-icons/fa6';

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

export default function Breadcrumb({ title, items = [] }: { title: string; items?: BreadcrumbItem[] }) {
  return (
    <div className="w-full bg-[#1c1917] py-3.5 px-4 sm:px-8 border-b border-white/10 text-white/90 shadow-md">
      <div className="mx-auto flex max-w-[1380px] items-center gap-2.5 text-sm md:text-[15px] font-medium">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-amber-400 hover:text-amber-300 font-bold transition-colors shrink-0"
        >
          <FaHouse className="h-4 w-4 text-amber-400" />
          <span>Home</span>
        </Link>

        {items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2.5 shrink-0">
            <FaChevronRight className="h-3 w-3 text-white/40" />
            {item.to ? (
              <Link to={item.to} className="text-white/80 hover:text-white transition-colors">
                {item.label}
              </Link>
            ) : (
              <span className="text-white font-semibold">{item.label}</span>
            )}
          </div>
        ))}

        <FaChevronRight className="h-3 w-3 text-white/40 shrink-0" />
        <span className="text-amber-300 font-bold tracking-wide truncate">{title}</span>
      </div>
    </div>
  );
}
