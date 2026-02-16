import React, { useEffect, useState } from "react";
import {
  Video,
  X,
  ExternalLink,
  Download,
  KeyRound,
  PlayCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import UnifiedCategoryPage from "../../components/UnifiedCategoryPage";
import { glassCard, glassInner } from "../../ui/BacktestShell";
import { withBase } from "../../utils/withBase";

const WATCH_PLATFORMS = [
  { key: "douyin", label: "抖音 (Douyin)" },
  { key: "kuaishou", label: "快手 (Kuaishou)" },
  { key: "xhs", label: "小红书 (XHS)" },
  { key: "bilibili", label: "B站 (Bilibili)" },
];

const DOWNLOAD_PLATFORMS = [
  { key: "quark", label: "夸克 (Quark)" },
  { key: "baidu", label: "百度 (Baidu)" },
];

export default function AnimationsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailItem, setDetailItem] = useState(null);

  useEffect(() => {
    fetch(withBase("Animations/index.json"))
      .then((r) => r.json())
      .then((data) => {
        const normalized = (Array.isArray(data) ? data : []).map((x) => ({
          id: x.id,
          title: x.title,
          desc: x.desc ?? x.description ?? "",
          watch: x.watch ?? {},
          download: x.download ?? {},
        }));
        setItems(normalized);
        setLoading(false);
      })
      .catch(() => {
        setItems([]);
        setLoading(false);
      });
  }, []);

  const cards = items.map((item, idx) => ({
    id: item.id || `anim-${idx}`,
    title: item.title || `作品 ${idx + 1}`,
    subtitle: item.desc || "",
    emoji: "🎞️",
    accent: "from-[#FFB6CE] to-[#E9D9FF]",
  }));

  return (
    <UnifiedCategoryPage
      title="动画"
      subtitle="眨眼、飘发、呼吸的魔法时刻"
      icon={Video}
      description={
        <>
          <p>
            这里展示我的动画作品。包括 Live2D、短动画等各种动态创作，
            让角色真正“活”起来。
          </p>
          <p>
            支持在线观看（抖音/快手/小红书/B站）和网盘下载（夸克/百度）。
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>类型：Live2D、短动画</li>
            <li>观看：四大平台任选</li>
            <li>下载：网盘分享</li>
          </ul>
        </>
      }
      items={cards}
      loading={loading}
      onCardClick={(card) => {
        const original = items.find(
          (i, idx) => (i.id || `anim-${idx}`) === card.id
        );
        if (original) setDetailItem(original);
      }}
      onBack={() => navigate("/")}
    >
      {/* Detail modal: watch & download */}
      {detailItem ? (
        <div
          className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          onMouseDown={() => setDetailItem(null)}
        >
          <div
            className={`${glassCard} w-full max-w-3xl p-5 md:p-7 relative`}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setDetailItem(null)}
              className="ripple-button absolute top-3 right-3 w-10 h-10 rounded-full bg-white/70 border border-white/70 shadow-sm flex items-center justify-center hover:bg-white/85 transition"
              title="关闭"
            >
              <X size={18} />
            </button>

            <div className="text-xl font-black text-[#8B4F58]">
              {detailItem.title}
            </div>
            {detailItem.desc ? (
              <div className="mt-2 text-sm text-[#C5A0A6] font-semibold">
                {detailItem.desc}
              </div>
            ) : null}

            {/* Watch */}
            <div className="mt-5">
              <div className="text-sm font-black text-[#8B4F58] mb-2">
                观看 (Watch)
              </div>
              <div className="flex flex-wrap gap-2">
                {WATCH_PLATFORMS.map((p) => {
                  const href = detailItem.watch?.[p.key];
                  const disabled = !href;
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={
                        disabled
                          ? undefined
                          : () =>
                              window.open(
                                href,
                                "_blank",
                                "noopener,noreferrer"
                              )
                      }
                      className={[
                        "ripple-button inline-flex items-center gap-2 px-4 py-2 rounded-full font-black text-sm border border-white/70 shadow-sm transition",
                        disabled
                          ? "bg-white/35 text-[#C5A0A6] cursor-not-allowed"
                          : "bg-white/60 hover:bg-white/75 text-[#8B4F58]",
                      ].join(" ")}
                    >
                      <PlayCircle size={16} />
                      {p.label}
                      {!disabled ? <ExternalLink size={14} /> : null}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Download */}
            <div className="mt-5">
              <div className="text-sm font-black text-[#8B4F58] mb-2">
                下载 (Download)
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                {DOWNLOAD_PLATFORMS.map((p) => {
                  const info = detailItem.download?.[p.key];
                  const url = info?.url;
                  const code = info?.code;
                  return (
                    <div key={p.key} className={`${glassInner} p-4`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-black text-[#8B4F58]">
                          {p.label}
                        </div>
                        <div className="text-xs font-semibold text-[#C5A0A6]">
                          {code ? `提取码：${code}` : "无提取码"}
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={
                            url
                              ? () =>
                                  window.open(
                                    url,
                                    "_blank",
                                    "noopener,noreferrer"
                                  )
                              : undefined
                          }
                          className={[
                            "ripple-button inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full font-black text-sm border border-white/70 shadow-sm transition",
                            !url
                              ? "bg-white/35 text-[#C5A0A6] cursor-not-allowed"
                              : "bg-white/60 hover:bg-white/75 text-[#8B4F58]",
                          ].join(" ")}
                        >
                          <Download size={16} />
                          打开
                        </button>
                        <button
                          type="button"
                          onClick={
                            code
                              ? async () => {
                                  try {
                                    await navigator.clipboard.writeText(code);
                                    alert("已复制提取码 ✅");
                                  } catch {
                                    alert("复制失败");
                                  }
                                }
                              : undefined
                          }
                          className={[
                            "ripple-button inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full font-black text-sm border border-white/70 shadow-sm transition",
                            !code
                              ? "bg-white/35 text-[#C5A0A6] cursor-not-allowed"
                              : "bg-white/60 hover:bg-white/75 text-[#8B4F58]",
                          ].join(" ")}
                        >
                          <KeyRound size={16} />
                          复制码
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </UnifiedCategoryPage>
  );
}
