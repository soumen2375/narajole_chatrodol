import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Attendance, CswoEvent, CswoPost, Donation, Member, MemberRole, MemberStatus, MonthlyContribution } from '@/types';
import { useFmt } from '@/lib/format';
import { useT } from '@/i18n';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import StatusBadge from '@/components/ui/StatusBadge';
import { compressImage } from '@/lib/imageCompression';
import { getMemberAvatarUrl } from '@/lib/avatar';
import MemberQrPanel from '@/components/ui/MemberQrPanel';

type AttendanceWithEvent = Attendance & { event?: CswoEvent | null };

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function AdminMemberDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
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

  // Edit state
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<{
    full_name: string; phone: string; designation: string;
    blood_group: string; bio: string; address: string;
    role: MemberRole; status: MemberStatus;
    skills: string; expires_at: string;
    can_manage_posts: boolean; can_manage_events: boolean; can_manage_finance: boolean;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarFileRef = useRef<HTMLInputElement>(null);

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
    const member = (mem.data ?? null) as Member | null;
    setM(member);
    setAttendance((att.data ?? []) as AttendanceWithEvent[]);
    const cm: Record<number, MonthlyContribution> = {};
    for (const r of (con.data ?? []) as MonthlyContribution[]) cm[r.month] = r;
    setContrib(cm);
    setDonations((don.data ?? []) as Donation[]);
    setPosts((pos.data ?? []) as CswoPost[]);
    setLoading(false);
    if (member) {
      setEditForm({
        full_name: member.full_name,
        phone: member.phone ?? '',
        designation: member.designation ?? '',
        blood_group: member.blood_group ?? '',
        bio: member.bio ?? '',
        address: member.address ?? '',
        role: member.role,
        status: member.status,
        skills: (member.skills ?? []).join(', '),
        expires_at: member.expires_at ? member.expires_at.slice(0, 10) : '',
        can_manage_posts: member.can_manage_posts ?? false,
        can_manage_events: member.can_manage_events ?? false,
        can_manage_finance: member.can_manage_finance ?? false,
      });
    }
  }, [id, year]);

  useEffect(() => { load(); }, [load]);

  // Deep-link from the Members list "Edit profile" action opens edit mode.
  const [searchParams] = useSearchParams();
  useEffect(() => {
    if (m && searchParams.get('edit') === '1') setEditMode(true);
  }, [m, searchParams]);

  const saveEdit = async () => {
    if (!id || !editForm) return;
    setSaving(true);
    setSaveMsg(null);
    const skillsArr = editForm.skills
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const { error } = await supabase.from('cswo_members').update({
      full_name: editForm.full_name.trim(),
      phone: editForm.phone.trim() || null,
      designation: editForm.designation.trim() || null,
      blood_group: editForm.blood_group || null,
      bio: editForm.bio.trim() || null,
      address: editForm.address.trim() || null,
      role: editForm.role,
      status: editForm.status,
      skills: skillsArr,
      expires_at: editForm.expires_at || null,
      can_manage_posts: editForm.can_manage_posts,
      can_manage_events: editForm.can_manage_events,
      can_manage_finance: editForm.can_manage_finance,
    }).eq('id', id);
    setSaving(false);
    if (error) {
      setSaveMsg({ type: 'err', text: error.message });
    } else {
      setSaveMsg({ type: 'ok', text: tr('Saved.', 'সংরক্ষিত হয়েছে।') });
      setEditMode(false);
      await load();
    }
  };

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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setAvatarUploading(true);
    try {
      // 1. List files starting with member ID to clean up
      const { data: files } = await supabase.storage
        .from('avatars')
        .list('', { search: id });
      
      if (files && files.length > 0) {
        const pathsToDelete = files.map((f) => f.name);
        await supabase.storage.from('avatars').remove(pathsToDelete);
      }

      // 2. Upload timestamped avatar
      const compressed = await compressImage(file, 'avatar');
      const ext  = file.name.split('.').pop() ?? 'jpg';
      const path = `${id}_${Date.now()}.${ext}`;
      await supabase.storage.from('avatars').upload(path, compressed, { upsert: true, contentType: file.type });
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      await supabase.from('cswo_members').update({ avatar_url: publicUrl }).eq('id', id);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setAvatarUploading(false);
      if (avatarFileRef.current) avatarFileRef.current.value = '';
    }
  };

  if (loading) return <DashboardSkeleton />;
  if (!m) return <p className="text-gray-600">{tr('Member not found.', 'সদস্য পাওয়া যায়নি।')}</p>;

  const donated = donations.filter((d) => d.status === 'paid').reduce((s, d) => s + Number(d.amount), 0);
  const paidMonths = Object.values(contrib).filter((c) => c.status === 'paid').length;
  const isSelf = me?.id === id;

  return (
    <div className="space-y-6">
      <button 
        onClick={() => navigate(-1)} 
        className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline cursor-pointer bg-transparent border-0 p-0"
      >
        <ArrowLeft className="h-4 w-4" /> {t('a.members')}
      </button>

      {/* Profile header */}
      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="relative shrink-0">
              {/* Initials always rendered as base layer */}
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-700 text-xl font-bold text-white ring-2 ring-gray-200">
                {m.full_name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)}
              </div>
              {(m.avatar_url || getMemberAvatarUrl(m)) && (
                <img
                  src={m.avatar_url ? `${m.avatar_url}?v=${m.updated_at}` : (getMemberAvatarUrl(m) ?? undefined)}
                  alt={m.full_name}
                  className="absolute inset-0 h-16 w-16 rounded-full object-cover ring-2 ring-gray-200"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              )}
              <button
                type="button"
                onClick={() => avatarFileRef.current?.click()}
                disabled={avatarUploading}
                className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow ring-1 ring-gray-200 hover:bg-gray-50 disabled:opacity-50"
                title="Change avatar"
              >
                {avatarUploading
                  ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
                  : <Camera className="h-3.5 w-3.5 text-gray-500" />}
              </button>
              <input ref={avatarFileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarUpload} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{m.full_name}</h1>
              <p className="text-gray-600">
                {m.designation || (m.role === 'admin' ? t('common.admin') : t('common.member'))} · {m.email}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge bg-blue-100 text-blue-800">
              {m.role === 'admin' ? t('common.admin') : t('common.member')}
            </span>
            <StatusBadge status={m.status} />
            <button
              onClick={() => { setEditMode((v) => !v); setSaveMsg(null); }}
              className={editMode ? 'btn-secondary text-sm' : 'btn-primary text-sm'}
            >
              {editMode ? tr('Cancel', 'বাতিল') : tr('Edit profile', 'প্রোফাইল সম্পাদনা')}
            </button>
          </div>
        </div>

        {/* Read view */}
        {!editMode && (
          <>
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <Info label={t('common.phone')} value={m.phone || '—'} />
              <Info label={t('m.bloodGroup')} value={m.blood_group || '—'} />
              <Info label={tr('Joined', 'যোগদান')} value={fmt.date(m.joined_at)} />
              <Info label={t('common.address')} value={m.address || '—'} />
              {m.expires_at && <Info label={t('m.expiry')} value={fmt.date(m.expires_at)} />}
            </div>
            {m.bio && <p className="mt-3 text-sm text-gray-600">{m.bio}</p>}
            {(m.skills ?? []).length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(m.skills ?? []).map((s) => (
                  <span key={s} className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs text-blue-700">
                    {s}
                  </span>
                ))}
              </div>
            )}
            {(m.can_manage_posts || m.can_manage_events || m.can_manage_finance) && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {m.can_manage_posts   && <span className="rounded-full bg-orange-50 px-2.5 py-0.5 text-xs text-orange-700">{tr('Digital Media', 'ডিজিটাল মিডিয়া')}</span>}
                {m.can_manage_events  && <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-xs text-purple-700">{tr('Secretary', 'সেক্রেটারি')}</span>}
                {m.can_manage_finance && <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs text-green-700">{tr('Treasurer', 'কোষাধ্যক্ষ')}</span>}
              </div>
            )}
          </>
        )}

        {/* Edit form */}
        {editMode && editForm && (
          <div className="mt-2 space-y-3">
            {saveMsg && (
              <p className={`rounded px-3 py-2 text-sm ${saveMsg.type === 'ok' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {saveMsg.text}
              </p>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="label">{t('common.fullName')}</label>
                <input className="input" value={editForm.full_name} onChange={(e) => setEditForm((f) => f && ({ ...f, full_name: e.target.value }))} />
              </div>
              <div>
                <label className="label">{t('common.phone')}</label>
                <input className="input" value={editForm.phone} onChange={(e) => setEditForm((f) => f && ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <label className="label">{t('common.designation')}</label>
                <input className="input" value={editForm.designation} onChange={(e) => setEditForm((f) => f && ({ ...f, designation: e.target.value }))} />
              </div>
              <div>
                <label className="label">{t('m.bloodGroup')}</label>
                <select className="input" value={editForm.blood_group} onChange={(e) => setEditForm((f) => f && ({ ...f, blood_group: e.target.value }))}>
                  <option value="">—</option>
                  {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="label">{t('common.role')}</label>
                <select className="input" value={editForm.role} disabled={isSelf} onChange={(e) => setEditForm((f) => f && ({ ...f, role: e.target.value as MemberRole }))}>
                  <option value="member">{t('common.member')}</option>
                  <option value="admin">{t('common.admin')}</option>
                </select>
              </div>
              <div>
                <label className="label">{t('common.status')}</label>
                <select className="input" value={editForm.status} disabled={isSelf} onChange={(e) => setEditForm((f) => f && ({ ...f, status: e.target.value as MemberStatus }))}>
                  <option value="pending">{tr('Pending', 'অপেক্ষমাণ')}</option>
                  <option value="approved">{tr('Approved', 'অনুমোদিত')}</option>
                  <option value="rejected">{tr('Rejected', 'প্রত্যাখ্যাত')}</option>
                  <option value="suspended">{tr('Suspended', 'স্থগিত')}</option>
                </select>
              </div>
              <div>
                <label className="label">{t('m.expiry')}</label>
                <input type="date" className="input" value={editForm.expires_at} onChange={(e) => setEditForm((f) => f && ({ ...f, expires_at: e.target.value }))} />
              </div>
              <div className="sm:col-span-2">
                <label className="label">{t('common.address')}</label>
                <input className="input" value={editForm.address} onChange={(e) => setEditForm((f) => f && ({ ...f, address: e.target.value }))} />
              </div>
              <div className="sm:col-span-2">
                <label className="label">{t('m.bio')}</label>
                <textarea className="input resize-none" rows={2} value={editForm.bio} onChange={(e) => setEditForm((f) => f && ({ ...f, bio: e.target.value }))} />
              </div>
              <div className="sm:col-span-2">
                <label className="label">{t('m.skills')} <span className="text-xs text-gray-400">({tr('comma-separated', 'কমা দিয়ে আলাদা করুন')})</span></label>
                <input className="input" placeholder="e.g. Teaching, Photography, Medical" value={editForm.skills} onChange={(e) => setEditForm((f) => f && ({ ...f, skills: e.target.value }))} />
              </div>
              <div className="sm:col-span-2">
                <label className="label">{tr('Management Capabilities', 'ব্যবস্থাপনা ক্ষমতা')}</label>
                <div className="mt-1 flex flex-wrap gap-4">
                  {([
                    ['can_manage_posts',   tr('Digital Media — Posts, Gallery, Categories', 'ডিজিটাল মিডিয়া — পোস্ট, গ্যালারি, বিভাগ')],
                    ['can_manage_events',  tr('Secretary — Events, Attendance', 'সেক্রেটারি — অনুষ্ঠান, উপস্থিতি')],
                    ['can_manage_finance', tr('Treasurer — Finance, Dues, Donations, Expenses', 'কোষাধ্যক্ষ — অর্থ, চাঁদা, দান, খরচ')],
                  ] as [keyof typeof editForm, string][]).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!editForm[key]}
                        onChange={(e) => setEditForm((f) => f && ({ ...f, [key]: e.target.checked }))}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={saveEdit} disabled={saving} className="btn-primary">
                {saving ? t('common.saving') : t('common.save')}
              </button>
              <button onClick={() => setEditMode(false)} className="btn-secondary">{t('common.cancel')}</button>
            </div>
          </div>
        )}
      </div>

      {/* ID card QR */}
      <MemberQrPanel member={m} />

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
                  <span className={`badge ${paid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {paid ? tr('Paid', 'পরিশোধিত') : tr('Due', 'বকেয়া')}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {row ? fmt.money(Number(row.amount)) : '—'}
                  {row?.payment_method ? ` · ${row.payment_method === 'razorpay' ? tr('online', 'অনলাইন') : tr('cash', 'নগদ')}` : ''}
                </p>
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
                  <span className="badge bg-green-100 text-green-800">
                    {a.status === 'volunteered' ? tr('Volunteer', 'স্বেচ্ছাসেবক') : tr('Present', 'উপস্থিত')}
                  </span>
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
                <span className="font-medium text-gray-800">
                  {fmt.money(Number(d.amount))} <span className="font-normal text-gray-500">· {d.purpose || '—'}</span>
                </span>
                <span className="flex items-center gap-2 text-gray-500">
                  {fmt.date(d.created_at)} <StatusBadge status={d.status} />
                </span>
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
                <span className="flex items-center gap-2 text-gray-500">
                  {fmt.date(p.created_at)} <StatusBadge status={p.status} />
                </span>
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
