export default function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <section className="bg-gradient-to-r from-blue-700 to-blue-800 py-12 text-center text-white">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-extrabold md:text-4xl">{title}</h1>
        {subtitle && <p className="mx-auto mt-3 max-w-2xl text-blue-100">{subtitle}</p>}
      </div>
    </section>
  );
}
