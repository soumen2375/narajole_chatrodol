import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface GalleryItem {
  id: string;
  src: string;
  alt: { bn: string; en: string };
  category: { bn: string; en: string };
  more?: string;
  sort_order: number;
  is_active: boolean;
  source: 'db';
}

export function useGallery() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase
      .from('cswo_gallery')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .then(({ data }) => {
        if (!active) return;
        setItems(
          (data ?? []).map((g) => ({
            id: g.id,
            src: g.src,
            alt: { bn: g.alt_bn, en: g.alt_en },
            category: { bn: g.category_bn, en: g.category_en },
            more: g.more_url ?? undefined,
            sort_order: g.sort_order,
            is_active: g.is_active,
            source: 'db' as const,
          })),
        );
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { items, loading };
}

export function useGalleryAdmin() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('cswo_gallery')
      .select('*')
      .order('sort_order', { ascending: true });
    setItems(
      (data ?? []).map((g) => ({
        id: g.id,
        src: g.src,
        alt: { bn: g.alt_bn, en: g.alt_en },
        category: { bn: g.category_bn, en: g.category_en },
        more: g.more_url ?? undefined,
        sort_order: g.sort_order,
        is_active: g.is_active,
        source: 'db' as const,
      })),
    );
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return { items, loading, reload: load };
}
