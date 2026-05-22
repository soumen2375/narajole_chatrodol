import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useT } from '@/i18n';
import { ListSkeleton } from '@/components/ui/Skeleton';

interface GalleryRow {
  id: string;
  src: string;
  alt_bn: string;
  alt_en: string;
  category_bn: string;
  category_en: string;
  is_active: boolean;
  created_at: string;
}

const EMPTY_FORM = { alt_bn: '', alt_en: '', category_bn: '', category_en: '' };

export default function MemberGallery() {
  const { member } = useAuth();
  const { lang } = useT();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);

  const [photos, setPhotos] = useState<GalleryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!member) return;
    setLoading(true);
    const { data } = await supabase
      .from('cswo_gallery')
      .select('id,src,alt_bn,alt_en,category_bn,category_en,is_active,created_at')
      .eq('uploaded_by', member.id)
      .order('created_at', { ascending: false });
    setPhotos((data ?? []) as GalleryRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [member]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
    setError(null);
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setSelectedFile(null);
    setPreview('');
    setError(null);
    if (fileRef.current) fileRef.current.value = '';
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member || !selectedFile) { setError(tr('Please select an image.', 'একটি ছবি নির্বাচন করুন।')); return; }
    setUploading(true); setError(null);

    const ext = selectedFile.name.split('.').pop() ?? 'jpg';
    const path = `gallery/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadErr } = await supabase.storage.from('post-images').upload(path, selectedFile);
    if (uploadErr) { setUploading(false); setError(tr(`Upload failed: ${uploadErr.message}`, `আপলোড ব্যর্থ: ${uploadErr.message}`)); return; }

    const publicUrl = supabase.storage.from('post-images').getPublicUrl(path).data.publicUrl;

    const { error: insertErr } = await supabase.from('cswo_gallery').insert({
      src: publicUrl,
      alt_bn: form.alt_bn || form.alt_en,
      alt_en: form.alt_en || form.alt_bn,
      category_bn: form.category_bn || form.category_en,
      category_en: form.category_en || form.category_bn,
      is_active: false,
      uploaded_by: member.id,
      sort_order: 0,
    });

    setUploading(false);
    if (insertErr) { setError(insertErr.message); return; }

    setSuccess(tr('Photo submitted for review!', 'ছবি পর্যালোচনার জন্য জমা দেওয়া হয়েছে!'));
    resetForm();
    load();
    setTimeout(() => setSuccess(''), 3000);
  };

  const removePhoto = async (id: string) => {
    if (!confirm(tr('Delete this photo?', 'ছবিটি মুছে ফেলবেন?'))) return;
    await supabase.from('cswo_gallery').delete().eq('id', id);
    load();
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

      {/* Upload form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100 space-y-4">
          <h2 className="font-semibold text-gray-800">{tr('Submit a photo', 'ছবি জমা দিন')}</h2>

          {/* File picker */}
          <div>
            <label className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-8 transition-colors ${selectedFile ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50/50'}`}>
              <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={onFileChange} />
              {preview
                ? <img src={preview} alt="preview" className="h-32 w-auto rounded-lg object-cover" />
                : (
                  <div className="text-center">
                    <div className="text-3xl text-gray-300">🖼</div>
                    <p className="mt-1 text-sm font-medium text-gray-500">{tr('Click to select image', 'ছবি নির্বাচন করতে ক্লিক করুন')}</p>
                    <p className="text-xs text-gray-400">{tr('JPG, PNG, WebP — max 5 MB', 'JPG, PNG, WebP — সর্বোচ্চ ৫ MB')}</p>
                  </div>
                )
              }
            </label>
            {selectedFile && (
              <button type="button" onClick={() => { setSelectedFile(null); setPreview(''); if (fileRef.current) fileRef.current.value = ''; }}
                className="mt-1 text-xs text-red-500 hover:underline">
                {tr('Remove selected file', 'নির্বাচিত ফাইল সরান')}
              </button>
            )}
          </div>

          {/* Description fields */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">{tr('Description (Bengali)', 'বিবরণ (বাংলা)')}</label>
              <input className="input w-full text-sm" placeholder={tr('e.g. রক্তদান শিবির', 'যেমন: রক্তদান শিবির')}
                value={form.alt_bn} onChange={e => setForm(f => ({ ...f, alt_bn: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">{tr('Description (English)', 'বিবরণ (ইংরেজি)')}</label>
              <input className="input w-full text-sm" placeholder="e.g. Blood donation camp"
                value={form.alt_en} onChange={e => setForm(f => ({ ...f, alt_en: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">{tr('Category (Bengali)', 'বিভাগ (বাংলা)')}</label>
              <input className="input w-full text-sm" placeholder={tr('e.g. স্বাস্থ্য', 'যেমন: স্বাস্থ্য')}
                value={form.category_bn} onChange={e => setForm(f => ({ ...f, category_bn: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">{tr('Category (English)', 'বিভাগ (ইংরেজি)')}</label>
              <input className="input w-full text-sm" placeholder="e.g. Health"
                value={form.category_en} onChange={e => setForm(f => ({ ...f, category_en: e.target.value }))} />
            </div>
          </div>

          {error && <p className="text-sm font-medium text-red-600">✕ {error}</p>}

          <div className="flex gap-3">
            <button type="submit" disabled={uploading || !selectedFile}
              className="btn-primary disabled:opacity-50">
              {uploading ? tr('Uploading…', 'আপলোড হচ্ছে…') : tr('Submit for Review', 'পর্যালোচনার জন্য জমা দিন')}
            </button>
            <button type="button" onClick={resetForm}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
              {tr('Cancel', 'বাতিল')}
            </button>
          </div>
        </form>
      )}

      {/* Photo grid */}
      {loading ? (
        <ListSkeleton rows={4} />
      ) : photos.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-gray-400">
          <p className="text-base font-medium">{tr('No photos yet', 'এখনও কোনো ছবি নেই')}</p>
          <button onClick={() => setShowForm(true)} className="btn-primary text-sm">
            {tr('Submit your first photo', 'প্রথম ছবি জমা দিন')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map(g => (
            <div key={g.id} className="group relative overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
              <img src={g.src} alt={g.alt_en || g.alt_bn}
                className="aspect-square w-full object-cover"
                onError={e => { e.currentTarget.src = '/assets/images/chatrodol.jpg'; }} />

              {/* Status badge */}
              <div className="absolute left-2 top-2">
                {g.is_active
                  ? <span className="rounded-full bg-green-500 px-2 py-0.5 text-[10px] font-semibold text-white shadow">
                      ✓ {tr('Published', 'প্রকাশিত')}
                    </span>
                  : <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold text-white shadow">
                      ⏳ {tr('Pending', 'অপেক্ষমাণ')}
                    </span>
                }
              </div>

              {/* Hover overlay */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
                <p className="truncate text-[12px] font-medium text-white">{g.alt_bn || g.alt_en}</p>
                <p className="text-[10px] text-white/70">{g.category_bn || g.category_en}</p>
              </div>

              {/* Delete button */}
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
    </div>
  );
}
