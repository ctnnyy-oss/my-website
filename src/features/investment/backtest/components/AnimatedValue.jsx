import React, { useEffect, useRef, useState } from "react";

// easing：弹一下更“QQ”
const easeOutElastic = (t) => {
  const c4 = (2 * Math.PI) / 3;
  return t === 0
    ? 0
    : t === 1
    ? 1
    : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
};

function useTweenNumber(target, duration = 680) {
  const [val, setVal] = useState(target);
  const raf = useRef(null);
  const fromRef = useRef(target);
  const startRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    const to = target;

    if (!Number.isFinite(Number(from)) || !Number.isFinite(Number(to))) {
      setVal(target);
      fromRef.current = target;
      return;
    }

    if (raf.current) cancelAnimationFrame(raf.current);
    startRef.current = performance.now();

    const step = (now) => {
      const t = Math.min(1, (now - startRef.current) / duration);
      const eased = easeOutElastic(t);
      const next = from + (to - from) * eased;
      setVal(next);
      if (t < 1) raf.current = requestAnimationFrame(step);
      else fromRef.current = to;
    };

    raf.current = requestAnimationFrame(step);

    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  return val;
}

export default function AnimatedValue({
  value,
  formatter,
  duration = 680,
  className = "",
}) {
  const tween = useTweenNumber(Number(value) || 0, duration);
  const out = formatter ? formatter(tween) : String(tween);
  return <span className={className}>{out}</span>;
}
