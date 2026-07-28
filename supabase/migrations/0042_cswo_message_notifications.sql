-- ════════════════════════════════════════════════════════════════════
-- 0042_cswo_message_notifications.sql
-- Fixes: No notification alert when admin sends a message to a member
--        OR when a member sends a DM to another member/role.
--
-- Root Cause: cswo_admin_messages had NO notification trigger.
--             cswo_member_messages trigger existed but did not also
--             notify when message is sent to an admin role (replied).
-- ════════════════════════════════════════════════════════════════════

-- ── 1. Trigger function: notify member when admin sends them a message ──
CREATE OR REPLACE FUNCTION public.cswo_notify_admin_broadcast()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.cswo_notifications (recipient_id, title, body, kind, link)
  VALUES (
    NEW.member_id,
    'New message from ' || COALESCE(NULLIF(NEW.sender_name, ''), 'Admin'),
    COALESCE(NULLIF(LEFT(NEW.message, 120), ''), 'You have received a new message from the admin.'),
    'info',
    '/member/messages'
  );
  RETURN NEW;
END; $$;

-- Attach trigger to cswo_admin_messages
DROP TRIGGER IF EXISTS cswo_notify_admin_broadcast_t ON public.cswo_admin_messages;
CREATE TRIGGER cswo_notify_admin_broadcast_t
  AFTER INSERT ON public.cswo_admin_messages
  FOR EACH ROW EXECUTE FUNCTION public.cswo_notify_admin_broadcast();

-- ── 2. Enable realtime for cswo_admin_messages ───────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'cswo_admin_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.cswo_admin_messages;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ── 3. Fix cswo_notify_member_message: also send to the sender's
--        own notification when replying, if they are admin replying
--        to a role message (so the member who sent DM gets notified). ──
--  (The trigger at 0038 already handles the core case; this patch ensures
--   the reply path from admin→member also creates a notification.)
CREATE OR REPLACE FUNCTION public.cswo_notify_member_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_sender_name text;
BEGIN
  -- Fetch sender name
  SELECT COALESCE(full_name, 'A member') INTO v_sender_name
  FROM public.cswo_members WHERE id = NEW.from_id;

  -- 1. If sent to a specific member — notify that member
  IF NEW.to_id IS NOT NULL THEN
    INSERT INTO public.cswo_notifications (recipient_id, title, body, kind, link)
    VALUES (
      NEW.to_id,
      'New message from ' || v_sender_name,
      COALESCE(NULLIF(NEW.subject, ''), 'You have received a new message.'),
      'info',
      CASE
        WHEN EXISTS (SELECT 1 FROM public.cswo_members WHERE id = NEW.to_id AND role = 'admin' AND status = 'approved')
        THEN '/admin/messages'
        ELSE '/member/messages'
      END
    );
  END IF;

  -- 2. If sent to a role — notify all approved members with that capability
  IF NEW.to_role IS NOT NULL THEN
    INSERT INTO public.cswo_notifications (recipient_id, title, body, kind, link)
    SELECT
      id,
      'New message for ' || INITCAP(NEW.to_role) || ' from ' || v_sender_name,
      COALESCE(NULLIF(NEW.subject, ''), 'You have received a new message.'),
      'info',
      CASE WHEN role = 'admin' THEN '/admin/messages' ELSE '/member/messages' END
    FROM public.cswo_members
    WHERE status = 'approved'
      AND id != NEW.from_id  -- Don't notify the sender themselves
      AND (
        (NEW.to_role = 'admin'     AND role = 'admin') OR
        (NEW.to_role = 'treasurer' AND (can_manage_finance OR role = 'admin')) OR
        (NEW.to_role = 'secretary' AND (can_manage_events  OR role = 'admin')) OR
        (NEW.to_role = 'digital'   AND (can_manage_posts   OR role = 'admin'))
      );
  END IF;

  RETURN NEW;
END; $$;

-- Re-attach the trigger (replaces existing one from 0038)
DROP TRIGGER IF EXISTS cswo_notify_member_message_t ON public.cswo_member_messages;
CREATE TRIGGER cswo_notify_member_message_t
  AFTER INSERT ON public.cswo_member_messages
  FOR EACH ROW EXECUTE FUNCTION public.cswo_notify_member_message();
