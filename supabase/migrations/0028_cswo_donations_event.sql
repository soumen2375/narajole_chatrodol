-- Events ERP: attribute donations to an event (expenses already carry event_id).
ALTER TABLE public.cswo_donations
  ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.cswo_events(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS cswo_donations_event_idx ON public.cswo_donations(event_id);
