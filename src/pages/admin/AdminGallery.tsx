import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useGalleryAdmin } from '@/hooks/useGallery';
import { GALLERY_IMAGES } from '@/data/content';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { useT } from '@/i18n';

const empty = { src: '', alt_bn: '', alt_en: '', category_bn: '', category_en: '', more_url: '', sort_order: 0 };

export default function AdminGallery() {
  const { member } = useAuth();
  const { t, lang } = useT();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);
  const { items, loading, reload } = useGalleryAdmin();
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const startNew = () => { setForm({ ...empty, sort_order: items.length + 1 }); setEditingId(null); setShowForm(true); };
  const startEdit = (g: (typeof items)[0]) => {
    setForm({
      src: g.src, alt_bn: g.alt.bn, alt_en: g.alt.en,
      category_bn: g.category.bn, category_en: g.category.en,
      more_url: g.more ?? '', sort_order: g.sort_order,
    });
    setEditingId(g.id);
    setShowForm(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;
    setSaving(true);
    const payload = {
      src: form.src,
      alt_bn: form.alt_bn, alt_en: form.alt_en,
      category_bn: form.category_bn, category_en: form.category_en,
      more_url: form.more_url || null,
      sort_order: Number(form.sort_order),
    };
    if (editingId) {
      await supabase.from('cswo_gallery').update(payload).eq('id', editingId);
    } else {
      await supabase.from('cswo_gallery').insert({ ...payload, uploaded_by: member.id, is_active: true });
    }
    setSaving(false);
    setShowForm(false);
    setForm(empty);
    setEditingId(null);
    await reload();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('cswo_gallery').update({ is_active: !current }).eq('id', id);
    await reload();
  };

  const remove = async (id: string) => {
    if (!confirm(tr('Delete this photo?', 'ছবিটি মুছে ফেলবেন?'))) return;
    await supabase.from('cswo_gallery').delete().eq('id', id);
    await reload();
  };

  const seedStaticGallery = async () => {
    if (!confirm(tr('Import all static gallery images to database?', 'স্ট্যাটিক গ্যালারি ছবি ডেটাবেসে যোগ করবেন?'))) return;
    setSeeding(true);
    const { data: existing } = await supabase.from('cswo_gallery').select('src');
    const existingSrcs = new Set((existing ?? []).map((g) => g.src));
    const toInsert = GALLERY_IMAGES
      .filter((g) => !existingSrcs.has(g.src))
      .map((g, i) => ({
        src: g.src,
        alt_bn: g.alt.bn, alt_en: g.alt.en,
        category_bn: g.category.bn, category_en: g.category.en,
        more_url: g.more ?? null,
        sort_order: (existing?.length ?? 0) + i + 1,
        is_active: true,
        uploaded_by: member?.id ?? null,
      }));
    if (toInsert.length > 0) {
      await supabase.from('cswo_gallery').insert(toInsert);
    }
    setSeeding(false);
    await reload();
  };

  const inp = 'w-full rounded-[3px] border border-gray-200 bg-white px-3 py-2 text-[13.5px] outline-none focus:border-orange-500';

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">{tr('Gallery', 'গ্যালারি')}</h1>
        <div className="flex flex-wrap gap-2">
          {items.length === 0 && !loading && (
            <button
              onClick={seedStaticGallery}
              disabled={seeding}
              className="rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {seeding ? tr('Importing…', 'যোগ হচ্ছে…') : tr('Import Static Gallery', 'স্ট্যাটিক গ্যালারি যোগ করুন')}
            </button>
          )}
          <button onClick={startNew} className="btn-primary">
            {tr('+ Add Photo', '+ ছবি যোগ করুন')}
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={save} className="mb-6 space-y-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <h2 className="font-semibold text-gray-800">
            {editingId ? tr('Edit photo', 'ছবি সম্পাদনা') : tr('Add new photo', 'নতুন ছবি যোগ করুন')}
          </h2>
          <input required className={inp} placeholder={tr('Image URL', 'ছবির URL')} value={form.src} onChange={(e) => setForm((f) => ({ ...f, src: e.target.value }))} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <input className={inp} placeholder={tr('Alt text (Bengali)', 'বিবরণ (বাংলা)')} value={form.alt_bn} onChange={(e) => setForm((f) => ({ ...f, alt_bn: e.target.value }))} />
            <input className={inp} placeholder={tr('Alt text (English)', 'বিবরণ (ইংরেজি)')} value={form.alt_en} onChange={(e) => setForm((f) => ({ ...f, alt_en: e.target.value }))} />
            <input className={inp} placeholder={tr('Category (Bengali)', 'বিভাগ (বাংলা)')} value={form.category_bn} onChange={(e) => setForm((f) => ({ ...f, category_bn: e.target.value }))} />
            <input className={inp} placeholder={tr('Category (English)', 'বিভাগ (ইংরেজি)')} value={form.category_en} onChange={(e) => setForm((f) => ({ ...f, category_en: e.target.value }))} />
            <input className={inp} placeholder={tr('More link URL (optional)', 'আরো লিংক (ঐচ্ছিক)')} value={form.more_url} onChange={(e) => setForm((f) => ({ ...f, more_url: e.target.value }))} />
            <input type="number" className={inp} placeholder={tr('Sort order', 'ক্রম')} value={form.sort_order} onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))} />
          </div>
          {form.src && (
            <img src={form.src} alt="preview" className="h-32 w-auto rounded object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          )}
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={saving} className="btn-primary">{saving ? t('common.saving') : t('common.save')}</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">{t('common.cancel')}</button>
          </div>
        </form>
      )}

      {loading ? (
        <ListSkeleton rows={4} />
      ) : items.length === 0 ? (
        <p className="text-gray-500">{tr('No photos yet.', 'কোনো ছবি নেই।')}</p>
      ) : (
        <>
          {/* Pending member submissions */}
          {items.some(g => !g.is_active) && (
            <div className="mb-6">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-700">
                <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
                {tr('Pending member submissions', 'সদস্যের অপেক্ষমাণ ছবি')}
              </h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {items.filter(g => !g.is_active).map((g) => (
                  <div key={g.id} className="group relative overflow-hidden rounded-xl border-2 border-amber-200 bg-white shadow-sm">
                    <img src={g.src} alt={g.alt.en} className="aspect-square w-full object-cover opacity-80"
                      onError={(e) => { e.currentTarget.src = '/assets/images/chatrodol.jpg'; }} />
                    <div className="absolute left-2 top-2">
                      <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold text-white shadow">
                        ⏳ {tr('Pending', 'অপেক্ষমাণ')}
                      </span>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
                      <p className="truncate text-[12px] font-medium text-white">{g.alt.bn || g.alt.en}</p>
                      <p className="text-[10px] text-white/70">{g.category.bn || g.category.en}</p>
                    </div>
                    <div className="absolute right-2 top-2 flex flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button onClick={() => toggleActive(g.id, false)}
                        className="rounded bg-green-500 px-2 py-1 text-[10px] font-semibold text-white">
                        ✓ {tr('Approve', 'অনুমোদন')}
                      </button>
                      <button onClick={() => remove(g.id)} className="rounded bg-red-500 px-2 py-1 text-[10px] font-semibold text-white">
                        {t('common.delete')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Published gallery */}
          {items.some(g => g.is_active) && (
            <div>
              {items.some(g => !g.is_active) && (
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-500">
                  <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                  {tr('Published', 'প্রকাশিত')}
                </h2>
              )}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {items.filter(g => g.is_active).map((g) => (
                  <div key={g.id} className="group relative overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
                    <img src={g.src} alt={g.alt.en} className="aspect-square w-full object-cover"
                      onError={(e) => { e.currentTarget.src = '/assets/images/chatrodol.jpg'; }} />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
                      <p className="truncate text-[12px] font-medium text-white">{g.alt.bn || g.alt.en}</p>
                      <p className="text-[10px] text-white/70">{g.category.bn || g.category.en}</p>
                    </div>
                    <div className="absolute right-2 top-2 flex flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button onClick={() => toggleActive(g.id, true)}
                        className="rounded bg-amber-400 px-2 py-1 text-[10px] font-semibold text-white">
                        {tr('Hide', 'লুকান')}
                      </button>
                      <button onClick={() => startEdit(g)} className="rounded bg-blue-500 px-2 py-1 text-[10px] font-semibold text-white">
                        {t('common.edit')}
                      </button>
                      <button onClick={() => remove(g.id)} className="rounded bg-red-500 px-2 py-1 text-[10px] font-semibold text-white">
                        {t('common.delete')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
