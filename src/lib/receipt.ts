import type { Lang } from '@/i18n';
import {
  amountBand, detailTable, esc, printDocSheet, printedDate, rupees, section,
} from '@/lib/docsheet';

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
 * Opens the donor's receipt, ready to print or save as PDF.
 *
 * The sheet comes from docsheet.ts — the same one the 80G certificate, bills
 * and reports print on — and is laid out to match the copy that gets emailed
 * (api/_lib/receipt-pdf.ts), so a donor comparing the two sees one document.
 */
export function printReceipt(data: ReceiptData, _langInput: Lang) {
  const isContribution = data.type === 'contribution';
  const purposeValue = isContribution
    ? (data.month ? `${data.month} ${data.year ?? ''}`.trim() : (data.purpose || '—'))
    : (data.purpose || '—');

  printDocSheet({
    title: `${isContribution ? 'CONTRIBUTION RECEIPT' : 'DONATION RECEIPT'} ${data.receiptNumber}`,
    docTitle: isContribution ? 'CONTRIBUTION RECEIPT' : 'DONATION RECEIPT',
    refLabel: 'Receipt No.',
    refValue: data.receiptNumber,
    dateValue: data.date,
    bodyHtml: [
      detailTable([
        [isContribution ? 'Member Name' : 'Donor Name', esc(data.name) || '—'],
        ['Email', esc(data.email) || '—'],
        [isContribution ? 'Contribution For' : 'Purpose of Donation', esc(purposeValue) || '—'],
        ['Payment Method', esc(data.paymentMethod) || '—'],
        ...(data.paymentId ? [['Transaction ID', esc(data.paymentId)] as [string, string]] : []),
        ['Payment Status', 'Paid &middot; Successful', 'ok'],
      ]),
      amountBand('Amount Received', rupees(data.amount), amountInWords(Number(data.amount))),
    ].join(''),
    note: 'This is a computer-generated receipt and does not require a physical signature.',
  });
}

// ── 80G certificate ──────────────────────────────────────────────────────────

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

/**
 * The tax-exemption certificate a donor files with their return.
 *
 * The registration numbers get their own block rather than a footnote: an
 * assessing officer looks for 80G, 12A and the trust PAN, and a certificate
 * that buries them gets sent back.
 */
export function printCertificate(data: CertData, _langInput: Lang) {
  const registrations: Array<[string, string]> = [
    ...(data.reg80g ? [['80G Registration', esc(data.reg80g)] as [string, string]] : []),
    ...(data.reg12a ? [['12A Registration', esc(data.reg12a)] as [string, string]] : []),
    ...(data.orgPan ? [['Trust PAN', esc(data.orgPan)] as [string, string]] : []),
  ];

  printDocSheet({
    title: `80G CERTIFICATE ${data.receiptNumber}`,
    docTitle: 'DONATION CERTIFICATE U/S 80G',
    refLabel: 'Certificate No.',
    refValue: data.receiptNumber,
    dateValue: data.date || printedDate(),
    bodyHtml: [
      `<p class="para">This is to certify that the donation detailed below has been received with
       thanks by Chhatradol Social Welfare Organization. Donations to this organisation are
       eligible for deduction under Section 80G of the Income Tax Act, 1961.</p>`,
      detailTable([
        ['Financial Year', esc(data.fy)],
        ['Donor Name', esc(data.name)],
        ...(data.pan ? [['Donor PAN', esc(data.pan)] as [string, string]] : []),
        ...(data.purpose ? [['Purpose', esc(data.purpose)] as [string, string]] : []),
        ...(data.paymentId ? [['Payment Ref.', esc(data.paymentId)] as [string, string]] : []),
      ]),
      amountBand('Amount Received', rupees(data.amount), amountInWords(Number(data.amount))),
      registrations.length ? section('Registration particulars') + detailTable(registrations) : '',
      `<p class="para">Place: Narajole, Daspur, Paschim Medinipur — 721211</p>`,
    ].join(''),
    note: 'Computer-generated certificate · www.chhatradol.org',
  });
}
