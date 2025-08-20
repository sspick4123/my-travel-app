import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
} from "firebase/firestore";
import { db } from "../../src/lib/firebase";
import PostCard from "../PostCard";

const getCollectionName = (type) => {
  const map = {
    blog: "blogPosts",
    community: "communityPosts",
    schedule: "schedules",
  };
  return map[type]; 
};

export default function MyPosts({ category, uid }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const collectionName = getCollectionName(category);
      const q = query(
        collection(db, collectionName),
        where("authorId", "==", uid),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      const list = snap.docs.map((doc) => ({
        id: doc.id,
        type: category,
        ...doc.data(),
      }));
      setPosts(list);
      setLoading(false);
    };

    fetch();
  }, [category, uid]);

  if (loading) {
    return <div className="text-center text-gray-500">불러오는 중...</div>;
  }

  if (posts.length === 0) {
    return (
      <div className="text-center text-gray-400">작성한 글이 없습니다.</div>
    );
  }

  return (
    <div className="grid gap-6">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
