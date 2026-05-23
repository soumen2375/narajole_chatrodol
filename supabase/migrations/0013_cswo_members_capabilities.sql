ALTER TABLE public.cswo_members
  ADD COLUMN IF NOT EXISTS can_manage_posts    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_manage_events   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_manage_finance  boolean NOT NULL DEFAULT false;
