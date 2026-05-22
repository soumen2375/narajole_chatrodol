import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { PostCardData } from '@/components/PostCard';

export interface MergedPost extends PostCardData {
  id: string;
  source: 'db';
  author?: string;
  slug?: string;
  tags?: string[];
}

export function usePosts() {
  const [posts, setPosts] = useState<MergedPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase
      .from('cswo_posts')
      .select('id,title,content,category,featured_image,published_date,status,author_name,slug,tags')
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
          author: p.author_name ?? undefined,
          slug: p.slug ?? undefined,
          tags: Array.isArray(p.tags) ? p.tags : [],
        }));
        setPosts(dbPosts);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { posts, loading };
}
