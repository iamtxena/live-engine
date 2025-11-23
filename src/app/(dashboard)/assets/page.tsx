'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMarketStore } from '@/lib/stores/market-store';
import { useHistoricalData } from '@/lib/hooks/use-market-data';
import { CandlestickChart } from '@/components/charts/candlestick-chart';
import { LiveTicker } from '@/components/trading/live-ticker';
import { TradesTable } from '@/components/trading/trades-table';

const ASSETS = ['btcusdt', 'ethusdt', 'bnbusdt', 'solusdt'];

const ASSET_TABS = [
  { id: 'btc', asset: 'btcusdt', label: 'BTC/USDT' },
  { id: 'eth', asset: 'ethusdt', label: 'ETH/USDT' },
  { id: 'bnb', asset: 'bnbusdt', label: 'BNB/USDT' },
  { id: 'sol', asset: 'solusdt', label: 'SOL/USDT' },
];

export default function AssetsPage() {
  const [selectedAsset, setSelectedAsset] = useState('btcusdt');

  // Zustand store for real-time market data
  const { tickers, isConnected, error, connectStream, disconnectStream } = useMarketStore();

  // TanStack Query for historical chart data
  const { data: historicalData = [] } = useHistoricalData({
    asset: selectedAsset,
    limit: 100,
    interval: '1m',
  });

  // Transform MarketDataRow to CandleData format
  const chartData = historicalData.map((row) => ({
    time: row.timestamp,
    open: row.open,
    high: row.high,
    low: row.low,
    close: row.close,
  }));

  const startWebSocket = async () => {
    try {
      const response = await fetch('/api/websocket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assets: ASSETS }),
      });

      if (response.ok) {
        connectStream(ASSETS);
      }
    } catch (err) {
      console.error('Error starting WebSocket:', err);
    }
  };

  const stopWebSocket = async () => {
    try {
      await fetch('/api/websocket', { method: 'DELETE' });
      disconnectStream();
    } catch (err) {
      console.error('Error stopping WebSocket:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assets</h1>
          <p className="text-muted-foreground">
            Real-time market data and charts for multiple assets
          </p>
        </div>
        <div className="flex space-x-2">
          {!isConnected ? (
            <Button onClick={startWebSocket}>Start WebSocket</Button>
          ) : (
            <Button variant="destructive" onClick={stopWebSocket}>
              Stop WebSocket
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Asset Tabs */}
      <Tabs defaultValue="btc" className="w-full" onValueChange={(val) => {
        const tab = ASSET_TABS.find(t => t.id === val);
        if (tab) setSelectedAsset(tab.asset);
      }}>
        <TabsList>
          {ASSET_TABS.map(tab => (
            <TabsTrigger key={tab.id} value={tab.id}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {ASSET_TABS.map(tab => (
          <TabsContent key={tab.id} value={tab.id} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="md:col-span-2 space-y-4">
                <CandlestickChart data={chartData} height={400} />
                <TradesTable asset={tab.asset} limit={50} />
              </div>
              <div>
                <LiveTicker
                  asset={tab.asset}
                  tickData={tickers.get(tab.asset)}
                  isConnected={isConnected}
                />
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
