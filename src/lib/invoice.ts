import { amountInWords } from '@/lib/receipt';

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

/** Escapes then turns newlines into <br> for multi-line fields */
function htmlLines(str: string | null | undefined): string {
  return htmlEscape(str).replace(/\r?\n/g, '<br>');
}

export interface InvoiceLine {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface InvoiceBank {
  account_name: string;
  account_number: string;
  ifsc: string;
  branch: string;
}

export interface InvoiceData {
  invoiceNumber: string;
  billToName: string;
  billToEmail?: string | null;
  billToPhone?: string | null;
  billToAddress?: string | null;
  date: string;                 // already formatted, e.g. "25 August 2026"
  dueDate?: string | null;
  paymentMode?: string | null;
  paymentRef?: string | null;
  items: InvoiceLine[];
  subtotal: number;
  discount: number;
  roundOff: number;
  total: number;
  amountPaid?: number;
  notes?: string | null;
  bank?: InvoiceBank | null;
}

const money = (n: number) =>
  Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const qtyText = (n: number) => {
  const v = Number(n || 0);
  return Number.isInteger(v) ? String(v) : String(Number(v.toFixed(3)));
};

/**
 * Builds the official CSWO bill as a standalone A4 page — the same document the
 * treasurer used to keep by hand in CSWO_Payment_Receipt.xlsx: maroon masthead,
 * gold rule, BILLED TO / bill-meta panels, itemised table, totals, maroon
 * payable band with the amount in words, bank-transfer block and signature.
 *
 * Assets load by absolute site URL (the print window is a real same-origin
 * page) and `print-color-adjust: exact` keeps the brand colours in the PDF.
 */
export function invoiceHtml(data: InvoiceData): string {
  const metaRows: [string, string][] = [
    ['Bill No.', htmlEscape(data.invoiceNumber)],
    ['Date', htmlEscape(data.date)],
    ...(data.dueDate ? [['Due Date', htmlEscape(data.dueDate)] as [string, string]] : []),
    ['Payment Mode', htmlEscape(data.paymentMode) || '—'],
    ...(data.paymentRef ? [['Reference', htmlEscape(data.paymentRef)] as [string, string]] : []),
  ];

  const metaHtml = metaRows
    .map(([k, v]) => `<tr><td class="mk">${k}</td><td class="mv">${v}</td></tr>`)
    .join('');

  const itemRows = data.items
    .map(
      (it, i) => `<tr${i % 2 ? ' class="alt"' : ''}>
        <td class="c">${i + 1}</td>
        <td class="desc">${htmlEscape(it.description) || '—'}</td>
        <td class="c">${qtyText(it.quantity)}</td>
        <td class="r">${money(it.rate)}</td>
        <td class="r b">${money(it.amount)}</td>
      </tr>`,
    )
    .join('');

  const paid = Number(data.amountPaid ?? 0);
  const balance = Number(data.total) - paid;
  const totalsRows: [string, string, boolean?][] = [
    ['Subtotal', `&#8377;${money(data.subtotal)}`],
    ['Discount', `&#8377;${money(data.discount)}`],
    ['Round off', `&#8377;${money(data.roundOff)}`],
    ...(paid > 0
      ? ([
          ['Amount paid', `&#8377;${money(paid)}`],
          ['Balance due', `&#8377;${money(balance)}`, true],
        ] as [string, string, boolean?][])
      : []),
  ];
  const totalsHtml = totalsRows
    .map(
      ([k, v, strong]) =>
        `<tr><td class="tk${strong ? ' due' : ''}">${k}</td><td class="tv${strong ? ' due' : ''}">${v}</td></tr>`,
    )
    .join('');

  const bankHtml = data.bank
    ? `<div class="bank">
        <div class="bank-h">BANK TRANSFER</div>
        <table class="bank-t">
          <tr><td class="bk">ACCOUNT NAME</td><td class="bv">${htmlEscape(data.bank.account_name)}</td></tr>
          <tr><td class="bk">ACCOUNT NUMBER</td><td class="bv">${htmlEscape(data.bank.account_number)}</td></tr>
          <tr><td class="bk">IFSC CODE</td><td class="bv">${htmlEscape(data.bank.ifsc)}</td></tr>
          <tr><td class="bk">BRANCH</td><td class="bv">${htmlEscape(data.bank.branch)}</td></tr>
        </table>
      </div>`
    : '<div></div>';

  const billToLines = [
    data.billToAddress ? `<div class="bt-sub">${htmlLines(data.billToAddress)}</div>` : '',
    data.billToEmail ? `<div class="bt-sub link">${htmlEscape(data.billToEmail)}</div>` : '',
    data.billToPhone ? `<div class="bt-sub link">${htmlEscape(data.billToPhone)}</div>` : '',
  ].join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>BILL ${htmlEscape(data.invoiceNumber)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Solway:wght@400;700;800&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0;
    -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: 'Solway', Georgia, serif; color: #1C1C1C; background: #fff; }
  .sheet { width: 210mm; min-height: 297mm; margin: 0 auto; display: flex; flex-direction: column; }

  .masthead { background: #7B1E24; color: #fff; display: flex; align-items: center;
    gap: 18px; padding: 18px 30px; }
  .masthead img { width: 68px; height: 68px; border-radius: 50%; background: #fff;
    object-fit: contain; padding: 4px; flex: none; }
  .org { font-family: 'Bebas Neue', Impact, sans-serif; font-size: 29px; line-height: 1.08;
    letter-spacing: .03em; }
  .reg { font-size: 10.5px; color: #DFB658; margin-top: 5px; }
  .goldrule { height: 6px; background: #D9B25A; }

  .main { flex: 1; padding: 26px 30px 0; display: flex; flex-direction: column; }
  .doctitle { font-family: 'Bebas Neue', Impact, sans-serif; font-size: 29px; letter-spacing: .14em;
    color: #7B1E24; text-align: center; line-height: 1; }

  .panels { margin-top: 22px; display: flex; gap: 16px; align-items: stretch; }
  .billto { flex: 1; background: #F4F1EA; border: 1px solid #EADFC6; border-radius: 6px;
    padding: 12px 15px; }
  .bt-lbl { font-size: 9px; letter-spacing: .12em; text-transform: uppercase; color: #8B7A57; }
  .bt-name { font-size: 14px; font-weight: 800; margin-top: 5px; }
  .bt-sub { font-size: 11.5px; color: #55524C; margin-top: 3px; line-height: 1.45; }
  .bt-sub.link { color: #7B1E24; }

  .meta { flex: 1; background: #F4F1EA; border: 1px solid #EADFC6; border-radius: 6px;
    padding: 6px 15px; }
  .meta table { width: 100%; border-collapse: collapse; }
  .mk { font-size: 11px; color: #8B7A57; padding: 6px 0; }
  .mv { font-size: 12px; font-weight: 800; text-align: right; padding: 6px 0; word-break: break-word; }

  .items { width: 100%; border-collapse: collapse; margin-top: 22px; }
  .items thead th { background: #7B1E24; color: #fff; font-size: 10.5px; letter-spacing: .07em;
    text-transform: uppercase; padding: 9px 8px; font-weight: 700; text-align: left; }
  .items thead th.c { text-align: center; }
  .items thead th.r { text-align: right; }
  .items tbody td { font-size: 12px; padding: 9px 8px; border-bottom: 1px solid #EFEDE7;
    vertical-align: top; }
  .items tbody tr.alt td { background: #FBF9F4; }
  .items td.c { text-align: center; color: #55524C; }
  .items td.r { text-align: right; white-space: nowrap; }
  .items td.b { font-weight: 800; }
  .items td.desc { color: #7B1E24; }

  .under { margin-top: 20px; display: flex; justify-content: flex-end; }
  .totals { border-collapse: collapse; min-width: 250px; }
  .tk { font-size: 12px; color: #55524C; padding: 5px 18px 5px 0; }
  .tv { font-size: 12.5px; font-weight: 800; text-align: right; padding: 5px 0; white-space: nowrap; }
  .tk.due, .tv.due { color: #7B1E24; }

  .band { margin-top: 18px; background: #7B1E24; color: #fff; border-radius: 5px;
    padding: 17px 22px; display: flex; align-items: center; justify-content: space-between; gap: 20px; }
  .band .lbl { font-family: 'Bebas Neue', Impact, sans-serif; font-size: 20px; letter-spacing: .1em;
    color: #F9C85B; line-height: 1.1; }
  .band .words { font-size: 11.5px; color: #EBD6A5; margin-top: 3px; }
  .band .amt { font-family: 'Bebas Neue', Impact, sans-serif; font-size: 36px; line-height: 1;
    white-space: nowrap; }

  .lower { margin-top: 22px; display: flex; align-items: flex-end; justify-content: space-between;
    gap: 24px; }
  .bank { border: 1px solid #E3DED2; border-radius: 5px; overflow: hidden; min-width: 320px; }
  .bank-h { background: #F4F1EA; color: #7B1E24; font-size: 10.5px; font-weight: 800;
    letter-spacing: .12em; text-align: center; padding: 6px 10px; border-bottom: 1px solid #E3DED2; }
  .bank-t { width: 100%; border-collapse: collapse; }
  .bk { font-size: 9.5px; letter-spacing: .06em; color: #8B7A57; padding: 6px 10px;
    background: #FBF9F4; border-bottom: 1px solid #EFEDE7; border-right: 1px solid #EFEDE7; }
  .bv { font-size: 11px; font-weight: 800; color: #7B1E24; text-align: right; padding: 6px 12px;
    border-bottom: 1px solid #EFEDE7; }
  .bank-t tr:last-child .bk, .bank-t tr:last-child .bv { border-bottom: none; }

  .sign { text-align: center; min-width: 190px; }
  .sign img { width: 130px; height: 48px; object-fit: contain; margin-bottom: -2px; }
  .sign .rule { border-top: 1px solid #1C1C1C; padding-top: 5px; font-size: 11px; font-weight: 700; }

  .notes { margin-top: 18px; font-size: 11px; color: #55524C; line-height: 1.5; }
  .notes b { color: #7B1E24; }

  .note { margin-top: 20px; padding-top: 14px; border-top: 1px dashed #CFCFCF;
    text-align: center; font-size: 10.5px; color: #7B1E24; padding-bottom: 20px; }

  .footer { background: #5C1319; color: #fff; display: flex; align-items: center;
    padding: 12px 24px; gap: 18px; margin-top: auto; }
  .footer .cell { flex: 1; display: flex; align-items: center; justify-content: center; gap: 10px; }
  .footer img { width: 24px; height: 24px; flex: none; object-fit: contain; }
  .footer .ct { display: flex; flex-direction: column; gap: 1px; white-space: nowrap; }
  .footer .ct b { font-size: 11px; }
  .footer .ct span { font-size: 11px; }
  .footer .div { width: 1px; align-self: stretch; background: rgba(223,182,88,.55); flex: none; }

  @page { size: A4; margin: 0; }
  @media print { .sheet { width: auto; min-height: 100vh; } }
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
      <div class="doctitle">BILL / INVOICE</div>

      <div class="panels">
        <div class="billto">
          <div class="bt-lbl">Billed To</div>
          <div class="bt-name">${htmlEscape(data.billToName) || '—'}</div>
          ${billToLines}
        </div>
        <div class="meta"><table>${metaHtml}</table></div>
      </div>

      <table class="items">
        <thead>
          <tr>
            <th class="c">#</th>
            <th>Description</th>
            <th class="c">Qty</th>
            <th class="r">Rate (&#8377;)</th>
            <th class="r">Amount (&#8377;)</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>

      <div class="under"><table class="totals">${totalsHtml}</table></div>

      <div class="band">
        <div>
          <div class="lbl">TOTAL PAYABLE</div>
          <div class="words">${amountInWords(Number(data.total))}</div>
        </div>
        <div class="amt">&#8377;${money(data.total)}</div>
      </div>

      <div class="lower">
        ${bankHtml}
        <div class="sign">
          <img src="/assets/receipt/signature.png" alt="">
          <div class="rule">Authorized Signatory</div>
        </div>
      </div>

      ${data.notes ? `<div class="notes"><b>Notes:</b> ${htmlLines(data.notes)}</div>` : ''}

      <div class="note">This is a computer-generated bill and does not require a physical signature.</div>
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

  return html;
}

/** Opens the bill in a print window and fires the browser print dialog. */
export function printInvoice(data: InvoiceData) {
  const html = invoiceHtml(data);
  const w = window.open('', '_blank', 'width=880,height=1000');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  // Same wait as the receipt: webfonts + logo/signature must be in before the
  // print snapshot is taken, otherwise the PDF goes out with fallback type.
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
