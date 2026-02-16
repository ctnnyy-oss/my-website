import { useEffect, useRef, useState } from "react";
import { clamp, clamp01, isFiniteNum, lerp } from "../utils/math";

const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const toNumericDomain = (domain) => {
  if (!Array.isArray(domain) || domain.length !== 2) return null;
  const a = Number(domain[0]);
  const b = Number(domain[1]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return [a, b];
};

const lerpDomain = (fromDomain, toDomain, t) => {
  const to = toNumericDomain(toDomain);
  if (!to) return toDomain;
  const from = toNumericDomain(fromDomain);
  if (!from) return to;
  return [lerp(from[0], to[0], t), lerp(from[1], to[1], t)];
};

export const useTweenChartState = (targetState, duration = 880) => {
  const [state, setState] = useState(null);
  const stateRef = useRef(null);
  const rafRef = useRef(null);
  const animIdRef = useRef(0);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const _durationHint = Number(duration);

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (!targetState) {
      animIdRef.current += 1;
      setState(null);
      return;
    }

    const to = targetState;
    const rows = Array.isArray(to.chartData) ? to.chartData : [];
    const n = rows.length;

    if (n <= 0) {
      setState({ ...to, chartData: [] });
      return;
    }

    animIdRef.current += 1;
    const animId = animIdRef.current;

    const from = stateRef.current;
    const fromYDomain = from?.yDomain;
    const fromDdDomain = from?.ddDomain;
    const fromMetricMode = from?.transitionMeta?.metricMode;
    const toMetricMode = to?.transitionMeta?.metricMode;
    const isMetricUnitSwitch =
      typeof fromMetricMode === "string" &&
      typeof toMetricMode === "string" &&
      fromMetricMode !== toMetricMode;

    const durationMs = clamp(1200 + n * 14, 2600, 5600);
    const start = performance.now();

    const targetStartT = Number(to?.xDomain?.[0]);
    const fallbackStartT = Number(rows[0]?.t);
    const xStart = Number.isFinite(targetStartT) ? targetStartT : fallbackStartT;

    const targetEndT = Number(to?.xDomain?.[1]);
    const fallbackEndT = Number(rows[n - 1]?.t);
    const xTargetEnd = Number.isFinite(targetEndT) ? targetEndT : fallbackEndT;

    const fixedDomain =
      Number.isFinite(xStart) && Number.isFinite(xTargetEnd)
        ? [Math.min(xStart, xTargetEnd), Math.max(xStart, xTargetEnd)]
        : to.xDomain;

    const buildFrame = (revealProgress, eased) => {
      const visibleCount =
        n <= 1 ? n : Math.min(n, 1 + Math.floor(clamp01(revealProgress) * (n - 1)));
      const chartData = rows.slice(0, visibleCount);

      return {
        ...to,
        chartData,
        xDomain: fixedDomain,
        yDomain: isMetricUnitSwitch ? to.yDomain : lerpDomain(fromYDomain, to.yDomain, eased),
        ddDomain: lerpDomain(fromDdDomain, to.ddDomain, eased),
        subAlpha: isFiniteNum(to.subAlpha) ? to.subAlpha : 0,
      };
    };

    setState(buildFrame(0, 0));

    const step = (now) => {
      if (animId !== animIdRef.current) return;

      const p = clamp01((now - start) / durationMs);
      const e = easeInOutCubic(p);
      setState(buildFrame(p, e));

      if (p < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        rafRef.current = null;
        setState(to);
      }
    };

    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [targetState, duration]);

  return state;
};
