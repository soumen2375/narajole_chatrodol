import { useT } from '@/i18n';

const LABELS: Record<string, { bn: string; en: string; cls: string }> = {
  published: { bn: 'প্রকাশিত', en: 'Published', cls: 'bg-green-100 text-green-800' },
  pending: { bn: 'অপেক্ষমাণ', en: 'Pending', cls: 'bg-amber-100 text-amber-800' },
  draft: { bn: 'খসড়া', en: 'Draft', cls: 'bg-gray-100 text-gray-700' },
  rejected: { bn: 'প্রত্যাখ্যাত', en: 'Rejected', cls: 'bg-red-100 text-red-800' },
  approved: { bn: 'অনুমোদিত', en: 'Approved', cls: 'bg-green-100 text-green-800' },
  suspended: { bn: 'স্থগিত', en: 'Suspended', cls: 'bg-red-100 text-red-800' },
  paid: { bn: 'পরিশোধিত', en: 'Paid', cls: 'bg-green-100 text-green-800' },
  unpaid: { bn: 'বকেয়া', en: 'Unpaid', cls: 'bg-red-100 text-red-800' },
  created: { bn: 'পেমেন্ট চলছে', en: 'Awaiting Payment', cls: 'bg-amber-100 text-amber-800' },
  failed: { bn: 'ব্যর্থ', en: 'Failed', cls: 'bg-red-100 text-red-800' },
  refunded: { bn: 'ফেরত', en: 'Refunded', cls: 'bg-gray-100 text-gray-700' },
  cancelled: { bn: 'বাতিল', en: 'Cancelled', cls: 'bg-gray-100 text-gray-700' },
  expired: { bn: 'মেয়াদোত্তীর্ণ', en: 'Expired', cls: 'bg-gray-100 text-gray-700' },
};

export default function StatusBadge({ status }: { status: string }) {
  const { lang } = useT();
  const item = LABELS[status] ?? { bn: status, en: status, cls: 'bg-gray-100 text-gray-700' };
  return <span className={`badge ${item.cls}`}>{item[lang]}</span>;
}
