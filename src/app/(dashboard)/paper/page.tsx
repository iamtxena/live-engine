'use client';

import { OrderForm } from '@/components/trading/order-form';
import { PositionsCard } from '@/components/trading/positions-card';
import { TradesTable } from '@/components/trading/trades-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMarketStore } from '@/lib/stores/market-store';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

const ASSETS = ['btcusdt', 'ethusdt', 'bnbusdt', 'solusdt'];

export default function PaperTradingPage() {
  const [selectedAsset, setSelectedAsset] = useState('btcusdt');
  const [selectedPortfolio, setSelectedPortfolio] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { tickers } = useMarketStore();

  const { data: portfolios, isLoading: loadingPortfolios } = useQuery({
    queryKey: ['paper-portfolios'],
    queryFn: async () => {
      const response = await fetch('/api/paper');
      if (!response.ok) throw new Error('Failed to fetch portfolios');
      const data = await response.json();
      return data.portfolios || [];
    },
  });

  const { data: portfolioData, isLoading: loadingPortfolio } = useQuery({
    queryKey: ['paper-portfolio', selectedPortfolio],
    queryFn: async () => {
      if (!selectedPortfolio) return null;
      const response = await fetch(`/api/paper?portfolioId=${selectedPortfolio}`);
      if (!response.ok) throw new Error('Failed to fetch portfolio');
      return response.json();
    },
    enabled: !!selectedPortfolio,
    refetchInterval: 5000,
  });

  const createPortfolioMutation = useMutation({
    mutationFn: async (initialBalance: number) => {
      const response = await fetch('/api/paper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_portfolio',
          initialBalance,
        }),
      });
      if (!response.ok) throw new Error('Failed to create portfolio');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['paper-portfolios'] });
      setSelectedPortfolio(data.portfolio.id);
    },
  });

  const placeTradeMutation = useMutation({
    mutationFn: async (trade: {
      side: 'buy' | 'sell';
      type: 'market' | 'limit';
      amount: number;
      price?: number;
    }) => {
      const response = await fetch('/api/paper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'execute_trade',
          portfolioId: selectedPortfolio,
          trade: {
            ...trade,
            asset: selectedAsset,
          },
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to place trade');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paper-portfolio', selectedPortfolio] });
    },
  });

  const handleCreatePortfolio = () => {
    const balance = prompt('Enter initial balance (default: $10,000):', '10000');
    if (balance) {
      createPortfolioMutation.mutate(Number.parseFloat(balance));
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const currentPrice = tickers.get(selectedAsset)?.price;

  if (!selectedPortfolio && !loadingPortfolios) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Paper Trading</h1>
          <p className="text-muted-foreground">Test strategies risk-free with simulated accounts</p>
        </div>

        <Card className="p-12 text-center">
          <h2 className="text-xl font-semibold mb-4">No Paper Trading Portfolio</h2>
          <p className="text-muted-foreground mb-6">
            Create a paper trading portfolio to start simulated trading
          </p>
          <Button onClick={handleCreatePortfolio} disabled={createPortfolioMutation.isPending}>
            {createPortfolioMutation.isPending ? 'Creating...' : 'Create Portfolio'}
          </Button>
        </Card>
      </div>
    );
  }

  if (!portfolios || portfolios.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Paper Trading</h1>
          <p className="text-muted-foreground">Test strategies risk-free with simulated accounts</p>
        </div>

        <Card className="p-12 text-center">
          <h2 className="text-xl font-semibold mb-4">Get Started</h2>
          <p className="text-muted-foreground mb-6">Create your first paper trading portfolio</p>
          <Button onClick={handleCreatePortfolio} disabled={createPortfolioMutation.isPending}>
            {createPortfolioMutation.isPending ? 'Creating...' : 'Create Portfolio'}
          </Button>
        </Card>
      </div>
    );
  }

  if (!selectedPortfolio && portfolios.length > 0) {
    setSelectedPortfolio(portfolios[0].id);
  }

  const portfolio = portfolioData?.portfolio;
  const positions = portfolioData?.positions || [];
  const trades = portfolioData?.trades || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Paper Trading</h1>
          <p className="text-muted-foreground">Test strategies risk-free with simulated accounts</p>
        </div>
        <Button onClick={handleCreatePortfolio} variant="outline">
          New Portfolio
        </Button>
      </div>

      {portfolios.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Portfolio:</span>
          <Select value={selectedPortfolio || ''} onValueChange={setSelectedPortfolio}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {portfolios.map((p: { id: string; balance: number }) => (
                <SelectItem key={p.id} value={p.id}>
                  {formatCurrency(p.balance)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {portfolio && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="p-6">
              <div className="flex flex-col space-y-1">
                <span className="text-sm font-medium text-muted-foreground">Total Value</span>
                <span className="text-2xl font-bold">{formatCurrency(portfolio.totalValue)}</span>
                <Badge variant="outline" className="w-fit">
                  Cash: {formatCurrency(portfolio.balance)}
                </Badge>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex flex-col space-y-1">
                <span className="text-sm font-medium text-muted-foreground">Total P&L</span>
                <span
                  className={`text-2xl font-bold ${
                    portfolio.pnl >= 0 ? 'text-green-500' : 'text-red-500'
                  }`}
                >
                  {portfolio.pnl >= 0 ? '+' : ''}
                  {formatCurrency(portfolio.pnl)}
                </span>
                <Badge variant={portfolio.pnl >= 0 ? 'default' : 'destructive'} className="w-fit">
                  {portfolio.pnl >= 0 ? '+' : ''}
                  {portfolio.pnlPercent.toFixed(2)}%
                </Badge>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex flex-col space-y-1">
                <span className="text-sm font-medium text-muted-foreground">Open Positions</span>
                <span className="text-2xl font-bold">{positions.length}</span>
                <Badge variant="outline" className="w-fit">
                  {positions.length === 0 ? 'No active trades' : `${trades.length} total trades`}
                </Badge>
              </div>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2 space-y-4">
              <PositionsCard positions={positions} />

              <Card className="p-4">
                <h3 className="text-lg font-semibold mb-4">Trade History</h3>
                {trades.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-muted-foreground">
                    No trades yet. Place your first order to get started.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {trades.slice(0, 10).map(
                      (trade: {
                        id: string;
                        side: string;
                        asset: string;
                        amount: number;
                        price: number;
                        created_at: string;
                      }) => (
                        <div
                          key={trade.id}
                          className="flex items-center justify-between p-3 rounded-lg border"
                        >
                          <div className="flex items-center gap-3">
                            <Badge variant={trade.side === 'buy' ? 'default' : 'destructive'}>
                              {trade.side.toUpperCase()}
                            </Badge>
                            <span className="font-medium uppercase">
                              {trade.asset.replace('usdt', '/USDT')}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="font-mono">
                              {trade.amount} @ {formatCurrency(trade.price)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(trade.created_at).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </Card>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <span className="text-sm text-muted-foreground">Select Asset:</span>
                <Select value={selectedAsset} onValueChange={setSelectedAsset}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSETS.map((asset) => (
                      <SelectItem key={asset} value={asset}>
                        {asset.toUpperCase().replace('USDT', '/USDT')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <OrderForm
                asset={selectedAsset}
                currentPrice={currentPrice}
                balance={portfolio.balance}
                onSubmit={async (order) => {
                  await placeTradeMutation.mutateAsync(order);
                }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
