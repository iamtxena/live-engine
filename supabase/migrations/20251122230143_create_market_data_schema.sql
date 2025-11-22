-- Create market_data table for storing historical and real-time market data
CREATE TABLE IF NOT EXISTS market_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  open DECIMAL(20, 8) NOT NULL,
  high DECIMAL(20, 8) NOT NULL,
  low DECIMAL(20, 8) NOT NULL,
  close DECIMAL(20, 8) NOT NULL,
  volume DECIMAL(20, 8) NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('binance', 'bybit', 'kraken', 'polygon')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (asset, timestamp)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_market_data_asset_timestamp ON market_data (asset, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_market_data_source ON market_data (source);

-- Create portfolios table for user trading portfolios
CREATE TABLE IF NOT EXISTS portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  balance DECIMAL(20, 8) NOT NULL DEFAULT 0,
  mode TEXT NOT NULL CHECK (mode IN ('paper', 'live')),
  broker TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for user portfolios
CREATE INDEX IF NOT EXISTS idx_portfolios_user_id ON portfolios (user_id);

-- Create trades table for tracking all trades
CREATE TABLE IF NOT EXISTS trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  asset TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
  quantity DECIMAL(20, 8) NOT NULL,
  price DECIMAL(20, 8) NOT NULL,
  total DECIMAL(20, 8) NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('paper', 'live')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
  broker TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for trades
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades (user_id);
CREATE INDEX IF NOT EXISTS idx_trades_portfolio_id ON trades (portfolio_id);
CREATE INDEX IF NOT EXISTS idx_trades_asset ON trades (asset);
CREATE INDEX IF NOT EXISTS idx_trades_created_at ON trades (created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

-- RLS Policies for portfolios
CREATE POLICY "Users can view their own portfolios"
  ON portfolios FOR SELECT
  USING (auth.uid()::TEXT = user_id);

CREATE POLICY "Users can create their own portfolios"
  ON portfolios FOR INSERT
  WITH CHECK (auth.uid()::TEXT = user_id);

CREATE POLICY "Users can update their own portfolios"
  ON portfolios FOR UPDATE
  USING (auth.uid()::TEXT = user_id);

-- RLS Policies for trades
CREATE POLICY "Users can view their own trades"
  ON trades FOR SELECT
  USING (auth.uid()::TEXT = user_id);

CREATE POLICY "Users can create their own trades"
  ON trades FOR INSERT
  WITH CHECK (auth.uid()::TEXT = user_id);

-- Market data is public read-only
ALTER TABLE market_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Market data is viewable by everyone"
  ON market_data FOR SELECT
  USING (true);

-- Only service role can insert market data
CREATE POLICY "Service role can insert market data"
  ON market_data FOR INSERT
  WITH CHECK (true);
