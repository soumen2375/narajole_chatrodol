-- Phase 5: public transparency aggregates.
-- Returns ONLY rolled-up totals (no donor/member PII). SECURITY DEFINER so it can
-- read the finance ledger past RLS, but it never exposes individual rows.

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
    'campaigns', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'name_bn', c.name_bn, 'name_en', c.name_en,
        'goal', c.goal_amount, 'raised', COALESCE(d.raised, 0)
      ) ORDER BY c.created_at DESC), '[]'::jsonb)
      FROM public.cswo_campaigns c
      LEFT JOIN (
        SELECT campaign_id, sum(amount) AS raised
        FROM public.cswo_donations
        WHERE status = 'paid' AND campaign_id IS NOT NULL
        GROUP BY campaign_id
      ) d ON d.campaign_id = c.id
      WHERE c.is_active
    ),
    'donations_count', (SELECT count(*) FROM public.cswo_donations WHERE status = 'paid'),
    'members_count',   (SELECT count(*) FROM public.cswo_members   WHERE status = 'approved')
  );
$$;

GRANT EXECUTE ON FUNCTION public.cswo_public_finance() TO anon, authenticated;
