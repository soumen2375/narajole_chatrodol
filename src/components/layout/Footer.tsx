import { Link } from 'react-router-dom';
import { ORG } from '@/data/content';
import { useT } from '@/i18n';

// Field Journal Footer — dark ink bg, cream text, big serif name + CTAs.

const BRAND       = '#c2410c';
const BRAND_LIGHT = '#ea580c';
const INK         = '#1c1917';
const CREAM       = '#faf6ef';

export default function Footer() {
  const { lang, t } = useT();
  const bn = lang === 'bn';
  const year = new Date().getFullYear();
  return (
    <footer style={{ background: INK, color: '#d6d3d1' }}>
      <div className="container mx-auto px-4 py-16 md:px-8">
        {/* Top — big serif name + CTAs */}
        <div
          className="flex flex-col gap-10 border-b pb-12 md:flex-row md:items-end md:justify-between"
          style={{ borderColor: 'rgba(255,255,255,0.12)' }}
        >
          <div>
            <div className="text-[11px] font-medium uppercase tracking-[0.22em]" style={{ color: '#a8a29e' }}>
              Est. {ORG.established} · Nij Narajole · West Bengal
            </div>
            <h3
              className="mt-4 font-bengali text-4xl font-bold md:text-5xl"
              style={{ fontFamily: '"Noto Serif Bengali", "Noto Sans Bengali", serif', color: CREAM }}
            >
              {bn ? ORG.shortBn : ORG.shortEn}
            </h3>
            <p className="mt-3 max-w-xl font-bengali text-sm leading-relaxed" style={{ color: '#a8a29e' }}>
              {t('footer.about')}
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              to="/donate"
              className="inline-flex items-center justify-center rounded-full px-6 py-3 font-bengali text-sm font-semibold transition-colors"
              style={{ background: BRAND, color: CREAM }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = BRAND_LIGHT)}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = BRAND)}
            >
              {t('nav.donate')}
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center justify-center rounded-full border px-6 py-3 font-bengali text-sm font-semibold transition-colors hover:bg-white/10"
              style={{ borderColor: 'rgba(255,255,255,0.20)', color: CREAM }}
            >
              {t('nav.contact')}
            </Link>
          </div>
        </div>

        {/* Link columns */}
        <div className="mt-12 grid grid-cols-2 gap-8 md:grid-cols-4">
          <FooterColumn title={t('footer.quickLinks')} links={[
            { to: '/',         label: t('nav.home') },
            { to: '/about',    label: t('nav.about') },
            { to: '/programs', label: t('nav.programs') },
            { to: '/events',   label: t('nav.events') },
            { to: '/impacts',  label: t('nav.impacts') },
          ]} />
          <FooterColumn title={t('footer.getInvolved')} links={[
            { to: '/volunteer', label: t('nav.volunteer') },
            { to: '/donate',    label: t('nav.donate') },
            { to: '/contact',   label: t('nav.contact') },
            { to: '/login',     label: t('header.memberLogin') },
          ]} />
          <div>
            <h4 className="font-bengali text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: '#a8a29e' }}>
              {bn ? 'যোগাযোগ' : 'Address'}
            </h4>
            <address className="mt-4 space-y-1 font-bengali text-sm not-italic" style={{ color: '#d6d3d1' }}>
              {ORG.address[lang].map((line) => <p key={line}>{line}</p>)}
            </address>
          </div>
          <div>
            <h4 className="font-bengali text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: '#a8a29e' }}>
              {bn ? 'সংযোগ' : 'Connect'}
            </h4>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <a href={`mailto:${ORG.email}`} className="hover:underline" style={{ color: '#d6d3d1' }}>{ORG.email}</a>
              </li>
              {ORG.phones.map((p) => (
                <li key={p} style={{ color: '#d6d3d1' }}>+91 {p}</li>
              ))}
            </ul>
            <div className="mt-5 flex gap-2">
              <SocialIcon href={ORG.social.facebook} label="Facebook">
                <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.99 3.657 9.128 8.438 9.878v-6.987H7.898v-2.89h2.54V9.797c0-2.507 1.492-3.892 3.777-3.892 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.99 22 12z" />
              </SocialIcon>
              <SocialIcon href={ORG.social.instagram} label="Instagram">
                <path d="M12 2.2c3.2 0 3.6 0 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.43.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s0 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.43.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58 0-4.85-.07c-1.17-.05-1.8-.25-2.23-.41-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.16-.43-.36-1.06-.41-2.23C2.21 15.58 2.2 15.2 2.2 12s0-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.43-.16 1.06-.36 2.23-.41C8.42 2.21 8.8 2.2 12 2.2zm0 4.86A4.94 4.94 0 1016.94 12 4.94 4.94 0 0012 7.06zm0 8.14A3.2 3.2 0 1115.2 12 3.2 3.2 0 0112 15.2zm5.13-8.32a1.15 1.15 0 11-1.15-1.15 1.15 1.15 0 011.15 1.15z" />
              </SocialIcon>
              <SocialIcon href={ORG.social.youtube} label="YouTube">
                <path d="M23.5 6.2a3.02 3.02 0 00-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.51A3.02 3.02 0 00.5 6.2 31.5 31.5 0 000 12a31.5 31.5 0 00.5 5.8 3.02 3.02 0 002.12 2.14c1.88.51 9.38.51 9.38.51s7.5 0 9.38-.51a3.02 3.02 0 002.12-2.14A31.5 31.5 0 0024 12a31.5 31.5 0 00-.5-5.8zM9.55 15.57V8.43L15.82 12z" />
              </SocialIcon>
            </div>
          </div>
        </div>

        {/* Legal links */}
        <nav
          className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-2 border-t pt-8 font-bengali text-[12px]"
          style={{ borderColor: 'rgba(255,255,255,0.08)', color: '#57534e' }}
        >
          <Link to="/terms"    className="transition-colors hover:text-white">{t('legal.terms')}</Link>
          <Link to="/privacy"  className="transition-colors hover:text-white">{t('legal.privacy')}</Link>
          <Link to="/refunds"  className="transition-colors hover:text-white">{t('legal.refunds')}</Link>
          <Link to="/shipping" className="transition-colors hover:text-white">{t('legal.shipping')}</Link>
        </nav>

        {/* Bottom strip */}
        <div
          className="mt-4 flex flex-col gap-2 font-bengali text-xs md:flex-row md:items-center md:justify-between"
          style={{ color: '#78716c' }}
        >
          <span>© {year} {bn ? ORG.shortBn : ORG.shortEn}. {t('footer.rights')}</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: '#57534e' }}>{ORG.shortEn}</span>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: { to: string; label: string }[] }) {
  return (
    <div>
      <h4 className="font-bengali text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: '#a8a29e' }}>{title}</h4>
      <ul className="mt-4 space-y-2 font-bengali text-sm">
        {links.map((l) => (
          <li key={l.to}>
            <Link to={l.to} className="transition-colors hover:underline" style={{ color: '#d6d3d1' }}>
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SocialIcon({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-full border transition-colors"
      style={{ borderColor: 'rgba(255,255,255,0.18)', color: '#d6d3d1' }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = BRAND;
        (e.currentTarget as HTMLElement).style.color = BRAND_LIGHT;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.18)';
        (e.currentTarget as HTMLElement).style.color = '#d6d3d1';
      }}
    >
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">{children}</svg>
    </a>
  );
}
