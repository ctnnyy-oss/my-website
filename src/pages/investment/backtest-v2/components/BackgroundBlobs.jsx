import React from "react";

const BackgroundBlobs = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
    <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-[#FFDEE9] rounded-full mix-blend-multiply filter blur-[120px] opacity-60 animate-blob-breathe"></div>
    <div className="absolute top-[10%] right-[-10%] w-[50%] h-[50%] bg-[#E0F7FA] rounded-full mix-blend-multiply filter blur-[120px] opacity-50 animate-blob-breathe animation-delay-2000"></div>
    <div className="absolute bottom-[-20%] left-[20%] w-[60%] h-[60%] bg-[#F8C8DC] rounded-full mix-blend-multiply filter blur-[100px] opacity-40 animate-blob-breathe animation-delay-4000"></div>
  </div>
);

export default BackgroundBlobs;
