import React, { useEffect, useMemo, useState } from "react";
import { Palette, X, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";

import BacktestShell, { glassCard, glassInner, useCardFX } from "../../ui/BacktestShell";
import { withBase } from "../../utils/withBase";


export default function IllustrationsPage({ onBack }) {
  const [items, setItems] = useState([]);
  const [openIndex, setOpenIndex] = useState(null);
  const cardFXProps = useCardFX();

  useEffect(() => {
    fetch(withBase("Illustrations/index.json"))
      .then((r) => r.json())
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => setItems([]));
  }, []);
  const resolveSrc = (it) => {
    const rel = it?.file ? `Illustrations/${it.file}` : (it?.src || it?.path || "");
    return withBase(String(rel || "").replace(/^\.?\//, ""));
  };


  const headerRight = useMemo(
    () => (
      <div className="hidden md:flex items-center gap-2">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/55 backdrop-blur-xl rounded-full border border-white/70 shadow-sm text-[#8B4F58] font-black">
          <Sparkles size={16} />
          Gallery（画廊）
        </div>
      </div>
    ),
    []
  );

  const prev = () => {
    if (openIndex === null) return;
    setOpenIndex((openIndex - 1 + items.length) % items.length);
  };
  const next = () => {
    if (openIndex === null) return;
    setOpenIndex((openIndex + 1) % items.length);
  };

  return (
    <BacktestShell
      title="插画"
      subtitle="Procreate 里的灵感碎片 ✨"
      badge="ILLUSTRATIONS"
      badgeIcon={Palette}
      onBack={onBack}
      backText="返回主页"
      headerRight={headerRight}
    >
      <div className={`${glassCard} p-5 md:p-7`}>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="text-lg md:text-xl font-black text-[#8B4F58]">
            作品列表 (Gallery)
          </div>
          <div className="text-xs font-semibold text-[#C5A0A6]">
            你以后只改 public/Illustrations/index.json（清单文件）
          </div>
        </div>

        {items.length === 0 ? (
          <div className={`${glassInner} p-6 md:p-8`}>
            <div className="text-xl font-black text-[#8B4F58]">
              还没有插画 (No items)
            </div>
            <div className="mt-3 text-[#C5A0A6] font-semibold leading-relaxed">
              1) 把图片（image，图片）放到 public/Illustrations/
              <br />
              2) 在 public/Illustrations/index.json 里写好文件名（filename，文件名）
              <br />
              3) 保存后刷新页面（refresh，刷新）
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((it, idx) => (
              <button
                key={it.id || idx}
                type="button"
                onClick={() => setOpenIndex(idx)}
                {...cardFXProps}
                className={`${glassInner} ripple-button overflow-hidden p-2 text-left`}
                title={it.title || it.id || "open"}
              >
                <div className="aspect-[4/5] rounded-[18px] overflow-hidden bg-white/50 border border-white/60">
                  <img
                    src={resolveSrc(it)}
                    alt={it.title || it.id || `img-${idx}`}
                    className="w-full h-full object-cover select-none"
                    loading="lazy"
                  />
                </div>
                <div className="mt-2 px-1">
                  <div className="text-sm font-black text-[#8B4F58] truncate">
                    {it.title || it.id || `作品 ${idx + 1}`}
                  </div>
                  {it.desc ? (
                    <div className="text-xs text-[#C5A0A6] font-semibold truncate">
                      {it.desc}
                    </div>
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 预览弹窗（modal，弹窗） */}
      {openIndex !== null && items[openIndex] ? (
        <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`${glassCard} w-full max-w-5xl p-4 md:p-6 relative`}>
            <button
              onClick={() => setOpenIndex(null)}
              className="ripple-button absolute top-3 right-3 w-10 h-10 rounded-full bg-white/70 border border-white/70 shadow-sm flex items-center justify-center hover:bg-white/85 transition"
              title="关闭 (close，关闭)"
            >
              <X />
            </button>

            <div className="relative">
              <img
                src={resolveSrc(items[openIndex])}
                alt={items[openIndex].title || items[openIndex].id || "preview"}
                className="w-full h-auto rounded-[22px] select-none"
              />
              <div className="mt-3 text-center font-black text-[#8B4F58]">
                {items[openIndex].title || items[openIndex].id || "Untitled"}
              </div>

              <button
                onClick={prev}
                className="ripple-button absolute left-2 top-1/2 -translate-y-1/2 bg-white/70 border border-white/70 rounded-full shadow-sm p-2 hover:bg-white/85 transition"
                title="上一张 (prev，上一个)"
              >
                <ChevronLeft />
              </button>
              <button
                onClick={next}
                className="ripple-button absolute right-2 top-1/2 -translate-y-1/2 bg-white/70 border border-white/70 rounded-full shadow-sm p-2 hover:bg-white/85 transition"
                title="下一张 (next，下一个)"
              >
                <ChevronRight />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </BacktestShell>
  );
}
