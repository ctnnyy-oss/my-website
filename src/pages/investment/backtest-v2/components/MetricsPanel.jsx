import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { METRIC_DEFS, THEME } from "../constants";
import AnimatedValue from "./AnimatedValue";

const METRICS_WIDTH = 200;
const TOOLTIP_WIDTH = 300;
const TOOLTIP_ESTIMATED_HEIGHT = 186;
const TOOLTIP_OFFSET = 14;
const TOOLTIP_MARGIN = 12;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const resolveTooltipPos = (anchorX, anchorY) => {
  if (typeof window === "undefined") return { x: anchorX, y: anchorY };

  const maxX = Math.max(TOOLTIP_MARGIN, window.innerWidth - TOOLTIP_WIDTH - TOOLTIP_MARGIN);
  let x = clamp(anchorX + TOOLTIP_OFFSET, TOOLTIP_MARGIN, maxX);

  let y = anchorY + TOOLTIP_OFFSET;
  if (y + TOOLTIP_ESTIMATED_HEIGHT > window.innerHeight - TOOLTIP_MARGIN) {
    y = anchorY - TOOLTIP_ESTIMATED_HEIGHT - TOOLTIP_OFFSET;
  }
  const maxY = Math.max(TOOLTIP_MARGIN, window.innerHeight - TOOLTIP_ESTIMATED_HEIGHT - TOOLTIP_MARGIN);
  y = clamp(y, TOOLTIP_MARGIN, maxY);

  return { x, y };
};

