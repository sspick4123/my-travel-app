import Header from "./Header"; // ✅ 기존 Header 컴포넌트 경로에 맞게 수정
// import Footer from "./Footer"; // Footer 컴포넌트가 있다면 import

export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-grow">
        {children}
      </main>

      {/* <Footer /> */}
    </div>
  );
}
