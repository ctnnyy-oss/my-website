import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Bookmark,
  Download,
  List,
  Minus,
  Moon,
  Plus,
  Search,
  Sun,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { withBase } from "../../utils/withBase";

import "./reader.css";

// ==============================
// 慕溪专属：阅读器（稳定版 + 双页书本模式）
// - 单栏：纵向滚动（原逻辑）
// - 双栏：双页左右翻（像书本一样）✅
// - 目录 / 书签 / 搜索 / 进度
// - 记忆阅读位置 / 夜间模式
// - UTF-8 优先，必要时尝试 GBK
// ==============================

const STORAGE = {
  settings: "mx_reader_settings_v2",
  recent: "mx_reader_recent_v2",
  progressPrefix: "mx_reader_progress_v2:",
  bookmarksPrefix: "mx_reader_bookmarks_v2:",
  mobileOverlayHintSeen: "mx_reader_mobile_overlay_hint_seen_v1",
};

const DEFAULT_SETTINGS = {
  fontSize: 18,
  lineHeight: 1.9,
  indent: true,
  width: "fill", // fill | wide | compact
  columns: 1, // 1=单栏滚动；2=双页书本
  theme: "milk", // milk | night
};

function safeJsonParse(v, fallback) {
  try {
    return JSON.parse(v);
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
    file: p.get("file") || p.get("path") || p.get("p") || "",
    title: p.get("title") || "",
  };
}

