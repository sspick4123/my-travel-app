import { useEffect, useState } from "react";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "../../src/lib/firebase";
import PostCard from "../PostCard";

const collectionMap = {
  blog: "blogPosts",
  community: "communityPosts",
  schedule: "schedules",
};

export default function MyLikes({ category, uid }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLikedPosts = async () => {
      setLoading(true);

      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);
      const liked = userSnap.data()?.likedPosts || [];

      // 선택된 카테고리만 필터링
      const filtered = liked
        .filter((key) => key.startsWith(`${category}-`))
        .map((key) => key.split("-")[1]); // id만 추출

      if (filtered.length === 0) {
        setPosts([]);
        setLoading(false);
        return;
      }

      // Firestore에서 해당 id들 가져오기
      const colName = collectionMap[category];
      const colRef = collection(db, colName);
      const q = query(colRef, where("__name__", "in", filtered));
      const snap = await getDocs(q);

      const list = snap.docs.map((doc) => ({
        id: doc.id,
        type: category,
        ...doc.data(),
      }));

      setPosts(list);
      setLoading(false);
    };

    fetchLikedPosts();
  }, [category, uid]);

  if (loading) {
    return <div className="text-center text-gray-500">불러오는 중...</div>;
  }

  if (posts.length === 0) {
    return <div className="text-center text-gray-400">좋아요한 글이 없습니다.</div>;
  }

  return (
    <div className="grid gap-6">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
