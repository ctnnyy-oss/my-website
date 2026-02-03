import React from "react";
import ReactDOM from "react-dom/client";

import App from "./app/App.jsx";
import ErrorBoundary from "./utils/ErrorBoundary.jsx";
import "./styles/index.css";

// ✅ 统一入口：所有页面都走 App（阅读器也在 App 内部打开）
// 这样可以避免 novel.html/reader.html 的多入口导致白屏或状态丢失。
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
