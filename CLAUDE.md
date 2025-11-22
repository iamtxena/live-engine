# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Live Engine is a universal real-time market data engine and paper/live trading bridge built for integration with Lona.agency. It converts Python trading strategies to TypeScript and executes them across multiple exchanges.

**Core Features:**
- Real-time market data via WebSocket (Binance, Bybit, Kraken)
- Python → TypeScript code conversion using Grok AI
- Paper and live trading via ccxt (100+ exchanges)
- Historical data storage in Supabase
- TradingView lightweight-charts integration
- Full AI observability with LangSmith

**Tech Stack:** Next.js 16 (App Router), TypeScript 5 (strict mode), Tailwind CSS v4, Clerk (auth), Supabase (PostgreSQL), Upstash Redis, xAI Grok, ccxt, LangSmith

## Common Commands

```bash
# Development
pnpm dev              # Run dev server with Turbopack
pnpm build            # Production build
pnpm start            # Run production server
pnpm lint             # ESLint check

# CLI (stub implementation)
pnpm cli              # Show CLI help
pnpm cli start --assets btcusdt ethusdt
pnpm cli download BTC
pnpm cli convert
```

## Architecture

### Directory Structure

```
src/
├── app/
│   ├── (dashboard)/        # Protected dashboard routes
│   │   ├── page.tsx        # Main dashboard
│   │   ├── assets/         # Asset management
│   │   ├── paper/          # Paper trading
│   │   └── live/           # Live trading
│   ├── (marketing)/        # Public marketing pages
│   ├── api/
│   │   ├── convert/        # Python → TypeScript AI conversion
│   │   ├── execute/        # Trade execution
│   │   ├── historical/     # Historical data fetch
│   │   └── websocket/      # WebSocket feed management
│   └── layout.tsx
├── lib/                    # Core business logic
│   ├── binance.ts          # Binance WebSocket + REST API
│   ├── broker.ts           # Unified ccxt broker wrapper
│   ├── ai-convert.ts       # Grok AI Python→TS conversion
│   ├── supabase.ts         # Supabase client & admin
│   ├── redis.ts            # Upstash Redis caching
│   ├── langsmith.ts        # LangSmith tracing
│   └── utils.ts
├── components/
│   ├── charts/             # TradingView chart components
│   ├── trading/            # Trading UI components
│   └── ui/                 # shadcn/ui components
├── hooks/
│   └── use-live-data.ts    # Real-time data hooks
└── cli/                    # Commander-based CLI (stub)
```

### Core Libraries (src/lib/)

#### binance.ts
- `BinanceWebSocketClient`: Manages WebSocket connections to Binance streams
- `getBinanceWSClient()`: Singleton WebSocket instance
- `fetchHistoricalCandles()`: REST API for historical OHLCV data
- Automatically caches ticks in Redis and stores in Supabase
- Supports multiple assets via multi-stream WebSocket format

#### broker.ts
- `BrokerClient`: Unified wrapper around ccxt for 100+ exchanges
- Supports testnet/sandbox mode via `testnet: true` config
- Key methods: `placeOrder()`, `getBalance()`, `getOpenOrders()`, `cancelOrder()`, `getTicker()`
- `createBrokerClient()`: Factory function
- `getDefaultBrokerCredentials()`: Reads API keys from environment

#### ai-convert.ts
- `convertPythonToTypescript()`: Converts Python trading code to TypeScript using Grok 3
- `validateTypescriptCode()`: Validates generated TypeScript with Grok 3 Fast
- `explainStrategy()`: Generates plain English explanation with Grok 3 Mini
- All AI SDK calls wrapped with LangSmith via `wrapAISDK()`
- Uses structured output with Zod schemas

#### supabase.ts
- `supabase`: Client-side Supabase client (respects RLS)
- `supabaseAdmin`: Server-side admin client (bypasses RLS)
- **IMPORTANT:** Always use `supabaseAdmin` for server-side operations (API routes, background jobs)
- Tables: `market_data`, `portfolios`, `trades`

#### redis.ts
- Uses Upstash REST API (not traditional Redis protocol)
- `cacheMarketTick()`: Cache real-time ticker data
- `getCachedMarketTick()`: Retrieve cached tick
- TTL: 60 seconds for market data

#### langsmith.ts
- `flushTraces()`: MUST be called after AI operations in API routes (serverless requirement)
- All AI SDK calls are wrapped with LangSmith for full observability
- Project name: `live-engine`

### API Routes

#### POST /api/convert
Converts Python trading strategies to TypeScript.

**Request:**
```json
{
  "pythonCode": "def strategy()...",
  "context": "Optional context",
  "validate": true,
  "explain": true
}
```

