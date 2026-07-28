-- ============================================================
-- 0041: Simple Static QR Attendance System
-- Adds static QR token + attendance window to events table
-- Adds method/device columns to attendance table
-- ============================================================

-- 1) Extend cswo_events with static QR fields
ALTER TABLE public.cswo_events
  ADD COLUMN IF NOT EXISTS attendance_qr_token   text UNIQUE,
  ADD COLUMN IF NOT EXISTS attendance_enabled     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS attendance_start_time  timestamptz,
  ADD COLUMN IF NOT EXISTS attendance_end_time    timestamptz;

-- 2) Extend cswo_attendance with method + device fields
ALTER TABLE public.cswo_attendance
  ADD COLUMN IF NOT EXISTS attendance_method text NOT NULL DEFAULT 'qr'
    CHECK (attendance_method IN ('qr', 'manual', 'admin')),
  ADD COLUMN IF NOT EXISTS device_info text;

-- 3) Ensure UNIQUE(event_id, member_id) on attendance (prevents duplicates)
DO $$ BEGIN
  ALTER TABLE public.cswo_attendance
    ADD CONSTRAINT cswo_attendance_event_member_unique
    UNIQUE (event_id, member_id);
EXCEPTION WHEN duplicate_table THEN NULL;
         WHEN duplicate_object THEN NULL;
END $$;

-- 4) Index for fast QR token lookups
CREATE INDEX IF NOT EXISTS cswo_events_qr_token_idx
  ON public.cswo_events(attendance_qr_token)
  WHERE attendance_qr_token IS NOT NULL;

-- 5) RLS: allow approved members to INSERT their own attendance via QR
--    (upsert path — also needs UPDATE policy)
DO $$ BEGIN
  CREATE POLICY "cswo_attendance_member_qr_update" ON public.cswo_attendance
    FOR UPDATE USING (member_id = auth.uid() AND public.cswo_is_approved())
    WITH CHECK (member_id = auth.uid() AND public.cswo_is_approved());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 6) Audit helper: record QR attendance events
--    Uses the existing cswo_audit_log table (entity = 'attendance')
CREATE OR REPLACE FUNCTION public.cswo_log_attendance_audit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.cswo_audit_log(actor_id, action, entity, entity_id, detail)
    VALUES (
      NEW.member_id,
      CASE NEW.attendance_method
        WHEN 'qr'     THEN 'attendance_qr_scan'
        WHEN 'manual' THEN 'attendance_manually_added'
        ELSE               'attendance_marked'
      END,
      'attendance',
      NEW.id,
      jsonb_build_object(
        'event_id',          NEW.event_id,
        'member_id',         NEW.member_id,
        'attendance_method', NEW.attendance_method,
        'attendance_time',   NEW.check_in_time
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cswo_attendance_audit_trigger ON public.cswo_attendance;
CREATE TRIGGER cswo_attendance_audit_trigger
  AFTER INSERT ON public.cswo_attendance
  FOR EACH ROW EXECUTE FUNCTION public.cswo_log_attendance_audit();
