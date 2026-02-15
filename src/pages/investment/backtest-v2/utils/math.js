export const clamp01 = (x) => Math.min(1, Math.max(0, Number(x) || 0));
export const clamp = (x, lo, hi) => Math.min(Number(hi), Math.max(Number(lo), Number(x) || 0));
export const lerp = (a, b, t) => Number(a) + (Number(b) - Number(a)) * t;
export const isFiniteNum = (v) => typeof v === "number" && Number.isFinite(v);

const niceStep = (roughStep) => {
  const x = Math.abs(Number(roughStep));
  if (!Number.isFinite(x) || x === 0) return 1;
  const exp = Math.floor(Math.log10(x));
  const f = x / Math.pow(10, exp);
  let nf = 1;
  if (f <= 1) nf = 1;
  else if (f <= 2) nf = 2;
  else if (f <= 5) nf = 5;
  else nf = 10;
  return nf * Math.pow(10, exp);
};

export const buildNiceAxis = ({ min, max, tickCount = 6, clampMin = null, clampMax = null, padRatio = 0.015 }) => {
  let lo = Number(min);
  let hi = Number(max);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return { domain: ["auto", "auto"], ticks: undefined };
  if (lo > hi) {
    const t = lo;
    lo = hi;
    hi = t;
  }

  const span0 = hi - lo;
  let pad = span0 > 0 ? span0 * padRatio : Math.max(1, Math.abs(hi) * 0.01);
  if (!Number.isFinite(pad) || pad <= 0) pad = 1;
  lo -= pad;
  hi += pad;

  if (clampMin != null) lo = Math.max(lo, clampMin);
  if (clampMax != null) hi = Math.min(hi, clampMax);

  const span = hi - lo;
  const step = niceStep(span / Math.max(1, tickCount - 1));
  const niceLo = step ? Math.floor(lo / step) * step : lo;
  const niceHi = step ? Math.ceil(hi / step) * step : hi;

  const ticks = [];
  if (Number.isFinite(step) && step > 0) {
    for (let v = niceLo, i = 0; v <= niceHi + step * 0.5 && i < 256; v += step, i++) ticks.push(v);
  }

  return { domain: [niceLo, niceHi], ticks: ticks.length ? ticks : undefined };
};

export const buildEvenTicks = (domain, tickCount = 6) => {
  if (!Array.isArray(domain) || domain.length !== 2) return undefined;
  const min = Number(domain[0]);
  const max = Number(domain[1]);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return undefined;
  const n = Math.max(2, Number(tickCount) || 6);
  const step = (max - min) / (n - 1);
  if (!Number.isFinite(step) || step === 0) return [min, max];
  const ticks = [];
  for (let i = 0; i < n; i++) ticks.push(min + step * i);
  return ticks;
};

export const buildEvenTicksWithAnchor = (domain, tickCount = 6, anchor = null) => {
  const ticks = buildEvenTicks(domain, tickCount);
  if (!Array.isArray(ticks) || ticks.length === 0) return ticks;

  const min = Number(domain?.[0]);
  const max = Number(domain?.[1]);
  const a = Number(anchor);
  if (!Number.isFinite(min) || !Number.isFinite(max) || !Number.isFinite(a)) return ticks;
  if (a < min || a > max) return ticks;

  const sorted = [...ticks, a]
    .map((x) => {
      const n = Number(x);
      if (!Number.isFinite(n)) return null;
      return Math.abs(n) < 1e-9 ? 0 : n;
    })
    .filter((x) => x != null)
    .sort((x, y) => x - y);

  const uniq = [];
  for (const v of sorted) {
    const prev = uniq[uniq.length - 1];
    const eps = Math.max(1e-8, Math.abs(v) * 1e-8);
    if (prev == null || Math.abs(v - prev) > eps) uniq.push(v);
  }
  return uniq;
};
