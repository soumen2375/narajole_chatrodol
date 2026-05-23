import { useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useT } from '@/i18n';
import { useGalleryCategoryOptions } from '@/hooks/useGallery';

export interface GalleryFormData {
  src: string;
  alt_bn: string;
  alt_en: string;
  category_bn: string;
  category_en: string;
  sub_category_bn: string;
  sub_category_en: string;
  more_url: string;
  sort_order: number;
}

interface Props {
  title: string;
  initial?: GalleryFormData;
  nextSortOrder: number;
  isAdmin?: boolean;
  onSave: (data: GalleryFormData) => Promise<void>;
  onCancel: () => void;
}

const EMPTY: GalleryFormData = {
  src: '', alt_bn: '', alt_en: '',
  category_bn: '', category_en: '',
  sub_category_bn: '', sub_category_en: '',
  more_url: '', sort_order: 0,
};

export default function GalleryPhotoForm({ title, initial, nextSortOrder, isAdmin = false, onSave, onCancel }: Props) {
  const { lang } = useT();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);

  const defaults = initial ?? { ...EMPTY, sort_order: nextSortOrder };
  const [form, setForm] = useState<GalleryFormData>(defaults);
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
    const effectiveSortOrder = form.sort_order < 1 ? nextSortOrder : form.sort_order;

    if (uploadMode === 'upload') {
      if (!selectedFile && !initial?.src) {
        setError(tr('Please select an image.', 'একটি ছবি নির্বাচন করুন।'));
        return;
      }
      if (selectedFile) {
        setUploading(true);
        const ext = selectedFile.name.split('.').pop() ?? 'jpg';
        const path = `gallery/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from('post-images').upload(path, selectedFile);
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

    await onSave({ ...form, src, sort_order: effectiveSortOrder });
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

      {/* Alt text */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={label}>{tr('Description (Bengali)', 'বিবরণ (বাংলা)')}</label>
          <input className={inp} placeholder={tr('e.g. রক্তদান শিবির', 'যেমন: রক্তদান শিবির')}
            value={form.alt_bn} onChange={(e) => set('alt_bn', e.target.value)} />
        </div>
        <div>
          <label className={label}>{tr('Description (English)', 'বিবরণ (ইংরেজি)')}</label>
          <input className={inp} placeholder="e.g. Blood donation camp"
            value={form.alt_en} onChange={(e) => set('alt_en', e.target.value)} />
        </div>
      </div>

      {/* Category (parent) */}
      <div>
        <p className="mb-1 text-xs font-semibold text-gray-600 uppercase tracking-wide">{tr('Category', 'বিভাগ (মূল)')}</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={label}>{tr('Bengali', 'বাংলা')}</label>
            <input
              className={inp}
              list="cat-bn-list"
              placeholder={tr('e.g. স্বাস্থ্য', 'যেমন: স্বাস্থ্য')}
              value={form.category_bn}
              onChange={(e) => set('category_bn', e.target.value)}
            />
            <datalist id="cat-bn-list">
              {categories.map((c) => <option key={c.bn} value={c.bn} />)}
            </datalist>
          </div>
          <div>
            <label className={label}>{tr('English', 'ইংরেজি')}</label>
            <input
              className={inp}
              list="cat-en-list"
              placeholder="e.g. Health"
              value={form.category_en}
              onChange={(e) => set('category_en', e.target.value)}
            />
            <datalist id="cat-en-list">
              {categories.map((c) => <option key={c.en} value={c.en} />)}
            </datalist>
          </div>
        </div>
      </div>

      {/* Sub-category (child) */}
      <div>
        <p className="mb-1 text-xs font-semibold text-gray-600 uppercase tracking-wide">{tr('Sub-category (optional)', 'উপ-বিভাগ (ঐচ্ছিক)')}</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={label}>{tr('Bengali', 'বাংলা')}</label>
            <input
              className={inp}
              list="subcat-bn-list"
              placeholder={tr('e.g. শিবির', 'যেমন: শিবির')}
              value={form.sub_category_bn}
              onChange={(e) => set('sub_category_bn', e.target.value)}
            />
            <datalist id="subcat-bn-list">
              {subCategories.map((c) => <option key={c.bn} value={c.bn} />)}
            </datalist>
          </div>
          <div>
            <label className={label}>{tr('English', 'ইংরেজি')}</label>
            <input
              className={inp}
              list="subcat-en-list"
              placeholder="e.g. Camp"
              value={form.sub_category_en}
              onChange={(e) => set('sub_category_en', e.target.value)}
            />
            <datalist id="subcat-en-list">
              {subCategories.map((c) => <option key={c.en} value={c.en} />)}
            </datalist>
          </div>
        </div>
      </div>

      {/* Admin-only fields */}
      {isAdmin && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={label}>{tr('More link URL (optional)', 'আরো লিংক (ঐচ্ছিক)')}</label>
            <input className={inp} placeholder="https://…" value={form.more_url}
              onChange={(e) => set('more_url', e.target.value)} />
          </div>
          <div>
            <label className={label}>{tr('Display order', 'প্রদর্শন ক্রম')}</label>
            <input
              type="number"
              min={1}
              className={inp}
              placeholder={`${nextSortOrder}`}
              value={form.sort_order < 1 ? '' : form.sort_order}
              onChange={(e) => set('sort_order', Number(e.target.value) || nextSortOrder)}
            />
            <p className="mt-0.5 text-[11px] text-gray-400">
              {tr(`Auto-assigned: ${nextSortOrder}`, `স্বয়ংক্রিয়: ${nextSortOrder}`)}
            </p>
          </div>
        </div>
      )}

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
