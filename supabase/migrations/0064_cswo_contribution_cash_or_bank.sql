-- ══════════════════════════════════════════════════════════════════════════════
-- 0064_cswo_contribution_cash_or_bank.sql
--
-- Two things, both about where a monthly-dues payment lands and whether it
-- lands at all.
--
-- A. Cash vs bank, chosen at the point of recording.
--    cswo_sync_contribution_bank_txn() resolved the destination with
--    cswo_money_account(payment_method, NULL) — the second argument, the
--    explicitly chosen account, was hardcoded NULL for contributions even
--    though donations and expenses both carry a bank_account_id and pass it.
--    So dues could only ever go to whichever account held the is_default flag.
--    This adds the same bank_account_id column to cswo_monthly_contributions
--    and passes it through, so 'cash' lands in the cash wallet and 'online'
--    lands in the bank account the treasurer names.
--
-- B. A member paying their own dues could not stage the row for months that
--    already existed.
--    cswo_contrib_member_link_order's USING clause matched only
--    created/failed/cancelled. But the column default is 'unpaid', and admin
--    seeds a row per due month, so the ordinary state of a month a member is
--    about to pay is exactly the one state the policy did not allow. The
--    client upsert therefore failed for every seeded month; no row carried the
--    gateway order id; finalizePayment() found nothing to mark paid. The
--    gateway took the money and the app never saw it — the "paid but not
--    reflecting in Monthly" report.
--
--    Widening USING alone would leave staging split across an upsert plus a
--    follow-up update, each able to half-fail silently, so this also adds
--    cswo_stage_contribution_batch(): one SECURITY DEFINER call that creates
--    the rows and attaches the order id together, and reports which months it
--    actually staged so the client can refuse to open a checkout it cannot
--    record.
-- ══════════════════════════════════════════════════════════════════════════════

-- ── A1. Where did the money land? ────────────────────────────────────────────

