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

/**
 * ------------------------------------------------------------------
 * 🎨 姐姐的调色盘 & 样式配置
 * ------------------------------------------------------------------
 */
const THEME = {
  colors: {
    primary: '#FF8FAB',       // 细水长流粉
    primarySoft: '#FFC2D1',
    primaryGradient: 'linear-gradient(135deg, #FF99A8 0%, #FF5D7D 100%)',
    secondary: '#89CFF0',     // 五等分蓝
    secondarySoft: '#BAE1FF',
    secondaryGradient: 'linear-gradient(135deg, #A7C5EB 0%, #6495ED 100%)',
    textMain: '#8B4F58',      // 深粉褐（阅读舒适）
    textLight: '#C5A0A6',     // 浅粉灰
    bgGradient: 'linear-gradient(180deg, #FFF0F5 0%, #FFF5F7 100%)',
  }
};

const LOG_EPS = 0.01; // 对数坐标底数保护
const DEFAULT_START_DATE = '2020-01-01';
const RISK_FREE_RATE = 0.02;

// 默认配置
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

// 工具函数
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

// 智能格式化坐标轴
const formatAssetTick = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return '';
  const abs = Math.abs(n);
  if (abs < 1000) return `${Math.round(n)}`;
  if (abs >= 10000) {
    if (abs < 20000) return `${Math.round(n).toLocaleString()}`; // 1万到2万之间显示全数字，避免1.1万这种模糊
    const w = n / 10000;
    if (Math.abs(w) >= 100) return `${w.toFixed(0)}万`;
    return `${w.toFixed(1)}万`;
  }
  return `${(n / 1000).toFixed(0)}k`;
};

const formatPercentTick = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return '';
  const x = Math.abs(n) < 1e-9 ? 0 : n; // 避免 -0.00%
  const abs = Math.abs(x);
  if (abs >= 10) return `${x.toFixed(0)}%`;
  if (abs >= 1) return `${x.toFixed(1)}%`;
  return `${x.toFixed(2)}%`;
};

/**
 * ✨ 背景氛围组件：呼吸的柔光气泡
 */
const BackgroundBlobs = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
    <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-[#FFDEE9] rounded-full mix-blend-multiply filter blur-[120px] opacity-60 animate-blob-breathe"></div>
    <div className="absolute top-[10%] right-[-10%] w-[50%] h-[50%] bg-[#E0F7FA] rounded-full mix-blend-multiply filter blur-[120px] opacity-50 animate-blob-breathe animation-delay-2000"></div>
    <div className="absolute bottom-[-20%] left-[20%] w-[60%] h-[60%] bg-[#F8C8DC] rounded-full mix-blend-multiply filter blur-[100px] opacity-40 animate-blob-breathe animation-delay-4000"></div>
  </div>
);

/**
 * 🔘 胶囊切换按钮组
 */
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
          className={`ripple-button flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl text-[11px] font-bold transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] relative overflow-hidden group
            ${disabled ? 'text-[#8B4F58]/30 cursor-not-allowed opacity-60' : (active ? 'text-white shadow-lg transform scale-[1.03]' : 'text-[#8B4F58]/60 hover:text-[#FF8596] hover:bg-white/40')}`}
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

/**
 * 📊 金融计算核心函数
 */
