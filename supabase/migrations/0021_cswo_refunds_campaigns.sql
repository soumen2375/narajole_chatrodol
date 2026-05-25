-- Phase 2: refunds + campaigns

-- ── Refunds ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cswo_refunds (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_id  uuid REFERENCES public.cswo_donations(id) ON DELETE SET NULL,
  amount       numeric(12,2) NOT NULL CHECK (amount > 0),
  reason       text NOT NULL DEFAULT '',
  status       text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','approved','processed','rejected')),
  requested_by uuid REFERENCES public.cswo_members(id) ON DELETE SET NULL,
  approved_by  uuid REFERENCES public.cswo_members(id) ON DELETE SET NULL,
  note         text NOT NULL DEFAULT '',
  created_at   timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);
CREATE INDEX IF NOT EXISTS cswo_refunds_created_at_idx ON public.cswo_refunds(created_at DESC);
ALTER TABLE public.cswo_refunds ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "cswo_refunds_select" ON public.cswo_refunds FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.cswo_members WHERE id = auth.uid() AND status = 'approved'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "cswo_refunds_write" ON public.cswo_refunds FOR ALL USING (
    EXISTS (SELECT 1 FROM public.cswo_members WHERE id = auth.uid() AND status = 'approved' AND (role = 'admin' OR can_manage_finance)))
    WITH CHECK (
    EXISTS (SELECT 1 FROM public.cswo_members WHERE id = auth.uid() AND status = 'approved' AND (role = 'admin' OR can_manage_finance)));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Campaigns ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cswo_campaigns (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_bn      text NOT NULL,
  name_en      text NOT NULL,
  slug         text UNIQUE NOT NULL,
  goal_amount  numeric(12,2) NOT NULL DEFAULT 0,
  fund_id      uuid REFERENCES public.cswo_funds(id) ON DELETE SET NULL,
  starts_on    date,
  ends_on      date,
  is_active    boolean NOT NULL DEFAULT true,
  description  text NOT NULL DEFAULT '',
  cover_image  text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cswo_donations ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES public.cswo_campaigns(id) ON DELETE SET NULL;
ALTER TABLE public.cswo_campaigns ENABLE ROW LEVEL SECURITY;
-- Campaigns are public info (shown on the donate page); writes restricted.
DO $$ BEGIN
  CREATE POLICY "cswo_campaigns_select" ON public.cswo_campaigns FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "cswo_campaigns_write" ON public.cswo_campaigns FOR ALL USING (
    EXISTS (SELECT 1 FROM public.cswo_members WHERE id = auth.uid() AND status = 'approved' AND (role = 'admin' OR can_manage_finance)))
    WITH CHECK (
    EXISTS (SELECT 1 FROM public.cswo_members WHERE id = auth.uid() AND status = 'approved' AND (role = 'admin' OR can_manage_finance)));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Audit these new financial tables too
CREATE OR REPLACE TRIGGER cswo_audit_refunds   AFTER INSERT OR UPDATE OR DELETE ON public.cswo_refunds   FOR EACH ROW EXECUTE FUNCTION public.cswo_audit_row();
CREATE OR REPLACE TRIGGER cswo_audit_campaigns AFTER INSERT OR UPDATE OR DELETE ON public.cswo_campaigns FOR EACH ROW EXECUTE FUNCTION public.cswo_audit_row();
