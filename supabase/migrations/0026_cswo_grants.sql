-- Phase 3 (optional): grants / funding received, disbursed in tranches.

-- Extend the ledger entry-type enum (run alone; used by the trigger below).
ALTER TYPE public.cswo_ledger_entry_type ADD VALUE IF NOT EXISTS 'grant';

CREATE TABLE IF NOT EXISTS public.cswo_grants (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grantor           text NOT NULL,
  title             text NOT NULL,
  reference         text NOT NULL DEFAULT '',
  fund_id           uuid REFERENCES public.cswo_funds(id) ON DELETE SET NULL,
  sanctioned_amount numeric(14,2) NOT NULL DEFAULT 0,
  start_date        date,
  end_date          date,
  status            text NOT NULL DEFAULT 'active' CHECK (status IN ('pending','active','completed','closed')),
  contact_person    text NOT NULL DEFAULT '',
  note              text NOT NULL DEFAULT '',
  created_by        uuid REFERENCES public.cswo_members(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cswo_grant_tranches (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grant_id    uuid NOT NULL REFERENCES public.cswo_grants(id) ON DELETE CASCADE,
  tranche_no  int NOT NULL DEFAULT 1,
  amount      numeric(14,2) NOT NULL CHECK (amount > 0),
  received_on date,
  status      text NOT NULL DEFAULT 'expected' CHECK (status IN ('expected','received')),
  reference   text NOT NULL DEFAULT '',
  note        text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cswo_grant_tranches_grant_idx ON public.cswo_grant_tranches(grant_id);

ALTER TABLE public.cswo_grants          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cswo_grant_tranches  ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "cswo_grants_select" ON public.cswo_grants FOR SELECT USING (
    public.cswo_is_approved());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "cswo_grants_write" ON public.cswo_grants FOR ALL USING (
    public.cswo_is_finance_or_admin())
    WITH CHECK (
    public.cswo_is_finance_or_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "cswo_grant_tranches_select" ON public.cswo_grant_tranches FOR SELECT USING (
    public.cswo_is_approved());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "cswo_grant_tranches_write" ON public.cswo_grant_tranches FOR ALL USING (
    public.cswo_is_finance_or_admin())
    WITH CHECK (
    public.cswo_is_finance_or_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Ledger integration: a received tranche posts a credit (income); reverses on un-receive/delete.
CREATE OR REPLACE FUNCTION public.cswo_ledger_from_grant_tranche()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g RECORD; v_note text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.cswo_finance_ledger WHERE entry_type = 'grant' AND source_id = OLD.id;
    RETURN OLD;
  END IF;
  IF NEW.status = 'received' AND NEW.amount > 0 THEN
    SELECT fund_id, grantor, title, created_by INTO g FROM public.cswo_grants WHERE id = NEW.grant_id;
    v_note := COALESCE(g.grantor, 'Grant') || ' — ' || COALESCE(g.title, '') || ' (' || NEW.tranche_no::text || ')';
    IF EXISTS (SELECT 1 FROM public.cswo_finance_ledger WHERE entry_type = 'grant' AND source_id = NEW.id) THEN
      UPDATE public.cswo_finance_ledger
        SET amount = NEW.amount, fund_id = g.fund_id,
            occurred_at = COALESCE(NEW.received_on::timestamptz, NEW.created_at, now()),
            actor_id = g.created_by, note = v_note
      WHERE entry_type = 'grant' AND source_id = NEW.id;
    ELSE
      INSERT INTO public.cswo_finance_ledger (entry_type, source_id, fund_id, direction, amount, occurred_at, actor_id, note)
      VALUES ('grant', NEW.id, g.fund_id, 'credit', NEW.amount, COALESCE(NEW.received_on::timestamptz, NEW.created_at, now()), g.created_by, v_note);
    END IF;
  ELSE
    DELETE FROM public.cswo_finance_ledger WHERE entry_type = 'grant' AND source_id = NEW.id;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE TRIGGER cswo_grant_tranche_ledger AFTER INSERT OR UPDATE OR DELETE ON public.cswo_grant_tranches FOR EACH ROW EXECUTE FUNCTION public.cswo_ledger_from_grant_tranche();
CREATE OR REPLACE TRIGGER cswo_audit_grants          AFTER INSERT OR UPDATE OR DELETE ON public.cswo_grants          FOR EACH ROW EXECUTE FUNCTION public.cswo_audit_row();
CREATE OR REPLACE TRIGGER cswo_audit_grant_tranches  AFTER INSERT OR UPDATE OR DELETE ON public.cswo_grant_tranches  FOR EACH ROW EXECUTE FUNCTION public.cswo_audit_row();
