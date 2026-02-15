import React from "react";

import { THEME } from "../constants";

const ToggleGroup = ({ options, value, onChange }) => (
  <div className="bg-white/40 p-1 rounded-2xl flex border border-white/60 backdrop-blur-md">
    {options.map((opt) => {
      const active = value === opt.value;
      const disabled = !!opt.disabled;
      return (
        <button
          key={opt.value}
          disabled={disabled}
          onClick={() => {
            if (!disabled) onChange(opt.value);
          }}
          className={`ripple-button flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl text-[11px] font-bold transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] relative overflow-hidden group
            ${disabled ? "text-[#8B4F58]/30 cursor-not-allowed opacity-60" : active ? "text-white shadow-lg transform scale-[1.03]" : "text-[#8B4F58]/60 hover:text-[#FF8596] hover:bg-white/40"}`}
          style={{
            background: !disabled && active ? opt.activeGradient || THEME.colors.primaryGradient : "transparent",
            boxShadow: !disabled && active ? "0 6px 16px rgba(255, 153, 168, 0.32)" : "none",
          }}
        >
          {opt.icon && <opt.icon size={14} strokeWidth={2.5} className="relative z-10" />}
          <span className="truncate relative z-10">{opt.label}</span>
        </button>
      );
    })}
  </div>
);

export default ToggleGroup;
