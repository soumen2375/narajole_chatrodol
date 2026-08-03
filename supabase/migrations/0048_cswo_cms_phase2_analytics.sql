-- CMS Phase 2: Analytics daily view tracking and increment RPC

CREATE TABLE IF NOT EXISTS public.cswo_post_analytics (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     uuid NOT NULL REFERENCES public.cswo_posts(id) ON DELETE CASCADE,
  view_date   date NOT NULL DEFAULT current_date,
  view_count  int  NOT NULL DEFAULT 1,
  CONSTRAINT cswo_post_analytics_unique UNIQUE (post_id, view_date)
);

CREATE INDEX IF NOT EXISTS idx_cswo_analytics_date ON public.cswo_post_analytics(view_date DESC);
CREATE INDEX IF NOT EXISTS idx_cswo_analytics_post ON public.cswo_post_analytics(post_id);

-- RPC Function to safely increment views from client or server
CREATE OR REPLACE FUNCTION public.cswo_increment_post_views(p_post_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Increment total count on post
  UPDATE public.cswo_posts
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = p_post_id;

  -- Upsert daily analytics
  INSERT INTO public.cswo_post_analytics (post_id, view_date, view_count)
  VALUES (p_post_id, current_date, 1)
  ON CONFLICT (post_id, view_date)
  DO UPDATE SET view_count = public.cswo_post_analytics.view_count + 1;
END; $$;

-- RLS
ALTER TABLE public.cswo_post_analytics ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "cswo_analytics_public_read" ON public.cswo_post_analytics
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "cswo_analytics_approved_write" ON public.cswo_post_analytics
    FOR ALL USING (public.cswo_is_approved()) WITH CHECK (public.cswo_is_approved());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
