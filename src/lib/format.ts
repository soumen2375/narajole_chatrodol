const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

export function toBengaliDigits(value: string | number): string {
  return String(value).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]);
}

const BN_MONTHS = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর',
];

export const MONTH_NAMES_BN = BN_MONTHS;

export function formatDateBn(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return `${toBengaliDigits(d.getDate())} ${BN_MONTHS[d.getMonth()]}, ${toBengaliDigits(d.getFullYear())}`;
}

export function excerpt(text: string, length = 140): string {
  const clean = text.replace(/\n+/g, ' ').trim();
  return clean.length > length ? `${clean.slice(0, length)}…` : clean;
}

export function formatCurrency(amount: number): string {
  return `₹${toBengaliDigits(amount.toLocaleString('en-IN'))}`;
}
