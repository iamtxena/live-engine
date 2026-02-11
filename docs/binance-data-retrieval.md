# Binance Data Retrieval Guide

Complete guide to retrieve market data from Binance for use in trading applications.

## Table of Contents

1. [Overview](#overview)
2. [Dependencies](#dependencies)
3. [Real-time Data via WebSocket](#1-real-time-data-via-websocket)
4. [Historical Data via REST API](#2-historical-data-via-rest-api)
5. [Bulk Download from Binance Data Portal](#3-bulk-download-from-binance-data-portal)
6. [Redis Caching](#4-redis-caching)
7. [Server-Sent Events (SSE) for Browser](#5-server-sent-events-sse-for-browser)
8. [CLI Commands](#6-cli-commands)
9. [CSV Conversion Tools](#7-csv-conversion-tools)
10. [CSV Merging Tools](#8-csv-merging-tools)
11. [Data Adaptation & Transformation](#9-data-adaptation--transformation)
12. [Database Schema](#10-database-schema)

---

## Overview

Three methods to retrieve Binance data:

| Method | Speed | Use Case | Auth Required |
|--------|-------|----------|---------------|
| WebSocket | Real-time | Live tickers, streaming | No |
| REST API | Medium | Small datasets (<1000 candles) | No |
| Data Portal | Fast | Large historical datasets | No |

---

## Dependencies

```bash
# Core dependencies
pnpm add ws                    # WebSocket client (Node.js)
pnpm add @upstash/redis        # Redis caching (optional)
pnpm add @supabase/supabase-js # Database storage (optional)
pnpm add commander             # CLI framework (optional)
pnpm add dotenv                # Environment variables

# TypeScript
pnpm add -D typescript tsx @types/node @types/ws
```

**package.json scripts:**

```json
{
  "scripts": {
    "cli": "tsx src/cli/index.ts"
  }
}
```

---

## 1. Real-time Data via WebSocket

### binance-websocket.ts

```typescript
import WebSocket from 'ws';

export type Asset = 'btcusdt' | 'ethusdt' | 'bnbusdt' | 'solusdt' | 'adausdt';

export type TickData = {
  asset: string;
  price: number;
  volume: number;
  timestamp: number;
  high24h: number;
  low24h: number;
  change24h: number;
};

type TickHandler = (tick: TickData) => void | Promise<void>;

class BinanceWebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectInterval: number = 5000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private onTickHandler: TickHandler | null = null;

  constructor(private assets: Asset[]) {}

  /**
   * Set callback for incoming ticks
   */
  onTick(handler: TickHandler) {
    this.onTickHandler = handler;
  }

  /**
   * Connect to Binance WebSocket streams
   * Multi-stream format: wss://stream.binance.com:9443/stream?streams=btcusdt@ticker/ethusdt@ticker
   */
  connect() {
    const streams = this.assets.map((asset) => `${asset}@ticker`).join('/');
    const url = `wss://stream.binance.com:9443/stream?streams=${streams}`;

    console.log(`Connecting to Binance WebSocket: ${url}`);

    this.ws = new WebSocket(url);

    this.ws.on('open', () => {
      console.log('Binance WebSocket connected');
      this.startHeartbeat();
    });

    this.ws.on('message', async (data: WebSocket.Data) => {
      try {
        const message = JSON.parse(data.toString());
        await this.handleMessage(message);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });

    this.ws.on('error', (error: Error) => {
      console.error('Binance WebSocket error:', error);
    });

    this.ws.on('close', () => {
      console.log('Binance WebSocket closed. Reconnecting...');
      this.stopHeartbeat();
      setTimeout(() => this.connect(), this.reconnectInterval);
    });
  }

  /**
   * Handle incoming ticker messages
   */
  private async handleMessage(message: { stream?: string; data?: any }) {
    if (message.stream && message.data) {
      const ticker = message.data;
      const asset = ticker.s.toLowerCase(); // btcusdt, ethusdt, etc.

      const tickData: TickData = {
        asset,
        price: parseFloat(ticker.c),      // Current price
        volume: parseFloat(ticker.v),     // 24h volume
        timestamp: ticker.E,              // Event time (Unix ms)
        high24h: parseFloat(ticker.h),    // 24h high
        low24h: parseFloat(ticker.l),     // 24h low
        change24h: parseFloat(ticker.P),  // Price change percentage
      };

      // Call the tick handler if set
      if (this.onTickHandler) {
        await this.onTickHandler(tickData);
      }
    }
  }

  /**
   * Keep connection alive with heartbeat (ping every 30s)
   */
  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, 30000);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect() {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

/**
 * Singleton instance for WebSocket connection
 */
let binanceWSClient: BinanceWebSocketClient | null = null;

export function getBinanceWSClient(assets: Asset[] = ['btcusdt', 'ethusdt']) {
  if (!binanceWSClient) {
    binanceWSClient = new BinanceWebSocketClient(assets);
  }
  return binanceWSClient;
}

export { BinanceWebSocketClient };
```

### Usage Example

```typescript
import { getBinanceWSClient, type TickData } from './binance-websocket';

const client = getBinanceWSClient(['btcusdt', 'ethusdt', 'solusdt']);

client.onTick(async (tick: TickData) => {
  console.log(`${tick.asset}: $${tick.price} (${tick.change24h > 0 ? '+' : ''}${tick.change24h.toFixed(2)}%)`);

  // Store in database, cache in Redis, etc.
});

client.connect();

// Graceful shutdown
process.on('SIGINT', () => {
  client.disconnect();
  process.exit();
});
```

---

## 2. Historical Data via REST API

### binance-rest.ts

```typescript
export type Interval = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

export interface Candle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface FetchHistoricalOptions {
  symbol: string;
  interval?: Interval;
  limit?: number;
  startTime?: number;  // Unix milliseconds
  endTime?: number;    // Unix milliseconds
}

/**
 * Fetch historical OHLCV data from Binance REST API
 *
 * @param options - Fetch options or symbol string
 * @returns Array of candle objects
 *
 * Binance API limits:
 * - Max 1000 candles per request
 * - No authentication required for market data
 * - Rate limit: 1200 requests/minute
 */
export async function fetchHistoricalCandles(
  symbolOrOptions: string | FetchHistoricalOptions,
  interval: Interval = '1m',
  limit: number = 1000,
  endTime?: number
): Promise<Candle[]> {
  // Support both old signature and new options object
  let options: FetchHistoricalOptions;
  if (typeof symbolOrOptions === 'string') {
    options = { symbol: symbolOrOptions, interval, limit, endTime };
  } else {
    options = symbolOrOptions;
  }

  const {
    symbol,
    interval: intv = '1m',
    limit: lim = 1000,
    startTime,
    endTime: end,
  } = options;

  const params = new URLSearchParams({
    symbol: symbol.toUpperCase(),
    interval: intv,
    limit: String(Math.min(lim, 1000)), // Binance max is 1000
  });

  if (startTime) {
    params.append('startTime', String(startTime));
  }

  if (end) {
    params.append('endTime', String(end));
  }

  const url = `https://api.binance.com/api/v3/klines?${params.toString()}`;

  const response = await fetch(url);
  const data = await response.json();

  // Handle Binance API errors
  if (data.code && data.msg) {
    throw new Error(`Binance API error: ${data.msg}`);
  }

  // Transform Binance response to Candle objects
  // Binance returns: [openTime, open, high, low, close, volume, closeTime, ...]
  return data.map((candle: (string | number)[]) => ({
    timestamp: new Date(candle[0] as number).toISOString(),
    open: parseFloat(candle[1] as string),
    high: parseFloat(candle[2] as string),
    low: parseFloat(candle[3] as string),
    close: parseFloat(candle[4] as string),
    volume: parseFloat(candle[5] as string),
  }));
}

/**
 * Fetch large date range by paginating through Binance API
 *
 * @param symbol - Trading pair (e.g., 'btcusdt')
 * @param interval - Candle interval
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Array of all candles in range
 */
export async function fetchDateRange(
  symbol: string,
  interval: Interval,
  startDate: Date,
  endDate: Date
): Promise<Candle[]> {
  const allCandles: Candle[] = [];
  let currentStart = startDate.getTime();
  const endTime = endDate.getTime();

  // Calculate interval in milliseconds for pagination
  const intervalMs: Record<Interval, number> = {
    '1m': 60000,
    '5m': 300000,
    '15m': 900000,
    '1h': 3600000,
    '4h': 14400000,
    '1d': 86400000,
  };

  while (currentStart < endTime) {
    console.log(`Fetching from ${new Date(currentStart).toISOString()}...`);

    const candles = await fetchHistoricalCandles({
      symbol,
      interval,
      limit: 1000,
      startTime: currentStart,
      endTime: endTime,
    });

    if (candles.length === 0) break;

    allCandles.push(...candles);

    // Move start to after last candle
    const lastTimestamp = new Date(candles[candles.length - 1].timestamp).getTime();
    currentStart = lastTimestamp + intervalMs[interval];

    // Rate limiting: 100ms delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return allCandles;
}
```

### Usage Example

```typescript
import { fetchHistoricalCandles, fetchDateRange } from './binance-rest';

// Simple fetch
const candles = await fetchHistoricalCandles('btcusdt', '1h', 100);
console.log(`Fetched ${candles.length} candles`);
console.log(`Latest price: $${candles[0].close}`);

// Fetch date range
const historicalData = await fetchDateRange(
  'btcusdt',
  '1h',
  new Date('2025-01-01'),
  new Date('2025-12-01')
);
console.log(`Total candles: ${historicalData.length}`);
```

---

## 3. Bulk Download from Binance Data Portal

Binance provides pre-packaged CSV files at https://data.binance.vision - much faster for large datasets.

### binance-bulk-download.ts

```typescript
import { createWriteStream, mkdirSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import https from 'https';

export interface Candle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Download a file from URL
 */
async function downloadFile(url: string, destPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const file = createWriteStream(destPath);
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve(true);
        });
      } else {
        file.close();
        resolve(false);
      }
    }).on('error', () => {
      file.close();
      resolve(false);
    });
  });
}

/**
 * Convert Binance timestamp to ISO string
 * Binance Data Portal uses microseconds (16 digits), API uses milliseconds (13 digits)
 */
function convertUnixToISO(unix: number): string {
  const unixMs = unix > 9999999999999 ? Math.floor(unix / 1000) : unix;
  return new Date(unixMs).toISOString();
}

/**
 * Parse Binance CSV file to candle objects
 *
 * Binance CSV format:
 * open_time,open,high,low,close,volume,close_time,quote_volume,count,taker_buy_volume,taker_buy_quote_volume,ignore
 */
export function parseBinanceCSV(filePath: string): Candle[] {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());

  // Skip header if present (check if first field is numeric)
  const startIndex = isNaN(parseInt(lines[0].split(',')[0])) ? 1 : 0;
  const dataLines = lines.slice(startIndex);

  return dataLines.map(line => {
    const parts = line.split(',');
    const [open_time, open, high, low, close, volume] = parts;
    return {
      timestamp: convertUnixToISO(parseInt(open_time)),
      open: parseFloat(open),
      high: parseFloat(high),
      low: parseFloat(low),
      close: parseFloat(close),
      volume: parseFloat(volume),
    };
  });
}

export interface BulkDownloadOptions {
  symbol: string;
  interval: string;
  startDate: string;  // YYYY-MM-DD
  endDate: string;    // YYYY-MM-DD
  outputDir?: string;
}

/**
 * Bulk download historical data from Binance Data Portal
 *
 * Downloads monthly and daily archives, extracts them, and parses to candles.
 * Much faster than REST API for large datasets.
 */
export async function bulkDownload(options: BulkDownloadOptions): Promise<Candle[]> {
  const {
    symbol,
    interval,
    startDate,
    endDate,
    outputDir = `./data/binance/${symbol.toLowerCase()}/${interval}`,
  } = options;

  const symbolUpper = symbol.toUpperCase();
  const baseUrl = 'https://data.binance.vision/data/spot';

  // Create output directory
  mkdirSync(outputDir, { recursive: true });

  const start = new Date(startDate);
  const end = new Date(endDate);
  const downloadedFiles: string[] = [];

  // 1. Download monthly archives
  console.log('Downloading monthly archives...');
  let currentDate = new Date(start.getFullYear(), start.getMonth(), 1);

  while (currentDate <= end) {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const filename = `${symbolUpper}-${interval}-${year}-${month}.zip`;
    const url = `${baseUrl}/monthly/klines/${symbolUpper}/${interval}/${filename}`;
    const destPath = join(outputDir, filename);

    process.stdout.write(`  ${filename}...`);
    const success = await downloadFile(url, destPath);
    console.log(success ? ' ✓' : ' not available');

    if (success) {
      downloadedFiles.push(destPath);
    }

    // Next month
    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  // 2. Download daily files for the end month (may not be in monthly archive yet)
  console.log('\nDownloading daily files...');
  const endYear = end.getFullYear();
  const endMonth = String(end.getMonth() + 1).padStart(2, '0');

  for (let day = 1; day <= end.getDate(); day++) {
    const dayStr = String(day).padStart(2, '0');
    const filename = `${symbolUpper}-${interval}-${endYear}-${endMonth}-${dayStr}.zip`;
    const url = `${baseUrl}/daily/klines/${symbolUpper}/${interval}/${filename}`;
    const destPath = join(outputDir, filename);

    process.stdout.write(`  ${filename}...`);
    const success = await downloadFile(url, destPath);
    console.log(success ? ' ✓' : ' not available');

    if (success) {
      downloadedFiles.push(destPath);
    }
  }

  if (downloadedFiles.length === 0) {
    throw new Error('No files downloaded');
  }

  // 3. Extract all ZIP files
  console.log('\nExtracting archives...');
  for (const zipPath of downloadedFiles) {
    try {
      execSync(`unzip -o -q "${zipPath}" -d "${outputDir}"`, { stdio: 'pipe' });
    } catch {
      // Ignore extraction errors for individual files
    }
  }

  // 4. Find and parse all CSV files
  const csvFiles = readdirSync(outputDir)
    .filter(f => f.endsWith('.csv') && !f.includes('-converted'))
    .sort();

  console.log(`\nParsing ${csvFiles.length} CSV files...`);

  let allCandles: Candle[] = [];
  for (const csvFile of csvFiles) {
    const candles = parseBinanceCSV(join(outputDir, csvFile));
    allCandles.push(...candles);
  }

  // 5. Sort and deduplicate
  allCandles.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const uniqueCandles = allCandles.filter((c, i, arr) =>
    i === 0 || c.timestamp !== arr[i - 1].timestamp
  );

  // 6. Filter to exact date range
  const startTime = new Date(startDate).toISOString();
  const endTime = new Date(endDate + 'T23:59:59Z').toISOString();

  const filteredCandles = uniqueCandles.filter(c =>
    c.timestamp >= startTime && c.timestamp <= endTime
  );

  console.log(`\nTotal unique candles: ${filteredCandles.length}`);

  return filteredCandles;
}
```

### Usage Example

```typescript
import { bulkDownload } from './binance-bulk-download';

const candles = await bulkDownload({
  symbol: 'btcusdt',
  interval: '5m',
  startDate: '2025-01-01',
  endDate: '2025-06-30',
});

console.log(`Downloaded ${candles.length} candles`);
console.log(`Range: ${candles[0].timestamp} to ${candles[candles.length - 1].timestamp}`);
```

---

## 4. Redis Caching

### redis-cache.ts

```typescript
import { Redis } from '@upstash/redis';

// Initialize Upstash Redis client
// For traditional Redis, use 'ioredis' package instead
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

/**
 * Cache keys structure
 */
export const cacheKeys = {
  marketLatest: (asset: string) => `market:${asset}:latest`,
  market1m: (asset: string, timestamp: number) => `market:${asset}:1m:${timestamp}`,
};

export interface MarketTick {
  price: number;
  volume: number;
  timestamp: number;
}

/**
 * Cache a market tick with 60 second TTL
 */
export async function cacheMarketTick(asset: string, data: MarketTick): Promise<void> {
  const key = cacheKeys.marketLatest(asset);
  await redis.set(key, JSON.stringify(data), { ex: 60 });
}

/**
 * Get cached market tick
 */
export async function getCachedMarketTick(asset: string): Promise<MarketTick | null> {
  const key = cacheKeys.marketLatest(asset);
  const data = await redis.get<string>(key);
  return data ? JSON.parse(data) : null;
}
```

### Integrate with WebSocket

```typescript
import { getBinanceWSClient } from './binance-websocket';
import { cacheMarketTick } from './redis-cache';

const client = getBinanceWSClient(['btcusdt', 'ethusdt']);

client.onTick(async (tick) => {
  // Cache in Redis for fast access
  await cacheMarketTick(tick.asset, {
    price: tick.price,
    volume: tick.volume,
    timestamp: tick.timestamp,
  });
});

client.connect();
```

---

## 5. Server-Sent Events (SSE) for Browser

### sse-stream.ts (Next.js API Route)

```typescript
import { getCachedMarketTick } from './redis-cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * SSE endpoint for real-time market data streaming
 *
 * Usage in browser:
 *   const source = new EventSource('/api/stream?assets=btcusdt,ethusdt')
 *   source.onmessage = (e) => console.log(JSON.parse(e.data))
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const assetsParam = searchParams.get('assets') || 'btcusdt,ethusdt';
  const assets = assetsParam.split(',').map(a => a.trim().toLowerCase());

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let isActive = true;

      // Send initial connection message
      const initialData = `data: ${JSON.stringify({
        type: 'connected',
        assets,
        timestamp: new Date().toISOString()
      })}\n\n`;
      controller.enqueue(encoder.encode(initialData));

      // Store last known prices to detect changes
      const lastPrices = new Map<string, number>();

      // Poll Redis every 1 second
      const poller = setInterval(async () => {
        if (!isActive) {
          clearInterval(poller);
          return;
        }

        try {
          for (const asset of assets) {
            const tickData = await getCachedMarketTick(asset);
            if (!tickData) continue;

            // Only send if price changed
            const lastPrice = lastPrices.get(asset);
            if (lastPrice !== tickData.price) {
              lastPrices.set(asset, tickData.price);

              const sseMessage = `data: ${JSON.stringify({
                type: 'ticker',
                asset,
                ...tickData,
                timestamp: new Date().toISOString()
              })}\n\n`;
              controller.enqueue(encoder.encode(sseMessage));
            }
          }
        } catch (error) {
          console.error('Error polling market data:', error);
        }
      }, 1000);

      // Heartbeat every 30 seconds
      const heartbeat = setInterval(() => {
        if (!isActive) {
          clearInterval(heartbeat);
          return;
        }

        const heartbeatMessage = `data: ${JSON.stringify({
          type: 'heartbeat',
          timestamp: new Date().toISOString()
        })}\n\n`;
        controller.enqueue(encoder.encode(heartbeatMessage));
      }, 30000);

      // Cleanup on disconnect
      request.signal.addEventListener('abort', () => {
        isActive = false;
        clearInterval(poller);
        clearInterval(heartbeat);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable buffering for Nginx
    },
  });
}
```

### Browser Client

```typescript
// React hook for SSE
import { useEffect, useState } from 'react';

interface TickerData {
  asset: string;
  price: number;
  volume: number;
  timestamp: string;
}

export function useMarketStream(assets: string[]) {
  const [tickers, setTickers] = useState<Map<string, TickerData>>(new Map());
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const assetsParam = assets.join(',');
    const source = new EventSource(`/api/stream?assets=${assetsParam}`);

    source.onopen = () => setIsConnected(true);

    source.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'ticker') {
        setTickers(prev => {
          const next = new Map(prev);
          next.set(data.asset, data);
          return next;
        });
      }
    };

    source.onerror = () => setIsConnected(false);

    return () => source.close();
  }, [assets.join(',')]);

  return { tickers, isConnected };
}

// Usage
function PriceDisplay() {
  const { tickers, isConnected } = useMarketStream(['btcusdt', 'ethusdt']);

  return (
    <div>
      <p>Status: {isConnected ? 'Connected' : 'Disconnected'}</p>
      {Array.from(tickers.values()).map(ticker => (
        <p key={ticker.asset}>
          {ticker.asset.toUpperCase()}: ${ticker.price.toLocaleString()}
        </p>
      ))}
    </div>
  );
}
```

---

## 6. CLI Commands

### cli/index.ts

```typescript
#!/usr/bin/env node
import 'dotenv/config';
import { Command } from 'commander';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { fetchHistoricalCandles, fetchDateRange } from './binance-rest';
import { bulkDownload } from './binance-bulk-download';

const program = new Command();

program
  .name('market-data')
  .description('CLI for downloading market data from Binance')
  .version('1.0.0');

/**
 * Download via REST API (small datasets)
 */
program
  .command('download <symbol>')
  .description('Download historical data via REST API')
  .option('-i, --interval <interval>', 'Candle interval', '1m')
  .option('-l, --limit <limit>', 'Number of candles', '1000')
  .action(async (symbol, options) => {
    console.log(`Downloading ${options.limit} ${options.interval} candles for ${symbol}...`);

    const candles = await fetchHistoricalCandles(
      symbol.toLowerCase(),
      options.interval,
      parseInt(options.limit)
    );

    console.log(`✓ Fetched ${candles.length} candles`);
    console.log(`Latest price: $${candles[0].close}`);

    // Export to CSV
    const outputDir = join(process.cwd(), 'data');
    mkdirSync(outputDir, { recursive: true });

    const csvPath = join(outputDir, `${symbol.toLowerCase()}-${options.interval}.csv`);
    const csvContent = [
      'timestamp,open,high,low,close,volume',
      ...candles.map(c => `${c.timestamp},${c.open},${c.high},${c.low},${c.close},${c.volume}`)
    ].join('\n');

    writeFileSync(csvPath, csvContent);
    console.log(`✓ Exported to ${csvPath}`);
  });

/**
 * Download date range via REST API
 */
program
  .command('download-range <symbol>')
  .description('Download historical data for date range')
  .option('-i, --interval <interval>', 'Candle interval', '1h')
  .option('-s, --start <date>', 'Start date (YYYY-MM-DD)', '2025-01-01')
  .option('-e, --end <date>', 'End date (YYYY-MM-DD)', '2025-12-01')
  .action(async (symbol, options) => {
    console.log(`Downloading ${symbol} ${options.interval} from ${options.start} to ${options.end}...`);

    const candles = await fetchDateRange(
      symbol.toLowerCase(),
      options.interval,
      new Date(options.start),
      new Date(options.end)
    );

    console.log(`✓ Fetched ${candles.length} candles`);

    // Export to CSV
    const outputDir = join(process.cwd(), 'data');
    mkdirSync(outputDir, { recursive: true });

    const csvPath = join(outputDir, `${symbol.toLowerCase()}-${options.interval}-${options.start}-to-${options.end}.csv`);
    const csvContent = [
      'timestamp,open,high,low,close,volume',
      ...candles.map(c => `${c.timestamp},${c.open},${c.high},${c.low},${c.close},${c.volume}`)
    ].join('\n');

    writeFileSync(csvPath, csvContent);
    console.log(`✓ Exported to ${csvPath}`);
  });

/**
 * Bulk download from Binance Data Portal (fastest)
 */
program
  .command('bulk-download <symbol>')
  .description('Bulk download from Binance Data Portal (fastest)')
  .option('-i, --interval <interval>', 'Candle interval', '5m')
  .option('-s, --start <date>', 'Start date (YYYY-MM-DD)', '2025-01-01')
  .option('-e, --end <date>', 'End date (YYYY-MM-DD)', '2025-06-30')
  .action(async (symbol, options) => {
    const candles = await bulkDownload({
      symbol,
      interval: options.interval,
      startDate: options.start,
      endDate: options.end,
    });

    // Export merged CSV
    const outputDir = join(process.cwd(), 'data');
    const csvPath = join(outputDir, `${symbol.toLowerCase()}-${options.interval}-${options.start}-to-${options.end}.csv`);

    const csvContent = [
      'timestamp,open,high,low,close,volume',
      ...candles.map(c => `${c.timestamp},${c.open},${c.high},${c.low},${c.close},${c.volume}`)
    ].join('\n');

    writeFileSync(csvPath, csvContent);
    console.log(`✓ Exported to ${csvPath}`);
  });

program.parse();
```

### Usage

```bash
# Quick download via REST API
pnpm cli download btcusdt -i 1h -l 500

# Download date range
pnpm cli download-range btcusdt -s 2025-01-01 -e 2025-03-01 -i 1h

# Bulk download (fastest for large datasets)
pnpm cli bulk-download btcusdt -i 5m -s 2025-01-01 -e 2025-12-01
```

---

## 7. CSV Conversion Tools

### convert-csv.ts

Convert between Binance CSV format and custom formats.

```typescript
import { readFileSync, writeFileSync } from 'fs';

/**
 * Convert Binance CSV to custom format
 *
 * Input (Binance):
 *   open_time,open,high,low,close,volume,close_time,...
 *   1699833600000,36500.00,36550.00,36480.00,36520.00,1234.56,...
 *
 * Output (Custom):
 *   Timestamp,Symbol,Open,High,Low,Close,Volume
 *   2024-11-13T00:00:00.000Z,BTCUSDT-PERPETUAL,36500.00,...
 */
export function convertBinanceCSV(
  inputPath: string,
  symbol: string,
  outputPath?: string
): void {
  console.log(`Converting: ${inputPath}`);

  const input = readFileSync(inputPath, 'utf-8');
  const lines = input.split('\n').filter(line => line.trim());

  // Skip header if present
  const startIndex = isNaN(parseInt(lines[0].split(',')[0])) ? 1 : 0;
  const dataLines = lines.slice(startIndex);

  console.log(`Found ${dataLines.length} candles`);

  // Convert to custom format
  const header = 'Timestamp,Symbol,Open,High,Low,Close,Volume';
  const rows = dataLines.map(line => {
    const parts = line.split(',');
    const [open_time, open, high, low, close, volume] = parts;

    // Convert timestamp
    const unix = parseInt(open_time);
    const unixMs = unix > 9999999999999 ? Math.floor(unix / 1000) : unix;
    const timestamp = new Date(unixMs).toISOString();

    const symbolName = `${symbol.toUpperCase()}-PERPETUAL`;

    return `${timestamp},${symbolName},${open},${high},${low},${close},${volume}`;
  });

  const output = [header, ...rows].join('\n');

  // Generate output path if not provided
  const finalOutputPath = outputPath || inputPath.replace('.csv', '-converted.csv');

  writeFileSync(finalOutputPath, output);
  console.log(`Converted to: ${finalOutputPath}`);
}

// CLI usage
if (require.main === module) {
  const [inputPath, symbol, outputPath] = process.argv.slice(2);

  if (!inputPath || !symbol) {
    console.error('Usage: tsx convert-csv.ts <input.csv> <symbol> [output.csv]');
    process.exit(1);
  }

  convertBinanceCSV(inputPath, symbol, outputPath);
}
```

---

## 8. CSV Merging Tools

Tools for merging multiple CSV files into a single chronologically sorted file.

### merge-csv.ts

```typescript
#!/usr/bin/env node

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';

interface CandleRow {
  timestamp: string;
  line: string;
}

/**
 * Merge multiple CSV files into one chronologically sorted file
 *
 * @param outputPath - Output file path
 * @param inputDir - Directory containing CSV files
 * @param pattern - File pattern to match (e.g., '*-lona.csv')
 */
export function mergeCSVFiles(
  outputPath: string,
  inputDir: string,
  pattern: string = '*-lona.csv'
): void {
  console.log(`Merging CSV files from: ${inputDir}`);

  // Find all matching files
  const allFiles = readdirSync(inputDir);
  const files = allFiles
    .filter(f => {
      if (pattern.includes('*')) {
        const suffix = pattern.replace('*', '');
        return f.endsWith(suffix);
      }
      return f === pattern;
    })
    .map(f => join(inputDir, f))
    .sort();

  if (files.length === 0) {
    throw new Error('No files found matching pattern');
  }

  console.log(`Found ${files.length} files to merge`);

  const allRows: CandleRow[] = [];
  let header = '';

  // Read all files
  for (const file of files) {
    console.log(`  Reading: ${file}`);
    const content = readFileSync(file, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());

    // Get header from first file
    if (!header && lines.length > 0) {
      header = lines[0];
    }

    // Add all data rows (skip header)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const timestamp = line.split(',')[0];
      allRows.push({ timestamp, line });
    }
  }

  console.log(`Total rows collected: ${allRows.length}`);

  // Sort by timestamp (ISO strings sort correctly)
  console.log('Sorting by timestamp...');
  allRows.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  // Remove duplicates (same timestamp)
  const uniqueRows = allRows.filter((row, i, arr) =>
    i === 0 || row.timestamp !== arr[i - 1].timestamp
  );

  console.log(`Unique rows after deduplication: ${uniqueRows.length}`);

  // Write merged file
  const output = header + '\n' + uniqueRows.map(row => row.line).join('\n');
  writeFileSync(outputPath, output);

  console.log(`\nMerged file created: ${outputPath}`);
  console.log(`Total candles: ${uniqueRows.length}`);
  console.log(`Date range: ${uniqueRows[0]?.timestamp} to ${uniqueRows[uniqueRows.length - 1]?.timestamp}`);
}

