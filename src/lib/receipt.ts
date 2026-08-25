import type { Lang } from '@/i18n';

/** Escapes HTML special characters to prevent XSS when building HTML strings */
function htmlEscape(str: string | null | undefined): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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

// ── Amount → words (Indian numbering), mirroring api/_lib/receipt-pdf.ts ─────

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  const t = TENS[Math.floor(n / 10)];
  const o = ONES[n % 10];
  return o ? `${t} ${o}` : t;
}

function numberToWords(n: number): string {
  if (n === 0) return 'Zero';
  const parts: string[] = [];
  const push = (val: number, label: string) => {
    if (val > 0) parts.push(`${twoDigits(val)} ${label}`.trim());
  };
  push(Math.floor(n / 10000000), 'Crore');
  n %= 10000000;
  push(Math.floor(n / 100000), 'Lakh');
  n %= 100000;
  push(Math.floor(n / 1000), 'Thousand');
  n %= 1000;
  push(Math.floor(n / 100), 'Hundred');
  n %= 100;
  if (n > 0) parts.push(twoDigits(n));
  return parts.join(' ');
}

export function amountInWords(amount: number): string {
  const rupees = Math.floor(Math.abs(amount));
  const paise = Math.round((Math.abs(amount) - rupees) * 100);
  const head = `Rupees ${numberToWords(rupees)}`;
  return paise > 0 ? `${head} and ${numberToWords(paise)} Paise only` : `${head} only`;
}

/**
 * Opens a print window styled to match the official PDF receipt that gets
 * emailed (api/_lib/receipt-pdf.ts) — maroon masthead, gold rule, detail
 * table, maroon amount band, signature block, contact footer — so a donor's
 * saved copy and their emailed copy are visibly the same document.
 *
 * Assets are referenced by absolute site URL rather than inlined: the print
 * window is a real page on the same origin, so it can just load them, and
 * `print-color-adjust: exact` keeps the brand colours instead of letting the
 * browser drop backgrounds.
 */
