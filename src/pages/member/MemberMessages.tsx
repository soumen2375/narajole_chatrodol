import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useFmt } from '@/lib/format';
import { useT } from '@/i18n';
import { ListSkeleton } from '@/components/ui/Skeleton';

interface AdminMessage {
  id: string;
  sender_name: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const BRAND = '#c2410c';
const INK   = '#1c1917';
const MUTED = '#78716c';
const RULE  = '#e7e5e4';

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function MemberMessages() {
  const { member } = useAuth();
  const { lang } = useT();
  const fmt = useFmt();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);

  const [msgs, setMsgs] = useState<AdminMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!member) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('cswo_admin_messages')
        .select('*')
        .eq('member_id', member.id)
        .order('created_at', { ascending: false });
      const rows = (data ?? []) as AdminMessage[];
      setMsgs(rows);

      const unread = rows.filter((m) => !m.is_read).map((m) => m.id);
      if (unread.length > 0) {
        await supabase.from('cswo_admin_messages').update({ is_read: true }).in('id', unread);
      }
      setLoading(false);
    })();
  }, [member]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: BRAND }}>
            {tr('FROM ADMIN', 'অ্যাডমিন থেকে')}
          </p>
          <h1 className="text-[24px] font-bold" style={{ color: INK, fontFamily: '"Noto Serif Bengali", serif' }}>
            {tr('Messages', 'বার্তা')}
          </h1>
        </div>
      </div>

      {loading ? (
        <ListSkeleton rows={4} />
      ) : msgs.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20" style={{ color: MUTED }}>
          <div className="text-[40px]">📭</div>
          <p className="text-base font-medium">{tr('No messages yet', 'এখনও কোনো বার্তা নেই')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {msgs.map((msg) => (
            <div
              key={msg.id}
              className="flex gap-4 rounded-xl p-4"
              style={{
                background: msg.is_read ? '#fff' : 'rgba(194,65,12,0.04)',
                border: `1px solid ${msg.is_read ? RULE : 'rgba(194,65,12,0.20)'}`,
                boxShadow: '0 1px 6px rgba(28,25,23,0.05)',
              }}
            >
              <div
                style={{
                  width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                  background: BRAND, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 700,
                  fontFamily: '"Noto Serif Bengali", serif',
                }}
              >
                {initials(msg.sender_name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-semibold" style={{ color: INK }}>{msg.sender_name}</span>
                  <span className="text-[11px]" style={{ color: MUTED }}>{fmt.date(msg.created_at)}</span>
                </div>
                <p className="mt-1 text-[13px] leading-relaxed" style={{ color: MUTED }}>{msg.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
