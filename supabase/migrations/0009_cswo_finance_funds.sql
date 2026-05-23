-- Phase 1 Finance: cswo_funds — canonical fund/category list
CREATE TABLE IF NOT EXISTS public.cswo_funds (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_bn     text NOT NULL,
  name_en     text NOT NULL,
  slug        text NOT NULL UNIQUE,
  is_active   boolean NOT NULL DEFAULT true,
  sort_order  int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cswo_funds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cswo_funds_select" ON public.cswo_funds
  FOR SELECT USING (is_active = true OR EXISTS (
    SELECT 1 FROM public.cswo_members WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "cswo_funds_insert" ON public.cswo_funds
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.cswo_members WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "cswo_funds_update" ON public.cswo_funds
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.cswo_members WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "cswo_funds_delete" ON public.cswo_funds
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM public.cswo_members WHERE id = auth.uid() AND role = 'admin'
  ));

INSERT INTO public.cswo_funds (name_bn, name_en, slug, sort_order) VALUES
  ('শিক্ষা', 'Education', 'education', 1),
  ('স্বাস্থ্য', 'Health', 'health', 2),
  ('পরিবেশ', 'Environment', 'environment', 3),
  ('ত্রাণ', 'Relief', 'relief', 4),
  ('সাধারণ', 'General', 'general', 5)
ON CONFLICT (slug) DO NOTHING;
