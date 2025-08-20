import { db } from "../lib/firebase";
import {
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  collection,
  getDocs,
  updateDoc,
} from "firebase/firestore";

// — 기존 follow / unfollow 기능은 그대로 유지 —

// 팔로우
export const followUser = async (currentUser, targetUser) => {
  if (!currentUser?.uid || !targetUser?.uid) return;
  const curSnap = await getDoc(doc(db, "users", currentUser.uid));
  const myName = (curSnap.exists() ? curSnap.data().displayName : currentUser.displayName) || "No Name";

  await setDoc(
    doc(db, "users", currentUser.uid, "following", targetUser.uid),
    {
      uid: targetUser.uid,
      displayName: targetUser.displayName,
      profileImageUrl: targetUser.profileImageUrl || "",
      followedAt: new Date(),
    }
  );
  await setDoc(
    doc(db, "users", targetUser.uid, "followers", currentUser.uid),
    {
      uid: currentUser.uid,
      displayName: myName,
      profileImageUrl: currentUser.profileImageUrl || "",
      followedAt: new Date(),
    }
  );
};

// 언팔로우
export const unfollowUser = async (currentUser, targetUser) => {
  if (!currentUser?.uid || !targetUser?.uid) return;
  await deleteDoc(doc(db, "users", currentUser.uid, "following", targetUser.uid));
  await deleteDoc(doc(db, "users", targetUser.uid, "followers", currentUser.uid));
};

// ——————————
//  변경 추가: followers 서브컬렉션 내 내 닉네임 업데이트
// ——————————
export const updateFollowersDisplayName = async ({ uid, displayName }) => {
  if (!uid) return;
  const snap = await getDocs(collection(db, "users", uid, "followers"));
  await Promise.all(
    snap.docs.map(d =>
      updateDoc(
        doc(db, "users", uid, "followers", d.id),
        { displayName }
      )
    )
  );
};

// ——————————
//  변경 추가: following 서브컬렉션 내 내 닉네임 업데이트
// ——————————
export const updateFollowingDisplayName = async ({ uid, displayName }) => {
  if (!uid) return;
  const usersSnap = await getDocs(collection(db, "users"));
  await Promise.all(
    usersSnap.docs.map(async u => {
      const ref = doc(db, "users", u.id, "following", uid);
      if ((await getDoc(ref)).exists()) {
        await updateDoc(ref, { displayName });
      }
    })
  );
};
