import { useEffect } from "react";
import { getDoc, doc } from "firebase/firestore";
import { db } from "../src/lib/firebase";
import { useAuth } from "../src/lib/authContext";

function TestFirestore() {
  const { user } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        console.log("❗ 로그인 필요");
        return;
      }

      try {
        const ref = doc(db, "posts", "3ESiIsGn8ADuNJHNxruK"); // ✅ 네 실제 posts 문서 ID로 변경
        const snap = await getDoc(ref);
        console.log("✅ 데이터:", snap.data());
      } catch (error) {
        console.log("❌ FirestoreError:", error.message);
      }
    };

    fetchData();
  }, [user]);

  return <div>Firestore Test</div>;
}

export default TestFirestore;
