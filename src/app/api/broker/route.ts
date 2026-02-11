import {
  type BrokerName,
  type OrderParams,
  createBrokerClient,
  getDefaultBrokerCredentials,
} from '@/lib/broker';
import { auth } from '@clerk/nextjs/server';
import { type NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * GET /api/broker
 * Get account balance and open orders
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const broker = (searchParams.get('broker') || 'bybit') as BrokerName;
    const symbol = searchParams.get('symbol') || undefined;
    const testnet = searchParams.get('testnet') !== 'false';

    const credentials = getDefaultBrokerCredentials(broker);
    const client = createBrokerClient(broker, {
      ...credentials,
      testnet,
    });

    const [balance, openOrders, ticker] = await Promise.all([
      client.getBalance(),
      client.getOpenOrders(symbol),
      symbol ? client.getTicker(symbol) : Promise.resolve(null),
    ]);

    return NextResponse.json({
      balance,
      openOrders,
      ticker,
      broker,
      testnet,
    });
  } catch (error) {
    console.error('Broker API error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch broker data',
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/broker
 * Place an order
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      broker = 'bybit',
      testnet = true,
      order,
    } = body as {
      broker?: BrokerName;
      testnet?: boolean;
      order: OrderParams;
    };

    if (!order || !order.symbol || !order.side || !order.type || !order.amount) {
      return NextResponse.json({ error: 'Missing required order parameters' }, { status: 400 });
    }

    if (order.type === 'limit' && !order.price) {
      return NextResponse.json({ error: 'Price is required for limit orders' }, { status: 400 });
    }

    const credentials = getDefaultBrokerCredentials(broker);
    const client = createBrokerClient(broker, {
      ...credentials,
      testnet,
    });

    const result = await client.placeOrder(order);

    return NextResponse.json({
      success: true,
      order: result,
      broker,
      testnet,
    });
  } catch (error) {
    console.error('Order placement error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to place order',
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/broker
 * Cancel an order
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const broker = (searchParams.get('broker') || 'bybit') as BrokerName;
    const orderId = searchParams.get('orderId');
    const symbol = searchParams.get('symbol');
    const testnet = searchParams.get('testnet') !== 'false';

    if (!orderId || !symbol) {
      return NextResponse.json({ error: 'Missing orderId or symbol' }, { status: 400 });
    }

    const credentials = getDefaultBrokerCredentials(broker);
    const client = createBrokerClient(broker, {
      ...credentials,
      testnet,
    });

    await client.cancelOrder(orderId, symbol);

    return NextResponse.json({
      success: true,
      orderId,
      symbol,
      broker,
      testnet,
    });
  } catch (error) {
    console.error('Order cancellation error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to cancel order',
      },
      { status: 500 },
    );
  }
}
