import { Link } from 'react-router-dom';
import { IMPACT_STATS, ORG } from '@/data/content';
import { usePosts } from '@/hooks/usePosts';
import PostCard from '@/components/PostCard';

export default function Home() {
  const { posts } = usePosts();
  const latest = posts.slice(0, 3);

  return (
    <div>
      {/* Hero */}
      <section
        className="relative flex h-[60vh] min-h-[420px] items-center justify-center bg-cover bg-center p-4 text-center"
        style={{ backgroundImage: 'url(/assets/images/chatrodol.jpg)' }}
      >
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative z-10 mx-auto max-w-4xl text-white">
          <h1 className="mb-4 text-4xl font-extrabold md:text-6xl">
            {ORG.nameBn}: {ORG.taglineBn}
          </h1>
          <p className="mb-8 text-lg md:text-xl">
            আমরা নাড়াজোলের প্রতিটি মানুষের জন্য একটি উজ্জ্বল ও সমৃদ্ধ ভবিষ্যৎ গড়তে প্রতিশ্রুতিবদ্ধ।
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              to="/donate"
              className="rounded-full bg-blue-600 px-8 py-3 font-bold text-white shadow-lg transition hover:bg-blue-700"
            >
              অনুদান দিন
            </Link>
            <Link
              to="/volunteer"
              className="rounded-full bg-green-500 px-8 py-3 font-bold text-white shadow-lg transition hover:bg-green-600"
            >
              আমাদের সাথে যোগ দিন
            </Link>
          </div>
        </div>
      </section>

      {/* Impact stats */}
      <section className="bg-gray-100 py-16">
        <div className="container mx-auto px-4 text-center md:px-8">
          <h2 className="mb-10 text-3xl font-bold text-gray-800 md:text-4xl">আমাদের কার্যক্রমের প্রভাব</h2>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {IMPACT_STATS.map((stat) => (
              <div key={stat.label} className="flex flex-col items-center rounded-lg bg-white p-6 shadow-md">
                <div className="mb-2 text-5xl font-extrabold text-blue-600">{stat.value}</div>
                <p className="text-lg font-semibold text-gray-700">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Latest */}
      <section className="py-16">
        <div className="container mx-auto px-4 md:px-8">
          <h2 className="mb-10 text-center text-3xl font-bold text-gray-800 md:text-4xl">
            সর্বশেষ খবর ও অনুষ্ঠান
          </h2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {latest.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link
              to="/events"
              className="inline-block rounded-full bg-green-500 px-8 py-3 font-bold text-white shadow-lg transition hover:bg-green-600"
            >
              সকল খবর ও ইভেন্ট দেখুন
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
