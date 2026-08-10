import { ORG } from '@/data/content';
import { useT } from '@/i18n';
import {
  FaGlobe,
  FaFacebookF,
  FaInstagram,
  FaXTwitter,
  FaYoutube,
  FaWhatsapp,
  FaArrowUpRightFromSquare,
  FaCommentDots,
} from 'react-icons/fa6';

export default function SocialConnectSection() {
  const { lang } = useT();
  const bn = lang === 'bn';

  const channels = [
    {
      name: 'Official Website',
      handle: 'chhatradol.org',
      url: ORG.social.website,
      icon: FaGlobe,
      color: 'from-amber-500 to-orange-600',
      textColor: 'text-amber-600',
      hoverBorder: 'hover:border-amber-400',
      badge: 'Official Portal',
    },
    {
      name: 'Facebook Page',
      handle: '@chhatradolswo',
      url: ORG.social.facebook,
      icon: FaFacebookF,
      color: 'from-blue-600 to-indigo-700',
      textColor: 'text-blue-600',
      hoverBorder: 'hover:border-blue-400',
      badge: 'Official Page',
    },
    {
      name: 'Instagram',
      handle: '@chhatradolswo',
      url: ORG.social.instagram,
      icon: FaInstagram,
      color: 'from-pink-500 via-purple-500 to-orange-400',
      textColor: 'text-pink-600',
      hoverBorder: 'hover:border-pink-400',
      badge: 'Photos & Reels',
    },
    {
      name: 'X (Twitter)',
      handle: '@Chhatradolswo',
      url: ORG.social.twitter,
      icon: FaXTwitter,
      color: 'from-slate-700 to-slate-900',
      textColor: 'text-slate-800',
      hoverBorder: 'hover:border-slate-400',
      badge: 'Updates & News',
    },
    {
      name: 'YouTube Channel',
      handle: '@Chhatradolswo',
      url: ORG.social.youtube,
      icon: FaYoutube,
      color: 'from-red-600 to-rose-700',
      textColor: 'text-red-600',
      hoverBorder: 'hover:border-red-400',
      badge: 'Videos & Live',
    },
    {
      name: 'WhatsApp Support',
      handle: '+91 78110 73412',
      url: ORG.social.whatsapp,
      icon: FaWhatsapp,
      color: 'from-emerald-500 to-green-600',
      textColor: 'text-emerald-600',
      hoverBorder: 'hover:border-emerald-400',
      badge: 'Instant Chat',
    },
  ];

  return (
    <section className="py-16 bg-white border-t border-b border-amber-900/10">
      <div className="mx-auto max-w-[1340px] px-6 md:px-10">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-amber-800 border border-amber-200/80 mb-3">
            <span>📢 {bn ? 'আমাদের সাথে কানেক্ট করুন' : 'Connect With Chhatradol'}</span>
          </div>
          <h2 className="font-bengali text-3xl font-extrabold md:text-4xl text-slate-900 leading-tight">
            {bn
              ? 'আমাদের সমস্ত অফিসিয়াল মিডিয়া প্ল্যাটফর্ম'
              : 'Follow Our Official Channels'}
          </h2>
          <p className="mt-3 font-bengali text-sm md:text-base text-slate-600">
            {bn
              ? 'সামাজিক প্রভাব, রক্তদান শিবির, কর্মসূচি এবং সাম্প্রতিক আপডেটের জন্য আমাদের সোশ্যাল মিডিয়ায় যুক্ত থাকুন।'
              : 'Follow our official channels for updates, initiatives, events, social impact, and direct support.'}
          </p>
        </div>

        {/* Channels Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {channels.map((ch, idx) => {
            const IconComp = ch.icon;
            return (
              <a
                key={idx}
                href={ch.url}
                target="_blank"
                rel="noreferrer"
                className={`group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-slate-50/50 p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${ch.hoverBorder}`}
              >
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${ch.color} text-white shadow-md transition-transform group-hover:scale-110`}>
                      <IconComp className="h-6 w-6" />
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-slate-600 border border-slate-200 shadow-xs">
                      {ch.badge}
                    </span>
                  </div>

                  <h3 className="mt-5 font-bold text-lg text-slate-900 group-hover:text-[#c2410c] transition-colors flex items-center gap-2">
                    <span>{ch.name}</span>
                  </h3>
                  <p className="mt-1 font-mono text-sm font-medium text-slate-500 truncate">
                    {ch.handle}
                  </p>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-slate-200/60 pt-4 text-xs font-bold text-slate-700 group-hover:text-[#c2410c]">
                  <span>{bn ? 'ভিজিট করুন' : 'Connect Now'}</span>
                  <FaArrowUpRightFromSquare className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </a>
            );
          })}
        </div>

        {/* Direct WhatsApp Callout Banner */}
        <div className="mt-10 rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-8 text-white shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md text-white shadow-inner">
              <FaWhatsapp className="h-9 w-9 text-emerald-200" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-xs px-3 py-0.5 text-xs font-bold text-emerald-100 mb-1">
                <FaCommentDots className="h-3 w-3" />
                <span>{bn ? 'সরাসরি যোগাযোগ' : 'Direct Helpline & WhatsApp'}</span>
              </div>
              <h3 className="font-bengali text-2xl font-bold md:text-3xl">
                {bn ? 'যে কোনো সময় সরাসরি বার্তা দিন' : 'Contact Us Directly on WhatsApp'}
              </h3>
              <p className="mt-1 font-mono text-sm sm:text-base opacity-95">
                Communication Number: <span className="font-bold text-emerald-200">+91 78110 73412</span>
              </p>
            </div>
          </div>

          <a
            href={ORG.social.whatsapp}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-extrabold text-emerald-700 shadow-lg transition-all duration-200 hover:bg-emerald-50 hover:scale-105 active:scale-95 shrink-0"
          >
            <FaWhatsapp className="h-5 w-5 text-emerald-600" />
            <span>{bn ? 'হোয়াটসঅ্যাপে চ্যাট করুন' : 'Start WhatsApp Chat'}</span>
          </a>
        </div>
      </div>
    </section>
  );
}
