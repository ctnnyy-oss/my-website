import React from "react";
import { Image as ImageIcon } from "lucide-react";

import BacktestShell, {
  glassCardPink,
  glassInnerPink,
  THEME_PINK,
  useCardFX,
} from "../ui/BacktestShell";
import { withBase } from "../utils/withBase";

function WallCard({ item, onClick }) {
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
  return (
    <BacktestShell
      title=""
      subtitle=""
      showHero={false}
      wide={true}
      tone="pink"
      scrollable={true}
      onBack={onBack}
      backText="返回分类"
    >
      <div className="max-w-[1800px] mx-auto pb-8">
        <div className={`${glassCardPink} p-4 md:p-6`}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1
                className="text-2xl md:text-3xl font-black truncate"
                style={{
                  backgroundImage: THEME_PINK.colors.primaryGradient,
                  WebkitBackgroundClip: "text",
                  color: "transparent",
                  filter: "drop-shadow(0 10px 22px rgba(255,126,169,0.12))",
                }}
              >
                {title || "作品墙"}
              </h1>
              {subtitle ? (
                <p className="mt-2 text-sm md:text-base text-[#B88C95] font-semibold truncate">
                  {subtitle}
                </p>
              ) : null}
            </div>

            <div className="shrink-0 px-4 py-2 rounded-full bg-white/55 border border-white/70 text-[#8B4F58] font-black text-sm">
              {count} 作品
            </div>
          </div>
        </div>

        <div className={`${glassCardPink} mt-4 p-3 md:p-4`}>
          {loading ? (
            <div className="h-48 flex items-center justify-center text-[#B88C95] font-semibold">
              加载中...
            </div>
          ) : items.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-[#B88C95] font-semibold">
              {emptyText}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7 gap-3 md:gap-4">
              {items.map((item, idx) => (
                <WallCard
                  key={item?.id || `wall-item-${idx}`}
                  item={item}
                  onClick={() => onCardClick?.(item)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {children}
    </BacktestShell>
  );
}

