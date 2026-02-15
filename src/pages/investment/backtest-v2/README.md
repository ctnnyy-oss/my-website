# 双子星 - 投资组合回测模型

两个投资组合（"细水长流" vs "五等分"）的对比回测工具，支持每日定投和一次性梭哈两种策略。

## 项目结构

```
backtest-v2/
├── index.jsx               # 页面主入口，只负责组装各模块
├── constants.js            # 常量：主题色、基金配置、时间范围等
├── styles.css              # 全局样式：卡片光效、波纹动画等
│
├── hooks/                  # 逻辑层（状态管理 & 数据处理）
│   ├── useBacktest.js      #   回测核心 Hook：状态、数据获取、结果计算
│   ├── useChartData.js     #   图表数据 Hook：把回测结果转换成图表格式
│   ├── useCardFX.js        #   交互效果 Hook：3D 鼠标悬浮 + 按钮波纹
│   ├── useTweenNumber.js   #   数字弹性过渡动画
│   └── useTweenChartState.js #  图表曲线丝滑过渡动画
│
├── components/             # 界面层（纯 UI 组件）
│   ├── Sidebar.jsx         #   左侧面板：返回按钮、日期、基金配置、开始回测
│   ├── MetricsPanel.jsx    #   中间面板：9 个指标卡片（收益率、夏普等）
│   ├── ChartSection.jsx    #   右侧面板：回撤曲线 + 资产曲线
│   ├── Tooltips.jsx        #   图表悬浮提示（鼠标移到曲线上时显示）
│   ├── AnimatedValue.jsx   #   带弹性动画的数字显示
│   ├── ToggleGroup.jsx     #   切换按钮组（定投/梭哈、线性/对数等）
│   ├── BackgroundBlobs.jsx #   背景装饰（粉色渐变光斑）
│   └── TopToolbar.jsx      #   顶栏容器
│
├── domain/                 # 计算层（纯业务逻辑，不依赖 React）
│   ├── portfolio.js        #   回测核心算法：定投、再平衡、日历补全
│   └── metrics.js          #   指标计算：XIRR、夏普比率、波动率、最大回撤
│
├── services/               # 数据层（外部 API 调用）
│   └── fundApi.js          #   从天天基金获取净值数据（含分红复权）
│
└── utils/                  # 工具层（通用小函数）
    ├── date.js             #   日期解析、格式化、时区转换
    ├── format.js           #   金额格式化（¥）、百分比格式化
    ├── validate.js         #   基金代码验证（6位数字）、日期验证
    └── math.js             #   插值、坐标轴刻度计算
```

## 数据流

```
用户点击"开启回测之旅"
        │
        ▼
  useBacktest.runBacktest()
        │
        ├── fundApi.fetchOneFund()     从天天基金抓取每只基金的历史净值
        │
        ├── portfolio.calculatePortfolio()   逐日模拟：定投/梭哈 + 每月再平衡
        │
        ▼
  useBacktest.results  ──→  useChartData()  ──→  图表组件渲染
   { dataA, dataB }         转换成图表格式        ChartSection / MetricsPanel
```

## 回测逻辑要点

- **定投模式**：每个交易日定投（最低 40 元），按比例分配到各基金
- **梭哈模式**：第一个交易日一次性投入初始本金
- **再平衡**：每月第一个交易日，总资产按原始比例重新分配（不计费率）
- **非交易日**：不定投，曲线保持水平（净值不变）
- **分红处理**：自动复权（假设分红立即再投资）
- **回测起点**：取"用户设定日期"和"所有基金最晚成立日"中的较晚者

## 想改某个功能？去这里找

| 想改什么 | 去哪个文件 |
|---------|-----------|
| 基金代码或默认配比 | `constants.js` → DEFAULT_CONFIG_A / B |
| 回测计算逻辑 | `domain/portfolio.js` → calculatePortfolio() |
| 指标公式（夏普等） | `domain/metrics.js` |
| 界面颜色/主题 | `constants.js` → THEME |
| 左侧配置面板 | `components/Sidebar.jsx` |
| 图表样式 | `components/ChartSection.jsx` |
| 指标卡片 | `components/MetricsPanel.jsx` |
| 3D 悬浮效果 | `hooks/useCardFX.js` |
| 切换动画 | `hooks/useTweenChartState.js` |
| 数据获取方式 | `services/fundApi.js` |
