import { useEffect, useState } from "react";
import Link from "next/link";
import { db } from "../src/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import PostCard from "../components/PostCard"; // ✅ PostCard import 추가

export default function HomePage() {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    const fetchPosts = async () => {
      const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };

    fetchPosts();
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-center text-blue-600">
        TravelWhere ✈️
      </h1>

      {/* 글쓰기 버튼 */}
      <div className="flex justify-end mb-6">
        <Link href="/write">
          <button className="px-5 py-2 rounded bg-green-500 text-white hover:bg-green-600 transition">
            ✏️ 글 작성하기
          </button>
        </Link>
      </div>


      {/* 게시글 카드 리스트 */}
      <div className="grid gap-6">
        {posts.map(post => (
          <PostCard key={post.id} post={post} /> // ✅ PostCard 컴포넌트로 대체
        ))}
      </div>
    </div>
  );
}
