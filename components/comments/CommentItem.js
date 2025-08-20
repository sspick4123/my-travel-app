// components/comments/CommentItem.js
import { useState, useEffect, useRef } from "react";
import {
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  addDoc,
  collection,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import { db } from "../../src/lib/firebase";
import CommentInput from "./CommentInput";

const getCollectionName = (type) => {
  const map = {
    blog: "blogPosts",
    community: "communityPosts",
    schedule: "schedules",
    event: "events",
    c: "schedules",
    d: "events",
  };
  return map[type];
};

export default function CommentItem({
  comment,
  postId,
  type,
  user,
  authorNickname,
  depth = 0,
  userMap,
  setOpenReplies,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.text || "");
  const [liked, setLiked] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [mentionNames, setMentionNames] = useState([]);
  const menuRef = useRef(null);

  const collectionName = getCollectionName(type);

  // hooks는 항상 동일 순서로 실행
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (user && comment.likes?.includes(user.uid)) setLiked(true);
    else setLiked(false);
  }, [comment.likes, user]);

  useEffect(() => {
    const fetchMentionNames = async () => {
      const names = await Promise.all(
        (comment.mentions || []).map(async (m) => {
          try {
            const snap = await getDoc(doc(db, "users", m.uid));
            return snap.exists()
              ? { uid: m.uid, displayName: snap.data().displayName }
              : { uid: m.uid, displayName: "알수없음" };
          } catch {
            return { uid: m.uid, displayName: "에러" };
          }
        })
      );
      setMentionNames(names);
    };
    if (comment.mentions?.length > 0) fetchMentionNames();
  }, [comment.mentions]);

  const handleDelete = async () => {
    if (confirm("댓글을 삭제하시겠습니까?")) {
      await updateDoc(
        doc(db, collectionName, postId, "comments", comment.id),
        { deleted: true }
      );
    }
    setMenuOpen(false);
  };

  const handleUpdate = async () => {
    if (!editContent.trim()) return;
    await updateDoc(
      doc(db, collectionName, postId, "comments", comment.id),
      { text: editContent }
    );
    setEditing(false);
  };

  const handleLike = async () => {
    if (!user) {
      alert("로그인 후 이용 가능합니다.");
      return;
    }
    const ref = doc(db, collectionName, postId, "comments", comment.id);
    if (liked) {
      await updateDoc(ref, { likes: arrayRemove(user.uid) });
    } else {
      await updateDoc(ref, { likes: arrayUnion(user.uid) });
    }
  };

  return (
    <div id={`comment-${comment.id}`} className={`relative py-3 ${depth === 0 ? "" : "ml-6"}`}>
      {depth > 0 && (
        <>
          <div
            className={`absolute left-[-12px] top-0 ${
              comment.isLastReply ? "h-1/2" : "bottom-0"
            } w-px bg-gray-300`}
          ></div>
          <div className="absolute left-[-12px] top-1/2 w-3 h-px bg-gray-300"></div>
        </>
      )}

      <div className={`${depth > 0 ? "pl-4" : ""}`}>
        {comment.deleted ? (
          // ★ 삭제 표시는 그대로 노출 (메뉴/좋아요/답글 등은 비노출)
          <p className="text-gray-400 italic">댓글이 삭제되었습니다.</p>
        ) : (
          <>
            <div className="flex justify-between items-center">
              <span className="font-semibold">
                {authorNickname || "닉네임 불러오는 중..."}
              </span>
              {user?.uid === comment.authorId && (
                <button onClick={() => setMenuOpen(!menuOpen)}>⋮</button>
              )}
            </div>

            {editing ? (
              <div className="flex gap-2 mt-2">
                <input
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="flex-1 border rounded px-2"
                />
                <button
                  onClick={handleUpdate}
                  className="ml-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                >
                  수정
                </button>
              </div>
            ) : (
              <p className="mt-1">
                {mentionNames.map((m) => (
                  <span key={m.uid} className="text-blue-600 mr-1">
                    @{m.displayName}
                  </span>
                ))}
                {comment.text}
              </p>
            )}

            {!editing && (
              <div className="flex gap-3 mt-2 text-sm text-gray-500">
                <button onClick={handleLike}>
                  {liked ? "❤️" : "🤍"} {comment.likes?.length || ""}
                </button>
                <button onClick={() => setReplyOpen((p) => !p)}>
                  답글 달기
                </button>
              </div>
            )}

            {replyOpen && (
              <CommentInput
                parentCollection={collectionName}
                postId={postId}
                parentId={comment.parentId || comment.id}
                autoMentionUser={{
                  uid: comment.authorId,
                  displayName: authorNickname,
                }}
                onSubmit={async (text, mentions) => {
                  if (!user) {
                    alert("로그인 후 이용 가능합니다.");
                    return;
                  }
                  const commentsRef = collection(
                    db,
                    collectionName,
                    postId,
                    "comments"
                  );
                  await addDoc(commentsRef, {
                    text,
                    authorId: user.uid,
                    parentId: comment.parentId || comment.id,
                    mentions,
                    createdAt: serverTimestamp(),
                    likes: [],
                  });

                  if (setOpenReplies) {
                    setOpenReplies((prev) => ({
                      ...prev,
                      [comment.parentId || comment.id]: true,
                    }));
                  }

                  setReplyOpen(false);
                }}
                placeholder="답글을 입력하세요..."
              />
            )}
          </>
        )}
      </div>

      {menuOpen && !comment.deleted && (
        <div
          ref={menuRef}
          className="absolute right-0 top-6 bg-white border rounded shadow p-2"
        >
          <button
            onClick={() => {
              setEditing(true);
              setMenuOpen(false);
            }}
            className="block w-full text-left px-2 py-1 hover:bg-gray-100"
          >
            수정
          </button>
          <button
            onClick={handleDelete}
            className="block w-full text-left px-2 py-1 text-red-500 hover:bg-gray-100"
          >
            삭제
          </button>
        </div>
      )}
    </div>
  );
}