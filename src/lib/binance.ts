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
  private reconnectInterval: number = 5000;
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
  private async handleMessage(message: any) {
    if (message.stream && message.data) {
      const ticker = message.data;
      const asset = ticker.s.toLowerCase(); // btcusdt, ethusdt, etc.

      const tickData: TickData = {
        asset,
        price: parseFloat(ticker.c), // Current price
        volume: parseFloat(ticker.v), // 24h volume
        timestamp: ticker.E, // Event time
        high24h: parseFloat(ticker.h),
        low24h: parseFloat(ticker.l),
        change24h: parseFloat(ticker.P), // Price change percentage
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

/**
 * Fetch historical data from Binance REST API
 */
export async function fetchHistoricalCandles(
  symbol: Asset,
  interval: '1m' | '5m' | '15m' | '1h' | '1d' = '1m',
  limit: number = 500
) {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol.toUpperCase()}&interval=${interval}&limit=${limit}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    return data.map((candle: any) => ({
      timestamp: new Date(candle[0]).toISOString(),
      open: parseFloat(candle[1]),
      high: parseFloat(candle[2]),
      low: parseFloat(candle[3]),
      close: parseFloat(candle[4]),
      volume: parseFloat(candle[5]),
    }));
  } catch (error) {
    console.error('Error fetching historical candles:', error);
    throw error;
  }
}
