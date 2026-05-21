import { Link } from 'react-router-dom';
import { IMPACT_STATS, name } from '@/data/content';
import { usePosts } from '@/hooks/usePosts';
import PostCard from '@/components/PostCard';
import { useT } from '@/i18n';

export default function Home() {
  const { posts } = usePosts();
  const { t, lang } = useT();
  const latest = posts.slice(0, 3);
  const tagline = lang === 'en' ? 'Unity · Education · Progress' : 'একতা, শিক্ষা, উন্নতি';

  return (
    <div>
      <section
        className="relative flex h-[62vh] min-h-[440px] items-center justify-center bg-cover bg-center p-4 text-center"
        style={{ backgroundImage: 'url(/assets/images/chatrodol.jpg)' }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/55 to-black/70" />
        <div className="relative z-10 mx-auto max-w-4xl text-white">
          <h1 className="mb-4 text-4xl font-extrabold leading-tight drop-shadow md:text-6xl">
            {name(lang)}
          </h1>
          <p className="mb-2 text-xl font-semibold text-amber-300 md:text-2xl">{tagline}</p>
          <p className="mx-auto mb-8 max-w-2xl text-lg md:text-xl">{t('home.heroSubtitle')}</p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Link to="/donate" className="rounded-full bg-blue-600 px-8 py-3 font-bold text-white shadow-lg transition hover:bg-blue-700">
              {t('home.donate')}
            </Link>
            <Link to="/volunteer" className="rounded-full bg-green-500 px-8 py-3 font-bold text-white shadow-lg transition hover:bg-green-600">
              {t('home.join')}
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-gray-100 py-16">
        <div className="container mx-auto px-4 text-center md:px-8">
          <h2 className="mb-10 text-3xl font-bold text-gray-800 md:text-4xl">{t('home.impactTitle')}</h2>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {IMPACT_STATS.map((stat) => (
              <div key={stat.label.en} className="flex flex-col items-center rounded-xl bg-white p-6 shadow-md ring-1 ring-gray-100">
                <div className="mb-2 text-4xl font-extrabold text-blue-600 md:text-5xl">{stat.value[lang]}</div>
                <p className="text-base font-semibold text-gray-700 md:text-lg">{stat.label[lang]}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4 md:px-8">
          <h2 className="mb-10 text-center text-3xl font-bold text-gray-800 md:text-4xl">{t('home.latestTitle')}</h2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {latest.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link to="/events" className="inline-block rounded-full bg-green-500 px-8 py-3 font-bold text-white shadow-lg transition hover:bg-green-600">
              {t('home.viewAll')}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