function isHeadingLine(line) {
  const t = line.trim();
  if (!t) return false;
  if (t.length > 64) return false;
  if (/^#+\s+/.test(t)) return true;
  // 注意：JS 的 \b 是“英文单词边界”，对中文无效，容易导致“第1章/第一章”识别失败。
  // 这里用更稳的终止条件：章/节/回/卷/部/篇/幕 后面接空白/标点/结束。
  if (
    /^第\s*[零一二三四五六七八九十百千0-9]+\s*[章节回卷部篇幕](?:\s|　|:|：|、|,|\.|。|!|！|\?|？|—|-|~|～|$)/.test(
      t
    )
  )
    return true;
  if (/^【[^【】]{1,32}】$/.test(t)) return true;
  if (/^Chapter\s+\d+/i.test(t)) return true;
  // 常见无编号章节（同样不要用 \b）
  if (/^(序章|楔子|引子|前言|后记|尾声|番外)(?:\s|　|:|：|、|,|，|\.|。|!|！|\?|？|—|-|$)/.test(t))
    return true;
  return false;
}

function normalizeHeading(line) {
  return line.trim().replace(/^#+\s+/, "");
}

function parseToBlocks(text) {
  const lines = String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n");

  const blocks = [];
  let buf = [];

  // 很多 TXT 小说会“强制换行”（每行固定长度），会导致右侧大片空白。
  // 这里把同一段落内的多行重新拼接成一行，让它自动换行铺满屏幕。
  const unwrapParagraph = (arr) => {
    const cleaned = arr
      .map((l) => String(l || "").replace(/\u00A0/g, " ").trim())
      .filter(Boolean);

    if (!cleaned.length) return "";
    if (cleaned.length === 1) return cleaned[0];

    // 如果像诗/歌词那种短句（多数行很短），就保留原换行
    const totalLen = cleaned.reduce((acc, s) => acc + s.length, 0);
    const avgLen = totalLen / cleaned.length;
    const shortRatio = cleaned.filter((s) => s.length <= 16).length / cleaned.length;
    if (shortRatio >= 0.6 && avgLen <= 18) return cleaned.join("\n");

    const hasLatin = /[A-Za-z]/.test(cleaned.join(""));
    let joined = cleaned.join(hasLatin ? " " : "");

    // 去掉中文之间多余空格
    joined = joined
      .replace(/([\u4e00-\u9fff])\s+([\u4e00-\u9fff])/g, "$1$2")
      .replace(/\s{2,}/g, " ")
      .trimEnd();

    return joined;
  };

  const flush = () => {
    const joined = unwrapParagraph(buf);
    if (joined.trim()) blocks.push({ type: "p", text: joined });
    buf = [];
  };

  for (const line of lines) {
    if (!String(line).trim()) {
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
  const u8 = new Uint8Array(buf);
  let text = new TextDecoder("utf-8", { fatal: false }).decode(u8);
  let encoding = "utf-8";
  const rep = countReplacementChar(text);
  const threshold = Math.max(12, Math.floor(text.length * 0.004));
  if (rep >= threshold) {
    try {
      const gbk = new TextDecoder("gbk", { fatal: false }).decode(u8);
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
  const p = String(path || "")
    .split("/")
    .filter(Boolean);
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

function evenize(n) {
  const x = Math.max(0, Math.floor(n || 0));
  return x % 2 === 0 ? x : x - 1;
}

export default function ReaderPage({ file: fileProp, title: titleProp, onBack, meta }) {
  const { file: fileFromQuery, title: titleFromQuery } = getQuery();
  const file = fileProp || fileFromQuery || "";

  const [status, setStatus] = useState("idle"); // idle | loading | ok | error
  const [err, setErr] = useState("");
  const [encoding, setEncoding] = useState("utf-8");
  const [raw, setRaw] = useState("");

  const [settings, setSettings] = useState(() => {
    const s = safeJsonParse(localStorage.getItem(STORAGE.settings), null);
    return { ...DEFAULT_SETTINGS, ...(s || {}) };
  });

  const isBook = settings.columns === 2;

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState("toc"); // toc | bookmarks | search
  const [searchQ, setSearchQ] = useState("");

  const [progress, setProgress] = useState(0);
  const [activeHeadingId, setActiveHeadingId] = useState("");
  const [showInfoPanel, setShowInfoPanel] = useState(true);
  const [mobileOverlayOpen, setMobileOverlayOpen] = useState(false);
  const [mobileHintVisible, setMobileHintVisible] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
  const infoMode = !!meta && showInfoPanel;

  // 单栏滚动 refs
  const scrollerRef = useRef(null);
  const headingPosRef = useRef([]); // {id, top, text}

  // 双页书本 refs
  const bookViewportRef = useRef(null);
  const measureRef = useRef(null); // 仅用于分页测量（隐藏）
  const pendingPctToBookRef = useRef(null);
  const pendingPctToScrollRef = useRef(null);

  const [pages, setPages] = useState([]); // Array<Array<blockIndex>>
  const [blockToPage, setBlockToPage] = useState([]); // blockIndex -> pageIndex
  const [pageCursor, setPageCursor] = useState(0); // 左页页码（偶数）
  const [flipDir, setFlipDir] = useState(0); // -1=向左翻, 1=向右翻
  const prevCursorRef = useRef(0);
  const flipTimerRef = useRef(null);
  const [bookGeom, setBookGeom] = useState({ gap: 44, pageW: 0, pageH: 0 });
  const mobileTapRef = useRef({
    active: false,
    moved: false,
    x: 0,
    y: 0,
    t: 0,
  });
  const mobileHintCheckedRef = useRef(false);

  const openMobileOverlay = () => setMobileOverlayOpen(true);
  const closeMobileOverlay = () => setMobileOverlayOpen(false);

  const openReaderDrawer = (tab) => {
    setDrawerOpen(true);
    setDrawerTab(tab);
    closeMobileOverlay();
  };

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

  const headingIdByBlockIndex = useMemo(() => {
    const m = new Map();
    toc.forEach((t) => m.set(t.blockIndex, t.id));
    return m;
  }, [toc]);

  const effectiveTitle = useMemo(() => {
    if (titleProp) return titleProp;
    if (titleFromQuery) return titleFromQuery;
    return niceFileName(file);
  }, [titleProp, titleFromQuery, file]);

  const progressKey = useMemo(
    () => `${STORAGE.progressPrefix}${file || "__no_file__"}`,
    [file]
  );
  const bookmarksKey = useMemo(
    () => `${STORAGE.bookmarksPrefix}${file || "__no_file__"}`,
    [file]
  );

  const [bookmarks, setBookmarks] = useState(() => {
    return safeJsonParse(localStorage.getItem(bookmarksKey), []);
  });

  // ========= 读取文件 =========
  const load = async (signal) => {
    if (!file) {
      setStatus("idle");
      setRaw("");
      return;
    }
    setStatus("loading");
    setErr("");
    try {
      const url = withBase(file);
      const res = await fetch(url, { signal });
      if (!res.ok) throw new Error(`读取失败：HTTP ${res.status}`);
      const buf = await res.arrayBuffer();
      const decoded = decodeSmart(buf);
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
      if (e?.name === "AbortError") return;
      setStatus("error");
      setErr(String(e?.message || e));
    }
  };

  useEffect(() => {
    const ctrl = new AbortController();
    load(ctrl.signal);
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, effectiveTitle]);

  // 保存设置
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE.settings, JSON.stringify(settings));
    } catch {
      // ignore
    }
  }, [settings]);

  // bookmarks 持久化
  useEffect(() => {
    try {
      localStorage.setItem(bookmarksKey, JSON.stringify(bookmarks));
    } catch {
      // ignore
    }
  }, [bookmarksKey, bookmarks]);

  useEffect(() => {
    const onResize = () => {
      setIsMobileViewport(window.innerWidth < 768);
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!isMobileViewport || mobileHintCheckedRef.current) return;
    mobileHintCheckedRef.current = true;
    try {
      const seen = localStorage.getItem(STORAGE.mobileOverlayHintSeen) === "1";
      if (!seen) {
        setMobileHintVisible(true);
        localStorage.setItem(STORAGE.mobileOverlayHintSeen, "1");
      }
    } catch {
      // ignore
    }
  }, [isMobileViewport]);

  useEffect(() => {
    if (!mobileHintVisible) return;
    const t = setTimeout(() => setMobileHintVisible(false), 2200);
    return () => clearTimeout(t);
  }, [mobileHintVisible]);

  useEffect(() => {
    if (!mobileOverlayOpen) return;
    setMobileHintVisible(false);
  }, [mobileOverlayOpen]);

  useEffect(() => {
    if (!isMobileViewport) {
      setMobileOverlayOpen(false);
      return;
    }
    const prevOverflow = document.body.style.overflow;
    if (mobileOverlayOpen) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [mobileOverlayOpen, isMobileViewport]);

  // ========= 单栏：计算 heading 位置（目录高亮 + 当前章）=========
  useEffect(() => {
    if (isBook) return;
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

    const t = setTimeout(recompute, 50);
    window.addEventListener("resize", recompute);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", recompute);
    };
  }, [
    toc,
    isBook,
    settings.fontSize,
    settings.lineHeight,
    settings.width,
    settings.indent,
  ]);

  // ========= 单栏：读取上次进度并跳转 =========
  useEffect(() => {
    if (isBook) return;
    const sc = scrollerRef.current;
    if (!sc) return;
    if (status !== "ok") return;

    // 如果是从双页切回来的：优先用 pending
    if (pendingPctToScrollRef.current != null) {
      const pct = clamp(pendingPctToScrollRef.current, 0, 1);
      pendingPctToScrollRef.current = null;
      const t = setTimeout(() => {
        const max = sc.scrollHeight - sc.clientHeight;
        if (max > 0) sc.scrollTop = pct * max;
      }, 80);
      return () => clearTimeout(t);
    }

    const saved = safeJsonParse(localStorage.getItem(progressKey), null);
    if (!saved) return;
    const t = setTimeout(() => {
      const max = sc.scrollHeight - sc.clientHeight;
      if (max <= 0) return;
      const y = clamp(saved.pct || 0, 0, 1) * max;
      sc.scrollTop = y;
    }, 80);
    return () => clearTimeout(t);
  }, [progressKey, status, raw, isBook]);

  // ========= 单栏：监听滚动：进度 + 当前章 + 自动保存 =========
  useEffect(() => {
    if (isBook) return;
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

        const offset = 120;
        const pos = headingPosRef.current;
        let cur = "";
        for (let i = 0; i < pos.length; i++) {
          if (pos[i].top <= sc.scrollTop + offset) cur = pos[i].id;
          else break;
        }
        if (cur && cur !== activeHeadingId) setActiveHeadingId(cur);

        try {
          localStorage.setItem(
            progressKey,
            JSON.stringify({ pct, ts: Date.now(), mode: "scroll" })
          );
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
  }, [progressKey, isBook, activeHeadingId]);

  // ========= 双页：分页（测量高度，构建 pages）=========
  useEffect(() => {
    if (!isBook) return;
    if (status !== "ok") return;

    const viewport = bookViewportRef.current;
    const measure = measureRef.current;
    if (!viewport || !measure) return;

    let cancelled = false;

    const buildPages = () => {
      if (cancelled) return;

      const vw = viewport.clientWidth;
      const vh = viewport.clientHeight;
      const gap = 44;
      const pageW = Math.max(320, Math.floor((vw - gap) / 2));
      const pageH = Math.max(240, vh);

      setBookGeom({ gap, pageW, pageH });

      // 配置测量容器
      measure.style.width = `${pageW}px`;
      measure.style.height = `${pageH}px`;
      measure.style.fontSize = `${settings.fontSize}px`;
      measure.style.lineHeight = String(settings.lineHeight);
      measure.innerHTML = "";

      const pagesLocal = [];
      const blockToPageLocal = new Array(blocks.length).fill(0);

      let cur = [];
      const flush = () => {
        if (cur.length) pagesLocal.push(cur);
        cur = [];
        measure.innerHTML = "";
      };

      const makeNode = (b, bi) => {
        const el = document.createElement(b.type === "h2" ? "h2" : "p");
        el.textContent = b.text;
        el.setAttribute("data-block-index", String(bi));
        if (b.type === "h2") {
          el.className = "mt-6 mb-4 text-xl md:text-2xl font-black";
        } else {
          el.className = `mb-5 ${settings.indent ? "mx-indent" : ""}`;
        }
        return el;
      };

      for (let bi = 0; bi < blocks.length; bi++) {
        const b = blocks[bi];
        const node = makeNode(b, bi);
        measure.appendChild(node);

        // 超出页高 -> 换页
        if (measure.scrollHeight > measure.clientHeight + 1) {
          measure.removeChild(node);

          // 如果当前页已有内容，先入页，再开新页
          if (cur.length) {
            flush();
            measure.appendChild(node);
            cur.push(bi);
          } else {
            // 极端：单个块就超过一页（很少见）
            // 这里不做复杂拆分，直接强制塞进一页（会被裁剪一点点，但不会上下滚动）
            measure.appendChild(node);
            cur.push(bi);
          }
        } else {
          cur.push(bi);
        }
      }
      flush();

      // 构建 block -> page 映射
      pagesLocal.forEach((arr, pi) => {
        arr.forEach((bi) => {
          blockToPageLocal[bi] = pi;
        });
      });

      if (cancelled) return;

      setPages(pagesLocal);
      setBlockToPage(blockToPageLocal);

      // 初始化 pageCursor：优先 pending（从单栏切过来），否则读本地存储
      const total = pagesLocal.length;
      const saved = safeJsonParse(localStorage.getItem(progressKey), null);

      let targetPct = null;
      if (pendingPctToBookRef.current != null) {
        targetPct = clamp(pendingPctToBookRef.current, 0, 1);
        pendingPctToBookRef.current = null;
      } else if (saved && typeof saved.pct === "number") {
        targetPct = clamp(saved.pct, 0, 1);
      } else {
        targetPct = 0;
      }

      const targetPage = total > 1 ? Math.round(targetPct * (total - 1)) : 0;
      setPageCursor(evenize(clamp(targetPage, 0, Math.max(0, total - 1))));
    };

    // 用 RAF + 小延迟，确保布局稳定
    const t = setTimeout(() => requestAnimationFrame(buildPages), 60);

    const onResize = () => {
      clearTimeout(t);
      requestAnimationFrame(buildPages);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelled = true;
      clearTimeout(t);
      window.removeEventListener("resize", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isBook,
    status,
    raw,
    blocks.length,
    settings.fontSize,
    settings.lineHeight,
    settings.width,
    settings.indent,
    progressKey,
  ]);

  // ========= 双页：根据 pageCursor 更新进度 / 当前章 / 保存 =========
  useEffect(() => {
    if (!isBook) return;
    const total = pages.length;
    const maxIdx = Math.max(0, total - 1);
    const cur = evenize(clamp(pageCursor, 0, maxIdx));
    if (cur !== pageCursor) setPageCursor(cur);

    const pct = total > 1 ? cur / maxIdx : 0;
    setProgress(pct);

    // 当前章：找出 <= 当前页的最后一个章节
    if (blockToPage && blockToPage.length) {
      let curH = "";
      for (let i = 0; i < toc.length; i++) {
        const pi = blockToPage[toc[i].blockIndex] ?? 0;
        if (pi <= cur) curH = toc[i].id;
        else break;
      }
      if (curH && curH !== activeHeadingId) setActiveHeadingId(curH);
    }

    try {
      localStorage.setItem(
        progressKey,
        JSON.stringify({ pct, ts: Date.now(), mode: "book", page: cur })
      );
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBook, pageCursor, pages.length, blockToPage, toc, progressKey]);

  // ========= 双页：翻页动效（不再 remount，去掉“抖一下”）=========
useEffect(() => {
  if (!isBook) {
    prevCursorRef.current = pageCursor;
    return;
  }
  const prev = prevCursorRef.current;
  if (prev === pageCursor) return;

  const dir = pageCursor > prev ? 1 : -1;

  // 先清空再下一帧加上，确保连续快速翻页也能重新触发动画
  setFlipDir(0);
  requestAnimationFrame(() => setFlipDir(dir));

  prevCursorRef.current = pageCursor;

  if (flipTimerRef.current) clearTimeout(flipTimerRef.current);
  flipTimerRef.current = setTimeout(() => setFlipDir(0), 220);

  return () => {
    if (flipTimerRef.current) clearTimeout(flipTimerRef.current);
  };
}, [isBook, pageCursor]);


  // ========= 键盘：ESC 关闭抽屉；双页 ← → 翻页 =========
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setDrawerOpen(false);
        closeMobileOverlay();
      }

      // 快捷打开搜索
      if (e.key === "/" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setDrawerOpen(true);
        setDrawerTab("search");
        closeMobileOverlay();
      }

      if (!isBook) return;

      // 双页翻页（不影响输入框）
      const tag = (e.target?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea") return;

      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        setPageCursor((p) => {
          const max = Math.max(0, pages.length - 1);
          return evenize(clamp(p + 2, 0, max));
        });
      }
      if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        setPageCursor((p) => {
          const max = Math.max(0, pages.length - 1);
          return evenize(clamp(p - 2, 0, max));
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isBook, pages.length]);

  useEffect(() => {
    if (drawerOpen) closeMobileOverlay();
  }, [drawerOpen]);

  // ========= 通用跳转 =========
  const jumpToPctScroll = (pct) => {
    const sc = scrollerRef.current;
    if (!sc) return;
    const max = sc.scrollHeight - sc.clientHeight;
    sc.scrollTo({ top: clamp(pct, 0, 1) * Math.max(0, max), behavior: "smooth" });
  };

  const jumpToPctBook = (pct) => {
    const total = pages.length;
    const maxIdx = Math.max(0, total - 1);
    const target = total > 1 ? Math.round(clamp(pct, 0, 1) * maxIdx) : 0;
    setPageCursor(evenize(clamp(target, 0, maxIdx)));
  };

  const jumpToId = (id) => {
    if (!id) return;
    closeMobileOverlay();
    if (!isBook) {
      const sc = scrollerRef.current;
      if (!sc) return;
      const el = document.getElementById(id);
      if (!el) return;
      sc.scrollTo({ top: el.offsetTop - 18, behavior: "smooth" });
      return;
    }
    const t = toc.find((x) => x.id === id);
    if (!t) return;
    const pi = blockToPage?.[t.blockIndex] ?? 0;
    const maxIdx = Math.max(0, pages.length - 1);
    setPageCursor(evenize(clamp(pi, 0, maxIdx)));
  };

  const jumpToBlockIndex = (blockIndex) => {
    closeMobileOverlay();
    if (!isBook) {
      const sc = scrollerRef.current;
      if (!sc) return;
      const el = sc.querySelector(`[data-block-index="${blockIndex}"]`);
      if (!el) return;
      sc.scrollTo({ top: el.offsetTop - 18, behavior: "smooth" });
      return;
    }
    const pi = blockToPage?.[blockIndex] ?? 0;
    const maxIdx = Math.max(0, pages.length - 1);
    setPageCursor(evenize(clamp(pi, 0, maxIdx)));
  };

  const jumpToPct = (pct) => {
    closeMobileOverlay();
    if (isBook) jumpToPctBook(pct);
    else jumpToPctScroll(pct);
  };

  // ========= UI：主题/宽度 =========
  const themeStyle = useMemo(() => {
    if (settings.theme === "night") {
      return {
        background:
          "radial-gradient(1200px 700px at 20% 10%, rgba(255, 166, 195, 0.12) 0%, rgba(255,255,255,0) 60%), radial-gradient(900px 600px at 80% 20%, rgba(186, 225, 255, 0.10) 0%, rgba(255,255,255,0) 55%), linear-gradient(180deg, #1A1416 0%, #120E10 100%)",
        color: "#F8E9EE",
      };
    }
    return {
      background:
        "radial-gradient(1200px 700px at 20% 10%, rgba(255, 181, 206, 0.38) 0%, rgba(255,255,255,0) 60%), radial-gradient(900px 600px at 80% 25%, rgba(199, 228, 255, 0.22) 0%, rgba(255,255,255,0) 55%), linear-gradient(180deg, #FFF4F7 0%, #FFF8FB 55%, #FFFDFE 100%)",
      color: "#6A3A44",
    };
  }, [settings.theme]);

  const widthClass = useMemo(() => {
    if (settings.width === "compact") return "max-w-4xl";
    if (settings.width === "wide") return "max-w-6xl";
    return "max-w-none";
  }, [settings.width]);

  // ========= 书签 =========
  const addBookmark = () => {
    const pct = isBook
      ? (pages.length > 1 ? pageCursor / Math.max(1, pages.length - 1) : 0)
      : (() => {
          const sc = scrollerRef.current;
          if (!sc) return 0;
          const max = sc.scrollHeight - sc.clientHeight;
          return max > 0 ? sc.scrollTop / max : 0;
        })();

    const curId = activeHeadingId || toc[0]?.id || "";
    const curTitle = (toc.find((t) => t.id === curId)?.text || "").trim();

    const item = {
      id: `bm_${Date.now()}`,
      pct,
      headingId: curId,
      title: curTitle || "书签",
      ts: Date.now(),
    };
    setBookmarks((prev) => [item, ...prev]);
    try {
      navigator.vibrate?.(15);
    } catch {
      // ignore
    }
  };

  // ========= 返回 / 下载 =========
  const goBack = () => {
    if (typeof onBack === "function") {
      onBack();
      return;
    }
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

  // ========= 搜索 =========
  const searchResults = useMemo(() => {
    const q = searchQ.trim();
    if (!q) return [];
    const lowerQ = q.toLowerCase();
    const out = [];
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      const text = String(b.text || "");
      const lower = text.toLowerCase();
      if (lower.includes(lowerQ)) {
        const idx = lower.indexOf(lowerQ);
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

  // ========= 双页翻页 =========
  const canPrev = isBook ? pageCursor > 0 : false;
  const canNext = isBook ? pageCursor + 2 <= Math.max(0, pages.length - 1) : false;

  const prevSpread = () => {
    if (!isBook) return;
    setPageCursor((p) => {
      const max = Math.max(0, pages.length - 1);
      return evenize(clamp(p - 2, 0, max));
    });
  };

  const nextSpread = () => {
    if (!isBook) return;
    setPageCursor((p) => {
      const max = Math.max(0, pages.length - 1);
      return evenize(clamp(p + 2, 0, max));
    });
  };

  // ========= 切换单双栏：保持进度 =========
  const toggleColumns = () => {
    if (!isBook) {
      const sc = scrollerRef.current;
      const max = sc ? sc.scrollHeight - sc.clientHeight : 0;
      const pct = max > 0 ? sc.scrollTop / max : progress;
      pendingPctToBookRef.current = clamp(pct, 0, 1);
      setSettings((s) => ({ ...s, columns: 2 }));
      return;
    }
    const pct = pages.length > 1 ? pageCursor / Math.max(1, pages.length - 1) : 0;
    pendingPctToScrollRef.current = clamp(pct, 0, 1);
    setSettings((s) => ({ ...s, columns: 1, width: "fill" }));
  };

  const isInteractiveTarget = (target) => {
    if (!(target instanceof Element)) return false;
    return Boolean(
      target.closest(
        'button,a,input,textarea,select,label,[role="button"],[data-reader-no-toggle="true"]'
      )
    );
  };

  const resetMobileTap = () => {
    mobileTapRef.current = {
      active: false,
      moved: false,
      x: 0,
      y: 0,
      t: 0,
    };
  };

  const handleMobileTouchStart = (e) => {
    if (!isMobileViewport || drawerOpen || mobileOverlayOpen) return;
    const touch = e.touches?.[0];
    if (!touch) return;
    mobileTapRef.current = {
      active: true,
      moved: false,
      x: touch.clientX,
      y: touch.clientY,
      t: Date.now(),
    };
  };

  const handleMobileTouchMove = (e) => {
    const tap = mobileTapRef.current;
    if (!tap.active) return;
    const touch = e.touches?.[0];
    if (!touch) return;
    if (Math.abs(touch.clientX - tap.x) > 10 || Math.abs(touch.clientY - tap.y) > 10) {
      tap.moved = true;
    }
  };

  const handleMobileTouchEnd = (e) => {
    if (!isMobileViewport || drawerOpen) return;
    const tap = mobileTapRef.current;
    const wasActive = tap.active;
    const wasMoved = tap.moved;
    const startTs = tap.t;
    const isPureTap = wasActive && !wasMoved && Date.now() - startTs <= 320;
    resetMobileTap();
    if (!isPureTap) return;
    if (isInteractiveTarget(e.target)) return;
    if (mobileOverlayOpen) closeMobileOverlay();
    else openMobileOverlay();
  };

  const handleMobileTouchCancel = () => {
    resetMobileTap();
  };

  // ========= 渲染：块 =========
  const renderBlock = (b, bi, keyPrefix) => {
    if (b.type === "h2") {
      const hid = headingIdByBlockIndex.get(bi);
      return (
        <h2
          key={`${keyPrefix}_${bi}`}
          id={hid}
          data-block-index={bi}
          className="mt-6 mb-4 text-xl md:text-2xl font-black"
        >
          {b.text}
        </h2>
      );
    }
    return (
      <p
        key={`${keyPrefix}_${bi}`}
        data-block-index={bi}
        className={`mb-5 ${settings.indent ? "mx-indent" : ""}`}
      >
        {b.text}
      </p>
    );
  };

  const renderPage = (pageIndex) => {
    const list = pages[pageIndex] || [];
    return list.map((bi) => renderBlock(blocks[bi], bi, `p${pageIndex}`));
  };

  const currentSpreadLabel = useMemo(() => {
    if (!isBook) return "";
    const totalPages = pages.length || 0;
    const totalSpreads = Math.max(1, Math.ceil(totalPages / 2));
    const cur = Math.floor(evenize(pageCursor) / 2) + 1;
    return `${cur}/${totalSpreads}`;
  }, [isBook, pages.length, pageCursor]);

  // ========= 主体 =========
  return (
    <div
      className="min-h-screen relative overflow-hidden selection:bg-[#FFD7E4] selection:text-[#6A3A44]"
      style={themeStyle}
    >
      {/* 顶部进度条 */}
      <div className={`fixed top-0 right-0 h-[3px] z-50 transition-[left] ${infoMode ? 'left-[260px]' : 'left-0'}`}>
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

      <div
        className={`relative z-10 ${infoMode ? 'flex' : ''}`}
        onTouchStart={handleMobileTouchStart}
        onTouchMove={handleMobileTouchMove}
        onTouchEnd={handleMobileTouchEnd}
        onTouchCancel={handleMobileTouchCancel}
      >
        {/* 信息面板（封面 + 简介 + 永久目录） */}
        {infoMode ? (
          <aside
            className="w-[260px] shrink-0 h-screen overflow-y-auto hidden lg:flex flex-col mx-reader-scrollbar"
            style={{
              background: settings.theme === "night"
                ? "linear-gradient(180deg, rgba(26,20,22,0.96), rgba(18,14,16,0.96))"
                : "linear-gradient(180deg, rgba(255,244,247,0.96), rgba(255,248,251,0.96))",
              borderRight: settings.theme === "night"
                ? "1px solid rgba(255,170,200,0.12)"
                : "1px solid rgba(255,200,220,0.35)",
              backdropFilter: "blur(20px)",
            }}
          >
            <div className="p-5 flex-1 flex flex-col min-h-0">
              {/* 封面 */}
              {meta?.cover ? (
                <div className="w-full aspect-[3/4] rounded-2xl overflow-hidden border border-white/20 shadow-sm mb-4 shrink-0">
                  <img
                    src={withBase(meta.cover)}
                    alt={effectiveTitle}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div
                  className="w-full aspect-[3/4] rounded-2xl flex items-center justify-center mb-4 shrink-0"
                  style={{
                    background: settings.theme === "night" ? "rgba(255,170,200,0.08)" : "rgba(255,170,200,0.12)",
                    border: settings.theme === "night" ? "1px solid rgba(255,170,200,0.15)" : "1px solid rgba(255,200,220,0.35)",
                  }}
                >
                  <BookOpen size={40} style={{ color: settings.theme === "night" ? "rgba(248,233,238,0.35)" : "rgba(106,58,68,0.25)" }} />
                </div>
              )}

              {/* 书名 */}
              <h2
                className="text-lg font-black leading-tight shrink-0"
                style={{ color: settings.theme === "night" ? "#F8E9EE" : "#6A3A44" }}
              >
                {effectiveTitle}
              </h2>

              {/* 简介 */}
              {meta?.desc ? (
                <p
                  className="mt-3 text-xs leading-relaxed font-semibold shrink-0"
                  style={{ color: settings.theme === "night" ? "rgba(248,233,238,0.6)" : "rgba(106,58,68,0.6)" }}
                >
                  {meta.desc}
                </p>
              ) : null}

              {/* 分隔线 */}
              <div
                className="mt-5 mb-4 h-[1px] w-full shrink-0"
                style={{ background: settings.theme === "night" ? "rgba(255,170,200,0.15)" : "rgba(255,200,220,0.35)" }}
              />

              {/* 目录标题 */}
              <div
                className="text-xs font-black tracking-widest mb-3 shrink-0"
                style={{ color: settings.theme === "night" ? "rgba(248,233,238,0.45)" : "rgba(106,58,68,0.45)" }}
              >
                目录 · CHAPTERS
              </div>

              {/* 章节列表 */}
              <div className="flex-1 overflow-y-auto space-y-1 min-h-0 mx-reader-scrollbar">
                {toc.length > 0 ? (
                  toc.map((h) => (
                    <button
                      key={h.id}
                      onClick={() => jumpToId(h.id)}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition truncate"
                      style={{
                        color: activeHeadingId === h.id
                          ? (settings.theme === "night" ? "#FFB4D6" : "#FF7EA9")
                          : (settings.theme === "night" ? "rgba(248,233,238,0.7)" : "rgba(106,58,68,0.65)"),
                        background: activeHeadingId === h.id
                          ? (settings.theme === "night" ? "rgba(255,170,200,0.1)" : "rgba(255,170,200,0.1)")
                          : "transparent",
                      }}
                      title={h.text}
                    >
                      {h.text}
                    </button>
                  ))
                ) : (
                  <div
                    className="text-xs font-semibold"
                    style={{ color: settings.theme === "night" ? "rgba(248,233,238,0.35)" : "rgba(106,58,68,0.35)" }}
                  >
                    暂未检测到章节标题
                  </div>
                )}
              </div>
            </div>
          </aside>
        ) : null}

        <div className={`${infoMode ? "flex-1 min-w-0 lg:overflow-y-auto lg:h-screen" : ""} px-4 md:px-6 lg:px-8 py-4 md:py-6`}>
        {isMobileViewport && mobileHintVisible && !mobileOverlayOpen ? (
          <div className="reader-mobile-overlay-hint md:hidden" data-night={settings.theme === "night" ? "true" : undefined}>
            单点屏幕唤起菜单
          </div>
        ) : null}

        {mobileOverlayOpen ? (
          <div
            className="reader-mobile-overlay md:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="阅读菜单"
          >
            <button
              type="button"
              className="reader-mobile-overlay-scrim"
              data-night={settings.theme === "night" ? "true" : undefined}
              onClick={closeMobileOverlay}
              aria-label="关闭阅读菜单"
            />

            <aside
              className="reader-mobile-overlay-sidebar"
              data-night={settings.theme === "night" ? "true" : undefined}
              data-reader-no-toggle="true"
            >
              <div className="reader-mobile-overlay-header">
                <button
                  onClick={goBack}
                  className="ripple-button reader-chip inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-black shrink-0"
                  style={{ color: settings.theme === "night" ? "#F8E9EE" : "#6A3A44" }}
                  title="返回"
                >
                  <ArrowLeft size={16} />
                  返回
                </button>

                <div
                  className="reader-mobile-overlay-title"
                  style={{ color: settings.theme === "night" ? "#F8E9EE" : "#6A3A44" }}
                >
                  <div className="font-black truncate" title={effectiveTitle}>
                    {effectiveTitle}
                  </div>
                  <div className="text-[11px] opacity-70 truncate">
                    {toc.length ? `${toc.length} 章` : "暂无章节"}
                  </div>
                </div>

                <button
                  type="button"
                  className="ripple-button reader-chip inline-flex items-center justify-center w-10 h-10 rounded-full shrink-0"
                  style={{ color: settings.theme === "night" ? "#F8E9EE" : "#6A3A44" }}
                  onClick={closeMobileOverlay}
                  aria-label="关闭菜单"
                  title="关闭菜单"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="reader-mobile-overlay-toc mx-reader-scrollbar">
                {toc.length ? (
                  toc.map((h) => (
                    <button
                      key={h.id}
                      onClick={() => jumpToId(h.id)}
                      className="w-full text-left rounded-xl px-3 py-2 text-xs font-semibold transition truncate"
                      style={{
                        color:
                          activeHeadingId === h.id
                            ? (settings.theme === "night" ? "#FFB4D6" : "#FF7EA9")
                            : (settings.theme === "night"
                                ? "rgba(248,233,238,0.85)"
                                : "rgba(106,58,68,0.78)"),
                        background:
                          activeHeadingId === h.id
                            ? (settings.theme === "night"
                                ? "rgba(255,170,200,0.14)"
                                : "rgba(255,170,200,0.16)")
                            : "transparent",
                      }}
                      title={h.text}
                    >
                      {h.text}
                    </button>
                  ))
                ) : (
                  <div className="text-xs font-semibold opacity-75 px-3 py-2">
                    暂未检测到章节标题
                  </div>
                )}
              </div>
            </aside>

            <div
              className="reader-mobile-overlay-tools"
              data-night={settings.theme === "night" ? "true" : undefined}
              data-reader-no-toggle="true"
            >
              <div className="reader-mobile-overlay-grid reader-mobile-overlay-grid--3">
                <button
                  onClick={() => openReaderDrawer("search")}
                  className="ripple-button reader-chip inline-flex items-center justify-center gap-2 px-3 py-2 rounded-full text-sm font-black"
                  style={{ color: settings.theme === "night" ? "#F8E9EE" : "#6A3A44" }}
                  title="搜索（⌘/Ctrl + /）"
                >
                  <Search size={16} />
                  搜索
                </button>

                <button
                  onClick={() => openReaderDrawer("bookmarks")}
                  className="ripple-button reader-chip inline-flex items-center justify-center gap-2 px-3 py-2 rounded-full text-sm font-black"
                  style={{ color: settings.theme === "night" ? "#F8E9EE" : "#6A3A44" }}
                  title="书签"
                >
                  <Bookmark size={16} />
                  书签
                </button>

                <button
                  onClick={addBookmark}
                  className="ripple-button inline-flex items-center justify-center gap-2 px-3 py-2 rounded-full text-sm font-black"
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
                  title="加入书签"
                >
                  <Bookmark size={16} />
                  <span>+</span>
                </button>
              </div>

              <div className="reader-mobile-overlay-grid reader-mobile-overlay-grid--3">
                <button
                  onClick={() =>
                    setSettings((s) => ({
                      ...s,
                      theme: s.theme === "night" ? "milk" : "night",
                    }))
                  }
                  className="ripple-button reader-chip inline-flex items-center justify-center gap-2 px-3 py-2 rounded-full text-sm font-black"
                  style={{ color: settings.theme === "night" ? "#F8E9EE" : "#6A3A44" }}
                  title={settings.theme === "night" ? "切回日间" : "切换夜间"}
                >
                  {settings.theme === "night" ? <Sun size={16} /> : <Moon size={16} />}
                  {settings.theme === "night" ? "日间" : "夜间"}
                </button>

                <button
                  onClick={downloadTxt}
                  className="ripple-button reader-chip inline-flex items-center justify-center gap-2 px-3 py-2 rounded-full text-sm font-black"
                  style={{ color: settings.theme === "night" ? "#F8E9EE" : "#6A3A44" }}
                  title="下载 TXT"
                >
                  <Download size={16} />
                  下载
                </button>

                <div
                  className="reader-chip inline-flex items-center justify-center gap-2 px-3 py-2 rounded-full text-xs font-black"
                  style={{ color: settings.theme === "night" ? "#F8E9EE" : "#6A3A44" }}
                  title="时间"
                >
                  <span className="opacity-70">{formatTime(Date.now())}</span>
                </div>
              </div>

              <div className="reader-mobile-overlay-grid reader-mobile-overlay-grid--2">
                <div
                  className="reader-chip inline-flex items-center justify-center gap-2 px-2 py-2 rounded-full text-xs font-black"
                  style={{ color: settings.theme === "night" ? "#F8E9EE" : "#6A3A44" }}
                  title="字号"
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

                <div
                  className="reader-chip inline-flex items-center gap-2 px-3 py-2 rounded-full text-xs font-black"
                  style={{ color: settings.theme === "night" ? "#F8E9EE" : "#6A3A44" }}
                  title="行距"
                >
                  <span>行距</span>
                  <input
                    type="range"
                    min="1.4"
                    max="2.6"
                    step="0.05"
                    value={settings.lineHeight}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        lineHeight: Number(e.target.value),
                      }))
                    }
                    className="w-full min-w-0"
                  />
                  <span className="font-mono opacity-70">
                    {Number(settings.lineHeight).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="reader-mobile-overlay-grid reader-mobile-overlay-grid--3">
                <button
                  onClick={() => setSettings((s) => ({ ...s, indent: !s.indent }))}
                  className="ripple-button reader-chip inline-flex items-center justify-center gap-2 px-3 py-2 rounded-full text-xs font-black"
                  style={{ color: settings.theme === "night" ? "#F8E9EE" : "#6A3A44" }}
                  title="首行缩进"
                >
                  缩进：{settings.indent ? "开" : "关"}
                </button>

                <button
                  onClick={toggleColumns}
                  className="ripple-button reader-chip inline-flex items-center justify-center gap-2 px-3 py-2 rounded-full text-xs font-black"
                  style={{ color: settings.theme === "night" ? "#F8E9EE" : "#6A3A44" }}
                  title="单双栏"
                >
                  {isBook ? "双页" : "单栏"}
                </button>

                <button
                  onClick={() => {
                    if (!isBook) return;
                    setSettings((s) => ({
                      ...s,
                      width:
                        s.width === "fill"
                          ? "wide"
                          : s.width === "wide"
                          ? "compact"
                          : "fill",
                    }));
                  }}
                  className={`ripple-button reader-chip inline-flex items-center justify-center gap-2 px-3 py-2 rounded-full text-xs font-black ${!isBook ? "opacity-60 cursor-not-allowed" : ""}`}
                  style={{ color: settings.theme === "night" ? "#F8E9EE" : "#6A3A44" }}
                  title="宽度"
                  disabled={!isBook}
                >
                  宽度：{isBook ? settings.width : "fill"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* 工具栏 */}
        <div className="hidden md:block sticky top-4 z-30">
          <div className="reader-toolbar rounded-[22px]">
            <div className="px-3 py-3 md:px-4 md:py-3">
              <div className="flex flex-col gap-2">
                {/* Row 1 */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      onClick={goBack}
                      className="ripple-button reader-chip inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-black"
                      style={{ color: settings.theme === "night" ? "#F8E9EE" : "#6A3A44" }}
                      title="返回"
                    >
                      <ArrowLeft size={18} />
                      返回
                    </button>

                    {meta ? (
                      <button
                        onClick={() => setShowInfoPanel((v) => !v)}
                        className="ripple-button reader-chip inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-black hidden lg:inline-flex"
                        style={{ color: settings.theme === "night" ? "#F8E9EE" : "#6A3A44" }}
                        title={showInfoPanel ? "隐藏信息面板" : "显示信息面板"}
                      >
                        <BookOpen size={16} />
                        {showInfoPanel ? "隐藏面板" : "显示面板"}
                      </button>
                    ) : null}

                    <div className="min-w-0">
                      <div
                        className="truncate text-base md:text-lg font-black reader-title-glow"
                        style={{ color: settings.theme === "night" ? "#F8E9EE" : "#6A3A44" }}
                        title={effectiveTitle}
                      >
                        {effectiveTitle}
                      </div>
                      <div
                        className="text-xs font-semibold opacity-80 truncate"
                        style={{
                          color:
                            settings.theme === "night"
                              ? "rgba(248,233,238,0.75)"
                              : "rgba(106,58,68,0.65)",
                        }}
                      >
                        {file ? `文件：public/${file}（编码：${encoding}）` : "请从小说列表打开"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <button
                      onClick={() => openReaderDrawer("toc")}
                      className="ripple-button reader-chip inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-black"
                      style={{ color: settings.theme === "night" ? "#F8E9EE" : "#6A3A44" }}
                      title="目录"
                    >
                      <List size={18} />
                      目录
                    </button>

                    <button
                      onClick={() => openReaderDrawer("search")}
                      className="ripple-button reader-chip inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-black"
                      style={{ color: settings.theme === "night" ? "#F8E9EE" : "#6A3A44" }}
                      title="搜索（⌘/Ctrl + /）"
                    >
                      <Search size={18} />
                      搜索
                    </button>

                    <button
                      onClick={() => openReaderDrawer("bookmarks")}
                      className="ripple-button reader-chip inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-black"
                      style={{ color: settings.theme === "night" ? "#F8E9EE" : "#6A3A44" }}
                      title="书签"
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
                      title="加入书签"
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
                      title={settings.theme === "night" ? "切回日间" : "切换夜间"}
                    >
                      {settings.theme === "night" ? <Sun size={18} /> : <Moon size={18} />}
                      {settings.theme === "night" ? "日间" : "夜间"}
                    </button>

                    <button
                      onClick={downloadTxt}
                      className="ripple-button reader-chip inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-black"
                      style={{ color: settings.theme === "night" ? "#F8E9EE" : "#6A3A44" }}
                      title="下载 TXT"
                    >
                      <Download size={18} />
                      下载
                    </button>
                  </div>
                </div>

                {/* Row 2：排版 */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div
                      className="reader-chip inline-flex items-center gap-1 px-2 py-2 rounded-full"
                      style={{ color: settings.theme === "night" ? "#F8E9EE" : "#6A3A44" }}
                      title="字号"
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

                    <div
                      className="reader-chip inline-flex items-center gap-2 px-3 py-2 rounded-full text-xs font-black"
                      style={{ color: settings.theme === "night" ? "#F8E9EE" : "#6A3A44" }}
                      title="行距"
                    >
                      <span>行距</span>
                      <input
                        type="range"
                        min="1.4"
                        max="2.6"
                        step="0.05"
                        value={settings.lineHeight}
                        onChange={(e) =>
                          setSettings((s) => ({
                            ...s,
                            lineHeight: Number(e.target.value),
                          }))
                        }
                        className="w-28"
                      />
                      <span className="font-mono opacity-70">
                        {Number(settings.lineHeight).toFixed(2)}
                      </span>
                    </div>

                    <button
                      onClick={() => setSettings((s) => ({ ...s, indent: !s.indent }))}
                      className="ripple-button reader-chip inline-flex items-center gap-2 px-3 py-2 rounded-full text-xs font-black"
                      style={{ color: settings.theme === "night" ? "#F8E9EE" : "#6A3A44" }}
                      title="首行缩进"
                    >
                      缩进：{settings.indent ? "开" : "关"}
                    </button>

                    <button
                      onClick={toggleColumns}
                      className="ripple-button reader-chip inline-flex items-center gap-2 px-3 py-2 rounded-full text-xs font-black"
                      style={{ color: settings.theme === "night" ? "#F8E9EE" : "#6A3A44" }}
                      title="单双栏"
                    >
                      {isBook ? "双页" : "单栏"}
                    </button>

                    {isBook ? (
                      <div
                        className="reader-chip inline-flex items-center gap-2 px-2 py-2 rounded-full text-xs font-black"
                        style={{ color: settings.theme === "night" ? "#F8E9EE" : "#6A3A44" }}
                        title="左右翻页（← → / 空格）"
                      >
                        <button
                          onClick={prevSpread}
                          disabled={!canPrev}
                          className="ripple-button px-2 py-1 rounded-full font-black disabled:opacity-40"
                          title="上一跨页"
                        >
                          <ChevronLeft size={18} />
                        </button>
                        <span className="px-1 opacity-80">跨页</span>
                        <span className="font-mono">{currentSpreadLabel}</span>
                        <button
                          onClick={nextSpread}
                          disabled={!canNext}
                          className="ripple-button px-2 py-1 rounded-full font-black disabled:opacity-40"
                          title="下一跨页"
                        >
                          <ChevronRight size={18} />
                        </button>
                      </div>
                    ) : null}

                    <button
                      onClick={() => {
                        if (!isBook) return;
                        setSettings((s) => ({
                          ...s,
                          width:
                            s.width === "fill"
                              ? "wide"
                              : s.width === "wide"
                              ? "compact"
                              : "fill",
                        }));
                      }}
                      className={`ripple-button reader-chip inline-flex items-center gap-2 px-3 py-2 rounded-full text-xs font-black ${!isBook ? "opacity-60 cursor-not-allowed" : ""}`}
                      style={{ color: settings.theme === "night" ? "#F8E9EE" : "#6A3A44" }}
                      title="宽度"
                      disabled={!isBook}
                    >
                      宽度：{isBook ? settings.width : "fill"}
                    </button>
                  </div>

                  <div
                    className="reader-chip inline-flex items-center gap-2 px-3 py-2 rounded-full text-xs font-black"
                    style={{ color: settings.theme === "night" ? "#F8E9EE" : "#6A3A44" }}
                    title="时间"
                  >
                    <span className="opacity-70">{formatTime(Date.now())}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 内容区 */}
        <div
          className="mt-4"
        >
          <div className={`reader-paper rounded-[26px] overflow-hidden ${widthClass}`}>
            {/* 单栏：滚动容器 */}
            {!isBook ? (
              <div
                ref={scrollerRef}
                className="max-h-none md:max-h-[calc(100vh-210px)] overflow-auto px-5 py-6 md:px-8 md:py-8 mx-reader-scrollbar"
                style={{
                  fontSize: `${settings.fontSize}px`,
                  lineHeight: settings.lineHeight,
                }}
              >
                {status === "loading" ? (
                  <div className="text-sm font-semibold opacity-80">读取中…</div>
                ) : status === "error" ? (
                  <div className="space-y-3">
                    <div className="font-black">读取失败</div>
                    <div className="text-sm opacity-80 whitespace-pre-wrap">{err}</div>
                    <button
                      onClick={() => {
                        const ctrl = new AbortController();
                        load(ctrl.signal);
                      }}
                      className="ripple-button reader-chip inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-black"
                      style={{ color: settings.theme === "night" ? "#F8E9EE" : "#6A3A44" }}
                    >
                      重试
                    </button>
                  </div>
                ) : !file ? (
                  <div className="text-sm font-semibold opacity-80">
                    没有找到文件路径：请从“小说”列表点「阅读」打开。
                  </div>
                ) : (
                  <div>
                    {blocks.map((b, i) => renderBlock(b, i, "scroll"))}
                  </div>
                )}
              </div>
            ) : (
              // 双页：书本模式（无纵向滚动）
              <div
                ref={bookViewportRef}
                className="reader-book-viewport px-4 md:px-5 py-5"
                style={{
                  fontSize: `${settings.fontSize}px`,
                  lineHeight: settings.lineHeight,
                }}
              >
                {status === "loading" ? (
                  <div className="text-sm font-semibold opacity-80 px-2">分页中…</div>
                ) : status === "error" ? (
                  <div className="space-y-3 px-2">
                    <div className="font-black">读取失败</div>
                    <div className="text-sm opacity-80 whitespace-pre-wrap">{err}</div>
                    <button
                      onClick={() => {
                        const ctrl = new AbortController();
                        load(ctrl.signal);
                      }}
                      className="ripple-button reader-chip inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-black"
                      style={{ color: settings.theme === "night" ? "#F8E9EE" : "#6A3A44" }}
                    >
                      重试
                    </button>
                  </div>
                ) : !file ? (
                  <div className="text-sm font-semibold opacity-80 px-2">
                    没有找到文件路径：请从“小说”列表点「阅读」打开。
                  </div>
                ) : (
                  <div
                    className={`reader-spread ${flipDir === 1 ? "turn-next" : flipDir === -1 ? "turn-prev" : ""}`}
                    style={{ gap: `${bookGeom.gap}px` }}
                  >
                    <div
                      className="reader-page"
                      data-page-label={
                        pages.length ? `${pageCursor + 1}/${pages.length}` : ""
                      }
                    >
                      <div className="reader-page-inner">{renderPage(pageCursor)}</div>
                    </div>
                    <div
                      className="reader-page"
                      data-page-label={
                        pages.length && pageCursor + 1 < pages.length
                          ? `${pageCursor + 2}/${pages.length}`
                          : ""
                      }
                    >
                      <div className="reader-page-inner">{renderPage(pageCursor + 1)}</div>
                    </div>

                    <div className="reader-crease" />

                    {/* 点击翻页热区 */}
                    <button
                      type="button"
                      className="reader-page-zone left"
                      onClick={prevSpread}
                      disabled={!canPrev}
                      aria-label="上一跨页"
                      title="上一跨页（←）"
                    />
                    <button
                      type="button"
                      className="reader-page-zone right"
                      onClick={nextSpread}
                      disabled={!canNext}
                      aria-label="下一跨页"
                      title="下一跨页（→/空格）"
                    />
                  </div>
                )}

                {/* 隐藏测量容器：用于分页（不影响布局） */}
                <div
                  ref={measureRef}
                  className="reader-measure"
                  aria-hidden="true"
                />
              </div>
            )}
          </div>
        </div>
        </div>
      </div>

      {/* Drawer */}
      {drawerOpen ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="fixed right-0 top-0 z-50 h-full w-[360px] max-w-[92vw] reader-drawer p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="font-black" style={{ color: settings.theme === "night" ? "#F8E9EE" : "#6A3A44" }}>
                工具
              </div>
              <button
                className="ripple-button reader-chip inline-flex items-center justify-center w-10 h-10 rounded-xl"
                style={{ color: settings.theme === "night" ? "#F8E9EE" : "#6A3A44" }}
                onClick={() => setDrawerOpen(false)}
                aria-label="关闭"
                title="关闭"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-3 flex items-center gap-2 flex-wrap">
              {[
                { k: "toc", t: "目录", I: List },
                { k: "bookmarks", t: "书签", I: Bookmark },
                { k: "search", t: "搜索", I: Search },
              ].map((x) => (
                <button
                  key={x.k}
                  onClick={() => setDrawerTab(x.k)}
                  className="ripple-button reader-chip inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-black"
                  style={{
                    color: settings.theme === "night" ? "#F8E9EE" : "#6A3A44",
                    outline: drawerTab === x.k ? "2px solid rgba(255, 143, 171, 0.45)" : "none",
                    outlineOffset: 0,
                  }}
                >
                  <x.I size={18} />
                  {x.t}
                </button>
              ))}
            </div>

            <div className="mt-4 h-[calc(100%-120px)] overflow-auto pr-1 mx-reader-scrollbar">
              {drawerTab === "toc" ? (
                <div className="space-y-2">
                  {toc.length ? (
                    toc.map((h) => (
                      <button
                        key={h.id}
                        className="w-full text-left rounded-2xl px-3 py-2 reader-chip hover:brightness-105 transition"
                        style={{
                          color: settings.theme === "night" ? "#F8E9EE" : "#6A3A44",
                          opacity: activeHeadingId === h.id ? 1 : 0.92,
                        }}
                        onClick={() => {
                          jumpToId(h.id);
                          setDrawerOpen(false);
                        }}
                        title={h.text}
                      >
                        <div className="font-black truncate">{h.text}</div>
                      </button>
                    ))
                  ) : (
                    <div className="text-sm font-semibold opacity-80">未检测到章节标题。</div>
                  )}
                </div>
              ) : null}

              {drawerTab === "bookmarks" ? (
                <div className="space-y-2">
                  {bookmarks.length ? (
                    bookmarks.map((b) => (
                      <div key={b.id} className="rounded-2xl p-3 reader-chip">
                        <button
                          className="w-full text-left"
                          onClick={() => {
                            jumpToPct(b.pct);
                            setDrawerOpen(false);
                          }}
                          title={b.title}
                        >
                          <div className="font-black truncate">{b.title}</div>
                          <div className="text-xs font-semibold opacity-70 mt-1">
                            {formatTime(b.ts)} · {Math.round(clamp(b.pct, 0, 1) * 100)}%
                          </div>
                        </button>
                        <div className="mt-2 flex items-center justify-end">
                          <button
                            onClick={() => setBookmarks((prev) => prev.filter((x) => x.id !== b.id))}
                            className="ripple-button reader-chip inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black"
                            style={{ color: settings.theme === "night" ? "#F8E9EE" : "#6A3A44" }}
                            title="删除"
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm font-semibold opacity-80">
                      还没有书签～ 点「＋」就能收藏当前进度。
                    </div>
                  )}
                </div>
              ) : null}

              {drawerTab === "search" ? (
                <div>
                  <div className="rounded-2xl p-3 reader-chip">
                    <div className="flex items-center gap-2">
                      <Search size={18} />
                      <input
                        value={searchQ}
                        onChange={(e) => setSearchQ(e.target.value)}
                        placeholder="输入关键词…"
                        className="w-full bg-transparent outline-none text-sm"
                        style={{ color: settings.theme === "night" ? "#F8E9EE" : "#6A3A44" }}
                      />
                      {searchQ ? (
                        <button
                          className="ripple-button reader-chip inline-flex items-center justify-center w-10 h-10 rounded-xl"
                          style={{ color: settings.theme === "night" ? "#F8E9EE" : "#6A3A44" }}
                          onClick={() => setSearchQ("")}
                          title="清空"
                        >
                          <X size={18} />
                        </button>
                      ) : null}
                    </div>
                    <div className="mt-2 text-xs font-semibold opacity-70">
                      找到 <span className="font-mono">{searchResults.length}</span> 条
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    {searchResults.map((m) => (
                      <button
                        key={m.id}
                        className="w-full text-left rounded-2xl px-3 py-2 reader-chip hover:brightness-105 transition"
                        style={{ color: settings.theme === "night" ? "#F8E9EE" : "#6A3A44" }}
                        onClick={() => {
                          jumpToBlockIndex(m.blockIndex);
                          setDrawerOpen(false);
                        }}
                      >
                        <div className="text-sm font-semibold opacity-90">{m.snippet}</div>
                      </button>
                    ))}
                    {searchResults.length === 0 && searchQ ? (
                      <div className="text-sm font-semibold opacity-80">没有找到匹配内容。</div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </aside>
        </>
      ) : null}
    </div>
  );
}
