import { MS_DAY } from "./constants.js";

export const parseDateUTC = (dateStr) => new Date(`${dateStr}T00:00:00Z`);
export const dateToTime = (dateStr) => parseDateUTC(dateStr).getTime();
export const timeToDateStr = (t) => new Date(t).toISOString().slice(0, 10);

// 用东八区格式化（与原实现保持一致）
const CN_DATE_FMT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export const tsToCNDateStr = (ts) => CN_DATE_FMT.format(new Date(ts));

/**
 * 将区间内缺失的“自然日”补齐（用于画连续曲线）
 * - series: [{date: 'YYYY-MM-DD', ...}, ...] 且 date 升序
 */
export const fillCalendarDays = (series) => {
  if (!series || series.length === 0) return series;
  const map = new Map(series.map((r) => [r.date, r]));
  const start = series[0].date;
  const end = series[series.length - 1].date;

  const mergePreferGood = (base, patch) => {
    const out = { ...base };
    Object.keys(patch || {}).forEach((k) => {
      const v = patch[k];
      if (v === undefined || v === null) return;
      if (typeof v === "number" && !Number.isFinite(v)) return;
      out[k] = v;
    });
    return out;
  };

  const dense = [];
  let curT = dateToTime(start);
  const endT = dateToTime(end);
  let last = series[0];

  while (curT <= endT) {
    const cur = timeToDateStr(curT);
    const hit = map.get(cur);
    if (hit) {
      const merged = mergePreferGood(last, hit);
      merged.date = cur;
      last = merged;
      dense.push(merged);
    } else {
      dense.push({ ...last, date: cur });
    }
    curT += MS_DAY;
  }
  return dense;
};
