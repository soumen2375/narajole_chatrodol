-- Phase 1 Finance: cswo_finance_ledger (append-only audit trail) + receipt numbers
DO $$ BEGIN
  CREATE TYPE public.cswo_ledger_entry_type AS ENUM ('donation','contribution','expense','adjustment');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.cswo_ledger_direction AS ENUM ('credit','debit');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.cswo_finance_ledger (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_type   public.cswo_ledger_entry_type NOT NULL,
  source_id    uuid,
  fund_id      uuid REFERENCES public.cswo_funds(id) ON DELETE RESTRICT,
  direction    public.cswo_ledger_direction NOT NULL,
  amount       numeric(12,2) NOT NULL CHECK (amount > 0),
  occurred_at  timestamptz NOT NULL,
  actor_id     uuid REFERENCES public.cswo_members(id) ON DELETE SET NULL,
  note         text NOT NULL DEFAULT '',
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cswo_ledger_fund_id_idx     ON public.cswo_finance_ledger(fund_id);
CREATE INDEX IF NOT EXISTS cswo_ledger_occurred_at_idx ON public.cswo_finance_ledger(occurred_at DESC);
CREATE INDEX IF NOT EXISTS cswo_ledger_entry_type_idx  ON public.cswo_finance_ledger(entry_type);

ALTER TABLE public.cswo_finance_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cswo_ledger_select" ON public.cswo_finance_ledger
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.cswo_members WHERE id = auth.uid() AND status = 'approved')
  );

CREATE POLICY "cswo_ledger_insert" ON public.cswo_finance_ledger
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.cswo_members WHERE id = auth.uid() AND role = 'admin'
  ));

-- Add receipt_number + fund_id to cswo_donations
ALTER TABLE public.cswo_donations
  ADD COLUMN IF NOT EXISTS receipt_number text UNIQUE,
  ADD COLUMN IF NOT EXISTS fund_id uuid REFERENCES public.cswo_funds(id) ON DELETE SET NULL;

-- Add receipt_number to cswo_monthly_contributions
ALTER TABLE public.cswo_monthly_contributions
  ADD COLUMN IF NOT EXISTS receipt_number text UNIQUE;

-- Shared receipt sequence
CREATE SEQUENCE IF NOT EXISTS public.cswo_receipt_seq START 1;

-- Auto-generate receipt numbers for new donations
CREATE OR REPLACE FUNCTION public.cswo_generate_donation_receipt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.receipt_number IS NULL THEN
    NEW.receipt_number := 'CSWO-DON-' || to_char(now(), 'YYYYMMDD') || '-' ||
      LPAD(nextval('public.cswo_receipt_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER cswo_donations_receipt_number
  BEFORE INSERT ON public.cswo_donations
  FOR EACH ROW EXECUTE FUNCTION public.cswo_generate_donation_receipt();

-- Auto-generate receipt numbers for new contributions
CREATE OR REPLACE FUNCTION public.cswo_generate_contribution_receipt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.receipt_number IS NULL THEN
    NEW.receipt_number := 'CSWO-CON-' || to_char(now(), 'YYYYMMDD') || '-' ||
      LPAD(nextval('public.cswo_receipt_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER cswo_contributions_receipt_number
  BEFORE INSERT ON public.cswo_monthly_contributions
  FOR EACH ROW EXECUTE FUNCTION public.cswo_generate_contribution_receipt();
