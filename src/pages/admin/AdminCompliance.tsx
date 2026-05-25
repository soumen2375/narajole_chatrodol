import { useCallback, useEffect, useRef, useState } from 'react';
import { FaUpload, FaTrash, FaFileLines, FaArrowUpRightFromSquare } from 'react-icons/fa6';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { CswoCompliance, CswoDocument } from '@/types';
import { useFmt } from '@/lib/format';
import { useT } from '@/i18n';
import { TableSkeleton } from '@/components/ui/Skeleton';

const INK = '#1c1917';
const INK2 = '#44403c';
const MUTED = '#78716c';
const RULE = '#e7e5e4';
const BRAND = '#c2410c';
const GREEN = '#4d7c0f';
const AMBER = '#b45309';
const PAPER = '#ffffff';
const CREAM = '#faf6ef';

const DOC_CATS = ['certificate', 'audit', 'bank', 'contract', 'general'];

type EditRow = { reg_number: string; issued_on: string; expiry_on: string; note: string };

export default function AdminCompliance() {
  const { member: me } = useAuth();
  const { lang } = useT();
  const fmt = useFmt();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);

  const [items, setItems] = useState<CswoCompliance[]>([]);
  const [docs, setDocs] = useState<CswoDocument[]>([]);
  const [edits, setEdits] = useState<Record<string, EditRow>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [docTitle, setDocTitle] = useState('');
  const [docCat, setDocCat] = useState('certificate');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [cR, dR] = await Promise.all([
      supabase.from('cswo_compliance').select('*').order('sort_order'),
      supabase.from('cswo_documents').select('*').order('created_at', { ascending: false }),
    ]);
    const its = (cR.data ?? []) as CswoCompliance[];
    setItems(its);
    setDocs((dR.data ?? []) as CswoDocument[]);
    const e: Record<string, EditRow> = {};
    for (const it of its) e[it.id] = { reg_number: it.reg_number, issued_on: it.issued_on ?? '', expiry_on: it.expiry_on ?? '', note: it.note };
    setEdits(e);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const saveItem = async (it: CswoCompliance) => {
    const e = edits[it.id];
    setSavingId(it.id);
    await supabase.from('cswo_compliance').update({
      reg_number: e.reg_number.trim(),
      issued_on: e.issued_on || null,
      expiry_on: e.expiry_on || null,
      note: e.note.trim(),
      updated_at: new Date().toISOString(),
    }).eq('id', it.id);
    setSavingId(null);
    setMsg(`${tr('Saved', 'সংরক্ষিত')}: ${lang === 'bn' ? it.name_bn : it.name_en}`);
    setTimeout(() => setMsg(null), 2500);
    await load();
  };

  const statusOf = (expiry: string) => {
    if (!expiry) return { label: tr('On record', 'নথিভুক্ত'), color: GREEN };
    const days = Math.ceil((new Date(expiry).getTime() - Date.now()) / 86400000);
    if (days < 0) return { label: tr('Expired', 'মেয়াদোত্তীর্ণ'), color: BRAND };
    if (days <= 30) return { label: tr(`Expiring · ${days}d`, `মেয়াদ ${fmt.num(days)} দিন`), color: AMBER };
    return { label: tr('Valid', 'বৈধ'), color: GREEN };
  };

  const upload = async (file: File) => {
    if (!docTitle.trim()) { setMsg(tr('Enter a document title first.', 'আগে নথির শিরোনাম দিন।')); return; }
    setUploading(true);
    const ext = file.name.split('.').pop() ?? 'pdf';
    const path = `compliance-docs/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { data, error } = await supabase.storage.from('cswo-media').upload(path, file);
    if (error) { setMsg(tr('Upload failed: ', 'আপলোড ব্যর্থ: ') + error.message); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('cswo-media').getPublicUrl(data.path);
    await supabase.from('cswo_documents').insert({ title: docTitle.trim(), category: docCat, file_url: publicUrl, file_type: file.type, uploaded_by: me?.id });
    setDocTitle('');
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
    await load();
  };

  const removeDoc = async (id: string) => {
    if (!window.confirm(tr('Delete this document?', 'এই নথি মুছবেন?'))) return;
    await supabase.from('cswo_documents').delete().eq('id', id);
    await load();
  };

  if (loading) return <TableSkeleton rows={6} />;

  return (
    <div className="space-y-6">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: MUTED }}>{tr('Governance', 'সুশাসন')} · {tr('Compliance', 'সম্মতি')}</div>
        <h1 className="mt-1.5 text-[28px] leading-tight" style={{ color: INK, fontFamily: '"Noto Serif Bengali", serif' }}>{tr('Compliance & Documents', 'বাধ্যবাধকতা ও নথি')}</h1>
        <p className="mt-1 text-[13.5px]" style={{ color: INK2 }}>{tr('Track statutory registrations and renewal dates, and keep certificates and audit files in one vault.', 'বিধিবদ্ধ রেজিস্ট্রেশন ও নবায়নের তারিখ ট্র্যাক করুন এবং সার্টিফিকেট ও অডিট ফাইল এক জায়গায় রাখুন।')}</p>
      </div>

      {msg && <div className="rounded-[6px] px-4 py-2.5 text-[13px]" style={{ background: 'rgba(77,124,15,0.1)', color: GREEN }}>{msg}</div>}

      {/* Compliance register */}
      <div className="overflow-x-auto rounded-[8px]" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
        <div className="px-5 pt-5"><div className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: MUTED }}>{tr('Statutory register', 'বিধিবদ্ধ নথি')}</div></div>
        <table className="mt-3 w-full text-[13px]">
          <thead><tr style={{ borderTop: `1px solid ${RULE}`, borderBottom: `1px solid ${RULE}` }}>
            {[tr('Item', 'বিষয়'), tr('Reg. number', 'রেজি. নম্বর'), tr('Issued', 'ইস্যু'), tr('Expiry', 'মেয়াদ'), tr('Status', 'অবস্থা'), ''].map((h, i) => (
              <th key={i} className="px-4 py-2.5 text-left font-mono text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: MUTED }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {items.map((it) => {
              const e = edits[it.id] ?? { reg_number: '', issued_on: '', expiry_on: '', note: '' };
              const st = statusOf(e.expiry_on);
              return (
                <tr key={it.id} style={{ borderBottom: `1px solid ${RULE}` }}>
                  <td className="px-4 py-3">
                    <div className="font-semibold" style={{ color: INK }}>{lang === 'bn' ? it.name_bn : it.name_en}</div>
                    <div className="font-mono text-[10px]" style={{ color: MUTED }}>{it.authority}</div>
                  </td>
                  <td className="px-4 py-3"><input value={e.reg_number} onChange={(ev) => setEdits((m) => ({ ...m, [it.id]: { ...e, reg_number: ev.target.value } }))} placeholder="—" className="w-36 rounded-[5px] px-2 py-1 text-[12.5px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK }} /></td>
                  <td className="px-4 py-3"><input type="date" value={e.issued_on} onChange={(ev) => setEdits((m) => ({ ...m, [it.id]: { ...e, issued_on: ev.target.value } }))} className="rounded-[5px] px-2 py-1 text-[12.5px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK2 }} /></td>
                  <td className="px-4 py-3"><input type="date" value={e.expiry_on} onChange={(ev) => setEdits((m) => ({ ...m, [it.id]: { ...e, expiry_on: ev.target.value } }))} className="rounded-[5px] px-2 py-1 text-[12.5px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK2 }} /></td>
                  <td className="px-4 py-3"><span className="inline-flex items-center gap-1.5 text-[12px] font-medium" style={{ color: st.color }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: st.color }} />{st.label}</span></td>
                  <td className="px-4 py-3 text-right"><button onClick={() => saveItem(it)} disabled={savingId === it.id} className="rounded-full px-3 py-1 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50" style={{ background: BRAND }}>{savingId === it.id ? '…' : tr('Save', 'সংরক্ষণ')}</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Document vault */}
      <div className="rounded-[8px] p-5" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
        <div className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: MUTED }}>{tr('Document vault', 'নথি ভল্ট')}</div>
        <h3 className="mt-1.5 text-[18px]" style={{ color: INK, fontFamily: '"Noto Serif Bengali", serif' }}>{tr('Certificates, audits & files', 'সার্টিফিকেট, অডিট ও ফাইল')}</h3>

        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <input value={docTitle} onChange={(e) => setDocTitle(e.target.value)} placeholder={tr('Document title…', 'নথির শিরোনাম…')} className="min-w-[200px] flex-1 rounded-[6px] px-3 py-2 text-[13px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK }} />
          <select value={docCat} onChange={(e) => setDocCat(e.target.value)} className="rounded-[6px] px-3 py-2 text-[13px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK2 }}>
            {DOC_CATS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
          <button onClick={() => fileRef.current?.click()} disabled={uploading} className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60" style={{ background: BRAND }}>
            <FaUpload className="h-3 w-3" /> {uploading ? tr('Uploading…', 'আপলোড…') : tr('Upload', 'আপলোড')}
          </button>
        </div>

        <div className="mt-4 divide-y" style={{ borderColor: RULE }}>
          {docs.length === 0 ? (
            <div className="py-8 text-center text-[13px]" style={{ color: MUTED }}>{tr('No documents yet.', 'এখনো কোনো নথি নেই।')}</div>
          ) : docs.map((d) => (
            <div key={d.id} className="flex items-center gap-3 py-2.5" style={{ borderTop: `1px solid ${RULE}` }}>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: CREAM }}><FaFileLines className="h-3.5 w-3.5" style={{ color: BRAND }} /></span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-medium" style={{ color: INK }}>{d.title}</div>
                <div className="font-mono text-[10px] uppercase tracking-[0.12em]" style={{ color: MUTED }}>{d.category} · {fmt.date(d.created_at)}</div>
              </div>
              <a href={d.file_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[12px] font-semibold" style={{ color: BRAND }}>{tr('Open', 'খুলুন')} <FaArrowUpRightFromSquare className="h-2.5 w-2.5" /></a>
              <button onClick={() => removeDoc(d.id)} className="rounded-full p-1.5 transition-colors hover:bg-black/5" style={{ color: MUTED }}><FaTrash className="h-3 w-3" /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