// CLI usage
if (require.main === module) {
  const [outputPath, inputDir, pattern] = process.argv.slice(2);

  if (!outputPath || !inputDir) {
    console.error('Usage: tsx merge-csv.ts <output.csv> <input-dir> [pattern]');
    console.error('Example: tsx merge-csv.ts merged.csv ./data/btcusdt/1m "*-lona.csv"');
    process.exit(1);
  }

  mergeCSVFiles(outputPath, inputDir, pattern || '*-lona.csv');
}
```

### batch-convert.ts

Convert all Binance CSV files in a directory to your custom format.

```typescript
#!/usr/bin/env node

import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Convert Unix timestamp to ISO string
 * Handles both milliseconds (13 digits) and microseconds (16 digits)
 */
function convertUnixToISO(unix: number): string {
  const unixMs = unix > 9999999999999 ? Math.floor(unix / 1000) : unix;
  return new Date(unixMs).toISOString();
}

/**
 * Convert a single Binance CSV file to custom format
 */
function convertCSV(inputPath: string, symbol: string, outputPath: string): number {
  const input = readFileSync(inputPath, 'utf-8');
  const lines = input.split('\n').filter(line => line.trim());

  // Skip header if present
  const startIndex = isNaN(parseInt(lines[0].split(',')[0])) ? 1 : 0;
  const dataLines = lines.slice(startIndex);

  // Custom format header
  const header = 'Timestamp,Symbol,Open,High,Low,Close,Volume\n';

  const rows = dataLines.map(line => {
    const parts = line.split(',');
    const [open_time, open, high, low, close, volume] = parts;
    const timestamp = convertUnixToISO(parseInt(open_time));
    const symbolName = `${symbol.toUpperCase()}-PERPETUAL`;
    return `${timestamp},${symbolName},${open},${high},${low},${close},${volume}`;
  }).join('\n');

  writeFileSync(outputPath, header + rows);
  return dataLines.length;
}

