-- Let the monthly-dues tracker actually save.
--
-- The bug: every cell click on /admin/contributions came back 403. The write
-- is a PostgREST upsert, which compiles to
--
--   INSERT INTO cswo_monthly_contributions (member_id, year, month, amount,
--                                           status, paid_at, payment_method, recorded_by)
--   VALUES (...)
--   ON CONFLICT (member_id, year, month) DO UPDATE
--      SET member_id = excluded.member_id, year = excluded.year,
--          month = excluded.month, amount = excluded.amount, ...
--
-- ON CONFLICT DO UPDATE assigns *every* column in the payload, including the
-- three conflict-key columns. 0053 revoked table-wide UPDATE and re-granted a
-- narrow column list (so members could not mark themselves paid); 0059 added
-- `note` and `recorded_by` after hitting the same class of bug. Neither grant
-- covered member_id / year / month, so Postgres refused the statement with
-- 42501 `permission denied` before RLS was ever consulted, and PostgREST
-- returned 403. The table has stood at zero rows as a result.
--
-- Why widening these three is safe: they are the natural key, and the upsert
-- only ever rewrites them with the values it just matched on. Who may touch
-- which row is still decided by RLS, which is untouched here:
--   * cswo_contrib_admin_write      → cswo_can_manage_finance() for everything
--   * cswo_contrib_member_link_order → own row only, and WITH CHECK pins
--                                      member_id = auth.uid(), so a member
--                                      still cannot reassign a row to anyone else.
--
-- Deliberately NOT done: `GRANT UPDATE ON ... TO authenticated`. That would
-- hand back the payment-tampering surface 0053 closed on purpose.

GRANT UPDATE (member_id, year, month)
  ON public.cswo_monthly_contributions
  TO authenticated;

-- 0053 revoked UPDATE from `authenticated` but not from `anon`, leaving the
-- anonymous role with a *wider* grant than the signed-in one. RLS blocks anon
-- either way, but the asymmetry is backwards; bring it in line with the
-- treatment cswo_donations already gets.
REVOKE UPDATE ON public.cswo_monthly_contributions FROM anon;
