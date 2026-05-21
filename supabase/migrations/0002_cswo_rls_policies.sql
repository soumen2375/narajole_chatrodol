-- Row-Level Security policies for CSWO tables.

-- cswo_members
drop policy if exists cswo_members_select on public.cswo_members;
create policy cswo_members_select on public.cswo_members for select to authenticated
  using (id = auth.uid() or public.cswo_is_admin() or (public.cswo_is_approved() and status = 'approved'));
drop policy if exists cswo_members_update_self on public.cswo_members;
create policy cswo_members_update_self on public.cswo_members for update to authenticated
  using (id = auth.uid() or public.cswo_is_admin()) with check (id = auth.uid() or public.cswo_is_admin());
drop policy if exists cswo_members_insert_admin on public.cswo_members;
create policy cswo_members_insert_admin on public.cswo_members for insert to authenticated
  with check (public.cswo_is_admin());
drop policy if exists cswo_members_delete_admin on public.cswo_members;
create policy cswo_members_delete_admin on public.cswo_members for delete to authenticated
  using (public.cswo_is_admin());

-- cswo_posts
drop policy if exists cswo_posts_select on public.cswo_posts;
create policy cswo_posts_select on public.cswo_posts for select to anon, authenticated
  using (status = 'published' or author_id = auth.uid() or public.cswo_is_admin());
drop policy if exists cswo_posts_insert on public.cswo_posts;
create policy cswo_posts_insert on public.cswo_posts for insert to authenticated
  with check (public.cswo_is_admin() or (public.cswo_is_approved() and author_id = auth.uid()));
drop policy if exists cswo_posts_update on public.cswo_posts;
create policy cswo_posts_update on public.cswo_posts for update to authenticated
  using (public.cswo_is_admin() or author_id = auth.uid()) with check (public.cswo_is_admin() or author_id = auth.uid());
drop policy if exists cswo_posts_delete on public.cswo_posts;
create policy cswo_posts_delete on public.cswo_posts for delete to authenticated
  using (public.cswo_is_admin() or author_id = auth.uid());

-- cswo_events
drop policy if exists cswo_events_select on public.cswo_events;
create policy cswo_events_select on public.cswo_events for select to anon, authenticated using (true);
drop policy if exists cswo_events_write_admin on public.cswo_events;
create policy cswo_events_write_admin on public.cswo_events for all to authenticated
  using (public.cswo_is_admin()) with check (public.cswo_is_admin());

-- cswo_attendance
drop policy if exists cswo_attendance_select on public.cswo_attendance;
create policy cswo_attendance_select on public.cswo_attendance for select to authenticated
  using (member_id = auth.uid() or public.cswo_is_admin());
drop policy if exists cswo_attendance_insert on public.cswo_attendance;
create policy cswo_attendance_insert on public.cswo_attendance for insert to authenticated
  with check (public.cswo_is_admin() or (public.cswo_is_approved() and member_id = auth.uid()));
drop policy if exists cswo_attendance_update on public.cswo_attendance;
create policy cswo_attendance_update on public.cswo_attendance for update to authenticated
  using (public.cswo_is_admin() or member_id = auth.uid()) with check (public.cswo_is_admin() or member_id = auth.uid());
drop policy if exists cswo_attendance_delete on public.cswo_attendance;
create policy cswo_attendance_delete on public.cswo_attendance for delete to authenticated
  using (public.cswo_is_admin() or member_id = auth.uid());

-- cswo_donations (writes via service-role edge function)
drop policy if exists cswo_donations_select on public.cswo_donations;
create policy cswo_donations_select on public.cswo_donations for select to authenticated
  using (member_id = auth.uid() or public.cswo_is_admin());
drop policy if exists cswo_donations_admin_write on public.cswo_donations;
create policy cswo_donations_admin_write on public.cswo_donations for all to authenticated
  using (public.cswo_is_admin()) with check (public.cswo_is_admin());

-- cswo_monthly_contributions
drop policy if exists cswo_contrib_select on public.cswo_monthly_contributions;
create policy cswo_contrib_select on public.cswo_monthly_contributions for select to authenticated
  using (member_id = auth.uid() or public.cswo_is_admin());
drop policy if exists cswo_contrib_admin_write on public.cswo_monthly_contributions;
create policy cswo_contrib_admin_write on public.cswo_monthly_contributions for all to authenticated
  using (public.cswo_is_admin()) with check (public.cswo_is_admin());

-- cswo_volunteer_applications
drop policy if exists cswo_volunteer_insert on public.cswo_volunteer_applications;
create policy cswo_volunteer_insert on public.cswo_volunteer_applications for insert to anon, authenticated with check (true);
drop policy if exists cswo_volunteer_admin on public.cswo_volunteer_applications;
create policy cswo_volunteer_admin on public.cswo_volunteer_applications for all to authenticated
  using (public.cswo_is_admin()) with check (public.cswo_is_admin());

-- cswo_contact_messages
drop policy if exists cswo_contact_insert on public.cswo_contact_messages;
create policy cswo_contact_insert on public.cswo_contact_messages for insert to anon, authenticated with check (true);
drop policy if exists cswo_contact_admin on public.cswo_contact_messages;
create policy cswo_contact_admin on public.cswo_contact_messages for all to authenticated
  using (public.cswo_is_admin()) with check (public.cswo_is_admin());
