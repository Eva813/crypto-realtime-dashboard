import { useEffect, useRef } from 'react';
import { createChart, ColorType, CandlestickSeries, type IChartApi, type ISeriesApi } from 'lightweight-charts';
import { useKLineChart } from '../hooks/useCrypto';
import { useChartStore } from '../stores';
import type { Cryptocurrency, TimeFrame } from '../types/index';
import './KLineChart.css';

interface KLineChartProps {
  crypto: Cryptocurrency | null;
  onClose: () => void;
}

export function KLineChart({ crypto, onClose }: KLineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  const { selectedTimeFrame, setTimeFrame } = useChartStore();
  const { klines, isLoading, error } = useKLineChart(crypto?.symbol || '');

  // Effect for chart creation
  useEffect(() => {
    if (!containerRef.current || !crypto) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#ffffff' },
        textColor: '#333',
      },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#16c784',
      downColor: '#ea3943',
      wickUpColor: '#16c784',
      wickDownColor: '#ea3943',
      borderUpColor: '#16c784',
      borderDownColor: '#ea3943',
    });

    chartRef.current = chart;
    seriesRef.current = candleSeries;

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [crypto]); // Only re-create the chart if the crypto symbol changes

  // Effect for updating data
  useEffect(() => {
    if (!seriesRef.current || !chartRef.current || klines.length === 0) return;

    seriesRef.current.setData(klines as any);
    chartRef.current.timeScale().fitContent();
  }, [klines]); // Update data whenever klines change

  if (!crypto) {
    return null;
  }

  const timeFrames: TimeFrame[] = ['1h', '4h', '1d', '1w'];

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

      <div className="kline-chart" ref={containerRef}>
        {isLoading && <div className="chart-loading">Loading Chart...</div>}
        {error && <div className="chart-error">Failed to load chart data.</div>}
      </div>
    </div>
  );
}
