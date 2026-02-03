import React, { useEffect, useMemo, useState } from "react";
import {
  Video,
  ExternalLink,
  Download,
  KeyRound,
  PlayCircle,
  Sparkles,
} from "lucide-react";

import BacktestShell, { glassCard, glassInner, useCardFX } from "../../ui/BacktestShell";
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

function SoftButton({ disabled, children, onClick, title }) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      title={title}
      className={[
        "ripple-button inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full font-black text-sm",
        "border border-white/70 shadow-sm transition select-none",
        disabled
          ? "bg-white/35 text-[#C5A0A6] cursor-not-allowed"
          : "bg-white/60 hover:bg-white/75 text-[#8B4F58]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function LinkPill({ href, label }) {
  const disabled = !href;
  return (
    <SoftButton
      disabled={disabled}
      onClick={() => window.open(href, "_blank", "noopener,noreferrer")}
      title={disabled ? "未填写链接（link，链接）" : "打开链接（link，链接）"}
    >
      <PlayCircle size={16} />
      {label}
      {!disabled ? <ExternalLink size={14} /> : null}
    </SoftButton>
  );
}

function DownloadCard({ platformLabel, url, code }) {
  const disabled = !url;

  return (
    <div className={`${glassInner} p-4 md:p-5`}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-black text-[#8B4F58]">{platformLabel}</div>
        <div className="text-xs font-semibold text-[#C5A0A6]">
          {code ? `提取码 (code)：${code}` : "无提取码 (no code)"}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <SoftButton
          disabled={disabled}
          onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
          title="打开下载链接（download link，下载链接）"
        >
          <Download size={16} />
          打开
          {!disabled ? <ExternalLink size={14} /> : null}
        </SoftButton>

        <SoftButton
          disabled={!code}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(code);
              alert("已复制提取码 (code) ✅");
            } catch {
              alert("复制失败：请手动复制提取码 (code)");
            }
          }}
          title="复制提取码（code，提取码）"
        >
          <KeyRound size={16} />
          复制码
        </SoftButton>
      </div>
    </div>
  );
}

export default function AnimationsPage({ onBack }) {
  const [items, setItems] = useState([]);
  const cardFXProps = useCardFX();

  useEffect(() => {
    fetch(withBase("Animations/index.json"))
      .then((r) => r.json())
      .then((data) => {
        // 兼容：desc/description
        const normalized = (Array.isArray(data) ? data : []).map((x) => ({
          id: x.id,
          title: x.title,
          desc: x.desc ?? x.description ?? "",
          watch: x.watch ?? {},
          download: x.download ?? {},
        }));
        setItems(normalized);
      })
      .catch(() => setItems([]));
  }, []);

  const headerRight = useMemo(
    () => (
      <div className="hidden md:flex items-center gap-2">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/55 backdrop-blur-xl rounded-full border border-white/70 shadow-sm text-[#8B4F58] font-black">
          <Sparkles size={16} />
          播放 (watch) + 下载 (download)
        </div>
      </div>
    ),
    []
  );

  return (
    <BacktestShell
      title="Live2D 动画"
      subtitle="播放四选一（抖音/快手/小红书/B站） · 下载二选一（夸克/百度）"
      badge="LIVE2D ANIMATIONS"
      badgeIcon={Video}
      onBack={onBack}
      backText="返回主页"
      headerRight={headerRight}
    >
      {/* 大玻璃面板（大容器） */}
      <div className={`${glassCard} p-5 md:p-7`}>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="text-lg md:text-xl font-black text-[#8B4F58]">
            作品列表 (Works)
          </div>
          <div className="text-xs font-semibold text-[#C5A0A6]">
            你以后只改 public/Animations/index.json（清单文件）
          </div>
        </div>

        {items.length === 0 ? (
          <div className={`${glassInner} p-6 md:p-8`}>
            <div className="text-xl font-black text-[#8B4F58]">
              还没有作品 (No items)
            </div>
            <div className="mt-3 text-[#C5A0A6] font-semibold leading-relaxed">
              1) 打开 public/Animations/index.json（清单文件）
              <br />
              2) 把 watch（观看链接）和 download（下载链接）填上
              <br />
              3) 保存后刷新页面（refresh，刷新）
            </div>
          </div>
        ) : (
          <div className="grid gap-5">
            {items.map((item, idx) => (
              <div
                key={item.id ?? idx}
                {...cardFXProps}
                className={`${glassInner} p-5 md:p-6`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-lg md:text-xl font-black text-[#8B4F58] truncate">
                      {item.title || `作品 ${idx + 1}`}
                    </div>
                    {item.desc ? (
                      <div className="mt-1 text-sm text-[#C5A0A6] font-semibold leading-relaxed">
                        {item.desc}
                      </div>
                    ) : null}
                  </div>
                  <div className="text-xs font-black text-[#C5A0A6]">
                    #{String(idx + 1).padStart(3, "0")}
                  </div>
                </div>

                {/* 分区按钮：观看 */}
                <div className="mt-5">
                  <div className="text-sm font-black text-[#8B4F58] mb-2">
                    观看 (Watch)
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {WATCH_PLATFORMS.map((p) => (
                      <LinkPill
                        key={p.key}
                        href={item.watch?.[p.key]}
                        label={p.label}
                      />
                    ))}
                  </div>
                </div>

                {/* 分区按钮：下载 */}
                <div className="mt-5">
                  <div className="text-sm font-black text-[#8B4F58] mb-2">
                    下载 (Download)
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
                    {DOWNLOAD_PLATFORMS.map((p) => (
                      <DownloadCard
                        key={p.key}
                        platformLabel={p.label}
                        url={item.download?.[p.key]?.url}
                        code={item.download?.[p.key]?.code}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 小提示 */}
      <div className="mt-6 text-center text-xs text-[#C5A0A6] font-semibold">
        提醒：如果你把大视频（video，视频）放进 GitHub，会很容易 push（推送）失败；
        推荐「平台播放 + 网盘下载」。
      </div>
    </BacktestShell>
  );
}
