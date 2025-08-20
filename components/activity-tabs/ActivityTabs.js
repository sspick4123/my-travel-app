import React, { useState } from "react";
import BlogTabContent from "./BlogTabContent";
import CommunityTabContent from "./CommunityTabContent";
import ScheduleTabContent from "./ScheduleTabContent";

export default function ActivityTabs({
  userId,
  showBookmarks = false,
  showComments = false,
}) {
  const [mainTab, setMainTab] = useState("blog"); // blog, community, schedule
  const [subTab, setSubTab] = useState("written"); // written, likes, bookmarks, comments

  const mainTabs = [
    { key: "blog", label: "블로그" },
    { key: "community", label: "커뮤니티" },
    { key: "schedule", label: "일정 공유" },
  ];

  const subTabs = [
    { key: "written", label: "내가 쓴 글" },
    { key: "likes", label: "좋아요" },
    ...(showBookmarks ? [{ key: "bookmarks", label: "북마크" }] : []),
    ...(showComments ? [{ key: "comments", label: "댓글" }] : []),
  ];

  const tabButtonClass = (tab, currentTab) =>
    `px-4 py-2 rounded-t-lg border-b-2 transition-all duration-200 text-base font-semibold ${
      currentTab === tab
        ? "border-blue-500 text-blue-600"
        : "border-transparent text-gray-500 hover:text-blue-500"
    }`;

  const renderContent = () => {
    const commonProps = { userId, activeFilter: subTab };

    if (mainTab === "blog") return <BlogTabContent {...commonProps} />;
    if (mainTab === "community") return <CommunityTabContent {...commonProps} />;
    if (mainTab === "schedule") return <ScheduleTabContent {...commonProps} />;
    return null;
  };

  return (
    <div className="w-full">
      {/* 메인 탭 (블로그 / 커뮤니티 / 일정 공유) */}
      <div className="flex space-x-4 border-b mb-4">
        {mainTabs.map((tab) => (
          <button
            key={tab.key}
            className={tabButtonClass(tab.key, mainTab)}
            onClick={() => setMainTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 하위 필터 탭 (내가 쓴 글 / 좋아요 / 북마크 / 댓글) */}
      <div className="flex space-x-4 mb-6">
        {subTabs.map((tab) => (
          <button
            key={tab.key}
            className={tabButtonClass(tab.key, subTab)}
            onClick={() => setSubTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 게시글 리스트 */}
      <div>{renderContent()}</div>
    </div>
  );
}
