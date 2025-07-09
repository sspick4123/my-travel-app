import React, { useEffect, useState } from "react";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../src/lib/firebase";
import FollowerListModal from "./FollowerListModal";
import { followUser, unfollowUser } from "../src/utils/followFunctions";

const ProfileHeader = ({ user, targetUser }) => {
  const [displayName, setDisplayName] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [followingCount, setFollowingCount] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);
  const [followersList, setFollowersList] = useState([]);
  const [followingList, setFollowingList] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalList, setModalList] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);

  const uid = targetUser?.uid || user?.uid;

  // ✅ 프로필 정보 fetch (내 프로필일 때 Firestore에서 displayName 가져오기)
  useEffect(() => {
    const fetchProfileInfo = async () => {
      if (!uid) return;

      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        setDisplayName(data.displayName || "No Name");
        setProfileImage(data.profileImageUrl || "https://via.placeholder.com/150");
      } else {
        setDisplayName("No Name");
        setProfileImage("https://via.placeholder.com/150");
      }
    };

    fetchProfileInfo();
  }, [uid]);

  // ✅ 팔로워 / 팔로잉 데이터 fetch
  useEffect(() => {
    const fetchCounts = async () => {
      if (!uid) return;

      // following
      const followingRef = collection(db, "users", uid, "following");
      const followingSnap = await getDocs(followingRef);
      setFollowingCount(followingSnap.size);
      setFollowingList(followingSnap.docs.map((doc) => doc.data()));

      // followers
      const followersRef = collection(db, "users", uid, "followers");
      const followersSnap = await getDocs(followersRef);
      setFollowersCount(followersSnap.size);
      setFollowersList(followersSnap.docs.map((doc) => doc.data()));
    };

    fetchCounts();
  }, [uid]);

  // ✅ 팔로우 여부 확인 (내 프로필이 아닐 때만)
  useEffect(() => {
    const checkFollowing = async () => {
      if (!user || !targetUser || user.uid === targetUser.uid) return;

      const followingRef = doc(db, "users", user.uid, "following", targetUser.uid);
      const docSnap = await getDoc(followingRef);
      setIsFollowing(docSnap.exists());
    };

    checkFollowing();
  }, [user, targetUser]);

  // ✅ 팔로우 / 언팔로우 버튼 핸들러
  const handleFollow = async () => {
    if (!user || !targetUser || user.uid === targetUser.uid) return;

    if (isFollowing) {
      await unfollowUser(user, targetUser);
      setIsFollowing(false);
    } else {
      await followUser(user, targetUser);
      setIsFollowing(true);
    }

    // ✅ 팔로워 수 새로고침
    const followersRef = collection(db, "users", targetUser.uid, "followers");
    const followersSnap = await getDocs(followersRef);
    setFollowersCount(followersSnap.size);
  };

  // ✅ 모달 열기
  const openModal = (type) => {
    if (type === "followers") {
      setModalTitle("팔로워");
      setModalList(followersList);
    } else {
      setModalTitle("팔로잉");
      setModalList(followingList);
    }
    setModalOpen(true);
  };

  return (
    <div className="p-4 border-b">
      <div className="flex items-center space-x-4">
        <img
          src={profileImage}
          alt="profile"
          className="w-16 h-16 rounded-full"
        />
        <div>
          <h2 className="text-lg font-bold">{displayName}</h2>
          <div className="flex space-x-4 mt-2">
            <button className="text-sm" onClick={() => openModal("followers")}>
              <span className="font-bold">{followersCount}</span> 팔로워
            </button>
            <button className="text-sm" onClick={() => openModal("following")}>
              <span className="font-bold">{followingCount}</span> 팔로잉
            </button>
          </div>

          {/* ✅ 팔로우/언팔로우 버튼 (내 프로필이 아닐 때만 보임) */}
          {user && targetUser && user.uid !== targetUser.uid && (
            <button
              onClick={handleFollow}
              className={`mt-2 px-4 py-2 rounded ${isFollowing ? "bg-gray-300" : "bg-blue-500 text-white"}`}
            >
              {isFollowing ? "언팔로우" : "팔로우"}
            </button>
          )}
        </div>
      </div>

      <FollowerListModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalTitle}
        list={modalList}
      />
    </div>
  );
};

export default ProfileHeader;
