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
    <div className="flex min-h-[75vh] flex-col items-center justify-center px-4 py-16 text-center bg-[#faf6ef]/40">
      <div className="mx-auto max-w-2xl rounded-3xl border border-stone-200/80 bg-white p-8 md:p-12 shadow-xl shadow-orange-950/5">
        <span className="inline-flex rounded-full bg-orange-100 px-4 py-1.5 text-sm font-bold text-[#c2410c]">
          404 Error
        </span>
        <h1 className="mt-4 font-serif text-3xl md:text-5xl font-bold tracking-tight text-stone-900">
          {bn ? 'পৃষ্ঠাটি খুঁজে পাওয়া যায়নি' : 'Page Not Found'}
        </h1>
        <p className="mt-3 text-base text-stone-600">
          {bn
            ? 'আপনি যে পৃষ্ঠাটি খুঁজছেন সেটি স্থানান্তরিত বা মুছে ফেলা হতে পারে। নিচের লিঙ্কগুলি থেকে অন্বেষণ করুন:'
            : 'The page you are looking for may have been moved or does not exist. Explore our helpful links below:'}
        </p>

        {/* Quick Nav Recovery Links */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickLinks.map((item, i) => {
            const IconComp = item.icon;
            return (
              <Link
                key={i}
                to={item.to}
                className="group flex flex-col items-center justify-center gap-2 rounded-2xl border border-stone-100 bg-stone-50/80 p-3 text-xs font-semibold text-stone-700 transition-all hover:border-orange-200 hover:bg-orange-50 hover:text-[#c2410c] hover:shadow-sm"
              >
                <IconComp className="h-4 w-4 text-[#c2410c] transition-transform group-hover:scale-110" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="mt-8 pt-6 border-t border-stone-100">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full px-6 py-3 font-semibold text-white transition hover:opacity-95 shadow-md shadow-orange-950/10"
            style={{ background: '#c2410c' }}
          >
            <FaHouse className="h-4 w-4" />
            <span>{bn ? 'হোমপেজে ফিরে যান' : 'Back to Home'}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

