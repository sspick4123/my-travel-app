import { useState } from "react";
import { db, storage, auth } from "../src/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useRouter } from "next/router";

export default function NewPost() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [image, setImage] = useState(null);
  const [category, setCategory] = useState("");
  const [region, setRegion] = useState("");
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let imageUrl = "";

      if (image) {
        const storageRef = ref(storage, `posts/${image.name}`);
        await uploadBytes(storageRef, image);
        imageUrl = await getDownloadURL(storageRef);
      }

      await addDoc(collection(db, "posts"), {
        title,
        content,
        imageUrl,
        category,
        region,
        createdAt: serverTimestamp(),
        authorId: auth.currentUser.uid,
      });

      alert("글 작성 완료!");
      router.push("/");
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div>
      <h1>새 글 작성</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="제목"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        /><br/>
        <textarea
          placeholder="내용"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        /><br/>
        <input
          type="text"
          placeholder="카테고리"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        /><br/>
        <input
          type="text"
          placeholder="지역"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
        /><br/>
        <input
          type="file"
          onChange={(e) => setImage(e.target.files[0])}
        /><br/>
        <button type="submit">작성하기</button>
      </form>
    </div>
  );
}
