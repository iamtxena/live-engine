export type StrategyStatus = 'draft' | 'running' | 'paused' | 'error' | 'archived';
export type LogLevel = 'info' | 'signal' | 'trade' | 'error';

export interface Strategy {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  python_code: string;
  typescript_code: string;
  explanation?: string;
  dependencies: string[];
  conversion_notes?: string;
  asset: string;
  interval: string;
  parameters: Record<string, unknown>;
  status: StrategyStatus;
  last_run_at?: string;
  last_signal_at?: string;
  error_message?: string;
  portfolio_id?: string;
  created_at: string;
  updated_at: string;
}

export interface StrategyLog {
  id: string;
  strategy_id: string;
  level: LogLevel;
  message: string;
  data: Record<string, unknown>;
  created_at: string;
}

export interface CreateStrategyInput {
  name: string;
  description?: string;
  python_code: string;
  typescript_code: string;
  explanation?: string;
  dependencies?: string[];
  conversion_notes?: string;
  asset?: string;
  interval?: string;
  parameters?: Record<string, unknown>;
  portfolio_id?: string;
}

export interface UpdateStrategyInput {
  name?: string;
  description?: string;
  python_code?: string;
  typescript_code?: string;
  asset?: string;
  interval?: string;
  parameters?: Record<string, unknown>;
  status?: StrategyStatus;
  portfolio_id?: string | null;
  error_message?: string | null;
  last_run_at?: string;
  last_signal_at?: string;
}

export interface CandleData {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Position {
  asset: string;
  quantity: number;
  entry_price: number;
  current_price: number;
  pnl: number;
  pnl_percentage: number;
}

export interface StrategyContext {
  candles: CandleData[];
  currentPrice: number;
  position: Position | null;
  parameters: Record<string, unknown>;
}

export type Signal = 'buy' | 'sell' | 'hold';

export interface StrategyResult {
  signal: Signal;
  amount?: number;
  reason?: string;
  indicators?: Record<string, number>;
  takeProfit?: number;
  stopLoss?: number;
}
