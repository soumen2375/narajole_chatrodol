import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useCategories } from '@/hooks/useCategories';
import type { CswoCategory } from '@/types';
import { useT } from '@/i18n';

function buildSlug(name: string) {
  return name.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 60);
}

export default function AdminCategories() {
  const { flat, tree, loading, reload } = useCategories();
  const { lang } = useT();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);

  const [postCounts, setPostCounts] = useState<Record<string, number>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editParent, setEditParent] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [newName, setNewName] = useState('');
  const [newParent, setNewParent] = useState('');
  const [adding, setAdding] = useState(false);

  const loadCounts = useCallback(async () => {
    const { data } = await supabase.from('cswo_posts').select('category');
    if (!data) return;
    const counts: Record<string, number> = {};
    data.forEach((p: { category: string }) => { counts[p.category] = (counts[p.category] ?? 0) + 1; });
    setPostCounts(counts);
  }, []);

  useEffect(() => { loadCounts(); }, [loadCounts]);

  const startEdit = (cat: CswoCategory) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditParent(cat.parent_id ?? '');
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from('cswo_categories')
      .update({ name: editName.trim(), slug: buildSlug(editName.trim()), parent_id: editParent || null })
      .eq('id', editingId);
    setSaving(false);
    if (error) {
      setMsg({ type: 'err', text: error.message });
    } else {
      setEditingId(null);
      setMsg({ type: 'ok', text: tr('Category renamed.', 'বিভাগের নাম পরিবর্তন হয়েছে।') });
      await reload();
      await loadCounts();
    }
  };

  const deleteCategory = async (cat: CswoCategory) => {
    const count = postCounts[cat.name] ?? 0;
    if (count > 0) {
      setMsg({ type: 'err', text: tr(`"${cat.name}" has ${count} post(s) — reassign them before deleting.`, `"${cat.name}" বিভাগে ${count}টি পোস্ট আছে — আগে পোস্টগুলো অন্য বিভাগে সরান।`) });
      return;
    }
    if (!confirm(tr(`Delete category "${cat.name}"?`, `"${cat.name}" বিভাগটি মুছবেন?`))) return;
    const { error } = await supabase.from('cswo_categories').delete().eq('id', cat.id);
    if (error) { setMsg({ type: 'err', text: error.message }); return; }
    setMsg({ type: 'ok', text: tr('Category deleted.', 'বিভাগ মুছে গেছে।') });
    await reload();
  };

  const moveSortOrder = async (cat: CswoCategory, dir: 'up' | 'down') => {
    const siblings = flat
      .filter((c) => c.parent_id === cat.parent_id)
      .sort((a, b) => a.sort_order - b.sort_order);
    const idx = siblings.findIndex((c) => c.id === cat.id);
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= siblings.length) return;
    const swap = siblings[swapIdx];
    await Promise.all([
      supabase.from('cswo_categories').update({ sort_order: swap.sort_order }).eq('id', cat.id),
      supabase.from('cswo_categories').update({ sort_order: cat.sort_order }).eq('id', swap.id),
    ]);
    await reload();
  };

  const addCategory = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    const { error } = await supabase
      .from('cswo_categories')
      .insert({ name: newName.trim(), slug: buildSlug(newName.trim()), parent_id: newParent || null });
    setAdding(false);
    if (error) { setMsg({ type: 'err', text: error.message }); return; }
    setMsg({ type: 'ok', text: tr(`Category "${newName.trim()}" added.`, `"${newName.trim()}" বিভাগ যোগ হয়েছে।`) });
    setNewName('');
    setNewParent('');
    await reload();
    await loadCounts();
  };

  // Flatten tree for display with depth for indentation
  const displayList: (CswoCategory & { depth: number })[] = [];
  tree.forEach((root) => {
    displayList.push({ ...root, depth: 0 });
    root.children.forEach((child) => displayList.push({ ...child, depth: 1 }));
  });

  if (loading) return <div className="h-40 animate-pulse rounded-xl bg-gray-100" />;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{tr('Categories', 'বিভাগ ব্যবস্থাপনা')}</h1>
        <p className="text-sm text-gray-400">{displayList.length} {tr('categories', 'বিভাগ')}</p>
      </div>

      {msg && (
        <div className={`mb-4 flex items-center justify-between rounded px-4 py-2 text-sm ${msg.type === 'ok' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          <span>{msg.text}</span>
          <button className="ml-3 opacity-60 hover:opacity-100" onClick={() => setMsg(null)}>✕</button>
        </div>
      )}

      {/* Add form */}
      <div className="mb-6 rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
          {tr('Add new category', 'নতুন বিভাগ যোগ করুন')}
        </p>
        <div className="flex flex-wrap gap-3">
          <input
            className="input min-w-[200px] flex-1"
            placeholder={tr('Category name…', 'বিভাগের নাম লিখুন…')}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addCategory(); }}
          />
          <select className="input min-w-[160px]" value={newParent} onChange={(e) => setNewParent(e.target.value)}>
            <option value="">{tr('Top-level', 'মূল বিভাগ')}</option>
            {flat.filter((c) => !c.parent_id).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button
            onClick={addCategory}
            disabled={adding || !newName.trim()}
            className="btn-primary disabled:opacity-50"
          >
            {adding ? tr('Adding…', 'যোগ হচ্ছে…') : tr('Add', 'যোগ করুন')}
          </button>
        </div>
      </div>

      {/* Category table */}
      <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-4 py-3">{tr('Name', 'নাম')}</th>
              <th className="px-4 py-3">{tr('Slug', 'স্লাগ')}</th>
              <th className="px-4 py-3">{tr('Parent', 'মূল বিভাগ')}</th>
              <th className="px-4 py-3 text-right">{tr('Posts', 'পোস্ট')}</th>
              <th className="px-4 py-3 text-center">{tr('Order', 'ক্রম')}</th>
              <th className="px-4 py-3">{tr('Actions', 'কার্যক্রম')}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {displayList.map((cat) => {
              const isEditing = editingId === cat.id;
              const parent = flat.find((c) => c.id === cat.parent_id);
              const siblings = flat
                .filter((c) => c.parent_id === cat.parent_id)
                .sort((a, b) => a.sort_order - b.sort_order);
              const idx = siblings.findIndex((c) => c.id === cat.id);
              const count = postCounts[cat.name] ?? 0;
              return (
                <tr key={cat.id}>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <input
                        autoFocus
                        className="input text-sm"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit();
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                      />
                    ) : (
                      <span style={{ paddingLeft: cat.depth * 20 }}>
                        {cat.depth > 0 && <span className="mr-1 text-gray-300">↳</span>}
                        <span className="font-medium text-gray-900">{cat.name}</span>
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-gray-400">{cat.slug}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {isEditing ? (
                      <select
                        className="input text-sm"
                        value={editParent}
                        onChange={(e) => setEditParent(e.target.value)}
                      >
                        <option value="">{tr('Top-level', 'মূল বিভাগ')}</option>
                        {flat.filter((c) => !c.parent_id && c.id !== cat.id).map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    ) : (
                      parent?.name ?? '—'
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-semibold ${count > 0 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-400'}`}
                    >
                      {count}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-1">
                      <button
                        onClick={() => moveSortOrder(cat, 'up')}
                        disabled={idx === 0}
                        title="Move up"
                        className="flex h-7 w-7 items-center justify-center rounded border border-gray-200 text-gray-400 hover:bg-gray-100 disabled:opacity-20"
                      >↑</button>
                      <button
                        onClick={() => moveSortOrder(cat, 'down')}
                        disabled={idx === siblings.length - 1}
                        title="Move down"
                        className="flex h-7 w-7 items-center justify-center rounded border border-gray-200 text-gray-400 hover:bg-gray-100 disabled:opacity-20"
                      >↓</button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <div className="flex gap-3">
                        <button onClick={saveEdit} disabled={saving} className="text-xs font-medium text-green-600 hover:underline">
                          {saving ? tr('Saving…', 'সংরক্ষণ…') : tr('Save', 'সংরক্ষণ')}
                        </button>
                        <button onClick={() => setEditingId(null)} className="text-xs font-medium text-gray-400 hover:underline">
                          {tr('Cancel', 'বাতিল')}
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-3">
                        <button onClick={() => startEdit(cat)} className="text-xs font-medium text-blue-600 hover:underline">
                          {tr('Rename', 'নাম পরিবর্তন')}
                        </button>
                        <button
                          onClick={() => deleteCategory(cat)}
                          className={`text-xs font-medium hover:underline ${count > 0 ? 'cursor-not-allowed text-gray-300' : 'text-red-500'}`}
                        >
                          {tr('Delete', 'মুছুন')}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {displayList.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">
                  {tr('No categories yet.', 'কোনো বিভাগ নেই।')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
