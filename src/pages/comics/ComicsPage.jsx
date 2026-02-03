import React from "react";
import { Image as ImageIcon } from "lucide-react";

import SimpleListPage from "../../components/SimpleListPage";

export default function ComicsPage({ onBack, onOpenComicReader }) {
  return (
    <SimpleListPage
      title="漫画 (Comics)"
      subtitle="黑白线条下的趣味日常"
      Icon={ImageIcon}
      onBack={onBack}
      onOpenComicReader={onOpenComicReader}
      dataPath="Comics/index.json"
      editHint="public/Comics/index.json"
      assetHint="public/Comics/（放封面图）"
      emptyHint="先在 public/Comics/index.json 里加一条作品吧～"
    />
  );
}
