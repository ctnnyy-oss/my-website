import React, { useEffect, useState } from "react";

import Home from "../pages/home/Home";
import Backtest from "../pages/investment/Backtest";
import IllustrationsPage from "../pages/illustrations/IllustrationsPage";
import AnimationsPage from "../pages/animations/AnimationsPage";
import NovelsPage from "../pages/novels/NovelsPage";
import ComicsPage from "../pages/comics/ComicsPage";
import ComicsReaderPage from "../pages/comics/ComicsReaderPage";
import GamesPage from "../pages/games/GamesPage";
import ReaderPage from "../pages/reader/ReaderPage";

export default function App() {
  const [activePage, setActivePage] = useState("home");
  const [readerPayload, setReaderPayload] = useState(null);
  const [comicPayload, setComicPayload] = useState(null);

  const goHome = () => setActivePage("home");

  const openReader = (payload) => {
    setReaderPayload(payload);
    setActivePage("reader");
  };

  const openComicReader = (payload) => {
    setComicPayload(payload);
    setActivePage("comicReader");
  };

  useEffect(() => {
    // 允许用 URL 参数直接打开阅读器：/?file=Novels%2Fxxx.txt&title=...
    try {
      const params = new URLSearchParams(window.location.search);
      const file = params.get("file");
      if (file) {
        const title = params.get("title") || "阅读";
        openReader({ file, title, from: "novels" });
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 阅读器（同一 SPA 内，不再需要单独 novel.html）
  if (activePage === "reader") {
    return (
      <ReaderPage
        file={readerPayload?.file}
        title={readerPayload?.title}
        onBack={() => setActivePage(readerPayload?.from || "novels")}
      />
    );
  }

  // 漫画阅读器（长图滚动 + 懒加载）
  if (activePage === "comicReader") {
    return (
      <ComicsReaderPage
        title={comicPayload?.title}
        // 新版：支持三种输入模式（manifest/pages/dir）
        mode={comicPayload?.mode}
        pages={comicPayload?.pages}
        manifest={comicPayload?.manifest}
        workId={comicPayload?.workId}
        chapter={comicPayload?.chapter}
        // 兼容旧版：dir + count
        dir={comicPayload?.dir}
        count={comicPayload?.count}
        ext={comicPayload?.ext}
        pad={comicPayload?.pad}
        start={comicPayload?.start}
        onBack={() => setActivePage("comics")}
      />
    );
  }

  if (activePage === "home") {
    return <Home onNavigate={setActivePage} />;
  }

  if (activePage === "investment" || activePage === "backtest") {
    return <Backtest onBack={goHome} />;
  }

  if (activePage === "illustrations") {
    return <IllustrationsPage onBack={goHome} />;
  }

  if (activePage === "animations") {
    return <AnimationsPage onBack={goHome} />;
  }

  if (activePage === "novels") {
    return (
      <NovelsPage
        onBack={goHome}
        onOpenReader={(payload) => openReader({ ...payload, from: "novels" })}
      />
    );
  }

  if (activePage === "comics") {
    return <ComicsPage onBack={goHome} onOpenComicReader={openComicReader} />;
  }

  if (activePage === "games") {
    return <GamesPage onBack={goHome} />;
  }


  return <Home onNavigate={setActivePage} />;
}
