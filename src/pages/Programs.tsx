import { Link } from 'react-router-dom';
import PageHeader from '@/components/ui/PageHeader';
import SmartImage from '@/components/ui/SmartImage';
import { PROGRAMS } from '@/data/content';
import { useT } from '@/i18n';

export default function Programs() {
  const { t, lang } = useT();
  return (
    <div>
      <PageHeader title={t('programs.title')} subtitle={t('programs.subtitle')} />
      <div className="container mx-auto px-4 py-10 md:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {PROGRAMS.map((p) => (
            <div key={p.title.en} className="rounded-xl bg-white p-6 shadow-md ring-1 ring-gray-100 transition hover:shadow-lg">
              <div className="mb-4 flex items-center gap-4">
                <SmartImage src={p.icon} alt="" className="h-12 w-12 rounded-full object-contain" />
                <h3 className="text-xl font-semibold text-gray-900">{p.title[lang]}</h3>
              </div>
              <p className="mb-3 leading-relaxed text-gray-700">{p.description[lang]}</p>
              <p className="text-sm italic leading-relaxed text-gray-500">{p.details[lang]}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-xl bg-blue-50 p-8 text-center">
          <h2 className="mb-3 text-2xl font-bold text-blue-800">{t('programs.joinTitle')}</h2>
          <p className="mx-auto mb-6 max-w-2xl text-gray-700">{t('programs.joinText')}</p>
          <Link to="/volunteer" className="inline-block rounded-full bg-green-500 px-8 py-3 font-bold text-white shadow-lg transition hover:bg-green-600">
            {t('nav.volunteer')}
          </Link>
        </div>
      </div>
    </div>
  );
}
