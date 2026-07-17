import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useT } from '@/i18n';
import { ListSkeleton } from '@/components/ui/Skeleton';
import GalleryPhotoForm, { type GalleryFormData } from '@/components/gallery/GalleryPhotoForm';

interface GalleryRow {
  id: string;
  src: string;
  alt_bn: string;
  alt_en: string;
  category_bn: string;
  category_en: string;
  sub_category_bn: string;
  sub_category_en: string;
  is_active: boolean;
  deleted_at: string | null;
  created_at: string;
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export default function MemberGallery() {
  const { member } = useAuth();
  const { lang } = useT();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);

  const [photos, setPhotos] = useState<GalleryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [success, setSuccess] = useState('');

  const load = async () => {
    if (!member) return;
    setLoading(true);
    const { data } = await supabase
      .from('cswo_gallery')
      .select('id,src,alt_bn,alt_en,category_bn,category_en,sub_category_bn,sub_category_en,is_active,deleted_at,created_at')
      .eq('uploaded_by', member.id)
      .order('created_at', { ascending: false });

    const rows = (data ?? []) as GalleryRow[];

    // Auto-purge photos trashed 30+ days ago
    const now = Date.now();
    const toDelete = rows.filter(
      (r) => r.deleted_at && now - new Date(r.deleted_at).getTime() >= THIRTY_DAYS_MS
    );
    if (toDelete.length > 0) {
      await supabase.from('cswo_gallery').delete().in('id', toDelete.map((r) => r.id));
      const purgedIds = new Set(toDelete.map((r) => r.id));
      setPhotos(rows.filter((r) => !purgedIds.has(r.id)));
    } else {
      setPhotos(rows);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [member]);

  const handleSave = async (data: GalleryFormData) => {
    if (!member) return;
    await supabase.from('cswo_gallery').insert({
      src: data.src,
      alt_bn: data.alt_bn || data.alt_en,
      alt_en: data.alt_en || data.alt_bn,
      category_bn: data.category_bn || data.category_en,
      category_en: data.category_en || data.category_bn,
      sub_category_bn: data.sub_category_bn,
      sub_category_en: data.sub_category_en,
      is_active: false,
      uploaded_by: member.id,
      sort_order: 0,
    });
    setShowForm(false);
    setSuccess(tr('Photo submitted for review!', 'ছবি পর্যালোচনার জন্য জমা দেওয়া হয়েছে!'));
    load();
    setTimeout(() => setSuccess(''), 3000);
  };

  const removePhoto = async (id: string) => {
    if (!confirm(tr('Permanently delete this photo?', 'ছবিটি স্থায়ীভাবে মুছে ফেলবেন?'))) return;
    await supabase.from('cswo_gallery').delete().eq('id', id);
    load();
  };

  const active = photos.filter((p) => !p.deleted_at);
  const trashed = photos.filter((p) => p.deleted_at);

  const daysLeft = (deletedAt: string) => {
    const remaining = THIRTY_DAYS_MS - (Date.now() - new Date(deletedAt).getTime());
    return Math.max(0, Math.ceil(remaining / (24 * 60 * 60 * 1000)));
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{tr('My Photos', 'আমার ছবি')}</h1>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary">
            + {tr('Submit Photo', 'ছবি জমা দিন')}
          </button>
        )}
      </div>

      {/* Info banner */}
      <div className="mb-5 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-800 ring-1 ring-blue-100">
        {tr(
          'Photos you submit will appear in the public gallery after admin approval.',
          'আপনার জমা দেওয়া ছবি অ্যাডমিন অনুমোদনের পর সর্বজনীন গ্যালারিতে দেখা যাবে।'
        )}
      </div>

      {success && (
        <div className="mb-4 rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700 ring-1 ring-green-200">
          ✓ {success}
        </div>
      )}

      {showForm && (
        <GalleryPhotoForm
          title={tr('Submit a photo', 'ছবি জমা দিন')}
          nextSortOrder={0}
          isAdmin={false}
          onSave={handleSave}
          onCancel={() => setShowForm(false)}
        />
      )}

      {loading ? (
        <ListSkeleton rows={4} />
      ) : (
        <>
          {/* Active photos */}
          {active.length === 0 && trashed.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20 text-gray-400">
              <p className="text-base font-medium">{tr('No photos yet', 'এখনও কোনো ছবি নেই')}</p>
              <button onClick={() => setShowForm(true)} className="btn-primary text-sm">
                {tr('Submit your first photo', 'প্রথম ছবি জমা দিন')}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {active.map((g) => (
                <div key={g.id} className="group relative overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
                  <img src={g.src} alt={g.alt_en || g.alt_bn}
                    className="aspect-square w-full object-cover"
                    onError={(e) => { e.currentTarget.src = '/assets/images/Chhatradol.jpg'; }} />
                  <div className="absolute left-2 top-2">
                    {g.is_active
                      ? <span className="rounded-full bg-green-500 px-2 py-0.5 text-[10px] font-semibold text-white shadow">✓ {tr('Published', 'প্রকাশিত')}</span>
                      : <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold text-white shadow">⏳ {tr('Pending', 'অপেক্ষমাণ')}</span>
                    }
                  </div>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
                    <p className="truncate text-[12px] font-medium text-white">{g.alt_bn || g.alt_en}</p>
                    <p className="text-[10px] text-white/70">
                      {g.category_bn || g.category_en}
                      {(g.sub_category_bn || g.sub_category_en) && ` › ${g.sub_category_bn || g.sub_category_en}`}
                    </p>
                  </div>
                  {!g.is_active && (
                    <button onClick={() => removePhoto(g.id)}
                      className="absolute right-2 top-2 hidden rounded bg-red-500 px-2 py-1 text-[10px] font-semibold text-white group-hover:block">
                      {tr('Delete', 'মুছুন')}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Trash section */}
          {trashed.length > 0 && (
            <div className="mt-10">
              <div className="mb-3 flex items-center gap-2">
                <h2 className="text-sm font-semibold text-red-700">🗑 {tr('Trash', 'ট্র্যাশ')} ({trashed.length})</h2>
                <span className="text-xs text-gray-400">{tr('Rejected by admin — auto-deleted after 30 days', 'অ্যাডমিন প্রত্যাখ্যাত — ৩০ দিন পর স্বয়ংক্রিয়ভাবে মুছে যাবে')}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {trashed.map((g) => (
                  <div key={g.id} className="group relative overflow-hidden rounded-xl border-2 border-red-100 bg-white shadow-sm opacity-75">
                    <img src={g.src} alt={g.alt_en || g.alt_bn}
                      className="aspect-square w-full object-cover grayscale"
                      onError={(e) => { e.currentTarget.src = '/assets/images/Chhatradol.jpg'; }} />
                    <div className="absolute left-2 top-2">
                      <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-semibold text-white shadow">
                        ✕ {tr('Rejected', 'প্রত্যাখ্যাত')}
                      </span>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                      <p className="text-[10px] font-medium text-red-300">
                        {tr(`Deletes in ${daysLeft(g.deleted_at!)} days`, `${daysLeft(g.deleted_at!)} দিনে মুছে যাবে`)}
                      </p>
                    </div>
                    <button onClick={() => removePhoto(g.id)}
                      className="absolute right-2 top-2 hidden rounded bg-red-500 px-2 py-1 text-[10px] font-semibold text-white group-hover:block">
                      {tr('Delete now', 'এখনই মুছুন')}
                    </button>
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
