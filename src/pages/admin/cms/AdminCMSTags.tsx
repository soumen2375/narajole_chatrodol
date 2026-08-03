import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { CswoTag } from '@/types';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { useFmt } from '@/lib/format';
import {
  Tag, Plus, Edit2, Trash2, Merge, Search,
  X, Hash,
} from 'lucide-react';

export default function AdminCMSTags() {
  const fmt = useFmt();
  const [tags, setTags] = useState<CswoTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Create Tag state
  const [showCreate, setShowCreate] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagSlug, setNewTagSlug] = useState('');

  // Edit Tag state
  const [editingTag, setEditingTag] = useState<CswoTag | null>(null);
  const [editName, setEditName] = useState('');
  const [editSlug, setEditSlug] = useState('');

  // Merge Tag state
  const [mergeSource, setMergeSource] = useState<CswoTag | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState('');
  const [merging, setMerging] = useState(false);

  const loadTags = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('cswo_tags')
      .select('*')
      .order('usage_count', { ascending: false });

    setTags((data ?? []) as CswoTag[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadTags(); }, [loadTags]);

  const handleCreate = async () => {
    if (!newTagName.trim()) return;
    const slug = newTagSlug.trim() || newTagName.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
    await supabase.from('cswo_tags').insert({ name: newTagName.trim(), slug });
    setNewTagName('');
    setNewTagSlug('');
    setShowCreate(false);
    loadTags();
  };

  const handleUpdate = async () => {
    if (!editingTag || !editName.trim()) return;
    await supabase.from('cswo_tags').update({
      name: editName.trim(),
      slug: editSlug.trim() || editName.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-'),
    }).eq('id', editingTag.id);

    setEditingTag(null);
    loadTags();
  };

  const handleDelete = async (tag: CswoTag) => {
    if (!confirm(`Delete tag "${tag.name}"? This will remove it from linked posts.`)) return;
    await supabase.from('cswo_tags').delete().eq('id', tag.id);
    loadTags();
  };

  const handleMerge = async () => {
    if (!mergeSource || !mergeTargetId) return;
    const targetTag = tags.find(t => t.id === mergeTargetId);
    if (!targetTag) return;

    setMerging(true);

    // 1. Move all post_tags from mergeSource.id to mergeTargetId
    const { data: sourcePosts } = await supabase
      .from('cswo_post_tags')
      .select('post_id')
      .eq('tag_id', mergeSource.id);

    if (sourcePosts && sourcePosts.length > 0) {
      for (const row of sourcePosts) {
        // Insert target tag association
        await supabase
          .from('cswo_post_tags')
          .upsert({ post_id: row.post_id, tag_id: targetTag.id }, { onConflict: 'post_id,tag_id' });
      }
    }

    // 2. Delete source tag (cascade deletes junction rows)
    await supabase.from('cswo_tags').delete().eq('id', mergeSource.id);

    setMerging(false);
    setMergeSource(null);
    setMergeTargetId('');
    loadTags();
  };

  const visibleTags = tags.filter(t =>
    !search.trim() ||
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Tag className="h-6 w-6 text-orange-500" /> CMS Tag Manager
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Organise, edit, merge, and clean up content tags across all published posts.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-orange-700 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" /> Create New Tag
        </button>
      </div>

      {/* Toolbar & Search */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            className="input w-full pl-9 text-sm"
            placeholder="Search tags by name or slug…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <span className="text-xs font-semibold text-gray-500">
          {tags.length} total tag{tags.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Tags Table */}
      {loading ? (
        <ListSkeleton rows={5} />
      ) : visibleTags.length === 0 ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white p-8 text-center text-gray-400">
          <Hash className="h-10 w-10 text-gray-300 mb-2" />
          <p className="text-sm font-semibold text-gray-600">No tags found</p>
          <p className="mt-1 text-xs text-gray-400">Click "Create New Tag" above to add your first tag.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-6 py-3 text-left">Tag Name</th>
                <th className="px-4 py-3 text-left">URL Slug</th>
                <th className="px-4 py-3 text-left">Usage Count</th>
                <th className="px-4 py-3 text-left">Created</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visibleTags.map(tag => (
                <tr key={tag.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-3.5 font-bold text-gray-900 flex items-center gap-2">
                    <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs text-orange-700 font-bold">
                      #{tag.name}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-xs font-mono text-gray-500">
                    /{tag.slug}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-700">
                      {tag.usage_count} post{tag.usage_count !== 1 ? 's' : ''}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-gray-400 whitespace-nowrap">
                    {fmt.date(tag.created_at)}
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5 opacity-90 group-hover:opacity-100">
                      <button
                        onClick={() => {
                          setEditingTag(tag);
                          setEditName(tag.name);
                          setEditSlug(tag.slug);
                        }}
                        title="Edit Tag"
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setMergeSource(tag)}
                        title="Merge into another tag"
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-purple-50 hover:text-purple-600"
                      >
                        <Merge className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(tag)}
                        title="Delete Tag"
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl space-y-4 p-6">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-gray-900">Create New Tag</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Tag Name</label>
                <input
                  className="input w-full text-sm"
                  placeholder="e.g. Blood Donation Camp"
                  value={newTagName}
                  onChange={e => {
                    setNewTagName(e.target.value);
                    setNewTagSlug(e.target.value.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-'));
                  }}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">URL Slug</label>
                <input
                  className="input w-full text-xs font-mono"
                  placeholder="blood-donation-camp"
                  value={newTagSlug}
                  onChange={e => setNewTagSlug(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t pt-4">
              <button onClick={() => setShowCreate(false)} className="btn-secondary text-xs">Cancel</button>
              <button onClick={handleCreate} disabled={!newTagName.trim()} className="btn-primary text-xs">
                Create Tag
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingTag && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl space-y-4 p-6">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-gray-900">Edit Tag</h3>
              <button onClick={() => setEditingTag(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Tag Name</label>
                <input
                  className="input w-full text-sm"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">URL Slug</label>
                <input
                  className="input w-full text-xs font-mono"
                  value={editSlug}
                  onChange={e => setEditSlug(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t pt-4">
              <button onClick={() => setEditingTag(null)} className="btn-secondary text-xs">Cancel</button>
              <button onClick={handleUpdate} disabled={!editName.trim()} className="btn-primary text-xs">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Merge Modal */}
      {mergeSource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl space-y-4 p-6">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Merge className="h-4 w-4 text-purple-600" /> Merge Tag
              </h3>
              <button onClick={() => setMergeSource(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <p className="text-gray-600">
                Merge <strong className="text-orange-600">#{mergeSource.name}</strong> into another target tag. All linked articles will be reassigned.
              </p>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Target Tag</label>
                <select
                  className="input w-full text-sm"
                  value={mergeTargetId}
                  onChange={e => setMergeTargetId(e.target.value)}
                >
                  <option value="">Select target tag…</option>
                  {tags.filter(t => t.id !== mergeSource.id).map(t => (
                    <option key={t.id} value={t.id}>
                      #{t.name} ({t.usage_count} posts)
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t pt-4">
              <button onClick={() => setMergeSource(null)} className="btn-secondary text-xs">Cancel</button>
              <button onClick={handleMerge} disabled={!mergeTargetId || merging} className="btn-primary text-xs bg-purple-600 hover:bg-purple-700">
                {merging ? 'Merging…' : 'Merge & Reassign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
