-- Public member verification for the QR code printed on ID cards.
--
-- The QR encodes https://www.chhatradol.org/verify/<verify_token>. A scanner is
-- anonymous, so the lookup goes through a security-definer RPC that returns only
-- the fields an ID card is meant to prove — never the email, address or role.
-- The token is separate from the member id so a lost card can be revoked by
-- rotating it, without touching anything else that keys off the id.

alter table public.cswo_members
  add column if not exists verify_token uuid not null default gen_random_uuid();

create unique index if not exists cswo_members_verify_token_key
  on public.cswo_members (verify_token);

create or replace function public.cswo_verify_member(p_token uuid)
returns table (
  full_name     text,
  avatar_url    text,
  blood_group   text,
  phone         text,
  designation   text,
  member_serial int,
  joined_at     date
)
language sql
security definer
set search_path = public
stable
as $$
  select m.full_name, m.avatar_url, m.blood_group, m.phone, m.designation,
         m.member_serial, m.joined_at
  from public.cswo_members m
  where m.verify_token = p_token
    and m.status = 'approved'::cswo_status
  limit 1;
$$;

-- Anonymous scanners need this and nothing else on the table.
revoke all on function public.cswo_verify_member(uuid) from public;
grant execute on function public.cswo_verify_member(uuid) to anon, authenticated;
