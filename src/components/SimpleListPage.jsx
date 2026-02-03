// src/components/SimpleListPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { BookOpen, Copy, ExternalLink, Search, Sparkles } from "lucide-react";

import BacktestShell, { glassCard, useCardFX } from "../ui/BacktestShell";
import { withBase } from "../utils/withBase";

function isHttpUrl(s) {
  return typeof s === "string" && /^https?:\/\//i.test(s);
}

function normalizeLocalPath(p) {
  if (!p) return "";
  let s = String(p).trim();
  // ./foo 或 /foo → foo
  s = s.replace(/^\.?\//, "");
  // public/xxx → xxx
  s = s.replace(/^public\//, "");
  return s;
}

function guessReadableFile(item) {
  // 优先 file/txt/path 字段；其次如果 link 是本地 txt/md，也能读。
  const direct = item?.file || item?.txt || item?.path;
  if (direct) return normalizeLocalPath(direct);

  const link = item?.link;
  if (typeof link === "string" && !isHttpUrl(link) && /\.(txt|md)$/i.test(link)) {
    return normalizeLocalPath(link);
  }

  return "";
}

async function copyText(text) {
  const s = String(text ?? "");
  if (!s) return false;

  try {
    await navigator.clipboard.writeText(s);
    return true;
  } catch {
    // fallback（兼容一些老环境）
    try {
      const ta = document.createElement("textarea");
      ta.value = s;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      ta.style.top = "-9999px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return !!ok;
    } catch {
      return false;
    }
  }
}

/**
 * SimpleListPage（通用列表页）
 * - 用于：小说/漫画/游戏 这类“列表 + 资源/链接”的模块
 * - 数据来源：public/<分类>/index.json
 *
 * ✅ v3（本次更新）
 * - UI 改成更简约的「一行标题 + 搜索 + 卡片网格」
 * - 修复：pageKey 未定义导致漫画兜底配置报错的问题
 */
export default function SimpleListPage({
  title,
  subtitle,
  Icon,
  onBack,
  dataPath,
  onOpenReader,
  onOpenComicReader,

  // hints
  editHint = "public/<分类>/index.json",
  assetHint = "public/模块名/（放封面图）",
  emptyHint = "这里还没有内容，先去填 JSON（数据文件）吧～",

  // layout（保留参数，兼容旧页面）
  variant: _variant = "default", // default | shelf
}) {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ok | error
  const [errMsg, setErrMsg] = useState("");

  const [q, setQ] = useState("");
  const [toast, setToast] = useState("");

  const fx = useCardFX();

  // 用 dataPath 推断当前页面类型（用于漫画“兜底 manifest”逻辑）
  const pageKey = useMemo(() => {
    const p = String(dataPath || "").toLowerCase();
    if (p.includes("/comics/") || p.includes("comics/")) return "comics";
    if (p.includes("/novels/") || p.includes("novels/")) return "novels";
    if (p.includes("/games/") || p.includes("games/")) return "games";
    if (p.includes("/animations/") || p.includes("animations/")) return "animations";
    if (p.includes("/illustrations/") || p.includes("illustrations/")) return "illustrations";
    if (p.includes("/avatar/") || p.includes("avatar/")) return "avatar";
    if (p.includes("/investment/") || p.includes("investment/")) return "investment";
    return "";
  }, [dataPath]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        setStatus("loading");
        const res = await fetch(withBase(dataPath));
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!Array.isArray(data)) throw new Error("JSON 顶层必须是数组（array，数组）");
        if (!cancelled) {
          setItems(data);
          setStatus("ok");
        }
      } catch (e) {
        if (!cancelled) {
          setStatus("error");
          setErrMsg(String(e?.message || e));
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [dataPath]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 1400);
    return () => clearTimeout(t);
  }, [toast]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return items;
    return items.filter((it) => {
      const hay = [it?.title, it?.desc, ...(Array.isArray(it?.tags) ? it.tags : [])]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(query);
    });
  }, [items, q]);

  function getComicConfig(item) {
    // 漫画阅读器配置：支持 item.comic 或扁平字段
    // 推荐写法：
    // {
    //   comic: { dir: "Comics/data/c001/yuri", count: 46, ext: "webp", pad: 5, start: 1 }
    // }
    // 进阶写法（无需手填页数，配合脚本自动生成清单 manifest）：
    // {
    //   comic: { manifest: "Comics/manifest.json", workId: "c001", chapter: "yuri" }
    // }
    // 或者直接给页面数组：
    // {
    //   comic: { pages: ["Comics/data/c001/yuri/00001.webp", "Comics/data/c001/yuri/00002.webp"] }
    // }

    const c = item?.comic;

    // 1) pages 直接给页面数组
    if (Array.isArray(c?.pages) && c.pages.length > 0) {
      return {
        mode: "pages",
        pages: c.pages.map((p) => normalizeLocalPath(p)),
      };
    }

    // 2) manifest 清单（推荐：配合脚本自动生成）
    const manifest = c?.manifest;
    if (manifest) {
      return {
        mode: "manifest",
        manifest: normalizeLocalPath(manifest),
        workId: String(c?.workId ?? c?.id ?? item?.id ?? "").trim(),
        chapter: String(c?.chapter ?? c?.chapterId ?? "").trim() || null,
      };
    }

    // 3) dir + count 传统方式
    const dir = c?.dir ?? item?.comicDir ?? item?.pagesDir;
    const count = c?.count ?? item?.comicCount ?? item?.pageCount;

    // ✅ 便捷兜底：在 Comics 页面里，如果 item 只有 id（没写 comic 配置），
    // 就默认用 manifest + item.id 去找作品（配合 scripts/gen-comics-manifest.mjs）。
    if ((!dir || !count) && pageKey === "comics" && item?.id && !item?.link) {
      return {
        mode: "manifest",
        manifest: "Comics/manifest.json",
        workId: String(item.id).trim(),
        chapter: null,
      };
    }

    if (!dir || !count) return null;

    const ext = c?.ext ?? item?.comicExt ?? item?.ext ?? "webp";
    const pad = Number(c?.pad ?? item?.comicPad ?? item?.pad ?? 5);
    const start = Number(c?.start ?? item?.comicStart ?? item?.start ?? 1);

    const nCount = Number(count);
    if (!Number.isFinite(nCount) || nCount <= 0) return null;

    return {
      mode: "dir",
      dir: normalizeLocalPath(dir).replace(/\/+$/, ""),
      count: Math.floor(nCount),
      ext: String(ext || "webp").replace(/^\./, ""),
      pad: Number.isFinite(pad) && pad > 0 ? Math.floor(pad) : 5,
      start: Number.isFinite(start) && start > 0 ? Math.floor(start) : 1,
    };
  }

  const openLink = (item) => {
    if (!item) return;

    // 1) 文字阅读器
    const readable = guessReadableFile(item);
    if (readable && onOpenReader) {
      onOpenReader({ file: readable, title: item?.title || "" });
      return;
    }

    // 2) 漫画阅读器
    const comicCfg = getComicConfig(item);
    if (comicCfg && onOpenComicReader) {
      onOpenComicReader({
        title: item?.title || "漫画",
        workId: item?.id,
        ...comicCfg,
      });
      return;
    }

    // 3) 普通链接（外链 or 本地文件）
    const href = item?.link;
    if (!href) return;

    if (isHttpUrl(href)) {
      window.open(href, "_blank", "noopener,noreferrer");
      return;
    }

    window.open(withBase(normalizeLocalPath(href)), "_blank", "noopener,noreferrer");
  };

  const onCopy = async (text, okMsg = "已复制") => {
    const ok = await copyText(text);
    setToast(ok ? okMsg : "复制失败");
  };

  const HeaderIcon = Icon || Sparkles;

  function renderCard(item, idx) {
    const cover = item?.cover ? normalizeLocalPath(item.cover) : "";
    const readable = guessReadableFile(item);
    const comicCfg = getComicConfig(item);

    const canReadText = !!readable;
    const canReadComic = !!comicCfg;

    const isExternal = !!item?.link && isHttpUrl(item.link);

    const primaryLabel = canReadComic ? "阅读漫画" : canReadText ? "阅读" : isExternal ? "打开链接" : "打开";
    const PrimaryIcon = canReadComic || canReadText ? BookOpen : ExternalLink;

    const tags = Array.isArray(item?.tags) ? item.tags : [];

    return (
      <div key={item?.id || idx} className={`${glassCard} p-4 flex gap-4 transition will-change-transform`} {...fx}>
        {/* Cover */}
        <div className="shrink-0">
          <div className="h-16 w-16 md:h-[76px] md:w-[76px] rounded-3xl bg-white/65 border border-white/70 overflow-hidden flex items-center justify-center">
            {cover ? (
              <img
                src={withBase(cover)}
                alt={item?.title || "cover"}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <HeaderIcon className="h-6 w-6 text-[#FF3B86] opacity-70" />
            )}
          </div>
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1 flex flex-col">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-base md:text-lg font-black text-[#6A3143] truncate">
                {item?.title || "（未命名）"}
              </div>
              {item?.desc ? (
                <div className="mt-1 text-sm text-[#6A3143]/70 line-clamp-2">{item.desc}</div>
              ) : null}
            </div>

            {tags.length > 0 ? (
              <div className="hidden sm:flex flex-wrap justify-end gap-1.5">
                {tags.slice(0, 3).map((t) => (
                  <span
                    key={t}
                    className="px-2.5 py-1 rounded-full bg-white/70 border border-white/70 text-[11px] font-black text-[#FF3B86]"
                  >
                    {t}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          {/* Actions */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              onClick={() => openLink(item)}
              className="ripple-button inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-[#FF3B86] text-white font-black shadow-sm hover:opacity-95"
            >
              <PrimaryIcon className="h-4 w-4" />
              {primaryLabel}
            </button>

            {canReadText ? (
              <button
                onClick={() => onCopy(readable, "已复制阅读文件路径")}
                className="ripple-button inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/70 border border-white/70 text-[#6A3143] font-black shadow-sm hover:bg-white/85"
              >
                <Copy className="h-4 w-4" />
                复制路径
              </button>
            ) : null}

            {cover ? (
              <button
                onClick={() => onCopy(cover, "已复制封面路径")}
                className="ripple-button inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/70 border border-white/70 text-[#6A3143] font-black shadow-sm hover:bg-white/85"
              >
                <Copy className="h-4 w-4" />
                复制封面
              </button>
            ) : null}

            {canReadText ? <span className="text-xs font-semibold text-[#B38A9B] truncate">{readable}</span> : null}
          </div>
        </div>
      </div>
    );
  }

  // 注意：关闭 BacktestShell 的 showHero，避免“标题重复出现（你截图那种）”
  return (
    <BacktestShell
      title={title}
      subtitle={subtitle}
      badge="LIBRARY"
      onBack={onBack}
      showHero={false}
      tone="iphone15"
    >
      <div className="max-w-6xl mx-auto px-4 pb-16">
        {/* Top bar */}
        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 text-[11px] font-black tracking-[0.22em] text-[#B38A9B]">
              <HeaderIcon className="h-4 w-4 text-[#FF3B86]" />
              <span>LIBRARY</span>
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-black text-[#6A3143]">{title}</h1>
            {subtitle ? <p className="mt-1 text-sm font-semibold text-[#B38A9B]">{subtitle}</p> : null}
          </div>

          <div className="w-full sm:w-auto flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-2">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#B38A9B]" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="搜索：标题 / 简介 / 标签…"
                className="w-full pl-9 pr-3 py-2.5 rounded-2xl bg-white/65 border border-white/75 shadow-sm outline-none focus:ring-2 focus:ring-[#FF7EA9]/30"
              />
            </div>

            <div className="shrink-0 inline-flex items-center justify-center px-3 py-2 rounded-2xl bg-white/65 border border-white/75 text-xs font-black text-[#6A3143]">
              {filtered.length}/{items.length}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="mt-6">
          {status === "loading" ? (
            <div className={`${glassCard} p-6 text-[#6A3143]/80 font-semibold`}>正在加载…</div>
          ) : null}

          {status === "error" ? (
            <div className={`${glassCard} p-6`}>
              <div className="font-black text-[#6A3143]">加载失败</div>
              <div className="mt-2 text-sm text-[#6A3143]/70">{errMsg}</div>
              <div className="mt-3 text-xs font-semibold text-[#B38A9B]">检查一下：{editHint}</div>
            </div>
          ) : null}

          {status === "ok" && items.length === 0 ? (
            <div className={`${glassCard} p-8 text-center`}>
              <div className="text-lg font-black text-[#6A3143]">{emptyHint}</div>
              <div className="mt-2 text-sm font-semibold text-[#B38A9B]">编辑：{editHint}</div>
              <div className="mt-1 text-sm font-semibold text-[#B38A9B]">资源：{assetHint}</div>
            </div>
          ) : null}

          {status === "ok" && items.length > 0 && filtered.length === 0 ? (
            <div className={`${glassCard} p-8 text-center`}>
              <div className="text-lg font-black text-[#6A3143]">没有匹配的结果</div>
              <div className="mt-2 text-sm font-semibold text-[#B38A9B]">试试换个关键词～</div>
            </div>
          ) : null}

          {status === "ok" && filtered.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((item, idx) => renderCard(item, idx))}
            </div>
          ) : null}
        </div>

        {/* Update tips */}
        <div className="mt-10">
          <details className={`${glassCard} p-5`}>
            <summary className="cursor-pointer select-none flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#FF3B86]" />
                <span className="font-black text-[#6A3143]">如何更新</span>
                <span className="text-xs font-semibold text-[#B38A9B]">（点我展开）</span>
              </div>
              <span className="text-xs font-black text-[#B38A9B]">update</span>
            </summary>

            <div className="mt-4 text-sm text-[#6A3143]/80 leading-relaxed">
              <div className="font-semibold">1）改内容：{editHint}</div>
              <div className="font-semibold">2）放资源：{assetHint}</div>
              <div className="mt-2 text-xs font-semibold text-[#B38A9B]">
                小提示：你改完 JSON（index.json）后，刷新网页就能看到新的作品啦～
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => onCopy(editHint, "已复制 JSON 路径")}
                  className="ripple-button px-3 py-2 rounded-2xl bg-white/70 border border-white/70 text-[#6A3143] font-black shadow-sm hover:bg-white/85"
                >
                  复制 JSON 路径
                </button>
                <button
                  onClick={() => onCopy(assetHint, "已复制资源目录")}
                  className="ripple-button px-3 py-2 rounded-2xl bg-white/70 border border-white/70 text-[#6A3143] font-black shadow-sm hover:bg-white/85"
                >
                  复制资源目录
                </button>
              </div>
            </div>
          </details>
        </div>

        {/* Toast */}
        {toast ? (
          <div className="fixed left-1/2 top-6 -translate-x-1/2 z-50">
            <div className="px-4 py-2 rounded-2xl bg-white/85 border border-white/70 shadow-lg text-[#6A3143] font-black">
              {toast}
            </div>
          </div>
        ) : null}
      </div>
    </BacktestShell>
  );
}
