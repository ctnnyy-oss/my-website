import { tsToCNDateStr } from "../utils/date";

export const fetchOneFund = (code) => {
  return new Promise((resolve, reject) => {
    const scriptId = `script-${code}`;
    const oldScript = document.getElementById(scriptId);
    if (oldScript) oldScript.remove();

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = `https://fund.eastmoney.com/pingzhongdata/${code}.js?t=${new Date().getTime()}`;

    script.onload = () => {
      if (window.Data_netWorthTrend) {
        const rawData = window.Data_netWorthTrend;
        const name = window.fS_name || "未知基金";

        let shareMultiplier = 1.0;
        const formatted = rawData.map((item) => {
          const nav = Number(item.y);
          const date = tsToCNDateStr(item.x);
          let dividend = 0;
          if (item.unitMoney && typeof item.unitMoney === "string") {
            const match = item.unitMoney.match(/派现金(\d+(\.\d+)?)元/);
            if (match) dividend = parseFloat(match[1]);
          }
          if (dividend > 0 && nav > 0) {
            shareMultiplier *= 1 + dividend / nav;
          }
          return { date, nav: nav * shareMultiplier };
        });

        window.Data_netWorthTrend = undefined;
        window.fS_name = undefined;
        document.getElementById(scriptId)?.remove();
        resolve({ data: formatted, name });
      } else {
        reject(new Error("无数据"));
      }
    };

    script.onerror = () => reject(new Error("网络错误"));
    document.head.appendChild(script);
  });
};
