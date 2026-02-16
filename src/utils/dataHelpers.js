/**
 * dataHelpers.js
 * Shared utility functions for data loading and path resolution.
 * Extracted from SimpleListPage to be reused by UnifiedCategoryPage-based pages.
 */

export function isHttpUrl(s) {
  return typeof s === "string" && /^https?:\/\//i.test(s);
}

export function normalizeLocalPath(p) {
  if (!p) return "";
  let s = String(p).trim();
  s = s.replace(/^\.?\//, "");
  s = s.replace(/^public\//, "");
  return s;
}

export function guessReadableFile(item) {
  const direct = item?.file || item?.txt || item?.path;
  if (direct) return normalizeLocalPath(direct);

  const link = item?.link;
  if (typeof link === "string" && !isHttpUrl(link) && /\.(txt|md)$/i.test(link)) {
    return normalizeLocalPath(link);
  }

  return "";
}

export function getComicConfig(item, pageKey) {
  const c = item?.comic;

  if (Array.isArray(c?.pages) && c.pages.length > 0) {
    return {
      mode: "pages",
      pages: c.pages.map((p) => normalizeLocalPath(p)),
    };
  }

  const manifest = c?.manifest;
  if (manifest) {
    return {
      mode: "manifest",
      manifest: normalizeLocalPath(manifest),
      workId: String(c?.workId ?? c?.id ?? item?.id ?? "").trim(),
      chapter: String(c?.chapter ?? c?.chapterId ?? "").trim() || null,
    };
  }

  const dir = c?.dir ?? item?.comicDir ?? item?.pagesDir;
  const count = c?.count ?? item?.comicCount ?? item?.pageCount;

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
