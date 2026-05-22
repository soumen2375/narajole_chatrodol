-- Social sharing fields on cswo_posts
ALTER TABLE public.cswo_posts
  ADD COLUMN IF NOT EXISTS og_title      text,
  ADD COLUMN IF NOT EXISTS og_image      text,
  ADD COLUMN IF NOT EXISTS share_snippet text;

-- Dynamic categories table (parent-child support)
CREATE TABLE IF NOT EXISTS public.cswo_categories (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  slug        text        NOT NULL,
  parent_id   uuid        REFERENCES public.cswo_categories(id) ON DELETE SET NULL,
  sort_order  integer     NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cswo_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cat_select" ON public.cswo_categories;
DROP POLICY IF EXISTS "cat_admin"  ON public.cswo_categories;

-- Anyone can read categories
CREATE POLICY "cat_select" ON public.cswo_categories
  FOR SELECT USING (true);

-- Only admins can write
CREATE POLICY "cat_admin" ON public.cswo_categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.cswo_members
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Seed default top-level categories
INSERT INTO public.cswo_categories (name, slug, sort_order) VALUES
  ('News',          'news',          1),
  ('Events',        'events',        2),
  ('Success Story', 'success-story', 3),
  ('Programs',      'programs',      4)
ON CONFLICT DO NOTHING;
