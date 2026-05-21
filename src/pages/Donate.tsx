import { useState } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import { startRazorpayPayment } from '@/lib/razorpay';
import { useAuth } from '@/context/AuthContext';
import { toBengaliDigits } from '@/lib/format';

const PRESET_AMOUNTS = [200, 500, 1000, 2500, 5000];
const PURPOSES = ['যেখানে সবচেয়ে বেশি প্রয়োজন', 'শিক্ষা', 'স্বাস্থ্য ও রক্তদান', 'পরিবেশ', 'ত্রাণ ও দুর্যোগ'];

export default function Donate() {
  const { member } = useAuth();
  const [amount, setAmount] = useState(500);
  const [purpose, setPurpose] = useState(PURPOSES[0]);
  const [name, setName] = useState(member?.full_name ?? '');
  const [email, setEmail] = useState(member?.email ?? '');
  const [phone, setPhone] = useState(member?.phone ?? '');
  const [anonymous, setAnonymous] = useState(false);
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const donate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount < 10) {
      setStatus('error');
      setMessage('সর্বনিম্ন অনুদান ₹১০।');
      return;
    }
    setStatus('processing');
    setMessage('');
    try {
      await startRazorpayPayment({
        action: 'create_donation_order',
        amount,
        purpose,
        donorName: anonymous ? 'Anonymous' : name,
        donorEmail: email,
        donorPhone: phone,
        isAnonymous: anonymous,
        description: `অনুদান — ${purpose}`,
      });
      setStatus('success');
      setMessage('ধন্যবাদ! আপনার অনুদান সফলভাবে গৃহীত হয়েছে। আপনার উদারতার জন্য আমরা কৃতজ্ঞ।');
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'পেমেন্টে সমস্যা হয়েছে।');
    }
  };

  return (
    <div>
      <PageHeader
        title="অনুদান দিন"
        subtitle="আপনার উদার অনুদান আমাদের সামাজিক ও শিক্ষামূলক কার্যক্রমকে এগিয়ে নিয়ে যেতে সাহায্য করবে"
      />
      <div className="container mx-auto max-w-2xl px-4 py-10">
        <div className="rounded-lg bg-white p-6 shadow-md">
          {status === 'success' ? (
            <div className="py-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-lg text-gray-700">{message}</p>
              <button
                onClick={() => setStatus('idle')}
                className="mt-6 rounded-full bg-blue-600 px-6 py-2 font-semibold text-white hover:bg-blue-700"
              >
                আরেকটি অনুদান দিন
              </button>
            </div>
          ) : (
            <form onSubmit={donate} className="space-y-5">
              {status === 'error' && (
                <div className="rounded bg-red-100 px-4 py-3 text-red-800">{message}</div>
              )}

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">অনুদানের পরিমাণ (₹)</label>
                <div className="mb-3 flex flex-wrap gap-2">
                  {PRESET_AMOUNTS.map((a) => (
                    <button
                      type="button"
                      key={a}
                      onClick={() => setAmount(a)}
                      className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                        amount === a ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      ₹{toBengaliDigits(a)}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min={10}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">উদ্দেশ্য</label>
                <select
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                >
                  {PURPOSES.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div className="border-t pt-4">
                <h3 className="mb-3 font-semibold text-gray-800">আপনার বিবরণ</h3>
                <div className="space-y-3">
                  <input
                    placeholder="নাম"
                    required={!anonymous}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                  />
                  <input
                    type="email"
                    placeholder="ইমেল"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                  />
                  <input
                    placeholder="ফোন নম্বর"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                  />
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
                    নাম প্রকাশ না করে অনুদান দিন
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={status === 'processing'}
                className="w-full rounded-md bg-blue-600 px-4 py-3 font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"
              >
                {status === 'processing' ? 'প্রক্রিয়াকরণ হচ্ছে…' : `₹${toBengaliDigits(amount)} অনুদান দিন`}
              </button>
              <p className="text-center text-xs text-gray-500">
                নিরাপদ পেমেন্ট Razorpay-এর মাধ্যমে। আপনার তথ্যের গোপনীয়তা রক্ষা করা হয়।
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
