import React from "react";

/**
 * A tiny, always-visible segmented control.
 *
 * Why this exists:
 * - Old version showed BOTH options (e.g. 线性/对数) at the same time.
 * - It should look like soft "pills" instead of a hidden switch.
 */
export default function ToggleGroup({ options, value, onChange, className = "" }) {
  const handleClick = (opt) => {
    if (opt.disabled) return;
    if (opt.value === value) return;
    onChange?.(opt.value);
  };

  return (
    <div
      className={`flex items-center gap-1 p-1 bg-white/55 rounded-xl border border-white/70 shadow-[0_8px_20px_rgba(255,143,171,0.10)] backdrop-blur-md ${className}`}
      role="group"
      aria-label="toggle group"
    >
      {options.map((opt) => {
        const active = value === opt.value;
        const Icon = opt.icon;
        const disabled = !!opt.disabled;

        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleClick(opt)}
            disabled={disabled}
            className={
              `ripple-button px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 whitespace-nowrap ` +
              `transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.98] ` +
              (disabled
                ? "opacity-40 cursor-not-allowed"
                : active
                  ? "text-white shadow-[0_10px_20px_rgba(255,143,171,0.25)]"
                  : "text-[#C5A0A6] hover:bg-white/60")
            }
            style={
              active
                ? { background: "linear-gradient(135deg, #FF8FAB 0%, #FFB6C1 100%)" }
                : undefined
            }
            aria-pressed={active}
            title={disabled ? "当前模式不可用" : opt.label}
          >
            {Icon ? (
              <Icon
                size={12}
                className={active ? "text-white" : "text-current"}
              />
            ) : null}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
