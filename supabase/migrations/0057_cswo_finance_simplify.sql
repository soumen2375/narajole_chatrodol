-- Finance simplification: drop Payroll, Grants, Approvals, Campaigns and Refunds.
--
-- The five features were removed from the app in favour of a smaller Finance
-- module (Dashboard, Budgets, Monthly Donation, Donations, Expenses, Invoices,
-- Bank, Ledger, Reports, Compliance). Expense approval now happens inline on
-- the Expenses page, so the separate Approvals queue is gone too.
--
-- All five tables were empty when this migration was written, so nothing is
-- lost. Verify before applying:
--   SELECT (SELECT count(*) FROM public.cswo_payroll)
--        + (SELECT count(*) FROM public.cswo_grants)
--        + (SELECT count(*) FROM public.cswo_grant_tranches)
--        + (SELECT count(*) FROM public.cswo_campaigns)
--        + (SELECT count(*) FROM public.cswo_refunds);
--
-- The cswo_ledger_entry_type enum keeps its 'payroll' and 'grant' values.
-- Removing an enum value means recreating the type and rewriting every
-- dependent column; unused values cost nothing, so they stay.

-- 1. Ledger, notification and bank-sync plumbing for the dropped tables ───────
DROP FUNCTION IF EXISTS public.cswo_ledger_from_payroll()        CASCADE;
DROP FUNCTION IF EXISTS public.cswo_ledger_from_grant_tranche()  CASCADE;
DROP FUNCTION IF EXISTS public.cswo_sync_payroll_bank_txn()      CASCADE;
DROP FUNCTION IF EXISTS public.cswo_notify_payroll()             CASCADE;
DROP FUNCTION IF EXISTS public.cswo_notify_refund()              CASCADE;

-- 2. Donations no longer belong to a campaign ────────────────────────────────
ALTER TABLE public.cswo_donations DROP COLUMN IF EXISTS campaign_id;

-- 3. The tables themselves (CASCADE takes their policies, indexes, triggers) ──
DROP TABLE IF EXISTS public.cswo_grant_tranches CASCADE;
DROP TABLE IF EXISTS public.cswo_grants         CASCADE;
DROP TABLE IF EXISTS public.cswo_payroll        CASCADE;
DROP TABLE IF EXISTS public.cswo_refunds        CASCADE;
DROP TABLE IF EXISTS public.cswo_campaigns      CASCADE;

-- 4. Rebuild the public transparency aggregate without the campaigns block ───
CREATE OR REPLACE FUNCTION public.cswo_public_finance()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'generated_at', now(),
    'totals', (
      SELECT jsonb_build_object(
        'income',  COALESCE(sum(amount) FILTER (WHERE direction = 'credit'), 0),
        'expense', COALESCE(sum(amount) FILTER (WHERE direction = 'debit'), 0),
        'balance', COALESCE(sum(amount) FILTER (WHERE direction = 'credit'), 0)
                 - COALESCE(sum(amount) FILTER (WHERE direction = 'debit'), 0)
      ) FROM public.cswo_finance_ledger
    ),
    'by_type', (
      SELECT COALESCE(jsonb_object_agg(entry_type, amt), '{}'::jsonb)
      FROM (SELECT entry_type, sum(amount) AS amt FROM public.cswo_finance_ledger GROUP BY entry_type) s
    ),
    'funds', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'name_bn', f.name_bn, 'name_en', f.name_en,
        'income',  COALESCE(l.cr, 0),
        'expense', COALESCE(l.db, 0),
        'balance', COALESCE(l.cr, 0) - COALESCE(l.db, 0)
      ) ORDER BY f.sort_order), '[]'::jsonb)
      FROM public.cswo_funds f
      LEFT JOIN (
        SELECT fund_id,
               sum(amount) FILTER (WHERE direction = 'credit') AS cr,
               sum(amount) FILTER (WHERE direction = 'debit')  AS db
        FROM public.cswo_finance_ledger GROUP BY fund_id
      ) l ON l.fund_id = f.id
      WHERE f.is_active
    ),
    'years', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'fy', fy_start::text || '-' || right((fy_start + 1)::text, 2),
        'income', cr, 'expense', db
      ) ORDER BY fy_start DESC), '[]'::jsonb)
      FROM (
        SELECT fy_start,
               COALESCE(sum(amount) FILTER (WHERE direction = 'credit'), 0) AS cr,
               COALESCE(sum(amount) FILTER (WHERE direction = 'debit'), 0)  AS db
        FROM (
          SELECT amount, direction,
                 (CASE WHEN extract(month FROM occurred_at) >= 4
                       THEN extract(year FROM occurred_at)::int
                       ELSE extract(year FROM occurred_at)::int - 1 END) AS fy_start
          FROM public.cswo_finance_ledger
        ) z GROUP BY fy_start
      ) y
    ),
    'donations_count', (SELECT count(*) FROM public.cswo_donations WHERE status = 'paid'),
    'members_count',   (SELECT count(*) FROM public.cswo_members   WHERE status = 'approved')
  );
$$;

GRANT EXECUTE ON FUNCTION public.cswo_public_finance() TO anon, authenticated;
