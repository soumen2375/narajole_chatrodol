import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Mail, Users, Droplet, Send, Star, Trash2, RefreshCw,
  MailOpen, Search, Phone, Calendar, Building2, AlertCircle,
  CheckCircle2, MessageSquare, RotateCcw,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { ContactMessage, VolunteerApplication, Member } from '@/types';
import { useFmt } from '@/lib/format';
import { useT } from '@/i18n';
import { ListSkeleton } from '@/components/ui/Skeleton';


// ─── Types ─────────────────────────────────────────────────────────────────
interface BloodRequest {
  id: string;
  patient_name: string;
  blood_group: string;
  hospital: string;
  contact_phone: string;
  units_needed: number;
  required_by: string | null;
  requester_name: string | null;
  message: string | null;
  status: string;
  created_at: string;
}
interface BloodCampApp {
  id: string;
  org_name: string | null;
  contact_name: string;
  contact_phone: string;
  contact_email: string | null;
  proposed_date: string | null;
  proposed_venue: string;
  expected_donors: number | null;
  message: string | null;
  status: string;
  created_at: string;
}
interface AdminMsg {
  id: string; member_id: string; sender_name: string; message: string;
  is_read: boolean; created_at: string; member?: { full_name: string };
}
interface MemberDM {
  id: string; from_id: string; to_id: string | null; to_role: string | null;
  subject: string; body: string; is_read: boolean; created_at: string;
  from?: { full_name: string; avatar_url: string | null };
  to?:   { full_name: string; avatar_url: string | null };
}

// ─── Design tokens ────────────────────────────────────────────────────────
const TEAL  = '#0c756f';
const GOLD  = '#b8860b';
const INK   = '#1c1917';
const INK2  = '#44403c';
const MUTED = '#78716c';
const RULE  = '#e7e5e4';
const PAPER = '#ffffff';
const CREAM = '#faf8f5';
const RED   = '#b91c1c';
const BLUE  = '#1d4ed8';
const GREEN = '#4d7c0f';
const PURPLE = '#7c3aed';

// ─── Category helpers ─────────────────────────────────────────────────────
const CATS = ['general','help','blood','donation','volunteer','media','complaint','environment'];
const CAT_COLOR: Record<string, string> = {
  help: BLUE, blood: RED, donation: GREEN, volunteer: TEAL,
  media: PURPLE, complaint: '#c2410c', environment: '#65a30d', general: MUTED,
};
const autoCat = (m: ContactMessage): string => {
  if (m.category && m.category !== 'general') return m.category;
  const s = `${m.subject ?? ''} ${m.message ?? ''}`.toLowerCase();
  if (/blood|রক্ত/i.test(s)) return 'blood';
  if (/donat|receipt|রসিদ|অনুদান/i.test(s)) return 'donation';
  if (/help|scholarship|assist|সাহায্য|বৃত্তি/i.test(s)) return 'help';
  if (/volunteer|স্বেচ্ছা/i.test(s)) return 'volunteer';
  if (/photo|media|press|ছবি/i.test(s)) return 'media';
  if (/complain|issue|problem|অভিযোগ/i.test(s)) return 'complaint';
  if (/environment|tree|plant|পরিবেশ/i.test(s)) return 'environment';
  return 'general';
};
const initials = (n: string) =>
  n.split(' ').filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '·';

// ─── Smart reply drafts ───────────────────────────────────────────────────
const DRAFTS: Record<string, { en: string; bn: string }[]> = {
  help: [
    { en: 'Thank you for reaching out. We have received your request and will review it within 5–7 working days.', bn: 'আপনার আবেদন পেয়েছি। আমরা ৫–৭ কর্মদিবসের মধ্যে যাচাই করে যোগাযোগ করব।' },
  ],
  blood: [
    { en: 'Thank you for reaching out about blood. We will coordinate with our blood-camp team and confirm shortly.', bn: 'রক্তদান সংক্রান্ত বার্তার জন্য ধন্যবাদ। আমরা শিবির টিমের সাথে সমন্বয় করে শীঘ্রই জানাব।' },
  ],
  donation: [
    { en: 'Thank you for your generous donation. Your receipt will be emailed within 24 hours.', bn: 'আপনার দানের জন্য কৃতজ্ঞতা। রসিদ ২৪ ঘণ্টার মধ্যে ইমেলে পাঠানো হবে।' },
  ],
  volunteer: [
    { en: 'Welcome to Chhatradol! We will send details about the next volunteer orientation shortly.', bn: 'ছাত্রদলে স্বাগতম! পরবর্তী ওরিয়েন্টেশনের বিস্তারিত শীঘ্রই পাঠানো হবে।' },
  ],
  general: [
    { en: 'Thank you for getting in touch. We will respond within 24 hours.', bn: 'আপনার বার্তার জন্য ধন্যবাদ। ২৪ ঘণ্টার মধ্যে উত্তর দেওয়া হবে।' },
  ],
};

type MainTab = 'contact' | 'volunteer' | 'blood_request' | 'blood_camp' | 'member_dms' | 'compose';

