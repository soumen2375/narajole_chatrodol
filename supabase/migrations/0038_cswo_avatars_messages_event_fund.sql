-- ════════════════════════════════════════════════════════════════
-- 0038: avatars bucket · admin_messages · member DM · event fund
-- ════════════════════════════════════════════════════════════════

-- ── 1. Avatars storage bucket (2 MB, public) ─────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars','avatars',true,2097152,
        ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "avatars_select" ON storage.objects;
CREATE POLICY "avatars_select" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_insert" ON storage.objects;
CREATE POLICY "avatars_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_update" ON storage.objects;
CREATE POLICY "avatars_update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_delete" ON storage.objects;
CREATE POLICY "avatars_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'avatars');

-- ── 2. Admin broadcast messages (was missing from migrations) ────
CREATE TABLE IF NOT EXISTS public.cswo_admin_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   uuid NOT NULL REFERENCES public.cswo_members(id) ON DELETE CASCADE,
  sender_name text NOT NULL DEFAULT '',
  message     text NOT NULL DEFAULT '',
  is_read     boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cswo_admin_messages_member_idx ON public.cswo_admin_messages(member_id);
ALTER TABLE public.cswo_admin_messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "cswo_admin_messages_select" ON public.cswo_admin_messages
    FOR SELECT USING (
      member_id = auth.uid() OR
      EXISTS (SELECT 1 FROM public.cswo_members WHERE id = auth.uid() AND role = 'admin' AND status = 'approved')
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "cswo_admin_messages_write" ON public.cswo_admin_messages
    FOR ALL
    USING  (EXISTS (SELECT 1 FROM public.cswo_members WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.cswo_members WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 3. Member-to-member / member-to-role messages ────────────────
CREATE TABLE IF NOT EXISTS public.cswo_member_messages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_id    uuid NOT NULL REFERENCES public.cswo_members(id) ON DELETE CASCADE,
  to_id      uuid REFERENCES public.cswo_members(id) ON DELETE SET NULL,
  to_role    text CHECK (to_role IN ('admin','treasurer','secretary','digital')),
  subject    text NOT NULL DEFAULT '',
  body       text NOT NULL DEFAULT '',
  is_read    boolean NOT NULL DEFAULT false,
  parent_id  uuid REFERENCES public.cswo_member_messages(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cswo_mm_has_recipient CHECK (to_id IS NOT NULL OR to_role IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS cswo_member_messages_from_idx ON public.cswo_member_messages(from_id);
CREATE INDEX IF NOT EXISTS cswo_member_messages_to_idx   ON public.cswo_member_messages(to_id);
ALTER TABLE public.cswo_member_messages ENABLE ROW LEVEL SECURITY;

-- Sender or matching recipient can SELECT
DO $$ BEGIN
  CREATE POLICY "cswo_member_messages_select" ON public.cswo_member_messages
    FOR SELECT USING (
      from_id = auth.uid() OR
      to_id   = auth.uid() OR
      (to_role = 'admin'     AND EXISTS (SELECT 1 FROM public.cswo_members WHERE id = auth.uid() AND role = 'admin' AND status = 'approved')) OR
      (to_role = 'treasurer' AND EXISTS (SELECT 1 FROM public.cswo_members WHERE id = auth.uid() AND status = 'approved' AND (can_manage_finance OR role = 'admin'))) OR
      (to_role = 'secretary' AND EXISTS (SELECT 1 FROM public.cswo_members WHERE id = auth.uid() AND status = 'approved' AND (can_manage_events  OR role = 'admin'))) OR
      (to_role = 'digital'   AND EXISTS (SELECT 1 FROM public.cswo_members WHERE id = auth.uid() AND status = 'approved' AND (can_manage_posts   OR role = 'admin')))
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Approved members can send
DO $$ BEGIN
  CREATE POLICY "cswo_member_messages_insert" ON public.cswo_member_messages
    FOR INSERT WITH CHECK (
      from_id = auth.uid() AND
      EXISTS (SELECT 1 FROM public.cswo_members WHERE id = auth.uid() AND status = 'approved')
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Recipients can mark as read
DO $$ BEGIN
  CREATE POLICY "cswo_member_messages_update" ON public.cswo_member_messages
    FOR UPDATE USING (
      to_id = auth.uid() OR
      (to_role = 'admin'     AND EXISTS (SELECT 1 FROM public.cswo_members WHERE id = auth.uid() AND role = 'admin')) OR
      (to_role = 'treasurer' AND EXISTS (SELECT 1 FROM public.cswo_members WHERE id = auth.uid() AND (can_manage_finance OR role = 'admin'))) OR
      (to_role = 'secretary' AND EXISTS (SELECT 1 FROM public.cswo_members WHERE id = auth.uid() AND (can_manage_events  OR role = 'admin'))) OR
      (to_role = 'digital'   AND EXISTS (SELECT 1 FROM public.cswo_members WHERE id = auth.uid() AND (can_manage_posts   OR role = 'admin')))
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 4. Add fund_id + form_type to cswo_events ────────────────────
ALTER TABLE public.cswo_events
  ADD COLUMN IF NOT EXISTS fund_id   uuid REFERENCES public.cswo_funds(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS form_type text NOT NULL DEFAULT 'general'
    CHECK (form_type IN ('general','blood_donation','relief_distribution'));

-- ── 5. Add trigger for real-time member message notifications ────
CREATE OR REPLACE FUNCTION public.cswo_notify_member_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_sender_name text;
BEGIN
  -- Fetch sender name
  SELECT COALESCE(full_name, 'A member') INTO v_sender_name FROM public.cswo_members WHERE id = NEW.from_id;

  -- 1. If sent to a specific member
  IF NEW.to_id IS NOT NULL THEN
    INSERT INTO public.cswo_notifications (recipient_id, title, body, kind, link)
    VALUES (
      NEW.to_id,
      'New message from ' || v_sender_name,
      COALESCE(NULLIF(NEW.subject, ''), 'You have received a new message.'),
      'info',
      CASE WHEN EXISTS (SELECT 1 FROM public.cswo_members WHERE id = NEW.to_id AND role = 'admin') 
           THEN '/admin/messages' 
           ELSE '/member/messages' 
      END
    );
  END IF;

  -- 2. If sent to a role
  IF NEW.to_role IS NOT NULL THEN
    INSERT INTO public.cswo_notifications (recipient_id, title, body, kind, link)
    SELECT 
      id,
      'New message for ' || INITCAP(NEW.to_role) || ' from ' || v_sender_name,
      COALESCE(NULLIF(NEW.subject, ''), 'You have received a new message.'),
      'info',
      CASE WHEN role = 'admin' THEN '/admin/messages' ELSE '/member/messages' END
    FROM public.cswo_members
    WHERE status = 'approved' AND (
      (NEW.to_role = 'admin' AND role = 'admin') OR
      (NEW.to_role = 'treasurer' AND (can_manage_finance OR role = 'admin')) OR
      (NEW.to_role = 'secretary' AND (can_manage_events OR role = 'admin')) OR
      (NEW.to_role = 'digital' AND (can_manage_posts OR role = 'admin'))
    ) AND id != NEW.from_id; -- Don't notify the sender themselves
  END IF;

  RETURN NEW;
END; $$;

CREATE OR REPLACE TRIGGER cswo_notify_member_message_t
  AFTER INSERT ON public.cswo_member_messages
  FOR EACH ROW EXECUTE FUNCTION public.cswo_notify_member_message();

-- ── 6. Enable realtime replication ──────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'cswo_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.cswo_notifications;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'cswo_member_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.cswo_member_messages;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
