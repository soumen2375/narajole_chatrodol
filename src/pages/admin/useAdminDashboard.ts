import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const WEEKS = 12;
const WEEK_MS = 7 * 24 * 3600 * 1000;
const MONTH_MS = 30 * 24 * 3600 * 1000;

const MIX_COLORS = ['#c2410c', '#4d7c0f', '#b45309', '#0f766e', '#78716c', '#9a3412'];

export type ActivityKind = 'event' | 'donation' | 'post' | 'attendance' | 'contribution' | 'volunteer';

export interface QueueItem {
  id: string;
  kind: 'member' | 'post';
  title: string;
  sub: string;
  at: string;
}

export interface Activity {
  id: string;
  kind: ActivityKind;
  name: string;
  extra: string;
  at: string;
}

export interface MixSeg {
  key: string;
  value: number;
  color: string;
}

export interface AdminDashboardData {
  loading: boolean;
  membersTotal: number;
  membersDelta: number;
  membersSpark: number[];
  postsPublished: number;
  postsDelta: number;
  postsSpark: number[];
  eventsYear: number;
  eventsDelta: number;
  eventsSpark: number[];
  donationsYtd: number;
  donationsDeltaPct: number | null;
  donationsSpark: number[];
  pendingMembers: number;
  duesDue: number;
  messages: number;
  volunteers: number;
  donationsWeekly: number[];
  membersCumulative: number[];
  bestWeek: { index: number; value: number };
  avgWeekly: number;
  newMembers: number;
  queue: QueueItem[];
  activity: Activity[];
  mix: { segments: MixSeg[]; total: number; mode: 'donations' | 'posts' };
  refresh: () => void;
}

const EMPTY: Omit<AdminDashboardData, 'refresh'> = {
  loading: true,
  membersTotal: 0, membersDelta: 0, membersSpark: [],
  postsPublished: 0, postsDelta: 0, postsSpark: [],
  eventsYear: 0, eventsDelta: 0, eventsSpark: [],
  donationsYtd: 0, donationsDeltaPct: null, donationsSpark: [],
  pendingMembers: 0, duesDue: 0, messages: 0, volunteers: 0,
  donationsWeekly: [], membersCumulative: [],
  bestWeek: { index: 0, value: 0 }, avgWeekly: 0, newMembers: 0,
  queue: [], activity: [],
  mix: { segments: [], total: 0, mode: 'donations' },
};

function weekBucket(dateStr: string, now: number): number {
  // Returns 0..WEEKS-1 (oldest..current) or -1 if outside the window.
  const diff = now - new Date(dateStr).getTime();
  const w = Math.floor(diff / WEEK_MS);
  if (w < 0 || w >= WEEKS) return -1;
  return WEEKS - 1 - w;
}

