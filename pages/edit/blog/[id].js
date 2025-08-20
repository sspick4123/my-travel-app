import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { db } from "../../../src/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

export default function EditBlogPost() {
  const router = useRouter();
  const { id } = router.query;

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");

  useEffect(() => {
    if (!id) return;
    (async () => {
      const snap = await getDoc(doc(db, "blogPosts", id));
      if (snap.exists()) {
        const data = snap.data();
        setTitle(data.title || "");
        setContent(data.content || "");
        setThumbnailUrl(data.thumbnailUrl || "");
      }
    })();
  }, [id]);

  const handleSave = async () => {
    await updateDoc(doc(db, "blogPosts", id), {
      title,
      content,
      thumbnailUrl,
    });
    alert("수정 완료!");
    router.push(`/post/blog/${id}`);
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">블로그 글 수정</h1>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full border p-2 mb-4"
        placeholder="제목"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full border p-2 mb-4 h-40"
        placeholder="본문"
      />
      <input
        value={thumbnailUrl}
        onChange={(e) => setThumbnailUrl(e.target.value)}
        className="w-full border p-2 mb-4"
        placeholder="썸네일 URL"
      />
      <button
        onClick={handleSave}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        저장
      </button>
    </div>
  );
}
