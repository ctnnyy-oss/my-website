// src/themes/homeThemes.js
// ✅ Home 主页主题清单（只存“颜色对象”，不复制页面代码 → 不会冗余）

export const HOME_THEMES = [
  {
    id: "sakura",
    name: "樱花糖",
    tone: "sakura",
    titleGradient:
      "linear-gradient(135deg, #FF2D8A 0%, #FF7DBD 45%, #FFD0E8 100%)",
    titleShadow: "drop-shadow(0 14px 26px rgba(255,45,138,0.18))",
    divider: "#FFB4D6",
    chipBg: "rgba(255, 236, 246, 0.76)",
    chipText: "#6B2E3B",
    textMain: "#6B2E3B",
    textSub: "#B07D95",
    swatches: ["#FF2D8A", "#FF7DBD", "#FFD0E8"],
  },
  {
    id: "cotton",
    name: "棉花糖",
    tone: "cotton",
    titleGradient:
      "linear-gradient(135deg, #FF4FA0 0%, #FFB0D7 55%, #F7E3FF 100%)",
    titleShadow: "drop-shadow(0 14px 26px rgba(255,79,160,0.16))",
    divider: "#FFC1E0",
    chipBg: "rgba(255, 238, 248, 0.74)",
    chipText: "#6D2E44",
    textMain: "#6D2E44",
    textSub: "#B1879B",
    swatches: ["#FF4FA0", "#FFB0D7", "#F7E3FF"],
  },
  {
    id: "strawberry",
    name: "草莓牛奶",
    tone: "strawberry",
    titleGradient:
      "linear-gradient(135deg, #FF3B73 0%, #FF9AB8 52%, #FFE8F0 100%)",
    titleShadow: "drop-shadow(0 14px 26px rgba(255,59,115,0.17))",
    divider: "#FFB6CE",
    chipBg: "rgba(255, 240, 245, 0.78)",
    chipText: "#7A2D3E",
    textMain: "#7A2D3E",
    textSub: "#B67F93",
    swatches: ["#FF3B73", "#FF9AB8", "#FFE8F0"],
  },
  {
    id: "iphone15",
    name: "iPhone 15 粉",
    tone: "iphone15",
    titleGradient:
      "linear-gradient(135deg, #FAD0DA 0%, #FF7EA9 50%, #FF3B86 100%)",
    titleShadow: "drop-shadow(0 14px 26px rgba(255,59,134,0.13))",
    divider: "#FAD0DA",
    chipBg: "rgba(255, 244, 247, 0.82)",
    chipText: "#6A3143",
    textMain: "#6A3143",
    textSub: "#B38A9B",
    swatches: ["#FAD0DA", "#FF7EA9", "#FF3B86"],
  },
];

export const DEFAULT_HOME_THEME_ID = "sakura";

export function getHomeThemeById(id) {
  return (
    HOME_THEMES.find((t) => t.id === id) ||
    HOME_THEMES.find((t) => t.id === DEFAULT_HOME_THEME_ID) ||
    HOME_THEMES[0]
  );
}
