import { useEffect } from "react";

/**
 * 3D 卡片悬浮效果 + 按钮波纹特效
 *
 * 用法：
 *   const cardFXProps = useCardFX();
 *   <div {...cardFXProps} className="card-bloom ...">
 */
export const useCardFX = () => {
  // --- 鼠标光晕跟随（不倾斜） ---
  const handleCardMouseMove = (e) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    el.style.setProperty("--mx", `${(x / rect.width) * 100}%`);
    el.style.setProperty("--my", `${(y / rect.height) * 100}%`);
  };

  const handleCardMouseLeave = (e) => {
    const el = e.currentTarget;
    el.style.removeProperty("--mx");
    el.style.removeProperty("--my");
  };

  // --- 按钮点击波纹 ---
  useEffect(() => {
    const handleRipple = (e) => {
      const button = e.target?.closest?.(".ripple-button");
      if (!button) return;
      const rect = button.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const ripple = document.createElement("span");
      ripple.className = "ripple-effect";
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      button.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    };
    document.addEventListener("click", handleRipple);
    return () => document.removeEventListener("click", handleRipple);
  }, []);

  return { onMouseMove: handleCardMouseMove, onMouseLeave: handleCardMouseLeave };
};