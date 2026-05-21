import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { CswoPost, PostStatus } from '@/types';
import { formatDateBn } from '@/lib/format';
import Spinner from '@/components/ui/Spinner';
import StatusBadge from '@/components/ui/StatusBadge';

const CATEGORIES = ['News', 'Events', 'Success Story', 'Programs'];
const FILTERS: { key: PostStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'সব' },
  { key: 'pending', label: 'অপেক্ষমাণ' },
  { key: 'published', label: 'প্রকাশিত' },
  { key: 'rejected', label: 'প্রত্যাখ্যাত' },
];

const empty = { title: '', content: '', category: 'News', tags: '', featured_image: '' };

export default function AdminPosts() {
  const { member } = useAuth();
  const [posts, setPosts] = useState<CswoPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<PostStatus | 'all'>('all');
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('cswo_posts').select('*').order('created_at', { ascending: false });
    if (filter !== 'all') q = q.eq('status', filter);
    const { data } = await q;
    setPosts((data ?? []) as CswoPost[]);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (id: string, status: PostStatus) => {
    await supabase.from('cswo_posts').update({ status }).eq('id', id);
    await load();
  };

  const remove = async (id: string) => {
    if (!confirm('পোস্টটি মুছে ফেলবেন?')) return;
    await supabase.from('cswo_posts').delete().eq('id', id);
    await load();
  };

  const startEdit = (p: CswoPost) => {
    setForm({
      title: p.title,
      content: p.content,
      category: p.category,
      tags: p.tags.join(', '),
      featured_image: p.featured_image ?? '',
    });
    setEditingId(p.id);
    setShowForm(true);
  };

  const save = async (e: React.FormEvent, publish: boolean) => {
    e.preventDefault();
    if (!member) return;
    setSaving(true);
    const payload = {
      title: form.title,
      content: form.content,
      category: form.category,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      featured_image: form.featured_image || null,
      status: (publish ? 'published' : 'draft') as PostStatus,
    };
    if (editingId) {
      await supabase.from('cswo_posts').update(payload).eq('id', editingId);
    } else {
      await supabase.from('cswo_posts').insert({ ...payload, author_id: member.id, author_name: member.full_name });
    }
    setSaving(false);
    setShowForm(false);
    setForm(empty);
    setEditingId(null);
    await load();
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">পোস্ট ব্যবস্থাপনা</h1>
        <button
          onClick={() => {
            setForm(empty);
            setEditingId(null);
            setShowForm(true);
          }}
          className="btn-primary"
        >
          + নতুন পোস্ট
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-4 py-1.5 text-sm ${filter === f.key ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {showForm && (
        <form className="mb-6 space-y-4 rounded-lg bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-gray-800">{editingId ? 'পোস্ট সম্পাদনা' : 'নতুন পোস্ট'}</h2>
          <input className="input" placeholder="শিরোনাম" required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <textarea className="input" rows={6} placeholder="বিবরণ" required value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <select className="input" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <input className="input" placeholder="ট্যাগ (কমা দিয়ে)" value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} />
          </div>
          <input className="input" placeholder="ছবির URL" value={form.featured_image} onChange={(e) => setForm((f) => ({ ...f, featured_image: e.target.value }))} />
          <div className="flex flex-wrap gap-3">
            <button onClick={(e) => save(e, true)} disabled={saving} className="btn-primary">
              প্রকাশ করুন
            </button>
            <button onClick={(e) => save(e, false)} disabled={saving} className="btn-secondary">
              খসড়া হিসেবে সংরক্ষণ
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
              বাতিল
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <Spinner />
      ) : posts.length === 0 ? (
        <p className="text-gray-600">কোনো পোস্ট নেই।</p>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <div key={p.id} className="rounded-lg bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{p.title}</h3>
                    <StatusBadge status={p.status} />
                  </div>
                  <p className="text-sm text-gray-500">
                    {p.category} · {p.author_name || 'অ্যাডমিন'} · {formatDateBn(p.created_at)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-sm">
                  {p.status !== 'published' && (
                    <button onClick={() => setStatus(p.id, 'published')} className="font-medium text-green-600 hover:underline">
                      প্রকাশ
                    </button>
                  )}
                  {p.status !== 'rejected' && (
                    <button onClick={() => setStatus(p.id, 'rejected')} className="font-medium text-amber-600 hover:underline">
                      প্রত্যাখ্যান
                    </button>
                  )}
                  <button onClick={() => startEdit(p)} className="font-medium text-blue-600 hover:underline">
                    সম্পাদনা
                  </button>
                  <button onClick={() => remove(p.id)} className="font-medium text-red-600 hover:underline">
                    মুছুন
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
