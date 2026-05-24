-- Phase 2: Compliance register + document vault

CREATE TABLE IF NOT EXISTS public.cswo_compliance (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ckey        text UNIQUE NOT NULL,
  name_bn     text NOT NULL,
  name_en     text NOT NULL,
  authority   text NOT NULL DEFAULT '',
  reg_number  text NOT NULL DEFAULT '',
  issued_on   date,
  expiry_on   date,
  note        text NOT NULL DEFAULT '',
  sort_order  integer NOT NULL DEFAULT 0,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cswo_documents (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  category    text NOT NULL DEFAULT 'general',
  file_url    text NOT NULL,
  file_type   text NOT NULL DEFAULT '',
  uploaded_by uuid REFERENCES public.cswo_members(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cswo_documents_created_at_idx ON public.cswo_documents(created_at DESC);

ALTER TABLE public.cswo_compliance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cswo_documents  ENABLE ROW LEVEL SECURITY;

-- read: any approved member; write: admin or finance-capable
DO $$ BEGIN
  CREATE POLICY "cswo_compliance_select" ON public.cswo_compliance FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.cswo_members WHERE id = auth.uid() AND status = 'approved'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "cswo_compliance_write" ON public.cswo_compliance FOR ALL USING (
    EXISTS (SELECT 1 FROM public.cswo_members WHERE id = auth.uid() AND status = 'approved' AND (role = 'admin' OR can_manage_finance)))
    WITH CHECK (
    EXISTS (SELECT 1 FROM public.cswo_members WHERE id = auth.uid() AND status = 'approved' AND (role = 'admin' OR can_manage_finance)));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "cswo_documents_select" ON public.cswo_documents FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.cswo_members WHERE id = auth.uid() AND status = 'approved'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "cswo_documents_write" ON public.cswo_documents FOR ALL USING (
    EXISTS (SELECT 1 FROM public.cswo_members WHERE id = auth.uid() AND status = 'approved' AND (role = 'admin' OR can_manage_finance)))
    WITH CHECK (
    EXISTS (SELECT 1 FROM public.cswo_members WHERE id = auth.uid() AND status = 'approved' AND (role = 'admin' OR can_manage_finance)));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Seed the standard NGO compliance items (admin fills in numbers/dates)
INSERT INTO public.cswo_compliance (ckey, name_bn, name_en, authority, sort_order) VALUES
  ('12a',   '12A রেজিস্ট্রেশন',     '12A Registration',       'Income Tax Department', 1),
  ('80g',   '80G সার্টিফিকেট',      '80G Certificate',        'Income Tax Department', 2),
  ('pan',   'ট্রাস্ট PAN',          'Trust PAN',              'Income Tax Department', 3),
  ('audit', 'বার্ষিক অডিট',         'Annual Audit',           'Chartered Accountant',  4),
  ('gst',   'GST রেজিস্ট্রেশন',     'GST Registration',       'GST Department',        5)
ON CONFLICT (ckey) DO NOTHING;
