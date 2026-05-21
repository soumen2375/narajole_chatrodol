import PageHeader from '@/components/ui/PageHeader';
import { ORG } from '@/data/content';

export const LAST_UPDATED = '21 May 2026';

export function LegalLayout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <PageHeader title={title} subtitle={ORG.nameEn} />
      <div className="container mx-auto max-w-3xl px-4 py-10 md:px-8">
        <div className="rounded-xl bg-white p-6 shadow-md ring-1 ring-gray-100 md:p-8">
          <p className="mb-6 text-sm text-gray-500">Last updated: {LAST_UPDATED}</p>
          <div className="legal-prose space-y-6 text-[15px] leading-relaxed text-gray-700">{children}</div>
          <div className="mt-8 border-t pt-6 text-sm text-gray-600">
            <p className="font-semibold text-gray-800">Contact</p>
            <p>{ORG.nameEn}</p>
            <p>{ORG.address.en.join(', ')}</p>
            <p>
              Email: <a href={`mailto:${ORG.email}`} className="text-blue-600 hover:underline">{ORG.email}</a>
            </p>
            <p>Phone: {ORG.phones.map((p) => `+91 ${p}`).join(', ')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-lg font-bold text-gray-900">{heading}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

export function List({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  );
}
