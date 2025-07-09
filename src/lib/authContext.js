import React, { createContext, useContext, useEffect, useState } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";

// 1. Context 생성
const AuthContext = createContext(null);

// 2. Provider 컴포넌트
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // ✅ loading state 추가

  useEffect(() => {
    // Firebase 인증 상태 변경 감지
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser || null);
      setLoading(false); // ✅ 로딩 완료 시 false로 변경
    });

    // cleanup
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}> {/* ✅ loading 반환 */}
      {children}
    </AuthContext.Provider>
  );
}

// 3. useAuth 훅
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context; // ✅ user, loading 포함
}