/**
 * Batch convert all CSV files in a directory
 *
 * @param inputDir - Directory containing Binance CSV files
 * @param symbol - Trading symbol (e.g., 'btcusdt')
 */
export function batchConvert(inputDir: string, symbol: string): void {
  console.log(`Converting all CSV files in ${inputDir}...`);

  // Find all CSV files (excluding already converted ones)
  const files = readdirSync(inputDir)
    .filter(f => f.endsWith('.csv') && !f.endsWith('-lona.csv') && !f.endsWith('-converted.csv'))
    .sort();

  if (files.length === 0) {
    console.log('No CSV files found to convert');
    return;
  }

  let totalCandles = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const inputPath = join(inputDir, file);
    const outputPath = join(inputDir, file.replace('.csv', '-lona.csv'));

    console.log(`[${i + 1}/${files.length}] ${file}`);
    const candles = convertCSV(inputPath, symbol, outputPath);
    totalCandles += candles;
  }

  console.log(`\nConverted ${files.length} files (${totalCandles.toLocaleString()} candles)`);
}

// CLI usage
if (require.main === module) {
  const [inputDir, symbol] = process.argv.slice(2);

  if (!inputDir) {
    console.error('Usage: tsx batch-convert.ts <input-dir> [symbol]');
    console.error('Example: tsx batch-convert.ts ./data/binance/btcusdt/5m btcusdt');
    process.exit(1);
  }

  batchConvert(inputDir, symbol || 'btcusdt');
}
```

### merge-specific-files.ts

Merge specific files (useful for weekly/monthly merges).

```typescript
#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from 'fs';

