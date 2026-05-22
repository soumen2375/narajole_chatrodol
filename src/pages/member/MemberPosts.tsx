import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { CswoPost } from '@/types';
import { useFmt } from '@/lib/format';
import { useT } from '@/i18n';
import { ListSkeleton } from '@/components/ui/Skeleton';
import StatusBadge from '@/components/ui/StatusBadge';

const CATEGORIES = ['News', 'Events', 'Success Story', 'Programs'];
const empty = { title: '', content: '', category: 'News', tags: '', featured_image: '' };

export default function MemberPosts() {
  const { member } = useAuth();
  const { t, lang } = useT();
  const fmt = useFmt();
  const [posts, setPosts] = useState<CswoPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);

  const load = useCallback(async () => {
    if (!member) return;
    setLoading(true);
    const { data } = await supabase.from('cswo_posts').select('*').eq('author_id', member.id).order('created_at', { ascending: false });
    setPosts((data ?? []) as CswoPost[]);
    setLoading(false);
  }, [member]);

  useEffect(() => {
    load();
  }, [load]);

  const startNew = () => {
    setForm(empty);
    setEditingId(null);
    setShowForm(true);
    setError('');
  };

  const startEdit = (p: CswoPost) => {
    setForm({ title: p.title, content: p.content, category: p.category, tags: p.tags.join(', '), featured_image: p.featured_image ?? '' });
    setEditingId(p.id);
    setShowForm(true);
    setError('');
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;
    setSaving(true);
    setError('');
    const payload = {
      title: form.title,
      content: form.content,
      category: form.category,
      tags: form.tags.split(',').map((x) => x.trim()).filter(Boolean),
      featured_image: form.featured_image || null,
      author_id: member.id,
      author_name: member.full_name,
      status: 'pending' as const,
    };
    const { error: err } = editingId
      ? await supabase.from('cswo_posts').update(payload).eq('id', editingId)
      : await supabase.from('cswo_posts').insert(payload);
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setShowForm(false);
    await load();
  };

  const remove = async (id: string) => {
    if (!confirm(tr('Delete this post?', 'এই পোস্টটি মুছে ফেলবেন?'))) return;
    await supabase.from('cswo_posts').delete().eq('id', id);
    await load();
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('m.posts')}</h1>
        <button onClick={startNew} className="btn-primary">{tr('+ New post', '+ নতুন পোস্ট')}</button>
      </div>

      <p className="mb-4 rounded bg-blue-50 px-4 py-2 text-sm text-blue-800">
        {tr('Your post will be published on the public site after admin approval.', 'আপনার পোস্ট অ্যাডমিন অনুমোদনের পর সর্বজনীন ওয়েবসাইটে প্রকাশিত হবে।')}
      </p>

      {showForm && (
        <form onSubmit={save} className="mb-6 space-y-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <h2 className="font-semibold text-gray-800">{editingId ? tr('Edit post', 'পোস্ট সম্পাদনা') : tr('New post', 'নতুন পোস্ট')}</h2>
          {error && <div className="rounded bg-red-100 px-4 py-2 text-red-800">{error}</div>}
          <input className="input" placeholder={tr('Title', 'শিরোনাম')} required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <textarea className="input" rows={6} placeholder={tr('Write the details…', 'বিস্তারিত লিখুন…')} required value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <select className="input" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <input className="input" placeholder={tr('Tags (comma separated)', 'ট্যাগ (কমা দিয়ে আলাদা)')} value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} />
          </div>
          <input className="input" placeholder={tr('Image URL (optional)', 'ছবির URL (ঐচ্ছিক)')} value={form.featured_image} onChange={(e) => setForm((f) => ({ ...f, featured_image: e.target.value }))} />
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="btn-primary">{saving ? t('common.saving') : t('common.submit')}</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">{t('common.cancel')}</button>
          </div>
        </form>
      )}

      {loading ? (
        <ListSkeleton rows={5} />
      ) : posts.length === 0 ? (
        <p className="text-gray-600">{tr('You have not created any posts yet.', 'আপনি এখনও কোনো পোস্ট তৈরি করেননি।')}</p>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="truncate font-semibold text-gray-900">{p.title}</h3>
                  <StatusBadge status={p.status} />
                </div>
                <p className="text-sm text-gray-500">{p.category} · {fmt.date(p.created_at)}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button onClick={() => startEdit(p)} className="text-sm font-medium text-blue-600 hover:underline">{t('common.edit')}</button>
                <button onClick={() => remove(p.id)} className="text-sm font-medium text-red-600 hover:underline">{t('common.delete')}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
