import { useCallback, useEffect, useMemo, useState } from 'react';
import { Inbox, Send, Megaphone, PenSquare, X, Droplet, Users, Mail, AlertCircle, Phone, Building2, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useFmt } from '@/lib/format';
import { useT } from '@/i18n';
import { ListSkeleton } from '@/components/ui/Skeleton';
import MemberAvatar from '@/components/ui/MemberAvatar';
import type { Member } from '@/types';

// ─── Extra types for form inbox ────────────────────────────────────────────
interface FormContact { id: string; name: string; email: string | null; phone: string | null; subject: string | null; message: string; category: string; is_read: boolean; is_starred: boolean; admin_reply: string; replied_at: string | null; created_at: string; }
interface FormVolunteer { id: string; name: string; email: string | null; phone: string | null; area_of_interest: string | null; message: string | null; status: string; created_at: string; }
interface FormBloodReq { id: string; patient_name: string; blood_group: string; hospital: string; contact_phone: string; units_needed: number; required_by: string | null; requester_name: string | null; message: string | null; status: string; created_at: string; }
interface FormBloodCamp { id: string; org_name: string | null; contact_name: string; contact_phone: string; contact_email: string | null; proposed_date: string | null; proposed_venue: string; expected_donors: number | null; message: string | null; status: string; created_at: string; }

// ════════════════════════════════════════════════════════════════
//  MemberMessages — bidirectional messaging
// ════════════════════════════════════════════════════════════════

interface MemberMsg {
  id: string; from_id: string; to_id: string | null; to_role: string | null;
  subject: string; body: string; is_read: boolean; created_at: string;
  from?: { full_name: string; avatar_url: string | null };
  to?:   { full_name: string; avatar_url: string | null };
}
interface AdminBulletin {
  id: string; sender_name: string; message: string; is_read: boolean; created_at: string;
}

const BRAND = '#0c756f';
const INK   = '#1c1917';
const MUTED = '#78716c';
const RULE  = '#e5dec9';
const SERIF = { fontFamily: '"Noto Serif Bengali", serif' };

const ROLES = [
  { value: 'admin',     label: 'Admin' },
  { value: 'treasurer', label: 'Treasurer (Finance)' },
  { value: 'secretary', label: 'Secretary (Events)' },
  { value: 'digital',   label: 'Digital Team (Media)' },
] as const;

function avatar(name: string, url: string | null, size = 38) {
  return <MemberAvatar name={name} avatarUrl={url} size={size} />;
}

type Tab = 'inbox' | 'sent' | 'bulletins' | 'form_inbox';
type FormTab = 'contact' | 'volunteer' | 'blood_req' | 'blood_camp';

