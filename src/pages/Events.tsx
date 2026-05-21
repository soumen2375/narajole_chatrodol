import { useMemo } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import PostCard from '@/components/PostCard';
import Spinner from '@/components/ui/Spinner';
import { usePosts } from '@/hooks/usePosts';

export default function Events() {
  const { posts, loading } = usePosts();

  const { upcoming, past } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcomingList = posts
      .filter((p) => new Date(p.publishedDate) >= today)
      .sort((a, b) => new Date(a.publishedDate).getTime() - new Date(b.publishedDate).getTime());
    const pastList = posts
      .filter((p) => new Date(p.publishedDate) < today)
      .sort((a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime());
    return { upcoming: upcomingList, past: pastList };
  }, [posts]);

  return (
    <div>
      <PageHeader title="অনুষ্ঠান ও খবর" subtitle="আমাদের সাম্প্রতিক ও পূর্ববর্তী কার্যক্রমসমূহ" />
      <div className="container mx-auto px-4 py-10 md:px-8">
        {loading && posts.length === 0 ? (
          <Spinner />
        ) : (
          <>
            <section className="mb-12">
              <h2 className="mb-6 text-2xl font-bold text-blue-700">আসন্ন অনুষ্ঠান</h2>
              {upcoming.length ? (
                <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                  {upcoming.map((p) => (
                    <PostCard key={p.id} post={p} />
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">বর্তমানে কোন আসন্ন অনুষ্ঠান নেই।</p>
              )}
            </section>

            <section>
              <h2 className="mb-6 text-2xl font-bold text-blue-700">অতীতের অনুষ্ঠান</h2>
              {past.length ? (
                <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                  {past.map((p) => (
                    <PostCard key={p.id} post={p} dim />
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">কোন অতীতের অনুষ্ঠান পাওয়া যায়নি।</p>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
