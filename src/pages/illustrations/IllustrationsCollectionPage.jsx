import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import CollectionWallPage from "../../components/CollectionWallPage";
import { glassCard } from "../../ui/BacktestShell";
import { normalizeLocalPath } from "../../utils/dataHelpers";
import { withBase } from "../../utils/withBase";

export default function IllustrationsCollectionPage() {
  const navigate = useNavigate();
  const { categoryId = "" } = useParams();

  const [category, setCategory] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openIndex, setOpenIndex] = useState(null);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setCategory(null);
      setItems([]);

      try {
        const indexRes = await fetch(withBase("Illustrations/index.json"));
        const indexData = await indexRes.json();
        const categories = Array.isArray(indexData) ? indexData : [];

        const picked = categories.find((x) => String(x?.id) === String(categoryId));
        if (!picked) {
          if (!cancelled) {
            setLoading(false);
            setCategory(null);
            setItems([]);
          }
          return;
        }

        const normalizedCategory = {
          id: String(picked.id),
          title: picked.title || `插画分类 ${picked.id}`,
          desc: picked.desc || "",
          data: normalizeLocalPath(picked.data || ""),
        };

        let works = [];
        if (normalizedCategory.data) {
          const worksRes = await fetch(withBase(normalizedCategory.data));
          const worksData = await worksRes.json();
          works = Array.isArray(worksData) ? worksData : [];
        }

        const normalizedWorks = works.map((x, idx) => ({
          id: String(x?.id ?? idx + 1),
          title: x?.title || `插画 ${idx + 1}`,
          desc: x?.desc || "",
          file: x?.file ? normalizeLocalPath(x.file) : "",
        }));

        if (!cancelled) {
          setCategory(normalizedCategory);
          setItems(normalizedWorks);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setCategory(null);
          setItems([]);
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [categoryId]);

  useEffect(() => {
    if (openIndex !== null && openIndex >= items.length) {
      setOpenIndex(null);
    }
  }, [openIndex, items.length]);

  const cards = useMemo(
    () =>
      items.map((it, idx) => ({
        id: it.id || `illust-${idx}`,
        title: it.title || `插画 ${idx + 1}`,
        subtitle: it.desc || "",
        cover: it.file || "",
        emoji: "🖼️",
      })),
    [items],
  );

  const resolveSrc = (it) => withBase(normalizeLocalPath(it?.file || ""));

  const prev = useCallback(() => {
    setOpenIndex((curr) => {
      if (curr === null || items.length === 0) return curr;
      return (curr - 1 + items.length) % items.length;
    });
  }, [items.length]);

  const next = useCallback(() => {
    setOpenIndex((curr) => {
      if (curr === null || items.length === 0) return curr;
      return (curr + 1) % items.length;
    });
  }, [items.length]);

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
  }, [fullscreen, next, openIndex, prev]);

  return (
    <CollectionWallPage
      title={category?.title || "插画分类"}
      subtitle={category?.desc || "分类作品墙"}
      count={items.length}
      items={cards}
      loading={loading}
      emptyText={category ? "当前分类还没有作品" : "未找到该分类，请返回重选"}
      onCardClick={(card) => {
        const idx = cards.findIndex((x) => x.id === card.id);
        if (idx >= 0) setOpenIndex(idx);
      }}
      onBack={() => navigate("/illustrations")}
    >
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
    </CollectionWallPage>
  );
}

