-- CMS Phase 2: Approval Workflow tracking and reviewer feedback logs

CREATE TABLE IF NOT EXISTS public.cswo_post_approvals (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id      uuid        NOT NULL REFERENCES public.cswo_posts(id) ON DELETE CASCADE,
  reviewer_id  uuid        REFERENCES public.cswo_members(id) ON DELETE SET NULL,
  action       text        NOT NULL CHECK (action IN ('submitted', 'approved', 'rejected', 'changes_requested')),
  notes        text        NOT NULL DEFAULT '',
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cswo_approvals_post ON public.cswo_post_approvals(post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cswo_approvals_reviewer ON public.cswo_post_approvals(reviewer_id);

-- RLS
ALTER TABLE public.cswo_post_approvals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "cswo_approvals_select" ON public.cswo_post_approvals
    FOR SELECT USING (public.cswo_is_approved());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "cswo_approvals_insert" ON public.cswo_post_approvals
    FOR INSERT WITH CHECK (public.cswo_is_approved());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "cswo_approvals_delete" ON public.cswo_post_approvals
    FOR DELETE USING (public.cswo_is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