interface CandleRow {
  timestamp: string;
  line: string;
}

/**
 * Merge specific CSV files into one
 *
 * @param files - Array of file paths to merge
 * @param outputPath - Output file path
 */
export function mergeSpecificFiles(files: string[], outputPath: string): void {
  console.log(`Merging ${files.length} files -> ${outputPath}`);

  const allRows: CandleRow[] = [];
  let header = '';

  for (const file of files) {
    if (!existsSync(file)) {
      console.log(`  Skipping (not found): ${file}`);
      continue;
    }

    console.log(`  Reading: ${file}`);
    const content = readFileSync(file, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());

    // Get header from first file
    if (!header && lines.length > 0) {
      header = lines[0];
    }

    // Add all data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const timestamp = line.split(',')[0];
      allRows.push({ timestamp, line });
    }
  }

  console.log(`Total rows: ${allRows.length}`);

  // Sort by timestamp
  allRows.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  // Remove duplicates
  const uniqueRows = allRows.filter((row, i, arr) =>
    i === 0 || row.timestamp !== arr[i - 1].timestamp
  );

  const output = header + '\n' + uniqueRows.map(row => row.line).join('\n');
  writeFileSync(outputPath, output);

  console.log(`Created: ${outputPath}`);
  console.log(`Range: ${uniqueRows[0]?.timestamp} to ${uniqueRows[uniqueRows.length - 1]?.timestamp}`);
}

