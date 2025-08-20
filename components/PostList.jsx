import { useEffect, useState } from "react";
import { db } from "../src/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import PostCard from "./PostCard";

export default function PostList({ collectionName }) {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    const fetchPosts = async () => {
      if (!collectionName) return;

      const q = query(
        collection(db, collectionName),
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(q);
      setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };

    fetchPosts();
  }, [collectionName]);

  return (
    <div className="grid gap-6">
      {posts.map(post => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
