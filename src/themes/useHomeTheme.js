// src/themes/useHomeTheme.js
import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_HOME_THEME_ID,
  getHomeThemeById,
  HOME_THEMES,
} from "./homeThemes";

const LS_KEY = "mx_home_theme_id";

function safeGetLS(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSetLS(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {}
}

export function useHomeTheme() {
  const [themeId, setThemeIdState] = useState(() => {
    const saved = safeGetLS(LS_KEY);
    return saved || DEFAULT_HOME_THEME_ID;
  });

  useEffect(() => {
    const exists = HOME_THEMES.some((t) => t.id === themeId);
    if (!exists) setThemeIdState(DEFAULT_HOME_THEME_ID);
  }, [themeId]);

  const theme = useMemo(() => getHomeThemeById(themeId), [themeId]);

  const setThemeId = (id) => {
    setThemeIdState(id);
    safeSetLS(LS_KEY, id);
  };

  const randomize = () => {
    const pool = HOME_THEMES;
    if (!pool.length) return;
    const next = pool[Math.floor(Math.random() * pool.length)];
    setThemeId(next.id);
  };

  return { themeId, setThemeId, theme, themes: HOME_THEMES, randomize };
}
