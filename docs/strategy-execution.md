# Strategy Execution Infrastructure

This document describes the algo trading infrastructure, execution flow, and options for real-time execution.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  /convert          →  Create strategy (Python → TypeScript)          │
│  /strategies       →  View all strategies                            │
│  /strategies/[id]  →  Monitor, edit, start/stop strategy             │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         SUPABASE                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  strategies        →  Strategy definitions, code, status             │
│  strategy_logs     →  Execution logs, signals, trades                │
│  market_data       →  Historical OHLCV candles                       │
│  trades            →  Executed trades                                │
│  portfolios        →  User portfolios (paper/live)                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    VERCEL CRON JOB                                   │
│               /api/cron/strategies (every 1 min)                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. Fetch all strategies with status = 'running'                     │
│  2. For each strategy:                                               │
│     a. Fetch recent candles from market_data                         │
│     b. Build execution context (candles, price, position)            │
│     c. Execute TypeScript strategy code (sandboxed)                  │
│     d. If signal (buy/sell) → create trade in database               │
│     e. Log execution result to strategy_logs                         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Execution Flow

### 1. Strategy Creation

```
User pastes Python code → AI converts to TypeScript → User saves strategy
```

The conversion happens in `/api/convert`:
- Grok AI converts Python trading logic to TypeScript
- Validates the generated code
- Generates plain English explanation

### 2. Strategy Configuration

In the strategy detail page, users configure:
- **Asset**: BTCUSDT, ETHUSDT, etc.
- **Interval**: 1m, 5m, 15m, 1h, 4h, 1d
- **Portfolio**: Link to paper/live portfolio for trade execution
- **Parameters**: Custom strategy parameters (JSON)

### 3. Strategy Execution

When a strategy is started (`status = 'running'`):

1. **Vercel Cron** triggers `/api/cron/strategies` every minute
2. The cron job fetches all running strategies
3. For each strategy, the **executor** (`src/lib/strategy/executor.ts`):
   - Loads recent candles from `market_data` table
   - Builds context with current price and position
   - Evaluates TypeScript code in a sandboxed environment
   - Returns signal: `buy`, `sell`, or `hold`

4. If there's a trading signal and a linked portfolio:
   - Creates a trade record in the `trades` table
   - Updates `last_signal_at` timestamp
   - Logs the trade to `strategy_logs`

### 4. Monitoring

The Monitor tab in `/strategies/[id]` shows:
- Current status (running/paused/error)
- Last run and last signal timestamps
- Real-time execution logs (polls every 5 seconds)
- Error messages if strategy fails

## Database Schema

### strategies

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | TEXT | Clerk user ID |
| name | TEXT | Strategy name |
| python_code | TEXT | Original Python code |
| typescript_code | TEXT | Converted TypeScript |
| asset | TEXT | Trading pair (btcusdt) |
| interval | TEXT | Candle interval (1m, 1h) |
| status | TEXT | draft/running/paused/error/archived |
| portfolio_id | UUID | Linked portfolio for trading |
| last_run_at | TIMESTAMPTZ | Last execution time |
| last_signal_at | TIMESTAMPTZ | Last buy/sell signal |
| error_message | TEXT | Error if status = 'error' |

### strategy_logs

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| strategy_id | UUID | Foreign key to strategies |
| level | TEXT | info/signal/trade/error |
| message | TEXT | Log message |
| data | JSONB | Additional data (price, indicators) |
| created_at | TIMESTAMPTZ | Timestamp |

## Strategy Code Requirements

The TypeScript strategy code must define one of these functions:

```typescript
// Option 1
function tradingStrategy(context: StrategyContext): StrategyResult

// Option 2
function evaluate(context: StrategyContext): StrategyResult

// Option 3
function strategy(context: StrategyContext): StrategyResult
```

### StrategyContext

```typescript
interface StrategyContext {
  candles: CandleData[];      // Recent OHLCV candles (oldest first)
  currentPrice: number;        // Latest close price
  position: Position | null;   // Current position if any
  parameters: Record<string, unknown>;  // Custom parameters
}
```

### StrategyResult

```typescript
interface StrategyResult {
  signal: 'buy' | 'sell' | 'hold';
  amount?: number;             // Trade size (default: 0.001)
  reason?: string;             // Why this signal
  indicators?: Record<string, number>;  // Indicator values for logging
}
```

### Example Strategy

```typescript
function tradingStrategy(context) {
  const { candles, currentPrice, position, parameters } = context;

  // Calculate SMA
  const period = parameters.period || 20;
  const closes = candles.slice(-period).map(c => c.close);
  const sma = closes.reduce((a, b) => a + b, 0) / closes.length;

  // Generate signal
  if (currentPrice > sma && !position) {
    return { signal: 'buy', reason: 'Price above SMA', indicators: { sma } };
  }

  if (currentPrice < sma && position) {
    return { signal: 'sell', reason: 'Price below SMA', indicators: { sma } };
  }

  return { signal: 'hold', indicators: { sma } };
}
```

