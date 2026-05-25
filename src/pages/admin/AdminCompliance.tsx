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

  // Expose the RLS safeguard check immediately for Treasurer/Non-Admin lock
  if (me?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-[10px] border shadow-sm bg-white" style={{ borderColor: RULE }}>
        <span className="text-[44px]">🚫</span>
        <h2 className="mt-4 text-[20px] font-bold text-red-700" style={{ fontFamily: '"Noto Serif Bengali", serif' }}>
          {tr('Access Denied / Admins Only', 'প্রবেশাধিকার বঞ্চিত / শুধুমাত্র এডমিন')}
        </h2>
        <p className="mt-2 text-[14px] max-w-md text-stone-600">
          {tr(
            'You do not have the required administrative permissions to access the compliance document vault. This area is reserved strictly for organization administrators.',
            'আপনার কমপ্লায়েন্স ডকুমেন্ট ভল্ট অ্যাক্সেস করার প্রয়োজনীয় প্রশাসনিক অনুমতি নেই। এই বিভাগটি কঠোরভাবে সংগঠনের প্রশাসকদের জন্য সংরক্ষিত।'
          )}
        </p>
      </div>
    );
  }

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

  // Register Custom Document Modal States
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [regTitle, setRegTitle] = useState('');
  const [regAuthority, setRegAuthority] = useState('');
  const [regNum, setRegNum] = useState('');
  const [regIssued, setRegIssued] = useState('');
  const [regExpiry, setRegExpiry] = useState('');
  const [regNote, setRegNote] = useState('');
  const [regFile, setRegFile] = useState<File | null>(null);
  const [registering, setRegistering] = useState(false);

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
    if (days <= 30) return { label: tr(`Expires in ${days} days`, `মেয়াদ ${fmt.num(days)} দিন`), color: AMBER };
    return { label: tr('Valid', 'বৈধ'), color: GREEN };
  };

  const registerDocument = async () => {
    if (!regTitle.trim() || !regAuthority.trim()) {
      alert(tr('Name and Authority/Type are required.', 'নাম এবং কর্তৃপক্ষ/টাইপ আবশ্যক।'));
      return;
    }
    setRegistering(true);
    let publicUrl = '';
    let fileType = '';
    if (regFile) {
      const ext = regFile.name.split('.').pop() ?? 'pdf';
      const path = `compliance-docs/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { data, error } = await supabase.storage.from('cswo-media').upload(path, regFile);
      if (error) {
        alert(tr('Upload failed: ', 'আপলোড ব্যর্থ: ') + error.message);
        setRegistering(false);
        return;
      }
      const { data: { publicUrl: url } } = supabase.storage.from('cswo-media').getPublicUrl(data.path);
      publicUrl = url;
      fileType = regFile.type;
    }

    const { error } = await supabase.from('cswo_compliance').insert({
      ckey: 'custom-' + Date.now(),
      name_en: regTitle.trim(),
      name_bn: regTitle.trim(),
      authority: regAuthority.trim(),
      reg_number: regNum.trim(),
      issued_on: regIssued || null,
      expiry_on: regExpiry || null,
      note: regNote.trim(),
      file_url: publicUrl,
      file_type: fileType,
      sort_order: items.length + 1,
    });

    setRegistering(false);
    if (error) {
      alert(error.message);
      return;
    }
    setShowRegisterModal(false);
    setRegTitle(''); setRegAuthority(''); setRegNum(''); setRegIssued(''); setRegExpiry(''); setRegNote(''); setRegFile(null);
    await load();
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
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: MUTED }}>{tr('Governance', 'সুশাসন')} · {tr('Compliance', 'সম্মতি')}</div>
          <h1 className="mt-1.5 text-[28px] leading-tight" style={{ color: INK, fontFamily: '"Noto Serif Bengali", serif' }}>{tr('Compliance & Documents', 'বাধ্যবাধকতা ও নথি')}</h1>
          <p className="mt-1 text-[13.5px]" style={{ color: INK2 }}>{tr('Track statutory registrations and renewal dates, and keep certificates and audit files in one vault.', 'বিধিবদ্ধ রেজিস্ট্রেশন ও নবায়নের তারিখ ট্র্যাক করুন এবং সার্টিফিকেট ও অডিট ফাইল এক জায়গায় রাখুন।')}</p>
        </div>
        <button onClick={() => setShowRegisterModal(true)} className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90" style={{ background: BRAND }}>
          <span className="text-[15px] font-bold">+</span> {tr('Register Document', 'নথি রেজিস্টার')}
        </button>
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
                    <div className="font-semibold inline-flex items-center gap-1.5" style={{ color: INK }}>
                      <span>{lang === 'bn' ? it.name_bn : it.name_en}</span>
                      {it.file_url && (
                        <a href={it.file_url} target="_blank" rel="noreferrer" className="text-orange-700 hover:underline inline-flex items-center gap-0.5" title={tr('View Attachment', 'সংযুক্তি দেখুন')}>
                          <FaFileLines className="h-3.5 w-3.5 shrink-0" />
                        </a>
                      )}
                    </div>
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

      {/* Register Custom Document Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowRegisterModal(false)}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[10px] p-6 shadow-xl" style={{ background: PAPER }} onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-[18px] font-bold" style={{ color: INK, fontFamily: '"Noto Serif Bengali", serif' }}>{tr('Register Document', 'নথি রেজিস্টার')}</h2>
            
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input className="input sm:col-span-2" placeholder={tr('Document name (e.g. 80G Registration Renewal)', 'নথির নাম (যেমন 80G Registration Renewal)')} value={regTitle} onChange={(e) => setRegTitle(e.target.value)} />
              <input className="input" placeholder={tr('Authority / Type (e.g. 80G)', 'কর্তৃপক্ষ / ধরন (যেমন 80G)')} value={regAuthority} onChange={(e) => setRegAuthority(e.target.value)} />
              <input className="input" placeholder={tr('Registration number', 'রেজিস্ট্রেশন নম্বর')} value={regNum} onChange={(e) => setRegNum(e.target.value)} />
              
              <div className="flex flex-col gap-1 sm:col-span-1">
                <label className="text-[11px] font-semibold text-stone-500">{tr('Issue Date', 'ইস্যু তারিখ')}</label>
                <input className="input" type="date" value={regIssued} onChange={(e) => setRegIssued(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1 sm:col-span-1">
                <label className="text-[11px] font-semibold text-stone-500">{tr('Expiry Date', 'মেয়াদ উত্তীর্ণের তারিখ')}</label>
                <input className="input" type="date" value={regExpiry} onChange={(e) => setRegExpiry(e.target.value)} />
              </div>
              
              <div className="sm:col-span-2 flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-stone-500">{tr('Upload PDF / Attachment', 'PDF / সংযুক্তি আপলোড')}</label>
                <input className="input" type="file" accept="image/*,application/pdf" onChange={(e) => setRegFile(e.target.files?.[0] || null)} />
              </div>
              
              <textarea className="input resize-none sm:col-span-2" rows={2} placeholder={tr('Note', 'নোট')} value={regNote} onChange={(e) => setRegNote(e.target.value)} />
            </div>
            
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setShowRegisterModal(false)} className="rounded-full px-4 py-2 text-[13px] font-medium" style={{ border: `1px solid ${RULE}`, color: INK2 }}>{tr('Cancel', 'বাতিল')}</button>
              <button onClick={registerDocument} disabled={registering} className="rounded-full px-5 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60" style={{ background: BRAND }}>
                {registering ? tr('Registering…', 'রেজিস্টার হচ্ছে…') : tr('Register', 'রেজিস্টার')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
