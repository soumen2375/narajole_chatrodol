import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Attendance, CswoEvent, CswoPost, Donation, Member, MonthlyContribution } from '@/types';
import { useFmt } from '@/lib/format';
import { useT } from '@/i18n';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import StatusBadge from '@/components/ui/StatusBadge';

type AttendanceWithEvent = Attendance & { event?: CswoEvent | null };

export default function AdminMemberDetail() {
  const { id } = useParams<{ id: string }>();
  const { member: me } = useAuth();
  const { t, lang } = useT();
  const fmt = useFmt();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);
  const months = fmt.months();

  const [m, setM] = useState<Member | null>(null);
  const [attendance, setAttendance] = useState<AttendanceWithEvent[]>([]);
  const [contrib, setContrib] = useState<Record<number, MonthlyContribution>>({});
  const [donations, setDonations] = useState<Donation[]>([]);
  const [posts, setPosts] = useState<CswoPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [year] = useState(new Date().getFullYear());
  const [defaultAmount, setDefaultAmount] = useState(100);
  const [busyMonth, setBusyMonth] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [mem, att, con, don, pos] = await Promise.all([
      supabase.from('cswo_members').select('*').eq('id', id).maybeSingle(),
      supabase.from('cswo_attendance').select('*, event:cswo_events(*)').eq('member_id', id).order('marked_at', { ascending: false }),
      supabase.from('cswo_monthly_contributions').select('*').eq('member_id', id).eq('year', year),
      supabase.from('cswo_donations').select('*').eq('member_id', id).order('created_at', { ascending: false }),
      supabase.from('cswo_posts').select('*').eq('author_id', id).order('created_at', { ascending: false }),
    ]);
    setM((mem.data ?? null) as Member | null);
    setAttendance((att.data ?? []) as AttendanceWithEvent[]);
    const cm: Record<number, MonthlyContribution> = {};
    for (const r of (con.data ?? []) as MonthlyContribution[]) cm[r.month] = r;
    setContrib(cm);
    setDonations((don.data ?? []) as Donation[]);
    setPosts((pos.data ?? []) as CswoPost[]);
    setLoading(false);
  }, [id, year]);

  useEffect(() => {
    load();
  }, [load]);

  const setMonth = async (month: number, status: 'paid' | 'unpaid') => {
    if (!id) return;
    setBusyMonth(month);
    const existing = contrib[month];
    const amount = existing?.amount ? Number(existing.amount) : defaultAmount;
    await supabase.from('cswo_monthly_contributions').upsert(
      {
        member_id: id, year, month, amount, status,
        paid_at: status === 'paid' ? new Date().toISOString() : null,
        payment_method: status === 'paid' ? 'cash' : null,
        recorded_by: me?.id,
      },
      { onConflict: 'member_id,year,month' },
    );
    await load();
    setBusyMonth(null);
  };

  if (loading) return <DashboardSkeleton />;
  if (!m) return <p className="text-gray-600">{tr('Member not found.', 'সদস্য পাওয়া যায়নি।')}</p>;

  const donated = donations.filter((d) => d.status === 'paid').reduce((s, d) => s + Number(d.amount), 0);
  const paidMonths = Object.values(contrib).filter((c) => c.status === 'paid').length;

  return (
    <div className="space-y-6">
      <Link to="/admin/members" className="text-sm text-blue-600 hover:underline">← {t('a.members')}</Link>

      {/* Profile header */}
      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{m.full_name}</h1>
            <p className="text-gray-600">{m.designation || (m.role === 'admin' ? t('common.admin') : t('common.member'))} · {m.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="badge bg-blue-100 text-blue-800">{m.role === 'admin' ? t('common.admin') : t('common.member')}</span>
            <StatusBadge status={m.status} />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Info label={t('common.phone')} value={m.phone || '—'} />
          <Info label={t('m.bloodGroup')} value={m.blood_group || '—'} />
          <Info label={tr('Joined', 'যোগদান')} value={fmt.date(m.joined_at)} />
          <Info label={t('common.address')} value={m.address || '—'} />
        </div>
        {m.bio && <p className="mt-3 text-sm text-gray-600">{m.bio}</p>}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Mini label={tr('Attended', 'উপস্থিত')} value={fmt.num(attendance.length)} />
        <Mini label={tr('Posts', 'পোস্ট')} value={fmt.num(posts.length)} />
        <Mini label={tr('Total donated', 'মোট দান')} value={fmt.money(donated)} />
        <Mini label={`${fmt.num(year)} ${tr('paid months', 'পরিশোধিত মাস')}`} value={`${fmt.num(paidMonths)}/${fmt.num(12)}`} />
      </div>

      {/* Monthly contributions */}
      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-gray-900">{tr('Monthly dues', 'মাসিক অনুদান')} · {fmt.num(year)}</h2>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">{tr('Default ₹', 'ডিফল্ট ₹')}</span>
            <input type="number" value={defaultAmount} onChange={(e) => setDefaultAmount(Number(e.target.value))} className="w-24 rounded border border-gray-300 px-2 py-1" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {months.map((nm, i) => {
            const month = i + 1;
            const row = contrib[month];
            const paid = row?.status === 'paid';
            return (
              <div key={month} className={`rounded-lg border p-3 ${paid ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{nm}</span>
                  <span className={`badge ${paid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{paid ? tr('Paid', 'পরিশোধিত') : tr('Due', 'বকেয়া')}</span>
                </div>
                <p className="mt-1 text-xs text-gray-500">{row ? fmt.money(Number(row.amount)) : '—'}{row?.payment_method ? ` · ${row.payment_method === 'razorpay' ? tr('online', 'অনলাইন') : tr('cash', 'নগদ')}` : ''}</p>
                <button
                  disabled={busyMonth === month}
                  onClick={() => setMonth(month, paid ? 'unpaid' : 'paid')}
                  className={`mt-2 w-full rounded px-2 py-1 text-xs font-medium ${paid ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'bg-green-600 text-white hover:bg-green-700'}`}
                >
                  {paid ? tr('Mark due', 'বকেয়া করুন') : tr('Mark cash paid', 'নগদ পরিশোধিত')}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Attendance */}
      <Section title={`${tr('Attendance', 'উপস্থিতি')} (${fmt.num(attendance.length)})`}>
        {attendance.length === 0 ? (
          <p className="text-sm text-gray-500">{t('common.none')}</p>
        ) : (
          <ul className="divide-y text-sm">
            {attendance.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-2">
                <span className="text-gray-800">{a.event?.title ?? '—'}</span>
                <span className="flex items-center gap-2 text-gray-500">
                  {a.event ? fmt.date(a.event.event_date) : ''}
                  <span className="badge bg-green-100 text-green-800">{a.status === 'volunteered' ? tr('Volunteer', 'স্বেচ্ছাসেবক') : tr('Present', 'উপস্থিত')}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Donations */}
      <Section title={`${tr('Donations', 'দান')} (${fmt.num(donations.length)})`}>
        {donations.length === 0 ? (
          <p className="text-sm text-gray-500">{t('common.none')}</p>
        ) : (
          <ul className="divide-y text-sm">
            {donations.map((d) => (
              <li key={d.id} className="flex items-center justify-between py-2">
                <span className="font-medium text-gray-800">{fmt.money(Number(d.amount))} <span className="font-normal text-gray-500">· {d.purpose || '—'}</span></span>
                <span className="flex items-center gap-2 text-gray-500">{fmt.date(d.created_at)} <StatusBadge status={d.status} /></span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Posts */}
      <Section title={`${tr('Posts', 'পোস্ট')} (${fmt.num(posts.length)})`}>
        {posts.length === 0 ? (
          <p className="text-sm text-gray-500">{t('common.none')}</p>
        ) : (
          <ul className="divide-y text-sm">
            {posts.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2">
                <span className="text-gray-800">{p.title}</span>
                <span className="flex items-center gap-2 text-gray-500">{fmt.date(p.created_at)} <StatusBadge status={p.status} /></span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-gray-800">{value}</p>
    </div>
  );
}
function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
      <p className="text-2xl font-extrabold text-blue-600">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
      <h2 className="mb-3 text-lg font-bold text-gray-900">{title}</h2>
      {children}
    </div>
  );
}
