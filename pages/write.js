// 🔧 파일 위치: pages/write.js

import { useState } from "react";
import { useRouter } from "next/router";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../src/lib/firebase"; // 너의 firebase 초기화 경로에 맞게 수정
import { useAuth } from "../src/lib/authContext"; // 로그인 상태 확인용, 경로 확인 후 수정

export default function Write() {
  const router = useRouter();
  const { user } = useAuth(); // 현재 로그인 유저

  // 🔧 input state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");

  // 🔧 글 작성 함수
  const handleCreatePost = async () => {
    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }

    try {
      await addDoc(collection(db, "posts"), {
        title,
        content,
        thumbnailUrl,
        category,
        location,
        createdAt: serverTimestamp(),
        authorId: user.uid,
        authorEmail: user.email,
      });
      alert("게시글이 작성되었습니다!");
      router.push("/"); // 작성 후 홈으로 이동
    } catch (e) {
      console.error("게시글 작성 실패: ", e);
      alert("게시글 작성에 실패했습니다.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">

      <main className="max-w-xl mx-auto mt-10 bg-white p-6 rounded shadow">
        <h1 className="text-2xl font-bold mb-4">✏️ 글 작성하기</h1>

        {/* Title Input */}
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

        {/* Content Input */}
        <div className="mb-4">
          <label className="block text-gray-700">내용</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full border border-gray-300 p-2 rounded"
            placeholder="게시글 내용을 입력하세요"
          />
        </div>

        {/* Thumbnail URL Input */}
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

        {/* Category Input */}
        <div className="mb-4">
          <label className="block text-gray-700">카테고리</label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full border border-gray-300 p-2 rounded"
            placeholder="카페, 맛집, 관광 등"
          />
        </div>

        {/* Location Input */}
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

        {/* Submit Button */}
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
