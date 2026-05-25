-- Phase 4: bank accounts + statement reconciliation
-- Sensitive (account numbers): restricted to finance/admin for both read and write.

CREATE TABLE IF NOT EXISTS public.cswo_bank_accounts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label           text NOT NULL,
  bank_name       text NOT NULL DEFAULT '',
  account_name    text NOT NULL DEFAULT '',
  account_number  text NOT NULL DEFAULT '',
  ifsc            text NOT NULL DEFAULT '',
  branch          text NOT NULL DEFAULT '',
  account_type    text NOT NULL DEFAULT 'savings' CHECK (account_type IN ('savings','current','cash','other')),
  opening_balance numeric(14,2) NOT NULL DEFAULT 0,
  is_active       boolean NOT NULL DEFAULT true,
  note            text NOT NULL DEFAULT '',
  sort_order      int NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cswo_bank_transactions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  uuid NOT NULL REFERENCES public.cswo_bank_accounts(id) ON DELETE CASCADE,
  txn_date    date NOT NULL,
  description text NOT NULL DEFAULT '',
  reference   text NOT NULL DEFAULT '',
  direction   text NOT NULL CHECK (direction IN ('credit','debit')),
  amount      numeric(14,2) NOT NULL CHECK (amount > 0),
  reconciled  boolean NOT NULL DEFAULT false,
  note        text NOT NULL DEFAULT '',
  created_by  uuid REFERENCES public.cswo_members(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cswo_bank_txn_account_idx ON public.cswo_bank_transactions(account_id, txn_date DESC);

ALTER TABLE public.cswo_bank_accounts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cswo_bank_transactions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "cswo_bank_accounts_all" ON public.cswo_bank_accounts FOR ALL USING (
    public.cswo_is_finance_or_admin())
    WITH CHECK (
    public.cswo_is_finance_or_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "cswo_bank_txn_all" ON public.cswo_bank_transactions FOR ALL USING (
    public.cswo_is_finance_or_admin())
    WITH CHECK (
    public.cswo_is_finance_or_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE TRIGGER cswo_audit_bank_accounts AFTER INSERT OR UPDATE OR DELETE ON public.cswo_bank_accounts     FOR EACH ROW EXECUTE FUNCTION public.cswo_audit_row();
CREATE OR REPLACE TRIGGER cswo_audit_bank_txn      AFTER INSERT OR UPDATE OR DELETE ON public.cswo_bank_transactions FOR EACH ROW EXECUTE FUNCTION public.cswo_audit_row();
