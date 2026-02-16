import React, { useEffect, useState } from "react";
import { Gamepad2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

import UnifiedCategoryPage from "../../components/UnifiedCategoryPage";
import { withBase } from "../../utils/withBase";
import { isHttpUrl, normalizeLocalPath } from "../../utils/dataHelpers";

export default function GamesPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(withBase("Games/index.json"))
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
    accent: "from-[#FFE3EE] to-[#FFC2D1]",
  }));

  return (
    <UnifiedCategoryPage
      title="游戏"
      subtitle="休息一下，来玩个小游戏吧"
      icon={Gamepad2}
      description={
        <>
          <p>
            这里收录了我开发的小游戏。从创意到实现，每个游戏都是一次有趣的挑战。
          </p>
          <p>
            大部分游戏可以直接在浏览器中运行，也可以跳转到 itch.io 或 GitHub 上体验。
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>类型：网页小游戏、互动体验</li>
            <li>平台：浏览器 / itch.io</li>
            <li>点击卡片打开游戏链接</li>
          </ul>
        </>
      }
      items={cards}
      loading={loading}
      onCardClick={(card) => {
        const original = items.find((i) => (i.id || i.title) === card.id);
        if (!original) return;
        const href = original.link;
        if (!href) return;
        if (isHttpUrl(href)) {
          window.open(href, "_blank", "noopener,noreferrer");
        } else {
          window.open(
            withBase(normalizeLocalPath(href)),
            "_blank",
            "noopener,noreferrer"
          );
        }
      }}
      onBack={() => navigate("/")}
    />
  );
}
