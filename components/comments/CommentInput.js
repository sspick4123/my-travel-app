import { useState, useEffect } from "react";
import { db, auth } from "../../src/lib/firebase";
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  writeBatch,
  doc,
  increment,
  serverTimestamp,
} from "firebase/firestore";

function MentionTag({ displayName, onRemove }) {
  return (
    <span className="flex items-center bg-blue-100 text-blue-700 rounded-full px-2 py-1 text-sm">
      @{displayName}
      <button
        onClick={onRemove}
        className="ml-1 text-xs text-blue-600 hover:text-blue-800"
      >
        ✕
      </button>
    </span>
  );
}

export default function CommentInput({
  parentCollection, // 필수
  postId, // 필수
  parentId = null, // 대댓글일 때 ID
  autoMentionUser, // 대댓글 자동 맨션
  onSubmit, // 댓글/대댓글 저장 콜백
  placeholder = "댓글을 입력하세요...",
}) {
  const [mentions, setMentions] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [candidates, setCandidates] = useState([]);

  // 대댓글 작성 시 부모 자동 맨션
  useEffect(() => {
    if (autoMentionUser) setMentions([autoMentionUser]);
  }, [autoMentionUser]);

  // @ 자동완성 후보 조회
  const getMentionCandidates = async (term = "") => {
    const user = auth.currentUser;
    if (!user) return;
  

    // 1) mentionStats (없으면 size=0)
    const statsRef = collection(db, "users", user.uid, "mentionStats");
    let snap = await getDocs(query(statsRef, orderBy("count", "desc"), limit(5)));
    let list = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));

    // 2) 부족하면 following 보충
    if (list.length < 5) {
      const followRef = collection(db, "users", user.uid, "following");
      let followSnap = await getDocs(query(followRef, orderBy("followedAt", "desc")));

      for (const f of followSnap.docs) {
        if (list.length >= 5) break;

        const data = f.data();
        if (list.some((c) => c.uid === f.id)) continue;

        if (term && !data.displayName.toLowerCase().startsWith(term.toLowerCase())) continue;
        

        list.push({ uid: f.id, ...f.data() });
      }
    }

    // 3) term 필터
    if (term) {
      list = list.filter((c) =>
        c.displayName.toLowerCase().startsWith(term.toLowerCase())
      );
    }

    setCandidates(list.slice(0, 5));
  };

  const selectMention = (u) => {
    if (!mentions.some((m) => m.uid === u.uid)) {
      setMentions((prev) => [...prev, u]);
    }
    setShowSuggestions(false);
    setInputValue("");
  };

  const removeMention = (uid) =>
    setMentions((prev) => prev.filter((m) => m.uid !== uid));

  const handleKeyDown = (e) => {
    if (e.key === "@") {
      setShowSuggestions(true);
      getMentionCandidates("");
    }
    if (e.key === "Backspace" && !inputValue && mentions.length) {
      removeMention(mentions[mentions.length - 1].uid);
    }
  };

  const handleChange = (e) => {
    const v = e.target.value;
    setInputValue(v);
    if (showSuggestions) {
      const term = v.replace("@", "");
      getMentionCandidates(term);
    }
  };

  const handleSubmit = async () => {
    if (!inputValue.trim() && mentions.length === 0) return;
    if (!parentCollection || !postId) {
      console.error("parentCollection/postId 누락!");
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      alert("로그인 후 이용 가능합니다.");
      return;
    }

    const batch = writeBatch(db);

    // 댓글 저장 로직 실행 (기존)
    await onSubmit(inputValue, mentions);

    // ✅ mentionStats 업데이트 예외 처리
    for (const m of mentions) {
      if (
        m.uid === user.uid || // 자기 자신 맨션 제외
        parentId // 대댓글일 경우 제외
      ) {
        continue;
      }

      const statsRef = doc(db, "users", user.uid, "mentionStats", m.uid);
      batch.set(
        statsRef,
        {
          displayName: m.displayName,
          count: increment(1),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }

    await batch.commit();

    setInputValue("");
    setMentions([]);
  };

  return (
    <div className="flex items-center mt-4 mb-4 relative">
      <div className="flex flex-wrap items-center gap-1 flex-1 border rounded px-2">
        {mentions.map((m) => (
          <MentionTag
            key={m.uid}
            displayName={m.displayName}
            onRemove={() => removeMention(m.uid)}
          />
        ))}
        <input
          value={inputValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 outline-none py-2"
        />
      </div>
      <button
        onClick={handleSubmit}
        className="ml-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
      >
        {parentId ? "답글 작성" : "댓글 작성"}
      </button>

      {showSuggestions && candidates.length > 0 && (
        <div className="absolute left-0 top-full bg-white border rounded shadow mt-1 w-48 max-h-40 overflow-y-auto z-10">
          {candidates.map((u) => (
            <div
              key={u.uid}
              className="px-2 py-1 hover:bg-gray-100 cursor-pointer"
              onClick={() => selectMention(u)}
            >
              @{u.displayName}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
