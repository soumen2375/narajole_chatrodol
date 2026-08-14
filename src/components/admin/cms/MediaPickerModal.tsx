import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { CswoMedia, CswoMediaFolder } from '@/types';
import { compressImage } from '@/lib/imageCompression';
import { buildSeoFileName } from '@/lib/seoImage';
import { Folder, Image, Upload, X, Search, Check, ChevronRight } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  title?: string;
}

function formatBytes(b: number | null): string {
  if (!b) return '';
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

export default function MediaPickerModal({ open, onClose, onSelect, title = 'Media Library' }: Props) {
  const { member } = useAuth();
  const [folders, setFolders] = useState<CswoMediaFolder[]>([]);
  const [media, setMedia] = useState<CswoMedia[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadFolders = useCallback(async () => {
    const { data } = await supabase.from('cswo_media_folders').select('*').order('sort_order');
    setFolders((data ?? []) as CswoMediaFolder[]);
  }, []);

  const loadMedia = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    let q = supabase.from('cswo_media').select('*').order('created_at', { ascending: false });
    if (activeFolderId) q = q.eq('folder_id', activeFolderId);
    if (search.trim()) q = q.ilike('filename', `%${search.trim()}%`);
    const { data } = await q.limit(100);
    setMedia((data ?? []) as CswoMedia[]);
    setLoading(false);
  }, [open, activeFolderId, search]);

  useEffect(() => { if (open) { loadFolders(); } }, [open]);
  useEffect(() => { loadMedia(); }, [loadMedia]);

  const handleUpload = async (file: File) => {
    const path = buildSeoFileName({ originalName: file.name, folder: 'media' });
    setUploading(true);
    try {
      const isImage = file.type.startsWith('image/');
      const uploadFile = isImage ? await compressImage(file, 'post') : file;
      const { error } = await supabase.storage.from('post-images').upload(path, uploadFile);
      if (!error) {
        const url = supabase.storage.from('post-images').getPublicUrl(path).data.publicUrl;
        await supabase.from('cswo_media').insert({
          folder_id: activeFolderId ?? null,
          filename: file.name,
          file_url: url,
          storage_path: path,
          mime_type: file.type,
          size_bytes: uploadFile.size,
          uploaded_by: member?.id ?? null,
        });
        loadMedia();
      } else {
        alert(`Upload error: ${error.message}`);
      }
    } catch (err) {
      alert(`Upload exception: ${(err as Error).message}`);
    }
    setUploading(false);
  };

  if (!open) return null;

  const filtered = media.filter(m =>
    !search.trim() || m.filename.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="flex h-[85vh] w-[90vw] max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Image className="h-5 w-5 text-orange-500" /> {title}
          </h2>
          <button onClick={onClose} className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left: Folders */}
          <div className="w-48 flex-shrink-0 overflow-y-auto border-r bg-gray-50 py-3">
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Folders</p>
            <button
              onClick={() => setActiveFolderId(null)}
              className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors ${activeFolderId === null ? 'bg-orange-50 text-orange-700 font-semibold' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <Folder className="h-4 w-4" /> All Media
            </button>
            {folders.map(f => (
              <button key={f.id}
                onClick={() => setActiveFolderId(f.id)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors ${activeFolderId === f.id ? 'bg-orange-50 text-orange-700 font-semibold' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <ChevronRight className={`h-3 w-3 ${activeFolderId === f.id ? 'opacity-100' : 'opacity-0'}`} />
                <Folder className="h-4 w-4" /> {f.name}
              </button>
            ))}
          </div>

          {/* Right: Media grid */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center gap-3 border-b px-4 py-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input className="input w-full pl-9 text-sm" placeholder="Search files…"
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <label className={`flex cursor-pointer items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 transition-colors ${uploading ? 'pointer-events-none opacity-50' : ''}`}>
                <input type="file" accept="image/*,application/pdf" className="sr-only"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }} />
                <Upload className="h-4 w-4" />
                {uploading ? 'Uploading…' : 'Upload'}
              </label>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="grid grid-cols-4 gap-3">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="aspect-square animate-pulse rounded-lg bg-gray-100" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-gray-400">
                  <Image className="h-12 w-12 opacity-20" />
                  <p className="text-sm">No media found. Upload your first file above.</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-3 sm:grid-cols-5 lg:grid-cols-6">
                  {filtered.map(m => {
                    const isSelected = selected === m.file_url;
                    const isImage = m.mime_type?.startsWith('image/');
                    return (
                      <button key={m.id} type="button"
                        onClick={() => setSelected(isSelected ? null : m.file_url)}
                        className={`group relative aspect-square overflow-hidden rounded-xl border-2 transition-all ${
                          isSelected ? 'border-orange-500 shadow-lg shadow-orange-200' : 'border-transparent hover:border-gray-300'
                        }`}
                      >
                        {isImage ? (
                          <img src={m.file_url} alt={m.alt_text || m.filename}
                            className="h-full w-full object-cover"
                            onError={e => { e.currentTarget.style.display = 'none'; }} />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gray-100 text-3xl">📎</div>
                        )}
                        {isSelected && (
                          <div className="absolute inset-0 flex items-center justify-center bg-orange-500/20">
                            <div className="rounded-full bg-orange-500 p-1">
                              <Check className="h-4 w-4 text-white" />
                            </div>
                          </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="truncate text-[10px] text-white">{m.filename}</p>
                          {m.size_bytes && <p className="text-[9px] text-white/70">{formatBytes(m.size_bytes)}</p>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t bg-gray-50 px-4 py-3">
              <p className="text-xs text-gray-500">
                {filtered.length} file{filtered.length !== 1 ? 's' : ''}
                {selected && ' · 1 selected'}
              </p>
              <div className="flex gap-2">
                <button onClick={onClose}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
                  Cancel
                </button>
                <button
                  disabled={!selected}
                  onClick={() => { if (selected) { onSelect(selected); onClose(); } }}
                  className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-40 transition-colors"
                >
                  Insert Selected
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
