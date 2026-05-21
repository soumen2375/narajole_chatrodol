import { useMemo } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import PostCard from '@/components/PostCard';
import Spinner from '@/components/ui/Spinner';
import { usePosts } from '@/hooks/usePosts';
import { useT } from '@/i18n';

export default function Events() {
  const { posts, loading } = usePosts();
  const { t } = useT();

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
      <PageHeader title={t('events.title')} subtitle={t('events.subtitle')} />
      <div className="container mx-auto px-4 py-10 md:px-8">
        {loading && posts.length === 0 ? (
          <Spinner />
        ) : (
          <>
            <section className="mb-12">
              <h2 className="mb-6 text-2xl font-bold text-blue-700">{t('events.upcoming')}</h2>
              {upcoming.length ? (
                <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                  {upcoming.map((p) => (
                    <PostCard key={p.id} post={p} />
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">{t('events.noUpcoming')}</p>
              )}
            </section>

            <section>
              <h2 className="mb-6 text-2xl font-bold text-blue-700">{t('events.past')}</h2>
              {past.length ? (
                <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                  {past.map((p) => (
                    <PostCard key={p.id} post={p} dim />
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">{t('events.noPast')}</p>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
