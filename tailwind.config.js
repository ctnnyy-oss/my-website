/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // 漫画阅读页：奶油淡粉、低对比、语义色（禁止在阅读页内写死 #xxx）
      colors: {
        comic: {
          bg: "#FFF9FB",
          "bg-mist": "#FFF5F8",
          border: "#E8D4DC",
          "border-soft": "#F0DCE4",
          text: "#5C3D45",
          "text-muted": "#9B7A85",
          accent: "#D4849A",
          "accent-hover": "#C97A8F",
        },
      },
      animation: {
        blob: "blob 15s infinite alternate", // 背景光球流动
        'bounce-slow': 'bounce 4s infinite', // 花朵缓慢跳动
        'fade-in-up': 'fadeInUp 0.8s ease-out', // 卡片浮现
      },
      keyframes: {
        blob: {
          "0%": { transform: "translate(0px, 0px) scale(1)" },
          "33%": { transform: "translate(30px, -50px) scale(1.1)" },
          "66%": { transform: "translate(-20px, 20px) scale(0.9)" },
          "100%": { transform: "translate(0px, 0px) scale(1)" },
        },
        fadeInUp: {
          "from": { opacity: 0, transform: "translateY(20px)" },
          "to": { opacity: 1, transform: "translateY(0)" }
        }
      },
    },
  },
  plugins: [],
}