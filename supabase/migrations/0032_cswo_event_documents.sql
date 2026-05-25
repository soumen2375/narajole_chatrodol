-- Events ERP: per-event document repository (permissions, bills, reports, photos).
CREATE TABLE IF NOT EXISTS public.cswo_event_documents (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid NOT NULL REFERENCES public.cswo_events(id) ON DELETE CASCADE,
  title       text NOT NULL DEFAULT '',
  category    text NOT NULL DEFAULT 'general',
  file_url    text NOT NULL DEFAULT '',
  file_type   text NOT NULL DEFAULT '',
  uploaded_by uuid REFERENCES public.cswo_members(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cswo_event_documents_event_idx ON public.cswo_event_documents(event_id);

ALTER TABLE public.cswo_event_documents ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "cswo_event_documents_select" ON public.cswo_event_documents FOR SELECT USING (public.cswo_is_approved());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "cswo_event_documents_write" ON public.cswo_event_documents FOR ALL
    USING (EXISTS (SELECT 1 FROM public.cswo_members WHERE id = auth.uid() AND status = 'approved' AND (role = 'admin' OR can_manage_events)))
    WITH CHECK (EXISTS (SELECT 1 FROM public.cswo_members WHERE id = auth.uid() AND status = 'approved' AND (role = 'admin' OR can_manage_events)));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE TRIGGER cswo_audit_event_documents AFTER INSERT OR UPDATE OR DELETE ON public.cswo_event_documents FOR EACH ROW EXECUTE FUNCTION public.cswo_audit_row();