// Example: Merge a week of daily files
const weeklyFiles = [
  'data/binance/btcusdt/5m/BTCUSDT-5m-2025-11-23-lona.csv',
  'data/binance/btcusdt/5m/BTCUSDT-5m-2025-11-24-lona.csv',
  'data/binance/btcusdt/5m/BTCUSDT-5m-2025-11-25-lona.csv',
  'data/binance/btcusdt/5m/BTCUSDT-5m-2025-11-26-lona.csv',
  'data/binance/btcusdt/5m/BTCUSDT-5m-2025-11-27-lona.csv',
  'data/binance/btcusdt/5m/BTCUSDT-5m-2025-11-28-lona.csv',
  'data/binance/btcusdt/5m/BTCUSDT-5m-2025-11-29-lona.csv',
];

mergeSpecificFiles(weeklyFiles, 'data/binance/btcusdt/5m/BTCUSDT-5m-2025-11-23-to-29-lona.csv');
```

### CLI Commands for Merging

Add these to your CLI:

```typescript
program
  .command('merge <output>')
  .description('Merge multiple CSV files into one')
  .option('-d, --dir <directory>', 'Directory containing CSV files', './data')
  .option('-p, --pattern <pattern>', 'File pattern to match', '*-lona.csv')
  .action((output, options) => {
    mergeCSVFiles(output, options.dir, options.pattern);
  });

