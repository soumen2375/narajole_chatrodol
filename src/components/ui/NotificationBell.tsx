import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBell } from 'react-icons/fa6';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useT } from '@/i18n';
import { useFmt } from '@/lib/format';
import type { CswoNotification, NotificationKind } from '@/types';

const INK = '#1c1917';
const INK2 = '#44403c';
const MUTED = '#78716c';
const RULE = '#e7e5e4';
const BRAND = '#c2410c';
const PAPER = '#ffffff';
const CREAM = '#faf6ef';

const KIND_COLOR: Record<NotificationKind, string> = {
  info: '#1d4ed8', finance: '#4d7c0f', approval: '#b45309', member: '#7c3aed', system: '#78716c',
};

export default function NotificationBell() {
  const { member } = useAuth();
  const { lang } = useT();
  const fmt = useFmt();
  const navigate = useNavigate();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);

  const [items, setItems] = useState<CswoNotification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!member) return;
    const { data } = await supabase.from('cswo_notifications').select('*').order('created_at', { ascending: false }).limit(30);
    setItems((data ?? []) as CswoNotification[]);
  }, [member]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const unread = items.filter((n) => !n.is_read).length;

  const openPanel = () => { setOpen((o) => !o); if (!open) load(); };

  const onItem = async (n: CswoNotification) => {
    if (!n.is_read) {
      setItems((arr) => arr.map((x) => x.id === n.id ? { ...x, is_read: true } : x));
      await supabase.from('cswo_notifications').update({ is_read: true }).eq('id', n.id);
    }
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  const markAllRead = async () => {
    const ids = items.filter((n) => !n.is_read).map((n) => n.id);
    if (ids.length === 0) return;
    setItems((arr) => arr.map((x) => ({ ...x, is_read: true })));
    await supabase.from('cswo_notifications').update({ is_read: true }).in('id', ids);
  };

  if (!member) return null;

  return (
    <div className="relative" ref={ref}>
      <button onClick={openPanel} className="relative rounded-[4px] p-2 transition-colors hover:bg-gray-100" aria-label={tr('Notifications', 'বিজ্ঞপ্তি')}>
        <FaBell className="h-4 w-4" style={{ color: INK2 }} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white" style={{ background: BRAND }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-[10px] shadow-xl" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${RULE}` }}>
            <span className="text-[13px] font-semibold" style={{ color: INK }}>{tr('Notifications', 'বিজ্ঞপ্তি')}</span>
            {unread > 0 && <button onClick={markAllRead} className="text-[11px] font-medium hover:underline" style={{ color: BRAND }}>{tr('Mark all read', 'সব পঠিত')}</button>}
          </div>
          <div className="max-h-[360px] overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-10 text-center text-[12.5px]" style={{ color: MUTED }}>{tr('No notifications.', 'কোনো বিজ্ঞপ্তি নেই।')}</div>
            ) : items.map((n) => (
              <button key={n.id} onClick={() => onItem(n)} className="flex w-full gap-2.5 px-4 py-3 text-left transition-colors hover:bg-black/[0.02]" style={{ borderBottom: `1px solid ${RULE}`, background: n.is_read ? undefined : CREAM }}>
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: KIND_COLOR[n.kind] }} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[12.5px] font-semibold" style={{ color: INK }}>{n.title}</span>
                  {n.body && <span className="mt-0.5 block text-[12px] leading-snug" style={{ color: INK2 }}>{n.body}</span>}
                  <span className="mt-1 block font-mono text-[10px]" style={{ color: MUTED }}>{fmt.date(n.created_at)}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
