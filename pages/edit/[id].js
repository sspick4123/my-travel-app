import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db, auth } from "../../src/lib/firebase";

export default function EditPost() {
  const router = useRouter();
  const { id } = router.query;

  const [post, setPost] = useState(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");

  useEffect(() => {
    if (!id) return;

    const fetchPost = async () => {
      const docRef = doc(db, "posts", id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.authorId !== auth.currentUser?.uid) {
          alert("수정 권한이 없습니다.");
          router.push("/");
          return;
        }
        setPost(data);
        setTitle(data.title || "");
        setContent(data.content || "");
        setThumbnailUrl(data.thumbnailUrl || "");
        setCategory(data.category || "");
        setLocation(data.location || "");
      } else {
        alert("게시글을 찾을 수 없습니다.");
        router.push("/");
      }
    };

    fetchPost();
  }, [id, router]);

  const handleUpdate = async () => {
    if (!title.trim() || !content.trim()) {
      alert("제목과 내용을 입력해주세요.");
      return;
    }

    try {
      const docRef = doc(db, "posts", id);
      await updateDoc(docRef, {
        title,
        content,
        thumbnailUrl,
        category,
        location,
        updatedAt: new Date(),
      });
      alert("게시글이 수정되었습니다.");
      router.push(`/post/${id}`);
    } catch (e) {
      console.error("게시글 수정 실패: ", e);
      alert("게시글 수정에 실패했습니다.");
    }
  };

  if (!post) return <div className="text-center mt-10">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-100">
        
      <main className="max-w-xl mx-auto mt-10 bg-white p-6 rounded shadow">
        <h1 className="text-2xl font-bold mb-4">✏️ 글 수정하기</h1>

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

        {/* Update Button */}
        <button
          onClick={handleUpdate}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white p-2 rounded"
        >
          게시글 수정
        </button>
      </main>
    </div>
  );
}
