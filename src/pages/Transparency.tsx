import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useT } from '@/i18n';
import { useFmt } from '@/lib/format';
import { PageShell, PageHero, SectionHeader, GetInvolvedSection, SERIF_BN, FJ } from './_field-journal';

interface PublicFinance {
  generated_at: string;
  totals: { income: number; expense: number; balance: number };
  by_type: Record<string, number>;
  funds: { name_bn: string; name_en: string; income: number; expense: number; balance: number }[];
  years: { fy: string; income: number; expense: number }[];
  campaigns: { name_bn: string; name_en: string; goal: number; raised: number }[];
  donations_count: number;
  members_count: number;
}

export default function Transparency() {
  const { lang } = useT();
  const fmt = useFmt();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);
  const [data, setData] = useState<PublicFinance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.rpc('cswo_public_finance').then(({ data }) => {
      setData((data ?? null) as PublicFinance | null);
      setLoading(false);
    });
  }, []);

  const typeLabel = (t: string) =>
    t === 'donation' ? tr('Donations', 'অনুদান') : t === 'contribution' ? tr('Member contributions', 'সদস্য চাঁদা') : t === 'grant' ? tr('Grants', 'অনুদান-তহবিল') : t === 'expense' ? tr('Programme expenses', 'কর্মসূচি ব্যয়') : t === 'payroll' ? tr('Honorariums', 'সম্মানী') : tr('Adjustments', 'সমন্বয়');

  const maxYear = data ? Math.max(1, ...data.years.flatMap((y) => [Number(y.income), Number(y.expense)])) : 1;

  return (
    <PageShell>
      <PageHero
        title={tr('Transparency', 'স্বচ্ছতা')}
        lede={tr(
          'We believe every rupee entrusted to us should be accountable. Here is a live, plain summary of what we receive and how we spend it.',
          'আমাদের উপর অর্পিত প্রতিটি টাকার জবাবদিহি থাকা উচিত বলে আমরা বিশ্বাস করি। আমরা কী পাই এবং কীভাবে ব্যয় করি তার একটি সরাসরি, সরল সারসংক্ষেপ এখানে।',
        )}
      />

      <div className="mx-auto max-w-[1320px] px-6 pb-20 md:px-10">
        {loading ? (
          <div className="py-20 text-center" style={{ color: FJ.muted }}>{tr('Loading…', 'লোড হচ্ছে…')}</div>
        ) : !data ? (
          <div className="py-20 text-center" style={{ color: FJ.muted }}>{tr('Summary unavailable right now.', 'সারসংক্ষেপ এখন উপলব্ধ নয়।')}</div>
        ) : (
          <>
            {/* Headline numbers */}
            <div className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-2 lg:grid-cols-4">
              <Big label={tr('Total received', 'মোট প্রাপ্তি')} value={fmt.money(Number(data.totals.income))} accent={FJ.brand} />
              <Big label={tr('Total spent', 'মোট ব্যয়')} value={fmt.money(Number(data.totals.expense))} accent={FJ.accent} />
              <Big label={tr('Current balance', 'বর্তমান ব্যালেন্স')} value={fmt.money(Number(data.totals.balance))} accent="#4d7c0f" />
              <Big label={tr('Supporters', 'সমর্থক')} value={`${fmt.num(data.donations_count)} · ${fmt.num(data.members_count)}`} sub={tr('donations · members', 'অনুদান · সদস্য')} accent={FJ.ink} />
            </div>

            {/* Income vs expense by type */}
            <div className="mt-16 grid grid-cols-1 gap-10 lg:grid-cols-2">
              <div>
                <SectionHeader title={tr('Where it comes from', 'কোথা থেকে আসে')} />
                <Breakdown
                  rows={Object.entries(data.by_type).filter(([k]) => k === 'donation' || k === 'contribution' || k === 'grant').map(([k, v]) => ({ label: typeLabel(k), value: Number(v) }))}
                  total={Number(data.totals.income)} color={FJ.brand} fmt={fmt} empty={tr('No income recorded yet.', 'এখনো কোনো আয় নথিভুক্ত হয়নি।')}
                />
              </div>
              <div>
                <SectionHeader title={tr('Where it goes', 'কোথায় যায়')} />
                <Breakdown
                  rows={Object.entries(data.by_type).filter(([k]) => k === 'expense' || k === 'payroll').map(([k, v]) => ({ label: typeLabel(k), value: Number(v) }))}
                  total={Number(data.totals.expense)} color={FJ.accent} fmt={fmt} empty={tr('No spending recorded yet.', 'এখনো কোনো ব্যয় নথিভুক্ত হয়নি।')}
                />
              </div>
            </div>

            {/* Fund-wise */}
            {data.funds.length > 0 && (
              <div className="mt-16">
                <SectionHeader title={tr('By focus area', 'ক্ষেত্র অনুযায়ী')} kicker={tr('How funds are allocated across our work', 'আমাদের কাজে তহবিল কীভাবে বণ্টিত হয়')} />
                <div className="mt-6 overflow-x-auto rounded-[10px]" style={{ background: FJ.paper, border: `1px solid ${FJ.rule}` }}>
                  <table className="w-full text-[14px]">
                    <thead><tr style={{ borderBottom: `1px solid ${FJ.rule}` }}>
                      {[tr('Focus area', 'ক্ষেত্র'), tr('Received', 'প্রাপ্তি'), tr('Spent', 'ব্যয়'), tr('Balance', 'ব্যালেন্স')].map((h, i) => (
                        <th key={i} className={`px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] ${i === 0 ? 'text-left' : 'text-right'}`} style={{ color: FJ.muted }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {data.funds.map((f) => (
                        <tr key={f.name_en} style={{ borderBottom: `1px solid ${FJ.rule}` }}>
                          <td className="px-5 py-3 font-medium" style={{ color: FJ.ink }}>{lang === 'bn' ? f.name_bn : f.name_en}</td>
                          <td className="px-5 py-3 text-right" style={{ color: '#4d7c0f' }}>{fmt.money(Number(f.income))}</td>
                          <td className="px-5 py-3 text-right" style={{ color: FJ.brand }}>{fmt.money(Number(f.expense))}</td>
                          <td className="px-5 py-3 text-right font-semibold" style={{ color: FJ.ink }}>{fmt.money(Number(f.balance))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Year trend */}
            {data.years.length > 0 && (
              <div className="mt-16">
                <SectionHeader title={tr('Year by year', 'বছরভিত্তিক')} kicker={tr('Income and spending per financial year', 'প্রতি অর্থবছরে আয় ও ব্যয়')} />
                <div className="mt-6 space-y-5">
                  {data.years.map((y) => (
                    <div key={y.fy}>
                      <div className="mb-1.5 flex items-center justify-between text-[13px]">
                        <span className="font-semibold" style={{ color: FJ.ink }}>{tr('FY', 'অর্থবছর')} {y.fy}</span>
                        <span style={{ color: FJ.muted }}>{tr('In', 'আয়')} {fmt.money(Number(y.income))} · {tr('Out', 'ব্যয়')} {fmt.money(Number(y.expense))}</span>
                      </div>
                      <div className="flex gap-1.5">
                        <div className="h-3 rounded-full" style={{ width: `${(Number(y.income) / maxYear) * 100}%`, background: '#4d7c0f', minWidth: 2 }} />
                      </div>
                      <div className="mt-1 flex gap-1.5">
                        <div className="h-3 rounded-full" style={{ width: `${(Number(y.expense) / maxYear) * 100}%`, background: FJ.brand, minWidth: 2 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active campaigns */}
            {data.campaigns.length > 0 && (
              <div className="mt-16">
                <SectionHeader title={tr('Active campaigns', 'চলমান ক্যাম্পেইন')} />
                <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
                  {data.campaigns.map((c) => {
                    const goal = Number(c.goal) || 0;
                    const raised = Number(c.raised) || 0;
                    const pct = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;
                    return (
                      <div key={c.name_en} className="rounded-[10px] p-5" style={{ background: FJ.paper, border: `1px solid ${FJ.rule}` }}>
                        <div className="text-[16px] font-semibold" style={{ ...SERIF_BN, color: FJ.ink }}>{lang === 'bn' ? c.name_bn : c.name_en}</div>
                        <div className="mt-2 flex items-end justify-between">
                          <span className="text-[18px] font-bold" style={{ color: '#4d7c0f' }}>{fmt.money(raised)}</span>
                          <span className="text-[12px]" style={{ color: FJ.muted }}>{tr('goal', 'লক্ষ্য')} {fmt.money(goal)}</span>
                        </div>
                        <div className="mt-2 h-2 w-full overflow-hidden rounded-full" style={{ background: FJ.bg }}>
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: FJ.brand }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <p className="mt-14 text-center text-[12px]" style={{ color: FJ.muted }}>
              {tr('Figures are generated live from our books and may differ slightly from audited statements.', 'পরিসংখ্যান আমাদের হিসাব থেকে সরাসরি তৈরি এবং নিরীক্ষিত বিবরণী থেকে সামান্য ভিন্ন হতে পারে।')}
              {' · '}{tr('Updated', 'হালনাগাদ')} {fmt.date(data.generated_at)}
            </p>
          </>
        )}
      </div>

      <GetInvolvedSection />
    </PageShell>
  );
}

function Big({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent: string }) {
  return (
    <div className="rounded-[10px] p-5" style={{ background: FJ.paper, border: `1px solid ${FJ.rule}` }}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: FJ.muted }}>{label}</div>
      <div className="mt-2 text-[26px] font-extrabold leading-tight" style={{ color: accent }}>{value}</div>
      {sub && <div className="mt-0.5 text-[11px]" style={{ color: FJ.muted }}>{sub}</div>}
    </div>
  );
}

function Breakdown({ rows, total, color, fmt, empty }: { rows: { label: string; value: number }[]; total: number; color: string; fmt: ReturnType<typeof useFmt>; empty: string }) {
  if (rows.length === 0 || total <= 0) return <p className="mt-5 text-[14px]" style={{ color: FJ.muted }}>{empty}</p>;
  return (
    <div className="mt-5 space-y-4">
      {rows.map((r) => {
        const pct = total > 0 ? Math.round((r.value / total) * 100) : 0;
        return (
          <div key={r.label}>
            <div className="mb-1 flex items-center justify-between text-[14px]">
              <span style={{ color: FJ.ink2 }}>{r.label}</span>
              <span className="font-semibold" style={{ color: FJ.ink }}>{fmt.money(r.value)} <span style={{ color: FJ.muted }}>· {fmt.num(pct)}%</span></span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full" style={{ background: FJ.bg }}>
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
