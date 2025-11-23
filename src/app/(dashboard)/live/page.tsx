'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { OrderForm } from '@/components/trading/order-form';
import { useMarketStore } from '@/lib/stores/market-store';

const ASSETS = ['btcusdt', 'ethusdt', 'bnbusdt', 'solusdt'];

export default function LiveTradingPage() {
  const [selectedBroker, setSelectedBroker] = useState<'binance' | 'bybit' | 'kraken' | 'coinbase'>('bybit');
  const [selectedAsset, setSelectedAsset] = useState('BTC/USDT');
  const [useTestnet, setUseTestnet] = useState(true);
  const queryClient = useQueryClient();
  const { tickers } = useMarketStore();

  const { data: brokerData, isLoading, error } = useQuery({
    queryKey: ['broker', selectedBroker, selectedAsset, useTestnet],
    queryFn: async () => {
      const params = new URLSearchParams({
        broker: selectedBroker,
        symbol: selectedAsset,
        testnet: String(useTestnet),
      });

      const response = await fetch(`/api/broker?${params}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch broker data');
      }
      return response.json();
    },
    refetchInterval: 10000,
    retry: false,
  });

  const placeOrderMutation = useMutation({
    mutationFn: async (order: {
      side: 'buy' | 'sell';
      type: 'market' | 'limit';
      amount: number;
      price?: number;
    }) => {
      const response = await fetch('/api/broker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          broker: selectedBroker,
          testnet: useTestnet,
          order: {
            ...order,
            symbol: selectedAsset,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to place order');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['broker'] });
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const totalBalance = brokerData?.balance
    ? Object.entries(brokerData.balance)
        .filter(([currency]) => currency === 'USDT' || currency === 'USD')
        .reduce((sum, [_, amount]) => sum + (amount as number), 0)
    : 0;

  const currentPrice = tickers.get(selectedAsset.toLowerCase().replace('/', ''))?.price ||
    brokerData?.ticker?.price;

  const isConnected = !error && brokerData;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Live Trading</h1>
        <p className="text-muted-foreground">
          Execute on 100+ exchanges via ccxt (Binance, Bybit, IBKR, Alpaca)
        </p>
      </div>

      <Card className="border-destructive/50 bg-destructive/10 p-4">
        <div className="flex items-start space-x-3">
          <Badge variant="destructive">⚠️ {useTestnet ? 'Testnet Mode' : 'Live Trading'}</Badge>
          <div>
            <p className="text-sm font-medium">
              {useTestnet ? 'Testing with virtual funds' : 'Real money at risk'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {useTestnet
                ? 'Using testnet/sandbox environment. No real funds involved.'
                : 'This mode executes real trades with actual funds. Start with small amounts.'}
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">Broker Configuration</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="broker">Select Broker</Label>
            <Select value={selectedBroker} onValueChange={(value: any) => setSelectedBroker(value)}>
              <SelectTrigger id="broker">
                <SelectValue placeholder="Select broker" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bybit">Bybit</SelectItem>
                <SelectItem value="binance">Binance</SelectItem>
                <SelectItem value="kraken">Kraken</SelectItem>
                <SelectItem value="coinbase">Coinbase</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="environment">Environment</Label>
            <Select value={useTestnet ? 'testnet' : 'live'} onValueChange={(val) => setUseTestnet(val === 'testnet')}>
              <SelectTrigger id="environment">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="testnet">Testnet (Recommended)</SelectItem>
                <SelectItem value="live">Live (Real Funds)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            {isLoading ? (
              <Badge variant="secondary">Connecting...</Badge>
            ) : isConnected ? (
              <Badge variant="default">Connected</Badge>
            ) : (
              <Badge variant="destructive">Not Connected</Badge>
            )}
          </div>

          {error && (
            <div className="md:col-span-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive">
                <strong>Connection Error:</strong> {error.message}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Make sure you have set the API credentials in your environment variables.
              </p>
            </div>
          )}
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <div className="flex flex-col space-y-1">
            <span className="text-sm font-medium text-muted-foreground">
              Available Balance (USDT)
            </span>
            <span className="text-2xl font-bold">
              {formatCurrency(totalBalance)}
            </span>
            <Badge variant="outline" className="w-fit">
              {selectedBroker.toUpperCase()} {useTestnet ? 'Testnet' : 'Live'}
            </Badge>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex flex-col space-y-1">
            <span className="text-sm font-medium text-muted-foreground">
              Current Price
            </span>
            <span className="text-2xl font-bold">
              {currentPrice ? formatCurrency(currentPrice) : '$--,---'}
            </span>
            <Badge variant="outline" className="w-fit">
              {selectedAsset}
            </Badge>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex flex-col space-y-1">
            <span className="text-sm font-medium text-muted-foreground">
              Open Orders
            </span>
            <span className="text-2xl font-bold">
              {brokerData?.openOrders?.length || 0}
            </span>
            <Badge variant="outline" className="w-fit">
              {brokerData?.openOrders?.length ? `${brokerData.openOrders.length} active` : 'No orders'}
            </Badge>
          </div>
        </Card>
      </div>

      {brokerData?.balance && Object.keys(brokerData.balance).length > 0 && (
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold">Account Balances</h2>
          <div className="grid gap-3 md:grid-cols-4">
            {Object.entries(brokerData.balance).map(([currency, amount]) => (
              <div key={currency} className="flex items-center justify-between p-3 rounded-lg border">
                <span className="text-sm font-medium">{currency}</span>
                <span className="font-mono text-sm">{(amount as number).toFixed(8)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2 space-y-4">
          {brokerData?.openOrders && brokerData.openOrders.length > 0 && (
            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-4">Open Orders</h3>
              <div className="space-y-2">
                {brokerData.openOrders.map((order: any) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant={order.side === 'buy' ? 'default' : 'destructive'}>
                        {order.side.toUpperCase()}
                      </Badge>
                      <span className="font-medium">{order.symbol}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm">
                        {order.amount} @ {formatCurrency(order.price)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {order.type} - {order.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {(!brokerData?.openOrders || brokerData.openOrders.length === 0) && (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">No open orders</p>
              <p className="text-xs text-muted-foreground mt-1">
                Place an order to see it here
              </p>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Select Asset</Label>
            <Select value={selectedAsset} onValueChange={setSelectedAsset}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BTC/USDT">BTC/USDT</SelectItem>
                <SelectItem value="ETH/USDT">ETH/USDT</SelectItem>
                <SelectItem value="BNB/USDT">BNB/USDT</SelectItem>
                <SelectItem value="SOL/USDT">SOL/USDT</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isConnected ? (
            <OrderForm
              asset={selectedAsset}
              currentPrice={currentPrice}
              balance={totalBalance}
              onSubmit={async (order) => {
                await placeOrderMutation.mutateAsync(order);
              }}
            />
          ) : (
            <Card className="p-6 text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Connect to broker to place orders
              </p>
              <p className="text-xs text-muted-foreground">
                Configure API credentials in environment variables
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
