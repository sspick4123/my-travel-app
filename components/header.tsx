import Link from "next/link";
import { useAuth } from "../src/lib/authContext";
import { auth } from "../src/lib/firebase";
import { signOut } from "firebase/auth";
import { MouseEvent } from "react";

export default function Header(): JSX.Element {
  const { user, loading } = useAuth();

  if (loading) return <></>;

  const handleLogout = async (e: MouseEvent<HTMLButtonElement>) => {
    try {
      await signOut(auth);
      alert("로그아웃 되었습니다.");
    } catch (error: any) {
      console.error("로그아웃 오류:", error.message);
    }
  };

  return (
    <header className="bg-white border-b shadow-md w-full">
      <div className="w-full px-6 py-4 flex items-center justify-between">
        
        {/* 왼쪽 로고 */}
        <Link href="/">
          <span className="ml-4 text-xl font-bold text-blue-600 cursor-pointer">
            TravelWhere
          </span>
        </Link>

        {/* 가운데 A~D 그대로 */}
        <div className="flex-1 flex justify-center gap-x-[200px] text-green-600 text-lg font-semibold">
          <Link href="/a">A</Link>
          <Link href="/b">B</Link>
          <Link href="/c">C</Link>
          <Link href="/d">D</Link>
        </div>

        {/* 오른쪽 버튼 */}
        <div className="flex space-x-2 mr-6">
          {user ? (
            <>
              <button
                onClick={handleLogout}
                className="px-4 py-2 h-10 flex items-center justify-center rounded bg-red-500 text-white hover:bg-red-600"
              >
                로그아웃
              </button>
              <Link href="/mypage">
                <button className="px-4 py-2 h-10 flex items-center justify-center rounded bg-blue-500 text-white hover:bg-blue-600">
                  마이페이지
                </button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/login">
                <button className="px-4 py-2 h-10 flex items-center justify-center rounded bg-green-500 text-white hover:bg-green-600">
                  로그인
                </button>
              </Link>
              <Link href="/signup">
                <button className="px-4 py-2 h-10 flex items-center justify-center rounded bg-gray-500 text-white hover:bg-gray-600">
                  회원가입
                </button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
