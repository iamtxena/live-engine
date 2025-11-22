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

export default function PaperTradingPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Paper Trading</h1>
        <p className="text-muted-foreground">
          Test strategies risk-free with simulated accounts
        </p>
      </div>

      {/* Account Balance */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <div className="flex flex-col space-y-1">
            <span className="text-sm font-medium text-muted-foreground">Paper Balance</span>
            <span className="text-2xl font-bold">$10,000.00</span>
            <Badge variant="outline" className="w-fit">
              Testnet
            </Badge>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex flex-col space-y-1">
            <span className="text-sm font-medium text-muted-foreground">Total P&L</span>
            <span className="text-2xl font-bold text-green-500">+$0.00</span>
            <Badge variant="secondary" className="w-fit">
              +0.00%
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
        <h2 className="mb-4 text-xl font-semibold">Place Order (Paper)</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="asset">Asset</Label>
            <Select defaultValue="btcusdt">
              <SelectTrigger id="asset">
                <SelectValue placeholder="Select asset" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="btcusdt">BTC/USDT</SelectItem>
                <SelectItem value="ethusdt">ETH/USDT</SelectItem>
                <SelectItem value="bnbusdt">BNB/USDT</SelectItem>
                <SelectItem value="solusdt">SOL/USDT</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="side">Side</Label>
            <Select defaultValue="buy">
              <SelectTrigger id="side">
                <SelectValue placeholder="Buy or Sell" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="buy">Buy</SelectItem>
                <SelectItem value="sell">Sell</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Order Type</Label>
            <Select defaultValue="market">
              <SelectTrigger id="type">
                <SelectValue placeholder="Order type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="market">Market</SelectItem>
                <SelectItem value="limit">Limit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input id="amount" type="number" placeholder="0.001" step="0.001" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Price (for limit orders)</Label>
            <Input id="price" type="number" placeholder="50000" />
          </div>

          <div className="flex items-end space-x-2">
            <Button className="w-full">Place Order</Button>
          </div>
        </div>
      </Card>

      {/* Trade History */}
      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">Trade History</h2>
        <div className="rounded-lg border">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">No trades yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Place your first order to see it here
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
