// ════════════════════════════════════════════════════════════════
//  Blood donor registry helpers
//  Donor rows are stored per camp (one row = one registration at one
//  event). These helpers fold those rows into one profile per person
//  — keyed by `donor_key` (aadhar → phone → name, generated in Postgres)
//  — and derive the 3-month eligibility rule from the camp dates.
// ════════════════════════════════════════════════════════════════

/** A donor must wait this long after giving blood before donating again. */
export const ELIGIBILITY_MONTHS = 3;

/** One donor row joined with its camp. */
export interface DonorRow {
  id: string;
  event_id: string;
  donor_code: string | null;
  name: string;
  age: number | null;
  gender: string;
  blood_group: string;
  phone: string;
  address: string;
  aadhar: string;
  donor_key: string;
  member_id: string | null;
  status: string;
  units: number;
  created_at: string;
  event?: { title: string; event_date: string } | null;
}

/** One camp a donor took part in. */
export interface DonorVisit {
  id: string;
  event_id: string;
  event_title: string;
  event_date: string;
  status: string;
  units: number;
  donor_code: string | null;
}

/** One person, folded across every camp they appear in. */
export interface DonorProfile {
  key: string;
  id: string;
  donor_code: string | null;
  name: string;
  age: number | null;
  gender: string;
  blood_group: string;
  phone: string;
  address: string;
  aadhar: string;
  /** Set when this donor is also a registered member. */
  member_id: string | null;
  /** Every camp they were registered at, newest first. */
  visits: DonorVisit[];
  /** Only the camps where they actually gave blood, newest first. */
  donations: DonorVisit[];
  donationCount: number;
  totalUnits: number;
  /** Date of their most recent donation, or null if they never donated. */
  lastDonation: string | null;
  /** The date they become eligible again, or null if already eligible. */
  nextEligible: string | null;
  /** True when they have not donated in the last 3 months. */
  eligible: boolean;
  /** Days still to wait; 0 when eligible. */
  daysToWait: number;
}

const dayMs = 86_400_000;

/**
 * Local YYYY-MM-DD. Never use toISOString() here — in IST (+5:30) it converts
 * local midnight back to the previous day and every date lands 24h early.
 */
function toISODate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Add calendar months to an ISO date, clamping to the end of the month. */
export function addMonths(iso: string, months: number): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
  return toISODate(d);
}

function today(): string {
  return toISODate(new Date());
}

/** Whole days between two ISO dates (b − a); negative when b is in the past. */
export function daysBetween(a: string, b: string): number {
  const ms = new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime();
  return Math.ceil(ms / dayMs);
}

/**
 * Eligibility as of `asOf` (defaults to today) for someone whose last
 * donation was `lastDonation`. A donor with no recorded donation is eligible.
 */
export function eligibilityFrom(lastDonation: string | null, asOf: string = today()) {
  if (!lastDonation) return { eligible: true, nextEligible: null, daysToWait: 0 };
  const nextEligible = addMonths(lastDonation, ELIGIBILITY_MONTHS);
  const daysToWait = Math.max(0, daysBetween(asOf, nextEligible));
  return { eligible: daysToWait === 0, nextEligible: daysToWait === 0 ? null : nextEligible, daysToWait };
}

