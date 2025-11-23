'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MarketTickData } from '@/lib/stores/market-store';

type LiveTickerProps = {
  asset: string;
  tickData?: MarketTickData;
  isConnected: boolean;
};

/**
 * Live price ticker with animated updates and 24h stats
 *
 * Usage:
 * ```tsx
 * <LiveTicker
 *   asset="btcusdt"
 *   tickData={marketData.get('btcusdt')}
 *   isConnected={isConnected}
 * />
 * ```
 */
export function LiveTicker({ asset, tickData, isConnected }: LiveTickerProps) {

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1_000_000) {
      return `${(volume / 1_000_000).toFixed(2)}M`;
    } else if (volume >= 1_000) {
      return `${(volume / 1_000).toFixed(2)}K`;
    }
    return volume.toFixed(2);
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold uppercase">{asset.replace('usdt', '/USDT')}</h3>
          <Badge variant={isConnected ? 'default' : 'secondary'}>
            {isConnected ? 'Live' : 'Disconnected'}
          </Badge>
        </div>
      </div>

      {tickData ? (
        <>
          <div className="mb-4">
            <div className="text-3xl font-bold text-foreground">
              {formatPrice(tickData.price)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">24h Volume</div>
              <div className="font-medium">{formatVolume(tickData.volume)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Updated</div>
              <div className="font-medium">
                {new Date(tickData.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center h-32 text-muted-foreground">
          {isConnected ? 'Waiting for data...' : 'Start WebSocket to see live prices'}
        </div>
      )}
    </Card>
  );
}
