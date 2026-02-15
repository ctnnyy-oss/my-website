import { MS_DAY, RANGE_OPTIONS, RISK_FREE_RATE } from "../constants";
import { dateToTime, parseDateUTC, timeToDateStr } from "../utils/date";
import { calculateSharpe, calculateVolatility, calculateXIRR } from "./metrics";

export const calculatePortfolio = (portfolioConfig, rawDataMap, params, mode, rangeMode, rangeOptions = RANGE_OPTIONS) => {
  const validFunds = portfolioConfig.filter((f) => rawDataMap[f.code]);
  if (validFunds.length === 0) return null;
  const validCodes = validFunds.map((f) => f.code);

  let maxMinTime = dateToTime(params.startDate);
  validCodes.forEach((code) => {
    const d = rawDataMap[code];
    if (d && d.length > 0) {
      const startT = dateToTime(d[0].date);
      if (startT > maxMinTime) maxMinTime = startT;
    }
  });

  const dateSet = new Set();
  validCodes.forEach((c) =>
    rawDataMap[c].forEach((d) => {
      if (dateToTime(d.date) >= maxMinTime) dateSet.add(d.date);
    }),
  );
  const sortedDates = Array.from(dateSet).sort((a, b) => dateToTime(a) - dateToTime(b));

  const lookup = {};
  validCodes.forEach((c) => {
    lookup[c] = {};
    rawDataMap[c].forEach((d) => {
      lookup[c][d.date] = d.nav;
    });
  });

  const lastNavs = {};
  validCodes.forEach((c) => {
    const arr = rawDataMap[c] || [];
    let bestTime = null;
    let bestNav;
    for (let i = 0; i < arr.length; i++) {
      const t = dateToTime(arr[i].date);
      if (t <= maxMinTime) {
        if (bestTime === null || t > bestTime) {
          bestTime = t;
          bestNav = arr[i].nav;
        }
      }
    }
    if (bestNav !== undefined) lastNavs[c] = bestNav;
  });

  const alignedData = [];
  sortedDates.forEach((date) => {
    const row = { date };
    validCodes.forEach((c) => {
      if (lookup[c][date] !== undefined) lastNavs[c] = lookup[c][date];
      row[c] = lastNavs[c];
    });
    if (validCodes.every((c) => row[c] !== undefined)) alignedData.push(row);
  });

  if (alignedData.length < 2) return null;

  const endTime = dateToTime(alignedData[alignedData.length - 1].date);
  const opt = rangeOptions.find((x) => x.key === rangeMode) || rangeOptions[rangeOptions.length - 1];
  let effectiveStartTime = dateToTime(alignedData[0].date);

  if (opt.days) {
    const rangeStartTime = endTime - opt.days * MS_DAY;
    if (rangeStartTime > effectiveStartTime) effectiveStartTime = rangeStartTime;
  }
  const slicedData = alignedData.filter((r) => dateToTime(r.date) >= effectiveStartTime);

  if (slicedData.length < 2) return null;

  const cashFlows = [];
  const curve = [];
  const dailyReturns = [];
  const shares = {};
  let totalInvested = 0;
  validCodes.forEach((c) => {
    shares[c] = 0;
  });

  const totalWeight = validFunds.reduce((a, b) => a + b.weight, 0);
  const getW = (c) => validFunds.find((f) => f.code === c).weight / totalWeight;

  const initialDate = slicedData[0].date;
  let lastMonth = parseDateUTC(initialDate).getUTCMonth();

  if (mode === "lumpSum") {
    const cap = Number(params.initialCapital || 0);
    if (cap > 0) {
      totalInvested += cap;
      cashFlows.push({ date: initialDate, amount: -cap });
      validCodes.forEach((c) => {
        const amt = cap * getW(c);
        shares[c] = amt / slicedData[0][c];
      });
    }
  }

  const dailyAmt = mode === "daily" ? Math.max(40, Number(params.dailyAmount || 0)) : 0;
  let units = totalInvested > 0 ? totalInvested : 0;
  let prevUnitNav = null;
  let peakValue = 0;

  slicedData.forEach((row, idx) => {
    const d = parseDateUTC(row.date);
    const m = d.getUTCMonth();
    const isRebalanceDay = m !== lastMonth && idx > 0;

    let currentTotalValue = 0;
    validCodes.forEach((c) => {
      currentTotalValue += shares[c] * row[c];
    });

    const unitNavBefore = units > 0 ? currentTotalValue / units : 1;

    let dailyInjection = 0;
    if (mode === "daily") {
      dailyInjection = dailyAmt;
      totalInvested += dailyInjection;
      cashFlows.push({ date: row.date, amount: -dailyInjection });
      units += dailyInjection / (unitNavBefore > 0 ? unitNavBefore : 1);
    }

    if (isRebalanceDay) {
      const targetTotal = currentTotalValue + dailyInjection;
      validCodes.forEach((c) => {
        const targetAmount = targetTotal * getW(c);
        shares[c] = targetAmount / row[c];
      });
    } else if (mode === "daily" && dailyInjection > 0) {
      validCodes.forEach((c) => {
        const amt = dailyInjection * getW(c);
        shares[c] += amt / row[c];
      });
    }

    currentTotalValue = 0;
    validCodes.forEach((c) => {
      currentTotalValue += shares[c] * row[c];
    });

    const unitNav = units > 0 ? currentTotalValue / units : 1;

    if (idx > 0 && prevUnitNav != null && prevUnitNav > 0) {
      dailyReturns.push((unitNav - prevUnitNav) / prevUnitNav);
    }
    prevUnitNav = unitNav;

    if (currentTotalValue > peakValue) peakValue = currentTotalValue;
    const drawdown = peakValue > 0 ? ((currentTotalValue - peakValue) / peakValue) * 100 : 0;

    curve.push({
      date: row.date,
      value: currentTotalValue,
      cost: totalInvested,
      unitNav,
      returnRate: totalInvested > 0 ? ((currentTotalValue - totalInvested) / totalInvested) * 100 : 0,
      drawdown,
    });

    lastMonth = m;
  });

  const finalVal = curve.length > 0 ? curve[curve.length - 1].value : 0;
  if (finalVal > 0) cashFlows.push({ date: curve[curve.length - 1].date, amount: finalVal });

  const volatility = calculateVolatility(dailyReturns);
  const sharpe = calculateSharpe(dailyReturns);
  const maxDrawdown = curve.length > 0 ? Math.min(...curve.map((d) => d.drawdown)) : 0;
  const totalReturn = totalInvested > 0 ? ((finalVal - totalInvested) / totalInvested) * 100 : 0;
  const irr = calculateXIRR(cashFlows);

  const avgDaily = dailyReturns.length > 0 ? dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length : 0;
  const annualReturn = avgDaily * 252;
  const rfDaily = RISK_FREE_RATE / 252;
  const downside = dailyReturns.map((r) => Math.min(0, r - rfDaily));
  const downsideVar = downside.length ? downside.reduce((a, b) => a + b * b, 0) / downside.length : 0;
  const downsideDev = downsideVar > 0 ? Math.sqrt(downsideVar) * Math.sqrt(252) : 0;
  const sortino = downsideDev > 0 ? (annualReturn - RISK_FREE_RATE) / downsideDev : 0;
  const maxDdAbs = Math.abs(maxDrawdown) / 100;
  const calmar = maxDdAbs > 0 ? annualReturn / maxDdAbs : 0;
  const realReturn = (annualReturn - 0.5 * Math.pow(volatility / 100, 2)) * 100;

  return { curve, metrics: { totalReturn, maxDrawdown, irr, volatility, sharpe, sortino, calmar, realReturn } };
};

export const fillCalendarDays = (series) => {
  if (!series || series.length === 0) return series;
  const map = new Map(series.map((r) => [r.date, r]));
  const start = series[0].date;
  const end = series[series.length - 1].date;

  const mergePreferGood = (base, patch) => {
    const out = { ...base };
    Object.keys(patch || {}).forEach((k) => {
      const v = patch[k];
      if (v === undefined || v === null) return;
      if (typeof v === "number" && !Number.isFinite(v)) return;
      out[k] = v;
    });
    return out;
  };

  const dense = [];
  let curT = dateToTime(start);
  const endT = dateToTime(end);
  let last = { ...series[0], t: Number(series[0]?.t) || dateToTime(series[0].date) };

  while (curT <= endT) {
    const cur = timeToDateStr(curT);
    const hit = map.get(cur);
    if (hit) {
      const merged = mergePreferGood(last, hit);
      merged.date = cur;
      merged.t = curT;
      last = merged;
      dense.push(merged);
    } else {
      dense.push({ ...last, date: cur, t: curT });
    }
    curT += MS_DAY;
  }
  return dense;
};
