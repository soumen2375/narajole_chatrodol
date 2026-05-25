-- Phase 4: in-app notifications / alerts

CREATE TABLE IF NOT EXISTS public.cswo_notifications (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES public.cswo_members(id) ON DELETE CASCADE,
  title        text NOT NULL,
  body         text NOT NULL DEFAULT '',
  kind         text NOT NULL DEFAULT 'info' CHECK (kind IN ('info','finance','approval','member','system')),
  link         text NOT NULL DEFAULT '',
  is_read      boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cswo_notifications_recipient_idx ON public.cswo_notifications(recipient_id, is_read, created_at DESC);

ALTER TABLE public.cswo_notifications ENABLE ROW LEVEL SECURITY;
-- Each member sees / manages only their own notifications. Inserts happen via SECURITY DEFINER triggers.
DO $$ BEGIN
  CREATE POLICY "cswo_notifications_select" ON public.cswo_notifications FOR SELECT USING (recipient_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "cswo_notifications_update" ON public.cswo_notifications FOR UPDATE USING (recipient_id = auth.uid()) WITH CHECK (recipient_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "cswo_notifications_delete" ON public.cswo_notifications FOR DELETE USING (recipient_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Fan-out helpers (definer => bypass RLS to insert for many recipients)
CREATE OR REPLACE FUNCTION public.cswo_notify_finance(p_title text, p_body text, p_kind text, p_link text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.cswo_notifications (recipient_id, title, body, kind, link)
  SELECT id, p_title, p_body, p_kind, p_link FROM public.cswo_members
  WHERE status = 'approved' AND (role = 'admin' OR can_manage_finance);
END; $$;

CREATE OR REPLACE FUNCTION public.cswo_notify_admins(p_title text, p_body text, p_kind text, p_link text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.cswo_notifications (recipient_id, title, body, kind, link)
  SELECT id, p_title, p_body, p_kind, p_link FROM public.cswo_members
  WHERE status = 'approved' AND role = 'admin';
END; $$;

-- Event triggers
CREATE OR REPLACE FUNCTION public.cswo_notify_refund()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.cswo_notify_finance('New refund request', 'A refund of ₹' || round(NEW.amount)::text || ' is awaiting approval.', 'approval', '/admin/refunds');
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.cswo_notify_payroll()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'pending' THEN
    PERFORM public.cswo_notify_finance('Payroll pending', 'A ₹' || round(NEW.amount)::text || ' payroll entry is awaiting payment.', 'approval', '/admin/payroll');
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.cswo_notify_expense()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'draft' THEN
    PERFORM public.cswo_notify_finance('Expense awaiting approval', 'A ₹' || round(NEW.amount)::text || ' expense has been recorded.', 'approval', '/admin/expenses');
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.cswo_notify_donation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'paid' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'paid') THEN
    PERFORM public.cswo_notify_finance('Donation received', '₹' || round(NEW.amount)::text || ' donation received' || COALESCE(' from ' || NULLIF(NEW.donor_name, ''), '') || '.', 'finance', '/admin/donations');
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.cswo_notify_member()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'pending' THEN
    PERFORM public.cswo_notify_admins('New member awaiting approval', COALESCE(NULLIF(NEW.full_name, ''), 'A new member') || ' has signed up.', 'member', '/admin/members');
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.cswo_notify_contact()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.cswo_notify_admins('New contact message', COALESCE(NULLIF(NEW.name, ''), 'Someone') || ' sent a message.', 'info', '/admin/messages');
  RETURN NEW;
END; $$;

CREATE OR REPLACE TRIGGER cswo_notify_refund_t   AFTER INSERT ON public.cswo_refunds          FOR EACH ROW EXECUTE FUNCTION public.cswo_notify_refund();
CREATE OR REPLACE TRIGGER cswo_notify_payroll_t  AFTER INSERT ON public.cswo_payroll          FOR EACH ROW EXECUTE FUNCTION public.cswo_notify_payroll();
CREATE OR REPLACE TRIGGER cswo_notify_expense_t  AFTER INSERT ON public.cswo_expenses         FOR EACH ROW EXECUTE FUNCTION public.cswo_notify_expense();
CREATE OR REPLACE TRIGGER cswo_notify_donation_t AFTER INSERT OR UPDATE ON public.cswo_donations FOR EACH ROW EXECUTE FUNCTION public.cswo_notify_donation();
CREATE OR REPLACE TRIGGER cswo_notify_member_t   AFTER INSERT ON public.cswo_members          FOR EACH ROW EXECUTE FUNCTION public.cswo_notify_member();
CREATE OR REPLACE TRIGGER cswo_notify_contact_t  AFTER INSERT ON public.cswo_contact_messages FOR EACH ROW EXECUTE FUNCTION public.cswo_notify_contact();
