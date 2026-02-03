export const fmtMoney = (v) => `¥${Math.round(Number(v) || 0).toLocaleString()}`;

export const formatAssetTick = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return "";
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

export const formatPercentTick = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return "";
  const abs = Math.abs(n);
  if (abs >= 1000) return `${n.toFixed(0)}%`;
  if (abs >= 100) return `${n.toFixed(1)}%`;
  if (abs >= 10) return `${n.toFixed(2)}%`;
  return `${n.toFixed(2)}%`;
};
