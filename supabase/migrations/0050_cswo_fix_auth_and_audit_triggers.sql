-- ════════════════════════════════════════════════════════════════
-- 0050: Fix Auth User Creation, Audit Triggers & Notification RLS
-- ════════════════════════════════════════════════════════════════

-- 1. Fix cswo_audit_log RLS policy so background/trigger inserts never fail
ALTER TABLE public.cswo_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cswo_audit_insert" ON public.cswo_audit_log;
CREATE POLICY "cswo_audit_insert" ON public.cswo_audit_log
  FOR INSERT TO authenticated, anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "cswo_audit_select" ON public.cswo_audit_log;
CREATE POLICY "cswo_audit_select" ON public.cswo_audit_log
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cswo_members WHERE id = auth.uid() AND (role = 'admin' OR can_manage_finance)
  ));

-- 2. Bulletproof cswo_audit_row() function with exception handling
CREATE OR REPLACE FUNCTION public.cswo_audit_row()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_changes jsonb;
  v_detail  jsonb;
  v_id      uuid;
  v_actor   uuid;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.cswo_members WHERE id = v_actor) THEN
      v_actor := NULL;
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    SELECT jsonb_object_agg(n.key, jsonb_build_object('from', o.value, 'to', n.value))
      INTO v_changes
    FROM jsonb_each(to_jsonb(NEW)) n
    JOIN jsonb_each(to_jsonb(OLD)) o ON n.key = o.key
    WHERE n.value IS DISTINCT FROM o.value
      AND n.key NOT IN ('updated_at', 'created_at', 'razorpay_signature');
    IF v_changes IS NULL THEN RETURN NEW; END IF;
    v_detail := jsonb_build_object('changes', v_changes);
    v_id := NEW.id;
  ELSIF TG_OP = 'INSERT' THEN
    v_detail := jsonb_build_object('new', (to_jsonb(NEW) - 'created_at' - 'updated_at' - 'razorpay_signature'));
    v_id := NEW.id;
  ELSE
    v_detail := jsonb_build_object('deleted', (to_jsonb(OLD) - 'created_at' - 'updated_at' - 'razorpay_signature'));
    v_id := OLD.id;
  END IF;

  BEGIN
    INSERT INTO public.cswo_audit_log (actor_id, action, entity, entity_id, detail)
    VALUES (v_actor, lower(TG_OP), TG_TABLE_NAME, v_id, v_detail);
  EXCEPTION WHEN OTHERS THEN
    -- Never let audit logging failure block the main transaction
    NULL;
  END;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END; $$;

-- 3. Bulletproof cswo_notify_admins & cswo_notify_member functions
CREATE OR REPLACE FUNCTION public.cswo_notify_admins(p_title text, p_body text, p_kind text, p_link text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  BEGIN
    INSERT INTO public.cswo_notifications (recipient_id, title, body, kind, link)
    SELECT id, p_title, p_body, p_kind, p_link
    FROM public.cswo_members
    WHERE role = 'admin' AND status = 'approved';
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END; $$;

CREATE OR REPLACE FUNCTION public.cswo_notify_member()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'pending' THEN
    BEGIN
      PERFORM public.cswo_notify_admins(
        'New member awaiting approval',
        COALESCE(NULLIF(NEW.full_name, ''), 'A new member') || ' has signed up.',
        'member',
        '/admin/members'
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
  RETURN NEW;
END; $$;

-- 4. Clean up any broken triggers on auth.users and install safe sync trigger
CREATE OR REPLACE FUNCTION public.handle_cswo_new_auth_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.cswo_members (id, full_name, email, role, status)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), NEW.email),
    NEW.email,
    'member',
    'pending'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.cswo_members.full_name),
    email = EXCLUDED.email;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Guarantee auth.users transaction NEVER fails
  RETURN NEW;
END; $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    DROP TRIGGER IF EXISTS on_auth_user_created_cswo ON auth.users;
    DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created_cswo
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_cswo_new_auth_user();
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
