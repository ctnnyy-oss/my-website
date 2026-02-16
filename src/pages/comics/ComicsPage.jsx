import React, { useEffect, useState } from "react";
import { Image as ImageIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";

import UnifiedCategoryPage from "../../components/UnifiedCategoryPage";
import { withBase } from "../../utils/withBase";
import { getComicConfig, normalizeLocalPath } from "../../utils/dataHelpers";

export default function ComicsPage({ onOpenComicReader }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(withBase("Comics/index.json"))
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
    accent: "from-[#FFE0EA] to-[#FF9EB5]",
  }));

  return (
    <UnifiedCategoryPage
      title="漫画"
      subtitle="黑白线条下的趣味日常"
      icon={ImageIcon}
      description={
        <>
          <p>
            这里收录了我的漫画作品。用黑白线条和简洁的画风，
            记录生活中那些有趣的片段和灵光一闪的脑洞。
          </p>
          <p>
            从日常四格到短篇故事，每一幅漫画都是一个小小的世界。
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>风格：日常、四格、黑白线条</li>
            <li>工具：Procreate / iPad</li>
            <li>点击右侧卡片即可阅读漫画</li>
          </ul>
        </>
      }
      items={cards}
      loading={loading}
      onCardClick={(card) => {
        const original = items.find((i) => (i.id || i.title) === card.id);
        if (!original || !onOpenComicReader) return;
        const comicCfg = getComicConfig(original, "comics");
        if (comicCfg) {
          onOpenComicReader({
            title: original.title || "漫画",
            workId: original.id,
            ...comicCfg,
          });
        }
      }}
      onBack={() => navigate("/")}
    />
  );
}
