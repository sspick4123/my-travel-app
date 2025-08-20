import { useEffect, useMemo, useState, useRef } from "react";
import { db } from "../../src/lib/firebase";
import {
  collection,
  collectionGroup,
  getDocs,
  getCountFromServer,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  documentId,
} from "firebase/firestore";
import PostCard from "../PostCard";

const PAGE_SIZE = 5;
const RAW_MULTIPLIER = 5;           // 배치폭 (일반 로드)
const RAW_MULTIPLIER_BUILD = 10;    // 배치폭 (먼 점프/프리패치)
const IN_LIMIT = 10;                // 'in' 쿼리 최대 10개

// --- 페이지 캐시 --- (userId까지 키 포함: 캐시 오염 방지)
const pageRowsCache = new Map(); // key: `${userId}:${activeFilter}:${page}` -> rows

// --- 세션 캐시 --- (posts/users)
const postCache = new Map(); // postId -> postDocData
const userCache = new Map(); // uid    -> userDocData

export default function BlogTabContent({ userId, activeFilter }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // 요청 동시성 가드
  const loadTokenRef = useRef(0);
  const cursorBuildTokenRef = useRef(0);

  // 로딩/상태
  const [buildingCursors, setBuildingCursors] = useState(false);
  const [cursorReady, setCursorReady] = useState(true); // 댓글 탭에서는 false로 설정

  // 페이지네이션 상태
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // 각 페이지의 "끝 커서"(그 페이지의 마지막 raw 문서 스냅샷)
  // page 1의 '시작 커서'는 없음(null). 따라서 p페이지의 시작 커서는 cursors[p-2]
  const [cursors, setCursors] = useState([]);

  // 탭 변경 시 초기화
  useEffect(() => {
    setItems([]);
    setPage(1);
    // 댓글 탭은 커서 선계산 끝나기 전까지 pager/빈상태 숨김
    setTotalPages(activeFilter === "comments" ? 0 : 1);
    setCursors([]);
    pageRowsCache.clear();
    setCursorReady(activeFilter !== "comments");
  }, [userId, activeFilter]);

  // ===== 1) (비댓글 탭) 총 개수 → 총 페이지 =====
  useEffect(() => {
    if (!userId || !activeFilter) return;
    if (activeFilter === "comments") return; // 댓글 탭은 커서 선계산으로 totalPages 확정

    (async () => {
      try {
        let countQ;
        if (activeFilter === "written") {
          countQ = query(collection(db, "blogPosts"), where("authorId", "==", userId));
        } else if (activeFilter === "likes" || activeFilter === "bookmarks") {
          const sub = activeFilter === "likes" ? "likes" : "bookmarks";
          countQ = query(collection(db, "users", userId, sub), where("type", "==", "blog"));
        } else {
          return;
        }

        const snap = await getCountFromServer(countQ);
        const total = snap.data().count || 0;
        setTotalPages(Math.max(1, Math.ceil(total / PAGE_SIZE)));
      } catch (e) {
        console.error("count error:", e);
        setTotalPages(1);
      }
    })();
  }, [userId, activeFilter]);

  // ===== 2) (댓글 탭) 전체 커서 선계산 → 정확한 totalPages =====
  useEffect(() => {
    if (!userId || activeFilter !== "comments") return;

    (async () => {
      const myToken = ++cursorBuildTokenRef.current;
      setBuildingCursors(true);
      setCursorReady(false);

      try {
        const ends = [];
        let prev = null;
        // 페이지 끝 커서를 페이지 끝까지 전부 만든다.
        while (true) {
          const endSnap = await fetchCursorOnce({
            userId,
            activeFilter: "comments",
            cursor: prev,
            pageSize: PAGE_SIZE,
            useBoost: true,
          });
          if (!endSnap) break;   // 더 없음
          ends.push(endSnap);
          prev = endSnap;
        }

        if (cursorBuildTokenRef.current !== myToken) return; // 취소됨
        setCursors(ends);
        setTotalPages(Math.max(1, ends.length || 1));
        setCursorReady(true);
      } catch (e) {
        console.error("cursor build (comments) error:", e);
        if (cursorBuildTokenRef.current === myToken) {
          // 실패 시라도 최소 1페이지로
          setCursors([]);
          setTotalPages(1);
          setCursorReady(true);
        }
      } finally {
        if (cursorBuildTokenRef.current === myToken) {
          setBuildingCursors(false);
        }
      }
    })();
  }, [userId, activeFilter]);

  // totalPages 변동 시 현재 page를 안전하게 고정
  useEffect(() => {
    setPage((p) => Math.min(p, totalPages || 1));
  }, [totalPages]);

  // ===== 3) 페이지 데이터 로드 =====
  useEffect(() => {
    if (!userId || !activeFilter) return;
    // 댓글 탭은 cursorReady 될 때까지 목록 로드 보류 (페이지 수 정확히 맞춰 표시)
    if (activeFilter === "comments" && !cursorReady) return;

    (async () => {
      const myToken = ++loadTokenRef.current;
      setLoading(true);

      const cacheKey = `${userId}:${activeFilter}:${page}`;
      const cached = pageRowsCache.get(cacheKey);
      if (cached && loadTokenRef.current === myToken) {
        setItems(cached);
      }

      try {
        let localCursors = [...cursors];

        // 비댓글 탭일 때만 "요청된 페이지까지 커서 보충" (댓글 탭은 이미 선계산 완료)
        if (activeFilter !== "comments") {
          let remaining = page - localCursors.length;
          while (remaining > 0) {
            const prev = localCursors.at(-1) ?? null; // page1의 시작 커서는 null
            const next = await fetchCursorOnce({
              userId,
              activeFilter,
              cursor: prev,
              pageSize: PAGE_SIZE,
              useBoost: remaining > 3,
            });
            if (next) {
              localCursors.push(next);
              remaining--;
            } else {
              break;
            }
          }
        }

        // 요청한 page가 실제 가능한 페이지보다 크면 마지막 페이지로 클램프
        const realPages = Math.max(1, localCursors.length || 1);
        if (page > realPages) {
          if (loadTokenRef.current === myToken) {
            setTotalPages(realPages);
            setPage(realPages);
            setCursors(localCursors);
            setLoading(false);
          }
          return;
        }

        // p페이지의 시작 커서 = cursors[p-2]  (p=1이면 시작 커서 없음)
        const startCursor = page === 1 ? null : localCursors[page - 2] ?? null;

        const { rows } = await fetchDocsForPage({
          userId,
          activeFilter,
          cursor: startCursor,
          pageSize: PAGE_SIZE,
          buildCursorOnly: false,
        });

        if (loadTokenRef.current === myToken) {
          setItems(rows);
          setCursors(localCursors);
          pageRowsCache.set(cacheKey, rows);

          // 프리패치 (다음 2페이지)
          prefetchNextPages({
            userId,
            activeFilter,
            fromPage: page,
            cursors: localCursors,
            count: 2,
            pageSize: PAGE_SIZE,
          }).catch(() => {});
        }
      } catch (e) {
        console.error("page load error:", e);
        if (loadTokenRef.current === myToken) {
          setItems([]);
        }
      } finally {
        if (loadTokenRef.current === myToken) {
          setLoading(false);
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, activeFilter, page, cursorReady]);

  const canPrev = page > 1;
  const canNext = page < totalPages;

  // 댓글 탭은 커서 준비 전엔 페이저/빈상태를 보여주지 않음
  if ((loading || buildingCursors || (activeFilter === "comments" && !cursorReady)) && items.length === 0) {
    return <p>로딩 중...</p>;
  }
  if (!loading && cursorReady && items.length === 0) {
    return <p>표시할 게시글이 없습니다.</p>;
  }

  return (
    <div className="space-y-4">
      {/* 리스트 */}
      <div className="grid grid-cols-1 gap-4">
        {items.map((post) => (
          <PostCard
            key={`${post.id}-${post.__commentId ?? "row"}`}
            post={post}
            type="blog"
          />
        ))}
      </div>

      {(activeFilter !== "comments" || cursorReady) && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            className="px-3 py-1 border rounded disabled:opacity-40"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={!canPrev}
          >
            이전
          </button>

          <SixPager page={page} totalPages={totalPages} onSelect={(p) => setPage(p)} />

          <button
            className="px-3 py-1 border rounded disabled:opacity-40"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={!canNext}
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}

/* ============================= Helpers ============================= */

// 배열 쪼개기
function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// 본문 20자 미리보기
function truncate20(s) {
  if (!s) return "";
  const t = typeof s === "string" ? s : String(s);
  return t.length > 20 ? t.slice(0, 20) + "..." : t;
}

// 글 여러 개 배치 조회 (캐시 사용)
async function getPostsByIds(ids) {
  if (!ids.length) return new Map();

  const outMap = new Map();
  const missing = [];
  for (const id of ids) {
    if (postCache.has(id)) outMap.set(id, postCache.get(id));
    else missing.push(id);
  }
  if (!missing.length) return outMap;

  const groups = chunk(missing, IN_LIMIT);
  const snaps = await Promise.all(
    groups.map((g) =>
      getDocs(query(collection(db, "blogPosts"), where(documentId(), "in", g)))
    )
  );

  snaps.forEach((snap) =>
    snap.docs.forEach((d) => {
      postCache.set(d.id, d.data());
      outMap.set(d.id, d.data());
    })
  );
  return outMap;
}

// 유저 여러 명 배치 조회 (캐시 사용)
async function getUsersByUids(uids) {
  if (!uids.length) return new Map();

  const outMap = new Map();
  const missing = [];
  for (const uid of uids) {
    if (userCache.has(uid)) outMap.set(uid, userCache.get(uid));
    else missing.push(uid);
  }
  if (!missing.length) return outMap;

  const groups = chunk(missing, IN_LIMIT);
  const snaps = await Promise.all(
    groups.map((g) =>
      getDocs(query(collection(db, "users"), where(documentId(), "in", g)))
    )
  );

  snaps.forEach((snap) =>
    snap.docs.forEach((d) => {
      userCache.set(d.id, d.data());
      outMap.set(d.id, d.data());
    })
  );
  return outMap;
}

/**
 * "해당 페이지의 끝 커서" 만들기 (중복 인지 + 결정적 정렬)
 * - 페이지 경계를 "고유 아이템 수(PAGE_SIZE)" 기준으로 정확히 맞춘다.
 * - written: 고유키 = postId(문서 id)
 * - likes/bookmarks: 고유키 = sub문서 postId (누락 시 제외)
 * - comments: 고유키 = comment 문서 id (단, blog 원글의 댓글만 카운트)
 */
async function fetchCursorOnce({ userId, activeFilter, cursor, pageSize, useBoost = false }) {
  const LIMIT_N = pageSize * (useBoost ? RAW_MULTIPLIER_BUILD : RAW_MULTIPLIER);

  const qWritten = (cur) =>
    query(
      collection(db, "blogPosts"),
      where("authorId", "==", userId),
      orderBy("createdAt", "desc"),
      orderBy(documentId(), "desc"),
      ...(cur ? [startAfter(cur)] : []),
      limit(LIMIT_N)
    );

  const qSub = (sub, cur) =>
    query(
      collection(db, "users", userId, sub),
      where("type", "==", "blog"),
      orderBy("createdAt", "desc"),
      orderBy(documentId(), "desc"),
      ...(cur ? [startAfter(cur)] : []),
      limit(LIMIT_N)
    );

  const qComments = (cur) =>
    query(
      collectionGroup(db, "comments"),
      where("authorId", "==", userId),
      orderBy("createdAt", "desc"),
      orderBy(documentId(), "desc"),
      ...(cur ? [startAfter(cur)] : []),
      limit(LIMIT_N)
    );

  const seen = new Set();
  let localCursor = cursor ?? null;
  let lastDocUsed = null;

  async function advanceUntilUnique(qBuilder, acceptFn, keyFn) {
    const LIMIT_FOR_BREAK = LIMIT_N;
    let keepGoing = true;
    while (keepGoing) {
      const snap = await getDocs(qBuilder(localCursor));
      if (snap.empty) break;

      for (const d of snap.docs) {
        // 필터(accept)
        if (!acceptFn(d)) {
          lastDocUsed = d;
          continue;
        }
        // 고유키
        const key = keyFn(d);
        if (!seen.has(key)) {
          seen.add(key);
        }
        lastDocUsed = d;
        if (seen.size >= pageSize) {
          return lastDocUsed;
        }
      }

      if (snap.docs.length < LIMIT_FOR_BREAK) {
        keepGoing = false;
      } else {
        localCursor = snap.docs.at(-1);
      }
    }
    return lastDocUsed;
  }

  if (activeFilter === "written") {
    return await advanceUntilUnique(qWritten, () => true, (d) => d.id);
  }

  if (activeFilter === "likes" || activeFilter === "bookmarks") {
    const sub = activeFilter === "likes" ? "likes" : "bookmarks";
    // postId 없는 레코드는 페이지 경계에서 제외
    return await advanceUntilUnique(
      qSub.bind(null, sub),
      (d) => !!d.data()?.postId,
      (d) => d.data().postId
    );
  }

  if (activeFilter === "comments") {
    // blog 원글의 댓글만 카운트
    return await advanceUntilUnique(
      qComments,
      (d) => {
        const parent = d.ref.parent?.parent;
        return parent && parent.parent?.id === "blogPosts";
      },
      (d) => d.id
    );
  }

  return null;
}

/**
 * 페이지 데이터를 PAGE_SIZE로 채워서 반환 (결정적 정렬 + 페이지 내 중복 제거)
 * - 삭제 댓글은 제외
 */
async function fetchDocsForPage({ userId, activeFilter, cursor, pageSize, buildCursorOnly }) {
  let rows = [];
  let lastRawDoc = null;
  const LIMIT_N = pageSize * RAW_MULTIPLIER;

  const qWritten = (cur) =>
    query(
      collection(db, "blogPosts"),
      where("authorId", "==", userId),
      orderBy("createdAt", "desc"),
      orderBy(documentId(), "desc"),
      ...(cur ? [startAfter(cur)] : []),
      limit(LIMIT_N)
    );

  const qSub = (sub, cur) =>
    query(
      collection(db, "users", userId, sub),
      where("type", "==", "blog"),
      orderBy("createdAt", "desc"),
      orderBy(documentId(), "desc"),
      ...(cur ? [startAfter(cur)] : []),
      limit(LIMIT_N)
    );

  const qC = (cur) =>
    query(
      collectionGroup(db, "comments"),
      where("authorId", "==", userId),
      orderBy("createdAt", "desc"),
      orderBy(documentId(), "desc"),
      ...(cur ? [startAfter(cur)] : []),
      limit(LIMIT_N)
    );

  // written
  if (activeFilter === "written") {
    let localCursor = cursor ?? null;
    const seenIds = new Set();
    while (rows.length < pageSize) {
      const snap = await getDocs(qWritten(localCursor));
      lastRawDoc = snap.docs.at(-1) || lastRawDoc;

      if (!buildCursorOnly) {
        for (const d of snap.docs) {
          const id = d.id;
          if (seenIds.has(id)) continue;
          seenIds.add(id);
          const v = d.data();
          rows.push({ id, ...v, content: truncate20(v.content) });
          if (rows.length >= pageSize) break;
        }
      }
      if (snap.docs.length < LIMIT_N || (buildCursorOnly && lastRawDoc)) break;
      localCursor = lastRawDoc;
    }
    return { rows, lastRawDoc };
  }

  // likes/bookmarks
  if (activeFilter === "likes" || activeFilter === "bookmarks") {
    const sub = activeFilter === "likes" ? "likes" : "bookmarks";
    let localCursor = cursor ?? null;
    const seenIds = new Set();

    while (rows.length < pageSize) {
      const subSnap = await getDocs(qSub(sub, localCursor));
      lastRawDoc = subSnap.docs.at(-1) || lastRawDoc;

      if (!buildCursorOnly) {
        const ids = subSnap.docs.map((d) => d.data().postId).filter(Boolean);
        const postMap = await getPostsByIds(ids);

        for (const id of ids) {
          if (seenIds.has(id)) continue;
          const v = postMap.get(id);
          if (!v) continue; // 삭제/누락은 건너뛰고 계속 보충
          seenIds.add(id);
          rows.push({ id, ...v, content: truncate20(v.content) });
          if (rows.length >= pageSize) break;
        }
      }
      if (subSnap.docs.length < LIMIT_N || (buildCursorOnly && lastRawDoc)) break;
      localCursor = lastRawDoc;
    }
    return { rows, lastRawDoc };
  }

  // comments
  if (activeFilter === "comments") {
    let localCursor = cursor ?? null;
    const seenCids = new Set();

    while (rows.length < pageSize) {
      const cgSnap = await getDocs(qC(localCursor));
      lastRawDoc = cgSnap.docs.at(-1) || lastRawDoc;

      if (!buildCursorOnly) {
        const comments = [];
        const postIds = [];
        const mentionUids = new Set();

        cgSnap.docs.forEach((cSnap) => {
          const c = cSnap.data();
          const postRef = cSnap.ref.parent?.parent;
          if (!postRef || postRef.parent.id !== "blogPosts") return; // blog 아닌 댓글 제외
          if (c.deleted) return;                                      // ★ 삭제 댓글 제외
          const cid = cSnap.id;
          if (seenCids.has(cid)) return;
          seenCids.add(cid);

          comments.push({ id: cid, data: c, postId: postRef.id });
          postIds.push(postRef.id);
          if (Array.isArray(c.mentions)) {
            c.mentions.forEach((m) => m?.uid && mentionUids.add(m.uid));
          }
        });

        const [postMap, userMap] = await Promise.all([
          getPostsByIds(postIds),
          getUsersByUids([...mentionUids]),
        ]);

        const mapped = comments
          .map(({ id: commentId, data: c, postId }) => {
            const p = postMap.get(postId);
            if (!p) return null; // 삭제글 제외

            let prefix = "";
            if (Array.isArray(c.mentions) && c.mentions.length) {
              const names = c.mentions
                .map((m) => (m?.uid ? userMap.get(m.uid)?.displayName : null))
                .filter(Boolean);
              if (names.length) prefix = names.map((n) => `@${n}`).join(" ") + " ";
            }

            const commentText = c.content ?? c.text ?? c.message ?? "";
            const full = `${prefix}${commentText}`;
            const postTitle = p.title ?? "(제목 없음)";

            return {
              __commentId: commentId,
              __deepLink: `/blog/${postId}?commentId=${commentId}`, // 하이라이트/스크롤 딥링크 유지
              id: postId,
              ...p,
              title: full,        // 카드 제목 = 내가 쓴 댓글(맨션 포함)
              content: postTitle, // 카드 본문 = 원글 제목
              __sort:
                c.createdAt && typeof c.createdAt.toMillis === "function"
                  ? c.createdAt.toMillis()
                  : 0,
            };
          })
          .filter(Boolean);

        mapped.sort((a, b) => (b.__sort || 0) - (a.__sort || 0));

        for (const m of mapped) {
          rows.push(m);
          if (rows.length >= pageSize) break;
        }
      }
      if (cgSnap.docs.length < LIMIT_N || (buildCursorOnly && lastRawDoc)) break;
      localCursor = lastRawDoc;
    }
    return { rows, lastRawDoc };
  }

  return { rows: [], lastRawDoc: null };
}

// 다음 2페이지 프리패치 (커서 기반)
async function prefetchNextPages({ userId, activeFilter, fromPage, cursors, count, pageSize }) {
  let localCursors = [...cursors];

  // (댓글 탭은 커서를 선계산했으므로 여기서 추가로 만들지 않음)
  if (activeFilter !== "comments") {
    for (let i = 0; i < count; i++) {
      const target = fromPage + 1 + i;
      if (target <= localCursors.length) continue;
      const prev = localCursors.at(-1) ?? null;
      const next = await fetchCursorOnce({
        userId,
        activeFilter,
        cursor: prev,
        pageSize,
        useBoost: true,
      });
      if (next) localCursors.push(next);
      else break;
    }
  }

  // rows 미리 캐시
  for (let i = 0; i < count; i++) {
    const target = fromPage + 1 + i;
    const key = `${userId}:${activeFilter}:${target}`;
    if (pageRowsCache.has(key)) continue;

    // target 페이지의 시작 커서 = cursors[target-2]
    if (target > Math.max(1, localCursors.length || 1)) break;
    const startCursor = target === 1 ? null : localCursors[target - 2] ?? null;

    const { rows } = await fetchDocsForPage({
      userId,
      activeFilter,
      cursor: startCursor,
      pageSize,
      buildCursorOnly: false,
    });
    pageRowsCache.set(key, rows);
  }
}

/** 6개 규칙 페이지 버튼 */
function SixPager({ page, totalPages, onSelect }) {
  const layout = useMemo(() => {
    if (totalPages <= 6) {
      return { left: Array.from({ length: totalPages }, (_, i) => i + 1), dots: false, right: [] };
    }
    if (page <= 5) {
      return { left: [1, 2, 3, 4, 5], dots: true, right: [totalPages] };
    }
    if (page >= totalPages - 4) {
      return {
        left: [1],
        dots: true,
        right: [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages],
      };
    }
    return { left: [1], dots: true, right: [page - 1, page, page + 1, totalPages] };
  }, [page, totalPages]);

  return (
    <div className="flex items-center gap-1">
      {layout.left.map((p) => (
        <NumBtn key={p} n={p} active={p === page} onClick={() => onSelect(p)} />
      ))}
      {layout.dots && <span className="px-1 select-none">…</span>}
      {layout.right.map((p) => (
        <NumBtn key={p} n={p} active={p === page} onClick={() => onSelect(p)} />
      ))}
    </div>
  );
}

function NumBtn({ n, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded border ${active ? "bg-gray-900 text-white" : "hover:bg-gray-100"}`}
    >
      {n}
    </button>
  );
}
