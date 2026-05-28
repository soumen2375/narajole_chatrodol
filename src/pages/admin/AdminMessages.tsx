import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { ContactMessage, VolunteerApplication, Member } from '@/types';
import { useFmt } from '@/lib/format';
import { useT } from '@/i18n';
import { ListSkeleton } from '@/components/ui/Skeleton';

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

const TEAL = '#0c756f';
const GOLD = '#b8860b';
const INK = '#1c1917';
const INK2 = '#44403c';
const MUTED = '#78716c';
const RULE = '#e7e5e4';
const PAPER = '#ffffff';
const CREAM = '#faf8f5';

const CATS = ['general', 'help', 'blood', 'donation', 'volunteer', 'media', 'complaint', 'environment'];
const CAT_COLOR: Record<string, string> = {
  help: '#1d4ed8', blood: '#b91c1c', donation: '#4d7c0f', volunteer: TEAL,
  media: '#7c3aed', complaint: '#c2410c', environment: '#65a30d', general: MUTED,
};

const autoCat = (m: ContactMessage): string => {
  if (m.category && m.category !== 'general') return m.category;
  const s = `${m.subject ?? ''} ${m.message ?? ''}`.toLowerCase();
  if (/blood|রক্ত/i.test(s)) return 'blood';
  if (/donat|receipt|রসিদ|অনুদান/i.test(s)) return 'donation';
  if (/help|scholarship|assist|সাহায্য|বৃত্তি|শিক্ষাবৃত্তি/i.test(s)) return 'help';
  if (/volunteer|স্বেচ্ছা/i.test(s)) return 'volunteer';
  if (/photo|media|press|ছবি|মিডিয়া/i.test(s)) return 'media';
  if (/complain|issue|problem|অভিযোগ/i.test(s)) return 'complaint';
  if (/environment|tree|plant|পরিবেশ|বৃক্ষ/i.test(s)) return 'environment';
  return 'general';
};

const initials = (n: string) => n.split(' ').filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '·';

const DRAFTS: Record<string, { en: string; bn: string }[]> = {
  help: [
    { en: 'Thank you for reaching out. We have received your request and will review your application within 5–7 working days. Please share any supporting documents.', bn: 'আপনার আবেদন পেয়েছি। আমরা ৫–৭ কর্মদিবসের মধ্যে যাচাই করে যোগাযোগ করব। প্রয়োজনীয় নথি থাকলে দয়া করে পাঠান।' },
    { en: 'Thanks for getting in touch. To progress your request, kindly visit our office this Sunday between 4–6 PM with any relevant documents.', bn: 'আপনার বার্তার জন্য ধন্যবাদ। আবেদন এগিয়ে নিতে আগামী রবিবার বিকেল ৪–৬টায় অফিসে আসুন।' },
  ],
  blood: [
    { en: 'Thank you for reaching out about blood donation. We will coordinate with our blood-camp team and confirm availability shortly.', bn: 'রক্তদান সংক্রান্ত বার্তার জন্য ধন্যবাদ। আমরা শিবির টিমের সাথে সমন্বয় করে শীঘ্রই জানাব।' },
    { en: 'We will reach out to verified donors in your area immediately. Please share patient details and hospital.', bn: 'আপনার এলাকার যাচাইকৃত দাতাদের সাথে আমরা যোগাযোগ করছি। দয়া করে রোগী ও হাসপাতালের তথ্য পাঠান।' },
  ],
  donation: [
    { en: 'Thank you for your generous donation. Your receipt is being processed and will be emailed within 24 hours.', bn: 'আপনার দানের জন্য আন্তরিক কৃতজ্ঞতা। রসিদ প্রস্তুত করে ২৪ ঘণ্টার মধ্যে ইমেলে পাঠানো হবে।' },
    { en: 'Apologies for the delay — we have located your record and a duplicate receipt is on its way.', bn: 'দেরির জন্য দুঃখিত। আপনার রেকর্ড পাওয়া গেছে; ডুপ্লিকেট রসিদ পাঠানো হচ্ছে।' },
  ],
  volunteer: [
    { en: 'Welcome to Chhatradol! We would love to have you. Our next volunteer orientation is scheduled — details to follow shortly.', bn: 'ছাত্রদলে স্বাগতম! পরবর্তী স্বেচ্ছাসেবক ওরিয়েন্টেশনের বিস্তারিত শীঘ্রই পাঠানো হবে।' },
  ],
  media: [
    { en: 'Thank you for the media request. Our communications lead will respond with photographs and assets shortly.', bn: 'মিডিয়া অনুরোধের জন্য ধন্যবাদ। আমাদের কমিউনিকেশন টিম দ্রুত ছবি ও তথ্য পাঠাবে।' },
  ],
  complaint: [
    { en: 'We are sorry to hear this and are looking into your concern. Someone from the team will get back to you within 48 hours.', bn: 'এজন্য আমরা দুঃখিত। বিষয়টি খতিয়ে দেখছি; ৪৮ ঘণ্টার মধ্যে যোগাযোগ করা হবে।' },
  ],
  environment: [
    { en: 'Thank you for supporting our environmental initiatives. We would be glad to coordinate a plantation drive — details to follow.', bn: 'পরিবেশ উদ্যোগে সহযোগিতার জন্য ধন্যবাদ। বৃক্ষরোপণ অভিযানের বিস্তারিত শীঘ্রই পাঠাব।' },
  ],
  general: [
    { en: 'Thank you for getting in touch. We will respond within 24 hours.', bn: 'আপনার বার্তার জন্য ধন্যবাদ। ২৪ ঘণ্টার মধ্যে উত্তর দেওয়া হবে।' },
  ],
};

