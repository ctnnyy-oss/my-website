import React from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, TrendingUp } from "lucide-react";

import { LOG_EPS, THEME } from "../constants";
import { dateToTime, timeToDateStr } from "../utils/date";
import { formatAssetTick, formatAssetTickPrecise, formatPercentTick } from "../utils/format";
import { buildAdaptiveXTicks, formatAdaptiveXTick } from "../utils/xAxis";
import { CustomValueTooltip, CustomReturnTooltip } from "./Tooltips";

const CHART_SPLIT = 0.38;

const ChartSection = ({
  chartState,
  scaleMode,
  metricMode,
  viewMode,
  rangeMode,
  ddDomain,
  ddTicks,
  chartYTicks,
  mainDdWindow,
  subDdWindow,
  cardFXProps,
}) => {
  const safeXDomain =
    Array.isArray(chartState?.xDomain) &&
    chartState.xDomain.every((x) => Number.isFinite(Number(x)))
      ? chartState.xDomain
      : ["auto", "auto"];

  const safeYDomain =
    Array.isArray(chartState?.yDomain) &&
    chartState.yDomain.every((x) => Number.isFinite(Number(x)))
      ? chartState.yDomain
      : ["auto", "auto"];

  const subAlpha = Number(chartState?.subAlpha) || 0;
  const chartRows = Array.isArray(chartState?.chartData) ? chartState.chartData : [];
  const lastVisibleT = Number(chartRows[chartRows.length - 1]?.t);
  const hasVisibleT = Number.isFinite(lastVisibleT);
  const mainTroughT = mainDdWindow?.hasDrawdown ? dateToTime(mainDdWindow?.troughDate) : NaN;
  const subTroughT = subDdWindow?.hasDrawdown ? dateToTime(subDdWindow?.troughDate) : NaN;
  const showMainDdArea =
    !!mainDdWindow?.hasDrawdown &&
    hasVisibleT &&
    Number.isFinite(mainTroughT) &&
    lastVisibleT >= mainTroughT;
  const showSubDdArea =
    !!subDdWindow?.hasDrawdown &&
    subAlpha > 0.02 &&
    hasVisibleT &&
    Number.isFinite(subTroughT) &&
    lastVisibleT >= subTroughT;
  const assetXTicks = React.useMemo(
    () => buildAdaptiveXTicks(chartState?.chartData, rangeMode),
    [chartState?.chartData, rangeMode],
  );

  return (
    <div className="backtest-chart-section flex-1 min-w-0 min-h-0 flex flex-col gap-2">
      {/* 上方：回撤图 */}
      <div
        {...cardFXProps}
        style={{ flex: CHART_SPLIT }}
        className="backtest-chart-dd bg-white/60 backdrop-blur-xl border border-white/60 rounded-[24px] p-3 shadow-sm card-bloom relative flex flex-col min-h-0"
      >
        <h3 className="text-xs font-bold text-[#8B4F58] mb-1 flex items-center gap-2">
          <Activity size={14} className="text-[#FF8FAB]" /> 回撤曲线
          {(mainDdWindow?.hasDrawdown || subDdWindow?.hasDrawdown) && (
            <span className="text-[9px] px-2 py-0.5 bg-[#FFF0F5] text-[#FF8FAB] rounded-full border border-[#FFC2D1]">
              高亮最大回撤
            </span>
          )}
        </h3>
        <div className="flex-1 w-full min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartState?.chartData || []}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,182,193,0.2)" />
              <XAxis
                dataKey="t" type="number" scale="time" domain={safeXDomain}
                tick={false} axisLine={false} tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 9, fill: "#C5A0A6" }} axisLine={false} tickLine={false}
                width={40} domain={ddDomain} ticks={ddTicks}
                tickFormatter={formatPercentTick} tickCount={6}
              />
              <Tooltip
                labelFormatter={(t) => timeToDateStr(Number(t))}
                contentStyle={{
                  borderRadius: "12px", border: "none",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.05)",
                }}
                formatter={(v) => [`${Number(v).toFixed(2)}%`, "回撤"]}
              />
              <ReferenceLine y={0} stroke="rgba(255,182,193,0.35)" strokeDasharray="4 4" />
              {showMainDdArea && (
                <ReferenceArea
                  x1={dateToTime(mainDdWindow.peakDate)}
                  x2={dateToTime(mainDdWindow.troughDate)}
                  strokeOpacity={0} fill="var(--main-color)" fillOpacity={0.1}
                />
              )}
              {showSubDdArea && (
                <ReferenceArea
                  x1={dateToTime(subDdWindow.peakDate)}
                  x2={dateToTime(subDdWindow.troughDate)}
                  strokeOpacity={0} fill="var(--sub-color)" fillOpacity={0.1}
                />
              )}
              <Line
                type="step" dataKey="ddMain" stroke="var(--main-color)"
                strokeWidth={2} dot={false} isAnimationActive={false}
                className="transition-all-chart" strokeLinecap="round"
              />
              <Line
                type="step" dataKey="ddSub" stroke="var(--sub-color)"
                strokeWidth={2} dot={false} isAnimationActive={false}
                className="transition-all-chart" strokeOpacity={subAlpha} strokeLinecap="round"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 下方：资产走势 */}
      <div
        {...cardFXProps}
        style={{ flex: 1 - CHART_SPLIT }}
        className="backtest-chart-asset bg-white/60 backdrop-blur-xl border border-white/60 rounded-[24px] p-3 shadow-sm card-bloom relative flex flex-col min-h-0"
      >
        <div className="flex justify-between items-center mb-1">
          <h3 className="text-xs font-bold text-[#8B4F58] flex items-center gap-2">
            <TrendingUp size={14} className="text-[#FF8FAB]" /> 资产曲线
            <span className="text-[9px] px-2 py-0.5 bg-white/60 text-[#C5A0A6] rounded-full border border-white/70">
              {scaleMode === "log" ? "对数" : "线性"}
            </span>
          </h3>
          <div className="flex gap-2">
            {metricMode === "value" && (
              <div className="flex items-center gap-1 text-[9px] text-[#C5A0A6]">
                <span className="w-3 h-0.5 border-t border-dashed border-[#FFC2D1]"></span> 投入本金
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 w-full min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartState?.chartData || []}>
              <defs>
                <linearGradient id="gradMain" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--main-color)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#FFF0F5" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradSub" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--sub-color)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#F0F7FF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,182,193,0.2)" />
              <XAxis
                dataKey="t" type="number" scale="time" domain={safeXDomain}
                ticks={assetXTicks}
                tickFormatter={(t) => formatAdaptiveXTick(t, rangeMode)}
                tick={{ fontSize: 9, fill: "#C5A0A6" }}
                axisLine={false} tickLine={false} dy={10} minTickGap={30}
              />
              <YAxis
                type="number" tick={{ fontSize: 9, fill: "#C5A0A6" }}
                axisLine={false} tickLine={false} scale={scaleMode}
                domain={safeYDomain} ticks={chartYTicks}
                allowDataOverflow={scaleMode === "log"}
                tickFormatter={(v) =>
                  metricMode === "value"
                    ? (scaleMode === "linear" ? formatAssetTickPrecise(v) : formatAssetTick(v))
                    : formatPercentTick(v)
                }
                width={45}
              />
              <Tooltip
                content={
                  metricMode === "value"
                    ? <CustomValueTooltip viewMode={viewMode} theme={THEME} />
                    : <CustomReturnTooltip viewMode={viewMode} theme={THEME} />
                }
                cursor={{ stroke: "rgba(197,160,166,0.35)", strokeDasharray: "4 4" }}
              />
              {metricMode === "return" && (
                <ReferenceLine y={0} stroke="rgba(255,182,193,0.35)" strokeDasharray="4 4" />
              )}
              <Area
                type={scaleMode === "log" ? "linear" : "monotone"}
                dataKey="vMain" stroke="var(--main-color)" strokeWidth={3}
                fill="url(#gradMain)" isAnimationActive={false}
                className="transition-all-chart"
                baseValue={scaleMode === "log" ? LOG_EPS : 0}
                activeDot={{ r: 4, strokeWidth: 2 }}
              />
              <Area
                type={scaleMode === "log" ? "linear" : "monotone"}
                dataKey="vSub" stroke="var(--sub-color)" strokeWidth={3}
                fill="url(#gradSub)" isAnimationActive={false}
                className="transition-all-chart"
                strokeOpacity={subAlpha}
                fillOpacity={Math.min(1, 0.95 * subAlpha)}
                baseValue={scaleMode === "log" ? LOG_EPS : 0}
                activeDot={{ r: 4, strokeWidth: 2 }}
              />
              {metricMode === "value" && (
                <>
                  <Line
                    type={scaleMode === "log" ? "linear" : "monotone"}
                    dataKey="cMain" stroke="var(--main-color)" strokeWidth={1.5}
                    dot={false} strokeDasharray="6 6" strokeOpacity={0.6}
                    isAnimationActive={false} className="transition-all-chart"
                  />
                  <Line
                    type={scaleMode === "log" ? "linear" : "monotone"}
                    dataKey="cSub" stroke="var(--sub-color)" strokeWidth={1.5}
                    dot={false} strokeDasharray="6 6"
                    strokeOpacity={0.6 * subAlpha}
                    isAnimationActive={false} className="transition-all-chart"
                  />
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default ChartSection;
