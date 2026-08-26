import { Link } from 'react-router-dom';
import { ORG } from '@/data/content';
import { FaFacebookF, FaInstagram, FaYoutube, FaXTwitter, FaLocationDot, FaPhone, FaEnvelope, FaClock, FaHeart } from 'react-icons/fa6';

const SOCIALS = [
  { href: ORG.social.facebook, label: 'Facebook', title: 'Facebook: @chhatradolswo', Icon: FaFacebookF },
  { href: ORG.social.instagram, label: 'Instagram', title: 'Instagram: @chhatradolswo', Icon: FaInstagram },
  { href: ORG.social.twitter, label: 'X (Twitter)', title: 'X: @Chhatradolswo', Icon: FaXTwitter },
  { href: ORG.social.youtube, label: 'YouTube', title: 'YouTube: @Chhatradolswo', Icon: FaYoutube },
];

const QUICK_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About Us' },
  { to: '/events', label: 'Events' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/programs', label: 'Our Programs' },
  { to: '/impacts', label: 'Impacts' },
];

const IMPORTANT_LINKS = [
  { to: '/contact', label: 'Contact' },
  { to: '/volunteer', label: 'Volunteer' },
  { to: '/blood-request', label: 'Blood Request' },
  { to: '/donate', label: 'Donate' },
  { to: '/organise-blood-camp', label: 'Blood Camp' },
];

const LEGAL_LINKS = [
  { to: '/terms', label: 'Terms & Conditions' },
  { to: '/privacy', label: 'Privacy Policy' },
  { to: '/refunds', label: 'Refund Policy' },
  { to: '/shipping', label: 'Shipping Policy' },
];

function LinkColumn({ heading, links }: { heading: string; links: { to: string; label: string }[] }) {
  return (
    <div className="lg:col-span-2">
      <h4 className="font-dmsans text-[13px] font-bold uppercase tracking-[0.12em] text-white">
        {heading}
      </h4>
      <ul className="mt-5 grid gap-3 font-dmsans text-[14.5px] text-white/70">
        {links.map((l) => (
          <li key={l.to + l.label}>
            <Link to={l.to} className="transition-colors hover:text-site-yellow">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="w-full bg-site-green text-white">
      <div className="mx-auto w-full max-w-[1340px] px-5 pb-10 pt-14 sm:px-8 md:px-10 md:pt-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-12">

          {/* Col 1: Brand Info & Socials */}
          <div className="lg:col-span-3">
            <Link to="/" className="flex items-center gap-3">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white p-1 sm:h-16 sm:w-16">
                <img
                  src="/assets/images/logo.png"
                  alt="Chhatradol SWO Logo"
                  className="h-full w-full rounded-full object-contain"
                  onError={(e) => { e.currentTarget.src = '/assets/images/Chhatradol.jpg'; }}
                />
              </span>
              <span className="flex min-w-0 flex-col leading-tight">
                <span className="wordmark text-[21px] text-white sm:text-[23px]">
                  Chhatradol SWO
                </span>
                <span className="mt-1 font-dmsans text-[12.5px] text-white/55">
                  Narajole, Paschim Medinipur
                </span>
              </span>
            </Link>

            <p className="mt-5 max-w-xs font-dmsans text-[14.5px] leading-[1.75] text-white/70">
              Working together for a better society through unity, education, and progress.
            </p>

            {/* Social Icons */}
            <div className="mt-6 flex flex-wrap items-center gap-2.5">
              {SOCIALS.map(({ href, label, title, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  title={title}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition-all hover:border-site-yellow hover:bg-site-yellow hover:text-site-ink"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <LinkColumn heading="Quick Links" links={QUICK_LINKS} />

          {/* Col 3: Important Links */}
          <LinkColumn heading="Important Links" links={IMPORTANT_LINKS} />

          {/* Col 4: Legal */}
          <LinkColumn heading="Legal" links={LEGAL_LINKS} />

          {/* Col 5: Contact Us */}
          <div className="lg:col-span-3">
            <h4 className="font-dmsans text-[13px] font-bold uppercase tracking-[0.12em] text-white">
              Contact Us
            </h4>
            <ul className="mt-5 grid gap-4 font-dmsans text-[14.5px] leading-[1.6] text-white/70">
              <li className="flex items-start gap-3">
                <FaLocationDot className="mt-1 h-4 w-4 flex-shrink-0 text-site-yellow" />
                <span>Narajole, Paschim Medinipur, West Bengal, 721211</span>
              </li>
              <li className="flex items-center gap-3">
                <FaPhone className="h-4 w-4 flex-shrink-0 text-site-yellow" />
                <a href="tel:+917811073412" className="transition-colors hover:text-site-yellow">+91 78110 73412</a>
              </li>
              <li className="flex items-center gap-3">
                <FaEnvelope className="h-4 w-4 flex-shrink-0 text-site-yellow" />
                <span>info@chhatradol.org</span>
              </li>
              <li className="flex items-center gap-3">
                <FaClock className="h-4 w-4 flex-shrink-0 text-site-yellow" />
                <span>Mon - Sun: 9:00 AM - 6:00 PM</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Strip */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/15 pt-8 md:flex-row">
          <span className="font-dmsans text-[13px] text-white/55">
            © {year} Chhatradol SWO. All rights reserved.
          </span>
          <span className="flex items-center gap-1.5 font-dmsans text-[13px] font-medium text-white/60">
            Powered By <FaHeart className="h-3 w-3 text-site-red" /> Riknova Technology
          </span>
        </div>
      </div>
    </footer>
  );
}
