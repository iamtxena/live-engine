'use client';

import { useState, useEffect } from 'react';

export interface TickData {
  asset: string;
  price: number;
  volume: number;
  timestamp: number;
  high24h: number;
  low24h: number;
  change24h: number;
}

/**
 * Hook for live market data
 *
 * Usage:
 *   const { data, isConnected, error } = useLiveData('btcusdt');
 */
export function useLiveData(asset: string) {
  const [data, setData] = useState<TickData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>('WebSocket connection not implemented yet');

  useEffect(() => {
    // TODO: Connect to WebSocket or SSE
    // For now, this is a placeholder
    // When implementing, connect here and update states based on external events

    // Cleanup
    return () => {
      // Disconnect WebSocket when implemented
    };
  }, [asset]);

  return {
    data,
    isConnected,
    error,
  };
}
