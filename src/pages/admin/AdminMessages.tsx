import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { ContactMessage, VolunteerApplication } from '@/types';
import { formatDateBn } from '@/lib/format';
import Spinner from '@/components/ui/Spinner';

export default function AdminMessages() {
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
      <h1 className="mb-6 text-2xl font-bold text-gray-900">বার্তা ও আবেদন</h1>

      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setTab('contact')}
          className={`rounded-full px-4 py-1.5 text-sm ${tab === 'contact' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          যোগাযোগ বার্তা ({messages.length})
        </button>
        <button
          onClick={() => setTab('volunteer')}
          className={`rounded-full px-4 py-1.5 text-sm ${tab === 'volunteer' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          স্বেচ্ছাসেবক আবেদন ({apps.length})
        </button>
      </div>

      {loading ? (
        <Spinner />
      ) : tab === 'contact' ? (
        messages.length === 0 ? (
          <p className="text-gray-600">কোনো বার্তা নেই।</p>
        ) : (
          <div className="space-y-3">
            {messages.map((m) => (
              <div key={m.id} className="rounded-lg bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold text-gray-900">
                    {m.name} {m.subject ? <span className="font-normal text-gray-500">· {m.subject}</span> : null}
                  </h3>
                  <span className="text-xs text-gray-400">{formatDateBn(m.created_at)}</span>
                </div>
                <p className="mt-1 text-xs text-gray-500">{m.email} {m.phone ? `· ${m.phone}` : ''}</p>
                <p className="mt-2 text-sm text-gray-700">{m.message}</p>
              </div>
            ))}
          </div>
        )
      ) : apps.length === 0 ? (
        <p className="text-gray-600">কোনো আবেদন নেই।</p>
      ) : (
        <div className="space-y-3">
          {apps.map((a) => (
            <div key={a.id} className="rounded-lg bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-gray-900">{a.name}</h3>
                <span className="text-xs text-gray-400">{formatDateBn(a.created_at)}</span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {a.email} {a.phone ? `· ${a.phone}` : ''} · আগ্রহ: {a.area_of_interest || '—'}
              </p>
              {a.message && <p className="mt-2 text-sm text-gray-700">{a.message}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
