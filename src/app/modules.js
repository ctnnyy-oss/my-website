import {
  BookOpen,
  Video,
  Palette,
  Gamepad2,
  Image as ImageIcon,
  TrendingUp,
} from "lucide-react";

export const MODULES = [
  {
    id: "novels",
    title: "小说 (Novels)",
    subtitle: "沉浸式阅读我的奇幻世界",
    icon: BookOpen,
    accent: "from-[#FFD1E0] to-[#FF8FB5]",
  },
  {
    id: "illustrations",
    title: "插画 (Illustrations)",
    subtitle: "Procreate 里的灵感碎片 ✨",
    icon: Palette,
    accent: "from-[#FFD1E0] to-[#E9D9FF]",
  },
  {
    id: "comics",
    title: "漫画 (Comics)",
    subtitle: "黑白线条下的趣味日常",
    icon: ImageIcon,
    accent: "from-[#FFE0EA] to-[#FF9EB5]",
  },
  {
    id: "animations",
    title: "Live2D 动画 (Animations)",
    subtitle: "眨眼、飘发、呼吸的魔法时刻",
    icon: Video,
    accent: "from-[#FFB6CE] to-[#E9D9FF]",
  },
  {
    id: "games",
    title: "游戏 (Games)",
    subtitle: "休息一下，来玩个小游戏吧",
    icon: Gamepad2,
    accent: "from-[#FFE3EE] to-[#FFC2D1]",
  },
  {
    id: "investment",
    title: "投资 (Investment)",
    subtitle: "双子星回测模型 & 基金组合分析",
    icon: TrendingUp,
    accent: "from-[#FFD1E0] to-[#F6C1E6]",
  },
];
