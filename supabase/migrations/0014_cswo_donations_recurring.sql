-- Recurring (monthly) donations flag
ALTER TABLE public.cswo_donations
  ADD COLUMN IF NOT EXISTS is_recurring boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS cswo_donations_is_recurring_idx
  ON public.cswo_donations(is_recurring) WHERE is_recurring;
