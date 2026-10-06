-- ══════════════════════════════════════════════════════════════════════════════
-- 0069_cswo_blood_donor_unique_key
--
-- Tightens the donor identity key so that one person always resolves to a
-- single profile in the Blood Donor Directory, even across different camps
-- where one registration has an Aadhar and another does not.
--
-- Key rules (mirrors the front-end donorUniqueKey() function):
--   1. 12-digit Aadhar   → aadhar:<12 digits>        (most reliable ID)
--   2. >= 8-digit mobile → phone:<digits>             (fallback)
--   3. Lowercase name    → name:<trimmed lower>       (last resort)
--
-- Partial / malformed Aadhar (< 12 digits) is ignored so a half-filled
-- entry never accidentally merges two different people.
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Drop the old donor_key generated column.
ALTER TABLE public.cswo_blood_donors DROP COLUMN IF EXISTS donor_key;

-- 2. Re-create donor_key with the strict, prefixed priority.
ALTER TABLE public.cswo_blood_donors
  ADD COLUMN donor_key text
  GENERATED ALWAYS AS (
    CASE
      WHEN length(regexp_replace(aadhar, '[^0-9]', '', 'g')) = 12
        THEN 'aadhar:' || regexp_replace(aadhar, '[^0-9]', '', 'g')
      WHEN length(regexp_replace(phone,  '[^0-9]', '', 'g')) >= 8
        THEN 'phone:'  || regexp_replace(phone,  '[^0-9]', '', 'g')
      WHEN btrim(lower(name)) <> ''
        THEN 'name:'   || btrim(lower(name))
      ELSE
        'id:' || id::text
    END
  ) STORED;

-- 3. Index for fast directory lookups and cross-camp merging.
DROP INDEX IF EXISTS cswo_blood_donors_key_idx;
CREATE INDEX cswo_blood_donors_key_idx ON public.cswo_blood_donors(donor_key);

-- 4. Prevent the same person (by donor_key) from registering TWICE at the SAME camp.
--    A donor can appear at multiple camps -- just not twice in one camp.
DROP INDEX IF EXISTS cswo_blood_donors_unique_per_camp;
CREATE UNIQUE INDEX cswo_blood_donors_unique_per_camp
  ON public.cswo_blood_donors(event_id, donor_key);

-- 5. Composite index used by the Urgent Blood Search query path.
DROP INDEX IF EXISTS cswo_blood_donors_group_key_idx;
CREATE INDEX cswo_blood_donors_group_key_idx
  ON public.cswo_blood_donors(blood_group, donor_key);
