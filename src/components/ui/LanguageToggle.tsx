import { useT } from '@/i18n';

export default function LanguageToggle({ light = false }: { light?: boolean }) {
  const { lang, setLang } = useT();
  const base = 'rounded-md px-2 py-0.5 text-xs font-semibold transition';
  const activeCls = light ? 'bg-white text-blue-700' : 'bg-blue-600 text-white';
  const idleCls = light ? 'text-white/80 hover:text-white' : 'text-gray-500 hover:text-gray-800';

  return (
    <div className={`inline-flex items-center gap-1 rounded-lg p-0.5 ${light ? 'bg-white/15' : 'bg-gray-100'}`}>
      <button className={`${base} ${lang === 'bn' ? activeCls : idleCls}`} onClick={() => setLang('bn')}>
        বাংলা
      </button>
      <button className={`${base} ${lang === 'en' ? activeCls : idleCls}`} onClick={() => setLang('en')}>
        EN
      </button>
    </div>
  );
}
