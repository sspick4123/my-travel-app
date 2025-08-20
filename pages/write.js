import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../src/lib/firebase";
import { useAuth } from "../src/lib/authContext";

export default function Write() {
  const router = useRouter();
  const { user } = useAuth();
  const [type, setType] = useState(null);
  const { from } = router.query; // 🔑 for redirect after writing

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [location, setLocation] = useState("");

  useEffect(() => {
    if (router.isReady) {
      setType(router.query.type);
    }
  }, [router.isReady]);

  const handleCreatePost = async () => {
    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }

    const typeToCollection = {
      blog: "blogPosts",
      community: "communityPosts",
      schedule: "schedules",
      event: "events",
    };

    if (!type || !typeToCollection[type]) {
      alert("잘못된 접근입니다. type 파라미터가 없습니다.");
      return;
    }

    const targetCollection = typeToCollection[type];

    try {
      const docRef = await addDoc(collection(db, targetCollection), {
        title,
        content,
        thumbnailUrl,
        location,
        createdAt: serverTimestamp(),
        authorId: user.uid,
        authorEmail: user.email,
        type, // 🔍 분류용
      });

      alert("게시글이 작성되었습니다!");
      const redirectPath = `${type}/${docRef.id}`;
      setTimeout(() => router.push(redirectPath), 100);
    } catch (e) {
      console.error("게시글 작성 실패: ", e);
      alert("게시글 작성에 실패했습니다.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <main className="max-w-xl mx-auto mt-10 bg-white p-6 rounded shadow">
        <h1 className="text-2xl font-bold mb-4">✏️ 글 작성하기</h1>

        <div className="mb-4">
          <label className="block text-gray-700">제목</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-gray-300 p-2 rounded"
            placeholder="게시글 제목을 입력하세요"
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700">내용</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full border border-gray-300 p-2 rounded"
            placeholder="게시글 내용을 입력하세요"
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700">썸네일 URL</label>
          <input
            type="text"
            value={thumbnailUrl}
            onChange={(e) => setThumbnailUrl(e.target.value)}
            className="w-full border border-gray-300 p-2 rounded"
            placeholder="썸네일 이미지 URL"
          />
        </div>

        <div className="mb-6">
          <label className="block text-gray-700">지역</label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full border border-gray-300 p-2 rounded"
            placeholder="지역명 (예: 강릉)"
          />
        </div>

        <button
          onClick={handleCreatePost}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white p-2 rounded"
        >
          게시글 작성
        </button>
      </main>
    </div>
  );
}
