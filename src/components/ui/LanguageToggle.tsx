import { useT } from '@/i18n';

export default function LanguageToggle({ light = false }: { light?: boolean }) {
  const { lang, setLang } = useT();

  const containerStyle = light
    ? { background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }
    : { background: '#f5f1ea', border: '1px solid #e7e5e4' };

  const activeStyle = light
    ? { background: '#ffffff', color: '#1c1917' }
    : { background: '#c2410c', color: '#ffffff' };

  const idleStyle = light
    ? { color: 'rgba(255,255,255,0.75)' }
    : { color: '#78716c' };

  return (
    <div
      className="inline-flex items-center gap-0.5 rounded-full p-0.5"
      style={containerStyle}
    >
      {(['bn', 'en'] as const).map((l) => {
        const isActive = lang === l;
        return (
          <button
            key={l}
            onClick={() => setLang(l)}
            className="rounded-full px-3.5 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] transition-all duration-200"
            style={isActive ? activeStyle : idleStyle}
          >
            {l === 'bn' ? 'বাং' : 'EN'}
          </button>
        );
      })}
    </div>
  );
}
