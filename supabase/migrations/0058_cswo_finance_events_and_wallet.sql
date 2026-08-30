-- Finance, rebuilt around events and two money channels.
--
-- OUT: the fund concept and budget management. Funds were an accounting
--      abstraction nobody was using — 0 donations and 0 expenses referenced one.
-- IN:  events as the single allocation dimension, and two places money can sit:
--      a bank (everything online) and a cash wallet (everything offline).
--
-- Money now moves in one shape, whichever door it comes through:
--   donation / dues / expense  →  ledger entry  →  bank or wallet transaction
-- and each one can optionally be allocated to an event.
--
-- Safe to apply: 5 fund rows and 3 budget rows are discarded (configuration,
-- not transactions). No donation, expense, contribution, bank transaction or
-- event record is lost.

-- ── 1. Donations record how they were paid ──────────────────────────────────
-- Without this there is no way to tell a cash donation (wallet) from an online
-- one (bank), which is the split the dashboard is built on.
ALTER TABLE public.cswo_donations
  ADD COLUMN IF NOT EXISTS payment_method public.cswo_payment_method;

UPDATE public.cswo_donations
   SET payment_method = CASE
         WHEN payment_gateway IN ('razorpay', 'cashfree') THEN 'online'::public.cswo_payment_method
         ELSE 'cash'::public.cswo_payment_method
       END
 WHERE payment_method IS NULL;

ALTER TABLE public.cswo_donations
  ALTER COLUMN payment_method SET DEFAULT 'online'::public.cswo_payment_method;
ALTER TABLE public.cswo_donations
  ALTER COLUMN payment_method SET NOT NULL;

-- ── 2. The cash wallet ──────────────────────────────────────────────────────
-- Modelled as an account of type 'cash' so it inherits the opening balance,
-- the transaction store and the balance maths the bank accounts already have.
INSERT INTO public.cswo_bank_accounts
  (label, bank_name, account_name, account_number, account_type, opening_balance, is_active, sort_order, note)
SELECT 'CASH WALLET', '', 'Offline cash in hand', '', 'cash', 0, true, 99,
       'Offline cash. Every cash donation, cash dues payment and cash expense lands here.'
WHERE NOT EXISTS (
  SELECT 1 FROM public.cswo_bank_accounts WHERE account_type = 'cash'
);

