export function Skel({ className = '' }: { className?: string }) {
  return <div className={`skeleton rounded-md ${className}`} />;
}

export function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-md ring-1 ring-gray-100">
      <Skel className="h-52 w-full rounded-none" />
      <div className="space-y-3 p-5">
        <Skel className="h-3 w-24" />
        <Skel className="h-5 w-3/4" />
        <Skel className="h-3 w-full" />
        <Skel className="h-3 w-5/6" />
      </div>
    </div>
  );
}

export function CardsGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function StatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <Skel className="mb-2 h-8 w-16" />
          <Skel className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
      <div className="border-b bg-gray-50 px-4 py-3">
        <Skel className="h-4 w-40" />
      </div>
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            <Skel className="h-4 w-1/4" />
            <Skel className="h-4 w-1/3" />
            <Skel className="ml-auto h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
          <div className="w-2/3 space-y-2">
            <Skel className="h-4 w-1/2" />
            <Skel className="h-3 w-1/3" />
          </div>
          <Skel className="h-7 w-16" />
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skel className="h-7 w-56" />
      <StatsSkeleton />
      <TableSkeleton rows={5} />
    </div>
  );
}

export function MonthGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
          <div className="mb-3 flex items-center justify-between">
            <Skel className="h-4 w-20" />
            <Skel className="h-5 w-14 rounded-full" />
          </div>
          <Skel className="h-8 w-full" />
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div>
      <div className="border-b border-stone-200 bg-stone-100 py-16">
        <div className="mx-auto max-w-3xl px-4">
          <Skel className="mx-auto h-9 w-72" />
        </div>
      </div>
      <div className="mx-auto max-w-[1320px] px-6 py-12">
        <CardsGridSkeleton count={6} />
      </div>
    </div>
  );
}
