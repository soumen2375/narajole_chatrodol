-- Phase 3: payroll / honorarium / stipend / reimbursement

-- Extend the ledger entry-type enum (run alone; new value used by trigger below).
ALTER TYPE public.cswo_ledger_entry_type ADD VALUE IF NOT EXISTS 'payroll';

CREATE TABLE IF NOT EXISTS public.cswo_payroll (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   uuid REFERENCES public.cswo_members(id) ON DELETE SET NULL,
  payee_name  text NOT NULL DEFAULT '',
  designation text NOT NULL DEFAULT '',
  kind        text NOT NULL DEFAULT 'honorarium' CHECK (kind IN ('salary','honorarium','stipend','reimbursement')),
  period      text NOT NULL DEFAULT '',
  amount      numeric(12,2) NOT NULL CHECK (amount > 0),
  fund_id     uuid REFERENCES public.cswo_funds(id) ON DELETE SET NULL,
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','cancelled')),
  note        text NOT NULL DEFAULT '',
  paid_on     date,
  created_by  uuid REFERENCES public.cswo_members(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES public.cswo_members(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cswo_payroll_created_at_idx ON public.cswo_payroll(created_at DESC);
CREATE INDEX IF NOT EXISTS cswo_payroll_member_idx     ON public.cswo_payroll(member_id);

ALTER TABLE public.cswo_payroll ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "cswo_payroll_select" ON public.cswo_payroll FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.cswo_members WHERE id = auth.uid() AND status = 'approved'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "cswo_payroll_write" ON public.cswo_payroll FOR ALL USING (
    EXISTS (SELECT 1 FROM public.cswo_members WHERE id = auth.uid() AND status = 'approved' AND (role = 'admin' OR can_manage_finance)))
    WITH CHECK (
    EXISTS (SELECT 1 FROM public.cswo_members WHERE id = auth.uid() AND status = 'approved' AND (role = 'admin' OR can_manage_finance)));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Ledger integration: a paid payroll record posts a debit; reverses on unpay/cancel/delete.
CREATE OR REPLACE FUNCTION public.cswo_ledger_from_payroll()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_note text; v_payee text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.cswo_finance_ledger WHERE entry_type = 'payroll' AND source_id = OLD.id;
    RETURN OLD;
  END IF;
  IF NEW.status = 'paid' AND NEW.amount > 0 THEN
    v_payee := COALESCE(NULLIF(NEW.payee_name, ''), (SELECT full_name FROM public.cswo_members m WHERE m.id = NEW.member_id), 'Staff');
    v_note := v_payee || ' — ' || NEW.kind || COALESCE(' ' || NULLIF(NEW.period, ''), '');
    IF EXISTS (SELECT 1 FROM public.cswo_finance_ledger WHERE entry_type = 'payroll' AND source_id = NEW.id) THEN
      UPDATE public.cswo_finance_ledger
        SET amount = NEW.amount, fund_id = NEW.fund_id,
            occurred_at = COALESCE(NEW.paid_on::timestamptz, NEW.created_at, now()),
            actor_id = COALESCE(NEW.approved_by, NEW.created_by), note = v_note
      WHERE entry_type = 'payroll' AND source_id = NEW.id;
    ELSE
      INSERT INTO public.cswo_finance_ledger (entry_type, source_id, fund_id, direction, amount, occurred_at, actor_id, note)
      VALUES ('payroll', NEW.id, NEW.fund_id, 'debit', NEW.amount, COALESCE(NEW.paid_on::timestamptz, NEW.created_at, now()), COALESCE(NEW.approved_by, NEW.created_by), v_note);
    END IF;
  ELSE
    DELETE FROM public.cswo_finance_ledger WHERE entry_type = 'payroll' AND source_id = NEW.id;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE TRIGGER cswo_payroll_ledger AFTER INSERT OR UPDATE OR DELETE ON public.cswo_payroll FOR EACH ROW EXECUTE FUNCTION public.cswo_ledger_from_payroll();
CREATE OR REPLACE TRIGGER cswo_audit_payroll  AFTER INSERT OR UPDATE OR DELETE ON public.cswo_payroll FOR EACH ROW EXECUTE FUNCTION public.cswo_audit_row();
