import { useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useT } from '@/i18n';
import { useGalleryCategoryOptions } from '@/hooks/useGallery';
import { compressImage } from '@/lib/imageCompression';

export interface GalleryFormData {
  src: string;
  alt_bn: string;
  alt_en: string;
  category_bn: string;
  category_en: string;
  sub_category_bn: string;
  sub_category_en: string;
  more_url: string;
  sort_order?: number;
  created_at?: string;
}

interface Props {
  title: string;
  initial?: GalleryFormData;
  nextSortOrder?: number;
  isAdmin?: boolean;
  onSave: (data: GalleryFormData) => Promise<void>;
  onCancel: () => void;
}

const EMPTY: GalleryFormData = {
  src: '', alt_bn: '', alt_en: '',
  category_bn: '', category_en: '',
  sub_category_bn: '', sub_category_en: '',
  more_url: '',
};

function getInitialDateStr(createdAt?: string): string {
  if (!createdAt) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  const d = new Date(createdAt);
  if (isNaN(d.getTime())) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function GalleryPhotoForm({ title, initial, isAdmin = false, onSave, onCancel }: Props) {
  const { lang } = useT();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);

  const defaults = initial ?? EMPTY;
  const [form, setForm] = useState<GalleryFormData>(defaults);
  const [photoDate, setPhotoDate] = useState<string>(getInitialDateStr(initial?.created_at));
  const [uploadMode, setUploadMode] = useState(!initial?.src || initial.src.startsWith('http') ? 'url' : 'upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(initial?.src ?? '');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const { categories, subCategories } = useGalleryCategoryOptions();

  const set = (k: keyof GalleryFormData, v: string | number) =>
    setForm((f) => ({ ...f, [k]: v }));

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError(tr('File too large (max 5 MB)', 'ফাইল বড় (সর্বোচ্চ ৫ MB)'));
      return;
    }
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    let src = form.src;

    if (uploadMode === 'upload') {
      if (!selectedFile && !initial?.src) {
        setError(tr('Please select an image.', 'একটি ছবি নির্বাচন করুন।'));
        return;
      }
      if (selectedFile) {
        setUploading(true);
        const compressed = await compressImage(selectedFile, 'media');
        const ext = selectedFile.name.split('.').pop() ?? 'jpg';
        const path = `gallery/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from('post-images').upload(path, compressed);
        if (uploadErr) {
          setUploading(false);
          setError(tr(`Upload failed: ${uploadErr.message}`, `আপলোড ব্যর্থ: ${uploadErr.message}`));
          return;
        }
        src = supabase.storage.from('post-images').getPublicUrl(path).data.publicUrl;
        setUploading(false);
      } else {
        src = initial?.src ?? '';
      }
    } else {
      if (!src.trim()) { setError(tr('Image URL is required.', 'ছবির URL দিন।')); return; }
    }

    const valAlt = form.alt_en || form.alt_bn;
    const valCat = form.category_en || form.category_bn;
    const valSub = form.sub_category_en || form.sub_category_bn;

    const createdAtIso = photoDate
      ? new Date(`${photoDate}T12:00:00`).toISOString()
      : new Date().toISOString();

    await onSave({
      ...form,
      alt_en: valAlt,
      alt_bn: valAlt,
      category_en: valCat,
      category_bn: valCat,
      sub_category_en: valSub,
      sub_category_bn: valSub,
      src,
      created_at: createdAtIso,
    });
  };

  const inp = 'w-full rounded-[3px] border border-gray-200 bg-white px-3 py-2 text-[13.5px] outline-none focus:border-orange-500';
  const label = 'mb-1 block text-xs font-medium text-gray-500';

  const activePreview = uploadMode === 'url' ? form.src : preview;

  return (
    <form onSubmit={handleSubmit} className="mb-6 space-y-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
      <h2 className="font-semibold text-gray-800">{title}</h2>

      {/* URL / Upload toggle */}
      <div className="flex rounded-lg border border-gray-200 p-1 w-fit gap-1">
        {(['url', 'upload'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => { setUploadMode(mode); setError(''); }}
            className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${uploadMode === mode ? 'bg-orange-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            {mode === 'url' ? tr('Image URL', 'URL থেকে') : tr('Upload File', 'ফাইল আপলোড')}
          </button>
        ))}
      </div>

      {/* Image source */}
      {uploadMode === 'url' ? (
        <div>
          <label className={label}>{tr('Image URL', 'ছবির URL')}</label>
          <input
            required
            className={inp}
            placeholder="https://…"
            value={form.src}
            onChange={(e) => { set('src', e.target.value); setPreview(e.target.value); }}
          />
        </div>
      ) : (
        <div>
          <label
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-6 transition-colors ${selectedFile || initial?.src ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50/50'}`}
          >
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={onFileChange} />
            {preview
              ? <img src={preview} alt="preview" className="h-28 w-auto rounded-lg object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              : (
                <div className="text-center">
                  <div className="text-3xl text-gray-300">🖼</div>
                  <p className="mt-1 text-sm font-medium text-gray-500">{tr('Click to select image', 'ছবি নির্বাচন করতে ক্লিক করুন')}</p>
                  <p className="text-xs text-gray-400">JPG, PNG, WebP — max 5 MB</p>
                </div>
              )
            }
          </label>
          {(selectedFile || (initial?.src && uploadMode === 'upload')) && (
            <button type="button" onClick={() => { setSelectedFile(null); setPreview(initial?.src ?? ''); if (fileRef.current) fileRef.current.value = ''; }}
              className="mt-1 text-xs text-red-500 hover:underline">
              {tr('Remove selected file', 'নির্বাচিত ফাইল সরান')}
            </button>
          )}
        </div>
      )}

      {/* URL preview for url mode */}
      {uploadMode === 'url' && activePreview && (
        <img src={activePreview} alt="preview" className="h-28 w-auto rounded-lg object-cover"
          onError={(e) => { e.currentTarget.style.display = 'none'; }} />
      )}

      {/* Description */}
      <div>
        <label className={label}>{tr('Description', 'বিবরণ')}</label>
        <input
          className={inp}
          placeholder={tr('e.g. Blood donation camp', 'যেমন: রক্তদান শিবির')}
          value={form.alt_en || form.alt_bn}
          onChange={(e) => {
            const val = e.target.value;
            setForm((f) => ({ ...f, alt_en: val, alt_bn: val }));
          }}
        />
      </div>

      {/* Category & Sub-category */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={label}>{tr('Category', 'বিভাগ')}</label>
          <input
            className={inp}
            list="cat-list"
            placeholder={tr('e.g. Health', 'যেমন: স্বাস্থ্য')}
            value={form.category_en || form.category_bn}
            onChange={(e) => {
              const val = e.target.value;
              setForm((f) => ({ ...f, category_en: val, category_bn: val }));
            }}
          />
          <datalist id="cat-list">
            {Array.from(new Set(categories.map((c) => c.en || c.bn).filter(Boolean))).map((c, i) => (
              <option key={i} value={c} />
            ))}
          </datalist>
        </div>

        <div>
          <label className={label}>{tr('Sub-category (optional)', 'উপ-বিভাগ (ঐচ্ছিক)')}</label>
          <input
            className={inp}
            list="subcat-list"
            placeholder={tr('e.g. Camp', 'যেমন: শিবির')}
            value={form.sub_category_en || form.sub_category_bn}
            onChange={(e) => {
              const val = e.target.value;
              setForm((f) => ({ ...f, sub_category_en: val, sub_category_bn: val }));
            }}
          />
          <datalist id="subcat-list">
            {Array.from(new Set(subCategories.map((c) => c.en || c.bn).filter(Boolean))).map((c, i) => (
              <option key={i} value={c} />
            ))}
          </datalist>
        </div>
      </div>

      {/* Date & More link */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={label}>{tr('Photo Date', 'ছবির তারিখ')}</label>
          <input
            type="date"
            required
            className={inp}
            value={photoDate}
            onChange={(e) => setPhotoDate(e.target.value)}
          />
        </div>
        {isAdmin && (
          <div>
            <label className={label}>{tr('More link URL (optional)', 'আরো লিংক (ঐচ্ছিক)')}</label>
            <input className={inp} placeholder="https://…" value={form.more_url}
              onChange={(e) => set('more_url', e.target.value)} />
          </div>
        )}
      </div>

      {error && <p className="text-sm font-medium text-red-600">✕ {error}</p>}

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={uploading}
          className="btn-primary disabled:opacity-50">
          {uploading ? tr('Uploading…', 'আপলোড হচ্ছে…') : tr('Save', 'সংরক্ষণ করুন')}
        </button>
        <button type="button" onClick={onCancel}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
          {tr('Cancel', 'বাতিল')}
        </button>
      </div>
    </form>
  );
}
