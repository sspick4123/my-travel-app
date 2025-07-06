// pages/index.js
console.log("🔥 최종 배포 테스트");  // 이 줄이 콘솔에 찍혀야 함

import Link from "next/link";
import { useEffect, useState } from "react";
import { db } from "../src/lib/firebase";
import { collection, getDocs, query, orderBy, where } from "firebase/firestore";

export default function Home() {
  const [posts, setPosts] = useState([]);
  const [search, setSearch] = useState("");

  const fetchPosts = async () => {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    const q = query(collection(db, "posts"), where("title", "==", search));
    const snapshot = await getDocs(q);
    setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  useEffect(() => { fetchPosts(); }, []);

  return (
    <div>
      <h1>게시글 목록</h1>
      <form onSubmit={handleSearch}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="제목 검색" />
        <button>검색</button>
      </form>
      {posts.map(post => (
        <Link key={post.id} href={`/post/${post.id}`}>
          <div>
            <h2>{post.title}</h2>
            <p>{post.content}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
