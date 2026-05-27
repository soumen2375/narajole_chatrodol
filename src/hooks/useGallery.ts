import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface GalleryItem {
  id: string;
  src: string;
  alt: { bn: string; en: string };
  category: { bn: string; en: string };
  sub_category: { bn: string; en: string };
  more?: string;
  sort_order: number;
  is_active: boolean;
  deleted_at: string | null;
  uploaded_by?: string | null;
  source: 'db';
}

export interface GalleryCategoryOption {
  bn: string;
  en: string;
}

function mapRow(g: Record<string, unknown>): GalleryItem {
  return {
    id: g.id as string,
    src: g.src as string,
    alt: { bn: (g.alt_bn as string) || '', en: (g.alt_en as string) || '' },
    category: { bn: (g.category_bn as string) || '', en: (g.category_en as string) || '' },
    sub_category: { bn: (g.sub_category_bn as string) || '', en: (g.sub_category_en as string) || '' },
    more: (g.more_url as string) ?? undefined,
    sort_order: g.sort_order as number,
    is_active: g.is_active as boolean,
    deleted_at: (g.deleted_at as string) ?? null,
    uploaded_by: (g.uploaded_by as string) ?? null,
    source: 'db' as const,
  };
}

export function useGallery() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    supabase
      .from('cswo_gallery')
      .select('*')
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setError(error.message);
        } else {
          setItems((data ?? []).map(mapRow));
          setError(null);
        }
        setLoading(false);
      });
    return () => { active = false; };
  }, []);

  return { items, loading, error };
}

export function useGalleryAdmin() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cswo_gallery')
        .select('*')
        .is('deleted_at', null)
        .order('sort_order', { ascending: true });
      if (error) {
        setError(error.message);
      } else {
        setItems((data ?? []).map(mapRow));
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown database error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return { items, loading, error, reload: load };
}

export function useGalleryCategoryOptions() {
  const [categories, setCategories] = useState<GalleryCategoryOption[]>([]);
  const [subCategories, setSubCategories] = useState<GalleryCategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('cswo_gallery')
      .select('category_bn,category_en,sub_category_bn,sub_category_en')
      .is('deleted_at', null)
      .then(({ data, error }) => {
        if (error) {
          setError(error.message);
        } else if (data) {
          const catMap = new Map<string, GalleryCategoryOption>();
          const subMap = new Map<string, GalleryCategoryOption>();
          for (const row of data) {
            const k = `${row.category_en}|${row.category_bn}`;
            if (row.category_en || row.category_bn) catMap.set(k, { bn: row.category_bn || '', en: row.category_en || '' });
            const sk = `${row.sub_category_en}|${row.sub_category_bn}`;
            if (row.sub_category_en || row.sub_category_bn) subMap.set(sk, { bn: row.sub_category_bn || '', en: row.sub_category_en || '' });
          }
          setCategories(Array.from(catMap.values()));
          setSubCategories(Array.from(subMap.values()));
          setError(null);
        }
        setLoading(false);
      });
  }, []);

  return { categories, subCategories, loading, error };
}
