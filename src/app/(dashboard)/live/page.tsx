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

export default function LiveTradingPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Live Trading</h1>
        <p className="text-muted-foreground">
          Execute on 100+ exchanges via ccxt (Binance, Bybit, IBKR, Alpaca)
        </p>
      </div>

      {/* Warning Banner */}
      <Card className="border-destructive/50 bg-destructive/10 p-4">
        <div className="flex items-start space-x-3">
          <Badge variant="destructive">⚠️ Live Trading</Badge>
          <div>
            <p className="text-sm font-medium">Real money at risk</p>
            <p className="mt-1 text-xs text-muted-foreground">
              This mode executes real trades with actual funds. Start with small amounts and test
              thoroughly in paper mode first.
            </p>
          </div>
        </div>
      </Card>

      {/* Broker Configuration */}
      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">Broker Configuration</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="broker">Select Broker</Label>
            <Select defaultValue="binance">
              <SelectTrigger id="broker">
                <SelectValue placeholder="Select broker" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="binance">Binance</SelectItem>
                <SelectItem value="bybit">Bybit</SelectItem>
                <SelectItem value="kraken">Kraken</SelectItem>
                <SelectItem value="coinbase">Coinbase</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Badge variant="secondary">Status: Not Connected</Badge>
          </div>

          <div className="space-y-2">
            <Label htmlFor="api-key">API Key</Label>
            <Input id="api-key" type="password" placeholder="Enter API key" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="api-secret">API Secret</Label>
            <Input id="api-secret" type="password" placeholder="Enter API secret" />
          </div>

          <div className="flex space-x-2 md:col-span-2">
            <Button>Connect Broker</Button>
            <Button variant="outline">Test Connection</Button>
          </div>
        </div>
      </Card>

      {/* Account Balance */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <div className="flex flex-col space-y-1">
            <span className="text-sm font-medium text-muted-foreground">Available Balance</span>
            <span className="text-2xl font-bold">$0.00</span>
            <Badge variant="outline" className="w-fit">
              Not connected
            </Badge>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex flex-col space-y-1">
            <span className="text-sm font-medium text-muted-foreground">Total P&L (Live)</span>
            <span className="text-2xl font-bold">$0.00</span>
            <Badge variant="secondary" className="w-fit">
              0.00%
            </Badge>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex flex-col space-y-1">
            <span className="text-sm font-medium text-muted-foreground">Open Positions</span>
            <span className="text-2xl font-bold">0</span>
            <Badge variant="outline" className="w-fit">
              No active trades
            </Badge>
          </div>
        </Card>
      </div>

      {/* Trade Form */}
      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">Place Order (Live)</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="live-asset">Asset</Label>
            <Select defaultValue="btcusdt" disabled>
              <SelectTrigger id="live-asset">
                <SelectValue placeholder="Select asset" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="btcusdt">BTC/USDT</SelectItem>
                <SelectItem value="ethusdt">ETH/USDT</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="live-side">Side</Label>
            <Select defaultValue="buy" disabled>
              <SelectTrigger id="live-side">
                <SelectValue placeholder="Buy or Sell" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="buy">Buy</SelectItem>
                <SelectItem value="sell">Sell</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="live-type">Order Type</Label>
            <Select defaultValue="market" disabled>
              <SelectTrigger id="live-type">
                <SelectValue placeholder="Order type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="market">Market</SelectItem>
                <SelectItem value="limit">Limit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="live-amount">Amount</Label>
            <Input id="live-amount" type="number" placeholder="0.001" disabled />
          </div>

          <div className="flex items-end space-x-2 md:col-span-2">
            <Button className="w-full" disabled>
              Connect Broker First
            </Button>
          </div>
        </div>
      </Card>

      {/* Trade History */}
      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">Live Trade History</h2>
        <div className="rounded-lg border">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">No live trades yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Connect your broker to start trading
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
