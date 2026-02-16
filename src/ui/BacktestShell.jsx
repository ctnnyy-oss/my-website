import React, { useEffect } from "react";
import { ArrowLeft } from "lucide-react";

/**
 * BacktestShell（回测风格外壳）
 * - 把 Backtest.jsx（回测页）那套「大标题 + 玻璃面板 + 背景氛围」抽成可复用外壳
 * - 其他页面直接套这个，就能统一美术风格
 *
 * ✅ 本次新增：
 * - 多个 tone（sakura/cotton/strawberry/iphone15）
 * - 通过 tone-* class 给 CSS 提供变量（让 bloom / vignette / scrollbar 跟着换色）
 * - 提供 getGlassCard / getGlassInner 让主页不需要写一堆 if
 */

export const THEME = {
  colors: {
    primary: "#FF8FAB",
    primarySoft: "#FFC2D1",
    primaryGradient: "linear-gradient(135deg, #FF99A8 0%, #FF5D7D 100%)",
    secondary: "#89CFF0",
    secondarySoft: "#BAE1FF",
    secondaryGradient: "linear-gradient(135deg, #A7C5EB 0%, #6495ED 100%)",
    textMain: "#8B4F58",
    textLight: "#C5A0A6",
    bgGradient: "linear-gradient(180deg, #FFF0F5 0%, #FFF5F7 100%)",
  },
};

// ✅ 旧版粉色（保留给其他页面 / 兼容）
export const THEME_PINK = {
  colors: {
    // ✅ 2026-01 迭代：把“死亡芭比粉”整体调成「浅浅淡淡的奶油粉」
    // - 目标：更通透、更接近白底，只在边缘留一点点粉彩氛围
    primary: "#FF7EA9",
    primarySoft: "#FFE1EC",
    primaryGradient:
      "linear-gradient(135deg, #FFF7FB 0%, #FFD6E6 45%, #FF7EA9 100%)",
    secondary: "#E9D9FF", // lavender（薰衣草紫）只做点缀
    secondarySoft: "#F5EEFF",
    secondaryGradient: "linear-gradient(135deg, #FFE9F4 0%, #F3E9FF 100%)",
    textMain: "#6D2E44",
    textLight: "#B1879B",
    bgGradient:
      "linear-gradient(180deg, #FFF9FC 0%, #FFF1F6 55%, #FFFAFD 100%)",
  },
};

// ✅ 更“少女心”的主页主题：樱花糖/棉花糖/草莓牛奶/iPhone 15 粉
export const THEME_SAKURA = {
  colors: {
    primary: "#FF2D8A",
    primarySoft: "#FFD0E8",
    primaryGradient: "linear-gradient(135deg, #FF2D8A 0%, #FF7DBD 55%, #FFD0E8 100%)",
    secondary: "#FFB4D6",
    secondarySoft: "#FFE6F2",
    secondaryGradient: "linear-gradient(135deg, #FFB4D6 0%, #FFD0E8 100%)",
    textMain: "#6B2E3B",
    textLight: "#B07D95",
    bgGradient: "linear-gradient(180deg, #FFF2F8 0%, #FFE6F2 45%, #FFF7FB 100%)",
  },
};

export const THEME_COTTON = {
  colors: {
    primary: "#FF4FA0",
    primarySoft: "#FFB0D7",
    primaryGradient: "linear-gradient(135deg, #FF4FA0 0%, #FFB0D7 60%, #F7E3FF 100%)",
    secondary: "#FFC1E0",
    secondarySoft: "#FFE7F4",
    secondaryGradient: "linear-gradient(135deg, #FFC1E0 0%, #F7E3FF 100%)",
    textMain: "#6D2E44",
    textLight: "#B1879B",
    bgGradient: "linear-gradient(180deg, #FFF2FA 0%, #FFE7F4 55%, #FAF1FF 100%)",
  },
};

