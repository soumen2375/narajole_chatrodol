import { Link } from 'react-router-dom';
import { useT } from '@/i18n';

export default function NotFound() {
  const { lang } = useT();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-6xl font-extrabold" style={{ color: 'var(--c-brand)' }}>404</h1>
      <p className="mt-4 text-xl" style={{ color: 'var(--c-ink-2)' }}>
        {lang === 'en' ? 'Sorry, the page could not be found.' : 'দুঃখিত, পৃষ্ঠাটি খুঁজে পাওয়া যায়নি।'}
      </p>
      <Link
        to="/"
        className="mt-6 rounded-full px-6 py-2 font-semibold text-white transition hover:opacity-90"
        style={{ background: 'var(--c-brand)' }}
      >
        {lang === 'en' ? 'Back to home' : 'হোমে ফিরে যান'}
      </Link>
    </div>
  );
}
