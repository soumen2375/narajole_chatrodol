const LABELS: Record<string, { text: string; cls: string }> = {
  // post / member
  published: { text: 'প্রকাশিত', cls: 'bg-green-100 text-green-800' },
  pending: { text: 'অপেক্ষমাণ', cls: 'bg-amber-100 text-amber-800' },
  draft: { text: 'খসড়া', cls: 'bg-gray-100 text-gray-700' },
  rejected: { text: 'প্রত্যাখ্যাত', cls: 'bg-red-100 text-red-800' },
  approved: { text: 'অনুমোদিত', cls: 'bg-green-100 text-green-800' },
  suspended: { text: 'স্থগিত', cls: 'bg-red-100 text-red-800' },
  // payment / contribution
  paid: { text: 'পরিশোধিত', cls: 'bg-green-100 text-green-800' },
  unpaid: { text: 'বকেয়া', cls: 'bg-red-100 text-red-800' },
  created: { text: 'শুরু হয়েছে', cls: 'bg-gray-100 text-gray-700' },
  failed: { text: 'ব্যর্থ', cls: 'bg-red-100 text-red-800' },
  refunded: { text: 'ফেরত', cls: 'bg-gray-100 text-gray-700' },
};

export default function StatusBadge({ status }: { status: string }) {
  const item = LABELS[status] ?? { text: status, cls: 'bg-gray-100 text-gray-700' };
  return <span className={`badge ${item.cls}`}>{item.text}</span>;
}
