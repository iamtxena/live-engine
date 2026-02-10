import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/service-auth';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/strategies/[id]/logs - Get logs for a strategy (paginated)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthUserId(request);

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const level = searchParams.get('level');

    // Verify ownership
    const { data: strategy } = await supabaseAdmin
      .from('strategies')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (!strategy) {
      return NextResponse.json({ error: 'Strategy not found' }, { status: 404 });
    }

    // Build query
    let query = supabaseAdmin
      .from('strategy_logs')
      .select('*', { count: 'exact' })
      .eq('strategy_id', id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (level) {
      query = query.eq('level', level);
    }

    const { data: logs, count, error } = await query;

    if (error) {
      console.error('Error fetching strategy logs:', error);
      return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
    }

    return NextResponse.json({
      logs: logs || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Strategy logs GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
