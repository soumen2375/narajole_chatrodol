-- Phase 1: auto-populate cswo_finance_ledger from donations / contributions / expenses
-- Single-entry append-only ledger. Inserts are idempotent via NOT EXISTS on (entry_type, source_id).

CREATE OR REPLACE FUNCTION public.cswo_ledger_from_donation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'paid' AND NEW.amount > 0 AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'paid') THEN
    INSERT INTO public.cswo_finance_ledger (entry_type, source_id, fund_id, direction, amount, occurred_at, actor_id, note)
    SELECT 'donation', NEW.id, NEW.fund_id, 'credit', NEW.amount,
           COALESCE(NEW.updated_at, NEW.created_at, now()), NEW.member_id,
           COALESCE(NULLIF(NEW.purpose, ''), 'Donation')
    WHERE NOT EXISTS (SELECT 1 FROM public.cswo_finance_ledger l WHERE l.entry_type = 'donation' AND l.source_id = NEW.id);
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.cswo_ledger_from_contribution()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'paid' AND NEW.amount > 0 AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'paid') THEN
    INSERT INTO public.cswo_finance_ledger (entry_type, source_id, fund_id, direction, amount, occurred_at, actor_id, note)
    SELECT 'contribution', NEW.id, NULL, 'credit', NEW.amount,
           COALESCE(NEW.paid_at, NEW.updated_at, now()), NEW.recorded_by, 'Monthly contribution'
    WHERE NOT EXISTS (SELECT 1 FROM public.cswo_finance_ledger l WHERE l.entry_type = 'contribution' AND l.source_id = NEW.id);
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.cswo_ledger_from_expense()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'approved' AND NEW.amount > 0 AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'approved') THEN
    INSERT INTO public.cswo_finance_ledger (entry_type, source_id, fund_id, direction, amount, occurred_at, actor_id, note)
    SELECT 'expense', NEW.id, NEW.fund_id, 'debit', NEW.amount,
           COALESCE(NEW.spent_on::timestamptz, NEW.created_at, now()), COALESCE(NEW.approved_by, NEW.recorded_by),
           COALESCE(NULLIF(NEW.description, ''), NULLIF(NEW.vendor, ''), 'Expense')
    WHERE NOT EXISTS (SELECT 1 FROM public.cswo_finance_ledger l WHERE l.entry_type = 'expense' AND l.source_id = NEW.id);
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE TRIGGER cswo_donations_ledger     AFTER INSERT OR UPDATE ON public.cswo_donations             FOR EACH ROW EXECUTE FUNCTION public.cswo_ledger_from_donation();
CREATE OR REPLACE TRIGGER cswo_contributions_ledger AFTER INSERT OR UPDATE ON public.cswo_monthly_contributions FOR EACH ROW EXECUTE FUNCTION public.cswo_ledger_from_contribution();
CREATE OR REPLACE TRIGGER cswo_expenses_ledger      AFTER INSERT OR UPDATE ON public.cswo_expenses              FOR EACH ROW EXECUTE FUNCTION public.cswo_ledger_from_expense();

-- One-time backfill of existing records
INSERT INTO public.cswo_finance_ledger (entry_type, source_id, fund_id, direction, amount, occurred_at, actor_id, note)
SELECT 'donation', d.id, d.fund_id, 'credit', d.amount, COALESCE(d.updated_at, d.created_at, now()), d.member_id, COALESCE(NULLIF(d.purpose, ''), 'Donation')
FROM public.cswo_donations d
WHERE d.status = 'paid' AND d.amount > 0
  AND NOT EXISTS (SELECT 1 FROM public.cswo_finance_ledger l WHERE l.entry_type = 'donation' AND l.source_id = d.id);

INSERT INTO public.cswo_finance_ledger (entry_type, source_id, fund_id, direction, amount, occurred_at, actor_id, note)
SELECT 'contribution', c.id, NULL, 'credit', c.amount, COALESCE(c.paid_at, c.updated_at, now()), c.recorded_by, 'Monthly contribution'
FROM public.cswo_monthly_contributions c
WHERE c.status = 'paid' AND c.amount > 0
  AND NOT EXISTS (SELECT 1 FROM public.cswo_finance_ledger l WHERE l.entry_type = 'contribution' AND l.source_id = c.id);

INSERT INTO public.cswo_finance_ledger (entry_type, source_id, fund_id, direction, amount, occurred_at, actor_id, note)
SELECT 'expense', e.id, e.fund_id, 'debit', e.amount, COALESCE(e.spent_on::timestamptz, e.created_at, now()), COALESCE(e.approved_by, e.recorded_by), COALESCE(NULLIF(e.description, ''), NULLIF(e.vendor, ''), 'Expense')
FROM public.cswo_expenses e
WHERE e.status = 'approved' AND e.amount > 0
  AND NOT EXISTS (SELECT 1 FROM public.cswo_finance_ledger l WHERE l.entry_type = 'expense' AND l.source_id = e.id);
