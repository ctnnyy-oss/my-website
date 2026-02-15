import React, { useMemo } from "react";
import {
  ArrowUpRight,
  DollarSign,
  Flower,
  GitCompare,
  Layers,
  Percent,
  Snowflake,
  TrendingUp,
  Zap,
} from "lucide-react";

import { RANGE_OPTIONS, THEME } from "./constants";
import { useBacktest } from "./hooks/useBacktest";
import { useCardFX } from "./hooks/useCardFX";
import { useChartData } from "./hooks/useChartData";
import BackgroundBlobs from "./components/BackgroundBlobs";
import ChartSection from "./components/ChartSection";
import MetricsPanel from "./components/MetricsPanel";
import Sidebar from "./components/Sidebar";
import ToggleGroup from "./components/ToggleGroup";
import "./styles.css";

/**
 * 回测页面主组件 —— 三列布局
 *
 * 第一列：Sidebar（侧边栏）
 * 第二列：MetricsPanel（9个指标小卡片，独占一列，铺满高度）
 * 第三列：按钮区 + 图表区（回撤曲线 + 资产曲线）
 */
export default function BacktestV2({ onBack }) {
  // ==================== Hooks ====================
  const backtest = useBacktest();
  const cardFXProps = useCardFX();
  const {
    chartState, chartYTicks, ddTicks, ddDomain,
    ddWindows, mainDdWindow, subDdWindow,
  } = useChartData(
    backtest.results,
    backtest.viewMode,
    backtest.metricMode,
    backtest.scaleMode,
    backtest.rangeMode,
  );

  // ==================== 动态主题色 ====================
  const dynamicStyles = useMemo(() => {
    const mainColor = backtest.viewMode === "B" ? THEME.colors.secondary : THEME.colors.primary;
    return { "--main-color": mainColor, "--sub-color": THEME.colors.secondary };
  }, [backtest.viewMode]);

  // ==================== 渲染 ====================
  return (
    <div
      className="h-screen w-screen overflow-hidden flex font-sans selection:bg-[#FFC2D1] selection:text-[#8B4F58]"
      style={{ background: "#FFF0F5", ...dynamicStyles }}
    >
      <BackgroundBlobs />
      <div className="fixed inset-0 pointer-events-none z-[1] noise-overlay"></div>
      <div className="fixed inset-0 pointer-events-none z-[2] vignette"></div>

      {/* 吐司提示 */}
      {backtest.toast && (
        <div
          className="toast-bounce fixed top-5 left-1/2 -translate-x-1/2 z-[999] px-5 py-2 rounded-full shadow-[0_12px_40px_rgba(255,143,171,0.25)] backdrop-blur-xl border border-white/60"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,143,171,0.85) 0%, rgba(255,194,209,0.85) 100%)",
          }}
        >
          <span className="text-sm font-black text-white drop-shadow-sm">{backtest.toast}</span>
        </div>
      )}

      {/* ===== 第一列：侧边栏 ===== */}
      <Sidebar
        onBack={onBack}
        cardFXProps={cardFXProps}
        params={backtest.params}
        setParams={backtest.setParams}
        strategyMode={backtest.strategyMode}
        fundsA={backtest.fundsA}
        setFundsA={backtest.setFundsA}
        fundsB={backtest.fundsB}
        setFundsB={backtest.setFundsB}
        activeTab={backtest.activeTab}
        setActiveTab={backtest.setActiveTab}
        fundNames={backtest.fundNames}
        onRunBacktest={backtest.runBacktest}
        loading={backtest.loading}
        progress={backtest.progress}
        progressPct={backtest.progressPct}
      />

      {/* ===== 第二列：9个指标小卡片（独占一列，铺满高度） ===== */}
      {backtest.results && (
        <div className="relative z-10 py-2 pl-2">
          <MetricsPanel
            results={backtest.results}
            viewMode={backtest.viewMode}
            ddWindows={ddWindows}
            cardFXProps={cardFXProps}
          />
        </div>
      )}

      {/* ===== 第三列：按钮区 + 图表 ===== */}
      <main className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* 顶栏按钮区 */}
        <header className="h-[58px] flex items-center px-5 bg-white/30 backdrop-blur-sm border-b border-white/40">
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* 回测区间 */}
            <div className="flex items-center bg-white/50 p-1 rounded-xl shadow-inner">
              <span className="px-2 text-[10px] font-bold text-[#C5A0A6]">区间</span>
              <div className="flex gap-1">
                {RANGE_OPTIONS.map((opt) => {
                  const active = backtest.rangeMode === opt.key;
                  return (
                    <button
                      key={opt.key}
                      onClick={() => backtest.setRangeMode(opt.key)}
                      className={`ripple-button px-2 py-1 rounded-lg text-[10px] font-bold transition-all border ${
                        active
                          ? "text-white border-white/70 shadow-sm"
                          : "text-[#8B4F58]/60 border-transparent hover:bg-white/40"
                      }`}
                      style={{
                        background: active
                          ? THEME.colors.primaryGradient
                          : "rgba(255,255,255,0.25)",
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 视图模式 */}
            <div className="flex bg-white/50 p-1 rounded-xl shadow-inner">
              {[
                { id: "compare", label: "对比", icon: GitCompare, color: "#BFAFB2" },
                { id: "A", label: "细水长流", icon: Flower, color: "#FF8FAB" },
                { id: "B", label: "五等分", icon: Snowflake, color: "#89CFF0" },
              ].map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => backtest.setViewMode(mode.id)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold flex items-center gap-2 transition-all ${
                    backtest.viewMode === mode.id
                      ? "bg-white text-[#8B4F58] shadow-sm"
                      : "text-[#C5A0A6] hover:bg-white/30"
                  }`}
                >
                  <mode.icon
                    size={11}
                    color={backtest.viewMode === mode.id ? mode.color : "currentColor"}
                  />{" "}
                  {mode.label}
                </button>
              ))}
            </div>

            {/* 指标 & 坐标 & 策略切换 */}
            <div className="flex items-center gap-2.5 bg-white/40 px-2.5 py-0.5 rounded-2xl border border-white/50 shadow-sm backdrop-blur-md">
              <ToggleGroup
                value={backtest.metricMode}
                onChange={backtest.setMetricMode}
                options={[
                  { value: "value", label: "资产", icon: DollarSign },
                  { value: "return", label: "收益", icon: Percent },
                ]}
              />
              <div className="w-[1px] h-3 bg-[#C5A0A6]/30 mx-1"></div>
              <ToggleGroup
                value={backtest.scaleMode}
                onChange={backtest.setScaleMode}
                options={[
                  { value: "linear", label: "线性", icon: TrendingUp },
                  { value: "log", label: "对数", icon: Zap, disabled: backtest.metricMode !== "value" },
                ]}
              />
              <div className="w-[1px] h-3 bg-[#C5A0A6]/30 mx-1"></div>
              <ToggleGroup
                value={backtest.strategyMode}
                onChange={backtest.setStrategyMode}
                options={[
                  { value: "daily", label: "定投", icon: Layers },
                  { value: "lumpSum", label: "梭哈", icon: ArrowUpRight },
                ]}
              />
            </div>
          </div>
        </header>

        {/* 图表区域 */}
        {!backtest.results ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
            {backtest.error && (
              <div className="px-4 py-2 bg-red-50 text-red-400 text-xs rounded-lg border border-red-100 animate-pulse">
                {backtest.error}
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 min-h-0 p-2 overflow-hidden flex flex-col">
            <ChartSection
              chartState={chartState}
              scaleMode={backtest.scaleMode}
              metricMode={backtest.metricMode}
              viewMode={backtest.viewMode}
              ddDomain={ddDomain}
              ddTicks={ddTicks}
              chartYTicks={chartYTicks}
              mainDdWindow={mainDdWindow}
              subDdWindow={subDdWindow}
              cardFXProps={cardFXProps}
            />
          </div>
        )}
      </main>
    </div>
  );
}