-- ── 3. The ledger allocates to events, not funds ────────────────────────────
ALTER TABLE public.cswo_finance_ledger
  ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.cswo_events(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS cswo_finance_ledger_event_idx
  ON public.cswo_finance_ledger(event_id);

-- ── 4. Expenses are final when recorded ─────────────────────────────────────
-- Approvals and budgets are gone, so a recorded expense is real money already
-- spent. 'approved' stays the value the ledger and bank triggers look for.
ALTER TABLE public.cswo_expenses
  ALTER COLUMN status SET DEFAULT 'approved'::public.cswo_expense_status;

-- ── 5. Ledger triggers: drop fund, carry the event ──────────────────────────
CREATE OR REPLACE FUNCTION public.cswo_ledger_from_donation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_note text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.cswo_finance_ledger WHERE entry_type = 'donation' AND source_id = OLD.id;
    RETURN OLD;
  END IF;
  IF NEW.status = 'paid' AND NEW.amount > 0 THEN
    v_note := (CASE WHEN NEW.is_anonymous THEN 'Anonymous' ELSE COALESCE(NULLIF(NEW.donor_name, ''), 'Donor') END)
              || COALESCE(' — ' || NULLIF(NEW.purpose, ''), '');
    IF EXISTS (SELECT 1 FROM public.cswo_finance_ledger WHERE entry_type = 'donation' AND source_id = NEW.id) THEN
      UPDATE public.cswo_finance_ledger
         SET amount = NEW.amount, event_id = NEW.event_id, occurred_at = COALESCE(NEW.created_at, now()),
             actor_id = NEW.member_id, note = v_note
       WHERE entry_type = 'donation' AND source_id = NEW.id;
    ELSE
      INSERT INTO public.cswo_finance_ledger (entry_type, source_id, event_id, direction, amount, occurred_at, actor_id, note)
      VALUES ('donation', NEW.id, NEW.event_id, 'credit', NEW.amount, COALESCE(NEW.created_at, now()), NEW.member_id, v_note);
    END IF;
  ELSE
    DELETE FROM public.cswo_finance_ledger WHERE entry_type = 'donation' AND source_id = NEW.id;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.cswo_ledger_from_expense()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_note text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.cswo_finance_ledger WHERE entry_type = 'expense' AND source_id = OLD.id;
    RETURN OLD;
  END IF;
  IF NEW.status = 'approved' AND NEW.amount > 0 THEN
    v_note := COALESCE(NULLIF(NEW.description, ''), NULLIF(NEW.vendor, ''), 'Expense')
              || COALESCE(' — ' || NULLIF(NEW.vendor, ''), '');
    IF EXISTS (SELECT 1 FROM public.cswo_finance_ledger WHERE entry_type = 'expense' AND source_id = NEW.id) THEN
      UPDATE public.cswo_finance_ledger
         SET amount = NEW.amount, event_id = NEW.event_id, occurred_at = COALESCE(NEW.created_at, now()),
             actor_id = COALESCE(NEW.approved_by, NEW.recorded_by), note = v_note
       WHERE entry_type = 'expense' AND source_id = NEW.id;
    ELSE
      INSERT INTO public.cswo_finance_ledger (entry_type, source_id, event_id, direction, amount, occurred_at, actor_id, note)
      VALUES ('expense', NEW.id, NEW.event_id, 'debit', NEW.amount, COALESCE(NEW.created_at, now()), COALESCE(NEW.approved_by, NEW.recorded_by), v_note);
    END IF;
  ELSE
    DELETE FROM public.cswo_finance_ledger WHERE entry_type = 'expense' AND source_id = NEW.id;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.cswo_ledger_from_contribution()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_note text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.cswo_finance_ledger WHERE entry_type = 'contribution' AND source_id = OLD.id;
    RETURN OLD;
  END IF;
  IF NEW.status = 'paid' AND NEW.amount > 0 THEN
    v_note := COALESCE((SELECT full_name FROM public.cswo_members m WHERE m.id = NEW.member_id), 'Member') || ' — monthly donation';
    IF EXISTS (SELECT 1 FROM public.cswo_finance_ledger WHERE entry_type = 'contribution' AND source_id = NEW.id) THEN
      UPDATE public.cswo_finance_ledger
         SET amount = NEW.amount, occurred_at = COALESCE(NEW.paid_at, NEW.created_at, now()),
             actor_id = NEW.recorded_by, note = v_note
       WHERE entry_type = 'contribution' AND source_id = NEW.id;
    ELSE
      INSERT INTO public.cswo_finance_ledger (entry_type, source_id, event_id, direction, amount, occurred_at, actor_id, note)
      VALUES ('contribution', NEW.id, NULL, 'credit', NEW.amount, COALESCE(NEW.paid_at, NEW.created_at, now()), NEW.recorded_by, v_note);
    END IF;
  ELSE
    DELETE FROM public.cswo_finance_ledger WHERE entry_type = 'contribution' AND source_id = NEW.id;
  END IF;
  RETURN NEW;
END; $$;

-- ── 6. Channel routing: cash → wallet, everything else → bank ───────────────
-- One helper so all three sync triggers pick the destination the same way.
CREATE OR REPLACE FUNCTION public.cswo_money_account(p_method text, p_chosen uuid)
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_acct uuid;
BEGIN
  IF p_chosen IS NOT NULL THEN
    RETURN p_chosen;
  END IF;
  IF p_method = 'cash' THEN
    SELECT id INTO v_acct FROM public.cswo_bank_accounts
     WHERE account_type = 'cash' AND is_active = true
     ORDER BY sort_order, created_at LIMIT 1;
  ELSE
    SELECT id INTO v_acct FROM public.cswo_bank_accounts
     WHERE account_type IN ('savings', 'current') AND is_active = true
     ORDER BY sort_order, created_at LIMIT 1;
  END IF;
  IF v_acct IS NULL THEN
    SELECT id INTO v_acct FROM public.cswo_bank_accounts
     WHERE is_active = true ORDER BY sort_order, created_at LIMIT 1;
  END IF;
  RETURN v_acct;
END; $$;

CREATE OR REPLACE FUNCTION public.cswo_sync_donation_bank_txn()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_acct_id uuid; v_donor text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.cswo_bank_transactions WHERE reference = 'DON-' || OLD.id::text;
    RETURN OLD;
  END IF;

  IF NEW.status = 'paid' AND NEW.amount > 0 THEN
    v_acct_id := public.cswo_money_account(NEW.payment_method::text, NEW.bank_account_id);
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
        VALUES (v_acct_id, NEW.created_at::date,
                'Donation received — ' || v_donor || COALESCE(' (' || NULLIF(NEW.purpose, '') || ')', ''),
                'DON-' || NEW.id::text, 'credit', NEW.amount, true, NEW.member_id);
      END IF;
    END IF;
  ELSE
    DELETE FROM public.cswo_bank_transactions WHERE reference = 'DON-' || NEW.id::text;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.cswo_sync_expense_bank_txn()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_acct_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.cswo_bank_transactions WHERE reference = 'EXP-' || OLD.id::text;
    RETURN OLD;
  END IF;

  IF NEW.status = 'approved' AND NEW.amount > 0 THEN
    v_acct_id := public.cswo_money_account(NEW.payment_method::text, NEW.bank_account_id);
    IF v_acct_id IS NOT NULL THEN
      IF EXISTS (SELECT 1 FROM public.cswo_bank_transactions WHERE reference = 'EXP-' || NEW.id::text) THEN
        UPDATE public.cswo_bank_transactions
           SET account_id = v_acct_id, txn_date = NEW.spent_on,
               description = COALESCE(NULLIF(NEW.description, ''), 'Expense') || ' — ' || NEW.vendor,
               amount = NEW.amount, updated_at = now()
         WHERE reference = 'EXP-' || NEW.id::text;
      ELSE
        INSERT INTO public.cswo_bank_transactions (account_id, txn_date, description, reference, direction, amount, reconciled, created_by)
        VALUES (v_acct_id, NEW.spent_on,
                COALESCE(NULLIF(NEW.description, ''), 'Expense') || ' — ' || NEW.vendor,
                'EXP-' || NEW.id::text, 'debit', NEW.amount, true, COALESCE(NEW.approved_by, NEW.recorded_by));
      END IF;
    END IF;
  ELSE
    DELETE FROM public.cswo_bank_transactions WHERE reference = 'EXP-' || NEW.id::text;
  END IF;
  RETURN NEW;
END; $$;

-- Monthly dues had no bank/wallet sync at all — cash dues never reached a
-- balance. They do now, through the same routing.
CREATE OR REPLACE FUNCTION public.cswo_sync_contribution_bank_txn()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_acct_id uuid; v_member text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.cswo_bank_transactions WHERE reference = 'CON-' || OLD.id::text;
    RETURN OLD;
  END IF;

  IF NEW.status = 'paid' AND NEW.amount > 0 THEN
    v_acct_id := public.cswo_money_account(COALESCE(NEW.payment_method, 'online'), NULL);
    IF v_acct_id IS NOT NULL THEN
      v_member := COALESCE((SELECT full_name FROM public.cswo_members m WHERE m.id = NEW.member_id), 'Member');
      IF EXISTS (SELECT 1 FROM public.cswo_bank_transactions WHERE reference = 'CON-' || NEW.id::text) THEN
        UPDATE public.cswo_bank_transactions
           SET account_id = v_acct_id, txn_date = COALESCE(NEW.paid_at, NEW.created_at)::date,
               description = 'Monthly donation — ' || v_member,
               amount = NEW.amount, updated_at = now()
         WHERE reference = 'CON-' || NEW.id::text;
      ELSE
        INSERT INTO public.cswo_bank_transactions (account_id, txn_date, description, reference, direction, amount, reconciled, created_by)
        VALUES (v_acct_id, COALESCE(NEW.paid_at, NEW.created_at)::date,
                'Monthly donation — ' || v_member,
                'CON-' || NEW.id::text, 'credit', NEW.amount, true, NEW.recorded_by);
      END IF;
    END IF;
  ELSE
    DELETE FROM public.cswo_bank_transactions WHERE reference = 'CON-' || NEW.id::text;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS cswo_sync_contribution_bank_txn_t ON public.cswo_monthly_contributions;
CREATE TRIGGER cswo_sync_contribution_bank_txn_t
AFTER INSERT OR UPDATE OR DELETE ON public.cswo_monthly_contributions
FOR EACH ROW EXECUTE FUNCTION public.cswo_sync_contribution_bank_txn();

-- ── 7. Backfill: give existing ledger rows their event, then drop funds ─────
UPDATE public.cswo_finance_ledger l
   SET event_id = d.event_id
  FROM public.cswo_donations d
 WHERE l.entry_type = 'donation' AND l.source_id = d.id AND d.event_id IS NOT NULL;

UPDATE public.cswo_finance_ledger l
   SET event_id = e.event_id
  FROM public.cswo_expenses e
 WHERE l.entry_type = 'expense' AND l.source_id = e.id AND e.event_id IS NOT NULL;

ALTER TABLE public.cswo_finance_ledger DROP COLUMN IF EXISTS fund_id;
ALTER TABLE public.cswo_donations       DROP COLUMN IF EXISTS fund_id;
ALTER TABLE public.cswo_expenses        DROP COLUMN IF EXISTS fund_id;
ALTER TABLE public.cswo_invoices        DROP COLUMN IF EXISTS fund_id;

-- cswo_events_with_status lists its columns explicitly, so the view has to be
-- rebuilt without fund_id before the column itself can go.
DROP VIEW IF EXISTS public.cswo_events_with_status;
ALTER TABLE public.cswo_events DROP COLUMN IF EXISTS fund_id;

CREATE VIEW public.cswo_events_with_status AS
SELECT id, title, description, event_date, location, type, featured_image,
       created_by, created_at, updated_at, category, event_code, status,
       end_date, start_time, end_time, district, state, pincode, map_link,
       expected_participants, form_type, latitude, longitude,
       attendance_radius, attendance_qr_token, attendance_enabled,
       attendance_start_time, attendance_end_time, post_id, registration_link,
       capacity, registration_deadline, is_free, price, banner_image, timezone,
       organizer,
       CASE
         WHEN CURRENT_DATE < event_date THEN 'upcoming'::text
         WHEN CURRENT_DATE >= event_date AND CURRENT_DATE <= COALESCE(end_date, event_date) THEN 'ongoing'::text
         ELSE 'past'::text
       END AS computed_status,
       CASE WHEN CURRENT_DATE <= COALESCE(end_date, event_date) THEN event_date ELSE NULL::date END AS upcoming_sort,
       CASE WHEN CURRENT_DATE >  COALESCE(end_date, event_date) THEN event_date ELSE NULL::date END AS past_sort
  FROM public.cswo_events e;

GRANT SELECT ON public.cswo_events_with_status TO anon, authenticated, service_role;

DROP TABLE IF EXISTS public.cswo_budgets CASCADE;
DROP TABLE IF EXISTS public.cswo_funds   CASCADE;

-- ── 8. Public transparency aggregate, rebuilt on events ────────────────────
CREATE OR REPLACE FUNCTION public.cswo_public_finance()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
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
    'events', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'title', e.title,
        'income',  COALESCE(l.cr, 0),
        'expense', COALESCE(l.db, 0),
        'balance', COALESCE(l.cr, 0) - COALESCE(l.db, 0)
      ) ORDER BY e.event_date DESC), '[]'::jsonb)
      FROM public.cswo_events e
      JOIN (
        SELECT event_id,
               sum(amount) FILTER (WHERE direction = 'credit') AS cr,
               sum(amount) FILTER (WHERE direction = 'debit')  AS db
        FROM public.cswo_finance_ledger WHERE event_id IS NOT NULL GROUP BY event_id
      ) l ON l.event_id = e.id
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
