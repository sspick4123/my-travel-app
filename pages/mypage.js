import { useEffect, useState } from "react";
import { auth, db } from "../src/lib/firebase";
import { doc, getDoc, getDocs, collection, query, where } from "firebase/firestore";
import Link from "next/link";
import { useAuth } from "../src/lib/authContext";

export default function MyPage() {
  const { user } = useAuth();
  const [bookmarks, setBookmarks] = useState([]);
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    const fetchBookmarks = async () => {
      if (!user) return;
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        setBookmarks(userData.bookmarks || []);
      }
    };
    fetchBookmarks();
  }, [user]);

  useEffect(() => {
    const fetchPosts = async () => {
      if (bookmarks.length === 0) return;
      const postsRef = collection(db, "posts");
      const q = query(postsRef, where("__name__", "in", bookmarks));
      const snapshot = await getDocs(q);
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPosts(postsData);
    };
    fetchPosts();
  }, [bookmarks]);

  if (!user) {
    return <div>로그인 후 이용해주세요.</div>;
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1>마이페이지 - 북마크 목록</h1>
      {posts.map(post => (
        <Link href={`/post/${post.id}`} key={post.id}>
          <div>
            <h2>{post.title}</h2>
            <p>{post.content}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
