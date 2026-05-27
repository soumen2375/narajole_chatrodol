-- DDL Migration to add missing indexes for public Gallery & Events page performance.

-- 1. Gallery index for fast active photo queries
create index if not exists idx_cswo_gallery_perf 
on public.cswo_gallery(is_active, deleted_at, sort_order);

-- 2. Posts indexes for status filtering and date sorting
create index if not exists idx_cswo_posts_published_date 
on public.cswo_posts(published_date desc);

create index if not exists idx_cswo_posts_status_date
on public.cswo_posts(status, published_date desc);

-- 3. Events index for fast event date sorting
create index if not exists idx_cswo_events_date 
on public.cswo_events(event_date desc);
