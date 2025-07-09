// pages/_app.tsx

import "../src/styles/globals.css";
import { AuthProvider } from "../src/lib/authContext";
import Layout from "../components/Layout"; // ✅ Layout import 추가

function MyApp({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Layout> {/* ✅ Layout으로 감싸기 */}
        <Component {...pageProps} />
      </Layout>
    </AuthProvider>
  );
}

export default MyApp;
