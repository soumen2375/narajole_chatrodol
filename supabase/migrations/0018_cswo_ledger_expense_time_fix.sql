-- Fix: expense ledger entries should use the real recording timestamp (created_at),
-- not spent_on (a date cast to midnight, which displayed a wrong/shifted time).

CREATE OR REPLACE FUNCTION public.cswo_ledger_from_expense()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'approved' AND NEW.amount > 0 AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'approved') THEN
    INSERT INTO public.cswo_finance_ledger (entry_type, source_id, fund_id, direction, amount, occurred_at, actor_id, note)
    SELECT 'expense', NEW.id, NEW.fund_id, 'debit', NEW.amount,
           COALESCE(NEW.created_at, now()), COALESCE(NEW.approved_by, NEW.recorded_by),
           COALESCE(NULLIF(NEW.description, ''), NULLIF(NEW.vendor, ''), 'Expense')
    WHERE NOT EXISTS (SELECT 1 FROM public.cswo_finance_ledger l WHERE l.entry_type = 'expense' AND l.source_id = NEW.id);
  END IF;
  RETURN NEW;
END; $$;

-- Repair existing expense ledger rows to the expense's created_at timestamp
UPDATE public.cswo_finance_ledger l
SET occurred_at = e.created_at
FROM public.cswo_expenses e
WHERE l.entry_type = 'expense' AND l.source_id = e.id AND e.created_at IS NOT NULL;
