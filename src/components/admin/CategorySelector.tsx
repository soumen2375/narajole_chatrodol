import { Fragment, useState } from 'react';
import { useCategories } from '@/hooks/useCategories';
import { useT } from '@/i18n';

interface Props {
  value: string;
  onChange: (v: string) => void;
  allowAdd?: boolean;
}

export default function CategorySelector({ value, onChange, allowAdd = false }: Props) {
  const { tree, loading, addCategory } = useCategories();
  const { lang } = useT();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);

  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [parentId, setParentId] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    const cat = await addCategory(newName.trim(), parentId || null);
    setSaving(false);
    if (cat) onChange(cat.name);
    setAdding(false);
    setNewName('');
    setParentId('');
  };

  return (
    <div className="space-y-2">
      {/* Hierarchical select */}
      <select
        className="input w-full text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading}
      >
        {loading && <option value="">Loading…</option>}
        {tree.map((root) => (
          <Fragment key={root.id}>
            <option value={root.name}>{root.name}</option>
            {root.children.map((child) => (
              <option key={child.id} value={child.name}>&nbsp;&nbsp;↳ {child.name}</option>
            ))}
          </Fragment>
        ))}
      </select>

      {/* Add category button */}
      {allowAdd && !adding && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="text-[11px] font-medium text-orange-600 hover:underline"
        >
          + {tr('Add new category', 'নতুন বিভাগ যোগ করুন')}
        </button>
      )}

      {/* Inline add form */}
      {allowAdd && adding && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 space-y-2">
          <input
            autoFocus
            className="input w-full text-sm"
            placeholder={tr('Category name…', 'বিভাগের নাম…')}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); handleAdd(); }
              if (e.key === 'Escape') setAdding(false);
            }}
          />
          <select
            className="input w-full text-sm"
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
          >
            <option value="">{tr('— Top-level —', '— মূল বিভাগ —')}</option>
            {tree.map((root) => (
              <option key={root.id} value={root.id}>{root.name}</option>
            ))}
          </select>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={handleAdd}
              disabled={saving || !newName.trim()}
              className="rounded-lg bg-orange-600 px-3 py-1 text-xs font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
            >
              {saving ? '…' : tr('Add', 'যোগ করুন')}
            </button>
            <button
              type="button"
              onClick={() => { setAdding(false); setNewName(''); setParentId(''); }}
              className="rounded-lg bg-white px-3 py-1 text-xs font-semibold text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
            >
              {tr('Cancel', 'বাতিল')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
