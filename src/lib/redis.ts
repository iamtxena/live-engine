import { Redis } from '@upstash/redis';

// Initialize Upstash Redis client
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

/**
 * Cache keys structure:
 * - market:{asset}:latest - Latest tick for an asset
 * - market:{asset}:1m:{timestamp} - 1-minute candle
 * - queue:trades - Trade execution queue
 * - queue:data - Data ingestion queue
 */

export const cacheKeys = {
  marketLatest: (asset: string) => `market:${asset}:latest`,
  market1m: (asset: string, timestamp: number) =>
    `market:${asset}:1m:${timestamp}`,
  tradeQueue: 'queue:trades',
  dataQueue: 'queue:data',
  userSession: (userId: string) => `session:${userId}`,
};

/**
 * Cache utilities
 */
export async function cacheMarketTick(
  asset: string,
  data: { price: number; volume: number; timestamp: number }
) {
  const key = cacheKeys.marketLatest(asset);
  await redis.set(key, JSON.stringify(data), { ex: 60 }); // 1 min TTL
}

export async function getCachedMarketTick(asset: string) {
  const key = cacheKeys.marketLatest(asset);
  const data = await redis.get<string>(key);
  return data ? JSON.parse(data) : null;
}

export async function queueTrade(trade: {
  userId: string;
  asset: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
}) {
  await redis.lpush(cacheKeys.tradeQueue, JSON.stringify(trade));
}

export async function dequeueTrade() {
  const trade = await redis.rpop(cacheKeys.tradeQueue);
  return trade ? JSON.parse(trade) : null;
}
