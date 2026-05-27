-- DDL Migration for Admin Dashboard performance optimization.
-- Creates an RPC function to perform all stats aggregations on the server.

create or replace function public.cswo_get_admin_dashboard_metrics(p_now timestamptz)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  p_year int;
  v_members_total bigint;
  v_members_delta bigint;
  v_members_spark bigint[];
  v_posts_published bigint;
  v_posts_delta bigint;
  v_posts_spark bigint[];
  v_events_year bigint;
  v_events_last_year bigint;
  v_events_delta bigint;
  v_events_spark bigint[];
  v_donations_ytd numeric;
  v_donations_last_year numeric;
  v_donations_delta_pct int;
  v_donations_spark numeric[];
  v_pending_members bigint;
  v_dues_due bigint;
  v_messages bigint;
  v_volunteers bigint;
  v_best_week json;
  v_avg_weekly numeric;
  v_new_members bigint;
  v_queue json;
  v_activity json;
  v_mix_count bigint;
  v_mix_mode text;
  v_mix_total numeric;
  v_mix_segments json;
begin
  p_year := extract(year from p_now)::int;

  -- 1. Members
  select count(*) into v_members_total from cswo_members;
  select count(*) into v_members_delta from cswo_members where created_at >= p_now - interval '30 days';

  select array_agg(cnt) into v_members_spark from (
    select (
      select count(*)
      from cswo_members
      where created_at <= p_now - (11 - w.i) * interval '7 days'
    ) as cnt
    from generate_series(0, 11) as w(i)
  ) as t;

  -- 2. Posts
  select count(*) into v_posts_published from cswo_posts where status = 'published';
  select count(*) into v_posts_delta from cswo_posts where status = 'published' and created_at >= p_now - interval '30 days';

  select array_agg(cnt) into v_posts_spark from (
    select (
      select count(*)
      from cswo_posts
      where status = 'published' and created_at <= p_now - (11 - w.i) * interval '7 days'
    ) as cnt
    from generate_series(0, 11) as w(i)
  ) as t;

  -- 3. Events
  select count(*) into v_events_year from cswo_events where extract(year from event_date) = p_year;
  select count(*) into v_events_last_year from cswo_events where extract(year from event_date) = p_year - 1;
  v_events_delta := v_events_year - v_events_last_year;

  select array_agg(cnt) into v_events_spark from (
    select (
      select count(*)
      from cswo_events
      where created_at <= p_now - (11 - w.i) * interval '7 days'
    ) as cnt
    from generate_series(0, 11) as w(i)
  ) as t;

  -- 4. Donations
  select coalesce(sum(amount), 0)::numeric into v_donations_ytd from cswo_donations where status = 'paid' and extract(year from created_at) = p_year;
  select coalesce(sum(amount), 0)::numeric into v_donations_last_year from cswo_donations where status = 'paid' and extract(year from created_at) = p_year - 1;
  if v_donations_last_year > 0 then
    v_donations_delta_pct := round(((v_donations_ytd - v_donations_last_year) / v_donations_last_year) * 100);
  else
    v_donations_delta_pct := null;
  end if;

  select array_agg(coalesce(sum_amt, 0)) into v_donations_spark from (
    select (
      select sum(amount)::numeric
      from cswo_donations
      where status = 'paid'
        and created_at > p_now - (12 - w.i) * interval '7 days'
        and created_at <= p_now - (11 - w.i) * interval '7 days'
    ) as sum_amt
    from generate_series(0, 11) as w(i)
  ) as t;

  -- 5. Headline stats, dues & volunteers
  select count(*) into v_pending_members from cswo_members where status = 'pending';
  select count(*) into v_dues_due from cswo_monthly_contributions where status in ('unpaid', 'pending') and year = p_year;
  select count(*) into v_messages from cswo_contact_messages;

  select case when count(*) filter (where status = 'new') > 0 then count(*) filter (where status = 'new') else count(*) end
  into v_volunteers
  from cswo_volunteer_applications;

  select count(*) into v_new_members from cswo_members where created_at >= p_now - interval '84 days';

  -- 6. Best Week
  select json_build_object('index', idx, 'value', val) into v_best_week
  from (
    select (w.i) as idx, coalesce(v_donations_spark[w.i + 1], 0) as val
    from generate_series(0, 11) as w(i)
    order by val desc, idx asc
    limit 1
  ) as b;

  v_avg_weekly := round(coalesce((select sum(v) from unnest(v_donations_spark) as t(v)), 0) / 12.0);

  -- 7. Approval Queue
  select coalesce(json_agg(q), '[]'::json) into v_queue
  from (
    (
      select id::text, 'member'::text as kind, full_name as title, 'CSWO-' || lpad(coalesce(member_serial, 0)::text, 4, '0') as sub, created_at as at
      from cswo_members where status = 'pending'
      union all
      select id::text, 'post'::text as kind, title, coalesce(author_name, '') as sub, created_at as at
      from cswo_posts where status = 'pending'
    ) order by at desc
  ) q;

  -- 8. Live Activity
  select coalesce(json_agg(act), '[]'::json) into v_activity
  from (
    (
      select 'e' || id::text as id, 'event'::text as kind, title as name, type::text as extra, created_at as at from cswo_events
      union all
      select 'd' || id::text as id, 'donation'::text as kind, case when is_anonymous then '' else coalesce(donor_name, '') end as name, amount::text as extra, created_at as at from cswo_donations where status = 'paid'
      union all
      select 'p' || id::text as id, 'post'::text as kind, coalesce(author_name, '') as name, title as extra, created_at as at from cswo_posts where status = 'published'
      union all
      select 'a' || a.id::text as id, 'attendance'::text as kind, coalesce(m.full_name, '') as name, coalesce(e.title, '') as extra, a.marked_at as at from cswo_attendance a left join cswo_members m on a.member_id = m.id left join cswo_events e on a.event_id = e.id
      union all
      select 'c' || c.id::text as id, 'contribution'::text as kind, coalesce(m.full_name, '') as name, amount::text as extra, coalesce(c.paid_at, c.updated_at) as at from cswo_monthly_contributions c left join cswo_members m on c.member_id = m.id where c.status = 'paid'
      union all
      select 'v' || id::text as id, 'volunteer'::text as kind, name, ''::text as extra, created_at as at from cswo_volunteer_applications
    )
    where at is not null
    order by at desc
    limit 6
  ) act;

  -- 9. Program Mix
  select count(*) into v_mix_count
  from cswo_donations
  where status = 'paid' and extract(year from created_at) = p_year;

  if v_mix_count > 0 then
    v_mix_mode := 'donations';
    select json_agg(t) into v_mix_segments
    from (
      select
        coalesce(nullif(trim(purpose), ''), 'General') as key,
        sum(amount)::numeric as value,
        case (row_number() over (order by sum(amount) desc) - 1) % 6
          when 0 then '#c2410c'
          when 1 then '#4d7c0f'
          when 2 then '#b45309'
          when 3 then '#0f766e'
          when 4 then '#78716c'
          when 5 then '#9a3412'
        end as color
      from cswo_donations
      where status = 'paid' and extract(year from created_at) = p_year
      group by coalesce(nullif(trim(purpose), ''), 'General')
      order by value desc
      limit 6
    ) t;
    select coalesce(sum(amount), 0)::numeric into v_mix_total
    from cswo_donations
    where status = 'paid' and extract(year from created_at) = p_year;
  else
    v_mix_mode := 'posts';
    select json_agg(t) into v_mix_segments
    from (
      select
        coalesce(nullif(trim(category), ''), 'News') as key,
        count(*)::numeric as value,
        case (row_number() over (order by count(*) desc) - 1) % 6
          when 0 then '#c2410c'
          when 1 then '#4d7c0f'
          when 2 then '#b45309'
          when 3 then '#0f766e'
          when 4 then '#78716c'
          when 5 then '#9a3412'
        end as color
      from cswo_posts
      group by coalesce(nullif(trim(category), ''), 'News')
      order by value desc
      limit 6
    ) t;
    select count(*)::numeric into v_mix_total
    from cswo_posts;
  end if;

  -- 10. Assemble and Return JSON
  return json_build_object(
    'membersTotal', v_members_total,
    'membersDelta', v_members_delta,
    'membersSpark', v_members_spark,
    'postsPublished', v_posts_published,
    'postsDelta', v_posts_delta,
    'postsSpark', v_posts_spark,
    'eventsYear', v_events_year,
    'eventsDelta', v_events_delta,
    'eventsSpark', v_events_spark,
    'donationsYtd', v_donations_ytd,
    'donationsDeltaPct', v_donations_delta_pct,
    'donationsSpark', v_donations_spark,
    'pendingMembers', v_pending_members,
    'duesDue', v_dues_due,
    'messages', v_messages,
    'volunteers', v_volunteers,
    'donationsWeekly', v_donations_spark,
    'membersCumulative', v_members_spark,
    'bestWeek', v_best_week,
    'avgWeekly', v_avg_weekly,
    'newMembers', v_new_members,
    'queue', v_queue,
    'activity', v_activity,
    'mix', json_build_object(
      'segments', coalesce(v_mix_segments, '[]'::json),
      'total', v_mix_total,
      'mode', v_mix_mode
    )
  );
end;
$$;

-- Grant execute permissions to public/authenticated/anon
grant execute on function public.cswo_get_admin_dashboard_metrics(timestamptz) to anon, authenticated, service_role;
