import Link from "next/link";

export default function PostCard({ post }) {
  return (
    <Link href={`/post/${post.id}`} legacyBehavior>
      <a>
        <div className="border rounded-lg bg-white shadow hover:shadow-lg transition cursor-pointer overflow-hidden">
          {/* 썸네일 이미지 */}
          {post.thumbnailUrl && (
            <img
              src={post.thumbnailUrl}
              alt={post.title}
              className="w-full h-48 object-cover"
            />
          )}

          <div className="p-6">
            {/* 카테고리, 지역 태그 */}
            <div className="flex space-x-2 mb-2">
              {post.category && (
                <span className="bg-blue-500 text-white rounded px-2 py-1 text-xs">
                  {post.category}
                </span>
              )}
              {post.location && (
                <span className="bg-green-500 text-white rounded px-2 py-1 text-xs">
                  {post.location}
                </span>
              )}
            </div>

            {/* 제목 */}
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">
              {post.title}
            </h2>

            {/* 내용 */}
            <p className="text-gray-600">{post.content}</p>
          </div>
        </div>
      </a>
    </Link>
  );
}
