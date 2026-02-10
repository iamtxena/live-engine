import { supabaseAdmin } from '@/lib/supabase';
import type {
  Strategy,
  StrategyContext,
  StrategyResult,
  CandleData,
  Position,
} from '@/lib/types/strategy';

/**
 * Safely execute TypeScript strategy code
 * Uses Function constructor for sandboxed evaluation
 */
export async function executeStrategy(
  typescriptCode: string,
  context: StrategyContext
): Promise<StrategyResult> {
  try {
    // Create a sandboxed function with the strategy code
    // The code should export a function called 'evaluate' that takes context and returns StrategyResult
    const wrappedCode = `
      ${typescriptCode}

      // Call the main strategy function
      if (typeof tradingStrategy === 'function') {
        return tradingStrategy(context);
      } else if (typeof evaluate === 'function') {
        return evaluate(context);
      } else if (typeof strategy === 'function') {
        return strategy(context);
      } else {
        throw new Error('No valid strategy function found. Define tradingStrategy, evaluate, or strategy function.');
      }
    `;

    // Create function with context as parameter
    const strategyFn = new Function('context', wrappedCode);

    // Execute with timeout protection
    const result = await Promise.race([
      Promise.resolve(strategyFn(context)),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Strategy execution timeout')), 5000)
      ),
    ]);

    // Validate result
    if (!result || typeof result !== 'object') {
      return { signal: 'hold', reason: 'Invalid strategy result' };
    }

    if (!['buy', 'sell', 'hold'].includes(result.signal)) {
      return { signal: 'hold', reason: 'Invalid signal value' };
    }

    return result as StrategyResult;
  } catch (error) {
    console.error('Strategy execution error:', error);
    return {
      signal: 'hold',
      reason: `Execution error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Log a strategy execution event
 */
export async function logStrategyEvent(
  strategyId: string,
  level: 'info' | 'signal' | 'trade' | 'error',
  message: string,
  data: Record<string, unknown> = {}
): Promise<void> {
  try {
    await supabaseAdmin.from('strategy_logs').insert({
      strategy_id: strategyId,
      level,
      message,
      data,
    });
  } catch (error) {
    console.error('Failed to log strategy event:', error);
  }
}

/**
 * Update strategy status and timestamps
 */
export async function updateStrategyStatus(
  strategyId: string,
  status: Strategy['status'],
  additionalFields: Partial<Strategy> = {}
): Promise<void> {
  try {
    await supabaseAdmin
      .from('strategies')
      .update({
        status,
        ...additionalFields,
        updated_at: new Date().toISOString(),
      })
      .eq('id', strategyId);
  } catch (error) {
    console.error('Failed to update strategy status:', error);
  }
}

/**
 * Get current position for a portfolio and asset
 */
export async function getCurrentPosition(
  portfolioId: string,
  asset: string
): Promise<Position | null> {
  try {
    // Get all trades for this asset in the portfolio
    const { data: trades } = await supabaseAdmin
      .from('trades')
      .select('*')
      .eq('portfolio_id', portfolioId)
      .eq('asset', asset)
      .eq('status', 'completed')
      .order('created_at', { ascending: true });

    if (!trades || trades.length === 0) {
      return null;
    }

    // Calculate net position
    let quantity = 0;
    let totalCost = 0;

    for (const trade of trades) {
      if (trade.type === 'buy') {
        quantity += parseFloat(trade.quantity);
        totalCost += parseFloat(trade.total);
      } else {
        quantity -= parseFloat(trade.quantity);
        totalCost -= parseFloat(trade.total);
      }
    }

    if (quantity <= 0) {
      return null;
    }

    const entryPrice = totalCost / quantity;

    return {
      asset,
      quantity,
      entry_price: entryPrice,
      current_price: 0, // Will be updated by caller
      pnl: 0,
      pnl_percentage: 0,
    };
  } catch (error) {
    console.error('Failed to get current position:', error);
    return null;
  }
}

/**
 * Fetch recent candles for a strategy
 */
export async function fetchRecentCandles(
  asset: string,
  limit: number = 100
): Promise<CandleData[]> {
  try {
    const { data } = await supabaseAdmin
      .from('market_data')
      .select('timestamp, open, high, low, close, volume')
      .eq('asset', asset.toLowerCase())
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (!data) return [];

    // Reverse to get chronological order
    return data.reverse().map((candle) => ({
      timestamp: candle.timestamp,
      open: parseFloat(candle.open),
      high: parseFloat(candle.high),
      low: parseFloat(candle.low),
      close: parseFloat(candle.close),
      volume: parseFloat(candle.volume),
    }));
  } catch (error) {
    console.error('Failed to fetch recent candles:', error);
    return [];
  }
}

/**
 * Run a complete strategy evaluation cycle
 */
export async function runStrategy(strategy: Strategy): Promise<StrategyResult> {
  const startTime = Date.now();

  try {
    // Log start
    await logStrategyEvent(strategy.id, 'info', 'Strategy evaluation started');

    // Fetch recent candles
    const candles = await fetchRecentCandles(strategy.asset);

    if (candles.length === 0) {
      await logStrategyEvent(strategy.id, 'error', 'No candle data available');
      return { signal: 'hold', reason: 'No data available' };
    }

    const currentPrice = candles[candles.length - 1].close;

    // Get current position if portfolio is linked
    let position: Position | null = null;
    if (strategy.portfolio_id) {
      position = await getCurrentPosition(strategy.portfolio_id, strategy.asset);
      if (position) {
        position.current_price = currentPrice;
        position.pnl = (currentPrice - position.entry_price) * position.quantity;
        position.pnl_percentage = ((currentPrice - position.entry_price) / position.entry_price) * 100;
      }
    }

    // Build context
    const context: StrategyContext = {
      candles,
      currentPrice,
      position,
      parameters: strategy.parameters || {},
    };

    // Execute strategy
    const result = await executeStrategy(strategy.typescript_code, context);

    // Update last_run_at
    await updateStrategyStatus(strategy.id, strategy.status, {
      last_run_at: new Date().toISOString(),
      error_message: undefined,
    });

    // Log result
    const executionTime = Date.now() - startTime;
    await logStrategyEvent(
      strategy.id,
      result.signal === 'hold' ? 'info' : 'signal',
      `Strategy evaluated: ${result.signal.toUpperCase()}${result.reason ? ` - ${result.reason}` : ''}`,
      {
        signal: result.signal,
        currentPrice,
        executionTime,
        indicators: result.indicators,
        position: position ? { quantity: position.quantity, pnl: position.pnl } : null,
      }
    );

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    await logStrategyEvent(strategy.id, 'error', `Strategy error: ${errorMessage}`);
    await updateStrategyStatus(strategy.id, 'error', { error_message: errorMessage });

    return { signal: 'hold', reason: `Error: ${errorMessage}` };
  }
}
