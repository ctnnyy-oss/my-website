import React from "react";

/**
 * 漫画阅读页 - 作品/章节选择 + 当前页/总页数
 * 仅使用 Tailwind comic-* 语义色
 */
export default function Selector({
  works = [],
  chapters = [],
  currentWorkId,
  currentChapterId,
  currentChapterTitle,
  onWorkChange,
  onChapterChange,
  currentPage,
  totalPages,
  loading,
}) {
  const hasWorks = works.length > 0;
  const hasChapters = chapters.length > 1;

  return (
    <div className="flex flex-wrap items-center gap-2 md:gap-3 shrink-0">
      {hasWorks ? (
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-comic-text-muted whitespace-nowrap">
            作品
          </label>
          <select
            value={currentWorkId ?? ""}
            onChange={(e) => onWorkChange?.(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-comic-bg-mist border border-comic-border-soft
              text-comic-text text-sm font-medium outline-none focus:ring-2 focus:ring-comic-accent/30
              min-w-[8rem]"
          >
            {works.map((w) => (
              <option key={w.id} value={w.id}>
                {w.title || w.id}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {hasChapters ? (
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-comic-text-muted whitespace-nowrap">
            章节
          </label>
          <select
            value={currentChapterId ?? ""}
            onChange={(e) => onChapterChange?.(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-comic-bg-mist border border-comic-border-soft
              text-comic-text text-sm font-medium outline-none focus:ring-2 focus:ring-comic-accent/30
              min-w-[7rem]"
          >
            {chapters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title || c.id}
              </option>
            ))}
          </select>
        </div>
      ) : currentChapterTitle ? (
        <span className="text-sm font-medium text-comic-text-muted truncate max-w-[12rem]">
          {currentChapterTitle}
        </span>
      ) : null}

      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-comic-bg-mist border border-comic-border-soft">
        <span className="text-xs font-medium text-comic-text-muted">页码</span>
        <span className="text-sm font-semibold text-comic-text">
          {loading ? "…" : totalPages ? `${currentPage} / ${totalPages}` : "—"}
        </span>
      </div>
    </div>
  );
}
