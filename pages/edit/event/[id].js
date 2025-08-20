import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { db } from "../../../src/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

export default function EditEventPost() {
  const router = useRouter();
  const { id } = router.query;

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  useEffect(() => {
    if (!id) return;
    (async () => {
      const snap = await getDoc(doc(db, "events", id));
      if (snap.exists()) {
        const data = snap.data();
        setTitle(data.title || "");
        setContent(data.content || "");
      }
    })();
  }, [id]);

  const handleSave = async () => {
    await updateDoc(doc(db, "events", id), {
      title,
      content,
    });
    alert("이벤트 수정 완료!");
    router.push(`/post/event/${id}`);
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">이벤트 수정</h1>
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
        placeholder="내용"
      />
      <button
        onClick={handleSave}
        className="bg-yellow-500 text-white px-4 py-2 rounded"
      >
        저장
      </button>
    </div>
  );
}
