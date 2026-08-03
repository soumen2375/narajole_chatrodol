-- CMS Phase 1: Post types, visibility, soft-delete, reading_time, view_count + revision history

-- Extend cswo_posts with CMS fields
ALTER TABLE public.cswo_posts
  ADD COLUMN IF NOT EXISTS post_type        text NOT NULL DEFAULT 'general'
    CHECK (post_type IN ('general','news','blog','story','notice','press_release','program','project','campaign','volunteer_story','document','report','event')),
  ADD COLUMN IF NOT EXISTS visibility       text NOT NULL DEFAULT 'public'
    CHECK (visibility IN ('public','members','private')),
  ADD COLUMN IF NOT EXISTS excerpt          text,
  ADD COLUMN IF NOT EXISTS reading_time     int  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS view_count       int  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS language         text NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS deleted_at       timestamptz,
  ADD COLUMN IF NOT EXISTS canonical_url    text;

-- Auto-compute reading_time (words / 200 wpm) on insert/update
CREATE OR REPLACE FUNCTION public.cswo_compute_reading_time()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.reading_time := GREATEST(1, ROUND(
    array_length(regexp_split_to_array(
      regexp_replace(coalesce(NEW.content,''), '<[^>]+>', '', 'g'),
      '\s+'
    ), 1)::numeric / 200
  ));
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_cswo_posts_reading_time ON public.cswo_posts;
CREATE TRIGGER trg_cswo_posts_reading_time
  BEFORE INSERT OR UPDATE OF content ON public.cswo_posts
  FOR EACH ROW EXECUTE FUNCTION public.cswo_compute_reading_time();

-- Backfill reading_time for existing posts
UPDATE public.cswo_posts SET reading_time = GREATEST(1, ROUND(
  array_length(regexp_split_to_array(
    regexp_replace(coalesce(content,''), '<[^>]+>', '', 'g'),
    '\s+'
  ), 1)::numeric / 200
)) WHERE reading_time = 0 OR reading_time IS NULL;

-- Revision history: full JSON snapshot of post payload
CREATE TABLE IF NOT EXISTS public.cswo_post_revisions (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    uuid        NOT NULL REFERENCES public.cswo_posts(id) ON DELETE CASCADE,
  version    int         NOT NULL,
  snapshot   jsonb       NOT NULL,
  saved_by   uuid        REFERENCES public.cswo_members(id) ON DELETE SET NULL,
  saved_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cswo_revisions_post ON public.cswo_post_revisions(post_id, version DESC);

-- Keep only latest 20 revisions per post (enforced via trigger)
CREATE OR REPLACE FUNCTION public.cswo_trim_revisions()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM public.cswo_post_revisions
  WHERE post_id = NEW.post_id
    AND id NOT IN (
      SELECT id FROM public.cswo_post_revisions
      WHERE post_id = NEW.post_id
      ORDER BY version DESC
      LIMIT 20
    );
  RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS trg_cswo_trim_revisions ON public.cswo_post_revisions;
CREATE TRIGGER trg_cswo_trim_revisions
  AFTER INSERT ON public.cswo_post_revisions
  FOR EACH ROW EXECUTE FUNCTION public.cswo_trim_revisions();

-- RLS
ALTER TABLE public.cswo_post_revisions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "cswo_revisions_select" ON public.cswo_post_revisions
    FOR SELECT USING (public.cswo_is_approved());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "cswo_revisions_insert" ON public.cswo_post_revisions
    FOR INSERT WITH CHECK (public.cswo_is_approved());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "cswo_revisions_delete" ON public.cswo_post_revisions
    FOR DELETE USING (public.cswo_is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Indexes for CMS filtering
CREATE INDEX IF NOT EXISTS idx_cswo_posts_post_type  ON public.cswo_posts(post_type);
CREATE INDEX IF NOT EXISTS idx_cswo_posts_visibility ON public.cswo_posts(visibility);
CREATE INDEX IF NOT EXISTS idx_cswo_posts_deleted    ON public.cswo_posts(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_cswo_posts_view_count ON public.cswo_posts(view_count DESC);
