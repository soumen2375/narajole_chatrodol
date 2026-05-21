import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-6xl font-extrabold text-blue-700">৪০৪</h1>
      <p className="mt-4 text-xl text-gray-700">দুঃখিত, পৃষ্ঠাটি খুঁজে পাওয়া যায়নি।</p>
      <Link to="/" className="mt-6 rounded-full bg-blue-600 px-6 py-2 font-semibold text-white hover:bg-blue-700">
        হোমে ফিরে যান
      </Link>
    </div>
  );
}
