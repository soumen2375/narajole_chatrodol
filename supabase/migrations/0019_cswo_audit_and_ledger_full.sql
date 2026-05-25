-- Comprehensive financial tracking:
--   (1) A generic audit trigger that records EVERY insert/update/delete (actor + before→after)
--       on financial + member tables into cswo_audit_log.
--   (2) Ledger triggers that keep cswo_finance_ledger consistent on update/delete (sync + reverse)
--       and carry richer, human-readable notes (who paid / what for).

-- ─────────────────────────────────────────────────────────────
-- 1) Generic audit trigger
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.cswo_audit_row()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_changes jsonb;
  v_detail  jsonb;
  v_id      uuid;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    SELECT jsonb_object_agg(n.key, jsonb_build_object('from', o.value, 'to', n.value))
      INTO v_changes
    FROM jsonb_each(to_jsonb(NEW)) n
    JOIN jsonb_each(to_jsonb(OLD)) o ON n.key = o.key
    WHERE n.value IS DISTINCT FROM o.value
      AND n.key NOT IN ('updated_at', 'created_at', 'razorpay_signature');
    IF v_changes IS NULL THEN RETURN NEW; END IF;  -- nothing meaningful changed
    v_detail := jsonb_build_object('changes', v_changes);
    v_id := NEW.id;
  ELSIF TG_OP = 'INSERT' THEN
    v_detail := jsonb_build_object('new', (to_jsonb(NEW) - 'created_at' - 'updated_at' - 'razorpay_signature'));
    v_id := NEW.id;
  ELSE
    v_detail := jsonb_build_object('deleted', (to_jsonb(OLD) - 'created_at' - 'updated_at' - 'razorpay_signature'));
    v_id := OLD.id;
  END IF;

  INSERT INTO public.cswo_audit_log (actor_id, action, entity, entity_id, detail)
  VALUES (auth.uid(), lower(TG_OP), TG_TABLE_NAME, v_id, v_detail);

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END; $$;

CREATE OR REPLACE TRIGGER cswo_audit_donations     AFTER INSERT OR UPDATE OR DELETE ON public.cswo_donations             FOR EACH ROW EXECUTE FUNCTION public.cswo_audit_row();
CREATE OR REPLACE TRIGGER cswo_audit_contributions AFTER INSERT OR UPDATE OR DELETE ON public.cswo_monthly_contributions FOR EACH ROW EXECUTE FUNCTION public.cswo_audit_row();
CREATE OR REPLACE TRIGGER cswo_audit_expenses      AFTER INSERT OR UPDATE OR DELETE ON public.cswo_expenses              FOR EACH ROW EXECUTE FUNCTION public.cswo_audit_row();
CREATE OR REPLACE TRIGGER cswo_audit_budgets       AFTER INSERT OR UPDATE OR DELETE ON public.cswo_budgets               FOR EACH ROW EXECUTE FUNCTION public.cswo_audit_row();
CREATE OR REPLACE TRIGGER cswo_audit_funds         AFTER INSERT OR UPDATE OR DELETE ON public.cswo_funds                 FOR EACH ROW EXECUTE FUNCTION public.cswo_audit_row();
CREATE OR REPLACE TRIGGER cswo_audit_members       AFTER INSERT OR UPDATE OR DELETE ON public.cswo_members               FOR EACH ROW EXECUTE FUNCTION public.cswo_audit_row();

-- ─────────────────────────────────────────────────────────────
-- 2) Ledger: sync on update, reverse on delete, richer notes
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.cswo_ledger_from_donation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
        SET amount = NEW.amount, fund_id = NEW.fund_id, occurred_at = COALESCE(NEW.created_at, now()),
            actor_id = NEW.member_id, note = v_note
      WHERE entry_type = 'donation' AND source_id = NEW.id;
    ELSE
      INSERT INTO public.cswo_finance_ledger (entry_type, source_id, fund_id, direction, amount, occurred_at, actor_id, note)
      VALUES ('donation', NEW.id, NEW.fund_id, 'credit', NEW.amount, COALESCE(NEW.created_at, now()), NEW.member_id, v_note);
    END IF;
  ELSE
    DELETE FROM public.cswo_finance_ledger WHERE entry_type = 'donation' AND source_id = NEW.id;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.cswo_ledger_from_contribution()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_note text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.cswo_finance_ledger WHERE entry_type = 'contribution' AND source_id = OLD.id;
    RETURN OLD;
  END IF;
  IF NEW.status = 'paid' AND NEW.amount > 0 THEN
    v_note := COALESCE((SELECT full_name FROM public.cswo_members m WHERE m.id = NEW.member_id), 'Member') || ' — monthly contribution';
    IF EXISTS (SELECT 1 FROM public.cswo_finance_ledger WHERE entry_type = 'contribution' AND source_id = NEW.id) THEN
      UPDATE public.cswo_finance_ledger
        SET amount = NEW.amount, occurred_at = COALESCE(NEW.paid_at, NEW.created_at, now()), actor_id = NEW.recorded_by, note = v_note
      WHERE entry_type = 'contribution' AND source_id = NEW.id;
    ELSE
      INSERT INTO public.cswo_finance_ledger (entry_type, source_id, fund_id, direction, amount, occurred_at, actor_id, note)
      VALUES ('contribution', NEW.id, NULL, 'credit', NEW.amount, COALESCE(NEW.paid_at, NEW.created_at, now()), NEW.recorded_by, v_note);
    END IF;
  ELSE
    DELETE FROM public.cswo_finance_ledger WHERE entry_type = 'contribution' AND source_id = NEW.id;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.cswo_ledger_from_expense()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
        SET amount = NEW.amount, fund_id = NEW.fund_id, occurred_at = COALESCE(NEW.created_at, now()),
            actor_id = COALESCE(NEW.approved_by, NEW.recorded_by), note = v_note
      WHERE entry_type = 'expense' AND source_id = NEW.id;
    ELSE
      INSERT INTO public.cswo_finance_ledger (entry_type, source_id, fund_id, direction, amount, occurred_at, actor_id, note)
      VALUES ('expense', NEW.id, NEW.fund_id, 'debit', NEW.amount, COALESCE(NEW.created_at, now()), COALESCE(NEW.approved_by, NEW.recorded_by), v_note);
    END IF;
  ELSE
    DELETE FROM public.cswo_finance_ledger WHERE entry_type = 'expense' AND source_id = NEW.id;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE TRIGGER cswo_donations_ledger     AFTER INSERT OR UPDATE OR DELETE ON public.cswo_donations             FOR EACH ROW EXECUTE FUNCTION public.cswo_ledger_from_donation();
CREATE OR REPLACE TRIGGER cswo_contributions_ledger AFTER INSERT OR UPDATE OR DELETE ON public.cswo_monthly_contributions FOR EACH ROW EXECUTE FUNCTION public.cswo_ledger_from_contribution();
CREATE OR REPLACE TRIGGER cswo_expenses_ledger      AFTER INSERT OR UPDATE OR DELETE ON public.cswo_expenses              FOR EACH ROW EXECUTE FUNCTION public.cswo_ledger_from_expense();
