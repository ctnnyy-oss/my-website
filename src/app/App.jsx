import React, { useEffect, useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";

import Home from "../pages/home/Home";
import BacktestV2 from "../pages/investment/backtest-v2";
import NovelsPage from "../pages/novels/NovelsPage";
import ComicsPage from "../pages/comics/ComicsPage";
import IllustrationsPage from "../pages/illustrations/IllustrationsPage";
import AnimationsPage from "../pages/animations/AnimationsPage";
import GamesPage from "../pages/games/GamesPage";
import ToolsPage from "../pages/tools/ToolsPage";
import ReaderPage from "../pages/reader/ReaderPage";
import ComicsReaderPage from "../pages/comics/ComicsReaderPage";

export default function App() {
  const navigate = useNavigate();
  const [readerPayload, setReaderPayload] = useState(null);
  const [comicPayload, setComicPayload] = useState(null);

  // Legacy URL param support (?bt=v2, ?file=xxx)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);

      if (params.get("bt") === "v2") {
        navigate("/tools/backtest", { replace: true });
        return;
      }

      const file = params.get("file");
      if (file) {
        const title = params.get("title") || "阅读";
        setReaderPayload({ file, title, from: "/novels" });
      }
    } catch {
      // ignore malformed query
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openReader = (payload) => {
    setReaderPayload(payload);
  };

  const openComicReader = (payload) => {
    setComicPayload(payload);
  };

  // Reader overlay: takes over the whole screen (same pattern as before)
  if (readerPayload) {
    return (
      <ReaderPage
        file={readerPayload.file}
        title={readerPayload.title}
        meta={readerPayload.meta}
        onBack={() => {
          const from = readerPayload.from || "/novels";
          setReaderPayload(null);
          navigate(from);
        }}
      />
    );
  }

  // Comic reader overlay: takes over the whole screen (same pattern as before)
  if (comicPayload) {
    return (
      <ComicsReaderPage
        title={comicPayload.title}
        mode={comicPayload.mode}
        pages={comicPayload.pages}
        manifest={comicPayload.manifest}
        workId={comicPayload.workId}
        chapter={comicPayload.chapter}
        dir={comicPayload.dir}
        count={comicPayload.count}
        ext={comicPayload.ext}
        pad={comicPayload.pad}
        start={comicPayload.start}
        onBack={() => {
          setComicPayload(null);
          navigate("/comics");
        }}
      />
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route
        path="/novels"
        element={
          <NovelsPage
            onOpenReader={(p) => openReader({ ...p, from: "/novels" })}
          />
        }
      />
      <Route
        path="/comics"
        element={<ComicsPage onOpenComicReader={openComicReader} />}
      />
      <Route path="/illustrations" element={<IllustrationsPage />} />
      <Route path="/animations" element={<AnimationsPage />} />
      <Route path="/games" element={<GamesPage />} />
      <Route path="/tools" element={<ToolsPage />} />
      <Route
        path="/tools/backtest"
        element={<BacktestV2 onBack={() => navigate("/tools")} />}
      />
      <Route path="*" element={<Home />} />
    </Routes>
  );
}
