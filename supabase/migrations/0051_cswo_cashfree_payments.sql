-- ══════════════════════════════════════════════════════════════════════════════
-- 0051_cswo_cashfree_payments.sql
-- Adds Cashfree payment gateway support alongside existing Razorpay columns.
-- Also adds a site_settings table for admin-controlled gateway switching.
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. Extend cswo_donations with Cashfree columns ────────────────────────────

ALTER TABLE public.cswo_donations
  ADD COLUMN IF NOT EXISTS cashfree_order_id   text,
  ADD COLUMN IF NOT EXISTS cashfree_payment_id  text,
  ADD COLUMN IF NOT EXISTS payment_gateway      text NOT NULL DEFAULT 'razorpay';

-- Index for Cashfree order lookup
CREATE INDEX IF NOT EXISTS idx_donations_cashfree_order
  ON public.cswo_donations (cashfree_order_id)
  WHERE cashfree_order_id IS NOT NULL;

-- ── 2. Extend cswo_monthly_contributions with Cashfree columns ────────────────

ALTER TABLE public.cswo_monthly_contributions
  ADD COLUMN IF NOT EXISTS cashfree_order_id   text,
  ADD COLUMN IF NOT EXISTS cashfree_payment_id  text,
  ADD COLUMN IF NOT EXISTS payment_gateway      text NOT NULL DEFAULT 'razorpay';

CREATE INDEX IF NOT EXISTS idx_contributions_cashfree_order
  ON public.cswo_monthly_contributions (cashfree_order_id)
  WHERE cashfree_order_id IS NOT NULL;

-- ── 3. Site settings table for admin gateway control ─────────────────────────

CREATE TABLE IF NOT EXISTS public.cswo_site_settings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key         text UNIQUE NOT NULL,
  value       text NOT NULL,
  updated_by  uuid REFERENCES public.cswo_members(id) ON DELETE SET NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Seed default gateway mode
INSERT INTO public.cswo_site_settings (key, value)
VALUES ('payment_gateway_mode', 'both')
ON CONFLICT (key) DO NOTHING;

-- RLS: public can SELECT (for reading gateway mode on frontend)
ALTER TABLE public.cswo_site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_site_settings" ON public.cswo_site_settings;
CREATE POLICY "public_read_site_settings"
  ON public.cswo_site_settings
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "admin_manage_site_settings" ON public.cswo_site_settings;
CREATE POLICY "admin_manage_site_settings"
  ON public.cswo_site_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cswo_members
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cswo_members
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ── 4. Comment documentation ──────────────────────────────────────────────────

COMMENT ON COLUMN public.cswo_donations.payment_gateway
  IS 'Which payment gateway processed this donation: razorpay | cashfree | offline';

COMMENT ON COLUMN public.cswo_monthly_contributions.payment_gateway
  IS 'Which payment gateway processed this contribution: razorpay | cashfree | offline';

COMMENT ON TABLE public.cswo_site_settings
  IS 'Admin-controlled site-wide settings. Key: payment_gateway_mode → both | razorpay | cashfree';
