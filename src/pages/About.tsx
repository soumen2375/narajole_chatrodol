import PageHeader from '@/components/ui/PageHeader';
import SmartImage from '@/components/ui/SmartImage';
import { CORE_VALUES, ORG, TEAM_MEMBERS } from '@/data/content';
import { useT } from '@/i18n';

export default function About() {
  const { t, lang } = useT();
  return (
    <div>
      <PageHeader title={t('about.title')} subtitle={ORG.nameEn} />
      <div className="container mx-auto space-y-8 p-4 md:p-8">
        <section className="rounded-xl bg-white p-6 shadow-md ring-1 ring-gray-100">
          <p className="mx-auto max-w-3xl text-center text-lg leading-relaxed text-gray-700">{t('about.intro')}</p>
        </section>

        <section className="rounded-xl bg-white p-6 shadow-md ring-1 ring-gray-100">
          <h2 className="mb-4 text-2xl font-bold text-blue-700">{t('about.historyTitle')}</h2>
          <p className="leading-relaxed text-gray-700">{t('about.historyText')}</p>
        </section>

        <section className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <div className="rounded-xl bg-white p-6 shadow-md ring-1 ring-gray-100">
            <h2 className="mb-4 text-2xl font-bold text-blue-700">{t('about.missionTitle')}</h2>
            <p className="leading-relaxed text-gray-700">{t('about.missionText')}</p>
          </div>
          <div className="rounded-xl bg-white p-6 shadow-md ring-1 ring-gray-100">
            <h2 className="mb-4 text-2xl font-bold text-blue-700">{t('about.visionTitle')}</h2>
            <p className="leading-relaxed text-gray-700">{t('about.visionText')}</p>
          </div>
        </section>

        <section className="rounded-xl bg-white p-6 shadow-md ring-1 ring-gray-100">
          <h2 className="mb-4 text-2xl font-bold text-blue-700">{t('about.valuesTitle')}</h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {CORE_VALUES.map((v) => (
              <li key={v.label.en} className="rounded-lg bg-gray-50 p-4">
                <span className="font-semibold text-blue-700">{v.label[lang]}:</span>{' '}
                <span className="text-gray-700">{v.text[lang]}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl bg-white p-6 shadow-md ring-1 ring-gray-100">
          <h2 className="mb-8 text-center text-2xl font-bold text-blue-700">{t('about.teamTitle')}</h2>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-2 md:grid-cols-4">
            {TEAM_MEMBERS.map((m) => (
              <div key={m.name.en} className="flex flex-col items-center rounded-xl bg-gray-50 p-4 text-center shadow-sm">
                <SmartImage src={m.img} alt={m.name[lang]} className="mb-4 h-28 w-28 rounded-full border-4 border-blue-200 object-cover" />
                <h3 className="mb-1 text-base font-semibold text-gray-900">{m.name[lang]}</h3>
                <p className="text-sm text-blue-600">{m.role[lang]}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
