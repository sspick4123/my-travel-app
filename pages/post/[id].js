import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { db, auth } from "../../src/lib/firebase";
import {
  doc, getDoc, updateDoc, setDoc, arrayUnion, arrayRemove,
  collection, addDoc, serverTimestamp, query, orderBy, getDocs, deleteDoc
} from "firebase/firestore";
import Link from "next/link";

export default function PostPage() {
  const router = useRouter();
  const { id } = router.query;

  const [post, setPost] = useState(null);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState([]);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    if (id) {
      const fetchPost = async () => {
        const docRef = doc(db, "posts", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const postData = { id: docSnap.id, ...docSnap.data() };
          setPost(postData);
          setLikeCount(postData.likeCount || 0);
          setLiked(postData.likes?.includes(auth.currentUser?.uid) || false);
        }
      };

      const fetchBookmark = async () => {
        if (!auth.currentUser) return;
        const userRef = doc(db, "users", auth.currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          setBookmarked(userData.bookmarks?.includes(id) || false);
        }
      };

      const fetchComments = async () => {
        const commentsRef = collection(db, "posts", id, "comments");
        const q = query(commentsRef, orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        const commentsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setComments(commentsData);
      };

      fetchPost();
      fetchBookmark();
      fetchComments();
    }
  }, [id]);

  const handleDelete = async () => {
    if (!auth.currentUser || auth.currentUser.uid !== post.authorId) {
      alert("삭제 권한이 없습니다.");
      return;
    }
    const confirmDelete = confirm("정말 삭제하시겠습니까?");
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "posts", id));
      alert("게시글이 삭제되었습니다.");
      router.push("/");
    } catch (e) {
      console.error("게시글 삭제 실패: ", e);
      alert("게시글 삭제에 실패했습니다.");
    }
  };

  const handleLike = async () => {
    if (!auth.currentUser) {
      alert("로그인 후 좋아요 가능.");
      return;
    }
    const docRef = doc(db, "posts", id);
    if (liked) {
      await updateDoc(docRef, {
        likes: arrayRemove(auth.currentUser.uid),
        likeCount: likeCount - 1
      });
      setLiked(false);
      setLikeCount(likeCount - 1);
    } else {
      await updateDoc(docRef, {
        likes: arrayUnion(auth.currentUser.uid),
        likeCount: likeCount + 1
      });
      setLiked(true);
      setLikeCount(likeCount + 1);
    }
  };

  const handleBookmark = async () => {
    if (!auth.currentUser) {
      alert("로그인 후 북마크 가능.");
      return;
    }
    const userRef = doc(db, "users", auth.currentUser.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      await setDoc(userRef, { bookmarks: [] });
    }

    if (bookmarked) {
      await updateDoc(userRef, {
        bookmarks: arrayRemove(id)
      });
      setBookmarked(false);
    } else {
      await updateDoc(userRef, {
        bookmarks: arrayUnion(id)
      });
      setBookmarked(true);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!auth.currentUser) {
      alert("로그인 후 댓글 작성 가능.");
      return;
    }

    if (!comment.trim()) {
      alert("댓글을 입력해주세요.")
      return;
    }
    try {
      const commentsRef = collection(db, "posts", id, "comments");
      await addDoc(commentsRef, {
        text: comment,
        authorId: auth.currentUser.uid,
        createdAt: serverTimestamp(),
      });
      setComment("");
      const snapshot = await getDocs(query(commentsRef, orderBy("createdAt", "desc")));
      const commentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setComments(commentsData);
    } catch (error) {
      alert(error.message);
    }
  };

  const handleReport = async () => {
    if (!auth.currentUser) {
      alert("로그인 후 신고 가능.");
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
      alert("신고가 접수되었습니다.");
    } catch (error) {
      alert(error.message);
    }
  };

  if (!post) return <div className="text-center mt-10">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-100">
      <main className="max-w-2xl mx-auto mt-10 bg-white p-6 rounded shadow">
        {post.thumbnailUrl && (
          <img
            src={post.thumbnailUrl}
            alt={post.title}
            className="w-full h-64 object-cover rounded mb-4"
          />
        )}

        <div className="flex space-x-2 mb-4">
          {post.category && (
            <span className="bg-blue-500 text-white rounded px-2 py-1 text-xs">
              {post.category}
            </span>
          )}
          {post.location && (
            <span className="bg-green-500 text-white rounded px-2 py-1 text-xs">
              {post.location}
            </span>
          )}
        </div>

        <h1 className="text-3xl font-bold mb-4">{post.title}</h1>
        <p className="text-gray-700 whitespace-pre-wrap mb-6">{post.content}</p>

        <div className="flex flex-wrap gap-2 mb-6">
          <button onClick={handleLike} className="bg-pink-500 text-white px-3 py-1 rounded">
            {liked ? "좋아요 취소" : "좋아요"} ({likeCount})
          </button>

          <button onClick={handleBookmark} className="bg-yellow-500 text-white px-3 py-1 rounded">
            {bookmarked ? "북마크 취소" : "북마크"}
          </button>

          {/* 수정 버튼 */}
          {auth.currentUser ? (
            auth.currentUser.uid === post.authorId ? (
              <button
                onClick={() => router.push(`/edit/${id}`)}
                className="bg-gray-500 text-white px-3 py-1 rounded"
              >
                수정하기
              </button>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  alert("수정 권한이 없습니다.");
                }}
                className="bg-gray-400 text-white px-3 py-1 rounded cursor-not-allowed"
              >
                수정하기
              </button>
            )
          ) : null}

          {auth.currentUser?.uid === post.authorId && (
            <button
              onClick={handleDelete}
              className="bg-red-600 text-white px-3 py-1 rounded"
            >
              삭제하기
            </button>
          )}

          <button onClick={handleReport} className="bg-red-500 text-white px-3 py-1 rounded">
            신고하기
          </button>
        </div>

        <form onSubmit={handleCommentSubmit} className="mb-6">
          <input
            type="text"
            placeholder="댓글 입력"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="border border-gray-300 rounded p-2 w-full mb-2"
          />
          <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
            댓글 작성
          </button>
        </form>

        <h2 className="text-xl font-bold mb-2">댓글</h2>
        <ul>
          {comments.map(c => (
            <li key={c.id} className="border-t py-2">{c.text}</li>
          ))}
        </ul>
      </main>
    </div>
  );
}
