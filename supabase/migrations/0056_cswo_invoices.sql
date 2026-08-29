-- Billing / Invoice register: every bill the organization issues or records,
-- with line items, so the finance panel can track billing the way the manual
-- CSWO_Payment_Receipt.xlsx sheet used to.

DO $$ BEGIN
  CREATE TYPE public.cswo_invoice_status AS ENUM ('draft','unpaid','partial','paid','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.cswo_invoices (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number   text UNIQUE,
  status           public.cswo_invoice_status NOT NULL DEFAULT 'draft',

  -- who the bill is addressed to
  bill_to_name     text NOT NULL DEFAULT '',
  bill_to_email    text NOT NULL DEFAULT '',
  bill_to_phone    text NOT NULL DEFAULT '',
  bill_to_address  text NOT NULL DEFAULT '',

  issue_date       date NOT NULL DEFAULT CURRENT_DATE,
  due_date         date,

  -- finance categorisation
  fund_id          uuid REFERENCES public.cswo_funds(id) ON DELETE SET NULL,
  event_id         uuid REFERENCES public.cswo_events(id) ON DELETE SET NULL,

  payment_method   public.cswo_payment_method NOT NULL DEFAULT 'upi',
  bank_account_id  uuid REFERENCES public.cswo_bank_accounts(id) ON DELETE SET NULL,
  payment_ref      text NOT NULL DEFAULT '',

  subtotal         numeric(12,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  discount         numeric(12,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  round_off        numeric(12,2) NOT NULL DEFAULT 0,
  total            numeric(12,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  amount_paid      numeric(12,2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),

  notes            text NOT NULL DEFAULT '',
  recorded_by      uuid REFERENCES public.cswo_members(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cswo_invoice_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id   uuid NOT NULL REFERENCES public.cswo_invoices(id) ON DELETE CASCADE,
  sort_order   int NOT NULL DEFAULT 0,
  description  text NOT NULL DEFAULT '',
  quantity     numeric(12,3) NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  rate         numeric(12,2) NOT NULL DEFAULT 0 CHECK (rate >= 0),
  amount       numeric(12,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cswo_invoices_issue_date_idx ON public.cswo_invoices(issue_date DESC);
CREATE INDEX IF NOT EXISTS cswo_invoices_status_idx     ON public.cswo_invoices(status);
CREATE INDEX IF NOT EXISTS cswo_invoices_fund_id_idx    ON public.cswo_invoices(fund_id);
CREATE INDEX IF NOT EXISTS cswo_invoices_event_id_idx   ON public.cswo_invoices(event_id);
CREATE INDEX IF NOT EXISTS cswo_invoice_items_inv_idx   ON public.cswo_invoice_items(invoice_id);

-- ── Bill numbers: CSWO-BIL-YYYYMMDD-0001, matching the existing paper bills ──
CREATE SEQUENCE IF NOT EXISTS public.cswo_invoice_seq START 1;

CREATE OR REPLACE FUNCTION public.cswo_generate_invoice_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := 'CSWO-BIL-' || to_char(now(), 'YYYYMMDD') || '-' ||
      LPAD(nextval('public.cswo_invoice_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER cswo_invoices_number
  BEFORE INSERT ON public.cswo_invoices
  FOR EACH ROW EXECUTE FUNCTION public.cswo_generate_invoice_number();

CREATE OR REPLACE TRIGGER cswo_invoices_updated_at
  BEFORE UPDATE ON public.cswo_invoices
  FOR EACH ROW EXECUTE FUNCTION public.cswo_set_updated_at();

-- ── RLS: any approved member may read, finance/admin may write ──────────────
-- The predicate is written inline rather than through a helper: the live
-- project names it cswo_can_manage_finance() while older migrations here
-- created cswo_is_finance_or_admin(), and this file has to apply on both.
ALTER TABLE public.cswo_invoices      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cswo_invoice_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cswo_invoices_select" ON public.cswo_invoices;
CREATE POLICY "cswo_invoices_select" ON public.cswo_invoices
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.cswo_members WHERE id = auth.uid() AND status = 'approved')
  );

DROP POLICY IF EXISTS "cswo_invoices_write" ON public.cswo_invoices;
CREATE POLICY "cswo_invoices_write" ON public.cswo_invoices
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.cswo_members
            WHERE id = auth.uid() AND status = 'approved'
              AND (role = 'admin' OR can_manage_finance))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.cswo_members
            WHERE id = auth.uid() AND status = 'approved'
              AND (role = 'admin' OR can_manage_finance))
  );

DROP POLICY IF EXISTS "cswo_invoice_items_select" ON public.cswo_invoice_items;
CREATE POLICY "cswo_invoice_items_select" ON public.cswo_invoice_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.cswo_members WHERE id = auth.uid() AND status = 'approved')
  );

DROP POLICY IF EXISTS "cswo_invoice_items_write" ON public.cswo_invoice_items;
CREATE POLICY "cswo_invoice_items_write" ON public.cswo_invoice_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.cswo_members
            WHERE id = auth.uid() AND status = 'approved'
              AND (role = 'admin' OR can_manage_finance))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.cswo_members
            WHERE id = auth.uid() AND status = 'approved'
              AND (role = 'admin' OR can_manage_finance))
  );
