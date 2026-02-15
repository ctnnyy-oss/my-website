import React from "react";

const TopToolbar = ({ children }) => {
  return <header className="h-[58px] flex items-center px-5 bg-white/30 backdrop-blur-sm border-b border-white/40">{children}</header>;
};

export default TopToolbar;
