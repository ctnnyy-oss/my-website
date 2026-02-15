import {
  Activity,
  BarChart2,
  Percent,
  RotateCcw,
  Scale,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export const THEME = {
  colors: {
    primary: "#FF8FAB",
    primarySoft: "#FFC2D1",
    primaryGradient: "linear-gradient(135deg, #FF99A8 0%, #FF5D7D 100%)",
    secondary: "#89CFF0",
    secondarySoft: "#BAE1FF",
    secondaryGradient: "linear-gradient(135deg, #A7C5EB 0%, #6495ED 100%)",
    textMain: "#8B4F58",
    textLight: "#C5A0A6",
    bgGradient: "linear-gradient(180deg, #FFF0F5 0%, #FFF5F7 100%)",
  },
};

export const LOG_EPS = 0.01;
export const DEFAULT_START_DATE = "2020-01-01";
export const RISK_FREE_RATE = 0.02;

export const DEFAULT_CONFIG_A = [
  { code: "001021", weight: 20 },
  { code: "161119", weight: 20 },
  { code: "001512", weight: 20 },
  { code: "008701", weight: 10 },
  { code: "017641", weight: 7.5 },
  { code: "023917", weight: 7.5 },
  { code: "000369", weight: 7.5 },
  { code: "539003", weight: 2.5 },
  { code: "021539", weight: 2.5 },
  { code: "020712", weight: 2.5 },
];

export const DEFAULT_CONFIG_B = [
  { code: "161128", weight: 20 },
  { code: "017091", weight: 20 },
  { code: "021482", weight: 20 },
  { code: "023917", weight: 20 },
  { code: "000369", weight: 20 },
];

export const RANGE_OPTIONS = [
  { key: "1m", label: "近1月", days: 30 },
  { key: "6m", label: "近半年", days: 182 },
  { key: "1y", label: "近1年", days: 365 },
  { key: "3y", label: "近3年", days: 365 * 3 },
  { key: "5y", label: "近5年", days: 365 * 5 },
  { key: "since", label: "成立来", days: null },
];

export const MS_DAY = 24 * 60 * 60 * 1000;

export const METRIC_DEFS = [
  {
    label: "累计收益率",
    key: "totalReturn",
    icon: Percent,
    fmt: (v) => `${Number(v || 0).toFixed(2)}%`,
    color: "#EB5757",
  },
  {
    label: "真实收益率",
    key: "realReturn",
    icon: Sparkles,
    fmt: (v) => `${Number(v || 0).toFixed(2)}%`,
    color: "#34C759",
  },
  {
    label: "年化收益率",
    key: "irr",
    icon: Activity,
    fmt: (v) => `${Number(v || 0).toFixed(2)}%`,
    color: "#BB6BD9",
  },
  {
    label: "年化波动率",
    key: "volatility",
    icon: BarChart2,
    fmt: (v) => `${Number(v || 0).toFixed(2)}%`,
    color: "#6FCF97",
  },
  {
    label: "最大回撤",
    key: "maxDrawdown",
    icon: ShieldCheck,
    fmt: (v) => `${Number(v || 0).toFixed(2)}%`,
    color: "#F2C94C",
  },
  {
    label: "回撤修复",
    key: "recovery",
    icon: RotateCcw,
    fmt: (v) => (typeof v === "number" ? `${Math.round(v)}天` : String(v)),
    color: "#2F80ED",
  },
  {
    label: "夏普比率",
    key: "sharpe",
    icon: Scale,
    fmt: (v) => Number(v || 0).toFixed(3),
    color: "#F2C94C",
  },
  {
    label: "卡玛比率",
    key: "calmar",
    icon: ShieldCheck,
    fmt: (v) => Number(v || 0).toFixed(3),
    color: "#FF9F6B",
  },
  {
    label: "索提诺比率",
    key: "sortino",
    icon: Scale,
    fmt: (v) => Number(v || 0).toFixed(3),
    color: "#7C83FD",
  },
];
