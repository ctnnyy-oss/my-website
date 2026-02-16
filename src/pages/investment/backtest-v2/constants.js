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
    explain: {
      definition: "从开始投资到当前，总资产相对总投入的变化比例。",
      focus: "反映这段时间整体赚了多少或亏了多少。",
      judgment: "数值越高越好；小于 0 表示总体亏损。",
      example: "投入 10 万，现值 11 万，累计收益率约 10%。",
      formula: "（期末资产−累计投入）÷ 累计投入",
    },
  },
  {
    label: "真实收益率",
    key: "realReturn",
    icon: Sparkles,
    fmt: (v) => `${Number(v || 0).toFixed(2)}%`,
    color: "#34C759",
    explain: {
      definition: "在收益基础上扣除波动影响后的修正收益。",
      focus: "用来避免高收益但波动很大造成的误判。",
      judgment: "同等收益下，真实收益率更高的策略通常更稳健。",
      example: "两策略年化都约 12%，波动更小者真实收益率更高。",
      formula: "近似：年化收益率 − 0.5 × 波动率²",
    },
  },
  {
    label: "年化收益率",
    key: "irr",
    icon: Activity,
    fmt: (v) => `${Number(v || 0).toFixed(2)}%`,
    color: "#BB6BD9",
    explain: {
      definition: "把当前区间收益折算成每年复合增长率的结果。",
      focus: "便于不同投资时长之间横向比较。",
      judgment: "数值越高，长期复利能力通常越强。",
      example: "18 个月赚 15%，可折算为统一年化水平再比较。",
      formula: "XIRR（现金流年化复合收益）",
    },
  },
  {
    label: "年化波动率",
    key: "volatility",
    icon: BarChart2,
    fmt: (v) => `${Number(v || 0).toFixed(2)}%`,
    color: "#6FCF97",
    explain: {
      definition: "收益上下波动幅度折算到年度后的标准化指标。",
      focus: "衡量净值抖动程度，不是收益高低本身。",
      judgment: "数值越低通常越稳；过高意味着回撤风险更大。",
      example: "两策略收益接近时，波动率低者持有体验更平稳。",
      formula: "日收益率标准差 × √252",
    },
  },
  {
    label: "最大回撤",
    key: "maxDrawdown",
    icon: ShieldCheck,
    fmt: (v) => `${Number(v || 0).toFixed(2)}%`,
    color: "#F2C94C",
    explain: {
      definition: "历史任一高点到后续最低点的最大跌幅。",
      focus: "描述最差时刻可能会亏多少。",
      judgment: "绝对值越小越好，抗风险能力通常更强。",
      example: "从 100 跌到 80，最大回撤为 -20%。",
      formula: "（谷值−峰值）÷ 峰值",
    },
  },
  {
    label: "回撤修复",
    key: "recovery",
    icon: RotateCcw,
    fmt: (v) => (typeof v === "number" ? `${Math.round(v)}天` : String(v)),
    color: "#2F80ED",
    explain: {
      definition: "从最大回撤低点回到前高所花时间。",
      focus: "体现策略跌后恢复速度。",
      judgment: "天数越短越好；未修复表示尚未回到前高。",
      example: "低点到重回前高用了 42 天，则回撤修复 = 42 天。",
      formula: "修复天数 = 回到前高日期 − 回撤低点日期",
    },
  },
  {
    label: "夏普比率",
    key: "sharpe",
    icon: Scale,
    fmt: (v) => Number(v || 0).toFixed(3),
    color: "#F2C94C",
    explain: {
      definition: "每承担一单位总波动，获得多少单位超额回报。",
      focus: "收益与总风险的综合效率指标。",
      judgment: "一般越高越好；同风险下更高值更优。",
      example: "A 和 B 收益接近时，夏普更高者风险调整后更划算。",
      formula: "（年化收益−无风险利率）÷ 年化波动率",
    },
  },
  {
    label: "卡玛比率",
    key: "calmar",
    icon: ShieldCheck,
    fmt: (v) => Number(v || 0).toFixed(3),
    color: "#FF9F6B",
    explain: {
      definition: "年化收益相对于最大回撤的效率比。",
      focus: "强调收益与回撤的平衡能力。",
      judgment: "越高越好，说明在回撤约束下收益效率更高。",
      example: "两策略年化相近时，回撤更小者卡玛更高。",
      formula: "年化收益 ÷ |最大回撤|",
    },
  },
  {
    label: "索提诺比率",
    key: "sortino",
    icon: Scale,
    fmt: (v) => Number(v || 0).toFixed(3),
    color: "#7C83FD",
    explain: {
      definition: "每承担一单位下行风险，获得多少超额回报。",
      focus: "只惩罚向下波动，比夏普更关注亏损风险。",
      judgment: "越高越好；下跌更可控且收益更好时更高。",
      example: "两策略总波动相近，但下跌更少者索提诺更高。",
      formula: "（年化收益−无风险利率）÷ 下行波动率",
    },
  },
];
