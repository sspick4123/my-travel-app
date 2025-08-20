// pages/mypage.js

import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../src/lib/authContext";
import ProfilePage from "../components/ProfilePage";
import EditProfile from "../components/EditProfile";
import ActivityTabs from "../components/activity-tabs/ActivityTabs"; // ✅ 이름 변경한 컴포넌트 임포트

export default function MyPage() {
  const { user, loading } = useAuth();
  const [editOpen, setEditOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return <div className="text-center mt-10">로딩 중...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <main className="max-w-5xl mx-auto p-6 bg-white rounded shadow mt-10">
        {/* 프로필 영역 */}
        <ProfilePage
          user={user}
          targetUser={user}
          isMyPage={true}
          onEditProfile={() => setEditOpen(true)}
        />

        {/* 프로필 수정 모달 */}
        {editOpen && <EditProfile onClose={() => setEditOpen(false)} />}

        {/* 내 활동 탭 - 블로그/커뮤니티/일정공유 */}
        <div className="mt-10">
          <ActivityTabs
            userId={user.uid}          // ✅ 활동 데이터 대상
            showBookmarks={true}       // ✅ 마이페이지이므로 북마크 탭 표시
            showComments={true}        // ✅ 마이페이지이므로 댓글 탭 표시
          />
        </div>
      </main>
    </div>
  );
}
