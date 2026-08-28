-- Blood donor registry simplification.
--   Keep only the fields the camp desk actually fills in:
--   name, age, gender, phone, address, blood_group, aadhar.
--   Drops the clinical/extra columns (all verified empty across every row).
--   Adds `donor_key` so the same person is recognised across camps, which is
--   what the 3-month eligibility rule and the donation history are built on.

ALTER TABLE public.cswo_blood_donors
  ADD COLUMN IF NOT EXISTS aadhar text NOT NULL DEFAULT '';

ALTER TABLE public.cswo_blood_donors
  DROP COLUMN IF EXISTS email,
  DROP COLUMN IF EXISTS weight,
  DROP COLUMN IF EXISTS bp,
  DROP COLUMN IF EXISTS hemoglobin,
  DROP COLUMN IF EXISTS consent,
  DROP COLUMN IF EXISTS note,
  DROP COLUMN IF EXISTS last_donation;

-- 'eligible' is now a computed thing (no donation in the last 3 months), not a
-- stored status. Fold the few existing rows back to 'registered'.
UPDATE public.cswo_blood_donors SET status = 'registered' WHERE status = 'eligible';

ALTER TABLE public.cswo_blood_donors DROP CONSTRAINT IF EXISTS cswo_blood_donors_status_check;
ALTER TABLE public.cswo_blood_donors
  ADD CONSTRAINT cswo_blood_donors_status_check
  CHECK (status IN ('registered', 'donated', 'rejected'));

-- Stable identity for one person across camps: aadhar → phone → name.
ALTER TABLE public.cswo_blood_donors
  ADD COLUMN IF NOT EXISTS donor_key text
  GENERATED ALWAYS AS (
    COALESCE(
      NULLIF(regexp_replace(aadhar, '[^0-9]', '', 'g'), ''),
      NULLIF(regexp_replace(phone,  '[^0-9]', '', 'g'), ''),
      lower(btrim(name))
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS cswo_blood_donors_key_idx    ON public.cswo_blood_donors(donor_key);
CREATE INDEX IF NOT EXISTS cswo_blood_donors_group_idx  ON public.cswo_blood_donors(blood_group);
