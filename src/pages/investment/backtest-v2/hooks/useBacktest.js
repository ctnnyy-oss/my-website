import { useEffect, useMemo, useRef, useState } from "react";

import { DEFAULT_CONFIG_A, DEFAULT_CONFIG_B, DEFAULT_START_DATE } from "../constants";
import { calculatePortfolio } from "../domain/portfolio";
import { fetchOneFund } from "../services/fundApi";
import { validateDate, validateFundCode } from "../utils/validate";

/**
 * 回测核心 Hook —— 管理所有业务状态、数据获取和回测计算
 *
 * 返回值：
 *   - 基金配置 (fundsA/B, params, rangeMode, ...)
 *   - 显示模式 (viewMode, metricMode, scaleMode, strategyMode)
 *   - 运行状态 (loading, progress, error)
 *   - 回测结果 (results)
 *   - 操作函数 (runBacktest, handleResetDefaults, ...)
 */
export const useBacktest = () => {
  // ==================== 基金与参数 ====================
  const [fundsA, setFundsA] = useState(DEFAULT_CONFIG_A);
  const [fundsB, setFundsB] = useState(DEFAULT_CONFIG_B);

  const [params, setParams] = useState(() => {
    const fallback = {
      schemaVersion: 2,
      startDate: DEFAULT_START_DATE,
      initialCapital: 10000,
      dailyAmount: 40,
    };
    try {
      const saved = localStorage.getItem("backtestParams_daily_v1");
      const parsed = saved ? JSON.parse(saved) : null;
      const merged = { ...fallback, ...(parsed || {}) };
      if (!parsed?.schemaVersion && merged.startDate === "2022-01-01")
        merged.startDate = DEFAULT_START_DATE;
      if (!merged.startDate || !validateDate(merged.startDate))
        merged.startDate = DEFAULT_START_DATE;
      merged.schemaVersion = 2;
      return merged;
    } catch {
      return fallback;
    }
  });

  const [rangeMode, setRangeMode] = useState(() => {
    try {
      return localStorage.getItem("backtestRangeMode_v1") || "since";
    } catch {
      return "since";
    }
  });

  // ==================== 显示模式 ====================
  const [activeTab, setActiveTab] = useState("A");
  const [viewMode, setViewMode] = useState("compare");
  const [strategyMode, setStrategyMode] = useState("daily");
  const [metricMode, setMetricMode] = useState("value");
  const [scaleMode, setScaleMode] = useState("linear");

  // ==================== 运行状态 ====================
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [progressRatio, setProgressRatio] = useState(0);
  const [error, setError] = useState(null);
  const [rawDataMap, setRawDataMap] = useState(null);
  const [fundNames, setFundNames] = useState({});

  // ==================== 吐司提示 ====================
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const showToast = (msg) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2200);
  };

  useEffect(
    () => () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    },
    [],
  );

  // ==================== 持久化 ====================
  useEffect(() => {
    try {
      localStorage.setItem("backtestParams_daily_v1", JSON.stringify(params));
    } catch {}
  }, [params]);

  useEffect(() => {
    try {
      localStorage.setItem("backtestRangeMode_v1", rangeMode);
    } catch {}
  }, [rangeMode]);

  // 对数坐标只能看净值（收益率可能有负数，对数会炸）
  useEffect(() => {
    if (metricMode !== "value" && scaleMode === "log") setScaleMode("linear");
  }, [metricMode, scaleMode]);

  // ==================== 操作函数 ====================
  const handleResetDefaults = () => {
    setFundsA(DEFAULT_CONFIG_A);
    setFundsB(DEFAULT_CONFIG_B);
    setParams({
      schemaVersion: 2,
      startDate: DEFAULT_START_DATE,
      initialCapital: 10000,
      dailyAmount: 40,
    });
    setRangeMode("since");
    setActiveTab("A");
    setViewMode("compare");
    setStrategyMode("daily");
    setMetricMode("value");
    setScaleMode("linear");
    setError(null);
    setRawDataMap(null);
    setFundNames({});
    setProgressRatio(0);
    showToast("已恢复默认配置 \u{1F497}");
  };

  const handleClearResults = () => {
    setRawDataMap(null);
    setError(null);
    setProgressRatio(0);
    showToast("已清空回测结果 \u2728");
  };

  const runBacktest = async () => {
    if (!validateDate(params.startDate)) return setError("日期格式不对哦~");

    const allCodes = new Set(
      [...fundsA, ...fundsB]
        .filter((f) => f.code && validateFundCode(f.code))
        .map((f) => f.code),
    );

    if (allCodes.size === 0) {
      setError("请先填写至少一个有效基金代码哦~");
      setProgress("");
      setProgressRatio(0);
      return;
    }

    setLoading(true);
    setError(null);
    setProgress("正在准备获取数据...");
    setProgressRatio(0);

    try {
      const fetchedData = {};
      const fetchedNames = {};
      const codes = Array.from(allCodes);

      for (let i = 0; i < codes.length; i++) {
        setProgress(`正在获取 ${codes[i]} (${i + 1}/${codes.length})...`);
        try {
          const res = await fetchOneFund(codes[i]);
          fetchedData[codes[i]] = res.data;
          fetchedNames[codes[i]] = res.name;
        } catch (e) {
          console.warn(e);
        }
        setProgressRatio((i + 1) / Math.max(1, codes.length));
        await new Promise((r) => setTimeout(r, 200));
      }

      setProgress("数据获取完成，正在生成结果...");
      setRawDataMap(fetchedData);
      setFundNames(fetchedNames);
      showToast("回测完成啦～\u2728");
    } catch (err) {
      setError(err?.message || "回测执行失败");
    } finally {
      setLoading(false);
      setProgress("");
      setProgressRatio(0);
    }
  };

  // ==================== 回测结果计算 ====================
  const results = useMemo(() => {
    if (!rawDataMap) return null;
    const resA = calculatePortfolio(fundsA, rawDataMap, params, strategyMode, rangeMode);
    const resB = calculatePortfolio(fundsB, rawDataMap, params, strategyMode, rangeMode);
    if (!resA && !resB) return null;
    return { dataA: resA, dataB: resB };
  }, [rawDataMap, params, fundsA, fundsB, strategyMode, rangeMode]);

  const progressPct = Math.max(0, Math.min(100, (Number(progressRatio) || 0) * 100));

  // ==================== 返回 ====================
  return {
    // 基金配置
    fundsA, setFundsA,
    fundsB, setFundsB,
    params, setParams,
    rangeMode, setRangeMode,
    activeTab, setActiveTab,
    fundNames,

    // 显示模式
    viewMode, setViewMode,
    strategyMode, setStrategyMode,
    metricMode, setMetricMode,
    scaleMode, setScaleMode,

    // 运行状态
    loading, progress, progressPct, error, toast,

    // 结果
    results,

    // 操作
    runBacktest, handleResetDefaults, handleClearResults,
  };
};
