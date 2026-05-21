import SmartImage from './ui/SmartImage';
import { excerpt, useFmt } from '@/lib/format';

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
      className={`flex flex-col overflow-hidden rounded-xl bg-white shadow-md ring-1 ring-gray-100 transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl ${
        dim ? 'opacity-90' : ''
      }`}
    >
      <SmartImage src={post.featuredImage} alt={post.title} className="h-52 w-full object-cover" />
      <div className="flex flex-1 flex-col p-5">
        <p className="mb-2 text-xs font-medium text-blue-600">
          {post.category} · {fmt.date(post.publishedDate)}
        </p>
        <h3 className="mb-2 text-lg font-semibold leading-snug text-gray-900">{post.title}</h3>
        <p className="text-sm leading-relaxed text-gray-600">{excerpt(post.content, 150)}</p>
      </div>
    </article>
  );
}
