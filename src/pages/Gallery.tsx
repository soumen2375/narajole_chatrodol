import { useMemo, useState } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import SmartImage from '@/components/ui/SmartImage';
import { GALLERY_IMAGES } from '@/data/content';
import { useT } from '@/i18n';

export default function Gallery() {
  const { t, lang } = useT();
  const ALL = t('gallery.all');
  const categories = useMemo(
    () => [ALL, ...Array.from(new Set(GALLERY_IMAGES.map((i) => i.category[lang])))],
    [ALL, lang],
  );
  const [active, setActive] = useState(ALL);
  const current = categories.includes(active) ? active : ALL;

  const filtered = current === ALL ? GALLERY_IMAGES : GALLERY_IMAGES.filter((i) => i.category[lang] === current);

  return (
    <div>
      <PageHeader title={t('gallery.title')} subtitle={t('gallery.subtitle')} />
      <div className="container mx-auto px-4 py-10 md:px-8">
        <div className="mb-8 flex flex-wrap justify-center gap-3">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setActive(c)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                current === c ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((img) => (
            <div key={img.src} className="group relative overflow-hidden rounded-xl shadow-md">
              <SmartImage src={img.src} alt={img.alt[lang]} className="h-48 w-full object-cover transition duration-300 group-hover:scale-105" />
              <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 transition group-hover:opacity-100">
                <p className="text-sm font-semibold text-white">{img.alt[lang]}</p>
                {img.more && (
                  <a href={img.more} target="_blank" rel="noreferrer" className="mt-1 text-xs text-blue-200 underline">
                    {t('gallery.more')}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
