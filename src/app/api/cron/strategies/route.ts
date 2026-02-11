import { logStrategyEvent, runStrategy } from '@/lib/strategy/executor';
import { supabaseAdmin } from '@/lib/supabase';
import type { Strategy, StrategyResult } from '@/lib/types/strategy';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * Vercel Cron Job: /api/cron/strategies
 * Runs every minute to execute active strategies
 *
 * To configure, add to vercel.json:
 * {
 *   "crons": [
 *     { "path": "/api/cron/strategies", "schedule": "* * * * *" }
 *   ]
 * }
 */

// Verify cron request is from Vercel
function verifyCronRequest(request: NextRequest): boolean {
  // In production, verify CRON_SECRET
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // In development, allow all requests
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  // In production, verify the secret
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  // Also accept Vercel's cron requests
  const vercelCron = request.headers.get('x-vercel-cron');
  if (vercelCron) {
    return true;
  }

  return false;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  // Verify cron authorization
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch all running strategies
    const { data: strategies, error } = await supabaseAdmin
      .from('strategies')
      .select('*')
      .eq('status', 'running');

    if (error) {
      console.error('Failed to fetch running strategies:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!strategies || strategies.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No running strategies',
        processed: 0,
        duration: Date.now() - startTime,
      });
    }

    console.log(`Processing ${strategies.length} running strategies`);

    // Process each strategy
    const results: Array<{
      strategyId: string;
      name: string;
      signal: string;
      success: boolean;
      error?: string;
    }> = [];

    for (const strategy of strategies as Strategy[]) {
      try {
        const result: StrategyResult = await runStrategy(strategy);

        results.push({
          strategyId: strategy.id,
          name: strategy.name,
          signal: result.signal,
          success: true,
        });

        // If there's a signal and a portfolio, execute the trade
        if (result.signal !== 'hold' && strategy.portfolio_id) {
          await executeTrade(strategy, result);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`Strategy ${strategy.id} failed:`, errorMessage);

        results.push({
          strategyId: strategy.id,
          name: strategy.name,
          signal: 'error',
          success: false,
          error: errorMessage,
        });

        // Log error but don't stop processing other strategies
        await logStrategyEvent(strategy.id, 'error', `Cron execution failed: ${errorMessage}`);
      }
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      processed: strategies.length,
      results,
      duration,
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: 'Cron job failed', message: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

/**
 * Execute a trade based on strategy signal
 */
async function executeTrade(strategy: Strategy, result: StrategyResult): Promise<void> {
  if (!strategy.portfolio_id) return;

  try {
    // Get portfolio
    const { data: portfolio } = await supabaseAdmin
      .from('portfolios')
      .select('*')
      .eq('id', strategy.portfolio_id)
      .single();

    if (!portfolio) {
      await logStrategyEvent(strategy.id, 'error', 'Portfolio not found');
      return;
    }

    // Get current price from latest candle
    const { data: latestCandle } = await supabaseAdmin
      .from('market_data')
      .select('close')
      .eq('asset', strategy.asset)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (!latestCandle) {
      await logStrategyEvent(strategy.id, 'error', 'Could not get current price');
      return;
    }

    const currentPrice = Number.parseFloat(latestCandle.close);
    const amount = result.amount || 0.001; // Default small amount for paper trading
    const total = currentPrice * amount;

    // Create trade
    const { data: trade, error: tradeError } = await supabaseAdmin
      .from('trades')
      .insert({
        user_id: portfolio.user_id,
        portfolio_id: strategy.portfolio_id,
        asset: strategy.asset,
        type: result.signal,
        quantity: amount,
        price: currentPrice,
        total,
        mode: portfolio.mode,
        status: 'completed',
        broker: portfolio.broker,
      })
      .select()
      .single();

    if (tradeError) {
      await logStrategyEvent(strategy.id, 'error', `Trade execution failed: ${tradeError.message}`);
      return;
    }

    // Update strategy last_signal_at
    await supabaseAdmin
      .from('strategies')
      .update({ last_signal_at: new Date().toISOString() })
      .eq('id', strategy.id);

    // Log trade
    await logStrategyEvent(
      strategy.id,
      'trade',
      `Executed ${result.signal.toUpperCase()} ${amount} ${strategy.asset.toUpperCase()} @ $${currentPrice.toFixed(2)}`,
      {
        tradeId: trade.id,
        signal: result.signal,
        amount,
        price: currentPrice,
        total,
        reason: result.reason,
      },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await logStrategyEvent(strategy.id, 'error', `Trade execution error: ${errorMessage}`);
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}
