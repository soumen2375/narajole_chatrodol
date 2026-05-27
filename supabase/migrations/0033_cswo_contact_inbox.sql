-- Inbox features for contact messages: category, read/star, stored reply.
ALTER TABLE public.cswo_contact_messages
  ADD COLUMN IF NOT EXISTS category    text NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS is_read     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_starred  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_reply text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS replied_at  timestamptz,
  ADD COLUMN IF NOT EXISTS replied_by  uuid REFERENCES public.cswo_members(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS cswo_contact_created_idx ON public.cswo_contact_messages(created_at DESC);
