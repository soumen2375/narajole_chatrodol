import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { CswoMedia, CswoMediaFolder } from '@/types';
import { compressImage } from '@/lib/imageCompression';
import { buildSeoFileName, downloadSeoImage } from '@/lib/seoImage';
import {
  Folder, Upload, Search, FolderPlus, Trash2,
  X, Download, Copy, Check, Grid, List as ListIcon,
  HardDrive,
} from 'lucide-react';

function formatBytes(b: number | null): string {
  if (!b) return '—';
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

type GridMode = 'grid' | 'list';

export default function AdminMediaLibrary() {
  const { member } = useAuth();
  const [folders, setFolders] = useState<CswoMediaFolder[]>([]);
  const [media, setMedia] = useState<CswoMedia[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [gridMode, setGridMode] = useState<GridMode>('grid');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const loadFolders = useCallback(async () => {
    const { data } = await supabase.from('cswo_media_folders').select('*').order('sort_order');
    setFolders((data ?? []) as CswoMediaFolder[]);
  }, []);

  const loadMedia = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('cswo_media').select('*').order('created_at', { ascending: false });
    if (activeFolderId) q = q.eq('folder_id', activeFolderId);
    if (search.trim()) q = q.ilike('filename', `%${search.trim()}%`);
    const { data } = await q.limit(200);
    setMedia((data ?? []) as CswoMedia[]);
    setLoading(false);
  }, [activeFolderId, search]);

  useEffect(() => { loadFolders(); }, [loadFolders]);
  useEffect(() => { loadMedia(); }, [loadMedia]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || !member) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const path = buildSeoFileName({ originalName: file.name, folder: 'media' });
      const isImage = file.type.startsWith('image/');
      const uploadFile = isImage ? await compressImage(file, 'post') : file;
      const { error } = await supabase.storage.from('post-images').upload(path, uploadFile);
      if (!error) {
        const url = supabase.storage.from('post-images').getPublicUrl(path).data.publicUrl;
        await supabase.from('cswo_media').insert({
          folder_id: activeFolderId ?? null,
          filename: file.name, file_url: url, storage_path: path,
          mime_type: file.type, size_bytes: uploadFile.size,
          uploaded_by: member.id,
        });
      }
    }
    setUploading(false);
    loadMedia();
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    await supabase.from('cswo_media_folders').insert({
      name: newFolderName.trim(), sort_order: folders.length + 1, created_by: member?.id,
    });
    setNewFolderName(''); setShowNewFolder(false);
    loadFolders();
  };

  const deleteSelected = async () => {
    if (!selected.size || !confirm(`Delete ${selected.size} files?`)) return;
    await supabase.from('cswo_media').delete().in('id', [...selected]);
    setSelected(new Set()); loadMedia();
  };

  const copyUrl = async (url: string, id: string) => {
    await navigator.clipboard.writeText(url);
    setCopied(id); setTimeout(() => setCopied(null), 2000);
  };

  const totalSize = media.reduce((acc, m) => acc + (m.size_bytes ?? 0), 0);
  const activeFolder = folders.find(f => f.id === activeFolderId);

  return (
    <div className="space-y-0 -m-6 flex min-h-[calc(100vh-64px)] flex-col bg-white">

      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-orange-500" /> Media Library
          </h1>
          <p className="mt-0.5 text-xs text-gray-500">
            {media.length} files · {formatBytes(totalSize)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button onClick={deleteSelected}
              className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-100">
              <Trash2 className="h-4 w-4" /> Delete ({selected.size})
            </button>
          )}
          <label className={`flex cursor-pointer items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
            <input type="file" accept="image/*,application/pdf,video/*" multiple className="sr-only"
              onChange={e => handleUpload(e.target.files)} />
            <Upload className="h-4 w-4" /> {uploading ? 'Uploading…' : 'Upload Files'}
          </label>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        <div className="w-52 flex-shrink-0 overflow-y-auto border-r bg-gray-50 py-4">
          <div className="mb-2 flex items-center justify-between px-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Folders</p>
            <button onClick={() => setShowNewFolder(v => !v)}
              className="rounded p-0.5 text-gray-400 hover:text-gray-700 transition-colors">
              <FolderPlus className="h-3.5 w-3.5" />
            </button>
          </div>

          {showNewFolder && (
            <div className="mx-3 mb-2 flex gap-1">
              <input className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-xs focus:border-orange-400 focus:outline-none"
                placeholder="Folder name"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') createFolder(); if (e.key === 'Escape') setShowNewFolder(false); }}
                autoFocus />
              <button onClick={createFolder}
                className="rounded-lg bg-orange-600 px-2 text-xs font-bold text-white hover:bg-orange-700">✓</button>
            </div>
          )}

          <button onClick={() => setActiveFolderId(null)}
            className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors ${activeFolderId === null ? 'bg-orange-50 font-semibold text-orange-700' : 'text-gray-600 hover:bg-gray-100'}`}>
            <Folder className="h-4 w-4" /> All Media
          </button>
          {folders.map(f => (
            <button key={f.id} onClick={() => setActiveFolderId(f.id)}
              className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors ${activeFolderId === f.id ? 'bg-orange-50 font-semibold text-orange-700' : 'text-gray-600 hover:bg-gray-100'}`}>
              <Folder className="h-4 w-4" /> {f.name}
            </button>
          ))}
        </div>

        {/* Main content area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center gap-3 border-b px-5 py-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input className="input w-full pl-9 text-sm" placeholder="Search files…"
                value={search} onChange={e => setSearch(e.target.value)} />
              {search && (
                <button onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="flex rounded-xl border border-gray-200 overflow-hidden">
              <button onClick={() => setGridMode('grid')}
                className={`p-2.5 transition-colors ${gridMode === 'grid' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                <Grid className="h-4 w-4" />
              </button>
              <button onClick={() => setGridMode('list')}
                className={`p-2.5 transition-colors ${gridMode === 'list' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                <ListIcon className="h-4 w-4" />
              </button>
            </div>
            {selected.size > 0 && (
              <button onClick={() => setSelected(new Set())} className="text-xs text-gray-500 hover:underline">
                Clear ({selected.size})
              </button>
            )}
          </div>

          {/* Breadcrumb */}
          <div className="flex items-center gap-1 border-b bg-gray-50/50 px-5 py-2 text-xs text-gray-500">
            <button onClick={() => setActiveFolderId(null)} className="hover:text-orange-600">Media</button>
            {activeFolder && (
              <>
                <span>/</span>
                <span className="font-semibold text-gray-700">{activeFolder.name}</span>
              </>
            )}
          </div>

          {/* Files */}
          <div className="flex-1 overflow-y-auto p-5">
            {loading ? (
              <div className="grid grid-cols-5 gap-3">
                {Array.from({ length: 15 }).map((_, i) => (
                  <div key={i} className="aspect-square animate-pulse rounded-xl bg-gray-100" />
                ))}
              </div>
            ) : media.length === 0 ? (
              <label className="flex h-full min-h-48 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-orange-400 hover:text-orange-500 transition-colors">
                <input type="file" accept="image/*,application/pdf" multiple className="sr-only"
                  onChange={e => handleUpload(e.target.files)} />
                <Upload className="h-10 w-10" />
                <div className="text-center">
                  <p className="text-sm font-medium">Drop files here or click to upload</p>
                  <p className="text-xs text-gray-400">Images, PDFs, documents</p>
                </div>
              </label>
            ) : gridMode === 'grid' ? (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                {media.map(m => {
                  const isSel = selected.has(m.id);
                  const isImage = m.mime_type?.startsWith('image/');
                  return (
                    <div key={m.id}
                      className={`group relative aspect-square cursor-pointer overflow-hidden rounded-xl border-2 transition-all ${
                        isSel ? 'border-orange-500 shadow-lg shadow-orange-100' : 'border-transparent hover:border-gray-300'
                      }`}
                      onClick={() => {
                        const n = new Set(selected);
                        isSel ? n.delete(m.id) : n.add(m.id);
                        setSelected(n);
                      }}
                    >
                      {isImage ? (
                        <img src={m.file_url} alt={m.alt_text || m.filename}
                          className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gray-100 text-4xl">
                          {m.mime_type?.includes('pdf') ? '📄' : '📎'}
                        </div>
                      )}
                      {isSel && (
                        <div className="absolute inset-0 flex items-center justify-center bg-orange-500/20">
                          <div className="rounded-full bg-orange-500 p-1">
                            <Check className="h-4 w-4 text-white" />
                          </div>
                        </div>
                      )}
                      {/* Hover overlay */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="truncate text-[10px] text-white">{m.filename}</p>
                        <div className="mt-0.5 flex gap-1">
                          <button onClick={e => { e.stopPropagation(); copyUrl(m.file_url, m.id); }}
                            className="rounded bg-white/20 p-0.5 hover:bg-white/40">
                            {copied === m.id ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3 text-white" />}
                          </button>
                          <button onClick={e => { e.stopPropagation(); downloadSeoImage(m.file_url, m.filename); }}
                            title="Download file"
                            className="rounded bg-white/20 p-0.5 hover:bg-white/40">
                            <Download className="h-3 w-3 text-white" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* List mode */
              <div className="overflow-hidden rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="border-b bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <input type="checkbox" className="rounded border-gray-300"
                          checked={selected.size === media.length}
                          onChange={e => setSelected(e.target.checked ? new Set(media.map(m => m.id)) : new Set())} />
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">File</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Type</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Size</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Date</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {media.map(m => (
                      <tr key={m.id} className="group hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <input type="checkbox" className="rounded border-gray-300"
                            checked={selected.has(m.id)}
                            onChange={() => {
                              const n = new Set(selected);
                              n.has(m.id) ? n.delete(m.id) : n.add(m.id);
                              setSelected(n);
                            }} />
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-3">
                            {m.mime_type?.startsWith('image/') ? (
                              <img src={m.file_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-xl">📎</div>
                            )}
                            <div>
                              <p className="font-medium text-gray-900 truncate max-w-xs">{m.filename}</p>
                              {m.alt_text && <p className="text-xs text-gray-400">{m.alt_text}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-500">{m.mime_type ?? '—'}</td>
                        <td className="px-3 py-3 text-xs text-gray-500 tabular-nums">{formatBytes(m.size_bytes)}</td>
                        <td className="px-3 py-3 text-xs text-gray-400">{new Date(m.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => copyUrl(m.file_url, m.id)}
                              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                              {copied === m.id ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                            </button>
                            <button onClick={() => downloadSeoImage(m.file_url, m.filename)}
                              title="Download file"
                              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                              <Download className="h-4 w-4" />
                            </button>
                            <button onClick={async () => {
                              if (!confirm('Delete this file?')) return;
                              await supabase.from('cswo_media').delete().eq('id', m.id);
                              loadMedia();
                            }}
                              className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600">
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
          </div>
        </div>
      </div>
    </div>
  );
}
