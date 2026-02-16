import React, { useEffect, useState } from "react";
import { Palette } from "lucide-react";
import { useNavigate } from "react-router-dom";

import UnifiedCategoryPage from "../../components/UnifiedCategoryPage";
import { normalizeLocalPath } from "../../utils/dataHelpers";
import { withBase } from "../../utils/withBase";

export default function IllustrationsPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(withBase("Illustrations/index.json"))
      .then((r) => r.json())
      .then((data) => {
        const normalized = (Array.isArray(data) ? data : []).map((x, idx) => ({
          id: String(x?.id ?? idx + 1),
          title: x?.title || `插画分类 ${idx + 1}`,
          desc: x?.desc || "",
          cover: x?.cover ? normalizeLocalPath(x.cover) : "",
          data: x?.data ? normalizeLocalPath(x.data) : "",
        }));
        setCategories(normalized);
        setLoading(false);
      })
      .catch(() => {
        setCategories([]);
        setLoading(false);
      });
  }, []);

  const cards = categories.map((item) => ({
    id: item.id,
    title: item.title,
    subtitle: item.desc,
    cover: item.cover,
    accent: "from-[#FFD1E0] to-[#E9D9FF]",
  }));

  return (
    <UnifiedCategoryPage
      title="插画"
      subtitle="Procreate 里的灵感碎片"
      icon={Palette}
      description={
        <>
          <p>这里是插画分类入口。点击右侧分类卡片，进入对应分类的作品墙。</p>
          <p>本页最多展示 6 个分类卡片，方便做持续整理和管理。</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>结构：一级分类卡片</li>
            <li>下一层：该分类的全部作品</li>
            <li>支持图片预览与全屏查看</li>
          </ul>
        </>
      }
      items={cards}
      loading={loading}
      onCardClick={(card) => navigate(`/illustrations/${encodeURIComponent(card.id)}`)}
      onBack={() => navigate("/")}
    />
  );
}