program
  .command('batch-convert')
  .description('Convert all Binance CSV files in a directory')
  .option('-d, --dir <directory>', 'Directory containing CSV files', './data')
  .option('-s, --symbol <symbol>', 'Trading symbol', 'btcusdt')
  .action((options) => {
    batchConvert(options.dir, options.symbol);
  });
```

### Usage Examples

```bash
# Convert all Binance CSVs in a directory
pnpm tsx batch-convert.ts ./data/binance/btcusdt/5m btcusdt

# Merge all converted files
pnpm tsx merge-csv.ts ./data/merged.csv ./data/binance/btcusdt/5m "*-lona.csv"

# Using CLI
pnpm cli batch-convert -d ./data/binance/btcusdt/5m -s btcusdt
pnpm cli merge ./data/merged.csv -d ./data/binance/btcusdt/5m -p "*-lona.csv"
```

---

## 9. Data Adaptation & Transformation

Tools for transforming data between formats and resampling timeframes.

### Timeframe Resampling

Convert lower timeframe data to higher timeframes (e.g., 1m → 5m → 1h).

```typescript
import { readFileSync, writeFileSync } from 'fs';

interface Candle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Resample candles to a higher timeframe
 *
 * @param candles - Input candles (sorted by timestamp ascending)
 * @param targetIntervalMs - Target interval in milliseconds
 * @returns Resampled candles
 *
 * Example: 1m candles -> 5m candles (targetIntervalMs = 300000)
 */
export function resampleCandles(
  candles: Candle[],
  targetIntervalMs: number
): Candle[] {
  if (candles.length === 0) return [];

  const resampled: Candle[] = [];
  let currentBucket: Candle[] = [];
  let currentBucketStart = 0;

  for (const candle of candles) {
    const candleTime = new Date(candle.timestamp).getTime();

    // Calculate which bucket this candle belongs to
    const bucketStart = Math.floor(candleTime / targetIntervalMs) * targetIntervalMs;

    if (currentBucketStart === 0) {
      currentBucketStart = bucketStart;
    }

    if (bucketStart !== currentBucketStart && currentBucket.length > 0) {
      // Aggregate current bucket
      resampled.push(aggregateBucket(currentBucket, currentBucketStart));
      currentBucket = [];
      currentBucketStart = bucketStart;
    }

    currentBucket.push(candle);
  }

  // Don't forget the last bucket
  if (currentBucket.length > 0) {
    resampled.push(aggregateBucket(currentBucket, currentBucketStart));
  }

  return resampled;
}

/**
 * Aggregate multiple candles into a single OHLCV candle
 */
function aggregateBucket(candles: Candle[], bucketStartMs: number): Candle {
  return {
    timestamp: new Date(bucketStartMs).toISOString(),
    open: candles[0].open,                                    // First open
    high: Math.max(...candles.map(c => c.high)),              // Highest high
    low: Math.min(...candles.map(c => c.low)),                // Lowest low
    close: candles[candles.length - 1].close,                 // Last close
    volume: candles.reduce((sum, c) => sum + c.volume, 0),    // Sum of volumes
  };
}

// Interval constants in milliseconds
export const INTERVALS = {
  '1m': 60 * 1000,
  '5m': 5 * 60 * 1000,
  '15m': 15 * 60 * 1000,
  '30m': 30 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '4h': 4 * 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000,
};

/**
 * Resample CSV file to a different timeframe
 */
export function resampleCSVFile(
  inputPath: string,
  outputPath: string,
  targetInterval: keyof typeof INTERVALS
): void {
  console.log(`Resampling ${inputPath} to ${targetInterval}...`);

  const content = readFileSync(inputPath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());

  // Parse header
  const header = lines[0];
  const hasSymbol = header.includes('Symbol');

  // Parse candles
  const candles: Candle[] = [];
  let symbol = '';

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');

    if (hasSymbol) {
      // Format: Timestamp,Symbol,Open,High,Low,Close,Volume
      const [timestamp, sym, open, high, low, close, volume] = parts;
      symbol = sym;
      candles.push({
        timestamp,
        open: parseFloat(open),
        high: parseFloat(high),
        low: parseFloat(low),
        close: parseFloat(close),
        volume: parseFloat(volume),
      });
    } else {
      // Format: timestamp,open,high,low,close,volume
      const [timestamp, open, high, low, close, volume] = parts;
      candles.push({
        timestamp,
        open: parseFloat(open),
        high: parseFloat(high),
        low: parseFloat(low),
        close: parseFloat(close),
        volume: parseFloat(volume),
      });
    }
  }

  console.log(`Input candles: ${candles.length}`);

  // Resample
  const resampled = resampleCandles(candles, INTERVALS[targetInterval]);

  console.log(`Output candles: ${resampled.length}`);

  // Write output
  let output: string;
  if (hasSymbol) {
    output = 'Timestamp,Symbol,Open,High,Low,Close,Volume\n' +
      resampled.map(c =>
        `${c.timestamp},${symbol},${c.open},${c.high},${c.low},${c.close},${c.volume}`
      ).join('\n');
  } else {
    output = 'timestamp,open,high,low,close,volume\n' +
      resampled.map(c =>
        `${c.timestamp},${c.open},${c.high},${c.low},${c.close},${c.volume}`
      ).join('\n');
  }

  writeFileSync(outputPath, output);
  console.log(`Created: ${outputPath}`);
}

// CLI usage
if (require.main === module) {
  const [inputPath, outputPath, interval] = process.argv.slice(2);

  if (!inputPath || !outputPath || !interval) {
    console.error('Usage: tsx resample.ts <input.csv> <output.csv> <interval>');
    console.error('Intervals: 1m, 5m, 15m, 30m, 1h, 4h, 1d');
    console.error('Example: tsx resample.ts btcusdt-1m.csv btcusdt-1h.csv 1h');
    process.exit(1);
  }

  resampleCSVFile(inputPath, outputPath, interval as keyof typeof INTERVALS);
}
```

### Format Adapters

Convert between different CSV formats.

```typescript
import { readFileSync, writeFileSync } from 'fs';

/**
 * CSV Format Definitions
 */
export const CSV_FORMATS = {
  // Binance Data Portal format
  binance: {
    hasHeader: false,  // No header row
    columns: ['open_time', 'open', 'high', 'low', 'close', 'volume', 'close_time', 'quote_volume', 'count', 'taker_buy_volume', 'taker_buy_quote_volume', 'ignore'],
    timestampIndex: 0,
    timestampType: 'unix_ms',  // milliseconds or microseconds
  },

  // Standard OHLCV format
  standard: {
    hasHeader: true,
    columns: ['timestamp', 'open', 'high', 'low', 'close', 'volume'],
    timestampIndex: 0,
    timestampType: 'iso',
  },

  // Custom Lona format
  lona: {
    hasHeader: true,
    columns: ['Timestamp', 'Symbol', 'Open', 'High', 'Low', 'Close', 'Volume'],
    timestampIndex: 0,
    timestampType: 'iso',
  },

  // TradingView format
  tradingview: {
    hasHeader: true,
    columns: ['time', 'open', 'high', 'low', 'close', 'volume'],
    timestampIndex: 0,
    timestampType: 'unix_seconds',
  },
};

