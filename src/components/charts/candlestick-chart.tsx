'use client';

import {
  type CandlestickData,
  CandlestickSeries,
  type CandlestickSeriesPartialOptions,
  ColorType,
  type IChartApi,
  ISeriesApi,
  type Time,
  createChart,
} from 'lightweight-charts';
import { useEffect, useRef } from 'react';

type CandleData = {
  time: number | string;
  open: number;
  high: number;
  low: number;
  close: number;
};

type CandlestickChartProps = {
  data: CandleData[];
  height?: number;
};

/**
 * TradingView-style candlestick chart using lightweight-charts
 *
 * Usage:
 * ```tsx
 * <CandlestickChart data={candles} height={400} />
 * ```
 */
export function CandlestickChart({ data, height = 400 }: CandlestickChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ReturnType<IChartApi['addSeries']> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: '#0a0a0a' },
        textColor: '#d1d5db',
      },
      grid: {
        vertLines: { color: '#1f2937' },
        horzLines: { color: '#1f2937' },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
    });

    // Create candlestick series using proper SeriesDefinition
    const seriesOptions: CandlestickSeriesPartialOptions = {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    };

    const candlestickSeries = chart.addSeries(CandlestickSeries, seriesOptions);

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [height]);

  // Update chart data when data changes
  useEffect(() => {
    if (!candlestickSeriesRef.current || !data || data.length === 0) return;

    // Convert data to lightweight-charts format
    const formattedData: CandlestickData<Time>[] = data.map((candle) => ({
      time: (typeof candle.time === 'string'
        ? Math.floor(new Date(candle.time).getTime() / 1000)
        : candle.time) as Time,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    }));

    candlestickSeriesRef.current.setData(formattedData);

    // Fit content to visible range
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  }, [data]);

  return (
    <div className="relative w-full rounded-lg border border-border overflow-hidden">
      <div ref={chartContainerRef} className="w-full" style={{ height: `${height}px` }} />
    </div>
  );
}
