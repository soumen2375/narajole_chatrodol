import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Member } from '@/types';
import { formatDateBn } from '@/lib/format';
import Spinner from '@/components/ui/Spinner';
import StatusBadge from '@/components/ui/StatusBadge';

const emptyForm = { full_name: '', email: '', password: '', phone: '', designation: '', role: 'member' };

export default function AdminMembers() {
  const { member: me } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('cswo_members').select('*').order('created_at', { ascending: false });
    setMembers((data ?? []) as Member[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const { data, error } = await supabase.functions.invoke('cswo-admin-create-member', {
      body: {
        full_name: form.full_name,
        email: form.email,
        password: form.password,
        phone: form.phone,
        designation: form.designation,
        role: form.role,
      },
    });
    setSaving(false);
    if (error || (data && data.error)) {
      let text = data?.error || error?.message || 'সদস্য তৈরি ব্যর্থ হয়েছে।';
      const ctx = (error as { context?: { json?: () => Promise<{ error?: string }> } } | null)?.context;
      if (ctx && typeof ctx.json === 'function') {
        try {
          const j = await ctx.json();
          if (j?.error) text = j.error;
        } catch {
          /* ignore */
        }
      }
      setMsg({ type: 'err', text });
      return;
    }
    setMsg({ type: 'ok', text: `সদস্য তৈরি হয়েছে: ${form.email}` });
    setForm(emptyForm);
    setShowForm(false);
    await load();
  };

  const setStatus = async (id: string, status: Member['status']) => {
    await supabase.from('cswo_members').update({ status }).eq('id', id);
    await load();
  };

  const setRole = async (id: string, role: Member['role']) => {
    await supabase.from('cswo_members').update({ role }).eq('id', id);
    await load();
  };

  const remove = async (id: string) => {
    if (!confirm('এই সদস্যকে তালিকা থেকে মুছে ফেলবেন? (লগইন অ্যাকাউন্ট থাকবে, কিন্তু সদস্য প্রোফাইল মুছে যাবে)')) return;
    await supabase.from('cswo_members').delete().eq('id', id);
    await load();
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">সদস্য ব্যবস্থাপনা</h1>
        <button onClick={() => setShowForm((v) => !v)} className="btn-primary">
          + নতুন সদস্য
        </button>
      </div>

      {msg && (
        <div className={`mb-4 rounded px-4 py-2 ${msg.type === 'ok' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {msg.text}
        </div>
      )}

      {showForm && (
        <form onSubmit={create} className="mb-6 grid grid-cols-1 gap-4 rounded-lg bg-white p-6 shadow-sm sm:grid-cols-2">
          <input className="input" placeholder="পূর্ণ নাম" required value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
          <input className="input" type="email" placeholder="ইমেল" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          <input className="input" type="text" placeholder="অস্থায়ী পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)" required value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
          <input className="input" placeholder="ফোন" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          <input className="input" placeholder="পদবি (যেমন: কোষাধ্যক্ষ)" value={form.designation} onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))} />
          <select className="input" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
            <option value="member">সদস্য</option>
            <option value="admin">অ্যাডমিন</option>
          </select>
          <div className="sm:col-span-2">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'তৈরি হচ্ছে…' : 'সদস্য তৈরি করুন'}
            </button>
            <p className="mt-2 text-xs text-gray-500">
              অ্যাকাউন্ট সরাসরি অনুমোদিত অবস্থায় তৈরি হবে। সদস্যকে ইমেল ও অস্থায়ী পাসওয়ার্ড জানিয়ে দিন।
            </p>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-4 py-3">নাম</th>
              <th className="px-4 py-3">ইমেল</th>
              <th className="px-4 py-3">পদবি</th>
              <th className="px-4 py-3">ভূমিকা</th>
              <th className="px-4 py-3">অবস্থা</th>
              <th className="px-4 py-3">যোগদান</th>
              <th className="px-4 py-3">কার্যক্রম</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {members.map((m) => (
              <tr key={m.id}>
                <td className="px-4 py-3 font-medium text-gray-900">{m.full_name}</td>
                <td className="px-4 py-3 text-gray-600">{m.email}</td>
                <td className="px-4 py-3 text-gray-600">{m.designation || '—'}</td>
                <td className="px-4 py-3">
                  <select
                    value={m.role}
                    disabled={m.id === me?.id}
                    onChange={(e) => setRole(m.id, e.target.value as Member['role'])}
                    className="rounded border border-gray-300 px-2 py-1 text-xs"
                  >
                    <option value="member">সদস্য</option>
                    <option value="admin">অ্যাডমিন</option>
                  </select>
                </td>
                <td className="px-4 py-3"><StatusBadge status={m.status} /></td>
                <td className="px-4 py-3 text-gray-600">{formatDateBn(m.joined_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    {m.status !== 'approved' && (
                      <button onClick={() => setStatus(m.id, 'approved')} className="text-xs font-medium text-green-600 hover:underline">
                        অনুমোদন
                      </button>
                    )}
                    {m.status === 'approved' && m.id !== me?.id && (
                      <button onClick={() => setStatus(m.id, 'suspended')} className="text-xs font-medium text-amber-600 hover:underline">
                        স্থগিত
                      </button>
                    )}
                    {m.status === 'pending' && (
                      <button onClick={() => setStatus(m.id, 'rejected')} className="text-xs font-medium text-red-600 hover:underline">
                        প্রত্যাখ্যান
                      </button>
                    )}
                    {m.id !== me?.id && (
                      <button onClick={() => remove(m.id)} className="text-xs font-medium text-red-600 hover:underline">
                        মুছুন
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
