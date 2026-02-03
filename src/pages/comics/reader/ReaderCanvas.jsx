import React, { useEffect, useRef, useImperativeHandle, forwardRef } from "react";

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

/**
 * 漫画阅读页 - 内容区（MVP 仅滚动模式）
 * 占满宽高，纵向滚动，懒加载，IntersectionObserver 上报当前页
 * ref.current.scrollToPage(1-based) 供工具栏上一页/下一页使用
 */
const ReaderCanvas = forwardRef(function ReaderCanvas(
  {
    pages = [],
    readMode,
    displayMode = "standard",
    scale = 1,
    brightness = "default",
    onCurrentPageChange,
  },
  ref
) {
  const containerRef = useRef(null);
  const pageRefs = useRef([]);

  useImperativeHandle(ref, () => ({
    scrollToPage(oneBased) {
      if (!pages.length) return;
      const idx = clamp(Number(oneBased) - 1, 0, pages.length - 1);
      const el = pageRefs.current[idx];
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    },
  }), [pages.length]);

  // 护眼：通过 CSS 变量影响图片 filter
  useEffect(() => {
    const root = document.querySelector(".comic-reader-page");
    if (!root) return;
    if (brightness === "light") {
      root.style.setProperty("--comic-brightness", "1.08");
      root.style.setProperty("--comic-contrast", "0.96");
    } else {
      root.style.setProperty("--comic-brightness", "1");
      root.style.setProperty("--comic-contrast", "1");
    }
    return () => {
      root.style.removeProperty("--comic-brightness");
      root.style.removeProperty("--comic-contrast");
    };
  }, [brightness]);

  // 滚动模式：观察哪一页进入视口，更新 current
  useEffect(() => {
    if (readMode !== "scroll" || !pages.length) return;

    const els = pageRefs.current.filter(Boolean);
    if (!els.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .map((e) => ({
            top: e.boundingClientRect.top,
            idx: Number(e.target.getAttribute("data-idx") ?? 0),
          }))
          .sort((a, b) => a.top - b.top);
        if (visible.length > 0) {
          const idx = clamp(visible[0].idx + 1, 1, pages.length);
          onCurrentPageChange?.(idx);
        }
      },
      {
        root: null,
        rootMargin: "-30% 0px -50% 0px",
        threshold: [0.01, 0.2],
      }
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [readMode, pages.length, onCurrentPageChange]);

  // MVP：仅渲染滚动模式
  if (readMode !== "scroll") {
    return (
      <div className="flex-1 min-h-0 flex items-center justify-center bg-comic-bg-mist">
        <p className="text-comic-text-muted text-sm">翻页模式将在后续迭代中开放</p>
      </div>
    );
  }

  if (!pages.length) {
    return (
      <div className="flex-1 min-h-0 flex items-center justify-center bg-comic-bg-mist">
        <p className="text-comic-text-muted text-sm">暂无页面</p>
      </div>
    );
  }

  // 标准 = 不裁切、允许左右留白（最大宽度 960px）；沉浸 = 按宽度铺满、减少左右空白
  const isImmersive = displayMode === "immersive";
  const contentMaxWidth = isImmersive ? "100%" : "min(100%, 960px)";
  const contentWidth = isImmersive ? "100%" : "min(100%, 960px)";

  return (
    <div
      ref={containerRef}
      className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden comic-reader-scrollbar"
      style={{ background: "var(--tw-gradient-from, #FFF5F8)" }}
    >
      <div
        className="mx-auto py-4 px-2 md:px-4"
        style={{
          maxWidth: contentMaxWidth,
          width: contentWidth,
        }}
      >
        {pages.map((p, idx) => (
          <div
            key={p.rel}
            ref={(el) => (pageRefs.current[idx] = el)}
            data-idx={idx}
            className="mb-4 rounded-2xl overflow-hidden border border-comic-border-soft shadow-sm"
            style={{
              transform: `scale(${scale})`,
              transformOrigin: "top center",
            }}
          >
            <img
              src={p.url}
              alt={`第 ${idx + 1} 页`}
              loading="lazy"
              decoding="async"
              className="w-full block object-contain"
              style={{
                filter: "var(--comic-page-filter, none)",
                maxWidth: "100%",
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
});

export default ReaderCanvas;
