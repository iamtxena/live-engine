// interfaces.ts or in the same file
interface Candle {
  timestamp: number;
  symbol: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface IStrategy {
  init(broker: ccxt.Exchange, symbol: string, params?: Partial<HurstParams>): void;
  next(candles: Candle[]): Promise<void>;
}

interface HurstParams {
  P: number;
  envPct: number;
  confirmBars: number;
  minSpaceFrac: number;
  risk_pct: number;
  max_risk_perc: number;
}

// strategy.ts
import * as ccxt from 'ccxt';
import { SMA } from 'technicalindicators';

class HurstCycleBottoms implements IStrategy {
  private params: HurstParams = {
    P: 40,
    envPct: 2.0,
    confirmBars: 1,
    minSpaceFrac: 0.33,
    risk_pct: 0.02,
    max_risk_perc: 0.05,
  };

  private broker: ccxt.Exchange;
  private symbol: string;
  private quoteCurrency: string;

  private closes: number[] = [];
  private lows: number[] = [];
  private ma: number[] = [];
  private lower_env: number[] = [];
  private cross_up: number[] = [];
  private cross_down: number[] = [];

  private pendingOrderId: string | null = null;
  private last_signal_bar: number | null = null;
  private entry_price: number | null = null;
  private stop_loss_price: number | null = null;
  private signal_bar_idx: number | null = null;
  private position_size: number = 0;

  async init(broker: ccxt.Exchange, symbol: string, params?: Partial<HurstParams>): Promise<void> {
    this.broker = broker;
    this.symbol = symbol;
    this.quoteCurrency = symbol.split('/')[1];
    this.params = { ...this.params, ...params };

    // Reset state
    this.closes = [];
    this.lows = [];
    this.ma = [];
    this.lower_env = [];
    this.cross_up = [];
    this.cross_down = [];
    this.pendingOrderId = null;
    this.last_signal_bar = null;
    this.entry_price = null;
    this.stop_loss_price = null;
    this.signal_bar_idx = null;
    this.position_size = 0;
  }

  private computeIndicators(): void {
    const length = this.closes.length;
    this.ma = new Array(length).fill(NaN);
    this.lower_env = new Array(length).fill(NaN);
    this.cross_up = new Array(length).fill(0);
    this.cross_down = new Array(length).fill(0);

    if (length < this.params.P) return;

    const smaInput = {
      period: this.params.P,
      values: [...this.closes],
    };
    const smaValues = SMA.calculate(smaInput);
    const startIndex = length - smaValues.length;

    for (let i = 0; i < smaValues.length; i++) {
      const idx = startIndex + i;
      this.ma[idx] = smaValues[i];
      this.lower_env[idx] = smaValues[i] * (1.0 - this.params.envPct / 100.0);
    }

    for (let i = 1; i < length; i++) {
      const ma_curr = this.ma[i];
      const ma_prev = this.ma[i - 1];
      const close_curr = this.closes[i];
      const close_prev = this.closes[i - 1];

      if (!isNaN(ma_curr) && !isNaN(ma_prev)) {
        // cross_up: close crosses over ma
        if (close_curr > ma_curr && close_prev <= ma_prev) {
          this.cross_up[i] = 1;
        }
        // cross_down: ma crosses over close
        if (ma_curr > close_curr && ma_prev <= close_prev) {
          this.cross_down[i] = 1;
        }
      }
    }
  }

  private async calculate_position_size(stop_loss: number): Promise<number> {
    if (!this.entry_price || stop_loss >= this.entry_price) {
      return 0;
    }

    try {
      const balance = await this.broker.fetchBalance();
      const cash = balance.free[this.quoteCurrency] || 0;
      const risk_amount = cash * this.params.risk_pct;
      let risk_per_unit = this.entry_price - stop_loss;

      if (risk_per_unit <= 0) {
        return 0;
      }

      let size = Math.floor(risk_amount / risk_per_unit);

      const max_distance = this.entry_price * this.params.max_risk_perc;
      if (risk_per_unit > max_distance) {
        size = Math.floor(risk_amount / max_distance);
      }

      if (size <= 0) {
        size = 1;
      }

      return size;
    } catch (error) {
      console.error('Error calculating position size:', error);
      return 0;
    }
  }

