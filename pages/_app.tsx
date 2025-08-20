// pages/_app.tsx

import "../src/styles/globals.css";
import { AuthProvider } from "../src/lib/authContext";
import Layout from "../components/Layout";
import { useRouter } from "next/router";

function MyApp({ Component, pageProps }) {
  const router = useRouter();

  // Layout 제외 페이지 리스트
  const noLayoutPages = ["/login", "/signup"];

  // 현재 페이지가 noLayoutPages에 포함되면 Layout 제거
  const isNoLayout = noLayoutPages.includes(router.pathname);

  return (
    <AuthProvider>
      {isNoLayout ? (
        <Component {...pageProps} />
      ) : (
        <Layout>
          <Component {...pageProps} />
        </Layout>
      )}
    </AuthProvider>
  );
}

export default MyApp;