export const THEME_STRAWBERRY = {
  colors: {
    primary: "#FF3B73",
    primarySoft: "#FF9AB8",
    primaryGradient: "linear-gradient(135deg, #FF3B73 0%, #FF9AB8 60%, #FFE8F0 100%)",
    secondary: "#FFB6CE",
    secondarySoft: "#FFF0F5",
    secondaryGradient: "linear-gradient(135deg, #FFB6CE 0%, #FFE8F0 100%)",
    textMain: "#7A2D3E",
    textLight: "#B67F93",
    bgGradient: "linear-gradient(180deg, #FFF1F5 0%, #FFE8F0 55%, #FFF7FA 100%)",
  },
};

export const THEME_IPHONE15 = {
  colors: {
    primary: "#FF3B86",
    primarySoft: "#FAD0DA",
    primaryGradient: "linear-gradient(135deg, #FAD0DA 0%, #FF7EA9 55%, #FF3B86 100%)",
    secondary: "#FF7EA9",
    secondarySoft: "#FFE7EE",
    secondaryGradient: "linear-gradient(135deg, #FF7EA9 0%, #FAD0DA 100%)",
    textMain: "#6A3143",
    textLight: "#B38A9B",
    bgGradient: "linear-gradient(180deg, #FFF2F5 0%, #FFE7EE 55%, #FFF8FA 100%)",
  },
};

const THEMES = {
  default: THEME,
  pink: THEME_PINK,
  sakura: THEME_SAKURA,
  cotton: THEME_COTTON,
  strawberry: THEME_STRAWBERRY,
  iphone15: THEME_IPHONE15,
};

export const glassCard =
  "bg-white/40 backdrop-blur-xl rounded-[28px] shadow-[0_18px_60px_rgba(255,143,171,0.12)] border border-white/70 relative overflow-hidden card-bloom";
export const glassInner =
  "bg-white/35 backdrop-blur-xl rounded-[22px] border border-white/60";

// ✅ 旧版粉（保留兼容）
export const glassCardPink =
  // ✅ 更浅、更干净：用白色玻璃为主，粉色只留在阴影里
  "bg-white/46 backdrop-blur-xl rounded-[28px] shadow-[0_22px_70px_rgba(255,126,169,0.12)] border border-white/70 relative overflow-hidden card-bloom";
export const glassInnerPink =
  "bg-white/38 backdrop-blur-xl rounded-[22px] border border-white/65";

// ✅ 新主题的玻璃（更奶油/更粉）
export const glassCardSakura =
  "bg-[#FFE9F4]/62 backdrop-blur-xl rounded-[28px] shadow-[0_26px_78px_rgba(255,45,138,0.14)] border border-white/65 relative overflow-hidden card-bloom";
export const glassInnerSakura =
  "bg-[#FFE9F4]/50 backdrop-blur-xl rounded-[22px] border border-white/55";

export const glassCardCotton =
  "bg-[#FFEAF6]/60 backdrop-blur-xl rounded-[28px] shadow-[0_26px_78px_rgba(255,79,160,0.12)] border border-white/65 relative overflow-hidden card-bloom";
export const glassInnerCotton =
  "bg-[#FFEAF6]/48 backdrop-blur-xl rounded-[22px] border border-white/55";

export const glassCardStrawberry =
  "bg-[#FFF0F6]/62 backdrop-blur-xl rounded-[28px] shadow-[0_26px_78px_rgba(255,59,115,0.12)] border border-white/65 relative overflow-hidden card-bloom";
export const glassInnerStrawberry =
  "bg-[#FFF0F6]/50 backdrop-blur-xl rounded-[22px] border border-white/55";

export const glassCardIphone15 =
  "bg-[#FFF2F5]/62 backdrop-blur-xl rounded-[28px] shadow-[0_26px_78px_rgba(255,59,134,0.10)] border border-white/65 relative overflow-hidden card-bloom";
