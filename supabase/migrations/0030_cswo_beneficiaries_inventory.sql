-- Events ERP: Relief & Distribution — per-event inventory + beneficiary registry.

CREATE TABLE IF NOT EXISTS public.cswo_event_inventory (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     uuid NOT NULL REFERENCES public.cswo_events(id) ON DELETE CASCADE,
  item         text NOT NULL DEFAULT '',
  category     text NOT NULL DEFAULT '',
  variant      text NOT NULL DEFAULT '',          -- size / type, e.g. 'L', 'Kids 28'
  qty_required int  NOT NULL DEFAULT 0,
  qty_available int NOT NULL DEFAULT 0,
  unit_cost    numeric(12,2) NOT NULL DEFAULT 0,
  note         text NOT NULL DEFAULT '',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cswo_event_inventory_event_idx ON public.cswo_event_inventory(event_id);

CREATE TABLE IF NOT EXISTS public.cswo_event_beneficiaries (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id         uuid NOT NULL REFERENCES public.cswo_events(id) ON DELETE CASCADE,
  beneficiary_code text,
  name             text NOT NULL DEFAULT '',
  age              int,
  gender           text NOT NULL DEFAULT '' CHECK (gender IN ('', 'male', 'female', 'other')),
  phone            text NOT NULL DEFAULT '',
  address          text NOT NULL DEFAULT '',
  family_size      int NOT NULL DEFAULT 0,
  income_category  text NOT NULL DEFAULT '',
  id_proof         text NOT NULL DEFAULT '',
  verified         boolean NOT NULL DEFAULT false,
  inventory_id     uuid REFERENCES public.cswo_event_inventory(id) ON DELETE SET NULL,
  item_received    text NOT NULL DEFAULT '',
  quantity         int NOT NULL DEFAULT 0,
  note             text NOT NULL DEFAULT '',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cswo_event_beneficiaries_event_idx ON public.cswo_event_beneficiaries(event_id);

CREATE OR REPLACE FUNCTION public.cswo_assign_beneficiary_code()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.beneficiary_code IS NULL OR NEW.beneficiary_code = '' THEN
    NEW.beneficiary_code := 'BEN-' || upper(substr(replace(NEW.id::text, '-', ''), 1, 6));
  END IF;
  RETURN NEW;
END; $$;
CREATE OR REPLACE TRIGGER cswo_beneficiary_code BEFORE INSERT ON public.cswo_event_beneficiaries
  FOR EACH ROW EXECUTE FUNCTION public.cswo_assign_beneficiary_code();

ALTER TABLE public.cswo_event_inventory     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cswo_event_beneficiaries ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "cswo_event_inventory_select" ON public.cswo_event_inventory FOR SELECT USING (public.cswo_is_approved());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "cswo_event_inventory_write" ON public.cswo_event_inventory FOR ALL
    USING (EXISTS (SELECT 1 FROM public.cswo_members WHERE id = auth.uid() AND status = 'approved' AND (role = 'admin' OR can_manage_events)))
    WITH CHECK (EXISTS (SELECT 1 FROM public.cswo_members WHERE id = auth.uid() AND status = 'approved' AND (role = 'admin' OR can_manage_events)));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "cswo_event_beneficiaries_select" ON public.cswo_event_beneficiaries FOR SELECT USING (public.cswo_is_approved());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "cswo_event_beneficiaries_write" ON public.cswo_event_beneficiaries FOR ALL
    USING (EXISTS (SELECT 1 FROM public.cswo_members WHERE id = auth.uid() AND status = 'approved' AND (role = 'admin' OR can_manage_events)))
    WITH CHECK (EXISTS (SELECT 1 FROM public.cswo_members WHERE id = auth.uid() AND status = 'approved' AND (role = 'admin' OR can_manage_events)));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE TRIGGER cswo_audit_event_inventory     AFTER INSERT OR UPDATE OR DELETE ON public.cswo_event_inventory     FOR EACH ROW EXECUTE FUNCTION public.cswo_audit_row();
CREATE OR REPLACE TRIGGER cswo_audit_event_beneficiaries AFTER INSERT OR UPDATE OR DELETE ON public.cswo_event_beneficiaries FOR EACH ROW EXECUTE FUNCTION public.cswo_audit_row();
