import { useEffect, useState } from "react";
import { db } from "../src/lib/firebase";
import { doc, getDoc, getDocs, collection, query, where } from "firebase/firestore";
import Link from "next/link";
import { useAuth } from "../lib/authContext";

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
        ...doc.data()
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

      {/* ✅ 북마크 목록 그리드 */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
        gap: "20px",
        marginTop: "20px"
      }}>
        {posts.map(post => (
          <Link href={`/post/${post.id}`} key={post.id}>
            <div style={{
              border: "1px solid #ddd",
              borderRadius: "8px",
              overflow: "hidden",
              cursor: "pointer",
              boxShadow: "0 2px 5px rgba(0,0,0,0.1)"
            }}>
              {post.imageUrl && (
                <img
                  src={post.imageUrl}
                  alt="thumbnail"
                  style={{ width: "100%", height: "150px", objectFit: "cover" }}
                />
              )}
              <div style={{ padding: "10px" }}>
                <h3 style={{ margin: "0 0 10px 0" }}>{post.title}</h3>
                <p style={{ fontSize: "14px", color: "#555" }}>
                  {post.content.length > 50
                    ? post.content.substring(0, 50) + "..."
                    : post.content}
                </p>
                <p style={{ fontSize: "12px", color: "#999", marginTop: "10px" }}>
                  작성일: {post.createdAt && post.createdAt.toDate().toLocaleDateString()}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
