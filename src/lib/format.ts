import { useT, type Lang } from '@/i18n';

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

export function toBengaliDigits(value: string | number): string {
  return String(value).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]);
}

export function digits(value: string | number, lang: Lang): string {
  return lang === 'bn' ? toBengaliDigits(value) : String(value);
}

const MONTHS: Record<Lang, string[]> = {
  bn: ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};

export function monthNames(lang: Lang): string[] {
  return MONTHS[lang];
}

export function formatDate(dateStr: string, lang: Lang): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return `${digits(d.getDate(), lang)} ${MONTHS[lang][d.getMonth()]}, ${digits(d.getFullYear(), lang)}`;
}

export function formatCurrency(amount: number, lang: Lang): string {
  return `₹${digits(amount.toLocaleString('en-IN'), lang)}`;
}

export function excerpt(text: string, length = 150): string {
  const clean = text.replace(/\n+/g, ' ').trim();
  return clean.length > length ? `${clean.slice(0, length)}…` : clean;
}

// Hook bound to the active language for convenient formatting in components.
export function useFmt() {
  const { lang } = useT();
  return {
    lang,
    num: (v: string | number) => digits(v, lang),
    date: (s: string) => formatDate(s, lang),
    money: (n: number) => formatCurrency(n, lang),
    months: () => monthNames(lang),
  };
}
