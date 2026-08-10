import { Link } from 'react-router-dom';
import { ORG } from '@/data/content';
import { FaFacebookF, FaInstagram, FaYoutube, FaXTwitter, FaLocationDot, FaPhone, FaEnvelope, FaClock, FaHeart } from 'react-icons/fa6';

const FOOTER_BG = '#1c1917';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="text-white/80" style={{ background: FOOTER_BG }}>
      <div className="mx-auto max-w-[1340px] px-6 pb-12 pt-16 md:px-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
          {/* Col 1: Brand Info & Socials */}
          <div className="lg:col-span-3">
            <Link to="/" className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-white/30 bg-white p-0.5 shadow-md">
                <img
                  src="/assets/images/logo.png"
                  alt="Chhatradol SWO Logo"
                  className="h-full w-full rounded-full object-contain"
                  onError={(e) => { e.currentTarget.src = '/assets/images/Chhatradol.jpg'; }}
                />
              </div>
              <div className="flex flex-col leading-tight">
                <span
                  className="text-xl font-bold text-white tracking-tight"
                  style={{ fontFamily: '"Noto Serif", Georgia, serif' }}
                >
                  Chhatradol SWO
                </span>
                <span className="text-xs text-white/60">
                  Narajole, Paschim Medinipur
                </span>
              </div>
            </Link>

            <p className="mt-4 font-sans text-sm leading-relaxed text-white/70">
              Working together for a better society through unity, education, and progress.
            </p>

            {/* Social Icons */}
            <div className="mt-6 flex flex-wrap items-center gap-2.5">
              <a
                href={ORG.social.facebook}
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook"
                title="Facebook: @chhatradolswo"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/80 transition-all hover:border-amber-400 hover:bg-amber-500 hover:text-white"
              >
                <FaFacebookF className="h-4 w-4" />
              </a>
              <a
                href={ORG.social.instagram}
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                title="Instagram: @chhatradolswo"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/80 transition-all hover:border-amber-400 hover:bg-amber-500 hover:text-white"
              >
                <FaInstagram className="h-4 w-4" />
              </a>
              <a
                href={ORG.social.twitter}
                target="_blank"
                rel="noreferrer"
                aria-label="X (Twitter)"
                title="X: @Chhatradolswo"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/80 transition-all hover:border-amber-400 hover:bg-amber-500 hover:text-white"
              >
                <FaXTwitter className="h-4 w-4" />
              </a>
              <a
                href={ORG.social.youtube}
                target="_blank"
                rel="noreferrer"
                aria-label="YouTube"
                title="YouTube: @Chhatradolswo"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/80 transition-all hover:border-amber-400 hover:bg-amber-500 hover:text-white"
              >
                <FaYoutube className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div className="lg:col-span-2">
            <h4 className="font-sans text-sm font-bold uppercase tracking-wider text-white">
              Quick Links
            </h4>
            <ul className="mt-4 space-y-2.5 font-sans text-sm text-white/70">
              <li><Link to="/" className="transition-colors hover:text-amber-400">Home</Link></li>
              <li><Link to="/about" className="transition-colors hover:text-amber-400">About Us</Link></li>
              <li><Link to="/events" className="transition-colors hover:text-amber-400">Events</Link></li>
              <li><Link to="/gallery" className="transition-colors hover:text-amber-400">Gallery</Link></li>
              <li><Link to="/programs" className="transition-colors hover:text-amber-400">Our Programs</Link></li>
              <li><Link to="/impacts" className="transition-colors hover:text-amber-400">Impacts</Link></li>
            </ul>
          </div>

          {/* Col 3: Important Links */}
          <div className="lg:col-span-2">
            <h4 className="font-sans text-sm font-bold uppercase tracking-wider text-white">
              Important Links
            </h4>
            <ul className="mt-4 space-y-2.5 font-sans text-sm text-white/70">
              <li><Link to="/contact" className="transition-colors hover:text-amber-400">Contact</Link></li>
              <li><Link to="/volunteer" className="transition-colors hover:text-amber-400">Volunteer</Link></li>
              <li><Link to="/blood-request" className="transition-colors hover:text-amber-400">Blood Request</Link></li>
              <li><Link to="/donate" className="transition-colors hover:text-amber-400">Donate</Link></li>
              <li><Link to="/organise-blood-camp" className="transition-colors hover:text-amber-400">Blood Camp</Link></li>
            </ul>
          </div>

          {/* Col 4: Legal Policy */}
          <div className="lg:col-span-2">
            <h4 className="font-sans text-sm font-bold uppercase tracking-wider text-white">
              Legal
            </h4>
            <ul className="mt-4 space-y-2.5 font-sans text-sm text-white/70">
              <li><Link to="/terms" className="transition-colors hover:text-amber-400">Terms & Conditions</Link></li>
              <li><Link to="/privacy" className="transition-colors hover:text-amber-400">Privacy Policy</Link></li>
              <li><Link to="/refunds" className="transition-colors hover:text-amber-400">Refund Policy</Link></li>
              <li><Link to="/shipping" className="transition-colors hover:text-amber-400">Shipping Policy</Link></li>
            </ul>
          </div>

          {/* Col 5: Contact Us */}
          <div className="lg:col-span-3">
            <h4 className="font-sans text-sm font-bold uppercase tracking-wider text-white">
              Contact Us
            </h4>
            <ul className="mt-4 space-y-3 font-sans text-sm text-white/70">
              <li className="flex items-start gap-3">
                <FaLocationDot className="mt-1 h-4 w-4 flex-shrink-0 text-amber-400" />
                <span>
                  Narajole, Paschim Medinipur, West Bengal, 721211
                </span>
              </li>
              <li className="flex items-center gap-3">
                <FaPhone className="h-4 w-4 flex-shrink-0 text-amber-400" />
                <a href="tel:+917811073412" className="hover:text-amber-400 transition-colors">+91 78110 73412</a>
              </li>
              <li className="flex items-center gap-3">
                <FaEnvelope className="h-4 w-4 flex-shrink-0 text-amber-400" />
                <span>info@chhatradol.org</span>
              </li>
              <li className="flex items-center gap-3">
                <FaClock className="h-4 w-4 flex-shrink-0 text-amber-400" />
                <span>Mon - Sun: 9:00 AM - 6:00 PM</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Strip */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-xs text-white/50 md:flex-row">
          <span>© {year} Chhatradol SWO. All rights reserved.</span>
          <span className="flex items-center gap-1.5 font-medium text-white/60">
            Made with <FaHeart className="h-3 w-3 text-red-500" /> Riknova Technology
          </span>
        </div>
      </div>
    </footer>
  );
}

