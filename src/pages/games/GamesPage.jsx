import React from "react";
import { Gamepad2 } from "lucide-react";

import SimpleListPage from "../../components/SimpleListPage";

export default function GamesPage({ onBack }) {
  return (
    <SimpleListPage
      title="游戏 (Games)"
      subtitle="休息一下，来玩个小游戏吧"
      Icon={Gamepad2}
      onBack={onBack}
      dataPath="Games/index.json"
      editHint="public/Games/index.json"
      assetHint="public/Games/（放封面图）"
      emptyHint="先在 public/Games/index.json 里加一条作品吧～"
    />
  );
}
