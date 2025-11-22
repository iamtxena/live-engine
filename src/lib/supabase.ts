import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Client for browser-side operations (respects RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for server-side operations (bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Database Types
 *
 * Tables:
 * - users: User profiles and settings
 * - portfolios: User trading portfolios
 * - market_data: Historical tick/1-min market data
 * - trades: Trade history (paper + live)
 * - paper_accounts: Simulated trading accounts
 */

export type MarketData = {
  id: string;
  asset: string; // BTC, ETH, etc.
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  source: 'binance' | 'bybit' | 'kraken' | 'polygon';
  created_at: string;
};

export type Trade = {
  id: string;
  user_id: string;
  portfolio_id: string;
  asset: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  total: number;
  mode: 'paper' | 'live';
  status: 'pending' | 'completed' | 'failed';
  broker: string;
  created_at: string;
};

export type Portfolio = {
  id: string;
  user_id: string;
  name: string;
  balance: number;
  mode: 'paper' | 'live';
  broker: string;
  created_at: string;
  updated_at: string;
};
