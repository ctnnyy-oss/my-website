import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Area, ComposedChart, ReferenceArea, ReferenceLine
} from 'recharts';
import {
  Play, TrendingUp, DollarSign,
  Calendar, Activity, Layers, Percent, X,
  Sparkles, ArrowUpRight, ShieldCheck, Flower,
  GitCompare, Snowflake, BarChart2, Scale, Zap, ArrowLeft,
  RotateCcw, Trash2
} from 'lucide-react';

const THEME = {
  colors: {
    primary: '#FF9AB8',
    primarySoft: '#FFE1EC',
    primaryGradient: 'linear-gradient(135deg, #FFD6E6 0%, #FF9AB8 60%, #FF7EA9 100%)',
    secondary: '#A7C5EB',
    secondarySoft: '#E3EDFF',
    secondaryGradient: 'linear-gradient(135deg, #E3EDFF 0%, #A7C5EB 100%)',
    textMain: '#7A3B4A',
    textLight: '#B58A97',
    bgGradient: 'linear-gradient(180deg, #FFF7FA 0%, #FFF1F6 100%)',
  }
};

const LOG_EPS = 0.01;
const DEFAULT_START_DATE = '2020-01-01';
const DEFAULT_CONFIG_A = [
  { code: '001021', weight: 20 }, { code: '161119', weight: 20 },
  { code: '001512', weight: 20 }, { code: '008701', weight: 10 },
  { code: '017641', weight: 7.5 }, { code: '023917', weight: 7.5 },
  { code: '000369', weight: 7.5 }, { code: '539003', weight: 2.5 },
  { code: '021539', weight: 2.5 }, { code: '020712', weight: 2.5 }
];
const DEFAULT_CONFIG_B = [
  { code: '161128', weight: 20 }, { code: '017091', weight: 20 },
  { code: '021482', weight: 20 }, { code: '023917', weight: 20 },
  { code: '000369', weight: 20 },
];

const RANGE_OPTIONS = [
  { key: '1m', label: '近1月', days: 30 },
  { key: '6m', label: '近半年', days: 182 },
  { key: '1y', label: '近1年', days: 365 },
  { key: '3y', label: '近3年', days: 365 * 3 },
  { key: '5y', label: '近5年', days: 365 * 5 },
  { key: 'since', label: '成立来', days: null },
];

const MS_DAY = 24 * 60 * 60 * 1000;
const parseDateUTC = (dateStr) => new Date(`${dateStr}T00:00:00Z`);
const dateToTime = (dateStr) => parseDateUTC(dateStr).getTime();
const timeToDateStr = (t) => new Date(t).toISOString().slice(0, 10);

const CN_DATE_FMT = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit'
});
const tsToCNDateStr = (ts) => CN_DATE_FMT.format(new Date(ts));

const validateFundCode = (code) => /^\d{6}$/.test(code.trim());
const validateDate = (dateStr) => {
  const t = dateToTime(dateStr);
  return Number.isFinite(t) && t < Date.now();
};

const fmtMoney = (v) => `¥${Math.round(Number(v) || 0).toLocaleString()}`;

const formatAssetTick = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return '';
  const abs = Math.abs(n);
  if (abs < 1000) return `${Math.round(n)}`;
  if (abs >= 10000) {
    if (abs < 20000) return `${Math.round(n).toLocaleString()}`;
    const w = n / 10000;
    if (Math.abs(w) >= 100) return `${w.toFixed(0)}万`;
    return `${w.toFixed(1)}万`;
  }
  return `${(n / 1000).toFixed(0)}k`;
};

const formatPercentTick = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return '';
  const x = Math.abs(n) < 1e-9 ? 0 : n;
  const abs = Math.abs(x);
  if (abs >= 10) return `${x.toFixed(0)}%`;
  if (abs >= 1) return `${x.toFixed(1)}%`;
  return `${x.toFixed(2)}%`;
};

const BackgroundBlobs = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
    <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-[#FFDEE9] rounded-full mix-blend-multiply filter blur-[120px] opacity-60 animate-blob-breathe"></div>
    <div className="absolute top-[10%] right-[-10%] w-[50%] h-[50%] bg-[#E0F7FA] rounded-full mix-blend-multiply filter blur-[120px] opacity-50 animate-blob-breathe animation-delay-2000"></div>
    <div className="absolute bottom-[-20%] left-[20%] w-[60%] h-[60%] bg-[#F8C8DC] rounded-full mix-blend-multiply filter blur-[100px] opacity-40 animate-blob-breathe animation-delay-4000"></div>
  </div>
);

const ToggleGroup = ({ options, value, onChange }) => (
  <div className="bg-white/40 p-1 rounded-2xl flex border border-white/60 backdrop-blur-md">
    {options.map((opt) => {
      const active = value === opt.value;
      const disabled = !!opt.disabled;
      return (
        <button
          key={opt.value}
          disabled={disabled}
          onClick={() => { if (!disabled) onChange(opt.value); }}
          className={`ripple-button flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] relative overflow-hidden group
            ${disabled ? 'text-[#7A3B4A]/30 cursor-not-allowed opacity-60' : (active ? 'text-white shadow-lg transform scale-[1.03]' : 'text-[#7A3B4A]/60 hover:text-[#FF8596] hover:bg-white/40')}`}
          style={{
            background: (!disabled && active) ? (opt.activeGradient || THEME.colors.primaryGradient) : 'transparent',
            boxShadow: (!disabled && active) ? '0 6px 16px rgba(255, 153, 168, 0.32)' : 'none'
          }}
        >
          {opt.icon && <opt.icon size={14} strokeWidth={2.5} className="relative z-10" />}
          <span className="truncate relative z-10">{opt.label}</span>
        </button>
      );
    })}
  </div>
);

const calculateXIRR = (cashFlows) => {
  if (cashFlows.length < 2) return 0;
  const xnpv = (rate, flows) => {
    const t0 = dateToTime(flows[0].date);
    return flows.reduce((acc, cf) => {
      const days = (dateToTime(cf.date) - t0) / MS_DAY;
      return acc + cf.amount / Math.pow(1 + rate, days / 365);
    }, 0);
  };
  let rate = 0.1, low = -0.99, high = 10.0;
  for (let i = 0; i < 60; i++) {
    const npv = xnpv(rate, cashFlows);
    if (Math.abs(npv) < 1) break;
    if (npv > 0) low = rate; else high = rate;
    rate = (low + high) / 2;
  }
  return rate * 100;
};

const calculateVolatility = (returns) => {
  if (returns.length < 2) return 0;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
  return Math.sqrt(variance * 252) * 100;
};

const calculateSharpe = (returns, riskFree = 0.02) => {
  if (returns.length < 2) return 0;
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length * 252;
  const vol = calculateVolatility(returns) / 100;
  return vol > 0 ? (avgReturn - riskFree) / vol : 0;
};

const calcMaxDrawdownWindow = (curve) => {
  if (!curve || curve.length < 2) return null;
  let peakVal = curve[0].value, peakIdx = 0;
  let maxDd = 0, peakIdxAtMax = 0, troughIdxAtMax = 0;
  for (let i = 0; i < curve.length; i++) {
    const v = curve[i].value;
    if (v >= peakVal) { peakVal = v; peakIdx = i; }
    const dd = peakVal > 0 ? ((v - peakVal) / peakVal) * 100 : 0;
    if (dd < maxDd) { maxDd = dd; peakIdxAtMax = peakIdx; troughIdxAtMax = i; }
  }
  if (Math.abs(maxDd) < 1e-10) {
    return { hasDrawdown: false, maxDd: 0, peakDate: curve[0].date, troughDate: curve[0].date, recoveryDate: curve[0].date, recoveryDays: 0 };
  }
  const peakDate = curve[peakIdxAtMax].date, troughDate = curve[troughIdxAtMax].date, peakLevel = curve[peakIdxAtMax].value;
  let recoveryDate = null, recoveryDays = null;
  for (let j = troughIdxAtMax + 1; j < curve.length; j++) {
    if (curve[j].value >= peakLevel) {
      recoveryDate = curve[j].date;
      recoveryDays = Math.round((dateToTime(recoveryDate) - dateToTime(troughDate)) / MS_DAY);
      break;
    }
  }
  return { hasDrawdown: true, maxDd, peakDate, troughDate, recoveryDate, recoveryDays };
};

const easeOutElastic = (t) => {
  const c4 = (2 * Math.PI) / 3;
  return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
};

