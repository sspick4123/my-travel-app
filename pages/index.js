import Link from "next/link";
import { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import { collection, getDocs, query, orderBy, where } from "firebase/firestore";

export default function Home() {
  const [posts, setPosts] = useState([]);
  const [search, setSearch] = useState("");

  const fetchPosts = async () => {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    const postsData = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setPosts(postsData);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    const q = query(
      collection(db, "posts"),
      where("title", "==", search)
    );
    const snapshot = await getDocs(q);
    const postsData = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setPosts(postsData);
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  return (
    <div>
      <h1>게시글 목록</h1>

      {/* 🔍 검색 폼 추가 */}
      <form onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="제목 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit">검색</button>
      </form>

      {/* 게시글 목록 */}
      {posts.map((post) => (
        <Link href={`/post/${post.id}`} key={post.id}>
          <div style={{border:"1px solid gray", margin:"10px", padding:"10px", cursor:"pointer"}}>
            <h2>{post.title}</h2>
            <p>{post.content}</p>
            {post.imageUrl && <img src={post.imageUrl} alt="post image" width="200" />}
            <p>카테고리: {post.category} | 지역: {post.region}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
