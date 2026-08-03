-- CMS Phase 1: Media Library — folders + media assets table

CREATE TABLE IF NOT EXISTS public.cswo_media_folders (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  parent_id  uuid        REFERENCES public.cswo_media_folders(id) ON DELETE CASCADE,
  sort_order int         NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid        REFERENCES public.cswo_members(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_cswo_media_folders_parent ON public.cswo_media_folders(parent_id);

CREATE TABLE IF NOT EXISTS public.cswo_media (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id   uuid        REFERENCES public.cswo_media_folders(id) ON DELETE SET NULL,
  filename    text        NOT NULL,
  file_url    text        NOT NULL,
  storage_path text,
  mime_type   text,
  size_bytes  int,
  width       int,
  height      int,
  alt_text    text        NOT NULL DEFAULT '',
  caption     text        NOT NULL DEFAULT '',
  uploaded_by uuid        REFERENCES public.cswo_members(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cswo_media_folder    ON public.cswo_media(folder_id);
CREATE INDEX IF NOT EXISTS idx_cswo_media_uploader  ON public.cswo_media(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_cswo_media_mime      ON public.cswo_media(mime_type);
CREATE INDEX IF NOT EXISTS idx_cswo_media_created   ON public.cswo_media(created_at DESC);

-- RLS
ALTER TABLE public.cswo_media_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cswo_media         ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "cswo_media_folders_approved_select" ON public.cswo_media_folders FOR SELECT USING (public.cswo_is_approved());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "cswo_media_folders_approved_write"  ON public.cswo_media_folders FOR ALL USING (public.cswo_is_approved()) WITH CHECK (public.cswo_is_approved());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "cswo_media_approved_select" ON public.cswo_media FOR SELECT USING (public.cswo_is_approved());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "cswo_media_approved_write"  ON public.cswo_media FOR ALL USING (public.cswo_is_approved()) WITH CHECK (public.cswo_is_approved());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Seed default folders
INSERT INTO public.cswo_media_folders (name, sort_order) VALUES
  ('Projects',   1),
  ('Events',     2),
  ('Blog',       3),
  ('Gallery',    4),
  ('Reports',    5),
  ('Videos',     6),
  ('Documents',  7),
  ('Thumbnails', 8)
ON CONFLICT DO NOTHING;
