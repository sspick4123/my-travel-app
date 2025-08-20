// src/lib/fetchUserPosts.js

import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebase";

// 🔹 likes 또는 bookmarks를 기반으로 특정 타입의 post 배열을 가져오는 함수
export async function fetchUserInteractionPosts(userId, interactionType, postType) {
  const ref = collection(db, "users", userId, interactionType); // likes or bookmarks
  const q = query(ref, where("type", "==", postType));
  const snap = await getDocs(q);

  const postPromises = snap.docs.map(async (docSnap) => {
    const postId = docSnap.data().postId;
    const postRef = doc(db, getPostCollectionName(postType), postId);
    const postSnap = await getDoc(postRef);
    return postSnap.exists() ? { id: postSnap.id, ...postSnap.data() } : null;
  });

  const posts = await Promise.all(postPromises);
  return posts.filter(Boolean);
}

// 🔹 postType을 컬렉션 이름으로 변환해주는 유틸
function getPostCollectionName(type) {
  return {
    blog: "blogPosts",
    community: "communityPosts",
    schedule: "schedules",
    event: "events",
  }[type] || "blogPosts";
}
