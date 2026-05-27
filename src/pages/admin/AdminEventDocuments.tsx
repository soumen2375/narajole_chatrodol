import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaUpload, FaTrash, FaFileLines, FaArrowUpRightFromSquare } from 'react-icons/fa6';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { CswoEvent, CswoEventDocument } from '@/types';
import { useFmt } from '@/lib/format';
import { useT } from '@/i18n';
import { TableSkeleton } from '@/components/ui/Skeleton';

const TEAL = '#0c756f';
const INK = '#1c1917';
const INK2 = '#44403c';
const MUTED = '#78716c';
const RULE = '#e7e5e4';
const PAPER = '#ffffff';
const CREAM = '#faf8f5';

const CATEGORIES = ['permission', 'bill', 'report', 'photo', 'media', 'certificate', 'general'];

export default function AdminEventDocuments() {
  const { id = '' } = useParams();
  const { member } = useAuth();
  const navigate = useNavigate();
  const { lang } = useT();
  const fmt = useFmt();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);

  const [event, setEvent] = useState<CswoEvent | null>(null);
  const [docs, setDocs] = useState<CswoEventDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('permission');
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [evR, dR] = await Promise.all([
      supabase.from('cswo_events').select('*').eq('id', id).maybeSingle(),
      supabase.from('cswo_event_documents').select('*').eq('event_id', id).order('created_at', { ascending: false }),
    ]);
    setEvent((evR.data ?? null) as CswoEvent | null);
    setDocs((dR.data ?? []) as CswoEventDocument[]);
    setLoading(false);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const upload = async (file: File) => {
    if (!title.trim()) { setMsg(tr('Enter a document title first.', 'আগে নথির শিরোনাম দিন।')); return; }
    setUploading(true); setMsg('');
    const ext = file.name.split('.').pop() ?? 'pdf';
    const path = `event-docs/${id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { data, error } = await supabase.storage.from('cswo-media').upload(path, file);
    if (error) { setMsg(tr('Upload failed: ', 'আপলোড ব্যর্থ: ') + error.message); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('cswo-media').getPublicUrl(data.path);
    await supabase.from('cswo_event_documents').insert({ event_id: id, title: title.trim(), category, file_url: publicUrl, file_type: file.type, uploaded_by: member?.id });
    setTitle('');
    if (fileRef.current) fileRef.current.value = '';
    setUploading(false);
    await load();
  };

  const remove = async (docId: string) => {
    if (!window.confirm(tr('Delete this document?', 'এই নথি মুছবেন?'))) return;
    await supabase.from('cswo_event_documents').delete().eq('id', docId);
    await load();
  };

  if (loading) return <TableSkeleton rows={5} />;
  if (!event) return (
    <div className="py-16 text-center">
      <p style={{ color: MUTED }}>{tr('Event not found.', 'অনুষ্ঠান পাওয়া যায়নি।')}</p>
      <button 
        onClick={() => navigate(-1)} 
        className="mt-3 inline-flex items-center gap-1.5 font-semibold bg-transparent border-0 p-0 cursor-pointer" 
        style={{ color: TEAL }}
      >
        <ArrowLeft className="h-4 w-4" /> {tr('Back', 'ফিরুন')}
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      <button 
        onClick={() => navigate(-1)} 
        className="inline-flex items-center gap-2 text-[13px] font-medium cursor-pointer bg-transparent border-0 p-0 hover:opacity-80" 
        style={{ color: MUTED }}
      >
        <ArrowLeft className="h-3.5 w-3.5" /> {tr('Back to event', 'অনুষ্ঠানে ফিরুন')}
      </button>

      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: TEAL }}>{tr('Documents', 'নথি')}</div>
        <h1 className="mt-1.5 text-[26px] leading-tight" style={{ color: INK, fontFamily: '"Noto Serif Bengali", serif' }}>{event.title}</h1>
        <p className="mt-1 text-[13px]" style={{ color: INK2 }}>{tr('Permissions, bills, reports, photos and media coverage for this event.', 'এই অনুষ্ঠানের অনুমতিপত্র, বিল, রিপোর্ট, ছবি ও মিডিয়া।')}</p>
      </div>

      {msg && <div className="rounded-[6px] px-4 py-2.5 text-[13px]" style={{ background: 'rgba(194,65,12,0.1)', color: '#c2410c' }}>{msg}</div>}

      <div className="rounded-[10px] p-5" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
        <div className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: MUTED }}>{tr('Upload document', 'নথি আপলোড')}</div>
        <div className="mt-3 flex flex-wrap items-center gap-2.5">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={tr('Document title…', 'নথির শিরোনাম…')} className="min-w-[200px] flex-1 rounded-[6px] px-3 py-2 text-[13px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK }} />
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-[6px] px-3 py-2 text-[13px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK2 }}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
          <button onClick={() => fileRef.current?.click()} disabled={uploading} className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60" style={{ background: TEAL }}>
            <FaUpload className="h-3 w-3" /> {uploading ? tr('Uploading…', 'আপলোড…') : tr('Upload', 'আপলোড')}
          </button>
        </div>
      </div>

      <div className="rounded-[10px] p-5" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
        <div className="divide-y" style={{ borderColor: RULE }}>
          {docs.length === 0 ? (
            <div className="py-10 text-center text-[13px]" style={{ color: MUTED }}>{tr('No documents yet.', 'এখনো কোনো নথি নেই।')}</div>
          ) : docs.map((d) => (
            <div key={d.id} className="flex items-center gap-3 py-2.5" style={{ borderTop: `1px solid ${RULE}` }}>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: CREAM }}><FaFileLines className="h-3.5 w-3.5" style={{ color: TEAL }} /></span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-medium" style={{ color: INK }}>{d.title}</div>
                <div className="font-mono text-[10px] uppercase tracking-[0.12em]" style={{ color: MUTED }}>{d.category} · {fmt.date(d.created_at)}</div>
              </div>
              <a href={d.file_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[12px] font-semibold" style={{ color: TEAL }}>{tr('Open', 'খুলুন')} <FaArrowUpRightFromSquare className="h-2.5 w-2.5" /></a>
              <button onClick={() => remove(d.id)} className="rounded-full p-1.5 transition-colors hover:bg-black/5" style={{ color: MUTED }}><FaTrash className="h-3 w-3" /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
