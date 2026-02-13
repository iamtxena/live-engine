import { supabaseAdmin } from '@/lib/supabase';
import type {
  CandleData,
  Position,
  Strategy,
  StrategyContext,
  StrategyResult,
} from '@/lib/types/strategy';

type TypeScriptModule = typeof import('typescript');

let typeScriptModulePromise: Promise<TypeScriptModule> | null = null;

/**
 * Lazily load TypeScript only when executing strategies.
 * This keeps startup lighter while allowing robust TS -> JS transpilation.
 */
async function loadTypeScriptModule(): Promise<TypeScriptModule> {
  if (!typeScriptModulePromise) {
    typeScriptModulePromise = import('typescript')
      .then((mod) => mod.default ?? mod)
      .catch((error) => {
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(
          `TypeScript runtime dependency is required for strategy transpilation. Ensure "typescript" is installed in production dependencies. Original error: ${detail}`,
        );
      });
  }
  return typeScriptModulePromise;
}

/**
 * Transpile generated TypeScript to JavaScript before executing in Function().
 * This prevents parse errors like "Unexpected identifier 'Exchange'" caused by
 * type annotations/interfaces emitted by AI conversion.
 */
async function transpileForExecution(code: string): Promise<string> {
  const ts = await loadTypeScriptModule();

  const transpileResult = ts.transpileModule(code, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ES2020,
      strict: false,
      removeComments: false,
      sourceMap: false,
      inlineSourceMap: false,
    },
    reportDiagnostics: true,
  });

  const diagnostics = transpileResult.diagnostics?.filter(
    (d) => d.category === ts.DiagnosticCategory.Error,
  );
  if (diagnostics && diagnostics.length > 0) {
    const message = diagnostics
      .slice(0, 3)
      .map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'))
      .join('; ');
    throw new Error(`TypeScript transpilation failed: ${message}`);
  }

  return transpileResult.outputText;
}

/**
 * Strip import/export statements from generated code so it can run inside new Function().
 * The Function constructor has no module context, so ES module syntax causes:
 * "Cannot use import statement outside a module"
 */
function sanitizeForExecution(code: string): string {
  return code
    .split('\n')
    .map((line) => {
      const trimmed = line.trimStart();
      // Remove import statements: import ... from '...'; import '...';
      if (trimmed.startsWith('import ')) return `// [stripped] ${line}`;
      // Convert "export function" / "export async function" / "export class" to plain declarations
      if (trimmed.startsWith('export function '))
        return line.replace('export function ', 'function ');
      if (trimmed.startsWith('export async function '))
        return line.replace('export async function ', 'async function ');
      if (trimmed.startsWith('export class ')) return line.replace('export class ', 'class ');
      if (trimmed.startsWith('export const ')) return line.replace('export const ', 'const ');
      if (trimmed.startsWith('export let ')) return line.replace('export let ', 'let ');
      // Remove "export default" prefix
      if (trimmed.startsWith('export default ')) return line.replace('export default ', '');
      // Remove bare "export { ... }" re-exports
      if (/^export\s*\{/.test(trimmed)) return `// [stripped] ${line}`;
      return line;
    })
    .join('\n');
}

/**
 * Safely execute TypeScript strategy code
 * Uses Function constructor for sandboxed evaluation
 */
export async function executeStrategy(
  typescriptCode: string,
  context: StrategyContext,
): Promise<StrategyResult> {
  try {
    // Transpile first, then strip any module syntax injected by transpilation.
    const transpiledCode = await transpileForExecution(typescriptCode);
    const executableCode = sanitizeForExecution(transpiledCode);

    // Create a sandboxed function with the strategy code
    const wrappedCode = `
      ${executableCode}

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
        setTimeout(() => reject(new Error('Strategy execution timeout')), 5000),
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
  data: Record<string, unknown> = {},
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
  additionalFields: Partial<Strategy> = {},
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
  asset: string,
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
        quantity += Number.parseFloat(trade.quantity);
        totalCost += Number.parseFloat(trade.total);
      } else {
        quantity -= Number.parseFloat(trade.quantity);
        totalCost -= Number.parseFloat(trade.total);
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
export async function fetchRecentCandles(asset: string, limit = 100): Promise<CandleData[]> {
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
      open: Number.parseFloat(candle.open),
      high: Number.parseFloat(candle.high),
      low: Number.parseFloat(candle.low),
      close: Number.parseFloat(candle.close),
      volume: Number.parseFloat(candle.volume),
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
        position.pnl_percentage =
          ((currentPrice - position.entry_price) / position.entry_price) * 100;
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
      },
    );

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    await logStrategyEvent(strategy.id, 'error', `Strategy error: ${errorMessage}`);
    await updateStrategyStatus(strategy.id, 'error', { error_message: errorMessage });

    return { signal: 'hold', reason: `Error: ${errorMessage}` };
  }
}
