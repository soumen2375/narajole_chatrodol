-- Migration to fix RLS select policies to allow public (anon) access for unauthenticated visitors.

-- 1. Fix cswo_posts_select RLS policy to allow public anon select
drop policy if exists cswo_posts_select on public.cswo_posts;
create policy cswo_posts_select on public.cswo_posts for select to anon, authenticated
using ((status = 'published'::cswo_post_status) OR (author_id = auth.uid()) OR cswo_can_manage_posts());

-- 2. Fix gallery_select RLS policy to allow public anon select
drop policy if exists gallery_select on public.cswo_gallery;
create policy gallery_select on public.cswo_gallery for select to anon, authenticated
using (((is_active = true) AND (deleted_at IS NULL)) OR (auth.uid() = uploaded_by) OR cswo_can_manage_posts());