export const glassInnerIphone15 =
  "bg-[#FFF2F5]/50 backdrop-blur-xl rounded-[22px] border border-white/55";

const GLASS = {
  default: { card: glassCard, inner: glassInner },
  pink: { card: glassCardPink, inner: glassInnerPink },
  sakura: { card: glassCardSakura, inner: glassInnerSakura },
  cotton: { card: glassCardCotton, inner: glassInnerCotton },
  strawberry: { card: glassCardStrawberry, inner: glassInnerStrawberry },
  iphone15: { card: glassCardIphone15, inner: glassInnerIphone15 },
};

export function getGlassCard(tone = "default") {
  return (GLASS[tone] ?? GLASS.default).card;
}
export function getGlassInner(tone = "default") {
  return (GLASS[tone] ?? GLASS.default).inner;
}

export function useCardFX() {
  // 复刻 Backtest.jsx（回测页） 的「轻 3D（立体）倾斜」效果
  const handleCardMouseEnter = (e) => {
    const el = e.currentTarget;
    el.dataset.hovering = "1";
    el.classList.add("card-pop-in");
    if (el.__popTimer) clearTimeout(el.__popTimer);
    el.__popTimer = setTimeout(() => el.classList.remove("card-pop-in"), 520);
  };

  const handleCardMouseMove = (e) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left,
      y = e.clientY - rect.top;
    const centerX = rect.width / 2,
      centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -7.5;
    const rotateY = ((x - centerX) / centerX) * 7.5;

    const hovering = el.dataset.hovering === "1";
    const scale = hovering ? 1.018 : 1.0;
    const lift = hovering ? -2.5 : 0;

    el.style.transform = `perspective(1000px) translateY(${lift}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${scale}) translateZ(${
      hovering ? 10 : 0
    }px)`;
    el.style.setProperty("--mx", `${(x / rect.width) * 100}%`);
    el.style.setProperty("--my", `${(y / rect.height) * 100}%`);
  };

  const handleCardMouseLeave = (e) => {
    const el = e.currentTarget;
    el.dataset.hovering = "0";
    el.style.transform =
      "perspective(1000px) translateY(0px) rotateX(0deg) rotateY(0deg) scale(1) translateZ(0px)";
    el.style.removeProperty("--mx");
    el.style.removeProperty("--my");
  };

  return {
    onMouseEnter: handleCardMouseEnter,
    onMouseMove: handleCardMouseMove,
    onMouseLeave: handleCardMouseLeave,
  };
}

function useRipple() {
  // 点击涟漪（ripple，涟漪）效果：只作用在 .ripple-button
  useEffect(() => {
    const handleRipple = (e) => {
      const button = e.target.closest?.(".ripple-button");
      if (!button) return;
      const rect = button.getBoundingClientRect();
      const x = e.clientX - rect.left,
        y = e.clientY - rect.top;
      const ripple = document.createElement("span");
      ripple.className = "ripple-effect";
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      button.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    };
    document.addEventListener("click", handleRipple);
    return () => document.removeEventListener("click", handleRipple);
  }, []);
}

