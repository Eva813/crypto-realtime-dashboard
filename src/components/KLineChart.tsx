import { useEffect, useRef } from "react";
import { createChart, ColorType, CandlestickSeries } from "lightweight-charts";
import type { Cryptocurrency, TimeFrame, KLine } from "../types/index";
import "./KLineChart.css";

interface KLineChartProps {
  crypto: Cryptocurrency | null;
  onClose: () => void;
}

// Mock K-line data generator
function generateMockKLines(
  timeFrame: TimeFrame,
  count: number = 100,
): KLine[] {
  const lines: KLine[] = [];
  let basePrice = 40000;
  let time = Math.floor(Date.now() / 1000) - count * 3600;

  const timeIntervals: Record<TimeFrame, number> = {
    "1h": 3600,
    "4h": 14400,
    "1d": 86400,
    "1w": 604800,
  };

  const interval = timeIntervals[timeFrame];

  for (let i = 0; i < count; i++) {
    const change = (Math.random() - 0.5) * 2000;
    const open = basePrice;
    const close = basePrice + change;
    const high = Math.max(open, close) + Math.random() * 1000;
    const low = Math.min(open, close) - Math.random() * 1000;
    const volume = Math.random() * 1000000;

    lines.push({
      time,
      open,
      high,
      low,
      close,
      volume,
    });

    basePrice = close;
    time += interval;
  }

  return lines;
}

export function KLineChart({ crypto, onClose }: KLineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !crypto) return;

    // Create chart
    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#ffffff" },
        textColor: "#333",
      },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });

    // Create candlestick series using the v5 API
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#16c784",
      downColor: "#ea3943",
      wickUpColor: "#16c784",
      wickDownColor: "#ea3943",
      borderUpColor: "#16c784",
      borderDownColor: "#ea3943",
    });

    // Add mock data - cast time to proper type
    const klines = generateMockKLines("1d", 50);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    candleSeries.setData(klines as any);

    // Fit content
    chart.timeScale().fitContent();

    // Handle resize
    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [crypto]);

  if (!crypto) {
    return null;
  }

  return (
    <div className="kline-chart-container">
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

      <div className="kline-timeframes">
        <button className="timeframe-btn active">1H</button>
        <button className="timeframe-btn">4H</button>
        <button className="timeframe-btn">1D</button>
        <button className="timeframe-btn">1W</button>
      </div>

      <div className="kline-chart" ref={containerRef}></div>
    </div>
  );
}
