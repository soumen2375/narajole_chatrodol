-- Phase 1 Finance: cswo_expenses
DO $$ BEGIN
  CREATE TYPE public.cswo_expense_status AS ENUM ('draft', 'approved');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.cswo_payment_method AS ENUM ('cash', 'bank_transfer', 'upi', 'cheque', 'online', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.cswo_expenses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id         uuid NOT NULL REFERENCES public.cswo_funds(id) ON DELETE RESTRICT,
  event_id        uuid REFERENCES public.cswo_events(id) ON DELETE SET NULL,
  amount          numeric(12,2) NOT NULL CHECK (amount > 0),
  currency        text NOT NULL DEFAULT 'INR',
  spent_on        date NOT NULL,
  vendor          text NOT NULL DEFAULT '',
  description     text NOT NULL DEFAULT '',
  payment_method  public.cswo_payment_method NOT NULL DEFAULT 'cash',
  receipt_image   text,
  recorded_by     uuid NOT NULL REFERENCES public.cswo_members(id) ON DELETE RESTRICT,
  approved_by     uuid REFERENCES public.cswo_members(id) ON DELETE SET NULL,
  status          public.cswo_expense_status NOT NULL DEFAULT 'draft',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cswo_expenses_fund_id_idx   ON public.cswo_expenses(fund_id);
CREATE INDEX IF NOT EXISTS cswo_expenses_spent_on_idx  ON public.cswo_expenses(spent_on DESC);
CREATE INDEX IF NOT EXISTS cswo_expenses_event_id_idx  ON public.cswo_expenses(event_id);

ALTER TABLE public.cswo_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cswo_expenses_select" ON public.cswo_expenses
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.cswo_members WHERE id = auth.uid() AND status = 'approved')
  );

CREATE POLICY "cswo_expenses_insert" ON public.cswo_expenses
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.cswo_members WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "cswo_expenses_update" ON public.cswo_expenses
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.cswo_members WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "cswo_expenses_delete" ON public.cswo_expenses
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM public.cswo_members WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE OR REPLACE TRIGGER cswo_expenses_updated_at
  BEFORE UPDATE ON public.cswo_expenses
  FOR EACH ROW EXECUTE FUNCTION public.cswo_set_updated_at();
