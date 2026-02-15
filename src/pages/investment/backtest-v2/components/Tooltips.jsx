import React from "react";

import { fmtMoney } from "../utils/format";

export const CustomValueTooltip = ({ active, payload, label, viewMode, theme }) => {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload || {};
  const showChg = (chg) => {
    const n = Number(chg);
    const v = Number.isFinite(n) ? n : 0;
    const sign = v >= 0 ? "+" : "";
    return `${sign}${v.toFixed(2)}%`;
  };
  const line = (title, value, chg, color) => (
    <div className="mt-2">
      <div className="font-black text-sm" style={{ color }}>
        {title}：{fmtMoney(value)}
      </div>
      <div className="text-[11px] font-bold text-[#C5A0A6] mt-1">当日涨跌：{showChg(chg)}</div>
    </div>
  );

  const isCompare = viewMode === "compare";
  const isSingleA = viewMode === "A";
  const isSingleB = viewMode === "B";

  return (
    <div className="px-4 py-3 rounded-2xl bg-white/92 backdrop-blur-xl border border-white/70 shadow-[0_14px_50px_rgba(255,143,171,0.20)]">
      <div className="text-sm font-black text-[#8B4F58] mb-1">{row.date || String(label)}</div>
      {isCompare && (
        <>
          {line("🌸 细水长流", row.vMain, row.chgMain, theme.colors.primary)}
          {line("❄️ 五等分", row.vSub, row.chgSub, theme.colors.secondary)}
        </>
      )}
      {isSingleA && line("🌸 细水长流", row.vMain, row.chgMain, theme.colors.primary)}
      {isSingleB && line("❄️ 五等分", row.vMain, row.chgMain, theme.colors.secondary)}
    </div>
  );
};

export const CustomReturnTooltip = ({ active, payload, label, viewMode, theme }) => {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload || {};
  const show = (v) => {
    const n = Number(v);
    const x = Number.isFinite(n) ? n : 0;
    const sign = x >= 0 ? "+" : "";
    return `${sign}${x.toFixed(2)}%`;
  };
  const isCompare = viewMode === "compare";
  const isSingleA = viewMode === "A";
  const isSingleB = viewMode === "B";

  return (
    <div className="px-4 py-3 rounded-2xl bg-white/92 backdrop-blur-xl border border-white/70 shadow-[0_14px_50px_rgba(255,143,171,0.20)]">
      <div className="text-sm font-black text-[#8B4F58] mb-2">{row.date || String(label)}</div>
      {isCompare && (
        <>
          <div className="font-black text-sm" style={{ color: theme.colors.primary }}>
            🌸 细水长流：{show(row.vMain)}
          </div>
          <div className="font-black text-sm mt-2" style={{ color: theme.colors.secondary }}>
            ❄️ 五等分：{show(row.vSub)}
          </div>
        </>
      )}
      {isSingleA && (
        <div className="font-black text-sm" style={{ color: theme.colors.primary }}>
          🌸 细水长流：{show(row.vMain)}
        </div>
      )}
      {isSingleB && (
        <div className="font-black text-sm" style={{ color: theme.colors.secondary }}>
          ❄️ 五等分：{show(row.vMain)}
        </div>
      )}
    </div>
  );
};