export function printReceipt(data: ReceiptData, _langInput: Lang) {
  const isContribution = data.type === 'contribution';
  const typeLabel = isContribution ? 'CONTRIBUTION RECEIPT' : 'DONATION RECEIPT';

  const purposeValue = isContribution
    ? (data.month ? `${data.month} ${data.year ?? ''}`.trim() : (data.purpose || '—'))
    : (data.purpose || '—');

  const rows: [string, string, boolean?][] = [
    [isContribution ? 'Member Name' : 'Donor Name', htmlEscape(data.name) || '—'],
    ['Email', htmlEscape(data.email) || '—'],
    [isContribution ? 'Contribution For' : 'Purpose of Donation', htmlEscape(purposeValue) || '—'],
    ['Payment Method', htmlEscape(data.paymentMethod) || '—'],
    ...(data.paymentId
      ? [['Transaction ID', htmlEscape(data.paymentId)] as [string, string]]
      : []),
    ['Payment Status', 'Paid &middot; Successful', true],
  ];

  const tableRows = rows
    .map(
      ([k, v, green]) =>
        `<tr><td class="k">${k}</td><td class="v${green ? ' ok' : ''}">${v}</td></tr>`,
    )
    .join('');

  const amountFmt = Number(data.amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${typeLabel} ${htmlEscape(data.receiptNumber)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Solway:wght@400;700;800&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0;
    -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: 'Solway', Georgia, serif; color: #1C1C1C; background: #fff; }
  .sheet { width: 210mm; min-height: 297mm; margin: 0 auto; display: flex; flex-direction: column; }

  .masthead { background: #7B1E24; color: #fff; display: flex; align-items: center;
    gap: 18px; padding: 20px 34px; }
  .masthead img { width: 74px; height: 74px; border-radius: 50%; background: #fff;
    object-fit: contain; padding: 4px; flex: none; }
  .org { font-family: 'Bebas Neue', Impact, sans-serif; font-size: 32px; line-height: 1.08;
    letter-spacing: .03em; }
  .reg { font-size: 11px; color: #DFB658; margin-top: 5px; }
  .goldrule { height: 6px; background: #D9B25A; }

  .main { flex: 1; padding: 30px 34px 0; display: flex; flex-direction: column; }
  .doctitle { font-family: 'Bebas Neue', Impact, sans-serif; font-size: 30px; letter-spacing: .14em;
    color: #7B1E24; text-align: center; line-height: 1; }

  .strip { margin-top: 22px; display: flex; justify-content: space-between; gap: 20px;
    padding: 13px 17px; border: 1px solid #EADFC6; border-radius: 6px; background: #FBF7EE; }
  .strip .lbl { font-size: 9.5px; letter-spacing: .1em; text-transform: uppercase; color: #8B7A57; }
  .strip .val { font-size: 13px; font-weight: 700; margin-top: 3px; }
  .strip .right { text-align: right; }

  table { width: 100%; border-collapse: collapse; margin-top: 24px; }
  .k { padding: 13px 4px; color: #6B6B6B; font-size: 12px; width: 38%;
    border-bottom: 1px solid #EFEDE7; }
  .v { padding: 13px 4px; font-weight: 700; font-size: 13.5px; word-break: break-word;
    border-bottom: 1px solid #EFEDE7; }
  tr:last-child .k, tr:last-child .v { border-bottom: none; }
  .v.ok { color: #1F7A45; }

  .band { margin-top: 22px; background: #7B1E24; color: #fff; border-radius: 5px;
    padding: 19px 22px; display: flex; align-items: center; justify-content: space-between; gap: 20px; }
  .band .lbl { font-size: 12px; letter-spacing: .12em; text-transform: uppercase; color: #F9C85B; }
  .band .words { font-size: 12px; color: #EBD6A5; margin-top: 3px; }
  .band .amt { font-family: 'Bebas Neue', Impact, sans-serif; font-size: 40px; line-height: 1;
    white-space: nowrap; }

  .sign { margin-top: 34px; display: flex; justify-content: flex-end; }
  .sign .box { text-align: center; min-width: 200px; }
  .sign img { width: 140px; height: 52px; object-fit: contain; margin-bottom: -4px; }
  .sign .rule { border-top: 1px solid #1C1C1C; padding-top: 6px; font-size: 12px; font-weight: 700; }
  .sign .role { font-size: 11px; color: #6B6B6B; margin-top: 2px; }

  .note { margin-top: 20px; padding-top: 15px; border-top: 1px dashed #CFCFCF;
    text-align: center; font-size: 11px; color: #9A9A9A; padding-bottom: 22px; }

  .footer { background: #5C1319; color: #fff; display: flex; align-items: center;
    padding: 13px 26px; gap: 18px; margin-top: auto; }
  .footer .cell { flex: 1; display: flex; align-items: center; justify-content: center; gap: 10px; }
  .footer img { width: 26px; height: 26px; flex: none; object-fit: contain; }
  .footer .ct { display: flex; flex-direction: column; gap: 1px; white-space: nowrap; }
  .footer .ct b { font-size: 11.5px; }
  .footer .ct span { font-size: 11.5px; }
  .footer .div { width: 1px; align-self: stretch; background: rgba(223,182,88,.55); flex: none; }

  @page { size: A4; margin: 0; }
  @media print {
    .sheet { width: auto; min-height: 100vh; }
  }
</style>
</head>
<body>
  <div class="sheet">
    <div class="masthead">
      <img src="/assets/receipt/logo.jpg" alt="">
      <div>
        <div class="org">CHHATRADOL SOCIAL WELFARE ORGANIZATION</div>
        <div class="reg">Reg. No.: IV-100200047/2026 &nbsp;&middot;&nbsp; DARPAN ID: WB/2026/1138665</div>
      </div>
    </div>
    <div class="goldrule"></div>

    <div class="main">
      <div class="doctitle">${typeLabel}</div>

      <div class="strip">
        <div>
          <div class="lbl">Receipt No.</div>
          <div class="val">${htmlEscape(data.receiptNumber)}</div>
        </div>
        <div class="right">
          <div class="lbl">Date</div>
          <div class="val">${htmlEscape(data.date)}</div>
        </div>
      </div>

      <table>${tableRows}</table>

      <div class="band">
        <div>
          <div class="lbl">Amount Received</div>
          <div class="words">${amountInWords(Number(data.amount))}</div>
        </div>
        <div class="amt">&#8377;${amountFmt}</div>
      </div>

      <div class="sign">
        <div class="box">
          <img src="/assets/receipt/signature.png" alt="">
          <div class="rule">Sayan Samanta</div>
          <div class="role">Secretary, CSWO</div>
        </div>
      </div>

      <div class="note">This is a computer-generated receipt and does not require a physical signature.</div>
    </div>

    <div class="goldrule"></div>
    <div class="footer">
      <div class="cell">
        <img src="/assets/receipt/icon-phone-gold.png" alt="">
        <div class="ct"><b>Contact No.</b><span>7811073412 / 7074074110</span></div>
      </div>
      <div class="div"></div>
      <div class="cell">
        <img src="/assets/receipt/icon-mail-gold.png" alt="">
        <div class="ct"><b>Email</b><span>info@chhatradol.org</span></div>
      </div>
      <div class="div"></div>
      <div class="cell">
        <img src="/assets/receipt/icon-web-gold.png" alt="">
        <div class="ct"><b>Website</b><span>www.chhatradol.org</span></div>
      </div>
    </div>
  </div>
</body>
</html>`;

  const w = window.open('', '_blank', 'width=860,height=1000');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  // Wait for the webfonts and the logo/signature/icons to load, otherwise the
  // print snapshot can go out with fallback type and missing imagery.
  const go = () => setTimeout(() => w.print(), 250);
  if (w.document.fonts?.ready) {
    Promise.race([
      Promise.all([
        w.document.fonts.ready,
        new Promise<void>((r) => {
          if (w.document.readyState === 'complete') r();
          else w.addEventListener('load', () => r(), { once: true });
        }),
      ]),
      new Promise<void>((r) => setTimeout(r, 2500)),
    ]).then(go);
  } else {
    setTimeout(go, 900);
  }
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

export function printCertificate(data: CertData, _langInput: Lang) {
  const lang: Lang = 'en';
  const L = (en: string, bn: string) => (lang === 'en' ? en : bn);
  const amt = `₹${Number(data.amount).toLocaleString('en-IN')}`;
  const rows: [string, string][] = [
    [L('Certificate No.', 'সার্টিফিকেট নং'), htmlEscape(data.receiptNumber)],
    [L('Date', 'তারিখ'), htmlEscape(data.date)],
    [L('Financial Year', 'অর্থবছর'), htmlEscape(data.fy)],
    [L('Donor Name', 'দাতার নাম'), htmlEscape(data.name)],
    ...(data.pan ? [[L('Donor PAN', 'দাতার PAN'), htmlEscape(data.pan)] as [string, string]] : []),
    [L('Donation Amount', 'দানের পরিমাণ'), amt],
    ...(data.purpose ? [[L('Purpose', 'উদ্দেশ্য'), htmlEscape(data.purpose)] as [string, string]] : []),
    ...(data.paymentId ? [[L('Payment Ref.', 'পেমেন্ট রেফ.'), htmlEscape(data.paymentId)] as [string, string]] : []),
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
      <div class="org-en">Chhatradol Social Welfare Organization</div>
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