---

## Real-Time Execution Options

The current implementation uses **Vercel Cron** with 1-minute intervals. Here are options for faster execution:

### Option 1: Vercel Cron (Current)

**Interval:** 1 minute minimum
**Cost:** Free on Vercel Pro
**Pros:** Simple, serverless, no infrastructure
**Cons:** 1-minute minimum interval

```json
// vercel.json
{
  "crons": [
    { "path": "/api/cron/strategies", "schedule": "* * * * *" }
  ]
}
```

### Option 2: WebSocket + Server-Side Execution

**Interval:** Real-time (sub-second)
**Complexity:** Medium
**Infrastructure:** Long-running server or edge function

```
Binance WebSocket → Server → Strategy Evaluation → Trade
```

Implementation:
1. Connect to Binance WebSocket stream
2. On each tick, evaluate running strategies
3. Execute trades immediately

**Challenges:**
- Vercel functions timeout after 10-60 seconds
- Need persistent connection (not serverless-friendly)
- Consider: Railway, Fly.io, or dedicated VPS

### Option 3: Edge Functions with Durable Objects (Cloudflare)

**Interval:** Sub-second
**Cost:** Pay per request
**Pros:** Global edge execution, persistent state

Cloudflare Durable Objects can maintain WebSocket connections and state.

### Option 4: AWS Lambda + EventBridge

**Interval:** 1 minute (or sub-minute with Step Functions)
**Cost:** Pay per invocation
**Pros:** Scalable, reliable

```
EventBridge (1 min) → Lambda → Evaluate strategies → Execute trades
```

For sub-minute, use Step Functions with Wait states.

### Option 5: Dedicated Trading Bot Server

**Interval:** Real-time
**Cost:** ~$5-20/month (VPS)
**Pros:** Full control, real-time execution

Run a Node.js process on:
- Railway ($5/month)
- Fly.io (free tier available)
- DigitalOcean Droplet ($6/month)
- AWS EC2 t3.micro

```typescript
// bot.ts - runs continuously
import { WebSocket } from 'ws';

const ws = new WebSocket('wss://stream.binance.com/ws/btcusdt@kline_1m');

ws.on('message', async (data) => {
  const candle = JSON.parse(data);

  // Fetch running strategies from Supabase
  const strategies = await fetchRunningStrategies();

  for (const strategy of strategies) {
    const result = await executeStrategy(strategy, candle);
    if (result.signal !== 'hold') {
      await executeTrade(strategy, result);
    }
  }
});
```

### Option 6: Exchange Native Features

**Interval:** Real-time (exchange-side)
**Cost:** Free
**Pros:** No server needed, 24/7 execution

Use exchange APIs for:
- **Conditional Orders:** Binance OCO, Bybit conditional orders
- **Take Profit / Stop Loss:** Set at order time
- **Trailing Stop:** Automatic price following

The cron job places orders with TP/SL, and the exchange monitors them 24/7.

```typescript
// When signal is BUY, place order with TP/SL
await exchange.createOrder('BTC/USDT', 'limit', 'buy', amount, price, {
  takeProfit: price * 1.02,  // +2%
  stopLoss: price * 0.98,    // -2%
});
```

### Recommendation by Use Case

| Use Case | Recommended Option |
|----------|-------------------|
| Paper trading, testing | Vercel Cron (current) |
| Swing trading (hours/days) | Vercel Cron (current) |
| Day trading (minutes) | Dedicated server + WebSocket |
| Scalping (seconds) | Dedicated server + exchange conditional orders |
| HFT (milliseconds) | Co-located servers (out of scope) |

## Environment Variables

Required for cron execution:

```env
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Optional: Cron authentication
CRON_SECRET=your-secret-here
```

Set `CRON_SECRET` in Vercel and pass it in the Authorization header for manual cron triggers.

## Monitoring & Debugging

### View Logs

1. **UI:** Go to `/strategies/[id]` → Monitor tab
2. **Supabase:** Query `strategy_logs` table directly
3. **Vercel:** Check function logs for `/api/cron/strategies`

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Strategy not running | Status not 'running' | Click Start button |
| No signals generated | Strategy returning 'hold' | Check strategy logic |
| Trades not executing | No portfolio linked | Link portfolio in Settings |
| Error status | Code threw exception | Check error_message field |
| No candle data | market_data empty | Download data in /data page |

### Manual Trigger

Test the cron job manually:

```bash
# Local
curl -X POST http://localhost:3000/api/cron/strategies

# Production (with auth)
curl -X POST https://your-app.vercel.app/api/cron/strategies \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```
