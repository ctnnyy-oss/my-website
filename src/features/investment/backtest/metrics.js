import { MS_DAY } from "./constants.js";
import { dateToTime } from "./date.js";

// XIRR（不等间隔现金流内部收益率）
export const calculateXIRR = (cashFlows) => {
  if (!cashFlows || cashFlows.length < 2) return 0;

  const xnpv = (rate, flows) => {
    const t0 = dateToTime(flows[0].date);
    let sum = 0;
    for (const cf of flows) {
      const days = (dateToTime(cf.date) - t0) / MS_DAY;
      sum += cf.amount / Math.pow(1 + rate, days / 365);
    }
    return sum;
  };

  // 牛顿法（Newton）
  let rate = 0.1;
  for (let i = 0; i < 50; i++) {
    const f = xnpv(rate, cashFlows);
    const dRate = 1e-6;
    const f2 = xnpv(rate + dRate, cashFlows);
    const deriv = (f2 - f) / dRate;
    if (!Number.isFinite(deriv) || Math.abs(deriv) < 1e-12) break;
    const newRate = rate - f / deriv;
    if (!Number.isFinite(newRate)) break;
    if (Math.abs(newRate - rate) < 1e-7) {
      rate = newRate;
      break;
    }
    rate = newRate;
  }
  return Number.isFinite(rate) ? rate * 100 : 0;
};

export const calculateVolatility = (returns) => {
  if (!returns || returns.length === 0) return 0;
  const avg = returns.reduce((a, b) => a + b, 0) / returns.length;
  const varr =
    returns.reduce((acc, r) => acc + (r - avg) * (r - avg), 0) / returns.length;
  // 年化波动：sqrt(252)
  return Math.sqrt(varr) * Math.sqrt(252) * 100;
};

export const calculateSharpe = (returns, riskFree = 0.02) => {
  if (!returns || returns.length === 0) return 0;
  const avg = returns.reduce((a, b) => a + b, 0) / returns.length;
  const vol = calculateVolatility(returns) / 100;
  if (!Number.isFinite(vol) || vol <= 0) return 0;
  const annRet = avg * 252;
  return (annRet - riskFree) / vol;
};

/**
 * 最大回撤区间（用于图上阴影标注）
 * 输入 curve: [{date, value, ...}]
 * 输出 {startIdx, endIdx, startDate, endDate, peak, trough, drawdownPct}
 */
export const calcMaxDrawdownWindow = (curve) => {
  if (!curve || curve.length < 2) return null;
  let peak = curve[0].value;
  let peakIdx = 0;

  let maxDD = 0;
  let startIdx = 0;
  let endIdx = 1;
  let trough = curve[1].value;

  for (let i = 1; i < curve.length; i++) {
    const v = curve[i].value;
    if (v > peak) {
      peak = v;
      peakIdx = i;
      continue;
    }
    const dd = peak > 0 ? (v - peak) / peak : 0;
    if (dd < maxDD) {
      maxDD = dd;
      startIdx = peakIdx;
      endIdx = i;
      trough = v;
    }
  }

  return {
    startIdx,
    endIdx,
    startDate: curve[startIdx]?.date,
    endDate: curve[endIdx]?.date,
    peak,
    trough,
    drawdownPct: maxDD * 100,
  };
};
