import { useMemo } from "react";

import { LOG_EPS } from "../constants";
import { calcMaxDrawdownWindow } from "../domain/metrics";
import { fillCalendarDays } from "../domain/portfolio";
import { dateToTime } from "../utils/date";
import { buildEvenTicks, buildEvenTicksWithAnchor, buildNiceAxis, isFiniteNum } from "../utils/math";
import { useTweenChartState } from "./useTweenChartState";

/**
 * 鍥捐〃鏁版嵁鍑嗗 Hook
 *
 * 鎶婂洖娴嬬粨鏋滐紙results锛? 鏄剧ず璁剧疆 鈫?鍙洿鎺ュ杺缁?Recharts 鐨勬暟鎹? *
 * @param {object|null} results       - useBacktest 杩斿洖鐨?results
 * @param {string}      viewMode      - 'compare' | 'A' | 'B'
 * @param {string}      metricMode    - 'value' | 'return'
 * @param {string}      scaleMode     - 'linear' | 'log'
 * @param {string}      rangeMode     - '1m' | '6m' | '1y' | '3y' | '5y' | 'since'
 * @returns {{ chartState, chartYTicks, ddTicks, ddDomain, ddWindows, mainDdWindow, subDdWindow }}
 */
export const useChartData = (results, viewMode, metricMode, scaleMode, rangeMode) => {
  // ==================== 1. 鍚堝苟 A/B 鏇茬嚎锛岃ˉ鍏ㄨ嚜鐒舵棩 ====================
  const chartBase = useMemo(() => {
    if (!results) return null;

    const mapA = new Map();
    const mapB = new Map();
    results.dataA?.curve?.forEach((d) => mapA.set(d.date, d));
    results.dataB?.curve?.forEach((d) => mapB.set(d.date, d));

    const dates = Array.from(new Set([...mapA.keys(), ...mapB.keys()]));
    dates.sort((a, b) => dateToTime(a) - dateToTime(b));
    if (dates.length < 2) return null;

    const toNumOrNull = (x) => {
      const n = Number(x);
      return Number.isFinite(n) ? n : null;
    };

    let lastA = null;
    let lastB = null;
    const raw = [];

    for (const date of dates) {
      if (mapA.has(date)) lastA = mapA.get(date);
      if (mapB.has(date)) lastB = mapB.get(date);

      raw.push({
        date,
        t: dateToTime(date),
        aValue: toNumOrNull(lastA?.value),
        aCost: toNumOrNull(lastA?.cost),
        aReturn: toNumOrNull(lastA?.returnRate),
        aDd: toNumOrNull(lastA?.drawdown),
        bValue: toNumOrNull(lastB?.value),
        bCost: toNumOrNull(lastB?.cost),
        bReturn: toNumOrNull(lastB?.returnRate),
        bDd: toNumOrNull(lastB?.drawdown),
      });
    }

    return fillCalendarDays(raw);
  }, [results]);

  // ==================== 2. 鏄犲皠鎴?涓绘洸绾?鍓洸绾?骞惰绠楀潗鏍囪酱 ====================
  const chartTargetState = useMemo(() => {
    if (!chartBase || !results) return null;

    const hasA = !!results.dataA?.curve?.length;
    const hasB = !!results.dataB?.curve?.length;

    const aStartT = hasA ? dateToTime(results.dataA.curve[0].date) : null;
    const aEndT = hasA ? dateToTime(results.dataA.curve.at(-1).date) : null;
    const bStartT = hasB ? dateToTime(results.dataB.curve[0].date) : null;
    const bEndT = hasB ? dateToTime(results.dataB.curve.at(-1).date) : null;

    const wantsCompare = viewMode === "compare" && hasA && hasB;

    let mainKey = viewMode === "B" ? "b" : "a";
    if (mainKey === "a" && !hasA && hasB) mainKey = "b";
    if (mainKey === "b" && !hasB && hasA) mainKey = "a";

    const subKey = wantsCompare ? (mainKey === "a" ? "b" : "a") : mainKey;
    const subAlpha = wantsCompare ? 1 : 0;

    // X 轴范围
    let startT = null;
    let endT = null;
    if (wantsCompare) {
      startT = Math.max(aStartT ?? -Infinity, bStartT ?? -Infinity);
      endT = Math.min(aEndT ?? Infinity, bEndT ?? Infinity);
    } else if (mainKey === "a") {
      startT = aStartT;
      endT = aEndT;
    } else {
      startT = bStartT;
      endT = bEndT;
    }

    // fallback
    let fallbackStart = null;
    let fallbackEnd = null;
    for (const r of chartBase) {
      const t = Number(r?.t);
      if (!Number.isFinite(t)) continue;
      if (fallbackStart == null || t < fallbackStart) fallbackStart = t;
      if (fallbackEnd == null || t > fallbackEnd) fallbackEnd = t;
    }
    if (!Number.isFinite(startT)) startT = fallbackStart;
    if (!Number.isFinite(endT)) endT = fallbackEnd;

    const toFiniteOrNull = (x) => {
      const n = Number(x);
      return Number.isFinite(n) ? n : null;
    };

    // 鏋勫缓姣忚鏁版嵁
    const rows = chartBase.map((r) => {
      const mainV = metricMode === "value" ? r[`${mainKey}Value`] : r[`${mainKey}Return`];
      const subV = metricMode === "value" ? r[`${subKey}Value`] : r[`${subKey}Return`];

      let vMain = toFiniteOrNull(mainV);
      let vSub = toFiniteOrNull(subV);
      let cMain = metricMode === "value" ? toFiniteOrNull(r[`${mainKey}Cost`]) : null;
      let cSub = metricMode === "value" ? toFiniteOrNull(r[`${subKey}Cost`]) : null;
      const ddMain = toFiniteOrNull(r[`${mainKey}Dd`]);
      const ddSub = toFiniteOrNull(r[`${subKey}Dd`]);

      // 瀵规暟鍧愭爣淇濇姢
      if (scaleMode === "log" && metricMode === "value") {
        if (vMain != null) vMain = Math.max(LOG_EPS, vMain);
        if (vSub != null) vSub = Math.max(LOG_EPS, vSub);
        if (cMain != null) cMain = Math.max(LOG_EPS, cMain);
        if (cSub != null) cSub = Math.max(LOG_EPS, cSub);
      }

      return {
        date: r.date,
        t: Number(r.t) || dateToTime(r.date),
        vMain, vSub, cMain, cSub, ddMain, ddSub,
      };
    });

    const inRange = (r) =>
      (startT == null || r.t >= startT) && (endT == null || r.t <= endT);
    const visibleRows = rows.filter(inRange);
    const pct = (a, b) => {
      if (a == null || b == null) return 0;
      const aa = Number(a);
      const bb = Number(b);
      if (!Number.isFinite(aa) || !Number.isFinite(bb) || bb <= 0) return 0;
      return ((aa - bb) / bb) * 100;
    };
    const visibleRowsWithDelta = visibleRows.map((r, idx) => {
      const prev = visibleRows[idx - 1];
      return {
        ...r,
        idx,
        chgMain: idx === 0 ? 0 : pct(r.vMain, prev?.vMain),
        chgSub: idx === 0 ? 0 : pct(r.vSub, prev?.vSub),
      };
    });
    const pickOriginValue = () => {
      const firstVisible = visibleRows[0];
      if (isFiniteNum(firstVisible?.vMain)) return firstVisible.vMain;
      if (isFiniteNum(firstVisible?.vSub)) return firstVisible.vSub;

      const firstMain = visibleRows.find((r) => isFiniteNum(r.vMain))?.vMain;
      if (isFiniteNum(firstMain)) return firstMain;
      const firstSub = visibleRows.find((r) => isFiniteNum(r.vSub))?.vSub;
      if (isFiniteNum(firstSub)) return firstSub;
      return null;
    };
    const originValue = pickOriginValue();
    const yAxisAnchor = metricMode === "return" ? 0 : originValue;

    // Y 杞?Domain
    let yDomain = ["auto", "auto"];
    if (visibleRows.length) {
      const vals = [];
      visibleRows.forEach((r) => {
        if (isFiniteNum(r.vMain)) vals.push(r.vMain);
        if (isFiniteNum(r.vSub)) vals.push(r.vSub);
        if (metricMode === "value") {
          if (isFiniteNum(r.cMain)) vals.push(r.cMain);
          if (isFiniteNum(r.cSub)) vals.push(r.cSub);
        }
      });

      if (vals.length) {
        if (scaleMode === "log" && metricMode === "value") {
          const max = Math.max(LOG_EPS, ...vals);
          yDomain = [LOG_EPS, Math.max(LOG_EPS, max * 1.06)];
        } else if (metricMode === "value") {
          if (isFiniteNum(originValue)) {
            const minValue = Math.min(...vals);
            const maxValue = Math.max(originValue, ...vals);
            const topSpan = Math.max(0, maxValue - originValue);
            const topPad = topSpan > 0 ? topSpan * 0.04 : Math.max(1, Math.abs(originValue) * 0.01);

            let lowerBound = originValue;
            if (minValue < originValue) {
              const downSpan = originValue - minValue;
              const lowerPad = downSpan > 0 ? downSpan * 0.08 : Math.max(1, Math.abs(originValue) * 0.01);
              lowerBound = minValue - lowerPad;
            }

            let upperBound = maxValue + topPad;
            if (!(upperBound > lowerBound)) upperBound = lowerBound + 1;
            yDomain = [lowerBound, upperBound];
          } else {
            const min = Math.min(...vals, 0);
            const max = Math.max(...vals, 0);
            const axis = buildNiceAxis({
              min, max, tickCount: 6,
              clampMin: 0,
              padRatio: 0.015,
            });
            yDomain = axis.domain;
          }
        } else {
          const minRet = Math.min(...vals, 0);
          const maxRet = Math.max(...vals, 0);
          const upperPad = Math.max(0.6, Math.abs(maxRet) * 0.08);

          let lowerBound = 0;
          if (minRet < 0) {
            const lowerPad = Math.max(0.2, Math.abs(minRet) * 0.12);
            lowerBound = minRet - lowerPad;
            // Avoid over-deep axis for shallow drawdown.
            if (minRet > -2) lowerBound = Math.max(lowerBound, -2);
          }

          let upperBound = maxRet + upperPad;
          if (!(upperBound > lowerBound)) upperBound = lowerBound + 1;
          yDomain = [lowerBound, upperBound];
        }
      }
    }

    // 鍥炴挙杞?Domain
    let ddDomain = [-1, 0];
    if (visibleRows.length) {
      const ddVals = [];
      visibleRows.forEach((r) => {
        if (isFiniteNum(r.ddMain)) ddVals.push(r.ddMain);
        if (wantsCompare && isFiniteNum(r.ddSub)) ddVals.push(r.ddSub);
      });
      if (ddVals.length) {
        const min = Math.min(...ddVals, 0);
        const axis = buildNiceAxis({ min, max: 0, tickCount: 6, clampMax: 0, padRatio: 0.08 });
        ddDomain = [axis.domain[0], 0];
      }
    }

    return {
      chartData: visibleRowsWithDelta,
      xDomain: [startT, endT],
      yDomain,
      yAxisAnchor,
      ddDomain,
      subAlpha,
      transitionMeta: {
        rangeMode,
        viewMode,
        metricMode,
        scaleMode,
      },
    };
  }, [chartBase, results, viewMode, metricMode, scaleMode, rangeMode]);

  // ==================== 3. 涓濇粦杩囨浮鍔ㄧ敾 ====================
  const chartState = useTweenChartState(chartTargetState, 920);

  // ==================== 4. 鍒诲害绾?====================
  const chartYTicks = useMemo(() => {
    if (!chartState?.yDomain || !Array.isArray(chartState.yDomain)) return undefined;
    if (scaleMode === "log") return undefined;
    return buildEvenTicksWithAnchor(chartState.yDomain, 7, chartState?.yAxisAnchor);
  }, [chartState, scaleMode, metricMode]);

  const ddTicks = useMemo(() => {
    if (!chartState?.ddDomain || !Array.isArray(chartState.ddDomain)) return undefined;
    return buildEvenTicks(chartState.ddDomain, 7);
  }, [chartState]);

  const ddDomain = chartState?.ddDomain ?? [-1, 0];

  // ==================== 5. 鏈€澶у洖鎾ゅ尯闂寸獥鍙?====================
  const ddWindows = useMemo(() => {
    if (!results) return null;
    return {
      A: results.dataA?.curve ? calcMaxDrawdownWindow(results.dataA.curve) : null,
      B: results.dataB?.curve ? calcMaxDrawdownWindow(results.dataB.curve) : null,
    };
  }, [results]);

  const mainDdWindow = useMemo(() => {
    if (!ddWindows) return null;
    return viewMode === "B" ? ddWindows.B : ddWindows.A;
  }, [ddWindows, viewMode]);

  const subDdWindow = useMemo(() => {
    if (!ddWindows) return null;
    return viewMode === "compare" ? ddWindows.B : null;
  }, [ddWindows, viewMode]);

  return { chartState, chartYTicks, ddTicks, ddDomain, ddWindows, mainDdWindow, subDdWindow };
};

