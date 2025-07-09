import { useAuth } from "../src/lib/authContext";
import ProfilePage from "../components/ProfilePage";

export default function MyPage() {
  const { user } = useAuth();
  if (!user) return <div className="text-center mt-10">로그인 후 이용해주세요.</div>;
  return <ProfilePage user={user} targetUser={user} isMyPage={true} />;
}
