import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AssetsPage() {
  const assets = [
    { symbol: 'BTC/USDT', name: 'Bitcoin', price: '--,---', change: '+0.00%' },
    { symbol: 'ETH/USDT', name: 'Ethereum', price: '--,---', change: '+0.00%' },
    { symbol: 'BNB/USDT', name: 'Binance Coin', price: '---', change: '+0.00%' },
    { symbol: 'SOL/USDT', name: 'Solana', price: '---', change: '+0.00%' },
  ];

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
          <Button>Start WebSocket</Button>
          <Button variant="outline">Download Historical</Button>
        </div>
      </div>

      {/* Asset Tabs */}
      <Tabs defaultValue="btc" className="w-full">
        <TabsList>
          <TabsTrigger value="btc">BTC/USDT</TabsTrigger>
          <TabsTrigger value="eth">ETH/USDT</TabsTrigger>
          <TabsTrigger value="bnb">BNB/USDT</TabsTrigger>
          <TabsTrigger value="sol">SOL/USDT</TabsTrigger>
        </TabsList>

        <TabsContent value="btc" className="space-y-4">
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Bitcoin (BTC/USDT)</h2>
                <p className="text-sm text-muted-foreground">Binance Spot</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">$--,---</div>
                <Badge variant="secondary">+0.00%</Badge>
              </div>
            </div>

            {/* Chart Placeholder */}
            <div className="flex h-96 items-center justify-center rounded-lg border bg-muted/30">
              <div className="text-center">
                <p className="mb-2 text-lg font-medium">TradingView Chart</p>
                <p className="text-sm text-muted-foreground">
                  Connect WebSocket to view real-time data
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="eth" className="space-y-4">
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Ethereum (ETH/USDT)</h2>
                <p className="text-sm text-muted-foreground">Binance Spot</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">$--,---</div>
                <Badge variant="secondary">+0.00%</Badge>
              </div>
            </div>

            <div className="flex h-96 items-center justify-center rounded-lg border bg-muted/30">
              <div className="text-center">
                <p className="mb-2 text-lg font-medium">TradingView Chart</p>
                <p className="text-sm text-muted-foreground">
                  Connect WebSocket to view real-time data
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="bnb" className="space-y-4">
          <Card className="p-6">
            <div className="flex h-96 items-center justify-center rounded-lg border bg-muted/30">
              <p className="text-sm text-muted-foreground">BNB/USDT chart placeholder</p>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="sol" className="space-y-4">
          <Card className="p-6">
            <div className="flex h-96 items-center justify-center rounded-lg border bg-muted/30">
              <p className="text-sm text-muted-foreground">SOL/USDT chart placeholder</p>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Asset List */}
      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">All Assets</h2>
        <div className="space-y-2">
          {assets.map((asset) => (
            <div
              key={asset.symbol}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div>
                <div className="font-medium">{asset.symbol}</div>
                <div className="text-sm text-muted-foreground">{asset.name}</div>
              </div>
              <div className="text-right">
                <div className="font-mono">${asset.price}</div>
                <Badge variant="secondary" className="text-xs">
                  {asset.change}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
