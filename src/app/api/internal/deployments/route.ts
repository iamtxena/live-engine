import { getAuthUserId } from '@/lib/service-auth';
import { createDeployment, listDeployments } from '@/lib/internal/execution-store';
import { type NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface CreateDeploymentRequest {
  strategyId: string;
  mode: 'paper' | 'live';
  capital: number;
  idempotencyKey?: string;
}

export async function GET(request: NextRequest) {
  try {
    await getAuthUserId(request);
    const status = new URL(request.url).searchParams.get('status');
    return NextResponse.json({
      items: listDeployments(status),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to list deployments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await getAuthUserId(request);
    const body = (await request.json()) as CreateDeploymentRequest;
    if (!body.strategyId || !body.mode || typeof body.capital !== 'number') {
      return NextResponse.json({ error: 'Missing required deployment fields' }, { status: 400 });
    }
    const deployment = createDeployment({
      strategyId: body.strategyId,
      mode: body.mode,
      capital: body.capital,
    });
    return NextResponse.json({ deployment }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to create deployment' }, { status: 500 });
  }
}
