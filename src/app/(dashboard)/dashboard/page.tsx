'use client';

import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useMarketStore } from '@/lib/stores/market-store';

const TRACKED_ASSETS = [
  { id: 'btcusdt', label: 'BTC/USDT' },
  { id: 'ethusdt', label: 'ETH/USDT' },
  { id: 'bnbusdt', label: 'BNB/USDT' },
  { id: 'solusdt', label: 'SOL/USDT' },
];

export default function DashboardPage() {
  const { tickers, isConnected } = useMarketStore();

  const { data: paperPortfolios } = useQuery({
    queryKey: ['paper-portfolios'],
    queryFn: async () => {
      const response = await fetch('/api/paper');
      if (!response.ok) return [];
      const data = await response.json();
      return data.portfolios || [];
    },
  });

  const { data: portfolioData } = useQuery({
    queryKey: ['paper-portfolio', paperPortfolios?.[0]?.id],
    queryFn: async () => {
      if (!paperPortfolios?.[0]?.id) return null;
      const response = await fetch(`/api/paper?portfolioId=${paperPortfolios[0].id}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!paperPortfolios?.[0]?.id,
    refetchInterval: 10000,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPrice = (value: number) => {
    if (value >= 1000) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    }
    return formatCurrency(value);
  };

  const portfolio = portfolioData?.portfolio;
  const positions = portfolioData?.positions || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor markets, execute trades, and manage your portfolio
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {TRACKED_ASSETS.map((asset) => {
          const tickData = tickers.get(asset.id);
          return (
            <Card key={asset.id} className="p-6">
              <div className="flex flex-col space-y-1">
                <span className="text-sm font-medium text-muted-foreground">
                  {asset.label}
                </span>
                <span className="text-2xl font-bold">
                  {tickData ? formatPrice(tickData.price) : '$--,---'}
                </span>
                <Badge
                  variant={isConnected ? 'default' : 'secondary'}
                  className="w-fit"
                >
                  {isConnected ? 'Live' : 'Disconnected'}
                </Badge>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <div className="flex flex-col space-y-1">
            <span className="text-sm font-medium text-muted-foreground">
              Portfolio Value
            </span>
            <span className="text-2xl font-bold">
              {portfolio ? formatCurrency(portfolio.totalValue) : '$0.00'}
            </span>
            <Badge variant="outline" className="w-fit">
              Paper Trading
            </Badge>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex flex-col space-y-1">
            <span className="text-sm font-medium text-muted-foreground">
              Total P&L
            </span>
            <span
              className={`text-2xl font-bold ${
                portfolio?.pnl >= 0 ? 'text-green-500' : 'text-red-500'
              }`}
            >
              {portfolio
                ? `${portfolio.pnl >= 0 ? '+' : ''}${formatCurrency(portfolio.pnl)}`
                : '$0.00'}
            </span>
            <Badge
              variant={portfolio?.pnl >= 0 ? 'default' : 'destructive'}
              className="w-fit"
            >
              {portfolio
                ? `${portfolio.pnl >= 0 ? '+' : ''}${portfolio.pnlPercent.toFixed(2)}%`
                : '0.00%'}
            </Badge>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex flex-col space-y-1">
            <span className="text-sm font-medium text-muted-foreground">
              Open Positions
            </span>
            <span className="text-2xl font-bold">{positions.length}</span>
            <Badge variant="outline" className="w-fit">
              {positions.length === 0 ? 'No active trades' : `${positions.length} positions`}
            </Badge>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold">Real-Time Market Data</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Live price feeds from Binance with candlestick charts and trade history.
          </p>
          <div className="flex space-x-2">
            <Button asChild>
              <Link href="/dashboard/assets">View Assets</Link>
            </Button>
            {isConnected ? (
              <Badge variant="default" className="px-3 py-1">
                Connected
              </Badge>
            ) : (
              <Badge variant="secondary" className="px-3 py-1">
                Disconnected
              </Badge>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold">Paper Trading</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Test your strategies risk-free with simulated accounts and real market prices.
          </p>
          <div className="flex space-x-2">
            <Button asChild>
              <Link href="/dashboard/paper">Paper Trade</Link>
            </Button>
            {portfolio && (
              <Badge variant="outline" className="px-3 py-1">
                {formatCurrency(portfolio.balance)} cash
              </Badge>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold">Live Trading</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Execute on 100+ exchanges via ccxt (Binance, Bybit, IBKR, Alpaca, etc.)
          </p>
          <div className="flex space-x-2">
            <Button asChild variant="default">
              <Link href="/dashboard/live">Live Trade</Link>
            </Button>
            <Badge variant="secondary" className="px-3 py-1">
              Testnet Ready
            </Badge>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold">Quick Stats</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Active Streams</span>
              <span className="font-medium">{isConnected ? '4 assets' : 'None'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Paper Portfolios</span>
              <span className="font-medium">{paperPortfolios?.length || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total Trades</span>
              <span className="font-medium">{portfolioData?.trades?.length || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">System Status</span>
              <Badge variant="default" className="text-xs">
                Operational
              </Badge>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">System Status</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Market Data Stream</span>
            <Badge variant={isConnected ? 'default' : 'secondary'}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Supabase Database</span>
            <Badge variant="default">Ready</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Redis Cache</span>
            <Badge variant="default">Ready</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Paper Trading Engine</span>
            <Badge variant={portfolio ? 'default' : 'secondary'}>
              {portfolio ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </div>
      </Card>
    </div>
  );
}
