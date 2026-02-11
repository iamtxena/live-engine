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

type Position = {
  asset: string;
  amount: number;
  avgPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
};

type PositionsCardProps = {
  positions: Position[];
};

/**
 * Display current trading positions
 *
 * Usage:
 * ```tsx
 * <PositionsCard positions={positions} />
 * ```
 */
export function PositionsCard({ positions }: PositionsCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatAmount = (amount: number) => {
    return amount.toFixed(8);
  };

  const formatPercent = (avgPrice: number, currentPrice: number) => {
    const percent = ((currentPrice - avgPrice) / avgPrice) * 100;
    return percent.toFixed(2);
  };

  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4">Open Positions</h3>

      {positions.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-muted-foreground">
          No open positions
        </div>
      ) : (
        <div className="relative overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Avg Price</TableHead>
                <TableHead className="text-right">Current Price</TableHead>
                <TableHead className="text-right">P&L</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {positions.map((position) => {
                const pnlPercent = formatPercent(position.avgPrice, position.currentPrice);
                const isProfitable = position.unrealizedPnl >= 0;

                return (
                  <TableRow key={position.asset}>
                    <TableCell className="font-medium uppercase">
                      {position.asset.replace('usdt', '/USDT')}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatAmount(position.amount)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(position.avgPrice)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(position.currentPrice)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className={isProfitable ? 'text-green-500' : 'text-red-500'}>
                        <div className="font-mono font-medium">
                          {formatCurrency(position.unrealizedPnl)}
                        </div>
                        <div className="text-xs">
                          ({isProfitable ? '+' : ''}
                          {pnlPercent}%)
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}
