import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { STATIC_POSTS } from '@/data/posts';
import type { PostCardData } from '@/components/PostCard';

export interface MergedPost extends PostCardData {
  id: string;
  source: 'static' | 'db';
}

const staticAsMerged: MergedPost[] = STATIC_POSTS.map((p) => ({
  id: `static-${p.id}`,
  title: p.title,
  content: p.content,
  category: p.category,
  featuredImage: p.featuredImage,
  publishedDate: p.publishedDate,
  source: 'static',
}));

export function usePosts() {
  const [posts, setPosts] = useState<MergedPost[]>(staticAsMerged);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase
      .from('cswo_posts')
      .select('id,title,content,category,featured_image,published_date,status')
      .eq('status', 'published')
      .order('published_date', { ascending: false })
      .then(({ data }) => {
        if (!active) return;
        const dbPosts: MergedPost[] = (data ?? []).map((p) => ({
          id: `db-${p.id}`,
          title: p.title,
          content: p.content,
          category: p.category,
          featuredImage: p.featured_image || '/assets/images/chatrodol.jpg',
          publishedDate: p.published_date,
          source: 'db',
        }));
        const merged = [...dbPosts, ...staticAsMerged].sort(
          (a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime(),
        );
        setPosts(merged);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { posts, loading };
}
