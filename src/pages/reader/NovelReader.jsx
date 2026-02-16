import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Bookmark,
  Download,
  List,
  Minus,
  Moon,
  Plus,
  Search,
  Sun,
  X,
} from "lucide-react";

import { withBase } from "../../utils/withBase";

import "./reader.css";

// ==============================
// 慕溪专属：阅读器 v2（甜但高级）
// - 默认：宽屏单栏（字更多）
// - 可一键切：双栏（更像番茄/晋江 PC 阅读器）
// - 目录 / 书签 / 搜索 / 进度 / 记忆阅读位置 / 夜间模式
// ==============================

const STORAGE = {
  settings: "mx_reader_settings_v2",
  recent: "mx_reader_recent_v2",
  progressPrefix: "mx_reader_progress_v2:",
  bookmarksPrefix: "mx_reader_bookmarks_v2:",
};

const DEFAULT_SETTINGS = {
  fontSize: 18,
  lineHeight: 1.9,
  indent: true,
  width: "fill", // fill（尽量拉满）| wide（舒服）| compact（更窄）
  columns: 1,
  theme: "milk", // milk（草莓牛奶粉） | night（莓果夜）
};

function safeJsonParse(v, fallback) {
  try {
    const parsed = JSON.parse(v);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function getQuery() {
  const p = new URLSearchParams(window.location.search);
  return {
    file:
      p.get("file") ||
      p.get("path") ||
      p.get("p") ||
      "",
    title: p.get("title") || "",
  };
}

function isHeadingLine(line) {
  const t = line.trim();
  if (!t) return false;
  if (t.length > 64) return false;
  if (/^#+\s+/.test(t)) return true;
  if (/^第[零一二三四五六七八九十百千0-9]+\s*[章节回卷部篇幕]\b/.test(t)) return true;
  if (/^【[^【】]{1,32}】$/.test(t)) return true;
  if (/^Chapter\s+\d+/i.test(t)) return true;
  return false;
}

function normalizeHeading(line) {
  const t = line.trim().replace(/^#+\s+/, "");
  return t;
}

function parseToBlocks(text) {
  const lines = String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const blocks = [];
  let buf = [];

  const flush = () => {
    const joined = buf.join("\n").trimEnd();
    if (joined.trim()) blocks.push({ type: "p", text: joined });
    buf = [];
  };

  for (const line of lines) {
    if (!line.trim()) {
      flush();
      continue;
    }
    if (isHeadingLine(line)) {
      flush();
      blocks.push({ type: "h2", text: normalizeHeading(line) });
      continue;
    }
    buf.push(line);
  }
  flush();
  return blocks;
}

function countReplacementChar(s) {
  return (String(s).match(/\uFFFD/g) || []).length;
}

function decodeSmart(buf) {
  // ✅ 优先 UTF-8；若出现大量替换字符（�），再尝试 GBK（Windows 上常见）
  const u8 = new Uint8Array(buf);
  let text = new TextDecoder("utf-8", { fatal: false }).decode(u8);
  let encoding = "utf-8";
  const rep = countReplacementChar(text);
  const threshold = Math.max(12, Math.floor(text.length * 0.004));
  if (rep >= threshold) {
    try {
      const gbk = new TextDecoder("gbk", { fatal: false }).decode(u8);
      // 只有当 GBK 明显更好时才切换
      if (countReplacementChar(gbk) < rep) {
        text = gbk;
        encoding = "gbk";
      }
    } catch {
      // ignore
    }
  }
  return { text, encoding };
}

function niceFileName(path) {
  const p = String(path || "").split("/").filter(Boolean);
  const last = p[p.length - 1] || "";
  return last.replace(/\.[^/.]+$/, "") || "未命名";
}

function formatTime(ts) {
  try {
    const d = new Date(ts);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${d.getMonth() + 1}/${d.getDate()} ${hh}:${mm}`;
  } catch {
    return "";
  }
}

export default function NovelReader() {
  const { file: fileFromQuery, title: titleFromQuery } = getQuery();
  const file = fileFromQuery || "";

  const [status, setStatus] = useState("idle"); // idle | loading | ok | error
  const [err, setErr] = useState("");
  const [encoding, setEncoding] = useState("utf-8");
  const [raw, setRaw] = useState("");

  const [settings, setSettings] = useState(() => {
    const s = safeJsonParse(localStorage.getItem(STORAGE.settings), null);
    return { ...DEFAULT_SETTINGS, ...(s || {}) };
  });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState("toc"); // toc | bookmarks | search | settings
  const [searchQ, setSearchQ] = useState("");

  const [progress, setProgress] = useState(0);
  const [activeHeadingId, setActiveHeadingId] = useState("");

  const scrollerRef = useRef(null);
  const headingPosRef = useRef([]); // {id, top, text}

  const blocks = useMemo(() => parseToBlocks(raw), [raw]);

  const toc = useMemo(() => {
    const out = [];
    let idx = 0;
    for (let i = 0; i < blocks.length; i++) {
      if (blocks[i].type === "h2") {
        out.push({ id: `h_${idx++}`, text: blocks[i].text, blockIndex: i });
      }
    }
    return out;
  }, [blocks]);

  const effectiveTitle = useMemo(() => {
    if (titleFromQuery) return titleFromQuery;
    return niceFileName(file);
  }, [titleFromQuery, file]);

  const progressKey = useMemo(() => `${STORAGE.progressPrefix}${file || "__no_file__"}`,[file]);
  const bookmarksKey = useMemo(() => `${STORAGE.bookmarksPrefix}${file || "__no_file__"}`,[file]);

  const [bookmarks, setBookmarks] = useState(() => {
    const arr = safeJsonParse(localStorage.getItem(bookmarksKey), []);
    return Array.isArray(arr) ? arr : [];
  });

  // 读取文件
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!file) {
        setStatus("idle");
        setRaw("");
        return;
      }
      try {
        setStatus("loading");
        setErr("");
        const url = withBase(file);
        const res = await fetch(url);
        if (!res.ok) throw new Error(`读取失败：HTTP ${res.status}`);
        const buf = await res.arrayBuffer();
        const decoded = decodeSmart(buf);
        if (cancelled) return;
        setEncoding(decoded.encoding);
        setRaw(decoded.text);
        setStatus("ok");

        // 记录最近打开
        try {
          localStorage.setItem(
            STORAGE.recent,
            JSON.stringify({ file, title: effectiveTitle, ts: Date.now() })
          );
        } catch {
          // ignore
        }
      } catch (e) {
        if (cancelled) return;
        setStatus("error");
        setErr(String(e?.message || e));
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [file, effectiveTitle]);

  // 保存设置
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE.settings, JSON.stringify(settings));
    } catch {
      // ignore
    }
  }, [settings]);

  // bookmarks 持久化（按文件）
  useEffect(() => {
    try {
      localStorage.setItem(bookmarksKey, JSON.stringify(bookmarks));
    } catch {
      // ignore
    }
  }, [bookmarksKey, bookmarks]);

  // 计算 heading 位置（用于目录高亮 + 当前章）
  useEffect(() => {
    const sc = scrollerRef.current;
    if (!sc) return;
    const recompute = () => {
      const list = [];
      toc.forEach((h) => {
        const el = document.getElementById(h.id);
        if (!el) return;
        const top = el.offsetTop;
        list.push({ id: h.id, top, text: h.text });
      });
      headingPosRef.current = list.sort((a, b) => a.top - b.top);
    };

    // 等一帧再测量，避免布局未稳定
    const t = setTimeout(recompute, 50);
    window.addEventListener("resize", recompute);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", recompute);
    };
  }, [toc, settings.columns, settings.fontSize, settings.lineHeight, settings.width, settings.indent]);

  // 读取上次进度并跳转
  useEffect(() => {
    const sc = scrollerRef.current;
    if (!sc) return;
    if (status !== "ok") return;
    const saved = safeJsonParse(localStorage.getItem(progressKey), null);
    if (!saved) return;
    // 等内容渲染稳定
    const t = setTimeout(() => {
      const max = sc.scrollHeight - sc.clientHeight;
      if (max <= 0) return;
      const y = clamp(saved.pct || 0, 0, 1) * max;
      sc.scrollTop = y;
    }, 80);
    return () => clearTimeout(t);
  }, [progressKey, status, raw]);

  // 监听滚动：进度 + 当前章 + 自动保存
  useEffect(() => {
    const sc = scrollerRef.current;
    if (!sc) return;

    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        const max = sc.scrollHeight - sc.clientHeight;
        const pct = max > 0 ? sc.scrollTop / max : 0;
        setProgress(pct);

        // 当前章（取最后一个 top <= scrollTop + offset）
        const offset = 120;
        const pos = headingPosRef.current;
        let cur = "";
        for (let i = 0; i < pos.length; i++) {
          if (pos[i].top <= sc.scrollTop + offset) cur = pos[i].id;
          else break;
        }
        if (cur && cur !== activeHeadingId) setActiveHeadingId(cur);

        // 自动保存
        try {
          localStorage.setItem(progressKey, JSON.stringify({ pct, ts: Date.now() }));
        } catch {
          // ignore
        }
      });
    };
    sc.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      sc.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progressKey, activeHeadingId]);

  // ESC 关闭抽屉
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setDrawerOpen(false);
      if (e.key === "/" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setDrawerOpen(true);
        setDrawerTab("search");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const themeStyle = useMemo(() => {
    if (settings.theme === "night") {
      return {
        background:
          "radial-gradient(1200px 700px at 20% 10%, rgba(255, 166, 195, 0.12) 0%, rgba(255,255,255,0) 60%), radial-gradient(900px 600px at 80% 20%, rgba(186, 225, 255, 0.10) 0%, rgba(255,255,255,0) 55%), linear-gradient(180deg, #1A1416 0%, #120E10 100%)",
        color: "#F8E9EE",
      };
    }
    // milk（草莓牛奶粉）：更软、更糯、更不刺眼
    return {
      background:
        "radial-gradient(1200px 700px at 20% 10%, rgba(255, 181, 206, 0.38) 0%, rgba(255,255,255,0) 60%), radial-gradient(900px 600px at 80% 25%, rgba(199, 228, 255, 0.22) 0%, rgba(255,255,255,0) 55%), linear-gradient(180deg, #FFF4F7 0%, #FFF8FB 55%, #FFFDFE 100%)",
      color: "#6A3A44",
    };
  }, [settings.theme]);

  const widthClass = useMemo(() => {
    if (settings.width === "compact") return "max-w-4xl";
    if (settings.width === "wide") return "max-w-6xl";
    return "max-w-none"; // fill
  }, [settings.width]);

  const addBookmark = () => {
    const sc = scrollerRef.current;
    if (!sc) return;
    const max = sc.scrollHeight - sc.clientHeight;
    const pct = max > 0 ? sc.scrollTop / max : 0;
    const curId = activeHeadingId || (toc[0]?.id || "");
    const curTitle = (toc.find((t) => t.id === curId)?.text || "").trim();
    const item = {
      id: `bm_${Date.now()}`,
      pct,
      headingId: curId,
      title: curTitle || "书签",
      ts: Date.now(),
    };
    setBookmarks((prev) => [item, ...prev]);
    // 给妹妹一个“软糯”提示：轻微震动/或短暂闪烁
    try {
      // eslint-disable-next-line no-undef
      navigator.vibrate?.(15);
    } catch {
      // ignore
    }
  };

  const jumpToId = (id) => {
    const sc = scrollerRef.current;
    if (!sc) return;
    const el = document.getElementById(id);
    if (!el) return;
    sc.scrollTo({ top: el.offsetTop - 18, behavior: "smooth" });
  };

  const jumpToPct = (pct) => {
    const sc = scrollerRef.current;
    if (!sc) return;
    const max = sc.scrollHeight - sc.clientHeight;
    sc.scrollTo({ top: clamp(pct, 0, 1) * Math.max(0, max), behavior: "smooth" });
  };

  const goBack = () => {
    if (window.history.length > 1) window.history.back();
    else window.location.href = withBase("");
  };

  const downloadTxt = () => {
    const blob = new Blob([raw || ""], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${effectiveTitle}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  };

  const searchResults = useMemo(() => {
    const q = searchQ.trim();
    if (!q) return [];
    const lowerQ = q.toLowerCase();
    const out = [];
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      const text = String(b.text || "");
      if (text.toLowerCase().includes(lowerQ)) {
        const idx = text.toLowerCase().indexOf(lowerQ);
        const start = Math.max(0, idx - 18);
        const end = Math.min(text.length, idx + q.length + 28);
        out.push({
          id: `b_${i}`,
          blockIndex: i,
          type: b.type,
          snippet: text.slice(start, end),
        });
      }
      if (out.length >= 80) break;
    }
    return out;
  }, [blocks, searchQ]);

  const ui = (
    <div
      className="min-h-screen relative overflow-hidden selection:bg-[#FFD7E4] selection:text-[#6A3A44]"
      style={themeStyle}
    >
      {/* 顶部进度条（progress bar，进度条） */}
      <div className="fixed top-0 left-0 right-0 h-[3px] z-50">
        <div
          className="h-full w-full"
          style={{
            transformOrigin: "0 50%",
            transform: `scaleX(${clamp(progress, 0, 1)})`,
            background:
              settings.theme === "night"
                ? "linear-gradient(90deg, rgba(255,170,200,0.85), rgba(186,225,255,0.75))"
                : "linear-gradient(90deg, rgba(255,170,200,0.95), rgba(186,225,255,0.85))",
            boxShadow:
              settings.theme === "night"
                ? "0 0 14px rgba(255,170,200,0.35)"
                : "0 0 18px rgba(255,170,200,0.38)",
          }}
        />
      </div>

      {/* 氛围：颗粒 + 暗角 */}
      <div className="fixed inset-0 pointer-events-none z-[1] noise-overlay" />
      <div
        className="fixed inset-0 pointer-events-none z-[2]"
        style={{
          background:
            settings.theme === "night"
              ? "radial-gradient(80% 60% at 50% 35%, rgba(0,0,0,0) 0%, rgba(255,170,200,0.06) 55%, rgba(0,0,0,0.25) 100%)"
              : "radial-gradient(80% 60% at 50% 35%, rgba(255,255,255,0) 0%, rgba(255,170,200,0.10) 55%, rgba(106,58,68,0.10) 100%)",
          opacity: 0.9,
        }}
      />

      <div className="relative z-10 px-4 md:px-6 lg:px-8 py-4 md:py-6">
        {/* 工具栏（sticky toolbar） */}
        <div className="sticky top-4 z-30">
          <div className="reader-toolbar rounded-[22px]">
            <div className="px-3 py-3 md:px-4 md:py-3">
              <div className="flex flex-col gap-2">
                {/* Row 1：返回 + 标题 + 核心功能 */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      onClick={goBack}
                      className="ripple-button reader-chip inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-black"
                      style={{
                        color: settings.theme === "night" ? "#F8E9EE" : "#6A3A44",
                      }}
                      title="返回（back，返回）"
                    >
                      <ArrowLeft size={18} />
                      返回
                    </button>

                    <div className="min-w-0">
                      <div
                        className="truncate text-base md:text-lg font-black reader-title-glow"
                        style={{
                          color: settings.theme === "night" ? "#F8E9EE" : "#6A3A44",
                        }}
                        title={effectiveTitle}
                      >
                        {effectiveTitle}
                      </div>
                      <div
                        className="text-xs font-semibold opacity-80 truncate"
                        style={{
                          color: settings.theme === "night" ? "rgba(248,233,238,0.75)" : "rgba(106,58,68,0.65)",
                        }}
                      >
                        {file ? `文件：public/${file}（编码：${encoding}）` : "请从小说列表打开（open from list，从列表打开）"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <button
                      onClick={() => {
                        setDrawerOpen(true);
                        setDrawerTab("toc");
                      }}
                      className="ripple-button reader-chip inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-black"
                      style={{ color: settings.theme === "night" ? "#F8E9EE" : "#6A3A44" }}
                      title="目录（TOC，目录）"
                    >
                      <List size={18} />
                      目录
                    </button>

                    <button
                      onClick={() => {
                        setDrawerOpen(true);
                        setDrawerTab("search");
                      }}
                      className="ripple-button reader-chip inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-black"
                      style={{ color: settings.theme === "night" ? "#F8E9EE" : "#6A3A44" }}
                      title="搜索（search，搜索）  ⌘/Ctrl + /"
                    >
                      <Search size={18} />
                      搜索
                    </button>

                    <button
                      onClick={() => {
                        setDrawerOpen(true);
                        setDrawerTab("bookmarks");
                      }}
                      className="ripple-button reader-chip inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-black"
                      style={{ color: settings.theme === "night" ? "#F8E9EE" : "#6A3A44" }}
                      title="书签（bookmark，书签）"
                    >
                      <Bookmark size={18} />
                      书签
                    </button>

                    <button
                      onClick={addBookmark}
                      className="ripple-button inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-black"
                      style={{
                        background:
                          settings.theme === "night"
                            ? "rgba(255, 170, 200, 0.16)"
                            : "rgba(255, 170, 200, 0.32)",
                        border:
                          settings.theme === "night"
                            ? "1px solid rgba(255, 170, 200, 0.22)"
                            : "1px solid rgba(255, 170, 200, 0.40)",
                        color: settings.theme === "night" ? "#F8E9EE" : "#6A3A44",
                        boxShadow:
                          settings.theme === "night"
                            ? "0 10px 26px rgba(255,170,200,0.12)"
                            : "0 10px 26px rgba(255,170,200,0.18)",
                      }}
                      title="加入书签（add bookmark，加入书签）"
                    >
                      <Bookmark size={18} />
                      +
                    </button>

                    <button
                      onClick={() =>
                        setSettings((s) => ({
                          ...s,
                          theme: s.theme === "night" ? "milk" : "night",
                        }))
                      }
                      className="ripple-button reader-chip inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-black"
                      style={{ color: settings.theme === "night" ? "#F8E9EE" : "#6A3A44" }}
                      title={settings.theme === "night" ? "切回草莓牛奶粉" : "切换莓果夜"}
                    >
                      {settings.theme === "night" ? <Sun size={18} /> : <Moon size={18} />}
                      {settings.theme === "night" ? "日间" : "夜间"}
                    </button>

                    <button
                      onClick={downloadTxt}
                      className="ripple-button reader-chip inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-black"
                      style={{ color: settings.theme === "night" ? "#F8E9EE" : "#6A3A44" }}
                      title="下载 TXT（download，下载）"
                    >
                      <Download size={18} />
                      下载
                    </button>
                  </div>
                </div>

                {/* Row 2：排版（typography） */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div
                      className="reader-chip inline-flex items-center gap-1 px-2 py-2 rounded-full"
                      style={{
                        color: settings.theme === "night" ? "#F8E9EE" : "#6A3A44",
                      }}
                      title="字号（font size，字号）"
                    >
                      <button
                        onClick={() =>
                          setSettings((s) => ({
                            ...s,
                            fontSize: clamp((s.fontSize || 18) - 1, 14, 28),
                          }))
                        }
                        className="ripple-button px-2 py-1 rounded-full font-black"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="px-2 text-xs font-black">A {settings.fontSize}</span>
                      <button
                        onClick={() =>
                          setSettings((s) => ({
                            ...s,
                            fontSize: clamp((s.fontSize || 18) + 1, 14, 28),
                          }))
                        }
                        className="ripple-button px-2 py-1 rounded-full font-black"
                      >
                        <Plus size={16} />
                      </button>
                    </div>

                    <button
                      onClick={() =>
                        setSettings((s) => {
                          const seq = [1.65, 1.85, 2.0];
                          const cur = Number(s.lineHeight || 1.9);
                          const idx = seq.findIndex((x) => Math.abs(x - cur) < 0.02);
                          const next = seq[(idx + 1 + seq.length) % seq.length] || 1.85;
                          return { ...s, lineHeight: next };
                        })
                      }
                      className="ripple-button reader-chip inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-black"
                      style={{ color: settings.theme === "night" ? "#F8E9EE" : "#6A3A44" }}
                      title="行距（line height，行距）"
                    >
                      行距 {settings.lineHeight}
                    </button>

                    <button
                      onClick={() => setSettings((s) => ({ ...s, indent: !s.indent }))}
                      className="ripple-button reader-chip inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-black"
                      style={{ color: settings.theme === "night" ? "#F8E9EE" : "#6A3A44" }}
                      title="段首缩进（indent，缩进）"
                    >
                      {settings.indent ? "缩进开" : "缩进关"}
                    </button>

                    <button
                      onClick={() =>
                        setSettings((s) => {
                          const next = s.width === "fill" ? "wide" : s.width === "wide" ? "compact" : "fill";
                          return { ...s, width: next };
                        })
                      }
                      className="ripple-button reader-chip inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-black"
                      style={{ color: settings.theme === "night" ? "#F8E9EE" : "#6A3A44" }}
                      title="宽度（width，宽度）"
                    >
                      {settings.width === "fill" ? "满屏" : settings.width === "wide" ? "宽" : "窄"}
                    </button>

                    <button
                      onClick={() =>
                        setSettings((s) => ({
                          ...s,
                          columns: s.columns === 2 ? 1 : 2,
                        }))
                      }
                      className="ripple-button reader-chip inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-black"
                      style={{ color: settings.theme === "night" ? "#F8E9EE" : "#6A3A44" }}
                      title="单双栏（columns，栏数）"
                    >
                      {settings.columns === 2 ? "双栏" : "单栏"}
                      <span
                        className="inline-block w-2 h-2 rounded-full"
                        style={{
                          background:
                            settings.columns === 2 ? "rgba(255,170,200,0.9)" : "rgba(186,225,255,0.9)",
                        }}
                      />
                    </button>
                  </div>

                  <div className="text-xs font-semibold opacity-75"
                    style={{ color: settings.theme === "night" ? "rgba(248,233,238,0.70)" : "rgba(106,58,68,0.60)" }}
                  >
                    小技巧：⌘/Ctrl + / 打开搜索（open search）
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 阅读区（Reading） */}
        <div className={`mt-4 ${widthClass}`}>
          <div
            className={`reader-paper rounded-[28px] overflow-hidden`}
            style={{
              background:
                settings.theme === "night"
                  ? "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.05) 100%)"
                  : undefined,
              border:
                settings.theme === "night"
                  ? "1px solid rgba(255,255,255,0.14)"
                  : undefined,
            }}
          >
            <div
              ref={scrollerRef}
              className="custom-scrollbar max-h-[calc(100vh-170px)] overflow-auto px-6 md:px-10 py-8 md:py-10"
              style={{
                color: settings.theme === "night" ? "rgba(248,233,238,0.88)" : "#6A3A44",
              }}
            >
              {status === "idle" ? (
                <div className="text-center py-16">
                  <div className="text-2xl font-black">还没有选择文本（no file）</div>
                  <div className="mt-3 text-sm font-semibold opacity-75">
                    从「小说列表」点“阅读”打开即可～
                  </div>
                  <div className="mt-6 text-xs font-semibold opacity-70">
                    把正文放到 <b>public/Novels/data/你的小说文件夹/text.txt</b>，然后在 <b>public/Novels/index.json</b> 里把 link 填成
                    <b>Novels/你的文件.txt</b>
                  </div>
                </div>
              ) : null}

              {status === "loading" ? (
                <div className="text-center py-16">
                  <div className="text-xl font-black">正在打开…</div>
                  <div className="mt-3 text-sm font-semibold opacity-75">给妹妹泡一杯草莓牛奶的时间 🍓</div>
                </div>
              ) : null}

              {status === "error" ? (
                <div className="py-10">
                  <div className="text-2xl font-black">打开失败（error）</div>
                  <div className="mt-3 text-sm font-semibold opacity-80 break-words">{err}</div>
                  <div className="mt-5 text-xs font-semibold opacity-75">
                    常见原因：
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                      <li>文件没放在 public/Novels/ 里</li>
                      <li>JSON 里的 link 路径写错（区分大小写）</li>
                      <li>TXT 编码异常：建议用 UTF-8 保存（本阅读器也会尝试 GBK 修复）</li>
                    </ul>
                  </div>
                </div>
              ) : null}

              {status === "ok" ? (
                <article
                  className={`${settings.columns === 2 ? "reader-columns" : ""}`}
                  style={{
                    fontSize: `${settings.fontSize}px`,
                    lineHeight: settings.lineHeight,
                    letterSpacing: settings.theme === "night" ? "0.01em" : "0.005em",
                  }}
                >
                  {blocks.map((b, i) => {
                    const blockId = `b_${i}`;
                    if (b.type === "h2") {
                      const hIndex = toc.find((x) => x.blockIndex === i)?.id;
                      const id = hIndex || `h_fallback_${i}`;
                      return (
                        <div key={blockId} className="pt-2">
                          <h2
                            id={id}
                            data-reader-heading="1"
                            className="mt-10 first:mt-0 text-2xl md:text-3xl font-black"
                            style={{
                              color: settings.theme === "night" ? "#F8E9EE" : "#6A3A44",
                              textShadow:
                                settings.theme === "night"
                                  ? "0 10px 22px rgba(255,170,200,0.10)"
                                  : "0 10px 24px rgba(255,170,200,0.18)",
                            }}
                          >
                            {b.text}
                          </h2>
                          <div
                            className="mt-4 h-px"
                            style={{
                              background:
                                settings.theme === "night"
                                  ? "linear-gradient(90deg, transparent, rgba(255,170,200,0.18), transparent)"
                                  : "linear-gradient(90deg, transparent, rgba(255,170,200,0.30), transparent)",
                            }}
                          />
                        </div>
                      );
                    }

                    return (
                      <p
                        key={blockId}
                        id={blockId}
                        className="mt-5 whitespace-pre-wrap font-semibold"
                        style={{
                          textIndent: settings.indent ? "2em" : "0em",
                          color: settings.theme === "night" ? "rgba(248,233,238,0.88)" : "rgba(106,58,68,0.92)",
                        }}
                      >
                        {b.text}
                      </p>
                    );
                  })}
                </article>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Drawer（右侧抽屉） */}
      <div
        className={`fixed inset-0 z-40 ${drawerOpen ? "" : "pointer-events-none"}`}
        aria-hidden={!drawerOpen}
      >
        <div
          className={`absolute inset-0 transition-opacity ${drawerOpen ? "opacity-100" : "opacity-0"}`}
          style={{ background: drawerOpen ? "rgba(0,0,0,0.20)" : "rgba(0,0,0,0)" }}
          onClick={() => setDrawerOpen(false)}
        />

        <aside
          className={`reader-drawer absolute right-0 top-0 h-full w-[360px] max-w-[92vw] transition-transform duration-300 ${
            drawerOpen ? "translate-x-0" : "translate-x-full"
          }`}
          style={{
            color: settings.theme === "night" ? "#F8E9EE" : "#6A3A44",
            background:
              settings.theme === "night"
                ? "rgba(20, 16, 18, 0.88)"
                : undefined,
          }}
        >
          <div className="h-full flex flex-col">
            <div className="p-4 border-b"
              style={{ borderColor: settings.theme === "night" ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.65)" }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-base font-black">{drawerTab === "toc" ? "目录" : drawerTab === "bookmarks" ? "书签" : "搜索"}</div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="ripple-button reader-chip inline-flex items-center justify-center w-9 h-9 rounded-full"
                  style={{ color: settings.theme === "night" ? "#F8E9EE" : "#6A3A44" }}
                  title="关闭（close）"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-3 flex items-center gap-2">
                {[
                  { k: "toc", t: "目录" },
                  { k: "bookmarks", t: "书签" },
                  { k: "search", t: "搜索" },
                ].map((x) => (
                  <button
                    key={x.k}
                    onClick={() => setDrawerTab(x.k)}
                    className="ripple-button px-3 py-2 rounded-full text-sm font-black"
                    style={{
                      background:
                        drawerTab === x.k
                          ? settings.theme === "night"
                            ? "rgba(255,170,200,0.18)"
                            : "rgba(255,170,200,0.34)"
                          : "rgba(255,255,255,0.40)",
                      border:
                        drawerTab === x.k
                          ? settings.theme === "night"
                            ? "1px solid rgba(255,170,200,0.22)"
                            : "1px solid rgba(255,170,200,0.40)"
                          : "1px solid rgba(255,255,255,0.60)",
                      color: settings.theme === "night" ? "#F8E9EE" : "#6A3A44",
                    }}
                  >
                    {x.t}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar p-4">
              {/* TOC */}
              {drawerTab === "toc" ? (
                <div className="space-y-2">
                  {toc.length === 0 ? (
                    <div className="text-sm font-semibold opacity-75">
                      没识别到章节标题～（可以在文本里用“第X章 …”或“# 标题”）
                    </div>
                  ) : null}
                  {toc.map((h) => {
                    const active = h.id === activeHeadingId;
                    return (
                      <button
                        key={h.id}
                        onClick={() => {
                          jumpToId(h.id);
                          setDrawerOpen(false);
                        }}
                        className="ripple-button w-full text-left px-3 py-3 rounded-2xl"
                        style={{
                          background: active
                            ? settings.theme === "night"
                              ? "rgba(255,170,200,0.16)"
                              : "rgba(255,170,200,0.28)"
                            : "rgba(255,255,255,0.40)",
                          border: active
                            ? settings.theme === "night"
                              ? "1px solid rgba(255,170,200,0.20)"
                              : "1px solid rgba(255,170,200,0.34)"
                            : "1px solid rgba(255,255,255,0.60)",
                          color: settings.theme === "night" ? "#F8E9EE" : "#6A3A44",
                        }}
                      >
                        <div className="text-sm font-black line-clamp-2">{h.text}</div>
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {/* Bookmarks */}
              {drawerTab === "bookmarks" ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold opacity-75">共 {bookmarks.length} 个</div>
                    {bookmarks.length > 0 ? (
                      <button
                        onClick={() => setBookmarks([])}
                        className="ripple-button px-3 py-2 rounded-full text-xs font-black"
                        style={{
                          background: "rgba(255,255,255,0.40)",
                          border: "1px solid rgba(255,255,255,0.60)",
                          color: settings.theme === "night" ? "#F8E9EE" : "#6A3A44",
                        }}
                        title="清空书签（clear）"
                      >
                        清空
                      </button>
                    ) : null}
                  </div>

                  {bookmarks.length === 0 ? (
                    <div className="text-sm font-semibold opacity-75">
                      还没有书签～点击顶部「书签 +」就能收藏当前位置。
                    </div>
                  ) : null}

                  {bookmarks.map((b) => (
                    <div
                      key={b.id}
                      className="p-3 rounded-2xl"
                      style={{
                        background: "rgba(255,255,255,0.42)",
                        border: "1px solid rgba(255,255,255,0.62)",
                      }}
                    >
                      <button
                        onClick={() => {
                          jumpToPct(b.pct);
                          setDrawerOpen(false);
                        }}
                        className="ripple-button w-full text-left"
                        style={{ color: settings.theme === "night" ? "#F8E9EE" : "#6A3A44" }}
                      >
                        <div className="text-sm font-black line-clamp-2">{b.title || "书签"}</div>
                        <div className="mt-1 text-xs font-semibold opacity-70">
                          进度 {(b.pct * 100).toFixed(1)}% · {formatTime(b.ts)}
                        </div>
                      </button>
                      <div className="mt-2 flex justify-end">
                        <button
                          onClick={() => setBookmarks((prev) => prev.filter((x) => x.id !== b.id))}
                          className="ripple-button px-3 py-2 rounded-full text-xs font-black"
                          style={{
                            background: "rgba(255,255,255,0.40)",
                            border: "1px solid rgba(255,255,255,0.60)",
                            color: settings.theme === "night" ? "#F8E9EE" : "#6A3A44",
                          }}
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {/* Search */}
              {drawerTab === "search" ? (
                <div>
                  <div className="flex items-center gap-2">
                    <input
                      value={searchQ}
                      onChange={(e) => setSearchQ(e.target.value)}
                      placeholder="输入关键词…（search）"
                      className="w-full px-4 py-3 rounded-2xl outline-none"
                      style={{
                        background:
                          settings.theme === "night" ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.55)",
                        border:
                          settings.theme === "night" ? "1px solid rgba(255,255,255,0.14)" : "1px solid rgba(255,255,255,0.70)",
                        color: settings.theme === "night" ? "#F8E9EE" : "#6A3A44",
                      }}
                    />
                    {searchQ ? (
                      <button
                        onClick={() => setSearchQ("")}
                        className="ripple-button reader-chip inline-flex items-center justify-center w-10 h-10 rounded-full"
                        style={{ color: settings.theme === "night" ? "#F8E9EE" : "#6A3A44" }}
                        title="清空（clear）"
                      >
                        <X size={18} />
                      </button>
                    ) : null}
                  </div>

                  <div className="mt-3 text-xs font-semibold opacity-75">
                    结果最多显示 80 条（为了不卡顿）。
                  </div>

                  <div className="mt-4 space-y-2">
                    {searchQ.trim() && searchResults.length === 0 ? (
                      <div className="text-sm font-semibold opacity-75">没找到～</div>
                    ) : null}

                    {searchResults.map((r) => (
                      <button
                        key={`${r.id}`}
                        onClick={() => {
                          jumpToId(r.id);
                          setDrawerOpen(false);
                        }}
                        className="ripple-button w-full text-left px-3 py-3 rounded-2xl"
                        style={{
                          background: "rgba(255,255,255,0.42)",
                          border: "1px solid rgba(255,255,255,0.62)",
                          color: settings.theme === "night" ? "#F8E9EE" : "#6A3A44",
                        }}
                      >
                        <div className="text-xs font-black opacity-80">{r.type === "h2" ? "标题" : "正文"}</div>
                        <div className="mt-1 text-sm font-semibold line-clamp-3 opacity-90">{r.snippet}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );

  return ui;
}
