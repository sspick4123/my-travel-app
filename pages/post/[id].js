import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { db, auth } from "../../src/lib/firebase";
import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
  arrayUnion,
  arrayRemove,
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  getDocs
} from "firebase/firestore";

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

  if (!post) return <div>Loading...</div>;

  return (
    <div>
      <h1>{post.title}</h1>
      <p>{post.content}</p>
      {post.imageUrl && <img src={post.imageUrl} alt="post image" width="300" />}
      <p>카테고리: {post.category} | 지역: {post.region}</p>

      <button onClick={handleLike}>
        {liked ? "좋아요 취소" : "좋아요"} ({likeCount})
      </button>

      <button onClick={handleBookmark}>
        {bookmarked ? "북마크 취소" : "북마크"}
      </button>

      {/* ✅ 신고 버튼 */}
      <button onClick={handleReport}>신고하기</button>

      <hr />
      <h2>댓글 작성</h2>
      <form onSubmit={handleCommentSubmit}>
        <input
          type="text"
          placeholder="댓글 입력"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <button type="submit">작성</button>
      </form>

      <h2>댓글 목록</h2>
      <ul>
        {comments.map(c => (
          <li key={c.id}>{c.text}</li>
        ))}
      </ul>
    </div>
  );
}