const BLOBS = {
  default: [
    ["linear-gradient(135deg, #FFC2D1 0%, #BAE1FF 100%)", 0.35, "-top-40 -left-40 w-[520px] h-[520px]"],
    ["linear-gradient(135deg, #BAE1FF 0%, #FF8FAB 100%)", 0.25, "-bottom-52 -right-56 w-[620px] h-[620px]"],
    ["linear-gradient(135deg, #FF8FAB 0%, #FFC2D1 100%)", 0.18, "top-1/3 -right-40 w-[520px] h-[520px]"],
    ["linear-gradient(135deg, #BAE1FF 0%, #FFC2D1 100%)", 0.16, "bottom-1/4 -left-44 w-[480px] h-[480px]"],
  ],
  pink: [
    // ✅ 低饱和 + 低不透明度（opacity）：更“奶油粉”的底色
    ["linear-gradient(135deg, #FFF7FB 0%, #FFD6E6 100%)", 0.24, "-top-44 -left-44 w-[560px] h-[560px]"],
    ["linear-gradient(135deg, #FFE9F4 0%, #F3E9FF 100%)", 0.16, "-bottom-56 -right-60 w-[660px] h-[660px]"],
    ["linear-gradient(135deg, #FF7EA9 0%, #FFE1EC 100%)", 0.12, "top-[18%] -right-48 w-[560px] h-[560px]"],
    ["linear-gradient(135deg, #FFF1F6 0%, #FFE9F4 100%)", 0.12, "bottom-[22%] -left-48 w-[520px] h-[520px]"],
  ],
  sakura: [
    ["linear-gradient(135deg, #FFD0E8 0%, #FF7DBD 100%)", 0.42, "-top-44 -left-44 w-[580px] h-[580px]"],
    ["linear-gradient(135deg, #FFB4D6 0%, #FFF7FB 100%)", 0.26, "-bottom-56 -right-60 w-[680px] h-[680px]"],
    ["linear-gradient(135deg, #FF2D8A 0%, #FFD0E8 100%)", 0.18, "top-[18%] -right-52 w-[600px] h-[600px]"],
    ["linear-gradient(135deg, #FFE6F2 0%, #FFD0E8 100%)", 0.18, "bottom-[22%] -left-52 w-[540px] h-[540px]"],
  ],
  cotton: [
    ["linear-gradient(135deg, #FFB0D7 0%, #F7E3FF 100%)", 0.36, "-top-44 -left-44 w-[560px] h-[560px]"],
    ["linear-gradient(135deg, #FFC1E0 0%, #FFF7FB 100%)", 0.24, "-bottom-56 -right-60 w-[660px] h-[660px]"],
    ["linear-gradient(135deg, #FF4FA0 0%, #FFB0D7 100%)", 0.16, "top-[18%] -right-48 w-[560px] h-[560px]"],
    ["linear-gradient(135deg, #FFE7F4 0%, #FAF1FF 100%)", 0.18, "bottom-[22%] -left-48 w-[520px] h-[520px]"],
  ],
  strawberry: [
    ["linear-gradient(135deg, #FF9AB8 0%, #FFE8F0 100%)", 0.34, "-top-44 -left-44 w-[560px] h-[560px]"],
    ["linear-gradient(135deg, #FFB6CE 0%, #FFF7FA 100%)", 0.22, "-bottom-56 -right-60 w-[660px] h-[660px]"],
    ["linear-gradient(135deg, #FF3B73 0%, #FF9AB8 100%)", 0.16, "top-[18%] -right-48 w-[560px] h-[560px]"],
    ["linear-gradient(135deg, #FFF0F5 0%, #FFE8F0 100%)", 0.16, "bottom-[22%] -left-48 w-[520px] h-[520px]"],
  ],
  iphone15: [
    ["linear-gradient(135deg, #FAD0DA 0%, #FF7EA9 100%)", 0.32, "-top-44 -left-44 w-[560px] h-[560px]"],
    ["linear-gradient(135deg, #FFE7EE 0%, #FFF8FA 100%)", 0.20, "-bottom-56 -right-60 w-[660px] h-[660px]"],
    ["linear-gradient(135deg, #FF3B86 0%, #FF7EA9 100%)", 0.14, "top-[18%] -right-48 w-[560px] h-[560px]"],
    ["linear-gradient(135deg, #FFE7EE 0%, #FAD0DA 100%)", 0.16, "bottom-[22%] -left-48 w-[520px] h-[520px]"],
  ],
};