const MetricsPanel = ({ results, viewMode, ddWindows, cardFXProps }) => {
  const [activeMetricKey, setActiveMetricKey] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: TOOLTIP_MARGIN, y: TOOLTIP_MARGIN });
  const [isTouchMode, setIsTouchMode] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;

    const media = window.matchMedia("(hover: none), (pointer: coarse)");
    const syncTouchMode = () => setIsTouchMode(media.matches);
    syncTouchMode();

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", syncTouchMode);
      return () => media.removeEventListener("change", syncTouchMode);
    }

    media.addListener(syncTouchMode);
    return () => media.removeListener(syncTouchMode);
  }, []);

  useEffect(() => {
    setActiveMetricKey(null);
  }, [isTouchMode]);

  const activeMetric = useMemo(
    () => METRIC_DEFS.find((m) => m.key === activeMetricKey) || null,
    [activeMetricKey],
  );

  const updateTooltipFromPoint = (x, y) => {
    setTooltipPos(resolveTooltipPos(x, y));
  };

  const handleTriggerMouseEnter = (metricKey) => (event) => {
    if (isTouchMode) return;
    setActiveMetricKey(metricKey);
    updateTooltipFromPoint(event.clientX, event.clientY);
  };

  const handleTriggerMouseMove = (metricKey) => (event) => {
    if (isTouchMode || activeMetricKey !== metricKey) return;
    updateTooltipFromPoint(event.clientX, event.clientY);
  };

  const handleTriggerMouseLeave = (metricKey) => () => {
    if (isTouchMode) return;
    setActiveMetricKey((current) => (current === metricKey ? null : current));
  };

  const handleTriggerClick = (metricKey) => (event) => {
    if (!isTouchMode) return;

    if (activeMetricKey === metricKey) {
      setActiveMetricKey(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    setActiveMetricKey(metricKey);
    setTooltipPos(resolveTooltipPos(rect.right, rect.top + rect.height / 2));
  };

  const handleTriggerKeyDown = (metricKey) => (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();

    if (activeMetricKey === metricKey) {
      setActiveMetricKey(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    setActiveMetricKey(metricKey);
    setTooltipPos(resolveTooltipPos(rect.right, rect.top + rect.height / 2));
  };

  const tooltipNode = activeMetric?.explain ? (
    <div
      className="metric-help-tooltip"
      style={{ left: tooltipPos.x, top: tooltipPos.y, width: TOOLTIP_WIDTH }}
    >
      <div className="metric-help-title">{activeMetric.label}</div>
      <div className="metric-help-row">
        <span className="metric-help-label">定义：</span>
        <span className="metric-help-line">{activeMetric.explain.definition}</span>
      </div>
      <div className="metric-help-row">
        <span className="metric-help-label">作用：</span>
        <span className="metric-help-line">{activeMetric.explain.focus}</span>
      </div>
      <div className="metric-help-row">
        <span className="metric-help-label">判断：</span>
        <span className="metric-help-line">{activeMetric.explain.judgment}</span>
      </div>
      <div className="metric-help-row">
        <span className="metric-help-label">例子：</span>
        <span className="metric-help-line">{activeMetric.explain.example}</span>
      </div>
      <div className="metric-help-row">
        <span className="metric-help-label">公式：</span>
        <span className="metric-help-line">{activeMetric.explain.formula}</span>
      </div>
    </div>
  ) : null;

  return (
    <div className="backtest-metrics-panel flex-none min-h-0 h-full" style={{ width: METRICS_WIDTH }}>
      <div className="backtest-metrics-grid grid grid-rows-[repeat(9,minmax(0,1fr))] gap-1 h-full">
        {METRIC_DEFS.map((m, i) => {
          const getVal = (res, which) => {
            if (!res || !res.curve || res.curve.length === 0) return 0;
            const last = res.curve.at(-1);
            if (m.key === "value") return last.value;
            if (m.key === "cost") return last.cost;
            if (m.key === "profit") return last.value - last.cost;
            if (m.key === "recovery") {
              const w = ddWindows?.[which];
              if (!w) return "-";
              if (!w.hasDrawdown) return 0;
              if (w.recoveryDays == null) return "未修复";
              return w.recoveryDays;
            }
            return res.metrics?.[m.key] ?? 0;
          };

          const valA = results.dataA ? getVal(results.dataA, "A") : 0;
          const valB = results.dataB ? getVal(results.dataB, "B") : 0;

          return (
            <div
              {...cardFXProps}
              key={m.key}
              className="metric-card card-bloom relative overflow-hidden bg-white/70 backdrop-blur-xl border border-white/70 rounded-2xl p-2.5 shadow-[0_6px_20px_rgba(255,182,193,0.08)] hover:bg-white transition-all duration-300 group flex flex-col justify-center min-h-0"
            >
              <div
                className="absolute inset-0 opacity-60"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(255,143,171,0.10) 0%, rgba(137,207,240,0.10) 100%)",
                }}
              />
              <div className="relative">
                <div className="flex items-center justify-between mb-1.5">
                  <div
                    className="metric-help-trigger flex items-center gap-2 rounded-lg"
                    onMouseEnter={handleTriggerMouseEnter(m.key)}
                    onMouseMove={handleTriggerMouseMove(m.key)}
                    onMouseLeave={handleTriggerMouseLeave(m.key)}
                    onClick={handleTriggerClick(m.key)}
                    onKeyDown={handleTriggerKeyDown(m.key)}
                    tabIndex={0}
                    role="button"
                    aria-label={`${m.label}解释`}
                    aria-expanded={activeMetricKey === m.key}
                  >
                    <div
                      className="p-1.5 rounded-lg text-white shadow-sm"
                      style={{ backgroundColor: m.color }}
                    >
                      <m.icon size={11} />
                    </div>
                    <span className="text-[9px] font-bold text-[#B58F96]">{m.label}</span>
                  </div>
                  <span className="text-[9px] font-bold text-[#C5A0A6] bg-white/70 border border-white/80 px-1.5 py-0.5 rounded-full">
                    #{String(i + 1).padStart(2, "0")}
                  </span>
                </div>

                <div className="space-y-1">
                  {(viewMode === "A" || viewMode === "compare") && (
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-[9px] font-semibold text-[#C5A0A6]">
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: THEME.colors.primary }}
                        ></span>
                        细水长流
                      </span>
                      <div className="text-[12px] font-black" style={{ color: THEME.colors.primary }}>
                        <AnimatedValue value={valA} formatter={m.fmt} />
                      </div>
                    </div>
                  )}
                  {(viewMode === "B" || viewMode === "compare") && (
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-[9px] font-semibold text-[#C5A0A6]">
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: THEME.colors.secondary }}
                        ></span>
                        五等分
                      </span>
                      <div className="text-[12px] font-black" style={{ color: THEME.colors.secondary }}>
                        <AnimatedValue value={valB} formatter={m.fmt} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {tooltipNode && typeof document !== "undefined" ? createPortal(tooltipNode, document.body) : null}
    </div>
  );
};

export default MetricsPanel;