ALTER TABLE public.cswo_monthly_contributions
  ADD COLUMN IF NOT EXISTS bank_account_id uuid
    REFERENCES public.cswo_bank_accounts(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.cswo_monthly_contributions.bank_account_id IS
  'Account that received this payment. NULL lets cswo_money_account() pick the default for the payment_method (cash wallet vs default bank).';

CREATE INDEX IF NOT EXISTS cswo_contrib_bank_account_idx
  ON public.cswo_monthly_contributions (bank_account_id)
  WHERE bank_account_id IS NOT NULL;

-- ── A2. Honour the chosen account when mirroring into bank transactions ──────

CREATE OR REPLACE FUNCTION public.cswo_sync_contribution_bank_txn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE v_acct_id uuid; v_member text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.cswo_bank_transactions WHERE reference = 'CON-' || OLD.id::text;
    RETURN OLD;
  END IF;

  IF NEW.status = 'paid' AND NEW.amount > 0 THEN
    -- Second argument is the explicitly chosen account; NULL falls back to the
    -- default for this method exactly as before, so untouched rows do not move.
    v_acct_id := public.cswo_money_account(COALESCE(NEW.payment_method, 'online'), NEW.bank_account_id);

    IF v_acct_id IS NOT NULL THEN
      v_member := COALESCE((SELECT full_name FROM public.cswo_members m WHERE m.id = NEW.member_id), 'Member');

      IF EXISTS (SELECT 1 FROM public.cswo_bank_transactions WHERE reference = 'CON-' || NEW.id::text) THEN
        UPDATE public.cswo_bank_transactions
           SET account_id  = v_acct_id,
               txn_date    = COALESCE(NEW.paid_at, NEW.created_at)::date,
               description = 'Monthly donation - ' || v_member,
               amount      = NEW.amount,
               updated_at  = now()
         WHERE reference = 'CON-' || NEW.id::text;
      ELSE
        INSERT INTO public.cswo_bank_transactions
          (account_id, txn_date, description, reference, direction, amount, reconciled, created_by)
        VALUES
          (v_acct_id, COALESCE(NEW.paid_at, NEW.created_at)::date,
           'Monthly donation - ' || v_member,
           'CON-' || NEW.id::text, 'credit', NEW.amount, true, NEW.recorded_by);
      END IF;
    END IF;
  ELSE
    DELETE FROM public.cswo_bank_transactions WHERE reference = 'CON-' || NEW.id::text;
  END IF;

  RETURN NEW;
END;
$fn$;

-- ── B1. A member may restage any month that is not already paid ──────────────
--
-- 'unpaid' is the column default and 'pending' is written by older flows; both
-- describe a month that is due, which is precisely when a member pays. 'paid'
-- stays excluded, so a settled month can still never be touched from the client.

DROP POLICY IF EXISTS cswo_contrib_member_link_order ON public.cswo_monthly_contributions;
CREATE POLICY cswo_contrib_member_link_order ON public.cswo_monthly_contributions
  FOR UPDATE TO authenticated
  USING (
    member_id = auth.uid()
    AND status IN ('unpaid', 'pending', 'created', 'failed', 'cancelled', 'expired')
  )
  WITH CHECK (
    member_id = auth.uid()
    AND (
      status IN ('created', 'failed', 'cancelled')
      OR (status = 'paid' AND payment_gateway IN ('upi_qr', 'bank_transfer'))
    )
  );

GRANT UPDATE (bank_account_id) ON public.cswo_monthly_contributions TO authenticated;

-- ── B2. Stage a whole batch in one call ──────────────────────────────────────
--
-- Returns the months it actually wrote. An empty array means nothing was
-- staged — the caller must not open a checkout, because no row would exist for
-- finalizePayment() to find afterwards.

CREATE OR REPLACE FUNCTION public.cswo_stage_contribution_batch(
  p_member_id uuid,
  p_year      int,
  p_months    int[],
  p_amount    numeric,
  p_gateway   text,
  p_order_id  text DEFAULT NULL,
  p_status    text DEFAULT 'created'
)
RETURNS int[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_months int[];
  v_status public.cswo_contribution_status;
BEGIN
  IF p_member_id IS NULL OR p_year IS NULL OR p_months IS NULL
     OR array_length(p_months, 1) IS NULL THEN
    RETURN ARRAY[]::int[];
  END IF;

  -- A member may only stage their own dues; finance admins may stage anyone's.
  -- auth.uid() is checked for NULL first: an unauthenticated caller would make
  -- the comparison NULL, and a NULL condition does not enter the IF, so the
  -- guard would wave them through.
  IF auth.uid() IS NULL
     OR (p_member_id <> auth.uid() AND NOT public.cswo_can_manage_finance()) THEN
    RAISE EXCEPTION 'Not allowed to stage contributions for this member';
  END IF;

  IF p_gateway NOT IN ('razorpay', 'cashfree') THEN
    RAISE EXCEPTION 'Unsupported gateway: %', p_gateway;
  END IF;

  -- 'paid' is deliberately absent: only the service-role finalizer promotes a
  -- gateway-tracked row, so this function can never be used to fake a payment.
  IF p_status NOT IN ('created', 'failed', 'cancelled') THEN
    RAISE EXCEPTION 'Unsupported status: %', p_status;
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  v_status := p_status::public.cswo_contribution_status;

  -- Months already settled are dropped, never rewritten.
  SELECT COALESCE(array_agg(m ORDER BY m), ARRAY[]::int[])
    INTO v_months
    FROM unnest(p_months) AS m
   WHERE m BETWEEN 1 AND 12
     AND NOT EXISTS (
       SELECT 1 FROM public.cswo_monthly_contributions c
        WHERE c.member_id = p_member_id AND c.year = p_year
          AND c.month = m AND c.status = 'paid'
     );

  IF array_length(v_months, 1) IS NULL THEN
    RETURN ARRAY[]::int[];
  END IF;

  INSERT INTO public.cswo_monthly_contributions AS c
    (member_id, year, month, amount, status, payment_gateway,
     cashfree_order_id, razorpay_order_id)
  SELECT
    p_member_id, p_year, m, p_amount, v_status, p_gateway,
    CASE WHEN p_gateway = 'cashfree' THEN p_order_id END,
    CASE WHEN p_gateway = 'razorpay' THEN p_order_id END
  FROM unnest(v_months) AS m
  ON CONFLICT (member_id, year, month) DO UPDATE
    SET amount            = EXCLUDED.amount,
        status            = EXCLUDED.status,
        payment_gateway   = EXCLUDED.payment_gateway,
        cashfree_order_id = COALESCE(EXCLUDED.cashfree_order_id, c.cashfree_order_id),
        razorpay_order_id = COALESCE(EXCLUDED.razorpay_order_id, c.razorpay_order_id),
        updated_at        = now()
    WHERE c.status <> 'paid';

  RETURN v_months;
END;
$fn$;

REVOKE ALL ON FUNCTION public.cswo_stage_contribution_batch(uuid, int, int[], numeric, text, text, text) FROM public;
-- Supabase's default privileges grant EXECUTE on every new public function to
-- anon, and REVOKE ... FROM public does not undo a role-specific grant. The
-- function already refuses a NULL auth.uid(), so this is defence in depth.
REVOKE EXECUTE ON FUNCTION public.cswo_stage_contribution_batch(uuid, int, int[], numeric, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.cswo_stage_contribution_batch(uuid, int, int[], numeric, text, text, text) TO authenticated;

-- ── C. Online money lands in SLICE ───────────────────────────────────────────
--
-- The nominated bank account was HDFC, but every online monthly payment the
-- organisation has actually received settled into SLICE SMALL FINANCE BANK.
-- Move the flag so the default matches reality; an explicit bank_account_id on
-- a row still wins over it.

UPDATE public.cswo_bank_accounts SET is_default = false
 WHERE is_default AND account_type <> 'cash';

UPDATE public.cswo_bank_accounts SET is_default = true
 WHERE account_type <> 'cash' AND is_active
   AND upper(label) LIKE 'SLICE%';
