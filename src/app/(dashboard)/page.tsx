import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor markets, execute trades, and convert Python strategies to TypeScript
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <div className="flex flex-col space-y-1">
            <span className="text-sm font-medium text-muted-foreground">BTC/USDT</span>
            <span className="text-2xl font-bold">$--,---</span>
            <Badge variant="secondary" className="w-fit">
              Connecting...
            </Badge>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex flex-col space-y-1">
            <span className="text-sm font-medium text-muted-foreground">ETH/USDT</span>
            <span className="text-2xl font-bold">$--,---</span>
            <Badge variant="secondary" className="w-fit">
              Connecting...
            </Badge>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex flex-col space-y-1">
            <span className="text-sm font-medium text-muted-foreground">Portfolio Value</span>
            <span className="text-2xl font-bold">$0.00</span>
            <Badge variant="outline" className="w-fit">
              Paper Trading
            </Badge>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex flex-col space-y-1">
            <span className="text-sm font-medium text-muted-foreground">Active Trades</span>
            <span className="text-2xl font-bold">0</span>
            <Badge variant="outline" className="w-fit">
              No open positions
            </Badge>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold">Real-Time Market Data</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Connect to Binance WebSocket for live tick data across multiple assets.
          </p>
          <div className="flex space-x-2">
            <Button asChild>
              <Link href="/dashboard/assets">View Assets</Link>
            </Button>
            <Button variant="outline">Start WebSocket</Button>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold">Paper Trading</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Test your strategies risk-free with simulated accounts and testnet execution.
          </p>
          <div className="flex space-x-2">
            <Button asChild>
              <Link href="/dashboard/paper">Paper Trade</Link>
            </Button>
            <Button variant="outline">View History</Button>
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
            <Button variant="outline">Configure Broker</Button>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold">Python → TypeScript</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Convert Lona strategies using Grok AI with automatic validation.
          </p>
          <div className="flex space-x-2">
            <Button variant="default">Convert Code</Button>
            <Button variant="outline">View API Docs</Button>
          </div>
        </Card>
      </div>

      {/* System Status */}
      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">System Status</h2>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">Binance WebSocket</span>
            <Badge variant="secondary">Disconnected</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Supabase Database</span>
            <Badge variant="secondary">Ready</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Redis Cache</span>
            <Badge variant="secondary">Ready</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Grok AI (xAI)</span>
            <Badge variant="secondary">Ready</Badge>
          </div>
        </div>
      </Card>
    </div>
  );
}
