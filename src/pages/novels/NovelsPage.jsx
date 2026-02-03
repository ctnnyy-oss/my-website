import React from "react";
import { BookOpen } from "lucide-react";

import SimpleListPage from "../../components/SimpleListPage";

export default function NovelsPage({ onBack, onOpenReader }) {
  return (
    <SimpleListPage
      variant="shelf"
      title="小说 (Novels)"
      subtitle="沉浸式阅读我的奇幻世界"
      Icon={BookOpen}
      onBack={onBack}
      onOpenReader={onOpenReader}
      dataPath="Novels/index.json"
      editHint="public/Novels/index.json"
      assetHint="public/Novels/data/<novel_id>/cover.(png/jpg/svg)"
      emptyHint="先在 public/Novels/index.json 里加一条作品吧～"
    />
  );
}
