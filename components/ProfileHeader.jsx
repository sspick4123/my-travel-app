// components/ProfileHeader.jsx

import React, { useEffect, useState } from "react";
import {
  doc,
  collection,
  onSnapshot,
  getDoc
} from "firebase/firestore";
import { db } from "../src/lib/firebase";
import FollowerListModal from "./FollowerListModal";
import { followUser, unfollowUser } from "../src/utils/followFunctions";
import { useAuth } from "../src/lib/authContext";

const ProfileHeader = ({ user, targetUser, isMyPage, onEditProfile }) => {
  const [displayName, setDisplayName] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followersList, setFollowersList] = useState([]);
  const [followingList, setFollowingList] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalList, setModalList] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);

  const uid = targetUser?.uid;
  const isOwner = user?.uid === uid;

  // 1) 내 프로필 정보 구독
  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(doc(db, "users", uid), (snap) => {
      const data = snap.data() || {};
      setDisplayName(data.displayName || "No Name");
      setProfileImage(data.profileImageUrl || "https://via.placeholder.com/150");
    });
    return unsub;
  }, [uid]);

  // 2) 팔로워/팔로잉 구독
  useEffect(() => {
    if (!uid) return;

    const unsubF = onSnapshot(
      collection(db, "users", uid, "followers"),
      async (snap) => {
        setFollowersCount(snap.size);
        const list = await Promise.all(
          snap.docs.map(async (d) => {
            const fid = d.id;
            const udoc = await getDoc(doc(db, "users", fid));
            const udata = udoc.data() || {};
            return {
              uid: fid,
              displayName: udata.displayName || "No Name",
              profileImageUrl: udata.profileImageUrl || "",
            };
          })
        );
        setFollowersList(list);
      }
    );

    const unsubG = onSnapshot(
      collection(db, "users", uid, "following"),
      async (snap) => {
        const real = snap.docs.filter((d) => d.id !== uid);
        setFollowingCount(real.length);
        const list = await Promise.all(
          real.map(async (d) => {
            const fid = d.id;
            const udoc = await getDoc(doc(db, "users", fid));
            const udata = udoc.data() || {};
            return {
              uid: fid,
              displayName: udata.displayName || "No Name",
              profileImageUrl: udata.profileImageUrl || "",
            };
          })
        );
        setFollowingList(list);
      }
    );

    return () => {
      unsubF();
      unsubG();
    };
  }, [uid]);

  // 3) 내가 이 사람 팔로잉 중인지 체크
  useEffect(() => {
    if (!user?.uid || !targetUser?.uid || isOwner) return;
    (async () => {
      const snap = await getDoc(
        doc(db, "users", user.uid, "following", targetUser.uid)
      );
      setIsFollowing(snap.exists());
    })();
  }, [user, targetUser, isOwner]);

  // 4) 팔로우/언팔로우
  const handleFollow = async () => {
    if (!user?.uid || isOwner) return;
    if (isFollowing) {
      await unfollowUser(user, targetUser);
      setIsFollowing(false);
    } else {
      await followUser(user, targetUser);
      setIsFollowing(true);
    }
  };

  // 5) 모달 열기
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
    <div className="p-4 border-b relative">
      <div className="flex items-center space-x-4">
        <img
          src={profileImage}
          alt="profile"
          className="w-16 h-16 rounded-full"
        />
        <div className="flex-1">
          <h2 className="text-lg font-bold">{displayName}</h2>
          <div className="flex space-x-4 mt-2">
            <button className="text-sm" onClick={() => openModal("followers")}>
              <span className="font-bold">{followersCount}</span> 팔로워
            </button>
            <button className="text-sm" onClick={() => openModal("following")}>
              <span className="font-bold">{followingCount}</span> 팔로잉
            </button>
          </div>
        </div>

        {/* 프로필 소유자만 수정 버튼 */}
        {isOwner && onEditProfile && (
          <button
            onClick={onEditProfile}
            className="mt-2 px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600"
          >
            프로필 수정
          </button>
        )}

        {/* 로그인 유저만, 타인의 프로필일 때만 팔로우 버튼 */}
        {!isOwner && user?.uid && (
          <button
            onClick={handleFollow}
            className={`mt-2 px-4 py-2 rounded ${
              isFollowing ? "bg-gray-300" : "bg-blue-500 text-white"
            }`}
          >
            {isFollowing ? "언팔로우" : "팔로우"}
          </button>
        )}
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
