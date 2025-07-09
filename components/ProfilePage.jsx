import { useEffect, useState } from "react";
import { db } from "../src/lib/firebase";
import { doc, getDoc, getDocs, collection, query, where, updateDoc } from "firebase/firestore";
import Link from "next/link";
import ProfileHeader from "./ProfileHeader";

export default function ProfilePage({ user, targetUser, isMyPage }) {
  const [bookmarks, setBookmarks] = useState([]);
  const [posts, setPosts] = useState([]);
  const [myPosts, setMyPosts] = useState([]);
  const [likedPosts, setLikedPosts] = useState([]);
  const [activeTab, setActiveTab] = useState("myPosts");

  const uid = targetUser?.uid;

  // fetch my posts
  useEffect(() => {
    if (!uid) return;
    const fetchMyPosts = async () => {
      const q = query(collection(db, "posts"), where("authorId", "==", uid));
      const snapshot = await getDocs(q);
      setMyPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchMyPosts();
  }, [uid]);

  // fetch liked posts
  useEffect(() => {
    if (!uid) return;
    const fetchLikedPosts = async () => {
      const q = query(collection(db, "posts"), where("likes", "array-contains", uid));
      const snapshot = await getDocs(q);
      setLikedPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchLikedPosts();
  }, [uid]);

  // fetch bookmarks (only my page)
  useEffect(() => {
    if (!isMyPage) return;
    const fetchBookmarks = async () => {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        setBookmarks(data.bookmarks || []);
      }
    };
    fetchBookmarks();
  }, [isMyPage, user]);

  // fetch bookmarked posts
  useEffect(() => {
    if (!isMyPage || bookmarks.length === 0) {
      setPosts([]);
      return;
    }

    const fetchPosts = async () => {
      const q = query(collection(db, "posts"), where("__name__", "in", bookmarks));
      const snapshot = await getDocs(q);
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      // remove deleted post IDs from bookmarks
      const existingIds = snapshot.docs.map(doc => doc.id);
      if (existingIds.length !== bookmarks.length) {
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
          bookmarks: existingIds,
        });
        setBookmarks(existingIds);
      }

      setPosts(postsData);
    };
    fetchPosts();
  }, [bookmarks, isMyPage, user]);

  const currentPosts =
    activeTab === "myPosts" ? myPosts :
    activeTab === "likedPosts" ? likedPosts :
    posts;

  return (
    <div className="min-h-screen bg-gray-100">
      <main className="max-w-4xl mx-auto p-6 bg-white rounded shadow mt-10">
        <ProfileHeader user={user} targetUser={!isMyPage ? targetUser : null} />

        {/* 탭 메뉴 */}
        <div className="flex space-x-4 mt-6 border-b pb-2">
          <button
            className={`pb-2 ${activeTab === "myPosts" ? "border-b-2 border-blue-500 font-semibold" : ""}`}
            onClick={() => setActiveTab("myPosts")}
          >
            {isMyPage ? "내가 쓴 글" : "작성 글"}
          </button>
          <button
            className={`pb-2 ${activeTab === "likedPosts" ? "border-b-2 border-blue-500 font-semibold" : ""}`}
            onClick={() => setActiveTab("likedPosts")}
          >
            좋아요 누른 글
          </button>
          {isMyPage && (
            <button
              className={`pb-2 ${activeTab === "bookmarkedPosts" ? "border-b-2 border-blue-500 font-semibold" : ""}`}
              onClick={() => setActiveTab("bookmarkedPosts")}
            >
              북마크한 글
            </button>
          )}
        </div>

        {/* 글 목록 */}
        <section className="mt-6">
          {currentPosts.length > 0 ? (
            <div className="space-y-4">
              {currentPosts.map(post => (
                <Link href={`/post/${post.id}`} key={post.id}>
                  <div className="border p-4 rounded hover:shadow cursor-pointer">
                    <h3 className="text-xl font-bold">{post.title}</h3>
                    <p className="text-gray-700 mt-2">{post.content}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">표시할 글이 없습니다.</p>
          )}
        </section>
      </main>
    </div>
  );
}
