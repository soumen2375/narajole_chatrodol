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

export interface CertData {
  receiptNumber: string;
  name: string;
  pan?: string | null;       // donor PAN
  amount: number;
  date: string;
  fy: string;
  purpose?: string | null;
  paymentId?: string | null;
  reg80g?: string | null;    // org 80G registration
  reg12a?: string | null;    // org 12A registration
  orgPan?: string | null;    // org PAN
}

export function printCertificate(data: CertData, lang: Lang) {
  const L = (en: string, bn: string) => (lang === 'en' ? en : bn);
  const amt = `₹${Number(data.amount).toLocaleString('en-IN')}`;
  const rows: [string, string][] = [
    [L('Certificate No.', 'সার্টিফিকেট নং'), data.receiptNumber],
    [L('Date', 'তারিখ'), data.date],
    [L('Financial Year', 'অর্থবছর'), data.fy],
    [L('Donor Name', 'দাতার নাম'), data.name],
    ...(data.pan ? [[L('Donor PAN', 'দাতার PAN'), data.pan] as [string, string]] : []),
    [L('Donation Amount', 'দানের পরিমাণ'), amt],
    ...(data.purpose ? [[L('Purpose', 'উদ্দেশ্য'), data.purpose] as [string, string]] : []),
    ...(data.paymentId ? [[L('Payment Ref.', 'পেমেন্ট রেফ.'), data.paymentId] as [string, string]] : []),
  ];
  const tableRows = rows.map(([k, v]) => `<tr><td class="k">${k}</td><td class="v">${v}</td></tr>`).join('');
  const regLine = [
    data.reg80g ? `${L('80G Reg.', '80G রেজি.')}: ${data.reg80g}` : '',
    data.reg12a ? `${L('12A Reg.', '12A রেজি.')}: ${data.reg12a}` : '',
    data.orgPan ? `${L('Trust PAN', 'ট্রাস্ট PAN')}: ${data.orgPan}` : '',
  ].filter(Boolean).join(' &nbsp;·&nbsp; ');

  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<title>${L('80G Tax Exemption Certificate', '৮০জি কর-ছাড় সার্টিফিকেট')}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1c1917; max-width: 620px; }
  .frame { border: 2px solid #c2410c; padding: 28px 30px; }
  .header { text-align: center; border-bottom: 1px solid #e7e5e4; padding-bottom: 16px; margin-bottom: 20px; }
  .org-en { font-size: 17px; font-weight: 800; color: #c2410c; }
  .org-bn { font-size: 14px; color: #555; margin-top: 2px; }
  .title { font-size: 13px; font-weight: 700; margin-top: 12px; letter-spacing: .08em; text-transform: uppercase; color: #1c1917; }
  .intro { font-size: 12.5px; color: #44403c; margin: 16px 0; line-height: 1.6; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  .k { padding: 7px 10px; color: #78716c; font-size: 12.5px; border-bottom: 1px solid #f1efe9; width: 42%; }
  .v { padding: 7px 10px; font-weight: 600; font-size: 12.5px; border-bottom: 1px solid #f1efe9; }
  .regs { margin-top: 16px; font-size: 11px; color: #78716c; text-align: center; }
  .sign { margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end; font-size: 11.5px; color: #44403c; }
  .sign .line { border-top: 1px solid #1c1917; padding-top: 4px; width: 180px; text-align: center; }
  .foot { margin-top: 22px; text-align: center; font-size: 10.5px; color: #a8a29e; }
  @media print { body { padding: 12px; } }
</style>
</head>
<body>
  <div class="frame">
    <div class="header">
      <div class="org-en">Chhatradol Social Welfare Organisation</div>
      <div class="org-bn">নাড়াজোল ছাত্রদল</div>
      <div class="title">${L('Donation Certificate u/s 80G', '৮০জি ধারায় দান সার্টিফিকেট')}</div>
    </div>
    <p class="intro">${L(
      `This is to certify that the following donation has been received with thanks. Donations to this trust are eligible for deduction under Section 80G of the Income Tax Act, 1961.`,
      `প্রত্যয়ন করা যাচ্ছে যে নিম্নলিখিত দান কৃতজ্ঞতার সাথে গৃহীত হয়েছে। এই ট্রাস্টে প্রদত্ত দান আয়কর আইন, ১৯৬১-এর ৮০জি ধারায় কর-ছাড়ের যোগ্য।`,
    )}</p>
    <table>${tableRows}</table>
    ${regLine ? `<div class="regs">${regLine}</div>` : ''}
    <div class="sign">
      <div>${L('Place: Narajole, Paschim Medinipur', 'স্থান: নাড়াজোল, পশ্চিম মেদিনীপুর')}</div>
      <div class="line">${L('Authorised Signatory', 'অনুমোদিত স্বাক্ষরকারী')}</div>
    </div>
    <div class="foot">${L('Computer-generated certificate · narajole.org', 'কম্পিউটার-জেনারেটেড সার্টিফিকেট · narajole.org')}</div>
  </div>
</body>
</html>`;

  const w = window.open('', '_blank', 'width=680,height=820');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
}
