import React from "react";
import { ArrowLeft, Clock } from "lucide-react";

import BacktestShell, {
  glassCardPink,
  glassInnerPink,
  THEME_PINK,
  useCardFX,
} from "../ui/BacktestShell";
import { withBase } from "../utils/withBase";

/**
 * PlaceholderCard
 * Looks like a real card but not clickable, shows "敬请期待".
 */
function PlaceholderCard() {
  return (
    <div
      className={`${glassInnerPink} w-full text-left p-5 md:p-6 opacity-45 cursor-default select-none`}
    >
      <div className="relative flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl bg-white/55 border border-white/70 shadow-sm flex items-center justify-center shrink-0">
          <Clock className="w-6 h-6 text-[#C5A0A6]" />
        </div>
        <div className="min-w-0">
          <div className="text-lg font-black text-[#C5A0A6]">敬请期待</div>
          <div className="mt-1 text-sm text-[#C5A0A6] font-semibold leading-snug">
            Coming soon...
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * ItemCard
 * Same visual style as ModuleCard in Home.jsx.
 */
function ItemCard({ item, onClick }) {
  const cardFXProps = useCardFX();
  const Icon = item.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      {...cardFXProps}
      className={`${glassInnerPink} ripple-button group w-full text-left p-5 md:p-6 transition will-change-transform`}
    >
      <div className="relative">
        <div
          className={`absolute -right-10 top-1/2 -translate-y-1/2 w-44 h-44 rounded-full bg-gradient-to-br ${
            item.accent || "from-[#FFD1E0] to-[#FF8FB5]"
          } opacity-[0.18] blur-3xl`}
        />
        <div className="relative flex items-start gap-4">
          {item.cover ? (
            <div className="w-14 h-14 rounded-2xl bg-white/55 border border-white/70 shadow-sm overflow-hidden shrink-0">
              <img
                src={item.cover.startsWith("http") ? item.cover : withBase(item.cover)}
                alt={item.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-white/55 border border-white/70 shadow-sm flex items-center justify-center shrink-0">
              {Icon ? (
                <Icon className="w-7 h-7 text-[#7A3E4B]" />
              ) : (
                <span className="text-2xl">{item.emoji || "📄"}</span>
              )}
            </div>
          )}

          <div className="min-w-0">
            <div className="text-lg font-black text-[#8B4F58] truncate">
              {item.title}
            </div>
            <div className="mt-1 text-sm text-[#C5A0A6] font-semibold leading-snug">
              {item.subtitle || ""}
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

/**
 * UnifiedCategoryPage
 *
 * Unified layout for all 2nd-level category pages:
 * - Left ~1/4: category introduction panel
 * - Right ~3/4: up to 6 cards (2 rows x 3 cols), padded with placeholders
 *
 * Visual style matches Home.jsx exactly (glassCardPink, same grid, same card style).
 */
export default function UnifiedCategoryPage({
  title,
  subtitle,
  icon: PageIcon,
  description,
  items = [],
  onCardClick,
  onBack,
  loading = false,
  children,
}) {
  const displayItems = items.slice(0, 6);
  while (displayItems.length < 6) {
    displayItems.push({ id: `_placeholder_${displayItems.length}`, _placeholder: true });
  }

  return (
    <BacktestShell
      title=""
      subtitle=""
      headerRight={null}
      showHero={false}
      wide={true}
      tone="pink"
    >
      <div
        className="grid lg:grid-cols-[minmax(320px,1fr)_minmax(0,2.6fr)] gap-6 items-stretch"
        style={{ minHeight: "calc(100vh - 140px)" }}
      >
        {/* Left: Introduction */}
        <div className="h-full flex flex-col">
          <div className={`${glassCardPink} p-6 md:p-8 flex-1 flex flex-col`}>
            <div className="flex flex-col items-start text-left">
              {onBack ? (
                <button
                  type="button"
                  onClick={onBack}
                  className="ripple-button inline-flex items-center gap-2 px-4 py-2 bg-white/55 backdrop-blur-xl rounded-full border border-white/70 shadow-sm font-black transition mb-5"
                  style={{ color: THEME_PINK.colors.textMain }}
                  aria-label="返回主页"
                >
                  <ArrowLeft size={18} />
                  返回主页
                </button>
              ) : null}

              <h1
                className="text-4xl md:text-5xl font-black tracking-tight"
                style={{
                  backgroundImage: THEME_PINK.colors.primaryGradient,
                  WebkitBackgroundClip: "text",
                  color: "transparent",
                  filter: "drop-shadow(0 10px 22px rgba(255,126,169,0.12))",
                }}
              >
                {title}
              </h1>

              {subtitle ? (
                <p className="mt-2 text-sm font-semibold text-[#B88C95]">{subtitle}</p>
              ) : null}

              <div className="mt-6 w-full h-[1px] bg-gradient-to-r from-transparent via-[#FFE1EC] to-transparent opacity-70" />

              {PageIcon ? (
                <div className="mt-6 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/55 border border-white/70 shadow-sm flex items-center justify-center">
                    <PageIcon className="w-6 h-6 text-[#7A3E4B]" />
                  </div>
                  <div className="text-sm font-black text-[#7A3E4B] tracking-wide">
                    {title}
                  </div>
                </div>
              ) : null}

              <div className="mt-6 space-y-3 text-sm leading-relaxed text-[#8A5562] font-semibold">
                {description}
              </div>
            </div>
          </div>
        </div>

        {/* Right: 6 Cards */}
        <div className="h-full flex flex-col">
          <div className={`${glassCardPink} p-5 md:p-7 flex-1 flex flex-col`}>
            {loading ? (
              <div className="flex-1 flex items-center justify-center text-[#B88C95] font-semibold">
                加载中...
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 flex-1 auto-rows-fr">
                {displayItems.map((item) =>
                  item._placeholder ? (
                    <PlaceholderCard key={item.id} />
                  ) : (
                    <ItemCard
                      key={item.id}
                      item={item}
                      onClick={() => onCardClick?.(item)}
                    />
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {children}
    </BacktestShell>
  );
}
