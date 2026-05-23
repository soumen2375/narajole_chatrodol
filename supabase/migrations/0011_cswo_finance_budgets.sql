-- Phase 1 Finance: cswo_budgets — per-fund, per-fiscal-year allocation
CREATE TABLE IF NOT EXISTS public.cswo_budgets (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id          uuid NOT NULL REFERENCES public.cswo_funds(id) ON DELETE CASCADE,
  fiscal_year      text NOT NULL,
  allocated_amount numeric(12,2) NOT NULL CHECK (allocated_amount >= 0),
  note             text NOT NULL DEFAULT '',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fund_id, fiscal_year)
);

ALTER TABLE public.cswo_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cswo_budgets_select" ON public.cswo_budgets
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.cswo_members WHERE id = auth.uid() AND status = 'approved')
  );

CREATE POLICY "cswo_budgets_insert" ON public.cswo_budgets
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.cswo_members WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "cswo_budgets_update" ON public.cswo_budgets
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.cswo_members WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "cswo_budgets_delete" ON public.cswo_budgets
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM public.cswo_members WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE OR REPLACE TRIGGER cswo_budgets_updated_at
  BEFORE UPDATE ON public.cswo_budgets
  FOR EACH ROW EXECUTE FUNCTION public.cswo_set_updated_at();
