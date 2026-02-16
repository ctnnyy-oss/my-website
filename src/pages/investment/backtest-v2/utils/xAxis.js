const TICK_TARGET_COUNT = {
  "1m": 8,
  "6m": 8,
  "1y": 7,
  "3y": 7,
  "5y": 6,
  since: 6,
};

const uniqueSortedTimes = (chartData) => {
  if (!Array.isArray(chartData)) return [];
  const set = new Set();
  for (const row of chartData) {
    const t = Number(row?.t);
    if (Number.isFinite(t)) set.add(t);
  }
  return Array.from(set).sort((a, b) => a - b);
};

const pickByEvenIndex = (times, targetCount) => {
  if (!Array.isArray(times) || times.length === 0) return [];
  if (times.length <= targetCount) return [...times];

  const lastIdx = times.length - 1;
  const slots = Math.max(2, Number(targetCount) || 2);
  const picked = [];

  for (let i = 0; i < slots; i += 1) {
    const idx = Math.round((i * lastIdx) / (slots - 1));
    picked.push(times[idx]);
  }

  picked[0] = times[0];
  picked[picked.length - 1] = times[lastIdx];
  return Array.from(new Set(picked)).sort((a, b) => a - b);
};

export const buildAdaptiveXTicks = (chartData, rangeMode) => {
  const times = uniqueSortedTimes(chartData);
  if (times.length < 2) return [];

  const targetCount = TICK_TARGET_COUNT[rangeMode] ?? 7;
  const ticks = pickByEvenIndex(times, targetCount);
  return ticks.length >= 2 ? ticks : [];
};

const pad2 = (v) => String(v).padStart(2, "0");

export const formatAdaptiveXTick = (ts, rangeMode) => {
  const t = Number(ts);
  if (!Number.isFinite(t)) return "";
  const d = new Date(t);
  if (!Number.isFinite(d.getTime())) return "";

  const yyyy = d.getUTCFullYear();
  const mm = pad2(d.getUTCMonth() + 1);
  const dd = pad2(d.getUTCDate());

  if (rangeMode === "1m" || rangeMode === "6m") return `${mm}-${dd}`;
  if (rangeMode === "5y" || rangeMode === "since") return `${yyyy}`;
  return `${yyyy}-${mm}`;
};
