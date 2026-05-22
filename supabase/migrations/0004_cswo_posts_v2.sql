-- Posts v2: scheduling, SEO, featured/sticky, extended status workflow

-- Extend the post status enum
ALTER TYPE cswo_post_status ADD VALUE IF NOT EXISTS 'scheduled';
ALTER TYPE cswo_post_status ADD VALUE IF NOT EXISTS 'archived';
ALTER TYPE cswo_post_status ADD VALUE IF NOT EXISTS 'trash';

-- Add new columns to cswo_posts
ALTER TABLE public.cswo_posts
  ADD COLUMN IF NOT EXISTS schedule_at     timestamptz,
  ADD COLUMN IF NOT EXISTS meta_title      text,
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS focus_keyword   text,
  ADD COLUMN IF NOT EXISTS is_featured     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_sticky       boolean NOT NULL DEFAULT false;
