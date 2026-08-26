import { Link } from 'react-router-dom';
import { useT } from '@/i18n';
import { useSEO } from '@/hooks/useSEO';
import { SEO } from '@/data/seoConfig';
import { FaHouse, FaHandHoldingHeart, FaCalendarDays, FaImages, FaUsers, FaEnvelope, FaHeartPulse } from 'react-icons/fa6';

export default function NotFound() {
  const { lang } = useT();
  const bn = lang === 'bn';
  useSEO(SEO['/404']);

  const quickLinks = [
    { to: '/', label: bn ? 'হোম' : 'Home', icon: FaHouse },
    { to: '/about', label: bn ? 'আমাদের কথা' : 'About Us', icon: FaUsers },
    { to: '/events', label: bn ? 'কর্মসূচি ও ইভেন্টস' : 'Events', icon: FaCalendarDays },
    { to: '/gallery', label: bn ? 'গ্যালারি' : 'Gallery', icon: FaImages },
    { to: '/volunteer', label: bn ? 'স্বেচ্ছাসেবক' : 'Volunteer', icon: FaHandHoldingHeart },
    { to: '/donate', label: bn ? 'দান করুন' : 'Donate', icon: FaHandHoldingHeart },
    { to: '/blood-request', label: bn ? 'জরুরি রক্ত' : 'Blood Request', icon: FaHeartPulse },
    { to: '/contact', label: bn ? 'যোগাযোগ' : 'Contact', icon: FaEnvelope },
  ];

  return (
    <div className="site-shell flex min-h-screen flex-col items-center justify-center bg-site-cream px-5 py-16 text-center sm:px-8">
      <div className="mx-auto w-full max-w-3xl">
        {/* Oversized green figure */}
        <div className="font-archivo text-[clamp(96px,18vw,200px)] font-bold leading-[0.9] tracking-[-0.04em] text-site-green">
          404
        </div>
        <div className="eyebrow mt-4">404 Error</div>

        <h1 className="h-display mt-5 text-site-ink">
          {bn ? 'পৃষ্ঠাটি খুঁজে পাওয়া যায়নি' : 'Page Not Found'}
        </h1>
        <p className="body-text mx-auto mt-5 max-w-xl">
          {bn
            ? 'আপনি যে পৃষ্ঠাটি খুঁজছেন সেটি স্থানান্তরিত বা মুছে ফেলা হতে পারে। নিচের লিঙ্কগুলি থেকে অন্বেষণ করুন:'
            : 'The page you are looking for may have been moved or does not exist. Explore our helpful links below:'}
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link to="/" className="btn-yellow">
            <FaHouse className="h-4 w-4" />
            <span>{bn ? 'হোমপেজে ফিরে যান' : 'Back to Home'}</span>
          </Link>
          <Link to="/contact" className="btn-ghost-dark">
            <FaEnvelope className="h-4 w-4" />
            <span>{bn ? 'যোগাযোগ' : 'Contact'}</span>
          </Link>
        </div>

        {/* Quick Nav Recovery Links */}
        <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {quickLinks.map((item, i) => {
            const IconComp = item.icon;
            return (
              <Link
                key={i}
                to={item.to}
                className="group flex min-h-[48px] flex-col items-center justify-center gap-2 rounded-full border border-site-line bg-white px-3 py-4 font-dmsans text-[12.5px] font-medium text-site-green transition-all hover:border-site-green hover:bg-site-green hover:text-white"
              >
                <IconComp className="h-4 w-4 transition-transform group-hover:scale-110" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
