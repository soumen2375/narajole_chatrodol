-- Phase 1: restricted/unrestricted funds + freeze
ALTER TABLE public.cswo_funds
  ADD COLUMN IF NOT EXISTS is_restricted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_frozen     boolean NOT NULL DEFAULT false;
