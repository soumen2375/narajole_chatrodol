-- Events ERP — Foundation: richer event fields + per-event budget & volunteers.

-- 1) Extend cswo_events with lifecycle / location / planning fields
ALTER TABLE public.cswo_events
  ADD COLUMN IF NOT EXISTS category              text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS event_code            text,
  ADD COLUMN IF NOT EXISTS status                text NOT NULL DEFAULT 'planned'
    CHECK (status IN ('draft','planned','approved','live','completed','cancelled')),
  ADD COLUMN IF NOT EXISTS end_date              date,
  ADD COLUMN IF NOT EXISTS start_time            time,
  ADD COLUMN IF NOT EXISTS end_time              time,
  ADD COLUMN IF NOT EXISTS district              text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS state                 text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS pincode               text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS map_link              text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS expected_participants int  NOT NULL DEFAULT 0;

-- Auto event-code (EVT-YYYY-XXXXX, uuid-derived → unique & readable)
CREATE OR REPLACE FUNCTION public.cswo_assign_event_code()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.event_code IS NULL OR NEW.event_code = '' THEN
    NEW.event_code := 'EVT-' || to_char(COALESCE(NEW.event_date, current_date), 'YYYY')
      || '-' || upper(substr(replace(NEW.id::text, '-', ''), 1, 5));
  END IF;
  RETURN NEW;
END; $$;
CREATE OR REPLACE TRIGGER cswo_events_code BEFORE INSERT ON public.cswo_events
  FOR EACH ROW EXECUTE FUNCTION public.cswo_assign_event_code();

-- Backfill codes for existing rows
UPDATE public.cswo_events
  SET event_code = 'EVT-' || to_char(COALESCE(event_date, current_date), 'YYYY') || '-' || upper(substr(replace(id::text, '-', ''), 1, 5))
  WHERE event_code IS NULL OR event_code = '';

-- 2) Per-event budget items
CREATE TABLE IF NOT EXISTS public.cswo_event_budget_items (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   uuid NOT NULL REFERENCES public.cswo_events(id) ON DELETE CASCADE,
  category   text NOT NULL DEFAULT '',
  planned    numeric(14,2) NOT NULL DEFAULT 0,
  approved   numeric(14,2) NOT NULL DEFAULT 0,
  actual     numeric(14,2) NOT NULL DEFAULT 0,
  vendor     text NOT NULL DEFAULT '',
  status     text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','approved','paid')),
  note       text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cswo_event_budget_event_idx ON public.cswo_event_budget_items(event_id);

-- 3) Per-event volunteers
CREATE TABLE IF NOT EXISTS public.cswo_event_volunteers (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   uuid NOT NULL REFERENCES public.cswo_events(id) ON DELETE CASCADE,
  member_id  uuid REFERENCES public.cswo_members(id) ON DELETE SET NULL,
  name       text NOT NULL DEFAULT '',
  role       text NOT NULL DEFAULT '',
  phone      text NOT NULL DEFAULT '',
  department text NOT NULL DEFAULT '',
  shift      text NOT NULL DEFAULT '',
  attended   boolean NOT NULL DEFAULT false,
  note       text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cswo_event_volunteers_event_idx ON public.cswo_event_volunteers(event_id);

ALTER TABLE public.cswo_event_budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cswo_event_volunteers   ENABLE ROW LEVEL SECURITY;

-- approved members read; event managers (admin or can_manage_events) write
DO $$ BEGIN
  CREATE POLICY "cswo_event_budget_select" ON public.cswo_event_budget_items FOR SELECT USING (public.cswo_is_approved());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "cswo_event_budget_write" ON public.cswo_event_budget_items FOR ALL
    USING (EXISTS (SELECT 1 FROM public.cswo_members WHERE id = auth.uid() AND status = 'approved' AND (role = 'admin' OR can_manage_events)))
    WITH CHECK (EXISTS (SELECT 1 FROM public.cswo_members WHERE id = auth.uid() AND status = 'approved' AND (role = 'admin' OR can_manage_events)));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "cswo_event_volunteers_select" ON public.cswo_event_volunteers FOR SELECT USING (public.cswo_is_approved());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "cswo_event_volunteers_write" ON public.cswo_event_volunteers FOR ALL
    USING (EXISTS (SELECT 1 FROM public.cswo_members WHERE id = auth.uid() AND status = 'approved' AND (role = 'admin' OR can_manage_events)))
    WITH CHECK (EXISTS (SELECT 1 FROM public.cswo_members WHERE id = auth.uid() AND status = 'approved' AND (role = 'admin' OR can_manage_events)));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE TRIGGER cswo_audit_event_budget     AFTER INSERT OR UPDATE OR DELETE ON public.cswo_event_budget_items FOR EACH ROW EXECUTE FUNCTION public.cswo_audit_row();
CREATE OR REPLACE TRIGGER cswo_audit_event_volunteers AFTER INSERT OR UPDATE OR DELETE ON public.cswo_event_volunteers   FOR EACH ROW EXECUTE FUNCTION public.cswo_audit_row();