**Response:**
```json
{
  "conversion": {
    "typescript": "// TS code",
    "dependencies": ["ccxt"],
    "notes": "...",
    "intent": "..."
  },
  "validation": { "isValid": true, "issues": [], "suggestions": [] },
  "explanation": "Plain English explanation"
}
```

#### POST /api/historical
Downloads historical OHLCV data from Binance and stores in Supabase.

#### POST /api/websocket
Starts WebSocket feed for specified assets.

#### POST /api/execute
Executes trades via broker (currently recommends /api/convert instead).

### Database Schema (Supabase)

**market_data:**
- Stores OHLCV data from WebSocket feeds
- Indexed on `(asset, timestamp DESC)` and `source`
- Unique constraint on `(asset, timestamp, source)`

**portfolios:**
- User portfolios with RLS enabled
- `mode`: 'paper' | 'live'
- `broker`: exchange name

**trades:**
- Trade history with RLS enabled
- `status`: 'pending' | 'completed' | 'failed'
- Linked to portfolios via `portfolio_id`

## Development Guidelines

### TypeScript
- Strict mode enabled in `tsconfig.json`
- Always define interfaces for data structures
- Avoid `any` types
- Use path alias `@/*` for imports from `src/`

### Next.js Patterns
- Uses App Router with route groups: `(dashboard)`, `(marketing)`
- Server Components by default; mark Client Components with `'use client'`
- Middleware in `src/middleware.ts` for Clerk authentication

### AI SDK with LangSmith
**CRITICAL:** Always wrap AI SDK calls with LangSmith and flush traces in API routes.

```typescript
import { wrapAISDK } from 'langsmith/experimental/vercel';
import * as ai from 'ai';
import { flushTraces } from '@/lib/langsmith';

const { generateText } = wrapAISDK(ai);

// In API route:
const result = await generateText({ ... });
await flushTraces(); // MUST call before returning response
```

### Supabase Usage
- **Server-side (API routes):** Use `supabaseAdmin` to bypass RLS
- **Client-side (components):** Use `supabase` with RLS policies
- RLS policies filter by `auth.jwt() ->> 'sub' = user_id`

### WebSocket Management
- Singleton pattern: Use `getBinanceWSClient()` to get instance
- Auto-reconnect on disconnect (5s interval)
- Heartbeat every 30s to keep connection alive
- Multi-stream format: `stream?streams=btcusdt@ticker/ethusdt@ticker`

### Broker Abstraction
- Always start with testnet: `testnet: true`
- Use `createBrokerClient()` factory function
- Map Python trading libs to ccxt equivalents
- Symbol format: `BTC/USDT` (not `btcusdt`)

### Environment Variables
Required for development:
- **Clerk:** `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
- **Supabase:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- **xAI:** `XAI_API_KEY`
- **Upstash:** `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- **LangSmith:** `LANGCHAIN_TRACING=true`, `LANGCHAIN_API_KEY`, `LANGCHAIN_PROJECT=live-engine`
- **Binance (optional):** `BINANCE_API_KEY`, `BINANCE_API_SECRET`
- **Bybit (optional):** `BYBIT_API_KEY`, `BYBIT_API_SECRET`

See `.env.example` for full list.

### Grok AI Models
- **grok-3:** Python → TypeScript conversion (best quality)
- **grok-3-fast:** TypeScript validation
- **grok-3-mini:** Strategy explanations
- Use low temperature (0.1-0.2) for code generation

### Error Handling
- Wrap all async operations in try-catch blocks
- Log errors to console (visible in Vercel logs)
- Flush LangSmith traces even on error
- Return proper HTTP status codes in API routes

### Testing Strategy
- Start with paper trading and testnet before real funds
- Test Python → TypeScript conversion with sample strategies
- Verify WebSocket connections with `/api/websocket`
- Check LangSmith dashboard for AI trace debugging

## Integration with Lona

Lona sends Python strategies to `/api/convert`, which:
1. Converts Python → TypeScript using Grok AI
2. Validates the generated code
3. Explains the strategy in plain English
4. Returns executable TypeScript ready for broker execution

Example integration:
```typescript
const response = await fetch('https://engine.lona.agency/api/convert', {
  method: 'POST',
  body: JSON.stringify({
    pythonCode: lonaGeneratedStrategy,
    context: 'Strategy context',
    validate: true,
    explain: true,
  }),
});
```

## Important Notes

- Next.js 16 and Tailwind CSS v4 use different config than previous versions
- CLI commands (`pnpm cli`) are stubs; real functionality is in web dashboard
- Always use `supabaseAdmin` for server-side database operations
- WebSocket client runs as singleton; avoid multiple instances
- Flush LangSmith traces in serverless environments (Vercel)
- RLS policies require user authentication for portfolios and trades
- Redis uses Upstash REST API (not traditional Redis protocol)
