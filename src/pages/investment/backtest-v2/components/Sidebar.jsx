import React, { useMemo } from "react";
import { ArrowLeft, Calendar, Layers, X } from "lucide-react";

import { THEME } from "../constants";

const SIDEBAR_WIDTH = 360;

const glassInput =
  "w-full bg-white/55 border border-white rounded-lg px-3 py-2 text-[13px] text-[#8B4F58] outline-none focus:ring-2 focus:ring-[#FFC2D1] focus:bg-white transition-all shadow-inner";

const Sidebar = ({
  onBack,
  cardFXProps,
  params,
  setParams,
  strategyMode,
  fundsA,
  setFundsA,
  fundsB,
  setFundsB,
  activeTab,
  setActiveTab,
  fundNames,
  onRunBacktest,
  loading,
  progress,
  progressPct,
}) => {
  const activeFunds = activeTab === "A" ? fundsA : fundsB;

  const activeWeightSum = useMemo(() => {
    const sum = activeFunds.reduce((acc, f) => acc + (Number(f.weight) || 0), 0);
    return Number.isFinite(sum) ? sum : 0;
  }, [activeFunds]);

  const weightOk = Math.abs(activeWeightSum - 100) < 1e-6;

  return (
    <aside
      className="h-full flex flex-col border-r border-white/40 bg-white/20 backdrop-blur-xl z-20 relative shadow-[4px_0_24px_rgba(255,182,193,0.1)]"
      style={{ width: SIDEBAR_WIDTH }}
    >
      {/* 顶部标题区 */}
      <div className="p-2 pb-0">
        <div
          {...cardFXProps}
          className="bg-white/60 border border-white/70 rounded-[26px] p-3 shadow-[0_10px_28px_rgba(255,182,193,0.16)] mb-2.5 card-bloom"
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <button
              onClick={onBack}
              className="ripple-button flex items-center gap-2 px-3 py-1.5 bg-white/80 backdrop-blur-md rounded-full shadow-sm text-[#8B4F58] font-bold hover:bg-white hover:text-[#FF8FAB] transition-all text-[13px]"
            >
              <ArrowLeft size={14} /> 返回主页
            </button>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 border border-white/80 text-[11px] font-bold text-[#8B4F58] shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#FF8FAB]"></span> 投资组合回测模型
            </div>
          </div>

          <div>
            <h1 className="relative text-[36px] font-black text-[#8B4F58] leading-none tracking-wide">
              <span className="relative z-10">双子星</span>
              <span className="absolute -bottom-1 left-0 h-2 w-[84px] rounded-full bg-[#FFB6C1]/45"></span>
            </h1>
            <div className="flex gap-2 mt-2 text-[11px] font-bold text-[#C5A0A6] tracking-tight">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF8FAB]"></span> 细水长流
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#89CFF0]"></span> 五等分
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 滚动设置区 */}
      <div className="flex-1 min-h-0 px-3.5 py-0 flex flex-col gap-2.5">
        {/* 1. 回测设定 */}
        <div
          {...cardFXProps}
          className="bg-white/40 border border-white/50 rounded-2xl p-2.5 shadow-sm backdrop-blur-md card-bloom"
        >
          <div className="flex items-center gap-2 mb-2 text-[#8B4F58] font-bold text-[14px]">
            <Calendar size={14} /> 回测设定
          </div>
          <div className="space-y-1.5">
            <div>
              <label className="text-[11px] font-bold text-[#C5A0A6] mb-1 block">开始日期</label>
              <input
                type="date"
                value={params.startDate}
                onChange={(e) => setParams({ ...params, startDate: e.target.value })}
                className={glassInput}
              />
            </div>
            {strategyMode === "lumpSum" ? (
              <div>
                <label className="text-[11px] font-bold text-[#C5A0A6] mb-1 block">初始本金</label>
                <input
                  type="number"
                  value={params.initialCapital}
                  onChange={(e) => setParams({ ...params, initialCapital: Number(e.target.value) })}
                  className={glassInput}
                />
              </div>
            ) : (
              <div>
                <label className="text-[11px] font-bold text-[#C5A0A6] mb-1 block">定投金额</label>
                <input
                  type="number"
                  step="0.01"
                  value={params.dailyAmount}
                  onChange={(e) => setParams({ ...params, dailyAmount: Number(e.target.value) })}
                  className={glassInput}
                />
              </div>
            )}
          </div>
        </div>

        {/* 2. 基金配置 */}
        <div
          {...cardFXProps}
          className="bg-white/40 border border-white/50 rounded-2xl p-2.5 shadow-sm backdrop-blur-md card-bloom flex flex-col flex-1 min-h-0"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-[#8B4F58] font-bold text-[14px]">
              <Layers size={14} /> 基金配置
            </div>
            <span
              className={`text-[11px] font-black px-2 py-0.5 rounded-full border ${
                weightOk
                  ? "bg-[#E0F7FA] text-[#00BCD4] border-[#B2EBF2]"
                  : "bg-[#FFEBEE] text-[#FF5252] border-[#FFCDD2]"
              }`}
            >
              {activeWeightSum.toFixed(0)}%
            </span>
          </div>

          <div className="flex bg-white/40 rounded-lg p-0.5 mb-2">
            <button
              onClick={() => setActiveTab("A")}
              className={`flex-1 py-1.5 rounded-md text-[11px] font-bold transition-all ${
                activeTab === "A" ? "bg-[#FF8FAB] text-white shadow-sm" : "text-[#C5A0A6]"
              }`}
            >
              细水长流
            </button>
            <button
              onClick={() => setActiveTab("B")}
              className={`flex-1 py-1.5 rounded-md text-[11px] font-bold transition-all ${
                activeTab === "B" ? "bg-[#89CFF0] text-white shadow-sm" : "text-[#C5A0A6]"
              }`}
            >
              五等分
            </button>
          </div>

          <div className="flex-1 min-h-0 flex flex-col">
            <div className="grid flex-1 grid-cols-2 gap-2 auto-rows-[minmax(62px,1fr)]">
              {activeFunds.map((fund, idx) => (
                <div
                  key={idx}
                  className="group relative bg-white/45 p-2 rounded-lg border border-white/50 hover:bg-white/70 transition-all"
                >
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-[11px] font-mono text-[#FFC2D1] w-4">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <input
                      value={fund.code}
                      onChange={(e) => {
                        const list = activeTab === "A" ? [...fundsA] : [...fundsB];
                        list[idx].code = e.target.value;
                        activeTab === "A" ? setFundsA(list) : setFundsB(list);
                      }}
                      className="flex-1 bg-transparent text-[12px] font-bold text-[#8B4F58] outline-none min-w-0"
                      placeholder="代码"
                    />
                    <div className="flex items-center gap-0.5">
                      <input
                        type="number"
                        value={fund.weight}
                        onChange={(e) => {
                          const list = activeTab === "A" ? [...fundsA] : [...fundsB];
                          list[idx].weight = Number(e.target.value);
                          activeTab === "A" ? setFundsA(list) : setFundsB(list);
                        }}
                        className="w-8 text-right bg-transparent text-[12px] font-bold text-[#8B4F58] outline-none"
                      />
                      <span className="text-[11px] text-[#C5A0A6]">%</span>
                    </div>
                  </div>
                  <div className="h-1 w-full bg-white/50 rounded-full overflow-hidden mb-1">
                    <div
                      className={`h-full ${activeTab === "A" ? "bg-[#FF8FAB]" : "bg-[#89CFF0]"}`}
                      style={{ width: `${Math.min(fund.weight, 100)}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-[#C5A0A6] truncate">
                    {fundNames[fund.code] || "未命名基金"}
                  </div>
                  <button
                    onClick={() => {
                      const list = activeTab === "A" ? [...fundsA] : [...fundsB];
                      const filtered = list.filter((_, i) => i !== idx);
                      activeTab === "A" ? setFundsA(filtered) : setFundsB(filtered);
                    }}
                    className="absolute -top-1 -right-1 p-1 bg-white rounded-full text-[#FF5D7D] shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 底部按钮区 */}
      <div className="p-3 pt-1.5 mt-2.5 bg-white/10 backdrop-blur-md">
        <button
          onClick={onRunBacktest}
          disabled={loading}
          className="ripple-button w-full py-2.5 rounded-xl font-black text-white text-[15px] shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center justify-center group relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #FF8FAB 0%, #FFB6C1 100%)" }}
        >
          <span className="z-10 relative">开启回测之旅</span>
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
        </button>

        {loading && (
          <div className="mt-2.5 px-1">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="truncate text-[11px] font-bold text-[#A9717C]">
                {progress || "正在准备获取数据..."}
              </span>
              <span className="text-[11px] font-black text-[#FF5D7D] tabular-nums">
                {Math.round(progressPct)}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full border border-white/70 bg-white/65 shadow-inner">
              <div
                className="h-full rounded-full transition-[width] duration-300 ease-out"
                style={{ width: `${progressPct}%`, background: THEME.colors.primaryGradient }}
              />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
