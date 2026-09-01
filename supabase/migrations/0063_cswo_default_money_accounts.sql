-- Let an admin nominate WHICH account money lands in, instead of it being
-- decided by whichever row happens to sort first.
--
-- cswo_money_account() currently resolves an account by picking the first
-- active row of the right kind ordered by sort_order. That works, but it is
-- implicit: reordering the Bank page silently re-routes every future donation.
-- With more than one bank account on file, "online money goes to SLICE" ought
-- to be a stated fact, not a side effect of a sort column.
--
-- After this migration the resolution order is:
--   1. an account explicitly chosen on the transaction  (unchanged)
--   2. the account flagged is_default for that family   (new)
--   3. first active of that family by sort_order        (unchanged fallback)
--
-- "Family" means cash vs bank, so there is one default cash wallet and one
-- default bank account, and the cash/online split keeps working as before:
-- a cash entry recorded by an admin lands in the cash wallet, while an online
-- member payment lands in the nominated bank account.

ALTER TABLE public.cswo_bank_accounts
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;

-- At most one default per family. The index key is the cash/bank split itself,
-- so one row may be default among cash accounts and one among bank accounts.
DROP INDEX IF EXISTS public.cswo_bank_accounts_one_default;
CREATE UNIQUE INDEX cswo_bank_accounts_one_default
  ON public.cswo_bank_accounts ((account_type = 'cash'))
  WHERE is_default;

-- Seed the flag from today's behaviour so routing does not move when this runs:
-- whatever cswo_money_account() would already have picked becomes the default.
UPDATE public.cswo_bank_accounts a
   SET is_default = true
 WHERE a.id IN (
   SELECT DISTINCT ON (account_type = 'cash') id
     FROM public.cswo_bank_accounts
    WHERE is_active
    ORDER BY (account_type = 'cash'), sort_order, created_at
 )
   AND NOT EXISTS (
     SELECT 1 FROM public.cswo_bank_accounts b
      WHERE (b.account_type = 'cash') = (a.account_type = 'cash')
        AND b.is_default
   );

CREATE OR REPLACE FUNCTION public.cswo_money_account(p_method text, p_chosen uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_acct uuid; v_cash boolean;
BEGIN
  IF p_chosen IS NOT NULL THEN
    RETURN p_chosen;
  END IF;

  v_cash := (p_method = 'cash');

  -- The nominated account for this family wins.
  SELECT id INTO v_acct FROM public.cswo_bank_accounts
   WHERE is_active AND is_default AND (account_type = 'cash') = v_cash
   LIMIT 1;
  IF v_acct IS NOT NULL THEN
    RETURN v_acct;
  END IF;

  -- Otherwise fall back to the previous behaviour, unchanged.
  IF v_cash THEN
    SELECT id INTO v_acct FROM public.cswo_bank_accounts
     WHERE account_type = 'cash' AND is_active = true
     ORDER BY sort_order, created_at LIMIT 1;
  ELSE
    SELECT id INTO v_acct FROM public.cswo_bank_accounts
     WHERE account_type IN ('savings', 'current') AND is_active = true
     ORDER BY sort_order, created_at LIMIT 1;
  END IF;

  IF v_acct IS NULL THEN
    SELECT id INTO v_acct FROM public.cswo_bank_accounts
     WHERE is_active = true ORDER BY sort_order, created_at LIMIT 1;
  END IF;

  RETURN v_acct;
END; $function$;
