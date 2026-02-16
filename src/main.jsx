import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";

import App from "./app/App.jsx";
import ErrorBoundary from "./utils/ErrorBoundary.jsx";
import "./styles/index.css";

// HashRouter: URL paths appear after # (e.g. /#/novels)
// This ensures GitHub Pages compatibility without server-side routing config.
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <HashRouter>
        <App />
      </HashRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
