import PageHeader from '@/components/ui/PageHeader';
import SmartImage from '@/components/ui/SmartImage';
import { SUCCESS_STORIES, TESTIMONIALS } from '@/data/content';

export default function Impacts() {
  return (
    <div>
      <PageHeader
        title="প্রভাব"
        subtitle="নাড়াজোল ছাত্রদলের কার্যক্রমগুলি কীভাবে সম্প্রদায়ের জীবনে ইতিবাচক পরিবর্তন আনছে"
      />
      <div className="container mx-auto px-4 py-10 md:px-8">
        <section className="mb-12">
          <h2 className="mb-8 text-center text-2xl font-bold text-blue-700">সাক্ষ্য</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <div key={t.author} className="flex flex-col rounded-lg bg-white p-6 shadow-md">
                <svg className="mb-3 h-8 w-8 text-blue-200" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7.17 6A5.17 5.17 0 002 11.17V18h6.83v-6.83H5.5A1.67 1.67 0 017.17 9.5V6zm9 0A5.17 5.17 0 0011 11.17V18h6.83v-6.83H14.5a1.67 1.67 0 011.67-1.67V6z" />
                </svg>
                <p className="flex-grow leading-relaxed text-gray-700">{t.quote}</p>
                <div className="mt-4">
                  <p className="font-semibold text-gray-900">{t.author}</p>
                  <p className="text-sm text-blue-600">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-8 text-center text-2xl font-bold text-blue-700">সাফল্যের গল্প</h2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {SUCCESS_STORIES.map((s) => (
              <div key={s.title} className="overflow-hidden rounded-lg bg-white shadow-md">
                <SmartImage src={s.img} alt={s.title} className="h-56 w-full object-cover" />
                <div className="p-6">
                  <h3 className="mb-2 text-xl font-semibold text-gray-900">{s.title}</h3>
                  <p className="leading-relaxed text-gray-700">{s.summary}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg bg-blue-700 p-8 text-center text-white">
          <h2 className="mb-3 text-2xl font-bold">আমাদের রিপোর্ট</h2>
          <p className="mx-auto max-w-2xl text-blue-100">
            আমরা স্বচ্ছতায় বিশ্বাসী। আমাদের সকল কার্যক্রম ও আর্থিক হিসাব নিয়মিতভাবে নথিভুক্ত করা হয় এবং চার্টার্ড
            অ্যাকাউন্ট্যান্ট দ্বারা নিরীক্ষিত হয়।
          </p>
        </section>
      </div>
    </div>
  );
}
