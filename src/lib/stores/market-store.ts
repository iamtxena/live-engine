import { create } from 'zustand';

export type MarketTickData = {
  asset: string;
  price: number;
  volume: number;
  timestamp: number;
};

type StreamMessage =
  | { type: 'connected'; assets: string[]; timestamp: string }
  | { type: 'ticker'; asset: string; price: number; volume: number; timestamp: string | number }
  | { type: 'heartbeat'; timestamp: string };

interface MarketState {
  // Market data
  tickers: Map<string, MarketTickData>;

  // Connection state
  isConnected: boolean;
  error: string | null;
  eventSource: EventSource | null;

  // Actions
  updateTicker: (asset: string, data: MarketTickData) => void;
  setConnected: (connected: boolean) => void;
  setError: (error: string | null) => void;
  connectStream: (assets: string[]) => void;
  disconnectStream: () => void;
}

export const useMarketStore = create<MarketState>((set, get) => ({
  tickers: new Map(),
  isConnected: false,
  error: null,
  eventSource: null,

  updateTicker: (asset, data) =>
    set((state) => {
      const newTickers = new Map(state.tickers);
      newTickers.set(asset, data);
      return { tickers: newTickers };
    }),

  setConnected: (connected) => set({ isConnected: connected }),

  setError: (error) => set({ error }),

  connectStream: (assets) => {
    const currentEventSource = get().eventSource;

    // Close existing connection if any
    if (currentEventSource) {
      currentEventSource.close();
    }

    const assetsParam = assets.join(',');
    const eventSource = new EventSource(`/api/stream?assets=${assetsParam}`);

    eventSource.onopen = () => {
      set({ isConnected: true, error: null, eventSource });
      console.log('[Market Stream] Connected');
    };

    eventSource.onmessage = (event) => {
      try {
        const message: StreamMessage = JSON.parse(event.data);

        if (message.type === 'ticker') {
          get().updateTicker(message.asset, {
            asset: message.asset,
            price: message.price,
            volume: message.volume,
            timestamp: typeof message.timestamp === 'number' ? message.timestamp : Date.now(),
          });
        } else if (message.type === 'connected') {
          console.log('[Market Stream] Subscribed to:', message.assets);
        }
      } catch (err) {
        console.error('[Market Stream] Error parsing message:', err);
      }
    };

    eventSource.onerror = () => {
      console.error('[Market Stream] Connection error');
      set({ isConnected: false, error: 'Connection lost. Reconnecting...' });
      eventSource.close();
      set({ eventSource: null });
    };
  },

  disconnectStream: () => {
    const eventSource = get().eventSource;
    if (eventSource) {
      eventSource.close();
      set({ eventSource: null, isConnected: false });
    }
  },
}));