export default function MemberMessages() {
  const { member, canManageEvents }  = useAuth();
  const { lang }    = useT();
  const fmt         = useFmt();
  const tr          = (en: string, bn: string) => (lang === 'en' ? en : bn);

  const [tab, setTab]           = useState<Tab>('inbox');
  const [formTab, setFormTab]   = useState<FormTab>('contact');
  const [inbox, setInbox]       = useState<MemberMsg[]>([]);
  const [sent, setSent]         = useState<MemberMsg[]>([]);

  // Form inbox state (only loaded when canManageEvents)
  const [formContacts, setFormContacts]     = useState<FormContact[]>([]);
  const [formVols, setFormVols]             = useState<FormVolunteer[]>([]);
  const [formBRs, setFormBRs]               = useState<FormBloodReq[]>([]);
  const [formBCs, setFormBCs]               = useState<FormBloodCamp[]>([]);
  const [selectedFormItem, setSelectedFormItem] = useState<string | null>(null);
  const [formLoading, setFormLoading]       = useState(false);
  const [bulletins, setBulletins] = useState<AdminBulletin[]>([]);
  const [loading, setLoading]   = useState(true);

  /* compose */
  const [composing, setComposing] = useState(false);
  const [recipMode, setRecipMode] = useState<'role' | 'member'>('role');
  const [toRole, setToRole]       = useState('admin');
  const [toMember, setToMember]   = useState<string>('');
  const [memberSearch, setMemberSearch] = useState('');
  const [members, setMembers]     = useState<Member[]>([]);
  const [subject, setSubject]     = useState('');
  const [body, setBody]           = useState('');
  const [sending, setSending]     = useState(false);
  const [sendErr, setSendErr]     = useState('');
  const [selected, setSelected]   = useState<MemberMsg | null>(null);
  const [replying, setReplying]   = useState(false);
  const [replyBody, setReplyBody] = useState('');

  /* unread counts */
  const unreadInbox   = inbox.filter((m) => !m.is_read).length;
  const unreadBulletins = bulletins.filter((b) => !b.is_read).length;

  /* load data */
  const load = useCallback(async () => {
    if (!member) return;
    setLoading(true);
    const [inR, snR, blR] = await Promise.all([
      supabase.from('cswo_member_messages')
        .select('*, from:from_id(full_name,avatar_url)')
        .eq('to_id', member.id)
        .order('created_at', { ascending: false }),
      supabase.from('cswo_member_messages')
        .select('*, to:to_id(full_name,avatar_url)')
        .eq('from_id', member.id)
        .order('created_at', { ascending: false }),
      supabase.from('cswo_admin_messages')
        .select('*')
        .eq('member_id', member.id)
        .order('created_at', { ascending: false }),
    ]);
    setInbox((inR.data ?? []) as MemberMsg[]);
    setSent((snR.data ?? []) as MemberMsg[]);
    setBulletins((blR.data ?? []) as AdminBulletin[]);
    setLoading(false);

    /* mark bulletins read */
    const unreadIds = ((blR.data ?? []) as AdminBulletin[]).filter((b) => !b.is_read).map((b) => b.id);
    if (unreadIds.length) await supabase.from('cswo_admin_messages').update({ is_read: true }).in('id', unreadIds);
  }, [member]);

  /* load form inbox (for members with canManageEvents) */
  const loadFormInbox = useCallback(async () => {
    if (!canManageEvents) return;
    setFormLoading(true);
    const [c, v, br, bc] = await Promise.all([
      supabase.from('cswo_contact_messages').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('cswo_volunteer_applications').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('cswo_blood_requests').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('cswo_blood_camp_applications').select('*').order('created_at', { ascending: false }).limit(100),
    ]);
    setFormContacts((c.data ?? []) as FormContact[]);
    setFormVols((v.data ?? []) as FormVolunteer[]);
    setFormBRs((br.data ?? []) as FormBloodReq[]);
    setFormBCs((bc.data ?? []) as FormBloodCamp[]);
    setFormLoading(false);
  }, [canManageEvents]);

  useEffect(() => {
    load();
    if (canManageEvents) loadFormInbox();
    if (!member) return;

    const channel = supabase
      .channel('member_messages_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cswo_member_messages' },
        () => { load(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cswo_admin_messages' },
        () => { load(); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [member, canManageEvents]); // eslint-disable-line

  /* load member list for search */
  useEffect(() => {
    if (!composing || recipMode !== 'member') return;
    supabase.from('cswo_members').select('id,full_name,avatar_url,designation').eq('status','approved')
      .order('full_name').then(({ data }) => setMembers((data ?? []) as Member[]));
  }, [composing, recipMode]);

  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return members.filter((m) => m.id !== member?.id).slice(0, 20);
    const q = memberSearch.toLowerCase();
    return members.filter((m) => m.id !== member?.id && (m.full_name.toLowerCase().includes(q) || (m.designation ?? '').toLowerCase().includes(q))).slice(0, 10);
  }, [members, memberSearch, member?.id]);

  /* send message */
  const sendMessage = async () => {
    if (!member || !body.trim()) return;
    if (recipMode === 'member' && !toMember) { setSendErr(tr('Select a recipient.', 'প্রাপক বেছে নিন।')); return; }
    setSending(true); setSendErr('');
    const msgSubject = subject.trim() || tr('(no subject)', '(কোনো বিষয় নেই)');
    const payload: Record<string, unknown> = { from_id: member.id, subject: msgSubject, body: body.trim() };
    if (recipMode === 'role') payload.to_role = toRole;
    else payload.to_id = toMember;
    const { error } = await supabase.from('cswo_member_messages').insert(payload);
    setSending(false);
    if (error) { setSendErr(error.message); return; }

    setComposing(false); setSubject(''); setBody(''); setToMember(''); setMemberSearch('');
    await load();
  };

  /* mark inbox message read */
  const openMessage = async (msg: MemberMsg) => {
    setSelected(msg);
    if (!msg.is_read) {
      await supabase.from('cswo_member_messages').update({ is_read: true }).eq('id', msg.id);
      setInbox((arr) => arr.map((m) => m.id === msg.id ? { ...m, is_read: true } : m));
    }
  };

  /* reply */
  const sendReply = async () => {
    if (!member || !selected || !replyBody.trim()) return;
    setSending(true);
    const replySubject = `Re: ${selected.subject}`;
    const payload = { from_id: member.id, to_id: selected.from_id, subject: replySubject, body: replyBody.trim(), parent_id: selected.id };
    const { error } = await supabase.from('cswo_member_messages').insert(payload);
    setSending(false);
    if (!error) {
      setReplyBody(''); setReplying(false); await load();
    }
  };

  /* delete own sent message */
  const deleteMsg = async (msgId: string) => {
    if (!window.confirm(tr('Delete this message?', 'এই বার্তা মুছবেন?'))) return;
    await supabase.from('cswo_member_messages').delete().eq('id', msgId);
    setSent((arr) => arr.filter((m) => m.id !== msgId));
  };

  /* delete bulletin (admin message) */
  const deleteBulletin = async (bulletinId: string) => {
    if (!window.confirm(tr('Delete this notification?', 'এই বিজ্ঞপ্তি মুছবেন?'))) return;
    await supabase.from('cswo_admin_messages').delete().eq('id', bulletinId);
    setBulletins((arr) => arr.filter((b) => b.id !== bulletinId));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] font-extrabold uppercase tracking-widest" style={{ color: BRAND }}>
            {tr('MEMBER PANEL', 'সদস্য প্যানেল')}
          </p>
          <h1 className="text-2xl font-bold" style={{ color: INK, ...SERIF }}>
            {tr('Messages', 'বার্তা')}
          </h1>
        </div>
        <button
          onClick={() => { setComposing(true); setSelected(null); }}
          className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold text-white"
          style={{ background: BRAND }}
        >
          <PenSquare className="h-4 w-4" /> {tr('Compose', 'নতুন বার্তা')}
        </button>
      </div>

      {/* Compose modal */}
      {composing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: RULE }}>
              <h2 className="font-semibold" style={{ color: INK, ...SERIF }}>{tr('New Message', 'নতুন বার্তা')}</h2>
              <button onClick={() => setComposing(false)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="space-y-3 p-5">
              {sendErr && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{sendErr}</p>}

              {/* Recipient mode toggle */}
              <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: RULE }}>
                <button onClick={() => setRecipMode('role')} className="flex-1 py-2 text-[12px] font-semibold transition-colors" style={{ background: recipMode === 'role' ? BRAND : '#fff', color: recipMode === 'role' ? '#fff' : MUTED }}>
                  {tr('Send to Role', 'ভূমিকায় পাঠান')}
                </button>
                <button onClick={() => setRecipMode('member')} className="flex-1 py-2 text-[12px] font-semibold transition-colors" style={{ background: recipMode === 'member' ? BRAND : '#fff', color: recipMode === 'member' ? '#fff' : MUTED }}>
                  {tr('Send to Member', 'সদস্যকে পাঠান')}
                </button>
              </div>

              {recipMode === 'role' ? (
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">{tr('Recipient', 'প্রাপক')}</label>
                  <select value={toRole} onChange={(e) => setToRole(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm outline-none" style={{ borderColor: RULE }}>
                    {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">{tr('Search member', 'সদস্য খুঁজুন')}</label>
                  <input value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} placeholder={tr('Name or designation…', 'নাম বা পদবি…')} className="w-full rounded-lg border px-3 py-2 text-sm outline-none" style={{ borderColor: RULE }} />
                  {filteredMembers.length > 0 && (
                    <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border" style={{ borderColor: RULE }}>
                      {filteredMembers.map((mem) => (
                        <button key={mem.id} onClick={() => { setToMember(mem.id); setMemberSearch(mem.full_name); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50" style={{ background: toMember === mem.id ? '#f0fdf4' : '' }}>
                          {avatar(mem.full_name, mem.avatar_url, 28)}
                          <span>{mem.full_name}</span>
                          {mem.designation && <span className="text-xs text-gray-400">· {mem.designation}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">{tr('Subject', 'বিষয়')}</label>
                <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={tr('(optional)', '(ঐচ্ছিক)')} className="w-full rounded-lg border px-3 py-2 text-sm outline-none" style={{ borderColor: RULE }} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">{tr('Message *', 'বার্তা *')}</label>
                <textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} placeholder={tr('Write your message…', 'বার্তা লিখুন…')} className="w-full rounded-lg border px-3 py-2 text-sm outline-none resize-none" style={{ borderColor: RULE }} />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setComposing(false)} className="rounded-full border px-4 py-2 text-sm" style={{ borderColor: RULE, color: MUTED }}>{tr('Cancel', 'বাতিল')}</button>
                <button onClick={sendMessage} disabled={sending || !body.trim()} className="rounded-full px-5 py-2 text-sm font-semibold text-white disabled:opacity-60" style={{ background: BRAND }}>
                  {sending ? tr('Sending…', 'পাঠানো হচ্ছে…') : <><Send className="mr-1.5 inline h-3.5 w-3.5" />{tr('Send', 'পাঠান')}</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Message detail panel */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: RULE }}>
              <h2 className="font-semibold" style={{ color: INK, ...SERIF }}>{selected.subject}</h2>
              <button onClick={() => { setSelected(null); setReplying(false); setReplyBody(''); }}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-3">
                {selected.from && avatar(selected.from.full_name, selected.from.avatar_url, 36)}
                <div>
                  <p className="text-sm font-semibold" style={{ color: INK }}>{selected.from?.full_name ?? tr('Member', 'সদস্য')}</p>
                  <p className="text-xs" style={{ color: MUTED }}>{fmt.date(selected.created_at)}</p>
                </div>
              </div>
              <p className="rounded-lg bg-gray-50 p-4 text-sm leading-relaxed" style={{ color: INK }}>{selected.body}</p>

              {!replying ? (
                <button onClick={() => setReplying(true)} className="inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium" style={{ borderColor: RULE, color: BRAND }}>
                  <Send className="h-3.5 w-3.5" /> {tr('Reply', 'উত্তর দিন')}
                </button>
              ) : (
                <div className="space-y-2">
                  <textarea rows={4} value={replyBody} onChange={(e) => setReplyBody(e.target.value)} placeholder={tr('Your reply…', 'আপনার উত্তর…')} className="w-full rounded-lg border px-3 py-2 text-sm outline-none resize-none" style={{ borderColor: RULE }} />
                  <div className="flex gap-2">
                    <button onClick={() => { setReplying(false); setReplyBody(''); }} className="rounded-full border px-3 py-1.5 text-xs" style={{ borderColor: RULE, color: MUTED }}>{tr('Cancel', 'বাতিল')}</button>
                    <button onClick={sendReply} disabled={sending || !replyBody.trim()} className="rounded-full px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-60" style={{ background: BRAND }}>
                      {sending ? '…' : tr('Send Reply', 'উত্তর পাঠান')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 rounded-xl border p-1" style={{ borderColor: RULE, background: '#fafaf9' }}>
        {([
          ['inbox',    tr('Inbox', 'ইনবক্স'),          Inbox,    unreadInbox],
          ['sent',     tr('Sent', 'পাঠানো'),            Send,     0],
          ['bulletins',tr('Bulletins', 'বুলেটিন'),     Megaphone,unreadBulletins],
          ...(canManageEvents ? [['form_inbox', tr('Form Inbox', 'ফর্ম ইনবক্স'), AlertCircle, formContacts.filter((c) => !c.is_read).length + formBRs.filter((r) => r.status === 'open').length + formBCs.filter((b) => b.status === 'pending').length]] as [string, string, typeof Inbox, number][] : []),
        ] as [string, string, typeof Inbox, number][]).map(([key, label, Icon, badge]) => (
          <button key={key} onClick={() => setTab(key as Tab)} className="relative flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[12.5px] font-semibold transition-all"
            style={{ background: tab === key ? BRAND : 'transparent', color: tab === key ? '#fff' : MUTED }}>
            <Icon className="h-3.5 w-3.5" />
            {label}
            {badge > 0 && <span className="ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold" style={{ background: tab === key ? 'rgba(255,255,255,0.25)' : '#fca47e', color: '#fff' }}>{badge}</span>}
          </button>
        ))}
      </div>

      {loading ? <ListSkeleton rows={4} /> : (
        <>
          {/* INBOX */}
          {tab === 'inbox' && (
            inbox.length === 0
              ? <Empty label={tr('No messages in your inbox.', 'ইনবক্স খালি।')} />
              : <div className="space-y-2">
                  {inbox.map((msg) => (
                    <button key={msg.id} onClick={() => openMessage(msg)} className="w-full rounded-2xl border p-4 text-left transition-all hover:shadow-sm"
                      style={{ background: msg.is_read ? '#fff' : 'rgba(12,117,111,0.04)', borderColor: msg.is_read ? RULE : BRAND }}>
                      <div className="flex items-start gap-3">
                        {msg.from && avatar(msg.from.full_name, msg.from.avatar_url)}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold" style={{ color: INK }}>{msg.from?.full_name ?? tr('Member', 'সদস্য')}</span>
                            <span className="text-[10.5px]" style={{ color: MUTED }}>{fmt.date(msg.created_at)}</span>
                          </div>
                          <p className="text-xs font-semibold" style={{ color: msg.is_read ? MUTED : BRAND }}>{msg.subject}</p>
                          <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed" style={{ color: MUTED }}>{msg.body}</p>
                        </div>
                        {!msg.is_read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: BRAND }} />}
                      </div>
                    </button>
                  ))}
                </div>
          )}

          {/* SENT */}
          {tab === 'sent' && (
            sent.length === 0
              ? <Empty label={tr('No messages sent yet.', 'কোনো বার্তা পাঠানো হয়নি।')} />
              : <div className="space-y-2">
                  {sent.map((msg) => (
                    <div key={msg.id} className="rounded-2xl border p-4" style={{ borderColor: RULE, background: '#fff' }}>
                      <div className="flex items-start gap-3">
                        <Send className="mt-1 h-5 w-5 shrink-0" style={{ color: MUTED }} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold" style={{ color: INK }}>
                              {tr('To:', 'প্রাপক:')}  {msg.to_role ? <span className="capitalize">{msg.to_role}</span> : (msg.to?.full_name ?? '—')}
                            </span>
                            <div className="flex items-center gap-3">
                              <span className="text-[10.5px]" style={{ color: MUTED }}>{fmt.date(msg.created_at)}</span>
                              <button
                                onClick={() => deleteMsg(msg.id)}
                                className="text-[10.5px] font-medium hover:underline"
                                style={{ color: '#ef4444' }}
                                title={tr('Delete message', 'বার্তা মুছুন')}
                              >
                                {tr('Delete', 'মুছুন')}
                              </button>
                            </div>
                          </div>
                          <p className="text-xs font-semibold" style={{ color: MUTED }}>{msg.subject}</p>
                          <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed" style={{ color: MUTED }}>{msg.body}</p>
                        </div>
                        <span className="text-[10px] font-semibold" style={{ color: msg.is_read ? '#22c55e' : MUTED }}>
                          {msg.is_read ? tr('Read', 'পড়া হয়েছে') : tr('Sent', 'পাঠানো')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
          )}

          {/* BULLETINS */}
          {tab === 'bulletins' && (
            bulletins.length === 0
              ? <Empty label={tr('No bulletins from admin.', 'অ্যাডমিন থেকে কোনো বুলেটিন নেই।')} />
              : <div className="space-y-2">
                  {bulletins.map((b) => (
                    <div key={b.id} className="flex gap-3 rounded-2xl border p-4" style={{ background: '#fff', borderColor: RULE }}>
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-bold text-white" style={{ background: BRAND, fontSize: 13, ...SERIF }}>
                        {b.sender_name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold" style={{ color: INK }}>{b.sender_name}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-[10.5px]" style={{ color: MUTED }}>{fmt.date(b.created_at)}</span>
                            <button
                              onClick={() => deleteBulletin(b.id)}
                              className="text-[10.5px] font-medium hover:underline"
                              style={{ color: '#ef4444' }}
                              title={tr('Delete notification', 'বিজ্ঞপ্তি মুছুন')}
                            >
                              {tr('Delete', 'মুছুন')}
                            </button>
                          </div>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed" style={{ color: INK }}>{b.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
          )}

          {/* FORM INBOX — only for canManageEvents members */}
          {tab === 'form_inbox' && canManageEvents && (
            <div className="space-y-4">
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: RULE }}>
                {/* Form sub-tabs */}
                <div className="flex border-b" style={{ borderColor: RULE, background: '#fafaf9' }}>
                  {([
                    { k: 'contact' as FormTab,    label: tr('Contact', 'যোগাযোগ'),        icon: Mail,        count: formContacts.filter((c) => !c.is_read).length },
                    { k: 'volunteer' as FormTab,  label: tr('Volunteer', 'স্বেচ্ছাসেবক'), icon: Users,       count: formVols.filter((v) => v.status === 'pending').length },
                    { k: 'blood_req' as FormTab,  label: tr('Blood Req', 'রক্ত অনুরোধ'),  icon: Droplet,     count: formBRs.filter((r) => r.status === 'open').length },
                    { k: 'blood_camp' as FormTab, label: tr('Blood Camp', 'রক্ত শিবির'),   icon: AlertCircle, count: formBCs.filter((c) => c.status === 'pending').length },
                  ]).map(({ k, label, icon: Icon, count }) => (
                    <button key={k} onClick={() => { setFormTab(k); setSelectedFormItem(null); }}
                      className="flex flex-1 items-center justify-center gap-1 px-3 py-2.5 text-[11.5px] font-semibold transition-all border-b-2"
                      style={{ borderBottomColor: formTab === k ? BRAND : 'transparent', color: formTab === k ? BRAND : MUTED, background: 'transparent' }}>
                      <Icon className="h-3 w-3" />
                      {label}
                      {count > 0 && <span className="ml-0.5 rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-bold text-white">{count}</span>}
                    </button>
                  ))}
                </div>

                {formLoading ? <div className="py-8 text-center text-xs" style={{ color: MUTED }}>Loading…</div> : (
                  <div className="max-h-[500px] overflow-y-auto">
                    {/* Contact */}
                    {formTab === 'contact' && (formContacts.length === 0
                      ? <Empty label={tr('No contact messages.', 'কোনো যোগাযোগ বার্তা নেই।')} />
                      : formContacts.map((c, i) => (
                        <div key={c.id} onClick={() => setSelectedFormItem(selectedFormItem === c.id ? null : c.id)}
                          className="cursor-pointer border-t p-4 transition-all hover:bg-gray-50/50" style={{ borderColor: i === 0 ? 'transparent' : RULE }}>
                          <div className="flex items-start gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: BRAND }}>
                              {c.name.split(' ').filter(Boolean).map((w) => w[0]).join('').toUpperCase().slice(0, 2)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[12px] font-semibold" style={{ color: INK }}>{c.name}</span>
                                <span className="font-mono text-[10px]" style={{ color: MUTED }}>{fmt.date(c.created_at)}</span>
                              </div>
                              {c.email && <div className="text-[11px]" style={{ color: MUTED }}>{c.email}{c.phone ? ` · ${c.phone}` : ''}</div>}
                              {c.subject && <p className="text-[12px] font-medium" style={{ color: INK }}>{c.subject}</p>}
                              <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-relaxed" style={{ color: MUTED }}>{c.message}</p>
                              {c.replied_at && <span className="mt-1 inline-block text-[10px] font-semibold" style={{ color: '#4d7c0f' }}>✓ Replied</span>}
                            </div>
                            {!c.is_read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: BRAND }} />}
                          </div>
                          {selectedFormItem === c.id && (
                            <div className="mt-3 border-t pt-3 text-[12.5px] leading-relaxed whitespace-pre-line" style={{ borderColor: RULE, color: INK }}>
                              {c.message}
                              {c.admin_reply && <div className="mt-2 rounded-lg p-3 text-[12px]" style={{ background: 'rgba(77,124,15,0.08)', color: '#4d7c0f' }}>Admin reply: {c.admin_reply}</div>}
                            </div>
                          )}
                        </div>
                      ))
                    )}

                    {/* Volunteer */}
                    {formTab === 'volunteer' && (formVols.length === 0
                      ? <Empty label={tr('No volunteer applications.', 'কোনো আবেদন নেই।')} />
                      : formVols.map((v, i) => (
                        <div key={v.id} onClick={() => setSelectedFormItem(selectedFormItem === v.id ? null : v.id)}
                          className="cursor-pointer border-t p-4 transition-all hover:bg-gray-50/50" style={{ borderColor: i === 0 ? 'transparent' : RULE }}>
                          <div className="flex items-start gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: '#0f766e' }}>
                              {v.name.split(' ').filter(Boolean).map((w) => w[0]).join('').toUpperCase().slice(0, 2)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[12px] font-semibold" style={{ color: INK }}>{v.name}</span>
                                <span className="font-mono text-[10px]" style={{ color: MUTED }}>{fmt.date(v.created_at)}</span>
                              </div>
                              <div className="text-[11px]" style={{ color: MUTED }}>{[v.email, v.phone].filter(Boolean).join(' · ')}</div>
                              {v.area_of_interest && <p className="text-[11.5px]" style={{ color: INK }}>{v.area_of_interest}</p>}
                              <span className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize" style={{ background: v.status === 'accepted' ? 'rgba(77,124,15,0.12)' : v.status === 'pending' ? 'rgba(184,134,11,0.12)' : 'rgba(120,113,108,0.12)', color: v.status === 'accepted' ? '#4d7c0f' : v.status === 'pending' ? '#b8860b' : MUTED }}>{v.status}</span>
                            </div>
                          </div>
                          {selectedFormItem === v.id && v.message && (
                            <div className="mt-3 border-t pt-3 text-[12.5px] leading-relaxed whitespace-pre-line" style={{ borderColor: RULE, color: INK }}>{v.message}</div>
                          )}
                        </div>
                      ))
                    )}

                    {/* Blood Request */}
                    {formTab === 'blood_req' && (formBRs.length === 0
                      ? <Empty label={tr('No blood requests.', 'কোনো রক্তের অনুরোধ নেই।')} />
                      : formBRs.map((r, i) => (
                        <div key={r.id} onClick={() => setSelectedFormItem(selectedFormItem === r.id ? null : r.id)}
                          className="cursor-pointer border-t p-4 transition-all hover:bg-gray-50/50" style={{ borderColor: i === 0 ? 'transparent' : RULE }}>
                          <div className="flex items-start gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: '#b91c1c' }}>{r.blood_group}</div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[12px] font-semibold" style={{ color: INK }}>{r.patient_name}</span>
                                <span className="font-mono text-[10px]" style={{ color: MUTED }}>{fmt.date(r.created_at)}</span>
                              </div>
                              <div className="flex items-center gap-3 text-[11px]" style={{ color: MUTED }}>
                                <span className="inline-flex items-center gap-0.5"><Building2 className="h-3 w-3" />{r.hospital}</span>
                                <span className="inline-flex items-center gap-0.5"><Phone className="h-3 w-3" />{r.contact_phone}</span>
                                <span>{r.units_needed} unit{r.units_needed !== 1 ? 's' : ''}</span>
                              </div>
                              {r.required_by && <div className="mt-0.5 inline-flex items-center gap-0.5 text-[11px]" style={{ color: MUTED }}><Calendar className="h-3 w-3" />By: {fmt.date(r.required_by)}</div>}
                              <span className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize" style={{ background: r.status === 'open' ? 'rgba(185,28,28,0.1)' : 'rgba(77,124,15,0.1)', color: r.status === 'open' ? '#b91c1c' : '#4d7c0f' }}>{r.status.replace('_', ' ')}</span>
                            </div>
                          </div>
                          {selectedFormItem === r.id && r.message && (
                            <div className="mt-3 border-t pt-3 text-[12.5px] leading-relaxed whitespace-pre-line" style={{ borderColor: RULE, color: INK }}>{r.message}</div>
                          )}
                        </div>
                      ))
                    )}

                    {/* Blood Camp */}
                    {formTab === 'blood_camp' && (formBCs.length === 0
                      ? <Empty label={tr('No blood camp applications.', 'কোনো শিবির আবেদন নেই।')} />
                      : formBCs.map((c, i) => (
                        <div key={c.id} onClick={() => setSelectedFormItem(selectedFormItem === c.id ? null : c.id)}
                          className="cursor-pointer border-t p-4 transition-all hover:bg-gray-50/50" style={{ borderColor: i === 0 ? 'transparent' : RULE }}>
                          <div className="flex items-start gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: 'rgba(124,58,237,0.1)' }}>
                              <AlertCircle className="h-4 w-4" style={{ color: '#7c3aed' }} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[12px] font-semibold" style={{ color: INK }}>{c.org_name || c.contact_name}</span>
                                <span className="font-mono text-[10px]" style={{ color: MUTED }}>{fmt.date(c.created_at)}</span>
                              </div>
                              <div className="flex flex-wrap items-center gap-3 text-[11px]" style={{ color: MUTED }}>
                                <span className="inline-flex items-center gap-0.5"><Building2 className="h-3 w-3" />{c.proposed_venue}</span>
                                {c.proposed_date && <span className="inline-flex items-center gap-0.5"><Calendar className="h-3 w-3" />{fmt.date(c.proposed_date)}</span>}
                                <span className="inline-flex items-center gap-0.5"><Phone className="h-3 w-3" />{c.contact_phone}</span>
                              </div>
                              <span className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize" style={{ background: c.status === 'pending' ? 'rgba(184,134,11,0.12)' : c.status === 'approved' ? 'rgba(77,124,15,0.1)' : 'rgba(120,113,108,0.1)', color: c.status === 'pending' ? '#b8860b' : c.status === 'approved' ? '#4d7c0f' : MUTED }}>{c.status}</span>
                            </div>
                          </div>
                          {selectedFormItem === c.id && c.message && (
                            <div className="mt-3 border-t pt-3 text-[12.5px] leading-relaxed whitespace-pre-line" style={{ borderColor: RULE, color: INK }}>{c.message}</div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
              <p className="text-center text-[11px]" style={{ color: MUTED }}>
                {tr('Showing form responses from public site. Go to admin panel for full management.', 'পাবলিক সাইট থেকে ফর্ম রেসপন্স দেখানো হচ্ছে। পূর্ণ ম্যানেজমেন্টের জন্য অ্যাডমিন প্যানেলে যান।')}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}


function Empty({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16" style={{ color: MUTED }}>
      <Inbox className="h-12 w-12 opacity-30" />
      <p className="text-xs font-bold uppercase tracking-wider">{label}</p>
    </div>
  );
}