const useTweenNumber = (target, duration = 680) => {
  const [val, setVal] = useState(() => (Number.isFinite(Number(target)) ? Number(target) : target));
  const rafRef = useRef(null);
  const fromRef = useRef(Number.isFinite(Number(target)) ? Number(target) : 0);
  const lastTargetRef = useRef(target);

  useEffect(() => {
    const isNum = Number.isFinite(Number(target));
    if (!isNum) { setVal(target); lastTargetRef.current = target; return; }
    const to = Number(target);
    const from = Number.isFinite(Number(lastTargetRef.current)) ? Number(lastTargetRef.current) : fromRef.current;
    lastTargetRef.current = to;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const start = performance.now();
    fromRef.current = from;
    const step = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const e = easeOutElastic(p);
      const cur = from + (to - from) * e;
      setVal(cur);
      if (p < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);
  return val;
};

const AnimatedValue = ({ value, formatter, duration = 680, className = "" }) => {
  const isNum = Number.isFinite(Number(value));
  const v = useTweenNumber(value, duration);
  if (!isNum) return <span className={className}>{formatter ? formatter(value) : String(value)}</span>;
  const out = formatter ? formatter(v) : String(v);
  return <span className={className}>{out}</span>;
};

export default function Backtest({ onBack }) {
  const [fundsA, setFundsA] = useState(DEFAULT_CONFIG_A);
  const [fundsB, setFundsB] = useState(DEFAULT_CONFIG_B);
  const [params, setParams] = useState(() => {
    const fallback = { schemaVersion: 2, startDate: DEFAULT_START_DATE, initialCapital: 10000, dailyAmount: 40 };
    try {
      const saved = localStorage.getItem('backtestParams_daily_v1');
      const parsed = saved ? JSON.parse(saved) : null;
      const merged = { ...fallback, ...(parsed || {}) };
      if (!parsed?.schemaVersion && merged.startDate === '2022-01-01') merged.startDate = DEFAULT_START_DATE;
      if (!merged.startDate || !validateDate(merged.startDate)) merged.startDate = DEFAULT_START_DATE;
      merged.schemaVersion = 2;
      return merged;
    } catch { return fallback; }
  });
  const [rangeMode, setRangeMode] = useState(() => {
    try { const saved = localStorage.getItem('backtestRangeMode_v1'); return saved || 'since'; }
    catch { return 'since'; }
  });
  const [activeTab, setActiveTab] = useState('A');
  const [viewMode, setViewMode] = useState('compare');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [progressRatio, setProgressRatio] = useState(0);
  const [error, setError] = useState(null);
  const [rawDataMap, setRawDataMap] = useState(null);
  const [fundNames, setFundNames] = useState({});
  const [strategyMode, setStrategyMode] = useState('daily');
  const [metricMode, setMetricMode] = useState('value');
  const [scaleMode, setScaleMode] = useState('linear');

  // ✅ 更丝滑：残影层（ghost layer，残影层）
  const [uiSwitching, setUiSwitching] = useState(false);
  const [displayResults, setDisplayResults] = useState(null);
  const [ghostResults, setGhostResults] = useState(null);
  const displayResultsRef = useRef(null);
  const switchTimerRef = useRef({ t1: null, t2: null });
  const [toast, setToast] = useState(null);
  const [chartTab, setChartTab] = useState('value'); // value | drawdown
  const [showSheet, setShowSheet] = useState(false); // mobile bottom sheet for holdings
  const toastTimerRef = useRef(null);

  const showToast = (msg) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2200);
  };

  useEffect(() => {
    displayResultsRef.current = displayResults;
  }, [displayResults]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (switchTimerRef.current.t1) clearTimeout(switchTimerRef.current.t1);
      if (switchTimerRef.current.t2) clearTimeout(switchTimerRef.current.t2);
    };
  }, []);

  useEffect(() => { try { localStorage.setItem('backtestParams_daily_v1', JSON.stringify(params)); } catch { } }, [params]);
  useEffect(() => { try { localStorage.setItem('backtestRangeMode_v1', rangeMode); } catch { } }, [rangeMode]);
  useEffect(() => { if (metricMode !== 'value' && scaleMode === 'log') setScaleMode('linear'); }, [metricMode, scaleMode]);

  // ✅ hover 的 qq 弹弹：把 scale / lift 合并进同一个 transform（否则会被 JS transform 覆盖）
  const handleCardMouseEnter = (e) => {
    const el = e.currentTarget;
    el.dataset.hovering = '1';
    el.classList.add('card-pop-in');
    el.style.transform = 'translateY(-2px) scale(1.015)';
    if (el.__popTimer) clearTimeout(el.__popTimer);
    el.__popTimer = setTimeout(() => el.classList.remove('card-pop-in'), 520);
  };

  const handleCardMouseLeave = (e) => {
    const el = e.currentTarget;
    el.dataset.hovering = '0';
    el.style.transform = 'translateY(0) scale(1)';
  };

  const cardFXProps = { onMouseEnter: handleCardMouseEnter, onMouseLeave: handleCardMouseLeave };

  // ✅ ripple：点到按钮内部元素也能触发
  useEffect(() => {
    const handleRipple = (e) => {
      const button = e.target.closest?.('.ripple-button');
      if (!button) return;
      const rect = button.getBoundingClientRect();
      const x = e.clientX - rect.left, y = e.clientY - rect.top;
      const ripple = document.createElement('span');
      ripple.className = 'ripple-effect';
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      button.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    };
    document.addEventListener('click', handleRipple);
    return () => document.removeEventListener('click', handleRipple);
  }, []);

  const handleResetDefaults = () => {
    setFundsA(DEFAULT_CONFIG_A); setFundsB(DEFAULT_CONFIG_B);
    setParams({ schemaVersion: 2, startDate: DEFAULT_START_DATE, initialCapital: 10000, dailyAmount: 40 });
    setRangeMode('since'); setActiveTab('A'); setViewMode('compare');
    setStrategyMode('daily'); setMetricMode('value'); setScaleMode('linear');
    setError(null); setRawDataMap(null); setFundNames({}); setProgressRatio(0);
    setDisplayResults(null); setGhostResults(null);
    showToast('已恢复默认配置 💗');
  };

  const handleClearResults = () => {
    setRawDataMap(null); setError(null); setProgressRatio(0);
    setDisplayResults(null); setGhostResults(null);
    showToast('已清空回测结果 ✨');
  };

  const fetchOneFund = (code) => {
    return new Promise((resolve, reject) => {
      const scriptId = `script-${code}`;
      const oldScript = document.getElementById(scriptId);
      if (oldScript) oldScript.remove();
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://fund.eastmoney.com/pingzhongdata/${code}.js?t=${new Date().getTime()}`;
      script.onload = () => {
        if (window.Data_netWorthTrend) {
          const rawData = window.Data_netWorthTrend;
          const name = window.fS_name || "未知基金";
          let shareMultiplier = 1.0;
          const formatted = rawData.map(item => {
            const nav = Number(item.y);
            const date = tsToCNDateStr(item.x);
            let dividend = 0;
            if (item.unitMoney && typeof item.unitMoney === 'string') {
              const match = item.unitMoney.match(/派现金(\d+(\.\d+)?)元/);
              if (match) dividend = parseFloat(match[1]);
            }
            if (dividend > 0 && nav > 0) shareMultiplier *= (1 + dividend / nav);
            return { date, nav: nav * shareMultiplier };
          });
          window.Data_netWorthTrend = undefined;
          window.fS_name = undefined;
          document.getElementById(scriptId)?.remove();
          resolve({ data: formatted, name });
        } else reject('无数据');
      };
      script.onerror = () => reject('网络错误');
      document.head.appendChild(script);
    });
  };

  const runBacktest = async () => {
    if (!validateDate(params.startDate)) return setError('日期格式不对哦~');
    setLoading(true); setError(null); setProgressRatio(0);
    const allCodes = new Set([...fundsA, ...fundsB].filter(f => f.code && validateFundCode(f.code)).map(f => f.code));
    try {
      const fetchedData = {}, fetchedNames = {}, codes = Array.from(allCodes);
      for (let i = 0; i < codes.length; i++) {
        setProgress(`正在获取 ${codes[i]} (${i + 1}/${codes.length})...`);
        setProgressRatio((i + 1) / Math.max(1, codes.length));
        try {
          const res = await fetchOneFund(codes[i]);
          fetchedData[codes[i]] = res.data;
          fetchedNames[codes[i]] = res.name;
        } catch (e) { console.warn(e); }
        await new Promise(r => setTimeout(r, 200));
      }
      setRawDataMap(fetchedData);
      setFundNames(fetchedNames);
      showToast('回测完成啦～✨');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); setProgress(''); setProgressRatio(0); }
  };

  // ✅ 统一起点：两个组合所有基金里“最晚成立（成立最短）”作为共同起点
  const computeGlobalStartTime = (rawDataMap, fundsA, fundsB, startDate) => {
    const startT = dateToTime(startDate);
    if (!rawDataMap) return startT;

    const all = [...(fundsA || []), ...(fundsB || [])]
      .filter(f => f?.code && validateFundCode(f.code))
      .map(f => f.code);

    const uniq = Array.from(new Set(all));
    let latestFirst = startT;

    uniq.forEach(code => {
      const arr = rawDataMap[code];
      if (arr && arr.length > 0) {
        const t0 = dateToTime(arr[0].date);
        if (Number.isFinite(t0) && t0 > latestFirst) latestFirst = t0;
      }
    });

    return latestFirst;
  };

  const calculatePortfolio = (portfolioConfig, rawDataMap, params, mode, rangeMode, globalStartTime) => {
    const validFunds = portfolioConfig.filter(f => rawDataMap[f.code]);
    if (validFunds.length === 0) return null;
    const validCodes = validFunds.map(f => f.code);

    // ✅ 先用全局共同起点，再确保不早于本组合最晚成立
    let maxMinTime = Math.max(dateToTime(params.startDate), Number.isFinite(globalStartTime) ? globalStartTime : -Infinity);
    validCodes.forEach(code => {
      const d = rawDataMap[code];
      if (d && d.length > 0) {
        const startT = dateToTime(d[0].date);
        if (startT > maxMinTime) maxMinTime = startT;
      }
    });

    const dateSet = new Set();
    validCodes.forEach(c => rawDataMap[c].forEach(d => {
      if (dateToTime(d.date) >= maxMinTime) dateSet.add(d.date);
    }));
    const sortedDates = Array.from(dateSet).sort((a, b) => dateToTime(a) - dateToTime(b));

    const lookup = {};
    validCodes.forEach(c => {
      lookup[c] = {};
      rawDataMap[c].forEach(d => lookup[c][d.date] = d.nav);
    });

    const lastNavs = {};
    validCodes.forEach(c => {
      const arr = rawDataMap[c] || [];
      let bestTime = null, bestNav = undefined;
      for (let i = 0; i < arr.length; i++) {
        const t = dateToTime(arr[i].date);
        if (t <= maxMinTime) {
          if (bestTime === null || t > bestTime) { bestTime = t; bestNav = arr[i].nav; }
        }
      }
      if (bestNav !== undefined) lastNavs[c] = bestNav;
    });

    const alignedData = [];
    sortedDates.forEach(date => {
      const row = { date };
      validCodes.forEach(c => {
        if (lookup[c][date] !== undefined) lastNavs[c] = lookup[c][date];
        row[c] = lastNavs[c];
      });
      if (validCodes.every(c => row[c] !== undefined)) alignedData.push(row);
    });
    if (alignedData.length < 2) return null;

    const endTime = dateToTime(alignedData[alignedData.length - 1].date);
    const opt = RANGE_OPTIONS.find(x => x.key === rangeMode) || RANGE_OPTIONS[RANGE_OPTIONS.length - 1];
    let effectiveStartTime = dateToTime(alignedData[0].date);
    if (opt.days) {
      const rangeStartTime = endTime - opt.days * MS_DAY;
      if (rangeStartTime > effectiveStartTime) effectiveStartTime = rangeStartTime;
    }
    const slicedData = alignedData.filter(r => dateToTime(r.date) >= effectiveStartTime);
    if (slicedData.length < 2) return null;

    const cashFlows = [], curve = [], dailyReturns = [];
    let shares = {}, totalInvested = 0;
    validCodes.forEach(c => shares[c] = 0);

    const totalWeight = validFunds.reduce((a, b) => a + b.weight, 0);
    const getW = (c) => (validFunds.find(f => f.code === c).weight / totalWeight);

    const initialDate = slicedData[0].date;
    let lastMonth = parseDateUTC(initialDate).getUTCMonth();

    if (mode === 'lumpSum') {
      const cap = Number(params.initialCapital || 0);
      if (cap > 0) {
        totalInvested += cap;
        cashFlows.push({ date: initialDate, amount: -cap });
        validCodes.forEach(c => { const amt = cap * getW(c); shares[c] = amt / slicedData[0][c]; });
      }
    }

    const dailyAmt = mode === 'daily' ? Math.max(40, Number(params.dailyAmount || 0)) : 0;
    let units = totalInvested > 0 ? totalInvested : 0;
    let prevUnitNav = null, peakValue = 0;

    slicedData.forEach((row, idx) => {
      const d = parseDateUTC(row.date), m = d.getUTCMonth();
      const isRebalanceDay = (m !== lastMonth) && idx > 0;

      let currentTotalValue = 0;
      validCodes.forEach(c => currentTotalValue += shares[c] * row[c]);

      const unitNavBefore = units > 0 ? (currentTotalValue / units) : 1;

      let dailyInjection = 0;
      if (mode === 'daily') {
        dailyInjection = dailyAmt;
        totalInvested += dailyInjection;
        cashFlows.push({ date: row.date, amount: -dailyInjection });
        units += dailyInjection / (unitNavBefore > 0 ? unitNavBefore : 1);
      }

      // ✅ “梭哈也要月度再平衡”：这里保持对 daily / lumpSum 都生效
      if (isRebalanceDay) {
        const targetTotal = currentTotalValue + dailyInjection;
        validCodes.forEach(c => { const targetAmount = targetTotal * getW(c); shares[c] = targetAmount / row[c]; });
      } else {
        if (mode === 'daily' && dailyInjection > 0) {
          validCodes.forEach(c => { const amt = dailyInjection * getW(c); shares[c] += amt / row[c]; });
        }
      }

      currentTotalValue = 0;
      validCodes.forEach(c => currentTotalValue += shares[c] * row[c]);

      const unitNav = units > 0 ? (currentTotalValue / units) : 1;
      if (idx > 0 && prevUnitNav != null && prevUnitNav > 0) {
        dailyReturns.push((unitNav - prevUnitNav) / prevUnitNav);
      }
      prevUnitNav = unitNav;

      if (currentTotalValue > peakValue) peakValue = currentTotalValue;
      const drawdown = peakValue > 0 ? ((currentTotalValue - peakValue) / peakValue) * 100 : 0;

      curve.push({
        date: row.date, value: currentTotalValue, cost: totalInvested, unitNav,
        returnRate: totalInvested > 0 ? ((currentTotalValue - totalInvested) / totalInvested) * 100 : 0,
        drawdown
      });

      lastMonth = m;
    });

    const finalVal = curve.length > 0 ? curve[curve.length - 1].value : 0;
    if (finalVal > 0) cashFlows.push({ date: curve[curve.length - 1].date, amount: finalVal });

    const volatility = calculateVolatility(dailyReturns);
    const sharpe = calculateSharpe(dailyReturns);
    const maxDrawdown = curve.length > 0 ? Math.min(...curve.map(d => d.drawdown)) : 0;
    const totalReturn = totalInvested > 0 ? ((finalVal - totalInvested) / totalInvested) * 100 : 0;
    const irr = calculateXIRR(cashFlows);

    return { curve, metrics: { totalReturn, maxDrawdown, irr, volatility, sharpe } };
  };

  const fillCalendarDays = (series) => {
    if (!series || series.length === 0) return series;
    const map = new Map(series.map(r => [r.date, r]));
    const start = series[0].date, end = series[series.length - 1].date;

    const mergePreferGood = (base, patch) => {
      const out = { ...base };
      Object.keys(patch || {}).forEach((k) => {
        const v = patch[k];
        if (v === undefined || v === null) return;
        if (typeof v === 'number' && !Number.isFinite(v)) return;
        out[k] = v;
      });
      return out;
    };

    const dense = [];
    let curT = dateToTime(start);
    const endT = dateToTime(end);
    let last = series[0];

    while (curT <= endT) {
      const cur = timeToDateStr(curT);
      const hit = map.get(cur);
      if (hit) {
        const merged = mergePreferGood(last, hit);
        merged.date = cur;
        last = merged;
        dense.push(merged);
      } else {
        dense.push({ ...last, date: cur });
      }
      curT += MS_DAY;
    }
    return dense;
  };

  const computedResults = useMemo(() => {
    if (!rawDataMap) return null;

    const globalStartTime = computeGlobalStartTime(rawDataMap, fundsA, fundsB, params.startDate);

    const resA = calculatePortfolio(fundsA, rawDataMap, params, strategyMode, rangeMode, globalStartTime);
    const resB = calculatePortfolio(fundsB, rawDataMap, params, strategyMode, rangeMode, globalStartTime);
    if (!resA && !resB) return null;

    const mapA = new Map(), mapB = new Map();
    if (resA) resA.curve.forEach(d => mapA.set(d.date, d));
    if (resB) resB.curve.forEach(d => mapB.set(d.date, d));

    let dates = [];
    if (viewMode === 'compare') dates = Array.from(new Set([...mapA.keys(), ...mapB.keys()]));
    else if (viewMode === 'A') dates = Array.from(mapA.keys());
    else dates = Array.from(mapB.keys());
    dates.sort((a, b) => dateToTime(a) - dateToTime(b));

    let lastA = null, lastB = null;
    const toFiniteOrNull = (x) => { const n = Number(x); return Number.isFinite(n) ? n : null; };

    const chartDataRaw = [];
    dates.forEach(date => {
      if (mapA.has(date)) lastA = mapA.get(date);
      if (mapB.has(date)) lastB = mapB.get(date);
      if (viewMode === 'compare' && (!lastA || !lastB)) return;

      const a = lastA, b = lastB;

      let vMain, vSub, ddMain, ddSub, cMain, cSub;

      if (viewMode === 'compare') {
        vMain = metricMode === 'value' ? a?.value : a?.returnRate;
        vSub = metricMode === 'value' ? b?.value : b?.returnRate;
        cMain = a?.cost; cSub = b?.cost;
        ddMain = a?.drawdown; ddSub = b?.drawdown;
      } else if (viewMode === 'A') {
        vMain = metricMode === 'value' ? a?.value : a?.returnRate;
        cMain = a?.cost; ddMain = a?.drawdown;
      } else {
        vMain = metricMode === 'value' ? b?.value : b?.returnRate;
        cMain = b?.cost; ddMain = b?.drawdown;
      }

      const vMainRaw = toFiniteOrNull(vMain);
      const vSubRaw = toFiniteOrNull(vSub);
      const cMainRaw = toFiniteOrNull(cMain);
      const cSubRaw = toFiniteOrNull(cSub);
      const ddMainRaw = toFiniteOrNull(ddMain);
      const ddSubRaw = toFiniteOrNull(ddSub);

      // ✅ 对数坐标绘图保护：Plot 字段保证 >= LOG_EPS；Raw 字段保留真实值给 tooltip 用
      let vMainPlot = vMainRaw, vSubPlot = vSubRaw, cMainPlot = cMainRaw, cSubPlot = cSubRaw;

      if (metricMode === 'value' && scaleMode === 'log') {
        if (vMainPlot != null) vMainPlot = Math.max(LOG_EPS, vMainPlot);
        if (vSubPlot != null) vSubPlot = Math.max(LOG_EPS, vSubPlot);
        if (cMainPlot != null) cMainPlot = Math.max(LOG_EPS, cMainPlot);
        if (cSubPlot != null) cSubPlot = Math.max(LOG_EPS, cSubPlot);
      }

      chartDataRaw.push({
        date,
        vMainRaw, vSubRaw, cMainRaw, cSubRaw,
        vMainPlot, vSubPlot, cMainPlot, cSubPlot,
        ddMain: ddMainRaw, ddSub: ddSubRaw
      });
    });

    const chartData = fillCalendarDays(chartDataRaw);

    const pct = (a, b) => {
      if (a == null || b == null) return 0;
      const aa = Number(a), bb = Number(b);
      if (!Number.isFinite(aa) || !Number.isFinite(bb) || bb <= 0) return 0;
      return ((aa - bb) / bb) * 100;
    };

    for (let i = 0; i < chartData.length; i++) {
      const cur = chartData[i], prev = chartData[i - 1];
      cur.idx = i;
      cur.chgMain = i === 0 ? 0 : pct(cur.vMainRaw, prev?.vMainRaw);
      cur.chgSub = i === 0 ? 0 : pct(cur.vSubRaw, prev?.vSubRaw);
    }

    let yDomainLinearValue = null;
    if (metricMode === 'value' && scaleMode === 'linear' && chartDataRaw.length > 0) {
      const vals = [];
      chartDataRaw.forEach(r => {
        ['vMainRaw', 'vSubRaw', 'cMainRaw', 'cSubRaw'].forEach(k => {
          const v = r?.[k];
          if (typeof v === 'number' && Number.isFinite(v)) vals.push(v);
        });
      });
      if (vals.length > 0) {
        let min = Math.min(...vals), max = Math.max(...vals);
        const span = max - min;
        let pad = span > 0 ? span * 0.015 : 1;
        pad = Math.max(pad, 1);
        yDomainLinearValue = [Math.max(0, min - pad), max + pad];
      }
    }

    return { dataA: resA, dataB: resB, chartData, yDomainLinearValue };
  }, [rawDataMap, params, fundsA, fundsB, strategyMode, viewMode, metricMode, scaleMode, rangeMode]);

  // ✅ 更丝滑：不再“先清空再出现”，而是：新结果立刻上屏 + 旧结果做残影淡出
  useEffect(() => {
    if (!computedResults) {
      setDisplayResults(null);
      setGhostResults(null);
      setUiSwitching(false);
      return;
    }

    const prev = displayResultsRef.current;
    if (!prev) {
      setDisplayResults(computedResults);
      setGhostResults(null);
      setUiSwitching(false);
      return;
    }

    setGhostResults(prev);
    setDisplayResults(computedResults);
    setUiSwitching(true);

    if (switchTimerRef.current.t1) clearTimeout(switchTimerRef.current.t1);
    if (switchTimerRef.current.t2) clearTimeout(switchTimerRef.current.t2);

    switchTimerRef.current.t1 = setTimeout(() => { setGhostResults(null); }, 260);
    switchTimerRef.current.t2 = setTimeout(() => { setUiSwitching(false); }, 320);

    return () => {
      if (switchTimerRef.current.t1) clearTimeout(switchTimerRef.current.t1);
      if (switchTimerRef.current.t2) clearTimeout(switchTimerRef.current.t2);
    };
  }, [computedResults]);

  const results = displayResults;
  const hasChartData = !!results?.chartData?.length;
  const chartKey = `${chartTab}-${scaleMode}-${viewMode}-${metricMode}`;

  const ddWindows = useMemo(() => {
    if (!results) return null;
    return {
      A: results.dataA?.curve ? calcMaxDrawdownWindow(results.dataA.curve) : null,
      B: results.dataB?.curve ? calcMaxDrawdownWindow(results.dataB.curve) : null,
    };
  }, [results]);

  const ddWindowsGhost = useMemo(() => {
    if (!ghostResults) return null;
    return {
      A: ghostResults.dataA?.curve ? calcMaxDrawdownWindow(ghostResults.dataA.curve) : null,
      B: ghostResults.dataB?.curve ? calcMaxDrawdownWindow(ghostResults.dataB.curve) : null,
    };
  }, [ghostResults]);

  const mainDdWindow = useMemo(() => {
    if (!ddWindows) return null;
    return viewMode === 'B' ? ddWindows.B : ddWindows.A;
  }, [ddWindows, viewMode]);

  const subDdWindow = useMemo(() => {
    if (!ddWindows) return null;
    return viewMode === 'compare' ? ddWindows.B : null;
  }, [ddWindows, viewMode]);

  const ddDomain = useMemo(() => {
    if (!results?.chartData?.length) return [-1, 0];
    const vals = [];
    results.chartData.forEach(r => {
      if (typeof r.ddMain === 'number') vals.push(r.ddMain);
      if (viewMode === 'compare' && typeof r.ddSub === 'number') vals.push(r.ddSub);
    });
    if (vals.length === 0) return [-1, 0];
    let min = Math.min(...vals, 0);
    if (!Number.isFinite(min)) min = -1;
    if (Math.abs(min) < 0.05) return [-1, 0];
    const pad = Math.max(0.2, Math.abs(min) * 0.08);
    return [Math.min(min - pad, -0.2), 0];
  }, [results, viewMode]);

  const dynamicStyles = useMemo(() => {
    const mainColor = viewMode === 'B' ? THEME.colors.secondary : THEME.colors.primary;
    const subColor = THEME.colors.secondary;
    return { '--main-color': mainColor, '--sub-color': subColor };
  }, [viewMode]);

  const glassCard = "relative overflow-hidden card-bloom backdrop-blur-xl rounded-[24px] border border-white/60 shadow-[0_8px_32px_rgba(255,182,193,0.10)] bg-white/60 hover:bg-white/70 transition-[transform,box-shadow,background-color] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-[0_16px_64px_rgba(255,153,168,0.24)] active:scale-[0.995]";
  const glassInput = "w-full bg-white/50 border border-white rounded-xl px-4 py-2 text-sm text-[#7A3B4A] outline-none focus:ring-2 focus:ring-[#FFE1EC] focus:bg-white transition-all shadow-inner";

  const activeFunds = activeTab === 'A' ? fundsA : fundsB;
  const activeWeightSum = useMemo(() => {
    const sum = activeFunds.reduce((acc, f) => acc + (Number(f.weight) || 0), 0);
    return Number.isFinite(sum) ? sum : 0;
  }, [activeFunds]);
  const weightOk = Math.abs(activeWeightSum - 100) < 1e-6;

  // ✅ Tooltip：对比模式下按“y 值从大到小”自动排序，谁更高谁在上面
  const CustomValueTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const row = payload[0]?.payload || {};

    const showChg = (chg) => {
      const n = Number(chg);
      const v = Number.isFinite(n) ? n : 0;
      const sign = v >= 0 ? "+" : "";
      return `${sign}${v.toFixed(2)}%`;
    };

    const LineRow = ({ title, value, chg, color }) => {
      const vv = Number.isFinite(Number(value)) ? Number(value) : 0;
      return (
        <div className="mt-2">
          <div className="font-black text-sm" style={{ color }}>
            {title}：{fmtMoney(vv)}
          </div>
          <div className="text-[11px] font-bold text-[#B58A97] mt-1">
            当日涨跌：{showChg(chg)}
          </div>
        </div>
      );
    };

    const isCompare = viewMode === "compare";
    const isSingleA = viewMode === "A";
    const isSingleB = viewMode === "B";

    let items = [];
    if (isCompare) {
      items = [
        { id: "A", title: "🌸 细水长流", value: row.vMainRaw, chg: row.chgMain, color: THEME.colors.primary },
        { id: "B", title: "❄️ 五等分", value: row.vSubRaw, chg: row.chgSub, color: THEME.colors.secondary },
      ];
      items.sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0));
    }

    return (
      <div className="px-4 py-3 rounded-2xl bg-white/92 backdrop-blur-xl border border-white/70 shadow-[0_14px_50px_rgba(255,143,171,0.20)]">
        <div className="text-sm font-black text-[#7A3B4A] mb-1">{label}</div>

        {isCompare && items.map(it => (
          <LineRow key={it.id} title={it.title} value={it.value} chg={it.chg} color={it.color} />
        ))}

        {isSingleA && (
          <LineRow title="🌸 细水长流" value={row.vMainRaw} chg={row.chgMain} color={THEME.colors.primary} />
        )}

        {isSingleB && (
          <LineRow title="❄️ 五等分" value={row.vMainRaw} chg={row.chgMain} color={THEME.colors.secondary} />
        )}
      </div>
    );
  };

  const CustomReturnTooltip = ({ active, payload, label }) => {
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

    let items = [];
    if (isCompare) {
      items = [
        { id: "A", title: "🌸 细水长流", value: row.vMainRaw, color: THEME.colors.primary },
        { id: "B", title: "❄️ 五等分", value: row.vSubRaw, color: THEME.colors.secondary },
      ];
      items.sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0));
    }

    return (
      <div className="px-4 py-3 rounded-2xl bg-white/92 backdrop-blur-xl border border-white/70 shadow-[0_14px_50px_rgba(255,143,171,0.20)]">
        <div className="text-sm font-black text-[#7A3B4A] mb-2">{label}</div>

        {isCompare && items.map(it => (
          <div key={it.id} className="font-black text-sm mt-2" style={{ color: it.color }}>
            {it.title}：{show(it.value)}
          </div>
        ))}

        {isSingleA && (
          <div className="font-black text-sm" style={{ color: THEME.colors.primary }}>
            🌸 细水长流：{show(row.vMainRaw)}
          </div>
        )}
        {isSingleB && (
          <div className="font-black text-sm" style={{ color: THEME.colors.secondary }}>
            ❄️ 五等分：{show(row.vMainRaw)}
          </div>
        )}
      </div>
    );
  };

  // 🌸 返回 { topCards, leftCards } 方便分开渲染
  const renderMetricCards = (res, ddWins, isGhost = false) => {
    if (!res) return { topCards: null, leftCards: null };

    const metrics = [
      { label: '总资产', key: 'value', icon: DollarSign, fmt: v => fmtMoney(v), emoji: '💰' },
      { label: '投入本金', key: 'cost', icon: Layers, fmt: v => fmtMoney(v), emoji: '💵' },
      { label: '盈亏', key: 'profit', icon: ArrowUpRight, fmt: v => `${v >= 0 ? '+' : ''}${fmtMoney(v)}`, emoji: '📈' },
      { label: '累计收益', key: 'totalReturn', icon: Percent, fmt: v => `${Number(v || 0).toFixed(2)}%`, emoji: '📊' },
      { label: '年化IRR', key: 'irr', icon: Activity, fmt: v => `${Number(v || 0).toFixed(2)}%`, emoji: '🎯' },
      { label: '波动率', key: 'volatility', icon: BarChart2, fmt: v => `${Number(v || 0).toFixed(2)}%`, emoji: '📉' },
      { label: '最大回撤', key: 'maxDrawdown', icon: ShieldCheck, fmt: v => `${Number(v || 0).toFixed(2)}%`, emoji: '⚡' },
      { label: '回撤恢复', key: 'recovery', icon: RotateCcw, fmt: v => (typeof v === 'number' ? `${v}天` : String(v)), emoji: '🔄' },
      { label: '夏普比率', key: 'sharpe', icon: Scale, fmt: v => Number(v || 0).toFixed(3), emoji: '⭐' },
    ];

    const getVal = (r, which, m) => {
      if (!r || !r.curve || r.curve.length === 0) return 0;
      const last = r.curve.at(-1);
      if (m.key === 'value') return last.value;
      if (m.key === 'cost') return last.cost;
      if (m.key === 'profit') return (last.value - last.cost);
      if (m.key === 'recovery') {
        const w = ddWins?.[which];
        if (!w) return '-';
        if (!w.hasDrawdown) return 0;
        if (w.recoveryDays == null) return '未恢复';
        return w.recoveryDays;
      }
      return r.metrics?.[m.key] ?? 0;
    };

    const makeCard = (m, i, isTop) => {
      const valA = res.dataA ? getVal(res.dataA, 'A', m) : 0;
      const valB = res.dataB ? getVal(res.dataB, 'B', m) : 0;

      return (
        <div
          {...(!isGhost ? cardFXProps : {})}
          key={i}
          className={`relative overflow-hidden card-bloom backdrop-blur-md rounded-[14px] border border-white/50 shadow-[0_3px_12px_rgba(255,182,193,0.15)] bg-gradient-to-br from-white/80 to-white/60 hover:from-white/90 hover:to-white/70 transition-all duration-400 ease-out hover:shadow-[0_6px_20px_rgba(255,153,168,0.25)] active:scale-[0.98] ${isTop ? 'flex-1 min-w-0 p-2' : 'p-2.5'}`}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[11px]">{m.emoji}</span>
            <span className="text-[10px] text-[#7A4A5B] font-semibold truncate">{m.label}</span>
          </div>
          <div className="flex flex-col gap-0.5 text-[10px]">
            {(viewMode === 'A' || viewMode === 'compare') && (
              <div className="flex items-center justify-between gap-1">
                <span className="text-[#B58A97] text-[9px]">🌸</span>
                <span className="font-bold text-[13px] leading-none tabular-nums text-[#FF4FA3]">
                  <AnimatedValue value={valA} formatter={m.fmt} />
                </span>
              </div>
            )}
            {(viewMode === 'B' || viewMode === 'compare') && (
              <div className="flex items-center justify-between gap-1">
                <span className="text-[#B58A97] text-[9px]">❄️</span>
                <span className="font-bold text-[13px] leading-none tabular-nums text-[#5A9BFF]">
                  <AnimatedValue value={valB} formatter={m.fmt} />
                </span>
              </div>
            )}
          </div>
        </div>
      );
    };

    // 顶部5张，左侧4张
    const topCards = metrics.slice(0, 5).map((m, i) => makeCard(m, i, true));
    const leftCards = metrics.slice(5, 9).map((m, i) => makeCard(m, i + 5, false));

    return { topCards, leftCards };
  };

  const chartCurveType = (metricMode === 'value' || scaleMode === 'log') ? 'linear' : 'monotone';

  return (
    <div
      className="min-h-screen lg:h-[100dvh] p-3 md:p-5 lg:p-6 font-sans selection:bg-[#FFE1EC] selection:text-[#7A3B4A] animate-fade-in-up"
      style={{ background: THEME.colors.bgGradient, ...dynamicStyles }}
    >
      <BackgroundBlobs />
      <div className="fixed inset-0 pointer-events-none z-[1] noise-overlay"></div>
      <div className="fixed inset-0 pointer-events-none z-[2] vignette"></div>

      {toast && (
        <div className="toast-bounce fixed top-5 left-1/2 -translate-x-1/2 z-[999] px-5 py-2 rounded-full shadow-[0_12px_40px_rgba(255,143,171,0.25)] backdrop-blur-xl border border-white/60" style={{ background: 'linear-gradient(135deg, rgba(255,143,171,0.85) 0%, rgba(255,194,209,0.85) 100%)' }}>
          <span className="text-sm font-black text-white drop-shadow-sm">{toast}</span>
        </div>
      )}

      <div className="max-w-screen-2xl mx-auto relative z-10 h-full min-h-0 flex flex-col">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start h-full min-h-0">
          <div className="lg:col-span-3 flex flex-col gap-4 h-full min-h-0">
            <div className={`${glassCard} p-4 flex flex-col gap-4`}>
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={onBack}
                  className="ripple-button inline-flex items-center gap-2 px-4 py-2 bg-white/65 backdrop-blur-md rounded-full shadow-sm text-[13px] font-bold text-[#7A3B4A] border border-white/70 hover:-translate-y-0.5 hover:shadow-md transition-transform duration-300"
                  aria-label="返回主页"
                >
                  <ArrowLeft size={16} /> 返回主页
                </button>
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-white/60 rounded-full border border-white/70 text-[11px] font-bold text-[#7A3B4A]">
                  <span className="w-2 h-2 rounded-full" style={{ background: THEME.colors.primary }} />
                  投资组合回测模型
                </span>
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-tight text-left drop-shadow-sm">
                  <span className="bg-clip-text text-transparent" style={{ backgroundImage: THEME.colors.primaryGradient }}>双子星</span>
                </h1>
                <p className="text-xs font-medium text-[#B58A97] flex items-center gap-4">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#FF9AB8]"></span> 细水长流</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#A7C5EB]"></span> 五等分</span>
                </p>
              </div>
            </div>
            <div {...cardFXProps} className={`${glassCard} p-5`}>
              <div className="flex items-center gap-2 mb-5">
                <div className="p-1.5 bg-[#FFF0F5] rounded-lg text-[#FF9AB8]"><Calendar size={18} /></div>
                <h2 className="font-bold text-[#7A3B4A]">回测设定</h2>
              </div>

              <div className="mb-4">
                <label className="text-xs font-bold text-[#B58A97] ml-1 mb-2 block">回测区间</label>
                <div className="grid grid-cols-3 gap-2">
                  {RANGE_OPTIONS.map(opt => {
                    const active = rangeMode === opt.key;
                    return (
                      <button
                        key={opt.key}
                        onClick={() => setRangeMode(opt.key)}
                        className={`ripple-button py-2 rounded-xl text-xs font-bold transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] border active:scale-[0.98]
                          ${active ? 'text-white shadow-md border-white/70' : 'text-[#7A3B4A]/60 border-white/60 hover:bg-white/40'}`}
                        style={{ background: active ? THEME.colors.primaryGradient : 'rgba(255,255,255,0.25)' }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-[#B58A97] ml-1 mb-1 block">开始日期</label>
                  <input type="date" value={params.startDate} onChange={e => setParams({ ...params, startDate: e.target.value })} className={glassInput} />
                </div>

                {strategyMode === 'lumpSum' ? (
                  <div>
                    <label className="text-xs font-bold text-[#B58A97] ml-1 mb-1 block">初始本金 (梭哈)</label>
                    <input type="number" value={params.initialCapital} onChange={e => setParams({ ...params, initialCapital: Number(e.target.value) })} className={glassInput} />
                  </div>
                ) : (
                  <div>
                    <label className="text-xs font-bold text-[#B58A97] ml-1 mb-1 block">每日定投金额 (最低40，可小数)</label>
                    <input type="number" step="0.01" value={params.dailyAmount} onChange={e => setParams({ ...params, dailyAmount: Number(e.target.value) })} className={glassInput} />
                    <p className="text-[10px] text-[#FF9AB8] mt-1 ml-1">* 回测会自动按最低40执行；每月首个交易日无损再平衡；忽略限购和费率；非交易日不定投</p>
                  </div>
                )}
              </div>
            </div>

            <div {...cardFXProps} className={`${glassCard} flex flex-col flex-1 min-h-0 overflow-hidden`}>
              <div className="flex p-1 m-2 bg-white/50 rounded-xl">
                <button
                  onClick={() => setActiveTab('A')}
                  className={`ripple-button flex-1 py-2 rounded-lg text-xs font-bold transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.98]
                    ${activeTab === 'A' ? 'bg-[#FF9AB8] text-white shadow-md' : 'text-[#B58A97] hover:bg-white/50'}`}
                >🌸 细水长流</button>
                <button
                  onClick={() => setActiveTab('B')}
                  className={`ripple-button flex-1 py-2 rounded-lg text-xs font-bold transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.98]
                    ${activeTab === 'B' ? 'bg-[#A7C5EB] text-white shadow-md' : 'text-[#B58A97] hover:bg-white/50'}`}
                >❄️ 五等分</button>
              </div>

              <div className="px-4 pb-2">
                <div className="bg-white/40 border border-white/60 rounded-xl px-3 py-2 backdrop-blur-md shadow-[inset_0_2px_4px_rgba(139,79,88,0.05)]">
                  <span className="text-[10px] font-bold text-[#B58A97]">权重总和：</span>
                  <span className={`text-[10px] font-black ${weightOk ? 'text-[#FF9AB8]' : 'text-[#FF7EA9]'}`}>{activeWeightSum.toFixed(2)}%</span>
                  <span className="text-[10px] font-bold text-[#B58A97] ml-1">{weightOk ? '✅' : '⚠️ 建议=100%'}</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 space-y-2 custom-scrollbar pb-4">
                {activeFunds.map((fund, idx) => {
                  const isValid = !fund.code || validateFundCode(fund.code);
                  const name = fundNames[fund.code];
                  return (
                    <div
                      key={idx}
                      className="fund-item group flex flex-col gap-1 bg-white/30 p-2.5 rounded-xl border border-white/50 hover:bg-white/60 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] w-5 font-mono font-bold ${activeTab === 'A' ? 'text-[#FFE1EC]' : 'text-[#BAE1FF]'}`}>{String(idx + 1).padStart(2, '0')}</span>
                        <input
                          value={fund.code}
                          onChange={e => {
                            const newList = activeTab === 'A' ? [...fundsA] : [...fundsB];
                            newList[idx].code = e.target.value;
                            activeTab === 'A' ? setFundsA(newList) : setFundsB(newList);
                          }}
                          className={`w-16 bg-transparent text-sm font-bold text-[#7A3B4A] outline-none ${!isValid && 'text-red-400'}`}
                          placeholder="000000"
                        />
                        <div className="flex-1">
                          <div className="h-1.5 w-full bg-white/50 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${activeTab === 'A' ? 'bg-[#FF9AB8]' : 'bg-[#A7C5EB]'}`} style={{ width: `${Math.min(fund.weight, 100)}%` }} />
                          </div>
                        </div>
                        <input
                          type="number"
                          value={fund.weight}
                          onChange={e => {
                            const newList = activeTab === 'A' ? [...fundsA] : [...fundsB];
                            newList[idx].weight = Number(e.target.value);
                            activeTab === 'A' ? setFundsA(newList) : setFundsB(newList);
                          }}
                          className="w-10 bg-transparent text-xs font-bold text-right outline-none text-[#7A3B4A]"
                        />
                        <span className="text-[10px] text-[#B58A97]">%</span>
                        <button
                          onClick={() => {
                            const newList = activeTab === 'A' ? [...fundsA] : [...fundsB];
                            activeTab === 'A' ? setFundsA(newList.filter((_, i) => i !== idx)) : setFundsB(newList.filter((_, i) => i !== idx));
                          }}
                          className="opacity-0 group-hover:opacity-100 text-[#B58A97] hover:text-[#FF9AB8] transition-opacity duration-300"
                        >
                          <X size={12} />
                        </button>
                      </div>
                      {name && <div className={`text-[10px] pl-7 truncate ${activeTab === 'A' ? 'text-[#FF9AB8]' : 'text-[#A7C5EB]'}`}>{name}</div>}
                    </div>
                  );
                })}

                <button
                  onClick={() => {
                    const newList = activeTab === 'A' ? [...fundsA] : [...fundsB];
                    newList.push({ code: '', weight: 0 });
                    activeTab === 'A' ? setFundsA(newList) : setFundsB(newList);
                  }}
                  className="ripple-button w-full py-2.5 border border-dashed border-[#FFE1EC] rounded-xl text-xs text-[#FF9AB8] hover:bg-[#FFF0F5] transition-colors duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] font-bold active:scale-[0.98]"
                >+ 添加基金</button>
              </div>

              <div className="px-4 pt-3 pb-4 space-y-3 shrink-0 bg-white/30 border-t border-white/60">
                <button
                  onClick={runBacktest}
                  disabled={loading}
                  className="ripple-button w-full py-3 rounded-2xl font-bold text-white text-lg shadow-[0_10px_20px_rgba(255,154,184,0.3)] hover:shadow-[0_15px_30px_rgba(255,154,184,0.4)] transform hover:-translate-y-0.5 active:scale-95 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center justify-center gap-2 overflow-hidden relative group"
                  style={{ background: 'linear-gradient(135deg, #FF9AB8 0%, #FFBED2 100%)' }}
                >
                  {loading ? <Sparkles className="animate-spin" /> : <Play fill="currentColor" size={20} />}
                  <span className="relative z-10">{loading ? progress : '开启回测之旅'}</span>
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500 rounded-2xl"></div>
                </button>

                {loading && (
                  <div className="w-full h-2 rounded-full bg-white/40 overflow-hidden border border-white/60 backdrop-blur-md">
                    <div className="h-full rounded-full transition-all duration-500 progress-glow" style={{ width: `${Math.round(progressRatio * 100)}%`, background: 'linear-gradient(90deg, rgba(255,154,184,0.95), rgba(255,225,236,0.95), rgba(255,154,184,0.95))' }} />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button onClick={handleResetDefaults} className="ripple-button py-3 rounded-2xl text-xs font-black text-[#FF7EA9] bg-white/60 border border-white/70 backdrop-blur-md hover:bg-white transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-sm flex items-center justify-center gap-2 active:scale-[0.98]">
                    <RotateCcw size={14} /> 恢复默认
                  </button>
                  <button onClick={handleClearResults} className="ripple-button py-3 rounded-2xl text-xs font-black text-[#7A3B4A] bg-white/50 border border-white/70 backdrop-blur-md hover:bg-white transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-sm flex items-center justify-center gap-2 active:scale-[0.98]">
                    <Trash2 size={14} /> 清空结果
                  </button>
                </div>
              </div>
            </div>

            <div className="md:hidden">
              <button
                onClick={() => setShowSheet(true)}
                className="ripple-button w-full py-3 rounded-2xl font-bold text-[#7A3B4A] bg-white/70 border border-white/70 backdrop-blur-md shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-300"
              >
                查看全部持仓/资产
              </button>
            </div>

          </div>

          <div className="lg:col-span-9 flex flex-col gap-4 min-h-0 h-full">
            {!results ? (
              <div {...cardFXProps} className={`${glassCard} h-full min-h-[500px] flex flex-col items-center justify-center text-center p-10 border-dashed border-2 border-[#FFE1EC]`}>
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-[#FF9AB8] blur-3xl opacity-20 rounded-full animate-pulse"></div>
                  <Flower size={48} className="text-[#FF9AB8] relative z-10 animate-bounce-slow" />
                </div>
                <h3 className="text-xl font-bold text-[#7A3B4A] mb-2">可以开启回测之旅啦~</h3>
                {error && <div className="mt-4 px-4 py-2 bg-red-50 text-red-400 text-xs rounded-lg border border-red-100">{error}</div>}
              </div>
            ) : (
              <>
                <div {...cardFXProps} className={`${glassCard} p-3 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-4 z-20 shrink-0`}>
                  <div className="flex gap-1 bg-white/50 p-1 rounded-xl w-full md:w-auto overflow-x-auto">
                    {[
                      { id: 'compare', label: '对比', icon: GitCompare, color: '#BFAFB2' },
                      { id: 'A', label: '细水长流', icon: Flower, color: '#FF9AB8' },
                      { id: 'B', label: '五等分', icon: Snowflake, color: '#A7C5EB' }
                    ].map(mode => (
                      <button key={mode.id} onClick={() => setViewMode(mode.id)} className={`ripple-button px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.98] ${viewMode === mode.id ? 'bg-white text-[#7A3B4A] shadow-sm' : 'text-[#B58A97] hover:bg-white/30'}`}>
                        <mode.icon size={12} color={viewMode === mode.id ? mode.color : 'currentColor'} /> {mode.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-3 w-full md:w-auto flex-wrap justify-end">
                    <ToggleGroup value={metricMode} onChange={setMetricMode} options={[
                      { value: 'value', label: '资产', icon: DollarSign },
                      { value: 'return', label: '收益', icon: Percent }
                    ]} />
                    <div className="w-[1px] bg-white/50 mx-1 hidden md:block"></div>
                    <ToggleGroup value={scaleMode} onChange={setScaleMode} options={[
                      { value: 'linear', label: '线性', icon: TrendingUp },
                      { value: 'log', label: '对数', icon: Zap, disabled: metricMode !== 'value' }
                    ]} />
                    <div className="w-[1px] bg-white/50 mx-1 hidden md:block"></div>
                    <ToggleGroup value={strategyMode} onChange={setStrategyMode} options={[
                      { value: 'daily', label: '定投', icon: Layers },
                      { value: 'lumpSum', label: '梭哈', icon: ArrowUpRight }
                    ]} />
                  </div>
                </div>

                <div className={`${uiSwitching ? "soft-fade " : ""}flex-1 min-h-0 min-w-0 flex flex-col gap-2`}>
                  {/* 🌸 紧凑环绕布局：顶部5卡 + (左侧4卡 + 图表) */}
                  {(() => {
                    const { topCards, leftCards } = renderMetricCards(results, ddWindows, false);
                    const ghost = ghostResults ? renderMetricCards(ghostResults, ddWindowsGhost, true) : null;

                    return (
                      <>
                        {/* 顶部一行：5张卡片紧凑排列 */}
                        <div className="flex gap-2 shrink-0">
                          {topCards}
                        </div>

                        {/* 下方区域：左侧4卡 + 图表 */}
                        <div className="flex-1 min-h-0 flex gap-2">
                          {/* 左侧一列：4张卡片垂直排列，均分高度 */}
                          <div className="w-[130px] shrink-0 flex flex-col gap-2">
                            {leftCards}
                          </div>

                          {/* 图表区域：充满剩余空间 */}
                          <div {...cardFXProps} className={`${glassCard} flex-1 p-3 flex flex-col gap-2 min-h-0 min-w-0 !overflow-visible`}>
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex gap-2 bg-white/60 p-1 rounded-2xl border border-white/70">
                                {[
                                  { id: 'value', label: metricMode === 'value' ? '资产曲线' : '收益曲线' },
                                  { id: 'drawdown', label: '回撤曲线' },
                                ].map(tab => (
                                  <button
                                    key={tab.id}
                                    onClick={() => setChartTab(tab.id)}
                                    className={`ripple-button px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-300 ${chartTab === tab.id ? 'bg-white text-[#7A3B4A] shadow-sm' : 'text-[#B58A97] hover:bg-white/50'}`}
                                  >
                                    {tab.label}
                                  </button>
                                ))}
                              </div>
                              {chartTab === 'value' && (
                                <div className="flex items-center gap-2 text-[11px] font-bold text-[#B58A97]">
                                  <span className="px-2 py-1 rounded-full bg-white/60 border border-white/70">{scaleMode === 'log' ? '对数坐标' : '线性坐标'}</span>
                                  {metricMode === 'value' && (
                                    <span className="px-2 py-1 rounded-full bg-white/60 border border-white/70 text-[#7A3B4A]">含成本线</span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Chart wrapper: square, fills available space */}
                            <div className="flex-1 min-h-0 min-w-0 flex items-center justify-center">
                              <div className="w-full h-full" style={{ maxWidth: 'min(100%, 100%)', aspectRatio: '1 / 1' }}>
                                {!hasChartData ? (
                                  <div className="h-full w-full rounded-2xl bg-white/50 border border-white/60 flex items-center justify-center text-sm font-semibold text-[#9A7381]">
                                    暂无图表数据，请先运行回测 ✨
                                  </div>
                                ) : chartTab === 'value' ? (
                                  <ResponsiveContainer key={chartKey} width="100%" height="100%">
                                    <ComposedChart data={results.chartData}>
                                      <defs>
                                        <linearGradient id="gradMain" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="var(--main-color)" stopOpacity={0.35} className="stop-transition" />
                                          <stop offset="95%" stopColor="#FFF5F8" stopOpacity={0} className="stop-transition" />
                                        </linearGradient>
                                        <linearGradient id="gradSub" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="var(--sub-color)" stopOpacity={0.35} className="stop-transition" />
                                          <stop offset="95%" stopColor="#F4F7FF" stopOpacity={0} className="stop-transition" />
                                        </linearGradient>
                                      </defs>

                                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,182,193,0.26)" />
                                      <XAxis dataKey="date" tickFormatter={t => t.slice(0, 7)} tick={{ fontSize: 10, fill: '#B58A97' }} axisLine={false} tickLine={false} dy={10} minTickGap={30} />
                                      <YAxis
                                        type="number"
                                        tick={{ fontSize: 10, fill: '#B58A97' }}
                                        axisLine={false}
                                        tickLine={false}
                                        scale={scaleMode}
                                        domain={
                                          scaleMode === 'log'
                                            ? [LOG_EPS, 'dataMax']
                                            : (metricMode === 'value'
                                              ? (results.yDomainLinearValue || ['dataMin', 'dataMax'])
                                              : ['auto', 'auto'])
                                        }
                                        allowDataOverflow={scaleMode === 'log'}
                                        tickFormatter={v => metricMode === 'value' ? formatAssetTick(v) : formatPercentTick(v)}
                                      />

                                      <Tooltip content={metricMode === 'value' ? <CustomValueTooltip /> : <CustomReturnTooltip />} cursor={{ stroke: "rgba(197,160,166,0.30)", strokeDasharray: "4 4" }} />

                                      <Area
                                        type={chartCurveType}
                                        dataKey="vMainPlot"
                                        stroke="var(--main-color)"
                                        strokeWidth={3.2}
                                        strokeLinecap="round"
                                        fill="url(#gradMain)"
                                        animationDuration={1200}
                                        className="transition-all-chart"
                                        baseValue={scaleMode === 'log' ? LOG_EPS : 0}
                                        activeDot={{ r: 4, strokeWidth: 2 }}
                                      />

                                      {viewMode === 'compare' && (
                                        <Area
                                          type={chartCurveType}
                                          dataKey="vSubPlot"
                                          stroke="var(--sub-color)"
                                          strokeWidth={3.2}
                                          strokeLinecap="round"
                                          fill="url(#gradSub)"
                                          animationDuration={1200}
                                          className="transition-all-chart"
                                          baseValue={scaleMode === 'log' ? LOG_EPS : 0}
                                          activeDot={{ r: 4, strokeWidth: 2 }}
                                        />
                                      )}

                                      {metricMode === 'value' && (
                                        <>
                                          <Line
                                            type={chartCurveType}
                                            dataKey="cMainPlot"
                                            stroke="var(--main-color)"
                                            strokeWidth={2}
                                            dot={false}
                                            strokeDasharray="6 6"
                                            strokeOpacity={0.75}
                                            animationDuration={900}
                                            strokeLinecap="round"
                                          />
                                          {viewMode === 'compare' && (
                                            <Line
                                              type={chartCurveType}
                                              dataKey="cSubPlot"
                                              stroke="var(--sub-color)"
                                              strokeWidth={2}
                                              dot={false}
                                              strokeDasharray="6 6"
                                              strokeOpacity={0.75}
                                              animationDuration={900}
                                              strokeLinecap="round"
                                            />
                                          )}
                                        </>
                                      )}
                                    </ComposedChart>
                                  </ResponsiveContainer>
                                ) : (
                                  <ResponsiveContainer key={chartKey} width="100%" height="100%">
                                    <LineChart data={results.chartData}>
                                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,182,193,0.26)" />
                                      <XAxis dataKey="date" tick={false} axisLine={false} />
                                      <YAxis tick={{ fontSize: 10, fill: '#B58A97' }} axisLine={false} tickLine={false} width={52} domain={ddDomain} tickFormatter={formatPercentTick} tickCount={6} />
                                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', background: 'rgba(255,255,255,0.95)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }} formatter={(v) => [`${Number(v).toFixed(2)}%`, '???']} />
                                      <ReferenceLine y={0} stroke="rgba(255,182,193,0.28)" strokeDasharray="4 4" />
                                      {mainDdWindow?.hasDrawdown && (<ReferenceArea x1={mainDdWindow.peakDate} x2={mainDdWindow.troughDate} strokeOpacity={0} fill="var(--main-color)" fillOpacity={0.12} />)}
                                      {subDdWindow?.hasDrawdown && (<ReferenceArea x1={subDdWindow.peakDate} x2={subDdWindow.troughDate} strokeOpacity={0} fill="var(--sub-color)" fillOpacity={0.12} />)}
                                      <Line type="step" dataKey="ddMain" stroke="var(--main-color)" strokeWidth={2} dot={false} animationDuration={1200} className="transition-all-chart" strokeLinecap="round" />
                                      {viewMode === 'compare' && (<Line type="step" dataKey="ddSub" stroke="var(--sub-color)" strokeWidth={2} dot={false} animationDuration={1200} className="transition-all-chart" strokeLinecap="round" />)}
                                    </LineChart>
                                  </ResponsiveContainer>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile bottom sheet for holdings */}
      {showSheet && (
        <div className="fixed inset-0 z-[120] flex items-end md:hidden">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
            onClick={() => setShowSheet(false)}
            aria-label="关闭持仓面板"
          ></div>
          <div className="relative w-full bg-white rounded-t-3xl shadow-[0_-12px_40px_rgba(0,0,0,0.12)] max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-[#F5E9ED]">
              <div className="h-1 w-12 bg-[#FFE1EC] rounded-full mx-auto"></div>
              <button className="absolute right-4 top-3 text-[#B58A97]" onClick={() => setShowSheet(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="px-4 pb-4 pt-2 flex-1 overflow-y-auto custom-scrollbar space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-[#7A3B4A]">
                <Layers size={16} /> 持仓列表
              </div>
              <div className="space-y-2">
                {activeFunds.map((fund, idx) => {
                  const isValid = !fund.code || validateFundCode(fund.code);
                  const name = fundNames[fund.code];
                  return (
                    <div
                      key={idx}
                      className="fund-item group flex flex-col gap-1 bg-white/70 p-2.5 rounded-xl border border-[#F5E9ED] hover:bg-white transition-all duration-300"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] w-5 font-mono font-bold ${activeTab === 'A' ? 'text-[#FFE1EC]' : 'text-[#E3EDFF]'}`}>{String(idx + 1).padStart(2, '0')}</span>
                        <input
                          value={fund.code}
                          onChange={e => {
                            const newList = activeTab === 'A' ? [...fundsA] : [...fundsB];
                            newList[idx].code = e.target.value;
                            activeTab === 'A' ? setFundsA(newList) : setFundsB(newList);
                          }}
                          className={`w-16 bg-transparent text-sm font-bold text-[#7A3B4A] outline-none ${!isValid && 'text-red-400'}`}
                          placeholder="000000"
                        />
                        <div className="flex-1">
                          <div className="h-1.5 w-full bg-[#F7EEF2] rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${activeTab === 'A' ? 'bg-[#FF9AB8]' : 'bg-[#A7C5EB]'}`} style={{ width: `${Math.min(fund.weight, 100)}%` }} />
                          </div>
                        </div>
                        <input
                          type="number"
                          value={fund.weight}
                          onChange={e => {
                            const newList = activeTab === 'A' ? [...fundsA] : [...fundsB];
                            newList[idx].weight = Number(e.target.value);
                            activeTab === 'A' ? setFundsA(newList) : setFundsB(newList);
                          }}
                          className="w-12 bg-transparent text-xs font-bold text-right outline-none text-[#7A3B4A]"
                        />
                        <span className="text-[10px] text-[#B58A97]">%</span>
                        <button
                          onClick={() => {
                            const newList = activeTab === 'A' ? [...fundsA] : [...fundsB];
                            activeTab === 'A' ? setFundsA(newList.filter((_, i) => i !== idx)) : setFundsB(newList.filter((_, i) => i !== idx));
                          }}
                          className="opacity-70 text-[#B58A97] hover:text-[#FF9AB8] transition-opacity duration-200"
                        >
                          <X size={12} />
                        </button>
                      </div>
                      {name && <div className={`text-[10px] pl-7 truncate ${activeTab === 'A' ? 'text-[#FF9AB8]' : 'text-[#A7C5EB]'}`}>{name}</div>}
                    </div>
                  );
                })}
              </div>
              <button
                onClick={() => {
                  const newList = activeTab === 'A' ? [...fundsA] : [...fundsB];
                  newList.push({ code: '', weight: 0 });
                  activeTab === 'A' ? setFundsA(newList) : setFundsB(newList);
                }}
                className="ripple-button w-full py-2.5 border border-dashed border-[#FFE1EC] rounded-xl text-xs text-[#FF9AB8] hover:bg-[#FFF5F9] transition-colors duration-300 font-bold active:scale-[0.98]"
              >+ 添加基金</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #FFE1EC; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }

        .transition-all-chart path { transition: stroke 1s ease, fill 1s ease, stroke-opacity 1s ease, fill-opacity 1s ease; }
        .stop-transition { transition: stop-color 1s ease; }

        @keyframes blob-breathe {
          0%, 100% { transform: translate(0px, 0px) scale(1); opacity: 0.6; }
          33% { transform: translate(30px, -50px) scale(1.1); opacity: 0.7; }
          66% { transform: translate(-20px, 20px) scale(0.9); opacity: 0.5; }
        }
        .animate-blob-breathe { animation: blob-breathe 18s infinite ease-in-out; }
        .animate-bounce-slow { animation: bounce 4s infinite; }
        .animate-fade-in-up { animation: fadeInUp 0.8s ease-out; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

        @keyframes toast-bounce-in {
          0% { opacity: 0; transform: translate(-50%, -20px) scale(0.9); }
          50% { transform: translate(-50%, 5px) scale(1.02); }
          100% { opacity: 1; transform: translate(-50%, 0) scale(1); }
        }
        .toast-bounce { animation: toast-bounce-in 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55); }

        .noise-overlay {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)' opacity='.18'/%3E%3C/svg%3E");
          opacity: 0.14; mix-blend-mode: soft-light;
        }
        .vignette {
          background: radial-gradient(70% 60% at 50% 35%, rgba(255,255,255,0) 0%, rgba(255,143,171,0.08) 55%, rgba(139,79,88,0.10) 100%);
          opacity: 0.9;
        }

        .card-bloom { transform-style: preserve-3d; will-change: transform; transition: transform 420ms cubic-bezier(0.16, 1, 0.3, 1); }
        .card-bloom::before {
          content: ""; position: absolute; inset: 0; border-radius: 26px;
          background: radial-gradient(520px circle at var(--mx, 50%) var(--my, 30%), rgba(255,143,171,0.22), rgba(137,207,240,0.12) 28%, transparent 52%);
          opacity: 0; transition: opacity 420ms ease; pointer-events: none; z-index: 0;
        }
        .card-bloom:hover::before { opacity: 1; }

        .card-bloom::after {
          content: ""; position: absolute; inset: 0; border-radius: 26px;
          background: linear-gradient(115deg, transparent 0%, rgba(255,255,255,0.0) 35%, rgba(255,255,255,0.60) 50%, rgba(255,255,255,0.0) 65%, transparent 100%);
          opacity: 0; transform: translateX(-60%); pointer-events: none; z-index: 0;
        }
        .card-bloom:hover::after { opacity: 0.70; animation: shimmerSweep 1.8s ease-in-out infinite; }
        @keyframes shimmerSweep { 0% { transform: translateX(-60%); } 100% { transform: translateX(60%); } }

        .card-pop-in { animation: cardPopIn 520ms cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes cardPopIn {
          0% { filter: saturate(1) brightness(1); }
          35% { filter: saturate(1.06) brightness(1.03); }
          70% { filter: saturate(1.02) brightness(1.01); }
          100% { filter: saturate(1) brightness(1); }
        }

        .card-bloom > * { position: relative; z-index: 1; }

        .ripple-effect {
          position: absolute; border-radius: 50%; background: rgba(255,255,255,0.6);
          width: 10px; height: 10px; transform: translate(-50%, -50%) scale(0); pointer-events: none;
          animation: ripple-anim 0.6s ease-out; z-index: 0;
        }
        @keyframes ripple-anim { to { transform: translate(-50%, -50%) scale(12); opacity: 0; } }

        .soft-fade { animation: softFade 320ms cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes softFade {
          0% { opacity: 0.78; filter: blur(1.0px); transform: translateY(2px); }
          100% { opacity: 1; filter: blur(0); transform: translateY(0); }
        }

        .progress-glow { box-shadow: 0 0 12px rgba(255,143,171,0.6), 0 0 24px rgba(255,143,171,0.4); }

        .fund-item { position: relative; overflow: hidden; }
        .fund-item::before{
          content:""; position:absolute; inset:-1px; border-radius: 14px;
          background: radial-gradient(320px circle at 30% 20%, rgba(255,143,171,0.22), rgba(137,207,240,0.12) 35%, transparent 70%);
          opacity: 0; transition: opacity 420ms ease; pointer-events:none;
        }
        .fund-item:hover::before{ opacity: 1; }
        .fund-item:hover{
          transform: translateY(-1px) scale(1.01);
          box-shadow: 0 10px 26px rgba(255,143,171,0.18);
          border-color: rgba(255, 194, 209, 0.85);
        }

        .ghost-out { animation: ghostFadeOut 260ms cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .ghost-in { animation: ghostFadeIn 260ms cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes ghostFadeOut {
          0% { opacity: 1; filter: blur(0px); transform: translateY(0px); }
          100% { opacity: 0; filter: blur(1.2px); transform: translateY(1px); }
        }
        @keyframes ghostFadeIn {
          0% { opacity: 0; filter: blur(1.2px); transform: translateY(1px); }
          100% { opacity: 1; filter: blur(0px); transform: translateY(0px); }
        }

        @media (prefers-reduced-motion: reduce) {
          .soft-fade, .card-bloom, .card-bloom::before, .card-bloom::after, .ripple-effect, .card-pop-in, .ghost-out, .ghost-in { animation: none !important; transition: none !important; }
          .fund-item, .fund-item::before { transition: none !important; }
        }
      `}</style>
    </div>
  );
}
