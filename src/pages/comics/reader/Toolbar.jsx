import React from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  LayoutList,
  BookOpen,
  ZoomIn,
  ZoomOut,
  Sun,
  Moon,
  Columns,
} from "lucide-react";

/**
 * 漫画阅读页 - 顶部固定工具栏
 * 仅使用 Tailwind comic-* 语义色，禁止写死 #xxx
 */
export default function Toolbar({
  onBack,
  onPrevChapter,
  onNextChapter,
  hasPrevChapter,
  hasNextChapter,
  onPrevPage,
  onNextPage,
  hasPrevPage,
  hasNextPage,
  readMode,
  onReadModeChange,
  singleOrDouble,
  onSingleDoubleChange,
  showSingleDouble,
  scale,
  onScaleDown,
  onScaleUp,
  brightness,
  onBrightnessToggle,
  displayMode,
  onDisplayModeChange,
  children,
}) {
  return (
    <header
      className="sticky top-0 z-20 flex items-center gap-2 md:gap-3 px-3 py-2 md:px-4 md:py-2.5
        bg-comic-bg/92 backdrop-blur-md border-b border-comic-border shadow-sm"
    >
      <button
        type="button"
        onClick={onBack}
        className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl
          bg-comic-bg-mist border border-comic-border-soft text-comic-text
          text-sm font-semibold hover:bg-comic-border-soft/50 transition-colors"
        aria-label="返回首页"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="hidden sm:inline">返回</span>
      </button>

      <div className="hidden md:block w-px h-6 bg-comic-border" aria-hidden />

      <button
        type="button"
        onClick={onPrevChapter}
        disabled={!hasPrevChapter}
        className="shrink-0 flex items-center gap-1 px-2 py-1.5 rounded-lg
          bg-comic-bg-mist border border-comic-border-soft text-comic-text
          text-sm font-medium hover:enabled:bg-comic-border-soft/50
          disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="上一章"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onNextChapter}
        disabled={!hasNextChapter}
        className="shrink-0 flex items-center gap-1 px-2 py-1.5 rounded-lg
          bg-comic-bg-mist border border-comic-border-soft text-comic-text
          text-sm font-medium hover:enabled:bg-comic-border-soft/50
          disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="下一章"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      <div className="hidden md:block w-px h-6 bg-comic-border" aria-hidden />

      <button
        type="button"
        onClick={onPrevPage}
        disabled={!hasPrevPage}
        className="shrink-0 flex items-center gap-1 px-2 py-1.5 rounded-lg
          bg-comic-bg-mist border border-comic-border-soft text-comic-text
          text-sm font-medium hover:enabled:bg-comic-border-soft/50
          disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="上一页"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onNextPage}
        disabled={!hasNextPage}
        className="shrink-0 flex items-center gap-1 px-2 py-1.5 rounded-lg
          bg-comic-bg-mist border border-comic-border-soft text-comic-text
          text-sm font-medium hover:enabled:bg-comic-border-soft/50
          disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="下一页"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      <div className="hidden md:block w-px h-6 bg-comic-border" aria-hidden />

      <div className="flex items-center gap-1 rounded-lg bg-comic-bg-mist border border-comic-border-soft p-0.5">
        <button
          type="button"
          onClick={() => onReadModeChange("scroll")}
          className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-sm font-medium transition-colors ${
            readMode === "scroll"
              ? "bg-comic-accent text-white"
              : "text-comic-text hover:bg-comic-border-soft/50"
          }`}
          title="滚动模式"
        >
          <LayoutList className="h-4 w-4" />
          <span className="hidden sm:inline">滚动</span>
        </button>
        <button
          type="button"
          onClick={() => onReadModeChange("flip")}
          className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-sm font-medium transition-colors ${
            readMode === "flip"
              ? "bg-comic-accent text-white"
              : "text-comic-text hover:bg-comic-border-soft/50"
          }`}
          title="翻页模式"
        >
          <BookOpen className="h-4 w-4" />
          <span className="hidden sm:inline">翻页</span>
        </button>
      </div>

      <div className="hidden md:block w-px h-6 bg-comic-border" aria-hidden />

      <div className="flex items-center gap-1 rounded-lg bg-comic-bg-mist border border-comic-border-soft p-0.5">
        <button
          type="button"
          onClick={() => onDisplayModeChange?.("standard")}
          className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-sm font-medium transition-colors ${
            displayMode === "standard"
              ? "bg-comic-accent text-white"
              : "text-comic-text hover:bg-comic-border-soft/50"
          }`}
          title="不裁切，允许左右留白"
        >
          标准
        </button>
        <button
          type="button"
          onClick={() => onDisplayModeChange?.("immersive")}
          className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-sm font-medium transition-colors ${
            displayMode === "immersive"
              ? "bg-comic-accent text-white"
              : "text-comic-text hover:bg-comic-border-soft/50"
          }`}
          title={readMode === "flip" ? "更满屏，可能裁边" : "按宽度铺满，减少左右空白"}
        >
          沉浸
          {readMode === "flip" ? (
            <span className="ml-0.5 text-[10px] opacity-80" title="可能裁边">
              (可能裁边)
            </span>
          ) : null}
        </button>
      </div>

      {showSingleDouble ? (
        <>
          <div className="hidden md:block w-px h-6 bg-comic-border" aria-hidden />
          <div className="flex items-center gap-1 rounded-lg bg-comic-bg-mist border border-comic-border-soft p-0.5">
            <button
              type="button"
              onClick={() => onSingleDoubleChange("single")}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-sm font-medium transition-colors ${
                singleOrDouble === "single"
                  ? "bg-comic-accent text-white"
                  : "text-comic-text hover:bg-comic-border-soft/50"
              }`}
              title="单页"
            >
              <BookOpen className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onSingleDoubleChange("double")}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-sm font-medium transition-colors ${
                singleOrDouble === "double"
                  ? "bg-comic-accent text-white"
                  : "text-comic-text hover:bg-comic-border-soft/50"
              }`}
              title="双页"
            >
              <Columns className="h-4 w-4" />
            </button>
          </div>
        </>
      ) : null}

      <div className="hidden md:block w-px h-6 bg-comic-border" aria-hidden />

      <div className="flex items-center gap-0.5 rounded-lg bg-comic-bg-mist border border-comic-border-soft">
        <button
          type="button"
          onClick={onScaleDown}
          className="p-1.5 rounded-md text-comic-text hover:bg-comic-border-soft/50 transition-colors"
          title="缩小"
          aria-label="缩小"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <span className="min-w-[3rem] text-center text-sm font-medium text-comic-text-muted">
          {Math.round(scale * 100)}%
        </span>
        <button
          type="button"
          onClick={onScaleUp}
          className="p-1.5 rounded-md text-comic-text hover:bg-comic-border-soft/50 transition-colors"
          title="放大"
          aria-label="放大"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
      </div>

      <button
        type="button"
        onClick={onBrightnessToggle}
        className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl
          bg-comic-bg-mist border border-comic-border-soft text-comic-text
          text-sm font-medium hover:bg-comic-border-soft/50 transition-colors"
        title={brightness === "light" ? "护眼（更浅）" : "默认亮度"}
      >
        {brightness === "light" ? (
          <Moon className="h-4 w-4" />
        ) : (
          <Sun className="h-4 w-4" />
        )}
        <span className="hidden sm:inline text-comic-text-muted">
          {brightness === "light" ? "护眼" : "亮度"}
        </span>
      </button>

      {children ? (
        <div className="flex-1 min-w-0 flex justify-end">{children}</div>
      ) : null}
    </header>
  );
}
