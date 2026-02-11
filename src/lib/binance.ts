import WebSocket from 'ws';
import { cacheMarketTick } from './redis';
import { supabaseAdmin } from './supabase';

/**
 * Binance WebSocket client for real-time market data
 * Supports multiple assets: BTC, ETH, etc.
 */

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

class BinanceWebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectInterval = 5000;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(private assets: Asset[]) {}

  /**
   * Connect to Binance WebSocket streams
   */
  connect() {
    // Multi-stream format: wss://stream.binance.com:9443/stream?streams=btcusdt@ticker/ethusdt@ticker
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
  private async handleMessage(message: {
    stream?: string;
    data?: { s: string; c: string; v: string; E: number; h: string; l: string; P: string };
  }) {
    if (message.stream && message.data) {
      const ticker = message.data;
      const asset = ticker.s.toLowerCase(); // btcusdt, ethusdt, etc.

      const tickData: TickData = {
        asset,
        price: Number.parseFloat(ticker.c), // Current price
        volume: Number.parseFloat(ticker.v), // 24h volume
        timestamp: ticker.E, // Event time
        high24h: Number.parseFloat(ticker.h),
        low24h: Number.parseFloat(ticker.l),
        change24h: Number.parseFloat(ticker.P), // Price change percentage
      };

      // Cache in Redis (fast access)
      await cacheMarketTick(asset, {
        price: tickData.price,
        volume: tickData.volume,
        timestamp: tickData.timestamp,
      });

      // Store in Supabase (persistent storage)
      await this.storeTickData(tickData);
    }
  }

  /**
   * Store tick data in Supabase for historical analysis
   */
  private async storeTickData(tickData: TickData) {
    try {
      await supabaseAdmin.from('market_data').insert({
        asset: tickData.asset,
        timestamp: new Date(tickData.timestamp).toISOString(),
        open: tickData.price, // For ticks, use current price
        high: tickData.high24h,
        low: tickData.low24h,
        close: tickData.price,
        volume: tickData.volume,
        source: 'binance',
      });
    } catch (error) {
      console.error('Error storing tick data:', error);
    }
  }

  /**
   * Keep connection alive with heartbeat
   */
  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, 30000); // 30 seconds
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

export type Interval = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

export interface FetchHistoricalOptions {
  symbol: Asset | string;
  interval?: Interval;
  limit?: number;
  startTime?: number;
  endTime?: number;
}

/**
 * Fetch historical data from Binance REST API
 * Supports date range via startTime and endTime (Unix ms)
 */
export async function fetchHistoricalCandles(
  symbolOrOptions: Asset | FetchHistoricalOptions,
  interval: Interval = '1m',
  limit = 500,
  endTime?: number,
) {
  // Support both old signature and new options object
  let options: FetchHistoricalOptions;
  if (typeof symbolOrOptions === 'string') {
    options = { symbol: symbolOrOptions, interval, limit, endTime };
  } else {
    options = symbolOrOptions;
  }

  const { symbol, interval: intv = '1m', limit: lim = 1000, startTime, endTime: end } = options;

  const params = new URLSearchParams({
    symbol: symbol.toUpperCase(),
    interval: intv,
    limit: String(lim),
  });

  if (startTime) {
    params.append('startTime', String(startTime));
  }

  if (end) {
    params.append('endTime', String(end));
  }

  const url = `https://api.binance.com/api/v3/klines?${params.toString()}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.code && data.msg) {
      throw new Error(`Binance API error: ${data.msg}`);
    }

    return data.map((candle: (string | number)[]) => ({
      timestamp: new Date(candle[0]).toISOString(),
      open: Number.parseFloat(String(candle[1])),
      high: Number.parseFloat(String(candle[2])),
      low: Number.parseFloat(String(candle[3])),
      close: Number.parseFloat(String(candle[4])),
      volume: Number.parseFloat(String(candle[5])),
    }));
  } catch (error) {
    console.error('Error fetching historical candles:', error);
    throw error;
  }
}