export type FormatName = keyof typeof CSV_FORMATS;

interface ConvertOptions {
  inputPath: string;
  outputPath: string;
  inputFormat: FormatName;
  outputFormat: FormatName;
  symbol?: string;  // Required for 'lona' output format
}

/**
 * Convert CSV between formats
 */
export function convertFormat(options: ConvertOptions): void {
  const { inputPath, outputPath, inputFormat, outputFormat, symbol } = options;

  console.log(`Converting ${inputFormat} -> ${outputFormat}`);
  console.log(`Input: ${inputPath}`);

  const content = readFileSync(inputPath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());

  const inFmt = CSV_FORMATS[inputFormat];
  const outFmt = CSV_FORMATS[outputFormat];

  // Skip header if input has one
  const dataStartIndex = inFmt.hasHeader ? 1 : 0;
  const dataLines = lines.slice(dataStartIndex);

  console.log(`Processing ${dataLines.length} rows...`);

  // Parse and convert each row
  const outputRows: string[] = [];

  for (const line of dataLines) {
    const parts = line.split(',');

    // Extract OHLCV data based on input format
    let timestamp: string;
    let open: string, high: string, low: string, close: string, volume: string;

    if (inputFormat === 'binance') {
      const rawTimestamp = parseInt(parts[0]);
      // Handle both milliseconds and microseconds
      const unixMs = rawTimestamp > 9999999999999 ? Math.floor(rawTimestamp / 1000) : rawTimestamp;
      timestamp = new Date(unixMs).toISOString();
      [, open, high, low, close, volume] = parts;
    } else if (inputFormat === 'tradingview') {
      timestamp = new Date(parseInt(parts[0]) * 1000).toISOString();
      [, open, high, low, close, volume] = parts;
    } else if (inputFormat === 'lona') {
      [timestamp, , open, high, low, close, volume] = parts;
    } else {
      [timestamp, open, high, low, close, volume] = parts;
    }

    // Format output based on output format
    let outputRow: string;

    if (outputFormat === 'lona') {
      if (!symbol) throw new Error('Symbol required for lona format');
      outputRow = `${timestamp},${symbol.toUpperCase()}-PERPETUAL,${open},${high},${low},${close},${volume}`;
    } else if (outputFormat === 'tradingview') {
      const unixSeconds = Math.floor(new Date(timestamp).getTime() / 1000);
      outputRow = `${unixSeconds},${open},${high},${low},${close},${volume}`;
    } else if (outputFormat === 'binance') {
      const unixMs = new Date(timestamp).getTime();
      outputRow = `${unixMs},${open},${high},${low},${close},${volume},0,0,0,0,0,0`;
    } else {
      outputRow = `${timestamp},${open},${high},${low},${close},${volume}`;
    }

    outputRows.push(outputRow);
  }

  // Add header if output format requires it
  let output: string;
  if (outFmt.hasHeader) {
    const header = outFmt.columns.join(',');
    output = header + '\n' + outputRows.join('\n');
  } else {
    output = outputRows.join('\n');
  }

  writeFileSync(outputPath, output);
  console.log(`Created: ${outputPath}`);
  console.log(`Rows: ${outputRows.length}`);
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 4) {
    console.error('Usage: tsx format-adapter.ts <input.csv> <output.csv> <input-format> <output-format> [symbol]');
    console.error('Formats: binance, standard, lona, tradingview');
    console.error('Example: tsx format-adapter.ts binance.csv lona.csv binance lona btcusdt');
    process.exit(1);
  }

  const [inputPath, outputPath, inputFormat, outputFormat, symbol] = args;

  convertFormat({
    inputPath,
    outputPath,
    inputFormat: inputFormat as FormatName,
    outputFormat: outputFormat as FormatName,
    symbol,
  });
}
```

### Data Validation

Validate CSV data integrity.

```typescript
import { readFileSync } from 'fs';

interface ValidationResult {
  isValid: boolean;
  totalRows: number;
  errors: string[];
  warnings: string[];
  gaps: Array<{ from: string; to: string; expectedCount: number }>;
}

/**
 * Validate OHLCV CSV data
 *
 * Checks for:
 * - Missing/invalid values
 * - Timestamp gaps
 * - OHLC consistency (high >= low, etc.)
 * - Chronological order
 */
export function validateCSV(
  filePath: string,
  expectedIntervalMs: number
): ValidationResult {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());

  const result: ValidationResult = {
    isValid: true,
    totalRows: 0,
    errors: [],
    warnings: [],
    gaps: [],
  };

  // Skip header
  const dataLines = lines.slice(1);
  result.totalRows = dataLines.length;

  let prevTimestamp: number | null = null;

  for (let i = 0; i < dataLines.length; i++) {
    const lineNum = i + 2; // Account for header and 0-index
    const parts = dataLines[i].split(',');

    // Extract values (handle both formats)
    const hasSymbol = parts.length >= 7;
    const [timestampStr, , openStr, highStr, lowStr, closeStr, volumeStr] = hasSymbol
      ? parts
      : [parts[0], '', parts[1], parts[2], parts[3], parts[4], parts[5]];

    // Validate timestamp
    const timestamp = new Date(timestampStr).getTime();
    if (isNaN(timestamp)) {
      result.errors.push(`Line ${lineNum}: Invalid timestamp "${timestampStr}"`);
      result.isValid = false;
      continue;
    }

    // Check chronological order
    if (prevTimestamp !== null && timestamp < prevTimestamp) {
      result.errors.push(`Line ${lineNum}: Timestamp out of order`);
      result.isValid = false;
    }

    // Check for gaps
    if (prevTimestamp !== null) {
      const gap = timestamp - prevTimestamp;
      if (gap > expectedIntervalMs * 1.5) {
        const expectedCount = Math.floor(gap / expectedIntervalMs) - 1;
        result.gaps.push({
          from: new Date(prevTimestamp).toISOString(),
          to: timestampStr,
          expectedCount,
        });
        result.warnings.push(`Line ${lineNum}: Gap detected - ${expectedCount} missing candles`);
      }
    }

    prevTimestamp = timestamp;

    // Validate OHLCV values
    const open = parseFloat(openStr);
    const high = parseFloat(highStr);
    const low = parseFloat(lowStr);
    const close = parseFloat(closeStr);
    const volume = parseFloat(volumeStr);

    if ([open, high, low, close, volume].some(isNaN)) {
      result.errors.push(`Line ${lineNum}: Invalid numeric value`);
      result.isValid = false;
      continue;
    }

    // OHLC consistency checks
    if (high < low) {
      result.errors.push(`Line ${lineNum}: High (${high}) < Low (${low})`);
      result.isValid = false;
    }

    if (high < open || high < close) {
      result.warnings.push(`Line ${lineNum}: High (${high}) < Open/Close`);
    }

    if (low > open || low > close) {
      result.warnings.push(`Line ${lineNum}: Low (${low}) > Open/Close`);
    }

    if (volume < 0) {
      result.errors.push(`Line ${lineNum}: Negative volume (${volume})`);
      result.isValid = false;
    }
  }

  return result;
}

