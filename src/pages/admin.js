import { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import { collection, getDocs, doc, deleteDoc, query, orderBy } from "firebase/firestore";
import { useAuth } from "../lib/authContext";
import Link from "next/link";

export default function AdminPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);

  useEffect(() => {
    if (!user) return;
    // 관리자 uid만 접근 가능 (예: 관리자 uid 하드코딩)
    const adminUid = "KR3fwOuIaOgSnCYOvhSZnN7dmBX2";
    if (user.uid !== adminUid) {
      alert("관리자만 접근 가능합니다.");
      return;
    }

    const fetchReports = async () => {
      const q = query(collection(db, "reports"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const reportsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setReports(reportsData);
    };
    fetchReports();
  }, [user]);

  const handleDeletePost = async (postId) => {
    if (!confirm("정말 이 글을 삭제하시겠습니까?")) return;
    try {
      await deleteDoc(doc(db, "posts", postId));
      alert("게시글이 삭제되었습니다.");
    } catch (error) {
      alert(error.message);
    }
  };

  if (!user) return <div>Loading...</div>;

  return (
    <div>
      <h1>관리자 페이지 - 신고 목록</h1>
      {reports.map(report => (
        <div key={report.id} style={{border:"1px solid gray", margin:"10px", padding:"10px"}}>
          <p>게시글 ID: {report.postId}</p>
          <p>신고 사유: {report.reason}</p>
          <p>신고자 ID: {report.reporterId}</p>
          <button onClick={() => handleDeletePost(report.postId)}>게시글 삭제</button>
          <Link href={`/post/${report.postId}`}><button>게시글 보기</button></Link>
        </div>
      ))}
    </div>
  );
}
