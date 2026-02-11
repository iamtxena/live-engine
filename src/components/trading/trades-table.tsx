'use client';

import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useRecentTrades } from '@/lib/hooks/use-market-data';

type TradesTableProps = {
  asset?: string;
  limit?: number;
};

/**
 * Table displaying recent market data/trades
 *
 * Usage:
 * ```tsx
 * <TradesTable asset="btcusdt" limit={50} />
 * ```
 */
export function TradesTable({ asset, limit = 50 }: TradesTableProps) {
  const { data: trades = [], isLoading: loading, error } = useRecentTrades({ asset, limit });

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
    }
    if (volume >= 1_000) {
      return `${(volume / 1_000).toFixed(2)}K`;
    }
    return volume.toFixed(2);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4">
        Recent Trades {asset && `(${asset.toUpperCase()})`}
      </h3>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground">
          Loading trades...
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-48 text-destructive">
          Error: {error instanceof Error ? error.message : String(error)}
        </div>
      ) : trades.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground">
          No trades found. Download historical data first.
        </div>
      ) : (
        <div className="relative overflow-auto max-h-96">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Asset</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Volume</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trades.map((trade) => (
                <TableRow key={trade.id}>
                  <TableCell className="font-mono text-sm">{formatTime(trade.timestamp)}</TableCell>
                  <TableCell className="font-medium uppercase">
                    {trade.asset.replace('usdt', '/USDT')}
                  </TableCell>
                  <TableCell className="text-right font-mono">{formatPrice(trade.close)}</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatVolume(trade.volume)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}
