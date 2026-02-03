export const LOG_EPS = 0.01;

export const DEFAULT_START_DATE = "2020-01-01";

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
