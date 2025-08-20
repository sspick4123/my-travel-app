import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { db } from "../../src/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { useAuth } from "../../src/lib/authContext";
import ProfilePage from "../../components/ProfilePage";
import EditProfile from "../../components/EditProfile";
import ActivityTabs from "../../components/activity-tabs/ActivityTabs";

export default function UserProfilePage() {
  const router = useRouter();
  const { uid } = router.query;
  const { user, loading } = useAuth();
  const [targetUser, setTargetUser] = useState(null);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (!uid) return;

    // 🔹 실시간 구독
    const unsub = onSnapshot(doc(db, "users", uid), (snap) => {
      if (snap.exists()) {
        setTargetUser({ uid: snap.id, ...snap.data() });
      } else {
        router.replace("/");
      }
    });

    return () => unsub();
  }, [uid, router]);

  if (!targetUser || loading) {
    return <div className="text-center mt-10">로딩 중...</div>;
  }

  const isMyPage = user?.uid === uid;

  return (
    <div className="min-h-screen bg-gray-100">
      <main className="max-w-5xl mx-auto p-6 bg-white rounded shadow mt-10">
        {/* 프로필 정보 */}
        <ProfilePage
          user={user}
          targetUser={targetUser}
          isMyPage={isMyPage}
          onEditProfile={() => setEditOpen(true)}
        />

        {/* 프로필 수정 */}
        {isMyPage && editOpen && (
          <EditProfile onClose={() => setEditOpen(false)} />
        )}

        {/* 활동 탭 */}
        <div className="mt-10">
          <ActivityTabs
            userId={targetUser.uid}
            showBookmarks={isMyPage}
            showComments={isMyPage}
          />
        </div>
      </main>
    </div>
  );
}
