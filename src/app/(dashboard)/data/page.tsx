'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

const ASSETS = [
  { value: 'btcusdt', label: 'BTC/USDT' },
  { value: 'ethusdt', label: 'ETH/USDT' },
  { value: 'bnbusdt', label: 'BNB/USDT' },
  { value: 'solusdt', label: 'SOL/USDT' },
  { value: 'adausdt', label: 'ADA/USDT' },
];

const INTERVALS = [
  { value: '1m', label: '1 Minute' },
  { value: '5m', label: '5 Minutes' },
  { value: '15m', label: '15 Minutes' },
  { value: '1h', label: '1 Hour' },
  { value: '4h', label: '4 Hours' },
  { value: '1d', label: '1 Day' },
];

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleString();
}

function getDefaultStartDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 7);
  return date.toISOString().split('T')[0];
}

function getDefaultEndDate(): string {
  return new Date().toISOString().split('T')[0];
}

export default function DataPage() {
  const [selectedAsset, setSelectedAsset] = useState('btcusdt');
  const [selectedInterval, setSelectedInterval] = useState('1h');
  const [startDate, setStartDate] = useState(getDefaultStartDate());
  const [endDate, setEndDate] = useState(getDefaultEndDate());
  const queryClient = useQueryClient();

  const { data: previewData, isLoading: isLoadingPreview } = useQuery({
    queryKey: ['marketData', selectedAsset],
    queryFn: async () => {
      const params = new URLSearchParams({
        symbol: selectedAsset,
        limit: '20',
      });
      const res = await fetch(`/api/historical?${params}`);
      if (!res.ok) throw new Error('Failed to fetch data');
      return res.json();
    },
  });

  const downloadMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/historical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: selectedAsset,
          interval: selectedInterval,
          startTime: `${startDate}T00:00:00.000Z`,
          endTime: `${endDate}T23:59:59.999Z`,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Download failed');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketData', selectedAsset] });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Historical Data</h1>
        <p className="text-muted-foreground">
          Download historical market data from Binance for strategy backtesting
        </p>
      </div>

      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">Download Configuration</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="asset">Asset</Label>
            <Select value={selectedAsset} onValueChange={setSelectedAsset}>
              <SelectTrigger id="asset">
                <SelectValue placeholder="Select asset" />
              </SelectTrigger>
              <SelectContent>
                {ASSETS.map((asset) => (
                  <SelectItem key={asset.value} value={asset.value}>
                    {asset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="interval">Interval</Label>
            <Select value={selectedInterval} onValueChange={setSelectedInterval}>
              <SelectTrigger id="interval">
                <SelectValue placeholder="Select interval" />
              </SelectTrigger>
              <SelectContent>
                {INTERVALS.map((interval) => (
                  <SelectItem key={interval.value} value={interval.value}>
                    {interval.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDate">End Date</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-6 flex items-center gap-4">
          <Button onClick={() => downloadMutation.mutate()} disabled={downloadMutation.isPending}>
            {downloadMutation.isPending ? 'Downloading...' : 'Download Data'}
          </Button>

          {downloadMutation.isSuccess && (
            <Badge variant="default">Downloaded {downloadMutation.data?.count} candles</Badge>
          )}

          {downloadMutation.isError && (
            <Badge variant="destructive">Error: {downloadMutation.error?.message}</Badge>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">Data Preview</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Recent candles stored in database for {selectedAsset.toUpperCase()}
        </p>

        {isLoadingPreview ? (
          <div className="py-8 text-center text-muted-foreground">Loading...</div>
        ) : previewData?.data?.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead className="text-right">Open</TableHead>
                  <TableHead className="text-right">High</TableHead>
                  <TableHead className="text-right">Low</TableHead>
                  <TableHead className="text-right">Close</TableHead>
                  <TableHead className="text-right">Volume</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.data.map(
                  (candle: {
                    timestamp: string;
                    open: string;
                    high: string;
                    low: string;
                    close: string;
                    volume: string;
                  }) => (
                    <TableRow key={candle.timestamp}>
                      <TableCell className="font-mono text-xs">
                        {formatDate(candle.timestamp)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {Number.parseFloat(candle.open).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {Number.parseFloat(candle.high).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {Number.parseFloat(candle.low).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {Number.parseFloat(candle.close).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {Number.parseFloat(candle.volume).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ),
                )}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            No data available. Download some historical data first.
          </div>
        )}
      </Card>
    </div>
  );
}
