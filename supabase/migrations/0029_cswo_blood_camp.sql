-- Events ERP: Blood Donation Camp module — donor registry + blood bank details.

CREATE TABLE IF NOT EXISTS public.cswo_blood_donors (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     uuid NOT NULL REFERENCES public.cswo_events(id) ON DELETE CASCADE,
  donor_code   text,
  name         text NOT NULL DEFAULT '',
  age          int,
  gender       text NOT NULL DEFAULT '' CHECK (gender IN ('', 'male', 'female', 'other')),
  blood_group  text NOT NULL DEFAULT '' CHECK (blood_group IN ('', 'A+','A-','B+','B-','O+','O-','AB+','AB-')),
  phone        text NOT NULL DEFAULT '',
  email        text NOT NULL DEFAULT '',
  address      text NOT NULL DEFAULT '',
  member_id    uuid REFERENCES public.cswo_members(id) ON DELETE SET NULL,
  weight       numeric(5,1),
  bp           text NOT NULL DEFAULT '',
  hemoglobin   numeric(4,1),
  last_donation date,
  status       text NOT NULL DEFAULT 'registered' CHECK (status IN ('registered','eligible','rejected','donated')),
  units        int NOT NULL DEFAULT 0,
  consent      boolean NOT NULL DEFAULT false,
  note         text NOT NULL DEFAULT '',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cswo_blood_donors_event_idx ON public.cswo_blood_donors(event_id);

CREATE TABLE IF NOT EXISTS public.cswo_blood_banks (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id       uuid NOT NULL REFERENCES public.cswo_events(id) ON DELETE CASCADE,
  name           text NOT NULL DEFAULT '',
  contact_person text NOT NULL DEFAULT '',
  phone          text NOT NULL DEFAULT '',
  email          text NOT NULL DEFAULT '',
  license_no     text NOT NULL DEFAULT '',
  team_size      int NOT NULL DEFAULT 0,
  beds           int NOT NULL DEFAULT 0,
  ambulance      boolean NOT NULL DEFAULT false,
  generator      boolean NOT NULL DEFAULT false,
  equipment      text NOT NULL DEFAULT '',
  note           text NOT NULL DEFAULT '',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cswo_blood_banks_event_idx ON public.cswo_blood_banks(event_id);

-- Auto donor code BD-XXXXX
CREATE OR REPLACE FUNCTION public.cswo_assign_donor_code()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.donor_code IS NULL OR NEW.donor_code = '' THEN
    NEW.donor_code := 'BD-' || upper(substr(replace(NEW.id::text, '-', ''), 1, 6));
  END IF;
  RETURN NEW;
END; $$;
CREATE OR REPLACE TRIGGER cswo_blood_donor_code BEFORE INSERT ON public.cswo_blood_donors
  FOR EACH ROW EXECUTE FUNCTION public.cswo_assign_donor_code();

ALTER TABLE public.cswo_blood_donors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cswo_blood_banks  ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "cswo_blood_donors_select" ON public.cswo_blood_donors FOR SELECT USING (public.cswo_is_approved());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "cswo_blood_donors_write" ON public.cswo_blood_donors FOR ALL
    USING (EXISTS (SELECT 1 FROM public.cswo_members WHERE id = auth.uid() AND status = 'approved' AND (role = 'admin' OR can_manage_events)))
    WITH CHECK (EXISTS (SELECT 1 FROM public.cswo_members WHERE id = auth.uid() AND status = 'approved' AND (role = 'admin' OR can_manage_events)));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "cswo_blood_banks_select" ON public.cswo_blood_banks FOR SELECT USING (public.cswo_is_approved());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "cswo_blood_banks_write" ON public.cswo_blood_banks FOR ALL
    USING (EXISTS (SELECT 1 FROM public.cswo_members WHERE id = auth.uid() AND status = 'approved' AND (role = 'admin' OR can_manage_events)))
    WITH CHECK (EXISTS (SELECT 1 FROM public.cswo_members WHERE id = auth.uid() AND status = 'approved' AND (role = 'admin' OR can_manage_events)));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE TRIGGER cswo_audit_blood_donors AFTER INSERT OR UPDATE OR DELETE ON public.cswo_blood_donors FOR EACH ROW EXECUTE FUNCTION public.cswo_audit_row();
CREATE OR REPLACE TRIGGER cswo_audit_blood_banks  AFTER INSERT OR UPDATE OR DELETE ON public.cswo_blood_banks  FOR EACH ROW EXECUTE FUNCTION public.cswo_audit_row();
