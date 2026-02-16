import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Image as ImageIcon, Info } from "lucide-react";

import BacktestShell, {
  glassCardPink,
  glassInnerPink,
  THEME_PINK,
  useCardFX,
} from "../ui/BacktestShell";
import { withBase } from "../utils/withBase";

function getColumnCount(width) {
  if (width >= 1536) return 7;
  if (width >= 1280) return 6;
  if (width >= 768) return 4;
  if (width >= 640) return 3;
  return 2;
}

function InfoCard({ title, subtitle, count, onBack }) {
  return (
    <div className={`${glassInnerPink} p-2.5 md:p-3 text-left`}>
      <div className="aspect-square w-full rounded-2xl bg-white/55 border border-white/70 p-3 md:p-4 flex flex-col">
        <button
          type="button"
          onClick={onBack}
          className="ripple-button inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/70 border border-white/70 text-[#8B4F58] font-black text-xs md:text-sm w-fit hover:bg-white/85 transition"
        >
          <ArrowLeft size={14} />
          返回分类
        </button>

        <div
          className="mt-3 text-base md:text-lg font-black"
          style={{
            backgroundImage: THEME_PINK.colors.primaryGradient,
            WebkitBackgroundClip: "text",
            color: "transparent",
          }}
          title={title || "作品墙"}
        >
          {title || "作品墙"}
        </div>

        <div className="mt-1 text-[11px] md:text-xs text-[#B88C95] font-semibold leading-relaxed overflow-hidden">
          {subtitle || "当前分类作品墙"}
        </div>

        <div className="mt-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/65 border border-white/70 text-[#8B4F58] text-[11px] md:text-xs font-black w-fit">
          <Info size={12} />
          {count} 作品
        </div>
      </div>

      <div className="mt-2 min-w-0">
        <div className="text-xs md:text-sm font-black text-[#8B4F58] truncate">分类功能卡</div>
        <div className="mt-1 text-[11px] md:text-xs text-[#C5A0A6] font-semibold truncate">
          返回上一层并查看分类信息
        </div>
      </div>
    </div>
  );
}

function WorkCard({ item, onClick }) {
  const cardFXProps = useCardFX();
  const thumb = item?.cover || "";
  const title = item?.title || "未命名作品";
  const subtitle = item?.subtitle || "";

  return (
    <button
      type="button"
      onClick={onClick}
      {...cardFXProps}
      className={`${glassInnerPink} ripple-button text-left p-2.5 md:p-3 transition will-change-transform`}
      title={title}
    >
      <div className="aspect-square w-full rounded-2xl bg-white/55 border border-white/70 overflow-hidden flex items-center justify-center">
        {thumb ? (
          <img
            src={thumb.startsWith("http") ? thumb : withBase(thumb)}
            alt={title}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-[#B88C95]">
            <ImageIcon size={20} />
            <span className="mt-2 text-xs font-semibold">{item?.emoji || "作品"}</span>
          </div>
        )}
      </div>

      <div className="mt-2 min-w-0">
        <div className="text-xs md:text-sm font-black text-[#8B4F58] truncate">{title}</div>
        {subtitle ? (
          <div className="mt-1 text-[11px] md:text-xs text-[#C5A0A6] font-semibold truncate">
            {subtitle}
          </div>
        ) : null}
      </div>
    </button>
  );
}

function StatusCard({ title, subtitle }) {
  return (
    <div className={`${glassInnerPink} p-2.5 md:p-3 text-left opacity-80`}>
      <div className="aspect-square w-full rounded-2xl bg-white/55 border border-white/70 flex items-center justify-center">
        <div className="text-center px-3">
          <div className="text-sm md:text-base font-black text-[#8B4F58]">{title}</div>
          {subtitle ? (
            <div className="mt-1 text-[11px] md:text-xs text-[#B88C95] font-semibold">{subtitle}</div>
          ) : null}
        </div>
      </div>

      <div className="mt-2 min-w-0">
        <div className="text-xs md:text-sm font-black text-[#8B4F58] truncate">{title}</div>
        {subtitle ? (
          <div className="mt-1 text-[11px] md:text-xs text-[#C5A0A6] font-semibold truncate">
            {subtitle}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PlaceholderCard() {
  return (
    <div className={`${glassInnerPink} p-2.5 md:p-3 text-left opacity-45 cursor-default select-none`}>
      <div className="aspect-square w-full rounded-2xl bg-white/55 border border-white/70 flex items-center justify-center">
        <div className="text-center">
          <div className="text-sm md:text-base font-black text-[#B88C95]">敬请期待</div>
          <div className="mt-1 text-[11px] md:text-xs text-[#C5A0A6] font-semibold">Coming soon...</div>
        </div>
      </div>

      <div className="mt-2 min-w-0">
        <div className="text-xs md:text-sm font-black text-[#B88C95] truncate">敬请期待</div>
        <div className="mt-1 text-[11px] md:text-xs text-[#C5A0A6] font-semibold truncate">占位卡片（不可点击）</div>
      </div>
    </div>
  );
}

export default function CollectionWallPage({
  title,
  subtitle,
  count = 0,
  items = [],
  loading = false,
  emptyText = "暂无作品，稍后再来",
  onCardClick,
  onBack,
  children,
}) {
  const [columns, setColumns] = useState(4);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const update = () => setColumns(getColumnCount(window.innerWidth));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const renderedWorks = useMemo(() => {
    if (loading) {
      return [{ id: "__loading__", _status: true, title: "加载中...", subtitle: "正在读取分类作品" }];
    }
    if (items.length === 0) {
      return [{ id: "__empty__", _status: true, title: emptyText, subtitle: "请稍后再来看看" }];
    }
    return items.map((item, idx) => ({ ...item, id: item?.id || `item-${idx}` }));
  }, [emptyText, items, loading]);

  const placeholders = useMemo(() => {
    const currentCount = 1 + renderedWorks.length; // 1 = info card
    const minCount = columns >= 6 ? Math.max(currentCount, columns * 4) : currentCount;
    const remainder = minCount % columns;
    const targetCount = remainder === 0 ? minCount : minCount + (columns - remainder);
    return Math.max(0, targetCount - currentCount);
  }, [columns, renderedWorks.length]);

  return (
    <BacktestShell
      title=""
      subtitle=""
      showHero={false}
      wide={true}
      tone="pink"
      scrollable={true}
    >
      <div className="max-w-[1800px] mx-auto pb-8">
        <div className={`${glassCardPink} p-3 md:p-4`}>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7 gap-3 md:gap-4">
            <InfoCard title={title} subtitle={subtitle} count={count} onBack={onBack} />

            {renderedWorks.map((item) =>
              item._status ? (
                <StatusCard key={item.id} title={item.title} subtitle={item.subtitle} />
              ) : (
                <WorkCard key={item.id} item={item} onClick={() => onCardClick?.(item)} />
              ),
            )}

            {Array.from({ length: placeholders }, (_, idx) => (
              <PlaceholderCard key={`placeholder-${idx}`} />
            ))}
          </div>
        </div>
      </div>

      {children}
    </BacktestShell>
  );
}

