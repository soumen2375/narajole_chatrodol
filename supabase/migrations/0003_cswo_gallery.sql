-- Gallery table for admin-managed photos
create table if not exists public.cswo_gallery (
  id            uuid        primary key default gen_random_uuid(),
  src           text        not null,
  alt_bn        text        not null default '',
  alt_en        text        not null default '',
  category_bn   text        not null default '',
  category_en   text        not null default '',
  more_url      text,
  sort_order    integer     not null default 0,
  is_active     boolean     not null default true,
  uploaded_by   uuid        references public.cswo_members(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.cswo_gallery enable row level security;

-- Drop policies before (re-)creating so the migration is idempotent
drop policy if exists "gallery_select" on public.cswo_gallery;
drop policy if exists "gallery_insert" on public.cswo_gallery;
drop policy if exists "gallery_update" on public.cswo_gallery;
drop policy if exists "gallery_delete" on public.cswo_gallery;

-- Public: read active items; admin: read all
create policy "gallery_select" on public.cswo_gallery
  for select using (
    is_active = true
    or exists (
      select 1 from public.cswo_members
      where id = auth.uid() and role = 'admin'
    )
  );

-- Admin: insert / update / delete
create policy "gallery_insert" on public.cswo_gallery
  for insert with check (
    exists (select 1 from public.cswo_members where id = auth.uid() and role = 'admin')
  );

create policy "gallery_update" on public.cswo_gallery
  for update using (
    exists (select 1 from public.cswo_members where id = auth.uid() and role = 'admin')
  );

create policy "gallery_delete" on public.cswo_gallery
  for delete using (
    exists (select 1 from public.cswo_members where id = auth.uid() and role = 'admin')
  );

-- Seed current static gallery images
insert into public.cswo_gallery (src, alt_bn, alt_en, category_bn, category_en, more_url, sort_order)
values
  ('/assets/images/service/post-33-raktokotha-camp.jpg',         'রক্তদান শিবির',           'Blood donation camp',     'স্বাস্থ্য',   'Health',      null,                                                   1),
  ('/assets/images/impacts/education.jpg',                       'শিক্ষামূলক কর্মসূচি',    'Education programme',     'শিক্ষা',      'Education',   null,                                                   2),
  ('/assets/images/impacts/tree_plantations.jpg',                'বৃক্ষরোপণ অভিযান',       'Tree plantation',         'পরিবেশ',      'Environment', null,                                                   3),
  ('/assets/images/service/post-34-students-book-support.jpg',   'বই বিতরণ',                'Book distribution',       'শিক্ষা',      'Education',   null,                                                   4),
  ('/assets/images/service/post-30-tarpaulin-distribution.jpg',  'ত্রাণ বিতরণ',             'Relief distribution',     'কার্যক্রম',  'Activities',  null,                                                   5),
  ('/assets/images/service/post-20-winter-clothes.jpg',          'শীতবস্ত্র বিতরণ',        'Winter clothing',          'কার্যক্রম',  'Activities',  null,                                                   6),
  ('/assets/images/gallery/khudiram_bose_birthday_01.jpg',       'ক্ষুদিরাম বসুর জন্মদিন','Khudiram Bose''s birthday','অনুষ্ঠান',   'Events',      'https://www.facebook.com/share/r/1JEYCmWWne/',          7),
  ('/assets/images/gallery/ghatal_bdo_farewell.jpg',             'ঘাটাল বিডিও বিদায় সংবর্ধনা','Ghatal BDO farewell', 'অনুষ্ঠান',   'Events',      null,                                                   8)
on conflict do nothing;