  async next(candles: Candle[]): Promise<void> {
    try {
      const length = candles.length;
      if (length < Math.max(this.params.P, this.params.confirmBars + 1)) {
        return;
      }

      // Update history
      this.closes = candles.map(c => c.close);
      this.lows = candles.map(c => c.low);
      this.computeIndicators();

      const current_idx = length - 1;

      // Check pending order first
      if (this.pendingOrderId) {
        try {
          const order = await this.broker.fetchOrder(this.pendingOrderId, this.symbol);
          if (order.status === 'closed' || order.status === 'filled') {
            if (order.side === 'buy') {
              this.entry_price = order.average || this.entry_price!;
              if (this.signal_bar_idx !== null) {
                const prev_idx = this.signal_bar_idx - 1;
                if (prev_idx >= 0) {
                  this.stop_loss_price = Math.min(this.lows[prev_idx], this.lower_env[prev_idx]);
                }
                this.signal_bar_idx = null;
              }
              this.position_size = (order.filled || 0) + this.position_size;
            } else if (order.side === 'sell') {
              this.position_size = 0;
              this.entry_price = null;
              this.stop_loss_price = null;
            }
            this.pendingOrderId = null;
          } else if (order.status === 'canceled' || order.status === 'rejected') {
            if (order.side === 'buy') {
              this.entry_price = null;
              this.stop_loss_price = null;
              this.signal_bar_idx = null;
            } else if (order.side === 'sell') {
              // Position may still exist, but for simplicity, do not reset position_size
              // In production, fetch current position
            }
            this.pendingOrderId = null;
          }
          // If still pending, skip logic
          if (this.pendingOrderId) {
            return;
          }
        } catch (fetchError) {
          console.error('Error fetching order status:', fetchError);
          // Continue, but may skip if assuming pending
          return;
        }
      }

      // Current position size (tracked)
      const pos_size = this.position_size;

      // Signal conditions
      const current_low = this.lows[current_idx];
      const current_lower = this.lower_env[current_idx];
      const dipped = !isNaN(current_lower) && current_low <= current_lower * 1.005;

      let cross_up_confirmed: boolean;
      if (this.params.confirmBars === 0) {
        cross_up_confirmed = this.cross_up[current_idx] > 0;
      } else {
        const confirm_idx = current_idx - this.params.confirmBars;
        cross_up_confirmed = confirm_idx >= 0 && this.cross_up[confirm_idx] > 0;
      }

      const min_bars_between = Math.max(1, Math.round(this.params.P * this.params.minSpaceFrac));
      const spacing_ok = this.last_signal_bar === null || (current_idx - this.last_signal_bar > min_bars_between);

      const bottom_signal = dipped && cross_up_confirmed && spacing_ok;

      // Entry logic
      if (pos_size === 0 && bottom_signal) {
        this.entry_price = this.closes[current_idx];
        const temp_sl = this.lower_env[current_idx];
        const size = await this.calculate_position_size(temp_sl);

        if (size > 0) {
          try {
            const order = await this.broker.createMarketBuyOrder(this.symbol, size);
            this.pendingOrderId = order.id;
            this.last_signal_bar = current_idx;
            this.signal_bar_idx = current_idx;
          } catch (orderError) {
            console.error('Error placing buy order:', orderError);
            this.entry_price = null;
          }
        }
      }
      // Exit logic
      else if (pos_size > 0) {
        const should_exit = this.cross_down[current_idx] > 0 || (this.stop_loss_price && this.closes[current_idx] <= this.stop_loss_price);
        if (should_exit) {
          try {
            const order = await this.broker.createMarketSellOrder(this.symbol, pos_size);
            this.pendingOrderId = order.id;
          } catch (orderError) {
            console.error('Error placing sell order:', orderError);
          }
        }
      }

      // Reset if no position
      if (pos_size === 0 && !this.pendingOrderId) {
        this.entry_price = null;
        this.stop_loss_price = null;
      }
    } catch (error) {
      console.error('Error in strategy next:', error);
    }
  }
}

export { HurstCycleBottoms, IStrategy, Candle, HurstParams };