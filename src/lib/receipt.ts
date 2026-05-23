import type { Lang } from '@/i18n';

export interface ReceiptData {
  receiptNumber: string;
  type: 'donation' | 'contribution';
  name: string;
  email?: string | null;
  amount: number;
  date: string;
  purpose?: string | null;
  month?: string | null;
  year?: number | null;
  paymentMethod?: string | null;
  paymentId?: string | null;
}

export function printReceipt(data: ReceiptData, lang: Lang) {
  const L = (en: string, bn: string) => (lang === 'en' ? en : bn);
  const rows: [string, string][] = [
    [L('Receipt No.', 'রসিদ নং'), data.receiptNumber],
    [L('Date', 'তারিখ'), data.date],
    [L('Name', 'নাম'), data.name],
    ...(data.email ? [[L('Email', 'ইমেল'), data.email] as [string, string]] : []),
    [L('Amount', 'পরিমাণ'), `₹${Number(data.amount).toLocaleString('en-IN')}`],
    ...(data.type === 'donation' && data.purpose ? [[L('Purpose', 'উদ্দেশ্য'), data.purpose] as [string, string]] : []),
    ...(data.type === 'contribution' && data.month ? [[L('Month / Year', 'মাস / বছর'), `${data.month} ${data.year ?? ''}`] as [string, string]] : []),
    ...(data.paymentMethod ? [[L('Payment Method', 'পেমেন্ট পদ্ধতি'), data.paymentMethod] as [string, string]] : []),
    ...(data.paymentId ? [[L('Payment ID', 'পেমেন্ট আইডি'), data.paymentId] as [string, string]] : []),
  ];

  const tableRows = rows
    .map(([k, v]) => `<tr><td class="k">${k}</td><td class="v">${v}</td></tr>`)
    .join('');

  const typeLabel = data.type === 'donation' ? L('Donation Receipt', 'দান রসিদ') : L('Contribution Receipt', 'চাঁদা রসিদ');

  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<title>${typeLabel}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; padding: 32px; color: #1a1a1a; max-width: 480px; }
  .header { text-align: center; border-bottom: 2px solid #b91c1c; padding-bottom: 16px; margin-bottom: 24px; }
  .org-en { font-size: 15px; font-weight: 800; color: #b91c1c; }
  .org-bn { font-size: 14px; color: #555; margin-top: 2px; }
  .receipt-type { font-size: 13px; font-weight: 700; margin-top: 10px; letter-spacing: .05em; text-transform: uppercase; color: #444; }
  table { width: 100%; border-collapse: collapse; }
  .k { padding: 7px 10px; color: #666; font-size: 13px; border-bottom: 1px solid #f0f0f0; width: 45%; }
  .v { padding: 7px 10px; font-weight: 600; font-size: 13px; border-bottom: 1px solid #f0f0f0; }
  .footer { margin-top: 32px; text-align: center; font-size: 11px; color: #aaa; }
  .seal { margin-top: 24px; border-top: 1px dashed #ccc; padding-top: 12px; font-size: 11px; color: #999; text-align: center; }
  @media print { body { padding: 16px; } }
</style>
</head>
<body>
  <div class="header">
    <div class="org-en">Chhatradol Social Welfare Organisation</div>
    <div class="org-bn">নাড়াজোল ছাত্রদল</div>
    <div class="receipt-type">${typeLabel}</div>
  </div>
  <table>${tableRows}</table>
  <div class="seal">${L('This is a computer-generated receipt.', 'এটি একটি কম্পিউটার-জেনারেটেড রসিদ।')}</div>
  <div class="footer">CSWO Digital Platform · narajole.org</div>
</body>
</html>`;

  const w = window.open('', '_blank', 'width=560,height=720');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
}
