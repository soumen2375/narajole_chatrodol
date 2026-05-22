import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { CswoCategory } from '@/types';

export interface CategoryNode extends CswoCategory {
  children: CswoCategory[];
}

function buildSlug(name: string) {
  return name.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 60);
}

// Static fallback used if the cswo_categories table does not exist yet
const FALLBACK: CswoCategory[] = [
  { id: 'news',          name: 'News',          slug: 'news',          parent_id: null, sort_order: 1, created_at: '' },
  { id: 'events',        name: 'Events',        slug: 'events',        parent_id: null, sort_order: 2, created_at: '' },
  { id: 'success-story', name: 'Success Story', slug: 'success-story', parent_id: null, sort_order: 3, created_at: '' },
  { id: 'programs',      name: 'Programs',      slug: 'programs',      parent_id: null, sort_order: 4, created_at: '' },
];

export function useCategories() {
  const [flat, setFlat] = useState<CswoCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('cswo_categories')
        .select('id,name,slug,parent_id,sort_order,created_at')
        .order('sort_order')
        .order('name');
      if (error) {
        setFlat(FALLBACK);
      } else {
        setFlat(data.length > 0 ? (data as CswoCategory[]) : FALLBACK);
      }
    } catch {
      setFlat(FALLBACK);
    }
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const addCategory = async (name: string, parentId: string | null = null): Promise<CswoCategory | null> => {
    const { data, error } = await supabase
      .from('cswo_categories')
      .insert({ name: name.trim(), slug: buildSlug(name), parent_id: parentId || null })
      .select()
      .single();
    if (!error) await reload();
    return error ? null : (data as CswoCategory);
  };

  // Two-level tree: roots with their direct children
  const roots = flat.filter((c) => !c.parent_id);
  const tree: CategoryNode[] = roots.map((r) => ({
    ...r,
    children: flat.filter((c) => c.parent_id === r.id),
  }));

  return { flat, tree, loading, reload, addCategory };
}
