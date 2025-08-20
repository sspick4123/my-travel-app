import { useEffect, useState } from "react";
import { db } from "../../src/lib/firebase";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
} from "firebase/firestore";
import PostCard from "../PostCard";

export default function ScheduleTabContent({ userId, activeFilter }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId || !activeFilter) return;
    setLoading(true);

    const fetchPosts = async () => {
      try {
        let data = [];

        if (activeFilter === "written") {
          const q = query(
            collection(db, "schedules"),
            where("authorId", "==", userId)
          );
          const snap = await getDocs(q);
          data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        }

        if (activeFilter === "likes" || activeFilter === "bookmarks") {
          const subCollection = activeFilter === "likes" ? "likes" : "bookmarks";
          const q = query(
            collection(db, "users", userId, subCollection),
            where("type", "==", "schedule")
          );
          const snap = await getDocs(q);
          const ids = snap.docs.map((doc) => doc.data().postId);

          const promises = ids.map((id) =>
            getDoc(doc(db, "schedules", id))
          );
          const results = await Promise.all(promises);
          data = results
            .filter((doc) => doc.exists())
            .map((doc) => ({ id: doc.id, ...doc.data() }));
        }

        if (activeFilter === "comments") {
          data = []; // 댓글 필터는 추후 구현 예정
        }

        setPosts(data);
      } catch (err) {
        console.error(err);
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [userId, activeFilter]);

  if (loading) return <p>로딩 중...</p>;
  if (posts.length === 0) return <p>표시할 게시글이 없습니다.</p>;

  return (
    <div className="grid grid-cols-1 gap-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} type="schedule" />
      ))}
    </div>
  );
}
