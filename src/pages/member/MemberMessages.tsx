import { useEffect, useMemo, useState } from 'react';
import { Inbox, Send, Megaphone, PenSquare, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useFmt } from '@/lib/format';
import { useT } from '@/i18n';
import { ListSkeleton } from '@/components/ui/Skeleton';
import type { Member } from '@/types';

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
  const ini = name.split(' ').filter(Boolean).map((w) => w[0]).join('').toUpperCase().slice(0, 2) || '?';
  if (url) return <img src={url} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />;
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: BRAND, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: size * 0.34, flexShrink: 0, ...SERIF }}>
      {ini}
    </div>
  );
}

type Tab = 'inbox' | 'sent' | 'bulletins';

export default function MemberMessages() {
  const { member }  = useAuth();
  const { lang }    = useT();
  const fmt         = useFmt();
  const tr          = (en: string, bn: string) => (lang === 'en' ? en : bn);

  const [tab, setTab]           = useState<Tab>('inbox');
  const [inbox, setInbox]       = useState<MemberMsg[]>([]);
  const [sent, setSent]         = useState<MemberMsg[]>([]);
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
  const load = async () => {
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
  };

  useEffect(() => {
    load();
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
  }, [member]); // eslint-disable-line

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
    const payload: Record<string, unknown> = { from_id: member.id, subject: subject.trim() || tr('(no subject)', '(কোনো বিষয় নেই)'), body: body.trim() };
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
    const payload = { from_id: member.id, to_id: selected.from_id, subject: `Re: ${selected.subject}`, body: replyBody.trim(), parent_id: selected.id };
    const { error } = await supabase.from('cswo_member_messages').insert(payload);
    setSending(false);
    if (!error) { setReplyBody(''); setReplying(false); await load(); }
  };

  /* delete own sent message */
  const deleteMsg = async (msgId: string) => {
    if (!window.confirm(tr('Delete this message?', 'এই বার্তা মুছবেন?'))) return;
    await supabase.from('cswo_member_messages').delete().eq('id', msgId);
    setSent((arr) => arr.filter((m) => m.id !== msgId));
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
      <div className="flex gap-1 rounded-xl border p-1" style={{ borderColor: RULE, background: '#fafaf9' }}>
        {([
          ['inbox',    tr('Inbox', 'ইনবক্স'),     Inbox,     unreadInbox],
          ['sent',     tr('Sent', 'পাঠানো'),       Send,      0],
          ['bulletins',tr('Bulletins', 'বুলেটিন'), Megaphone, unreadBulletins],
        ] as const).map(([key, label, Icon, badge]) => (
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
                          <span className="text-[10.5px]" style={{ color: MUTED }}>{fmt.date(b.created_at)}</span>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed" style={{ color: INK }}>{b.message}</p>
                      </div>
                    </div>
                  ))}
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
