import { dateToTime } from "./date.js";

export const validateFundCode = (code) => /^\d{6}$/.test(String(code || "").trim());

export const validateDate = (dateStr) => {
  const t = dateToTime(dateStr);
  return Number.isFinite(t) && t < Date.now();
};
