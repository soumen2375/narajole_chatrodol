-- ══════════════════════════════════════════════════════════════════════════════
-- 0052_cswo_payment_status_enum_extend.sql
--
-- The unified Cashfree/Razorpay pipeline (server/lib/payment-status.ts →
-- finalizePayment()) normalizes gateway statuses into a shared vocabulary
-- (pending / paid / failed / cancelled / expired) and writes it directly to
-- cswo_donations.status and cswo_monthly_contributions.status. Those columns
-- are Postgres enums that never had all of those labels, so any transition
-- to a missing label (e.g. 'cancelled' on a donation, or anything but
-- 'paid'/'pending' on a contribution) silently failed the UPDATE — leaving
-- records stuck at their initial status forever ("starting" that never
-- becomes "cancelled").
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TYPE public.cswo_payment_status ADD VALUE IF NOT EXISTS 'pending';
ALTER TYPE public.cswo_payment_status ADD VALUE IF NOT EXISTS 'cancelled';
ALTER TYPE public.cswo_payment_status ADD VALUE IF NOT EXISTS 'expired';

ALTER TYPE public.cswo_contribution_status ADD VALUE IF NOT EXISTS 'created';
ALTER TYPE public.cswo_contribution_status ADD VALUE IF NOT EXISTS 'failed';
ALTER TYPE public.cswo_contribution_status ADD VALUE IF NOT EXISTS 'cancelled';
ALTER TYPE public.cswo_contribution_status ADD VALUE IF NOT EXISTS 'expired';
