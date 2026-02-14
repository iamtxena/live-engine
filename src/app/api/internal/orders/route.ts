import { getAuthUserId } from '@/lib/service-auth';
import { listOrders, placeOrder } from '@/lib/internal/execution-store';
import { type NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface PlaceOrderRequest {
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit';
  quantity: number;
  price?: number | null;
  deploymentId?: string | null;
  idempotencyKey?: string;
}

export async function GET(request: NextRequest) {
  try {
    await getAuthUserId(request);
    const status = new URL(request.url).searchParams.get('status');
    return NextResponse.json({ items: listOrders(status) });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to list orders' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await getAuthUserId(request);
    const body = (await request.json()) as PlaceOrderRequest;
    if (!body.symbol || !body.side || !body.type || typeof body.quantity !== 'number') {
      return NextResponse.json({ error: 'Missing required order fields' }, { status: 400 });
    }
    if (body.type === 'limit' && typeof body.price !== 'number') {
      return NextResponse.json({ error: 'Limit order requires price' }, { status: 400 });
    }
    const order = placeOrder({
      symbol: body.symbol,
      side: body.side,
      type: body.type,
      quantity: body.quantity,
      price: body.price ?? null,
      deploymentId: body.deploymentId ?? null,
    });
    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to place order' }, { status: 500 });
  }
}
