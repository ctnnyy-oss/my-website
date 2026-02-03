import React, { useEffect, useState } from "react";

import BacktestShell, {
  glassCardPink,
  glassInnerPink,
  THEME_PINK,
  useCardFX,
} from "../../ui/BacktestShell";
import { withBase } from "../../utils/withBase";
import { MODULES } from "../../app/modules";

/** AvatarLightbox（头像放大弹窗） */
function AvatarLightbox({ open, src, alt, onClose }) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose(); // Escape（退出键）关闭
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onMouseDown={onClose} // 点击遮罩（overlay，遮罩）关闭
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative max-w-[92vw] max-h-[90vh]"
        onMouseDown={(e) => e.stopPropagation()} // 阻止冒泡（stop propagation，阻止冒泡）
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-white/90 border border-white/70 shadow-md
                     flex items-center justify-center text-[#8B4F58] font-black"
          aria-label="Close（关闭）"
          title="Close（关闭）"
        >
          ×
        </button>

        <img
          src={src}
          alt={alt}
          className="block rounded-3xl border border-white/60 shadow-2xl max-w-[92vw] max-h-[90vh] object-contain bg-white/30"
        />
      </div>
    </div>
  );
}

function ModuleCard({ item, onClick }) {
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
          // ✅ 更淡：把模块的“彩色云朵”透明度降低
          className={`absolute -right-10 top-1/2 -translate-y-1/2 w-44 h-44 rounded-full bg-gradient-to-br ${item.accent} opacity-[0.18] blur-3xl`}
        />
        <div className="relative flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/55 border border-white/70 shadow-sm flex items-center justify-center shrink-0">
            <Icon className="w-7 h-7 text-[#7A3E4B]" />
          </div>

          <div className="min-w-0">
            <div className="text-lg font-black text-[#8B4F58] truncate">
              {item.title}
            </div>
            <div className="mt-1 text-sm text-[#C5A0A6] font-semibold leading-snug">
              {item.subtitle}
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

function Home({ onNavigate }) {
  const [avatarOpen, setAvatarOpen] = useState(false); // state（状态）

  const avatarSrc = withBase("Avatar/avatar.jpg");

  return (
    <BacktestShell
      title=""
      subtitle=""
      headerRight={null}
      showHero={false}
      wide={true}
      tone="pink"
    >
      {/* modal（弹窗）：头像放大 */}
      <AvatarLightbox
        open={avatarOpen}
        src={avatarSrc}
        alt="avatar"
        onClose={() => setAvatarOpen(false)}
      />

      <div
        className="grid lg:grid-cols-[minmax(320px,1fr)_minmax(0,2.6fr)] gap-6 items-stretch"
        style={{ minHeight: "calc(100vh - 140px)" }}
      >
        {/* 左侧：标题 + 头像 + 简介（bio，简介） */}
        <div className="h-full flex flex-col">
          <div className={`${glassCardPink} p-6 md:p-8 flex-1 flex flex-col`}>
            <div className="flex flex-col items-start text-left">
              <h1
                className="text-4xl md:text-5xl font-black tracking-tight"
                style={{
                  // ✅ 统一用主题色（更淡的奶油粉）
                  backgroundImage: THEME_PINK.colors.primaryGradient,
                  WebkitBackgroundClip: "text",
                  color: "transparent",
                  filter: "drop-shadow(0 10px 22px rgba(255,126,169,0.12))",
                }}
              >
                慕溪的个人网站
              </h1>

              <div className="mt-6 w-full h-[1px] bg-gradient-to-r from-transparent via-[#FFE1EC] to-transparent opacity-70" />

              <div className="mt-6 flex items-center gap-4 w-full">
                {/* 点击头像放大（click to zoom，点击放大） */}
                <button
                  type="button"
                  onClick={() => setAvatarOpen(true)} // onClick（点击事件）
                  className="w-20 h-20 rounded-full bg-white/55 border border-white/70 shadow-sm overflow-hidden
                             hover:scale-[1.02] active:scale-[0.98] transition cursor-zoom-in"
                  aria-label="Open avatar（打开头像大图）"
                  title="Click to zoom（点击放大）"
                >
                  <img
                    src={avatarSrc}
                    alt="avatar"
                    className="w-full h-full object-cover"
                    draggable="false"
                  />
                </button>

                <div className="min-w-0">
                  <div className="text-2xl font-black text-[#7A3E4B]">
                    仙界林慕溪
                  </div>
                  <div className="mt-1 text-xs font-semibold text-[#B88C95]">
                    点击头像可放大（click to zoom，点击放大）
                  </div>
                </div>
              </div>

              {/* 这里就是妹妹说的留白：我们塞简介占位（placeholder，占位） */}
              <div className="mt-8 w-full">
                <div className="text-sm font-black tracking-[0.2em] text-[#7A3E4B] opacity-85">
                  ABOUT ME（关于我）
                </div>

                <div className="mt-3 space-y-3 text-sm leading-relaxed text-[#8A5562] font-semibold">
                  <p>
                    你好呀，我是慕溪。这里是我的个人小宇宙：写作、绘画、小游戏与一些投资研究，
                    我会慢慢把喜欢的作品都整理到这里✨
                  </p>
                  <p>
                    我偏爱“百合向（yuri，百合）”的温柔叙事：细腻的情绪流动、安静但坚定的陪伴感，
                    以及那种“心照不宣”的浪漫。
                  </p>
                  <p>
                    目前这里的文字都是占位（placeholder，占位）～后续妹妹可以把它改成：
                    自我介绍、作品理念、更新日志（changelog，更新记录）或联系方式。
                  </p>

                  <ul className="list-disc pl-5 space-y-1">
                    <li>关键词：治愈、梦境感、粉彩（pastel，粉彩）、温柔但有力量</li>
                    <li>正在做：整理小说/漫画目录、补插画作品集、慢慢完善网站</li>
                    <li>希望这里：像一本会发光的日记</li>
                  </ul>
                </div>
              </div>

              {/* 可选：底部小小一行（如果你也想删，直接删掉这一段 div） */}
              <div className="mt-auto pt-8 w-full">
                <div className="h-[1px] w-full bg-white/40" />
                <div className="mt-3 text-xs font-semibold text-[#B88C95]">
                  这里以后可以放：邮箱、微博、B站、GitHub（代码仓库）等链接
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 右侧：六个模块 */}
        <div className="h-full flex flex-col">
          <div className={`${glassCardPink} p-5 md:p-7 flex-1 flex flex-col`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 flex-1 auto-rows-fr">
              {MODULES.map((item) => (
                <ModuleCard
                  key={item.id}
                  item={item}
                  onClick={() => onNavigate(item.id)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </BacktestShell>
  );
}

export default Home;
