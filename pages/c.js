// pages/C.js

import PostList from "../components/PostList";
import Link from "next/link";

export default function CPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-center text-blue-500">C 페이지</h1>

      {/* 글쓰기 버튼 */}
      <div className="flex justify-end mb-4">
        <Link href="/write?type=schedule&from=c">
          <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
            ✏️ 글쓰기
          </button>
        </Link>
      </div>

      <PostList collectionName="schedules" />
    </div>
  );
}