export function useAdminDashboard(): AdminDashboardData {
  const [data, setData] = useState<Omit<AdminDashboardData, 'refresh'>>(EMPTY);

  const load = useCallback(async () => {
    const now = Date.now();
    const year = new Date().getFullYear();

    const [membersR, postsR, eventsR, donationsR, contribR, volunteersR, attendanceR, messagesR] = await Promise.all([
      supabase.from('cswo_members').select('id, full_name, status, member_serial, created_at'),
      supabase.from('cswo_posts').select('id, title, author_name, status, category, created_at, published_date'),
      supabase.from('cswo_events').select('id, title, type, event_date, created_at'),
      supabase.from('cswo_donations').select('amount, purpose, status, donor_name, is_anonymous, created_at'),
      supabase.from('cswo_monthly_contributions').select('status, year, amount, paid_at, member_id, updated_at'),
      supabase.from('cswo_volunteer_applications').select('id, name, status, created_at'),
      supabase.from('cswo_attendance').select('status, marked_at, member_id, event_id'),
      supabase.from('cswo_contact_messages').select('id', { count: 'exact', head: true }),
    ]);

    const members = membersR.data ?? [];
    const posts = postsR.data ?? [];
    const events = eventsR.data ?? [];
    const donations = donationsR.data ?? [];
    const contributions = contribR.data ?? [];
    const volunteers = volunteersR.data ?? [];
    const attendance = attendanceR.data ?? [];

    // ── Weekly cumulative helpers ──
    const weekEnd = (i: number) => now - (WEEKS - 1 - i) * WEEK_MS;
    const cumulativeUpTo = (rows: { created_at: string }[]) =>
      Array.from({ length: WEEKS }, (_, i) => rows.filter((r) => new Date(r.created_at).getTime() <= weekEnd(i)).length);

    const membersCumulative = cumulativeUpTo(members);
    const publishedPosts = posts.filter((p) => p.status === 'published');
    const postsSpark = cumulativeUpTo(publishedPosts);
    const eventsSpark = cumulativeUpTo(events);

    // Donations weekly sums (paid only)
    const paid = donations.filter((d) => d.status === 'paid');
    const donationsWeekly = Array.from({ length: WEEKS }, () => 0);
    for (const d of paid) {
      const b = weekBucket(d.created_at, now);
      if (b >= 0) donationsWeekly[b] += Number(d.amount) || 0;
    }

    // ── Headline stats + deltas ──
    const membersDelta = members.filter((m) => now - new Date(m.created_at).getTime() <= MONTH_MS).length;
    const postsDelta = publishedPosts.filter((p) => now - new Date(p.created_at).getTime() <= MONTH_MS).length;

    const eventsYear = events.filter((e) => new Date(e.event_date).getFullYear() === year).length;
    const eventsLastYear = events.filter((e) => new Date(e.event_date).getFullYear() === year - 1).length;

    const donationsYtd = paid.filter((d) => new Date(d.created_at).getFullYear() === year).reduce((s, d) => s + (Number(d.amount) || 0), 0);
    const donationsLastYear = paid.filter((d) => new Date(d.created_at).getFullYear() === year - 1).reduce((s, d) => s + (Number(d.amount) || 0), 0);
    const donationsDeltaPct = donationsLastYear > 0 ? Math.round(((donationsYtd - donationsLastYear) / donationsLastYear) * 100) : null;

    // ── Combo chart summaries ──
    const bestIdx = donationsWeekly.reduce((bi, v, i, a) => (v > a[bi] ? i : bi), 0);
    const avgWeekly = Math.round(donationsWeekly.reduce((s, v) => s + v, 0) / WEEKS);
    const newMembers = members.filter((m) => now - new Date(m.created_at).getTime() <= WEEKS * WEEK_MS).length;

    // ── Quick stats ──
    const pendingMembers = members.filter((m) => m.status === 'pending').length;
    const duesDue = contributions.filter((c) => (c.status === 'unpaid' || c.status === 'pending') && c.year === year).length;
    const volCount = volunteers.filter((v) => v.status === 'new').length || volunteers.length;

    // ── Approval queue (pending members + posts) ──
    const queue: QueueItem[] = [
      ...members.filter((m) => m.status === 'pending').map<QueueItem>((m) => ({
        id: m.id, kind: 'member', title: m.full_name, sub: serial(m.member_serial), at: m.created_at,
      })),
      ...posts.filter((p) => p.status === 'pending').map<QueueItem>((p) => ({
        id: p.id, kind: 'post', title: p.title, sub: p.author_name ?? '', at: p.created_at,
      })),
    ].sort((a, b) => +new Date(b.at) - +new Date(a.at));

    // ── Live activity (newest across tables) ──
    const memberName = new Map(members.map((m) => [m.id, m.full_name]));
    const eventName = new Map(events.map((e) => [e.id, e.title]));
    const acts: Activity[] = [
      ...events.map<Activity>((e) => ({ id: 'e' + e.id, kind: 'event', name: e.title, extra: e.type, at: e.created_at })),
      ...paid.map<Activity>((d, i) => ({ id: 'd' + i, kind: 'donation', name: d.is_anonymous ? '' : d.donor_name ?? '', extra: String(d.amount), at: d.created_at })),
      ...publishedPosts.map<Activity>((p) => ({ id: 'p' + p.id, kind: 'post', name: p.author_name ?? '', extra: p.title, at: p.created_at })),
      ...attendance.map<Activity>((a, i) => ({ id: 'a' + i, kind: 'attendance', name: memberName.get(a.member_id ?? '') ?? '', extra: eventName.get(a.event_id ?? '') ?? '', at: a.marked_at })),
      ...contributions.filter((c) => c.status === 'paid').map<Activity>((c, i) => ({ id: 'c' + i, kind: 'contribution', name: memberName.get(c.member_id ?? '') ?? '', extra: String(c.amount), at: c.paid_at ?? c.updated_at })),
      ...volunteers.map<Activity>((v) => ({ id: 'v' + v.id, kind: 'volunteer', name: v.name, extra: '', at: v.created_at })),
    ]
      .filter((a) => a.at)
      .sort((a, b) => +new Date(b.at) - +new Date(a.at))
      .slice(0, 6);

    // ── Program mix (donations by purpose this year; fallback to posts by category) ──
    const mix = buildMix(paid.filter((d) => new Date(d.created_at).getFullYear() === year), posts);

    setData({
      loading: false,
      membersTotal: members.length, membersDelta, membersSpark: membersCumulative,
      postsPublished: publishedPosts.length, postsDelta, postsSpark,
      eventsYear, eventsDelta: eventsYear - eventsLastYear, eventsSpark,
      donationsYtd, donationsDeltaPct, donationsSpark: donationsWeekly,
      pendingMembers, duesDue, messages: messagesR.count ?? 0, volunteers: volCount,
      donationsWeekly, membersCumulative,
      bestWeek: { index: bestIdx, value: donationsWeekly[bestIdx] ?? 0 }, avgWeekly, newMembers,
      queue, activity: acts, mix,
    });
  }, []);

  useEffect(() => { load(); }, [load]);

  return { ...data, refresh: load };
}

function serial(n: number | null | undefined): string {
  return 'CSWO-' + String(n ?? 0).padStart(4, '0');
}

function buildMix(
  paidThisYear: { purpose: string | null; amount: number }[],
  posts: { category: string }[],
): { segments: MixSeg[]; total: number; mode: 'donations' | 'posts' } {
  const grouped = new Map<string, number>();
  for (const d of paidThisYear) {
    const key = d.purpose?.trim() || 'General';
    grouped.set(key, (grouped.get(key) ?? 0) + (Number(d.amount) || 0));
  }
  let mode: 'donations' | 'posts' = 'donations';
  if (grouped.size === 0) {
    mode = 'posts';
    for (const p of posts) {
      const key = p.category?.trim() || 'News';
      grouped.set(key, (grouped.get(key) ?? 0) + 1);
    }
  }
  const entries = [...grouped.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  const segments: MixSeg[] = entries.map(([key, value], i) => ({ key, value, color: MIX_COLORS[i % MIX_COLORS.length] }));
  return { segments, total, mode };
}
