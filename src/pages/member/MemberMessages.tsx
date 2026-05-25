import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useFmt } from '@/lib/format';
import { useT } from '@/i18n';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { Inbox } from 'lucide-react';

interface AdminMessage {
  id: string;
  sender_name: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const BRAND  = '#0c756f'; // Deep Teal
const INK    = '#000201'; // Charcoal black
const MUTED  = '#7a7c7b'; // Charcoal muted
const RULE   = '#e5dec9'; // Warm border
const SERIF  = { fontFamily: '"Noto Serif Bengali", "Noto Sans Bengali", serif' };

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
          <p className="text-[10px] font-extrabold tracking-widest font-mono uppercase" style={{ color: BRAND }}>
            {tr('FROM TRUST ADMIN', 'অ্যাডমিন থেকে')}
          </p>
          <h1 className="text-2xl font-bold font-bengali-serif" style={{ color: INK, ...SERIF }}>
            {tr('Bulletins', 'বার্তা')}
          </h1>
        </div>
      </div>

      {loading ? (
        <ListSkeleton rows={4} />
      ) : msgs.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16" style={{ color: MUTED }}>
          <Inbox className="h-12 w-12 opacity-35" />
          <p className="text-xs font-bold uppercase tracking-wider">{tr('No messages yet', 'এখনও কোনো বার্তা নেই')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {msgs.map((msg) => (
            <div
              key={msg.id}
              className="flex gap-4 rounded-2xl p-4 border transition-all duration-200 card-lift"
              style={{
                background: msg.is_read ? '#fff' : 'rgba(12,117,111,0.03)',
                borderColor: msg.is_read ? RULE : BRAND,
                boxShadow: '0 2px 10px rgba(0,2,1,0.03)',
              }}
            >
              <div
                className="flex items-center justify-center font-bold text-white shrink-0"
                style={{
                  width: 38, height: 38, borderRadius: '50%',
                  background: BRAND,
                  fontSize: 13,
                  ...SERIF,
                }}
              >
                {initials(msg.sender_name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold" style={{ color: INK }}>{msg.sender_name}</span>
                  <span className="text-[10.5px] font-semibold" style={{ color: MUTED }}>{fmt.date(msg.created_at)}</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed" style={{ color: INK }}>{msg.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
