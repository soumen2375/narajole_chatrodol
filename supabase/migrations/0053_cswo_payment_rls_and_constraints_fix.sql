-- ══════════════════════════════════════════════════════════════════════════════
-- 0053_cswo_payment_rls_and_constraints_fix.sql
--
-- Two independent bugs that made real customer payments invisible to the app:
--
-- 1. payment_gateway CHECK on both tables only allowed razorpay|cashfree|offline,
--    but the manual UPI-QR / Bank-transfer flows write 'upi_qr'/'bank_transfer'.
--    Every self-service manual donation/contribution insert has been violating
--    this constraint and failing outright.
--
-- 2. cswo_donations_admin_write / cswo_contrib_admin_write require
--    cswo_can_manage_finance(), so an anonymous donor or an ordinary logged-in
--    member could never INSERT their own payment row, or attach a gateway
--    order id to it. The gateway still took the money, but no Supabase record
--    ever existed for finalizePayment() to find — so it was never marked paid,
--    never receipted, and never visible to admin.
--
-- Fix: allow a donor/member to create their own row (status='created' for
-- gateway payments, or self-attested 'paid' only for manual upi_qr/bank_transfer
-- — the same trust model admin already uses for offline entries) and to update
-- only to attach a gateway order id or mark it failed/cancelled. Escalating a
-- gateway-tracked row to 'paid' remains exclusive to the service-role
-- finalizePayment() function — enforced by the UPDATE policy's WITH CHECK and
-- by column-level GRANTs that never include INSERT/UPDATE of 'paid' beyond
-- the manual-method carve-out.
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. Widen payment_gateway CHECK to allow the manual methods the UI sends ──
ALTER TABLE public.cswo_donations
  DROP CONSTRAINT IF EXISTS cswo_donations_payment_gateway_check;
ALTER TABLE public.cswo_donations
  ADD CONSTRAINT cswo_donations_payment_gateway_check
  CHECK (payment_gateway = ANY (ARRAY['razorpay','cashfree','offline','upi_qr','bank_transfer']));

ALTER TABLE public.cswo_monthly_contributions
  DROP CONSTRAINT IF EXISTS cswo_monthly_contributions_payment_gateway_check;
ALTER TABLE public.cswo_monthly_contributions
  ADD CONSTRAINT cswo_monthly_contributions_payment_gateway_check
  CHECK (payment_gateway = ANY (ARRAY['razorpay','cashfree','offline','upi_qr','bank_transfer']));

-- ── 2. cswo_donations: public/donor INSERT + narrow UPDATE ─────────────────
DROP POLICY IF EXISTS cswo_donations_public_insert ON public.cswo_donations;
CREATE POLICY cswo_donations_public_insert ON public.cswo_donations
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    (status = 'created' AND payment_gateway IN ('razorpay','cashfree'))
    OR (status = 'paid' AND payment_gateway IN ('upi_qr','bank_transfer'))
  );

DROP POLICY IF EXISTS cswo_donations_public_link_order ON public.cswo_donations;
CREATE POLICY cswo_donations_public_link_order ON public.cswo_donations
  FOR UPDATE TO anon, authenticated
  USING (status = 'created')
  WITH CHECK (
    status IN ('created','failed','cancelled')
    OR (status = 'paid' AND payment_gateway IN ('upi_qr','bank_transfer'))
  );

REVOKE UPDATE ON public.cswo_donations FROM anon, authenticated;
GRANT UPDATE (status, cashfree_order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature, updated_at)
  ON public.cswo_donations TO anon, authenticated;
GRANT INSERT ON public.cswo_donations TO anon, authenticated;

-- ── 3. cswo_monthly_contributions: member INSERT + narrow UPDATE ───────────
DROP POLICY IF EXISTS cswo_contrib_member_insert ON public.cswo_monthly_contributions;
CREATE POLICY cswo_contrib_member_insert ON public.cswo_monthly_contributions
  FOR INSERT TO authenticated
  WITH CHECK (
    member_id = auth.uid()
    AND (
      (status = 'created' AND payment_gateway IN ('razorpay','cashfree'))
      OR (status = 'paid' AND payment_gateway IN ('upi_qr','bank_transfer'))
    )
  );

-- Members self-attest 'paid' only for manual upi_qr/bank_transfer — same
-- carve-out as donations. This also covers the manual flow's upsert() on the
-- (member_id, year, month) unique key landing on the UPDATE path when a row
-- already exists from an earlier abandoned/failed attempt (USING allows
-- created/failed/cancelled so a retry can restart it) — a 'paid' row is
-- never matched by USING, so it can never be touched by the client.
DROP POLICY IF EXISTS cswo_contrib_member_link_order ON public.cswo_monthly_contributions;
CREATE POLICY cswo_contrib_member_link_order ON public.cswo_monthly_contributions
  FOR UPDATE TO authenticated
  USING (member_id = auth.uid() AND status IN ('created','failed','cancelled'))
  WITH CHECK (
    member_id = auth.uid()
    AND (
      status IN ('created','failed','cancelled')
      OR (status = 'paid' AND payment_gateway IN ('upi_qr','bank_transfer'))
    )
  );

REVOKE UPDATE ON public.cswo_monthly_contributions FROM authenticated;
GRANT UPDATE (
  status, cashfree_order_id, razorpay_order_id, razorpay_payment_id, cashfree_payment_id,
  amount, paid_at, payment_method, payment_gateway, receipt_number, updated_at
) ON public.cswo_monthly_contributions TO authenticated;
GRANT INSERT ON public.cswo_monthly_contributions TO authenticated;
