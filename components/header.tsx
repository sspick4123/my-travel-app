import Link from "next/link";
import { useAuth } from "../src/lib/authContext";
import { auth } from "../src/lib/firebase";
import { signOut } from "firebase/auth";

export default function Header() {
  const { user, loading } = useAuth();

  // ✅ 로딩 중이면 렌더링하지 않음
  if (loading) return null;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      alert("로그아웃 되었습니다.");
    } catch (error) {
      console.error("로그아웃 오류:", error.message);
    }
  };

  return (
    <header className="bg-white border-b shadow-md">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* 홈 로고 */}
        <Link href="/">
          <h1 className="text-xl font-bold text-blue-600">TravelWhere</h1>
        </Link>

        {/* 우측 상단 버튼들 */}
        <nav className="space-x-2">
          {user ? (
            <>
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded bg-red-500 text-white hover:bg-red-600"
              >
                로그아웃
              </button>
              <Link href="/mypage">
                <button className="px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600">
                  마이페이지
                </button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/login">
                <button className="px-4 py-2 rounded bg-green-500 text-white hover:bg-green-600">
                  로그인
                </button>
              </Link>
              <Link href="/signup">
                <button className="px-4 py-2 rounded bg-gray-500 text-white hover:bg-gray-600">
                  회원가입
                </button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
