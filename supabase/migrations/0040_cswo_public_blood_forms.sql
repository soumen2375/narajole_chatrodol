-- Public blood request and blood camp application tables
-- Both forms are accessible without authentication (public INSERT)

-- 1) Blood requests — anyone can submit an urgent blood request
CREATE TABLE IF NOT EXISTS public.cswo_blood_requests (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_name   text NOT NULL,
  blood_group    text NOT NULL DEFAULT '',
  hospital       text NOT NULL DEFAULT '',
  contact_phone  text NOT NULL DEFAULT '',
  units_needed   int  NOT NULL DEFAULT 1,
  required_by    date,
  requester_name text,
  message        text,
  status         text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','fulfilled','closed')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cswo_blood_requests_status_idx    ON public.cswo_blood_requests(status);
CREATE INDEX IF NOT EXISTS cswo_blood_requests_blood_grp_idx ON public.cswo_blood_requests(blood_group);

ALTER TABLE public.cswo_blood_requests ENABLE ROW LEVEL SECURITY;

-- Anyone (including unauthenticated) can submit a blood request
DO $$ BEGIN
  CREATE POLICY "cswo_blood_requests_public_insert" ON public.cswo_blood_requests
    FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Approved members can view requests
DO $$ BEGIN
  CREATE POLICY "cswo_blood_requests_member_select" ON public.cswo_blood_requests
    FOR SELECT USING (public.cswo_is_approved());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Admins/event managers can update status
DO $$ BEGIN
  CREATE POLICY "cswo_blood_requests_admin_update" ON public.cswo_blood_requests
    FOR UPDATE USING (
      EXISTS (
        SELECT 1 FROM public.cswo_members
        WHERE id = auth.uid() AND status = 'approved'
          AND (role = 'admin' OR can_manage_events)
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Blood camp applications — organisations/individuals apply to host a camp
CREATE TABLE IF NOT EXISTS public.cswo_blood_camp_applications (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_name         text,
  contact_name     text NOT NULL,
  contact_phone    text NOT NULL,
  contact_email    text,
  proposed_date    date,
  proposed_venue   text NOT NULL DEFAULT '',
  expected_donors  int,
  message          text,
  status           text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','completed')),
  admin_note       text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cswo_blood_camp_apps_status_idx ON public.cswo_blood_camp_applications(status);

ALTER TABLE public.cswo_blood_camp_applications ENABLE ROW LEVEL SECURITY;

-- Anyone can apply to organise a blood camp
DO $$ BEGIN
  CREATE POLICY "cswo_blood_camp_apps_public_insert" ON public.cswo_blood_camp_applications
    FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Approved members can view applications
DO $$ BEGIN
  CREATE POLICY "cswo_blood_camp_apps_member_select" ON public.cswo_blood_camp_applications
    FOR SELECT USING (public.cswo_is_approved());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Admins can update status/notes
DO $$ BEGIN
  CREATE POLICY "cswo_blood_camp_apps_admin_update" ON public.cswo_blood_camp_applications
    FOR UPDATE USING (
      EXISTS (
        SELECT 1 FROM public.cswo_members
        WHERE id = auth.uid() AND status = 'approved'
          AND (role = 'admin' OR can_manage_events)
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
