import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { ContactMessage, VolunteerApplication } from '@/types';
import { useFmt } from '@/lib/format';
import { useT } from '@/i18n';
import { ListSkeleton } from '@/components/ui/Skeleton';

export default function AdminMessages() {
  const { t, lang } = useT();
  const fmt = useFmt();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);
  const [tab, setTab] = useState<'contact' | 'volunteer'>('contact');
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [apps, setApps] = useState<VolunteerApplication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [m, v] = await Promise.all([
        supabase.from('cswo_contact_messages').select('*').order('created_at', { ascending: false }),
        supabase.from('cswo_volunteer_applications').select('*').order('created_at', { ascending: false }),
      ]);
      setMessages((m.data ?? []) as ContactMessage[]);
      setApps((v.data ?? []) as VolunteerApplication[]);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">{t('a.messages')}</h1>

      <div className="mb-4 flex gap-2">
        <button onClick={() => setTab('contact')} className={`rounded-full px-4 py-1.5 text-sm ${tab === 'contact' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
          {tr('Contact messages', 'যোগাযোগ বার্তা')} ({messages.length})
        </button>
        <button onClick={() => setTab('volunteer')} className={`rounded-full px-4 py-1.5 text-sm ${tab === 'volunteer' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
          {tr('Volunteer applications', 'স্বেচ্ছাসেবক আবেদন')} ({apps.length})
        </button>
      </div>

      {loading ? (
        <ListSkeleton rows={5} />
      ) : tab === 'contact' ? (
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
      ) : apps.length === 0 ? (
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
      )}
    </div>
  );
}
