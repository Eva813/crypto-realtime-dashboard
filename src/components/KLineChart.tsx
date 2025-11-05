import { useEffect, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  CandlestickSeries,
  type IChartApi,
  type ISeriesApi,
} from "lightweight-charts";
import { useKLineChart } from "../hooks/useCrypto";
import { useChartStore } from "../stores";
import { ChartLoadingSpinner } from "./common/LoadingSpinner";
import type { Cryptocurrency, TimeFrame } from "../types/index";
import "./KLineChart.css";

interface KLineChartProps {
  crypto: Cryptocurrency | null;
  onClose: () => void;
}

/**
 * KLineChart 組件 - 顯示加密貨幣 K線圖
 *
 * 學習重點：
 * 1. 使用 lightweight-charts 庫渲染專業的金融圖表
 * 2. useEffect 管理圖表的生命週期（創建、更新、銷毀）
 * 3. useRef 保存圖表實例，避免不必要的重新渲染
 * 4. 條件渲染：根據數據狀態顯示 loading、error 或圖表
 */
export function KLineChart({ crypto, onClose }: KLineChartProps) {
  // useRef：保存 DOM 容器和圖表實例的引用
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  const { selectedTimeFrame, setTimeFrame } = useChartStore();
  // 解構 isFetching 狀態用於追蹤所有網絡請求（不使用 isLoading，因為它無法追蹤有緩存時的請求）
  const { klines, isFetching, error } = useKLineChart(crypto?.symbol || "");

  // 控制 loading overlay 的顯示狀態
  const [showLoading, setShowLoading] = useState(true);
  const [isLoadingFadingOut, setIsLoadingFadingOut] = useState(false);
  // 追蹤圖表是否已經完全渲染就緒
  const [isChartReady, setIsChartReady] = useState(false);

  // useEffect 1: 圖表創建邏輯（只在切換幣種或時間間隔時執行）
  useEffect(() => {
    // 防護條件：確保所有必要條件都滿足才創建圖表
    // 1. DOM 容器必須存在
    // 2. 必須有選中的加密貨幣
    if (!containerRef.current || !crypto) {
      setIsChartReady(false);
      return;
    }

    // 重置圖表就緒狀態
    setIsChartReady(false);

    // 清理舊圖表：防止重複創建導致內存洩漏
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      seriesRef.current = null;
    }

    // 創建新圖表實例
    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#ffffff" },
        textColor: "#333",
      },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });

    // 添加 K線系列（蠟燭圖）
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#16c784", // 上漲顏色（綠色）
      downColor: "#ea3943", // 下跌顏色（紅色）
      wickUpColor: "#16c784", // 上漲影線顏色
      wickDownColor: "#ea3943", // 下跌影線顏色
      borderUpColor: "#16c784",
      borderDownColor: "#ea3943",
    });

    // 保存圖表引用供後續使用
    chartRef.current = chart;
    seriesRef.current = candleSeries;

    // 處理視窗大小變化
    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    // 清理函數：移除事件監聽器和圖表實例
    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [crypto, selectedTimeFrame]); // 依賴：只在切換幣種或時間間隔時重新創建圖表

  // useEffect 2: 數據更新邏輯（只更新數據，不重建圖表）
  useEffect(() => {
    // 確保圖表系列已存在且有數據才更新
    if (!seriesRef.current || klines.length === 0) {
      setIsChartReady(false);
      return;
    }

    // 只更新數據，不重建圖表（像 TradingView 一樣）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    seriesRef.current.setData(klines as any);
    chartRef.current?.timeScale().fitContent();

    // 數據更新完成，標記圖表就緒
    // 使用 setTimeout 確保圖表已經完全渲染
    setTimeout(() => {
      setIsChartReady(true);
    }, 0);
  }, [klines, crypto?.symbol]); // 依賴：K線數據變化或切換幣種時更新

  // 處理 loading 狀態的平滑過渡
  useEffect(() => {
    // 如果正在獲取數據或圖表未就緒，顯示 loading
    // 但如果請求已完成且沒有數據，則不顯示 loading（讓錯誤訊息顯示）
    if (isFetching || (klines.length === 0 && !error)) {
      setShowLoading(true);
      setIsLoadingFadingOut(false);
    } else if (klines.length > 0 && isChartReady) {
      // 數據載入完成且圖表已就緒，開始淡出動畫
      setIsLoadingFadingOut(true);
      // 等待淡出動畫完成後完全隱藏
      const timer = setTimeout(() => {
        setShowLoading(false);
      }, 300); // 與 CSS 動畫時間一致

      return () => clearTimeout(timer);
    } else {
      // 其他情況（例如有錯誤），立即隱藏 loading
      setShowLoading(false);
      setIsLoadingFadingOut(false);
    }
  }, [klines.length, isChartReady, isFetching, error]);

  // 安全檢查：如果沒有選中的加密貨幣，不渲染任何內容
  if (!crypto) {
    return null;
  }

  const timeFrames: TimeFrame[] = ["1h", "4h", "1d", "1w"];

  return (
    <div className="kline-chart-container">
      {/* 圖表標題欄 */}
      <div className="kline-header">
        <div className="kline-title">
          <h2>
            {crypto.name} ({crypto.symbol})
          </h2>
          <div className="price-display">
            <span className="current-price">
              $
              {crypto.price.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>
        <button className="close-btn" onClick={onClose}>
          ✕
        </button>
      </div>

      {/* 時間間隔選擇按鈕 */}
      <div className="kline-timeframes">
        {timeFrames.map((tf) => (
          <button
            key={tf}
            className={`timeframe-btn ${selectedTimeFrame === tf ? "active" : ""}`}
            onClick={() => setTimeFrame(tf)}
          >
            {tf.toUpperCase()}
          </button>
        ))}
      </div>

      {/* 圖表容器 */}
      <div className="kline-chart" ref={containerRef}>
        {/*
          條件渲染：根據數據狀態顯示不同內容

          學習重點：平滑的 Loading 過渡效果

          顯示條件：showLoading

          情況 1：首次打開圖表
          - showLoading = true → 立即顯示 spinner ✅
          - 用戶點擊卡片後馬上看到 loading 反饋

          情況 2：數據載入完成
          - isLoadingFadingOut = true → 添加 fade-out class
          - 300ms 淡出動畫後 showLoading = false ✅

          情況 3：切換時間間隔
          - 清除舊數據，重置 showLoading = true → 重新顯示 spinner ✅

          優點：
          - 立即反饋：圖表打開就看到 spinner
          - 平滑過渡：淡入淡出效果，無閃爍
          - 避免白屏：不會出現空白畫面
        */}
        {showLoading && (
          <div
            className={`chart-loading-overlay ${isLoadingFadingOut ? "fade-out" : ""}`}
          >
            <ChartLoadingSpinner />
          </div>
        )}
        {!isFetching && !showLoading && klines.length === 0 && (
          <div className="chart-error">
            <div className="error-icon">⚠️</div>
            <p>{error ? "圖表載入失敗" : "無法取得圖表數據"}</p>
            <p className="error-detail">
              {error
                ? "請稍後再試或重新整理頁面"
                : "該加密貨幣可能暫無 K 線數據"}
            </p>
          </div>
        )}
        {/* 當數據準備好時，圖表會通過 useEffect 自動渲染到此容器 */}
      </div>
    </div>
  );
}
