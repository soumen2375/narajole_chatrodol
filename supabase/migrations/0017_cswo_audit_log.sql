-- Phase 1: finance audit log
CREATE TABLE IF NOT EXISTS public.cswo_audit_log (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id   uuid REFERENCES public.cswo_members(id) ON DELETE SET NULL,
  action     text NOT NULL,
  entity     text NOT NULL,
  entity_id  uuid,
  detail     jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cswo_audit_created_at_idx ON public.cswo_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS cswo_audit_entity_idx     ON public.cswo_audit_log(entity);

ALTER TABLE public.cswo_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cswo_audit_insert" ON public.cswo_audit_log
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.cswo_members
    WHERE id = auth.uid() AND status = 'approved' AND (role = 'admin' OR can_manage_finance)
  ));

CREATE POLICY "cswo_audit_select" ON public.cswo_audit_log
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.cswo_members WHERE id = auth.uid() AND role = 'admin'
  ));
