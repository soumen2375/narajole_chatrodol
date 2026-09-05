import { useRef, useState } from 'react';
import { QrCode, Download, Copy, Check, Printer, ExternalLink } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { useT } from '@/i18n';
import { memberVerifyUrl, downloadQrCanvas, slugify } from '@/lib/memberQr';
import { idCardHtml, printIdCards, type IdCardMember } from '@/lib/idCard';

/** Rendered at 4× the display size so the downloaded PNG prints sharp. */
const QR_PX = 640;
const QR_DISPLAY = 168;

/**
 * The QR code that goes on one member's ID card, with the actions around it:
 * save the PNG, copy or open the verification link, and print the card.
 *
 * A member's code never changes. Cards stay in wallets for years, so the token
 * is issued once and left alone — nothing here rewrites it.
 */
export default function MemberQrPanel({ member }: { member: IdCardMember }) {
  const { lang } = useT();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState('');

  const url = memberVerifyUrl(member.verify_token);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setErr(tr('Could not copy the link.', 'লিঙ্কটি কপি করা যায়নি।'));
    }
  };

  const printCard = () => {
    const qr = canvasRef.current?.toDataURL('image/png');
    if (!qr) return;
    if (!printIdCards([idCardHtml(member, qr)])) {
      setErr(tr(
        'Your browser blocked the print window. Allow pop-ups and try again.',
        'ব্রাউজার প্রিন্ট উইন্ডো আটকে দিয়েছে। পপ-আপ অনুমোদন করে আবার চেষ্টা করুন।',
      ));
    }
  };

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <QrCode className="h-5 w-5 text-emerald-700" />
            {tr('ID card QR code', 'পরিচয়পত্রের QR কোড')}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {tr(
              'Print this on the ID card. Scanning it opens the verification page with the member’s photo, blood group, mobile, member ID and joining date.',
              'এটি পরিচয়পত্রে ছাপুন। স্ক্যান করলে সদস্যের ছবি, রক্তের গ্রুপ, মোবাইল, সদস্য আইডি ও যোগদানের তারিখসহ যাচাই পাতা খোলে।',
            )}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="shrink-0 rounded-xl border border-gray-200 bg-white p-3">
          <QRCodeCanvas
            ref={canvasRef}
            value={url}
            size={QR_PX}
            level="M"
            marginSize={4}
            style={{ width: QR_DISPLAY, height: QR_DISPLAY, display: 'block' }}
          />
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="break-all rounded-lg bg-gray-50 px-3 py-2 font-mono text-[11.5px] text-gray-600">
            {url}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => downloadQrCanvas(canvasRef.current, `qr-${slugify(member.full_name)}`)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:opacity-90"
            >
              <Download className="h-3.5 w-3.5" /> {tr('Download PNG', 'PNG ডাউনলোড')}
            </button>

            <button
              onClick={printCard}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              <Printer className="h-3.5 w-3.5" /> {tr('Print ID card', 'পরিচয়পত্র প্রিন্ট')}
            </button>

            <button
              onClick={copy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-700" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? tr('Copied', 'কপি হয়েছে') : tr('Copy link', 'লিঙ্ক কপি')}
            </button>

            <a
              href={`/verify/${member.verify_token}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              <ExternalLink className="h-3.5 w-3.5" /> {tr('Test scan', 'যাচাই দেখুন')}
            </a>

          </div>

          {err && <p className="text-xs font-semibold text-red-600">{err}</p>}
        </div>
      </div>
    </div>
  );
}
