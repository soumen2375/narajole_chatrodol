-- Secretary letterpad: official letters written on the CSWO letterhead for an
-- event (permission requests, invitations, thank-you notes) with the same
-- register numbering the paper file already uses.
--
-- The number series is deliberately a single mutable row rather than a
-- Postgres sequence. The register runs "3A/82, 3A/83, …" and the secretary
-- has to be able to correct the prefix or resync the counter after letters
-- written by hand — a sequence's nextval cannot be moved backwards from SQL
-- the office has access to, a row can.

-- ── 1. Number series ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.cswo_letter_series (
  id           boolean PRIMARY KEY DEFAULT true CHECK (id),
  prefix       text NOT NULL DEFAULT '3A',
  next_number  integer NOT NULL DEFAULT 83 CHECK (next_number > 0),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- The paper register stands at 3A/82, so the first digital letter is 3A/83.
INSERT INTO public.cswo_letter_series (id, prefix, next_number)
VALUES (true, '3A', 83)
ON CONFLICT (id) DO NOTHING;

-- ── 2. Letters ──────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE public.cswo_letter_status AS ENUM ('draft', 'issued', 'sent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.cswo_event_letters (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id         uuid NOT NULL REFERENCES public.cswo_events(id) ON DELETE CASCADE,
  ref_no           text UNIQUE,
  letter_date      date NOT NULL DEFAULT CURRENT_DATE,
  status           public.cswo_letter_status NOT NULL DEFAULT 'draft',

  -- addressee, as it prints under "To"
  to_name          text NOT NULL DEFAULT '',
  to_address       text NOT NULL DEFAULT '',
  to_email         text NOT NULL DEFAULT '',

  salutation       text NOT NULL DEFAULT 'Respected Sir,',
  subject          text NOT NULL DEFAULT '',
  body             text NOT NULL DEFAULT '',
  closing          text NOT NULL DEFAULT 'Yours faithfully,',

  -- signature block
  signatory_name   text NOT NULL DEFAULT 'Sayan Samanta',
  signatory_role   text NOT NULL DEFAULT 'Secretary of CSWO',
  signatory_phone  text NOT NULL DEFAULT '7811073412',
  signature_url    text NOT NULL DEFAULT '',

  -- dispatch
  sent_at          timestamptz,
  sent_to          text NOT NULL DEFAULT '',
  email_message_id text NOT NULL DEFAULT '',

  -- the stamped copy that comes back from the addressee
  signed_copy_url  text NOT NULL DEFAULT '',
  signed_copy_at   timestamptz,

  created_by       uuid REFERENCES public.cswo_members(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cswo_event_letters_event_idx
  ON public.cswo_event_letters(event_id, created_at DESC);
CREATE INDEX IF NOT EXISTS cswo_event_letters_status_idx
  ON public.cswo_event_letters(status);

-- ── 3. Ref numbers ──────────────────────────────────────────────────────────
-- Assigned on insert, like the paper register: the number is spent the moment
-- the letter is written, not when it is posted, so a draft abandoned halfway
-- leaves the same gap it would leave in the file.

CREATE OR REPLACE FUNCTION public.cswo_next_letter_ref()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref text;
BEGIN
  -- UPDATE … RETURNING takes a row lock, so concurrent inserts queue rather
  -- than racing for the same number.
  UPDATE public.cswo_letter_series
     SET next_number = next_number + 1,
         updated_at  = now()
   WHERE id = true
  RETURNING prefix || '/' || (next_number - 1)::text INTO v_ref;

  IF v_ref IS NULL THEN
    INSERT INTO public.cswo_letter_series (id, prefix, next_number)
    VALUES (true, '3A', 84)
    RETURNING prefix || '/83' INTO v_ref;
  END IF;

  RETURN v_ref;
END;
$$;

CREATE OR REPLACE FUNCTION public.cswo_assign_letter_ref()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.ref_no IS NULL OR NEW.ref_no = '' THEN
    NEW.ref_no := public.cswo_next_letter_ref();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER cswo_event_letters_ref
  BEFORE INSERT ON public.cswo_event_letters
  FOR EACH ROW EXECUTE FUNCTION public.cswo_assign_letter_ref();

CREATE OR REPLACE TRIGGER cswo_event_letters_updated_at
  BEFORE UPDATE ON public.cswo_event_letters
  FOR EACH ROW EXECUTE FUNCTION public.cswo_set_updated_at();

-- ── 4. RLS ──────────────────────────────────────────────────────────────────
-- Written inline rather than through cswo_can_manage_events(): that helper
-- exists on the live project but not in this migration history, and this file
-- has to apply to both.

ALTER TABLE public.cswo_event_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cswo_letter_series ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cswo_event_letters_select" ON public.cswo_event_letters;
CREATE POLICY "cswo_event_letters_select" ON public.cswo_event_letters
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.cswo_members
            WHERE id = auth.uid() AND status = 'approved'
              AND (role = 'admin' OR can_manage_events))
  );

DROP POLICY IF EXISTS "cswo_event_letters_write" ON public.cswo_event_letters;
CREATE POLICY "cswo_event_letters_write" ON public.cswo_event_letters
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.cswo_members
            WHERE id = auth.uid() AND status = 'approved'
              AND (role = 'admin' OR can_manage_events))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.cswo_members
            WHERE id = auth.uid() AND status = 'approved'
              AND (role = 'admin' OR can_manage_events))
  );

DROP POLICY IF EXISTS "cswo_letter_series_select" ON public.cswo_letter_series;
CREATE POLICY "cswo_letter_series_select" ON public.cswo_letter_series
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.cswo_members
            WHERE id = auth.uid() AND status = 'approved'
              AND (role = 'admin' OR can_manage_events))
  );

-- Only an admin may move the counter or rename the series: an accidental
-- rewind here would mint duplicate register numbers on official letters.
DROP POLICY IF EXISTS "cswo_letter_series_write" ON public.cswo_letter_series;
CREATE POLICY "cswo_letter_series_write" ON public.cswo_letter_series
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.cswo_members
            WHERE id = auth.uid() AND status = 'approved' AND role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.cswo_members
            WHERE id = auth.uid() AND status = 'approved' AND role = 'admin')
  );

GRANT EXECUTE ON FUNCTION public.cswo_next_letter_ref() TO authenticated;
