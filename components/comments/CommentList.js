import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  doc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../src/lib/firebase";
import CommentItem from "./CommentItem";
import CommentInput from "./CommentInput";

const getCollectionName = (type) => ({
  blog: "blogPosts",
  community: "communityPosts",
  schedule: "schedules",
  event: "events",
  c: "schedules",
  d: "events",
}[type]);

export default function CommentList({ postId, type, user }) {
  const [comments, setComments] = useState([]);
  const [userMap, setUserMap] = useState({});
  const [openReplies, setOpenReplies] = useState({});

  useEffect(() => {
    if (!postId || !type) return;
    const colName = getCollectionName(type);
    if (!colName) return;

    const ref = collection(db, colName, postId, "comments");
    const q = query(ref, orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((c) => c.authorId);
      setComments(list);

      // 닉네임 로딩
      const uids = [...new Set(list.map((c) => c.authorId))];
      uids.forEach((uid) => {
        if (userMap[uid]) return;
        const uref = doc(db, "users", uid);
        onSnapshot(uref, (usnap) => {
          if (usnap.exists()) {
            setUserMap((prev) => ({
              ...prev,
              [uid]: usnap.data().displayName || "알 수 없음",
            }));
          }
        });
      });
    });
    return () => unsub();
  }, [postId, type, userMap]);

  const collectionName = getCollectionName(type);

  return (
    <div className="mb-6">
      {/* 일반 댓글 입력창 복구 */}
      <CommentInput
        parentCollection={collectionName}
        postId={postId}
        onSubmit={async (text, mentions) => {
          if (!user) {
            alert("로그인 후 이용 가능합니다.");
            return;
          }
          const commentsRef = collection(db, collectionName, postId, "comments");
          await addDoc(commentsRef, {
            text,
            authorId: user.uid,
            parentId: null,
            mentions,
            createdAt: serverTimestamp(),
            likes: [],
          });
        }}
        placeholder="댓글을 입력하세요..."
      />

      {/* 부모 댓글 */}
      {comments
        .filter((c) => !c.parentId)
        .map((parent) => {
          const replies = comments.filter((c) => c.parentId === parent.id);
          const isOpen = !!openReplies[parent.id];

          return (
            <div key={parent.id} className="border-b last:border-none pb-4 mb-4">
              <CommentItem
                comment={parent}
                postId={postId}
                type={type}
                user={user}
                authorNickname={userMap[parent.authorId]}
                userMap={userMap}
                depth={0}
                setOpenReplies={setOpenReplies}
              />

              {replies.length > 0 && (
                <button
                  onClick={() =>
                    setOpenReplies((prev) => ({
                      ...prev,
                      [parent.id]: !prev[parent.id],
                    }))
                  }
                  className="ml-6 mb-2 text-sm hover:underline"
                >
                  {isOpen
                    ? "답글 숨기기"
                    : `답글 ${replies.length}개 보기`}
                </button>
              )}

              {isOpen &&
                replies.map((reply, i) => (
                  <CommentItem
                    key={reply.id}
                    comment={{
                      ...reply,
                      isLastReply: i === replies.length - 1,
                    }}
                    postId={postId}
                    type={type}
                    user={user}
                    authorNickname={userMap[reply.authorId]}
                    userMap={userMap}
                    depth={1}
                    setOpenReplies={setOpenReplies}
                  />
                ))}
            </div>
          );
        })}

      {!comments.filter((c) => !c.parentId).length && (
        <p className="text-gray-400 text-sm mt-4">아직 댓글이 없습니다.</p>
      )}
    </div>
  );
}
