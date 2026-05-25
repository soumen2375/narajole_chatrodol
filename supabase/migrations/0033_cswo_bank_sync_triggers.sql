-- Expense bank transaction sync trigger
CREATE OR REPLACE FUNCTION public.cswo_sync_expense_bank_txn()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_acct_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.cswo_bank_transactions WHERE reference = 'EXP-' || OLD.id::text;
    RETURN OLD;
  END IF;

  IF NEW.status = 'approved' AND NEW.amount > 0 THEN
    -- Match by payment method
    IF NEW.payment_method = 'cash' THEN
      SELECT id INTO v_acct_id FROM public.cswo_bank_accounts
      WHERE account_type = 'cash' AND is_active = true
      ORDER BY sort_order, created_at LIMIT 1;
    ELSE
      SELECT id INTO v_acct_id FROM public.cswo_bank_accounts
      WHERE account_type IN ('savings', 'current') AND is_active = true
      ORDER BY sort_order, created_at LIMIT 1;
    END IF;

    IF v_acct_id IS NULL THEN
      SELECT id INTO v_acct_id FROM public.cswo_bank_accounts
      WHERE is_active = true
      ORDER BY sort_order, created_at LIMIT 1;
    END IF;

    IF v_acct_id IS NOT NULL THEN
      IF EXISTS (SELECT 1 FROM public.cswo_bank_transactions WHERE reference = 'EXP-' || NEW.id::text) THEN
        UPDATE public.cswo_bank_transactions
        SET account_id = v_acct_id, txn_date = NEW.spent_on,
            description = COALESCE(NULLIF(NEW.description, ''), 'Expense approved') || ' — ' || NEW.vendor,
            amount = NEW.amount, updated_at = now()
        WHERE reference = 'EXP-' || NEW.id::text;
      ELSE
        INSERT INTO public.cswo_bank_transactions (account_id, txn_date, description, reference, direction, amount, reconciled, created_by)
        VALUES (v_acct_id, NEW.spent_on, COALESCE(NULLIF(NEW.description, ''), 'Expense approved') || ' — ' || NEW.vendor, 'EXP-' || NEW.id::text, 'debit', NEW.amount, true, COALESCE(NEW.approved_by, NEW.recorded_by));
      END IF;
    END IF;
  ELSE
    DELETE FROM public.cswo_bank_transactions WHERE reference = 'EXP-' || NEW.id::text;
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS cswo_sync_expense_bank_txn_t ON public.cswo_expenses;
CREATE TRIGGER cswo_sync_expense_bank_txn_t
AFTER INSERT OR UPDATE OR DELETE ON public.cswo_expenses
FOR EACH ROW EXECUTE FUNCTION public.cswo_sync_expense_bank_txn();

-- Payroll bank transaction sync trigger
CREATE OR REPLACE FUNCTION public.cswo_sync_payroll_bank_txn()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_acct_id uuid;
  v_payee text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.cswo_bank_transactions WHERE reference = 'PAY-' || OLD.id::text;
    RETURN OLD;
  END IF;

  IF NEW.status = 'paid' AND NEW.amount > 0 THEN
    SELECT id INTO v_acct_id FROM public.cswo_bank_accounts
    WHERE is_active = true
    ORDER BY sort_order, created_at LIMIT 1;

    IF v_acct_id IS NOT NULL THEN
      v_payee := COALESCE(NULLIF(NEW.payee_name, ''), (SELECT full_name FROM public.cswo_members m WHERE m.id = NEW.member_id), 'Staff');
      IF EXISTS (SELECT 1 FROM public.cswo_bank_transactions WHERE reference = 'PAY-' || NEW.id::text) THEN
        UPDATE public.cswo_bank_transactions
        SET account_id = v_acct_id, txn_date = COALESCE(NEW.paid_on, NEW.created_at::date, now()::date),
            description = 'Payroll payment — ' || v_payee || ' (' || NEW.kind || ')',
            amount = NEW.amount, updated_at = now()
        WHERE reference = 'PAY-' || NEW.id::text;
      ELSE
        INSERT INTO public.cswo_bank_transactions (account_id, txn_date, description, reference, direction, amount, reconciled, created_by)
        VALUES (v_acct_id, COALESCE(NEW.paid_on, NEW.created_at::date, now()::date), 'Payroll payment — ' || v_payee || ' (' || NEW.kind || ')', 'PAY-' || NEW.id::text, 'debit', NEW.amount, true, COALESCE(NEW.approved_by, NEW.created_by));
      END IF;
    END IF;
  ELSE
    DELETE FROM public.cswo_bank_transactions WHERE reference = 'PAY-' || NEW.id::text;
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS cswo_sync_payroll_bank_txn_t ON public.cswo_payroll;
CREATE TRIGGER cswo_sync_payroll_bank_txn_t
AFTER INSERT OR UPDATE OR DELETE ON public.cswo_payroll
FOR EACH ROW EXECUTE FUNCTION public.cswo_sync_payroll_bank_txn();

-- Donation bank transaction sync trigger
CREATE OR REPLACE FUNCTION public.cswo_sync_donation_bank_txn()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_acct_id uuid;
  v_donor text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.cswo_bank_transactions WHERE reference = 'DON-' || OLD.id::text;
    RETURN OLD;
  END IF;

  IF NEW.status = 'paid' AND NEW.amount > 0 THEN
    SELECT id INTO v_acct_id FROM public.cswo_bank_accounts
    WHERE is_active = true
    ORDER BY sort_order, created_at LIMIT 1;

    IF v_acct_id IS NOT NULL THEN
      v_donor := CASE WHEN NEW.is_anonymous THEN 'Anonymous' ELSE COALESCE(NULLIF(NEW.donor_name, ''), 'Donor') END;
      IF EXISTS (SELECT 1 FROM public.cswo_bank_transactions WHERE reference = 'DON-' || NEW.id::text) THEN
        UPDATE public.cswo_bank_transactions
        SET account_id = v_acct_id, txn_date = NEW.created_at::date,
            description = 'Donation received — ' || v_donor || COALESCE(' (' || NULLIF(NEW.purpose, '') || ')', ''),
            amount = NEW.amount, updated_at = now()
        WHERE reference = 'DON-' || NEW.id::text;
      ELSE
        INSERT INTO public.cswo_bank_transactions (account_id, txn_date, description, reference, direction, amount, reconciled, created_by)
        VALUES (v_acct_id, NEW.created_at::date, 'Donation received — ' || v_donor || COALESCE(' (' || NULLIF(NEW.purpose, '') || ')', ''), 'DON-' || NEW.id::text, 'credit', NEW.amount, true, NEW.member_id);
      END IF;
    END IF;
  ELSE
    DELETE FROM public.cswo_bank_transactions WHERE reference = 'DON-' || NEW.id::text;
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS cswo_sync_donation_bank_txn_t ON public.cswo_donations;
CREATE TRIGGER cswo_sync_donation_bank_txn_t
AFTER INSERT OR UPDATE OR DELETE ON public.cswo_donations
FOR EACH ROW EXECUTE FUNCTION public.cswo_sync_donation_bank_txn();
