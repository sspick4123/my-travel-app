import React, { useEffect, useState } from "react";
import { db, auth } from "../src/lib/firebase"; // ✅ auth import 추가
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { useAuth } from "../src/lib/authContext";
import {
  updateFollowersDisplayName,
  updateFollowingDisplayName,
} from "../src/utils/followFunctions";

const EditProfile = ({ onClose }) => {
  const { user, setUser, loading } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [checking, setChecking] = useState(false);
  const [isDuplicated, setIsDuplicated] = useState(false);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg w-80 text-center">
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  // ✅ 닉네임 중복 검사
  useEffect(() => {
    if (!displayName || displayName === user.displayName) {
      setIsDuplicated(false);
      setChecking(false);
      return;
    }

    setChecking(true);

    const timer = setTimeout(async () => {
      try {
        const q = query(
          collection(db, "users"),
          where("displayName", "==", displayName)
        );
        const snap = await getDocs(q);
        const conflict = snap.docs.find((d) => d.id !== user.uid);
        setIsDuplicated(!!conflict);
      } catch (err) {
        console.error("닉네임 중복 검사 오류:", err);
        setIsDuplicated(true);
      } finally {
        setChecking(false);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [displayName, user.displayName, user.uid]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setSaving(true);

    try {
      if (!user || !user.uid) {
        setMessage("인증된 사용자만 수정할 수 있습니다.");
        setSaving(false);
        return;
      }

      const userRef = doc(db, "users", user.uid);
      const snapshot = await getDoc(userRef);

      if (!snapshot.exists()) {
        throw new Error("해당 유저 문서가 존재하지 않습니다.");
      }

      // ✅ Firestore 인증 토큰 강제 로딩
      await auth.currentUser.getIdToken(true);

      console.log("업데이트하려는 문서:", userRef.path);
      console.log("현재 로그인된 uid:", user.uid);
      await updateDoc(userRef, {
        displayName: displayName
      });

      await updateFollowersDisplayName({ uid: user.uid, displayName });
      await updateFollowingDisplayName({ uid: user.uid, displayName });

      setUser((prev) => ({ ...prev, displayName }));
      onClose();
    } catch (error) {
      console.error("❌ 프로필 업데이트 오류:", error);
      console.error("📛 전체 에러 객체:", JSON.stringify(error, null, 2));
      setMessage("업데이트 중 오류가 발생했습니다.");
    }

    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-80">
        <h2 className="text-xl font-bold mb-4">프로필 수정</h2>

        {message && <p className="text-red-500 text-sm mb-2">{message}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-medium">닉네임</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            className="mt-1 p-2 border w-full rounded"
          />

          {checking && (
            <p className="text-gray-500 text-sm">중복 검사 중...</p>
          )}
          {!checking && isDuplicated && (
            <p className="text-red-500 text-sm">이미 사용 중인 닉네임입니다.</p>
          )}
          {!checking &&
            !isDuplicated &&
            displayName !== user.displayName && (
              <p className="text-green-500 text-sm">사용 가능한 닉네임입니다.</p>
            )}

          <button
            type="submit"
            disabled={
              saving ||
              checking ||
              isDuplicated ||
              displayName === user.displayName
            }
            className={`w-full py-2 rounded text-white ${
              saving ||
              checking ||
              isDuplicated ||
              displayName === user.displayName
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600"
            }`}
          >
            {saving ? "저장 중..." : "저장"}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full mt-2 text-gray-600 hover:text-black"
          >
            취소
          </button>
        </form>
      </div>
    </div>
  );
};

export default EditProfile;
