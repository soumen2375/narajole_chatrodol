-- Migration 0034_cswo_bank_sync_v2.sql
-- Add explicit bank account tracking and reconciliation fields.

-- 1. Add bank_account_id columns to expenses, payroll, and donations
ALTER TABLE public.cswo_expenses ADD COLUMN IF NOT EXISTS bank_account_id uuid REFERENCES public.cswo_bank_accounts(id) ON DELETE SET NULL;
ALTER TABLE public.cswo_payroll ADD COLUMN IF NOT EXISTS bank_account_id uuid REFERENCES public.cswo_bank_accounts(id) ON DELETE SET NULL;
ALTER TABLE public.cswo_donations ADD COLUMN IF NOT EXISTS bank_account_id uuid REFERENCES public.cswo_bank_accounts(id) ON DELETE SET NULL;

-- 2. Add statement_balance to bank accounts
ALTER TABLE public.cswo_bank_accounts ADD COLUMN IF NOT EXISTS statement_balance numeric(14,2) NOT NULL DEFAULT 0;

-- 3. Add file_url and file_type to compliance register
ALTER TABLE public.cswo_compliance ADD COLUMN IF NOT EXISTS file_url text NOT NULL DEFAULT '';
ALTER TABLE public.cswo_compliance ADD COLUMN IF NOT EXISTS file_type text NOT NULL DEFAULT '';

-- 4. Update the expense bank transaction trigger to use chosen bank_account_id
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
    -- If user chose a specific bank account, use it
    IF NEW.bank_account_id IS NOT NULL THEN
      v_acct_id := NEW.bank_account_id;
    ELSE
      -- Fallback to original automatic picking
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

-- 5. Update the payroll bank transaction trigger to use chosen bank_account_id
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
    -- If user chose a specific bank account, use it
    IF NEW.bank_account_id IS NOT NULL THEN
      v_acct_id := NEW.bank_account_id;
    ELSE
      -- Fallback to first active account
      SELECT id INTO v_acct_id FROM public.cswo_bank_accounts
      WHERE is_active = true
      ORDER BY sort_order, created_at LIMIT 1;
    END IF;

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

-- 6. Update the donation bank transaction trigger to use chosen bank_account_id
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
    -- If user chose a specific bank account, use it
    IF NEW.bank_account_id IS NOT NULL THEN
      v_acct_id := NEW.bank_account_id;
    ELSE
      -- Fallback to first active account
      SELECT id INTO v_acct_id FROM public.cswo_bank_accounts
      WHERE is_active = true
      ORDER BY sort_order, created_at LIMIT 1;
    END IF;

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

-- 7. Update cswo_payroll ledger integration occurred_at chronological logic to use paid_on date
CREATE OR REPLACE FUNCTION public.cswo_ledger_from_payroll()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_note text; v_payee text; v_time time; v_occurred timestamptz;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.cswo_finance_ledger WHERE entry_type = 'payroll' AND source_id = OLD.id;
    RETURN OLD;
  END IF;
  
  IF NEW.status = 'paid' AND NEW.amount > 0 THEN
    v_payee := COALESCE(NULLIF(NEW.payee_name, ''), (SELECT full_name FROM public.cswo_members m WHERE m.id = NEW.member_id), 'Staff');
    v_note := v_payee || ' — ' || NEW.kind || COALESCE(' ' || NULLIF(NEW.period, ''), '');
    
    -- Extract time from updated_at/created_at to preserve exact moment within paid_on date
    v_time := COALESCE(NEW.updated_at::time, NEW.created_at::time, now()::time);
    v_occurred := COALESCE((NEW.paid_on::text || ' ' || v_time::text)::timestamptz, NEW.updated_at, NEW.created_at, now());
    
    IF EXISTS (SELECT 1 FROM public.cswo_finance_ledger WHERE entry_type = 'payroll' AND source_id = NEW.id) THEN
      UPDATE public.cswo_finance_ledger
        SET amount = NEW.amount, fund_id = NEW.fund_id,
            occurred_at = v_occurred,
            actor_id = COALESCE(NEW.approved_by, NEW.created_by), note = v_note
      WHERE entry_type = 'payroll' AND source_id = NEW.id;
    ELSE
      INSERT INTO public.cswo_finance_ledger (entry_type, source_id, fund_id, direction, amount, occurred_at, actor_id, note)
      VALUES ('payroll', NEW.id, NEW.fund_id, 'debit', NEW.amount, v_occurred, COALESCE(NEW.approved_by, NEW.created_by), v_note);
    END IF;
  ELSE
    DELETE FROM public.cswo_finance_ledger WHERE entry_type = 'payroll' AND source_id = NEW.id;
  END IF;
  RETURN NEW;
END; $$;
