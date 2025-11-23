import { useQuery } from '@tanstack/react-query';

type HistoricalDataParams = {
  asset?: string;
  limit?: number;
  interval?: string;
};

type MarketDataRow = {
  id: string;
  asset: string;
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

/**
 * Fetch historical candle data for charts
 */
export function useHistoricalData({ asset, limit = 100, interval = '1m' }: HistoricalDataParams) {
  return useQuery({
    queryKey: ['historical', asset, limit, interval],
    queryFn: async () => {
      const params = new URLSearchParams({
        ...(asset && { asset }),
        limit: limit.toString(),
        interval,
      });

      const response = await fetch(`/api/historical?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch historical data');
      }

      const result = await response.json();
      return (result.data || []) as MarketDataRow[];
    },
    enabled: !!asset,
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });
}

/**
 * Fetch recent trades for trade table
 */
export function useRecentTrades({ asset, limit = 50 }: { asset?: string; limit?: number }) {
  return useQuery({
    queryKey: ['trades', asset, limit],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        ...(asset && { asset }),
      });

      const response = await fetch(`/api/historical?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch trades');
      }

      const result = await response.json();
      return (result.data || []) as MarketDataRow[];
    },
    staleTime: 10000, // Consider fresh for 10 seconds
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}