// CLI usage
if (require.main === module) {
  const [filePath, interval] = process.argv.slice(2);

  if (!filePath) {
    console.error('Usage: tsx validate.ts <file.csv> [interval]');
    console.error('Intervals: 1m, 5m, 15m, 1h, 4h, 1d (default: 1m)');
    process.exit(1);
  }

  const INTERVALS: Record<string, number> = {
    '1m': 60000,
    '5m': 300000,
    '15m': 900000,
    '1h': 3600000,
    '4h': 14400000,
    '1d': 86400000,
  };

  const intervalMs = INTERVALS[interval || '1m'] || 60000;
  const result = validateCSV(filePath, intervalMs);

  console.log(`\nValidation Results for: ${filePath}`);
  console.log(`${'='.repeat(50)}`);
  console.log(`Total rows: ${result.totalRows}`);
  console.log(`Valid: ${result.isValid ? '✓ Yes' : '✗ No'}`);
  console.log(`Errors: ${result.errors.length}`);
  console.log(`Warnings: ${result.warnings.length}`);
  console.log(`Gaps detected: ${result.gaps.length}`);

  if (result.errors.length > 0) {
    console.log(`\nErrors (first 10):`);
    result.errors.slice(0, 10).forEach(e => console.log(`  - ${e}`));
  }

  if (result.warnings.length > 0) {
    console.log(`\nWarnings (first 10):`);
    result.warnings.slice(0, 10).forEach(w => console.log(`  - ${w}`));
  }

  if (result.gaps.length > 0) {
    console.log(`\nGaps (first 5):`);
    result.gaps.slice(0, 5).forEach(g =>
      console.log(`  - ${g.from} -> ${g.to} (${g.expectedCount} missing)`)
    );
  }

  process.exit(result.isValid ? 0 : 1);
}
```

### CLI Commands for Data Transformation

```typescript
program
  .command('resample <input> <output> <interval>')
  .description('Resample CSV to different timeframe')
  .action((input, output, interval) => {
    resampleCSVFile(input, output, interval);
  });

program
  .command('convert-format <input> <output>')
  .description('Convert between CSV formats')
  .option('--from <format>', 'Input format', 'binance')
  .option('--to <format>', 'Output format', 'standard')
  .option('-s, --symbol <symbol>', 'Symbol (for lona format)')
  .action((input, output, options) => {
    convertFormat({
      inputPath: input,
      outputPath: output,
      inputFormat: options.from,
      outputFormat: options.to,
      symbol: options.symbol,
    });
  });

program
  .command('validate <file>')
  .description('Validate CSV data integrity')
  .option('-i, --interval <interval>', 'Expected interval', '1m')
  .action((file, options) => {
    const result = validateCSV(file, INTERVALS[options.interval]);
    // Print results...
  });
```

### Usage Examples

```bash
# Resample 1-minute data to 1-hour
pnpm tsx resample.ts btcusdt-1m.csv btcusdt-1h.csv 1h

# Convert Binance format to standard
pnpm tsx format-adapter.ts binance.csv standard.csv binance standard

# Convert to Lona format with symbol
pnpm tsx format-adapter.ts standard.csv lona.csv standard lona btcusdt

# Validate data integrity
pnpm tsx validate.ts btcusdt-1m.csv 1m

# Full pipeline: download -> convert -> merge -> resample
pnpm cli bulk-download btcusdt -i 1m -s 2025-01-01 -e 2025-06-30
pnpm cli batch-convert -d ./data/binance/btcusdt/1m -s btcusdt
pnpm cli merge ./data/btcusdt-1m-merged.csv -d ./data/binance/btcusdt/1m
pnpm cli resample ./data/btcusdt-1m-merged.csv ./data/btcusdt-1h.csv 1h
```

---

## 10. Database Schema

### Supabase/PostgreSQL Schema

```sql
-- Market data table for storing OHLCV candles
CREATE TABLE market_data (
  id BIGSERIAL PRIMARY KEY,
  asset VARCHAR(20) NOT NULL,              -- e.g., 'btcusdt'
  timestamp TIMESTAMPTZ NOT NULL,          -- Candle open time
  open DECIMAL(20, 8) NOT NULL,
  high DECIMAL(20, 8) NOT NULL,
  low DECIMAL(20, 8) NOT NULL,
  close DECIMAL(20, 8) NOT NULL,
  volume DECIMAL(30, 8) NOT NULL,
  source VARCHAR(20) DEFAULT 'binance',    -- Data source
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint to prevent duplicates
  CONSTRAINT unique_asset_timestamp UNIQUE (asset, timestamp)
);

-- Indexes for common queries
CREATE INDEX idx_market_data_asset_timestamp
  ON market_data (asset, timestamp DESC);

CREATE INDEX idx_market_data_source
  ON market_data (source);

-- Enable Row Level Security (optional)
ALTER TABLE market_data ENABLE ROW LEVEL SECURITY;

-- Allow public read access (adjust as needed)
CREATE POLICY "Allow public read" ON market_data
  FOR SELECT USING (true);
```

### Supabase Client

```typescript
import { createClient } from '@supabase/supabase-js';

// Client-side (respects RLS)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Server-side (bypasses RLS)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Store candles in database
export async function storeCandles(symbol: string, candles: Candle[]): Promise<void> {
  const insertData = candles.map(candle => ({
    asset: symbol.toLowerCase(),
    timestamp: candle.timestamp,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: candle.volume,
    source: 'binance',
  }));

  // Batch insert in chunks of 500
  const batchSize = 500;
  for (let i = 0; i < insertData.length; i += batchSize) {
    const batch = insertData.slice(i, i + batchSize);

    const { error } = await supabaseAdmin
      .from('market_data')
      .upsert(batch, { onConflict: 'asset,timestamp' });

    if (error) {
      console.error(`Batch ${i / batchSize + 1} failed:`, error.message);
    }
  }
}

// Query candles from database
export async function queryCandles(
  symbol: string,
  start: string,
  end: string,
  limit = 1000
): Promise<Candle[]> {
  const { data, error } = await supabaseAdmin
    .from('market_data')
    .select('timestamp, open, high, low, close, volume')
    .eq('asset', symbol.toLowerCase())
    .gte('timestamp', start)
    .lte('timestamp', end)
    .order('timestamp', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data || [];
}
```

---

## Environment Variables

```bash
# .env.example

# Upstash Redis (for caching)
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx

# Supabase (for database storage)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Binance API (optional - only needed for authenticated endpoints)
# Not required for public market data
BINANCE_API_KEY=xxx
BINANCE_API_SECRET=xxx
```

---

## Quick Start

1. **Install dependencies:**
   ```bash
   pnpm add ws @upstash/redis @supabase/supabase-js commander dotenv
   pnpm add -D typescript tsx @types/node @types/ws
   ```

2. **Copy the files you need:**
   - `binance-websocket.ts` - Real-time streaming
   - `binance-rest.ts` - REST API fetching
   - `binance-bulk-download.ts` - Bulk data portal downloads
   - `redis-cache.ts` - Caching layer
   - `cli/index.ts` - CLI commands

3. **Set up environment variables**

4. **Run:**
   ```bash
   # Real-time streaming
   pnpm tsx binance-websocket.ts

   # Download historical data
   pnpm cli bulk-download btcusdt -i 5m -s 2025-01-01 -e 2025-12-01
   ```
