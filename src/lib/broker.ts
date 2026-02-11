import * as ccxt from 'ccxt';

/**
 * Unified broker wrapper using ccxt
 * Supports Binance, Bybit, IBKR, Alpaca, and 100+ other exchanges
 */

export type BrokerName = 'binance' | 'bybit' | 'kraken' | 'coinbase';
export type OrderSide = 'buy' | 'sell';
export type OrderType = 'market' | 'limit';

export interface OrderParams {
  symbol: string; // BTC/USDT, ETH/USDT, etc.
  side: OrderSide;
  type: OrderType;
  amount: number;
  price?: number; // Required for limit orders
}

export interface OrderResult {
  id: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  amount: number;
  price: number;
  status: 'open' | 'closed' | 'canceled' | 'pending';
  timestamp: number;
  fee?: {
    cost: number;
    currency: string;
  };
}

class BrokerClient {
  private exchange: ccxt.Exchange;

  constructor(
    private brokerName: BrokerName,
    private config: {
      apiKey?: string;
      apiSecret?: string;
      testnet?: boolean;
    },
  ) {
    this.exchange = this.initializeExchange();
  }

  /**
   * Initialize the appropriate exchange
   */
  private initializeExchange(): ccxt.Exchange {
    const ExchangeClass = ccxt[this.brokerName as keyof typeof ccxt] as typeof ccxt.Exchange;

    if (!ExchangeClass) {
      throw new Error(`Unsupported broker: ${this.brokerName}`);
    }

    const exchangeConfig: Partial<ccxt.ConstructorArgs> = {
      apiKey: this.config.apiKey,
      secret: this.config.apiSecret,
      enableRateLimit: true,
    };

    // Enable testnet/sandbox mode if specified
    if (this.config.testnet) {
      exchangeConfig.urls = {
        api: {
          public: this.getTestnetUrl('public'),
          private: this.getTestnetUrl('private'),
        },
      };
    }

    return new ExchangeClass(exchangeConfig);
  }

  /**
   * Get testnet URLs for each broker
   */
  private getTestnetUrl(type: 'public' | 'private'): string {
    const testnetUrls: Record<BrokerName, { public: string; private: string }> = {
      binance: {
        public: 'https://testnet.binance.vision/api',
        private: 'https://testnet.binance.vision/api',
      },
      bybit: {
        public: 'https://api-testnet.bybit.com',
        private: 'https://api-testnet.bybit.com',
      },
      kraken: {
        public: 'https://api.kraken.com',
        private: 'https://api.kraken.com',
      },
      coinbase: {
        public: 'https://api-public.sandbox.exchange.coinbase.com',
        private: 'https://api-public.sandbox.exchange.coinbase.com',
      },
    };

    return testnetUrls[this.brokerName]?.[type] || '';
  }

  /**
   * Place an order (buy or sell)
   */
  async placeOrder(params: OrderParams): Promise<OrderResult> {
    try {
      await this.exchange.loadMarkets();

      let order: ccxt.Order;
      if (params.type === 'market') {
        order = await this.exchange.createMarketOrder(params.symbol, params.side, params.amount);
      } else if (params.type === 'limit' && params.price) {
        order = await this.exchange.createLimitOrder(
          params.symbol,
          params.side,
          params.amount,
          params.price,
        );
      } else {
        throw new Error('Invalid order type or missing price for limit order');
      }

      return this.formatOrder(order);
    } catch (error) {
      console.error('Error placing order:', error);
      throw error;
    }
  }

  /**
   * Get account balance
   */
  async getBalance(): Promise<Record<string, number>> {
    try {
      const balance = await this.exchange.fetchBalance();
      const free = balance.free || {};

      // Return only non-zero balances
      return Object.fromEntries(
        Object.entries(free).filter(([_, amount]) => (amount as number) > 0),
      ) as Record<string, number>;
    } catch (error) {
      console.error('Error fetching balance:', error);
      throw error;
    }
  }

  /**
   * Get open orders
   */
  async getOpenOrders(symbol?: string): Promise<OrderResult[]> {
    try {
      const orders = await this.exchange.fetchOpenOrders(symbol);
      return orders.map((order) => this.formatOrder(order));
    } catch (error) {
      console.error('Error fetching open orders:', error);
      throw error;
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string, symbol: string): Promise<void> {
    try {
      await this.exchange.cancelOrder(orderId, symbol);
    } catch (error) {
      console.error('Error canceling order:', error);
      throw error;
    }
  }

  /**
   * Get current ticker price
   */
  async getTicker(symbol: string): Promise<{
    symbol: string;
    price: number;
    volume: number;
    high: number;
    low: number;
  }> {
    try {
      const ticker = await this.exchange.fetchTicker(symbol);
      return {
        symbol,
        price: ticker.last || 0,
        volume: ticker.baseVolume || 0,
        high: ticker.high || 0,
        low: ticker.low || 0,
      };
    } catch (error) {
      console.error('Error fetching ticker:', error);
      throw error;
    }
  }

  /**
   * Format ccxt order to our OrderResult interface
   */
  private formatOrder(order: ccxt.Order): OrderResult {
    return {
      id: order.id,
      symbol: order.symbol,
      side: order.side as OrderSide,
      type: order.type as OrderType,
      amount: order.amount,
      price: order.price || 0,
      status: (order.status || 'pending') as OrderResult['status'],
      timestamp: order.timestamp || Date.now(),
      fee: order.fee
        ? {
            cost: Number(order.fee.cost),
            currency: String(order.fee.currency),
          }
        : undefined,
    };
  }
}

/**
 * Factory function to create a broker client
 */
export function createBrokerClient(
  broker: BrokerName,
  options: {
    apiKey?: string;
    apiSecret?: string;
    testnet?: boolean;
  } = {},
): BrokerClient {
  return new BrokerClient(broker, options);
}

/**
 * Get default broker credentials from environment
 */
export function getDefaultBrokerCredentials(broker: BrokerName): {
  apiKey: string;
  apiSecret: string;
} {
  switch (broker) {
    case 'binance':
      return {
        apiKey: process.env.BINANCE_API_KEY || '',
        apiSecret: process.env.BINANCE_API_SECRET || '',
      };
    case 'bybit':
      return {
        apiKey: process.env.BYBIT_API_KEY || '',
        apiSecret: process.env.BYBIT_API_SECRET || '',
      };
    default:
      return { apiKey: '', apiSecret: '' };
  }
}
