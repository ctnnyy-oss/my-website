import { MS_DAY, RISK_FREE_RATE } from "../constants";
import { dateToTime } from "../utils/date";

export const calculateXIRR = (cashFlows) => {
  if (cashFlows.length < 2) return 0;

  const xnpv = (rate, flows) => {
    const t0 = dateToTime(flows[0].date);
    return flows.reduce((acc, cf) => {
      const days = (dateToTime(cf.date) - t0) / MS_DAY;
      return acc + cf.amount / Math.pow(1 + rate, days / 365);
    }, 0);
  };

  let rate = 0.1;
  let low = -0.99;
  let high = 10.0;
  for (let i = 0; i < 60; i++) {
    const npv = xnpv(rate, cashFlows);
    if (Math.abs(npv) < 1) break;
    if (npv > 0) low = rate;
    else high = rate;
    rate = (low + high) / 2;
  }
  return rate * 100;
};

export const calculateVolatility = (returns) => {
  if (returns.length < 2) return 0;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
  return Math.sqrt(variance * 252) * 100;
};

export const calculateSharpe = (returns, riskFree = RISK_FREE_RATE) => {
  if (returns.length < 2) return 0;
  const avgReturn = (returns.reduce((a, b) => a + b, 0) / returns.length) * 252;
  const vol = calculateVolatility(returns) / 100;
  return vol > 0 ? (avgReturn - riskFree) / vol : 0;
};

export const calcMaxDrawdownWindow = (curve) => {
  if (!curve || curve.length < 2) return null;

  let peakVal = curve[0].value;
  let peakIdx = 0;
  let maxDd = 0;
  let peakIdxAtMax = 0;
  let troughIdxAtMax = 0;

  for (let i = 0; i < curve.length; i++) {
    const v = curve[i].value;
    if (v >= peakVal) {
      peakVal = v;
      peakIdx = i;
    }
    const dd = peakVal > 0 ? ((v - peakVal) / peakVal) * 100 : 0;
    if (dd < maxDd) {
      maxDd = dd;
      peakIdxAtMax = peakIdx;
      troughIdxAtMax = i;
    }
  }

  if (Math.abs(maxDd) < 1e-10) {
    return {
      hasDrawdown: false,
      maxDd: 0,
      peakDate: curve[0].date,
      troughDate: curve[0].date,
      recoveryDate: curve[0].date,
      recoveryDays: 0,
    };
  }

  const peakDate = curve[peakIdxAtMax].date;
  const troughDate = curve[troughIdxAtMax].date;
  const peakLevel = curve[peakIdxAtMax].value;
  let recoveryDate = null;
  let recoveryDays = null;

  for (let j = troughIdxAtMax + 1; j < curve.length; j++) {
    if (curve[j].value >= peakLevel) {
      recoveryDate = curve[j].date;
      recoveryDays = Math.round((dateToTime(recoveryDate) - dateToTime(troughDate)) / MS_DAY);
      break;
    }
  }

  return { hasDrawdown: true, maxDd, peakDate, troughDate, recoveryDate, recoveryDays };
};