const calculateXIRR = (cashFlows) => {
  if (cashFlows.length < 2) return 0;
  // 简化版 Newton-Raphson
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

const calculateSharpe = (returns, riskFree = RISK_FREE_RATE) => {
  if (returns.length < 2) return 0;
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length * 252;
  const vol = calculateVolatility(returns) / 100;
  return vol > 0 ? (avgReturn - riskFree) / vol : 0;
};

// 计算最大回撤及区间
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

  // 修复：如果maxDd几乎为0（定投初期常见），认为无回撤
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

/**
 * ✨ 数字滚动动画 Hook
 */
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
      const e = easeOutElastic(p); // 弹性动画
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


/**
 * 🚀 主组件
 */
export default function Backtest({ onBack }) {
  // --- 状态定义 ---
  const [fundsA, setFundsA] = useState(DEFAULT_CONFIG_A);
  const [fundsB, setFundsB] = useState(DEFAULT_CONFIG_B);
  const [params, setParams] = useState(() => {
    const fallback = { schemaVersion: 2, startDate: DEFAULT_START_DATE, initialCapital: 10000, dailyAmount: 40 };
    try {
      const saved = localStorage.getItem('backtestParams_daily_v1');
      const parsed = saved ? JSON.parse(saved) : null;
      const merged = { ...fallback, ...(parsed || {}) };
      // 简单的数据迁移逻辑
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

  const [activeTab, setActiveTab] = useState('A'); // 编辑哪个组合
  const [viewMode, setViewMode] = useState('compare'); // 视图模式: compare, A, B
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [progressRatio, setProgressRatio] = useState(0);
  const [error, setError] = useState(null);
  const [rawDataMap, setRawDataMap] = useState(null); // 原始基金数据缓存
  const [fundNames, setFundNames] = useState({});

  const [strategyMode, setStrategyMode] = useState('daily'); // 'daily' | 'lumpSum'
  const [metricMode, setMetricMode] = useState('value'); // 'value' | 'return'
  const [scaleMode, setScaleMode] = useState('linear'); // 'linear' | 'log'

  // UI 动画过渡状态
  const [uiSwitching, setUiSwitching] = useState(false);
  const [displayResults, setDisplayResults] = useState(null); // 用于展示的最终计算结果
  const switchTimerRef = useRef({ t1: null, t2: null });

  // 吐司提示
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const showToast = (msg) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2200);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (switchTimerRef.current.t1) clearTimeout(switchTimerRef.current.t1);
      if (switchTimerRef.current.t2) clearTimeout(switchTimerRef.current.t2);
    };
  }, []);

  // --- 持久化 ---
  useEffect(() => { try { localStorage.setItem('backtestParams_daily_v1', JSON.stringify(params)); } catch { } }, [params]);
  useEffect(() => { try { localStorage.setItem('backtestRangeMode_v1', rangeMode); } catch { } }, [rangeMode]);

  // 对数坐标下只能看净值，不能看收益率（可能有负数）
  useEffect(() => { if (metricMode !== 'value' && scaleMode === 'log') setScaleMode('linear'); }, [metricMode, scaleMode]);

  // --- 3D 悬停效果逻辑 ---
  const handleCardMouseMove = (e) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const centerX = rect.width / 2, centerY = rect.height / 2;
    // 旋转角度
    const rotateX = ((y - centerY) / centerY) * -8; // 最大8度
    const rotateY = ((x - centerX) / centerX) * 8;

    el.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(8px)`;
    // 光照移动
    el.style.setProperty('--mx', `${(x / rect.width) * 100}%`);
    el.style.setProperty('--my', `${(y / rect.height) * 100}%`);
  };

  const handleCardMouseLeave = (e) => {
    const el = e.currentTarget;
    el.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)';
    el.style.removeProperty('--mx');
    el.style.removeProperty('--my');
  };

  const cardFXProps = { onMouseMove: handleCardMouseMove, onMouseLeave: handleCardMouseLeave };

  // --- 按钮波纹特效 ---
  useEffect(() => {
    const handleRipple = (e) => {
      if (!e.target.classList.contains('ripple-button')) return;
      const button = e.target.closest('.ripple-button');
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

  // --- 业务逻辑 ---

  const handleResetDefaults = () => {
    setFundsA(DEFAULT_CONFIG_A); setFundsB(DEFAULT_CONFIG_B);
    setParams({ schemaVersion: 2, startDate: DEFAULT_START_DATE, initialCapital: 10000, dailyAmount: 40 });
    setRangeMode('since'); setActiveTab('A'); setViewMode('compare');
    setStrategyMode('daily'); setMetricMode('value'); setScaleMode('linear');
    setError(null); setRawDataMap(null); setFundNames({}); setProgressRatio(0);
    showToast('已恢复默认配置 💗');
  };

  const handleClearResults = () => {
    setRawDataMap(null); setError(null); setProgressRatio(0); setDisplayResults(null);
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
          // 天天基金的数据通常已经包含了除权除息（累计净值或者复权净值），
          // 但这里我们简单处理：如果有 unitMoney (分红)，模拟复权
          let shareMultiplier = 1.0;
          const formatted = rawData.map(item => {
            const nav = Number(item.y);
            const date = tsToCNDateStr(item.x);
            // 简单处理分红复权逻辑：假设分红立即再投资
            let dividend = 0;
            if (item.unitMoney && typeof item.unitMoney === 'string') {
              const match = item.unitMoney.match(/派现金(\d+(\.\d+)?)元/);
              if (match) dividend = parseFloat(match[1]);
            }
            if (dividend > 0 && nav > 0) {
              // 当日份额增加倍数 = (净值+分红)/净值
              shareMultiplier *= (1 + dividend / nav);
            }
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
        await new Promise(r => setTimeout(r, 200)); // 避免频繁请求
      }
      setRawDataMap(fetchedData);
      setFundNames(fetchedNames);
      showToast('回测完成啦～✨');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); setProgress(''); setProgressRatio(0); }
  };

  /**
   * 🌟 核心回测逻辑：对齐数据 -> 每日循环 -> 定投/再平衡 -> 生成曲线
   */
  const calculatePortfolio = (portfolioConfig, rawDataMap, params, mode, rangeMode) => {
    const validFunds = portfolioConfig.filter(f => rawDataMap[f.code]);
    if (validFunds.length === 0) return null;
    const validCodes = validFunds.map(f => f.code);

    // 1. 确定统一的起始时间
    // 规则：取（用户设定时间）和（所有基金成立时间中最晚的那个）两者中的较晚者
    // 必须确保所有基金都已经成立，才能开始构建组合
    let maxMinTime = dateToTime(params.startDate);
    validCodes.forEach(code => {
      const d = rawDataMap[code];
      if (d && d.length > 0) {
        const startT = dateToTime(d[0].date);
        if (startT > maxMinTime) maxMinTime = startT;
      }
    });

    // 2. 数据对齐 (基于交易日)
    const dateSet = new Set();
    validCodes.forEach(c => rawDataMap[c].forEach(d => {
      if (dateToTime(d.date) >= maxMinTime) dateSet.add(d.date);
    }));
    const sortedDates = Array.from(dateSet).sort((a, b) => dateToTime(a) - dateToTime(b));

    // 构建查找表
    const lookup = {};
    validCodes.forEach(c => {
      lookup[c] = {};
      rawDataMap[c].forEach(d => lookup[c][d.date] = d.nav);
    });

    // 填充对齐数据（处理某基金某日可能停牌的情况，沿用上一日净值）
    const lastNavs = {};
    // 初始化 lastNavs 为起始日之前的最近净值
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
      // 只有当所有基金都有净值时才开始记录（严谨起见）
      if (validCodes.every(c => row[c] !== undefined)) alignedData.push(row);
    });

    if (alignedData.length < 2) return null;

    // 3. 截取时间段（根据 Range Buttons）
    const endTime = dateToTime(alignedData[alignedData.length - 1].date);
    const opt = RANGE_OPTIONS.find(x => x.key === rangeMode) || RANGE_OPTIONS[RANGE_OPTIONS.length - 1];
    let effectiveStartTime = dateToTime(alignedData[0].date);

    if (opt.days) {
      const rangeStartTime = endTime - opt.days * MS_DAY;
      if (rangeStartTime > effectiveStartTime) effectiveStartTime = rangeStartTime;
    }
    const slicedData = alignedData.filter(r => dateToTime(r.date) >= effectiveStartTime);

    if (slicedData.length < 2) return null;

    // 4. 逐日回测
    const cashFlows = [], curve = [], dailyReturns = [];
    let shares = {}, totalInvested = 0;
    validCodes.forEach(c => shares[c] = 0);

    const totalWeight = validFunds.reduce((a, b) => a + b.weight, 0);
    const getW = (c) => (validFunds.find(f => f.code === c).weight / totalWeight);

    const initialDate = slicedData[0].date;
    let lastMonth = parseDateUTC(initialDate).getUTCMonth();

    // 梭哈模式：第一天买入
    if (mode === 'lumpSum') {
      const cap = Number(params.initialCapital || 0);
      if (cap > 0) {
        totalInvested += cap;
        cashFlows.push({ date: initialDate, amount: -cap });
        validCodes.forEach(c => {
          const amt = cap * getW(c);
          shares[c] = amt / slicedData[0][c];
        });
      }
    }

    // 定投模式：每日金额（最低40）
    const dailyAmt = mode === 'daily' ? Math.max(40, Number(params.dailyAmount || 0)) : 0;

    // 初始化净值归一化所需变量
    let units = totalInvested > 0 ? totalInvested : 0; // 模拟基金份额，用于算净值曲线
    let prevUnitNav = null;
    let peakValue = 0;

    slicedData.forEach((row, idx) => {
      const d = parseDateUTC(row.date), m = d.getUTCMonth();
      // 再平衡判断：每月的第一个交易日（月份变化时）
      const isRebalanceDay = (m !== lastMonth) && idx > 0;

      // 1. 计算当日交易前市值
      let currentTotalValue = 0;
      validCodes.forEach(c => currentTotalValue += shares[c] * row[c]);

      const unitNavBefore = units > 0 ? (currentTotalValue / units) : 1;

      // 2. 每日定投操作 (仅定投模式)
      let dailyInjection = 0;
      if (mode === 'daily') {
        dailyInjection = dailyAmt;
        totalInvested += dailyInjection;
        cashFlows.push({ date: row.date, amount: -dailyInjection });
        // 增加模拟份额
        units += dailyInjection / (unitNavBefore > 0 ? unitNavBefore : 1);
      }

      // 3. 交易操作：再平衡 OR 普通买入
      if (isRebalanceDay) {
        // 再平衡：总资产（含今日定投）按比例重新分配
        const targetTotal = currentTotalValue + dailyInjection;
        validCodes.forEach(c => {
          const targetAmount = targetTotal * getW(c);
          shares[c] = targetAmount / row[c]; // 忽略费率
        });
      } else {
        // 非再平衡日：直接买入对应的份额 (仅定投)
        if (mode === 'daily' && dailyInjection > 0) {
          validCodes.forEach(c => {
            const amt = dailyInjection * getW(c);
            shares[c] += amt / row[c];
          });
        }
      }

      // 4. 结算当日最终市值
      currentTotalValue = 0;
      validCodes.forEach(c => currentTotalValue += shares[c] * row[c]);

      // 记录单位净值用于计算收益率
      const unitNav = units > 0 ? (currentTotalValue / units) : 1;

      if (idx > 0 && prevUnitNav != null && prevUnitNav > 0) {
        dailyReturns.push((unitNav - prevUnitNav) / prevUnitNav);
      }
      prevUnitNav = unitNav;

      // 计算回撤
      if (currentTotalValue > peakValue) peakValue = currentTotalValue;
      const drawdown = peakValue > 0 ? ((currentTotalValue - peakValue) / peakValue) * 100 : 0;

      curve.push({
        date: row.date,
        value: currentTotalValue,
        cost: totalInvested,
        unitNav,
        returnRate: totalInvested > 0 ? ((currentTotalValue - totalInvested) / totalInvested) * 100 : 0,
        drawdown
      });

      lastMonth = m;
    });

    // 指标计算
    const finalVal = curve.length > 0 ? curve[curve.length - 1].value : 0;
    if (finalVal > 0) cashFlows.push({ date: curve[curve.length - 1].date, amount: finalVal });

    const volatility = calculateVolatility(dailyReturns);
    const sharpe = calculateSharpe(dailyReturns);
    const maxDrawdown = curve.length > 0 ? Math.min(...curve.map(d => d.drawdown)) : 0;
    const totalReturn = totalInvested > 0 ? ((finalVal - totalInvested) / totalInvested) * 100 : 0;
    const irr = calculateXIRR(cashFlows);

    const avgDaily = dailyReturns.length > 0 ? dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length : 0;
    const annualReturn = avgDaily * 252;
    const rfDaily = RISK_FREE_RATE / 252;
    const downside = dailyReturns.map(r => Math.min(0, r - rfDaily));
    const downsideVar = downside.length ? downside.reduce((a, b) => a + b * b, 0) / downside.length : 0;
    const downsideDev = downsideVar > 0 ? Math.sqrt(downsideVar) * Math.sqrt(252) : 0;
    const sortino = downsideDev > 0 ? (annualReturn - RISK_FREE_RATE) / downsideDev : 0;
    const maxDdAbs = Math.abs(maxDrawdown) / 100;
    const calmar = maxDdAbs > 0 ? annualReturn / maxDdAbs : 0;
    const realReturn = (annualReturn - 0.5 * Math.pow(volatility / 100, 2)) * 100;

    return { curve, metrics: { totalReturn, maxDrawdown, irr, volatility, sharpe, sortino, calmar, realReturn } };
  };

  /**
   * 📅 补全自然日 (Weekend Filling)
   * 确保曲线在非交易日平行于X轴，不包含定投操作
   */
  const fillCalendarDays = (series) => {
    if (!series || series.length === 0) return series;
    const map = new Map(series.map(r => [r.date, r]));
    const start = series[0].date, end = series[series.length - 1].date;

    // 合并策略：如果当天没有数据，沿用上一天的数据（value, cost, vMain...），但date要是当天
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
        // 缺失日期（周末/节假日）：完全复制上一条数据，只改日期
        dense.push({ ...last, date: cur });
      }
      curT += MS_DAY;
    }
    return dense;
  };

  // --- 结果计算与合成 ---
  const computedResults = useMemo(() => {
    if (!rawDataMap) return null;

    const resA = calculatePortfolio(fundsA, rawDataMap, params, strategyMode, rangeMode);
    const resB = calculatePortfolio(fundsB, rawDataMap, params, strategyMode, rangeMode);

    if (!resA && !resB) return null;

    // 合并两个策略的曲线到同一个时间轴用于画图
    const mapA = new Map(), mapB = new Map();
    if (resA) resA.curve.forEach(d => mapA.set(d.date, d));
    if (resB) resB.curve.forEach(d => mapB.set(d.date, d));

    let dates = [];
    if (viewMode === 'compare') dates = Array.from(new Set([...mapA.keys(), ...mapB.keys()]));
    else if (viewMode === 'A') dates = Array.from(mapA.keys());
    else dates = Array.from(mapB.keys());

    dates.sort((a, b) => dateToTime(a) - dateToTime(b));

    // 填充数据用于图表
    let lastA = null, lastB = null;
    const toFiniteOrNull = (x) => { const n = Number(x); return Number.isFinite(n) ? n : null; };

    const chartDataRaw = [];
    dates.forEach(date => {
      if (mapA.has(date)) lastA = mapA.get(date);
      if (mapB.has(date)) lastB = mapB.get(date);

      if (viewMode === 'compare' && (!lastA || !lastB)) return; // 对比模式下等待两者都有数据

      const a = lastA, b = lastB;
      let vMain, vSub, ddMain, ddSub, cMain, cSub;

      // 根据视图模式选择主次数据
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

      // 对数坐标保护
      vMain = toFiniteOrNull(vMain); vSub = toFiniteOrNull(vSub);
      cMain = toFiniteOrNull(cMain); cSub = toFiniteOrNull(cSub);
      ddMain = toFiniteOrNull(ddMain); ddSub = toFiniteOrNull(ddSub);

      if (scaleMode === 'log' && metricMode === 'value') {
        if (vMain != null) vMain = Math.max(LOG_EPS, vMain);
        if (vSub != null) vSub = Math.max(LOG_EPS, vSub);
        if (cMain != null) cMain = Math.max(LOG_EPS, cMain);
        if (cSub != null) cSub = Math.max(LOG_EPS, cSub);
      }

      chartDataRaw.push({ date, vMain, vSub, cMain, cSub, ddMain, ddSub });
    });

    // 🌟 关键步骤：补全自然日，让曲线在非交易日变平
    const chartData = fillCalendarDays(chartDataRaw);

    // 计算当日涨跌幅 (用于Tooltip)
    const pct = (a, b) => {
      if (a == null || b == null) return 0;
      const aa = Number(a), bb = Number(b);
      if (!Number.isFinite(aa) || !Number.isFinite(bb) || bb <= 0) return 0;
      return ((aa - bb) / bb) * 100;
    };
    for (let i = 0; i < chartData.length; i++) {
      const cur = chartData[i], prev = chartData[i - 1];
      cur.idx = i;
      cur.chgMain = i === 0 ? 0 : pct(cur.vMain, prev?.vMain);
      cur.chgSub = i === 0 ? 0 : pct(cur.vSub, prev?.vSub);
    }

    // 计算Y轴Domain (线性模式下优化显示)
    let yDomainLinearValue = null;
    if (metricMode === 'value' && scaleMode === 'linear' && chartDataRaw.length > 0) {
      const vals = [];
      chartDataRaw.forEach(r => {
        ['vMain', 'vSub', 'cMain', 'cSub'].forEach(k => {
          const v = r?.[k];
          if (typeof v === 'number' && Number.isFinite(v)) vals.push(v);
        });
      });
      if (vals.length > 0) {
        let min = Math.min(...vals), max = Math.max(...vals);
        const span = max - min;
        let pad = span > 0 ? span * 0.015 : 1; // 1.5% padding
        pad = Math.max(pad, 1);
        // 最小值下限为0
        yDomainLinearValue = [Math.max(0, min - pad), max + pad];
      }
    }

    return { dataA: resA, dataB: resB, chartData, yDomainLinearValue };
  }, [rawDataMap, params, fundsA, fundsB, strategyMode, viewMode, metricMode, scaleMode, rangeMode]);

  // 延迟更新UI以实现平滑切换
  useEffect(() => {
    if (!computedResults) { setDisplayResults(null); return; }
    setUiSwitching(true);
    // 简单的淡出淡入逻辑
    if (switchTimerRef.current.t1) clearTimeout(switchTimerRef.current.t1);
    if (switchTimerRef.current.t2) clearTimeout(switchTimerRef.current.t2);

    switchTimerRef.current.t1 = setTimeout(() => { setDisplayResults(computedResults); }, 140);
    switchTimerRef.current.t2 = setTimeout(() => { setUiSwitching(false); }, 320);

    return () => {
      if (switchTimerRef.current.t1) clearTimeout(switchTimerRef.current.t1);
      if (switchTimerRef.current.t2) clearTimeout(switchTimerRef.current.t2);
    };
  }, [computedResults]);

  // --- 衍生数据准备 ---
  const results = displayResults;
  const ddWindows = useMemo(() => {
    if (!results) return null;
    return {
      A: results.dataA?.curve ? calcMaxDrawdownWindow(results.dataA.curve) : null,
      B: results.dataB?.curve ? calcMaxDrawdownWindow(results.dataB.curve) : null,
    };
  }, [results]);

  const mainDdWindow = useMemo(() => {
    if (!ddWindows) return null;
    return viewMode === 'B' ? ddWindows.B : ddWindows.A;
  }, [ddWindows, viewMode]);

  const subDdWindow = useMemo(() => {
    if (!ddWindows) return null;
    return viewMode === 'compare' ? ddWindows.B : null;
  }, [ddWindows, viewMode]);

  // 回撤图Y轴范围优化
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
    // 至少显示到 -5%
    if (Math.abs(min) < 0.05) return [-1, 0];
    const pad = Math.max(0.2, Math.abs(min) * 0.08);
    return [Math.min(min - pad, -0.2), 0];
  }, [results, viewMode]);

  // 动态主题色
  const dynamicStyles = useMemo(() => {
    const mainColor = viewMode === 'B' ? THEME.colors.secondary : THEME.colors.primary;
    const subColor = THEME.colors.secondary;
    return { '--main-color': mainColor, '--sub-color': subColor };
  }, [viewMode]);

  // --- 样式类 ---
  const glassCard = "relative overflow-hidden card-bloom backdrop-blur-xl rounded-[24px] border border-white/60 shadow-[0_8px_32px_rgba(255,182,193,0.10)] bg-white/60 hover:bg-white/70 transition-[transform,box-shadow,background-color] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-[0_16px_64px_rgba(255,153,168,0.24)] active:scale-[0.995]";
  const glassInput = "w-full bg-white/55 border border-white rounded-lg px-3 py-2 text-[13px] text-[#8B4F58] outline-none focus:ring-2 focus:ring-[#FFC2D1] focus:bg-white transition-all shadow-inner";

  const activeFunds = activeTab === 'A' ? fundsA : fundsB;
  const activeWeightSum = useMemo(() => {
    const sum = activeFunds.reduce((acc, f) => acc + (Number(f.weight) || 0), 0);
    return Number.isFinite(sum) ? sum : 0;
  }, [activeFunds]);
  const weightOk = Math.abs(activeWeightSum - 100) < 1e-6;

  // --- 自定义Tooltip ---
  const CustomValueTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const row = payload[0]?.payload || {};
    const showChg = (chg) => {
      const n = Number(chg), v = Number.isFinite(n) ? n : 0;
      const sign = v >= 0 ? "+" : "";
      return `${sign}${v.toFixed(2)}%`;
    };
    const line = (title, value, chg, color) => (
      <div className="mt-2">
        <div className="font-black text-sm" style={{ color }}>{title}：{fmtMoney(value)}</div>
        <div className="text-[11px] font-bold text-[#C5A0A6] mt-1">当日涨跌：{showChg(chg)}</div>
      </div>
    );
    const isCompare = viewMode === "compare", isSingleA = viewMode === "A", isSingleB = viewMode === "B";
    return (
      <div className="px-4 py-3 rounded-2xl bg-white/92 backdrop-blur-xl border border-white/70 shadow-[0_14px_50px_rgba(255,143,171,0.20)]">
        <div className="text-sm font-black text-[#8B4F58] mb-1">{label}</div>
        {isCompare && (<>{line("🌸 细水长流", row.vMain, row.chgMain, THEME.colors.primary)}{line("❄️ 五等分", row.vSub, row.chgSub, THEME.colors.secondary)}</>)}
        {isSingleA && line("🌸 细水长流", row.vMain, row.chgMain, THEME.colors.primary)}
        {isSingleB && line("❄️ 五等分", row.vMain, row.chgMain, THEME.colors.secondary)}
      </div>
    );
  };

  const CustomReturnTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const row = payload[0]?.payload || {};
    const show = (v) => {
      const n = Number(v), x = Number.isFinite(n) ? n : 0;
      const sign = x >= 0 ? "+" : "";
      return `${sign}${x.toFixed(2)}%`;
    };
    const isCompare = viewMode === "compare", isSingleA = viewMode === "A", isSingleB = viewMode === "B";
    return (
      <div className="px-4 py-3 rounded-2xl bg-white/92 backdrop-blur-xl border border-white/70 shadow-[0_14px_50px_rgba(255,143,171,0.20)]">
        <div className="text-sm font-black text-[#8B4F58] mb-2">{label}</div>
        {isCompare && (<><div className="font-black text-sm" style={{ color: THEME.colors.primary }}>🌸 细水长流：{show(row.vMain)}</div><div className="font-black text-sm mt-2" style={{ color: THEME.colors.secondary }}>❄️ 五等分：{show(row.vSub)}</div></>)}
        {isSingleA && (<div className="font-black text-sm" style={{ color: THEME.colors.primary }}>🌸 细水长流：{show(row.vMain)}</div>)}
        {isSingleB && (<div className="font-black text-sm" style={{ color: THEME.colors.secondary }}>❄️ 五等分：{show(row.vMain)}</div>)}
      </div>
    );
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex font-sans selection:bg-[#FFC2D1] selection:text-[#8B4F58]" style={{ background: '#FFF0F5', ...dynamicStyles }}>
      <BackgroundBlobs />
      <div className="fixed inset-0 pointer-events-none z-[1] noise-overlay"></div>
      <div className="fixed inset-0 pointer-events-none z-[2] vignette"></div>

      {toast && (
        <div className="toast-bounce fixed top-5 left-1/2 -translate-x-1/2 z-[999] px-5 py-2 rounded-full shadow-[0_12px_40px_rgba(255,143,171,0.25)] backdrop-blur-xl border border-white/60" style={{ background: 'linear-gradient(135deg, rgba(255,143,171,0.85) 0%, rgba(255,194,209,0.85) 100%)' }}>
          <span className="text-sm font-black text-white drop-shadow-sm">{toast}</span>
        </div>
      )}

      {/* --- 左侧侧边栏 (360px) --- */}
      <aside className="w-[360px] h-full flex flex-col border-r border-white/40 bg-white/20 backdrop-blur-xl z-20 relative shadow-[4px_0_24px_rgba(255,182,193,0.1)]">
        {/* 顶部标题区 */}
        <div className="p-2 pb-0">
          <div className="bg-white/60 border border-white/70 rounded-[26px] p-3 shadow-[0_10px_28px_rgba(255,182,193,0.16)] mb-2.5 card-bloom">
            <div className="flex items-center justify-between gap-2 mb-2">
              <button onClick={onBack} className="ripple-button flex items-center gap-2 px-3 py-1.5 bg-white/80 backdrop-blur-md rounded-full shadow-sm text-[#8B4F58] font-bold hover:bg-white hover:text-[#FF8FAB] transition-all text-[13px]">
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
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#FF8FAB]"></span> 细水长流</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#89CFF0]"></span> 五等分</span>
              </div>
            </div>
          </div>
        </div>

        {/* 滚动设置区 */}
        <div className="flex-1 min-h-0 px-3.5 py-0 flex flex-col gap-2.5">
          {/* 1. 回测设定 */}
          <div className="bg-white/40 border border-white/50 rounded-2xl p-2.5 shadow-sm backdrop-blur-md card-bloom">
            <div className="flex items-center gap-2 mb-2 text-[#8B4F58] font-bold text-[14px]">
              <Calendar size={14} /> 回测设定
            </div>

            <div className="space-y-1.5">
              <div>
                <label className="text-[11px] font-bold text-[#C5A0A6] mb-1 block">开始日期</label>
                <input type="date" value={params.startDate} onChange={e => setParams({ ...params, startDate: e.target.value })} className={glassInput} />
              </div>
              {strategyMode === 'lumpSum' ? (
                <div>
                  <label className="text-[11px] font-bold text-[#C5A0A6] mb-1 block">初始本金</label>
                  <input type="number" value={params.initialCapital} onChange={e => setParams({ ...params, initialCapital: Number(e.target.value) })} className={glassInput} />
                </div>
              ) : (
                <div>
                  <label className="text-[11px] font-bold text-[#C5A0A6] mb-1 block">定投金额</label>
                  <input type="number" step="0.01" value={params.dailyAmount} onChange={e => setParams({ ...params, dailyAmount: Number(e.target.value) })} className={glassInput} />
                </div>
              )}
            </div>
          </div>

          {/* 2. 基金配置 */}
          <div className="bg-white/40 border border-white/50 rounded-2xl p-2.5 shadow-sm backdrop-blur-md card-bloom flex flex-col flex-1 min-h-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-[#8B4F58] font-bold text-[14px]">
                <Layers size={14} /> 基金配置
              </div>
              <span className={`text-[11px] font-black px-2 py-0.5 rounded-full border ${weightOk ? 'bg-[#E0F7FA] text-[#00BCD4] border-[#B2EBF2]' : 'bg-[#FFEBEE] text-[#FF5252] border-[#FFCDD2]'}`}>
                {activeWeightSum.toFixed(0)}%
              </span>
            </div>

            <div className="flex bg-white/40 rounded-lg p-0.5 mb-2">
              <button onClick={() => setActiveTab('A')} className={`flex-1 py-1.5 rounded-md text-[11px] font-bold transition-all ${activeTab === 'A' ? 'bg-[#FF8FAB] text-white shadow-sm' : 'text-[#C5A0A6]'}`}>细水长流</button>
              <button onClick={() => setActiveTab('B')} className={`flex-1 py-1.5 rounded-md text-[11px] font-bold transition-all ${activeTab === 'B' ? 'bg-[#89CFF0] text-white shadow-sm' : 'text-[#C5A0A6]'}`}>五等分</button>
            </div>

            <div className="flex-1 min-h-0 flex flex-col">
              <div className="grid flex-1 grid-cols-2 gap-2 auto-rows-[minmax(62px,1fr)]">
                {activeFunds.map((fund, idx) => (
                  <div key={idx} className="group relative bg-white/45 p-2 rounded-lg border border-white/50 hover:bg-white/70 transition-all">
                    <div className="flex items-center gap-1 mb-1">
                      <span className="text-[11px] font-mono text-[#FFC2D1] w-4">{String(idx + 1).padStart(2, '0')}</span>
                      <input value={fund.code} onChange={e => {
                        const l = activeTab === 'A' ? [...fundsA] : [...fundsB]; l[idx].code = e.target.value; activeTab === 'A' ? setFundsA(l) : setFundsB(l);
                      }} className="flex-1 bg-transparent text-[12px] font-bold text-[#8B4F58] outline-none min-w-0" placeholder="代码" />
                      <div className="flex items-center gap-0.5">
                        <input type="number" value={fund.weight} onChange={e => {
                          const l = activeTab === 'A' ? [...fundsA] : [...fundsB]; l[idx].weight = Number(e.target.value); activeTab === 'A' ? setFundsA(l) : setFundsB(l);
                        }} className="w-8 text-right bg-transparent text-[12px] font-bold text-[#8B4F58] outline-none" />
                        <span className="text-[11px] text-[#C5A0A6]">%</span>
                      </div>
                    </div>
                    <div className="h-1 w-full bg-white/50 rounded-full overflow-hidden mb-1">
                      <div className={`h-full ${activeTab === 'A' ? 'bg-[#FF8FAB]' : 'bg-[#89CFF0]'}`} style={{ width: `${Math.min(fund.weight, 100)}%` }} />
                    </div>
                    <div className="text-[10px] text-[#C5A0A6] truncate">{fundNames[fund.code] || '未命名基金'}</div>
                    <button onClick={() => {
                      const l = activeTab === 'A' ? [...fundsA] : [...fundsB]; activeTab === 'A' ? setFundsA(l.filter((_, i) => i !== idx)) : setFundsB(l.filter((_, i) => i !== idx));
                    }} className="absolute -top-1 -right-1 p-1 bg-white rounded-full text-[#FF5D7D] shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"><X size={10} /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 底部按钮区 */}
        <div className="p-3 pt-1.5 mt-2.5 bg-white/10 backdrop-blur-md">
          <button onClick={runBacktest} disabled={loading} className="ripple-button w-full py-2.5 rounded-xl font-black text-white text-[15px] shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center justify-center group relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #FF8FAB 0%, #FFB6C1 100%)' }}>
            <span className="z-10 relative">开启回测之旅</span>
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
          </button>
        </div>
      </aside>

      {/* --- 右侧内容区 --- */}
      <main className="flex-1 flex flex-col min-w-0 relative z-10">

        {/* 顶栏 */}
        <header className="h-[58px] flex items-center px-5 bg-white/30 backdrop-blur-sm border-b border-white/40">
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* 回测区间 */}
            <div className="flex items-center bg-white/50 p-1 rounded-xl shadow-inner">
              <span className="px-2 text-[10px] font-bold text-[#C5A0A6]">区间</span>
              <div className="flex gap-1">
                {RANGE_OPTIONS.map(opt => {
                  const active = rangeMode === opt.key;
                  return (
                    <button
                      key={opt.key}
                      onClick={() => setRangeMode(opt.key)}
                      className={`ripple-button px-2 py-1 rounded-lg text-[10px] font-bold transition-all border ${active ? 'text-white border-white/70 shadow-sm' : 'text-[#8B4F58]/60 border-transparent hover:bg-white/40'}`}
                      style={{ background: active ? THEME.colors.primaryGradient : 'rgba(255,255,255,0.25)' }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* View Modes */}
            <div className="flex bg-white/50 p-1 rounded-xl shadow-inner">
              {[
                { id: 'compare', label: '对比', icon: GitCompare, color: '#BFAFB2' },
                { id: 'A', label: '细水长流', icon: Flower, color: '#FF8FAB' },
                { id: 'B', label: '五等分', icon: Snowflake, color: '#89CFF0' }
              ].map(mode => (
                <button key={mode.id} onClick={() => setViewMode(mode.id)} className={`px-3 py-1 rounded-lg text-[11px] font-bold flex items-center gap-2 transition-all ${viewMode === mode.id ? 'bg-white text-[#8B4F58] shadow-sm' : 'text-[#C5A0A6] hover:bg-white/30'}`}>
                  <mode.icon size={11} color={viewMode === mode.id ? mode.color : 'currentColor'} /> {mode.label}
                </button>
              ))}
            </div>
          
            {/* Metric & Scale Toggles */}
            <div className="flex items-center gap-2.5 bg-white/40 px-2.5 py-0.5 rounded-2xl border border-white/50 shadow-sm backdrop-blur-md">
              <ToggleGroup value={metricMode} onChange={setMetricMode} options={[
                { value: 'value', label: '资产', icon: DollarSign },
                { value: 'return', label: '收益', icon: Percent }
              ]} />
              <div className="w-[1px] h-3 bg-[#C5A0A6]/30 mx-1"></div>
              <ToggleGroup value={scaleMode} onChange={setScaleMode} options={[
                { value: 'linear', label: '线性', icon: TrendingUp },
                { value: 'log', label: '对数', icon: Zap, disabled: metricMode !== 'value' }
              ]} />
              <div className="w-[1px] h-3 bg-[#C5A0A6]/30 mx-1"></div>
              <ToggleGroup value={strategyMode} onChange={setStrategyMode} options={[
                { value: 'daily', label: '定投', icon: Layers },
                { value: 'lumpSum', label: '梭哈', icon: ArrowUpRight }
              ]} />
            </div>
          </div>
        </header>

        {/* 内容网格 */}
        {!results ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
            <div className="p-8 bg-white/40 backdrop-blur-xl rounded-[32px] border border-white/60 shadow-xl card-bloom animate-fade-in-up">
              <Flower size={64} className="text-[#FF8FAB] mx-auto mb-4 animate-bounce-slow" />
              <h2 className="text-2xl font-black text-[#8B4F58] mb-2">准备好开始了吗？</h2>
              <p className="text-[#C5A0A6] font-medium">在左侧调整参数，点击“开启回测之旅”</p>
              {error && <div className="mt-4 px-4 py-2 bg-red-50 text-red-400 text-xs rounded-lg border border-red-100 animate-pulse">{error}</div>}
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-0 grid grid-cols-[200px_1fr] gap-3 p-3 overflow-hidden">
            {/* 1. 中间指标列 */}
            <div className={`grid grid-rows-[repeat(9,minmax(0,1fr))] gap-1.5 h-full ${uiSwitching ? 'soft-fade' : ''}`}>
              {[
                { label: '累计收益率', key: 'totalReturn', icon: Percent, fmt: v => `${Number(v || 0).toFixed(2)}%`, color: '#EB5757' },
                { label: '真实收益率', key: 'realReturn', icon: Sparkles, fmt: v => `${Number(v || 0).toFixed(2)}%`, color: '#34C759' },
                { label: '年化收益率', key: 'irr', icon: Activity, fmt: v => `${Number(v || 0).toFixed(2)}%`, color: '#BB6BD9' },
                { label: '年化波动率', key: 'volatility', icon: BarChart2, fmt: v => `${Number(v || 0).toFixed(2)}%`, color: '#6FCF97' },
                { label: '最大回撤', key: 'maxDrawdown', icon: ShieldCheck, fmt: v => `${Number(v || 0).toFixed(2)}%`, color: '#F2C94C' },
                { label: '回撤修复', key: 'recovery', icon: RotateCcw, fmt: v => (typeof v === 'number' ? `${v}天` : String(v)), color: '#2F80ED' },
                { label: '夏普比率', key: 'sharpe', icon: Scale, fmt: v => Number(v || 0).toFixed(3), color: '#F2C94C' },
                { label: '卡玛比率', key: 'calmar', icon: ShieldCheck, fmt: v => Number(v || 0).toFixed(3), color: '#FF9F6B' },
                { label: '索提诺比率', key: 'sortino', icon: Scale, fmt: v => Number(v || 0).toFixed(3), color: '#7C83FD' },
              ].map((m, i) => {
                const getVal = (res, which) => {
                  if (!res || !res.curve || res.curve.length === 0) return 0;
                  const last = res.curve.at(-1);
                  if (m.key === 'value') return last.value;
                  if (m.key === 'cost') return last.cost;
                  if (m.key === 'profit') return (last.value - last.cost);
                  if (m.key === 'recovery') {
                    const w = ddWindows?.[which];
                    if (!w) return '-';
                    if (!w.hasDrawdown) return 0;
                    if (w.recoveryDays == null) return '未修复';
                    return w.recoveryDays;
                  }
                  return res.metrics?.[m.key] ?? 0;
                };
                const valA = results.dataA ? getVal(results.dataA, 'A') : 0;
                const valB = results.dataB ? getVal(results.dataB, 'B') : 0;

                return (
                  <div key={i} className="metric-card relative overflow-hidden bg-white/70 backdrop-blur-xl border border-white/70 rounded-2xl p-2.5 shadow-[0_6px_20px_rgba(255,182,193,0.08)] hover:bg-white hover:scale-[1.02] transition-all duration-300 group flex flex-col justify-center min-h-0">
                    <div className="absolute inset-0 opacity-60" style={{ background: 'linear-gradient(135deg, rgba(255,143,171,0.10) 0%, rgba(137,207,240,0.10) 100%)' }} />
                    <div className="absolute right-2 top-2 h-1.5 w-10 rounded-full opacity-60" style={{ background: m.color }} />
                    <div className="relative">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg text-white shadow-sm" style={{ backgroundColor: m.color }}>
                            <m.icon size={11} />
                          </div>
                          <span className="text-[9px] font-bold text-[#B58F96]">{m.label}</span>
                        </div>
                        <span className="text-[9px] font-bold text-[#C5A0A6] bg-white/70 border border-white/80 px-1.5 py-0.5 rounded-full">#{String(i + 1).padStart(2, '0')}</span>
                      </div>

                      <div className="space-y-1">
                        {(viewMode === 'A' || viewMode === 'compare') && (
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1 text-[9px] font-semibold text-[#C5A0A6]">
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: THEME.colors.primary }}></span>
                              细水长流
                            </span>
                            <div className="text-[12px] font-black" style={{ color: THEME.colors.primary }}>
                              <AnimatedValue value={valA} formatter={m.fmt} />
                            </div>
                          </div>
                        )}
                        {(viewMode === 'B' || viewMode === 'compare') && (
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1 text-[9px] font-semibold text-[#C5A0A6]">
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: THEME.colors.secondary }}></span>
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

            {/* 2. 右侧图表列 */}
            <div className={`flex flex-col gap-3 min-h-0 ${uiSwitching ? 'soft-fade' : ''}`}>

              {/* 上方：回撤图 (40%) */}
              <div className="h-[38%] bg-white/60 backdrop-blur-xl border border-white/60 rounded-[24px] p-3 shadow-sm card-bloom relative flex flex-col">
                <h3 className="text-xs font-bold text-[#8B4F58] mb-1 flex items-center gap-2">
                  <Activity size={14} className="text-[#FF8FAB]" /> 回撤曲线
                  {(mainDdWindow?.hasDrawdown || subDdWindow?.hasDrawdown) && <span className="text-[9px] px-2 py-0.5 bg-[#FFF0F5] text-[#FF8FAB] rounded-full border border-[#FFC2D1]">高亮最大坑</span>}
                </h3>
                <div className="flex-1 w-full min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={results.chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,182,193,0.2)" />
                      <XAxis dataKey="date" tick={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: '#C5A0A6' }} axisLine={false} tickLine={false} width={40} domain={ddDomain} tickFormatter={formatPercentTick} tickCount={5} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.05)' }} formatter={(v) => [`${Number(v).toFixed(2)}%`, '回撤']} />
                      <ReferenceLine y={0} stroke="rgba(255,182,193,0.35)" strokeDasharray="4 4" />
                      {mainDdWindow?.hasDrawdown && <ReferenceArea x1={mainDdWindow.peakDate} x2={mainDdWindow.troughDate} strokeOpacity={0} fill="var(--main-color)" fillOpacity={0.10} />}
                      {subDdWindow?.hasDrawdown && <ReferenceArea x1={subDdWindow.peakDate} x2={subDdWindow.troughDate} strokeOpacity={0} fill="var(--sub-color)" fillOpacity={0.10} />}
                      <Line type="step" dataKey="ddMain" stroke="var(--main-color)" strokeWidth={2} dot={false} animationDuration={1000} strokeLinecap="round" />
                      {viewMode === 'compare' && <Line type="step" dataKey="ddSub" stroke="var(--sub-color)" strokeWidth={2} dot={false} animationDuration={1000} strokeLinecap="round" />}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 下方：资产走势 (60%) */}
              <div className="flex-1 bg-white/60 backdrop-blur-xl border border-white/60 rounded-[24px] p-3 shadow-sm card-bloom relative flex flex-col min-h-0">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="text-xs font-bold text-[#8B4F58] flex items-center gap-2">
                    <TrendingUp size={14} className="text-[#FF8FAB]" /> 资产曲线
                    <span className="text-[9px] px-2 py-0.5 bg-white/60 text-[#C5A0A6] rounded-full border border-white/70">{scaleMode === 'log' ? '对数' : '线性'}</span>
                  </h3>
                  <div className="flex gap-2">
                    {metricMode === 'value' && <div className="flex items-center gap-1 text-[9px] text-[#C5A0A6]"><span className="w-3 h-0.5 border-t border-dashed border-[#FFC2D1]"></span> 投入本金</div>}
                  </div>
                </div>
                <div className="flex-1 w-full min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={results.chartData}>
                      <defs>
                        <linearGradient id="gradMain" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--main-color)" stopOpacity={0.3} /><stop offset="95%" stopColor="#FFF0F5" stopOpacity={0} /></linearGradient>
                        <linearGradient id="gradSub" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--sub-color)" stopOpacity={0.3} /><stop offset="95%" stopColor="#F0F7FF" stopOpacity={0} /></linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,182,193,0.2)" />
                      <XAxis dataKey="date" tickFormatter={t => t.slice(0, 7)} tick={{ fontSize: 9, fill: '#C5A0A6' }} axisLine={false} tickLine={false} dy={10} minTickGap={30} />
                      <YAxis type="number" tick={{ fontSize: 9, fill: '#C5A0A6' }} axisLine={false} tickLine={false} scale={scaleMode} domain={scaleMode === 'log' ? [LOG_EPS, 'auto'] : (metricMode === 'value' && results.yDomainLinearValue ? results.yDomainLinearValue : ['auto', 'auto'])} allowDataOverflow={scaleMode === 'log'} tickFormatter={v => metricMode === 'value' ? formatAssetTick(v) : formatPercentTick(v)} width={45} />
                      <Tooltip content={metricMode === 'value' ? <CustomValueTooltip /> : <CustomReturnTooltip />} cursor={{ stroke: "rgba(197,160,166,0.35)", strokeDasharray: "4 4" }} />
                      <Area type={scaleMode === 'log' ? 'linear' : 'monotone'} dataKey="vMain" stroke="var(--main-color)" strokeWidth={3} fill="url(#gradMain)" animationDuration={1200} baseValue={scaleMode === 'log' ? LOG_EPS : 0} activeDot={{ r: 4, strokeWidth: 2 }} />
                      {viewMode === 'compare' && <Area type={scaleMode === 'log' ? 'linear' : 'monotone'} dataKey="vSub" stroke="var(--sub-color)" strokeWidth={3} fill="url(#gradSub)" animationDuration={1200} baseValue={scaleMode === 'log' ? LOG_EPS : 0} activeDot={{ r: 4, strokeWidth: 2 }} />}
                      {metricMode === 'value' && (<><Line type={scaleMode === 'log' ? 'linear' : 'monotone'} dataKey="cMain" stroke="var(--main-color)" strokeWidth={1.5} dot={false} strokeDasharray="6 6" strokeOpacity={0.6} animationDuration={900} /><Line type={scaleMode === 'log' ? 'linear' : 'monotone'} dataKey="cSub" stroke="var(--sub-color)" strokeWidth={1.5} dot={false} strokeDasharray="6 6" strokeOpacity={0.6} animationDuration={900} /></>)}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #FFC2D1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .card-bloom { transform-style: preserve-3d; will-change: transform; transition: all 0.3s ease; }
        .card-bloom:hover { transform: translateY(-2px); box-shadow: 0 10px 30px rgba(255,182,193,0.2); }
        .metric-card::before { content: ""; position: absolute; inset: 0; background: radial-gradient(120px 80px at 15% 10%, rgba(255,255,255,0.9), transparent 70%); opacity: 0.5; }
        .metric-card::after { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(255,255,255,0.5), rgba(255,255,255,0)); opacity: 0.35; }
        .soft-fade { animation: softFade 0.4s ease-out; }
        @keyframes softFade { from { opacity: 0.8; transform: translateY(4px); filter: blur(2px); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
        .noise-overlay { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)' opacity='.08'/%3E%3C/svg%3E"); opacity: 0.4; mix-blend-mode: overlay; }
        .vignette { background: radial-gradient(circle at center, transparent 0%, rgba(255,240,245,0.3) 100%); }
        .ripple-button { position: relative; overflow: hidden; }
        .ripple-button::after { content: ""; position: absolute; top: 50%; left: 50%; width: 5px; height: 5px; background: rgba(255,255,255,0.5); opacity: 0; border-radius: 100%; transform: scale(1, 1) translate(-50%); transform-origin: 50% 50%; }
        @keyframes ripple { 0% { transform: scale(0, 0); opacity: 1; } 20% { transform: scale(25, 25); opacity: 1; } 100% { opacity: 0; transform: scale(40, 40); } }
        .ripple-button:focus:not(:active)::after { animation: ripple 1s ease-out; }
      `}</style>
    </div>
  );
}
