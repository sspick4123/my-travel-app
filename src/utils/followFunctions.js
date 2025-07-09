import { db } from "../lib/firebase";
import { doc, setDoc, deleteDoc } from "firebase/firestore";

// 🟢 팔로우 함수
export const followUser = async (currentUser, targetUser) => {
  if (
    !currentUser || !targetUser ||
    !currentUser.uid || !targetUser.uid
  ) {
    console.error("❌ followUser: currentUser 또는 targetUser의 uid가 존재하지 않습니다.", currentUser, targetUser);
    return;
  }

  // ✅ 내 following 컬렉션에 추가
  const followingRef = doc(db, "users", currentUser.uid, "following", targetUser.uid);
  await setDoc(followingRef, {
    uid: targetUser.uid,
    displayName: targetUser.displayName || "No Name", // ✅ 기본값 처리
    profileImageUrl: targetUser.profileImageUrl || "",
    followedAt: new Date(),
  });

  // ✅ 상대방 followers 컬렉션에 추가
  const followerRef = doc(db, "users", targetUser.uid, "followers", currentUser.uid);
  await setDoc(followerRef, {
    uid: currentUser.uid,
    displayName: currentUser.displayName || "No Name", // ✅ 기본값 처리
    profileImageUrl: currentUser.profileImageUrl || "",
    followedAt: new Date(),
  });
};

// 🟢 언팔로우 함수
export const unfollowUser = async (currentUser, targetUser) => {
  if (
    !currentUser || !targetUser ||
    !currentUser.uid || !targetUser.uid
  ) {
    console.error("❌ unfollowUser: currentUser 또는 targetUser의 uid가 존재하지 않습니다.", currentUser, targetUser);
    return;
  }

  // ✅ 내 following 컬렉션에서 삭제
  const followingRef = doc(db, "users", currentUser.uid, "following", targetUser.uid);
  await deleteDoc(followingRef);

  // ✅ 상대방 followers 컬렉션에서 삭제
  const followerRef = doc(db, "users", targetUser.uid, "followers", currentUser.uid);
  await deleteDoc(followerRef);
};
