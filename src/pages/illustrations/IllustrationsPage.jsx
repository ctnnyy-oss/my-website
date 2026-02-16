import React, { useEffect, useState } from "react";
import { Palette, X, ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

import UnifiedCategoryPage from "../../components/UnifiedCategoryPage";
import { glassCard } from "../../ui/BacktestShell";
import { withBase } from "../../utils/withBase";

export default function IllustrationsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openIndex, setOpenIndex] = useState(null);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    fetch(withBase("Illustrations/index.json"))
      .then((r) => r.json())
      .then((data) => {
        setItems(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setItems([]);
        setLoading(false);
      });
  }, []);

  const resolveSrc = (it) => {
    const rel = it?.file
      ? `Illustrations/${it.file}`
      : it?.src || it?.path || "";
    return withBase(String(rel || "").replace(/^\.?\//, ""));
  };

  const cards = items.map((it, idx) => ({
    id: it.id || `img-${idx}`,
    title: it.title || it.id || `作品 ${idx + 1}`,
    subtitle: it.desc || "",
    cover: it.file ? `Illustrations/${it.file}` : it.src || it.path || "",
    accent: "from-[#FFD1E0] to-[#E9D9FF]",
  }));

  const prev = () => {
    if (openIndex === null) return;
    setOpenIndex((openIndex - 1 + items.length) % items.length);
  };
  const next = () => {
    if (openIndex === null) return;
    setOpenIndex((openIndex + 1) % items.length);
  };

  useEffect(() => {
    if (openIndex === null) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (fullscreen) setFullscreen(false);
        else setOpenIndex(null);
      }
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openIndex, fullscreen, items.length]);

  return (
    <UnifiedCategoryPage
      title="插画"
      subtitle="Procreate 里的灵感碎片 ✨"
      icon={Palette}
      description={
        <>
          <p>
            这里是我用 Procreate 创作的插画合集。从角色设计到场景描绘，
            记录着每一个灵感迸发的瞬间。
          </p>
          <p>
            风格偏向日系、梦幻、粉彩色调。每一张画都是一段心情的投影。
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>工具：Procreate + Apple Pencil</li>
            <li>风格：日系、粉彩、梦幻</li>
            <li>点击卡片可预览大图</li>
          </ul>
        </>
      }
      items={cards}
      loading={loading}
      onCardClick={(card) => {
        const idx = items.findIndex(
          (i, idx2) => (i.id || `img-${idx2}`) === card.id
        );
        if (idx >= 0) setOpenIndex(idx);
      }}
      onBack={() => navigate("/")}
    >
      {/* Lightbox modal */}
      {openIndex !== null && items[openIndex] ? (
        fullscreen ? (
          <div className="fixed inset-0 z-[70] bg-black flex items-center justify-center">
            <button
              onClick={() => setFullscreen(false)}
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/20 border border-white/30 flex items-center justify-center hover:bg-white/30 transition"
              title="退出全屏"
            >
              <X className="text-white" />
            </button>
            <button
              onClick={prev}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/20 border border-white/30 rounded-full p-2 hover:bg-white/30 transition"
            >
              <ChevronLeft className="text-white" />
            </button>
            <button
              onClick={next}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/20 border border-white/30 rounded-full p-2 hover:bg-white/30 transition"
            >
              <ChevronRight className="text-white" />
            </button>
            <img
              src={resolveSrc(items[openIndex])}
              alt={items[openIndex].title || "preview"}
              className="max-w-[95vw] max-h-[95vh] object-contain select-none"
            />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm font-semibold">
              {items[openIndex].title || items[openIndex].id || "Untitled"} ({openIndex + 1}/{items.length})
            </div>
          </div>
        ) : (
          <div
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
            onMouseDown={() => setOpenIndex(null)}
          >
            <div
              className={`${glassCard} w-full max-w-5xl p-4 md:p-6 relative`}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                <button
                  onClick={() => setFullscreen(true)}
                  className="ripple-button w-10 h-10 rounded-full bg-white/70 border border-white/70 shadow-sm flex items-center justify-center hover:bg-white/85 transition"
                  title="全屏查看"
                >
                  <Maximize2 size={18} />
                </button>
                <button
                  onClick={() => setOpenIndex(null)}
                  className="ripple-button w-10 h-10 rounded-full bg-white/70 border border-white/70 shadow-sm flex items-center justify-center hover:bg-white/85 transition"
                  title="关闭"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="relative">
                <img
                  src={resolveSrc(items[openIndex])}
                  alt={items[openIndex].title || "preview"}
                  className="w-full h-auto max-h-[75vh] object-contain rounded-[22px] select-none"
                />
                <div className="mt-3 text-center font-black text-[#8B4F58]">
                  {items[openIndex].title || items[openIndex].id || "Untitled"}
                </div>
                <button
                  onClick={prev}
                  className="ripple-button absolute left-2 top-1/2 -translate-y-1/2 bg-white/70 border border-white/70 rounded-full shadow-sm p-2 hover:bg-white/85 transition"
                >
                  <ChevronLeft />
                </button>
                <button
                  onClick={next}
                  className="ripple-button absolute right-2 top-1/2 -translate-y-1/2 bg-white/70 border border-white/70 rounded-full shadow-sm p-2 hover:bg-white/85 transition"
                >
                  <ChevronRight />
                </button>
              </div>
            </div>
          </div>
        )
      ) : null}
    </UnifiedCategoryPage>
  );
}
