-- CMS Phase 1: Proper tags table (replaces the text[] approach)

CREATE TABLE IF NOT EXISTS public.cswo_tags (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  slug        text        UNIQUE NOT NULL,
  usage_count int         NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cswo_tags_name_lower ON public.cswo_tags(lower(name));

CREATE TABLE IF NOT EXISTS public.cswo_post_tags (
  post_id uuid NOT NULL REFERENCES public.cswo_posts(id) ON DELETE CASCADE,
  tag_id  uuid NOT NULL REFERENCES public.cswo_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_cswo_post_tags_post ON public.cswo_post_tags(post_id);
CREATE INDEX IF NOT EXISTS idx_cswo_post_tags_tag  ON public.cswo_post_tags(tag_id);

-- Auto-update usage_count when post_tags change
CREATE OR REPLACE FUNCTION public.cswo_update_tag_usage()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.cswo_tags SET usage_count = usage_count + 1 WHERE id = NEW.tag_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.cswo_tags SET usage_count = GREATEST(0, usage_count - 1) WHERE id = OLD.tag_id;
  END IF;
  RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS trg_cswo_tag_usage ON public.cswo_post_tags;
CREATE TRIGGER trg_cswo_tag_usage
  AFTER INSERT OR DELETE ON public.cswo_post_tags
  FOR EACH ROW EXECUTE FUNCTION public.cswo_update_tag_usage();

-- RLS
ALTER TABLE public.cswo_tags      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cswo_post_tags ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "cswo_tags_public_select"     ON public.cswo_tags FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "cswo_tags_approved_write"    ON public.cswo_tags FOR ALL USING (public.cswo_is_approved()) WITH CHECK (public.cswo_is_approved());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "cswo_post_tags_public_select" ON public.cswo_post_tags FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "cswo_post_tags_approved_write" ON public.cswo_post_tags FOR ALL USING (public.cswo_is_approved()) WITH CHECK (public.cswo_is_approved());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Seed usage_counts from existing posts.tags array (best-effort migration)
INSERT INTO public.cswo_tags (name, slug, usage_count)
SELECT DISTINCT
  trim(unnest_tag),
  lower(regexp_replace(trim(unnest_tag), '[^a-zA-Z0-9]+', '-', 'g')),
  count(*) OVER (PARTITION BY lower(trim(unnest_tag)))
FROM (
  SELECT unnest(tags) AS unnest_tag FROM public.cswo_posts WHERE tags IS NOT NULL AND array_length(tags,1) > 0
) sub
WHERE trim(unnest_tag) <> ''
ON CONFLICT (slug) DO NOTHING;
