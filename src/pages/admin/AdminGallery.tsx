import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useGalleryAdmin } from '@/hooks/useGallery';
import { GALLERY_IMAGES } from '@/data/content';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { useT } from '@/i18n';
import GalleryPhotoForm, { type GalleryFormData } from '@/components/gallery/GalleryPhotoForm';

export default function AdminGallery() {
  const { member } = useAuth();
  const { t, lang } = useT();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);
  const { items, loading, reload } = useGalleryAdmin();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const nextSortOrder = items.length > 0 ? Math.max(...items.map((i) => i.sort_order)) + 1 : 1;

  const startNew = () => { setEditingId(null); setShowForm(true); };
  const startEdit = (g: (typeof items)[0]) => { setEditingId(g.id); setShowForm(true); };
  const cancelForm = () => { setShowForm(false); setEditingId(null); };

  const getInitial = (): GalleryFormData | undefined => {
    if (!editingId) return undefined;
    const g = items.find((i) => i.id === editingId);
    if (!g) return undefined;
    return {
      src: g.src,
      alt_bn: g.alt.bn, alt_en: g.alt.en,
      category_bn: g.category.bn, category_en: g.category.en,
      sub_category_bn: g.sub_category.bn, sub_category_en: g.sub_category.en,
      more_url: g.more ?? '',
      sort_order: g.sort_order,
    };
  };

  const save = async (data: GalleryFormData) => {
    if (!member) return;
    const payload = {
      src: data.src,
      alt_bn: data.alt_bn, alt_en: data.alt_en,
      category_bn: data.category_bn, category_en: data.category_en,
      sub_category_bn: data.sub_category_bn, sub_category_en: data.sub_category_en,
      more_url: data.more_url || null,
      sort_order: data.sort_order,
    };

    // When adding a new photo, shift existing photos with >= sort_order up by 1
    if (!editingId && items.some((i) => i.sort_order >= data.sort_order)) {
      for (const item of items.filter((i) => i.sort_order >= data.sort_order)) {
        await supabase.from('cswo_gallery').update({ sort_order: item.sort_order + 1 }).eq('id', item.id);
      }
    }

    if (editingId) {
      await supabase.from('cswo_gallery').update(payload).eq('id', editingId);
    } else {
      await supabase.from('cswo_gallery').insert({ ...payload, uploaded_by: member.id, is_active: true });
    }
    setShowForm(false);
    setEditingId(null);
    await reload();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('cswo_gallery').update({ is_active: !current }).eq('id', id);
    await reload();
  };

  // Soft-delete for pending member photos (moves to their trash)
  const rejectPending = async (id: string) => {
    if (!confirm(tr('Reject and delete this submission? The member will see it in their Trash for 30 days.', 'এই ছবিটি প্রত্যাখ্যান করবেন? সদস্য ৩০ দিনের জন্য Trash-এ দেখবেন।'))) return;
    await supabase.from('cswo_gallery').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    await reload();
  };

  // Hard-delete for admin's own published photos
  const remove = async (id: string) => {
    if (!confirm(tr('Permanently delete this photo?', 'ছবিটি স্থায়ীভাবে মুছবেন?'))) return;
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
        sub_category_bn: '', sub_category_en: '',
        more_url: g.more ?? null,
        sort_order: (existing?.length ?? 0) + i + 1,
        is_active: true,
        uploaded_by: member?.id ?? null,
      }));
    if (toInsert.length > 0) await supabase.from('cswo_gallery').insert(toInsert);
    setSeeding(false);
    await reload();
  };

  const pending = items.filter((g) => !g.is_active);
  const published = items.filter((g) => g.is_active);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">{tr('Gallery', 'গ্যালারি')}</h1>
        <div className="flex flex-wrap gap-2">
          {items.length === 0 && !loading && (
            <button onClick={seedStaticGallery} disabled={seeding}
              className="rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {seeding ? tr('Importing…', 'যোগ হচ্ছে…') : tr('Import Static Gallery', 'স্ট্যাটিক গ্যালারি যোগ করুন')}
            </button>
          )}
          {!showForm && (
            <button onClick={startNew} className="btn-primary">
              {tr('+ Add Photo', '+ ছবি যোগ করুন')}
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <GalleryPhotoForm
          title={editingId ? tr('Edit photo', 'ছবি সম্পাদনা') : tr('Add new photo', 'নতুন ছবি যোগ করুন')}
          initial={getInitial()}
          nextSortOrder={nextSortOrder}
          isAdmin
          onSave={save}
          onCancel={cancelForm}
        />
      )}

      {loading ? (
        <ListSkeleton rows={4} />
      ) : items.length === 0 ? (
        <p className="text-gray-500">{tr('No photos yet.', 'কোনো ছবি নেই।')}</p>
      ) : (
        <>
          {/* Pending member submissions */}
          {pending.length > 0 && (
            <div className="mb-6">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-700">
                <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
                {tr('Pending member submissions', 'সদস্যের অপেক্ষমাণ ছবি')} ({pending.length})
              </h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {pending.map((g) => (
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
                      <button onClick={() => rejectPending(g.id)}
                        className="rounded bg-red-500 px-2 py-1 text-[10px] font-semibold text-white">
                        ✕ {tr('Reject', 'প্রত্যাখ্যান')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Published gallery */}
          {published.length > 0 && (
            <div>
              {pending.length > 0 && (
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-500">
                  <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                  {tr('Published', 'প্রকাশিত')} ({published.length})
                </h2>
              )}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {published.map((g) => (
                  <div key={g.id} className="group relative overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
                    <img src={g.src} alt={g.alt.en} className="aspect-square w-full object-cover"
                      onError={(e) => { e.currentTarget.src = '/assets/images/chatrodol.jpg'; }} />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
                      <p className="truncate text-[12px] font-medium text-white">{g.alt.bn || g.alt.en}</p>
                      <p className="text-[10px] text-white/70">
                        {g.category.en || g.category.bn}
                        {(g.sub_category.en || g.sub_category.bn) && ` › ${g.sub_category.en || g.sub_category.bn}`}
                      </p>
                    </div>
                    <div className="absolute right-2 top-2 flex flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button onClick={() => toggleActive(g.id, true)}
                        className="rounded bg-amber-400 px-2 py-1 text-[10px] font-semibold text-white">
                        {tr('Hide', 'লুকান')}
                      </button>
                      <button onClick={() => startEdit(g)}
                        className="rounded bg-blue-500 px-2 py-1 text-[10px] font-semibold text-white">
                        {t('common.edit')}
                      </button>
                      <button onClick={() => remove(g.id)}
                        className="rounded bg-red-500 px-2 py-1 text-[10px] font-semibold text-white">
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
