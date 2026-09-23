-- 0068_cswo_partner_outreach.sql
--
-- Register of companies and brands invited to partner with a campaign
-- (Anandadhara 2026 first). One row per invitation email, written by
-- api/send-partnership.ts under the service role; the secretary's panel reads
-- it to see who has been asked, so no company is written to twice by mistake.

create table if not exists public.cswo_partner_outreach (
  id uuid primary key default gen_random_uuid(),
  campaign text not null default 'anandadhara-2026',
  company text not null default '',
  contact_name text not null default '',
  email text not null,
  status text not null default 'sent' check (status in ('sent', 'failed', 'replied', 'partnered', 'declined')),
  message_id text not null default '',
  error text not null default '',
  notes text not null default '',
  sent_by uuid references public.cswo_members(id) on delete set null,
  sent_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cswo_partner_outreach_campaign_email_idx
  on public.cswo_partner_outreach (campaign, lower(email));

alter table public.cswo_partner_outreach enable row level security;

drop policy if exists cswo_partner_outreach_select on public.cswo_partner_outreach;
create policy cswo_partner_outreach_select on public.cswo_partner_outreach
  for select to authenticated using (public.cswo_can_manage_events());

-- The secretary marks replies and outcomes by hand; inserts come from the API.
drop policy if exists cswo_partner_outreach_update on public.cswo_partner_outreach;
create policy cswo_partner_outreach_update on public.cswo_partner_outreach
  for update to authenticated
  using (public.cswo_can_manage_events())
  with check (public.cswo_can_manage_events());

drop trigger if exists cswo_partner_outreach_updated_at on public.cswo_partner_outreach;
create trigger cswo_partner_outreach_updated_at
  before update on public.cswo_partner_outreach
  for each row execute function public.cswo_set_updated_at();
