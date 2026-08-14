import SmartImage from './ui/SmartImage';
import { excerpt, useFmt } from '@/lib/format';
import { downloadSeoImage } from '@/lib/seoImage';
import { Download } from 'lucide-react';

export interface PostCardData {
  title: string;
  content: string;
  category: string;
  featuredImage: string;
  publishedDate: string;
}

export default function PostCard({ post, dim = false }: { post: PostCardData; dim?: boolean }) {
  const fmt = useFmt();
  return (
    <article
      className={`group flex flex-col overflow-hidden rounded-xl bg-white shadow-md ring-1 ring-gray-100 transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl ${
        dim ? 'opacity-90' : ''
      }`}
    >
      <div className="relative overflow-hidden">
        <SmartImage src={post.featuredImage} alt={post.title} className="h-52 w-full object-cover" />
        {post.featuredImage && (
          <button
            type="button"
            title="Download Post Image"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              downloadSeoImage(post.featuredImage, post.title);
            }}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-all hover:scale-110 hover:bg-orange-600 group-hover:opacity-100 shadow-md"
          >
            <Download className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5 font-sans">
        <p className="mb-2 text-xs font-medium text-amber-700">
          {post.category} · {fmt.date(post.publishedDate)}
        </p>
        <h3 className="mb-2 text-base sm:text-lg font-bold leading-snug text-gray-900 group-hover:text-amber-800 transition-colors">{post.title}</h3>
        <p className="text-xs sm:text-sm leading-relaxed text-gray-600 line-clamp-3">{excerpt(post.content, 150)}</p>
      </div>
    </article>
  );
}
