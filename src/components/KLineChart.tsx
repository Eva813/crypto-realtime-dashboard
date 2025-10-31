import { useEffect, useRef } from 'react';
import { createChart, ColorType, CandlestickSeries, type IChartApi, type ISeriesApi } from 'lightweight-charts';
import { useKLineChart } from '../hooks/useCrypto';
import { useChartStore } from '../stores';
import { ChartLoadingSpinner } from './common/LoadingSpinner';
import type { Cryptocurrency, TimeFrame } from '../types/index';
import './KLineChart.css';

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
  const { klines, isFetching, error } = useKLineChart(crypto?.symbol || '');

  // 圖表創建和更新的核心邏輯
  useEffect(() => {
    // 防護條件：確保所有必要條件都滿足才創建圖表
    // 1. DOM 容器必須存在
    // 2. 必須有選中的加密貨幣
    // 3. 必須有 K線數據（避免渲染空圖表）
    if (!containerRef.current || !crypto || klines.length === 0) return;

    // 清理舊圖表：防止重複創建導致內存洩漏
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      seriesRef.current = null;
    }

    // 創建新圖表實例
    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#ffffff' },
        textColor: '#333',
      },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });

    // 添加 K線系列（蠟燭圖）
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#16c784',      // 上漲顏色（綠色）
      downColor: '#ea3943',    // 下跌顏色（紅色）
      wickUpColor: '#16c784',  // 上漲影線顏色
      wickDownColor: '#ea3943',// 下跌影線顏色
      borderUpColor: '#16c784',
      borderDownColor: '#ea3943',
    });

    // 立即設置數據並調整視圖範圍
    // 重要：數據設置後立即調整視圖，確保圖表可見
    candleSeries.setData(klines as any);
    chart.timeScale().fitContent();

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

    window.addEventListener('resize', handleResize);

    // 清理函數：移除事件監聽器和圖表實例
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [crypto, klines]); // 依賴：當加密貨幣或 K線數據改變時重新創建圖表

  // 安全檢查：如果沒有選中的加密貨幣，不渲染任何內容
  if (!crypto) {
    return null;
  }

  const timeFrames: TimeFrame[] = ['1h', '4h', '1d', '1w'];

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
              {crypto.price.toLocaleString('en-US', {
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
            className={`timeframe-btn ${selectedTimeFrame === tf ? 'active' : ''}`}
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

          學習重點：顯示 Loading Spinner 的時機

          顯示條件：klines.length === 0

          情況 1：首次打開圖表
          - klines = [] → 立即顯示 spinner ✅
          - 用戶點擊卡片後馬上看到 loading 反饋

          情況 2：切換時間間隔
          - 清除舊數據，klines = [] → 顯示 spinner ✅
          - 短暫 loading 狀態

          情況 3：數據載入完成
          - klines.length > 0 → spinner 消失，圖表顯示 ✅

          優點：
          - 立即反饋：圖表打開就看到 spinner
          - 避免白屏：不會出現空白畫面
          - 簡單明確：只要沒數據就顯示 loading
        */}
        {klines.length === 0 && (
          <div className="chart-loading-overlay">
            <ChartLoadingSpinner />
          </div>
        )}
        {!isFetching && error && (
          <div className="chart-error">
            <div className="error-icon">⚠️</div>
            <p>圖表載入失敗</p>
            <p className="error-detail">請稍後再試或重新整理頁面</p>
          </div>
        )}
        {/* 當數據準備好時，圖表會通過 useEffect 自動渲染到此容器 */}
      </div>
    </div>
  );
}
