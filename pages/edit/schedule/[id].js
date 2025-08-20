import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { db } from "../../../src/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

export default function EditSchedulePost() {
  const router = useRouter();
  const { id } = router.query;

  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [plan, setPlan] = useState("");

  useEffect(() => {
    if (!id) return;
    (async () => {
      const snap = await getDoc(doc(db, "schedules", id));
      if (snap.exists()) {
        const data = snap.data();
        setTitle(data.title || "");
        setDate(data.date || "");
        setPlan(data.plan || "");
      }
    })();
  }, [id]);

  const handleSave = async () => {
    await updateDoc(doc(db, "schedules", id), {
      title,
      date,
      plan,
    });
    alert("일정 수정 완료!");
    router.push(`/post/schedule/${id}`);
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">일정 수정</h1>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full border p-2 mb-4"
        placeholder="일정 제목"
      />
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="w-full border p-2 mb-4"
      />
      <textarea
        value={plan}
        onChange={(e) => setPlan(e.target.value)}
        className="w-full border p-2 mb-4 h-40"
        placeholder="일정 세부계획"
      />
      <button
        onClick={handleSave}
        className="bg-purple-500 text-white px-4 py-2 rounded"
      >
        저장
      </button>
    </div>
  );
}
