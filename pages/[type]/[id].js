import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { db, auth } from "../../src/lib/firebase";
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  serverTimestamp,
  query,
  getDocs,
  where,
  increment,
} from "firebase/firestore";
import Link from "next/link";
import CommentList from "../../components/comments/CommentList";

export default function PostPage() {
  const router = useRouter();
  const { id, type } = router.query;

  // ✅ 스크롤 & 강조 + 대댓글 자동 펼치기 (이 블록만 교체/추가)
  useEffect(() => {
    if (!router.isReady) return;

    // 1) 타겟 댓글 ID 추출 (?commentId=... 또는 #comment-...)
    const searchId =
      (typeof router.query.commentId === "string" && router.query.commentId) || null;
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    const hashMatch = hash?.startsWith("#comment-") ? hash.replace("#comment-", "") : null;
    const targetId = searchId || hashMatch;
    if (!targetId) return;

    // 2) 강조 + 스크롤
    const highlight = (el) => {
      try { el.scrollIntoView({ behavior: "smooth", block: "center" }); } catch (_) {}
      el.classList.add(
        "ring-4",
        "ring-yellow-400",
        "bg-yellow-50",
        "transition",
        "duration-700",
        "animate-pulse"
      );
      setTimeout(() => {
        el.classList.remove("ring-4", "ring-yellow-400", "animate-pulse");
        setTimeout(() => el.classList.remove("bg-yellow-50"), 600);
      }, 2500);
    };

    const tryScroll = () => {
      const el = document.getElementById(`comment-${targetId}`);
      if (!el) return false;
      highlight(el);
      return true;
    };

    // 3) 접힌 스레드 자동 펼치기
    // - 버튼/링크/role=button/summary 등을 광범위하게 탐색
    // - "답글 달기" 같은 작성/행동 버튼은 제외
    const clicked = new WeakSet();
    const TOGGLE_TEXT = /(답글|대댓글|댓글)\s*(보기|펼치기|열기|더\s*보기|\d+\s*개)|더\s*보기/i;
    const EXCLUDE_TEXT = /(답글\s*달기|수정|삭제|신고|좋아요|북마크)/i;

    const expandRepliesGreedy = () => {
      const nodes = Array.from(
        document.querySelectorAll('button, a, [role="button"], summary')
      );
      const candidates = nodes.filter((el) => {
        if (clicked.has(el)) return false;
        const t = (el.textContent || "").replace(/\s+/g, " ").trim();
        if (!t) return false;
        if (EXCLUDE_TEXT.test(t)) return false;
        return TOGGLE_TEXT.test(t);
      });

      // 한 번에 너무 많이 누르지 않도록 상한
      const toClick = candidates.slice(0, 12);
      toClick.forEach((el) => {
        clicked.add(el);
        try { el.click(); } catch (_) {}
      });

      return toClick.length > 0;
    };

    // 4) 즉시 시도 → 실패 시 Observer + 주기적 재시도(최대 10초)
    if (tryScroll()) return;

    const obs = new MutationObserver(() => {
      // 스크롤 먼저 시도
      if (tryScroll()) {
        obs.disconnect();
        return;
      }
      // 아직 없으면 펼치기 시도
      expandRepliesGreedy();
    });
    obs.observe(document.body, { childList: true, subtree: true });

    const start = performance.now();
    const interval = setInterval(() => {
      if (tryScroll()) {
        clearInterval(interval);
        obs.disconnect();
        return;
      }
      // 주기적으로도 펼치기 시도 (딥/지연 렌더 대비)
      expandRepliesGreedy();

      if (performance.now() - start > 10000) {
        clearInterval(interval);
        obs.disconnect();
      }
    }, 250);

    return () => {
      obs.disconnect();
      clearInterval(interval);
    };
  }, [router.isReady, router.query.commentId]);
  // ✅ 끝

  const [post, setPost] = useState(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [bookmarked, setBookmarked] = useState(false);
  const [comment, setComment] = useState("");

  const getCollectionName = (type) => {
    const map = {
      blog: "blogPosts",
      community: "communityPosts",
      schedule: "schedules",
      event: "events",
      
    };
    return map[type];
  };

  // 게시글 불러오기
  useEffect(() => {
    if (!router.isReady || !id || !type) return;

    const collectionName = getCollectionName(type);
    if (!collectionName) return;

    (async () => {
      try {
        const snap = await getDoc(doc(db, collectionName, id));
        if (snap.exists()) {
          const data = { id: snap.id, ...snap.data() };
          setPost(data);
          setLikeCount(data.likeCount || 0);

          // 좋아요 상태 체크
          const uid = auth.currentUser?.uid;
          if (uid) {
            const userLikesRef = collection(db, "users", uid, "likes");
            const q = query(
              userLikesRef,
              where("postId", "==", id),
              where("type", "==", type)
            );
            const likeSnap = await getDocs(q);
            setLiked(!likeSnap.empty);
          } else {
            setLiked(false);
          }
        } else {
          console.error("게시글 문서 없음");
        }
      } catch (err) {
        console.error("게시글 불러오기 오류:", err);
      }
    })();
  }, [router.isReady, id, type]);

  // 북마크 상태 체크
  useEffect(() => {
    if (!post || !auth.currentUser || !type) return;

    const collectionName = getCollectionName(type);
    if (!collectionName) return;

    (async () => {
      try {
        const uid = auth.currentUser.uid;
        const userBookmarksRef = collection(db, "users", uid, "bookmarks");
        const q = query(
          userBookmarksRef,
          where("postId", "==", id),
          where("type", "==", type)
        );
        const snap = await getDocs(q);
        setBookmarked(!snap.empty);
      } catch (err) {
        console.error("북마크 상태 체크 실패:", err);
      }
    })();
  }, [post, id, type]);

  const handleEdit = () => router.push(`/edit/${type}/${id}`);

  const handleDelete = async () => {
    const collectionName = getCollectionName(type);
    if (!collectionName) return;

    if (!auth.currentUser || auth.currentUser.uid !== post.authorId) {
      alert("삭제 권한이 없습니다.");
      return;
    }

    if (!confirm("정말 삭제하시겠습니까?")) return;

    try {
      await deleteDoc(doc(db, collectionName, id));
      alert("삭제 완료");
      router.push("/");
    } catch (err) {
      console.error("삭제 오류:", err);
    }
  };

  // 좋아요
  const handleLike = async () => {
    const collectionName = getCollectionName(type);
    if (!auth.currentUser || !collectionName) {
      alert("로그인 후 이용해주세요.");
      return;
    }

    const uid = auth.currentUser.uid;
    const postRef = doc(db, collectionName, id);
    const userLikesRef = collection(db, "users", uid, "likes");

    try {
      if (liked) {
        const q = query(
          userLikesRef,
          where("postId", "==", id),
          where("type", "==", type)
        );
        const snap = await getDocs(q);
        snap.forEach(async (docSnap) => await deleteDoc(docSnap.ref));
        await updateDoc(postRef, { likeCount: increment(-1) });
        setLiked(false);
        setLikeCount((prev) => prev - 1);
      } else {
        const q = query(
          userLikesRef,
          where("postId", "==", id),
          where("type", "==", type)
        );
        const snap = await getDocs(q);

        if (snap.empty) {
          await addDoc(userLikesRef, {
            type,
            postId: id,
            createdAt: serverTimestamp(),
          });
          await updateDoc(postRef, { likeCount: increment(1) });
          setLiked(true);
          setLikeCount((prev) => prev + 1);
        }
      }
    } catch (err) {
      console.error("좋아요 오류:", err);
    }
  };

  // 북마크
  const handleBookmark = async () => {
    if (!auth.currentUser) {
      alert("로그인 후 북마크 가능");
      return;
    }

    const collectionName = getCollectionName(type);
    if (!collectionName) return;

    const uid = auth.currentUser.uid;
    const userBookmarksRef = collection(db, "users", uid, "bookmarks");

    try {
      if (bookmarked) {
        const q = query(
          userBookmarksRef,
          where("postId", "==", id),
          where("type", "==", type)
        );
        const snap = await getDocs(q);
        snap.forEach(async (docSnap) => await deleteDoc(docSnap.ref));
        setBookmarked(false);
      } else {
        const q = query(
          userBookmarksRef,
          where("postId", "==", id),
          where("type", "==", type)
        );
        const snap = await getDocs(q);

        if (snap.empty) {
          await addDoc(userBookmarksRef, {
            type,
            postId: id,
            createdAt: serverTimestamp(),
          });
          setBookmarked(true);
        }
      }
    } catch (err) {
      console.error("북마크 오류:", err);
    }
  };

  // 댓글 작성
  const addComment = async () => {
    if (!auth.currentUser) {
      alert("로그인 후 댓글 작성 가능");
      return;
    }
    if (!comment.trim()) return;

    const collectionName = getCollectionName(type);
    const commentsRef = collection(db, collectionName, id, "comments");

    try {
      await addDoc(commentsRef, {
        text: comment,
        authorId: auth.currentUser.uid,
        createdAt: serverTimestamp(),
        parentId: null,
        likes: [],
      });
      setComment(""); // 입력창 초기화
    } catch (err) {
      console.error("댓글 작성 오류:", err);
    }
  };

  // 신고하기
  const handleReport = async () => {
    if (!auth.currentUser) {
      alert("로그인 후 신고 가능");
      return;
    }
    const reason = prompt("신고 사유를 입력해주세요.");
    if (!reason) return;

    try {
      await addDoc(collection(db, "reports"), {
        postId: id,
        reason,
        reporterId: auth.currentUser.uid,
        createdAt: serverTimestamp(),
      });
      alert("신고 완료");
    } catch (err) {
      console.error("신고 오류:", err);
    }
  };

  if (!post) return <div className="text-center mt-10">로딩 중...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-3xl mx-auto bg-white rounded shadow p-6">
        {post.thumbnailUrl && (
          <img
            src={post.thumbnailUrl}
            alt={post.title}
            className="w-full h-64 object-cover rounded mb-6"
          />
        )}
        <h1 className="text-3xl font-bold mb-4">{post.title}</h1>
        <div className="text-gray-700 whitespace-pre-line mb-6">
          {post.content}
        </div>

        <div className="flex items-center space-x-3 mb-6">
          {/* 좋아요 버튼 */}
          <button
            onClick={handleLike}
            className={`border px-4 py-2 rounded text-base font-semibold flex items-center ${
              liked
                ? "text-red-500 border-red-500"
                : "text-gray-700 border-gray-700"
            }`}
          >
            좋아요 {likeCount}
            <span className="ml-2 text-lg">{liked ? "♥" : "♡"}</span>
          </button>

          {/* 북마크 버튼 */}
          <button
            onClick={handleBookmark}
            className={`border px-4 py-2 rounded text-base font-semibold flex items-center ${
              bookmarked
                ? "text-yellow-500 border-yellow-500"
                : "text-gray-700 border-gray-700"
            }`}
          >
            북마크
            <span className="ml-2 text-lg">{bookmarked ? "★" : "☆"}</span>
          </button>

          {/* 수정 / 삭제 버튼 */}
          {auth.currentUser?.uid === post.authorId ? (
            <div className="flex items-center space-x-3 ml-auto">
              <button
                onClick={handleEdit}
                className="text-gray-700 border border-gray-700 px-4 py-2 rounded text-base font-semibold flex items-center"
              >
                수정
                <span className="ml-2">✏️</span>
              </button>
              <button
                onClick={handleDelete}
                className="text-gray-700 border border-gray-700 px-4 py-2 rounded text-base font-semibold flex items-center"
              >
                삭제
                <span className="ml-2">🗑️</span>
              </button>
            </div>
          ) : (
            <button
              onClick={handleReport}
              className="ml-auto text-sm text-red-500 underline"
            >
              신고하기
            </button>
          )}
        </div>

        {/* 댓글 입력 */}
        <hr className="my-6 border-gray-300" />
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-2">댓글</h2>

          
        </div>

        {/* 댓글 리스트 */}
        <CommentList postId={id} type={type} user={auth.currentUser} />
      </div>
    </div>
  );
}
