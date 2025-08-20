import { useEffect, useState } from "react";
import { db } from "../src/lib/firebase";
import {
  doc,
  getDoc,
  onSnapshot,
  collection
} from "firebase/firestore";
import ProfileHeader from "./ProfileHeader";
import { followUser, unfollowUser } from "../src/utils/followFunctions";

export default function ProfilePage({ user, targetUser, isMyPage, onEditProfile }) {
  const uid = targetUser?.uid || user?.uid;
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);

  // 팔로워 / 팔로잉 수 실시간 구독
  useEffect(() => {
    if (!uid) return;

    const unsubFollowers = onSnapshot(
      collection(db, "users", uid, "followers"),
      (snap) => setFollowersCount(snap.size)
    );

    const unsubFollowing = onSnapshot(
      collection(db, "users", uid, "following"),
      (snap) => setFollowingCount(snap.size)
    );

    return () => {
      unsubFollowers();
      unsubFollowing();
    };
  }, [uid]);

  // 내가 팔로잉 중인지 체크
  useEffect(() => {
    if (!user?.uid || !targetUser?.uid || isMyPage) return;
    const ref = doc(db, "users", user.uid, "following", targetUser.uid);
    getDoc(ref).then((snap) => setIsFollowing(snap.exists()));
  }, [user, targetUser, isMyPage]);

  // 팔로우 / 언팔로우
  const handleFollow = async () => {
    if (!user?.uid || isMyPage) return;
    if (isFollowing) {
      await unfollowUser(user, targetUser);
      setIsFollowing(false);
    } else {
      await followUser(user, targetUser);
      setIsFollowing(true);
    }
  };

  return (
    <div className="w-full">
      <ProfileHeader
        user={user}
        targetUser={targetUser}
        isMyPage={isMyPage}
        followersCount={followersCount}
        followingCount={followingCount}
        isFollowing={isFollowing}
        onFollowToggle={handleFollow}
        onEditProfile={onEditProfile}
      />
    </div>
  );
}
