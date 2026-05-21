import { Link } from 'react-router-dom';
import PageHeader from '@/components/ui/PageHeader';
import SmartImage from '@/components/ui/SmartImage';
import { PROGRAMS } from '@/data/content';

export default function Programs() {
  return (
    <div>
      <PageHeader
        title="আমাদের কর্মসূচি"
        subtitle="শিক্ষা, স্বাস্থ্য, পরিবেশ ও সমাজসেবায় আমাদের নিয়মিত উদ্যোগসমূহ"
      />
      <div className="container mx-auto px-4 py-10 md:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {PROGRAMS.map((p) => (
            <div key={p.title} className="rounded-lg bg-white p-6 shadow-md transition hover:shadow-lg">
              <div className="mb-4 flex items-center gap-4">
                <SmartImage src={p.icon} alt="" className="h-12 w-12 rounded-full object-contain" />
                <h3 className="text-xl font-semibold text-gray-900">{p.title}</h3>
              </div>
              <p className="mb-3 leading-relaxed text-gray-700">{p.description}</p>
              <p className="text-sm italic leading-relaxed text-gray-500">{p.details}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-lg bg-blue-50 p-8 text-center">
          <h2 className="mb-3 text-2xl font-bold text-blue-800">আমাদের সাথে যোগ দিন</h2>
          <p className="mx-auto mb-6 max-w-2xl text-gray-700">
            আপনিও হতে পারেন এই পরিবর্তনের অংশীদার। স্বেচ্ছাসেবক হিসেবে যুক্ত হয়ে সমাজ গঠনে অবদান রাখুন।
          </p>
          <Link
            to="/volunteer"
            className="inline-block rounded-full bg-green-500 px-8 py-3 font-bold text-white shadow-lg transition hover:bg-green-600"
          >
            স্বেচ্ছাসেবক হোন
          </Link>
        </div>
      </div>
    </div>
  );
}
