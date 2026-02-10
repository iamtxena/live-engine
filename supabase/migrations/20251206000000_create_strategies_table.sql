-- Strategies table for storing converted trading strategies
CREATE TABLE IF NOT EXISTS strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,

  -- Source code (both Python and TypeScript)
  python_code TEXT NOT NULL,
  typescript_code TEXT NOT NULL,

  -- AI conversion metadata
  explanation TEXT,
  dependencies JSONB DEFAULT '[]',
  conversion_notes TEXT,

  -- Trading configuration
  asset TEXT NOT NULL DEFAULT 'btcusdt',
  interval TEXT NOT NULL DEFAULT '1m',
  parameters JSONB DEFAULT '{}',

  -- Execution state
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'running', 'paused', 'error', 'archived')),
  last_run_at TIMESTAMPTZ,
  last_signal_at TIMESTAMPTZ,
  error_message TEXT,

  -- Linked portfolio for trading
  portfolio_id UUID REFERENCES portfolios(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Strategy execution logs for monitoring
CREATE TABLE IF NOT EXISTS strategy_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id UUID NOT NULL REFERENCES strategies(id) ON DELETE CASCADE,

  level TEXT NOT NULL DEFAULT 'info'
    CHECK (level IN ('info', 'signal', 'trade', 'error')),
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for strategies
CREATE INDEX IF NOT EXISTS idx_strategies_user_id ON strategies(user_id);
CREATE INDEX IF NOT EXISTS idx_strategies_status ON strategies(status);
CREATE INDEX IF NOT EXISTS idx_strategies_asset ON strategies(asset);

-- Indexes for strategy_logs
CREATE INDEX IF NOT EXISTS idx_strategy_logs_strategy_id ON strategy_logs(strategy_id);
CREATE INDEX IF NOT EXISTS idx_strategy_logs_created_at ON strategy_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_strategy_logs_level ON strategy_logs(level);

-- Enable Row Level Security
ALTER TABLE strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for strategies
CREATE POLICY "Users can view their own strategies"
  ON strategies FOR SELECT
  USING (auth.uid()::TEXT = user_id);

CREATE POLICY "Users can create their own strategies"
  ON strategies FOR INSERT
  WITH CHECK (auth.uid()::TEXT = user_id);

CREATE POLICY "Users can update their own strategies"
  ON strategies FOR UPDATE
  USING (auth.uid()::TEXT = user_id);

CREATE POLICY "Users can delete their own strategies"
  ON strategies FOR DELETE
  USING (auth.uid()::TEXT = user_id);

-- RLS Policies for strategy_logs
CREATE POLICY "Users can view logs for their own strategies"
  ON strategy_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM strategies WHERE id = strategy_id AND user_id = auth.uid()::TEXT
  ));

-- Service role can insert logs (for cron job)
CREATE POLICY "Service role can insert strategy logs"
  ON strategy_logs FOR INSERT
  WITH CHECK (true);

-- Service role can update strategies (for cron job status updates)
CREATE POLICY "Service role can update strategies"
  ON strategies FOR UPDATE
  WITH CHECK (true);
