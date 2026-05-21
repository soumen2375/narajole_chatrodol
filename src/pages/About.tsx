import PageHeader from '@/components/ui/PageHeader';
import SmartImage from '@/components/ui/SmartImage';
import { CORE_VALUES, ORG, TEAM_MEMBERS } from '@/data/content';

export default function About() {
  return (
    <div>
      <PageHeader title="আমাদের কথা" subtitle={ORG.nameEn} />
      <div className="container mx-auto space-y-8 p-4 md:p-8">
        <section className="rounded-lg bg-white p-6 shadow-md">
          <p className="mx-auto max-w-3xl text-center text-lg leading-relaxed text-gray-700">
            নাড়াজোল ছাত্রদল (Chhatradol Social Welfare Organisation) হল একটি নিবেদিতপ্রাণ সামাজিক কল্যাণমূলক
            পাবলিক চ্যারিটেবল ট্রাস্ট যা নাড়াজোল এবং এর আশেপাশের সম্প্রদায়ের উন্নতি সাধনে কাজ করে। আমাদের লক্ষ্য হল
            শিক্ষা, স্বাস্থ্য এবং পরিবেশগত স্থিতিশীলতার মাধ্যমে একটি উজ্জ্বল ভবিষ্যৎ গড়ে তোলা।
          </p>
        </section>

        <section className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-2xl font-bold text-blue-700">আমাদের ইতিহাস</h2>
          <p className="leading-relaxed text-gray-700">
            নাড়াজোল ছাত্রদল যাত্রা শুরু করে ২০১৯ সালে, একদল স্বপ্নদর্শী ছাত্র-ছাত্রীর হাত ধরে, যারা তাদের নিজ সমাজের
            উন্নতি সাধনের স্বপ্ন দেখেছিল। প্রথমদিকে কিছু ছোট শিক্ষামূলক কর্মসূচি এবং পরিবেশ সচেতনতা বৃদ্ধির কাজ দিয়ে শুরু
            হলেও, সময়ের সাথে সাথে আমাদের কার্যক্রমের পরিধি বৃদ্ধি পেয়েছে। আমরা বিনামূল্যে টিউশন, স্বাস্থ্য শিবির,
            বৃক্ষরোপণ অভিযান এবং দুর্যোগ ত্রাণ কার্যক্রমে অংশগ্রহণ করেছি। ২০২৬ সালে সংস্থাটি একটি পাবলিক চ্যারিটেবল
            ট্রাস্ট হিসেবে নিবন্ধিত হয়।
          </p>
        </section>

        <section className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-2xl font-bold text-blue-700">আমাদের লক্ষ্য</h2>
            <p className="leading-relaxed text-gray-700">
              আমাদের লক্ষ্য হল একটি সুস্থ, শিক্ষিত এবং স্বাবলম্বী সমাজ গড়ে তোলা, যেখানে প্রতিটি মানুষ তাদের সম্পূর্ণ
              সম্ভাবনা উপলব্ধি করতে পারে। আমরা বিশ্বাস করি যে শিক্ষা, স্বাস্থ্যসেবা এবং পরিবেশ সুরক্ষা হল সমাজের মূল ভিত্তি।
            </p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-2xl font-bold text-blue-700">আমাদের ভিশন</h2>
            <p className="leading-relaxed text-gray-700">
              আমরা এমন একটি সমাজের স্বপ্ন দেখি যেখানে দারিদ্র্য নেই, অশিক্ষা নেই, এবং প্রতিটি শিশু স্বাস্থ্যকর পরিবেশে বেড়ে
              উঠতে পারে। আমরা একটি সহনশীল, ন্যায়পরায়ণ এবং সক্ষম সমাজ গঠনের জন্য কাজ করে যাচ্ছি।
            </p>
          </div>
        </section>

        <section className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-2xl font-bold text-blue-700">আমাদের মূল মূল্যবোধ</h2>
          <ul className="list-inside list-disc space-y-2 leading-relaxed text-gray-700">
            {CORE_VALUES.map((v) => (
              <li key={v.label}>
                <strong>{v.label}:</strong> {v.text}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-8 text-center text-2xl font-bold text-blue-700">আমাদের দল</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-4">
            {TEAM_MEMBERS.map((m) => (
              <div key={m.name} className="flex flex-col items-center rounded-md bg-gray-50 p-4 text-center shadow-sm">
                <SmartImage
                  src={m.img}
                  alt={m.name}
                  className="mb-4 h-32 w-32 rounded-full border-4 border-blue-200 object-cover"
                />
                <h3 className="mb-1 text-lg font-semibold text-gray-900">{m.name}</h3>
                <p className="text-sm text-blue-600">{m.role}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
