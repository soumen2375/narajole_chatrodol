-- Chhatradol Social Welfare Organisation (CSWO) core schema.
-- Tables are prefixed cswo_* to coexist with anything else in the project.

create extension if not exists pgcrypto;

do $$ begin create type cswo_role as enum ('admin','member'); exception when duplicate_object then null; end $$;
do $$ begin create type cswo_status as enum ('pending','approved','rejected','suspended'); exception when duplicate_object then null; end $$;
do $$ begin create type cswo_post_status as enum ('draft','pending','published','rejected'); exception when duplicate_object then null; end $$;
do $$ begin create type cswo_event_type as enum ('event','camp','program'); exception when duplicate_object then null; end $$;
do $$ begin create type cswo_attendance_status as enum ('present','absent','volunteered'); exception when duplicate_object then null; end $$;
do $$ begin create type cswo_payment_status as enum ('created','paid','failed','refunded'); exception when duplicate_object then null; end $$;
do $$ begin create type cswo_contribution_status as enum ('paid','unpaid','pending'); exception when duplicate_object then null; end $$;

create table if not exists public.cswo_members (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  role cswo_role not null default 'member',
  status cswo_status not null default 'pending',
  avatar_url text,
  address text,
  blood_group text,
  bio text,
  designation text,
  joined_at date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cswo_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  category text not null default 'News',
  tags text[] not null default '{}',
  featured_image text,
  author_id uuid references public.cswo_members(id) on delete set null,
  author_name text,
  published_date date not null default current_date,
  slug text unique,
  status cswo_post_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cswo_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  event_date date not null,
  location text,
  type cswo_event_type not null default 'event',
  featured_image text,
  created_by uuid references public.cswo_members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cswo_attendance (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.cswo_events(id) on delete cascade,
  member_id uuid not null references public.cswo_members(id) on delete cascade,
  status cswo_attendance_status not null default 'present',
  note text,
  marked_by uuid references public.cswo_members(id) on delete set null,
  marked_at timestamptz not null default now(),
  unique(event_id, member_id)
);

create table if not exists public.cswo_donations (
  id uuid primary key default gen_random_uuid(),
  donor_name text,
  donor_email text,
  donor_phone text,
  amount numeric(12,2) not null,
  currency text not null default 'INR',
  purpose text,
  member_id uuid references public.cswo_members(id) on delete set null,
  razorpay_order_id text,
  razorpay_payment_id text,
  razorpay_signature text,
  status cswo_payment_status not null default 'created',
  is_anonymous boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cswo_monthly_contributions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.cswo_members(id) on delete cascade,
  year int not null,
  month int not null check (month between 1 and 12),
  amount numeric(12,2) not null default 0,
  status cswo_contribution_status not null default 'unpaid',
  paid_at timestamptz,
  payment_method text,
  razorpay_order_id text,
  razorpay_payment_id text,
  note text,
  recorded_by uuid references public.cswo_members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(member_id, year, month)
);

create table if not exists public.cswo_volunteer_applications (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  area_of_interest text,
  message text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create table if not exists public.cswo_contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  subject text,
  message text not null,
  created_at timestamptz not null default now()
);

-- Helper functions (SECURITY DEFINER avoids RLS recursion on cswo_members)
create or replace function public.cswo_is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.cswo_members m
    where m.id = auth.uid() and m.role = 'admin' and m.status = 'approved');
$$;

create or replace function public.cswo_is_approved()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.cswo_members m
    where m.id = auth.uid() and m.status = 'approved');
$$;

create or replace function public.cswo_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- Non-admins cannot escalate their own role/status
create or replace function public.cswo_guard_member_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.cswo_is_admin() then return new; end if;
  if new.role is distinct from old.role or new.status is distinct from old.status then
    raise exception 'You are not allowed to change role or status';
  end if;
  return new;
end; $$;

drop trigger if exists trg_cswo_members_updated on public.cswo_members;
create trigger trg_cswo_members_updated before update on public.cswo_members
  for each row execute function public.cswo_set_updated_at();
drop trigger if exists trg_cswo_members_guard on public.cswo_members;
create trigger trg_cswo_members_guard before update on public.cswo_members
  for each row execute function public.cswo_guard_member_update();
drop trigger if exists trg_cswo_posts_updated on public.cswo_posts;
create trigger trg_cswo_posts_updated before update on public.cswo_posts
  for each row execute function public.cswo_set_updated_at();
drop trigger if exists trg_cswo_events_updated on public.cswo_events;
create trigger trg_cswo_events_updated before update on public.cswo_events
  for each row execute function public.cswo_set_updated_at();
drop trigger if exists trg_cswo_donations_updated on public.cswo_donations;
create trigger trg_cswo_donations_updated before update on public.cswo_donations
  for each row execute function public.cswo_set_updated_at();
drop trigger if exists trg_cswo_contrib_updated on public.cswo_monthly_contributions;
create trigger trg_cswo_contrib_updated before update on public.cswo_monthly_contributions
  for each row execute function public.cswo_set_updated_at();

alter table public.cswo_members enable row level security;
alter table public.cswo_posts enable row level security;
alter table public.cswo_events enable row level security;
alter table public.cswo_attendance enable row level security;
alter table public.cswo_donations enable row level security;
alter table public.cswo_monthly_contributions enable row level security;
alter table public.cswo_volunteer_applications enable row level security;
alter table public.cswo_contact_messages enable row level security;

create index if not exists idx_cswo_posts_status on public.cswo_posts(status);
create index if not exists idx_cswo_posts_author on public.cswo_posts(author_id);
create index if not exists idx_cswo_attendance_member on public.cswo_attendance(member_id);
create index if not exists idx_cswo_attendance_event on public.cswo_attendance(event_id);
create index if not exists idx_cswo_donations_member on public.cswo_donations(member_id);
create index if not exists idx_cswo_contrib_member on public.cswo_monthly_contributions(member_id);
