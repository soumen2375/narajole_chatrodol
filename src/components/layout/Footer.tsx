import { Link } from 'react-router-dom';
import { ORG, name } from '@/data/content';
import { useFmt } from '@/lib/format';
import { useT } from '@/i18n';

export default function Footer() {
  const year = new Date().getFullYear();
  const { t, lang } = useT();
  const fmt = useFmt();

  return (
    <footer className="bg-gray-800 py-10 text-gray-300">
      <div className="container mx-auto grid grid-cols-1 gap-8 px-4 md:grid-cols-4 md:px-8">
        <div>
          <h3 className="mb-4 text-2xl font-bold text-white">{name(lang)}</h3>
          <p className="mb-4 text-sm leading-relaxed">{t('footer.about')}</p>
          <div className="flex space-x-4">
            <a href={ORG.social.facebook} target="_blank" rel="noreferrer" className="hover:text-white" aria-label="Facebook">
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.99 3.657 9.128 8.438 9.878v-6.987H7.898v-2.89h2.54V9.797c0-2.507 1.492-3.892 3.777-3.892 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.99 22 12z"/></svg>
            </a>
            <a href={ORG.social.instagram} target="_blank" rel="noreferrer" className="hover:text-white" aria-label="Instagram">
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.2c3.2 0 3.6 0 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.43.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s0 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.43.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58 0-4.85-.07c-1.17-.05-1.8-.25-2.23-.41-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.16-.43-.36-1.06-.41-2.23C2.21 15.58 2.2 15.2 2.2 12s0-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.43-.16 1.06-.36 2.23-.41C8.42 2.21 8.8 2.2 12 2.2zm0 4.86A4.94 4.94 0 1016.94 12 4.94 4.94 0 0012 7.06zm0 8.14A3.2 3.2 0 1115.2 12 3.2 3.2 0 0112 15.2zm5.13-8.32a1.15 1.15 0 11-1.15-1.15 1.15 1.15 0 011.15 1.15z"/></svg>
            </a>
            <a href={ORG.social.youtube} target="_blank" rel="noreferrer" className="hover:text-white" aria-label="YouTube">
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M23.5 6.2a3.02 3.02 0 00-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.51A3.02 3.02 0 00.5 6.2 31.5 31.5 0 000 12a31.5 31.5 0 00.5 5.8 3.02 3.02 0 002.12 2.14c1.88.51 9.38.51 9.38.51s7.5 0 9.38-.51a3.02 3.02 0 002.12-2.14A31.5 31.5 0 0024 12a31.5 31.5 0 00-.5-5.8zM9.55 15.57V8.43L15.82 12z"/></svg>
            </a>
          </div>
        </div>

        <div>
          <h3 className="mb-4 text-xl font-semibold text-white">{t('footer.quickLinks')}</h3>
          <ul className="space-y-2">
            <li><Link to="/" className="hover:text-white">{t('nav.home')}</Link></li>
            <li><Link to="/about" className="hover:text-white">{t('nav.about')}</Link></li>
            <li><Link to="/programs" className="hover:text-white">{t('nav.programs')}</Link></li>
            <li><Link to="/events" className="hover:text-white">{t('nav.events')}</Link></li>
            <li><Link to="/impacts" className="hover:text-white">{t('nav.impacts')}</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="mb-4 text-xl font-semibold text-white">{t('footer.getInvolved')}</h3>
          <ul className="space-y-2">
            <li><Link to="/volunteer" className="hover:text-white">{t('nav.volunteer')}</Link></li>
            <li><Link to="/donate" className="hover:text-white">{t('nav.donate')}</Link></li>
            <li><Link to="/contact" className="hover:text-white">{t('nav.contact')}</Link></li>
            <li><Link to="/login" className="hover:text-white">{t('header.memberLogin')}</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="mb-4 text-xl font-semibold text-white">{t('nav.contact')}</h3>
          <address className="space-y-1 not-italic text-sm">
            {ORG.address[lang].map((line) => (
              <p key={line}>{line}</p>
            ))}
            <p>{t('common.email')}: <a href={`mailto:${ORG.email}`} className="hover:text-white">{ORG.email}</a></p>
            <p>
              {t('common.phone')}:{' '}
              {ORG.phones.map((p, i) => (
                <span key={p}>
                  <a href={`tel:+91${p}`} className="hover:text-white">{fmt.num(p)}</a>
                  {i < ORG.phones.length - 1 ? ', ' : ''}
                </span>
              ))}
            </p>
          </address>
        </div>
      </div>

      <div className="container mx-auto mt-8 border-t border-gray-700 px-4 pt-6 md:px-8">
        <nav className="mb-4 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
          <Link to="/terms" className="hover:text-white">{t('legal.terms')}</Link>
          <Link to="/privacy" className="hover:text-white">{t('legal.privacy')}</Link>
          <Link to="/refunds" className="hover:text-white">{t('legal.refunds')}</Link>
          <Link to="/shipping" className="hover:text-white">{t('legal.shipping')}</Link>
        </nav>
        <p className="text-center text-sm text-gray-500">
          © {fmt.num(year)} {ORG.nameEn} ({ORG.nameBn})। {t('footer.rights')}
        </p>
      </div>
    </footer>
  );
}
