import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { PostCardData } from '@/components/PostCard';

export interface MergedPost extends PostCardData {
  id: string;
  source: 'db';
  author?: string;
  slug?: string;
  tags?: string[];
  meta_title?: string;
  meta_description?: string;
  og_image?: string;
  share_snippet?: string;
}

export function usePosts() {
  const [posts, setPosts] = useState<MergedPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const now = new Date().toISOString();
    supabase
      .from('cswo_posts')
      .select('id,title,content,category,featured_image,published_date,status,schedule_at,author_name,slug,tags,meta_title,meta_description,og_image,share_snippet')
      .or(`status.eq.published,and(status.eq.scheduled,schedule_at.lte.${now})`)
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
          meta_title: p.meta_title ?? undefined,
          meta_description: p.meta_description ?? undefined,
          og_image: p.og_image ?? undefined,
          share_snippet: p.share_snippet ?? undefined,
        }));
        setPosts(dbPosts);
        setLoading(false);
      });
    return () => { active = false; };
  }, []);

  return { posts, loading };
}