function BackgroundBlobs({ tone = "default" }) {
  const set = BLOBS[tone] || BLOBS.default;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {set.map(([bg, opacity, pos], idx) => (
        <div
          key={idx}
          className={`absolute ${pos} rounded-full blur-3xl animate-blob-breathe ${
            idx === 1 ? "animation-delay-2000" : idx === 2 ? "animation-delay-4000" : idx === 3 ? "animation-delay-3000" : ""
          }`}
          style={{ backgroundImage: bg, opacity }}
        />
      ))}
    </div>
  );
}

export default function BacktestShell({
  title,
  subtitle,
  badge = "WELCOME",
  badgeIcon: BadgeIcon,
  onBack,
  backText = "返回主页",
  headerRight,
  children,
  showHero = true,
  wide = false,
  tone = "default",
  pad = "normal", // normal|tight|none
  scrollable = false,
}) {
  useRipple();

  const theme = THEMES[tone] ?? THEMES.default;
  const safeTone = THEMES[tone] ? tone : "default";
  const toneClass = `tone-${safeTone}`;

  const padClass =
    pad === "none"
      ? "p-0"
      : pad === "tight"
      ? "p-2 md:p-4"
      : "p-4 md:p-8";

  const overflowClass = scrollable
    ? "overflow-x-hidden overflow-y-auto"
    : "overflow-hidden";

  return (
    <div
      className={`min-h-screen ${padClass} ${overflowClass} relative ${toneClass}`}
      style={{ background: theme.colors.bgGradient }}
    >
      <BackgroundBlobs tone={safeTone} />

      {/* 氛围：颗粒（noise，噪点）+ 暗角（vignette，暗角） */}
      <div className="fixed inset-0 pointer-events-none z-[1] noise-overlay" />
      <div className="fixed inset-0 pointer-events-none z-[2] vignette" />

      <div className={`${wide ? "w-full" : "max-w-7xl mx-auto"} relative z-10`}>
        {/* 顶部：返回按钮 + 右上角按钮区 */}
        {(onBack || headerRight) ? (
          <div className="relative flex items-start justify-between gap-3">
            <div>
              {onBack ? (
                <button
                  onClick={onBack}
                  className="ripple-button inline-flex items-center gap-2 px-4 py-2 bg-white/55 backdrop-blur-xl rounded-full border border-white/70 shadow-sm font-black transition"
                  style={{ color: theme.colors.textMain }}
                  aria-label={backText}
                >
                  <ArrowLeft size={18} />
                  {backText}
                </button>
              ) : null}
            </div>

            {headerRight ? (
              <div className="flex items-center gap-2">{headerRight}</div>
            ) : null}
          </div>
        ) : null}

        {showHero ? (
          <header className="text-center pt-8 md:pt-10 pb-6 md:pb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-xl rounded-full border border-white/70 shadow-sm">
              {BadgeIcon ? (
                <BadgeIcon size={16} style={{ color: theme.colors.primary }} />
              ) : (
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full"
                  style={{ background: theme.colors.primary }}
                />
              )}
              <span
                className="text-xs font-black"
                style={{ color: theme.colors.textMain }}
              >
                {badge}
              </span>
            </div>

            <h1
              className="mt-5 text-5xl md:text-6xl font-black tracking-tight"
              style={{
                backgroundImage: theme.colors.primaryGradient,
                WebkitBackgroundClip: "text",
                color: "transparent",
                filter: "drop-shadow(0 10px 22px rgba(255,143,171,0.16))",
              }}
            >
              {title}
            </h1>

            {subtitle ? (
              <p className="mt-3 font-semibold" style={{ color: theme.colors.textLight }}>
                {subtitle}
              </p>
            ) : null}

            <div
              className="mt-6 h-[1px] w-full max-w-2xl mx-auto bg-gradient-to-r from-transparent to-transparent opacity-70"
              style={{
                backgroundImage: `linear-gradient(90deg, transparent 0%, ${theme.colors.primarySoft} 50%, transparent 100%)`,
              }}
            />
          </header>
        ) : null}

        {children}
      </div>
    </div>
  );
}
