-- QR-based attendance system: extend events, attendance, add QR session table

-- 1) Add location + QR fields to events
ALTER TABLE public.cswo_events
  ADD COLUMN IF NOT EXISTS latitude          double precision,
  ADD COLUMN IF NOT EXISTS longitude         double precision,
  ADD COLUMN IF NOT EXISTS attendance_radius int NOT NULL DEFAULT 200;

-- 2) Add check-in metadata to attendance
ALTER TABLE public.cswo_attendance
  ADD COLUMN IF NOT EXISTS check_in_time timestamptz,
  ADD COLUMN IF NOT EXISTS marked_type   text NOT NULL DEFAULT 'ADMIN'
    CHECK (marked_type IN ('QR','ADMIN','MANUAL','SYSTEM')),
  ADD COLUMN IF NOT EXISTS latitude      double precision,
  ADD COLUMN IF NOT EXISTS longitude     double precision,
  ADD COLUMN IF NOT EXISTS distance_m    int;

-- 3) QR session table: each row = one rotating token for an event
CREATE TABLE IF NOT EXISTS public.cswo_event_qr_sessions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      uuid NOT NULL REFERENCES public.cswo_events(id) ON DELETE CASCADE,
  session_token text NOT NULL,
  expires_at    timestamptz NOT NULL,
  created_by    uuid REFERENCES public.cswo_members(id) ON DELETE SET NULL,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cswo_qr_sessions_event_idx   ON public.cswo_event_qr_sessions(event_id);
CREATE INDEX IF NOT EXISTS cswo_qr_sessions_token_idx   ON public.cswo_event_qr_sessions(session_token);
CREATE INDEX IF NOT EXISTS cswo_qr_sessions_expires_idx ON public.cswo_event_qr_sessions(expires_at);

ALTER TABLE public.cswo_event_qr_sessions ENABLE ROW LEVEL SECURITY;

-- Approved members can read active QR sessions (needed to verify on check-in)
DO $$ BEGIN
  CREATE POLICY "cswo_qr_sessions_select" ON public.cswo_event_qr_sessions
    FOR SELECT USING (public.cswo_is_approved());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Only admins/event managers can insert/update/delete QR sessions
DO $$ BEGIN
  CREATE POLICY "cswo_qr_sessions_admin_write" ON public.cswo_event_qr_sessions
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM public.cswo_members
        WHERE id = auth.uid()
          AND status = 'approved'
          AND (role = 'admin' OR can_manage_events)
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.cswo_members
        WHERE id = auth.uid()
          AND status = 'approved'
          AND (role = 'admin' OR can_manage_events)
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Allow approved members to insert their own attendance via QR (upsert)
DO $$ BEGIN
  DROP POLICY IF EXISTS cswo_attendance_member_insert ON public.cswo_attendance;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "cswo_attendance_member_qr_insert" ON public.cswo_attendance
    FOR INSERT WITH CHECK (
      member_id = auth.uid()
      AND public.cswo_is_approved()
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
