import { useEffect, useRef, useState } from "react";
import { timeToDateStr } from "../utils/date";
import { clamp01, isFiniteNum, lerp } from "../utils/math";

const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * 检测两个 xDomain 的时间跨度是否足够接近（比值 < 2 倍）
 * 不接近 → 说明用户切了区间（近1月→成立来），此时不做逐点插值，防止"熔断"闪烁
 */
const areDomainsSimilar = (a, b) => {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  const [a0, a1] = a.map(Number);
  const [b0, b1] = b.map(Number);
  if (![a0, a1, b0, b1].every(Number.isFinite)) return false;
  const aSpan = a1 - a0;
  const bSpan = b1 - b0;
  if (aSpan <= 0 || bSpan <= 0) return false;
  return Math.max(aSpan, bSpan) / Math.min(aSpan, bSpan) < 2;
};

const toTimeSet = (arr) => {
  const set = new Set();
  (Array.isArray(arr) ? arr : []).forEach((p) => {
    const t = Number(p?.t);
    if (Number.isFinite(t)) set.add(t);
  });
  return set;
};

const overlapRatio = (a, b) => {
  if (!(a instanceof Set) || !(b instanceof Set)) return 0;
  if (a.size === 0 || b.size === 0) return 0;

  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  let hit = 0;
  small.forEach((t) => {
    if (large.has(t)) hit += 1;
  });
  return hit / Math.min(a.size, b.size);
};

const hasSameRangeMode = (from, to) => {
  const a = from?.transitionMeta?.rangeMode;
  const b = to?.transitionMeta?.rangeMode;
  return typeof a === "string" && typeof b === "string" && a === b;
};

export const useTweenChartState = (targetState, duration = 880) => {
  const [state, setState] = useState(targetState);
  const stateRef = useRef(targetState);
  const rafRef = useRef(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (!targetState) {
      setState(null);
      return;
    }
    if (!stateRef.current) {
      setState(targetState);
      return;
    }

    const from = stateRef.current;
    const to = targetState;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const fromArr = Array.isArray(from.chartData) ? from.chartData : [];
    const toArr = Array.isArray(to.chartData) ? to.chartData : [];
    const timeOverlap = overlapRatio(toTimeSet(fromArr), toTimeSet(toArr));
    const canMorph =
      hasSameRangeMode(from, to) &&
      areDomainsSimilar(from.xDomain, to.xDomain) &&
      timeOverlap >= 0.9;

    // ---- 路径 A：禁用形变（切区间/重叠不足）→ 直接切数据，只平滑过渡副曲线透明度 ----
    if (!canMorph) {
      const fa = isFiniteNum(from.subAlpha) ? from.subAlpha : 0;
      const ta = isFiniteNum(to.subAlpha) ? to.subAlpha : 0;

      if (Math.abs(fa - ta) < 0.01) {
        setState(to);
        return;
      }

      const start = performance.now();
      const dur = Math.max(180, Number(duration) || 0);

      const step = (now) => {
        const p = clamp01((now - start) / dur);
        if (p >= 1) {
          setState(to);
        } else {
          setState({ ...to, subAlpha: lerp(fa, ta, easeInOutCubic(p)) });
          rafRef.current = requestAnimationFrame(step);
        }
      };

      rafRef.current = requestAnimationFrame(step);
      return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    }

    // ---- 路径 B：同区间且高重叠（切视图/指标/策略）→ 保守逐点插值过渡 ----

    const byT = (arr) => {
      const m = new Map();
      arr.forEach((p) => {
        if (p && Number.isFinite(Number(p.t))) m.set(Number(p.t), p);
      });
      return m;
    };

    const fromMap = byT(fromArr);
    const toMap = byT(toArr);
    const times = Array.from(fromMap.keys()).filter((t) => toMap.has(t)).sort((a, b) => a - b);
    if (times.length < 2) {
      setState(to);
      return;
    }
    const fields = ["vMain", "vSub", "cMain", "cSub", "ddMain", "ddSub"];

    const readNum = (p, k) => {
      if (!p) return null;
      const n = Number(p[k]);
      return Number.isFinite(n) ? n : null;
    };

    const dur = Math.max(180, Number(duration) || 0);
    const start = performance.now();

    const step = (now) => {
      const p = clamp01((now - start) / dur);
      const e = easeInOutCubic(p);

      const next = {
        ...to,
        subAlpha: isFiniteNum(from.subAlpha) && isFiniteNum(to.subAlpha) ? lerp(from.subAlpha, to.subAlpha, e) : to.subAlpha,
        xDomain: to.xDomain,
        yDomain: to.yDomain,
        ddDomain: to.ddDomain,
      };

      const chartData = new Array(times.length);
      for (let i = 0; i < times.length; i++) {
        const tms = times[i];
        const pf = fromMap.get(tms);
        const pt = toMap.get(tms);
        const row = { t: tms, date: (pt && pt.date) || (pf && pf.date) || timeToDateStr(tms) };

        for (const k of fields) {
          let a = readNum(pf, k);
          let b = readNum(pt, k);
          if (a == null && b == null) {
            row[k] = null;
            continue;
          }
          if (a == null) a = b;
          if (b == null) b = a;
          row[k] = lerp(a, b, e);
        }
        chartData[i] = row;
      }

      const pct = (a, b) => {
        if (a == null || b == null) return 0;
        const aa = Number(a);
        const bb = Number(b);
        if (!Number.isFinite(aa) || !Number.isFinite(bb) || bb <= 0) return 0;
        return ((aa - bb) / bb) * 100;
      };

      for (let i = 0; i < chartData.length; i++) {
        const cur = chartData[i];
        const prev = chartData[i - 1];
        cur.idx = i;
        cur.chgMain = i === 0 ? 0 : pct(cur.vMain, prev?.vMain);
        cur.chgSub = i === 0 ? 0 : pct(cur.vSub, prev?.vSub);
      }

      next.chartData = chartData;
      setState(next);

      if (p < 1) rafRef.current = requestAnimationFrame(step);
      else setState(to);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [targetState, duration]);

  return state;
};
