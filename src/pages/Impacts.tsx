import PageHeader from '@/components/ui/PageHeader';
import SmartImage from '@/components/ui/SmartImage';
import { SUCCESS_STORIES, TESTIMONIALS } from '@/data/content';
import { useT } from '@/i18n';

export default function Impacts() {
  const { t, lang } = useT();
  return (
    <div>
      <PageHeader title={t('impacts.title')} subtitle={t('impacts.subtitle')} />
      <div className="container mx-auto px-4 py-10 md:px-8">
        <section className="mb-12">
          <h2 className="mb-8 text-center text-2xl font-bold text-blue-700">{t('impacts.testimonials')}</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((tm) => (
              <div key={tm.author.en} className="flex flex-col rounded-xl bg-white p-6 shadow-md ring-1 ring-gray-100">
                <svg className="mb-3 h-8 w-8 text-blue-200" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7.17 6A5.17 5.17 0 002 11.17V18h6.83v-6.83H5.5A1.67 1.67 0 017.17 9.5V6zm9 0A5.17 5.17 0 0011 11.17V18h6.83v-6.83H14.5a1.67 1.67 0 011.67-1.67V6z" />
                </svg>
                <p className="flex-grow leading-relaxed text-gray-700">{tm.quote[lang]}</p>
                <div className="mt-4">
                  <p className="font-semibold text-gray-900">{tm.author[lang]}</p>
                  <p className="text-sm text-blue-600">{tm.role[lang]}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-8 text-center text-2xl font-bold text-blue-700">{t('impacts.stories')}</h2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {SUCCESS_STORIES.map((s) => (
              <div key={s.title.en} className="overflow-hidden rounded-xl bg-white shadow-md ring-1 ring-gray-100">
                <SmartImage src={s.img} alt={s.title[lang]} className="h-56 w-full object-cover" />
                <div className="p-6">
                  <h3 className="mb-2 text-xl font-semibold text-gray-900">{s.title[lang]}</h3>
                  <p className="leading-relaxed text-gray-700">{s.summary[lang]}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl bg-blue-700 p-8 text-center text-white">
          <h2 className="mb-3 text-2xl font-bold">{t('impacts.reportTitle')}</h2>
          <p className="mx-auto max-w-2xl text-blue-100">{t('impacts.reportText')}</p>
        </section>
      </div>
    </div>
  );
}
