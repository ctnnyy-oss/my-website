import React, { useEffect, useState } from "react";
import { Video } from "lucide-react";
import { useNavigate } from "react-router-dom";

import UnifiedCategoryPage from "../../components/UnifiedCategoryPage";
import { normalizeLocalPath } from "../../utils/dataHelpers";
import { withBase } from "../../utils/withBase";

export default function AnimationsPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(withBase("Animations/index.json"))
      .then((r) => r.json())
      .then((data) => {
        const normalized = (Array.isArray(data) ? data : []).map((x, idx) => ({
          id: String(x?.id ?? idx + 1),
          title: x?.title || `动画分类 ${idx + 1}`,
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
    emoji: "🎬",
    accent: "from-[#FFB6CE] to-[#E9D9FF]",
  }));

  return (
    <UnifiedCategoryPage
      title="动画"
      subtitle="眨眼、呼吸、动态与瞬间"
      icon={Video}
      description={
        <>
          <p>这里是动画分类入口。点击右侧分类卡片，进入对应分类的作品墙。</p>
          <p>分类页最多展示 6 个卡片；每个分类可包含任意数量作品。</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>结构：一级分类卡片</li>
            <li>下一层：该分类的全部视频作品</li>
            <li>支持弹窗播放本地 mp4</li>
          </ul>
        </>
      }
      items={cards}
      loading={loading}
      onCardClick={(card) => navigate(`/animations/${encodeURIComponent(card.id)}`)}
      onBack={() => navigate("/")}
    />
  );
}
