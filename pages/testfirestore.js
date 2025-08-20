import { useEffect } from "react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../src/lib/firebase";
import { useAuth } from "../src/lib/authContext";

function TestFirestore() {
  const { user } = useAuth();

  useEffect(() => {
    const restoreUserDoc = async () => {
      if (!user) return;

      const ref = doc(db, "users", user.uid);

      try {
        await updateDoc(ref, {
          uid: user.uid,
          email: user.email || "unknown@example.com",
          followedAt: serverTimestamp(),
        });

        console.log("✅ 유저 문서 필드 복구 완료");
      } catch (error) {
        console.error("❌ 복구 실패:", error.message);
      }
    };

    restoreUserDoc();
  }, [user]);

  return <div className="p-10 text-xl">필드 복구 실행됨 ✅</div>;
}

export default TestFirestore;
