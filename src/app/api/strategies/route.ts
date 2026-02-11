import { getAuthUserId } from '@/lib/service-auth';
import { supabaseAdmin } from '@/lib/supabase';
import type { CreateStrategyInput, UpdateStrategyInput } from '@/lib/types/strategy';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/strategies - List user's strategies
 * GET /api/strategies?id=<id> - Get single strategy
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthUserId(request);

    const { searchParams } = new URL(request.url);
    const strategyId = searchParams.get('id');

    if (strategyId) {
      // Get single strategy with recent logs
      const { data: strategy, error } = await supabaseAdmin
        .from('strategies')
        .select('*')
        .eq('id', strategyId)
        .eq('user_id', userId)
        .single();

      if (error || !strategy) {
        return NextResponse.json({ error: 'Strategy not found' }, { status: 404 });
      }

      // Get recent logs
      const { data: logs } = await supabaseAdmin
        .from('strategy_logs')
        .select('*')
        .eq('strategy_id', strategyId)
        .order('created_at', { ascending: false })
        .limit(50);

      return NextResponse.json({
        strategy,
        logs: logs || [],
      });
    }

    // List all strategies
    const { data: strategies, error } = await supabaseAdmin
      .from('strategies')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching strategies:', error);
      return NextResponse.json({ error: 'Failed to fetch strategies' }, { status: 500 });
    }

    return NextResponse.json({ strategies: strategies || [] });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Strategies GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/strategies - Create new strategy
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthUserId(request);

    const body: CreateStrategyInput = await request.json();

    if (!body.name || !body.python_code || !body.typescript_code) {
      return NextResponse.json(
        { error: 'Missing required fields: name, python_code, typescript_code' },
        { status: 400 },
      );
    }

    const { data: strategy, error } = await supabaseAdmin
      .from('strategies')
      .insert({
        user_id: userId,
        name: body.name,
        description: body.description,
        python_code: body.python_code,
        typescript_code: body.typescript_code,
        explanation: body.explanation,
        dependencies: body.dependencies || [],
        conversion_notes: body.conversion_notes,
        asset: body.asset || 'btcusdt',
        interval: body.interval || '1m',
        parameters: body.parameters || {},
        portfolio_id: body.portfolio_id,
        status: 'draft',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating strategy:', error);
      return NextResponse.json({ error: 'Failed to create strategy' }, { status: 500 });
    }

    return NextResponse.json({ strategy }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Strategies POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/strategies - Update strategy
 */
export async function PATCH(request: NextRequest) {
  try {
    const userId = await getAuthUserId(request);

    const { id, ...updates }: { id: string } & UpdateStrategyInput = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Missing strategy id' }, { status: 400 });
    }

    // Verify ownership
    const { data: existing } = await supabaseAdmin
      .from('strategies')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Strategy not found' }, { status: 404 });
    }

    const { data: strategy, error } = await supabaseAdmin
      .from('strategies')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating strategy:', error);
      return NextResponse.json({ error: 'Failed to update strategy' }, { status: 500 });
    }

    return NextResponse.json({ strategy });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Strategies PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/strategies - Delete strategy
 */
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getAuthUserId(request);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing strategy id' }, { status: 400 });
    }

    // Verify ownership and delete
    const { error } = await supabaseAdmin
      .from('strategies')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting strategy:', error);
      return NextResponse.json({ error: 'Failed to delete strategy' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Strategies DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