// ═══════════════════════════════════════════════════════════════════════════
export default function AdminMessages() {
  const { member: me } = useAuth();
  const { t, lang } = useT();
  const fmt = useFmt();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);

  const [tab, setTab] = useState<MainTab>('contact');
  const [search, setSearch] = useState('');

  // Contact
  const [contacts, setContacts] = useState<ContactMessage[]>([]);
  const [selectedContact, setSelectedContact] = useState<ContactMessage | null>(null);
  const [replyText, setReplyText] = useState('');
  const [draftIdx, setDraftIdx] = useState(0);
  const [savingReply, setSavingReply] = useState(false);

  // Volunteer
  const [volunteers, setVolunteers] = useState<VolunteerApplication[]>([]);
  const [selectedVol, setSelectedVol] = useState<VolunteerApplication | null>(null);

  // Blood Request
  const [bloodRequests, setBloodRequests] = useState<BloodRequest[]>([]);
  const [selectedBR, setSelectedBR] = useState<BloodRequest | null>(null);

  // Blood Camp
  const [bloodCamps, setBloodCamps] = useState<BloodCampApp[]>([]);
  const [selectedBC, setSelectedBC] = useState<BloodCampApp | null>(null);

  // Member DMs
  const [memberDMs, setMemberDMs] = useState<MemberDM[]>([]);
  const [selectedDM, setSelectedDM] = useState<MemberDM | null>(null);
  const [dmReply, setDmReply] = useState('');
  const [sendingDmReply, setSendingDmReply] = useState(false);

  // Compose
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [senderName, setSenderName] = useState('Admin');
  const [msgText, setMsgText] = useState('');
  const [adminMsgs, setAdminMsgs] = useState<AdminMsg[]>([]);
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState('');
  const [sendError, setSendError] = useState('');

  const [loading, setLoading] = useState(true);

  // ── Load data ──────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    const [c, v, br, bc, dm, am, mem] = await Promise.all([
      supabase.from('cswo_contact_messages').select('*').order('created_at', { ascending: false }),
      supabase.from('cswo_volunteer_applications').select('*').order('created_at', { ascending: false }),
      supabase.from('cswo_blood_requests').select('*').order('created_at', { ascending: false }),
      supabase.from('cswo_blood_camp_applications').select('*').order('created_at', { ascending: false }),
      supabase.from('cswo_member_messages')
        .select('*, from:from_id(full_name,avatar_url), to:to_id(full_name,avatar_url)')
        .or('to_role.eq.admin,to_role.eq.treasurer,to_role.eq.secretary,to_role.eq.digital')
        .order('created_at', { ascending: false }),
      supabase.from('cswo_admin_messages').select('*, member:cswo_members(full_name)').order('created_at', { ascending: false }),
      supabase.from('cswo_members').select('id,full_name,status').eq('status', 'approved').order('full_name'),
    ]);
    setContacts((c.data ?? []) as ContactMessage[]);
    setVolunteers((v.data ?? []) as VolunteerApplication[]);
    setBloodRequests((br.data ?? []) as BloodRequest[]);
    setBloodCamps((bc.data ?? []) as BloodCampApp[]);
    setMemberDMs((dm.data ?? []) as MemberDM[]);
    setAdminMsgs((am.data ?? []) as AdminMsg[]);
    setMembers((mem.data ?? []) as Member[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    if (!me) return;
    const ch = supabase.channel('admin_msgs_rt_v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cswo_contact_messages' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cswo_volunteer_applications' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cswo_blood_requests' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cswo_blood_camp_applications' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cswo_member_messages' }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load, me]);

  // ── Derived counts ─────────────────────────────────────────────────
  const contactUnread = contacts.filter((m) => !m.is_read).length;
  const volPending    = volunteers.filter((v) => v.status === 'pending').length;
  const brOpen        = bloodRequests.filter((r) => r.status === 'open').length;
  const bcPending     = bloodCamps.filter((c) => c.status === 'pending').length;
  const dmUnread      = memberDMs.filter((d) => !d.is_read).length;

  // ── Contact helpers ────────────────────────────────────────────────
  const filteredContacts = useMemo(() => {
    const q = search.toLowerCase();
    return contacts.filter((m) =>
      !q || m.name.toLowerCase().includes(q) ||
      (m.subject ?? '').toLowerCase().includes(q) ||
      (m.message ?? '').toLowerCase().includes(q)
    );
  }, [contacts, search]);

  const openContact = async (m: ContactMessage) => {
    setSelectedContact(m);
    setReplyText(m.admin_reply ?? '');
    setDraftIdx(0);
    if (!m.is_read) {
      setContacts((arr) => arr.map((c) => c.id === m.id ? { ...c, is_read: true } : c));
      await supabase.from('cswo_contact_messages').update({ is_read: true }).eq('id', m.id);
    }
  };

  const sendContactReply = async () => {
    if (!selectedContact || !replyText.trim()) return;
    setSavingReply(true);
    const patch = { admin_reply: replyText.trim(), replied_at: new Date().toISOString(), replied_by: me?.id ?? null, is_read: true };
    await supabase.from('cswo_contact_messages').update(patch).eq('id', selectedContact.id);
    setContacts((arr) => arr.map((c) => c.id === selectedContact.id ? { ...c, ...patch } : c));
    setSelectedContact((prev) => prev ? { ...prev, ...patch } : prev);
    setSavingReply(false);
  };

  const deleteContact = async (id: string) => {
    if (!confirm(tr('Delete this message?', 'এই বার্তাটি মুছবেন?'))) return;
    await supabase.from('cswo_contact_messages').delete().eq('id', id);
    setContacts((arr) => arr.filter((m) => m.id !== id));
    if (selectedContact?.id === id) setSelectedContact(null);
  };

  const starContact = async (m: ContactMessage) => {
    const upd = { is_starred: !m.is_starred };
    setContacts((arr) => arr.map((c) => c.id === m.id ? { ...c, ...upd } : c));
    if (selectedContact?.id === m.id) setSelectedContact((p) => p ? { ...p, ...upd } : p);
    await supabase.from('cswo_contact_messages').update(upd).eq('id', m.id);
  };

  const markAllContactRead = async () => {
    const ids = contacts.filter((m) => !m.is_read).map((m) => m.id);
    if (!ids.length) return;
    setContacts((arr) => arr.map((m) => ({ ...m, is_read: true })));
    await supabase.from('cswo_contact_messages').update({ is_read: true }).in('id', ids);
  };

  const cat = selectedContact ? autoCat(selectedContact) : 'general';
  const drafts = DRAFTS[cat] ?? DRAFTS.general;
  const draftText = drafts[draftIdx % drafts.length]?.[lang === 'bn' ? 'bn' : 'en'] ?? '';

  // ── Volunteer helpers ──────────────────────────────────────────────
  const filteredVols = useMemo(() => {
    const q = search.toLowerCase();
    return volunteers.filter((v) =>
      !q || v.name.toLowerCase().includes(q) ||
      (v.email ?? '').toLowerCase().includes(q) ||
      (v.area_of_interest ?? '').toLowerCase().includes(q)
    );
  }, [volunteers, search]);

  const updateVolStatus = async (id: string, status: string) => {
    await supabase.from('cswo_volunteer_applications').update({ status }).eq('id', id);
    setVolunteers((arr) => arr.map((v) => v.id === id ? { ...v, status } : v));
    if (selectedVol?.id === id) setSelectedVol((p) => p ? { ...p, status } : p);
  };

  // ── Blood Request helpers ──────────────────────────────────────────
  const filteredBR = useMemo(() => {
    const q = search.toLowerCase();
    return bloodRequests.filter((r) =>
      !q || r.patient_name.toLowerCase().includes(q) ||
      r.blood_group.toLowerCase().includes(q) ||
      r.hospital.toLowerCase().includes(q)
    );
  }, [bloodRequests, search]);

  const updateBRStatus = async (id: string, status: string) => {
    await supabase.from('cswo_blood_requests').update({ status }).eq('id', id);
    setBloodRequests((arr) => arr.map((r) => r.id === id ? { ...r, status } : r));
    if (selectedBR?.id === id) setSelectedBR((p) => p ? { ...p, status } : p);
  };

  // ── Blood Camp helpers ─────────────────────────────────────────────
  const filteredBC = useMemo(() => {
    const q = search.toLowerCase();
    return bloodCamps.filter((c) =>
      !q || (c.org_name ?? '').toLowerCase().includes(q) ||
      c.contact_name.toLowerCase().includes(q) ||
      c.proposed_venue.toLowerCase().includes(q)
    );
  }, [bloodCamps, search]);

  const updateBCStatus = async (id: string, status: string) => {
    await supabase.from('cswo_blood_camp_applications').update({ status }).eq('id', id);
    setBloodCamps((arr) => arr.map((c) => c.id === id ? { ...c, status } : c));
    if (selectedBC?.id === id) setSelectedBC((p) => p ? { ...p, status } : p);
  };

  // ── Compose ────────────────────────────────────────────────────────
  const handleSend = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedMemberId || !msgText.trim() || !senderName.trim()) return;
    setSending(true); setSendError(''); setSendSuccess('');
    const { error } = await supabase.from('cswo_admin_messages').insert({ member_id: selectedMemberId, sender_name: senderName.trim(), message: msgText.trim() });
    setSending(false);
    if (error) { setSendError(error.message); return; }
    setSendSuccess(tr('Message sent!', 'বার্তা পাঠানো হয়েছে!'));
    setMsgText(''); setSelectedMemberId('');
    load();
    setTimeout(() => setSendSuccess(''), 2500);
  };

  const dt = (s: string) => {
    const d = new Date(s); const today = new Date();
    return d.toDateString() === today.toDateString()
      ? d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      : fmt.date(s);
  };

  // ── Clear selections on tab switch ────────────────────────────────
  const switchTab = (k: MainTab) => {
    setTab(k); setSearch('');
    setSelectedContact(null); setSelectedVol(null);
    setSelectedBR(null); setSelectedBC(null); setSelectedDM(null);
  };

  // ─── RENDER ───────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: MUTED }}>
            {tr('Communication', 'যোগাযোগ')}
          </p>
          <h1 className="mt-1 text-[26px] font-bold" style={{ color: INK, fontFamily: '"Noto Serif Bengali", serif' }}>
            {tr('Messages & Applications', 'বার্তা ও আবেদন')}
          </h1>
          <p className="mt-1 text-[13px]" style={{ color: INK2 }}>
            {tr('All form responses in one place — Contact, Volunteer, Blood Request, Blood Camp.',
               'সব ফর্ম রেসপন্স একসাথে — যোগাযোগ, স্বেচ্ছাসেবক, রক্তের অনুরোধ, রক্তদান শিবির।')}
          </p>
        </div>
        <button onClick={load} title="Refresh"
          className="flex h-9 w-9 items-center justify-center rounded-full border transition-colors hover:bg-gray-50"
          style={{ borderColor: RULE }}>
          <RefreshCw className="h-4 w-4" style={{ color: MUTED }} />
        </button>
      </div>

      {/* ── Summary Stats ── */}
      {!loading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <SummaryCard label={tr('Contact Unread', 'যোগাযোগ')} value={contactUnread} color={BLUE} icon={<Mail className="h-4 w-4" />} onClick={() => switchTab('contact')} />
          <SummaryCard label={tr('Volunteers Pending', 'স্বেচ্ছাসেবক')} value={volPending} color={TEAL} icon={<Users className="h-4 w-4" />} onClick={() => switchTab('volunteer')} />
          <SummaryCard label={tr('Blood Requests Open', 'রক্ত অনুরোধ')} value={brOpen} color={RED} icon={<Droplet className="h-4 w-4" />} onClick={() => switchTab('blood_request')} />
          <SummaryCard label={tr('Camp Apps Pending', 'শিবির আবেদন')} value={bcPending} color={PURPLE} icon={<AlertCircle className="h-4 w-4" />} onClick={() => switchTab('blood_camp')} />
          <SummaryCard label={tr('Member DMs Unread', 'সদস্য বার্তা')} value={dmUnread} color={GOLD} icon={<MessageSquare className="h-4 w-4" />} onClick={() => switchTab('member_dms')} />
        </div>
      )}

      {/* ── Tab bar ── */}
      <div className="flex flex-wrap gap-0 overflow-hidden rounded-xl border" style={{ borderColor: RULE }}>
        {([
          { k: 'contact'      as MainTab, label: tr('Contact', 'যোগাযোগ'),             icon: Mail,           count: contactUnread, color: BLUE   },
          { k: 'volunteer'    as MainTab, label: tr('Volunteer', 'স্বেচ্ছাসেবক'),      icon: Users,          count: volPending,    color: TEAL   },
          { k: 'blood_request'as MainTab, label: tr('Blood Request', 'রক্ত অনুরোধ'),   icon: Droplet,        count: brOpen,        color: RED    },
          { k: 'blood_camp'   as MainTab, label: tr('Blood Camp', 'রক্ত শিবির'),        icon: AlertCircle,    count: bcPending,     color: PURPLE },
          { k: 'member_dms'   as MainTab, label: tr('Member DMs', 'সদস্য বার্তা'),      icon: MessageSquare,  count: dmUnread,      color: GOLD   },
          { k: 'compose'      as MainTab, label: tr('Compose', 'লিখুন'),               icon: Send,           count: 0,             color: TEAL   },
        ] as { k: MainTab; label: string; icon: React.FC<{ className?: string }>; count: number; color: string }[]).map(({ k, label, icon: Icon, count, color }, idx, arr) => (
          <button key={k} onClick={() => switchTab(k)}
            className="flex flex-1 min-w-max items-center justify-center gap-1.5 px-4 py-3 text-[12.5px] font-semibold transition-all"
            style={{
              background: tab === k ? color : CREAM,
              color: tab === k ? '#fff' : INK2,
              borderRight: idx < arr.length - 1 ? `1px solid ${RULE}` : undefined,
            }}>
            <Icon className="h-3.5 w-3.5" />
            {label}
            {count > 0 && (
              <span className="ml-0.5 inline-flex h-4.5 min-w-[18px] items-center justify-center rounded-full px-1 text-[9px] font-bold"
                style={{ background: tab === k ? 'rgba(255,255,255,0.3)' : `${color}22`, color: tab === k ? '#fff' : color }}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? <ListSkeleton rows={6} /> : (
        <>
          {/* ══════════ CONTACT TAB ══════════ */}
          {tab === 'contact' && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[340px_1fr]">
              {/* List panel */}
              <div className="rounded-xl border overflow-hidden" style={{ background: PAPER, borderColor: RULE }}>
                <div className="flex items-center gap-2 border-b px-3 py-2.5" style={{ borderColor: RULE }}>
                  <Search className="h-3.5 w-3.5 flex-shrink-0" style={{ color: MUTED }} />
                  <input value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder={tr('Search messages…', 'বার্তা খুঁজুন…')}
                    className="flex-1 bg-transparent text-[12.5px] outline-none" style={{ color: INK }} />
                  {contactUnread > 0 && (
                    <button onClick={markAllContactRead} className="whitespace-nowrap text-[10px] font-semibold" style={{ color: TEAL }}>
                      {tr('Mark all read', 'সব পঠিত')}
                    </button>
                  )}
                </div>
                <div className="max-h-[600px] overflow-y-auto">
                  {filteredContacts.length === 0
                    ? <EmptyState label={tr('No messages found.', 'কোনো বার্তা নেই।')} />
                    : filteredContacts.map((m, i) => {
                      const c = autoCat(m);
                      const active = selectedContact?.id === m.id;
                      return (
                        <button key={m.id} onClick={() => openContact(m)}
                          className="flex w-full items-start gap-2.5 px-3 py-3 text-left transition-colors hover:bg-black/[0.02]"
                          style={{ background: active ? '#f0fdf8' : m.is_read ? 'transparent' : 'rgba(12,117,111,0.03)', borderTop: i === 0 ? undefined : `1px solid ${RULE}` }}>
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white" style={{ background: TEAL }}>{initials(m.name)}</span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-1.5">
                              <span className="truncate text-[13px] font-semibold" style={{ color: INK }}>{m.name}</span>
                              {m.is_starred && <Star className="h-3 w-3 fill-current" style={{ color: GOLD }} />}
                              <span className="ml-auto shrink-0 font-mono text-[10px]" style={{ color: MUTED }}>{dt(m.created_at)}</span>
                            </span>
                            <span className="mt-0.5 block truncate text-[12px] font-medium" style={{ color: m.is_read ? INK2 : INK }}>{m.subject || (m.message || '').slice(0, 60)}</span>
                            <span className="mt-0.5 block truncate text-[11.5px]" style={{ color: MUTED }}>{(m.message || '').slice(0, 80)}</span>
                            <span className="mt-1 inline-flex items-center gap-2">
                              <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: `${CAT_COLOR[c]}1a`, color: CAT_COLOR[c] }}>{c}</span>
                              {!m.is_read && <span className="h-1.5 w-1.5 rounded-full" style={{ background: TEAL }} />}
                              {m.replied_at && <span className="font-mono text-[9px] uppercase" style={{ color: GREEN }}>✓ {tr('replied', 'উত্তর')}</span>}
                            </span>
                          </span>
                        </button>
                      );
                    })
                  }
                </div>
              </div>

              {/* Detail panel */}
              <div className="rounded-xl border p-5" style={{ background: PAPER, borderColor: RULE }}>
                {!selectedContact
                  ? <EmptyState label={tr('Select a message to read.', 'পড়তে একটি বার্তা বেছে নিন।')} />
                  : (
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-11 w-11 items-center justify-center rounded-full text-[14px] font-bold text-white" style={{ background: TEAL }}>{initials(selectedContact.name)}</span>
                          <div>
                            <div className="text-[15px] font-semibold" style={{ color: INK }}>{selectedContact.name}</div>
                            <div className="text-[12px]" style={{ color: MUTED }}>{[selectedContact.email, selectedContact.phone].filter(Boolean).join(' · ') || '—'}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => starContact(selectedContact)}
                            className="flex h-8 w-8 items-center justify-center rounded-full transition-colors"
                            style={{ background: selectedContact.is_starred ? `${GOLD}22` : 'transparent', border: `1px solid ${RULE}` }}>
                            <Star className="h-4 w-4" fill={selectedContact.is_starred ? GOLD : 'none'} stroke={selectedContact.is_starred ? GOLD : MUTED} />
                          </button>
                          <select value={selectedContact.category || 'general'}
                            onChange={async (e) => {
                              const category = e.target.value;
                              setContacts((arr) => arr.map((m) => m.id === selectedContact.id ? { ...m, category } : m));
                              setSelectedContact((p) => p ? { ...p, category } : p);
                              await supabase.from('cswo_contact_messages').update({ category }).eq('id', selectedContact.id);
                            }}
                            className="rounded-lg px-2 py-1 text-[12px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK2 }}>
                            {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <button onClick={() => deleteContact(selectedContact.id)}
                            className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-red-50"
                            style={{ border: `1px solid ${RULE}` }}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <div className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: MUTED }}>{tr('Subject', 'বিষয়')} · {dt(selectedContact.created_at)}</div>
                        <h2 className="mt-1 text-[18px] font-semibold" style={{ color: INK, fontFamily: '"Noto Serif Bengali", serif' }}>{selectedContact.subject || tr('(no subject)', '(কোনো বিষয় নেই)')}</h2>
                        <p className="mt-3 whitespace-pre-line text-[13.5px] leading-relaxed" style={{ color: INK2 }}>{selectedContact.message}</p>
                      </div>

                      {selectedContact.replied_at && (
                        <div className="rounded-lg p-3" style={{ background: 'rgba(77,124,15,0.08)' }}>
                          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: GREEN }}>
                            <CheckCircle2 className="h-3.5 w-3.5" /> {tr('Sent reply', 'প্রেরিত উত্তর')} · {fmt.date(selectedContact.replied_at)}
                          </div>
                          <p className="mt-1.5 whitespace-pre-line text-[13px]" style={{ color: INK }}>{selectedContact.admin_reply}</p>
                        </div>
                      )}

                      {/* Smart draft */}
                      {draftText && (
                        <div className="rounded-lg p-3" style={{ background: CREAM, border: `1px dashed ${RULE}` }}>
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: GOLD }}>AUTO-DRAFT · {cat}</span>
                          </div>
                          <p className="mt-1.5 text-[12.5px]" style={{ color: INK2 }}>{draftText}</p>
                          <div className="mt-2 flex gap-2">
                            <button onClick={() => setReplyText(draftText)} className="rounded-full px-3 py-1 text-[12px] font-semibold text-white" style={{ background: TEAL }}>{tr('Use draft', 'খসড়া ব্যবহার')}</button>
                            {drafts.length > 1 && (
                              <button onClick={() => setDraftIdx((i) => i + 1)} className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[12px] font-medium" style={{ border: `1px solid ${RULE}`, color: INK2 }}>
                                <RotateCcw className="h-3 w-3" />{tr('Next', 'পরের')}
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="rounded-lg p-3" style={{ border: `1px solid ${RULE}` }}>
                        <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} rows={3}
                          placeholder={tr('Write reply… (Ctrl+Enter to send)', 'উত্তর লিখুন…')}
                          onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); sendContactReply(); } }}
                          className="w-full resize-none rounded-lg px-3 py-2 text-[13.5px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK }} />
                        <div className="mt-2 flex items-center justify-between">
                          <div className="text-[11px]" style={{ color: MUTED }}>
                            {selectedContact.email && (
                              <a href={`mailto:${selectedContact.email}?subject=${encodeURIComponent('Re: ' + (selectedContact.subject ?? ''))}&body=${encodeURIComponent(replyText)}`}
                                className="font-semibold" style={{ color: TEAL }}>
                                {tr('Open in email ↗', 'ইমেলে খুলুন ↗')}
                              </a>
                            )}
                          </div>
                          <button onClick={sendContactReply} disabled={savingReply || !replyText.trim()}
                            className="inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
                            style={{ background: TEAL }}>
                            {savingReply ? tr('Saving…', 'সংরক্ষণ…') : <><Send className="h-3.5 w-3.5" />{tr('Send Reply', 'পাঠান')}</>}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
              </div>
            </div>
          )}

          {/* ══════════ VOLUNTEER TAB ══════════ */}
          {tab === 'volunteer' && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[340px_1fr]">
              <div className="rounded-xl border overflow-hidden" style={{ background: PAPER, borderColor: RULE }}>
                <div className="flex items-center gap-2 border-b px-3 py-2.5" style={{ borderColor: RULE }}>
                  <Search className="h-3.5 w-3.5 shrink-0" style={{ color: MUTED }} />
                  <input value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder={tr('Search applicants…', 'আবেদনকারী খুঁজুন…')}
                    className="flex-1 bg-transparent text-[12.5px] outline-none" style={{ color: INK }} />
                </div>
                <div className="max-h-[600px] overflow-y-auto">
                  {filteredVols.length === 0
                    ? <EmptyState label={tr('No volunteer applications.', 'কোনো স্বেচ্ছাসেবক আবেদন নেই।')} />
                    : filteredVols.map((v, i) => (
                      <button key={v.id} onClick={() => setSelectedVol(v)}
                        className="flex w-full items-start gap-2.5 px-3 py-3 text-left transition-colors hover:bg-black/[0.02]"
                        style={{ background: selectedVol?.id === v.id ? '#f0fdf8' : 'transparent', borderTop: i === 0 ? undefined : `1px solid ${RULE}` }}>
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white" style={{ background: TEAL }}>{initials(v.name)}</span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-[13px] font-semibold" style={{ color: INK }}>{v.name}</span>
                            <span className="ml-auto font-mono text-[10px]" style={{ color: MUTED }}>{dt(v.created_at)}</span>
                          </span>
                          <span className="block text-[11.5px]" style={{ color: MUTED }}>{v.area_of_interest || '—'}</span>
                          <StatusPill status={v.status} />
                        </span>
                      </button>
                    ))
                  }
                </div>
              </div>

              <div className="rounded-xl border p-5" style={{ background: PAPER, borderColor: RULE }}>
                {!selectedVol
                  ? <EmptyState label={tr('Select an application to view.', 'একটি আবেদন বেছে নিন।')} />
                  : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full text-[15px] font-bold text-white" style={{ background: TEAL }}>{initials(selectedVol.name)}</span>
                        <div className="flex-1">
                          <div className="text-[16px] font-semibold" style={{ color: INK }}>{selectedVol.name}</div>
                          <div className="text-[12px]" style={{ color: MUTED }}>{[selectedVol.email, selectedVol.phone].filter(Boolean).join(' · ') || '—'}</div>
                        </div>
                        <StatusPill status={selectedVol.status} />
                      </div>
                      <InfoGrid items={[
                        { icon: <Calendar className="h-4 w-4" />, label: tr('Applied', 'আবেদন'), value: fmt.date(selectedVol.created_at) },
                        { icon: <Users className="h-4 w-4" />, label: tr('Interest', 'আগ্রহ'), value: selectedVol.area_of_interest || '—' },
                        { icon: <Phone className="h-4 w-4" />, label: tr('Phone', 'ফোন'), value: selectedVol.phone || '—' },
                        { icon: <Mail className="h-4 w-4" />, label: tr('Email', 'ইমেল'), value: selectedVol.email || '—' },
                      ]} />
                      {selectedVol.message && (
                        <div className="rounded-lg p-4" style={{ background: CREAM }}>
                          <div className="mb-1 font-mono text-[10px] uppercase tracking-widest" style={{ color: MUTED }}>{tr('Message', 'বার্তা')}</div>
                          <p className="whitespace-pre-line text-[13px] leading-relaxed" style={{ color: INK2 }}>{selectedVol.message}</p>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2 border-t pt-4" style={{ borderColor: RULE }}>
                        <p className="w-full text-[11px] font-semibold uppercase tracking-widest" style={{ color: MUTED }}>{tr('Update Status', 'স্ট্যাটাস আপডেট')}</p>
                        {['pending', 'reviewing', 'accepted', 'rejected'].map((s) => (
                          <button key={s} onClick={() => updateVolStatus(selectedVol.id, s)}
                            className="rounded-full px-4 py-1.5 text-[12px] font-semibold capitalize transition-all"
                            style={{ background: selectedVol.status === s ? TEAL : CREAM, color: selectedVol.status === s ? '#fff' : INK2, border: `1px solid ${selectedVol.status === s ? TEAL : RULE}` }}>
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            </div>
          )}

          {/* ══════════ BLOOD REQUEST TAB ══════════ */}
          {tab === 'blood_request' && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[340px_1fr]">
              <div className="rounded-xl border overflow-hidden" style={{ background: PAPER, borderColor: RULE }}>
                <div className="flex items-center gap-2 border-b px-3 py-2.5" style={{ borderColor: RULE }}>
                  <Search className="h-3.5 w-3.5 shrink-0" style={{ color: MUTED }} />
                  <input value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder={tr('Search requests…', 'অনুরোধ খুঁজুন…')}
                    className="flex-1 bg-transparent text-[12.5px] outline-none" style={{ color: INK }} />
                </div>
                <div className="max-h-[600px] overflow-y-auto">
                  {filteredBR.length === 0
                    ? <EmptyState label={tr('No blood requests.', 'কোনো রক্তের অনুরোধ নেই।')} />
                    : filteredBR.map((r, i) => (
                      <button key={r.id} onClick={() => setSelectedBR(r)}
                        className="flex w-full items-start gap-2.5 px-3 py-3 text-left transition-colors hover:bg-black/[0.02]"
                        style={{ background: selectedBR?.id === r.id ? '#fff8f8' : 'transparent', borderTop: i === 0 ? undefined : `1px solid ${RULE}` }}>
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white" style={{ background: RED }}>{r.blood_group}</span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-[13px] font-semibold" style={{ color: INK }}>{r.patient_name}</span>
                            <span className="ml-auto font-mono text-[10px]" style={{ color: MUTED }}>{dt(r.created_at)}</span>
                          </span>
                          <span className="block text-[11.5px]" style={{ color: MUTED }}>{r.hospital} · {r.units_needed} unit{r.units_needed !== 1 ? 's' : ''}</span>
                          <StatusPill status={r.status} />
                        </span>
                      </button>
                    ))
                  }
                </div>
              </div>

              <div className="rounded-xl border p-5" style={{ background: PAPER, borderColor: RULE }}>
                {!selectedBR
                  ? <EmptyState label={tr('Select a request to view details.', 'বিস্তারিত দেখতে একটি অনুরোধ বেছে নিন।')} />
                  : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-[15px] font-bold text-white" style={{ background: RED }}>{selectedBR.blood_group}</span>
                        <div className="flex-1">
                          <div className="text-[16px] font-semibold" style={{ color: INK }}>{selectedBR.patient_name}</div>
                          <div className="text-[12px]" style={{ color: MUTED }}>{tr('Blood Request', 'রক্তের অনুরোধ')} · {fmt.date(selectedBR.created_at)}</div>
                        </div>
                        <StatusPill status={selectedBR.status} />
                      </div>
                      <InfoGrid items={[
                        { icon: <Droplet className="h-4 w-4" />, label: tr('Blood Group', 'রক্তের গ্রুপ'), value: selectedBR.blood_group },
                        { icon: <Building2 className="h-4 w-4" />, label: tr('Hospital', 'হাসপাতাল'), value: selectedBR.hospital },
                        { icon: <Phone className="h-4 w-4" />, label: tr('Contact', 'যোগাযোগ'), value: selectedBR.contact_phone },
                        { icon: <AlertCircle className="h-4 w-4" />, label: tr('Units Needed', 'প্রয়োজনীয় একক'), value: String(selectedBR.units_needed) },
                        { icon: <Calendar className="h-4 w-4" />, label: tr('Required By', 'প্রয়োজন'), value: selectedBR.required_by ? fmt.date(selectedBR.required_by) : '—' },
                        { icon: <Users className="h-4 w-4" />, label: tr('Requester', 'অনুরোধকারী'), value: selectedBR.requester_name || '—' },
                      ]} />
                      {selectedBR.message && (
                        <div className="rounded-lg p-4" style={{ background: 'rgba(185,28,28,0.05)' }}>
                          <div className="mb-1 font-mono text-[10px] uppercase tracking-widest" style={{ color: MUTED }}>{tr('Additional Info', 'অতিরিক্ত তথ্য')}</div>
                          <p className="whitespace-pre-line text-[13px] leading-relaxed" style={{ color: INK2 }}>{selectedBR.message}</p>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2 border-t pt-4" style={{ borderColor: RULE }}>
                        <p className="w-full text-[11px] font-semibold uppercase tracking-widest" style={{ color: MUTED }}>{tr('Update Status', 'স্ট্যাটাস আপডেট')}</p>
                        {(['open', 'in_progress', 'fulfilled', 'closed'] as const).map((s) => (
                          <button key={s} onClick={() => updateBRStatus(selectedBR.id, s)}
                            className="rounded-full px-4 py-1.5 text-[12px] font-semibold capitalize transition-all"
                            style={{ background: selectedBR.status === s ? RED : CREAM, color: selectedBR.status === s ? '#fff' : INK2, border: `1px solid ${selectedBR.status === s ? RED : RULE}` }}>
                            {s.replace('_', ' ')}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            </div>
          )}

          {/* ══════════ BLOOD CAMP TAB ══════════ */}
          {tab === 'blood_camp' && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[340px_1fr]">
              <div className="rounded-xl border overflow-hidden" style={{ background: PAPER, borderColor: RULE }}>
                <div className="flex items-center gap-2 border-b px-3 py-2.5" style={{ borderColor: RULE }}>
                  <Search className="h-3.5 w-3.5 shrink-0" style={{ color: MUTED }} />
                  <input value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder={tr('Search applications…', 'আবেদন খুঁজুন…')}
                    className="flex-1 bg-transparent text-[12.5px] outline-none" style={{ color: INK }} />
                </div>
                <div className="max-h-[600px] overflow-y-auto">
                  {filteredBC.length === 0
                    ? <EmptyState label={tr('No blood camp applications.', 'কোনো রক্তদান শিবির আবেদন নেই।')} />
                    : filteredBC.map((c, i) => (
                      <button key={c.id} onClick={() => setSelectedBC(c)}
                        className="flex w-full items-start gap-2.5 px-3 py-3 text-left transition-colors hover:bg-black/[0.02]"
                        style={{ background: selectedBC?.id === c.id ? '#faf5ff' : 'transparent', borderTop: i === 0 ? undefined : `1px solid ${RULE}` }}>
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: `${PURPLE}1a` }}>
                          <AlertCircle className="h-4 w-4" style={{ color: PURPLE }} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-[13px] font-semibold" style={{ color: INK }}>{c.org_name || c.contact_name}</span>
                            <span className="ml-auto font-mono text-[10px]" style={{ color: MUTED }}>{dt(c.created_at)}</span>
                          </span>
                          <span className="block text-[11.5px]" style={{ color: MUTED }}>{c.proposed_venue}</span>
                          <StatusPill status={c.status} />
                        </span>
                      </button>
                    ))
                  }
                </div>
              </div>

              <div className="rounded-xl border p-5" style={{ background: PAPER, borderColor: RULE }}>
                {!selectedBC
                  ? <EmptyState label={tr('Select an application to view.', 'একটি আবেদন বেছে নিন।')} />
                  : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full" style={{ background: `${PURPLE}1a` }}>
                          <AlertCircle className="h-6 w-6" style={{ color: PURPLE }} />
                        </span>
                        <div className="flex-1">
                          <div className="text-[16px] font-semibold" style={{ color: INK }}>{selectedBC.org_name || selectedBC.contact_name}</div>
                          <div className="text-[12px]" style={{ color: MUTED }}>{tr('Blood Camp Application', 'রক্তদান শিবির আবেদন')}</div>
                        </div>
                        <StatusPill status={selectedBC.status} />
                      </div>
                      <InfoGrid items={[
                        { icon: <Users className="h-4 w-4" />, label: tr('Contact Person', 'যোগাযোগ ব্যক্তি'), value: selectedBC.contact_name },
                        { icon: <Phone className="h-4 w-4" />, label: tr('Phone', 'ফোন'), value: selectedBC.contact_phone },
                        { icon: <Mail className="h-4 w-4" />, label: tr('Email', 'ইমেল'), value: selectedBC.contact_email || '—' },
                        { icon: <Building2 className="h-4 w-4" />, label: tr('Venue', 'ভেন্যু'), value: selectedBC.proposed_venue },
                        { icon: <Calendar className="h-4 w-4" />, label: tr('Proposed Date', 'প্রস্তাবিত তারিখ'), value: selectedBC.proposed_date ? fmt.date(selectedBC.proposed_date) : '—' },
                        { icon: <Droplet className="h-4 w-4" />, label: tr('Expected Donors', 'প্রত্যাশিত দাতা'), value: selectedBC.expected_donors ? String(selectedBC.expected_donors) : '—' },
                      ]} />
                      {selectedBC.message && (
                        <div className="rounded-lg p-4" style={{ background: `${PURPLE}08` }}>
                          <div className="mb-1 font-mono text-[10px] uppercase tracking-widest" style={{ color: MUTED }}>{tr('Additional Notes', 'অতিরিক্ত নোট')}</div>
                          <p className="whitespace-pre-line text-[13px] leading-relaxed" style={{ color: INK2 }}>{selectedBC.message}</p>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2 border-t pt-4" style={{ borderColor: RULE }}>
                        <p className="w-full text-[11px] font-semibold uppercase tracking-widest" style={{ color: MUTED }}>{tr('Update Status', 'স্ট্যাটাস আপডেট')}</p>
                        {(['pending', 'reviewing', 'approved', 'rejected', 'completed'] as const).map((s) => (
                          <button key={s} onClick={() => updateBCStatus(selectedBC.id, s)}
                            className="rounded-full px-4 py-1.5 text-[12px] font-semibold capitalize transition-all"
                            style={{ background: selectedBC.status === s ? PURPLE : CREAM, color: selectedBC.status === s ? '#fff' : INK2, border: `1px solid ${selectedBC.status === s ? PURPLE : RULE}` }}>
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            </div>
          )}

          {/* ══════════ MEMBER DMs TAB ══════════ */}
          {tab === 'member_dms' && (
            <div className="space-y-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: MUTED }}>{tr('Direct messages from members to admin roles', 'সদস্যদের ভূমিকা-বার্তা')}</div>
              {memberDMs.length === 0
                ? <EmptyState label={tr('No member messages yet.', 'কোনো সদস্য বার্তা নেই।')} />
                : (
                  <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${RULE}` }}>
                    {memberDMs.map((dm, i) => (
                      <div key={dm.id}>
                        {i > 0 && <div style={{ height: 1, background: RULE }} />}
                        <div className="p-4 cursor-pointer hover:bg-stone-50 transition-colors"
                          style={{ background: selectedDM?.id === dm.id ? '#f0fdf8' : (!dm.is_read ? 'rgba(12,117,111,0.03)' : PAPER) }}
                          onClick={async () => {
                            setSelectedDM(dm); setDmReply('');
                            if (!dm.is_read) {
                              await supabase.from('cswo_member_messages').update({ is_read: true }).eq('id', dm.id);
                              setMemberDMs((arr) => arr.map((d) => d.id === dm.id ? { ...d, is_read: true } : d));
                            }
                          }}>
                          <div className="flex items-start gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: TEAL }}>
                              {(dm.from?.full_name ?? '?').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[12.5px] font-semibold" style={{ color: INK }}>{dm.from?.full_name ?? '—'}</span>
                                <span className="text-[10px]" style={{ color: MUTED }}>{fmt.date(dm.created_at)}</span>
                              </div>
                              <span className="inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize" style={{ background: 'rgba(12,117,111,0.1)', color: TEAL }}>→ {dm.to_role}</span>
                              <p className="mt-0.5 text-[12px] font-medium" style={{ color: INK2 }}>{dm.subject}</p>
                              <p className="mt-0.5 line-clamp-1 text-[12px]" style={{ color: MUTED }}>{dm.body}</p>
                            </div>
                            {!dm.is_read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: TEAL }} />}
                          </div>
                          {selectedDM?.id === dm.id && (
                            <div className="mt-3 space-y-2 border-t pt-3" style={{ borderColor: RULE }} onClick={(e) => e.stopPropagation()}>
                              <p className="text-[13px] leading-relaxed whitespace-pre-line" style={{ color: INK }}>{dm.body}</p>
                              <div className="flex items-center gap-2">
                                <textarea rows={2} value={dmReply} onChange={(e) => setDmReply(e.target.value)}
                                  placeholder={tr('Reply…', 'উত্তর দিন…')}
                                  className="flex-1 rounded-lg px-3 py-2 text-[12.5px] outline-none resize-none" style={{ border: `1px solid ${RULE}` }} />
                                <button disabled={sendingDmReply || !dmReply.trim()}
                                  onClick={async () => {
                                    if (!me || !dmReply.trim()) return;
                                    setSendingDmReply(true);
                                    await supabase.from('cswo_member_messages').insert({ from_id: me.id, to_id: dm.from_id, subject: `Re: ${dm.subject}`, body: dmReply.trim(), parent_id: dm.id });
                                    setSendingDmReply(false); setDmReply(''); setSelectedDM(null); await load();
                                  }}
                                  className="shrink-0 rounded-full px-4 py-2 text-[12.5px] font-semibold text-white disabled:opacity-60"
                                  style={{ background: TEAL }}>
                                  {sendingDmReply ? '…' : tr('Send', 'পাঠান')}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          )}

          {/* ══════════ COMPOSE TAB ══════════ */}
          {tab === 'compose' && (
            <form onSubmit={handleSend} className="space-y-4 rounded-xl p-5" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
              <h2 className="text-[16px] font-semibold" style={{ color: INK }}>{tr('Compose message to a member', 'সদস্যকে বার্তা পাঠান')}</h2>
              {sendError && <p className="rounded-lg px-3 py-2 text-[13px]" style={{ background: 'rgba(194,65,12,0.1)', color: '#c2410c' }}>{sendError}</p>}
              {sendSuccess && <p className="rounded-lg px-3 py-2 text-[13px]" style={{ background: 'rgba(77,124,15,0.1)', color: GREEN }}>{sendSuccess}</p>}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <select className="input" value={selectedMemberId} onChange={(e) => setSelectedMemberId(e.target.value)} required>
                  <option value="">{tr('Select member…', 'সদস্য বেছে নিন…')}</option>
                  {members.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                </select>
                <input className="input" placeholder={tr('Sender name', 'প্রেরকের নাম')} value={senderName} onChange={(e) => setSenderName(e.target.value)} required />
              </div>
              <textarea className="input resize-none" rows={4} placeholder={tr('Message…', 'বার্তা…')} value={msgText} onChange={(e) => setMsgText(e.target.value)} required />
              <div className="flex justify-end">
                <button type="submit" disabled={sending} className="inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-[13px] font-semibold text-white" style={{ background: TEAL }}>
                  {sending ? t('common.saving') : <><Send className="h-3.5 w-3.5" />{tr('Send', 'পাঠান')}</>}
                </button>
              </div>
              {adminMsgs.length > 0 && (
                <div className="border-t pt-3" style={{ borderColor: RULE }}>
                  <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: MUTED }}>{tr('Recently sent', 'সাম্প্রতিক প্রেরিত')}</div>
                  <div className="space-y-2">
                    {adminMsgs.slice(0, 5).map((mm) => (
                      <div key={mm.id} className="rounded-lg p-2.5 text-[12.5px]" style={{ background: CREAM }}>
                        <b style={{ color: INK }}>→ {mm.member?.full_name ?? '—'}</b>
                        <span style={{ color: MUTED }}> · {fmt.date(mm.created_at)}{mm.is_read ? '' : ` · ${tr('unread', 'অপঠিত')}`}</span>
                        <div className="mt-0.5 whitespace-pre-line" style={{ color: INK2 }}>{mm.message}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </form>
          )}
        </>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function SummaryCard({ label, value, color, icon, onClick }: { label: string; value: number; color: string; icon: React.ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="rounded-xl p-4 text-left transition-all hover:shadow-sm" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-widest leading-tight" style={{ color: MUTED }}>{label}</span>
        <span style={{ color: `${color}99` }}>{icon}</span>
      </div>
      <div className="mt-2 text-[28px] font-bold leading-none" style={{ color: value > 0 ? color : MUTED }}>{value}</div>
    </button>
  );
}

function StatusPill({ status }: { status: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    pending:     { bg: 'rgba(184,134,11,0.12)', color: '#b8860b' },
    reviewing:   { bg: 'rgba(29,78,216,0.1)',   color: '#1d4ed8' },
    accepted:    { bg: 'rgba(77,124,15,0.1)',    color: '#4d7c0f' },
    approved:    { bg: 'rgba(77,124,15,0.1)',    color: '#4d7c0f' },
    open:        { bg: 'rgba(185,28,28,0.1)',    color: '#b91c1c' },
    in_progress: { bg: 'rgba(29,78,216,0.1)',    color: '#1d4ed8' },
    fulfilled:   { bg: 'rgba(77,124,15,0.1)',    color: '#4d7c0f' },
    completed:   { bg: 'rgba(77,124,15,0.1)',    color: '#4d7c0f' },
    rejected:    { bg: 'rgba(120,113,108,0.1)',  color: '#78716c' },
    closed:      { bg: 'rgba(120,113,108,0.1)',  color: '#78716c' },
  };
  const s = colors[status] ?? { bg: 'rgba(120,113,108,0.1)', color: '#78716c' };
  return (
    <span className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize" style={{ background: s.bg, color: s.color }}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function InfoGrid({ items }: { items: { icon: React.ReactNode; label: string; value: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 rounded-xl p-4" style={{ background: CREAM }}>
      {items.map(({ icon, label, value }) => (
        <div key={label} className="flex items-start gap-2">
          <span className="mt-0.5 shrink-0" style={{ color: MUTED }}>{icon}</span>
          <div>
            <div className="font-mono text-[9px] uppercase tracking-widest" style={{ color: MUTED }}>{label}</div>
            <div className="mt-0.5 text-[12.5px] font-medium break-words" style={{ color: INK }}>{value}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16" style={{ color: MUTED }}>
      <MailOpen className="h-10 w-10 opacity-25" />
      <p className="text-[12px] font-semibold uppercase tracking-wider">{label}</p>
    </div>
  );
}
