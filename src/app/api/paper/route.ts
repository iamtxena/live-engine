import { getCachedMarketTick } from '@/lib/redis';
import { getAuthUserId } from '@/lib/service-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { type NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface PaperTrade {
  asset: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit';
  amount: number;
  price?: number;
}

interface Position {
  asset: string;
  amount: number;
  avgPrice: number;
  unrealizedPnl: number;
  currentPrice: number;
}

/**
 * GET /api/paper
 * Get paper trading portfolio and positions
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthUserId(request);

    const { searchParams } = new URL(request.url);
    const portfolioId = searchParams.get('portfolioId');

    if (!portfolioId) {
      const { data: portfolios, error } = await supabaseAdmin
        .from('portfolios')
        .select('*')
        .eq('user_id', userId)
        .eq('mode', 'paper');

      if (error) throw error;

      return NextResponse.json({ portfolios: portfolios || [] });
    }

    const { data: portfolio, error: portfolioError } = await supabaseAdmin
      .from('portfolios')
      .select('*')
      .eq('id', portfolioId)
      .eq('user_id', userId)
      .single();

    if (portfolioError) throw portfolioError;

    const { data: trades, error: tradesError } = await supabaseAdmin
      .from('trades')
      .select('*')
      .eq('portfolio_id', portfolioId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (tradesError) throw tradesError;

    const positions = await calculatePositions(trades || []);

    const totalValue = await calculatePortfolioValue(portfolio.balance, positions);

    return NextResponse.json({
      portfolio: {
        ...portfolio,
        totalValue,
        pnl: totalValue - portfolio.initial_balance,
        pnlPercent: ((totalValue - portfolio.initial_balance) / portfolio.initial_balance) * 100,
      },
      positions,
      trades: trades || [],
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Paper trading GET error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch paper trading data',
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/paper
 * Execute a paper trade or create a new portfolio
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthUserId(request);

    const body = await request.json();
    const { action, portfolioId, trade, initialBalance } = body as {
      action: 'create_portfolio' | 'execute_trade';
      portfolioId?: string;
      trade?: PaperTrade;
      initialBalance?: number;
    };

    if (action === 'create_portfolio') {
      const { data: portfolio, error } = await supabaseAdmin
        .from('portfolios')
        .insert({
          user_id: userId,
          name: 'Paper Trading Portfolio',
          mode: 'paper',
          balance: initialBalance || 10000,
          broker: 'paper',
        })
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        portfolio,
      });
    }

    if (action === 'execute_trade' && portfolioId && trade) {
      const { data: portfolio, error: portfolioError } = await supabaseAdmin
        .from('portfolios')
        .select('*')
        .eq('id', portfolioId)
        .eq('user_id', userId)
        .single();

      if (portfolioError) throw portfolioError;

      const tickData = await getCachedMarketTick(trade.asset);
      if (!tickData) {
        return NextResponse.json(
          { error: 'Market data not available for this asset' },
          { status: 400 },
        );
      }

      const executionPrice =
        trade.type === 'market' ? tickData.price : trade.price || tickData.price;

      const totalCost = trade.amount * executionPrice;

      let newBalance = portfolio.balance;
      if (trade.side === 'buy') {
        if (totalCost > portfolio.balance) {
          return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
        }
        newBalance -= totalCost;
      } else {
        newBalance += totalCost;
      }

      const { data: tradeRecord, error: tradeError } = await supabaseAdmin
        .from('trades')
        .insert({
          portfolio_id: portfolioId,
          asset: trade.asset,
          side: trade.side,
          type: trade.type,
          amount: trade.amount,
          price: executionPrice,
          status: 'filled',
        })
        .select()
        .single();

      if (tradeError) throw tradeError;

      const { error: updateError } = await supabaseAdmin
        .from('portfolios')
        .update({ balance: newBalance })
        .eq('id', portfolioId);

      if (updateError) throw updateError;

      return NextResponse.json({
        success: true,
        trade: tradeRecord,
        newBalance,
      });
    }

    return NextResponse.json({ error: 'Invalid action or missing parameters' }, { status: 400 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Paper trading POST error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to execute paper trade',
      },
      { status: 500 },
    );
  }
}

/**
 * Calculate positions from trade history
 */
async function calculatePositions(
  trades: { status: string; asset: string; side: string; amount: number; price: number }[],
): Promise<Position[]> {
  const positionMap = new Map<string, { amount: number; totalCost: number }>();

  for (const trade of trades) {
    if (trade.status !== 'filled') continue;

    const existing = positionMap.get(trade.asset) || { amount: 0, totalCost: 0 };

    if (trade.side === 'buy') {
      existing.amount += trade.amount;
      existing.totalCost += trade.amount * trade.price;
    } else {
      existing.amount -= trade.amount;
      existing.totalCost -= trade.amount * trade.price;
    }

    positionMap.set(trade.asset, existing);
  }

  const positions: Position[] = [];

  for (const [asset, position] of positionMap.entries()) {
    if (Math.abs(position.amount) < 0.00001) continue;

    const avgPrice = position.totalCost / position.amount;
    const tickData = await getCachedMarketTick(asset);
    const currentPrice = tickData?.price || avgPrice;
    const unrealizedPnl = (currentPrice - avgPrice) * position.amount;

    positions.push({
      asset,
      amount: position.amount,
      avgPrice,
      currentPrice,
      unrealizedPnl,
    });
  }

  return positions;
}

/**
 * Calculate total portfolio value
 */
async function calculatePortfolioValue(
  cashBalance: number,
  positions: Position[],
): Promise<number> {
  const positionsValue = positions.reduce((sum, pos) => sum + pos.amount * pos.currentPrice, 0);

  return cashBalance + positionsValue;
}
