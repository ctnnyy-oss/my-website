import React from "react";

import { useTweenNumber } from "../hooks/useTweenNumber";

const AnimatedValue = ({ value, formatter, duration = 680, className = "" }) => {
  const isNum = Number.isFinite(Number(value));
  const v = useTweenNumber(value, duration);
  if (!isNum) return <span className={className}>{formatter ? formatter(value) : String(value)}</span>;
  const out = formatter ? formatter(v) : String(v);
  return <span className={className}>{out}</span>;
};

export default AnimatedValue;
