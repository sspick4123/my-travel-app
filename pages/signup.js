// pages/signup.js

import { useState } from "react";
import { useRouter } from "next/router";
import { auth, db } from "../src/lib/firebase";
import {
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import {
  doc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

export default function Signup() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [nameCheckMessage, setNameCheckMessage] = useState("");
  const [isNameAvailable, setIsNameAvailable] = useState(false);
  const router = useRouter();

  // 닉네임 중복 확인
  const handleCheckName = async () => {
    setError("");
    setNameCheckMessage("");
    if (!displayName.trim()) {
      setNameCheckMessage("닉네임을 입력해주세요.");
      setIsNameAvailable(false);
      return;
    }
    try {
      const q = query(
        collection(db, "users"),
        where("displayName", "==", displayName.trim())
      );
      const snap = await getDocs(q);
      if (snap.docs.length > 0) {
        // 중복 메시지를 error 상태로 설정해 빨간색으로 표시
        setError("이미 사용중인 닉네임입니다.");
        setIsNameAvailable(false);
      } else {
        setNameCheckMessage("사용 가능한 닉네임입니다!");
        setIsNameAvailable(true);
      }
    } catch (err) {
      console.error("닉네임 중복 검사 오류:", err);
      setError("닉네임 검사 중 오류가 발생했습니다.");
      setIsNameAvailable(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    if (!isNameAvailable) {
      setError("닉네임 중복확인을 먼저 해주세요.");
      return;
    }
    try {
      const userCred = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCred.user;

      await updateProfile(user, { displayName: displayName.trim() });

      await setDoc(doc(db, "users", user.uid), {
        displayName: displayName.trim(),
        email: user.email,
        profileImageUrl: "",
        bookmarks: [],
      }, {merge: true});

      alert("회원가입 성공! 로그인 페이지로 이동합니다.");
      router.push("/login");
    } catch (err) {
      console.error("회원가입 오류:", err);
      setError(err.message);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded shadow mt-10">
      <h1 className="text-2xl mb-4">회원가입</h1>
      {/* 에러와 중복확인 메시지 */}
      {(error || nameCheckMessage) && (
        <p
          className={`mb-2 text-sm ${
            error
              ? "text-red-500"
              : "text-green-600"
          }`}
        >
          {error || nameCheckMessage}
        </p>
      )}
      <form onSubmit={handleSignup} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">닉네임</label>
          <div className="mt-1 flex items-center space-x-2">
            <input
              type="text"
              placeholder="원하시는 닉네임"
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                setIsNameAvailable(false);
                setNameCheckMessage("");
                setError("");
              }}
              required
              className="flex-1 p-2 border rounded"
            />
            <button
              type="button"
              onClick={handleCheckName}
              className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              중복확인
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium">이메일</label>
          <input
            type="email"
            placeholder="example@mail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 w-full p-2 border rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">비밀번호</label>
          <input
            type="password"
            placeholder="비밀번호를 입력하세요"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-1 w-full p-2 border rounded"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
        >
          회원가입
        </button>
      </form>
    </div>
  );
}
