import React from "react";

import { METRIC_DEFS, THEME } from "../constants";
import AnimatedValue from "./AnimatedValue";

const METRICS_WIDTH = 200;

const MetricsPanel = ({ results, viewMode, ddWindows, cardFXProps }) => {
  return (
    <div className="flex-none min-h-0 h-full" style={{ width: METRICS_WIDTH }}>
      <div className="grid grid-rows-[repeat(9,minmax(0,1fr))] gap-1 h-full">
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
                  <div className="flex items-center gap-2">
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
    </div>
  );
};

export default MetricsPanel;
