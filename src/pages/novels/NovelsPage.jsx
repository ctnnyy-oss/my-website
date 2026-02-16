import React, { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";

import UnifiedCategoryPage from "../../components/UnifiedCategoryPage";
import { withBase } from "../../utils/withBase";
import { guessReadableFile, normalizeLocalPath } from "../../utils/dataHelpers";

export default function NovelsPage({ onOpenReader }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(withBase("Novels/index.json"))
      .then((r) => r.json())
      .then((data) => {
        setItems(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setItems([]);
        setLoading(false);
      });
  }, []);

  const cards = items.map((item) => ({
    id: item.id || item.title,
    title: item.title || "(未命名)",
    subtitle: item.desc || (item.tags || []).join(" · ") || "",
    cover: item.cover ? normalizeLocalPath(item.cover) : "",
    accent: "from-[#FFD1E0] to-[#FF8FB5]",
  }));

  return (
    <UnifiedCategoryPage
      title="小说"
      subtitle="沉浸式阅读我的奇幻世界"
      icon={BookOpen}
      description={
        <>
          <p>
            这里收录了我的原创小说作品。每一个故事都承载着独特的世界观与角色，
            希望能带给你沉浸式的阅读体验。
          </p>
          <p>
            我偏爱细腻的情感描写和治愈系的叙事风格，故事里常常有温柔而坚定的羁绊。
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>类型偏好：百合、奇幻、治愈</li>
            <li>更新频率：随心而写</li>
            <li>点击右侧卡片即可开始阅读</li>
          </ul>
        </>
      }
      items={cards}
      loading={loading}
      onCardClick={(card) => {
        const original = items.find((i) => (i.id || i.title) === card.id);
        if (!original) return;
        const file = guessReadableFile(original);
        if (file && onOpenReader) {
          onOpenReader({
            file,
            title: original.title || "",
            meta: {
              cover: card.cover || "",
              desc: original.desc || original.intro || original.description || "",
            },
          });
        }
      }}
      onBack={() => navigate("/")}
    />
  );
}