type Tab = 'inbox' | 'volunteer' | 'member_dms' | 'compose';
type Filter = 'all' | 'unread' | 'starred' | 'help' | 'blood' | 'donation';

export default function AdminMessages() {
  const { member: me } = useAuth();
  const { t, lang } = useT();
  const fmt = useFmt();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);

  const [tab, setTab] = useState<Tab>('inbox');
  const [filter, setFilter] = useState<Filter>('all');
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [apps, setApps] = useState<VolunteerApplication[]>([]);
  const [adminMsgs, setAdminMsgs] = useState<AdminMsg[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [memberDMs, setMemberDMs] = useState<MemberDM[]>([]);
  const [selectedDM, setSelectedDM] = useState<MemberDM | null>(null);
  const [dmReply, setDmReply] = useState('');
  const [sendingDmReply, setSendingDmReply] = useState(false);
  const [loading, setLoading] = useState(true);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [draftIdx, setDraftIdx] = useState(0);
  const [savingReply, setSavingReply] = useState(false);

  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [senderName, setSenderName] = useState('Admin');
  const [msgText, setMsgText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState('');
  const [sendError, setSendError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [m, v, am, mem, dm] = await Promise.all([
      supabase.from('cswo_contact_messages').select('*').order('created_at', { ascending: false }),
      supabase.from('cswo_volunteer_applications').select('*').order('created_at', { ascending: false }),
      supabase.from('cswo_admin_messages').select('*, member:cswo_members(full_name)').order('created_at', { ascending: false }),
      supabase.from('cswo_members').select('id,full_name,status').eq('status', 'approved').order('full_name'),
      supabase.from('cswo_member_messages')
        .select('*, from:from_id(full_name,avatar_url), to:to_id(full_name,avatar_url)')
        .or('to_role.eq.admin,to_role.eq.treasurer,to_role.eq.secretary,to_role.eq.digital')
        .order('created_at', { ascending: false }),
    ]);
    setMessages((m.data ?? []) as ContactMessage[]);
    setApps((v.data ?? []) as VolunteerApplication[]);
    setAdminMsgs((am.data ?? []) as AdminMsg[]);
    setMembers((mem.data ?? []) as Member[]);
    setMemberDMs((dm.data ?? []) as MemberDM[]);
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
    if (!me) return;

    const channel = supabase
      .channel('admin_messages_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cswo_contact_messages' },
        () => { load(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cswo_volunteer_applications' },
        () => { load(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cswo_member_messages' },
        () => { load(); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [load, me]);

  const filtered = useMemo(() => {
    return messages.filter((m) => {
      if (filter === 'unread') return !m.is_read;
      if (filter === 'starred') return m.is_starred;
      if (filter === 'help' || filter === 'blood' || filter === 'donation') return autoCat(m) === filter;
      return true;
    });
  }, [messages, filter]);

  useEffect(() => {
    if (filtered.length === 0) { setSelectedId(null); return; }
    if (!selectedId || !filtered.some((m) => m.id === selectedId)) setSelectedId(filtered[0].id);
  }, [filtered, selectedId]);

  const selected = messages.find((m) => m.id === selectedId) ?? null;

  useEffect(() => {
    if (!selected || selected.is_read) return;
    setMessages((arr) => arr.map((m) => m.id === selected.id ? { ...m, is_read: true } : m));
    supabase.from('cswo_contact_messages').update({ is_read: true }).eq('id', selected.id);
  }, [selected]);

  const updateMsg = async (id: string, patch: Partial<ContactMessage>) => {
    setMessages((arr) => arr.map((m) => m.id === id ? { ...m, ...patch } : m));
    await supabase.from('cswo_contact_messages').update(patch).eq('id', id);
  };

  const star = (m: ContactMessage) => updateMsg(m.id, { is_starred: !m.is_starred });
  const setCat = (m: ContactMessage, c: string) => updateMsg(m.id, { category: c });

  const markAllRead = async () => {
    const ids = messages.filter((m) => !m.is_read).map((m) => m.id);
    if (ids.length === 0) return;
    setMessages((arr) => arr.map((m) => ({ ...m, is_read: true })));
    await supabase.from('cswo_contact_messages').update({ is_read: true }).in('id', ids);
  };

  const sendReply = async () => {
    if (!selected || !replyText.trim()) return;
    setSavingReply(true);
    const patch = { admin_reply: replyText.trim(), replied_at: new Date().toISOString(), replied_by: me?.id ?? null, is_read: true };
    await supabase.from('cswo_contact_messages').update(patch).eq('id', selected.id);
    setMessages((arr) => arr.map((m) => m.id === selected.id ? { ...m, ...patch } : m));
    setReplyText('');
    setSavingReply(false);
  };

  const deleteContact = async (id: string) => {
    if (!confirm(tr('Delete this message?', 'এই বার্তাটি মুছবেন?'))) return;
    await supabase.from('cswo_contact_messages').delete().eq('id', id);
    setMessages((arr) => arr.filter((m) => m.id !== id));
    setSelectedId(null);
  };

  const unreadCount = messages.filter((m) => !m.is_read).length;
  const helpCount = messages.filter((m) => autoCat(m) === 'help').length;
  const bloodCount = messages.filter((m) => autoCat(m) === 'blood').length;
  const replied = messages.filter((m) => m.replied_at);
  const avgReplyH = replied.length === 0 ? null : Math.round(
    replied.reduce((s, m) => s + (new Date(m.replied_at!).getTime() - new Date(m.created_at).getTime()) / 36e5, 0) / replied.length,
  );

  const cat = selected ? autoCat(selected) : 'general';
  const drafts = DRAFTS[cat] ?? DRAFTS.general;
  const suggested = drafts[draftIdx % drafts.length];
  const draftText = suggested ? (lang === 'bn' ? suggested.bn : suggested.en) : '';
  const useDraft = () => setReplyText(draftText);
  const regenerate = () => setDraftIdx((i) => (i + 1) % drafts.length);
  useEffect(() => { setDraftIdx(0); setReplyText(selected?.admin_reply ?? ''); }, [selectedId, selected?.admin_reply]);

  const dt = (s: string) => { const d = new Date(s); const today = new Date(); const sameDay = d.toDateString() === today.toDateString(); return sameDay ? d.toLocaleTimeString(lang === 'bn' ? 'bn-IN' : 'en-IN', { hour: '2-digit', minute: '2-digit' }) : fmt.date(s); };
  const catLabel = (c: string) => ({ general: tr('General', 'সাধারণ'), help: tr('Help', 'সাহায্য'), blood: tr('Blood', 'রক্ত'), donation: tr('Donation', 'অনুদান'), volunteer: tr('Volunteer', 'স্বেচ্ছাসেবক'), media: tr('Media', 'মিডিয়া'), complaint: tr('Complaint', 'অভিযোগ'), environment: tr('Environment', 'পরিবেশ') }[c] || c);

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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {([
          { k: 'inbox' as Tab, l: `${tr('Inbox', 'ইনবক্স')}${unreadCount ? ` · ${fmt.num(unreadCount)}` : ''}` },
          { k: 'volunteer' as Tab, l: `${tr('Volunteer', 'স্বেচ্ছাসেবক')} · ${fmt.num(apps.length)}` },
          { k: 'member_dms' as Tab, l: `${tr('Member DMs', 'সদস্য বার্তা')}${memberDMs.filter((d) => !d.is_read).length ? ` · ${memberDMs.filter((d) => !d.is_read).length}` : ''}` },
          { k: 'compose' as Tab, l: tr('Compose', 'লিখুন') },
        ]).map(({ k, l }) => (
          <button key={k} onClick={() => setTab(k)}
            className="rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors"
            style={{ background: tab === k ? TEAL : PAPER, color: tab === k ? '#fff' : INK2, border: `1px solid ${tab === k ? TEAL : RULE}` }}>{l}</button>
        ))}
      </div>

      {loading ? <ListSkeleton rows={6} /> : tab === 'inbox' ? (
        <>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: MUTED }}>{tr('Communication', 'যোগাযোগ')} · {tr('Inbox', 'ইনবক্স')}</div>
              <h1 className="mt-1.5 text-[26px] leading-tight" style={{ color: INK, fontFamily: '"Noto Serif Bengali", serif' }}>{tr('Messages & Applications', 'বার্তা ও আবেদন')}</h1>
              <p className="mt-1 text-[13px]" style={{ color: INK2 }}>{tr('Contact-form messages, help requests, blood and donor enquiries — all in one place.', 'কন্টাক্ট ফর্ম বার্তা, সাহায্য অনুরোধ, রক্ত ও দাতা যোগাযোগ — সব এক জায়গায়।')}</p>
            </div>
            {unreadCount > 0 && <button onClick={markAllRead} className="rounded-full px-4 py-2 text-[12.5px] font-semibold" style={{ border: `1px solid ${RULE}`, color: INK2 }}>{tr('Mark all read', 'সব পঠিত')}</button>}
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label={tr('Unread', 'অপঠিত')} value={fmt.num(unreadCount)} color={TEAL} dot />
            <Stat label={tr('Help', 'সাহায্য')} value={fmt.num(helpCount)} color={CAT_COLOR.help} />
            <Stat label={tr('Blood', 'রক্ত')} value={fmt.num(bloodCount)} color={CAT_COLOR.blood} />
            <Stat label={tr('Avg reply', 'গড় উত্তরের সময়')} value={avgReplyH == null ? '—' : `${fmt.num(avgReplyH)}h`} color={GOLD} sub={tr('within 24h target', '২৪ ঘণ্টার মধ্যে')} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {([
              { k: 'all' as Filter, l: `${tr('All', 'সব')} · ${fmt.num(messages.length)}` },
              { k: 'unread' as Filter, l: `${tr('Unread', 'অপঠিত')} · ${fmt.num(unreadCount)}` },
              { k: 'help' as Filter, l: `${tr('Help', 'সাহায্য')} · ${fmt.num(helpCount)}` },
              { k: 'blood' as Filter, l: `${tr('Blood', 'রক্ত')} · ${fmt.num(bloodCount)}` },
              { k: 'donation' as Filter, l: tr('Donation', 'অনুদান') },
              { k: 'starred' as Filter, l: `★ ${tr('Starred', 'তারকা')}` },
            ]).map(({ k, l }) => (
              <button key={k} onClick={() => setFilter(k)}
                className="rounded-full px-3 py-1 text-[12px] font-medium"
                style={{ background: filter === k ? INK : CREAM, color: filter === k ? '#fff' : INK2, border: `1px solid ${filter === k ? INK : RULE}` }}>{l}</button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
            <div className="rounded-[10px]" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
              <div className="max-h-[680px] overflow-y-auto">
                {filtered.length === 0 ? (
                  <p className="py-10 text-center text-[13px]" style={{ color: MUTED }}>{tr('Nothing here.', 'এখানে কিছু নেই।')}</p>
                ) : filtered.map((m, i) => {
                  const c = autoCat(m);
                  const active = m.id === selectedId;
                  return (
                    <button key={m.id} onClick={() => setSelectedId(m.id)} className="flex w-full items-start gap-2.5 px-3 py-3 text-left transition-colors hover:bg-black/[0.02]"
                      style={{ background: active ? CREAM : 'transparent', borderTop: i === 0 ? undefined : `1px solid ${RULE}` }}>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white" style={{ background: TEAL }}>{initials(m.name)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-[13px] font-semibold" style={{ color: INK }}>{m.name}</span>
                          {m.is_starred && <span style={{ color: GOLD }}>★</span>}
                          <span className="ml-auto shrink-0 font-mono text-[10px]" style={{ color: MUTED }}>{dt(m.created_at)}</span>
                        </span>
                        <span className="mt-0.5 block truncate text-[12.5px] font-medium" style={{ color: m.is_read ? INK2 : INK }}>{m.subject || (m.message || '').slice(0, 60)}</span>
                        <span className="mt-0.5 block truncate text-[11.5px]" style={{ color: MUTED }}>{(m.message || '').slice(0, 80)}</span>
                        <span className="mt-1 inline-flex items-center gap-2">
                          <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: `${CAT_COLOR[c]}1a`, color: CAT_COLOR[c] }}>{catLabel(c)}</span>
                          {!m.is_read && <span className="h-1.5 w-1.5 rounded-full" style={{ background: TEAL }} />}
                          {m.replied_at && <span className="font-mono text-[9px] uppercase" style={{ color: '#4d7c0f' }}>✓ {tr('replied', 'উত্তর')}</span>}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[10px] p-5" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
              {!selected ? (
                <div className="py-20 text-center text-[13px]" style={{ color: MUTED }}>{tr('Select a message to read.', 'পড়তে একটি বার্তা বেছে নিন।')}</div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-full text-[14px] font-bold text-white" style={{ background: TEAL }}>{initials(selected.name)}</span>
                      <div>
                        <div className="text-[15px] font-semibold" style={{ color: INK }}>{selected.name}</div>
                        <div className="text-[12px]" style={{ color: MUTED }}>{[selected.email, selected.phone].filter(Boolean).join(' · ') || '—'}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select value={selected.category || 'general'} onChange={(e) => setCat(selected, e.target.value)} className="rounded-[6px] px-2 py-1 text-[12px]" style={{ border: `1px solid ${RULE}`, color: INK2 }}>
                        {CATS.map((c) => <option key={c} value={c}>{catLabel(c)}</option>)}
                      </select>
                      <button onClick={() => star(selected)} className="flex h-8 w-8 items-center justify-center rounded-full text-[16px]" style={{ background: selected.is_starred ? `${GOLD}22` : 'transparent', border: `1px solid ${RULE}`, color: selected.is_starred ? GOLD : MUTED }}>★</button>
                      <button onClick={() => deleteContact(selected.id)} className="rounded-full px-3 py-1.5 text-[12px] font-medium text-red-600" style={{ border: `1px solid ${RULE}` }}>{tr('Delete', 'মুছুন')}</button>
                    </div>
                  </div>

                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: MUTED }}>{tr('Subject', 'বিষয়')} · {dt(selected.created_at)}</div>
                    <h2 className="mt-1 text-[18px] font-semibold" style={{ color: INK, fontFamily: '"Noto Serif Bengali", serif' }}>{selected.subject || tr('(no subject)', '(কোনো বিষয় নেই)')}</h2>
                    <p className="mt-3 whitespace-pre-line text-[13.5px] leading-relaxed" style={{ color: INK2 }}>{selected.message}</p>
                  </div>

                  {selected.replied_at && (
                    <div className="rounded-[8px] p-3" style={{ background: 'rgba(77,124,15,0.08)' }}>
                      <div className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: '#4d7c0f' }}>{tr('Sent reply', 'প্রেরিত উত্তর')} · {fmt.date(selected.replied_at)}</div>
                      <p className="mt-1.5 whitespace-pre-line text-[13px]" style={{ color: INK }}>{selected.admin_reply}</p>
                    </div>
                  )}

                  {suggested && (
                    <div className="rounded-[8px] p-3" style={{ background: CREAM, border: `1px dashed ${RULE}` }}>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: GOLD }}>{tr('Suggested reply', 'প্রস্তাবিত উত্তর')} · {catLabel(cat)}</span>
                        <span className="font-mono text-[9px]" style={{ color: MUTED }}>AUTO-DRAFT</span>
                      </div>
                      <p className="mt-1.5 text-[12.5px]" style={{ color: INK2 }}>{draftText}</p>
                      <div className="mt-2 flex gap-2">
                        <button onClick={useDraft} className="rounded-full px-3 py-1 text-[12px] font-semibold text-white" style={{ background: TEAL }}>{tr('Use this draft', 'এই উত্তর ব্যবহার')}</button>
                        {drafts.length > 1 && <button onClick={regenerate} className="rounded-full px-3 py-1 text-[12px] font-medium" style={{ border: `1px solid ${RULE}`, color: INK2 }}>{tr('Regenerate', 'অন্য')}</button>}
                      </div>
                    </div>
                  )}

                  <div className="rounded-[10px] p-3" style={{ border: `1px solid ${RULE}` }}>
                    <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} rows={3} placeholder={tr('Write reply… (Cmd+Enter to send)', 'উত্তর লিখুন… (Cmd+Enter দিয়ে পাঠান)')}
                      onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); sendReply(); } }}
                      className="w-full resize-none rounded-[6px] px-3 py-2 text-[13.5px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK }} />
                    <div className="mt-2 flex items-center justify-between">
                      <div className="text-[11px]" style={{ color: MUTED }}>
                        {selected.email && <a href={`mailto:${selected.email}?subject=${encodeURIComponent('Re: ' + (selected.subject ?? ''))}&body=${encodeURIComponent(replyText)}`} className="font-semibold" style={{ color: TEAL }}>{tr('Open in email client', 'ইমেলে খুলুন')} ↗</a>}
                      </div>
                      <button onClick={sendReply} disabled={savingReply || !replyText.trim()} className="rounded-full px-5 py-2 text-[13px] font-semibold text-white disabled:opacity-50" style={{ background: TEAL }}>{savingReply ? tr('Saving…', 'সংরক্ষণ…') : tr('Send', 'পাঠান')} →</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      ) : tab === 'volunteer' ? (
        <div className="rounded-[10px]" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
          {apps.length === 0 ? (
            <p className="px-4 py-10 text-center text-[13px]" style={{ color: MUTED }}>{tr('No volunteer applications.', 'কোনো স্বেচ্ছাসেবক আবেদন নেই।')}</p>
          ) : apps.map((a, i) => (
            <div key={a.id} className="p-4" style={{ borderTop: i === 0 ? undefined : `1px solid ${RULE}` }}>
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full text-[12px] font-bold text-white" style={{ background: TEAL }}>{initials(a.name)}</span>
                <span className="font-semibold" style={{ color: INK }}>{a.name}</span>
                <span className="text-[12px]" style={{ color: MUTED }}>{[a.email, a.phone].filter(Boolean).join(' · ')}</span>
                <span className="ml-auto font-mono text-[10px]" style={{ color: MUTED }}>{fmt.date(a.created_at)}</span>
              </div>
              {a.area_of_interest && <p className="mt-2 text-[12.5px]" style={{ color: INK2 }}><b>{tr('Interest', 'আগ্রহ')}:</b> {a.area_of_interest}</p>}
              {a.message && <p className="mt-1 whitespace-pre-line text-[13px]" style={{ color: INK }}>{a.message}</p>}
            </div>
          ))}
        </div>
      ) : tab === 'member_dms' ? (
        /* ── Member DMs ─────────────────────────────────────────── */
        <div className="space-y-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: MUTED }}>{tr('Direct messages from members to roles', 'সদস্যদের ভূমিকা-বার্তা')}</div>
          {memberDMs.length === 0 ? (
            <p className="py-10 text-center text-[13px]" style={{ color: MUTED }}>{tr('No member messages yet.', 'কোনো সদস্য বার্তা নেই।')}</p>
          ) : (
            <div className="rounded-[10px] overflow-hidden" style={{ border: `1px solid ${RULE}` }}>
              {memberDMs.map((dm, i) => (
                <div key={dm.id}>
                  {i > 0 && <div style={{ height: 1, background: RULE }} />}
                  <div
                    className="p-4 cursor-pointer hover:bg-stone-50 transition-colors"
                    style={{ background: selectedDM?.id === dm.id ? '#f0fdf8' : (!dm.is_read ? 'rgba(12,117,111,0.03)' : PAPER) }}
                    onClick={async () => {
                      setSelectedDM(dm);
                      setDmReply('');
                      if (!dm.is_read) {
                        await supabase.from('cswo_member_messages').update({ is_read: true }).eq('id', dm.id);
                        setMemberDMs((arr) => arr.map((d) => d.id === dm.id ? { ...d, is_read: true } : d));
                      }
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: TEAL }}>
                        {(dm.from?.full_name ?? '?').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[12.5px] font-semibold" style={{ color: INK }}>{dm.from?.full_name ?? '—'}</span>
                          <span className="text-[10px]" style={{ color: MUTED }}>{fmt.date(dm.created_at)}</span>
                        </div>
                        <span className="inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize" style={{ background: 'rgba(12,117,111,0.1)', color: TEAL }}>{tr('To', 'প্রেরণ:')} {dm.to_role}</span>
                        <p className="mt-0.5 text-[12px] font-medium" style={{ color: INK2 }}>{dm.subject}</p>
                        <p className="mt-0.5 line-clamp-1 text-[12px]" style={{ color: MUTED }}>{dm.body}</p>
                      </div>
                      {!dm.is_read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: TEAL }} />}
                    </div>
                    {selectedDM?.id === dm.id && (
                      <div className="mt-3 space-y-2 border-t pt-3" style={{ borderColor: RULE }} onClick={(e) => e.stopPropagation()}>
                        <p className="text-[13px] leading-relaxed whitespace-pre-line" style={{ color: INK }}>{dm.body}</p>
                        <div className="flex items-center gap-2">
                          <textarea rows={2} value={dmReply} onChange={(e) => setDmReply(e.target.value)} placeholder={tr('Reply…', 'উত্তর দিন…')} className="flex-1 rounded-[6px] px-3 py-2 text-[12.5px] outline-none resize-none" style={{ border: `1px solid ${RULE}` }} />
                          <button
                            disabled={sendingDmReply || !dmReply.trim()}
                            onClick={async () => {
                              if (!me || !dmReply.trim()) return;
                              setSendingDmReply(true);
                              await supabase.from('cswo_member_messages').insert({ from_id: me.id, to_id: dm.from_id, subject: `Re: ${dm.subject}`, body: dmReply.trim(), parent_id: dm.id });
                              setSendingDmReply(false);
                              setDmReply('');
                              setSelectedDM(null);
                              await load();
                            }}
                            className="shrink-0 rounded-full px-4 py-2 text-[12.5px] font-semibold text-white disabled:opacity-60"
                            style={{ background: TEAL }}
                          >
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
      ) : (
        <form onSubmit={handleSend} className="space-y-3 rounded-[10px] p-5" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
          <h2 className="text-[16px] font-semibold" style={{ color: INK }}>{tr('Compose message to a member', 'সদস্যকে বার্তা পাঠান')}</h2>
          {sendError && <p className="rounded px-3 py-2 text-[13px]" style={{ background: 'rgba(194,65,12,0.1)', color: '#c2410c' }}>{sendError}</p>}
          {sendSuccess && <p className="rounded px-3 py-2 text-[13px]" style={{ background: 'rgba(77,124,15,0.1)', color: '#4d7c0f' }}>{sendSuccess}</p>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <select className="input" value={selectedMemberId} onChange={(e) => setSelectedMemberId(e.target.value)} required>
              <option value="">{tr('Select member…', 'সদস্য বেছে নিন…')}</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
            </select>
            <input className="input" placeholder={tr('Sender name', 'প্রেরকের নাম')} value={senderName} onChange={(e) => setSenderName(e.target.value)} required />
          </div>
          <textarea className="input resize-none" rows={4} placeholder={tr('Message…', 'বার্তা…')} value={msgText} onChange={(e) => setMsgText(e.target.value)} required />
          <div className="flex justify-end gap-3">
            <button type="submit" disabled={sending} className="rounded-full px-5 py-2 text-[13px] font-semibold text-white" style={{ background: TEAL }}>{sending ? t('common.saving') : tr('Send', 'পাঠান')}</button>
          </div>
          {adminMsgs.length > 0 && (
            <div className="mt-4 border-t pt-3" style={{ borderColor: RULE }}>
              <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: MUTED }}>{tr('Recently sent', 'সাম্প্রতিক প্রেরিত')}</div>
              <div className="space-y-2">
                {adminMsgs.slice(0, 6).map((mm) => (
                  <div key={mm.id} className="rounded-[6px] p-2 text-[12.5px]" style={{ background: CREAM }}>
                    <b style={{ color: INK }}>→ {mm.member?.full_name ?? '—'}</b> <span style={{ color: MUTED }}>· {fmt.date(mm.created_at)}{mm.is_read ? '' : ` · ${tr('unread', 'অপঠিত')}`}</span>
                    <div className="mt-0.5 whitespace-pre-line" style={{ color: INK2 }}>{mm.message}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>
      )}
    </div>
  );
}

function Stat({ label, value, color, dot, sub }: { label: string; value: string; color: string; dot?: boolean; sub?: string }) {
  return (
    <div className="rounded-[10px] p-4" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
      <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: MUTED }}>
        {dot && <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />}
        {label}
      </div>
      <div className="mt-1.5 text-[24px] font-bold" style={{ color }}>{value}</div>
      {sub && <div className="mt-0.5 text-[11px]" style={{ color: MUTED }}>{sub}</div>}
    </div>
  );
}
