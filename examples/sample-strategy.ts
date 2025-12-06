import * as ccxt from 'ccxt';
import { SMA } from 'technicalindicators';

interface StrategyParams {
  sma_short: number;
  sma_long: number;
  size: number;
}

class SmaCrossStrategy {
  private params: StrategyParams = {
    sma_short: 10,
    sma_long: 30,
    size: 0.1
  };

  constructor(
    private exchange: ccxt.Exchange,
    private symbol: string,
    private timeframe: string = '1h'
  ) {}

  async checkAndTrade(): Promise<void> {
    try {
      // Fetch enough bars for indicators + extra for crossover detection
      const limit = this.params.sma_long + 10;
      const bars: number[][] = await this.exchange.fetchOHLCV(this.symbol, this.timeframe, undefined, limit);

      if (bars.length < this.params.sma_long + 1) {
        throw new Error('Insufficient historical data for indicators');
      }

      const closes: number[] = bars.map((bar: number[]) => bar[4]);

      const smaShorts = SMA.calculate({ period: this.params.sma_short, values: closes });
      const smaLongs = SMA.calculate({ period: this.params.sma_long, values: closes });

      // Ensure we have at least two SMA values
      if (smaShorts.length < 2 || smaLongs.length < 2) {
        return; // Not ready for crossover detection
      }

      const prevSmaShort = smaShorts[smaShorts.length - 2];
      const currentSmaShort = smaShorts[smaShorts.length - 1];
      const prevSmaLong = smaLongs[smaLongs.length - 2];
      const currentSmaLong = smaLongs[smaLongs.length - 1];

      let crossover = 0;
      if (prevSmaShort <= prevSmaLong && currentSmaShort > currentSmaLong) {
        crossover = 1;
      } else if (prevSmaShort >= prevSmaLong && currentSmaShort < currentSmaLong) {
        crossover = -1;
      }

      // Fetch positions (assumes futures/derivatives trading)
      const positions: any[] = await this.exchange.fetchPositions([this.symbol]);
      const position = positions.find((p: any) => p.symbol === this.symbol) || { contracts: 0 };
      const hasPosition = Math.abs(position.contracts || 0) > 0;

      // Strategy is long-only with fixed size
      if (!hasPosition) {
        if (crossover > 0) {
          await this.exchange.createMarketBuyOrder(this.symbol, this.params.size);
          console.log(`Buy order placed for ${this.params.size} ${this.symbol}`);
        }
      } else if ((position.contracts || 0) > 0 && crossover < 0) {
        await this.exchange.createMarketSellOrder(this.symbol, this.params.size);
        console.log(`Sell order placed for ${this.params.size} ${this.symbol}`);
      }
    } catch (error) {
      console.error('Error in checkAndTrade:', error);
      // Re-throw if critical, or handle silently
      throw error;
    }
  }
}

// Example usage in a Next.js API route (e.g., pages/api/trade.ts or app/api/trade/route.ts)
// import { SmaCrossStrategy } from '@/lib/strategy';
//
// export async function POST() {
//   const exchange = new ccxt.binance({
//     apiKey: process.env.BINANCE_API_KEY,
//     secret: process.env.BINANCE_SECRET,
//     sandbox: process.env.NODE_ENV === 'development', // Use testnet in dev
//     enableRateLimit: true,
//   });
//   await exchange.loadMarkets();
//
//   const strategy = new SmaCrossStrategy(exchange, 'BTC/USDT', '1h');
//   await strategy.checkAndTrade();
//
//   return new Response(JSON.stringify({ message: 'Strategy executed' }), { status: 200 });
// }