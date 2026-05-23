import { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import type { ContactMessage, VolunteerApplication, Member } from '@/types';
import { useFmt } from '@/lib/format';
import { useT } from '@/i18n';
import { ListSkeleton } from '@/components/ui/Skeleton';

interface AdminMsg {
  id: string;
  member_id: string;
  sender_name: string;
  message: string;
  is_read: boolean;
  created_at: string;
  member?: { full_name: string };
}

export default function AdminMessages() {
  const { t, lang } = useT();
  const fmt = useFmt();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);

  const [tab, setTab] = useState<'compose' | 'contact' | 'volunteer'>('compose');
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [apps, setApps] = useState<VolunteerApplication[]>([]);
  const [adminMsgs, setAdminMsgs] = useState<AdminMsg[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  // compose form state
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [senderName, setSenderName] = useState('Admin');
  const [msgText, setMsgText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState('');
  const [sendError, setSendError] = useState('');

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const [m, v, am, mem] = await Promise.all([
      supabase.from('cswo_contact_messages').select('*').order('created_at', { ascending: false }),
      supabase.from('cswo_volunteer_applications').select('*').order('created_at', { ascending: false }),
      supabase.from('cswo_admin_messages')
        .select('*, member:cswo_members(full_name)')
        .order('created_at', { ascending: false }),
      supabase.from('cswo_members').select('id,full_name,status').eq('status', 'approved').order('full_name'),
    ]);
    setMessages((m.data ?? []) as ContactMessage[]);
    setApps((v.data ?? []) as VolunteerApplication[]);
    setAdminMsgs((am.data ?? []) as AdminMsg[]);
    setMembers((mem.data ?? []) as Member[]);
    setLoading(false);
  };

  const handleSend = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedMemberId || !msgText.trim() || !senderName.trim()) return;
    setSending(true); setSendError(''); setSendSuccess('');
    const { error } = await supabase.from('cswo_admin_messages').insert({
      member_id: selectedMemberId,
      sender_name: senderName.trim(),
      message: msgText.trim(),
    });
    setSending(false);
    if (error) { setSendError(error.message); return; }
    setSendSuccess(tr('Message sent!', 'বার্তা পাঠানো হয়েছে!'));
    setMsgText('');
    setSelectedMemberId('');
    load();
    setTimeout(() => setSendSuccess(''), 3000);
  };

  const deleteMsg = async (id: string) => {
    if (!confirm(tr('Delete this message?', 'এই বার্তাটি মুছবেন?'))) return;
    await supabase.from('cswo_admin_messages').delete().eq('id', id);
    load();
  };

  const TABS = [
    { key: 'compose', label: tr('Send to Member', 'সদস্যকে বার্তা') },
    { key: 'contact', label: `${tr('Contact', 'যোগাযোগ')} (${messages.length})` },
    { key: 'volunteer', label: `${tr('Volunteer', 'স্বেচ্ছাসেবক')} (${apps.length})` },
  ] as const;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">{t('a.messages')}</h1>

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`rounded-full px-4 py-1.5 text-sm ${tab === key ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? <ListSkeleton rows={5} /> : (
        <>
          {/* ── Compose tab ── */}
          {tab === 'compose' && (
            <div className="space-y-5">
              {/* Send form */}
              <form onSubmit={handleSend}
                className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100 space-y-4">
                <h2 className="font-semibold text-gray-900">{tr('New message to member', 'সদস্যকে নতুন বার্তা')}</h2>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">{tr('Select member', 'সদস্য বেছে নিন')}</label>
                  <select className="input w-full" value={selectedMemberId} onChange={(e) => setSelectedMemberId(e.target.value)} required>
                    <option value="">{tr('— Choose member —', '— সদস্য বেছে নিন —')}</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>{m.full_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">{tr('Sender name', 'প্রেরকের নাম')}</label>
                  <input className="input w-full" value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder={tr('e.g. General Secretary', 'যেমন: সাধারণ সম্পাদক')} required />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">{tr('Message', 'বার্তা')}</label>
                  <textarea className="input w-full" rows={4} value={msgText}
                    onChange={(e) => setMsgText(e.target.value)}
                    placeholder={tr('Write your message…', 'বার্তা লিখুন…')} required />
                </div>

                {sendError && <p className="text-sm text-red-600">{sendError}</p>}
                {sendSuccess && <p className="text-sm text-green-600">✓ {sendSuccess}</p>}

                <button type="submit" disabled={sending || !selectedMemberId || !msgText.trim()}
                  className="btn-primary">
                  {sending ? tr('Sending…', 'পাঠানো হচ্ছে…') : `✉ ${tr('Send Message', 'বার্তা পাঠান')}`}
                </button>
              </form>

              {/* Sent messages log */}
              {adminMsgs.length > 0 && (
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-gray-700 uppercase tracking-wider">
                    {tr('Sent messages', 'পাঠানো বার্তা')}
                  </h3>
                  <div className="space-y-2">
                    {adminMsgs.map((msg) => (
                      <div key={msg.id} className="flex items-start justify-between gap-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-gray-900">
                              {(msg.member as { full_name: string } | undefined)?.full_name ?? msg.member_id}
                            </span>
                            <span className="text-xs text-gray-500">← {msg.sender_name}</span>
                            {!msg.is_read && (
                              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700">
                                {tr('Unread', 'অপঠিত')}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-gray-600 line-clamp-2">{msg.message}</p>
                          <p className="mt-0.5 text-xs text-gray-400">{fmt.date(msg.created_at)}</p>
                        </div>
                        <button onClick={() => deleteMsg(msg.id)}
                          className="shrink-0 text-sm text-red-500 hover:underline">
                          {tr('Delete', 'মুছুন')}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Contact messages tab ── */}
          {tab === 'contact' && (
            messages.length === 0 ? (
              <p className="text-gray-600">{tr('No messages.', 'কোনো বার্তা নেই।')}</p>
            ) : (
              <div className="space-y-3">
                {messages.map((m) => (
                  <div key={m.id} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-semibold text-gray-900">{m.name} {m.subject ? <span className="font-normal text-gray-500">· {m.subject}</span> : null}</h3>
                      <span className="text-xs text-gray-400">{fmt.date(m.created_at)}</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">{m.email} {m.phone ? `· ${m.phone}` : ''}</p>
                    <p className="mt-2 text-sm text-gray-700">{m.message}</p>
                  </div>
                ))}
              </div>
            )
          )}

          {/* ── Volunteer applications tab ── */}
          {tab === 'volunteer' && (
            apps.length === 0 ? (
              <p className="text-gray-600">{tr('No applications.', 'কোনো আবেদন নেই।')}</p>
            ) : (
              <div className="space-y-3">
                {apps.map((a) => (
                  <div key={a.id} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-semibold text-gray-900">{a.name}</h3>
                      <span className="text-xs text-gray-400">{fmt.date(a.created_at)}</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">{a.email} {a.phone ? `· ${a.phone}` : ''} · {tr('interest', 'আগ্রহ')}: {a.area_of_interest || '—'}</p>
                    {a.message && <p className="mt-2 text-sm text-gray-700">{a.message}</p>}
                  </div>
                ))}
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
