import { getPortfolio } from '@/lib/internal/execution-store';
import { getAuthUserId } from '@/lib/service-auth';
import { type NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ portfolioId: string }> },
) {
  try {
    await getAuthUserId(request);
    const params = await context.params;
    const portfolio = getPortfolio(params.portfolioId);
    if (!portfolio) {
      return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 });
    }
    return NextResponse.json({ portfolio });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch portfolio' }, { status: 500 });
  }
}
