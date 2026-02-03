import React, { useEffect, useMemo, useRef, useState } from "react";
import BacktestShell from "../../ui/BacktestShell";
import { withBase } from "../../utils/withBase";
import Toolbar from "./reader/Toolbar";
import Selector from "./reader/Selector";
import ReaderCanvas from "./reader/ReaderCanvas";

function normalizeLocalPath(p) {
  if (!p) return "";
  let s = String(p).trim();
  s = s.replace(/^\.?\//, "");
  s = s.replace(/^public\//, "");
  return s;
}

function buildPageName(num, pad, ext) {
  return `${String(num).padStart(pad, "0")}.${ext}`;
}

/** 与 SimpleListPage 一致的漫画配置解析（用于作品下拉切换） */
function getComicConfig(item) {
  const c = item?.comic;
  if (Array.isArray(c?.pages) && c.pages.length > 0) {
    return {
      mode: "pages",
      pages: c.pages.map((p) => normalizeLocalPath(p)),
    };
  }
  if (c?.manifest) {
    return {
      mode: "manifest",
      manifest: normalizeLocalPath(c.manifest),
      workId: String(c?.workId ?? c?.id ?? item?.id ?? "").trim(),
      chapter: String(c?.chapter ?? c?.chapterId ?? "").trim() || null,
    };
  }
  const dir = c?.dir ?? item?.comicDir ?? item?.pagesDir;
  const count = c?.count ?? item?.comicCount ?? item?.pageCount;
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

/** 从 config 解析出 resolvedPages + chapters（与原有逻辑一致） */
async function resolveConfig(config) {
  const {
    mode,
    pages: pagesProp,
    manifest,
    workId,
    chapter,
    dir: rawDir,
    count,
    ext = "webp",
    pad = 5,
    start = 1,
  } = config;

  const safeCount = Number.isFinite(Number(count)) ? Math.max(0, Math.floor(Number(count))) : 0;
  const safePad = Number.isFinite(Number(pad)) ? Math.max(1, Math.floor(Number(pad))) : 5;
  const safeStart = Number.isFinite(Number(start)) ? Math.max(1, Math.floor(Number(start))) : 1;
  const safeDir = normalizeLocalPath(rawDir || "").replace(/\/+$/, "");
  const safeExt = String(ext || "webp").replace(/^\./, "");

  if (Array.isArray(pagesProp) && pagesProp.length > 0) {
    const list = pagesProp.map((p) => normalizeLocalPath(p)).filter(Boolean);
    return { resolvedPages: list, chapters: [], activeChapter: "" };
  }

  if (manifest) {
    const res = await fetch(withBase(normalizeLocalPath(manifest)));
    if (!res.ok) throw new Error(`manifest 加载失败：HTTP ${res.status}`);
    const data = await res.json();
    const works = data?.works || {};
    const keys = Object.keys(works);
    if (!keys.length) throw new Error("manifest 里没有 works 数据");
    const wantedId = String(workId ?? "").trim();
    const pickedKey = wantedId && works[wantedId] ? wantedId : keys[0];
    const work = works[pickedKey];
    const rawChapters = Array.isArray(work?.chapters) ? work.chapters : [];
    if (!rawChapters.length) {
      const rawPages = Array.isArray(work?.pages) ? work.pages : [];
      if (!rawPages.length) throw new Error(`manifest 里作品 ${pickedKey} 没有 pages/chapters`);
      return {
        resolvedPages: rawPages.map((p) => normalizeLocalPath(p)).filter(Boolean),
        chapters: [],
        activeChapter: "",
      };
    }
    const chs = rawChapters
      .map((c, idx) => {
        const id = String(c?.id ?? idx).trim();
        const title = String(c?.title ?? c?.name ?? id).trim() || id;
        const pages = (Array.isArray(c?.pages) ? c.pages : []).map((p) => normalizeLocalPath(p)).filter(Boolean);
        return { id, title, pages };
      })
      .filter((c) => c.pages.length > 0);
    if (!chs.length) throw new Error(`manifest 里作品 ${pickedKey} 的 chapters 没有可用 pages`);
    const preferred = String(chapter ?? work?.defaultChapter ?? "").trim();
    const chosen = preferred ? chs.find((c) => c.id === preferred) || chs[0] : chs[0];
    return {
      resolvedPages: chosen.pages,
      chapters: chs,
      activeChapter: chosen.id,
    };
  }

  if (!safeDir || safeCount <= 0) {
    return { resolvedPages: [], chapters: [], activeChapter: "" };
  }

  const list = [];
  for (let i = 0; i < safeCount; i += 1) {
    const num = safeStart + i;
    list.push(normalizeLocalPath(`${safeDir}/${buildPageName(num, safePad, safeExt)}`));
  }
  return { resolvedPages: list, chapters: [], activeChapter: "" };
}

const DISPLAY_MODE_KEY = "comic-reader-display-mode";

function getStoredDisplayMode() {
  try {
    const v = localStorage.getItem(DISPLAY_MODE_KEY);
    if (v === "standard" || v === "immersive") return v;
  } catch {
    // ignore
  }
  return "standard";
}

export default function ComicsReaderPage({
  title = "漫画",
  mode = "auto",
  pages: pagesProp,
  manifest,
  workId: propsWorkId,
  chapter,
  dir = "",
  count = 0,
  ext = "webp",
  pad = 5,
  start = 1,
  onBack,
}) {
  const [works, setWorks] = useState([]);
  const [selectedWorkId, setSelectedWorkId] = useState(propsWorkId ?? "");
  const [loadState, setLoadState] = useState("loading");
  const [errMsg, setErrMsg] = useState("");
  const [resolvedPages, setResolvedPages] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [activeChapter, setActiveChapter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [readMode, setReadMode] = useState("scroll");
  const [singleOrDouble, setSingleOrDouble] = useState("single");
  const [scale, setScale] = useState(1);
  const [brightness, setBrightness] = useState("default");
  const [displayMode, setDisplayMode] = useState(getStoredDisplayMode);
  const canvasRef = useRef(null);
  const worksInitializedRef = useRef(false);

  // 作品列表：fetch public/Comics/index.json
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(withBase("Comics/index.json"));
        if (!res.ok) return;
        const data = await res.json();
        if (!Array.isArray(data)) return;
        if (!cancelled) setWorks(data);
      } catch {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // 仅首次加载 works 时设置选中：props.workId 或列表第一项，不覆盖用户后续在下拉中的选择
  useEffect(() => {
    if (works.length === 0 || worksInitializedRef.current) return;
    worksInitializedRef.current = true;
    if (propsWorkId && works.some((w) => w.id === propsWorkId)) {
      setSelectedWorkId(propsWorkId);
    } else {
      setSelectedWorkId(works[0].id);
    }
  }, [works, propsWorkId]);

  // 当前选中的作品配置（用于解析页数）
  const activeConfig = useMemo(() => {
    const work = works.find((w) => w.id === selectedWorkId);
    if (work) {
      const cfg = getComicConfig(work);
      if (cfg) return { title: work.title || work.id, ...cfg };
    }
    return {
      title,
      mode,
      pages: pagesProp,
      manifest,
      workId: propsWorkId,
      chapter,
      dir,
      count,
      ext,
      pad,
      start,
    };
  }, [works, selectedWorkId, title, mode, pagesProp, manifest, propsWorkId, chapter, dir, count, ext, pad, start]);

  // 根据 activeConfig 解析 resolvedPages + chapters
  useEffect(() => {
    let cancelled = false;
    setLoadState("loading");
    setErrMsg("");
    resolveConfig(activeConfig)
      .then(({ resolvedPages: list, chapters: chs, activeChapter: ch }) => {
        if (!cancelled) {
          setResolvedPages(list);
          setChapters(chs);
          setActiveChapter(chs.length ? ch : "");
          setCurrentPage(1);
          setLoadState("ok");
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setResolvedPages([]);
          setChapters([]);
          setActiveChapter("");
          setLoadState("error");
          setErrMsg(String(e?.message ?? e));
        }
      });
    return () => { cancelled = true; };
  }, [activeConfig]);

  // 切换章节：更新 resolvedPages
  useEffect(() => {
    if (!chapters.length || !activeChapter) return;
    const ch = chapters.find((c) => c.id === activeChapter);
    if (!ch) return;
    setResolvedPages(ch.pages);
    setCurrentPage(1);
  }, [activeChapter]);

  const pages = useMemo(
    () =>
      (resolvedPages || []).map((rel, idx) => ({
        i: idx,
        rel: normalizeLocalPath(rel),
        url: withBase(normalizeLocalPath(rel)),
      })),
    [resolvedPages]
  );

  const total = pages.length;
  const currentWork = works.find((w) => w.id === selectedWorkId);
  const currentChapter = chapters.find((c) => c.id === activeChapter);

  const goPrevPage = () => {
    if (currentPage <= 1) return;
    const next = currentPage - 1;
    setCurrentPage(next);
    canvasRef.current?.scrollToPage?.(next);
  };
  const goNextPage = () => {
    if (currentPage >= total) return;
    const next = currentPage + 1;
    setCurrentPage(next);
    canvasRef.current?.scrollToPage?.(next);
  };

  const chapterIndex = chapters.findIndex((c) => c.id === activeChapter);
  const hasPrevChapter = chapterIndex > 0;
  const hasNextChapter = chapterIndex >= 0 && chapterIndex < chapters.length - 1;
  const goPrevChapter = () => {
    if (!hasPrevChapter) return;
    setActiveChapter(chapters[chapterIndex - 1].id);
  };
  const goNextChapter = () => {
    if (!hasNextChapter) return;
    setActiveChapter(chapters[chapterIndex + 1].id);
  };

  const scaleClamp = (v) => Math.max(0.5, Math.min(1.5, v));
  const handleScaleDown = () => setScale((s) => scaleClamp(s - 0.1));
  const handleScaleUp = () => setScale((s) => scaleClamp(s + 0.1));

  const handleDisplayModeChange = (mode) => {
    setDisplayMode(mode);
    try {
      localStorage.setItem(DISPLAY_MODE_KEY, mode);
    } catch {
      // ignore
    }
  };

  // 键盘：Esc 返回，← → 上一页/下一页
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        onBack?.();
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setCurrentPage((p) => {
          const next = Math.max(1, p - 1);
          canvasRef.current?.scrollToPage?.(next);
          return next;
        });
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setCurrentPage((p) => {
          const next = Math.min(total || 1, p + 1);
          canvasRef.current?.scrollToPage?.(next);
          return next;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [total, onBack]);

  return (
    <div className="comic-reader-page min-h-screen flex flex-col bg-comic-bg">
      <BacktestShell
        title=""
        subtitle=""
        badge=""
        onBack={onBack}
        showHero={false}
        pad="none"
        wide
        tone="iphone15"
      >
        <div className="flex flex-col min-h-screen w-full overflow-hidden">
          <Toolbar
            onBack={onBack}
            onPrevChapter={goPrevChapter}
            onNextChapter={goNextChapter}
            hasPrevChapter={hasPrevChapter}
            hasNextChapter={hasNextChapter}
            onPrevPage={goPrevPage}
            onNextPage={goNextPage}
            hasPrevPage={currentPage > 1}
            hasNextPage={currentPage < total && total > 0}
            readMode={readMode}
            onReadModeChange={setReadMode}
            singleOrDouble={singleOrDouble}
            onSingleDoubleChange={setSingleOrDouble}
            showSingleDouble={readMode === "flip"}
            scale={scale}
            onScaleDown={handleScaleDown}
            onScaleUp={handleScaleUp}
            brightness={brightness}
            onBrightnessToggle={() => setBrightness((b) => (b === "default" ? "light" : "default"))}
            displayMode={displayMode}
            onDisplayModeChange={handleDisplayModeChange}
          >
            <Selector
              works={works}
              chapters={chapters}
              currentWorkId={selectedWorkId}
              currentChapterId={activeChapter || undefined}
              currentChapterTitle={currentChapter?.title || (chapters.length === 1 ? chapters[0]?.title : undefined)}
              onWorkChange={setSelectedWorkId}
              onChapterChange={setActiveChapter}
              currentPage={currentPage}
              totalPages={total}
              loading={loadState === "loading"}
            />
          </Toolbar>

          {loadState === "error" ? (
            <div className="flex-1 min-h-0 flex items-center justify-center p-4">
              <div className="rounded-2xl border border-comic-border bg-comic-bg-mist p-4 max-w-md">
                <p className="font-semibold text-comic-text">加载失败</p>
                <p className="mt-2 text-sm text-comic-text-muted">{errMsg}</p>
              </div>
            </div>
          ) : (
            <ReaderCanvas
              ref={canvasRef}
              pages={pages}
              readMode={readMode}
              displayMode={displayMode}
              scale={scale}
              brightness={brightness}
              onCurrentPageChange={setCurrentPage}
            />
          )}
        </div>
      </BacktestShell>
    </div>
  );
}
