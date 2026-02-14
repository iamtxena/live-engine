import { listPortfolios } from '@/lib/internal/execution-store';
import { getAuthUserId } from '@/lib/service-auth';
import { type NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    await getAuthUserId(request);
    return NextResponse.json({ items: listPortfolios() });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to list portfolios' }, { status: 500 });
  }
}
