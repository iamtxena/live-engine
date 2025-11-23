# Live Engine Project Guidelines

## State Management - CRITICAL RULES

### DO NOT USE useEffect

**IMPORTANT**: This project uses modern state management patterns. `useEffect` should be avoided in almost all cases.

### Use TanStack Query for Server State

For any data fetching, server state, or API calls:

```typescript
// ✅ CORRECT - Use TanStack Query
import { useQuery, useMutation } from '@tanstack/react-query';

const { data, isLoading } = useQuery({
  queryKey: ['key'],
  queryFn: async () => fetch('/api/endpoint').then(res => res.json()),
  refetchInterval: 10000,
});

const mutation = useMutation({
  mutationFn: async (data) => fetch('/api/endpoint', { method: 'POST', body: JSON.stringify(data) }),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['key'] }),
});
```

```typescript
// ❌ WRONG - Do not use useEffect for data fetching
useEffect(() => {
  fetch('/api/endpoint').then(/* ... */);
}, []);
```

### Use Zustand for Client State

For any real-time data, WebSocket/SSE streams, or client state:

```typescript
// ✅ CORRECT - Use Zustand store
import { create } from 'zustand';

export const useMarketStore = create((set) => ({
  tickers: new Map(),
  isConnected: false,
  connectStream: (assets) => { /* ... */ },
}));
```

### When useEffect IS Acceptable

useEffect is ONLY acceptable in these rare cases:

1. **Third-party library integration** where the library requires DOM manipulation or imperative API:
   ```typescript
   // ✅ OK - Chart library requires DOM ref
   useEffect(() => {
     const chart = createChart(containerRef.current, options);
     return () => chart.remove();
   }, []);
   ```

2. **Browser API subscriptions** that can't be managed by Zustand:
   ```typescript
   // ✅ OK - Listening to browser events
   useEffect(() => {
     const handleResize = () => { /* ... */ };
     window.addEventListener('resize', handleResize);
     return () => window.removeEventListener('resize', handleResize);
   }, []);
   ```

**If you're tempted to use useEffect**, ask yourself:
- Can this be handled by TanStack Query? (API calls, polling)
- Can this be handled by Zustand? (State management, real-time data)
- Can this be computed during render? (Derived values)

## Code Style

### Imports
- **ALWAYS** place all imports at the top of the file
- **NEVER** create imports in the middle of the code

```typescript
// ✅ CORRECT
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';

export function Component() {
  // component code
}
```

```typescript
// ❌ WRONG
export function Component() {
  import { something } from 'somewhere'; // NEVER DO THIS
}
```

## Architecture

### State Management Stack
- **TanStack Query v5**: All server state, data fetching, caching
- **Zustand v5**: Client state, real-time streams (WebSocket/SSE)
- **No Redux, No MobX, No useReducer** - Use the tools above

### API Routes
- Located in `/src/app/api/`
- Use Next.js 16 App Router conventions
- All routes are authenticated with Clerk

### Database
- Supabase (PostgreSQL)
- Schemas in `supabase/migrations/`
- Server-side access only via `supabaseAdmin`

### Real-time Data
- Market data: Binance → Redis → SSE endpoint → Zustand
- Paper trading: API → Supabase → TanStack Query
- Live trading: API → ccxt → Exchange APIs

## Component Patterns

### Data Fetching Component
```typescript
'use client';

import { useQuery } from '@tanstack/react-query';

export function DataComponent() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['data'],
    queryFn: fetchData,
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>{data}</div>;
}
```

### Real-time Component
```typescript
'use client';

import { useMarketStore } from '@/lib/stores/market-store';

export function LiveComponent() {
  const { tickers, isConnected } = useMarketStore();

  return <div>{tickers.get('btcusdt')?.price}</div>;
}
```

## Remember

- **No useEffect** unless absolutely necessary
- **TanStack Query** for server state
- **Zustand** for client state
- **Imports at the top** always
- **Type-safe** everything
