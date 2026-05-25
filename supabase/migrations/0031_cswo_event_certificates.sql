-- Events ERP: certificates registry (participation / winner / volunteer / donor).
CREATE TABLE IF NOT EXISTS public.cswo_event_certificates (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id       uuid NOT NULL REFERENCES public.cswo_events(id) ON DELETE CASCADE,
  cert_code      text,
  recipient_name text NOT NULL DEFAULT '',
  recipient_type text NOT NULL DEFAULT 'participant' CHECK (recipient_type IN ('participant','winner','volunteer','donor','custom')),
  category       text NOT NULL DEFAULT '',
  position       text NOT NULL DEFAULT '',
  note           text NOT NULL DEFAULT '',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cswo_event_certificates_event_idx ON public.cswo_event_certificates(event_id);

CREATE OR REPLACE FUNCTION public.cswo_assign_cert_code()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.cert_code IS NULL OR NEW.cert_code = '' THEN
    NEW.cert_code := 'CERT-' || upper(substr(replace(NEW.id::text, '-', ''), 1, 6));
  END IF;
  RETURN NEW;
END; $$;
CREATE OR REPLACE TRIGGER cswo_cert_code BEFORE INSERT ON public.cswo_event_certificates
  FOR EACH ROW EXECUTE FUNCTION public.cswo_assign_cert_code();

ALTER TABLE public.cswo_event_certificates ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "cswo_event_certificates_select" ON public.cswo_event_certificates FOR SELECT USING (public.cswo_is_approved());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "cswo_event_certificates_write" ON public.cswo_event_certificates FOR ALL
    USING (EXISTS (SELECT 1 FROM public.cswo_members WHERE id = auth.uid() AND status = 'approved' AND (role = 'admin' OR can_manage_events)))
    WITH CHECK (EXISTS (SELECT 1 FROM public.cswo_members WHERE id = auth.uid() AND status = 'approved' AND (role = 'admin' OR can_manage_events)));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE TRIGGER cswo_audit_event_certificates AFTER INSERT OR UPDATE OR DELETE ON public.cswo_event_certificates FOR EACH ROW EXECUTE FUNCTION public.cswo_audit_row();
