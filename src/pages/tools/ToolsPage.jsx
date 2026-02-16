import React from "react";
import { Wrench, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

import UnifiedCategoryPage from "../../components/UnifiedCategoryPage";

const TOOL_ITEMS = [
  {
    id: "backtest",
    title: "投资组合回撤小工具",
    subtitle: "双子星回测模型 & 基金组合分析",
    icon: TrendingUp,
    accent: "from-[#FFD1E0] to-[#F6C1E6]",
  },
];

export default function ToolsPage() {
  const navigate = useNavigate();

  return (
    <UnifiedCategoryPage
      title="工具"
      subtitle="实用小工具集合"
      icon={Wrench}
      description={
        <>
          <p>
            这里收录了各种实用的小工具和辅助程序。从投资分析到日常效率工具，
            希望能帮到你。
          </p>
          <p>
            目前已有的工具：投资组合回撤分析模型（双子星回测系统），
            支持多基金定投回测、净值曲线对比、收益率分析等功能。
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>投资组合回撤小工具：基金定投回测 & 组合分析</li>
            <li>更多工具开发中，敬请期待...</li>
          </ul>
        </>
      }
      items={TOOL_ITEMS}
      onCardClick={(item) => {
        if (item.id === "backtest") {
          navigate("/tools/backtest");
        }
      }}
      onBack={() => navigate("/")}
    />
  );
}
