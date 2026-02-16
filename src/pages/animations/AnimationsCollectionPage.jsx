import React, { useEffect, useMemo, useState } from "react";
import { PlayCircle, X } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import CollectionWallPage from "../../components/CollectionWallPage";
import { glassCard } from "../../ui/BacktestShell";
import { normalizeLocalPath } from "../../utils/dataHelpers";
import { withBase } from "../../utils/withBase";

export default function AnimationsCollectionPage() {
  const navigate = useNavigate();
  const { categoryId = "" } = useParams();

  const [category, setCategory] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailItem, setDetailItem] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setCategory(null);
      setItems([]);

      try {
        const indexRes = await fetch(withBase("Animations/index.json"));
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
          title: picked.title || `动画分类 ${picked.id}`,
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
          title: x?.title || `动画 ${idx + 1}`,
          desc: x?.desc || "",
          video: x?.video ? normalizeLocalPath(x.video) : "",
          cover: x?.cover ? normalizeLocalPath(x.cover) : "",
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

  const cards = useMemo(
    () =>
      items.map((item, idx) => ({
        id: item.id || `anim-${idx}`,
        title: item.title || `动画 ${idx + 1}`,
        subtitle: item.desc || "",
        cover: item.cover || "",
        emoji: "🎬",
      })),
    [items],
  );

  const videoSrc = detailItem?.video ? withBase(normalizeLocalPath(detailItem.video)) : "";

  return (
    <CollectionWallPage
      title={category?.title || "动画分类"}
      subtitle={category?.desc || "分类作品墙"}
      count={items.length}
      items={cards}
      loading={loading}
      emptyText={category ? "当前分类还没有作品" : "未找到该分类，请返回重选"}
      onCardClick={(card) => {
        const original = items.find((x) => x.id === card.id);
        if (original) setDetailItem(original);
      }}
      onBack={() => navigate("/animations")}
    >
      {detailItem ? (
        <div
          className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          onMouseDown={() => setDetailItem(null)}
        >
          <div
            className={`${glassCard} w-full max-w-5xl p-5 md:p-6 relative`}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setDetailItem(null)}
              className="ripple-button absolute top-3 right-3 w-10 h-10 rounded-full bg-white/70 border border-white/70 shadow-sm flex items-center justify-center hover:bg-white/85 transition"
              title="关闭"
            >
              <X size={18} />
            </button>

            <div className="text-xl font-black text-[#8B4F58] pr-12">{detailItem.title}</div>
            {detailItem.desc ? (
              <div className="mt-2 text-sm text-[#C5A0A6] font-semibold">{detailItem.desc}</div>
            ) : null}

            <div className="mt-4 rounded-2xl overflow-hidden border border-white/70 bg-black/30">
              {videoSrc ? (
                <video
                  src={videoSrc}
                  controls
                  autoPlay
                  className="w-full h-auto max-h-[72vh] bg-black"
                />
              ) : (
                <div className="h-[260px] flex items-center justify-center text-[#8B4F58] font-semibold">
                  该作品未配置 video 路径
                </div>
              )}
            </div>

            <div className="mt-3 text-xs text-[#B88C95] font-semibold flex items-center gap-2">
              <PlayCircle size={14} />
              {detailItem.video || "(未设置视频路径)"}
            </div>
          </div>
        </div>
      ) : null}
    </CollectionWallPage>
  );
}

