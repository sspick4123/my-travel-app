import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { db } from "../../src/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "../../src/lib/authContext";
import ProfilePage from "../../components/ProfilePage";

export default function UserProfilePage() {
  const router = useRouter();
  const { uid } = router.query;
  const { user } = useAuth();
  const [targetUser, setTargetUser] = useState(null);

  useEffect(() => {
    const fetchTargetUser = async () => {
      if (!uid) return;
      if (user && uid === user.uid) {
        setTargetUser(user);
        return;
      }
      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) setTargetUser({ uid: userSnap.id, ...userSnap.data() });
    };
    fetchTargetUser();
  }, [uid, user]);

  if (!targetUser) return <div className="text-center mt-10">로딩 중...</div>;

  const isMyPage = user && user.uid === uid;

  return <ProfilePage user={user} targetUser={targetUser} isMyPage={isMyPage} />;
}
