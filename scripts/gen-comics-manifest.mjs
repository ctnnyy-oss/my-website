// Auto-generate public/Comics/manifest.json by scanning public/Comics/data.
//
// Why?
// - In a static website, the browser cannot list files inside a folder.
// - So we generate a JSON manifest at build/deploy time.
//
// Folder convention (recommended):
// public/Comics/data/<workId>/<chapterId>/<imageFiles>
// Example: public/Comics/data/c001/yuri/00001.webp
//
// Usage:
//   npm run gen:comics

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "public", "Comics", "data");
const OUT_FILE = path.join(ROOT, "public", "Comics", "manifest.json");

const IMAGE_EXTS = new Set([".webp", ".png", ".jpg", ".jpeg"]);

function isDir(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function listDirs(p) {
  if (!isDir(p)) return [];
  return fs
    .readdirSync(p)
    .map((name) => ({ name, full: path.join(p, name) }))
    .filter((x) => isDir(x.full))
    .map((x) => x.name)
    .sort();
}

function listImages(p) {
  if (!isDir(p)) return [];
  return fs
    .readdirSync(p)
    .filter((name) => IMAGE_EXTS.has(path.extname(name).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, "en"));
}

function toPublicRel(absPath) {
  const rel = path.relative(path.join(ROOT, "public"), absPath);
  // Use forward slashes for URLs
  return rel.split(path.sep).join("/");
}

function buildWork(workId) {
  const workDir = path.join(DATA_DIR, workId);
  const chapterIds = listDirs(workDir);

  // If there are no chapter folders, treat workDir itself as one chapter "main"
  const chapters = [];

  if (chapterIds.length === 0) {
    const imgs = listImages(workDir);
    if (imgs.length) {
      chapters.push({
        id: "main",
        title: "main",
        pages: imgs.map((f) => toPublicRel(path.join(workDir, f)).replace(/^\/+/, "")),
      });
    }
  } else {
    for (const chId of chapterIds) {
      const chDir = path.join(workDir, chId);
      const imgs = listImages(chDir);
      if (!imgs.length) continue;
      chapters.push({
        id: chId,
        title: chId,
        pages: imgs.map((f) => toPublicRel(path.join(chDir, f)).replace(/^\/+/, "")),
      });
    }
  }

  if (!chapters.length) return null;
  return {
    chapters,
    defaultChapter: chapters[0].id,
  };
}

function main() {
  if (!isDir(DATA_DIR)) {
    console.error(`[gen-comics-manifest] Missing folder: ${DATA_DIR}`);
    process.exit(1);
  }

  const workIds = listDirs(DATA_DIR);
  const works = {};

  for (const workId of workIds) {
    const w = buildWork(workId);
    if (w) works[workId] = w;
  }

  const out = {
    generatedAt: new Date().toISOString(),
    works,
  };

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2), "utf8");
  console.log(`[gen-comics-manifest] Generated ${OUT_FILE} (works: ${Object.keys(works).length})`);
}

main();