/** Mask an Aadhar number for member-facing views: XXXX XXXX 1234. */
export function maskAadhar(aadhar: string): string {
  const digits = (aadhar ?? '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length <= 4) return digits;
  return `XXXX XXXX ${digits.slice(-4)}`;
}

/** Group Aadhar digits for display: 1234 5678 9012. */
export function formatAadhar(aadhar: string): string {
  const digits = (aadhar ?? '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

/**
 * Compute a stable, unique identity key for one donor row.
 *
 * Priority — strictly in this order:
 *   1. Aadhar No  — must be exactly 12 digits (partial Aadhar is ignored
 *                   to avoid accidentally merging two different people).
 *   2. Mobile No + Name  — phone alone is NOT enough because family members
 *                   (e.g. husband and wife) often share one mobile number.
 *                   Combining phone+name means two people with the same
 *                   mobile but different names stay as separate profiles,
 *                   while the SAME person re-registering at a future camp
 *                   (same phone + same name) still merges correctly.
 *   3. Full name  — lowercase + trimmed (last resort; used only when the
 *                   donor has neither Aadhar nor a mobile number).
 */
export function donorUniqueKey(r: Pick<DonorRow, 'aadhar' | 'phone' | 'name' | 'id'>): string {
  // 1. Aadhar No (most reliable — government-issued, globally unique)
  const aadharDigits = (r.aadhar ?? '').replace(/\D/g, '');
  if (aadharDigits.length === 12) return `aadhar:${aadharDigits}`;

  // 2. Mobile No + Name  (phone acts as namespace; name disambiguates family members)
  const phoneDigits = (r.phone ?? '').replace(/\D/g, '');
  const nameLower   = (r.name  ?? '').trim().toLowerCase();
  if (phoneDigits.length >= 8 && nameLower) return `phone:${phoneDigits}:${nameLower}`;
  if (phoneDigits.length >= 8)              return `phone:${phoneDigits}`;

  // 3. Name alone
  if (nameLower) return `name:${nameLower}`;

  return `id:${r.id}`;
}

/**
 * Fold per-camp donor rows into one profile per person. Identity details
 * (name, phone, group…) come from the most recent row that has them.
 *
 * Unique identity is determined by `donorUniqueKey()`:
 *   • 12-digit Aadhar  (primary — most reliable)
 *   • Mobile number    (fallback when no Aadhar)
 *   • Lowercase name   (last resort)
 */
export function buildDonorProfiles(rows: DonorRow[], asOf: string = today()): DonorProfile[] {
  const byKey = new Map<string, DonorRow[]>();
  for (const r of rows) {
    const key = donorUniqueKey(r);
    const list = byKey.get(key);
    if (list) list.push(r); else byKey.set(key, [r]);
  }

  const profiles: DonorProfile[] = [];
  for (const [key, list] of byKey) {
    const visits: DonorVisit[] = list
      .map((r) => ({
        id: r.id,
        event_id: r.event_id,
        event_title: r.event?.title?.trim() || '',
        event_date: r.event?.event_date ?? '',
        status: r.status,
        units: Number(r.units) || 0,
        donor_code: r.donor_code,
      }))
      .sort((a, b) => (b.event_date || '').localeCompare(a.event_date || ''));

    // Newest camp first, so the first row carrying a value wins.
    const ordered = [...list].sort((a, b) => {
      const ad = a.event?.event_date ?? a.created_at;
      const bd = b.event?.event_date ?? b.created_at;
      return (bd || '').localeCompare(ad || '');
    });
    const pick = <K extends keyof DonorRow>(field: K): DonorRow[K] =>
      (ordered.find((r) => r[field] !== null && r[field] !== '' && r[field] !== undefined)?.[field]
        ?? ordered[0][field]);

    const donations = visits.filter((v) => v.status === 'donated');
    const lastDonation = donations.find((v) => v.event_date)?.event_date ?? null;
    const { eligible, nextEligible, daysToWait } = eligibilityFrom(lastDonation, asOf);

    profiles.push({
      key,
      id: ordered[0].id,
      donor_code: pick('donor_code'),
      name: pick('name'),
      age: pick('age'),
      gender: pick('gender'),
      blood_group: pick('blood_group'),
      phone: pick('phone'),
      address: pick('address'),
      // For Aadhar: prefer the row that has a valid full 12-digit Aadhar
      aadhar: (
        ordered.find((r) => (r.aadhar ?? '').replace(/\D/g, '').length === 12)?.aadhar
        ?? pick('aadhar')
        ?? ''
      ),
      // For member_id: any row carrying a non-null member_id wins.
      member_id: ordered.find((r) => r.member_id != null)?.member_id ?? null,
      visits,
      donations,
      donationCount: donations.length,
      totalUnits: donations.reduce((s, v) => s + v.units, 0),
      lastDonation,
      nextEligible,
      eligible,
      daysToWait,
    });
  }

  return profiles.sort((a, b) => a.name.localeCompare(b.name));
}

/** The columns every donor view needs, plus the camp it belongs to. */
export const DONOR_SELECT =
  'id, event_id, donor_code, name, age, gender, blood_group, phone, address, aadhar, donor_key, member_id, status, units, created_at, event:cswo_events!event_id(title, event_date)';

/** Supabase returns the embedded event as an array on some queries. */
export function normalizeDonorRows(data: unknown): DonorRow[] {
  return ((data ?? []) as Array<Omit<DonorRow, 'event'> & { event: DonorRow['event'] | DonorRow['event'][] }>)
    .map((r) => ({ ...r, event: Array.isArray(r.event) ? (r.event[0] ?? null) : r.event }));
}
