import { useEffect, useRef, useState } from "react";

const easeOutElastic = (t) => {
  const c4 = (2 * Math.PI) / 3;
  return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
};

export const useTweenNumber = (target, duration = 680) => {
  const [val, setVal] = useState(() => (Number.isFinite(Number(target)) ? Number(target) : target));
  const rafRef = useRef(null);
  const fromRef = useRef(Number.isFinite(Number(target)) ? Number(target) : 0);
  const lastTargetRef = useRef(target);

  useEffect(() => {
    const isNum = Number.isFinite(Number(target));
    if (!isNum) {
      setVal(target);
      lastTargetRef.current = target;
      return;
    }

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
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return val;
};
